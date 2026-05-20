import { useState } from "react";
import { LayoutDashboard, X, Globe, Lock, RefreshCw, ImageDown, Layers, TrendingUp, TrendingDown, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { fmt, fmtPct } from "../utils/formatting";
import { generateStatsCard, shareAsImage } from "../utils/canvas";
import { InfoTooltip } from "../components/InfoTooltip";
import { ProBadge } from "../components/ProBadge";

export function Dashboard({
  stats, bets, config, saveConfig,
  monthlyData, thisMonthPL,
  pending, pendingExposure, currentStreak, hasSettled,
  performanceAlerts, dismissAlert,
  syncPublicProfile, isPremium, user, userDisplayName,
  setShowUpgrade, updateBetResult,
  dashPeriod, setDashPeriod,
}) {
  const navigate = useNavigate();
  const [sharingStats, setSharingStats] = useState(false);

  return (
    <>
      {performanceAlerts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {performanceAlerts.map(alert => (
            <div key={alert.id} className="animate-fade-in" style={{ display: "flex", alignItems: "flex-start", gap: 12, background: alert.color === "danger" ? "rgba(255,61,90,0.07)" : "rgba(245,158,11,0.07)", border: `1px solid ${alert.color === "danger" ? "rgba(255,61,90,0.25)" : "rgba(245,158,11,0.3)"}`, borderRadius: 12, padding: "14px 18px", flexWrap: "wrap" }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>{alert.icon}</span>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{alert.title}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3, lineHeight: 1.6 }}>{alert.msg}</div>
              </div>
              <button onClick={() => dismissAlert(alert.id)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 4, display: "flex", flexShrink: 0 }}><X size={16} /></button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[["7d", "7 dias"], ["30d", "30 dias"], ["90d", "90 dias"], ["all", "Tudo"]].map(([p, label]) => (
          <button key={p} onClick={() => setDashPeriod(p)} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: "1px solid", borderColor: dashPeriod === p ? "var(--primary)" : "var(--border)", background: dashPeriod === p ? "rgba(59,130,246,0.15)" : "transparent", color: dashPeriod === p ? "var(--primary)" : "var(--muted)", cursor: "pointer", transition: "all 0.15s" }}>
            {label}
          </button>
        ))}
      </div>
      <div className="grid-4">
        {[{ label: "RET. BANCA", val: fmtPct(stats.roi), color: stats.roi >= 0 ? "g" : "r", tip: "Retorno sobre a banca inicial. Quanto sua banca cresceu em percentual." },
          { label: "ROI / YIELD", val: fmtPct(stats.yield), color: stats.yield >= 0 ? "g" : "r", tip: "Padrão da indústria. Lucro líquido dividido pelo volume total apostado (stake). Acima de +5% por 100+ apostas é excepcional." },
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
          { label: "P&L TOTAL", val: `${stats.totalPL >= 0 ? "+" : "-"}${fmt(Math.abs(stats.totalPL))}`, color: stats.totalPL >= 0 ? "g" : "r", tip: "Profit & Loss. O seu resultado financeiro bruto em Reais." }].map(k => (
          <div key={k.label} className="card" style={{ padding: "16px" }}>
            <span className="kpi-label" style={{ fontSize: 9, display: 'flex', alignItems: 'center', gap: '4px' }}>{k.label} {k.tip && <InfoTooltip text={k.tip} />}</span>
            <div className={`kpi-value ${k.color}`} style={{ fontSize: 20 }}>{k.val}</div>
          </div>
        ))}
      </div>

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

      {config.monthlyGoal > 0 && thisMonthPL !== null && (
        <div className="card" style={{ marginBottom: 24, padding: "18px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span className="section-title" style={{ margin: 0 }}>META DO MÊS</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--font-mono)", color: thisMonthPL >= 0 ? "var(--primary)" : "var(--danger)" }}>{thisMonthPL >= 0 ? "+" : ""}{fmt(thisMonthPL)}</span>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>/ {fmt(config.monthlyGoal)}</span>
              <button onClick={() => saveConfig({ ...config, monthlyGoal: 0 })} title="Remover meta" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 2, display: "flex" }}><X size={12} /></button>
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

      {stats.drawdownData?.length > 2 && stats.maxDrawdown > 0.5 && (
        <div className="card" style={{ marginBottom: 24, padding: "24px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span className="section-title" style={{ margin: 0 }}>DRAWDOWN</span>
            <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--danger)", fontWeight: 700 }}>
              Máx: -{stats.maxDrawdown.toFixed(1)}%
            </span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={stats.drawdownData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--danger)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="d" tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} dy={8} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "var(--font-mono)" }} tickFormatter={v => `${v.toFixed(0)}%`} axisLine={false} tickLine={false} domain={["auto", 0]} />
              <ReferenceLine y={0} stroke="var(--border)" />
              <Tooltip contentStyle={{ background: "rgba(10,10,16,0.9)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, fontFamily: "var(--font-mono)" }} formatter={v => [`${v.toFixed(1)}%`, "Drawdown"]} labelStyle={{ color: "var(--muted)" }} itemStyle={{ color: "var(--danger)" }} />
              <Area type="monotone" dataKey="dd" stroke="var(--danger)" strokeWidth={2} fill="url(#ddGrad)" dot={false} animationDuration={800} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

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
    </>
  );
}
