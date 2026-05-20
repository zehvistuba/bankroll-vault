import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { BarChart2 } from "lucide-react";

export function ScenarioSimulator({ bets, initialBankroll }) {
  const settled = useMemo(() =>
    [...bets].filter(b => b.result === "win" || b.result === "loss")
      .sort((a, b) => a.date.localeCompare(b.date)),
  [bets]);

  const { chartData, summary, winRate } = useMemo(() => {
    const initial = initialBankroll || 1000;
    const wins = settled.filter(b => b.result === "win").length;
    const p = settled.length > 0 ? wins / settled.length : 0.5;
    let rBR = initial, kBR = initial, hBR = initial, fBR = initial;
    const chartData = [{ n: 0, real: initial, kelly: initial, half: initial, fixed: initial }];

    for (const bet of settled) {
      const b = Math.max(0.01, bet.odds - 1);
      const isWin = bet.result === "win";
      const kf = Math.max(0, Math.min(0.25, (p * b - (1 - p)) / b));
      rBR  = Math.max(1, rBR  + (isWin ? bet.stake * b : -bet.stake));
      kBR  = Math.max(1, kBR  + (isWin ? kf       * kBR  * b : -kf       * kBR));
      hBR  = Math.max(1, hBR  + (isWin ? kf / 2   * hBR  * b : -kf / 2   * hBR));
      fBR  = Math.max(1, fBR  + (isWin ? 0.01      * fBR  * b : -0.01      * fBR));
      chartData.push({ n: chartData.length, real: +rBR.toFixed(2), kelly: +kBR.toFixed(2), half: +hBR.toFixed(2), fixed: +fBR.toFixed(2) });
    }

    const calcDD = (key) => {
      let peak = initial, maxDD = 0;
      for (const d of chartData) {
        if (d[key] > peak) peak = d[key];
        if (peak > 0) maxDD = Math.max(maxDD, (peak - d[key]) / peak);
      }
      return maxDD * 100;
    };

    return {
      chartData, winRate: p,
      summary: {
        real:  { label: "Real (suas apostas)", color: "#10B981", final: rBR, roi: (rBR - initial) / initial * 100, dd: calcDD("real"),  key: "real" },
        kelly: { label: "Kelly Completo",       color: "#8b7ff5", final: kBR, roi: (kBR - initial) / initial * 100, dd: calcDD("kelly"), key: "kelly" },
        half:  { label: "Meio-Kelly",           color: "#f59e0b", final: hBR, roi: (hBR - initial) / initial * 100, dd: calcDD("half"),  key: "half" },
        fixed: { label: "1% Fixo",              color: "#808098", final: fBR, roi: (fBR - initial) / initial * 100, dd: calcDD("fixed"), key: "fixed" },
      },
    };
  }, [settled, initialBankroll]);

  const fmtR = (v) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtP = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

  if (settled.length < 5) return (
    <div className="empty-state" style={{ padding: "48px 0" }}>
      <BarChart2 size={40} style={{ color: "var(--border)", margin: "0 auto 12px" }} />
      <div style={{ fontSize: 15, fontWeight: 500 }}>Registre pelo menos 5 apostas liquidadas para simular cenários.</div>
    </div>
  );

  const best = Object.values(summary).reduce((a, b) => b.final > a.final ? b : a);

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="section-title" style={{ marginBottom: 4 }}>SIMULADOR DE CENÁRIOS</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              {settled.length} apostas liquidadas · Taxa de acerto: {(winRate * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 5, right: 8, bottom: 16, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="n" tick={{ fontSize: 10, fill: "#808098" }} label={{ value: "Aposta #", position: "insideBottom", offset: -4, fontSize: 10, fill: "#808098" }} />
            <YAxis tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} tick={{ fontSize: 10, fill: "#808098" }} width={46} />
            <Tooltip
              contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              formatter={(val, name) => {
                const labels = { real: "Real", kelly: "Kelly Completo", half: "Meio-Kelly", fixed: "1% Fixo" };
                return [fmtR(val), labels[name]];
              }}
              labelFormatter={n => `Aposta #${n}`}
            />
            <Line type="monotone" dataKey="real"  stroke="#00d48a" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="kelly" stroke="#8b7ff5" strokeWidth={2}   dot={false} strokeDasharray="7 3" />
            <Line type="monotone" dataKey="half"  stroke="#f59e0b" strokeWidth={2}   dot={false} strokeDasharray="4 2" />
            <Line type="monotone" dataKey="fixed" stroke="#808098" strokeWidth={1.5} dot={false} strokeDasharray="2 4" />
          </LineChart>
        </ResponsiveContainer>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 14, justifyContent: "center" }}>
          {Object.values(summary).map(s => (
            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 22, height: 3, background: s.color, borderRadius: 2 }} />
              <span style={{ fontSize: 11, color: "var(--muted)" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--border)" }}>
          <div className="section-title" style={{ marginBottom: 0 }}>RESULTADO FINAL POR ESTRATÉGIA</div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Estratégia", "Banca Final", "ROI", "Max Drawdown"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 10, color: "var(--muted)", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.values(summary).map(s => {
                const isBest = s.key === best.key;
                return (
                  <tr key={s.key} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: isBest ? "rgba(255,255,255,0.02)" : "transparent" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                        <span style={{ color: isBest ? s.color : "var(--text)", fontWeight: isBest ? 700 : 400 }}>{s.label}</span>
                        {isBest && <span style={{ fontSize: 10, background: "rgba(255,255,255,0.07)", padding: "2px 6px", borderRadius: 4, color: "var(--muted)", fontWeight: 700 }}>MELHOR</span>}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", fontFamily: "var(--font-mono)", fontWeight: 700, color: s.roi >= 0 ? "var(--primary)" : "var(--danger)", whiteSpace: "nowrap" }}>{fmtR(s.final)}</td>
                    <td style={{ padding: "14px 16px", fontFamily: "var(--font-mono)", color: s.roi >= 0 ? "var(--primary)" : "var(--danger)" }}>{fmtP(s.roi)}</td>
                    <td style={{ padding: "14px 16px", fontFamily: "var(--font-mono)", color: "var(--danger)" }}>-{s.dd.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ padding: "14px 18px", background: "rgba(139,127,245,0.06)", border: "1px solid rgba(139,127,245,0.2)", borderRadius: 10, fontSize: 12, color: "var(--muted)", lineHeight: 1.8 }}>
        <strong style={{ color: "var(--accent)" }}>Metodologia:</strong> O simulador usa sua taxa de acerto real ({(winRate * 100).toFixed(1)}%) como estimativa de probabilidade para o critério de Kelly. Kelly Completo é capeado em 25% para evitar ruína. Os resultados são hipotéticos — os mesmos resultados reais com stakes recalculadas para cada estratégia.
      </div>
    </div>
  );
}
