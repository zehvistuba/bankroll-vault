import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { LayoutDashboard, Plus, List, Calculator, BarChart2, Sparkles, RefreshCw, Check, X, Info, Layers, LogOut, Mail, Lock, User, Edit2, Search, Camera, Download, Target, TrendingUp, TrendingDown, Sun, Moon, Share2, CalendarDays, ChevronLeft, ChevronRight, Trophy, Users, ImageDown, Globe, Eye, EyeOff, AlertTriangle, Crown, Zap, Shield, UserCheck, UserX } from "lucide-react";
import { auth, db, googleProvider, fns } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendEmailVerification, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot, collection, deleteDoc, writeBatch, serverTimestamp, getDocs, query, orderBy, limit } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
const FREE_BET_LIMIT = 30;
const HOTMART_CHECKOUT_URL = "https://pay.hotmart.com/P105879919P";

const ProBadge = () => (
  <span style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)", color: "#000", fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4, letterSpacing: 1, display: "inline-flex", alignItems: "center", gap: 3, verticalAlign: "middle" }}>
    <Crown size={8} /> PRO
  </span>
);

function UpgradeModal({ onClose, user }) {
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

function OnboardingModal({ step, banca, onBancaChange, onNext, onClose, onGoRegister, onGoAnalyze }) {
  const steps = [
    { emoji: "👋", title: "Bem-vindo à Banca Lógica!", sub: "Configure sua banca em 2 minutos e comece a acompanhar seu desempenho.", label: "1 / 3" },
    { emoji: "📝", title: "Registre sua primeira aposta", sub: "Adicione manualmente ou importe um screenshot do seu cupom — a IA preenche tudo automaticamente.", label: "2 / 3" },
    { emoji: "🤖", title: "Análise inteligente com IA", sub: "Configure o Google Gemini gratuitamente e receba insights sobre seu desempenho, padrões e erros.", label: "3 / 3" },
  ];
  const s = steps[step - 1];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="card animate-fade-in" style={{ maxWidth: 420, width: "100%", padding: "40px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "var(--muted)", marginBottom: 16 }}>{s.label}</div>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 24 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: 3, width: i === step ? 32 : 16, borderRadius: 4, background: i === step ? "var(--primary)" : i < step ? "var(--primary)" : "var(--border)", transition: "all 0.3s" }} />
          ))}
        </div>
        <div style={{ fontSize: 40, marginBottom: 16 }}>{s.emoji}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>{s.title}</div>
        <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7, marginBottom: 28 }}>{s.sub}</div>

        {step === 1 && (
          <div style={{ marginBottom: 24, textAlign: "left" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", letterSpacing: 1, marginBottom: 8 }}>BANCA INICIAL (R$)</div>
            <input
              type="number" min="1" value={banca} onChange={e => onBancaChange(e.target.value)}
              className="input" style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--font-mono)", textAlign: "center", color: "var(--primary)" }}
              placeholder="1000" autoFocus
            />
          </div>
        )}

        {step === 1 && (
          <button className="btn" style={{ width: "100%", marginBottom: 12 }} onClick={onNext}>
            Confirmar banca →
          </button>
        )}
        {step === 2 && <>
          <button className="btn" style={{ width: "100%", marginBottom: 12 }} onClick={onGoRegister}>
            Registrar primeira aposta →
          </button>
          <button onClick={onNext} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 13, cursor: "pointer", padding: 8, width: "100%" }}>
            Farei depois
          </button>
        </>}
        {step === 3 && <>
          <button className="btn" style={{ width: "100%", marginBottom: 12 }} onClick={onGoAnalyze}>
            Ir para Análise →
          </button>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 13, cursor: "pointer", padding: 8, width: "100%" }}>
            Concluir configuração
          </button>
        </>}
      </div>
    </div>
  );
}

const SPORTS = ["Futebol", "Tênis", "Basquete", "Futebol Americano", "MMA", "Outros"];
const MARKETS = ["1x2", "Over/Under", "Escanteios", "Ambas Marcam", "Handicap Asiático", "Handicap Europeu", "Dupla Chance", "Total de Pontos", "Aces", "Duplas Faltas", "Outros"];
const BOOKMAKERS = ["Bet365", "Betano", "Sportingbet", "Novibet", "Betnacional", "Pinnacle", "Betfair", "KTO", "Outros"];

const fmt = (v) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPct = (v) => `${v >= 0 ? "+" : ""}${Number(v).toFixed(2)}%`;
const getBetPL = (bet) => bet.result === "win" ? bet.stake * (bet.odds - 1) : bet.result === "loss" ? -bet.stake : 0;
const getCLV = (bet) => bet.closingOdds ? ((bet.odds - bet.closingOdds) / bet.closingOdds * 100) : null;
const RESULT_MAP = { win: ["W", "g"], loss: ["L", "r"], void: ["V", "muted"], pending: ["?", "acc"] };
const defaultSelection = () => ({ id: crypto.randomUUID(), description: "", sport: "Futebol", market: "1x2", odds: "" });
const defaultForm = () => ({ date: new Date().toISOString().split("T")[0], betType: "simple", sport: "Futebol", market: "1x2", bookmaker: localStorage.getItem("lastBookmaker") || "Bet365", description: "", odds: "", closingOdds: "", stake: "", result: "pending", notes: "", prob: "", selections: [defaultSelection(), defaultSelection()] });

const shareAsImage = async (canvas, filename) => {
  return new Promise(resolve => {
    canvas.toBlob(async (blob) => {
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: "Banca Lógica" }); } catch (_) {}
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
      }
      resolve();
    }, "image/png");
  });
};

const generateBetCard = async (bet) => {
  await document.fonts.ready;
  const W = 600, H = 320;
  const canvas = document.createElement("canvas");
  canvas.width = W * 2; canvas.height = H * 2;
  const ctx = canvas.getContext("2d");
  ctx.scale(2, 2);
  const pl = getBetPL(bet);
  const rc = bet.result === "win" ? "#00d48a" : bet.result === "loss" ? "#ff3d5a" : "#8b7ff5";
  const rl = bet.result === "win" ? "GREEN ✓" : bet.result === "loss" ? "RED ✗" : "PENDENTE";

  ctx.fillStyle = "#07070e"; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(80, H / 2, 0, 80, H / 2, 200);
  g.addColorStop(0, rc + "28"); g.addColorStop(1, "transparent");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = rc; ctx.fillRect(0, 0, 4, H);
  ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

  ctx.fillStyle = "#808098"; ctx.font = "600 10px monospace"; ctx.fillText("BANCA LÓGICA", 20, 32);
  ctx.fillStyle = rc; ctx.font = "700 12px monospace";
  ctx.fillText(rl, W - 20 - ctx.measureText(rl).width, 32);
  ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fillRect(20, 44, W - 40, 1);

  const desc = bet.description || "—"; const d2 = desc.length > 55 ? desc.slice(0, 55) + "…" : desc;
  ctx.fillStyle = "#e4e4f0"; ctx.font = "bold 17px system-ui,sans-serif"; ctx.fillText(d2, 20, 84);
  ctx.fillStyle = "#808098"; ctx.font = "13px system-ui,sans-serif";
  const meta = [bet.bookmaker, bet.date, bet.type !== "multiple" && bet.sport, bet.type !== "multiple" && bet.market].filter(Boolean).join(" · ");
  ctx.fillText(meta, 20, 108);
  ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fillRect(20, 124, W - 40, 1);

  ctx.fillStyle = "#8b7ff5"; ctx.font = "bold 28px monospace"; ctx.fillText(`@${bet.odds?.toFixed(2)}`, 20, 172);
  ctx.fillStyle = "#808098"; ctx.font = "13px monospace"; ctx.fillText(`Stake: ${fmt(bet.stake)}`, 20, 196);

  if (bet.result !== "pending") {
    ctx.fillStyle = rc; ctx.font = "bold 24px monospace";
    const pt = `${pl >= 0 ? "+" : ""}${fmt(Math.abs(pl))}`;
    ctx.fillText(pt, W - 20 - ctx.measureText(pt).width, 172);
    ctx.fillStyle = "#808098"; ctx.font = "10px monospace";
    const lb = pl >= 0 ? "LUCRO" : "PREJUÍZO";
    ctx.fillText(lb, W - 20 - ctx.measureText(lb).width, 190);
  } else {
    ctx.fillStyle = "#8b7ff5"; ctx.font = "bold 18px monospace";
    const rt = `Ret: ${fmt(bet.stake * bet.odds)}`;
    ctx.fillText(rt, W - 20 - ctx.measureText(rt).width, 172);
  }

  ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(20, H - 46, W - 40, 1);
  ctx.fillStyle = "rgba(128,128,152,0.5)"; ctx.font = "10px monospace";
  ctx.fillText("banca-logica.pages.dev", 20, H - 22);
  const dt = new Date().toLocaleDateString("pt-BR");
  ctx.fillText(dt, W - 20 - ctx.measureText(dt).width, H - 22);
  return canvas;
};

