import { useState, useEffect, useMemo, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { LayoutDashboard, Plus, List, Calculator, BarChart2, Sparkles, RefreshCw, Check, X } from "lucide-react";

const SPORTS = ["Futebol", "Tênis", "Basquete", "Futebol Americano", "MMA", "Outros"];
const MARKETS = ["1x2", "Over/Under", "Escanteios", "Ambas Marcam", "Handicap Asiático", "Handicap Europeu", "Dupla Chance", "Total de Pontos", "Aces", "Duplas Faltas", "Outros"];
const BOOKMAKERS = ["Bet365", "Betano", "Sportingbet", "Novibet", "Betnacional", "Pinnacle", "Betfair", "KTO", "Outros"];

const fmt = (v) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPct = (v) => `${v >= 0 ? "+" : ""}${Number(v).toFixed(2)}%`;
const getBetPL = (bet) => bet.result === "win" ? bet.stake * (bet.odds - 1) : bet.result === "loss" ? -bet.stake : 0;
const getCLV = (bet) => bet.closingOdds ? ((bet.odds - bet.closingOdds) / bet.closingOdds * 100) : null;
const RESULT_MAP = { win: ["W", "g"], loss: ["L", "r"], void: ["V", "muted"], pending: ["?", "acc"] };
const defaultForm = () => ({ date: new Date().toISOString().split("T")[0], sport: "Futebol", market: "1x2", bookmaker: "Bet365", description: "", odds: "", closingOdds: "", stake: "", result: "pending", notes: "" });

function buildSegments(bets, key) {
  const map = {};
  bets.forEach(bet => {
    if (bet.result === "pending") return;
    const k = bet[key] || "Outros";
    if (!map[k]) map[k] = { name: k, bets: 0, wins: 0, losses: 0, stake: 0, pl: 0 };
    map[k].bets++; map[k].stake += bet.stake; map[k].pl += getBetPL(bet);
    if (bet.result === "win") map[k].wins++;
    if (bet.result === "loss") map[k].losses++;
  });
  return Object.values(map).map(r => ({ ...r, yield: r.stake > 0 ? r.pl / r.stake * 100 : 0 }));
}

function SegmentTable({ title, data }) {
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

function HighlightCards({ data, bestLabel, worstLabel }) {
  const valid = data.filter(m => m.stake > 0 && m.bets >= 2);
  if (valid.length < 2) return null;
  const best = [...valid].sort((a, b) => b.yield - a.yield)[0];
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

function AIInsights({ stats, marketSeg, bookSeg, sportSeg, bets }) {
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const settled = bets.filter(b => b.result !== "pending");

  const generate = async () => {
    if (settled.length < 3) { setError("Registre pelo menos 3 apostas liquidadas para gerar análise."); return; }
    setLoading(true); setError(""); setInsight("");
    const payload = {
      resumoGeral: { totalApostas: stats.totalBets, liquidadas: settled.length, vitorias: stats.wins, derrotas: stats.losses, taxaAcerto: `${stats.winRate.toFixed(1)}%`, roi: `${stats.roi.toFixed(2)}%`, yield: `${stats.yield.toFixed(2)}%`, clvMedio: stats.avgCLV != null ? `${stats.avgCLV.toFixed(2)}%` : "sem dados", pl: `R$${stats.totalPL.toFixed(2)}` },
      porMercado: marketSeg.map(m => ({ mercado: m.name, apostas: m.bets, yield: `${m.yield.toFixed(2)}%`, pl: `R$${m.pl.toFixed(2)}` })),
      porCasa: bookSeg.map(b => ({ casa: b.name, apostas: b.bets, yield: `${b.yield.toFixed(2)}%`, pl: `R$${b.pl.toFixed(2)}` })),
      porEsporte: sportSeg.map(s => ({ esporte: s.name, apostas: s.bets, yield: `${s.yield.toFixed(2)}%`, pl: `R$${s.pl.toFixed(2)}` })),
      ultimasApostas: [...settled].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20).map(b => ({ data: b.date, desc: b.description, esporte: b.sport, mercado: b.market, casa: b.bookmaker, odds: b.odds, oddsClose: b.closingOdds || null, stake: b.stake, resultado: b.result, pl: getBetPL(b), clv: getCLV(b) !== null ? `${getCLV(b).toFixed(1)}%` : null })),
    };
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: `Você é um analista especializado em apostas esportivas com foco em Expected Value (EV) e gestão de bankroll profissional. Analise os dados e gere insights em português brasileiro.\n\nEstruture em 4 partes curtas:\n1. DIAGNÓSTICO GERAL — avalie ROI, yield, CLV\n2. PONTOS FORTES — onde está gerando edge real\n3. VAZAMENTOS DE EV — onde está perdendo desnecessariamente\n4. RECOMENDAÇÕES — 2 a 3 ações concretas\n\nSeja direto, técnico e específico. Máximo 400 palavras.`,
          messages: [{ role: "user", content: `Analise meu histórico:\n\n${JSON.stringify(payload, null, 2)}` }]
        })
      });
      const data = await res.json();
      const text = data.content?.find(c => c.type === "text")?.text || "";
      if (!text) throw new Error();
      setInsight(text);
    } catch { setError("Erro ao gerar análise. Tente novamente."); }
    finally { setLoading(false); }
  };

  return (
    <div className="card" style={{ borderColor: "rgba(139, 127, 245, 0.4)", marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: insight || error || loading ? 20 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Sparkles size={18} color="var(--accent)" />
          <span className="section-title" style={{ marginBottom: 0, color: "var(--accent)" }}>INSIGHTS COM IA</span>
        </div>
        <button onClick={generate} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 8, background: loading ? "var(--border)" : "rgba(139, 127, 245, 0.15)", color: loading ? "var(--muted)" : "var(--accent)", border: "1px solid rgba(139, 127, 245, 0.3)", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s ease" }}>
          {loading ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> ANALISANDO...</> : insight ? <><RefreshCw size={14} /> ATUALIZAR</> : "GERAR ANÁLISE"}
        </button>
      </div>
      {loading && <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", lineHeight: 2 }}>Processando seus dados analíticos...<br /><span style={{ fontSize: 12, color: "rgba(128,128,152,0.8)" }}>Isso pode levar alguns segundos</span></div>}
      {error && !loading && <div style={{ fontSize: 14, color: "var(--danger)", padding: "16px", background: "rgba(255, 61, 90, 0.1)", borderRadius: 8 }}>{error}</div>}
      {insight && !loading && (
        <div className="animate-fade-in" style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
          {insight.split("\n").map((line, i) => {
            const isHeader = /^\d+\.|^[A-ZÁÉÍÓÚ]{2,}/.test(line.trim());
            return <p key={i} style={{ margin: "0 0 12px", color: isHeader ? "var(--accent)" : "var(--text)", fontWeight: isHeader ? 600 : 400, fontSize: isHeader ? 12 : 14, letterSpacing: isHeader ? 1 : 0, textTransform: isHeader ? "uppercase" : "none" }}>{line}</p>;
          })}
        </div>
      )}
      {!insight && !loading && !error && <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7, marginTop: 16 }}>Clique em "Gerar Análise" para receber um diagnóstico profundo de seus padrões, possíveis vazamentos de EV e recomendações acionáveis feitas por Inteligência Artificial.</div>}
    </div>
  );
}

