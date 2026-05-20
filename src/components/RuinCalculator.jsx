import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { Shield } from "lucide-react";

const N_SIMS = 1500;

function monteCarlo(p, b, f, nBets, ruinLevel) {
  const bankrolls = new Array(N_SIMS).fill(1.0);
  const ruined = new Array(N_SIMS).fill(false);
  const STEPS = 60;
  const stepSize = Math.max(1, Math.ceil(nBets / STEPS));
  const chartData = [{ n: 0, p5: 100, p25: 100, median: 100, p75: 100, p95: 100 }];

  for (let i = 0; i < nBets; i++) {
    for (let s = 0; s < N_SIMS; s++) {
      if (ruined[s]) continue;
      const stk = bankrolls[s] * f;
      bankrolls[s] += Math.random() < p ? stk * b : -stk;
      if (bankrolls[s] <= ruinLevel) {
        bankrolls[s] = ruinLevel;
        ruined[s] = true;
      }
    }
    if ((i + 1) % stepSize === 0 || i === nBets - 1) {
      const sorted = [...bankrolls].sort((a, b) => a - b);
      const pct = (k) => +(sorted[Math.floor(k * (N_SIMS - 1) / 100)] * 100).toFixed(1);
      chartData.push({ n: i + 1, p5: pct(5), p25: pct(25), median: pct(50), p75: pct(75), p95: pct(95) });
    }
  }

  const ruinCount = ruined.filter(Boolean).length;
  const medianFinal = [...bankrolls].sort((a, b) => a - b)[Math.floor(N_SIMS / 2)] * 100;

  return { ruinProb: ruinCount / N_SIMS * 100, medianFinal, chartData };
}

