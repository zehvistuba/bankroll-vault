import { useState, useEffect } from "react";
import { auth, googleProvider } from "../firebase";
import {
  signInWithPopup, signOut, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  updateProfile, sendEmailVerification, sendPasswordResetEmail,
} from "firebase/auth";
import * as Sentry from "@sentry/react";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userDisplayName, setUserDisplayName] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authInProgress, setAuthInProgress] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setUserDisplayName(u?.displayName || u?.email?.split("@")[0] || "");
      setAuthLoading(false);
      // Sentry user context: attach UID/email to all errors from this session
      if (u) {
        Sentry.setUser({ id: u.uid, email: u.email ?? undefined });
      } else {
        Sentry.setUser(null);
      }
    });
    return () => unsub();
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

  return {
    user, authLoading,
    userDisplayName, setUserDisplayName,
    email, setEmail,
    password, setPassword,
    nome, setNome,
    confirmPassword, setConfirmPassword,
    isRegistering, setIsRegistering,
    authError, setAuthError,
    authInProgress, setAuthInProgress,
    showPassword, setShowPassword,
    forgotPasswordSent, setForgotPasswordSent,
    handleLogout, handleGoogleLogin, handleForgotPassword, handleEmailAuth,
  };
}
