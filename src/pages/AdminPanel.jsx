import { useState } from "react";
import { Shield, Search, RefreshCw, UserCheck, UserX } from "lucide-react";
import { fns } from "../firebase";
import { httpsCallable } from "firebase/functions";

export function AdminPanel() {
  const [adminSearch, setAdminSearch] = useState("");
  const [adminUser, setAdminUser] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMsg, setAdminMsg] = useState("");

  const adminLookup = async () => {
    if (!adminSearch.trim()) return;
    setAdminLoading(true);
    setAdminMsg("");
    setAdminUser(null);
    try {
      const fn = httpsCallable(fns, "adminGetUser");
      const res = await fn({ email: adminSearch.trim().toLowerCase() });
      setAdminUser(res.data);
    } catch (err) {
      setAdminMsg("❌ " + (err.message || "Erro ao buscar usuário"));
    } finally {
      setAdminLoading(false);
    }
  };

  const adminToggle = async (field, value) => {
    if (!adminUser) return;
    setAdminLoading(true);
    setAdminMsg("");
    try {
      const fn = httpsCallable(fns, "adminSetRole");
      await fn({ uid: adminUser.uid, [field]: value });
      setAdminUser((u) => ({
        ...u,
        ...(field === "isPremium" ? { subscription: { ...u.subscription, status: value ? "active" : "free" } } : {}),
        ...(field === "isAdmin" ? { isAdmin: value } : {}),
      }));
      setAdminMsg("✅ Atualizado com sucesso!");
    } catch (err) {
      setAdminMsg("❌ " + (err.message || "Erro ao atualizar"));
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <Shield size={20} color="#f59e0b" />
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Painel de Administração</span>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <input
            value={adminSearch}
            onChange={(e) => setAdminSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && adminLookup()}
            placeholder="Email do usuário..."
            style={{
              flex: 1,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "10px 14px",
              color: "var(--text)",
              fontSize: 14,
              fontFamily: "var(--font-sans)",
            }}
          />
          <button onClick={adminLookup} disabled={adminLoading} className="btn" style={{ width: "auto", padding: "10px 20px" }}>
            {adminLoading ? <RefreshCw size={16} className="spin" /> : <Search size={16} />}
          </button>
        </div>
        {adminMsg && (
          <div style={{ fontSize: 13, color: adminMsg.startsWith("✅") ? "var(--primary)" : "var(--danger)", marginBottom: 12 }}>
            {adminMsg}
          </div>
        )}
        {adminUser && (
          <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: 16, border: "1px solid var(--border)" }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                {adminUser.displayName || adminUser.email}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>{adminUser.email}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>uid: {adminUser.uid}</div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => adminToggle("isPremium", adminUser.subscription?.status !== "active")}
                disabled={adminLoading}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1px solid",
                  fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", transition: "all 0.2s",
                  background: adminUser.subscription?.status === "active" ? "rgba(245,158,11,0.15)" : "rgba(0,0,0,0.2)",
                  borderColor: adminUser.subscription?.status === "active" ? "#f59e0b" : "var(--border)",
                  color: adminUser.subscription?.status === "active" ? "#f59e0b" : "var(--muted)",
                }}
              >
                {adminUser.subscription?.status === "active" ? <><UserX size={14} /> Remover PRO</> : <><UserCheck size={14} /> Ativar PRO</>}
              </button>
              <button
                onClick={() => adminToggle("isAdmin", !adminUser.isAdmin)}
                disabled={adminLoading}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1px solid",
                  fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", transition: "all 0.2s",
                  background: adminUser.isAdmin ? "rgba(99,102,241,0.15)" : "rgba(0,0,0,0.2)",
                  borderColor: adminUser.isAdmin ? "#6366f1" : "var(--border)",
                  color: adminUser.isAdmin ? "#6366f1" : "var(--muted)",
                }}
              >
                <Shield size={14} /> {adminUser.isAdmin ? "Remover Admin" : "Tornar Admin"}
              </button>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: "var(--muted)", display: "flex", gap: 16 }}>
              <span>
                Status:{" "}
                <strong style={{ color: adminUser.subscription?.status === "active" ? "#f59e0b" : "var(--muted)" }}>
                  {adminUser.subscription?.status === "active" ? "PRO" : "Free"}
                </strong>
              </span>
              <span>
                Admin:{" "}
                <strong style={{ color: adminUser.isAdmin ? "#6366f1" : "var(--muted)" }}>
                  {adminUser.isAdmin ? "Sim" : "Não"}
                </strong>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
