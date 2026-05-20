import { useState, useMemo } from "react";
import { List, Search, X, Check, Share2, ImageDown, Edit2, Lock, RefreshCw, Layers, Download } from "lucide-react";
import { RESULT_MAP, SPORTS, BOOKMAKERS } from "../constants/bets";
import { getBetPL, getCLV } from "../utils/bets";
import { fmt } from "../utils/formatting";
import { generateBetCard, shareAsImage } from "../utils/canvas";
import { ProBadge } from "../components/ProBadge";

export function HistoryList({ bets, isPremium, updateBetResult, deleteBet, startEdit, setShowUpgrade, setShareToast }) {
  const [historyFilter, setHistoryFilter] = useState({ result: "all", search: "", bookmaker: "all", sport: "all", sortBy: "date_desc" });
  const [deletingId, setDeletingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [sharingBetId, setSharingBetId] = useState(null);

  const filteredBets = useMemo(() => [...bets]
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
        case "date_asc": return (a.date || "").localeCompare(b.date || "");
        case "pl_desc": return getBetPL(b) - getBetPL(a);
        case "pl_asc": return getBetPL(a) - getBetPL(b);
        case "odds_desc": return (b.odds || 0) - (a.odds || 0);
        case "stake_desc": return (b.stake || 0) - (a.stake || 0);
        default: return (b.date || "").localeCompare(a.date || "");
      }
    }), [bets, historyFilter]);

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
    const headers = ["Data", "Tipo", "Descrição", "Casa", "Esporte", "Mercado", "Odds", "Stake", "Resultado", "P&L", "CLV", "Notas"];
    const rows = filteredBets.map(b => {
      const pl = getBetPL(b); const clv = getCLV(b);
      return [b.date, b.type === "multiple" ? `Múltipla(${b.selections?.length}x)` : "Simples",
        `"${(b.description || "").replace(/"/g, '""')}"`, b.bookmaker, b.sport || "", b.market || "",
        b.odds, b.stake, b.result, pl.toFixed(2), clv != null ? clv.toFixed(2) : "",
        `"${(b.notes || "").replace(/"/g, '""')}"`].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `banca-logica-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span className="section-title" style={{ margin: 0 }}>HISTÓRICO DE APOSTAS</span>
        <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>
          {filteredBets.length}{filteredBets.length !== bets.length ? ` de ${bets.length}` : ""} registros
        </span>
      </div>

      <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[["all", "TODOS"], ["pending", "PENDENTES"], ["win", "GANHOU"], ["loss", "PERDEU"], ["void", "VOID"]].map(([val, label]) => (
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
            <button onClick={isPremium ? exportCSV : () => setShowUpgrade(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", color: isPremium ? "var(--text)" : "var(--muted)", borderRadius: 8, padding: "10px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
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
                  <button onClick={isPremium ? async () => { setSharingBetId(null); setSharingBetId(bet.id); try { const timeout = new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 10000)); const c = await Promise.race([generateBetCard(bet), timeout]); await shareAsImage(c, `aposta-${bet.date}.png`); setShareToast("Card gerado! ✓"); } catch (_e) { setShareToast("Não foi possível gerar o card."); } finally { setSharingBetId(null); setTimeout(() => setShareToast(""), 4000); } } : () => setShowUpgrade(true)} title={isPremium ? "Salvar como imagem" : "Card de imagem — plano Pro"} style={{ background: "transparent", border: "none", color: sharingBetId === bet.id ? "var(--accent)" : "var(--muted)", cursor: "pointer", padding: 8, borderRadius: 4, display: "flex", transition: "color 0.2s" }} onMouseOver={e => { if (sharingBetId !== bet.id) e.currentTarget.style.color = isPremium ? "var(--accent)" : "#f59e0b"; }} onMouseOut={e => { if (sharingBetId !== bet.id) e.currentTarget.style.color = "var(--muted)"; }}>
                    {sharingBetId === bet.id ? <RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> : isPremium ? <ImageDown size={15} /> : <Lock size={15} />}
                  </button>
                )}
                {deletingId !== bet.id && (
                  <button onClick={() => startEdit(bet)} title="Editar aposta" style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 8, borderRadius: 4, display: "flex" }} onMouseOver={e => e.currentTarget.style.color = "var(--accent)"} onMouseOut={e => e.currentTarget.style.color = "var(--muted)"}><Edit2 size={15} /></button>
                )}
                {deletingId === bet.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                    <button onClick={async () => { setDeletingId(null); await deleteBet(bet.id); }} style={{ fontSize: 11, background: "rgba(255,61,90,0.15)", color: "var(--danger)", border: "1px solid rgba(255,61,90,0.35)", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}>EXCLUIR</button>
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
    </div>
  );
}
