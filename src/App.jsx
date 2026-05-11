import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { LayoutDashboard, Plus, List, Calculator, BarChart2, Sparkles, RefreshCw, Check, X, Info, Layers, LogOut, Mail, Lock, User, Edit2, Search, Camera } from "lucide-react";
import { auth, db, googleProvider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
const SPORTS = ["Futebol", "Tênis", "Basquete", "Futebol Americano", "MMA", "Outros"];
const MARKETS = ["1x2", "Over/Under", "Escanteios", "Ambas Marcam", "Handicap Asiático", "Handicap Europeu", "Dupla Chance", "Total de Pontos", "Aces", "Duplas Faltas", "Outros"];
const BOOKMAKERS = ["Bet365", "Betano", "Sportingbet", "Novibet", "Betnacional", "Pinnacle", "Betfair", "KTO", "Outros"];

const fmt = (v) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPct = (v) => `${v >= 0 ? "+" : ""}${Number(v).toFixed(2)}%`;
const getBetPL = (bet) => bet.result === "win" ? bet.stake * (bet.odds - 1) : bet.result === "loss" ? -bet.stake : 0;
const getCLV = (bet) => bet.closingOdds ? ((bet.odds - bet.closingOdds) / bet.closingOdds * 100) : null;
const RESULT_MAP = { win: ["W", "g"], loss: ["L", "r"], void: ["V", "muted"], pending: ["?", "acc"] };
const defaultSelection = () => ({ id: Date.now() + Math.random(), description: "", sport: "Futebol", market: "1x2", odds: "" });
const defaultForm = () => ({ date: new Date().toISOString().split("T")[0], betType: "simple", sport: "Futebol", market: "1x2", bookmaker: localStorage.getItem("lastBookmaker") || "Bet365", description: "", odds: "", closingOdds: "", stake: "", result: "pending", notes: "", selections: [defaultSelection(), defaultSelection()] });

function buildSegments(bets, key) {
  const map = {};
  bets.forEach(bet => {
    if (bet.result === "pending") return;
    const pl = getBetPL(bet);
    if (bet.type === "multiple" && bet.selections?.length > 0 && key !== "bookmaker") {
      const n = bet.selections.length;
      bet.selections.forEach(sel => {
        const k = sel[key] || "Outros";
        if (!map[k]) map[k] = { name: k, bets: 0, wins: 0, losses: 0, stake: 0, pl: 0 };
        map[k].bets += 1 / n; map[k].stake += bet.stake / n; map[k].pl += pl / n;
        if (bet.result === "win") map[k].wins += 1 / n;
        if (bet.result === "loss") map[k].losses += 1 / n;
      });
    } else {
      const k = bet[key] || "Outros";
      if (!map[k]) map[k] = { name: k, bets: 0, wins: 0, losses: 0, stake: 0, pl: 0 };
      map[k].bets++; map[k].stake += bet.stake; map[k].pl += pl;
      if (bet.result === "win") map[k].wins++;
      if (bet.result === "loss") map[k].losses++;
    }
  });
  return Object.values(map).map(r => ({ ...r, bets: Math.round(r.bets), wins: Math.round(r.wins), losses: Math.round(r.losses), yield: r.stake > 0 ? r.pl / r.stake * 100 : 0 }));
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

const GEMINI_MODELS = [
  { id: "gemini-2.5-flash", label: "Flash 2.5", desc: "Recomendado · Estável" },
  { id: "gemini-3-flash-preview", label: "Flash 3.0", desc: "Nova Geração · Preview" }
];

const SYSTEM_PROMPT = `Você é um analista quantitativo de apostas esportivas de nível profissional, especializado em Expected Value (EV), gestão de banca e detecção de padrões comportamentais. Analise os dados fornecidos e gere um diagnóstico técnico em português brasileiro.

RESPONDA EXATAMENTE com estas seções usando títulos ## (markdown):

## DIAGNÓSTICO GERAL
Avalie ROI, yield e CLV com julgamento técnico direto. O que os números realmente indicam sobre a vantagem matemática do apostador a longo prazo?

## EDGE REAL
Onde há vantagem consistente e replicável? Cite segmentos específicos com os números reais dos dados. Ignore segmentos com menos de 3 apostas.

## VAZAMENTOS DE EV
Onde está destruindo valor? Mercados com yield negativo persistente, apostas de -EV, comportamento de tilt detectado pós-sequência de perdas?

## ANÁLISE DE SEQUÊNCIAS
Interprete as sequências atuais e históricas. A taxa de acerto é matematicamente coerente com as odds médias apostadas? Há sinais de apostas emocionais?

## GESTÃO DE BANCA
Comente sobre consistência do stake, concentração de risco, e se o apostador está dimensionando corretamente em relação ao edge real detectado.

## PLANO DE AÇÃO
3 ações concretas, priorizadas e específicas para as próximas 30 apostas. Cite mercados, limites ou comportamentos específicos.

Seja técnico. Use os números reais dos dados. Máximo 550 palavras.`;

const EXTRACTION_PROMPT = `Analise esta imagem de um comprovante/cupom de aposta esportiva. Extraia os dados e retorne APENAS um objeto JSON válido, sem markdown, sem texto adicional.

Formato exato:
{
  "type": "simple" ou "multiple",
  "bookmaker": "nome da casa de apostas",
  "date": "YYYY-MM-DD",
  "stake": número,
  "odds": número,
  "description": "descrição resumida da aposta",
  "sport": "Futebol|Tênis|Basquete|Futebol Americano|MMA|Outros",
  "market": "1x2|Over/Under|Escanteios|Ambas Marcam|Handicap Asiático|Handicap Europeu|Dupla Chance|Total de Pontos|Aces|Duplas Faltas|Outros",
  "selections": [
    { "description": "texto da seleção", "sport": "esporte", "market": "mercado", "odds": número }
  ]
}

Regras:
- type "multiple" se houver 2 ou mais seleções combinadas, caso contrário "simple"
- Para apostas simples: selections deve ser []
- stake: apenas o número decimal (sem R$)
- odds: odd decimal (ex: 1.85). Para múltiplas é a odd combinada total
- date: OBRIGATÓRIO no formato YYYY-MM-DD (ex: 2025-05-11). Procure por data/hora de colocação da aposta na imagem. Se não visível, use null
- Se um campo não for identificável com segurança, use null`;

function AIInsights({ stats, marketSeg, bookSeg, sportSeg, bets, apiKey, onApiKeyChange }) {
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draftKey, setDraftKey] = useState(apiKey);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [model, setModel] = useState(() => localStorage.getItem("gemini_model") || "gemini-2.5-flash");
  const settled = bets.filter(b => b.result !== "pending");

  useEffect(() => {
    if (apiKey) {
      setIsEditingKey(false);
      setDraftKey(apiKey);
    } else {
      setIsEditingKey(true);
    }
  }, [apiKey]);

  const saveKey = () => {
    const trimmed = draftKey.trim();
    onApiKeyChange(trimmed);
    if (trimmed) setIsEditingKey(false);
  };

  const changeModel = (m) => { setModel(m); localStorage.setItem("gemini_model", m); };

  const generate = async () => {
    if (!apiKey) { setError("Configure sua API Key do Google Gemini primeiro."); setIsEditingKey(true); return; }
    if (settled.length < 3) { setError("Registre pelo menos 3 apostas liquidadas para gerar análise."); return; }
    setLoading(true); setError(""); setInsight("");

    // Streak computation
    const chrono = [...settled].sort((a, b) => a.date.localeCompare(b.date));
    let streak = { type: null, count: 0 }, longestW = 0, longestL = 0, tmpW = 0, tmpL = 0;
    chrono.forEach(b => {
      if (b.result === "win") {
        tmpW++; tmpL = 0; if (tmpW > longestW) longestW = tmpW;
        streak = streak.type === "win" ? { ...streak, count: streak.count + 1 } : { type: "win", count: 1 };
      } else if (b.result === "loss") {
        tmpL++; tmpW = 0; if (tmpL > longestL) longestL = tmpL;
        streak = streak.type === "loss" ? { ...streak, count: streak.count + 1 } : { type: "loss", count: 1 };
      } else { tmpW = 0; tmpL = 0; streak = { type: null, count: 0 }; }
    });

    // Odds range distribution
    const oddsRanges = { "< 1.50": 0, "1.50–2.00": 0, "2.00–3.00": 0, "> 3.00": 0 };
    settled.forEach(b => {
      if (b.odds < 1.5) oddsRanges["< 1.50"]++;
      else if (b.odds < 2.0) oddsRanges["1.50–2.00"]++;
      else if (b.odds < 3.0) oddsRanges["2.00–3.00"]++;
      else oddsRanges["> 3.00"]++;
    });
    const avgOdds = (settled.reduce((a, b) => a + b.odds, 0) / settled.length).toFixed(2);
    const expectedWinRate = ((1 / parseFloat(avgOdds)) * 100).toFixed(1);

    const payload = {
      resumoGeral: {
        totalApostas: stats.totalBets, liquidadas: settled.length,
        vitorias: stats.wins, derrotas: stats.losses,
        taxaAcerto: `${stats.winRate.toFixed(1)}%`,
        taxaAcertoEsperadaParaOddMedia: `${expectedWinRate}%`,
        roi: `${stats.roi.toFixed(2)}%`,
        yield: `${stats.yield.toFixed(2)}%`,
        clvMedio: stats.avgCLV != null ? `${stats.avgCLV.toFixed(2)}%` : "sem dados",
        pl: `R$${stats.totalPL.toFixed(2)}`,
        oddMediaGeral: avgOdds,
        distribuicaoOdds: oddsRanges,
        sequenciaAtual: streak.type ? `${streak.count} ${streak.type === "win" ? "vitória(s)" : "derrota(s)"} consecutiva(s)` : "neutro",
        maiorSequenciaVitorias: longestW,
        maiorSequenciaDerrotas: longestL,
      },
      porMercado: marketSeg.map(m => ({ mercado: m.name, apostas: m.bets, yield: `${m.yield.toFixed(2)}%`, pl: `R$${m.pl.toFixed(2)}` })),
      porCasa: bookSeg.map(b => ({ casa: b.name, apostas: b.bets, yield: `${b.yield.toFixed(2)}%`, pl: `R$${b.pl.toFixed(2)}` })),
      porEsporte: sportSeg.map(s => ({ esporte: s.name, apostas: s.bets, yield: `${s.yield.toFixed(2)}%`, pl: `R$${s.pl.toFixed(2)}` })),
      ultimas30Apostas: [...settled].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30).map(b => ({
        data: b.date, tipo: b.type === "multiple" ? `Múltipla(${b.selections?.length}×)` : "Simples",
        desc: b.description, esporte: b.sport, mercado: b.market, casa: b.bookmaker,
        odds: b.odds, oddsClose: b.closingOdds || null, stake: b.stake,
        resultado: b.result, pl: getBetPL(b),
        clv: getCLV(b) !== null ? `${getCLV(b).toFixed(1)}%` : null,
        selecoes: b.selections?.map(s => ({ desc: s.description, esporte: s.sport, mercado: s.market, odds: s.odds }))
      })),
    };

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ parts: [{ text: `Analise meu histórico de apostas:\n\n${JSON.stringify(payload, null, 2)}` }] }],
          generationConfig: { temperature: 0.35, maxOutputTokens: 2048 }
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!text) throw new Error("Resposta vazia da API");
      setInsight(text);
    } catch (err) { setError("Erro: " + err.message); }
    finally { setLoading(false); }
  };

  const sections = insight
    ? insight.split(/\n(?=## )/).map(s => {
        const lines = s.trim().split("\n");
        return { header: lines[0].replace(/^##\s+/, "").trim(), body: lines.slice(1).join("\n").trim() };
      }).filter(s => s.header && s.body)
    : [];

  const selectedModelInfo = GEMINI_MODELS.find(m => m.id === model) || GEMINI_MODELS[0];

  return (
    <div className="card" style={{ borderColor: "rgba(139, 127, 245, 0.4)", marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Sparkles size={18} color="var(--accent)" />
          <div>
            <span className="section-title" style={{ marginBottom: 0, color: "var(--accent)" }}>INSIGHTS IA — GEMINI</span>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, letterSpacing: 1 }}>{selectedModelInfo.label} · {selectedModelInfo.desc}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={model} onChange={e => changeModel(e.target.value)} style={{ background: "rgba(0,0,0,0.4)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px", color: "var(--muted)", fontSize: 11, fontFamily: "var(--font-sans)", fontWeight: 600, cursor: "pointer", outline: "none", transition: "border-color 0.2s" }}>
            {GEMINI_MODELS.map(m => <option key={m.id} value={m.id}>{m.label} — {m.desc}</option>)}
          </select>
          {!isEditingKey && (
            <button onClick={() => { setIsEditingKey(true); setDraftKey(apiKey); }} title="Configurar API Key" style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 12px", fontSize: 11, cursor: "pointer", fontWeight: 600, transition: "all 0.2s ease" }}>
              <Info size={13} /> API KEY
            </button>
          )}
          <button onClick={generate} disabled={loading || isEditingKey} style={{ display: "flex", alignItems: "center", gap: 8, background: loading || isEditingKey ? "var(--border)" : "rgba(139, 127, 245, 0.15)", color: loading || isEditingKey ? "var(--muted)" : "var(--accent)", border: "1px solid rgba(139, 127, 245, 0.3)", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: loading || isEditingKey ? "not-allowed" : "pointer", transition: "all 0.2s ease" }}>
            {loading ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> ANALISANDO...</> : insight ? <><RefreshCw size={14} /> ATUALIZAR</> : "GERAR ANÁLISE"}
          </button>
        </div>
      </div>

      {isEditingKey && (
        <div style={{ marginBottom: 20, padding: 16, background: "rgba(0,0,0,0.2)", borderRadius: 10, border: "1px dashed var(--border)" }}>
          <div style={{ fontSize: 13, color: "var(--text)", marginBottom: 12, lineHeight: 1.7 }}>
            Insira sua <strong>Google Gemini API Key</strong>. Fica salva na nuvem vinculada à sua conta — disponível em todos os seus dispositivos.{" "}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "none", borderBottom: "1px solid rgba(139,127,245,0.4)" }}>Obter chave gratuita no AI Studio →</a>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input type="password" value={draftKey} onChange={e => setDraftKey(e.target.value)} onKeyDown={e => e.key === "Enter" && saveKey()} placeholder="AIzaSy..." className="input" style={{ flex: 1, minWidth: 200 }} />
            <button className="btn" onClick={saveKey} style={{ width: "auto", padding: "0 24px" }}>SALVAR</button>
            {apiKey && <button className="outline-btn muted" onClick={() => setIsEditingKey(false)} style={{ whiteSpace: "nowrap", padding: "0 16px" }}>CANCELAR</button>}
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
          <RefreshCw size={28} style={{ animation: "spin 1s linear infinite", color: "var(--accent)", marginBottom: 16 }} />
          <div style={{ fontSize: 14, marginBottom: 8 }}>Analisando {settled.length} apostas com {selectedModelInfo.label}...</div>
          <div style={{ fontSize: 12, color: "rgba(128,128,152,0.7)" }}>Isso pode levar alguns segundos</div>
        </div>
      )}

      {error && !loading && (
        <div style={{ fontSize: 13, color: "var(--danger)", padding: "14px 16px", background: "rgba(255, 61, 90, 0.08)", borderRadius: 8, border: "1px solid rgba(255,61,90,0.2)", lineHeight: 1.6 }}>{error}</div>
      )}

      {sections.length > 0 && !loading && (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {sections.map((sec, i) => (
            <div key={i} style={{ padding: "16px 0", borderBottom: i < sections.length - 1 ? "1px solid var(--border)" : "none", display: "flex", gap: 16 }}>
              <div style={{ width: 3, background: "rgba(139,127,245,0.5)", borderRadius: 2, flexShrink: 0, alignSelf: "stretch", minHeight: 20 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, letterSpacing: 2.5, marginBottom: 10, textTransform: "uppercase" }}>{sec.header}</div>
                <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{sec.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!insight && !loading && !error && !isEditingKey && (
        <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.8, padding: "8px 0" }}>
          Clique em <strong style={{ color: "var(--text)" }}>Gerar Análise</strong> para receber um diagnóstico técnico completo: edge real, vazamentos de EV, análise de sequências, gestão de banca e plano de ação concreto para as próximas 30 apostas.
        </div>
      )}
    </div>
  );
}

function InfoTooltip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <div 
      className="tooltip-container" 
      onMouseEnter={() => setOpen(true)} 
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen(!open)}
    >
      <Info size={13} className="tooltip-icon" />
      {open && (
        <div className="tooltip-content animate-fade-in">
          {text}
        </div>
      )}
    </div>
  );
}

