import { useState, useMemo } from "react";
import { Calculator, AlertTriangle, X } from "lucide-react";
import { InfoTooltip } from "../components/InfoTooltip";
import { fmt } from "../utils/formatting";

export function CalculatorsView({ currentBankroll }) {
  const [calcTab, setCalcTab] = useState("kelly");
  const [kellyForm, setKellyForm] = useState({ prob: "", odds: "", bankroll: "" });
  const [dutchForm, setDutchForm] = useState([{ odds: "" }, { odds: "" }, { odds: "" }]);
  const [dutchStake, setDutchStake] = useState("");
  const [arbForm, setArbForm] = useState({ odds1: "", odds2: "", stake: "" });

  const kellyResult = useMemo(() => {
    const p = parseFloat(kellyForm.prob) / 100; const b = parseFloat(kellyForm.odds) - 1;
    const br = parseFloat(kellyForm.bankroll) || currentBankroll;
    if (!p || !b || p <= 0 || p >= 1 || b <= 0) return null;
    const f = (b * p - (1 - p)) / b;
    return { fraction: f * 100, amount: f * br, hasValue: f > 0 };
  }, [kellyForm, currentBankroll]);

  const dutchResult = useMemo(() => {
    const valid = dutchForm.map(r => parseFloat(r.odds)).filter(o => o > 1);
    if (valid.length < 2) return null;
    const total = valid.reduce((s, o) => s + 1 / o, 0);
    if (total >= 1) return null;
    const margin = (1 - total) / total * 100;
    const s = parseFloat(dutchStake) || null;
    return {
      pcts: valid.map(o => (1 / o / total * 100).toFixed(2)),
      amounts: s ? valid.map(o => (s * (1 / o / total)).toFixed(2)) : null,
      margin: margin.toFixed(2),
      profit: s ? (s / total - s).toFixed(2) : null,
    };
  }, [dutchForm, dutchStake]);

  const arbResult = useMemo(() => {
    const o1 = parseFloat(arbForm.odds1), o2 = parseFloat(arbForm.odds2);
    const s = parseFloat(arbForm.stake) || 100;
    if (!o1 || !o2 || o1 <= 1 || o2 <= 1) return null;
    const total = 1 / o1 + 1 / o2;
    if (total >= 1) return { isArb: false, margin: ((total - 1) * 100).toFixed(2) };
    const profit = s / total - s;
    const s1 = s / (o1 * total);
    const s2 = s / (o2 * total);
    return { isArb: true, margin: ((1 - total) * 100).toFixed(2), s1: s1.toFixed(2), s2: s2.toFixed(2), profit: profit.toFixed(2), total: s.toFixed(2) };
  }, [arbForm]);

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["kelly", "Kelly"], ["dutch", "Dutching"], ["arb", "Arbitragem"]].map(([t, label]) => (
          <button key={t} onClick={() => setCalcTab(t)} style={{ padding: "8px 20px", borderRadius: 20, fontSize: 13, fontWeight: 600, border: "1px solid", borderColor: calcTab === t ? "var(--primary)" : "var(--border)", background: calcTab === t ? "rgba(59,130,246,0.15)" : "transparent", color: calcTab === t ? "var(--primary)" : "var(--muted)", cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {calcTab === "kelly" && <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <Calculator size={20} color="var(--primary)" />
          <span className="section-title" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            CALCULADORA CRITÉRIO DE KELLY
            <InfoTooltip text="O Critério de Kelly é a fórmula matemática de ouro das apostas. Ele calcula a porcentagem exata da sua banca que deve ser apostada com base na sua probabilidade para maximizar o lucro a longo prazo e reduzir a chance de quebra a zero." />
          </span>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24, lineHeight: 1.6 }}>Calcule o tamanho ideal (stake) para sua aposta com base na sua vantagem matemática estimada. Informe sua probabilidade real e a odd oferecida pela casa.</p>

        <div className="grid-2">
          <div className="form-group">
            <span className="form-label">SUA PROBABILIDADE ESTIMADA (%)</span>
            <input type="number" placeholder="ex: 55" value={kellyForm.prob} onChange={e => setKellyForm(p => ({ ...p, prob: e.target.value }))} className="input" />
          </div>
          <div className="form-group">
            <span className="form-label">ODDS DA CASA</span>
            <input type="number" placeholder="ex: 1.85" value={kellyForm.odds} onChange={e => setKellyForm(p => ({ ...p, odds: e.target.value }))} className="input" />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 32 }}>
          <span className="form-label">BANKROLL ATUAL (R$) — vazio = usa saldo total</span>
          <input type="number" placeholder={currentBankroll.toFixed(2)} value={kellyForm.bankroll} onChange={e => setKellyForm(p => ({ ...p, bankroll: e.target.value }))} className="input" />
        </div>

        {kellyForm.prob && (parseFloat(kellyForm.prob) <= 0 || parseFloat(kellyForm.prob) >= 100) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#f59e0b", fontSize: 13, marginBottom: 16 }}>
            <AlertTriangle size={15} /> Probabilidade deve ser entre 1% e 99%.
          </div>
        )}
        {kellyForm.odds && parseFloat(kellyForm.odds) <= 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#f59e0b", fontSize: 13, marginBottom: 16 }}>
            <AlertTriangle size={15} /> Odds devem ser maiores que 1.00 para haver valor positivo.
          </div>
        )}

        {kellyResult && (
          <div className="card animate-fade-in" style={{ background: kellyResult.hasValue ? "linear-gradient(180deg, rgba(0,212,138,0.08) 0%, transparent 100%)" : "linear-gradient(180deg, rgba(255,61,90,0.08) 0%, transparent 100%)", borderColor: kellyResult.hasValue ? "rgba(0,212,138,0.3)" : "rgba(255,61,90,0.3)", padding: "24px" }}>
            {kellyResult.hasValue
              ? <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                    {[
                      { label: "KELLY COMPLETO", amount: kellyResult.amount, frac: kellyResult.fraction, accent: "var(--primary)", note: "agressivo" },
                      { label: "½ KELLY", amount: kellyResult.amount / 2, frac: kellyResult.fraction / 2, accent: "var(--accent)", note: "recomendado" },
                      { label: "¼ KELLY", amount: kellyResult.amount / 4, frac: kellyResult.fraction / 4, accent: "var(--green)", note: "conservador" },
                    ].map(({ label, amount, frac, accent, note }) => (
                      <div key={label} style={{ background: "rgba(0,0,0,0.25)", borderRadius: 10, padding: "14px 12px", border: `1px solid ${accent}30`, textAlign: "center" }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "var(--muted)", letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: accent, fontFamily: "var(--font-mono)", lineHeight: 1 }}>{fmt(amount)}</div>
                        <div style={{ fontSize: 11, color: accent, fontFamily: "var(--font-mono)", marginTop: 4 }}>{frac.toFixed(2)}%</div>
                        <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 4, fontWeight: 600 }}>{note}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: "10px 14px", background: "rgba(0,0,0,0.2)", borderRadius: 8, fontSize: 11, color: "var(--muted)", lineHeight: 1.5, borderLeft: "3px solid var(--accent)" }}>
                    Kelly completo maximiza lucro no longo prazo mas exige tolerância a alta variância. ½ Kelly é o padrão da indústria — equilibra crescimento e proteção de banca.
                  </div>
                </>
              : <>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🚫</div>
                  <span className="kpi-label" style={{ color: "var(--danger)" }}>{kellyResult.fraction === 0 ? "SEM VANTAGEM — EV NEUTRO" : "EV NEGATIVO — NÃO APOSTE"}</span>
                  <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6, marginTop: 8 }}>
                    {kellyResult.fraction === 0
                      ? "Sua probabilidade estimada empata exatamente com a odd oferecida. Não há vantagem matemática — o Kelly recomenda "
                      : "Sua probabilidade estimada é inferior à odd oferecida. A expectativa é de prejuízo a longo prazo — o Kelly recomenda "}
                    <strong style={{ color: "var(--danger)", fontSize: 16 }}>não apostar</strong>.
                  </div>
                </>
            }
          </div>
        )}
      </div>}

      {calcTab === "dutch" && <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <Calculator size={20} color="var(--primary)" />
          <span className="section-title" style={{ marginBottom: 0 }}>CALCULADORA DE DUTCHING</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24, lineHeight: 1.6 }}>Distribua sua stake entre múltiplos resultados para garantir o mesmo retorno independente de qual ganhar.</p>
        {dutchForm.map((row, i) => (
          <div key={i} className="form-group">
            <span className="form-label">ODD {i + 1}</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="number" placeholder="ex: 2.50" value={row.odds} onChange={e => setDutchForm(f => f.map((r, j) => j === i ? { ...r, odds: e.target.value } : r))} className="input" />
              {dutchForm.length > 2 && <button type="button" onClick={() => setDutchForm(f => f.filter((_, j) => j !== i))} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, color: "var(--danger)", cursor: "pointer", padding: "8px 12px" }}><X size={14} /></button>}
            </div>
          </div>
        ))}
        {dutchForm.length < 8 && <button type="button" onClick={() => setDutchForm(f => [...f, { odds: "" }])} style={{ marginBottom: 20, background: "none", border: "1px dashed var(--border)", borderRadius: 8, color: "var(--muted)", cursor: "pointer", padding: "10px 16px", width: "100%", fontSize: 13 }}>+ Adicionar Outcome</button>}
        <div className="form-group" style={{ marginBottom: 24 }}>
          <span className="form-label">STAKE TOTAL (R$) — opcional</span>
          <input type="number" placeholder="ex: 100.00" value={dutchStake} onChange={e => setDutchStake(e.target.value)} className="input" />
        </div>
        {dutchResult && (
          <div className="card animate-fade-in" style={{ background: "rgba(59,130,246,0.06)", borderColor: "rgba(59,130,246,0.3)", padding: 20 }}>
            <span className="kpi-label" style={{ color: "var(--primary)", marginBottom: 12, display: "block" }}>DISTRIBUIÇÃO DE STAKES</span>
            {dutchResult.pcts.map((pct, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < dutchResult.pcts.length - 1 ? "1px solid var(--border)" : "none" }}>
                <span style={{ color: "var(--muted)", fontSize: 14 }}>Outcome {i + 1}</span>
                <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text)" }}>
                  {dutchResult.amounts ? `R$ ${dutchResult.amounts[i]}` : `${pct}%`}
                </span>
              </div>
            ))}
            <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(16,185,129,0.1)", borderRadius: 8, fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>
              {dutchResult.profit
                ? `Lucro garantido: R$ ${dutchResult.profit} (+${dutchResult.margin}%)`
                : `Margem garantida: +${dutchResult.margin}% sobre o total apostado`}
            </div>
          </div>
        )}
        {dutchForm.filter(r => parseFloat(r.odds) > 1).length >= 2 && !dutchResult && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--danger)", fontSize: 13 }}>
            <AlertTriangle size={15} /> Odds insuficientes para garantir lucro — total de probabilidades ≥ 100%.
          </div>
        )}
      </div>}

      {calcTab === "arb" && <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <Calculator size={20} color="var(--accent)" />
          <span className="section-title" style={{ marginBottom: 0 }}>CALCULADORA DE ARBITRAGEM</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24, lineHeight: 1.6 }}>Detecte oportunidades de arb (surebet) entre duas casas de aposta. Garanta lucro independente do resultado.</p>
        <div className="grid-2">
          <div className="form-group">
            <span className="form-label">ODD — CASA 1</span>
            <input type="number" placeholder="ex: 2.10" value={arbForm.odds1} onChange={e => setArbForm(f => ({ ...f, odds1: e.target.value }))} className="input" />
          </div>
          <div className="form-group">
            <span className="form-label">ODD — CASA 2</span>
            <input type="number" placeholder="ex: 2.10" value={arbForm.odds2} onChange={e => setArbForm(f => ({ ...f, odds2: e.target.value }))} className="input" />
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: 24 }}>
          <span className="form-label">STAKE TOTAL (R$)</span>
          <input type="number" placeholder="ex: 100.00" value={arbForm.stake} onChange={e => setArbForm(f => ({ ...f, stake: e.target.value }))} className="input" />
        </div>
        {arbResult && (
          arbResult.isArb
            ? <div className="card animate-fade-in" style={{ background: "rgba(16,185,129,0.06)", borderColor: "rgba(16,185,129,0.3)", padding: 20 }}>
                <span className="kpi-label" style={{ color: "var(--accent)", marginBottom: 12, display: "block" }}>✅ ARBITRAGEM DETECTADA — +{arbResult.margin}% garantido</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "rgba(0,0,0,0.2)", borderRadius: 8 }}>
                    <span style={{ color: "var(--muted)" }}>Casa 1 (odd {arbForm.odds1})</span>
                    <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text)" }}>R$ {arbResult.s1}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "rgba(0,0,0,0.2)", borderRadius: 8 }}>
                    <span style={{ color: "var(--muted)" }}>Casa 2 (odd {arbForm.odds2})</span>
                    <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text)" }}>R$ {arbResult.s2}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "rgba(16,185,129,0.1)", borderRadius: 8, borderLeft: "3px solid var(--accent)" }}>
                    <span style={{ color: "var(--accent)", fontWeight: 600 }}>Lucro garantido</span>
                    <span style={{ fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: 18 }}>R$ {arbResult.profit}</span>
                  </div>
                </div>
              </div>
            : <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--danger)", fontSize: 13 }}>
                <AlertTriangle size={15} /> Sem arbitragem — margem da casa de {arbResult.margin}%. Tente odds mais altas.
              </div>
        )}
      </div>}
    </div>
  );
}
