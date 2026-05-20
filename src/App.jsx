import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Plus, List, Calculator, BarChart2, RefreshCw, X, Info, LogOut, User, Sun, Moon, AlertTriangle, Crown, Shield } from "lucide-react";
import { auth, db, googleProvider, fns } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendEmailVerification, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot, collection, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import * as Sentry from "@sentry/react";
import { usePushNotifications } from "./hooks/usePushNotifications";
import { FREE_BET_LIMIT } from "./constants/bets";
import { fmt } from "./utils/formatting";
import { getBetPL, getCLV, buildSegments } from "./utils/bets";
import { ProBadge } from "./components/ProBadge";
import { UpgradeModal } from "./components/UpgradeModal";
import { OnboardingModal } from "./components/OnboardingModal";
import { BalanceDisplay } from "./components/BalanceDisplay";
import { LoginForm } from "./pages/LoginForm";
import { TipsterProfile } from "./pages/TipsterProfile";
import { SettingsPanel } from "./pages/SettingsPanel";
import { AdminPanel } from "./pages/AdminPanel";
import { CalculatorsView } from "./pages/CalculatorsView";
import { Dashboard } from "./pages/Dashboard";
import { RegisterForm } from "./pages/RegisterForm";
import { HistoryList } from "./pages/HistoryList";
import { AnalyzePanel } from "./pages/AnalyzePanel";
export default function BankrollVault() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const view = pathname.replace(/^\//, "") || "dashboard";
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Email/Password states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authInProgress, setAuthInProgress] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [userDisplayName, setUserDisplayName] = useState("");
  const [editingBet, setEditingBet] = useState(null);
  const [shareToast, setShareToast] = useState("");
  const [subscription, setSubscription] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [onboardStep, setOnboardStep] = useState(0);
  const [onboardBanca, setOnboardBanca] = useState("1000");
  const onboardingChecked = useRef(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminUser, setAdminUser] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMsg, setAdminMsg] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const [milestoneToast, setMilestoneToast] = useState(null);
  const [tipsterUID] = useState(() => new URLSearchParams(window.location.search).get("tipster"));
  const [tipsterProfile, setTipsterProfile] = useState(null);

  const [bets, setBets] = useState([]);
  const [config, setConfig] = useState({ initialBankroll: 1000 });
  const [geminiKey, setGeminiKey] = useState("");
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dashPeriod, setDashPeriod] = useState("all");
  const [activeBankroll, setActiveBankroll] = useState("default");
  const { requestPermission: requestPushPermission, isSupported: isPushSupported, permission: pushPermission } = usePushNotifications(user);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setUserDisplayName(u?.displayName || u?.email?.split("@")[0] || "");
      setAuthLoading(false);
      Sentry.setUser(u ? { id: u.uid, email: u.email } : null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate("/", { replace: true });
  }, [user, authLoading]);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (isStandalone || localStorage.getItem("pwaInstallDismissed")) return;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) return;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    // Captura o evento nativo do Chrome/Android se disponível
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Mostra o banner após 2s independente do evento — funciona em iOS e Android
    const timer = setTimeout(() => setShowInstallBanner(isIOS ? "ios" : "android"), 2000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!user) { setBets([]); setConfig({ initialBankroll: 1000, monthlyGoal: 0 }); setGeminiKey(""); setSubscription(null); setIsAdmin(false); setLoaded(false); return; }
    setSyncError("");
    const readyFlags = { doc: false, bets: false };
    const markReady = () => { if (readyFlags.doc && readyFlags.bets) setLoaded(true); };
    let migrating = false;

    const unsubDoc = onSnapshot(doc(db, "users", user.uid), async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setConfig(data.config || { initialBankroll: 1000, monthlyGoal: 0 });
        setGeminiKey(data.geminiKey || "");
        setSubscription(data.subscription || { status: "free" });
        setIsAdmin(data.isAdmin === true);
        if (data.bets?.length > 0 && !data.betsMigrated && !migrating) {
          migrating = true;
          try {
            const chunks = [];
            for (let i = 0; i < data.bets.length; i += 400) chunks.push(data.bets.slice(i, i + 400));
            for (const chunk of chunks) {
              const batch = writeBatch(db);
              chunk.forEach(bet => batch.set(doc(collection(db, "users", user.uid, "bets"), String(bet.id)), bet));
              await batch.commit();
            }
            await setDoc(doc(db, "users", user.uid), { bets: [], betsMigrated: true }, { merge: true });
          } catch (e) { console.error("Migration error:", e); }
          migrating = false;
        }
      }
      readyFlags.doc = true; markReady();
    }, err => { setSyncError("Erro: " + err.message); readyFlags.doc = true; markReady(); });

    const unsubBets = onSnapshot(collection(db, "users", user.uid, "bets"), snap => {
      setBets(snap.docs.map(d => d.data()));
      readyFlags.bets = true; markReady();
    }, err => { console.error("Bets snapshot error:", err); readyFlags.bets = true; markReady(); });

    return () => { unsubDoc(); unsubBets(); };
  }, [user]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!tipsterUID) return;
    getDoc(doc(db, "publicProfiles", tipsterUID))
      .then(snap => { if (snap.exists()) setTipsterProfile(snap.data()); })
      .catch(() => {});
  }, [tipsterUID]);

  const saveConfig = useCallback(async (newConfig) => {
    setConfig(newConfig);
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid), { config: newConfig }, { merge: true });
      setSyncError("");
    } catch (err) { setSyncError("Erro ao salvar configuração."); }
  }, [user]);

  const updateBetResult = useCallback(async (betId, result) => {
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid, "bets", String(betId)), { result }, { merge: true });
      const label = result === "win" ? "✅ Green registrado!" : result === "loss" ? "❌ Red registrado" : result === "void" ? "Aposta anulada" : "Resultado atualizado";
      setShareToast(label); setTimeout(() => setShareToast(""), 3000);
    }
    catch (err) { setSyncError("Erro ao salvar resultado."); }
  }, [user]);

  const deleteBet = useCallback(async (betId) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "bets", String(betId)));
      setShareToast("Aposta excluída"); setTimeout(() => setShareToast(""), 3000);
    }
    catch (err) { setSyncError("Erro ao excluir aposta."); }
  }, [user]);

  const saveGeminiKey = useCallback(async (key) => {
    setGeminiKey(key);
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid), { geminiKey: key }, { merge: true });
    } catch (err) {
      console.error("Save key error:", err);
      setSyncError("Não foi possível salvar a API key na nuvem: " + err.message);
    }
  }, [user]);

  const stats = useMemo(() => {
    const now = new Date();
    const cutoff = dashPeriod === "7d" ? new Date(now - 7*86400000).toISOString().slice(0,10)
      : dashPeriod === "30d" ? new Date(now - 30*86400000).toISOString().slice(0,10)
      : dashPeriod === "90d" ? new Date(now - 90*86400000).toISOString().slice(0,10)
      : null;
    const bankrollBets = activeBankroll === "default"
      ? bets.filter(b => !b.bankrollId || b.bankrollId === "default")
      : bets.filter(b => b.bankrollId === activeBankroll);
    const activeBankrollInitial = activeBankroll === "default"
      ? config.initialBankroll
      : (config.bankrolls || []).find(b => b.id === activeBankroll)?.initial ?? config.initialBankroll;
    const filteredBets = cutoff ? bankrollBets.filter(b => !b.date || b.date >= cutoff) : bankrollBets;
    const sorted = [...filteredBets].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    let bankroll = activeBankrollInitial, totalStake = 0, totalPL = 0, wins = 0, losses = 0, clvSum = 0, clvCount = 0;
    const chartData = [{ d: "Início", v: activeBankrollInitial }];
    sorted.forEach(bet => {
      const pl = getBetPL(bet); const clv = getCLV(bet);
      if (bet.result !== "pending") {
        if (bet.result !== "void") totalStake += bet.stake;
        totalPL += pl; bankroll += pl;
        if (bet.result === "win") wins++;
        if (bet.result === "loss") losses++;
        chartData.push({ d: bet.date.slice(5), v: Math.round(bankroll * 100) / 100 });
      }
      if (clv != null && bet.result !== "pending") { clvSum += clv; clvCount++; }
    });
    let peakDD = activeBankrollInitial, maxDrawdown = 0;
    const drawdownData = chartData.map(pt => {
      if (pt.v > peakDD) peakDD = pt.v;
      const dd = peakDD > 0 ? (peakDD - pt.v) / peakDD * 100 : 0;
      if (dd > maxDrawdown) maxDrawdown = dd;
      return { d: pt.d, dd: -dd };
    });
    return { currentBankroll: bankroll, totalPL, roi: activeBankrollInitial > 0 ? totalPL / activeBankrollInitial * 100 : 0, yield: totalStake > 0 ? totalPL / totalStake * 100 : 0, winRate: (wins + losses) > 0 ? wins / (wins + losses) * 100 : 0, avgCLV: clvCount > 0 ? clvSum / clvCount : null, wins, losses, totalBets: filteredBets.length, chartData, drawdownData, maxDrawdown };
  }, [bets, config.initialBankroll, config.bankrolls, activeBankroll, dashPeriod]);

  const syncPublicProfile = useCallback(async (enabled) => {
    if (!user) return;
    const ref = doc(db, "publicProfiles", user.uid);
    if (!enabled) { try { await deleteDoc(ref); } catch (_) {} return; }
    const settled = bets.filter(b => b.result !== "pending");
    try {
      await setDoc(ref, {
        uid: user.uid,
        displayName: userDisplayName || user.email?.split("@")[0] || "Anônimo",
        roi: stats.roi, yield: stats.yield, winRate: stats.winRate,
        totalBets: bets.length, settledBets: settled.length,
        totalPL: stats.totalPL, wins: stats.wins, losses: stats.losses,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      setSyncError("Perfil público requer atualização das regras do Firestore.");
    }
  }, [user, bets, stats, userDisplayName]);

  const handleLogout = async () => {
    setIsRegistering(false);
    setEmail(""); setPassword(""); setNome("");
    setAuthError(""); setAuthInProgress(false);
    setForgotPasswordSent(false);
    await signOut(auth);
  };

  const handleGoogleLogin = async () => {
    setAuthInProgress(true);
    setAuthError("");
    const timer = setTimeout(() => {
      setAuthInProgress(false);
      setAuthError("Tempo esgotado. Verifique se popups estão permitidos neste site e tente novamente.");
    }, 15000);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthInProgress(false);
      if (err.code === "auth/popup-blocked") {
        setAuthError("Popup bloqueado pelo navegador. Autorize popups para este site e tente novamente.");
      } else if (err.code !== "auth/popup-closed-by-user") {
        setAuthError("Erro ao fazer login com Google: " + err.message);
      }
    } finally {
      clearTimeout(timer);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) { setAuthError("Digite seu e-mail acima para recuperar a senha."); return; }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setForgotPasswordSent(true);
      setAuthError("");
    } catch (err) {
      if (err.code === "auth/user-not-found") setAuthError("Nenhuma conta encontrada com este e-mail.");
      else setAuthError("Erro ao enviar email de recuperação: " + err.message);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthError("");
    if (isRegistering && password.length < 6) {
      setAuthError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setAuthError("E-mail inválido — use o formato nome@dominio.com");
      return;
    }
    if (isRegistering && password !== confirmPassword) {
      setAuthError("As senhas não conferem.");
      return;
    }
    setAuthInProgress(true);
    try {
      if (isRegistering) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (nome.trim()) {
          await updateProfile(cred.user, { displayName: nome.trim() });
          setUserDisplayName(nome.trim());
        }
        await sendEmailVerification(cred.user);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      if (err.code === "auth/email-already-in-use") setAuthError("Este e-mail já está em uso.");
      else if (err.code === "auth/invalid-credential") setAuthError("E-mail ou senha incorretos.");
      else if (err.code === "auth/weak-password") setAuthError("A senha deve ter pelo menos 6 caracteres.");
      else setAuthError("Erro de autenticação: " + err.message);
      setAuthInProgress(false);
    }
  };

  useEffect(() => {
    if (!loaded || onboardingChecked.current) return;
    onboardingChecked.current = true;
    if (config.onboardingDone) return;
    if (bets.length > 0) { saveConfig({ ...config, onboardingDone: true }); return; }
    setOnboardBanca(String(config.initialBankroll || "1000"));
    setOnboardStep(1);
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    const settled = bets.some(b => b.result !== "pending");
    if (!settled) return;
    const MILESTONES = [10, 25, 50, 100, 200];
    const shown = config.shownMilestones || [];
    const next = MILESTONES.find(m => stats.roi >= m && !shown.includes(m));
    if (next) {
      setMilestoneToast(next);
      saveConfig({ ...config, shownMilestones: [...shown, next] });
    }
  }, [stats.roi, loaded]);

  useEffect(() => {
    if (loaded && config.publicProfile && user) syncPublicProfile(true);
  }, [stats.roi, stats.totalBets, loaded]);

  const marketSeg = useMemo(() => buildSegments(bets, "market"), [bets]);
  const bookSeg = useMemo(() => buildSegments(bets, "bookmaker"), [bets]);
  const sportSeg = useMemo(() => buildSegments(bets, "sport"), [bets]);


  const monthlyData = useMemo(() => {
    const months = {};
    bets.filter(b => b.result !== "pending" && b.date).forEach(bet => {
      const m = bet.date.slice(0, 7);
      if (!months[m]) months[m] = { month: m, pl: 0, stake: 0 };
      months[m].pl += getBetPL(bet);
      months[m].stake += bet.stake;
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month)).slice(-12).map(m => ({
      ...m,
      label: new Date(m.month + "-15").toLocaleString("pt-BR", { month: "short" }).replace(".", "") + "/" + m.month.slice(2, 4),
    }));
  }, [bets]);

  const currentStreak = useMemo(() => {
    const settled = bets.filter(b => b.result === "win" || b.result === "loss").sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    if (!settled.length) return null;
    const type = settled[0].result;
    let count = 0;
    for (const b of settled) { if (b.result === type) count++; else break; }
    return { type, count };
  }, [bets]);

  const pendingExposure = useMemo(() => bets.filter(b => b.result === "pending").reduce((s, b) => s + (b.stake || 0), 0), [bets]);

  const thisMonthPL = useMemo(() => {
    const m = new Date().toISOString().slice(0, 7);
    return monthlyData.find(d => d.month === m)?.pl ?? null;
  }, [monthlyData]);

  const performanceAlerts = useMemo(() => {
    const dismissed = config.dismissedAlerts || [];
    const alerts = [];
    if (currentStreak?.type === "loss" && currentStreak.count >= 3) {
      const tier = Math.floor(currentStreak.count / 3) * 3;
      const id = `streak_loss_${tier}`;
      if (!dismissed.includes(id))
        alerts.push({ id, icon: "🔴", title: `${currentStreak.count} derrotas consecutivas`, msg: "Considere pausar e revisar seus critérios de entrada. Sequências longas de perdas podem indicar viés de seleção ou má gestão de risco.", color: "danger" });
    }
    if (stats.currentBankroll > 0 && pendingExposure / stats.currentBankroll > 0.3) {
      const id = "exposure_high";
      if (!dismissed.includes(id)) {
        const pct = ((pendingExposure / stats.currentBankroll) * 100).toFixed(0);
        alerts.push({ id, icon: "⚠️", title: `Exposição alta: ${pct}% da banca em apostas abertas`, msg: `Você tem R$${fmt(pendingExposure)} em apostas pendentes. Apostar mais de 30% da banca simultaneamente aumenta o risco de ruína.`, color: "warning" });
      }
    }
    if (stats.totalBets >= 20 && stats.yield < -5) {
      const id = "roi_negative";
      if (!dismissed.includes(id))
        alerts.push({ id, icon: "📉", title: `Yield negativo: ${stats.yield.toFixed(1)}%`, msg: "Após 20+ apostas, um Yield abaixo de −5% indica que seus critérios de seleção precisam de revisão. Analise seus padrões na aba Análise.", color: "danger" });
    }
    return alerts;
  }, [currentStreak, pendingExposure, stats.currentBankroll, stats.totalBets, stats.roi, stats.yield, config.dismissedAlerts]);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") { setShowInstallBanner(false); setInstallPrompt(null); }
  }, [installPrompt]);

  const dismissInstall = useCallback(() => {
    setShowInstallBanner(false);
    localStorage.setItem("pwaInstallDismissed", "1");
  }, []);

  const dismissAlert = useCallback((id) => {
    const dismissed = config.dismissedAlerts || [];
    if (!dismissed.includes(id)) saveConfig({ ...config, dismissedAlerts: [...dismissed, id] });
  }, [config, saveConfig]);

  const finishOnboarding = useCallback(() => {
    setOnboardStep(0);
    saveConfig({ ...config, onboardingDone: true });
  }, [config, saveConfig]);

  const onboardNext = useCallback(() => {
    if (onboardStep === 1) {
      const val = parseFloat(onboardBanca);
      if (val > 0) saveConfig({ ...config, initialBankroll: val });
      setOnboardStep(2);
    } else if (onboardStep === 2) {
      setOnboardStep(3);
    } else {
      finishOnboarding();
    }
  }, [onboardStep, onboardBanca, config, saveConfig, finishOnboarding]);

  const VALID_ROUTES = ["dashboard", "register", "history", "analyze", "kelly", "settings", "admin"];
  useEffect(() => {
    if (!loaded) return;
    if (view === "admin" && !isAdmin) { navigate("/dashboard", { replace: true }); return; }
    if (!VALID_ROUTES.includes(view)) { navigate("/dashboard", { replace: true }); }
  }, [view, isAdmin, loaded]);
  if (tipsterUID && tipsterProfile && tipsterUID !== user?.uid)
    return <TipsterProfile tipsterProfile={tipsterProfile} />;


  if (authLoading || (user && !loaded)) return (
    <div style={{ display: "flex", width: "100%", height: "100vh", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, color: "var(--accent)" }}>
      <RefreshCw size={32} style={{ animation: "spin 1s linear infinite" }} />
      <span style={{ fontSize: 12, color: "var(--muted)", letterSpacing: 2, fontWeight: 600, fontFamily: "var(--font-mono)" }}>CARREGANDO...</span>
    </div>
  );

  if (!user)
    return (
      <LoginForm
        isRegistering={isRegistering} setIsRegistering={setIsRegistering}
        email={email} setEmail={setEmail}
        password={password} setPassword={setPassword}
        nome={nome} setNome={setNome}
        confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
        showPassword={showPassword} setShowPassword={setShowPassword}
        authError={authError} authInProgress={authInProgress}
        forgotPasswordSent={forgotPasswordSent}
        handleEmailAuth={handleEmailAuth}
        handleGoogleLogin={handleGoogleLogin}
        handleForgotPassword={handleForgotPassword}
      />
    );






  const startEdit = (bet) => {
    setEditingBet(bet);
    navigate("/register");
  };

  const pending = bets.filter(b => b.result === "pending");
  const hasSettled = bets.some(b => b.result !== "pending");
  const now = new Date();
  const trialEndsAt = subscription?.trialEndsAt?.toDate?.() ?? null;
  const isOnTrial = subscription?.status === "trial" && trialEndsAt && trialEndsAt > now;
  const trialDaysLeft = isOnTrial ? Math.max(1, Math.ceil((trialEndsAt - now) / 86400000)) : 0;
  const isPremium = subscription?.status === "active" || isOnTrial;
  const betLimitReached = !isPremium && bets.length >= FREE_BET_LIMIT;


  const NAV = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "register", icon: Plus, label: "Registrar" },
    { id: "history", icon: List, label: "Histórico" },
    { id: "analyze", icon: BarChart2, label: "Análise" },
    { id: "kelly", icon: Calculator, label: "Kelly" },
    { id: "settings", icon: User, label: "Perfil" },
    ...(isAdmin ? [{ id: "admin", icon: Shield, label: "Admin" }] : []),
  ];

  const adminLookup = async () => {
    if (!adminSearch.trim()) return;
    setAdminLoading(true); setAdminMsg(""); setAdminUser(null);
    try {
      const fn = httpsCallable(fns, "adminGetUser");
      const res = await fn({ email: adminSearch.trim().toLowerCase() });
      setAdminUser(res.data);
    } catch (err) {
      setAdminMsg("❌ " + (err.message || "Erro ao buscar usuário"));
    } finally { setAdminLoading(false); }
  };

  const adminToggle = async (field, value) => {
    if (!adminUser) return;
    setAdminLoading(true); setAdminMsg("");
    try {
      const fn = httpsCallable(fns, "adminSetRole");
      await fn({ uid: adminUser.uid, [field]: value });
      setAdminUser(u => ({
        ...u,
        ...(field === "isPremium" ? { subscription: { ...u.subscription, status: value ? "active" : "free" } } : {}),
        ...(field === "isAdmin" ? { isAdmin: value } : {}),
      }));
      setAdminMsg("✅ Atualizado com sucesso!");
    } catch (err) {
      setAdminMsg("❌ " + (err.message || "Erro ao atualizar"));
    } finally { setAdminLoading(false); }
  };

  return (
    <div className="app-layout">
      
      {/* SIDEBAR FOR DESKTOP, BOTTOM NAV FOR MOBILE */}
      <nav className="app-nav">
        <div className="sidebar-header">
          <div style={{ display: "flex", alignItems: "center", marginTop: 12, paddingLeft: 4 }}>
            <img src="/logo-banca-logica.png" alt="Banca Lógica" style={{ height: 38 }} />
          </div>
        </div>
        {NAV.map(({ id, icon: Icon, label }) => (
          <button key={id} className={`nav-btn ${view === id ? "active" : ""}`} onClick={() => navigate("/" + id)}>
            <div style={{ position: "relative" }}>
              <Icon size={20} />
              {id === "dashboard" && pending.length > 0 && (
                <span style={{ position: "absolute", top: -5, right: -8, background: "var(--accent)", color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: "50%", minWidth: 15, height: 15, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", padding: "0 3px", lineHeight: 1 }}>
                  {pending.length > 9 ? "9+" : pending.length}
                </span>
              )}
            </div>
            <span className="nav-label">{label}</span>
          </button>
        ))}
        {!isPremium && (
          <button className="sidebar-only" onClick={() => setShowUpgrade(true)} style={{ margin: "0 12px 12px", padding: "10px 14px", background: "linear-gradient(135deg,rgba(245,158,11,0.12),rgba(249,115,22,0.08))", border: "1px solid rgba(245,158,11,0.35)", borderRadius: 10, cursor: "pointer", textAlign: "left", alignItems: "center", gap: 10, transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.borderColor = "#f59e0b"} onMouseOut={e => e.currentTarget.style.borderColor = "rgba(245,158,11,0.35)"}>
            <Crown size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", letterSpacing: 0.5 }}>UPGRADE PARA PRO</div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>{bets.length}/{FREE_BET_LIMIT} apostas usadas</div>
            </div>
          </button>
        )}
        {isPremium && !isOnTrial && (
          <div className="sidebar-only" style={{ margin: "0 12px 12px", padding: "8px 14px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, alignItems: "center", gap: 8 }}>
            <Crown size={14} color="#f59e0b" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>PLANO PRO ATIVO</span>
          </div>
        )}
        {isOnTrial && (
          <button className="sidebar-only" onClick={() => setShowUpgrade(true)} style={{ margin: "0 12px 12px", padding: "8px 14px", background: "rgba(139,127,245,0.08)", border: "1px solid rgba(139,127,245,0.3)", borderRadius: 10, cursor: "pointer", textAlign: "left", alignItems: "center", gap: 8, transition: "border-color 0.2s" }} onMouseOver={e => e.currentTarget.style.borderColor = "rgba(139,127,245,0.6)"} onMouseOut={e => e.currentTarget.style.borderColor = "rgba(139,127,245,0.3)"}>
            <Crown size={14} color="var(--accent)" />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", letterSpacing: 0.5 }}>TRIAL PRO</div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>{trialDaysLeft} dia{trialDaysLeft !== 1 ? "s" : ""} restante{trialDaysLeft !== 1 ? "s" : ""}</div>
            </div>
          </button>
        )}
        <div className="sidebar-user">
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), var(--primary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {(userDisplayName[0] || "?").toUpperCase()}
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 6 }}>
              {userDisplayName.split(" ")[0] || "Usuário"}{isPremium && <ProBadge />}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</div>
          </div>
        </div>
      </nav>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, width: "100%", height: "100%", overflow: "hidden" }}>
        
        {/* HEADER */}
        <header className="app-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo-banca-logica.png" alt="Banca Lógica" style={{ height: 28 }} />
            <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>
              Olá, {userDisplayName.split(" ")[0] || ""}!
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BalanceDisplay
              value={stats.currentBankroll}
              onChange={v => { const nc = { ...config, initialBankroll: v - stats.totalPL }; saveConfig(nc); }}
            />
            <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} title="Alternar tema" style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", padding: 8, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" }}>
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={handleLogout} title="Sair da Conta" style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", padding: 8, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" }} onMouseOver={e => { e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.borderColor = "var(--danger)"; }} onMouseOut={e => { e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {syncError && (
          <div style={{ background: "rgba(255, 61, 90, 0.1)", borderBottom: "1px solid rgba(255, 61, 90, 0.3)", color: "var(--danger)", padding: "12px 20px", fontSize: 13, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
            <Info size={16} /> {syncError}
            <button onClick={() => setSyncError("")} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--danger)", cursor: "pointer", padding: 4, display: "flex" }}><X size={14} /></button>
          </div>
        )}

        {/* DESKTOP HEADER INFO */}
        <div className="main-content">
          <div className="desktop-header-info" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: "var(--text)" }}>{NAV.find(n => n.id === view)?.label ?? (view === "admin" ? "Admin" : "")}</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <BalanceDisplay value={stats.currentBankroll} onChange={v => { const nc = { ...config, initialBankroll: v - stats.totalPL }; saveConfig(nc); }} />
              <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} title="Alternar tema" style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", padding: 8, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" }}>
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button onClick={handleLogout} title="Sair da Conta" style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", padding: 8, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" }} onMouseOver={e => { e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.borderColor = "var(--danger)"; }} onMouseOut={e => { e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
                <LogOut size={16} />
              </button>
            </div>
          </div>

          <div className="animate-fade-in">
            {/* 15-BETS UPGRADE BANNER */}
            {!isPremium && bets.length >= 15 && bets.length < FREE_BET_LIMIT && !config.dismissed15Banner && (
              <div className="animate-fade-in" style={{ display: "flex", alignItems: "center", gap: 12, background: "linear-gradient(135deg,rgba(245,158,11,0.1),rgba(249,115,22,0.06))", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, padding: "14px 18px", marginBottom: 20, flexWrap: "wrap" }}>
                <span style={{ fontSize: 20 }}>🔥</span>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Você já tem {bets.length} apostas registradas!</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Desbloqueie apostas ilimitadas, CSV, cards e análise IA com o plano PRO.</div>
                </div>
                <button onClick={() => setShowUpgrade(true)} style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)", color: "#000", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>VER PLANO PRO</button>
                <button onClick={() => saveConfig({ ...config, dismissed15Banner: true })} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4, display: "flex", flexShrink: 0 }}><X size={16} /></button>
              </div>
            )}

            {/* DASHBOARD */}
            {view === "dashboard" && <Dashboard
              stats={stats} bets={bets} config={config} saveConfig={saveConfig}
              monthlyData={monthlyData} thisMonthPL={thisMonthPL} pending={pending}
              pendingExposure={pendingExposure} currentStreak={currentStreak}
              hasSettled={hasSettled} performanceAlerts={performanceAlerts}
              dismissAlert={dismissAlert} syncPublicProfile={syncPublicProfile}
              isPremium={isPremium} user={user} userDisplayName={userDisplayName}
              setShowUpgrade={setShowUpgrade} updateBetResult={updateBetResult}
              dashPeriod={dashPeriod} setDashPeriod={setDashPeriod}
              activeBankroll={activeBankroll} setActiveBankroll={setActiveBankroll}
              bankrolls={config.bankrolls || []}
              requestPushPermission={requestPushPermission}
              pushPermission={pushPermission} isPushSupported={isPushSupported}
            />}

            {/* REGISTRAR */}
            {view === "register" && <RegisterForm
              editingBet={editingBet} setEditingBet={setEditingBet}
              bets={bets} isPremium={isPremium} geminiKey={geminiKey}
              currentBankroll={stats.currentBankroll} user={user}
              unitValue={config.unitValue || null}
              bankrolls={config.bankrolls || []}
              setShareToast={setShareToast} setSyncError={setSyncError}
              setShowUpgrade={setShowUpgrade}
            />}

            {/* HISTÓRICO */}
            {view === "history" && <HistoryList
              bets={bets} isPremium={isPremium}
              updateBetResult={updateBetResult} deleteBet={deleteBet}
              startEdit={startEdit} setShowUpgrade={setShowUpgrade}
              setShareToast={setShareToast}
            />}

            {/* ANÁLISE */}
            {view === "analyze" && <AnalyzePanel
              bets={bets} stats={stats} monthlyData={monthlyData}
              marketSeg={marketSeg} bookSeg={bookSeg} sportSeg={sportSeg}
              geminiKey={geminiKey} saveGeminiKey={saveGeminiKey}
              config={config} saveConfig={saveConfig}
              syncPublicProfile={syncPublicProfile}
              isPremium={isPremium} user={user} userDisplayName={userDisplayName}
              setShowUpgrade={setShowUpgrade}
            />}
            {/* KELLY / CALCULADORAS */}
            {view === "kelly" && <CalculatorsView currentBankroll={stats.currentBankroll} />}

            {/* SETTINGS */}
            {view === "settings" && (
              <SettingsPanel
                user={user}
                userDisplayName={userDisplayName}
                setUserDisplayName={setUserDisplayName}
                isPremium={isPremium}
                config={config}
                saveConfig={saveConfig}
                handleLogout={handleLogout}
                theme={theme}
                setTheme={setTheme}
                bets={bets}
                setShowUpgrade={setShowUpgrade}
              />
            )}

            {/* ADMIN PANEL */}
            {view === "admin" && isAdmin && <AdminPanel />}

          </div>
        </div>
      </div>

      {onboardStep > 0 && (
        <OnboardingModal
          step={onboardStep}
          banca={onboardBanca}
          onBancaChange={setOnboardBanca}
          onNext={onboardNext}
          onClose={finishOnboarding}
          onGoRegister={() => { finishOnboarding(); navigate("/register"); }}
          onGoAnalyze={() => { finishOnboarding(); navigate("/analyze"); }}
        />
      )}
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} user={user} />}

      {/* OFFLINE BANNER */}
      {!isOnline && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 2000, background: "#f59e0b", color: "#000", textAlign: "center", padding: "8px 16px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <AlertTriangle size={14} /> Você está offline — dados podem estar desatualizados
        </div>
      )}

      {/* PWA INSTALL BANNER */}
      {showInstallBanner && (
        <div className="animate-fade-in" style={{ position: "fixed", bottom: 76, left: 12, right: 12, zIndex: 1500, borderRadius: 16, background: "linear-gradient(135deg, #1e3a8a, #1e40af)", border: "1px solid rgba(59,130,246,0.4)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/icon-192x192.png" alt="" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Instalar Banca Lógica</div>
            {showInstallBanner === "ios"
              ? <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>Toque em <strong style={{ color: "#fff" }}>□↑ Compartilhar</strong> → "Adicionar à Tela Inicial"</div>
              : installPrompt
                ? <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>Acesso rápido • funciona offline • sem loja de apps</div>
                : <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>Menu <strong style={{ color: "#fff" }}>⋮</strong> → "Adicionar à tela inicial"</div>
            }
          </div>
          {showInstallBanner === "android" && installPrompt && (
            <button onClick={handleInstall} style={{ background: "#3B82F6", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
              Instalar
            </button>
          )}
          <button onClick={dismissInstall} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", padding: 4, display: "flex", flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>
      )}

      {shareToast && (
        <div className="animate-fade-in" style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.85)", color: "#fff", padding: "10px 20px", borderRadius: 24, fontSize: 13, fontWeight: 600, zIndex: 2000, whiteSpace: "nowrap", border: "1px solid rgba(255,255,255,0.1)" }}>
          {shareToast}
        </div>
      )}

      {milestoneToast && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onClick={() => setMilestoneToast(null)}>
          <div style={{ background: "var(--bg-secondary)", border: "1px solid rgba(0,212,138,0.4)", borderRadius: 20, padding: "40px 32px", textAlign: "center", maxWidth: 340, width: "100%", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🏆</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--primary)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>+{milestoneToast}% ROI</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Marco atingido!</div>
            <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7, marginBottom: 24 }}>Você atingiu um ROI de <strong style={{ color: "var(--primary)" }}>{milestoneToast}%</strong>. Consistência e edge positivo são a chave do sucesso a longo prazo.</div>
            <button onClick={() => setMilestoneToast(null)} style={{ background: "var(--primary)", color: "#000", border: "none", borderRadius: 10, padding: "12px 32px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)", transition: "all 0.2s ease" }}>CONTINUAR</button>
          </div>
        </div>
      )}
    </div>
  );
}
