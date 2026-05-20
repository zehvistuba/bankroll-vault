import { Globe } from "lucide-react";
import { fmtPct } from "../utils/formatting";

export function TipsterProfile({ tipsterProfile }) {
  return (
    <div style={{ display: "flex", width: "100%", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: 20, flexDirection: "column", gap: 20 }}>
      <div className="card animate-fade-in" style={{ maxWidth: 480, width: "100%", padding: "40px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), var(--primary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {(tipsterProfile.displayName?.[0] || "?").toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{tipsterProfile.displayName}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
              <Globe size={11} /> Perfil público · Banca Lógica
            </div>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: 20 }}>
          {[
            { label: "ROI", v: fmtPct(tipsterProfile.roi), color: tipsterProfile.roi >= 0 ? "var(--primary)" : "var(--danger)" },
            { label: "YIELD", v: fmtPct(tipsterProfile.yield), color: tipsterProfile.yield >= 0 ? "var(--primary)" : "var(--danger)" },
            { label: "TAXA DE ACERTO", v: `${tipsterProfile.winRate?.toFixed(1)}%`, color: "var(--text)" },
            { label: "P&L TOTAL", v: `${tipsterProfile.totalPL >= 0 ? "+" : ""}R$${Math.round(tipsterProfile.totalPL)}`, color: tipsterProfile.totalPL >= 0 ? "var(--primary)" : "var(--danger)" },
          ].map((k) => (
            <div key={k.label} style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-mono)", color: k.color }}>{k.v}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 28, textAlign: "center" }}>
          {tipsterProfile.settledBets} apostas liquidadas · {tipsterProfile.wins}W / {tipsterProfile.losses}L
        </div>

        <div style={{ padding: "16px", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 10, textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Gerencie sua banca como um profissional</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>Rastreie seus resultados, analise seu edge e descubra seus padrões com IA.</div>
          <button
            onClick={() => { window.history.replaceState({}, "", window.location.pathname); window.location.reload(); }}
            style={{ background: "var(--primary)", color: "#fff", border: "none", borderRadius: 8, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            CRIAR CONTA GRÁTIS
          </button>
        </div>
      </div>
    </div>
  );
}
