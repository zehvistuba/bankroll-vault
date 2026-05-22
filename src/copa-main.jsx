/**
 * copa-main.jsx — Entry point do app standalone "Bolão Copa 2026"
 *
 * Deployável separadamente em qualquer domínio (ex: bolaocopa2026.app).
 * Usa o mesmo Firebase do BL para persistência. Sem sidebar/navegação do BL.
 *
 * Build: npm run build:copa → gera dist-copa/ pronto para deploy
 */
import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { auth } from './firebase';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth';
import { CopaPage, CopaShareView } from './pages/CopaPage';

// ─── Estilos base mínimos ─────────────────────────────────────────────────────
const BASE_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 16px; }
  body { background: #07071a; color: #f0f0ff; -webkit-font-smoothing: antialiased; }
  button { font-family: inherit; }
  a { color: inherit; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
`;

function injectCSS() {
  if (document.getElementById('copa-base')) return;
  const s = document.createElement('style');
  s.id = 'copa-base';
  s.textContent = BASE_CSS;
  document.head.appendChild(s);
}

// ─── Tela de Login ────────────────────────────────────────────────────────────
function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleGoogle = async () => {
    setLoading(true); setErr('');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      setErr('Erro ao entrar. Tente novamente.');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(160deg, #07071a 0%, #0e0e28 55%, #140709 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, textAlign: 'center', gap: 28,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 72, lineHeight: 1 }}>🏆</span>
        <div style={{ fontSize: 32, fontWeight: 900, color: '#C8102E', fontFamily: "'Oswald', 'Impact', sans-serif", letterSpacing: 3, lineHeight: 1 }}>
          BOLÃO<br />COPA 2026
        </div>
        <div style={{ fontSize: 14, color: '#8888bb', fontFamily: 'Georgia, serif', fontStyle: 'italic', maxWidth: 300, lineHeight: 1.5 }}>
          Preencha seus palpites, acompanhe o chaveamento e compartilhe com os amigos!
        </div>
      </div>

      {/* Card de login */}
      <div style={{
        background: 'rgba(200,16,46,0.06)', border: '1px solid rgba(200,16,46,0.2)',
        borderRadius: 16, padding: '28px 32px', width: '100%', maxWidth: 360,
        boxShadow: '0 0 40px rgba(200,16,46,0.2)',
      }}>
        <div style={{ fontSize: 13, color: '#8888bb', fontFamily: "'Oswald', sans-serif", letterSpacing: 1, marginBottom: 20 }}>
          ACESSE COM SUA CONTA
        </div>

        <button
          onClick={handleGoogle} disabled={loading}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '14px 20px', borderRadius: 10, cursor: loading ? 'wait' : 'pointer',
            background: loading ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5,
            transition: 'all 0.2s',
          }}>
          {loading ? '...' : <>
            <svg width="18" height="18" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 29.8 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/><path fill="#34A853" d="M6.3 14.7l7 5.1C15.2 16.5 19.3 14 24 14c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.6 7.3 6.3 14.7z"/><path fill="#FBBC05" d="M24 46c5.5 0 10.5-1.9 14.4-5.1l-6.7-5.5C29.7 36.9 27 38 24 38c-5.8 0-10.7-3.9-12.4-9.2l-6.9 5.4C8.5 42.2 15.7 46 24 46z"/><path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-1.4 3.9-5.2 6.5-11.8 6.5-2.1 0-4.1-.5-5.9-1.3l-6.9 5.3C14.2 43.3 18.8 45 24 45c11.2 0 21-9.1 21-22 0-1.3-.2-2.7-.5-4z" opacity=".1"/></g></svg>
            Entrar com Google
          </>}
        </button>

        {err && <div style={{ marginTop: 12, fontSize: 12, color: '#f44', fontFamily: 'sans-serif' }}>{err}</div>}

        <div style={{ marginTop: 20, fontSize: 11, color: 'rgba(136,136,187,0.7)', fontFamily: 'sans-serif', lineHeight: 1.5 }}>
          Suas previsões ficam salvas na sua conta.
          <br />Você pode acessar e editar de qualquer dispositivo.
        </div>
      </div>

      {/* Rodapé BL */}
      <a href="https://bancalogica.app" target="_blank" rel="noopener noreferrer"
        style={{ fontSize: 12, color: 'rgba(136,136,187,0.6)', textDecoration: 'none', fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5 }}>
        Uma ferramenta de <strong style={{ color: '#FFD700' }}>Banca Lógica</strong> →
      </a>
    </div>
  );
}

// ─── Mini-header para o standalone (canto superior direito) ───────────────────
function CopaHeader({ user }) {
  if (!user) return null;
  return (
    <div style={{
      position: 'fixed', top: 10, right: 12, zIndex: 500,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{
        fontSize: 11, color: 'rgba(136,136,187,0.8)',
        fontFamily: "'Oswald', sans-serif", letterSpacing: 0.3,
        maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
      </span>
      <button
        onClick={() => signOut(auth)}
        style={{
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(136,136,187,0.8)', borderRadius: 6, padding: '4px 10px',
          fontSize: 10, cursor: 'pointer', fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5,
        }}>
        SAIR
      </button>
    </div>
  );
}

// ─── App principal ────────────────────────────────────────────────────────────
const DEMO_USER = { uid: 'demo', displayName: 'Demo User', email: 'demo@example.com' };

function CopaStandaloneApp() {
  const isDemo = new URLSearchParams(window.location.search).get('demo') === '1';
  const [user, setUser] = useState(isDemo ? DEMO_USER : undefined); // undefined = carregando
  const shareUID = new URLSearchParams(window.location.search).get('share');

  useEffect(() => {
    injectCSS();
    document.title = '🏆 Bolão Copa 2026';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', '#07071a');
  }, []);

  useEffect(() => {
    if (isDemo) return; // skip Firebase auth in demo mode
    return onAuthStateChanged(auth, (u) => setUser(u || null));
  }, [isDemo]);

  // View de compartilhamento público (sem login)
  if (shareUID) return <CopaShareView shareUID={shareUID} />;

  // Carregando auth
  if (user === undefined) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#07071a',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 44 }}>🏆</span>
        <div style={{ fontSize: 12, color: '#8888bb', fontFamily: "'Oswald', sans-serif", letterSpacing: 2 }}>
          CARREGANDO...
        </div>
      </div>
    </div>
  );

  // Não autenticado
  if (!user) return <LoginScreen />;

  // Autenticado — mostra bolão completo
  return (
    <>
      <CopaHeader user={user} />
      <CopaPage user={user} />
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CopaStandaloneApp />
  </StrictMode>
);
