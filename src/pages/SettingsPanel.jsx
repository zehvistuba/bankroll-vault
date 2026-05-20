import { useState } from "react";
import { Check, LogOut, Sun, Moon, Crown, Plus, Trash2 } from "lucide-react";
import { auth } from "../firebase";
import { updateProfile } from "firebase/auth";
import { FREE_BET_LIMIT } from "../constants/bets";

export function SettingsPanel({ user, userDisplayName, setUserDisplayName, isPremium, isOnTrial, isTrialExpired, trialDaysLeft, config, saveConfig, handleLogout, theme, setTheme, bets, setShowUpgrade }) {
  const [localBankroll, setLocalBankroll] = useState(config.initialBankroll ?? 0);
  const [localGoal, setLocalGoal] = useState(config.monthlyGoal ?? 0);
  const [localUnit, setLocalUnit] = useState(config.unitValue ?? "");
  const [newBankrollName, setNewBankrollName] = useState("");
  const [newBankrollInitial, setNewBankrollInitial] = useState("");

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <span className="section-title">PERFIL & CONTA</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="form-group">
            <span className="form-label">NOME DE EXIBIÇÃO</span>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={userDisplayName}
                onChange={(e) => setUserDisplayName(e.target.value)}
                className="input"
                placeholder="Seu nome"
              />
              <button
                onClick={async () => { await updateProfile(auth.currentUser, { displayName: userDisplayName }); }}
                className="btn"
                style={{ width: "auto", padding: "10px 16px" }}
              >
                <Check size={16} />
              </button>
            </div>
          </div>
          <div className="form-group">
            <span className="form-label">E-MAIL</span>
            <input type="text" value={user?.email || ""} disabled className="input" style={{ opacity: 0.6 }} />
          </div>
          <div className="form-group">
            <span className="form-label">PLANO ATUAL</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "rgba(0,0,0,0.2)", borderRadius: 8, border: "1px solid var(--border)" }}>
              {isPremium && !isOnTrial && (
                <><Crown size={16} color="#f59e0b" /><span style={{ fontWeight: 700, color: "#f59e0b" }}>PRO</span></>
              )}
              {isOnTrial && (
                <><Crown size={16} color="#a78bfa" />
                <span style={{ fontWeight: 700, color: "#a78bfa" }}>TRIAL PRO</span>
                <span style={{ color: "var(--muted)", fontSize: 12 }}>— {trialDaysLeft} dia{trialDaysLeft !== 1 ? "s" : ""} restante{trialDaysLeft !== 1 ? "s" : ""}</span></>
              )}
              {isTrialExpired && (
                <><span style={{ fontWeight: 600, color: "#f87171" }}>Trial expirado</span></>
              )}
              {!isPremium && !isTrialExpired && (
                <><span style={{ fontWeight: 600, color: "var(--muted)" }}>FREE</span>
                <span style={{ color: "var(--muted)", fontSize: 12 }}>— {Math.max(0, FREE_BET_LIMIT - bets.length)} apostas restantes</span></>
              )}
              {(!isPremium || isTrialExpired) && (
                <button onClick={() => setShowUpgrade(true)} className="btn" style={{ marginLeft: "auto", width: "auto", padding: "6px 14px", fontSize: 12 }}>
                  Fazer Upgrade
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <span className="section-title">BANCA & METAS</span>
        <div className="form-group">
          <span className="form-label">BANCA INICIAL (R$)</span>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="number"
              value={localBankroll}
              onChange={(e) => setLocalBankroll(parseFloat(e.target.value) || 0)}
              onBlur={() => saveConfig({ ...config, initialBankroll: localBankroll })}
              className="input"
            />
          </div>
        </div>
        <div className="form-group">
          <span className="form-label">META MENSAL (R$)</span>
          <input
            type="number"
            value={localGoal || ""}
            onChange={(e) => setLocalGoal(parseFloat(e.target.value) || 0)}
            onBlur={() => saveConfig({ ...config, monthlyGoal: localGoal })}
            className="input"
            placeholder="0.00"
          />
        </div>
        <div className="form-group">
          <span className="form-label">VALOR DA UNIDADE (R$) — opcional</span>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="number"
              value={localUnit}
              onChange={(e) => setLocalUnit(e.target.value)}
              onBlur={() => saveConfig({ ...config, unitValue: parseFloat(localUnit) || null })}
              className="input"
              placeholder="ex: 10 → 1u = R$10,00"
            />
            {localUnit && <button onClick={() => { setLocalUnit(""); saveConfig({ ...config, unitValue: null }); }} style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", borderRadius: 8, padding: "0 12px", cursor: "pointer", fontSize: 12 }}>Remover</button>}
          </div>
          {localUnit && parseFloat(localUnit) > 0 && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Stakes serão exibidas em unidades no formulário de aposta.</div>}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <span className="section-title">BANCAS ADICIONAIS</span>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>Crie bancas separadas por esporte, estratégia ou fonte. Cada aposta pode ser vinculada a uma banca específica.</div>
        {(config.bankrolls || []).map(b => (
          <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{b.name}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Banca inicial: R${b.initial?.toFixed(2) ?? "0.00"}</div>
            </div>
            <button onClick={() => saveConfig({ ...config, bankrolls: (config.bankrolls || []).filter(x => x.id !== b.id) })}
              style={{ background: "transparent", border: "none", color: "var(--danger)", cursor: "pointer", padding: 6, display: "flex", opacity: 0.7 }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <input type="text" placeholder="Nome da banca (ex: Futebol)" value={newBankrollName} onChange={e => setNewBankrollName(e.target.value)} className="input" style={{ flex: "2 1 140px" }} />
          <input type="number" placeholder="Banca inicial (R$)" value={newBankrollInitial} onChange={e => setNewBankrollInitial(e.target.value)} className="input" style={{ flex: "1 1 120px" }} />
          <button onClick={() => {
            if (!newBankrollName.trim()) return;
            const b = { id: crypto.randomUUID(), name: newBankrollName.trim(), initial: parseFloat(newBankrollInitial) || 0 };
            saveConfig({ ...config, bankrolls: [...(config.bankrolls || []), b] });
            setNewBankrollName(""); setNewBankrollInitial("");
          }} className="btn" style={{ width: "auto", padding: "10px 16px", display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} /> Adicionar
          </button>
        </div>
      </div>

      <div className="card">
        <span className="section-title">PREFERÊNCIAS</span>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>Tema</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Aparência do aplicativo</div>
          </div>
          <button
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 20, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            {theme === "dark" ? "Claro" : "Escuro"}
          </button>
        </div>
        <div style={{ paddingTop: 16 }}>
          <button
            onClick={handleLogout}
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(255,61,90,0.3)", background: "rgba(255,61,90,0.05)", color: "var(--danger)", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
          >
            <LogOut size={16} /> Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
}
