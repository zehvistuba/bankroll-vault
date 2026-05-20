import { Check, Zap } from "lucide-react";
import { HOTMART_CHECKOUT_URL } from "../constants/checkout";

export function UpgradeModal({ onClose, user }) {
  const features = [
    "Apostas ilimitadas (grátis: até 30)",
    "Cards de imagem para compartilhar",
    "Exportar histórico em CSV",
    "Perfil público de tipster",
    "Ranking da comunidade",
    "Suporte prioritário",
  ];
  const hotmartUrl = `${HOTMART_CHECKOUT_URL}?email=${encodeURIComponent(user?.email || "")}`;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div className="card animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, width: "100%", padding: "36px 32px", background: "linear-gradient(180deg,rgba(245,158,11,0.07) 0%,var(--surface) 50%)", borderColor: "rgba(245,158,11,0.35)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>👑</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#f59e0b", marginBottom: 8 }}>BANCA LÓGICA PRO</div>
          <div style={{ fontSize: 38, fontWeight: 800, color: "var(--text)", fontFamily: "var(--font-mono)", lineHeight: 1 }}>R$ 19,90</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>por mês · cancele quando quiser</div>
        </div>
        <div style={{ marginBottom: 28 }}>
          {features.map(f => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(245,158,11,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Check size={12} color="#f59e0b" />
              </div>
              <span style={{ fontSize: 13, color: "var(--text)" }}>{f}</span>
            </div>
          ))}
        </div>
        <a href={hotmartUrl} target="_blank" rel="noreferrer" style={{ display: "block", textAlign: "center", background: "linear-gradient(135deg,#f59e0b,#f97316)", color: "#000", padding: "16px", borderRadius: 10, fontSize: 15, fontWeight: 800, textDecoration: "none", marginBottom: 12, letterSpacing: 0.5 }}>
          <Zap size={16} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />ASSINAR AGORA
        </a>
        <div style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", marginBottom: 16 }}>🔒 Pagamento seguro via Hotmart</div>
        <button onClick={onClose} style={{ display: "block", width: "100%", background: "transparent", border: "none", color: "var(--muted)", fontSize: 13, cursor: "pointer", padding: 8 }}>
          Continuar com plano gratuito →
        </button>
      </div>
    </div>
  );
}