export function RuinCalculator({ bets }) {
  const settled = bets.filter(b => b.result === "win" || b.result === "loss");
  const defaultWinRate = settled.length > 0
    ? (settled.filter(b => b.result === "win").length / settled.length * 100).toFixed(1)
    : "50";
  const defaultAvgOdds = settled.length > 0
    ? (settled.reduce((a, b) => a + (parseFloat(b.odds) || 2), 0) / settled.length).toFixed(2)
    : "2.00";

  const [winRate, setWinRate] = useState(defaultWinRate);
  const [avgOdds, setAvgOdds] = useState(defaultAvgOdds);
  const [stakePercent, setStakePercent] = useState("2");
  const [nBets, setNBets] = useState("500");
  const [ruinThreshold, setRuinThreshold] = useState("20");
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);

  const handleCalc = () => {
    setRunning(true);
    setTimeout(() => {
      const p = Math.max(0.01, Math.min(0.99, parseFloat(winRate) / 100));
      const b = Math.max(0.01, parseFloat(avgOdds) - 1);
      const f = Math.max(0.001, Math.min(0.5, parseFloat(stakePercent) / 100));
      const n = Math.max(10, Math.min(2000, parseInt(nBets) || 500));
      const ruin = Math.max(0.01, Math.min(0.5, parseFloat(ruinThreshold) / 100));
      setResult(monteCarlo(p, b, f, n, ruin));
      setRunning(false);
    }, 10);
  };

  const edge = (parseFloat(winRate) / 100 * (parseFloat(avgOdds) - 1)) - (1 - parseFloat(winRate) / 100);
  const ruinColor = result
    ? result.ruinProb > 50 ? "#ef4444" : result.ruinProb > 20 ? "#f59e0b" : "#10b981"
    : "var(--muted)";

  const fields = [
    { label: "TAXA DE ACERTO (%)", value: winRate, set: setWinRate, placeholder: "ex: 52", step: "0.1", min: "1", max: "99" },
    { label: "ODDS MÉDIA", value: avgOdds, set: setAvgOdds, placeholder: "ex: 2.05", step: "0.01", min: "1.01" },
    { label: "STAKE (% DA BANCA)", value: stakePercent, set: setStakePercent, placeholder: "ex: 2", step: "0.5", min: "0.1", max: "50" },
    { label: "Nº DE APOSTAS", value: nBets, set: setNBets, placeholder: "ex: 500", step: "50", min: "10", max: "2000" },
    { label: "LIMIAR DE RUÍNA (%)", value: ruinThreshold, set: setRuinThreshold, placeholder: "ex: 20", step: "5", min: "1", max: "50" },
  ];

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Shield size={16} color="var(--accent)" />
          <span className="section-title" style={{ margin: 0 }}>CALCULADORA DE RISCO DE RUÍNA</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 20, lineHeight: 1.6 }}>
          Simulação Monte Carlo com {N_SIMS.toLocaleString()} cenários para estimar a probabilidade de atingir o limiar de ruína antes de completar N apostas.
          {settled.length > 0 && <span style={{ color: "var(--primary)" }}> Campos pré-preenchidos com seus dados reais.</span>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 12, marginBottom: 20 }}>
          {fields.map(({ label, value, set, placeholder, step, min, max }) => (
            <div key={label} className="form-group" style={{ margin: 0 }}>
              <span className="form-label" style={{ fontSize: 10 }}>{label}</span>
              <input
                type="number"
                value={value}
                onChange={e => set(e.target.value)}
                step={step}
                min={min}
                max={max}
                placeholder={placeholder}
                className="input"
              />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, padding: "12px 16px", background: "rgba(0,0,0,0.15)", borderRadius: 8, border: "1px solid var(--border)" }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Edge estimado por aposta:</span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 14, color: edge >= 0 ? "var(--primary)" : "var(--danger)" }}>
            {edge >= 0 ? "+" : ""}{(edge * 100).toFixed(2)}%
          </span>
          {edge < 0 && <span style={{ fontSize: 11, color: "var(--danger)", opacity: 0.8 }}>Edge negativo — risco de ruína muito alto.</span>}
          {edge >= 0 && edge < 0.02 && <span style={{ fontSize: 11, color: "var(--muted)" }}>Edge pequeno — considere reduzir o stake.</span>}
        </div>

        <button onClick={handleCalc} disabled={running} className="btn" style={{ width: "100%", opacity: running ? 0.7 : 1 }}>
          {running ? "Calculando..." : "Simular Cenário"}
        </button>
      </div>

      {result && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
            <div className="card" style={{ textAlign: "center", background: `rgba(${result.ruinProb > 50 ? "239,68,68" : result.ruinProb > 20 ? "245,158,11" : "16,185,129"},0.06)`, borderColor: ruinColor }}>
              <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 }}>PROB. DE RUÍNA</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: ruinColor, fontFamily: "var(--font-mono)" }}>{result.ruinProb.toFixed(1)}%</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>em {nBets} apostas</div>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 }}>BANCA MEDIANA FINAL</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: result.medianFinal >= 100 ? "var(--primary)" : "var(--danger)", fontFamily: "var(--font-mono)" }}>{result.medianFinal.toFixed(1)}%</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>da banca inicial</div>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 }}>EDGE / APOSTA</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: edge >= 0 ? "var(--primary)" : "var(--danger)", fontFamily: "var(--font-mono)" }}>
                {edge >= 0 ? "+" : ""}{(edge * 100).toFixed(2)}%
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>valor esperado</div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title" style={{ marginBottom: 4 }}>DISTRIBUIÇÃO DE BANCAS — {nBets} APOSTAS</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16 }}>Cada linha representa um percentil dos {N_SIMS.toLocaleString()} cenários simulados.</div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={result.chartData} margin={{ top: 5, right: 8, bottom: 18, left: 0 }}>
                <defs>
                  <linearGradient id="gradRuinP95" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b7ff5" stopOpacity={0.08} />
                    <stop offset="95%" stopColor="#8b7ff5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="n" tick={{ fontSize: 10, fill: "#808098" }} label={{ value: "Aposta #", position: "insideBottom", offset: -6, fontSize: 10, fill: "#808098" }} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: "#808098" }} width={48} />
                <ReferenceLine y={100} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 2" />
                <ReferenceLine y={parseFloat(ruinThreshold)} stroke="rgba(239,68,68,0.5)" strokeDasharray="3 3"
                  label={{ value: `Ruína (${ruinThreshold}%)`, position: "insideTopRight", fontSize: 9, fill: "#ef4444" }} />
                <Tooltip
                  contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
                  formatter={(val, name) => {
                    const labels = { p95: "P95 (otimista)", p75: "P75", median: "Mediana", p25: "P25", p5: "P5 (pessimista)" };
                    return [`${val}%`, labels[name] || name];
                  }}
                  labelFormatter={n => `Aposta #${n}`}
                />
                <Area type="monotone" dataKey="p95" stroke="#8b7ff5" strokeWidth={1.5} fill="url(#gradRuinP95)" dot={false} />
                <Area type="monotone" dataKey="p75" stroke="#38bdf8" strokeWidth={1.5} fill="none" dot={false} />
                <Area type="monotone" dataKey="median" stroke="#10b981" strokeWidth={2.5} fill="none" dot={false} />
                <Area type="monotone" dataKey="p25" stroke="#f59e0b" strokeWidth={1.5} fill="none" dot={false} />
                <Area type="monotone" dataKey="p5" stroke="#ef4444" strokeWidth={1.5} fill="none" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10, justifyContent: "center" }}>
              {[
                { label: "P95 (otimista)", color: "#8b7ff5" },
                { label: "P75", color: "#38bdf8" },
                { label: "Mediana", color: "#10b981" },
                { label: "P25", color: "#f59e0b" },
                { label: "P5 (pessimista)", color: "#ef4444" },
              ].map(({ label, color }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 20, height: 3, background: color, borderRadius: 2 }} />
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: "14px 18px", background: "rgba(139,127,245,0.06)", border: "1px solid rgba(139,127,245,0.2)", borderRadius: 10, fontSize: 12, color: "var(--muted)", lineHeight: 1.8 }}>
            <strong style={{ color: "var(--accent)" }}>Metodologia:</strong> Monte Carlo com {N_SIMS.toLocaleString()} simulações independentes. Cada aposta usa stake proporcional à banca atual ({stakePercent}%). Ruína ocorre quando a banca cai a {ruinThreshold}% do valor inicial. O edge esperado de {(edge * 100).toFixed(2)}% por aposta determina o comportamento de longo prazo.
          </div>
        </>
      )}

      {!result && (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <Shield size={40} style={{ color: "var(--border)", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 14, color: "var(--muted)", fontWeight: 500 }}>Configure os parâmetros e clique em Simular Cenário.</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8, opacity: 0.7 }}>O gráfico de distribuição de bancas será exibido aqui.</div>
        </div>
      )}
    </div>
  );
}
