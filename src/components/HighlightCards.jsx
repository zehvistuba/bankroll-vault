import { fmtPct } from "../utils/formatting";

export function HighlightCards({ data, bestLabel, worstLabel }) {
  const valid = data.filter(m => m.stake > 0 && m.bets >= 2);
  if (valid.length < 2) return null;
  const best  = [...valid].sort((a, b) => b.yield - a.yield)[0];
  const worst = [...valid].sort((a, b) => a.yield - b.yield)[0];
  return (
    <div className="grid-2">
      <div className="card" style={{ borderColor: "rgba(0, 212, 138, 0.3)", background: "linear-gradient(180deg, rgba(0,212,138,0.05) 0%, transparent 100%)" }}>
        <span className="kpi-label" style={{ color: "var(--primary)" }}>{bestLabel}</span>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "var(--text)" }}>{best.name}</div>
        <div className="kpi-value g">{fmtPct(best.yield)}</div>
      </div>
      <div className="card" style={{ borderColor: "rgba(255, 61, 90, 0.3)", background: "linear-gradient(180deg, rgba(255,61,90,0.05) 0%, transparent 100%)" }}>
        <span className="kpi-label" style={{ color: "var(--danger)" }}>{worstLabel}</span>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "var(--text)" }}>{worst.name}</div>
        <div className="kpi-value r">{fmtPct(worst.yield)}</div>
      </div>
    </div>
  );
}
