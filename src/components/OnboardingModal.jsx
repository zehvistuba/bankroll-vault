export function OnboardingModal({ step, banca, onBancaChange, onNext, onClose, onGoRegister, onGoAnalyze }) {
  const steps = [
    { emoji: "👋", title: "Bem-vindo à Banca Lógica!", sub: "Configure sua banca em 2 minutos e comece a acompanhar seu desempenho.", label: "1 / 3" },
    { emoji: "📝", title: "Registre sua primeira aposta", sub: "Adicione manualmente ou importe um screenshot do seu cupom — a IA preenche tudo automaticamente.", label: "2 / 3" },
    { emoji: "🤖", title: "Análise inteligente com IA", sub: "Configure o Google Gemini gratuitamente e receba insights sobre seu desempenho, padrões e erros.", label: "3 / 3" },
  ];
  const s = steps[step - 1];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="card animate-fade-in" style={{ maxWidth: 420, width: "100%", padding: "40px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "var(--muted)", marginBottom: 16 }}>{s.label}</div>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 24 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: 3, width: i === step ? 32 : 16, borderRadius: 4, background: i === step ? "var(--primary)" : i < step ? "var(--primary)" : "var(--border)", transition: "all 0.3s" }} />
          ))}
        </div>
        <div style={{ fontSize: 40, marginBottom: 16 }}>{s.emoji}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>{s.title}</div>
        <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7, marginBottom: 28 }}>{s.sub}</div>

        {step === 1 && (
          <div style={{ marginBottom: 24, textAlign: "left" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", letterSpacing: 1, marginBottom: 8 }}>BANCA INICIAL (R$)</div>
            <input
              type="number" min="1" value={banca} onChange={e => onBancaChange(e.target.value)}
              className="input" style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--font-mono)", textAlign: "center", color: "var(--primary)" }}
              placeholder="1000" autoFocus
            />
          </div>
        )}

        {step === 1 && (
          <button className="btn" style={{ width: "100%", marginBottom: 12 }} onClick={onNext}>
            Confirmar banca →
          </button>
        )}
        {step === 2 && <>
          <button className="btn" style={{ width: "100%", marginBottom: 12 }} onClick={onGoRegister}>
            Registrar primeira aposta →
          </button>
          <button onClick={onNext} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 13, cursor: "pointer", padding: 8, width: "100%" }}>
            Farei depois
          </button>
        </>}
        {step === 3 && <>
          <button className="btn" style={{ width: "100%", marginBottom: 12 }} onClick={onGoAnalyze}>
            Ir para Análise →
          </button>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 13, cursor: "pointer", padding: 8, width: "100%" }}>
            Concluir configuração
          </button>
        </>}
      </div>
    </div>
  );
}
