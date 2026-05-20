import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, RefreshCw, Layers, AlertTriangle, X } from "lucide-react";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { SPORTS, MARKETS, BOOKMAKERS, FREE_BET_LIMIT } from "../constants/bets";
import { EXTRACTION_PROMPT } from "../constants/prompts";
import { fmt } from "../utils/formatting";
import { defaultForm, defaultSelection } from "../utils/bets";

export function RegisterForm({
  editingBet, setEditingBet,
  bets, isPremium,
  geminiKey,
  currentBankroll,
  user,
  setShareToast,
  setSyncError,
  setShowUpgrade,
}) {
  const navigate = useNavigate();
  const imageInputRef = useRef(null);
  const [form, setForm] = useState(defaultForm);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (editingBet) {
      setForm({
        date: editingBet.date,
        betType: editingBet.type === "multiple" ? "multiple" : "simple",
        sport: editingBet.sport || "Futebol",
        market: editingBet.market || "1x2",
        bookmaker: editingBet.bookmaker || "Bet365",
        description: editingBet.type === "multiple" ? "" : (editingBet.description || ""),
        odds: editingBet.type === "multiple" ? "" : String(editingBet.odds ?? ""),
        closingOdds: editingBet.closingOdds != null ? String(editingBet.closingOdds) : "",
        stake: String(editingBet.stake ?? ""),
        result: editingBet.result,
        notes: editingBet.notes || "",
        prob: "",
        selections: editingBet.type === "multiple" && editingBet.selections?.length
          ? editingBet.selections.map(s => ({ ...s, odds: String(s.odds) }))
          : [defaultSelection(), defaultSelection()],
      });
    } else {
      setForm(defaultForm());
    }
  }, [editingBet]);

  const formEV = useMemo(() => {
    const p = parseFloat(form.prob) / 100;
    const o = parseFloat(form.odds);
    if (!p || !o || p <= 0 || p >= 1 || o <= 1) return null;
    const ev = p * (o - 1) - (1 - p);
    return { ev, pct: (ev * 100).toFixed(2), positive: ev > 0 };
  }, [form.prob, form.odds]);

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
        if (m) { const y = m[3].length === 2 ? "20" + m[3] : m[3]; return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; }
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
      if (parseFloat(form.stake) > currentBankroll * 5) { setFormError(`Stake não pode ser maior que 5× sua banca (${fmt(currentBankroll * 5)}). Verifique o valor.`); return; }
    } else {
      const valid = form.selections.filter(s => s.description && s.odds && parseFloat(s.odds) > 0);
      if (valid.length < 2) { setFormError("Preencha ao menos 2 seleções com descrição e odds."); return; }
      if (!form.stake || parseFloat(form.stake) <= 0) { setFormError("Informe o valor do stake."); return; }
      if (parseFloat(form.stake) > currentBankroll * 5) { setFormError(`Stake não pode ser maior que 5× sua banca (${fmt(currentBankroll * 5)}). Verifique o valor.`); return; }
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

  const betLimitReached = !isPremium && bets.length >= FREE_BET_LIMIT;

  if (betLimitReached && !editingBet) {
    return (
      <div className="card animate-fade-in" style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", padding: "52px 32px", borderColor: "rgba(245,158,11,0.35)", background: "linear-gradient(180deg,rgba(245,158,11,0.06) 0%,var(--surface) 60%)" }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>Limite de {FREE_BET_LIMIT} apostas atingido</div>
        <div style={{ color: "var(--muted)", marginBottom: 28, lineHeight: 1.7, fontSize: 14 }}>
          Você registrou <strong style={{ color: "var(--text)" }}>{bets.length} apostas</strong> no plano gratuito.<br />
          Faça upgrade para apostas ilimitadas e muito mais.
        </div>
        <button onClick={() => setShowUpgrade(true)} style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)", color: "#000", border: "none", padding: "16px 40px", borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: "pointer", marginBottom: 16 }}>
          VER PLANO PRO
        </button>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>ou <button onClick={() => navigate("/history")} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", padding: 0, fontSize: 12 }}>ver histórico de apostas</button></div>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span className="section-title" style={{ margin: 0 }}>{editingBet ? "EDITAR APOSTA" : `NOVA APOSTA ${!isPremium ? `(${bets.length}/${FREE_BET_LIMIT})` : ""}`}</span>
        {editingBet && (
          <button onClick={() => { setEditingBet(null); setForm(defaultForm()); setExtractError(""); navigate("/history"); }} style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", borderRadius: 8, padding: "8px 16px", fontSize: 12, cursor: "pointer", fontWeight: 600, fontFamily: "var(--font-sans)" }}>CANCELAR</button>
        )}
      </div>

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
              {form.stake && parseFloat(form.stake) > currentBankroll * 0.2 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12, color: "#f59e0b" }}>
                  <AlertTriangle size={13} />
                  {parseFloat(form.stake) > currentBankroll
                    ? `Stake maior que sua banca atual (${fmt(currentBankroll)}).`
                    : `Stake representa ${((parseFloat(form.stake) / currentBankroll) * 100).toFixed(0)}% da banca — acima de 20%.`}
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
                {[["pending", "Pendente"], ["win", "Ganhou"], ["loss", "Perdeu"], ["void", "Void"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
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
                {[["pending", "Pendente"], ["win", "Ganhou"], ["loss", "Perdeu"], ["void", "Void"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
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
    </div>
  );
}