function BalanceDisplay({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  const startEdit = () => { setDraft(value.toString()); setEditing(true); setTimeout(() => inputRef.current?.select(), 50); };
  const confirm = () => { const v = parseFloat(draft); if (!isNaN(v) && v >= 0) onChange(v); setEditing(false); };
  const cancel = () => setEditing(false);
  const onKey = (e) => { if (e.key === "Enter") confirm(); if (e.key === "Escape") cancel(); };

  if (editing) return (
    <div className="balance-display animate-fade-in">
      <span className="logo-label" style={{ textAlign: "right", marginBottom: 4 }}>BANKROLL INICIAL</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>R$</span>
        <input
          ref={inputRef}
          type="number"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={onKey}
          style={{ width: 120, background: "rgba(0,0,0,0.4)", border: "1px solid var(--primary)", borderRadius: 6, padding: "6px 12px", color: "var(--primary)", fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, outline: "none", textAlign: "right" }}
        />
        <button onClick={confirm} style={{ background: "rgba(0, 212, 138, 0.2)", border: "none", borderRadius: 4, cursor: "pointer", color: "var(--primary)", padding: 6, display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={16} /></button>
        <button onClick={cancel} style={{ background: "rgba(255, 61, 90, 0.2)", border: "none", borderRadius: 4, cursor: "pointer", color: "var(--danger)", padding: 6, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} /></button>
      </div>
    </div>
  );

  return (
    <div className="balance-display" onClick={startEdit} title="Toque para editar">
      <span className="logo-label" style={{ textAlign: "right", marginBottom: 4 }}>SALDO ATUAL</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: "var(--primary)", fontFamily: "var(--font-mono)" }}>{fmt(value)}</span>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>✎</span>
      </div>
    </div>
  );
}

export default function BankrollVault() {
  const [view, setView] = useState("dashboard");
  const [loaded, setLoaded] = useState(false);
  const [analyzeTab, setAnalyzeTab] = useState("ia");

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
      const pl = getBetPL(bet); const clv = getCLV(bet);
      if (bet.result !== "pending") {
        totalStake += bet.stake; totalPL += pl; bankroll += pl;
        if (bet.result === "win") wins++;
        if (bet.result === "loss") losses++;
        chartData.push({ d: bet.date.slice(5), v: Math.round(bankroll * 100) / 100 });
      }
      if (clv != null && bet.result !== "pending") { clvSum += clv; clvCount++; }
    });
    return { currentBankroll: bankroll, totalPL, roi: config.initialBankroll > 0 ? totalPL / config.initialBankroll * 100 : 0, yield: totalStake > 0 ? totalPL / totalStake * 100 : 0, winRate: (wins + losses) > 0 ? wins / (wins + losses) * 100 : 0, avgCLV: clvCount > 0 ? clvSum / clvCount : null, wins, losses, totalBets: bets.length, chartData };
  }, [bets, config.initialBankroll]);

  const marketSeg = useMemo(() => buildSegments(bets, "market"), [bets]);
  const bookSeg = useMemo(() => buildSegments(bets, "bookmaker"), [bets]);
  const sportSeg = useMemo(() => buildSegments(bets, "sport"), [bets]);

  const kellyResult = useMemo(() => {
    const p = parseFloat(kellyForm.prob) / 100; const b = parseFloat(kellyForm.odds) - 1;
    const br = parseFloat(kellyForm.bankroll) || stats.currentBankroll;
    if (!p || !b || p <= 0 || p >= 1 || b <= 0) return null;
    const f = (b * p - (1 - p)) / b;
    return { fraction: f * 100, amount: f * br, hasValue: f > 0 };
  }, [kellyForm, stats.currentBankroll]);

  const addBet = () => {
    if (!form.description || !form.odds || !form.stake) return;
    setBets(prev => [...prev, { ...form, id: Date.now(), odds: parseFloat(form.odds), closingOdds: form.closingOdds ? parseFloat(form.closingOdds) : null, stake: parseFloat(form.stake) }]);
    setForm(defaultForm()); setView("dashboard");
  };

  const pending = bets.filter(b => b.result === "pending");
  const hasSettled = bets.some(b => b.result !== "pending");

  const NAV = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "register", icon: Plus, label: "Registrar" },
    { id: "history", icon: List, label: "Histórico" },
    { id: "analyze", icon: BarChart2, label: "Análise" },
    { id: "kelly", icon: Calculator, label: "Kelly" },
  ];

  const tabBtn = (id, label) => (
    <button key={id} onClick={() => setAnalyzeTab(id)} style={{ flex: 1, background: analyzeTab === id ? "var(--primary)" : "rgba(0,0,0,0.2)", color: analyzeTab === id ? "#000" : "var(--muted)", border: `1px solid ${analyzeTab === id ? "var(--primary)" : "var(--border)"}`, borderRadius: 6, padding: "10px 0", fontSize: 11, cursor: "pointer", fontFamily: "var(--font-sans)", fontWeight: 600, textTransform: "uppercase", transition: "all 0.2s ease", whiteSpace: "nowrap" }}>{label}</button>
  );

  return (
    <div className="app-layout">
      
      {/* SIDEBAR FOR DESKTOP, BOTTOM NAV FOR MOBILE */}
      <nav className="app-nav">
        <div className="sidebar-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
            <div>
              <span className="logo-label">Banca</span>
              <h1 className="logo-text">LÓGICA</h1>
            </div>
          </div>
        </div>
        {NAV.map(({ id, icon: Icon, label }) => (
          <button key={id} className={`nav-btn ${view === id ? "active" : ""}`} onClick={() => setView(id)}>
            <Icon size={20} /><span className="nav-label">{label}</span>
          </button>
        ))}
      </nav>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, width: "100%", height: "100%", overflow: "hidden" }}>
        
        {/* HEADER */}
        <header className="app-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div>
              <span className="logo-label">Banca</span>
              <h1 className="logo-text" style={{ fontSize: 20 }}>LÓGICA</h1>
            </div>
          </div>
          <BalanceDisplay
            value={config.initialBankroll}
            onChange={v => setConfig(p => ({ ...p, initialBankroll: v }))}
          />
        </header>

        {/* DESKTOP HEADER INFO */}
        <div className="main-content">
          <div className="desktop-header-info" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: "var(--text)" }}>{NAV.find(n => n.id === view)?.label}</h2>
            <BalanceDisplay value={config.initialBankroll} onChange={v => setConfig(p => ({ ...p, initialBankroll: v }))} />
          </div>

          <div className="animate-fade-in">
            {/* DASHBOARD */}
            {view === "dashboard" && <>
              <div className="grid-4">
                {[{ label: "ROI", val: fmtPct(stats.roi), color: stats.roi >= 0 ? "g" : "r" }, 
                  { label: "YIELD", val: fmtPct(stats.yield), color: stats.yield >= 0 ? "g" : "r" }, 
                  { label: "TAXA DE ACERTO", val: `${stats.winRate.toFixed(1)}%`, color: "text" }, 
                  { label: "CLV MÉDIO", val: stats.avgCLV != null ? fmtPct(stats.avgCLV) : "—", color: stats.avgCLV != null ? (stats.avgCLV >= 0 ? "g" : "r") : "muted" }].map(k => (
                  <div key={k.label} className="card"><span className="kpi-label">{k.label}</span><div className={`kpi-value ${k.color}`}>{k.val}</div></div>
                ))}
              </div>
              <div className="grid-4">
                {[{ label: "APOSTAS", val: stats.totalBets, color: "text" }, 
                  { label: "VITÓRIAS", val: stats.wins, color: "g" }, 
                  { label: "DERROTAS", val: stats.losses, color: "r" }, 
                  { label: "P&L TOTAL", val: `${stats.totalPL >= 0 ? "+" : ""}R$${Math.round(stats.totalPL)}`, color: stats.totalPL >= 0 ? "g" : "r" }].map(k => (
                  <div key={k.label} className="card" style={{ padding: "16px" }}><span className="kpi-label" style={{ fontSize: 9 }}>{k.label}</span><div className={`kpi-value ${k.color}`} style={{ fontSize: 20 }}>{k.val}</div></div>
                ))}
              </div>
              
              {stats.chartData.length > 2 && (
                <div className="card" style={{ marginBottom: 24, padding: "24px 20px" }}>
                  <span className="section-title">EVOLUÇÃO DO BANKROLL</span>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="d" tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "var(--font-mono)" }} width={80} tickFormatter={v => `R$${v}`} axisLine={false} tickLine={false} />
                      <ReferenceLine y={config.initialBankroll} stroke="var(--border)" strokeDasharray="4 4" />
                      <Tooltip 
                        contentStyle={{ background: "rgba(10, 10, 16, 0.9)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-mono)", backdropFilter: "blur(8px)" }} 
                        formatter={v => [fmt(v), "Bankroll"]} 
                        labelStyle={{ color: "var(--muted)", marginBottom: 4 }} 
                        itemStyle={{ color: "var(--primary)", fontWeight: 700 }}
                      />
                      <Line type="monotone" dataKey="v" stroke={stats.totalPL >= 0 ? "var(--primary)" : "var(--danger)"} strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 6, fill: stats.totalPL >= 0 ? "var(--primary)" : "var(--danger)", stroke: "#000", strokeWidth: 2 }} animationDuration={1000} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              
              {pending.length > 0 && (
                <div className="card" style={{ marginBottom: 24 }}>
                  <span className="section-title">APOSTAS PENDENTES</span>
                  {pending.map((bet, i) => (
                    <div key={bet.id} style={{ borderBottom: i < pending.length - 1 ? "1px solid var(--border)" : "none", paddingBottom: i < pending.length - 1 ? 16 : 0, marginBottom: i < pending.length - 1 ? 16 : 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                        <div><div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: "var(--text)" }}>{bet.description}</div><div className="bet-meta">{bet.sport} · {bet.market} · {bet.bookmaker}</div></div>
                        <div style={{ textAlign: "right" }}><div style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>@{bet.odds.toFixed(2)}</div><div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)", marginTop: 4 }}>{fmt(bet.stake)}</div></div>
                      </div>
                      <div style={{ display: "flex", gap: 12 }}>
                        <button className="outline-btn g" onClick={() => setBets(p => p.map(b => b.id === bet.id ? { ...b, result: "win" } : b))}>GANHOU</button>
                        <button className="outline-btn r" onClick={() => setBets(p => p.map(b => b.id === bet.id ? { ...b, result: "loss" } : b))}>PERDEU</button>
                        <button className="outline-btn muted" onClick={() => setBets(p => p.map(b => b.id === bet.id ? { ...b, result: "void" } : b))}>VOID</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {bets.length === 0 && (
                <div className="empty-state">
                  <div style={{ fontSize: 48, marginBottom: 16, color: "var(--border)" }}><LayoutDashboard size={48} /></div>
                  <div style={{ fontSize: 16, marginBottom: 24, fontWeight: 500 }}>Nenhuma aposta registrada ainda.</div>
                  <button className="btn" style={{ width: "auto", padding: "12px 32px" }} onClick={() => setView("register")}>REGISTRAR PRIMEIRA APOSTA</button>
                </div>
              )}
            </>}

            {/* REGISTRAR */}
            {view === "register" && <div className="card" style={{ maxWidth: 800, margin: "0 auto" }}>
              <span className="section-title" style={{ marginBottom: 24 }}>NOVA APOSTA</span>
              <div className="grid-2">
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <span className="form-label">DESCRIÇÃO</span>
                  <input type="text" placeholder="ex: Palmeiras x Corinthians — Palmeiras" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="input" />
                </div>
                <div className="form-group">
                  <span className="form-label">DATA</span>
                  <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="input" />
                </div>
                <div className="form-group">
                  <span className="form-label">STAKE (R$)</span>
                  <input type="number" placeholder="100.00" step="any" value={form.stake} onChange={e => setForm(p => ({ ...p, stake: e.target.value }))} className="input" />
                </div>
                <div className="form-group">
                  <span className="form-label">ODDS</span>
                  <input type="number" placeholder="1.85" step="0.01" value={form.odds} onChange={e => setForm(p => ({ ...p, odds: e.target.value }))} className="input" />
                </div>
                <div className="form-group">
                  <span className="form-label">ODDS DE FECHAMENTO (CLV)</span>
                  <input type="number" placeholder="Opcional" step="0.01" value={form.closingOdds} onChange={e => setForm(p => ({ ...p, closingOdds: e.target.value }))} className="input" />
                </div>
                <div className="form-group">
                  <span className="form-label">ESPORTE</span>
                  <select value={form.sport} onChange={e => setForm(p => ({ ...p, sport: e.target.value }))} className="select">{SPORTS.map(o => <option key={o} value={o}>{o}</option>)}</select>
                </div>
                <div className="form-group">
                  <span className="form-label">MERCADO</span>
                  <select value={form.market} onChange={e => setForm(p => ({ ...p, market: e.target.value }))} className="select">{MARKETS.map(o => <option key={o} value={o}>{o}</option>)}</select>
                </div>
                <div className="form-group">
                  <span className="form-label">CASA DE APOSTA</span>
                  <select value={form.bookmaker} onChange={e => setForm(p => ({ ...p, bookmaker: e.target.value }))} className="select">{BOOKMAKERS.map(o => <option key={o} value={o}>{o}</option>)}</select>
                </div>
                <div className="form-group">
                  <span className="form-label">RESULTADO</span>
                  <select value={form.result} onChange={e => setForm(p => ({ ...p, result: e.target.value }))} className="select">
                    {[["pending","Pendente"],["win","Ganhou"],["loss","Perdeu"],["void","Void"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <button className="btn" style={{ marginTop: 16 }} onClick={addBet}>REGISTRAR APOSTA</button>
            </div>}

            {/* HISTÓRICO */}
            {view === "history" && <div style={{ maxWidth: 800, margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <span className="section-title" style={{ margin: 0 }}>HISTÓRICO DE APOSTAS</span>
                <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>{bets.length} registros</span>
              </div>
              {bets.length === 0 && <div className="empty-state"><List size={48} style={{ marginBottom: 16, color: "var(--border)", margin: "0 auto" }} /><div>Nenhuma aposta registrada.</div></div>}
              {[...bets].sort((a, b) => b.date.localeCompare(a.date)).map(bet => {
                const pl = getBetPL(bet); const clv = getCLV(bet);
                const [rlabel, rclass] = RESULT_MAP[bet.result] || ["?", "muted"];
                return (
                  <div key={bet.id} className="bet-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: 6, display: "flex", alignItems: "center" }}>
                          <span className={`badge ${rclass}`}>{rlabel}</span>
                          <span className="bet-name">{bet.description}</span>
                        </div>
                        <div className="bet-meta">{bet.date} • {bet.sport} • {bet.market} • {bet.bookmaker}</div>
                        <div className="bet-stats">
                          <span className="bet-stat" style={{ color: "var(--accent)", fontWeight: 700 }}>@{bet.odds.toFixed(2)}</span>
                          <span className="bet-stat" style={{ color: "var(--text)" }}>{fmt(bet.stake)}</span>
                          {bet.result !== "pending" && <span className="bet-stat" style={{ color: pl >= 0 ? "var(--primary)" : "var(--danger)", fontWeight: 700 }}>P&L: {pl >= 0 ? "+" : ""}{fmt(Math.abs(pl))}</span>}
                          {clv != null && <span className="bet-stat" style={{ color: clv >= 0 ? "var(--primary)" : "var(--danger)", fontWeight: 700 }}>CLV: {clv >= 0 ? "+" : ""}{clv.toFixed(1)}%</span>}
                        </div>
                      </div>
                      <button onClick={() => setBets(p => p.filter(b => b.id !== bet.id))} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 8, borderRadius: 4, transition: "background 0.2s ease" }} onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"} onMouseOut={e => e.currentTarget.style.background = "transparent"}><X size={18} /></button>
                    </div>
                  </div>
                );
              })}
            </div>}

            {/* ANÁLISE */}
            {view === "analyze" && <div style={{ maxWidth: 1000, margin: "0 auto" }}>
              <span className="section-title" style={{ marginBottom: 24 }}>ANÁLISE DE PERFORMANCE</span>
              {!hasSettled ? (
                <div className="empty-state">
                  <BarChart2 size={48} style={{ marginBottom: 16, color: "var(--border)", margin: "0 auto" }} />
                  <div style={{ fontSize: 16, fontWeight: 500 }}>Registre apostas liquidadas para ver a análise avançada.</div>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 12, marginBottom: 24, overflowX: "auto", paddingBottom: 8 }}>
                    {tabBtn("ia", "Inteligência IA")}
                    {tabBtn("market", "Mercados")}
                    {tabBtn("bookmaker", "Casas de Aposta")}
                    {tabBtn("sport", "Esportes")}
                  </div>
                  {analyzeTab === "ia" && <AIInsights stats={stats} marketSeg={marketSeg} bookSeg={bookSeg} sportSeg={sportSeg} bets={bets} />}
                  {analyzeTab === "market" && <><HighlightCards data={marketSeg} bestLabel="MELHOR MERCADO" worstLabel="PIOR MERCADO" /><SegmentTable title="PERFORMANCE POR MERCADO" data={marketSeg} /></>}
                  {analyzeTab === "bookmaker" && <><HighlightCards data={bookSeg} bestLabel="MELHOR CASA" worstLabel="PIOR CASA" /><SegmentTable title="PERFORMANCE POR CASA DE APOSTA" data={bookSeg} /></>}
                  {analyzeTab === "sport" && <><HighlightCards data={sportSeg} bestLabel="MELHOR ESPORTE" worstLabel="PIOR ESPORTE" /><SegmentTable title="PERFORMANCE POR ESPORTE" data={sportSeg} /></>}
                </>
              )}
            </div>}

            {/* KELLY */}
            {view === "kelly" && <div className="card" style={{ maxWidth: 700, margin: "0 auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <Calculator size={20} color="var(--primary)" />
                <span className="section-title" style={{ marginBottom: 0 }}>CALCULADORA CRITÉRIO DE KELLY</span>
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
                <input type="number" placeholder={stats.currentBankroll.toFixed(2)} value={kellyForm.bankroll} onChange={e => setKellyForm(p => ({ ...p, bankroll: e.target.value }))} className="input" />
              </div>

              {kellyResult && (
                <div className="card animate-fade-in" style={{ background: kellyResult.hasValue ? "linear-gradient(180deg, rgba(0,212,138,0.08) 0%, transparent 100%)" : "linear-gradient(180deg, rgba(255,61,90,0.08) 0%, transparent 100%)", borderColor: kellyResult.hasValue ? "rgba(0,212,138,0.3)" : "rgba(255,61,90,0.3)", padding: "24px" }}>
                  {kellyResult.hasValue
                    ? <>
                        <span className="kpi-label" style={{ color: "var(--primary)" }}>STAKE RECOMENDADO</span>
                        <div style={{ fontSize: 40, fontWeight: 700, color: "var(--primary)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>{fmt(kellyResult.amount)}</div>
                        <div style={{ fontSize: 14, color: "var(--text)", marginBottom: 16, fontWeight: 500 }}>{kellyResult.fraction.toFixed(2)}% do bankroll</div>
                        <div style={{ padding: "12px 16px", background: "rgba(0,0,0,0.3)", borderRadius: 8, fontSize: 12, color: "var(--muted)", lineHeight: 1.6, borderLeft: "3px solid var(--accent)" }}>
                          <strong style={{ color: "var(--text)" }}>Dica Profissional:</strong> A fórmula Kelly completa é altamente agressiva e propensa a alta variância. É padrão na indústria utilizar o <strong>Meio-Kelly ({fmt(kellyResult.amount / 2)})</strong> ou até <strong>Quarto-Kelly ({fmt(kellyResult.amount / 4)})</strong> para proteger seu bankroll contra sequências de perdas.
                        </div>
                      </>
                    : <>
                        <span className="kpi-label" style={{ color: "var(--danger)" }}>EXPECTED VALUE (EV) NEGATIVO</span>
                        <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6, marginTop: 8 }}>De acordo com sua probabilidade e a odd atual, esta aposta não possui valor matemático a longo prazo. O critério de Kelly recomenda <strong style={{ color: "var(--danger)" }}>não apostar</strong>.</div>
                      </>
                  }
                </div>
              )}
            </div>}

          </div>
        </div>
      </div>
    </div>
  );
}