const generateStatsCard = async (st, name) => {
  await document.fonts.ready;
  const W = 600, H = 360;
  const canvas = document.createElement("canvas");
  canvas.width = W * 2; canvas.height = H * 2;
  const ctx = canvas.getContext("2d");
  ctx.scale(2, 2);
  const rc = st.roi >= 0 ? "#00d48a" : "#ff3d5a";

  ctx.fillStyle = "#07070e"; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 280);
  g.addColorStop(0, rc + "18"); g.addColorStop(1, "transparent");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = rc; ctx.fillRect(0, 0, 4, H);
  ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

  ctx.fillStyle = "#808098"; ctx.font = "600 10px monospace"; ctx.fillText("BANCA LÓGICA", 20, 34);
  if (name) { const nw = ctx.measureText(name).width; ctx.fillText(name, W - 20 - nw, 34); }
  ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fillRect(20, 46, W - 40, 1);
  ctx.fillStyle = "#808098"; ctx.font = "11px monospace"; ctx.fillText("MINHA PERFORMANCE", 20, 74);

  const roiText = `${st.roi >= 0 ? "+" : ""}${st.roi.toFixed(2)}% ROI`;
  ctx.fillStyle = rc; ctx.font = "bold 44px monospace";
  ctx.fillText(roiText, W / 2 - ctx.measureText(roiText).width / 2, 152);

  const cols = [
    { label: "YIELD", v: `${st.yield >= 0 ? "+" : ""}${st.yield.toFixed(2)}%`, c: st.yield >= 0 ? "#00d48a" : "#ff3d5a" },
    { label: "ACERTO", v: `${st.winRate.toFixed(1)}%`, c: "#e4e4f0" },
    { label: "P&L TOTAL", v: `${st.totalPL >= 0 ? "+" : ""}R$${Math.round(st.totalPL)}`, c: st.totalPL >= 0 ? "#00d48a" : "#ff3d5a" },
  ];
  cols.forEach((col, i) => {
    const x = 20 + i * (W - 40) / 3;
    ctx.fillStyle = "#808098"; ctx.font = "9px monospace"; ctx.fillText(col.label, x, 204);
    ctx.fillStyle = col.c; ctx.font = "bold 18px monospace"; ctx.fillText(col.v, x, 228);
  });

  ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fillRect(20, 252, W - 40, 1);
  ctx.fillStyle = "#808098"; ctx.font = "12px monospace";
  ctx.fillText(`${st.totalBets} apostas · ${st.wins}W / ${st.losses}L`, 20, 280);

  ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(20, H - 46, W - 40, 1);
  ctx.fillStyle = "rgba(128,128,152,0.5)"; ctx.font = "10px monospace";
  ctx.fillText("banca-logica.pages.dev", 20, H - 22);
  const dt = new Date().toLocaleDateString("pt-BR");
  ctx.fillText(dt, W - 20 - ctx.measureText(dt).width, H - 22);
  return canvas;
};

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
  { id: "gemini-2.5-flash", label: "Flash 2.5", desc: "Recomendado · Rápido" },
  { id: "gemini-2.5-pro", label: "Pro 2.5", desc: "Mais preciso · Lento" },
  { id: "gemini-2.0-flash", label: "Flash 2.0", desc: "Estável · Econômico" },
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
- type "multiple" somente se houver 2+ seleções de JOGOS DIFERENTES com odds individuais visíveis. Caso contrário use "simple".
- "Criar Aposta", "Bet Builder", "Aposta Especial" ou múltiplas seleções do MESMO jogo → sempre type "simple", selections = []
- Para simples: selections = []. Use a odd combinada visível no topo do ticket para o campo "odds"
- stake: apenas o número decimal sem R$ (ex: 15.00)
- odds: odd decimal (ex: 1.53). Se a odd não estiver visível diretamente, calcule: ganhos_potenciais ÷ stake (ex: R$22,95 ÷ R$15 = 1.53). "Ganhos Potenciais" e "Retorno Potencial" são a mesma coisa.
- Para múltiplas reais (jogos diferentes): inclua cada seleção com sua odd individual. Se a odd individual não estiver visível, use null.
- date: formato YYYY-MM-DD. Procure a data de COLOCAÇÃO da aposta (não a data do evento). Se não visível, use null.
- bookmaker: use exatamente um destes nomes se reconhecer — Bet365, Betano, Sportingbet, Novibet, Betnacional, Pinnacle, Betfair, KTO. Se for outra casa, use o nome que aparece na imagem.
- description: para "simple", descreva resumidamente a(s) seleção(ões) (ex: "Osasuna vs Atlético de Madrid — Mais de 2.5 Escanteios 1T + Almada 1+ Chute + Atlético +3 Handicap")
- Se um campo não for identificável com segurança, use null`;

function AIInsights({ stats, marketSeg, bookSeg, sportSeg, bets, apiKey, onApiKeyChange }) {
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draftKey, setDraftKey] = useState(apiKey);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
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
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("API key not valid") || msg.includes("invalid API key")) setError("API Key inválida. Verifique sua chave no Google AI Studio.");
      else if (msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) setError("Limite de requisições atingido. Aguarde alguns minutos e tente novamente.");
      else if (msg.includes("timeout")) setError("Tempo esgotado. Verifique sua conexão e tente novamente.");
      else setError("Erro ao gerar análise: " + msg);
    }
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
            <div style={{ flex: 1, minWidth: 200, position: "relative", display: "flex" }}>
              <input type={showApiKey ? "text" : "password"} value={draftKey} onChange={e => setDraftKey(e.target.value)} onKeyDown={e => e.key === "Enter" && saveKey()} placeholder="AIzaSy..." className="input" style={{ flex: 1, paddingRight: 40 }} autoComplete="new-password" />
              <button type="button" onClick={() => setShowApiKey(v => !v)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4, display: "flex" }}>
                {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
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
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const view = pathname.replace(/^\//, "") || "dashboard";
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
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [userDisplayName, setUserDisplayName] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [editingBet, setEditingBet] = useState(null);
  const [historyFilter, setHistoryFilter] = useState({ result: "all", search: "", bookmaker: "all", sport: "all", sortBy: "date_desc" });
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [formError, setFormError] = useState("");
  const [shareToast, setShareToast] = useState("");
  const [subscription, setSubscription] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [onboardStep, setOnboardStep] = useState(0);
  const [onboardBanca, setOnboardBanca] = useState("1000");
  const onboardingChecked = useRef(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminUser, setAdminUser] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMsg, setAdminMsg] = useState("");
  const imageInputRef = useRef(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const [milestoneToast, setMilestoneToast] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [calendarDate, setCalendarDate] = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() }; });
  const [calendarDay, setCalendarDay] = useState(null);
  const [sharingBetId, setSharingBetId] = useState(null);
  const [sharingStats, setSharingStats] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [tipsterUID] = useState(() => new URLSearchParams(window.location.search).get("tipster"));
  const [tipsterProfile, setTipsterProfile] = useState(null);

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
    if (!user) { setBets([]); setConfig({ initialBankroll: 1000, monthlyGoal: 0 }); setGeminiKey(""); setSubscription(null); setIsAdmin(false); setLoaded(false); return; }
    setSyncError("");
    const readyFlags = { doc: false, bets: false };
    const markReady = () => { if (readyFlags.doc && readyFlags.bets) setLoaded(true); };
    let migrating = false;

    const unsubDoc = onSnapshot(doc(db, "users", user.uid), async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setConfig(data.config || { initialBankroll: 1000, monthlyGoal: 0 });
        setGeminiKey(data.geminiKey || "");
        setSubscription(data.subscription || { status: "free" });
        setIsAdmin(data.isAdmin === true);
        if (data.bets?.length > 0 && !data.betsMigrated && !migrating) {
          migrating = true;
          try {
            const chunks = [];
            for (let i = 0; i < data.bets.length; i += 400) chunks.push(data.bets.slice(i, i + 400));
            for (const chunk of chunks) {
              const batch = writeBatch(db);
              chunk.forEach(bet => batch.set(doc(collection(db, "users", user.uid, "bets"), String(bet.id)), bet));
              await batch.commit();
            }
            await setDoc(doc(db, "users", user.uid), { bets: [], betsMigrated: true }, { merge: true });
          } catch (e) { console.error("Migration error:", e); }
          migrating = false;
        }
      }
      readyFlags.doc = true; markReady();
    }, err => { setSyncError("Erro: " + err.message); readyFlags.doc = true; markReady(); });

    const unsubBets = onSnapshot(collection(db, "users", user.uid, "bets"), snap => {
      setBets(snap.docs.map(d => d.data()));
      readyFlags.bets = true; markReady();
    }, err => { console.error("Bets snapshot error:", err); readyFlags.bets = true; markReady(); });

    return () => { unsubDoc(); unsubBets(); };
  }, [user]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!tipsterUID) return;
    getDoc(doc(db, "publicProfiles", tipsterUID))
      .then(snap => { if (snap.exists()) setTipsterProfile(snap.data()); })
      .catch(() => {});
  }, [tipsterUID]);

  const saveConfig = useCallback(async (newConfig) => {
    setConfig(newConfig);
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid), { config: newConfig }, { merge: true });
      setSyncError("");
    } catch (err) { setSyncError("Erro ao salvar configuração."); }
  }, [user]);

  const updateBetResult = useCallback(async (betId, result) => {
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid, "bets", String(betId)), { result }, { merge: true });
      const label = result === "win" ? "✅ Green registrado!" : result === "loss" ? "❌ Red registrado" : result === "void" ? "Aposta anulada" : "Resultado atualizado";
      setShareToast(label); setTimeout(() => setShareToast(""), 3000);
    }
    catch (err) { setSyncError("Erro ao salvar resultado."); }
  }, [user]);

  const deleteBet = useCallback(async (betId) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "bets", String(betId)));
      setDeletingId(null);
      setShareToast("Aposta excluída"); setTimeout(() => setShareToast(""), 3000);
    }
    catch (err) { setSyncError("Erro ao excluir aposta."); }
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

  const syncPublicProfile = useCallback(async (enabled) => {
    if (!user) return;
    const ref = doc(db, "publicProfiles", user.uid);
    if (!enabled) { try { await deleteDoc(ref); } catch (_) {} return; }
    const settled = bets.filter(b => b.result !== "pending");
    try {
      await setDoc(ref, {
        uid: user.uid,
        displayName: userDisplayName || user.email?.split("@")[0] || "Anônimo",
        roi: stats.roi, yield: stats.yield, winRate: stats.winRate,
        totalBets: bets.length, settledBets: settled.length,
        totalPL: stats.totalPL, wins: stats.wins, losses: stats.losses,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      setSyncError("Perfil público requer atualização das regras do Firestore.");
    }
  }, [user, bets, stats, userDisplayName]);

  const fetchLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "publicProfiles"), orderBy("roi", "desc"), limit(25)));
      setLeaderboard(snap.docs.map(d => d.data()));
    } catch (_) { setLeaderboard([]); }
    finally { setLeaderboardLoading(false); }
  }, []);

  const handleLogout = async () => {
    setIsRegistering(false);
    setEmail(""); setPassword(""); setNome("");
    setAuthError(""); setAuthInProgress(false);
    setForgotPasswordSent(false);
    await signOut(auth);
  };

  const handleGoogleLogin = async () => {
    setAuthInProgress(true);
    setAuthError("");
    const timer = setTimeout(() => {
      setAuthInProgress(false);
      setAuthError("Tempo esgotado. Verifique se popups estão permitidos neste site e tente novamente.");
    }, 15000);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthInProgress(false);
      if (err.code === "auth/popup-blocked") {
        setAuthError("Popup bloqueado pelo navegador. Autorize popups para este site e tente novamente.");
      } else if (err.code !== "auth/popup-closed-by-user") {
        setAuthError("Erro ao fazer login com Google: " + err.message);
      }
    } finally {
      clearTimeout(timer);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) { setAuthError("Digite seu e-mail acima para recuperar a senha."); return; }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setForgotPasswordSent(true);
      setAuthError("");
    } catch (err) {
      if (err.code === "auth/user-not-found") setAuthError("Nenhuma conta encontrada com este e-mail.");
      else setAuthError("Erro ao enviar email de recuperação: " + err.message);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthError("");
    if (isRegistering && password.length < 6) {
      setAuthError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
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

  useEffect(() => {
    if (!loaded || onboardingChecked.current) return;
    onboardingChecked.current = true;
    if (config.onboardingCompleted) return;
    if (bets.length > 0) { saveConfig({ ...config, onboardingCompleted: true }); return; }
    setOnboardBanca(String(config.initialBankroll || "1000"));
    setOnboardStep(1);
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    const settled = bets.some(b => b.result !== "pending");
    if (!settled) return;
    const MILESTONES = [10, 25, 50, 100, 200];
    const shown = config.shownMilestones || [];
    const next = MILESTONES.find(m => stats.roi >= m && !shown.includes(m));
    if (next) {
      setMilestoneToast(next);
      saveConfig({ ...config, shownMilestones: [...shown, next] });
    }
  }, [stats.roi, loaded]);

  useEffect(() => {
    if (loaded && config.publicProfile && user) syncPublicProfile(true);
  }, [stats.roi, stats.totalBets, loaded]);

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

  const monthlyData = useMemo(() => {
    const months = {};
    bets.filter(b => b.result !== "pending" && b.date).forEach(bet => {
      const m = bet.date.slice(0, 7);
      if (!months[m]) months[m] = { month: m, pl: 0, stake: 0 };
      months[m].pl += getBetPL(bet);
      months[m].stake += bet.stake;
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month)).slice(-12).map(m => ({
      ...m,
      label: new Date(m.month + "-15").toLocaleString("pt-BR", { month: "short" }).replace(".", "") + "/" + m.month.slice(2, 4),
    }));
  }, [bets]);

  const currentStreak = useMemo(() => {
    const settled = bets.filter(b => b.result === "win" || b.result === "loss").sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    if (!settled.length) return null;
    const type = settled[0].result;
    let count = 0;
    for (const b of settled) { if (b.result === type) count++; else break; }
    return { type, count };
  }, [bets]);

  const pendingExposure = useMemo(() => bets.filter(b => b.result === "pending").reduce((s, b) => s + (b.stake || 0), 0), [bets]);

  const formEV = useMemo(() => {
    const p = parseFloat(form.prob) / 100;
    const o = parseFloat(form.odds);
    if (!p || !o || p <= 0 || p >= 1 || o <= 1) return null;
    const ev = p * (o - 1) - (1 - p);
    return { ev, pct: (ev * 100).toFixed(2), positive: ev > 0 };
  }, [form.prob, form.odds]);

  const thisMonthPL = useMemo(() => {
    const m = new Date().toISOString().slice(0, 7);
    return monthlyData.find(d => d.month === m)?.pl ?? null;
  }, [monthlyData]);

  const calendarDays = useMemo(() => {
    const { year, month } = calendarDate;
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = Array(firstWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, date: dateStr, bets: bets.filter(b => b.date === dateStr) });
    }
    return cells;
  }, [bets, calendarDate]);

  if (tipsterUID && tipsterProfile && tipsterUID !== user?.uid) return (
    <div style={{ display: "flex", width: "100%", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: 20, flexDirection: "column", gap: 20 }}>
      <div className="card animate-fade-in" style={{ maxWidth: 480, width: "100%", padding: "40px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), var(--primary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {(tipsterProfile.displayName?.[0] || "?").toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{tipsterProfile.displayName}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}><Globe size={11} /> Perfil público · Banca Lógica</div>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: 20 }}>
          {[{ label: "ROI", v: fmtPct(tipsterProfile.roi), color: tipsterProfile.roi >= 0 ? "var(--primary)" : "var(--danger)" },
            { label: "YIELD", v: fmtPct(tipsterProfile.yield), color: tipsterProfile.yield >= 0 ? "var(--primary)" : "var(--danger)" },
            { label: "TAXA DE ACERTO", v: `${tipsterProfile.winRate?.toFixed(1)}%`, color: "var(--text)" },
            { label: "P&L TOTAL", v: `${tipsterProfile.totalPL >= 0 ? "+" : ""}R$${Math.round(tipsterProfile.totalPL)}`, color: tipsterProfile.totalPL >= 0 ? "var(--primary)" : "var(--danger)" },
          ].map(k => (
            <div key={k.label} style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-mono)", color: k.color }}>{k.v}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 28, textAlign: "center" }}>
          {tipsterProfile.settledBets} apostas liquidadas · {tipsterProfile.wins}W / {tipsterProfile.losses}L
        </div>
        <div style={{ padding: "16px", background: "rgba(0,212,138,0.06)", border: "1px solid rgba(0,212,138,0.2)", borderRadius: 10, textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Gerencie sua banca como um profissional</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>Rastreie seus resultados, analise seu edge e descubra seus padrões com IA.</div>
          <button onClick={() => { window.history.replaceState({}, "", window.location.pathname); window.location.reload(); }} style={{ background: "var(--primary)", color: "#000", border: "none", borderRadius: 8, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>CRIAR CONTA GRÁTIS</button>
        </div>
      </div>
    </div>
  );

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
              <div style={{ position: "relative" }}>
                <input type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} className="input" placeholder="••••••••" style={{ paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4, display: "flex" }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {isRegistering && password.length > 0 && (() => {
                const score = (password.length >= 8 ? 1 : 0) + (/[0-9]/.test(password) ? 1 : 0) + (/[^a-zA-Z0-9]/.test(password) ? 1 : 0);
                const levels = [
                  { label: "Fraca", color: "#ff3d5a", w: "33%" },
                  { label: "Média", color: "#f59e0b", w: "66%" },
                  { label: "Forte", color: "#00d48a", w: "100%" },
                ];
                const lvl = password.length < 6 ? levels[0] : score <= 1 ? levels[1] : score === 2 ? levels[1] : levels[2];
                return (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ height: 3, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: lvl.w, background: lvl.color, borderRadius: 4, transition: "width 0.3s ease, background 0.3s ease" }} />
                    </div>
                    <span style={{ fontSize: 10, color: lvl.color, fontWeight: 600, letterSpacing: 0.5 }}>{lvl.label}</span>
                  </div>
                );
              })()}
            </div>

            {!isRegistering && (
              <div style={{ textAlign: "right", marginTop: -8, marginBottom: 12 }}>
                {forgotPasswordSent
                  ? <span style={{ color: "var(--primary)", fontSize: 12 }}>✓ Email de recuperação enviado!</span>
                  : <button type="button" onClick={handleForgotPassword} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12, cursor: "pointer", padding: 0 }}>Esqueceu a senha?</button>
                }
              </div>
            )}

            {authError && <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 16, background: "rgba(255,61,90,0.1)", padding: 10, borderRadius: 6, lineHeight: 1.5, border: "1px solid rgba(255,61,90,0.3)" }}>{authError}</div>}

            <button type="submit" disabled={authInProgress} style={{ width: "100%", background: "var(--primary)", color: "#000", border: "none", padding: "14px", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: authInProgress ? "not-allowed" : "pointer", opacity: authInProgress ? 0.7 : 1, transition: "opacity 0.2s" }}>
              {authInProgress ? "CARREGANDO..." : (isRegistering ? "CRIAR CONTA" : "ENTRAR")}
            </button>

            <div style={{ textAlign: "center", marginTop: 16, fontSize: 13 }}>
              <span style={{ color: "var(--muted)" }}>{isRegistering ? "Já tem conta?" : "Não tem conta?"} </span>
              <button type="button" onClick={() => { setIsRegistering(!isRegistering); setAuthError(""); setNome(""); setPassword(""); setForgotPasswordSent(false); }} style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 600, cursor: "pointer", padding: 0, textDecoration: "underline" }}>
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



  const compressImage = (file) => new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1600;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) { if (w > h) { h = Math.round(h * MAX / w); w = MAX; } else { w = Math.round(w * MAX / h); h = MAX; } }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      const data = canvas.toDataURL("image/jpeg", 0.92).split(",")[1];
      res({ base64: data, mimeType: "image/jpeg" });
    };
    img.onerror = rej;
    img.src = url;
  });

  const extractFromImage = async (file) => {
    if (!geminiKey) { setExtractError("Configure a API Key do Gemini primeiro em Análise → Inteligência IA."); return; }
    setExtracting(true); setExtractError("");
    try {
      const { base64, mimeType } = await compressImage(file);
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: EXTRACTION_PROMPT }, { inline_data: { mime_type: mimeType, data: base64 } }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 4096 } })
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
      const normalizeBookmaker = (name) => {
        if (!name) return localStorage.getItem("lastBookmaker") || "Betano";
        const lower = name.toLowerCase().trim();
        const exact = BOOKMAKERS.find(b => b.toLowerCase() === lower);
        if (exact) return exact;
        const partial = BOOKMAKERS.find(b => lower.includes(b.toLowerCase()) || b.toLowerCase().includes(lower));
        if (partial) return partial;
        return "Outros";
      };
      const bk = normalizeBookmaker(ex.bookmaker);
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

  const addBet = async () => {
    setFormError("");
    if (form.betType === "simple") {
      if (!form.description.trim()) { setFormError("Descrição é obrigatória."); return; }
      if (!form.odds || parseFloat(form.odds) <= 1) { setFormError("Informe uma odd válida (maior que 1.00)."); return; }
      if (!form.stake || parseFloat(form.stake) <= 0) { setFormError("Informe o valor do stake."); return; }
      if (parseFloat(form.stake) > stats.currentBankroll * 5) { setFormError(`Stake não pode ser maior que 5× sua banca (${fmt(stats.currentBankroll * 5)}). Verifique o valor.`); return; }
    } else {
      const valid = form.selections.filter(s => s.description && s.odds && parseFloat(s.odds) > 0);
      if (valid.length < 2) { setFormError("Preencha ao menos 2 seleções com descrição e odds."); return; }
      if (!form.stake || parseFloat(form.stake) <= 0) { setFormError("Informe o valor do stake."); return; }
      if (parseFloat(form.stake) > stats.currentBankroll * 5) { setFormError(`Stake não pode ser maior que 5× sua banca (${fmt(stats.currentBankroll * 5)}). Verifique o valor.`); return; }
    }
    const data = buildBetData();
    if (!data) return;
    try {
      if (editingBet) {
        await setDoc(doc(db, "users", user.uid, "bets", String(editingBet.id)), { ...data, id: editingBet.id });
      } else {
        const id = crypto.randomUUID();
        await setDoc(doc(db, "users", user.uid, "bets", id), { ...data, id });
      }
      localStorage.setItem("lastBookmaker", form.bookmaker);
      const dest = editingBet ? "/history" : "/dashboard";
      const msg = editingBet ? "Aposta atualizada! ✅" : "Aposta registrada! ✅";
      setEditingBet(null);
      setForm(defaultForm());
      setFormError("");
      setShareToast(msg); setTimeout(() => setShareToast(""), 3000);
      navigate(dest);
    } catch (err) { setSyncError("Erro ao salvar aposta: " + err.message); }
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
    navigate("/register");
  };

  const pending = bets.filter(b => b.result === "pending");
  const hasSettled = bets.some(b => b.result !== "pending");
  const isPremium = subscription?.status === "active";
  const betLimitReached = !isPremium && bets.length >= FREE_BET_LIMIT;


  const shareBet = async (bet) => {
    const pl = getBetPL(bet);
    const lines = [
      `🎯 *Banca Lógica* — ${bet.bookmaker}`,
      `📅 ${bet.date}`,
      `⚽ ${bet.description}`,
      `📊 @${bet.odds?.toFixed(2)} | ${fmt(bet.stake)}`,
      bet.result === "win" ? `✅ Green: +${fmt(pl)}` : bet.result === "loss" ? `❌ Red: -${fmt(Math.abs(pl))}` : `⏳ Pendente`,
    ];
    const text = lines.join("\n");
    if (navigator.share) {
      try { await navigator.share({ text }); } catch (_) {}
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedId(bet.id); setTimeout(() => setCopiedId(null), 2000);
      } catch (_) {}
    }
    setShareToast("Copiado para a área de transferência!");
    setTimeout(() => setShareToast(""), 3000);
  };

  const exportCSV = () => {
    const headers = ["Data","Tipo","Descrição","Casa","Esporte","Mercado","Odds","Stake","Resultado","P&L","CLV","Notas"];
    const rows = filteredBets.map(b => {
      const pl = getBetPL(b); const clv = getCLV(b);
      return [b.date, b.type === "multiple" ? `Múltipla(${b.selections?.length}x)` : "Simples",
        `"${(b.description||"").replace(/"/g,'""')}"`, b.bookmaker, b.sport||"", b.market||"",
        b.odds, b.stake, b.result, pl.toFixed(2), clv!=null?clv.toFixed(2):"",
        `"${(b.notes||"").replace(/"/g,'""')}"`].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `banca-logica-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const filteredBets = [...bets]
    .filter(b => historyFilter.result === "all" || b.result === historyFilter.result)
    .filter(b => historyFilter.bookmaker === "all" || b.bookmaker === historyFilter.bookmaker)
    .filter(b => historyFilter.sport === "all" || b.sport === historyFilter.sport || b.selections?.some(s => s.sport === historyFilter.sport))
    .filter(b => {
      if (!historyFilter.search) return true;
      const q = historyFilter.search.toLowerCase();
      return b.description?.toLowerCase().includes(q) || b.bookmaker?.toLowerCase().includes(q) ||
        b.date?.includes(q) || b.sport?.toLowerCase().includes(q) || b.market?.toLowerCase().includes(q) ||
        b.selections?.some(s => s.description?.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      switch (historyFilter.sortBy) {
        case "date_asc": return (a.date||"").localeCompare(b.date||"");
        case "pl_desc": return getBetPL(b) - getBetPL(a);
        case "pl_asc": return getBetPL(a) - getBetPL(b);
        case "odds_desc": return (b.odds||0) - (a.odds||0);
        case "stake_desc": return (b.stake||0) - (a.stake||0);
        default: return (b.date||"").localeCompare(a.date||"");
      }
    });

  const NAV = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "register", icon: Plus, label: "Registrar" },
    { id: "history", icon: List, label: "Histórico" },
    { id: "analyze", icon: BarChart2, label: "Análise" },
    { id: "kelly", icon: Calculator, label: "Kelly" },
    ...(isAdmin ? [{ id: "admin", icon: Shield, label: "Admin" }] : []),
  ];

  const adminLookup = async () => {
    if (!adminSearch.trim()) return;
    setAdminLoading(true); setAdminMsg(""); setAdminUser(null);
    try {
      const fn = httpsCallable(fns, "adminGetUser");
      const res = await fn({ email: adminSearch.trim().toLowerCase() });
      setAdminUser(res.data);
    } catch (err) {
      setAdminMsg("❌ " + (err.message || "Erro ao buscar usuário"));
    } finally { setAdminLoading(false); }
  };

  const adminToggle = async (field, value) => {
    if (!adminUser) return;
    setAdminLoading(true); setAdminMsg("");
    try {
      const fn = httpsCallable(fns, "adminSetRole");
      await fn({ uid: adminUser.uid, [field]: value });
      setAdminUser(u => ({
        ...u,
        ...(field === "isPremium" ? { subscription: { ...u.subscription, status: value ? "active" : "free" } } : {}),
        ...(field === "isAdmin" ? { isAdmin: value } : {}),
      }));
      setAdminMsg("✅ Atualizado com sucesso!");
    } catch (err) {
      setAdminMsg("❌ " + (err.message || "Erro ao atualizar"));
    } finally { setAdminLoading(false); }
  };

  const finishOnboarding = useCallback(() => {
    setOnboardStep(0);
    saveConfig({ ...config, onboardingCompleted: true });
  }, [config, saveConfig]);

  const onboardNext = useCallback(() => {
    if (onboardStep === 1) {
      const val = parseFloat(onboardBanca);
      if (val > 0) saveConfig({ ...config, initialBankroll: val });
      setOnboardStep(2);
    } else if (onboardStep === 2) {
      setOnboardStep(3);
    } else {
      finishOnboarding();
    }
  }, [onboardStep, onboardBanca, config, saveConfig, finishOnboarding]);

  const VALID_ROUTES = ["dashboard", "register", "history", "analyze", "kelly", "admin"];
  useEffect(() => {
    if (!loaded) return;
    if (view === "admin" && !isAdmin) { navigate("/dashboard", { replace: true }); return; }
    if (!VALID_ROUTES.includes(view)) { navigate("/dashboard", { replace: true }); }
  }, [view, isAdmin, loaded]);

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
          <button key={id} className={`nav-btn ${view === id ? "active" : ""}`} onClick={() => navigate("/" + id)}>
            <div style={{ position: "relative" }}>
              <Icon size={20} />
              {id === "dashboard" && pending.length > 0 && (
                <span style={{ position: "absolute", top: -5, right: -8, background: "var(--accent)", color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: "50%", minWidth: 15, height: 15, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", padding: "0 3px", lineHeight: 1 }}>
                  {pending.length > 9 ? "9+" : pending.length}
                </span>
              )}
            </div>
            <span className="nav-label">{label}</span>
          </button>
        ))}
        {!isPremium && (
          <button className="sidebar-only" onClick={() => setShowUpgrade(true)} style={{ margin: "0 12px 12px", padding: "10px 14px", background: "linear-gradient(135deg,rgba(245,158,11,0.12),rgba(249,115,22,0.08))", border: "1px solid rgba(245,158,11,0.35)", borderRadius: 10, cursor: "pointer", textAlign: "left", alignItems: "center", gap: 10, transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.borderColor = "#f59e0b"} onMouseOut={e => e.currentTarget.style.borderColor = "rgba(245,158,11,0.35)"}>
            <Crown size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", letterSpacing: 0.5 }}>UPGRADE PARA PRO</div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>{bets.length}/{FREE_BET_LIMIT} apostas usadas</div>
            </div>
          </button>
        )}
        {isPremium && (
          <div className="sidebar-only" style={{ margin: "0 12px 12px", padding: "8px 14px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, alignItems: "center", gap: 8 }}>
            <Crown size={14} color="#f59e0b" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>PLANO PRO ATIVO</span>
          </div>
        )}
        <div className="sidebar-user">
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), var(--primary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {(userDisplayName[0] || "?").toUpperCase()}
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 6 }}>
              {userDisplayName.split(" ")[0] || "Usuário"}{isPremium && <ProBadge />}
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BalanceDisplay
              value={stats.currentBankroll}
              onChange={v => { const nc = { ...config, initialBankroll: v - stats.totalPL }; saveConfig(nc); }}
            />
            <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} title="Alternar tema" style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", padding: 8, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" }}>
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={handleLogout} title="Sair da Conta" style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", padding: 8, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" }} onMouseOver={e => { e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.borderColor = "var(--danger)"; }} onMouseOut={e => { e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {syncError && (
          <div style={{ background: "rgba(255, 61, 90, 0.1)", borderBottom: "1px solid rgba(255, 61, 90, 0.3)", color: "var(--danger)", padding: "12px 20px", fontSize: 13, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
            <Info size={16} /> {syncError}
            <button onClick={() => setSyncError("")} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--danger)", cursor: "pointer", padding: 4, display: "flex" }}><X size={14} /></button>
          </div>
        )}

        {/* DESKTOP HEADER INFO */}
        <div className="main-content">
          <div className="desktop-header-info" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: "var(--text)" }}>{NAV.find(n => n.id === view)?.label ?? (view === "admin" ? "Admin" : "")}</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <BalanceDisplay value={stats.currentBankroll} onChange={v => { const nc = { ...config, initialBankroll: v - stats.totalPL }; saveConfig(nc); }} />
              <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} title="Alternar tema" style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", padding: 8, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" }}>
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button onClick={handleLogout} title="Sair da Conta" style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", padding: 8, borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" }} onMouseOver={e => { e.currentTarget.style.color = "var(--danger)"; e.currentTarget.style.borderColor = "var(--danger)"; }} onMouseOut={e => { e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
                <LogOut size={16} />
              </button>
            </div>
          </div>

          <div className="animate-fade-in">
            {/* 15-BETS UPGRADE BANNER */}
            {!isPremium && bets.length >= 15 && bets.length < FREE_BET_LIMIT && !config.dismissed15Banner && (
              <div className="animate-fade-in" style={{ display: "flex", alignItems: "center", gap: 12, background: "linear-gradient(135deg,rgba(245,158,11,0.1),rgba(249,115,22,0.06))", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, padding: "14px 18px", marginBottom: 20, flexWrap: "wrap" }}>
                <span style={{ fontSize: 20 }}>🔥</span>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Você já tem {bets.length} apostas registradas!</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Desbloqueie apostas ilimitadas, CSV, cards e análise IA com o plano PRO.</div>
                </div>
                <button onClick={() => setShowUpgrade(true)} style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)", color: "#000", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>VER PLANO PRO</button>
                <button onClick={() => saveConfig({ ...config, dismissed15Banner: true })} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4, display: "flex", flexShrink: 0 }}><X size={16} /></button>
              </div>
            )}

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
                  { label: "P&L TOTAL", val: `${stats.totalPL >= 0 ? "+" : ""}${fmt(Math.abs(stats.totalPL))}`, color: stats.totalPL >= 0 ? "g" : "r", tip: "Profit & Loss. O seu resultado financeiro bruto em Reais." }].map(k => (
                  <div key={k.label} className="card" style={{ padding: "16px" }}>
                    <span className="kpi-label" style={{ fontSize: 9, display: 'flex', alignItems: 'center', gap: '4px' }}>{k.label} {k.tip && <InfoTooltip text={k.tip} />}</span>
                    <div className={`kpi-value ${k.color}`} style={{ fontSize: 20 }}>{k.val}</div>
                  </div>
                ))}
              </div>
              
              {/* ONBOARDING */}
              {bets.length === 0 && !config.onboardingDone && (
                <div className="card animate-fade-in" style={{ marginBottom: 24, borderColor: "rgba(139,127,245,0.3)", background: "linear-gradient(180deg,rgba(139,127,245,0.06) 0%,transparent 100%)" }}>
                  <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>🎯</div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, color: "var(--text)" }}>Bem-vindo à Banca Lógica!</h2>
                    <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7 }}>Configure em 3 passos e comece a gerir sua banca como um profissional.</p>
                  </div>
                  <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                    {[{ e: "💰", t: "1. Defina sua banca", d: "Toque no saldo no canto superior para ajustar o valor inicial.", a: null },
                      { e: "📝", t: "2. Registre apostas", d: "Manualmente ou importe por foto do cupom com IA.", a: () => navigate("/register") },
                      { e: "🤖", t: "3. Ative a IA", d: "Configure o Gemini para análises automáticas de performance.", a: () => navigate("/analyze") }].map((s, i) => (
                      <div key={i} onClick={s.a || undefined} style={{ flex: "1 1 160px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 12px", textAlign: "center", cursor: s.a ? "pointer" : "default", transition: "border-color 0.2s" }}
                        onMouseOver={e => s.a && (e.currentTarget.style.borderColor = "rgba(139,127,245,0.5)")}
                        onMouseOut={e => s.a && (e.currentTarget.style.borderColor = "var(--border)")}>
                        <div style={{ fontSize: 22, marginBottom: 6 }}>{s.e}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{s.t}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>{s.d}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => saveConfig({ ...config, onboardingDone: true })} style={{ width: "100%", background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", borderRadius: 8, padding: 10, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>PULAR INTRODUÇÃO</button>
                </div>
              )}

              {/* STREAK + EXPOSIÇÃO */}
              {currentStreak && currentStreak.count >= 2 && (
                <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 10, display: "flex", alignItems: "center", gap: 10, background: currentStreak.type === "win" ? "rgba(0,212,138,0.08)" : "rgba(255,61,90,0.08)", border: `1px solid ${currentStreak.type === "win" ? "rgba(0,212,138,0.25)" : "rgba(255,61,90,0.25)"}` }}>
                  {currentStreak.type === "win" ? <TrendingUp size={16} color="var(--primary)" /> : <TrendingDown size={16} color="var(--danger)" />}
                  <span style={{ fontSize: 13, fontWeight: 600, color: currentStreak.type === "win" ? "var(--primary)" : "var(--danger)" }}>
                    {currentStreak.count} {currentStreak.type === "win" ? "vitórias" : "derrotas"} consecutivas
                  </span>
                </div>
              )}
              {pendingExposure > 0 && (
                <div style={{ marginBottom: 24, padding: "10px 16px", borderRadius: 10, display: "flex", alignItems: "center", gap: 8, background: "rgba(139,127,245,0.06)", border: "1px solid rgba(139,127,245,0.15)" }}>
                  <Target size={14} color="var(--accent)" />
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>
                    <strong style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}>{fmt(pendingExposure)}</strong> em risco · {pending.length} aposta{pending.length > 1 ? "s" : ""} pendente{pending.length > 1 ? "s" : ""}
                  </span>
                </div>
              )}

              {/* META DO MÊS */}
              {config.monthlyGoal > 0 && thisMonthPL !== null && (
                <div className="card" style={{ marginBottom: 24, padding: "18px 24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span className="section-title" style={{ margin: 0 }}>META DO MÊS</span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--font-mono)", color: thisMonthPL >= 0 ? "var(--primary)" : "var(--danger)" }}>{thisMonthPL >= 0 ? "+" : ""}{fmt(thisMonthPL)}</span>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>/ {fmt(config.monthlyGoal)}</span>
                      <button onClick={() => saveConfig({ ...config, monthlyGoal: 0 })} title="Remover meta" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 2, display: "flex" }}><X size={12}/></button>
                    </div>
                  </div>
                  <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 3, background: thisMonthPL < 0 ? "var(--danger)" : thisMonthPL >= config.monthlyGoal ? "var(--primary)" : "var(--accent)", width: `${Math.min(Math.max((thisMonthPL / config.monthlyGoal) * 100, 0), 100)}%`, transition: "width 0.5s ease" }} />
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11, color: "var(--muted)" }}>
                    {thisMonthPL >= config.monthlyGoal ? "🎯 Meta atingida este mês!" : `${((thisMonthPL / config.monthlyGoal) * 100).toFixed(1)}% da meta`}
                  </div>
                </div>
              )}
              {!config.monthlyGoal && hasSettled && (
                <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="number" placeholder="Definir meta mensal (R$)..." className="input" style={{ flex: 1, padding: "10px 14px", fontSize: 13 }}
                    onKeyDown={e => { if (e.key === "Enter" && parseFloat(e.target.value) > 0) { saveConfig({ ...config, monthlyGoal: parseFloat(e.target.value) }); e.target.value = ""; }}} />
                  <span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>+ Meta mensal</span>
                </div>
              )}

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
              
              {/* GRÁFICO MENSAL P&L */}
              {monthlyData.length > 1 && (
                <div className="card" style={{ marginBottom: 24, padding: "24px 20px" }}>
                  <span className="section-title">P&L POR MÊS</span>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "var(--font-mono)" }} tickFormatter={v => `R$${v}`} axisLine={false} tickLine={false} />
                      <ReferenceLine y={0} stroke="var(--border)" />
                      <Tooltip contentStyle={{ background: "rgba(10,10,16,0.9)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, fontFamily: "var(--font-mono)" }} formatter={v => [fmt(v), "P&L"]} labelStyle={{ color: "var(--muted)" }} />
                      <Bar dataKey="pl" radius={[4, 4, 0, 0]}>
                        {monthlyData.map((entry, i) => <Cell key={i} fill={entry.pl >= 0 ? "var(--primary)" : "var(--danger)"} fillOpacity={0.8} />)}
                      </Bar>
                    </BarChart>
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
                          <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{fmt(bet.stake)}</div>
                          <div style={{ fontSize: 11, color: "var(--primary)", fontFamily: "var(--font-mono)", marginTop: 2 }}>ret: {fmt(bet.stake * bet.odds)}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 12 }}>
                        <button className="outline-btn g" onClick={() => updateBetResult(bet.id, "win")}>GANHOU</button>
                        <button className="outline-btn r" onClick={() => updateBetResult(bet.id, "loss")}>PERDEU</button>
                        <button className="outline-btn muted" onClick={() => updateBetResult(bet.id, "void")}>VOID</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {hasSettled && (
                <div className="card" style={{ marginBottom: 24, padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <span className="section-title" style={{ margin: 0, marginBottom: 4, display: "block" }}>COMPARTILHAR BANCA</span>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>Gera um card de performance com seus resultados</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <button onClick={isPremium ? async () => { setSharingStats(true); const c = await generateStatsCard(stats, userDisplayName); await shareAsImage(c, "minha-banca.png"); setSharingStats(false); } : () => setShowUpgrade(true)} disabled={sharingStats} style={{ display: "flex", alignItems: "center", gap: 7, background: sharingStats ? "var(--border)" : isPremium ? "rgba(0,212,138,0.1)" : "rgba(245,158,11,0.08)", color: sharingStats ? "var(--muted)" : isPremium ? "var(--primary)" : "#f59e0b", border: `1px solid ${isPremium ? "rgba(0,212,138,0.3)" : "rgba(245,158,11,0.35)"}`, borderRadius: 8, padding: "9px 16px", fontSize: 12, fontWeight: 700, cursor: sharingStats ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
                        {sharingStats ? <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> GERANDO...</> : isPremium ? <><ImageDown size={13} /> BAIXAR CARD</> : <><Lock size={13} /> BAIXAR CARD <ProBadge /></>}
                      </button>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: isPremium && config.publicProfile ? "rgba(139,127,245,0.1)" : "rgba(0,0,0,0.2)", border: `1px solid ${isPremium && config.publicProfile ? "rgba(139,127,245,0.4)" : "var(--border)"}`, borderRadius: 8, cursor: "pointer", transition: "all 0.2s" }}
                        onClick={() => { if (!isPremium) { setShowUpgrade(true); return; } const np = !config.publicProfile; saveConfig({ ...config, publicProfile: np }); syncPublicProfile(np); }}>
                        {isPremium ? <Globe size={13} color={config.publicProfile ? "var(--accent)" : "var(--muted)"} /> : <Lock size={13} color="var(--muted)" />}
                        <span style={{ fontSize: 12, fontWeight: 600, color: isPremium && config.publicProfile ? "var(--accent)" : "var(--muted)" }}>
                          {isPremium ? (config.publicProfile ? "Perfil público ✓" : "Tornar público") : "Tornar público"}{!isPremium && <> <ProBadge /></>}
                        </span>
                      </div>
                    </div>
                  </div>
                  {config.publicProfile && (
                    <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(139,127,245,0.06)", borderRadius: 8, fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Globe size={12} color="var(--accent)" />
                      <span>Seu perfil aparece no ranking da comunidade. Link: </span>
                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: 11 }}>
                        {window.location.origin}?tipster={user?.uid}
                      </span>
                      <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?tipster=${user?.uid}`); }} style={{ background: "transparent", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "rgba(139,127,245,0.1)"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>COPIAR LINK</button>
                    </div>
                  )}
                </div>
              )}

              {bets.length === 0 && (
                <div className="empty-state">
                  <div style={{ fontSize: 48, marginBottom: 16, color: "var(--border)" }}><LayoutDashboard size={48} /></div>
                  <div style={{ fontSize: 16, marginBottom: 24, fontWeight: 500 }}>Nenhuma aposta registrada ainda.</div>
                  <button className="btn" style={{ width: "auto", padding: "12px 32px" }} onClick={() => navigate("/register")}>REGISTRAR PRIMEIRA APOSTA</button>
                </div>
              )}
            </>}

            {/* REGISTRAR */}
            {view === "register" && betLimitReached && !editingBet && (
              <div className="card animate-fade-in" style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", padding: "52px 32px", borderColor: "rgba(245,158,11,0.35)", background: "linear-gradient(180deg,rgba(245,158,11,0.06) 0%,var(--surface) 60%)" }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>🔒</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>Limite de {FREE_BET_LIMIT} apostas atingido</div>
                <div style={{ color: "var(--muted)", marginBottom: 28, lineHeight: 1.7, fontSize: 14 }}>
                  Você registrou <strong style={{ color: "var(--text)" }}>{bets.length} apostas</strong> no plano gratuito.<br />
                  Faça upgrade para apostas ilimitadas e muito mais.
                </div>
                <button onClick={() => setShowUpgrade(true)} style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)", color: "#000", border: "none", padding: "16px 40px", borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: "pointer", marginBottom: 16 }}>
                  <Crown size={16} style={{ display: "inline", marginRight: 8, verticalAlign: "middle" }} />VER PLANO PRO
                </button>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>ou <button onClick={() => navigate("/history")} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", padding: 0, fontSize: 12 }}>ver histórico de apostas</button></div>
              </div>
            )}
            {view === "register" && (!betLimitReached || editingBet) && <div className="card" style={{ maxWidth: 800, margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span className="section-title" style={{ margin: 0 }}>{editingBet ? "EDITAR APOSTA" : `NOVA APOSTA ${!isPremium ? `(${bets.length}/${FREE_BET_LIMIT})` : ""}`}</span>
                {editingBet && (
                  <button onClick={() => { setEditingBet(null); setForm(defaultForm()); setExtractError(""); navigate("/history"); }} style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", borderRadius: 8, padding: "8px 16px", fontSize: 12, cursor: "pointer", fontWeight: 600, fontFamily: "var(--font-sans)" }}>CANCELAR</button>
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
                <>
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
                    {form.stake && parseFloat(form.stake) > stats.currentBankroll * 0.2 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12, color: "#f59e0b" }}>
                        <AlertTriangle size={13} />
                        {parseFloat(form.stake) > stats.currentBankroll
                          ? `Stake maior que sua banca atual (${fmt(stats.currentBankroll)}).`
                          : `Stake representa ${((parseFloat(form.stake) / stats.currentBankroll) * 100).toFixed(0)}% da banca — acima de 20%.`}
                      </div>
                    )}
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
                  <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                    <span className="form-label">NOTAS — opcional</span>
                    <input type="text" placeholder="Raciocínio da aposta, contexto..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="input" />
                  </div>
                </div>
                {form.odds && form.stake && parseFloat(form.odds) > 1 && parseFloat(form.stake) > 0 && (
                  <div style={{ marginTop: 4, marginBottom: 8, padding: "10px 14px", background: "rgba(0,212,138,0.06)", borderRadius: 8, border: "1px solid rgba(0,212,138,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>Retorno potencial</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--primary)", fontFamily: "var(--font-mono)" }}>{fmt(parseFloat(form.stake) * parseFloat(form.odds))}</span>
                  </div>
                )}
                <div className="grid-2" style={{ marginBottom: 0 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <span className="form-label">PROB. ESTIMADA (%) — EV</span>
                    <input type="number" placeholder="ex: 58 → calcula seu EV" step="1" min="1" max="99" value={form.prob} onChange={e => setForm(p => ({ ...p, prob: e.target.value }))} className="input" />
                  </div>
                  {formEV && (
                    <div className="form-group" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                      <div style={{ width: "100%", padding: "16px", borderRadius: 10, background: formEV.positive ? "rgba(0,212,138,0.08)" : "rgba(255,61,90,0.08)", border: `1px solid ${formEV.positive ? "rgba(0,212,138,0.3)" : "rgba(255,61,90,0.3)"}` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "var(--muted)", marginBottom: 4 }}>EXPECTED VALUE</div>
                        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-mono)", color: formEV.positive ? "var(--primary)" : "var(--danger)" }}>{formEV.positive ? "+" : ""}{formEV.pct}%</div>
                      </div>
                    </div>
                  )}
                </div>
                </>
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
                    <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                      <span className="form-label">NOTAS — opcional</span>
                      <input type="text" placeholder="Raciocínio da aposta, contexto..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="input" />
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

              {formError && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--danger)", fontSize: 13, background: "rgba(255,61,90,0.08)", border: "1px solid rgba(255,61,90,0.3)", borderRadius: 8, padding: "10px 14px", marginTop: 8 }}>
                  <AlertTriangle size={15} /> {formError}
                </div>
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
              <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[["all","TODOS"],["pending","PENDENTES"],["win","GANHOU"],["loss","PERDEU"],["void","VOID"]].map(([val, label]) => (
                    <button key={val} onClick={() => setHistoryFilter(f => ({ ...f, result: val }))} style={{ background: historyFilter.result === val ? "var(--primary)" : "rgba(0,0,0,0.2)", color: historyFilter.result === val ? "#000" : "var(--muted)", border: `1px solid ${historyFilter.result === val ? "var(--primary)" : "var(--border)"}`, borderRadius: 20, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)", transition: "all 0.2s ease" }}>{label}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <select value={historyFilter.bookmaker} onChange={e => setHistoryFilter(f => ({ ...f, bookmaker: e.target.value }))} className="select" style={{ flex: "1 1 140px", padding: "10px 14px", fontSize: 12 }}>
                    <option value="all">Todas as casas</option>
                    {BOOKMAKERS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <select value={historyFilter.sport} onChange={e => setHistoryFilter(f => ({ ...f, sport: e.target.value }))} className="select" style={{ flex: "1 1 130px", padding: "10px 14px", fontSize: 12 }}>
                    <option value="all">Todos esportes</option>
                    {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={historyFilter.sortBy} onChange={e => setHistoryFilter(f => ({ ...f, sortBy: e.target.value }))} className="select" style={{ flex: "1 1 160px", padding: "10px 14px", fontSize: 12 }}>
                    <option value="date_desc">Mais recentes</option>
                    <option value="date_asc">Mais antigas</option>
                    <option value="pl_desc">Maior lucro</option>
                    <option value="pl_asc">Maior perda</option>
                    <option value="odds_desc">Maiores odds</option>
                    <option value="stake_desc">Maior stake</option>
                  </select>
                  {filteredBets.length > 0 && (
                    <button onClick={isPremium ? exportCSV : () => setShowUpgrade(true)} title={isPremium ? "Exportar CSV" : "CSV disponível no plano Pro"} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid var(--border)", color: isPremium ? "var(--muted)" : "var(--muted)", borderRadius: 10, padding: "10px 14px", fontSize: 12, cursor: "pointer", fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap", opacity: isPremium ? 1 : 0.75 }}
                      onMouseOver={e => { e.currentTarget.style.color = isPremium ? "var(--primary)" : "#f59e0b"; e.currentTarget.style.borderColor = isPremium ? "var(--primary)" : "#f59e0b"; }}
                      onMouseOut={e => { e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
                      {isPremium ? <Download size={13} /> : <Lock size={13} />} CSV {!isPremium && <ProBadge />}
                    </button>
                  )}
                </div>
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
                  <input type="text" placeholder="Buscar por descrição, casa, esporte, data..." value={historyFilter.search} onChange={e => setHistoryFilter(f => ({ ...f, search: e.target.value }))} className="input" style={{ paddingLeft: 38, paddingTop: 12, paddingBottom: 12, fontSize: 13 }} />
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
                          {bet.result === "pending" && <span className="bet-stat" style={{ color: "var(--muted)" }}>Ret: {fmt(bet.stake * bet.odds)}</span>}
                          {clv != null && <span className="bet-stat" style={{ color: clv >= 0 ? "var(--primary)" : "var(--danger)", fontWeight: 700 }}>CLV: {clv >= 0 ? "+" : ""}{clv.toFixed(1)}%</span>}
                        </div>
                        {bet.notes && <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)", fontStyle: "italic", borderTop: "1px solid var(--border)", paddingTop: 8 }}>"{bet.notes}"</div>}
                      </div>
                      <div style={{ display: "flex", gap: 2, flexShrink: 0, alignItems: "flex-start" }}>
                        {deletingId !== bet.id && (
                          <button onClick={() => shareBet(bet)} title={copiedId === bet.id ? "Copiado!" : "Compartilhar (texto)"} style={{ background: "transparent", border: "none", color: copiedId === bet.id ? "var(--primary)" : "var(--muted)", cursor: "pointer", padding: 8, borderRadius: 4, display: "flex", transition: "color 0.2s" }} onMouseOver={e => { if (copiedId !== bet.id) e.currentTarget.style.color = "var(--primary)"; }} onMouseOut={e => { if (copiedId !== bet.id) e.currentTarget.style.color = "var(--muted)"; }}>
                            {copiedId === bet.id ? <Check size={15} /> : <Share2 size={15} />}
                          </button>
                        )}
                        {deletingId !== bet.id && (
                          <button onClick={isPremium ? async () => { setSharingBetId(null); setSharingBetId(bet.id); try { const timeout = new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 10000)); const c = await Promise.race([generateBetCard(bet), timeout]); await shareAsImage(c, `aposta-${bet.date}.png`); setShareToast("Card gerado! ✓"); } catch(_e) { setShareToast("Não foi possível gerar o card."); } finally { setSharingBetId(null); setTimeout(() => setShareToast(""), 4000); } } : () => setShowUpgrade(true)} title={isPremium ? "Salvar como imagem" : "Card de imagem — plano Pro"} style={{ background: "transparent", border: "none", color: sharingBetId === bet.id ? "var(--accent)" : "var(--muted)", cursor: "pointer", padding: 8, borderRadius: 4, display: "flex", transition: "color 0.2s" }} onMouseOver={e => { if (sharingBetId !== bet.id) e.currentTarget.style.color = isPremium ? "var(--accent)" : "#f59e0b"; }} onMouseOut={e => { if (sharingBetId !== bet.id) e.currentTarget.style.color = "var(--muted)"; }}>
                            {sharingBetId === bet.id ? <RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> : isPremium ? <ImageDown size={15} /> : <Lock size={15} />}
                          </button>
                        )}
                        {deletingId !== bet.id && (
                          <button onClick={() => startEdit(bet)} title="Editar aposta" style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 8, borderRadius: 4, display: "flex" }} onMouseOver={e => e.currentTarget.style.color = "var(--accent)"} onMouseOut={e => e.currentTarget.style.color = "var(--muted)"}><Edit2 size={15} /></button>
                        )}
                        {deletingId === bet.id ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                            <button onClick={() => deleteBet(bet.id)} style={{ fontSize: 11, background: "rgba(255,61,90,0.15)", color: "var(--danger)", border: "1px solid rgba(255,61,90,0.35)", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}>EXCLUIR</button>
                            <button onClick={() => setDeletingId(null)} style={{ fontSize: 11, background: "transparent", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 12px", cursor: "pointer", whiteSpace: "nowrap" }}>CANCELAR</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeletingId(bet.id)} title="Excluir aposta" style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 8, borderRadius: 4, display: "flex" }} onMouseOver={e => e.currentTarget.style.color = "var(--danger)"} onMouseOut={e => e.currentTarget.style.color = "var(--muted)"}><X size={18} /></button>
                        )}
                      </div>
                    </div>
                    {bet.result === "pending" && (
                      <div style={{ display: "flex", gap: 10, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                        <button className="outline-btn g" onClick={() => updateBetResult(bet.id, "win")}>GANHOU</button>
                        <button className="outline-btn r" onClick={() => updateBetResult(bet.id, "loss")}>PERDEU</button>
                        <button className="outline-btn muted" onClick={() => updateBetResult(bet.id, "void")}>VOID</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>}

            {/* ANÁLISE */}
            {view === "analyze" && <div style={{ maxWidth: 1000, margin: "0 auto" }}>
              <span className="section-title" style={{ marginBottom: 24 }}>ANÁLISE DE PERFORMANCE</span>
              <>
                <div style={{ display: "flex", gap: 12, marginBottom: 24, overflowX: "auto", paddingBottom: 8 }}>
                  {tabBtn("ia", "Inteligência IA")}
                  {hasSettled && tabBtn("market", "Mercados")}
                  {hasSettled && tabBtn("bookmaker", "Casas de Aposta")}
                  {hasSettled && tabBtn("sport", "Esportes")}
                  {tabBtn("calendar", "Calendário")}
                  {tabBtn("community", "Comunidade")}
                </div>
                {analyzeTab === "ia" && <AIInsights stats={stats} marketSeg={marketSeg} bookSeg={bookSeg} sportSeg={sportSeg} bets={bets} apiKey={geminiKey} onApiKeyChange={saveGeminiKey} />}
                {(analyzeTab === "market" || analyzeTab === "bookmaker" || analyzeTab === "sport") && !hasSettled && (
                  <div className="empty-state">
                    <BarChart2 size={48} style={{ marginBottom: 16, color: "var(--border)", margin: "0 auto" }} />
                    <div style={{ fontSize: 16, fontWeight: 500 }}>Registre apostas liquidadas para ver os gráficos de performance.</div>
                  </div>
                )}
                {analyzeTab === "market" && hasSettled && <><HighlightCards data={marketSeg} bestLabel="MELHOR MERCADO" worstLabel="PIOR MERCADO" /><SegmentTable title="PERFORMANCE POR MERCADO" data={marketSeg} /></>}
                {analyzeTab === "bookmaker" && hasSettled && <><HighlightCards data={bookSeg} bestLabel="MELHOR CASA" worstLabel="PIOR CASA" /><SegmentTable title="PERFORMANCE POR CASA DE APOSTA" data={bookSeg} /></>}
                {analyzeTab === "sport" && hasSettled && <><HighlightCards data={sportSeg} bestLabel="MELHOR ESPORTE" worstLabel="PIOR ESPORTE" /><SegmentTable title="PERFORMANCE POR ESPORTE" data={sportSeg} /></>}
                  {analyzeTab === "calendar" && (
                    <div className="card">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                        <button onClick={() => setCalendarDate(d => { const p = new Date(d.year, d.month - 1, 1); return { year: p.getFullYear(), month: p.getMonth() }; })} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 8, display: "flex", borderRadius: 6, transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color = "var(--text)"} onMouseOut={e => e.currentTarget.style.color = "var(--muted)"}>
                          <ChevronLeft size={20} />
                        </button>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", textTransform: "capitalize" }}>
                          {new Date(calendarDate.year, calendarDate.month, 15).toLocaleString("pt-BR", { month: "long", year: "numeric" })}
                        </span>
                        <button onClick={() => setCalendarDate(d => { const n = new Date(d.year, d.month + 1, 1); return { year: n.getFullYear(), month: n.getMonth() }; })} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 8, display: "flex", borderRadius: 6, transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color = "var(--text)"} onMouseOut={e => e.currentTarget.style.color = "var(--muted)"}>
                          <ChevronRight size={20} />
                        </button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
                        {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d => (
                          <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "var(--muted)", padding: "6px 0", letterSpacing: 1 }}>{d}</div>
                        ))}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                        {calendarDays.map((cell, i) => {
                          if (!cell) return <div key={i} />;
                          const hasBets = cell.bets.length > 0;
                          const hasWin = cell.bets.some(b => b.result === "win");
                          const hasLoss = cell.bets.some(b => b.result === "loss");
                          const hasPending = cell.bets.some(b => b.result === "pending");
                          const dotColor = hasWin && !hasLoss ? "var(--primary)" : hasLoss && !hasWin ? "var(--danger)" : hasPending ? "var(--accent)" : hasBets ? "var(--muted)" : "transparent";
                          const isSelected = calendarDay === cell.date;
                          return (
                            <div key={i} onClick={() => setCalendarDay(isSelected ? null : cell.date)}
                              style={{ textAlign: "center", padding: "8px 2px", borderRadius: 8, cursor: hasBets ? "pointer" : "default", background: isSelected ? "rgba(0,212,138,0.12)" : hasBets ? "rgba(255,255,255,0.04)" : "transparent", border: `1px solid ${isSelected ? "rgba(0,212,138,0.5)" : hasBets ? "var(--border)" : "transparent"}`, transition: "all 0.15s" }}>
                              <div style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: hasBets ? "var(--text)" : "var(--muted)", marginBottom: 4 }}>{cell.day}</div>
                              {hasBets && <div style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, margin: "0 auto" }} />}
                            </div>
                          );
                        })}
                      </div>
                      {calendarDay && (() => {
                        const dayBets = bets.filter(b => b.date === calendarDay);
                        if (!dayBets.length) return null;
                        const dayPL = dayBets.filter(b => b.result !== "pending").reduce((s, b) => s + getBetPL(b), 0);
                        return (
                          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: 2, textTransform: "uppercase" }}><CalendarDays size={12} style={{ marginRight: 6, verticalAlign: "middle" }} />{calendarDay}</span>
                              <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-mono)", color: dayPL >= 0 ? "var(--primary)" : "var(--danger)" }}>{dayPL >= 0 ? "+" : ""}{fmt(dayPL)}</span>
                            </div>
                            {dayBets.map(b => {
                              const [rl, rc] = RESULT_MAP[b.result] || ["?","muted"];
                              return (
                                <div key={b.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ marginBottom: 3 }}>
                                      <span className={`badge ${rc}`}>{rl}</span>
                                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{b.description}</span>
                                    </div>
                                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{b.bookmaker} · @{b.odds?.toFixed(2)} · {fmt(b.stake)}</div>
                                  </div>
                                  <div style={{ fontSize: 13, fontFamily: "var(--font-mono)", fontWeight: 700, color: getBetPL(b) >= 0 ? "var(--primary)" : "var(--danger)", flexShrink: 0 }}>
                                    {b.result === "pending" ? "⏳" : `${getBetPL(b) >= 0 ? "+" : ""}${fmt(Math.abs(getBetPL(b)))}`}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {analyzeTab === "community" && (
                    <div>
                      <div className="card" style={{ marginBottom: 20, padding: "20px 24px", background: config.publicProfile ? "rgba(139,127,245,0.06)" : "rgba(0,0,0,0.2)", borderColor: config.publicProfile ? "rgba(139,127,245,0.3)" : "var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                              <Globe size={14} color={config.publicProfile ? "var(--accent)" : "var(--muted)"} /> Perfil público de tipster
                            </div>
                            <div style={{ fontSize: 12, color: "var(--muted)" }}>{config.publicProfile ? "Seu perfil aparece no ranking abaixo." : "Ative para aparecer no ranking da comunidade."}</div>
                          </div>
                          <button onClick={() => { const np = !config.publicProfile; saveConfig({ ...config, publicProfile: np }); syncPublicProfile(np); }} style={{ display: "flex", alignItems: "center", gap: 8, background: config.publicProfile ? "rgba(139,127,245,0.2)" : "rgba(0,0,0,0.3)", color: config.publicProfile ? "var(--accent)" : "var(--muted)", border: `1px solid ${config.publicProfile ? "rgba(139,127,245,0.5)" : "var(--border)"}`, borderRadius: 8, padding: "9px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }}>
                            <Users size={14} /> {config.publicProfile ? "VISÍVEL NO RANKING" : "ENTRAR NO RANKING"}
                          </button>
                        </div>
                      </div>

                      <div className="card" style={{ padding: "20px 24px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                          <span className="section-title" style={{ margin: 0 }}>RANKING DE TIPSTERS</span>
                          <button onClick={fetchLeaderboard} disabled={leaderboardLoading} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", borderRadius: 6, padding: "7px 12px", fontSize: 11, cursor: leaderboardLoading ? "not-allowed" : "pointer", fontWeight: 600, transition: "all 0.2s" }}>
                            <RefreshCw size={12} style={leaderboardLoading ? { animation: "spin 1s linear infinite" } : {}} /> ATUALIZAR
                          </button>
                        </div>
                        {leaderboard.length === 0 && !leaderboardLoading && (
                          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
                            <Users size={36} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
                            <div style={{ fontSize: 13, marginBottom: 8 }}>Clique em Atualizar para carregar o ranking.</div>
                            <div style={{ fontSize: 12, opacity: 0.7 }}>Tipsters com perfil público aparecem aqui ordenados por ROI.</div>
                          </div>
                        )}
                        {leaderboard.length > 0 && (
                          <div style={{ overflowX: "auto" }}>
                            <table className="data-table">
                              <thead><tr>
                                {["#", "TIPSTER", "ROI", "YIELD", "ACERTO", "AP"].map(h => (
                                  <th key={h} style={{ textAlign: h === "TIPSTER" || h === "#" ? "left" : "right" }}>{h}</th>
                                ))}
                              </tr></thead>
                              <tbody>
                                {leaderboard.map((p, i) => (
                                  <tr key={p.uid}>
                                    <td style={{ color: i < 3 ? ["#ffd700","#c0c0c0","#cd7f32"][i] : "var(--muted)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>{i + 1}</td>
                                    <td>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), var(--primary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                                          {(p.displayName?.[0] || "?").toUpperCase()}
                                        </div>
                                        <span style={{ fontWeight: 600, color: "var(--text)" }}>{p.displayName || "Anônimo"}</span>
                                        {p.uid === user?.uid && <span className="badge acc" style={{ fontSize: 9, padding: "2px 6px" }}>VOCÊ</span>}
                                      </div>
                                    </td>
                                    <td style={{ textAlign: "right", color: p.roi >= 0 ? "var(--primary)" : "var(--danger)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>{fmtPct(p.roi)}</td>
                                    <td style={{ textAlign: "right", color: p.yield >= 0 ? "var(--primary)" : "var(--danger)", fontFamily: "var(--font-mono)" }}>{fmtPct(p.yield)}</td>
                                    <td style={{ textAlign: "right", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{p.winRate?.toFixed(1)}%</td>
                                    <td style={{ textAlign: "right", color: "var(--muted)" }}>{p.settledBets}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
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
                        <span className="kpi-label" style={{ color: "var(--primary)" }}>STAKE RECOMENDADO</span>
                        <div style={{ fontSize: 40, fontWeight: 700, color: "var(--primary)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>{fmt(kellyResult.amount)}</div>
                        <div style={{ fontSize: 14, color: "var(--text)", marginBottom: 16, fontWeight: 500 }}>{kellyResult.fraction.toFixed(2)}% do bankroll</div>
                        <div style={{ padding: "12px 16px", background: "rgba(0,0,0,0.3)", borderRadius: 8, fontSize: 12, color: "var(--muted)", lineHeight: 1.6, borderLeft: "3px solid var(--accent)" }}>
                          <strong style={{ color: "var(--text)" }}>Dica Profissional:</strong> A fórmula Kelly completa é altamente agressiva e propensa a alta variância. É padrão na indústria utilizar o <strong>Meio-Kelly ({fmt(kellyResult.amount / 2)})</strong> ou até <strong>Quarto-Kelly ({fmt(kellyResult.amount / 4)})</strong> para proteger seu bankroll contra sequências de perdas.
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

            {/* ADMIN PANEL */}
            {view === "admin" && isAdmin && <div style={{ maxWidth: 600, margin: "0 auto" }}>
              <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <Shield size={20} color="#f59e0b" />
                  <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Painel de Administração</span>
                </div>
                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <input
                    value={adminSearch}
                    onChange={e => setAdminSearch(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && adminLookup()}
                    placeholder="Email do usuário..."
                    style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", color: "var(--text)", fontSize: 14, fontFamily: "var(--font-sans)" }}
                  />
                  <button onClick={adminLookup} disabled={adminLoading} className="btn" style={{ width: "auto", padding: "10px 20px" }}>
                    {adminLoading ? <RefreshCw size={16} className="spin" /> : <Search size={16} />}
                  </button>
                </div>
                {adminMsg && <div style={{ fontSize: 13, color: adminMsg.startsWith("✅") ? "var(--primary)" : "var(--danger)", marginBottom: 12 }}>{adminMsg}</div>}
                {adminUser && (
                  <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: 16, border: "1px solid var(--border)" }}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{adminUser.displayName || adminUser.email}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>{adminUser.email}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>uid: {adminUser.uid}</div>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button
                        onClick={() => adminToggle("isPremium", adminUser.subscription?.status !== "active")}
                        disabled={adminLoading}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1px solid", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", transition: "all 0.2s",
                          background: adminUser.subscription?.status === "active" ? "rgba(245,158,11,0.15)" : "rgba(0,0,0,0.2)",
                          borderColor: adminUser.subscription?.status === "active" ? "#f59e0b" : "var(--border)",
                          color: adminUser.subscription?.status === "active" ? "#f59e0b" : "var(--muted)" }}>
                        {adminUser.subscription?.status === "active" ? <><UserX size={14} /> Remover PRO</> : <><UserCheck size={14} /> Ativar PRO</>}
                      </button>
                      <button
                        onClick={() => adminToggle("isAdmin", !adminUser.isAdmin)}
                        disabled={adminLoading}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1px solid", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", transition: "all 0.2s",
                          background: adminUser.isAdmin ? "rgba(99,102,241,0.15)" : "rgba(0,0,0,0.2)",
                          borderColor: adminUser.isAdmin ? "#6366f1" : "var(--border)",
                          color: adminUser.isAdmin ? "#6366f1" : "var(--muted)" }}>
                        <Shield size={14} />
                        {adminUser.isAdmin ? "Remover Admin" : "Tornar Admin"}
                      </button>
                    </div>
                    <div style={{ marginTop: 12, fontSize: 12, color: "var(--muted)", display: "flex", gap: 16 }}>
                      <span>Status: <strong style={{ color: adminUser.subscription?.status === "active" ? "#f59e0b" : "var(--muted)" }}>{adminUser.subscription?.status === "active" ? "PRO" : "Free"}</strong></span>
                      <span>Admin: <strong style={{ color: adminUser.isAdmin ? "#6366f1" : "var(--muted)" }}>{adminUser.isAdmin ? "Sim" : "Não"}</strong></span>
                    </div>
                  </div>
                )}
              </div>
            </div>}

          </div>
        </div>
      </div>

      {onboardStep > 0 && (
        <OnboardingModal
          step={onboardStep}
          banca={onboardBanca}
          onBancaChange={setOnboardBanca}
          onNext={onboardNext}
          onClose={finishOnboarding}
          onGoRegister={() => { finishOnboarding(); navigate("/register"); }}
          onGoAnalyze={() => { finishOnboarding(); navigate("/analyze"); }}
        />
      )}
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} user={user} />}

      {shareToast && (
        <div className="animate-fade-in" style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.85)", color: "#fff", padding: "10px 20px", borderRadius: 24, fontSize: 13, fontWeight: 600, zIndex: 2000, whiteSpace: "nowrap", border: "1px solid rgba(255,255,255,0.1)" }}>
          {shareToast}
        </div>
      )}

      {milestoneToast && (
        <div className="animate-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onClick={() => setMilestoneToast(null)}>
          <div style={{ background: "var(--bg-secondary)", border: "1px solid rgba(0,212,138,0.4)", borderRadius: 20, padding: "40px 32px", textAlign: "center", maxWidth: 340, width: "100%", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🏆</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--primary)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>+{milestoneToast}% ROI</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Marco atingido!</div>
            <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7, marginBottom: 24 }}>Você atingiu um ROI de <strong style={{ color: "var(--primary)" }}>{milestoneToast}%</strong>. Consistência e edge positivo são a chave do sucesso a longo prazo.</div>
            <button onClick={() => setMilestoneToast(null)} style={{ background: "var(--primary)", color: "#000", border: "none", borderRadius: 10, padding: "12px 32px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-sans)", transition: "all 0.2s ease" }}>CONTINUAR</button>
          </div>
        </div>
      )}
    </div>
  );
}
