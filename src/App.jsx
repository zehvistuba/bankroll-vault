import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { LayoutDashboard, Plus, List, Calculator, BarChart2, Sparkles, RefreshCw, Check, X, Info, Layers, LogOut, Mail, Lock, User, Edit2, Search, Camera, Download, Target, TrendingUp, TrendingDown, Sun, Moon, Share2, CalendarDays, ChevronLeft, ChevronRight, Trophy, Users, ImageDown, Globe, Eye, EyeOff, AlertTriangle, Crown, Zap, Shield, UserCheck, UserX } from "lucide-react";
import { auth, db, googleProvider, fns } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendEmailVerification, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot, collection, deleteDoc, writeBatch, serverTimestamp, getDocs, query, orderBy, limit } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { FREE_BET_LIMIT, SPORTS, MARKETS, BOOKMAKERS, RESULT_MAP } from "./constants/bets";
import { EXTRACTION_PROMPT } from "./constants/prompts";
import { fmt, fmtPct } from "./utils/formatting";
import { getBetPL, getCLV, defaultForm, defaultSelection, buildSegments } from "./utils/bets";
import { shareAsImage, generateBetCard, generateStatsCard } from "./utils/canvas";
import { LogoMark } from "./components/LogoMark";
import { ProBadge } from "./components/ProBadge";
import { UpgradeModal } from "./components/UpgradeModal";
import { OnboardingModal } from "./components/OnboardingModal";
import { ScenarioSimulator } from "./components/ScenarioSimulator";
import { SegmentTable } from "./components/SegmentTable";
import { HighlightCards } from "./components/HighlightCards";
import { AIInsights } from "./components/AIInsights";
import { InfoTooltip } from "./components/InfoTooltip";
import { BalanceDisplay } from "./components/BalanceDisplay";
import { LoginForm } from "./pages/LoginForm";
import { TipsterProfile } from "./pages/TipsterProfile";
import { SettingsPanel } from "./pages/SettingsPanel";
import { AdminPanel } from "./pages/AdminPanel";
export default function BankrollVault() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const view = pathname.replace(/^\//, "") || "dashboard";
  const [loaded, setLoaded] = useState(false);
  const [analyzeTab, setAnalyzeTab] = useState("ia");
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
  const [deletingId, setDeletingId] = useState(null);
  const [editingBet, setEditingBet] = useState(null);
  const [historyFilter, setHistoryFilter] = useState({ result: "all", search: "", bookmaker: "all", sport: "all", sortBy: "date_desc" });
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [formError, setFormError] = useState("");
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
  const imageInputRef = useRef(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const [milestoneToast, setMilestoneToast] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [calendarDate, setCalendarDate] = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() }; });
  const [calendarDay, setCalendarDay] = useState(null);
  const [sharingBetId, setSharingBetId] = useState(null);
  const [sharingStats, setSharingStats] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [tipsterUID] = useState(() => new URLSearchParams(window.location.search).get("tipster"));
  const [tipsterProfile, setTipsterProfile] = useState(null);

  const [bets, setBets] = useState([]);
  const [config, setConfig] = useState({ initialBankroll: 1000 });
  const [geminiKey, setGeminiKey] = useState("");
  const [form, setForm] = useState(defaultForm());
  const [kellyForm, setKellyForm] = useState({ prob: "", odds: "", bankroll: "" });
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dashPeriod, setDashPeriod] = useState("all");
  const [calcTab, setCalcTab] = useState("kelly");
  const [dutchForm, setDutchForm] = useState([{odds:""},{odds:""},{odds:""}]);
  const [dutchStake, setDutchStake] = useState("");
  const [arbForm, setArbForm] = useState({ odds1: "", odds2: "", stake: "" });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setUserDisplayName(u?.displayName || u?.email?.split("@")[0] || "");
      setAuthLoading(false);
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
      setDeletingId(null);
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
    const filteredBets = cutoff ? bets.filter(b => !b.date || b.date >= cutoff) : bets;
    const sorted = [...filteredBets].sort((a, b) => a.date.localeCompare(b.date));
    let bankroll = config.initialBankroll, totalStake = 0, totalPL = 0, wins = 0, losses = 0, clvSum = 0, clvCount = 0;
    const chartData = [{ d: "Início", v: config.initialBankroll }];
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
    return { currentBankroll: bankroll, totalPL, roi: config.initialBankroll > 0 ? totalPL / config.initialBankroll * 100 : 0, yield: totalStake > 0 ? totalPL / totalStake * 100 : 0, winRate: (wins + losses) > 0 ? wins / (wins + losses) * 100 : 0, avgCLV: clvCount > 0 ? clvSum / clvCount : null, wins, losses, totalBets: filteredBets.length, chartData };
  }, [bets, config.initialBankroll, dashPeriod]);

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

  const fetchLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "publicProfiles"), orderBy("roi", "desc"), limit(25)));
      setLeaderboard(snap.docs.map(d => d.data()));
    } catch (_) { setLeaderboard([]); }
    finally { setLeaderboardLoading(false); }
  }, []);

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
    if (config.onboardingCompleted) return;
    if (bets.length > 0) { saveConfig({ ...config, onboardingCompleted: true }); return; }
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

  const kellyResult = useMemo(() => {
    const p = parseFloat(kellyForm.prob) / 100; const b = parseFloat(kellyForm.odds) - 1;
    const br = parseFloat(kellyForm.bankroll) || stats.currentBankroll;
    if (!p || !b || p <= 0 || p >= 1 || b <= 0) return null;
    const f = (b * p - (1 - p)) / b;
    return { fraction: f * 100, amount: f * br, hasValue: f > 0 };
  }, [kellyForm, stats.currentBankroll]);

  const dutchResult = useMemo(() => {
    const valid = dutchForm.map(r => parseFloat(r.odds)).filter(o => o > 1);
    if (valid.length < 2) return null;
    const total = valid.reduce((s, o) => s + 1/o, 0);
    if (total >= 1) return null;
    const margin = (1 - total) / total * 100;
    const s = parseFloat(dutchStake) || null;
    return {
      pcts: valid.map(o => (1/o / total * 100).toFixed(2)),
      amounts: s ? valid.map(o => (s * (1/o / total)).toFixed(2)) : null,
      margin: margin.toFixed(2),
      profit: s ? (s / total - s).toFixed(2) : null,
    };
  }, [dutchForm, dutchStake]);

  const arbResult = useMemo(() => {
    const o1 = parseFloat(arbForm.odds1), o2 = parseFloat(arbForm.odds2);
    const s = parseFloat(arbForm.stake) || 100;
    if (!o1 || !o2 || o1 <= 1 || o2 <= 1) return null;
    const total = 1/o1 + 1/o2;
    if (total >= 1) return { isArb: false, margin: ((total-1)*100).toFixed(2) };
    const profit = s / total - s;
    const s1 = s / (o1 * total);
    const s2 = s / (o2 * total);
    return { isArb: true, margin: ((1-total)*100).toFixed(2), s1: s1.toFixed(2), s2: s2.toFixed(2), profit: profit.toFixed(2), total: s.toFixed(2) };
  }, [arbForm]);

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

  const formEV = useMemo(() => {
    const p = parseFloat(form.prob) / 100;
    const o = parseFloat(form.odds);
    if (!p || !o || p <= 0 || p >= 1 || o <= 1) return null;
    const ev = p * (o - 1) - (1 - p);
    return { ev, pct: (ev * 100).toFixed(2), positive: ev > 0 };
  }, [form.prob, form.odds]);

  const thisMonthPL = useMemo(() => {
    const m = new Date().toISOString().slice(0, 7);
    return monthlyData.find(d => d.month === m)?.pl ?? null;
  }, [monthlyData]);

  const calendarDays = useMemo(() => {
    const { year, month } = calendarDate;
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = Array(firstWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, date: dateStr, bets: bets.filter(b => b.date === dateStr) });
    }
    return cells;
  }, [bets, calendarDate]);

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
        alerts.push({ id, icon: "📉", title: `Ret. Banca negativo: ${stats.yield.toFixed(1)}%`, msg: "Após 20+ apostas, um ROI/Yield abaixo de −5% indica que seus critérios de seleção precisam de revisão. Analise seus padrões na aba Análise.", color: "danger" });
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

  const exportPDF = useCallback(async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210, M = 16;
    let y = 0;

    doc.setFillColor(0, 212, 138);
    doc.rect(0, 0, W, 14, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("BANCA LÓGICA", M, 9);
    doc.setFont("helvetica", "normal");
    doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, W - M, 9, { align: "right" });

    y = 24;
    doc.setTextColor(20, 20, 30);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("RELATÓRIO DE PERFORMANCE", M, y);
    y += 3;
    doc.setDrawColor(0, 212, 138);
    doc.setLineWidth(0.5);
    doc.line(M, y, W - M, y);
    y += 9;

    const kpis = [
      { label: "RET. BANCA", val: `${stats.roi >= 0 ? "+" : ""}${stats.roi.toFixed(2)}%`, pos: stats.roi >= 0 },
      { label: "ROI/YIELD", val: `${stats.yield >= 0 ? "+" : ""}${stats.yield.toFixed(2)}%`, pos: stats.yield >= 0 },
      { label: "TAXA DE ACERTO", val: `${stats.winRate.toFixed(1)}%`, pos: true },
      { label: "APOSTAS / V / D", val: `${stats.totalBets} / ${stats.wins} / ${stats.losses}`, pos: true },
      { label: "P&L TOTAL", val: `${stats.totalPL >= 0 ? "+" : ""}R$${Math.round(stats.totalPL)}`, pos: stats.totalPL >= 0 },
      { label: "BANCA ATUAL", val: `R$${Math.round(stats.currentBankroll)}`, pos: true },
    ];
    const colW = (W - 2 * M) / 3;
    kpis.forEach(({ label, val, pos }, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const bx = M + col * colW, by = y + row * 20;
      doc.setFillColor(242, 242, 248);
      doc.roundedRect(bx, by, colW - 4, 17, 2, 2, "F");
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(130, 130, 145);
      doc.text(label, bx + 4, by + 5.5);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...(pos ? [0, 150, 90] : [190, 50, 65]));
      doc.text(val, bx + 4, by + 13);
    });
    y += 2 * 20 + 6;

    if (monthlyData.length > 0) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(20, 20, 30);
      doc.text("P&L MENSAL", M, y);
      y += 5;
      const chartH = 38, chartW = W - 2 * M;
      const maxAbs = Math.max(...monthlyData.map(m => Math.abs(m.pl)), 1);
      const barSpacing = chartW / monthlyData.length;
      const barW = Math.min(barSpacing - 2, 14);
      const baseline = y + chartH / 2;
      doc.setDrawColor(200, 200, 210);
      doc.setLineWidth(0.3);
      doc.line(M, baseline, M + chartW, baseline);
      monthlyData.forEach((m, i) => {
        const bx = M + i * barSpacing + (barSpacing - barW) / 2;
        const h = Math.max((Math.abs(m.pl) / maxAbs) * (chartH / 2 - 3), 0.5);
        if (m.pl >= 0) { doc.setFillColor(0, 180, 100); doc.rect(bx, baseline - h, barW, h, "F"); }
        else { doc.setFillColor(210, 50, 70); doc.rect(bx, baseline, barW, h, "F"); }
        doc.setFontSize(5);
        doc.setTextColor(110, 110, 125);
        doc.setFont("helvetica", "normal");
        doc.text(m.label, bx + barW / 2, y + chartH + 4, { align: "center" });
      });
      y += chartH + 12;
    }

    if (y > 220) { doc.addPage(); y = 20; }
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 30);
    doc.text("HISTÓRICO DE APOSTAS", M, y);
    y += 5;

    const headers = ["DATA", "EVENTO", "ODDS", "STAKE", "P&L"];
    const cw = [22, 72, 16, 24, 22];
    const rowH = 6.5;
    doc.setFillColor(0, 212, 138);
    doc.rect(M, y, W - 2 * M, rowH, "F");
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(10, 10, 20);
    let cx = M + 2;
    headers.forEach((h, i) => { doc.text(h, cx, y + 4.3); cx += cw[i]; });
    y += rowH;

    const settled = bets.filter(b => b.result !== "pending").sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 60);
    settled.forEach((bet, idx) => {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.setFillColor(idx % 2 === 0 ? 252 : 246, idx % 2 === 0 ? 252 : 246, idx % 2 === 0 ? 254 : 252);
      doc.rect(M, y, W - 2 * M, rowH, "F");
      const pl = getBetPL(bet);
      const vals = [
        bet.date || "—",
        (bet.event || bet.competition || "—").substring(0, 38),
        bet.odds ? Number(bet.odds).toFixed(2) : "—",
        `R$${Number(bet.stake || 0).toFixed(0)}`,
        `${pl >= 0 ? "+" : ""}R$${Math.round(pl)}`,
      ];
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      cx = M + 2;
      vals.forEach((v, i) => {
        doc.setTextColor(...(i === 4 ? (pl >= 0 ? [0, 140, 80] : [190, 50, 65]) : [40, 40, 55]));
        doc.text(String(v), cx, y + 4.3);
        cx += cw[i];
      });
      y += rowH;
    });

    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(160, 160, 175);
      doc.text("banca-logica.com", W / 2, 292, { align: "center" });
      doc.text(`Página ${p} de ${pageCount}`, W - M, 292, { align: "right" });
    }

    doc.save(`banca-logica-${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [bets, stats, monthlyData]);

  const finishOnboarding = useCallback(() => {
    setOnboardStep(0);
    saveConfig({ ...config, onboardingCompleted: true });
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




  const compressImage = (file) => new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1600;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) { if (w > h) { h = Math.round(h * MAX / w); w = MAX; } else { w = Math.round(w * MAX / h); h = MAX; } }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      const data = canvas.toDataURL("image/jpeg", 0.92).split(",")[1];
      res({ base64: data, mimeType: "image/jpeg" });
    };
    img.onerror = rej;
    img.src = url;
  });

  const extractFromImage = async (file) => {
    if (!geminiKey) { setExtractError("Configure a API Key do Gemini primeiro em Análise → Inteligência IA."); return; }
    setExtracting(true); setExtractError("");
    try {
      const { base64, mimeType } = await compressImage(file);
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: EXTRACTION_PROMPT }, { inline_data: { mime_type: mimeType, data: base64 } }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 4096 } })
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error.message);
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start === -1 || end === -1) throw new Error("JSON não encontrado na resposta");
      const ex = JSON.parse(cleaned.slice(start, end + 1));
      const today = new Date().toISOString().split("T")[0];
      const normalizeDate = (d) => {
        if (!d) return today;
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
        const m = d.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
        if (m) { const y = m[3].length === 2 ? "20" + m[3] : m[3]; return `${y}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`; }
        return today;
      };
      const normalizeBookmaker = (name) => {
        if (!name) return localStorage.getItem("lastBookmaker") || "Betano";
        const lower = name.toLowerCase().trim();
        const exact = BOOKMAKERS.find(b => b.toLowerCase() === lower);
        if (exact) return exact;
        const partial = BOOKMAKERS.find(b => lower.includes(b.toLowerCase()) || b.toLowerCase().includes(lower));
        if (partial) return partial;
        return "Outros";
      };
      const bk = normalizeBookmaker(ex.bookmaker);
      if (ex.type === "multiple" && ex.selections?.length >= 2) {
        setForm(p => ({ ...p, betType: "multiple", bookmaker: bk, date: normalizeDate(ex.date),
          stake: ex.stake != null ? String(ex.stake) : p.stake, result: "pending", closingOdds: "", notes: "",
          selections: ex.selections.map(s => ({ id: Date.now() + Math.random(),
            description: s.description || "", odds: s.odds != null ? String(s.odds) : "",
            sport: SPORTS.includes(s.sport) ? s.sport : "Futebol",
            market: MARKETS.includes(s.market) ? s.market : "1x2" })) }));
      } else {
        setForm(p => ({ ...p, betType: "simple", bookmaker: bk, date: normalizeDate(ex.date),
          description: ex.description || "", odds: ex.odds != null ? String(ex.odds) : "",
          stake: ex.stake != null ? String(ex.stake) : p.stake, result: "pending", closingOdds: "", notes: "",
          sport: SPORTS.includes(ex.sport) ? ex.sport : "Futebol",
          market: MARKETS.includes(ex.market) ? ex.market : "1x2" }));
      }
    } catch (err) { setExtractError("Não foi possível extrair os dados. Tente uma imagem mais nítida. (" + err.message + ")"); }
    finally { setExtracting(false); if (imageInputRef.current) imageInputRef.current.value = ""; }
  };

  const buildBetData = () => {
    if (form.betType === "multiple") {
      const valid = form.selections.filter(s => s.description && s.odds && parseFloat(s.odds) > 0);
      if (!form.stake || valid.length < 2) return null;
      const parsed = valid.map(s => ({ ...s, odds: parseFloat(s.odds) }));
      const combinedOdds = Math.round(parsed.reduce((acc, s) => acc * s.odds, 1) * 100) / 100;
      return { type: "multiple", date: form.date, bookmaker: form.bookmaker, stake: parseFloat(form.stake), result: form.result, closingOdds: form.closingOdds ? parseFloat(form.closingOdds) : null, notes: form.notes, odds: combinedOdds, selections: parsed, description: parsed.map(s => s.description).join(" × ") };
    } else {
      if (!form.description || !form.odds || !form.stake) return null;
      return { type: "simple", date: form.date, sport: form.sport, market: form.market, bookmaker: form.bookmaker, description: form.description, odds: parseFloat(form.odds), closingOdds: form.closingOdds ? parseFloat(form.closingOdds) : null, stake: parseFloat(form.stake), result: form.result, notes: form.notes };
    }
  };

  const addBet = async () => {
    setFormError("");
    if (form.betType === "simple") {
      if (!form.description.trim()) { setFormError("Descrição é obrigatória."); return; }
      if (!form.odds || parseFloat(form.odds) <= 1) { setFormError("Informe uma odd válida (maior que 1.00)."); return; }
      if (!form.stake || parseFloat(form.stake) <= 0) { setFormError("Informe o valor do stake."); return; }
      if (parseFloat(form.stake) > stats.currentBankroll * 5) { setFormError(`Stake não pode ser maior que 5× sua banca (${fmt(stats.currentBankroll * 5)}). Verifique o valor.`); return; }
    } else {
      const valid = form.selections.filter(s => s.description && s.odds && parseFloat(s.odds) > 0);
      if (valid.length < 2) { setFormError("Preencha ao menos 2 seleções com descrição e odds."); return; }
      if (!form.stake || parseFloat(form.stake) <= 0) { setFormError("Informe o valor do stake."); return; }
      if (parseFloat(form.stake) > stats.currentBankroll * 5) { setFormError(`Stake não pode ser maior que 5× sua banca (${fmt(stats.currentBankroll * 5)}). Verifique o valor.`); return; }
    }
    const data = buildBetData();
    if (!data) return;
    try {
      if (editingBet) {
        await setDoc(doc(db, "users", user.uid, "bets", String(editingBet.id)), { ...data, id: editingBet.id });
      } else {
        const id = crypto.randomUUID();
        await setDoc(doc(db, "users", user.uid, "bets", id), { ...data, id });
      }
      localStorage.setItem("lastBookmaker", form.bookmaker);
      const dest = editingBet ? "/history" : "/dashboard";
      const msg = editingBet ? "Aposta atualizada! ✅" : "Aposta registrada! ✅";
      setEditingBet(null);
      setForm(defaultForm());
      setFormError("");
      setShareToast(msg); setTimeout(() => setShareToast(""), 3000);
      navigate(dest);
    } catch (err) { setSyncError("Erro ao salvar aposta: " + err.message); }
  };

  const startEdit = (bet) => {
    setEditingBet(bet);
    setForm({
      date: bet.date,
      betType: bet.type === "multiple" ? "multiple" : "simple",
      sport: bet.sport || "Futebol",
      market: bet.market || "1x2",
      bookmaker: bet.bookmaker || "Bet365",
      description: bet.type === "multiple" ? "" : (bet.description || ""),
      odds: bet.type === "multiple" ? "" : String(bet.odds ?? ""),
      closingOdds: bet.closingOdds != null ? String(bet.closingOdds) : "",
      stake: String(bet.stake ?? ""),
      result: bet.result,
      notes: bet.notes || "",
      selections: bet.type === "multiple" && bet.selections?.length
        ? bet.selections.map(s => ({ ...s, odds: String(s.odds) }))
        : [defaultSelection(), defaultSelection()],
    });
    navigate("/register");
  };

  const pending = bets.filter(b => b.result === "pending");
  const hasSettled = bets.some(b => b.result !== "pending");
  const isPremium = subscription?.status === "active";
  const betLimitReached = !isPremium && bets.length >= FREE_BET_LIMIT;


  const shareBet = async (bet) => {
    const pl = getBetPL(bet);
    const lines = [
      `🎯 *Banca Lógica* — ${bet.bookmaker}`,
      `📅 ${bet.date}`,
      `⚽ ${bet.description}`,
      `📊 @${bet.odds?.toFixed(2)} | ${fmt(bet.stake)}`,
      bet.result === "win" ? `✅ Green: +${fmt(pl)}` : bet.result === "loss" ? `❌ Red: -${fmt(Math.abs(pl))}` : `⏳ Pendente`,
    ];
    const text = lines.join("\n");
    if (navigator.share) {
      try { await navigator.share({ text }); } catch (_) {}
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedId(bet.id); setTimeout(() => setCopiedId(null), 2000);
      } catch (_) {}
    }
    setShareToast("Copiado para a área de transferência!");
    setTimeout(() => setShareToast(""), 3000);
  };

  const exportCSV = () => {
    const headers = ["Data","Tipo","Descrição","Casa","Esporte","Mercado","Odds","Stake","Resultado","P&L","CLV","Notas"];
    const rows = filteredBets.map(b => {
      const pl = getBetPL(b); const clv = getCLV(b);
      return [b.date, b.type === "multiple" ? `Múltipla(${b.selections?.length}x)` : "Simples",
        `"${(b.description||"").replace(/"/g,'""')}"`, b.bookmaker, b.sport||"", b.market||"",
        b.odds, b.stake, b.result, pl.toFixed(2), clv!=null?clv.toFixed(2):"",
        `"${(b.notes||"").replace(/"/g,'""')}"`].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `banca-logica-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const filteredBets = [...bets]
    .filter(b => historyFilter.result === "all" || b.result === historyFilter.result)
    .filter(b => historyFilter.bookmaker === "all" || b.bookmaker === historyFilter.bookmaker)
    .filter(b => historyFilter.sport === "all" || b.sport === historyFilter.sport || b.selections?.some(s => s.sport === historyFilter.sport))
    .filter(b => {
      if (!historyFilter.search) return true;
      const q = historyFilter.search.toLowerCase();
      return b.description?.toLowerCase().includes(q) || b.bookmaker?.toLowerCase().includes(q) ||
        b.date?.includes(q) || b.sport?.toLowerCase().includes(q) || b.market?.toLowerCase().includes(q) ||
        b.selections?.some(s => s.description?.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      switch (historyFilter.sortBy) {
        case "date_asc": return (a.date||"").localeCompare(b.date||"");
        case "pl_desc": return getBetPL(b) - getBetPL(a);
        case "pl_asc": return getBetPL(a) - getBetPL(b);
        case "odds_desc": return (b.odds||0) - (a.odds||0);
        case "stake_desc": return (b.stake||0) - (a.stake||0);
        default: return (b.date||"").localeCompare(a.date||"");
      }
    });

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

  const tabBtn = (id, label) => (
    <button key={id} onClick={() => setAnalyzeTab(id)} style={{ flex: 1, background: analyzeTab === id ? "var(--primary)" : "rgba(0,0,0,0.2)", color: analyzeTab === id ? "#000" : "var(--muted)", border: `1px solid ${analyzeTab === id ? "var(--primary)" : "var(--border)"}`, borderRadius: 6, padding: "10px 0", fontSize: 11, cursor: "pointer", fontFamily: "var(--font-sans)", fontWeight: 600, textTransform: "uppercase", transition: "all 0.2s ease", whiteSpace: "nowrap" }}>{label}</button>
  );

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
        {isPremium && (
          <div className="sidebar-only" style={{ margin: "0 12px 12px", padding: "8px 14px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, alignItems: "center", gap: 8 }}>
            <Crown size={14} color="#f59e0b" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>PLANO PRO ATIVO</span>
          </div>
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
            {view === "dashboard" && <>
              {performanceAlerts.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                  {performanceAlerts.map(alert => (
                    <div key={alert.id} className="animate-fade-in" style={{ display: "flex", alignItems: "flex-start", gap: 12, background: alert.color === "danger" ? "rgba(255,61,90,0.07)" : "rgba(245,158,11,0.07)", border: `1px solid ${alert.color === "danger" ? "rgba(255,61,90,0.25)" : "rgba(245,158,11,0.3)"}`, borderRadius: 12, padding: "14px 18px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 18, lineHeight: 1 }}>{alert.icon}</span>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{alert.title}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3, lineHeight: 1.6 }}>{alert.msg}</div>
                      </div>
                      <button onClick={() => dismissAlert(alert.id)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4, display: "flex", flexShrink: 0 }}><X size={16} /></button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                {[["7d","7 dias"],["30d","30 dias"],["90d","90 dias"],["all","Tudo"]].map(([p, label]) => (
                  <button key={p} onClick={() => setDashPeriod(p)} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: "1px solid", borderColor: dashPeriod === p ? "var(--primary)" : "var(--border)", background: dashPeriod === p ? "rgba(59,130,246,0.15)" : "transparent", color: dashPeriod === p ? "var(--primary)" : "var(--muted)", cursor: "pointer", transition: "all 0.15s" }}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid-4">
                {[{ label: "RET. BANCA", val: fmtPct(stats.roi), color: stats.roi >= 0 ? "g" : "r", tip: "Retorno sobre a banca inicial. Quanto sua banca cresceu em percentual." },
                  { label: "ROI / YIELD", val: fmtPct(stats.yield), color: stats.yield >= 0 ? "g" : "r", tip: "Padrão da indústria. Lucro líquido dividido pelo volume total apostado (stake). Acima de +5% por 100+ apostas é excepcional." },
                  { label: "TAXA DE ACERTO", val: `${stats.winRate.toFixed(1)}%`, color: "text", tip: "Porcentagem de vitórias em relação ao total de apostas concluídas." }, 
                  { label: "CLV MÉDIO", val: stats.avgCLV != null ? fmtPct(stats.avgCLV) : "—", color: stats.avgCLV != null ? (stats.avgCLV >= 0 ? "g" : "r") : "muted", tip: "Closing Line Value. Se positivo, significa que você bateu a casa de aposta e comprou odds maiores do que o valor de fechamento (O que garante lucro a longo prazo)." }].map(k => (
                  <div key={k.label} className="card">
                    <span className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{k.label} {k.tip && <InfoTooltip text={k.tip} />}</span>
                    <div className={`kpi-value ${k.color}`}>{k.val}</div>
                  </div>
                ))}
              </div>
              <div className="grid-4">
                {[{ label: "APOSTAS", val: stats.totalBets, color: "text" }, 
                  { label: "VITÓRIAS", val: stats.wins, color: "g" }, 
                  { label: "DERROTAS", val: stats.losses, color: "r" }, 
                  { label: "P&L TOTAL", val: `${stats.totalPL >= 0 ? "+" : "-"}${fmt(Math.abs(stats.totalPL))}`, color: stats.totalPL >= 0 ? "g" : "r", tip: "Profit & Loss. O seu resultado financeiro bruto em Reais." }].map(k => (
                  <div key={k.label} className="card" style={{ padding: "16px" }}>
                    <span className="kpi-label" style={{ fontSize: 9, display: 'flex', alignItems: 'center', gap: '4px' }}>{k.label} {k.tip && <InfoTooltip text={k.tip} />}</span>
                    <div className={`kpi-value ${k.color}`} style={{ fontSize: 20 }}>{k.val}</div>
                  </div>
                ))}
              </div>
              
              {/* ONBOARDING */}
              {bets.length === 0 && !config.onboardingDone && (
                <div className="card animate-fade-in" style={{ marginBottom: 24, borderColor: "rgba(139,127,245,0.3)", background: "linear-gradient(180deg,rgba(139,127,245,0.06) 0%,transparent 100%)" }}>
                  <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>🎯</div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: "var(--text)" }}>Bem-vindo à Banca Lógica!</h2>
                    <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>Configure em 3 passos e comece a gerir sua banca como um profissional.</p>
                  </div>
                  <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                    {[{ e: "💰", t: "1. Defina sua banca", d: "Toque no saldo no canto superior para ajustar o valor inicial.", a: null },
                      { e: "📝", t: "2. Registre apostas", d: "Manualmente ou importe por foto do cupom com IA.", a: () => navigate("/register") },
                      { e: "🤖", t: "3. Ative a IA", d: "Configure o Gemini para análises automáticas de performance.", a: () => navigate("/analyze") }].map((s, i) => (
                      <div key={i} onClick={s.a || undefined} style={{ flex: "1 1 160px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 12px", textAlign: "center", cursor: s.a ? "pointer" : "default", transition: "border-color 0.2s" }}
                        onMouseOver={e => s.a && (e.currentTarget.style.borderColor = "rgba(139,127,245,0.5)")}
                        onMouseOut={e => s.a && (e.currentTarget.style.borderColor = "var(--border)")}>
                        <div style={{ fontSize: 22, marginBottom: 6 }}>{s.e}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{s.t}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>{s.d}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => saveConfig({ ...config, onboardingDone: true })} style={{ width: "100%", background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", borderRadius: 8, padding: 10, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>PULAR INTRODUÇÃO</button>
                </div>
              )}

              {/* STREAK + EXPOSIÇÃO */}
              {currentStreak && currentStreak.count >= 2 && (
                <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 10, display: "flex", alignItems: "center", gap: 10, background: currentStreak.type === "win" ? "rgba(0,212,138,0.08)" : "rgba(255,61,90,0.08)", border: `1px solid ${currentStreak.type === "win" ? "rgba(0,212,138,0.25)" : "rgba(255,61,90,0.25)"}` }}>
                  {currentStreak.type === "win" ? <TrendingUp size={16} color="var(--primary)" /> : <TrendingDown size={16} color="var(--danger)" />}
                  <span style={{ fontSize: 13, fontWeight: 600, color: currentStreak.type === "win" ? "var(--primary)" : "var(--danger)" }}>
                    {currentStreak.count} {currentStreak.type === "win" ? "vitórias" : "derrotas"} consecutivas
                  </span>
                </div>
              )}
              {pendingExposure > 0 && (
                <div style={{ marginBottom: 24, padding: "10px 16px", borderRadius: 10, display: "flex", alignItems: "center", gap: 8, background: "rgba(139,127,245,0.06)", border: "1px solid rgba(139,127,245,0.15)" }}>
                  <Target size={14} color="var(--accent)" />
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>
                    <strong style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}>{fmt(pendingExposure)}</strong> em risco · {pending.length} aposta{pending.length > 1 ? "s" : ""} pendente{pending.length > 1 ? "s" : ""}
                  </span>
                </div>
              )}

              {/* META DO MÊS */}
              {config.monthlyGoal > 0 && thisMonthPL !== null && (
                <div className="card" style={{ marginBottom: 24, padding: "18px 24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span className="section-title" style={{ margin: 0 }}>META DO MÊS</span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--font-mono)", color: thisMonthPL >= 0 ? "var(--primary)" : "var(--danger)" }}>{thisMonthPL >= 0 ? "+" : ""}{fmt(thisMonthPL)}</span>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>/ {fmt(config.monthlyGoal)}</span>
                      <button onClick={() => saveConfig({ ...config, monthlyGoal: 0 })} title="Remover meta" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 2, display: "flex" }}><X size={12}/></button>
                    </div>
                  </div>
                  <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 3, background: thisMonthPL < 0 ? "var(--danger)" : thisMonthPL >= config.monthlyGoal ? "var(--primary)" : "var(--accent)", width: `${Math.min(Math.max((thisMonthPL / config.monthlyGoal) * 100, 0), 100)}%`, transition: "width 0.5s ease" }} />
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11, color: "var(--muted)" }}>
                    {thisMonthPL >= config.monthlyGoal ? "🎯 Meta atingida este mês!" : `${((thisMonthPL / config.monthlyGoal) * 100).toFixed(1)}% da meta`}
                  </div>
                </div>
              )}
              {!config.monthlyGoal && hasSettled && (
                <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="number" placeholder="Definir meta mensal (R$)..." className="input" style={{ flex: 1, padding: "10px 14px", fontSize: 13 }}
                    onKeyDown={e => { if (e.key === "Enter" && parseFloat(e.target.value) > 0) { saveConfig({ ...config, monthlyGoal: parseFloat(e.target.value) }); e.target.value = ""; }}} />
                  <span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>+ Meta mensal</span>
                </div>
              )}

              {stats.chartData.length > 2 && (
                <div className="card" style={{ marginBottom: 24, padding: "24px 20px" }}>
                  <span className="section-title">EVOLUÇÃO DO BANKROLL</span>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="d" tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "var(--font-mono)" }} width={80} tickFormatter={v => `R$${v}`} axisLine={false} tickLine={false} />
                      <ReferenceLine y={config.initialBankroll} stroke="var(--border)" strokeDasharray="4 4" />
                      <Tooltip 
                        contentStyle={{ background: "rgba(10, 10, 16, 0.9)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-mono)", backdropFilter: "blur(8px)" }} 
                        formatter={v => [fmt(v), "Bankroll"]} 
                        labelStyle={{ color: "var(--muted)", marginBottom: 4 }} 
                        itemStyle={{ color: "var(--primary)", fontWeight: 700 }}
                      />
                      <Line type="monotone" dataKey="v" stroke={stats.totalPL >= 0 ? "var(--primary)" : "var(--danger)"} strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 6, fill: stats.totalPL >= 0 ? "var(--primary)" : "var(--danger)", stroke: "#000", strokeWidth: 2 }} animationDuration={1000} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              
              {/* GRÁFICO MENSAL P&L */}
              {monthlyData.length > 1 && (
                <div className="card" style={{ marginBottom: 24, padding: "24px 20px" }}>
                  <span className="section-title">P&L POR MÊS</span>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "var(--font-mono)" }} tickFormatter={v => `R$${v}`} axisLine={false} tickLine={false} />
                      <ReferenceLine y={0} stroke="var(--border)" />
                      <Tooltip contentStyle={{ background: "rgba(10,10,16,0.9)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, fontFamily: "var(--font-mono)" }} formatter={v => [fmt(v), "P&L"]} labelStyle={{ color: "var(--muted)" }} />
                      <Bar dataKey="pl" radius={[4, 4, 0, 0]}>
                        {monthlyData.map((entry, i) => <Cell key={i} fill={entry.pl >= 0 ? "var(--primary)" : "var(--danger)"} fillOpacity={0.8} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {pending.length > 0 && (
                <div className="card" style={{ marginBottom: 24 }}>
                  <span className="section-title">APOSTAS PENDENTES</span>
                  {pending.map((bet, i) => (
                    <div key={bet.id} style={{ borderBottom: i < pending.length - 1 ? "1px solid var(--border)" : "none", paddingBottom: i < pending.length - 1 ? 16 : 0, marginBottom: i < pending.length - 1 ? 16 : 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                            {bet.type === "multiple" && <span className="badge acc" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10 }}><Layers size={10} />MÚLT {bet.selections?.length}×</span>}
                            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{bet.description}</span>
                          </div>
                          {bet.type === "multiple" && bet.selections?.length > 0 && (
                            <div style={{ marginBottom: 6, paddingLeft: 8, borderLeft: "2px solid var(--border)" }}>
                              {bet.selections.map((sel, si) => (
                                <div key={si} style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>
                                  <span style={{ color: "var(--text)" }}>{sel.description}</span> · {sel.sport} · {sel.market}
                                  <span style={{ color: "var(--accent)", fontFamily: "var(--font-mono)", marginLeft: 6 }}>@{parseFloat(sel.odds).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="bet-meta">{bet.type === "multiple" ? bet.bookmaker : `${bet.sport} · ${bet.market} · ${bet.bookmaker}`}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>@{bet.odds.toFixed(2)}{bet.type === "multiple" ? " comb." : ""}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{fmt(bet.stake)}</div>
                          <div style={{ fontSize: 11, color: "var(--primary)", fontFamily: "var(--font-mono)", marginTop: 2 }}>ret: {fmt(bet.stake * bet.odds)}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 12 }}>
                        <button className="outline-btn g" onClick={() => updateBetResult(bet.id, "win")}>GANHOU</button>
                        <button className="outline-btn r" onClick={() => updateBetResult(bet.id, "loss")}>PERDEU</button>
                        <button className="outline-btn muted" onClick={() => updateBetResult(bet.id, "void")}>VOID</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {hasSettled && (
                <div className="card" style={{ marginBottom: 24, padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <span className="section-title" style={{ margin: 0, marginBottom: 4, display: "block" }}>COMPARTILHAR BANCA</span>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>Gera um card de performance com seus resultados</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <button onClick={isPremium ? async () => { setSharingStats(true); const c = await generateStatsCard(stats, userDisplayName); await shareAsImage(c, "minha-banca.png"); setSharingStats(false); } : () => setShowUpgrade(true)} disabled={sharingStats} style={{ display: "flex", alignItems: "center", gap: 7, background: sharingStats ? "var(--border)" : isPremium ? "rgba(0,212,138,0.1)" : "rgba(245,158,11,0.08)", color: sharingStats ? "var(--muted)" : isPremium ? "var(--primary)" : "#f59e0b", border: `1px solid ${isPremium ? "rgba(0,212,138,0.3)" : "rgba(245,158,11,0.35)"}`, borderRadius: 8, padding: "9px 16px", fontSize: 12, fontWeight: 700, cursor: sharingStats ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
                        {sharingStats ? <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> GERANDO...</> : isPremium ? <><ImageDown size={13} /> BAIXAR CARD</> : <><Lock size={13} /> BAIXAR CARD <ProBadge /></>}
                      </button>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: isPremium && config.publicProfile ? "rgba(139,127,245,0.1)" : "rgba(0,0,0,0.2)", border: `1px solid ${isPremium && config.publicProfile ? "rgba(139,127,245,0.4)" : "var(--border)"}`, borderRadius: 8, cursor: "pointer", transition: "all 0.2s" }}
                        onClick={() => { if (!isPremium) { setShowUpgrade(true); return; } const np = !config.publicProfile; saveConfig({ ...config, publicProfile: np }); syncPublicProfile(np); }}>
                        {isPremium ? <Globe size={13} color={config.publicProfile ? "var(--accent)" : "var(--muted)"} /> : <Lock size={13} color="var(--muted)" />}
                        <span style={{ fontSize: 12, fontWeight: 600, color: isPremium && config.publicProfile ? "var(--accent)" : "var(--muted)" }}>
                          {isPremium ? (config.publicProfile ? "Perfil público ✓" : "Tornar público") : "Tornar público"}{!isPremium && <> <ProBadge /></>}
                        </span>
                      </div>
                    </div>
                  </div>
                  {config.publicProfile && (
                    <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(139,127,245,0.06)", borderRadius: 8, fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Globe size={12} color="var(--accent)" />
                      <span>Seu perfil aparece no ranking da comunidade. Link: </span>
                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: 11 }}>
                        {window.location.origin}?tipster={user?.uid}
                      </span>
                      <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?tipster=${user?.uid}`); }} style={{ background: "transparent", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "rgba(139,127,245,0.1)"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>COPIAR LINK</button>
                    </div>
                  )}
                </div>
              )}

              {bets.length === 0 && (
                <div className="empty-state">
                  <div style={{ fontSize: 48, marginBottom: 16, color: "var(--border)" }}><LayoutDashboard size={48} /></div>
                  <div style={{ fontSize: 16, marginBottom: 24, fontWeight: 500 }}>Nenhuma aposta registrada ainda.</div>
                  <button className="btn" style={{ width: "auto", padding: "12px 32px" }} onClick={() => navigate("/register")}>REGISTRAR PRIMEIRA APOSTA</button>
                </div>
              )}
            </>}

            {/* REGISTRAR */}
            {view === "register" && betLimitReached && !editingBet && (
              <div className="card animate-fade-in" style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", padding: "52px 32px", borderColor: "rgba(245,158,11,0.35)", background: "linear-gradient(180deg,rgba(245,158,11,0.06) 0%,var(--surface) 60%)" }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>🔒</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>Limite de {FREE_BET_LIMIT} apostas atingido</div>
                <div style={{ color: "var(--muted)", marginBottom: 28, lineHeight: 1.7, fontSize: 14 }}>
                  Você registrou <strong style={{ color: "var(--text)" }}>{bets.length} apostas</strong> no plano gratuito.<br />
                  Faça upgrade para apostas ilimitadas e muito mais.
                </div>
                <button onClick={() => setShowUpgrade(true)} style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)", color: "#000", border: "none", padding: "16px 40px", borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: "pointer", marginBottom: 16 }}>
                  <Crown size={16} style={{ display: "inline", marginRight: 8, verticalAlign: "middle" }} />VER PLANO PRO
                </button>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>ou <button onClick={() => navigate("/history")} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", padding: 0, fontSize: 12 }}>ver histórico de apostas</button></div>
              </div>
            )}
            {view === "register" && (!betLimitReached || editingBet) && <div className="card" style={{ maxWidth: 800, margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span className="section-title" style={{ margin: 0 }}>{editingBet ? "EDITAR APOSTA" : `NOVA APOSTA ${!isPremium ? `(${bets.length}/${FREE_BET_LIMIT})` : ""}`}</span>
                {editingBet && (
                  <button onClick={() => { setEditingBet(null); setForm(defaultForm()); setExtractError(""); navigate("/history"); }} style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", borderRadius: 8, padding: "8px 16px", fontSize: 12, cursor: "pointer", fontWeight: 600, fontFamily: "var(--font-sans)" }}>CANCELAR</button>
                )}
              </div>

              {/* IMPORTAR POR IMAGEM */}
              <div style={{ marginBottom: 24, padding: "16px 20px", background: "rgba(139,127,245,0.06)", border: "1px dashed rgba(139,127,245,0.35)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 3, display: "flex", alignItems: "center", gap: 8 }}>
                    <Camera size={15} color="var(--accent)" /> Importar por imagem
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>Envie um screenshot do cupom — IA preenche o formulário automaticamente</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {!geminiKey && <span style={{ fontSize: 11, color: "var(--danger)" }}>API Key não configurada</span>}
                  <button onClick={() => imageInputRef.current?.click()} disabled={extracting || !geminiKey} style={{ display: "flex", alignItems: "center", gap: 8, background: extracting || !geminiKey ? "var(--border)" : "rgba(139,127,245,0.15)", color: extracting || !geminiKey ? "var(--muted)" : "var(--accent)", border: "1px solid rgba(139,127,245,0.3)", borderRadius: 8, padding: "9px 16px", fontSize: 12, fontWeight: 700, cursor: extracting || !geminiKey ? "not-allowed" : "pointer", fontFamily: "var(--font-sans)", transition: "all 0.2s", whiteSpace: "nowrap" }}>
                    {extracting ? <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> LENDO...</> : <><Camera size={13} /> SELECIONAR</>}
                  </button>
                  <input ref={imageInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) extractFromImage(e.target.files[0]); }} />
                </div>
              </div>
              {extractError && <div style={{ marginBottom: 16, fontSize: 13, color: "var(--danger)", padding: "12px 14px", background: "rgba(255,61,90,0.08)", borderRadius: 8, border: "1px solid rgba(255,61,90,0.2)" }}>{extractError}</div>}

              <div className="bet-type-toggle">
                <button className={`bet-type-btn ${form.betType === "simple" ? "active" : ""}`} onClick={() => setForm(p => ({ ...p, betType: "simple" }))}>SIMPLES</button>
                <button className={`bet-type-btn mult ${form.betType === "multiple" ? "active" : ""}`} onClick={() => setForm(p => ({ ...p, betType: "multiple" }))}>
                  <Layers size={13} />MÚLTIPLA
                </button>
              </div>

              {form.betType === "simple" ? (
                <>
                <div className="grid-2">
                  <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                    <span className="form-label">DESCRIÇÃO</span>
                    <input type="text" placeholder="ex: Palmeiras x Corinthians — Palmeiras" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="input" />
                  </div>
                  <div className="form-group">
                    <span className="form-label">DATA</span>
                    <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="input" />
                  </div>
                  <div className="form-group">
                    <span className="form-label">STAKE (R$)</span>
                    <input type="number" placeholder="100.00" step="any" value={form.stake} onChange={e => setForm(p => ({ ...p, stake: e.target.value }))} className="input" />
                    {form.stake && parseFloat(form.stake) > stats.currentBankroll * 0.2 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12, color: "#f59e0b" }}>
                        <AlertTriangle size={13} />
                        {parseFloat(form.stake) > stats.currentBankroll
                          ? `Stake maior que sua banca atual (${fmt(stats.currentBankroll)}).`
                          : `Stake representa ${((parseFloat(form.stake) / stats.currentBankroll) * 100).toFixed(0)}% da banca — acima de 20%.`}
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <span className="form-label">ODDS</span>
                    <input type="number" placeholder="1.85" step="0.01" value={form.odds} onChange={e => setForm(p => ({ ...p, odds: e.target.value }))} className="input" />
                  </div>
                  <div className="form-group">
                    <span className="form-label">ODDS DE FECHAMENTO (CLV)</span>
                    <input type="number" placeholder="Opcional" step="0.01" value={form.closingOdds} onChange={e => setForm(p => ({ ...p, closingOdds: e.target.value }))} className="input" />
                  </div>
                  <div className="form-group">
                    <span className="form-label">ESPORTE</span>
                    <select value={form.sport} onChange={e => setForm(p => ({ ...p, sport: e.target.value }))} className="select">{SPORTS.map(o => <option key={o} value={o}>{o}</option>)}</select>
                  </div>
                  <div className="form-group">
                    <span className="form-label">MERCADO</span>
                    <select value={form.market} onChange={e => setForm(p => ({ ...p, market: e.target.value }))} className="select">{MARKETS.map(o => <option key={o} value={o}>{o}</option>)}</select>
                  </div>
                  <div className="form-group">
                    <span className="form-label">CASA DE APOSTA</span>
                    <select value={form.bookmaker} onChange={e => setForm(p => ({ ...p, bookmaker: e.target.value }))} className="select">{BOOKMAKERS.map(o => <option key={o} value={o}>{o}</option>)}</select>
                  </div>
                  <div className="form-group">
                    <span className="form-label">RESULTADO</span>
                    <select value={form.result} onChange={e => setForm(p => ({ ...p, result: e.target.value }))} className="select">
                      {[["pending","Pendente"],["win","Ganhou"],["loss","Perdeu"],["void","Void"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                    <span className="form-label">NOTAS — opcional</span>
                    <input type="text" placeholder="Raciocínio da aposta, contexto..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="input" />
                  </div>
                </div>
                {form.odds && form.stake && parseFloat(form.odds) > 1 && parseFloat(form.stake) > 0 && (
                  <div style={{ marginTop: 4, marginBottom: 8, padding: "10px 14px", background: "rgba(0,212,138,0.06)", borderRadius: 8, border: "1px solid rgba(0,212,138,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>Retorno potencial</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--primary)", fontFamily: "var(--font-mono)" }}>{fmt(parseFloat(form.stake) * parseFloat(form.odds))}</span>
                  </div>
                )}
                <div className="grid-2" style={{ marginBottom: 0 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <span className="form-label">PROB. ESTIMADA (%) — EV</span>
                    <input type="number" placeholder="ex: 58 → calcula seu EV" step="1" min="1" max="99" value={form.prob} onChange={e => setForm(p => ({ ...p, prob: e.target.value }))} className="input" />
                  </div>
                  {formEV && (
                    <div className="form-group" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                      <div style={{ width: "100%", padding: "16px", borderRadius: 10, background: formEV.positive ? "rgba(0,212,138,0.08)" : "rgba(255,61,90,0.08)", border: `1px solid ${formEV.positive ? "rgba(0,212,138,0.3)" : "rgba(255,61,90,0.3)"}` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "var(--muted)", marginBottom: 4 }}>EXPECTED VALUE</div>
                        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-mono)", color: formEV.positive ? "var(--primary)" : "var(--danger)" }}>{formEV.positive ? "+" : ""}{formEV.pct}%</div>
                      </div>
                    </div>
                  )}
                </div>
                </>
              ) : (
                <>
                  <div className="grid-2" style={{ marginBottom: 8 }}>
                    <div className="form-group">
                      <span className="form-label">DATA</span>
                      <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="input" />
                    </div>
                    <div className="form-group">
                      <span className="form-label">STAKE (R$)</span>
                      <input type="number" placeholder="100.00" step="any" value={form.stake} onChange={e => setForm(p => ({ ...p, stake: e.target.value }))} className="input" />
                    </div>
                    <div className="form-group">
                      <span className="form-label">CASA DE APOSTA</span>
                      <select value={form.bookmaker} onChange={e => setForm(p => ({ ...p, bookmaker: e.target.value }))} className="select">{BOOKMAKERS.map(o => <option key={o} value={o}>{o}</option>)}</select>
                    </div>
                    <div className="form-group">
                      <span className="form-label">RESULTADO</span>
                      <select value={form.result} onChange={e => setForm(p => ({ ...p, result: e.target.value }))} className="select">
                        {[["pending","Pendente"],["win","Ganhou"],["loss","Perdeu"],["void","Void"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                      <span className="form-label">ODDS DE FECHAMENTO (CLV) — opcional</span>
                      <input type="number" placeholder="Odd combinada final no fechamento" step="0.01" value={form.closingOdds} onChange={e => setForm(p => ({ ...p, closingOdds: e.target.value }))} className="input" />
                    </div>
                    <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                      <span className="form-label">NOTAS — opcional</span>
                      <input type="text" placeholder="Raciocínio da aposta, contexto..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="input" />
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <span className="section-title" style={{ margin: 0 }}>SELEÇÕES</span>
                      {(() => {
                        const v = form.selections.filter(s => s.odds && parseFloat(s.odds) > 0);
                        if (v.length < 2) return null;
                        const comb = v.reduce((acc, s) => acc * parseFloat(s.odds), 1);
                        return (
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 2, fontWeight: 700, textTransform: "uppercase" }}>Odd combinada</span>
                            <span style={{ fontSize: 24, fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>@{comb.toFixed(2)}</span>
                          </div>
                        );
                      })()}
                    </div>

                    {form.selections.map((sel, i) => (
                      <div key={sel.id} className="selection-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Seleção {i + 1}</span>
                          {form.selections.length > 2 && (
                            <button onClick={() => setForm(p => ({ ...p, selections: p.selections.filter(s => s.id !== sel.id) }))} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", borderRadius: 4, transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color = "var(--danger)"} onMouseOut={e => e.currentTarget.style.color = "var(--muted)"}><X size={14} /></button>
                          )}
                        </div>
                        <input type="text" placeholder="ex: Palmeiras vence" value={sel.description} onChange={e => setForm(p => ({ ...p, selections: p.selections.map(s => s.id === sel.id ? { ...s, description: e.target.value } : s) }))} className="input" style={{ marginBottom: 10 }} />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 90px", gap: 10 }}>
                          <select value={sel.sport} onChange={e => setForm(p => ({ ...p, selections: p.selections.map(s => s.id === sel.id ? { ...s, sport: e.target.value } : s) }))} className="select">{SPORTS.map(o => <option key={o} value={o}>{o}</option>)}</select>
                          <select value={sel.market} onChange={e => setForm(p => ({ ...p, selections: p.selections.map(s => s.id === sel.id ? { ...s, market: e.target.value } : s) }))} className="select">{MARKETS.map(o => <option key={o} value={o}>{o}</option>)}</select>
                          <input type="number" placeholder="@odd" step="0.01" value={sel.odds} onChange={e => setForm(p => ({ ...p, selections: p.selections.map(s => s.id === sel.id ? { ...s, odds: e.target.value } : s) }))} className="input" />
                        </div>
                      </div>
                    ))}

                    <button onClick={() => setForm(p => ({ ...p, selections: [...p.selections, defaultSelection()] }))} style={{ width: "100%", background: "transparent", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 10, padding: 14, color: "var(--muted)", cursor: "pointer", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginTop: 4, fontFamily: "var(--font-sans)", textTransform: "uppercase", transition: "all 0.2s ease" }} onMouseOver={e => { e.currentTarget.style.borderColor = "rgba(139,127,245,0.4)"; e.currentTarget.style.color = "var(--accent)"; }} onMouseOut={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "var(--muted)"; }}>
                      + ADICIONAR SELEÇÃO
                    </button>
                  </div>
                </>
              )}

              {formError && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--danger)", fontSize: 13, background: "rgba(255,61,90,0.08)", border: "1px solid rgba(255,61,90,0.3)", borderRadius: 8, padding: "10px 14px", marginTop: 8 }}>
                  <AlertTriangle size={15} /> {formError}
                </div>
              )}
              <button className="btn" style={{ marginTop: 8 }} onClick={addBet}>{editingBet ? "SALVAR ALTERAÇÕES" : `REGISTRAR ${form.betType === "multiple" ? "MÚLTIPLA" : "APOSTA"}`}</button>
            </div>}

            {/* HISTÓRICO */}
            {view === "history" && <div style={{ maxWidth: 800, margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span className="section-title" style={{ margin: 0 }}>HISTÓRICO DE APOSTAS</span>
                <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>
                  {filteredBets.length}{filteredBets.length !== bets.length ? ` de ${bets.length}` : ""} registros
                </span>
              </div>

              {/* Filtros */}
              <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[["all","TODOS"],["pending","PENDENTES"],["win","GANHOU"],["loss","PERDEU"],["void","VOID"]].map(([val, label]) => (
                    <button key={val} onClick={() => setHistoryFilter(f => ({ ...f, result: val }))} style={{ background: historyFilter.result === val ? "var(--primary)" : "rgba(0,0,0,0.2)", color: historyFilter.result === val ? "#000" : "var(--muted)", border: `1px solid ${historyFilter.result === val ? "var(--primary)" : "var(--border)"}`, borderRadius: 20, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)", transition: "all 0.2s ease" }}>{label}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <select value={historyFilter.bookmaker} onChange={e => setHistoryFilter(f => ({ ...f, bookmaker: e.target.value }))} className="select" style={{ flex: "1 1 140px", padding: "10px 14px", fontSize: 12 }}>
                    <option value="all">Todas as casas</option>
                    {BOOKMAKERS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <select value={historyFilter.sport} onChange={e => setHistoryFilter(f => ({ ...f, sport: e.target.value }))} className="select" style={{ flex: "1 1 130px", padding: "10px 14px", fontSize: 12 }}>
                    <option value="all">Todos esportes</option>
                    {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={historyFilter.sortBy} onChange={e => setHistoryFilter(f => ({ ...f, sortBy: e.target.value }))} className="select" style={{ flex: "1 1 160px", padding: "10px 14px", fontSize: 12 }}>
                    <option value="date_desc">Mais recentes</option>
                    <option value="date_asc">Mais antigas</option>
                    <option value="pl_desc">Maior lucro</option>
                    <option value="pl_asc">Maior perda</option>
                    <option value="odds_desc">Maiores odds</option>
                    <option value="stake_desc">Maior stake</option>
                  </select>
                  {filteredBets.length > 0 && (
                    <button onClick={isPremium ? exportCSV : () => setShowUpgrade(true)} title={isPremium ? "Exportar CSV" : "CSV disponível no plano Pro"} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid var(--border)", color: isPremium ? "var(--muted)" : "var(--muted)", borderRadius: 10, padding: "10px 14px", fontSize: 12, cursor: "pointer", fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap", opacity: isPremium ? 1 : 0.75 }}
                      onMouseOver={e => { e.currentTarget.style.color = isPremium ? "var(--primary)" : "#f59e0b"; e.currentTarget.style.borderColor = isPremium ? "var(--primary)" : "#f59e0b"; }}
                      onMouseOut={e => { e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
                      {isPremium ? <Download size={13} /> : <Lock size={13} />} CSV {!isPremium && <ProBadge />}
                    </button>
                  )}
                </div>
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
                  <input type="text" placeholder="Buscar por descrição, casa, esporte, data..." value={historyFilter.search} onChange={e => setHistoryFilter(f => ({ ...f, search: e.target.value }))} className="input" style={{ paddingLeft: 38, paddingTop: 12, paddingBottom: 12, fontSize: 13 }} />
                  {historyFilter.search && <button onClick={() => setHistoryFilter(f => ({ ...f, search: "" }))} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4, display: "flex" }}><X size={14} /></button>}
                </div>
              </div>

              {bets.length === 0 && <div className="empty-state"><List size={48} style={{ color: "var(--border)", margin: "0 auto 16px" }} /><div>Nenhuma aposta registrada.</div></div>}
              {bets.length > 0 && filteredBets.length === 0 && <div className="empty-state"><Search size={40} style={{ color: "var(--border)", margin: "0 auto 16px" }} /><div>Nenhuma aposta encontrada com esses filtros.</div></div>}
              {filteredBets.map(bet => {
                const pl = getBetPL(bet); const clv = getCLV(bet);
                const [rlabel, rclass] = RESULT_MAP[bet.result] || ["?", "muted"];
                return (
                  <div key={bet.id} className="bet-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: 6, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                          <span className={`badge ${rclass}`}>{rlabel}</span>
                          {bet.type === "multiple" && <span className="badge acc" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Layers size={10} />MÚLT {bet.selections?.length}×</span>}
                          <span className="bet-name">{bet.description}</span>
                        </div>
                        <div className="bet-meta">{bet.date} • {bet.type === "multiple" ? bet.bookmaker : `${bet.sport} • ${bet.market} • ${bet.bookmaker}`}</div>
                        {bet.type === "multiple" && bet.selections?.length > 0 && (
                          <div style={{ marginTop: 10, paddingLeft: 10, borderLeft: "2px solid var(--border)" }}>
                            {bet.selections.map((sel, i) => (
                              <div key={i} style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <span style={{ color: "var(--text)", fontWeight: 500 }}>{sel.description}</span>
                                <span>·</span><span>{sel.sport}</span>
                                <span>·</span><span>{sel.market}</span>
                                <span style={{ color: "var(--accent)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>@{parseFloat(sel.odds).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="bet-stats">
                          <span className="bet-stat" style={{ color: "var(--accent)", fontWeight: 700 }}>@{bet.odds.toFixed(2)}{bet.type === "multiple" ? " comb." : ""}</span>
                          <span className="bet-stat" style={{ color: "var(--text)" }}>{fmt(bet.stake)}</span>
                          {bet.result !== "pending" && <span className="bet-stat" style={{ color: pl >= 0 ? "var(--primary)" : "var(--danger)", fontWeight: 700 }}>P&L: {pl >= 0 ? "+" : ""}{fmt(Math.abs(pl))}</span>}
                          {bet.result === "pending" && <span className="bet-stat" style={{ color: "var(--muted)" }}>Ret: {fmt(bet.stake * bet.odds)}</span>}
                          {clv != null && <span className="bet-stat" style={{ color: clv >= 0 ? "var(--primary)" : "var(--danger)", fontWeight: 700 }}>CLV: {clv >= 0 ? "+" : ""}{clv.toFixed(1)}%</span>}
                        </div>
                        {bet.notes && <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)", fontStyle: "italic", borderTop: "1px solid var(--border)", paddingTop: 8 }}>"{bet.notes}"</div>}
                      </div>
                      <div style={{ display: "flex", gap: 2, flexShrink: 0, alignItems: "flex-start" }}>
                        {deletingId !== bet.id && (
                          <button onClick={() => shareBet(bet)} title={copiedId === bet.id ? "Copiado!" : "Compartilhar (texto)"} style={{ background: "transparent", border: "none", color: copiedId === bet.id ? "var(--primary)" : "var(--muted)", cursor: "pointer", padding: 8, borderRadius: 4, display: "flex", transition: "color 0.2s" }} onMouseOver={e => { if (copiedId !== bet.id) e.currentTarget.style.color = "var(--primary)"; }} onMouseOut={e => { if (copiedId !== bet.id) e.currentTarget.style.color = "var(--muted)"; }}>
                            {copiedId === bet.id ? <Check size={15} /> : <Share2 size={15} />}
                          </button>
                        )}
                        {deletingId !== bet.id && (
                          <button onClick={isPremium ? async () => { setSharingBetId(null); setSharingBetId(bet.id); try { const timeout = new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 10000)); const c = await Promise.race([generateBetCard(bet), timeout]); await shareAsImage(c, `aposta-${bet.date}.png`); setShareToast("Card gerado! ✓"); } catch(_e) { setShareToast("Não foi possível gerar o card."); } finally { setSharingBetId(null); setTimeout(() => setShareToast(""), 4000); } } : () => setShowUpgrade(true)} title={isPremium ? "Salvar como imagem" : "Card de imagem — plano Pro"} style={{ background: "transparent", border: "none", color: sharingBetId === bet.id ? "var(--accent)" : "var(--muted)", cursor: "pointer", padding: 8, borderRadius: 4, display: "flex", transition: "color 0.2s" }} onMouseOver={e => { if (sharingBetId !== bet.id) e.currentTarget.style.color = isPremium ? "var(--accent)" : "#f59e0b"; }} onMouseOut={e => { if (sharingBetId !== bet.id) e.currentTarget.style.color = "var(--muted)"; }}>
                            {sharingBetId === bet.id ? <RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> : isPremium ? <ImageDown size={15} /> : <Lock size={15} />}
                          </button>
                        )}
                        {deletingId !== bet.id && (
                          <button onClick={() => startEdit(bet)} title="Editar aposta" style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 8, borderRadius: 4, display: "flex" }} onMouseOver={e => e.currentTarget.style.color = "var(--accent)"} onMouseOut={e => e.currentTarget.style.color = "var(--muted)"}><Edit2 size={15} /></button>
                        )}
                        {deletingId === bet.id ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                            <button onClick={() => deleteBet(bet.id)} style={{ fontSize: 11, background: "rgba(255,61,90,0.15)", color: "var(--danger)", border: "1px solid rgba(255,61,90,0.35)", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}>EXCLUIR</button>
                            <button onClick={() => setDeletingId(null)} style={{ fontSize: 11, background: "transparent", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 12px", cursor: "pointer", whiteSpace: "nowrap" }}>CANCELAR</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeletingId(bet.id)} title="Excluir aposta" style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 8, borderRadius: 4, display: "flex" }} onMouseOver={e => e.currentTarget.style.color = "var(--danger)"} onMouseOut={e => e.currentTarget.style.color = "var(--muted)"}><X size={18} /></button>
                        )}
                      </div>
                    </div>
                    {bet.result === "pending" && (
                      <div style={{ display: "flex", gap: 10, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                        <button className="outline-btn g" onClick={() => updateBetResult(bet.id, "win")}>GANHOU</button>
                        <button className="outline-btn r" onClick={() => updateBetResult(bet.id, "loss")}>PERDEU</button>
                        <button className="outline-btn muted" onClick={() => updateBetResult(bet.id, "void")}>VOID</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>}

            {/* ANÁLISE */}
            {view === "analyze" && <div style={{ maxWidth: 1000, margin: "0 auto" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <span className="section-title" style={{ marginBottom: 0 }}>ANÁLISE DE PERFORMANCE</span>
                {isPremium
                  ? <button onClick={exportPDF} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      <Download size={13} />Exportar PDF
                    </button>
                  : <button onClick={() => setShowUpgrade(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      <Crown size={13} />PDF PRO
                    </button>
                }
              </div>
              <>
                <div style={{ display: "flex", gap: 12, marginBottom: 24, overflowX: "auto", paddingBottom: 8 }}>
                  {tabBtn("ia", "Inteligência IA")}
                  {hasSettled && tabBtn("market", "Mercados")}
                  {hasSettled && tabBtn("bookmaker", "Casas de Aposta")}
                  {hasSettled && tabBtn("sport", "Esportes")}
                  {tabBtn("calendar", "Calendário")}
                  {tabBtn("community", "Comunidade")}
                  {hasSettled && tabBtn("cenarios", isPremium ? "Cenários" : "Cenários 🔒")}
                </div>
                {analyzeTab === "ia" && <AIInsights stats={stats} marketSeg={marketSeg} bookSeg={bookSeg} sportSeg={sportSeg} bets={bets} apiKey={geminiKey} onApiKeyChange={saveGeminiKey} />}
                {(analyzeTab === "market" || analyzeTab === "bookmaker" || analyzeTab === "sport") && !hasSettled && (
                  <div className="empty-state">
                    <BarChart2 size={48} style={{ marginBottom: 16, color: "var(--border)", margin: "0 auto" }} />
                    <div style={{ fontSize: 16, fontWeight: 500 }}>Registre apostas liquidadas para ver os gráficos de performance.</div>
                  </div>
                )}
                {analyzeTab === "market" && hasSettled && <><HighlightCards data={marketSeg} bestLabel="MELHOR MERCADO" worstLabel="PIOR MERCADO" /><SegmentTable title="PERFORMANCE POR MERCADO" data={marketSeg} /></>}
                {analyzeTab === "bookmaker" && hasSettled && <><HighlightCards data={bookSeg} bestLabel="MELHOR CASA" worstLabel="PIOR CASA" /><SegmentTable title="PERFORMANCE POR CASA DE APOSTA" data={bookSeg} /></>}
                {analyzeTab === "sport" && hasSettled && <><HighlightCards data={sportSeg} bestLabel="MELHOR ESPORTE" worstLabel="PIOR ESPORTE" /><SegmentTable title="PERFORMANCE POR ESPORTE" data={sportSeg} /></>}
                  {analyzeTab === "calendar" && (
                    <div className="card">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                        <button onClick={() => setCalendarDate(d => { const p = new Date(d.year, d.month - 1, 1); return { year: p.getFullYear(), month: p.getMonth() }; })} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 8, display: "flex", borderRadius: 6, transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color = "var(--text)"} onMouseOut={e => e.currentTarget.style.color = "var(--muted)"}>
                          <ChevronLeft size={20} />
                        </button>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", textTransform: "capitalize" }}>
                          {new Date(calendarDate.year, calendarDate.month, 15).toLocaleString("pt-BR", { month: "long", year: "numeric" })}
                        </span>
                        <button onClick={() => setCalendarDate(d => { const n = new Date(d.year, d.month + 1, 1); return { year: n.getFullYear(), month: n.getMonth() }; })} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 8, display: "flex", borderRadius: 6, transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color = "var(--text)"} onMouseOut={e => e.currentTarget.style.color = "var(--muted)"}>
                          <ChevronRight size={20} />
                        </button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
                        {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d => (
                          <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "var(--muted)", padding: "6px 0", letterSpacing: 1 }}>{d}</div>
                        ))}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                        {calendarDays.map((cell, i) => {
                          if (!cell) return <div key={i} />;
                          const hasBets = cell.bets.length > 0;
                          const hasWin = cell.bets.some(b => b.result === "win");
                          const hasLoss = cell.bets.some(b => b.result === "loss");
                          const hasPending = cell.bets.some(b => b.result === "pending");
                          const dotColor = hasWin && !hasLoss ? "var(--primary)" : hasLoss && !hasWin ? "var(--danger)" : hasPending ? "var(--accent)" : hasBets ? "var(--muted)" : "transparent";
                          const isSelected = calendarDay === cell.date;
                          return (
                            <div key={i} onClick={() => setCalendarDay(isSelected ? null : cell.date)}
                              style={{ textAlign: "center", padding: "8px 2px", borderRadius: 8, cursor: hasBets ? "pointer" : "default", background: isSelected ? "rgba(0,212,138,0.12)" : hasBets ? "rgba(255,255,255,0.04)" : "transparent", border: `1px solid ${isSelected ? "rgba(0,212,138,0.5)" : hasBets ? "var(--border)" : "transparent"}`, transition: "all 0.15s" }}>
                              <div style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: hasBets ? "var(--text)" : "var(--muted)", marginBottom: 4 }}>{cell.day}</div>
                              {hasBets && <div style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, margin: "0 auto" }} />}
                            </div>
                          );
                        })}
                      </div>
                      {calendarDay && (() => {
                        const dayBets = bets.filter(b => b.date === calendarDay);
                        if (!dayBets.length) return null;
                        const dayPL = dayBets.filter(b => b.result !== "pending").reduce((s, b) => s + getBetPL(b), 0);
                        return (
                          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 2, textTransform: "uppercase" }}><CalendarDays size={12} style={{ marginRight: 6, verticalAlign: "middle" }} />{calendarDay}</span>
                              <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-mono)", color: dayPL >= 0 ? "var(--primary)" : "var(--danger)" }}>{dayPL >= 0 ? "+" : ""}{fmt(dayPL)}</span>
                            </div>
                            {dayBets.map(b => {
                              const [rl, rc] = RESULT_MAP[b.result] || ["?","muted"];
                              return (
                                <div key={b.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ marginBottom: 3 }}>
                                      <span className={`badge ${rc}`}>{rl}</span>
                                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{b.description}</span>
                                    </div>
                                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{b.bookmaker} · @{b.odds?.toFixed(2)} · {fmt(b.stake)}</div>
                                  </div>
                                  <div style={{ fontSize: 13, fontFamily: "var(--font-mono)", fontWeight: 700, color: getBetPL(b) >= 0 ? "var(--primary)" : "var(--danger)", flexShrink: 0 }}>
                                    {b.result === "pending" ? "⏳" : `${getBetPL(b) >= 0 ? "+" : ""}${fmt(Math.abs(getBetPL(b)))}`}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {analyzeTab === "community" && (
                    <div>
                      <div className="card" style={{ marginBottom: 20, padding: "20px 24px", background: config.publicProfile ? "rgba(139,127,245,0.06)" : "rgba(0,0,0,0.2)", borderColor: config.publicProfile ? "rgba(139,127,245,0.3)" : "var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                              <Globe size={14} color={config.publicProfile ? "var(--accent)" : "var(--muted)"} /> Perfil público de tipster
                            </div>
                            <div style={{ fontSize: 12, color: "var(--muted)" }}>{config.publicProfile ? "Seu perfil aparece no ranking abaixo." : "Ative para aparecer no ranking da comunidade."}</div>
                          </div>
                          <button onClick={() => { const np = !config.publicProfile; saveConfig({ ...config, publicProfile: np }); syncPublicProfile(np); }} style={{ display: "flex", alignItems: "center", gap: 8, background: config.publicProfile ? "rgba(139,127,245,0.2)" : "rgba(0,0,0,0.3)", color: config.publicProfile ? "var(--accent)" : "var(--muted)", border: `1px solid ${config.publicProfile ? "rgba(139,127,245,0.5)" : "var(--border)"}`, borderRadius: 8, padding: "9px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }}>
                            <Users size={14} /> {config.publicProfile ? "VISÍVEL NO RANKING" : "ENTRAR NO RANKING"}
                          </button>
                        </div>
                      </div>

                      <div className="card" style={{ padding: "20px 24px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                          <span className="section-title" style={{ margin: 0 }}>RANKING DE TIPSTERS</span>
                          <button onClick={fetchLeaderboard} disabled={leaderboardLoading} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", borderRadius: 6, padding: "7px 12px", fontSize: 11, cursor: leaderboardLoading ? "not-allowed" : "pointer", fontWeight: 600, transition: "all 0.2s" }}>
                            <RefreshCw size={12} style={leaderboardLoading ? { animation: "spin 1s linear infinite" } : {}} /> ATUALIZAR
                          </button>
                        </div>
                        {leaderboard.length === 0 && !leaderboardLoading && (
                          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
                            <Users size={36} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
                            <div style={{ fontSize: 13, marginBottom: 8 }}>Clique em Atualizar para carregar o ranking.</div>
                            <div style={{ fontSize: 12, opacity: 0.7 }}>Tipsters com perfil público aparecem aqui ordenados por ROI.</div>
                          </div>
                        )}
                        {leaderboard.length > 0 && (
                          <div style={{ overflowX: "auto" }}>
                            <table className="data-table">
                              <thead><tr>
                                {["#", "TIPSTER", "ROI", "YIELD", "ACERTO", "AP"].map(h => (
                                  <th key={h} style={{ textAlign: h === "TIPSTER" || h === "#" ? "left" : "right" }}>{h}</th>
                                ))}
                              </tr></thead>
                              <tbody>
                                {leaderboard.map((p, i) => (
                                  <tr key={p.uid}>
                                    <td style={{ color: i < 3 ? ["#ffd700","#c0c0c0","#cd7f32"][i] : "var(--muted)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>{i + 1}</td>
                                    <td>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), var(--primary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                                          {(p.displayName?.[0] || "?").toUpperCase()}
                                        </div>
                                        <span style={{ fontWeight: 600, color: "var(--text)" }}>{p.displayName || "Anônimo"}</span>
                                        {p.uid === user?.uid && <span className="badge acc" style={{ fontSize: 9, padding: "2px 6px" }}>VOCÊ</span>}
                                      </div>
                                    </td>
                                    <td style={{ textAlign: "right", color: p.roi >= 0 ? "var(--primary)" : "var(--danger)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>{fmtPct(p.roi)}</td>
                                    <td style={{ textAlign: "right", color: p.yield >= 0 ? "var(--primary)" : "var(--danger)", fontFamily: "var(--font-mono)" }}>{fmtPct(p.yield)}</td>
                                    <td style={{ textAlign: "right", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{p.winRate?.toFixed(1)}%</td>
                                    <td style={{ textAlign: "right", color: "var(--muted)" }}>{p.settledBets}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {analyzeTab === "cenarios" && (
                    isPremium
                      ? <ScenarioSimulator bets={bets} initialBankroll={config.initialBankroll} />
                      : <div className="card" style={{ textAlign: "center", padding: "48px 32px" }}>
                          <div style={{ fontSize: 36, marginBottom: 16 }}>🔒</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Simulador de Cenários Kelly</div>
                          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24, lineHeight: 1.7 }}>
                            Compare sua performance real com 4 estratégias de gestão de banca.<br />
                            Disponível no Plano PRO.
                          </div>
                          <button className="btn" onClick={() => setShowUpgrade(true)}>
                            <Crown size={14} style={{ marginRight: 6 }} />VER PLANO PRO
                          </button>
                        </div>
                  )}
                </>
            </div>}

            {/* KELLY / CALCULADORAS */}
            {view === "kelly" && <div style={{ maxWidth: 700, margin: "0 auto" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {[["kelly","Kelly"],["dutch","Dutching"],["arb","Arbitragem"]].map(([t,label]) => (
                  <button key={t} onClick={() => setCalcTab(t)} style={{ padding: "8px 20px", borderRadius: 20, fontSize: 13, fontWeight: 600, border: "1px solid", borderColor: calcTab === t ? "var(--primary)" : "var(--border)", background: calcTab === t ? "rgba(59,130,246,0.15)" : "transparent", color: calcTab === t ? "var(--primary)" : "var(--muted)", cursor: "pointer" }}>
                    {label}
                  </button>
                ))}
              </div>

              {calcTab === "kelly" && <div className="card">
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <Calculator size={20} color="var(--primary)" />
                  <span className="section-title" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    CALCULADORA CRITÉRIO DE KELLY
                    <InfoTooltip text="O Critério de Kelly é a fórmula matemática de ouro das apostas. Ele calcula a porcentagem exata da sua banca que deve ser apostada com base na sua probabilidade para maximizar o lucro a longo prazo e reduzir a chance de quebra a zero." />
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24, lineHeight: 1.6 }}>Calcule o tamanho ideal (stake) para sua aposta com base na sua vantagem matemática estimada. Informe sua probabilidade real e a odd oferecida pela casa.</p>

                <div className="grid-2">
                  <div className="form-group">
                    <span className="form-label">SUA PROBABILIDADE ESTIMADA (%)</span>
                    <input type="number" placeholder="ex: 55" value={kellyForm.prob} onChange={e => setKellyForm(p => ({ ...p, prob: e.target.value }))} className="input" />
                  </div>
                  <div className="form-group">
                    <span className="form-label">ODDS DA CASA</span>
                    <input type="number" placeholder="ex: 1.85" value={kellyForm.odds} onChange={e => setKellyForm(p => ({ ...p, odds: e.target.value }))} className="input" />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 32 }}>
                  <span className="form-label">BANKROLL ATUAL (R$) — vazio = usa saldo total</span>
                  <input type="number" placeholder={stats.currentBankroll.toFixed(2)} value={kellyForm.bankroll} onChange={e => setKellyForm(p => ({ ...p, bankroll: e.target.value }))} className="input" />
                </div>

                {kellyForm.prob && (parseFloat(kellyForm.prob) <= 0 || parseFloat(kellyForm.prob) >= 100) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#f59e0b", fontSize: 13, marginBottom: 16 }}>
                    <AlertTriangle size={15} /> Probabilidade deve ser entre 1% e 99%.
                  </div>
                )}
                {kellyForm.odds && parseFloat(kellyForm.odds) <= 1 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#f59e0b", fontSize: 13, marginBottom: 16 }}>
                    <AlertTriangle size={15} /> Odds devem ser maiores que 1.00 para haver valor positivo.
                  </div>
                )}

                {kellyResult && (
                  <div className="card animate-fade-in" style={{ background: kellyResult.hasValue ? "linear-gradient(180deg, rgba(0,212,138,0.08) 0%, transparent 100%)" : "linear-gradient(180deg, rgba(255,61,90,0.08) 0%, transparent 100%)", borderColor: kellyResult.hasValue ? "rgba(0,212,138,0.3)" : "rgba(255,61,90,0.3)", padding: "24px" }}>
                    {kellyResult.hasValue
                      ? <>
                          <span className="kpi-label" style={{ color: "var(--primary)" }}>STAKE RECOMENDADO</span>
                          <div style={{ fontSize: 40, fontWeight: 700, color: "var(--primary)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>{fmt(kellyResult.amount)}</div>
                          <div style={{ fontSize: 14, color: "var(--text)", marginBottom: 16, fontWeight: 500 }}>{kellyResult.fraction.toFixed(2)}% do bankroll</div>
                          <div style={{ padding: "12px 16px", background: "rgba(0,0,0,0.3)", borderRadius: 8, fontSize: 12, color: "var(--muted)", lineHeight: 1.6, borderLeft: "3px solid var(--accent)" }}>
                            <strong style={{ color: "var(--text)" }}>Dica Profissional:</strong> A fórmula Kelly completa é altamente agressiva e propensa a alta variância. É padrão na indústria utilizar o <strong>Meio-Kelly ({fmt(kellyResult.amount / 2)})</strong> ou até <strong>Quarto-Kelly ({fmt(kellyResult.amount / 4)})</strong> para proteger seu bankroll contra sequências de perdas.
                          </div>
                        </>
                      : <>
                          <div style={{ fontSize: 32, marginBottom: 8 }}>🚫</div>
                          <span className="kpi-label" style={{ color: "var(--danger)" }}>{kellyResult.fraction === 0 ? "SEM VANTAGEM — EV NEUTRO" : "EV NEGATIVO — NÃO APOSTE"}</span>
                          <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6, marginTop: 8 }}>
                            {kellyResult.fraction === 0
                              ? "Sua probabilidade estimada empata exatamente com a odd oferecida. Não há vantagem matemática — o Kelly recomenda "
                              : "Sua probabilidade estimada é inferior à odd oferecida. A expectativa é de prejuízo a longo prazo — o Kelly recomenda "}
                            <strong style={{ color: "var(--danger)", fontSize: 16 }}>não apostar</strong>.
                          </div>
                        </>
                    }
                  </div>
                )}
              </div>}

              {calcTab === "dutch" && <div className="card">
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <Calculator size={20} color="var(--primary)" />
                  <span className="section-title" style={{ marginBottom: 0 }}>CALCULADORA DE DUTCHING</span>
                </div>
                <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24, lineHeight: 1.6 }}>Distribua sua stake entre múltiplos resultados para garantir o mesmo retorno independente de qual ganhar.</p>
                {dutchForm.map((row, i) => (
                  <div key={i} className="form-group">
                    <span className="form-label">ODD {i+1}</span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="number" placeholder="ex: 2.50" value={row.odds} onChange={e => setDutchForm(f => f.map((r,j) => j===i ? {...r, odds: e.target.value} : r))} className="input" />
                      {dutchForm.length > 2 && <button type="button" onClick={() => setDutchForm(f => f.filter((_,j) => j!==i))} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, color: "var(--danger)", cursor: "pointer", padding: "8px 12px" }}><X size={14}/></button>}
                    </div>
                  </div>
                ))}
                {dutchForm.length < 8 && <button type="button" onClick={() => setDutchForm(f => [...f, {odds:""}])} style={{ marginBottom: 20, background: "none", border: "1px dashed var(--border)", borderRadius: 8, color: "var(--muted)", cursor: "pointer", padding: "10px 16px", width: "100%", fontSize: 13 }}>+ Adicionar Outcome</button>}
                <div className="form-group" style={{ marginBottom: 24 }}>
                  <span className="form-label">STAKE TOTAL (R$) — opcional</span>
                  <input type="number" placeholder="ex: 100.00" value={dutchStake} onChange={e => setDutchStake(e.target.value)} className="input" />
                </div>
                {dutchResult && (
                  <div className="card animate-fade-in" style={{ background: "rgba(59,130,246,0.06)", borderColor: "rgba(59,130,246,0.3)", padding: 20 }}>
                    <span className="kpi-label" style={{ color: "var(--primary)", marginBottom: 12, display: "block" }}>DISTRIBUIÇÃO DE STAKES</span>
                    {dutchResult.pcts.map((pct, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < dutchResult.pcts.length-1 ? "1px solid var(--border)" : "none" }}>
                        <span style={{ color: "var(--muted)", fontSize: 14 }}>Outcome {i+1}</span>
                        <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text)" }}>
                          {dutchResult.amounts ? `R$ ${dutchResult.amounts[i]}` : `${pct}%`}
                        </span>
                      </div>
                    ))}
                    <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(16,185,129,0.1)", borderRadius: 8, fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>
                      {dutchResult.profit
                        ? `Lucro garantido: R$ ${dutchResult.profit} (+${dutchResult.margin}%)`
                        : `Margem garantida: +${dutchResult.margin}% sobre o total apostado`}
                    </div>
                  </div>
                )}
                {dutchForm.filter(r => parseFloat(r.odds) > 1).length >= 2 && !dutchResult && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--danger)", fontSize: 13 }}>
                    <AlertTriangle size={15} /> Odds insuficientes para garantir lucro — total de probabilidades ≥ 100%.
                  </div>
                )}
              </div>}

              {calcTab === "arb" && <div className="card">
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <Calculator size={20} color="var(--accent)" />
                  <span className="section-title" style={{ marginBottom: 0 }}>CALCULADORA DE ARBITRAGEM</span>
                </div>
                <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24, lineHeight: 1.6 }}>Detecte oportunidades de arb (surebet) entre duas casas de aposta. Garanta lucro independente do resultado.</p>
                <div className="grid-2">
                  <div className="form-group">
                    <span className="form-label">ODD — CASA 1</span>
                    <input type="number" placeholder="ex: 2.10" value={arbForm.odds1} onChange={e => setArbForm(f => ({...f, odds1: e.target.value}))} className="input" />
                  </div>
                  <div className="form-group">
                    <span className="form-label">ODD — CASA 2</span>
                    <input type="number" placeholder="ex: 2.10" value={arbForm.odds2} onChange={e => setArbForm(f => ({...f, odds2: e.target.value}))} className="input" />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 24 }}>
                  <span className="form-label">STAKE TOTAL (R$)</span>
                  <input type="number" placeholder="ex: 100.00" value={arbForm.stake} onChange={e => setArbForm(f => ({...f, stake: e.target.value}))} className="input" />
                </div>
                {arbResult && (
                  arbResult.isArb
                    ? <div className="card animate-fade-in" style={{ background: "rgba(16,185,129,0.06)", borderColor: "rgba(16,185,129,0.3)", padding: 20 }}>
                        <span className="kpi-label" style={{ color: "var(--accent)", marginBottom: 12, display: "block" }}>✅ ARBITRAGEM DETECTADA — +{arbResult.margin}% garantido</span>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "rgba(0,0,0,0.2)", borderRadius: 8 }}>
                            <span style={{ color: "var(--muted)" }}>Casa 1 (odd {arbForm.odds1})</span>
                            <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text)" }}>R$ {arbResult.s1}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "rgba(0,0,0,0.2)", borderRadius: 8 }}>
                            <span style={{ color: "var(--muted)" }}>Casa 2 (odd {arbForm.odds2})</span>
                            <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text)" }}>R$ {arbResult.s2}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "rgba(16,185,129,0.1)", borderRadius: 8, borderLeft: "3px solid var(--accent)" }}>
                            <span style={{ color: "var(--accent)", fontWeight: 600 }}>Lucro garantido</span>
                            <span style={{ fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: 18 }}>R$ {arbResult.profit}</span>
                          </div>
                        </div>
                      </div>
                    : <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--danger)", fontSize: 13 }}>
                        <AlertTriangle size={15} /> Sem arbitragem — margem da casa de {arbResult.margin}%. Tente odds mais altas.
                      </div>
                )}
              </div>}
            </div>}

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
