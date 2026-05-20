import { useState, useRef } from "react";
import { Check, X } from "lucide-react";
import { fmt } from "../utils/formatting";

export function BalanceDisplay({ value, onChange }) {
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