function BalanceDisplay({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  const startEdit = () => { setDraft(Number(value).toFixed(2)); setEditing(true); setTimeout(() => inputRef.current?.select(), 50); };
  const confirm = () => { const v = parseFloat(draft); if (!isNaN(v) && v >= 0) onChange(v); setEditing(false); };
  const cancel = () => setEditing(false);
  const onKey = (e) => { if (e.key === "Enter") confirm(); if (e.key === "Escape") cancel(); };

  if (editing) return (
    <div className="balance-display animate-fade-in">
      <span className="logo-label" style={{ textAlign: "right", marginBottom: 4 }}>SALDO ATUAL</span>
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
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Email/Password states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authInProgress, setAuthInProgress] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [userDisplayName, setUserDisplayName] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [editingBet, setEditingBet] = useState(null);
  const [historyFilter, setHistoryFilter] = useState({ result: "all", search: "" });
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const imageInputRef = useRef(null);

  const [bets, setBets] = useState([]);
  const [config, setConfig] = useState({ initialBankroll: 1000 });
  const [geminiKey, setGeminiKey] = useState("");
  const [form, setForm] = useState(defaultForm());
  const [kellyForm, setKellyForm] = useState({ prob: "", odds: "", bankroll: "" });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setUserDisplayName(u?.displayName || u?.email?.split("@")[0] || "");
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) { setBets([]); setConfig({ initialBankroll: 1000 }); setGeminiKey(""); setLoaded(false); return; }
    setSyncError("");
    const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBets(data.bets || []);
        setConfig(data.config || { initialBankroll: 1000 });
        setGeminiKey(data.geminiKey || "");
      }
      setLoaded(true);
    }, (err) => {
      console.error("Snapshot error:", err);
      setSyncError("Erro de leitura do banco: " + err.message);
      setLoaded(true);
    });
    return () => unsub();
  }, [user]);

  const saveData = useCallback(async (newBets, newConfig) => {
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid), { bets: newBets, config: newConfig }, { merge: true });
      setSyncError("");
    } catch (err) {
      console.error("Save error:", err);
      setSyncError("Não foi possível salvar na nuvem: " + err.message);
    }
  }, [user]);

  const saveGeminiKey = useCallback(async (key) => {
    setGeminiKey(key);
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid), { geminiKey: key }, { merge: true });
    } catch (err) {
      console.error("Save key error:", err);
      setSyncError("Não foi possível salvar a API key na nuvem: " + err.message);
    }
  }, [user]);

  const handleGoogleLogin = async () => {
    try { 
      setAuthInProgress(true);
      setAuthError("");
      await signInWithPopup(auth, googleProvider); 
    } catch (err) { 
      setAuthInProgress(false);
      if (err.code !== "auth/popup-closed-by-user") {
        setAuthError("Erro ao tentar fazer login com Google: " + err.message);
      }
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthInProgress(true);
    try {
      if (isRegistering) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (nome.trim()) {
          await updateProfile(cred.user, { displayName: nome.trim() });
          setUserDisplayName(nome.trim());
        }
        await sendEmailVerification(cred.user);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      if (err.code === "auth/email-already-in-use") setAuthError("Este e-mail já está em uso.");
      else if (err.code === "auth/invalid-credential") setAuthError("E-mail ou senha incorretos.");
      else if (err.code === "auth/weak-password") setAuthError("A senha deve ter pelo menos 6 caracteres.");
      else setAuthError("Erro de autenticação: " + err.message);
      setAuthInProgress(false);
    }
  };

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

  if (authLoading || (user && !loaded)) return (
    <div style={{ display: "flex", width: "100%", height: "100vh", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, color: "var(--accent)" }}>
      <RefreshCw size={32} style={{ animation: "spin 1s linear infinite" }} />
      <span style={{ fontSize: 12, color: "var(--muted)", letterSpacing: 2, fontWeight: 600, fontFamily: "var(--font-mono)" }}>CARREGANDO...</span>
    </div>
  );

  if (!user) {
    return (
      <div style={{ display: "flex", width: "100%", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div className="card animate-fade-in" style={{ maxWidth: 400, width: "100%", padding: "40px 30px" }}>
          <div style={{ marginBottom: 30, textAlign: "center" }}>
            <span className="logo-label" style={{ fontSize: 14 }}>Banca</span>
            <h1 className="logo-text" style={{ fontSize: 36, justifyContent: "center" }}>LÓGICA</h1>
            <p style={{ color: "var(--muted)", marginTop: 12, fontSize: 14, lineHeight: 1.6 }}>Acesse para salvar sua banca na nuvem.</p>
          </div>

          <form onSubmit={handleEmailAuth} style={{ marginBottom: 20 }}>
            {isRegistering && (
              <div className="form-group">
                <span className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}><User size={12}/> NOME</span>
                <input type="text" value={nome} onChange={e => setNome(e.target.value)} className="input" placeholder="Seu nome" />
              </div>
            )}
            <div className="form-group">
              <span className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}><Mail size={12}/> E-MAIL</span>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="seu@email.com" />
            </div>
            <div className="form-group">
              <span className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}><Lock size={12}/> SENHA</span>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="input" placeholder="••••••••" minLength={6} />
            </div>

            {authError && <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 16, background: "rgba(255,61,90,0.1)", padding: 10, borderRadius: 6, lineHeight: 1.5, border: "1px solid rgba(255,61,90,0.3)" }}>{authError}</div>}

            <button type="submit" disabled={authInProgress} style={{ width: "100%", background: "var(--primary)", color: "#000", border: "none", padding: "14px", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: authInProgress ? "not-allowed" : "pointer", opacity: authInProgress ? 0.7 : 1, transition: "opacity 0.2s" }}>
              {authInProgress ? "CARREGANDO..." : (isRegistering ? "CRIAR CONTA" : "ENTRAR")}
            </button>
            
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 13 }}>
              <span style={{ color: "var(--muted)" }}>{isRegistering ? "Já tem conta?" : "Não tem conta?"} </span>
              <button type="button" onClick={() => { setIsRegistering(!isRegistering); setAuthError(""); setNome(""); }} style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 600, cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                {isRegistering ? "Faça login" : "Cadastre-se"}
              </button>
            </div>
          </form>

          <div style={{ display: "flex", alignItems: "center", margin: "24px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ padding: "0 12px", color: "var(--muted)", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>OU</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          <button type="button" onClick={handleGoogleLogin} disabled={authInProgress} style={{ width: "100%", background: "transparent", border: "1px solid var(--border)", color: "var(--text)", padding: "14px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: authInProgress ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, opacity: authInProgress ? 0.7 : 1, transition: "background 0.2s" }} onMouseOver={e => !authInProgress && (e.currentTarget.style.background = "rgba(255,255,255,0.05)")} onMouseOut={e => !authInProgress && (e.currentTarget.style.background = "transparent")}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            CONTINUAR COM GOOGLE
          </button>
        </div>
      </div>
    );
  }



  const extractFromImage = async (file) => {
    if (!geminiKey) { setExtractError("Configure a API Key do Gemini primeiro em Análise → Inteligência IA."); return; }
    setExtracting(true); setExtractError("");
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader(); r.readAsDataURL(file);
        r.onload = () => res(r.result.split(",")[1]); r.onerror = rej;
      });
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: EXTRACTION_PROMPT }, { inline_data: { mime_type: file.type, data: base64 } }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 2048 } })
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error.message);
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start === -1 || end === -1) throw new Error("JSON não encontrado na resposta");
      const ex = JSON.parse(cleaned.slice(start, end + 1));
      const today = new Date().toISOString().split("T")[0];
      const normalizeDate = (d) => {
        if (!d) return today;
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
        const m = d.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
        if (m) { const y = m[3].length === 2 ? "20" + m[3] : m[3]; return `${y}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`; }
        return today;
      };
      const bk = BOOKMAKERS.includes(ex.bookmaker) ? ex.bookmaker : (localStorage.getItem("lastBookmaker") || "Betano");
      if (ex.type === "multiple" && ex.selections?.length >= 2) {
        setForm(p => ({ ...p, betType: "multiple", bookmaker: bk, date: normalizeDate(ex.date),
          stake: ex.stake != null ? String(ex.stake) : p.stake, result: "pending", closingOdds: "", notes: "",
          selections: ex.selections.map(s => ({ id: Date.now() + Math.random(),
            description: s.description || "", odds: s.odds != null ? String(s.odds) : "",
            sport: SPORTS.includes(s.sport) ? s.sport : "Futebol",
            market: MARKETS.includes(s.market) ? s.market : "1x2" })) }));
      } else {
        setForm(p => ({ ...p, betType: "simple", bookmaker: bk, date: normalizeDate(ex.date),
          description: ex.description || "", odds: ex.odds != null ? String(ex.odds) : "",
          stake: ex.stake != null ? String(ex.stake) : p.stake, result: "pending", closingOdds: "", notes: "",
          sport: SPORTS.includes(ex.sport) ? ex.sport : "Futebol",
          market: MARKETS.includes(ex.market) ? ex.market : "1x2" }));
      }
    } catch (err) { setExtractError("Não foi possível extrair os dados. Tente uma imagem mais nítida. (" + err.message + ")"); }
    finally { setExtracting(false); if (imageInputRef.current) imageInputRef.current.value = ""; }
  };

  const buildBetData = () => {
    if (form.betType === "multiple") {
      const valid = form.selections.filter(s => s.description && s.odds && parseFloat(s.odds) > 0);
      if (!form.stake || valid.length < 2) return null;
      const parsed = valid.map(s => ({ ...s, odds: parseFloat(s.odds) }));
      const combinedOdds = Math.round(parsed.reduce((acc, s) => acc * s.odds, 1) * 100) / 100;
      return { type: "multiple", date: form.date, bookmaker: form.bookmaker, stake: parseFloat(form.stake), result: form.result, closingOdds: form.closingOdds ? parseFloat(form.closingOdds) : null, notes: form.notes, odds: combinedOdds, selections: parsed, description: parsed.map(s => s.description).join(" × ") };
    } else {
      if (!form.description || !form.odds || !form.stake) return null;
      return { type: "simple", date: form.date, sport: form.sport, market: form.market, bookmaker: form.bookmaker, description: form.description, odds: parseFloat(form.odds), closingOdds: form.closingOdds ? parseFloat(form.closingOdds) : null, stake: parseFloat(form.stake), result: form.result, notes: form.notes };
    }
  };

  const addBet = () => {
    const data = buildBetData();
    if (!data) return;
    const newBets = editingBet
      ? bets.map(b => b.id === editingBet.id ? { ...data, id: editingBet.id } : b)
      : [...bets, { ...data, id: Date.now() }];
    setBets(newBets);
    saveData(newBets, config);
    localStorage.setItem("lastBookmaker", form.bookmaker);
    const dest = editingBet ? "history" : "dashboard";
    setEditingBet(null);
    setForm(defaultForm());
    setView(dest);
  };

  const startEdit = (bet) => {
    setEditingBet(bet);
    setForm({
      date: bet.date,
      betType: bet.type === "multiple" ? "multiple" : "simple",
      sport: bet.sport || "Futebol",
      market: bet.market || "1x2",
      bookmaker: bet.bookmaker || "Bet365",
      description: bet.type === "multiple" ? "" : (bet.description || ""),
      odds: bet.type === "multiple" ? "" : String(bet.odds ?? ""),
      closingOdds: bet.closingOdds != null ? String(bet.closingOdds) : "",
      stake: String(bet.stake ?? ""),
      result: bet.result,
      notes: bet.notes || "",
      selections: bet.type === "multiple" && bet.selections?.length
        ? bet.selections.map(s => ({ ...s, odds: String(s.odds) }))
        : [defaultSelection(), defaultSelection()],
    });
    setView("register");
  };

  const pending = bets.filter(b => b.result === "pending");
  const hasSettled = bets.some(b => b.result !== "pending");
  const filteredBets = [...bets]
    .filter(b => historyFilter.result === "all" || b.result === historyFilter.result)
    .filter(b => !historyFilter.search || b.description.toLowerCase().includes(historyFilter.search.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date));

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
        <div className="sidebar-user">
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), var(--primary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {(userDisplayName[0] || "?").toUpperCase()}
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Olá, {userDisplayName.split(" ")[0] || "Usuário"}!
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</div>
          </div>
        </div>
      </nav>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, width: "100%", height: "100%", overflow: "hidden" }}>
        
        {/* HEADER */}
        <header className="app-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div>
              <span className="logo-label">Banca</span>
              <h1 className="logo-text" style={{ fontSize: 20 }}>LÓGICA</h1>
            </div>
            <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>
              Olá, {userDisplayName.split(" ")[0] || ""}!
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <BalanceDisplay
              value={stats.currentBankroll}
              onChange={v => { const nc = { ...config, initialBankroll: v - stats.totalPL }; setConfig(nc); saveData(bets, nc); }}
            />
            <button onClick={() => signOut(auth)} title="Sair da Conta" style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", padding: 8, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" }} onMouseOver={e => { e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.borderColor = "var(--danger)"; }} onMouseOut={e => { e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {syncError && (
          <div style={{ background: "rgba(255, 61, 90, 0.1)", borderBottom: "1px solid rgba(255, 61, 90, 0.3)", color: "var(--danger)", padding: "12px 20px", fontSize: 13, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
            <Info size={16} /> {syncError}
          </div>
        )}

        {/* DESKTOP HEADER INFO */}
        <div className="main-content">
          <div className="desktop-header-info" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: "var(--text)" }}>{NAV.find(n => n.id === view)?.label}</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <BalanceDisplay value={stats.currentBankroll} onChange={v => { const nc = { ...config, initialBankroll: v - stats.totalPL }; setConfig(nc); saveData(bets, nc); }} />
              <button onClick={() => signOut(auth)} title="Sair da Conta" style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", padding: 8, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" }} onMouseOver={e => { e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.borderColor = "var(--danger)"; }} onMouseOut={e => { e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
                <LogOut size={16} />
              </button>
            </div>
          </div>

          <div className="animate-fade-in">
            {/* DASHBOARD */}
            {view === "dashboard" && <>
              <div className="grid-4">
                {[{ label: "ROI", val: fmtPct(stats.roi), color: stats.roi >= 0 ? "g" : "r", tip: "Retorno Sobre Investimento. Mede o seu lucro líquido em relação à banca inicial." }, 
                  { label: "YIELD", val: fmtPct(stats.yield), color: stats.yield >= 0 ? "g" : "r", tip: "Eficiência. Mostra a porcentagem de lucro sobre todo o volume financeiro apostado." }, 
                  { label: "TAXA DE ACERTO", val: `${stats.winRate.toFixed(1)}%`, color: "text", tip: "Porcentagem de vitórias em relação ao total de apostas concluídas." }, 
                  { label: "CLV MÉDIO", val: stats.avgCLV != null ? fmtPct(stats.avgCLV) : "—", color: stats.avgCLV != null ? (stats.avgCLV >= 0 ? "g" : "r") : "muted", tip: "Closing Line Value. Se positivo, significa que você bateu a casa de aposta e comprou odds maiores do que o valor de fechamento (O que garante lucro a longo prazo)." }].map(k => (
                  <div key={k.label} className="card">
                    <span className="kpi-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{k.label} {k.tip && <InfoTooltip text={k.tip} />}</span>
                    <div className={`kpi-value ${k.color}`}>{k.val}</div>
                  </div>
                ))}
              </div>
              <div className="grid-4">
                {[{ label: "APOSTAS", val: stats.totalBets, color: "text" }, 
                  { label: "VITÓRIAS", val: stats.wins, color: "g" }, 
                  { label: "DERROTAS", val: stats.losses, color: "r" }, 
                  { label: "P&L TOTAL", val: `${stats.totalPL >= 0 ? "+" : ""}R$${Math.round(stats.totalPL)}`, color: stats.totalPL >= 0 ? "g" : "r", tip: "Profit & Loss. O seu resultado financeiro bruto em Reais." }].map(k => (
                  <div key={k.label} className="card" style={{ padding: "16px" }}>
                    <span className="kpi-label" style={{ fontSize: 9, display: 'flex', alignItems: 'center', gap: '4px' }}>{k.label} {k.tip && <InfoTooltip text={k.tip} />}</span>
                    <div className={`kpi-value ${k.color}`} style={{ fontSize: 20 }}>{k.val}</div>
                  </div>
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
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                            {bet.type === "multiple" && <span className="badge acc" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10 }}><Layers size={10} />MÚLT {bet.selections?.length}×</span>}
                            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{bet.description}</span>
                          </div>
                          {bet.type === "multiple" && bet.selections?.length > 0 && (
                            <div style={{ marginBottom: 6, paddingLeft: 8, borderLeft: "2px solid var(--border)" }}>
                              {bet.selections.map((sel, si) => (
                                <div key={si} style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>
                                  <span style={{ color: "var(--text)" }}>{sel.description}</span> · {sel.sport} · {sel.market}
                                  <span style={{ color: "var(--accent)", fontFamily: "var(--font-mono)", marginLeft: 6 }}>@{parseFloat(sel.odds).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="bet-meta">{bet.type === "multiple" ? bet.bookmaker : `${bet.sport} · ${bet.market} · ${bet.bookmaker}`}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>@{bet.odds.toFixed(2)}{bet.type === "multiple" ? " comb." : ""}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)", marginTop: 4 }}>{fmt(bet.stake)}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 12 }}>
                        <button className="outline-btn g" onClick={() => { const nb = bets.map(b => b.id === bet.id ? { ...b, result: "win" } : b); setBets(nb); saveData(nb, config); }}>GANHOU</button>
                        <button className="outline-btn r" onClick={() => { const nb = bets.map(b => b.id === bet.id ? { ...b, result: "loss" } : b); setBets(nb); saveData(nb, config); }}>PERDEU</button>
                        <button className="outline-btn muted" onClick={() => { const nb = bets.map(b => b.id === bet.id ? { ...b, result: "void" } : b); setBets(nb); saveData(nb, config); }}>VOID</button>
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span className="section-title" style={{ margin: 0 }}>{editingBet ? "EDITAR APOSTA" : "NOVA APOSTA"}</span>
                {editingBet && (
                  <button onClick={() => { setEditingBet(null); setForm(defaultForm()); setExtractError(""); setView("history"); }} style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", borderRadius: 8, padding: "8px 16px", fontSize: 12, cursor: "pointer", fontWeight: 600, fontFamily: "var(--font-sans)" }}>CANCELAR</button>
                )}
              </div>

              {/* IMPORTAR POR IMAGEM */}
              <div style={{ marginBottom: 24, padding: "16px 20px", background: "rgba(139,127,245,0.06)", border: "1px dashed rgba(139,127,245,0.35)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 3, display: "flex", alignItems: "center", gap: 8 }}>
                    <Camera size={15} color="var(--accent)" /> Importar por imagem
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>Envie um screenshot do cupom — IA preenche o formulário automaticamente</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {!geminiKey && <span style={{ fontSize: 11, color: "var(--danger)" }}>API Key não configurada</span>}
                  <button onClick={() => imageInputRef.current?.click()} disabled={extracting || !geminiKey} style={{ display: "flex", alignItems: "center", gap: 8, background: extracting || !geminiKey ? "var(--border)" : "rgba(139,127,245,0.15)", color: extracting || !geminiKey ? "var(--muted)" : "var(--accent)", border: "1px solid rgba(139,127,245,0.3)", borderRadius: 8, padding: "9px 16px", fontSize: 12, fontWeight: 700, cursor: extracting || !geminiKey ? "not-allowed" : "pointer", fontFamily: "var(--font-sans)", transition: "all 0.2s", whiteSpace: "nowrap" }}>
                    {extracting ? <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> LENDO...</> : <><Camera size={13} /> SELECIONAR</>}
                  </button>
                  <input ref={imageInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) extractFromImage(e.target.files[0]); }} />
                </div>
              </div>
              {extractError && <div style={{ marginBottom: 16, fontSize: 13, color: "var(--danger)", padding: "12px 14px", background: "rgba(255,61,90,0.08)", borderRadius: 8, border: "1px solid rgba(255,61,90,0.2)" }}>{extractError}</div>}

              <div className="bet-type-toggle">
                <button className={`bet-type-btn ${form.betType === "simple" ? "active" : ""}`} onClick={() => setForm(p => ({ ...p, betType: "simple" }))}>SIMPLES</button>
                <button className={`bet-type-btn mult ${form.betType === "multiple" ? "active" : ""}`} onClick={() => setForm(p => ({ ...p, betType: "multiple" }))}>
                  <Layers size={13} />MÚLTIPLA
                </button>
              </div>

              {form.betType === "simple" ? (
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
              ) : (
                <>
                  <div className="grid-2" style={{ marginBottom: 8 }}>
                    <div className="form-group">
                      <span className="form-label">DATA</span>
                      <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="input" />
                    </div>
                    <div className="form-group">
                      <span className="form-label">STAKE (R$)</span>
                      <input type="number" placeholder="100.00" step="any" value={form.stake} onChange={e => setForm(p => ({ ...p, stake: e.target.value }))} className="input" />
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
                    <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                      <span className="form-label">ODDS DE FECHAMENTO (CLV) — opcional</span>
                      <input type="number" placeholder="Odd combinada final no fechamento" step="0.01" value={form.closingOdds} onChange={e => setForm(p => ({ ...p, closingOdds: e.target.value }))} className="input" />
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <span className="section-title" style={{ margin: 0 }}>SELEÇÕES</span>
                      {(() => {
                        const v = form.selections.filter(s => s.odds && parseFloat(s.odds) > 0);
                        if (v.length < 2) return null;
                        const comb = v.reduce((acc, s) => acc * parseFloat(s.odds), 1);
                        return (
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 10, color: "var(--muted)", letterSpacing: 2, fontWeight: 700, textTransform: "uppercase" }}>Odd combinada</span>
                            <span style={{ fontSize: 24, fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>@{comb.toFixed(2)}</span>
                          </div>
                        );
                      })()}
                    </div>

                    {form.selections.map((sel, i) => (
                      <div key={sel.id} className="selection-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Seleção {i + 1}</span>
                          {form.selections.length > 2 && (
                            <button onClick={() => setForm(p => ({ ...p, selections: p.selections.filter(s => s.id !== sel.id) }))} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", borderRadius: 4, transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color = "var(--danger)"} onMouseOut={e => e.currentTarget.style.color = "var(--muted)"}><X size={14} /></button>
                          )}
                        </div>
                        <input type="text" placeholder="ex: Palmeiras vence" value={sel.description} onChange={e => setForm(p => ({ ...p, selections: p.selections.map(s => s.id === sel.id ? { ...s, description: e.target.value } : s) }))} className="input" style={{ marginBottom: 10 }} />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 90px", gap: 10 }}>
                          <select value={sel.sport} onChange={e => setForm(p => ({ ...p, selections: p.selections.map(s => s.id === sel.id ? { ...s, sport: e.target.value } : s) }))} className="select">{SPORTS.map(o => <option key={o} value={o}>{o}</option>)}</select>
                          <select value={sel.market} onChange={e => setForm(p => ({ ...p, selections: p.selections.map(s => s.id === sel.id ? { ...s, market: e.target.value } : s) }))} className="select">{MARKETS.map(o => <option key={o} value={o}>{o}</option>)}</select>
                          <input type="number" placeholder="@odd" step="0.01" value={sel.odds} onChange={e => setForm(p => ({ ...p, selections: p.selections.map(s => s.id === sel.id ? { ...s, odds: e.target.value } : s) }))} className="input" />
                        </div>
                      </div>
                    ))}

                    <button onClick={() => setForm(p => ({ ...p, selections: [...p.selections, defaultSelection()] }))} style={{ width: "100%", background: "transparent", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 10, padding: 14, color: "var(--muted)", cursor: "pointer", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginTop: 4, fontFamily: "var(--font-sans)", textTransform: "uppercase", transition: "all 0.2s ease" }} onMouseOver={e => { e.currentTarget.style.borderColor = "rgba(139,127,245,0.4)"; e.currentTarget.style.color = "var(--accent)"; }} onMouseOut={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "var(--muted)"; }}>
                      + ADICIONAR SELEÇÃO
                    </button>
                  </div>
                </>
              )}

              <button className="btn" style={{ marginTop: 8 }} onClick={addBet}>{editingBet ? "SALVAR ALTERAÇÕES" : `REGISTRAR ${form.betType === "multiple" ? "MÚLTIPLA" : "APOSTA"}`}</button>
            </div>}

            {/* HISTÓRICO */}
            {view === "history" && <div style={{ maxWidth: 800, margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span className="section-title" style={{ margin: 0 }}>HISTÓRICO DE APOSTAS</span>
                <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>
                  {filteredBets.length}{filteredBets.length !== bets.length ? ` de ${bets.length}` : ""} registros
                </span>
              </div>

              {/* Filtros */}
              <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[["all", "TODOS"], ["pending", "PENDENTES"], ["win", "GANHOU"], ["loss", "PERDEU"], ["void", "VOID"]].map(([val, label]) => (
                    <button key={val} onClick={() => setHistoryFilter(f => ({ ...f, result: val }))} style={{ background: historyFilter.result === val ? "var(--primary)" : "rgba(0,0,0,0.2)", color: historyFilter.result === val ? "#000" : "var(--muted)", border: `1px solid ${historyFilter.result === val ? "var(--primary)" : "var(--border)"}`, borderRadius: 20, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)", transition: "all 0.2s ease", letterSpacing: 0.5 }}>{label}</button>
                  ))}
                </div>
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
                  <input type="text" placeholder="Buscar por descrição..." value={historyFilter.search} onChange={e => setHistoryFilter(f => ({ ...f, search: e.target.value }))} className="input" style={{ paddingLeft: 38, paddingTop: 12, paddingBottom: 12, fontSize: 13 }} />
                  {historyFilter.search && <button onClick={() => setHistoryFilter(f => ({ ...f, search: "" }))} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4, display: "flex" }}><X size={14} /></button>}
                </div>
              </div>

              {bets.length === 0 && <div className="empty-state"><List size={48} style={{ color: "var(--border)", margin: "0 auto 16px" }} /><div>Nenhuma aposta registrada.</div></div>}
              {bets.length > 0 && filteredBets.length === 0 && <div className="empty-state"><Search size={40} style={{ color: "var(--border)", margin: "0 auto 16px" }} /><div>Nenhuma aposta encontrada com esses filtros.</div></div>}
              {filteredBets.map(bet => {
                const pl = getBetPL(bet); const clv = getCLV(bet);
                const [rlabel, rclass] = RESULT_MAP[bet.result] || ["?", "muted"];
                return (
                  <div key={bet.id} className="bet-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: 6, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                          <span className={`badge ${rclass}`}>{rlabel}</span>
                          {bet.type === "multiple" && <span className="badge acc" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Layers size={10} />MÚLT {bet.selections?.length}×</span>}
                          <span className="bet-name">{bet.description}</span>
                        </div>
                        <div className="bet-meta">{bet.date} • {bet.type === "multiple" ? bet.bookmaker : `${bet.sport} • ${bet.market} • ${bet.bookmaker}`}</div>
                        {bet.type === "multiple" && bet.selections?.length > 0 && (
                          <div style={{ marginTop: 10, paddingLeft: 10, borderLeft: "2px solid var(--border)" }}>
                            {bet.selections.map((sel, i) => (
                              <div key={i} style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <span style={{ color: "var(--text)", fontWeight: 500 }}>{sel.description}</span>
                                <span>·</span><span>{sel.sport}</span>
                                <span>·</span><span>{sel.market}</span>
                                <span style={{ color: "var(--accent)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>@{parseFloat(sel.odds).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="bet-stats">
                          <span className="bet-stat" style={{ color: "var(--accent)", fontWeight: 700 }}>@{bet.odds.toFixed(2)}{bet.type === "multiple" ? " comb." : ""}</span>
                          <span className="bet-stat" style={{ color: "var(--text)" }}>{fmt(bet.stake)}</span>
                          {bet.result !== "pending" && <span className="bet-stat" style={{ color: pl >= 0 ? "var(--primary)" : "var(--danger)", fontWeight: 700 }}>P&L: {pl >= 0 ? "+" : ""}{fmt(Math.abs(pl))}</span>}
                          {clv != null && <span className="bet-stat" style={{ color: clv >= 0 ? "var(--primary)" : "var(--danger)", fontWeight: 700 }}>CLV: {clv >= 0 ? "+" : ""}{clv.toFixed(1)}%</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 2, flexShrink: 0, alignItems: "flex-start" }}>
                        {deletingId !== bet.id && (
                          <button onClick={() => startEdit(bet)} title="Editar aposta" style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 8, borderRadius: 4, display: "flex" }} onMouseOver={e => e.currentTarget.style.color = "var(--accent)"} onMouseOut={e => e.currentTarget.style.color = "var(--muted)"}><Edit2 size={15} /></button>
                        )}
                        {deletingId === bet.id ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                            <button onClick={() => { const nb = bets.filter(b => b.id !== bet.id); setBets(nb); saveData(nb, config); setDeletingId(null); }} style={{ fontSize: 11, background: "rgba(255,61,90,0.15)", color: "var(--danger)", border: "1px solid rgba(255,61,90,0.35)", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}>EXCLUIR</button>
                            <button onClick={() => setDeletingId(null)} style={{ fontSize: 11, background: "transparent", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 12px", cursor: "pointer", whiteSpace: "nowrap" }}>CANCELAR</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeletingId(bet.id)} title="Excluir aposta" style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 8, borderRadius: 4, display: "flex" }} onMouseOver={e => e.currentTarget.style.color = "var(--danger)"} onMouseOut={e => e.currentTarget.style.color = "var(--muted)"}><X size={18} /></button>
                        )}
                      </div>
                    </div>
                    {bet.result === "pending" && (
                      <div style={{ display: "flex", gap: 10, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                        <button className="outline-btn g" onClick={() => { const nb = bets.map(b => b.id === bet.id ? { ...b, result: "win" } : b); setBets(nb); saveData(nb, config); }}>GANHOU</button>
                        <button className="outline-btn r" onClick={() => { const nb = bets.map(b => b.id === bet.id ? { ...b, result: "loss" } : b); setBets(nb); saveData(nb, config); }}>PERDEU</button>
                        <button className="outline-btn muted" onClick={() => { const nb = bets.map(b => b.id === bet.id ? { ...b, result: "void" } : b); setBets(nb); saveData(nb, config); }}>VOID</button>
                      </div>
                    )}
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
                  {analyzeTab === "ia" && <AIInsights stats={stats} marketSeg={marketSeg} bookSeg={bookSeg} sportSeg={sportSeg} bets={bets} apiKey={geminiKey} onApiKeyChange={saveGeminiKey} />}
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
