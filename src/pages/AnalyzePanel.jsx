import { useState, useMemo, useCallback, useEffect } from "react";
import { BarChart2, Download, RefreshCw, CalendarDays, ChevronLeft, ChevronRight, Crown, Globe, Users, Zap, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { db } from "../firebase";
import { getDocs, query, collection, orderBy, limit } from "firebase/firestore";
import { fmt, fmtPct } from "../utils/formatting";
import { getBetPL, buildSegments } from "../utils/bets";
import { RESULT_MAP } from "../constants/bets";
import { AIInsights } from "../components/AIInsights";
import { HighlightCards } from "../components/HighlightCards";
import { SegmentTable } from "../components/SegmentTable";
import { ScenarioSimulator } from "../components/ScenarioSimulator";
import { RuinCalculator } from "../components/RuinCalculator";

export function AnalyzePanel({
  bets, stats, monthlyData,
  marketSeg, bookSeg, sportSeg,
  geminiKey, saveGeminiKey,
  config, saveConfig,
  syncPublicProfile,
  isPremium, user, userDisplayName,
  setShowUpgrade,
}) {
  const [analyzeTab, setAnalyzeTab] = useState("ia");
  const [calendarDate, setCalendarDate] = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() }; });
  const [calendarDay, setCalendarDay] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // ── Avantz Performance ─────────────────────────────────────────────────
  const [avantzPerf, setAvantzPerf] = useState(null);
  const [avantzPerfLoading, setAvantzPerfLoading] = useState(false);
  const [avantzWindow, setAvantzWindow] = useState("30d");

  useEffect(() => {
    if (analyzeTab !== "avantz") return;
    const CACHE_KEY = `avantz_perf_${avantzWindow}`;
    const TTL = 5 * 60 * 1000;
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < TTL) { setAvantzPerf(data); return; }
      }
    } catch (_) {}
    setAvantzPerfLoading(true);
    setAvantzPerf(null);
    fetch(`https://valtrix-engine.zehvistuba.workers.dev/api/picks/performance?window=${avantzWindow}`, {
      headers: { "x-api-key": "valtrix-pub-2025" },
    })
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setAvantzPerf(d);
          try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: d, ts: Date.now() })); } catch (_) {}
        }
      })
      .catch(() => {})
      .finally(() => setAvantzPerfLoading(false));
  }, [analyzeTab, avantzWindow]);

  const hasSettled = bets.some(b => b.result !== "pending");

  const weekdaySeg = useMemo(() => {
    const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const map = DAYS.map(d => ({ name: d, bets: 0, wins: 0, losses: 0, stake: 0, pl: 0 }));
    bets.forEach(bet => {
      if (bet.result === "pending" || !bet.date) return;
      const idx = new Date(bet.date + "T12:00:00").getDay();
      const pl = getBetPL(bet);
      map[idx].bets++;
      map[idx].stake += bet.stake;
      map[idx].pl += pl;
      if (bet.result === "win") map[idx].wins++;
      if (bet.result === "loss") map[idx].losses++;
    });
    return map.filter(d => d.bets > 0).map(d => ({ ...d, yield: d.stake > 0 ? d.pl / d.stake * 100 : 0 }));
  }, [bets]);

  const sourceSeg = useMemo(() => buildSegments(bets, "source"), [bets]);

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

  const fetchLeaderboard = useCallback(async (forceRefresh = false) => {
    const CACHE_KEY = "leaderboard_cache";
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

    if (!forceRefresh) {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, ts } = JSON.parse(cached);
          if (Date.now() - ts < CACHE_TTL) { setLeaderboard(data); return; }
        }
      } catch (_) {}
    }

    setLeaderboardLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "publicProfiles"), orderBy("roi", "desc"), limit(100)));
      const filtered = snap.docs
        .map(d => d.data())
        .filter(p => (p.settledBets || 0) >= 30)
        .slice(0, 25);
      setLeaderboard(filtered);
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: filtered, ts: Date.now() })); } catch (_) {}
    } catch (_) { setLeaderboard([]); }
    finally { setLeaderboardLoading(false); }
  }, []);

  const exportPDF = useCallback(async () => {
    const { jsPDF } = await import("jspdf");
    const pdfDoc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210, M = 16;
    let y = 0;

    pdfDoc.setFillColor(0, 212, 138);
    pdfDoc.rect(0, 0, W, 14, "F");
    pdfDoc.setFontSize(8);
    pdfDoc.setFont("helvetica", "bold");
    pdfDoc.setTextColor(0, 0, 0);
    pdfDoc.text("BANCA LÓGICA", M, 9);
    pdfDoc.setFont("helvetica", "normal");
    pdfDoc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, W - M, 9, { align: "right" });

    y = 24;
    pdfDoc.setTextColor(20, 20, 30);
    pdfDoc.setFontSize(13);
    pdfDoc.setFont("helvetica", "bold");
    pdfDoc.text("RELATÓRIO DE PERFORMANCE", M, y);
    y += 3;
    pdfDoc.setDrawColor(0, 212, 138);
    pdfDoc.setLineWidth(0.5);
    pdfDoc.line(M, y, W - M, y);
    y += 9;

    const kpis = [
      { label: "RET. BANCA", val: `${stats.roi >= 0 ? "+" : ""}${stats.roi.toFixed(2)}%`, pos: stats.roi >= 0 },
      { label: "ROI/YIELD", val: `${stats.yield >= 0 ? "+" : ""}${stats.yield.toFixed(2)}%`, pos: stats.yield >= 0 },
      { label: "TAXA DE ACERTO", val: `${stats.winRate.toFixed(1)}%`, pos: true },
      { label: "APOSTAS / V / D", val: `${stats.totalBets} / ${stats.wins} / ${stats.losses}`, pos: true },
      { label: "P&L TOTAL", val: `${stats.totalPL >= 0 ? "+" : ""}R$${Math.round(stats.totalPL)}`, pos: stats.totalPL >= 0 },
      { label: "BANCA ATUAL", val: `R$${Math.round(stats.currentBankroll)}`, pos: true },
    ];
    const colW = (W - 2 * M) / 3;
    kpis.forEach(({ label, val, pos }, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const bx = M + col * colW, by = y + row * 20;
      pdfDoc.setFillColor(242, 242, 248);
      pdfDoc.roundedRect(bx, by, colW - 4, 17, 2, 2, "F");
      pdfDoc.setFontSize(6);
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.setTextColor(130, 130, 145);
      pdfDoc.text(label, bx + 4, by + 5.5);
      pdfDoc.setFontSize(11);
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.setTextColor(...(pos ? [0, 150, 90] : [190, 50, 65]));
      pdfDoc.text(val, bx + 4, by + 13);
    });
    y += 2 * 20 + 6;

    if (monthlyData.length > 0) {
      pdfDoc.setFontSize(9);
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.setTextColor(20, 20, 30);
      pdfDoc.text("P&L MENSAL", M, y);
      y += 5;
      const chartH = 38, chartW = W - 2 * M;
      const maxAbs = Math.max(...monthlyData.map(m => Math.abs(m.pl)), 1);
      const barSpacing = chartW / monthlyData.length;
      const barW = Math.min(barSpacing - 2, 14);
      const baseline = y + chartH / 2;
      pdfDoc.setDrawColor(200, 200, 210);
      pdfDoc.setLineWidth(0.3);
      pdfDoc.line(M, baseline, M + chartW, baseline);
      monthlyData.forEach((m, i) => {
        const bx = M + i * barSpacing + (barSpacing - barW) / 2;
        const h = Math.max((Math.abs(m.pl) / maxAbs) * (chartH / 2 - 3), 0.5);
        if (m.pl >= 0) { pdfDoc.setFillColor(0, 180, 100); pdfDoc.rect(bx, baseline - h, barW, h, "F"); }
        else { pdfDoc.setFillColor(210, 50, 70); pdfDoc.rect(bx, baseline, barW, h, "F"); }
        pdfDoc.setFontSize(5);
        pdfDoc.setTextColor(110, 110, 125);
        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.text(m.label, bx + barW / 2, y + chartH + 4, { align: "center" });
      });
      y += chartH + 12;
    }

    if (y > 220) { pdfDoc.addPage(); y = 20; }
    pdfDoc.setFontSize(9);
    pdfDoc.setFont("helvetica", "bold");
    pdfDoc.setTextColor(20, 20, 30);
    pdfDoc.text("HISTÓRICO DE APOSTAS", M, y);
    y += 5;

    const headers = ["DATA", "EVENTO", "ODDS", "STAKE", "P&L"];
    const cw = [22, 72, 16, 24, 22];
    const rowH = 6.5;
    pdfDoc.setFillColor(0, 212, 138);
    pdfDoc.rect(M, y, W - 2 * M, rowH, "F");
    pdfDoc.setFontSize(6);
    pdfDoc.setFont("helvetica", "bold");
    pdfDoc.setTextColor(10, 10, 20);
    let cx = M + 2;
    headers.forEach((h, i) => { pdfDoc.text(h, cx, y + 4.3); cx += cw[i]; });
    y += rowH;

    const settled = bets.filter(b => b.result !== "pending").sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 60);
    settled.forEach((bet, idx) => {
      if (y > 275) { pdfDoc.addPage(); y = 20; }
      pdfDoc.setFillColor(idx % 2 === 0 ? 252 : 246, idx % 2 === 0 ? 252 : 246, idx % 2 === 0 ? 254 : 252);
      pdfDoc.rect(M, y, W - 2 * M, rowH, "F");
      const pl = getBetPL(bet);
      const vals = [
        bet.date || "—",
        (bet.event || bet.competition || "—").substring(0, 38),
        bet.odds ? Number(bet.odds).toFixed(2) : "—",
        `R$${Number(bet.stake || 0).toFixed(0)}`,
        `${pl >= 0 ? "+" : ""}R$${Math.round(pl)}`,
      ];
      pdfDoc.setFontSize(6);
      pdfDoc.setFont("helvetica", "normal");
      cx = M + 2;
      vals.forEach((v, i) => {
        pdfDoc.setTextColor(...(i === 4 ? (pl >= 0 ? [0, 140, 80] : [190, 50, 65]) : [40, 40, 55]));
        pdfDoc.text(String(v), cx, y + 4.3);
        cx += cw[i];
      });
      y += rowH;
    });

    const pageCount = pdfDoc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      pdfDoc.setPage(p);
      pdfDoc.setFontSize(6);
      pdfDoc.setFont("helvetica", "normal");
      pdfDoc.setTextColor(160, 160, 175);
      pdfDoc.text("banca-logica.com", W / 2, 292, { align: "center" });
      pdfDoc.text(`Página ${p} de ${pageCount}`, W - M, 292, { align: "right" });
    }

    pdfDoc.save(`banca-logica-${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [bets, stats, monthlyData]);

  const tabBtn = (id, label) => (
    <button key={id} onClick={() => setAnalyzeTab(id)} style={{ flex: 1, background: analyzeTab === id ? "var(--primary)" : "rgba(0,0,0,0.2)", color: analyzeTab === id ? "#000" : "var(--muted)", border: `1px solid ${analyzeTab === id ? "var(--primary)" : "var(--border)"}`, borderRadius: 6, padding: "10px 0", fontSize: 11, cursor: "pointer", fontFamily: "var(--font-sans)", fontWeight: 600, textTransform: "uppercase", transition: "all 0.2s ease", whiteSpace: "nowrap" }}>{label}</button>
  );

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <span className="section-title" style={{ marginBottom: 0 }}>ANÁLISE DE PERFORMANCE</span>
        {isPremium
          ? <button onClick={exportPDF} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <Download size={13} />Exportar PDF
            </button>
          : <button onClick={() => setShowUpgrade(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <Crown size={13} />PDF PRO
            </button>
        }
      </div>
      <>
        <div style={{ display: "flex", gap: 12, marginBottom: 24, overflowX: "auto", paddingBottom: 8 }}>
          {tabBtn("ia", "Inteligência IA")}
          {hasSettled && tabBtn("market", "Mercados")}
          {hasSettled && tabBtn("bookmaker", "Casas de Aposta")}
          {hasSettled && tabBtn("sport", "Esportes")}
          {hasSettled && tabBtn("weekday", "Dias da Semana")}
          {hasSettled && sourceSeg.length > 1 && tabBtn("source", "Fonte/Tipster")}
          {tabBtn("calendar", "Calendário")}
          {tabBtn("community", "Comunidade")}
          {hasSettled && tabBtn("cenarios", isPremium ? "Cenários" : "Cenários 🔒")}
          {tabBtn("risco", "Risco de Ruína")}
          {tabBtn("avantz", "⚡ Avantz")}
        </div>
        {analyzeTab === "ia" && <AIInsights stats={stats} marketSeg={marketSeg} bookSeg={bookSeg} sportSeg={sportSeg} bets={bets} apiKey={geminiKey} onApiKeyChange={saveGeminiKey} />}
        {(analyzeTab === "market" || analyzeTab === "bookmaker" || analyzeTab === "sport" || analyzeTab === "source") && !hasSettled && (
          <div className="empty-state">
            <BarChart2 size={48} style={{ marginBottom: 16, color: "var(--border)", margin: "0 auto" }} />
            <div style={{ fontSize: 16, fontWeight: 500 }}>Registre apostas liquidadas para ver os gráficos de performance.</div>
          </div>
        )}
        {analyzeTab === "market" && hasSettled && <><HighlightCards data={marketSeg} bestLabel="MELHOR MERCADO" worstLabel="PIOR MERCADO" /><SegmentTable title="PERFORMANCE POR MERCADO" data={marketSeg} /></>}
        {analyzeTab === "bookmaker" && hasSettled && <><HighlightCards data={bookSeg} bestLabel="MELHOR CASA" worstLabel="PIOR CASA" /><SegmentTable title="PERFORMANCE POR CASA DE APOSTA" data={bookSeg} /></>}
        {analyzeTab === "sport" && hasSettled && <><HighlightCards data={sportSeg} bestLabel="MELHOR ESPORTE" worstLabel="PIOR ESPORTE" /><SegmentTable title="PERFORMANCE POR ESPORTE" data={sportSeg} /></>}
        {analyzeTab === "weekday" && hasSettled && <><HighlightCards data={weekdaySeg} bestLabel="MELHOR DIA" worstLabel="PIOR DIA" /><SegmentTable title="PERFORMANCE POR DIA DA SEMANA" data={weekdaySeg} /></>}
        {analyzeTab === "source" && hasSettled && <><HighlightCards data={sourceSeg} bestLabel="MELHOR FONTE" worstLabel="PIOR FONTE" /><SegmentTable title="PERFORMANCE POR FONTE / TIPSTER" data={sourceSeg} /></>}
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
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
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
                    const [rl, rc] = RESULT_MAP[b.result] || ["?", "muted"];
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
                <button onClick={() => fetchLeaderboard(true)} disabled={leaderboardLoading} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", borderRadius: 6, padding: "7px 12px", fontSize: 11, cursor: leaderboardLoading ? "not-allowed" : "pointer", fontWeight: 600, transition: "all 0.2s" }}>
                  <RefreshCw size={12} style={leaderboardLoading ? { animation: "spin 1s linear infinite" } : {}} /> ATUALIZAR
                </button>
              </div>
              {leaderboard.length === 0 && !leaderboardLoading && (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
                  <Users size={36} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
                  <div style={{ fontSize: 13, marginBottom: 8 }}>Clique em Atualizar para carregar o ranking.</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Tipsters com perfil público e mínimo de 30 apostas encerradas, ordenados por ROI.</div>
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
                          <td style={{ color: i < 3 ? ["#ffd700", "#c0c0c0", "#cd7f32"][i] : "var(--muted)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>{i + 1}</td>
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
        {analyzeTab === "risco" && <RuinCalculator bets={bets} />}
        {analyzeTab === "cenarios" && (
          isPremium
            ? <ScenarioSimulator bets={bets} initialBankroll={config.initialBankroll} />
            : <div className="card" style={{ textAlign: "center", padding: "48px 32px" }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>🔒</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Simulador de Cenários Kelly</div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24, lineHeight: 1.7 }}>
                  Compare sua performance real com 4 estratégias de gestão de banca.<br />
                  Disponível no Plano PRO.
                </div>
                <button className="btn" onClick={() => setShowUpgrade(true)}>
                  <Crown size={14} style={{ marginRight: 6 }} />VER PLANO PRO
                </button>
              </div>
        )}
        {analyzeTab === "avantz" && <AvantzPerformanceTab perf={avantzPerf} loading={avantzPerfLoading} window={avantzWindow} setWindow={setAvantzWindow} />}
      </>
    </div>
  );
}

// ── Avantz Performance Tab ─────────────────────────────────────────────────────
const SPORT_LABELS = {
  football:   "⚽ Futebol",
  basketball: "🏀 Basquete",
  tennis:     "🎾 Tênis",
  mma:        "🥊 MMA",
  other:      "🏅 Outros",
};

function AvantzPerfKPI({ label, value, sub, color }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 120, padding: "16px 18px" }}>
      <div style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted)", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || "var(--text)", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function AvantzPerformanceTab({ perf, loading, window: win, setWindow }) {
  const s = perf?.summary;

  const winRateColor = s?.winRate == null ? "var(--muted)"
    : s.winRate >= 0.55 ? "#4ade80"
    : s.winRate >= 0.45 ? "#facc15"
    : "#f87171";

  const roiColor = s?.roiPerPick == null ? "var(--muted)"
    : s.roiPerPick > 0 ? "#4ade80"
    : s.roiPerPick > -0.2 ? "#facc15"
    : "#f87171";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <Zap size={16} color="var(--primary)" />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Performance do Sistema Avantz</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            Picks gerados automaticamente — rastreados desde 01/Mai/2026
          </div>
        </div>
        {/* Seletor de janela */}
        <div style={{ display: "flex", gap: 6 }}>
          {["7d", "30d", "90d", "all"].map(w => (
            <button key={w} onClick={() => setWindow(w)} style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
              border: `1px solid ${win === w ? "var(--primary)" : "var(--border)"}`,
              background: win === w ? "var(--primary)" : "transparent",
              color: win === w ? "#000" : "var(--muted)",
              transition: "all 0.15s",
            }}>
              {w === "all" ? "Tudo" : w}
            </button>
          ))}
          <a href="https://valtrix-engine.zehvistuba.workers.dev" target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 6, fontSize: 11, border: "1px solid var(--border)", color: "var(--muted)", textDecoration: "none", transition: "color 0.2s" }}
            onMouseOver={e => e.currentTarget.style.color = "var(--text)"}
            onMouseOut={e => e.currentTarget.style.color = "var(--muted)"}>
            <Globe size={11} /> Avantz ↗
          </a>
        </div>
      </div>

      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <RefreshCw size={20} color="var(--muted)" style={{ animation: "spin 1s linear infinite" }} />
        </div>
      )}

      {!loading && !perf && (
        <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
          <Zap size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div>Não foi possível carregar os dados do Avantz.</div>
        </div>
      )}

      {!loading && perf && s && (
        <>
          {/* KPIs */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <AvantzPerfKPI
              label="Taxa de Acerto"
              value={s.winRate != null ? `${(s.winRate * 100).toFixed(1)}%` : "—"}
              sub={`${s.correct} corretos de ${s.resolved} resolvidos`}
              color={winRateColor}
            />
            <AvantzPerfKPI
              label="ROI/Pick"
              value={s.roiPerPick != null ? `${(s.roiPerPick * 100).toFixed(1)}%` : "—"}
              sub={s.roiTotal != null ? `ROI total: ${(s.roiTotal * 100).toFixed(1)}%` : undefined}
              color={roiColor}
            />
            <AvantzPerfKPI
              label="Picks Gerados"
              value={s.total}
              sub={`${s.pending} pendentes de resultado`}
            />
          </div>

          {/* Breakdown por esporte */}
          {perf.bySport?.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "var(--muted)", textTransform: "uppercase" }}>
                  Performance por Esporte
                </span>
              </div>
              <table className="data-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Esporte</th>
                    <th>Picks</th>
                    <th>Acertos</th>
                    <th>Win Rate</th>
                    <th>ROI/Pick</th>
                  </tr>
                </thead>
                <tbody>
                  {perf.bySport.map(row => {
                    const wr = row.winRate;
                    const roi = row.roiPerPick;
                    const wrColor = wr == null ? "var(--muted)" : wr >= 0.55 ? "#4ade80" : wr >= 0.45 ? "#facc15" : "#f87171";
                    const roiColor = roi == null ? "var(--muted)" : roi > 0 ? "#4ade80" : roi > -0.2 ? "#facc15" : "#f87171";
                    return (
                      <tr key={row.sport}>
                        <td style={{ fontWeight: 600 }}>{SPORT_LABELS[row.sport] || row.sport}</td>
                        <td style={{ textAlign: "center" }}>{row.total}</td>
                        <td style={{ textAlign: "center" }}>{row.correct}</td>
                        <td style={{ textAlign: "center", color: wrColor, fontWeight: 700 }}>
                          {wr != null ? `${(wr * 100).toFixed(1)}%` : "—"}
                        </td>
                        <td style={{ textAlign: "center", color: roiColor, fontWeight: 700 }}>
                          {roi != null ? `${(roi * 100).toFixed(1)}%` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Últimos 10 picks resolvidos */}
          {perf.recent?.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "var(--muted)", textTransform: "uppercase" }}>
                  Últimos Picks Resolvidos
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {perf.recent.map((pick, i) => {
                  const isCorrect = pick.correct === true;
                  const isWrong   = pick.correct === false;
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 20px",
                      borderBottom: i < perf.recent.length - 1 ? "1px solid var(--border)" : "none",
                      background: isCorrect ? "rgba(74,222,128,0.04)" : isWrong ? "rgba(248,113,113,0.04)" : "transparent",
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: isCorrect ? "rgba(74,222,128,0.15)" : isWrong ? "rgba(248,113,113,0.15)" : "rgba(255,255,255,0.05)",
                      }}>
                        {isCorrect ? <TrendingUp size={13} color="#4ade80" /> : isWrong ? <TrendingDown size={13} color="#f87171" /> : <Minus size={13} color="var(--muted)" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {pick.match}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>
                          {SPORT_LABELS[pick.competitionKey?.split("_")[0]] || pick.competitionKey} · {pick.recommendedSide === "home" ? "Casa" : "Fora"} @ {pick.odd?.toFixed(2)}
                          {pick.ev != null && ` · EV ${(pick.ev * 100).toFixed(1)}%`}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: isCorrect ? "#4ade80" : isWrong ? "#f87171" : "var(--muted)" }}>
                          {pick.roi != null ? `${(pick.roi * 100).toFixed(0)}%` : "—"}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--muted)" }}>
                          {pick.resolvedAt ? new Date(pick.resolvedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {s.resolved === 0 && (
            <div className="card" style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>
              <div style={{ fontSize: 13 }}>Nenhum pick resolvido nesta janela de tempo ainda.</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
