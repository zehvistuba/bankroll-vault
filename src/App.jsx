import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { LayoutDashboard, Plus, List, Calculator } from "lucide-react";

const SPORTS = ["Futebol", "Tênis", "Basquete", "Futebol Americano", "MMA", "Outros"];
const MARKETS = ["1x2", "Over/Under", "Escanteios", "Ambas Marcam", "Handicap Asiático", "Handicap Europeu", "Dupla Chance", "Total de Pontos", "Aces", "Duplas Faltas", "Outros"];
const BOOKMAKERS = ["Bet365", "Betano", "Sportingbet", "Novibet", "Betnacional", "Pinnacle", "Betfair", "KTO", "Outros"];

const G = "#00d48a";
const R = "#ff3d5a";
const ACC = "#8b7ff5";
const BG = "#07070f";
const CARD = "#0f0f1a";
const BORDER = "#1e1e30";
const TEXT = "#e4e4f0";
const MUTED = "#4a4a68";

const s = {
  app: { fontFamily: "'Space Mono', monospace", background: BG, minHeight: "100vh", color: TEXT, display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto" },
  header: { borderBottom: `1px solid ${BORDER}`, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  logoLabel: { fontSize: 9, color: MUTED, letterSpacing: 3, textTransform: "uppercase", display: "block" },
  logoText: { fontSize: 22, fontWeight: 700, letterSpacing: -1, margin: 0 },
  balanceLabel: { fontSize: 9, color: MUTED, textAlign: "right", display: "block" },
  balanceValue: { fontSize: 20, fontWeight: 700, textAlign: "right" },
  main: { flex: 1, padding: "20px", overflowY: "auto" },
  nav: { borderTop: `1px solid ${BORDER}`, display: "flex", background: BG, position: "sticky", bottom: 0 },
  navBtn: (active) => ({ flex: 1, background: "transparent", border: "none", padding: "12px 0 10px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: active ? G : MUTED }),
  navLabel: { fontSize: 8, letterSpacing: 1, fontFamily: "'Space Mono', monospace" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 },
  grid4: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 },
  card: { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "14px 16px" },
  kpiLabel: { fontSize: 8, color: MUTED, letterSpacing: 2, marginBottom: 6, display: "block" },
  kpiValue: (color) => ({ fontSize: 22, fontWeight: 700, color: color || TEXT }),
  miniLabel: { fontSize: 8, color: MUTED, letterSpacing: 1, display: "block", marginBottom: 4, textAlign: "center" },
  miniValue: (color) => ({ fontSize: 15, fontWeight: 700, textAlign: "center", color: color || TEXT }),
  sectionTitle: { fontSize: 9, color: MUTED, letterSpacing: 2, marginBottom: 12, display: "block" },
  formLabel: { fontSize: 9, color: MUTED, letterSpacing: 2, marginBottom: 6, display: "block" },
  input: { width: "100%", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 4, padding: "10px 12px", color: TEXT, fontFamily: "'Space Mono', monospace", fontSize: 13, boxSizing: "border-box", outline: "none" },
  select: { width: "100%", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 4, padding: "10px 12px", color: TEXT, fontFamily: "'Space Mono', monospace", fontSize: 13, boxSizing: "border-box", outline: "none", appearance: "none" },
  btn: (color) => ({ width: "100%", background: color || G, color: "#050508", border: "none", borderRadius: 4, padding: "13px 0", fontWeight: 700, cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 12, marginTop: 8 }),
  outlineBtn: (color) => ({ flex: 1, background: "transparent", border: `1px solid ${color}`, color: color, borderRadius: 4, padding: "7px 0", fontSize: 10, cursor: "pointer", fontFamily: "'Space Mono', monospace" }),
  betCard: { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "14px 16px", marginBottom: 10 },
  badge: (color) => ({ fontSize: 10, fontWeight: 700, color: color, background: `${color}20`, borderRadius: 3, padding: "2px 7px", display: "inline-block", marginRight: 8 }),
  betName: { fontSize: 13, fontWeight: 700, display: "inline" },
  betMeta: { fontSize: 9, color: MUTED, letterSpacing: 1, marginTop: 4 },
  betStats: { display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" },
  betStat: (color) => ({ fontSize: 11, color: color || TEXT }),
  emptyState: { textAlign: "center", padding: "48px 20px", color: MUTED },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyText: { fontSize: 12, marginBottom: 20 },
  kellyResult: (hasValue) => ({ background: CARD, border: `1px solid ${hasValue ? G : R}`, borderRadius: 8, padding: 20, marginTop: 24 }),
  kellyAmount: { fontSize: 32, fontWeight: 700, color: G, marginBottom: 4 },
  kellyPct: { fontSize: 12, color: MUTED },
  kellyWarning: { marginTop: 16, padding: 12, background: BG, borderRadius: 4, fontSize: 10, color: MUTED, lineHeight: 1.8 },
};

const fmt = (v) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPct = (v) => `${v >= 0 ? "+" : ""}${Number(v).toFixed(2)}%`;
const getBetPL = (bet) => bet.result === "win" ? bet.stake * (bet.odds - 1) : bet.result === "loss" ? -bet.stake : 0;
const getCLV = (bet) => bet.closingOdds ? ((bet.odds - bet.closingOdds) / bet.closingOdds * 100) : null;

const RESULT_MAP = { win: ["W", G], loss: ["L", R], void: ["V", MUTED], pending: ["?", ACC] };

const defaultForm = () => ({
  date: new Date().toISOString().split("T")[0],
  sport: "Futebol", market: "1x2", bookmaker: "Bet365",
  description: "", odds: "", closingOdds: "", stake: "", result: "pending", notes: ""
});

export default function BankrollVault() {
  const [view, setView] = useState("dashboard");
  const [loaded, setLoaded] = useState(false);

  const [bets, setBets] = useState(() => {
    try { const v = localStorage.getItem("vault_bets"); return v ? JSON.parse(v) : []; } catch { return []; }
  });
  const [config, setConfig] = useState(() => {
    try { const v = localStorage.getItem("vault_cfg"); return v ? JSON.parse(v) : { initialBankroll: 1000 }; } catch { return { initialBankroll: 1000 }; }
  });

  const [form, setForm] = useState(defaultForm());
  const [kellyForm, setKellyForm] = useState({ prob: "", odds: "", bankroll: "" });

  useEffect(() => { setLoaded(true); }, []);
  useEffect(() => { if (loaded) localStorage.setItem("vault_bets", JSON.stringify(bets)); }, [bets, loaded]);
  useEffect(() => { if (loaded) localStorage.setItem("vault_cfg", JSON.stringify(config)); }, [config, loaded]);

  const stats = useMemo(() => {
    const sorted = [...bets].sort((a, b) => a.date.localeCompare(b.date));
    let bankroll = config.initialBankroll, totalStake = 0, totalPL = 0, wins = 0, losses = 0, clvSum = 0, clvCount = 0;
    const chartData = [{ d: "Início", v: config.initialBankroll }];
    sorted.forEach(bet => {
      const pl = getBetPL(bet);
      const clv = getCLV(bet);
      if (bet.result !== "pending") {
        totalStake += bet.stake; totalPL += pl; bankroll += pl;
        if (bet.result === "win") wins++;
        if (bet.result === "loss") losses++;
        chartData.push({ d: bet.date.slice(5), v: Math.round(bankroll * 100) / 100 });
      }
      if (clv != null && bet.result !== "pending") { clvSum += clv; clvCount++; }
    });
    return {
      currentBankroll: bankroll, totalPL,
      roi: config.initialBankroll > 0 ? totalPL / config.initialBankroll * 100 : 0,
      yield: totalStake > 0 ? totalPL / totalStake * 100 : 0,
      winRate: (wins + losses) > 0 ? wins / (wins + losses) * 100 : 0,
      avgCLV: clvCount > 0 ? clvSum / clvCount : null,
      wins, losses, totalBets: bets.length, chartData
    };
  }, [bets, config.initialBankroll]);

  const kellyResult = useMemo(() => {
    const p = parseFloat(kellyForm.prob) / 100;
    const b = parseFloat(kellyForm.odds) - 1;
    const br = parseFloat(kellyForm.bankroll) || stats.currentBankroll;
    if (!p || !b || p <= 0 || p >= 1 || b <= 0) return null;
    const f = (b * p - (1 - p)) / b;
    return { fraction: f * 100, amount: f * br, hasValue: f > 0 };
  }, [kellyForm, stats.currentBankroll]);

  const addBet = () => {
    if (!form.description || !form.odds || !form.stake) return;
    setBets(prev => [...prev, { ...form, id: Date.now(), odds: parseFloat(form.odds), closingOdds: form.closingOdds ? parseFloat(form.closingOdds) : null, stake: parseFloat(form.stake) }]);
    setForm(defaultForm());
    setView("dashboard");
  };

  const pending = bets.filter(b => b.result === "pending");

  const NAV = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "register", icon: Plus, label: "Registrar" },
    { id: "history", icon: List, label: "Histórico" },
    { id: "kelly", icon: Calculator, label: "Kelly" },
  ];

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap'); * { margin: 0; padding: 0; box-sizing: border-box; } body { background: ${BG}; }`}</style>
      <div style={s.app}>

        <header style={s.header}>
          <div>
            <span style={s.logoLabel}>Bankroll</span>
            <h1 style={s.logoText}>VAULT</h1>
          </div>
          <div>
            <span style={s.balanceLabel}>SALDO ATUAL</span>
            <div style={{ ...s.balanceValue, color: stats.totalPL >= 0 ? G : R }}>{fmt(stats.currentBankroll)}</div>
          </div>
        </header>

        <main style={s.main}>

          {view === "dashboard" && (
            <>
              <div style={s.grid2}>
                {[
                  { label: "ROI", val: fmtPct(stats.roi), color: stats.roi >= 0 ? G : R },
                  { label: "YIELD", val: fmtPct(stats.yield), color: stats.yield >= 0 ? G : R },
                  { label: "TAXA DE ACERTO", val: `${stats.winRate.toFixed(1)}%`, color: TEXT },
                  { label: "CLV MÉDIO", val: stats.avgCLV != null ? fmtPct(stats.avgCLV) : "—", color: stats.avgCLV != null ? (stats.avgCLV >= 0 ? G : R) : MUTED },
                ].map(k => (
                  <div key={k.label} style={s.card}>
                    <span style={s.kpiLabel}>{k.label}</span>
                    <div style={s.kpiValue(k.color)}>{k.val}</div>
                  </div>
                ))}
              </div>

              <div style={s.grid4}>
                {[
                  { label: "APOSTAS", val: stats.totalBets, color: TEXT },
                  { label: "VITÓRIAS", val: stats.wins, color: G },
                  { label: "DERROTAS", val: stats.losses, color: R },
                  { label: "P&L", val: `${stats.totalPL >= 0 ? "+" : ""}R$${Math.round(stats.totalPL)}`, color: stats.totalPL >= 0 ? G : R },
                ].map(k => (
                  <div key={k.label} style={{ ...s.card, padding: "10px 8px" }}>
                    <span style={s.miniLabel}>{k.label}</span>
                    <div style={s.miniValue(k.color)}>{k.val}</div>
                  </div>
                ))}
              </div>

              {stats.chartData.length > 2 && (
                <div style={{ ...s.card, marginBottom: 16 }}>
                  <span style={s.sectionTitle}>EVOLUÇÃO DO BANKROLL</span>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={stats.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                      <XAxis dataKey="d" tick={{ fill: MUTED, fontSize: 9, fontFamily: "Space Mono" }} />
                      <YAxis tick={{ fill: MUTED, fontSize: 9, fontFamily: "Space Mono" }} width={52} tickFormatter={v => `R$${v}`} />
                      <ReferenceLine y={config.initialBankroll} stroke={BORDER} strokeDasharray="4 4" />
                      <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 4, fontSize: 11, fontFamily: "Space Mono" }} formatter={v => [fmt(v), "Bankroll"]} labelStyle={{ color: MUTED }} />
                      <Line type="monotone" dataKey="v" stroke={stats.totalPL >= 0 ? G : R} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {pending.length > 0 && (
                <div style={s.card}>
                  <span style={s.sectionTitle}>APOSTAS PENDENTES</span>
                  {pending.map((bet, i) => (
                    <div key={bet.id} style={{ borderBottom: i < pending.length - 1 ? `1px solid ${BORDER}` : "none", paddingBottom: i < pending.length - 1 ? 14 : 0, marginBottom: i < pending.length - 1 ? 14 : 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{bet.description}</div>
                          <div style={s.betMeta}>{bet.sport} · {bet.market} · {bet.bookmaker}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: ACC }}>@{bet.odds.toFixed(2)}</div>
                          <div style={{ fontSize: 10, color: MUTED }}>{fmt(bet.stake)}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={s.outlineBtn(G)} onClick={() => setBets(p => p.map(b => b.id === bet.id ? { ...b, result: "win" } : b))}>GANHOU</button>
                        <button style={s.outlineBtn(R)} onClick={() => setBets(p => p.map(b => b.id === bet.id ? { ...b, result: "loss" } : b))}>PERDEU</button>
                        <button style={s.outlineBtn(MUTED)} onClick={() => setBets(p => p.map(b => b.id === bet.id ? { ...b, result: "void" } : b))}>VOID</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {bets.length === 0 && (
                <div style={s.emptyState}>
                  <div style={s.emptyIcon}>◈</div>
                  <div style={s.emptyText}>Nenhuma aposta registrada ainda.</div>
                  <button style={{ ...s.btn(), width: "auto", padding: "10px 24px" }} onClick={() => setView("register")}>REGISTRAR PRIMEIRA APOSTA</button>
                </div>
              )}
            </>
          )}

          {view === "register" && (
            <>
              <span style={{ ...s.sectionTitle, marginBottom: 20 }}>NOVA APOSTA</span>
              {[
                { label: "DATA", field: "date", type: "date" },
                { label: "DESCRIÇÃO", field: "description", type: "text", ph: "ex: Palmeiras x Corinthians — Palmeiras" },
                { label: "ODDS", field: "odds", type: "number", ph: "1.85", step: "0.01" },
                { label: "ODDS DE FECHAMENTO — CLV (opcional)", field: "closingOdds", type: "number", ph: "1.75", step: "0.01" },
                { label: "STAKE (R$)", field: "stake", type: "number", ph: "100", step: "any" },
              ].map(f => (
                <div key={f.field} style={{ marginBottom: 14 }}>
                  <span style={s.formLabel}>{f.label}</span>
                  <input type={f.type} placeholder={f.ph} step={f.step} value={form[f.field]}
                    onChange={e => setForm(p => ({ ...p, [f.field]: e.target.value }))} style={s.input} />
                </div>
              ))}
              {[
                { label: "ESPORTE", field: "sport", opts: SPORTS.map(o => [o, o]) },
                { label: "MERCADO", field: "market", opts: MARKETS.map(o => [o, o]) },
                { label: "CASA DE APOSTA", field: "bookmaker", opts: BOOKMAKERS.map(o => [o, o]) },
                { label: "RESULTADO", field: "result", opts: [["pending","Pendente"],["win","Ganhou"],["loss","Perdeu"],["void","Void"]] },
              ].map(f => (
                <div key={f.field} style={{ marginBottom: 14 }}>
                  <span style={s.formLabel}>{f.label}</span>
                  <select value={form[f.field]} onChange={e => setForm(p => ({ ...p, [f.field]: e.target.value }))} style={s.select}>
                    {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
              <button style={s.btn()} onClick={addBet}>REGISTRAR APOSTA</button>
              <div style={{ ...s.card, marginTop: 24 }}>
                <span style={s.formLabel}>BANKROLL INICIAL (R$)</span>
                <input type="number" value={config.initialBankroll}
                  onChange={e => setConfig(p => ({ ...p, initialBankroll: parseFloat(e.target.value) || 0 }))} style={s.input} />
              </div>
            </>
          )}

          {view === "history" && (
            <>
              <span style={{ ...s.sectionTitle, marginBottom: 20 }}>HISTÓRICO</span>
              {bets.length === 0 && <div style={{ ...s.emptyState, padding: "32px 0" }}>Nenhuma aposta registrada.</div>}
              {[...bets].sort((a, b) => b.date.localeCompare(a.date)).map(bet => {
                const pl = getBetPL(bet);
                const clv = getCLV(bet);
                const [rlabel, rcolor] = RESULT_MAP[bet.result] || ["?", MUTED];
                return (
                  <div key={bet.id} style={s.betCard}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: 4 }}>
                          <span style={s.badge(rcolor)}>{rlabel}</span>
                          <span style={s.betName}>{bet.description}</span>
                        </div>
                        <div style={s.betMeta}>{bet.date} · {bet.sport} · {bet.market} · {bet.bookmaker}</div>
                        <div style={s.betStats}>
                          <span style={s.betStat(ACC)}>@{bet.odds.toFixed(2)}</span>
                          <span style={s.betStat(MUTED)}>{fmt(bet.stake)}</span>
                          {bet.result !== "pending" && <span style={s.betStat(pl >= 0 ? G : R)}>P&L: {pl >= 0 ? "+" : ""}R${pl.toFixed(2)}</span>}
                          {clv != null && <span style={s.betStat(clv >= 0 ? G : R)}>CLV: {clv >= 0 ? "+" : ""}{clv.toFixed(1)}%</span>}
                        </div>
                      </div>
                      <button onClick={() => setBets(p => p.filter(b => b.id !== bet.id))}
                        style={{ background: "transparent", border: "none", color: MUTED, cursor: "pointer", padding: 4, fontSize: 16 }}>✕</button>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {view === "kelly" && (
            <>
              <span style={{ ...s.sectionTitle, marginBottom: 8 }}>CALCULADORA KELLY</span>
              <p style={{ fontSize: 11, color: MUTED, marginBottom: 24, lineHeight: 1.7 }}>
                Calcula o stake ótimo com base na sua vantagem estimada. Informe sua probabilidade real e a odd da casa.
              </p>
              {[
                { label: "SUA PROBABILIDADE ESTIMADA (%)", field: "prob", ph: "55" },
                { label: "ODDS DA CASA", field: "odds", ph: "1.85" },
                { label: "BANKROLL (R$) — vazio = usa saldo atual", field: "bankroll", ph: stats.currentBankroll.toFixed(2) },
              ].map(f => (
                <div key={f.field} style={{ marginBottom: 16 }}>
                  <span style={s.formLabel}>{f.label}</span>
                  <input type="number" placeholder={f.ph} value={kellyForm[f.field]}
                    onChange={e => setKellyForm(p => ({ ...p, [f.field]: e.target.value }))} style={s.input} />
                </div>
              ))}
              {kellyResult && (
                <div style={s.kellyResult(kellyResult.hasValue)}>
                  {kellyResult.hasValue ? (
                    <>
                      <span style={s.kpiLabel}>STAKE RECOMENDADO</span>
                      <div style={s.kellyAmount}>{fmt(kellyResult.amount)}</div>
                      <div style={s.kellyPct}>{kellyResult.fraction.toFixed(2)}% do bankroll</div>
                      <div style={s.kellyWarning}>
                        ⚠ Kelly completo é agressivo. Considere ½ Kelly ({fmt(kellyResult.amount / 2)}) para maior proteção do bankroll em cenários de incerteza sobre o edge real.
                      </div>
                    </>
                  ) : (
                    <>
                      <span style={{ ...s.kpiLabel, color: R }}>SEM VALOR</span>
                      <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>Essa aposta não tem EV positivo com esses parâmetros. Kelly recomenda não apostar.</div>
                    </>
                  )}
                </div>
              )}
            </>
          )}

        </main>

        <nav style={s.nav}>
          {NAV.map(({ id, icon: Icon, label }) => (
            <button key={id} style={s.navBtn(view === id)} onClick={() => setView(id)}>
              <Icon size={19} />
              <span style={s.navLabel}>{label}</span>
            </button>
          ))}
        </nav>

      </div>
    </>
  );
}
