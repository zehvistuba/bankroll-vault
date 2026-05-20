import { fmtPct } from "../utils/formatting";

export function SegmentTable({ title, data }) {
  if (!data.length) return null;
  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <span className="section-title">{title}</span>
      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead><tr>{["", "AP", "W", "L", "YIELD", "P&L"].map(h => (
            <th key={h} style={{ textAlign: h === "" ? "left" : "right" }}>{h}</th>
          ))}</tr></thead>
          <tbody>{[...data].sort((a, b) => b.pl - a.pl).map(row => (
            <tr key={row.name}>
              <td style={{ color: "var(--text)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</td>
              <td style={{ textAlign: "right", color: "var(--muted)" }}>{row.bets}</td>
              <td style={{ textAlign: "right", color: "var(--primary)" }}>{row.wins}</td>
              <td style={{ textAlign: "right", color: "var(--danger)" }}>{row.losses}</td>
              <td style={{ textAlign: "right", color: row.yield >= 0 ? "var(--primary)" : "var(--danger)", fontWeight: 600, fontFamily: "var(--font-mono)" }}>{row.stake > 0 ? fmtPct(row.yield) : "—"}</td>
              <td style={{ textAlign: "right", color: row.pl >= 0 ? "var(--primary)" : "var(--danger)", fontWeight: 600, fontFamily: "var(--font-mono)" }}>{`${row.pl >= 0 ? "+" : ""}R$${Math.round(row.pl)}`}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
