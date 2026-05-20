import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { InnerBetsProvider } from './contexts/BetsContext.jsx'
import { UIProvider } from './contexts/UIContext.jsx'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
  });
}

const ErrorFallback = ({ error }) => (
  <div style={{ padding: 40, fontFamily: 'monospace', color: '#ff3d5a', background: '#050508', minHeight: '100vh' }}>
    <h2 style={{ marginBottom: 16 }}>Erro de renderização</h2>
    <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: '#e4e4f0' }}>{String(error)}</pre>
    <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: '#808098', marginTop: 16 }}>{error?.stack}</pre>
    <button onClick={() => window.location.reload()} style={{ marginTop: 24, padding: '10px 20px', background: '#00d48a', color: '#000', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
      Recarregar
    </button>
  </div>
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={({ error }) => <ErrorFallback error={error} />}>
      <AuthProvider>
        <InnerBetsProvider>
          <UIProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </UIProvider>
        </InnerBetsProvider>
      </AuthProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
