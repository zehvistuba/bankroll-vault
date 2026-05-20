import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { InnerBetsProvider } from './contexts/BetsContext.jsx'
import { UIProvider } from './contexts/UIContext.jsx'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 40, fontFamily: 'monospace', color: '#ff3d5a', background: '#050508', minHeight: '100vh' }}>
        <h2 style={{ marginBottom: 16 }}>Erro de renderização</h2>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: '#e4e4f0' }}>{String(this.state.error)}</pre>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: '#808098', marginTop: 16 }}>{this.state.error?.stack}</pre>
      </div>
    );
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <InnerBetsProvider>
          <UIProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </UIProvider>
        </InnerBetsProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
