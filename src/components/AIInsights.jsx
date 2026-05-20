import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, Info, Eye, EyeOff } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { fns } from "../firebase";
import { GEMINI_MODELS } from "../constants/checkout";
import { SYSTEM_PROMPT } from "../constants/prompts";
import { getBetPL, getCLV } from "../utils/bets";

export function AIInsights({ stats, marketSeg, bookSeg, sportSeg, bets, apiKey, onApiKeyChange }) {
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
      const geminiProxy = httpsCallable(fns, "geminiProxy", { timeout: 60000 });
      const result = await geminiProxy({
        model,
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: `Analise meu histórico de apostas:\n\n${JSON.stringify(payload, null, 2)}` }] }],
        generationConfig: { temperature: 0.35, maxOutputTokens: 2048 },
      });
      const text = result.data.text || "";
      if (!text) throw new Error("Resposta vazia da API");
      setInsight(text);
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("Chave da API Gemini não configurada")) setError("Configure sua API Key do Google Gemini em Análise → Inteligência IA.");
      else if (msg.includes("API key not valid") || msg.includes("invalid API key")) setError("API Key inválida. Verifique sua chave no Google AI Studio.");
      else if (msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) setError("Limite de requisições atingido. Aguarde alguns minutos e tente novamente.");
      else if (msg.includes("timeout") || msg.includes("deadline")) setError("Tempo esgotado. Verifique sua conexão e tente novamente.");
      else setError("Erro ao gerar análise: " + msg);
    } finally { setLoading(false); }
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
