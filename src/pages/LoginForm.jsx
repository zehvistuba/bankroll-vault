import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";

export function LoginForm({
  isRegistering, setIsRegistering,
  email, setEmail,
  password, setPassword,
  nome, setNome,
  confirmPassword, setConfirmPassword,
  showPassword, setShowPassword,
  authError, authInProgress,
  forgotPasswordSent,
  handleEmailAuth, handleGoogleLogin, handleForgotPassword,
}) {
  return (
    <div style={{ display: "flex", width: "100%", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="card animate-fade-in" style={{ maxWidth: 400, width: "100%", padding: "40px 30px" }}>
        <div style={{ marginBottom: 30, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <img src="/logo-banca-logica.png" alt="Banca Lógica" style={{ height: 90 }} />
          </div>
          <p style={{ color: "var(--muted)", marginTop: 10, fontSize: 14, lineHeight: 1.6 }}>
            Acesse para salvar sua banca na nuvem.
          </p>
        </div>

        <form onSubmit={handleEmailAuth} style={{ marginBottom: 20 }}>
          {isRegistering && (
            <div className="form-group">
              <span className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <User size={12} /> NOME
              </span>
              <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} className="input" placeholder="Seu nome" />
            </div>
          )}
          <div className="form-group">
            <span className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Mail size={12} /> E-MAIL
            </span>
            <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="seu@email.com" inputMode="email" autoComplete="email" />
          </div>
          <div className="form-group">
            <span className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Lock size={12} /> SENHA
            </span>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4, display: "flex" }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {isRegistering && password.length > 0 && (() => {
              const score = (password.length >= 8 ? 1 : 0) + (/[0-9]/.test(password) ? 1 : 0) + (/[^a-zA-Z0-9]/.test(password) ? 1 : 0);
              const lvl = score === 0 ? { w: "20%", color: "var(--danger)", label: "Fraca" } : score === 1 ? { w: "50%", color: "#f59e0b", label: "Média" } : score === 2 ? { w: "75%", color: "#3b82f6", label: "Boa" } : { w: "100%", color: "var(--primary)", label: "Forte" };
              return (
                <div style={{ marginTop: 6 }}>
                  <div style={{ height: 3, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: lvl.w, background: lvl.color, borderRadius: 4, transition: "width 0.3s ease, background 0.3s ease" }} />
                  </div>
                  <span style={{ fontSize: 10, color: lvl.color, fontWeight: 600, letterSpacing: 0.5 }}>{lvl.label}</span>
                </div>
              );
            })()}
          </div>
          {isRegistering && (
            <div className="form-group">
              <span className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Lock size={12} /> CONFIRMAR SENHA
              </span>
              <input type={showPassword ? "text" : "password"} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input" placeholder="••••••••" />
            </div>
          )}
          {!isRegistering && (
            <div style={{ textAlign: "right", marginTop: -8, marginBottom: 12 }}>
              {forgotPasswordSent ? (
                <span style={{ color: "var(--primary)", fontSize: 12 }}>✓ Email de recuperação enviado!</span>
              ) : (
                <button type="button" onClick={handleForgotPassword} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12, cursor: "pointer", padding: 0 }}>
                  Esqueceu a senha?
                </button>
              )}
            </div>
          )}
          {authError && (
            <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 16, background: "rgba(255,61,90,0.1)", padding: 10, borderRadius: 6, lineHeight: 1.5, border: "1px solid rgba(255,61,90,0.3)" }}>
              {authError}
            </div>
          )}
          <button
            type="submit"
            disabled={authInProgress}
            style={{ width: "100%", background: "var(--primary)", color: "#fff", border: "none", padding: "14px", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: authInProgress ? "not-allowed" : "pointer", opacity: authInProgress ? 0.7 : 1, transition: "opacity 0.2s" }}
          >
            {authInProgress ? "CARREGANDO..." : isRegistering ? "CRIAR CONTA" : "ENTRAR"}
          </button>
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 13 }}>
            <span style={{ color: "var(--muted)" }}>{isRegistering ? "Já tem conta?" : "Não tem conta?"} </span>
            <button type="button" onClick={() => setIsRegistering((v) => !v)} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 13, cursor: "pointer", fontWeight: 600, padding: 0 }}>
              {isRegistering ? "Entrar" : "Criar conta"}
            </button>
          </div>
        </form>

        <div style={{ display: "flex", alignItems: "center", margin: "8px 0 16px" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ padding: "0 12px", color: "var(--muted)", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>OU</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={authInProgress}
          style={{ width: "100%", background: "transparent", border: "1px solid var(--border)", color: "var(--text)", padding: "14px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: authInProgress ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, opacity: authInProgress ? 0.7 : 1, transition: "background 0.2s" }}
          onMouseOver={(e) => !authInProgress && (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
          onMouseOut={(e) => !authInProgress && (e.currentTarget.style.background = "transparent")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          CONTINUAR COM GOOGLE
        </button>
      </div>
    </div>
  );
}
