import { useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import {
  doc, setDoc, onSnapshot, collection, deleteDoc, writeBatch,
} from "firebase/firestore";

export function useFirestore(user) {
  const [bets, setBets] = useState([]);
  const [config, setConfig] = useState({ initialBankroll: 1000, monthlyGoal: 0 });
  const [geminiKey, setGeminiKey] = useState("");
  const [subscription, setSubscription] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [syncError, setSyncError] = useState("");

  useEffect(() => {
    if (!user) {
      setBets([]);
      setConfig({ initialBankroll: 1000, monthlyGoal: 0 });
      setGeminiKey("");
      setSubscription(null);
      setIsAdmin(false);
      setLoaded(false);
      return;
    }
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

  const saveConfig = useCallback(async (newConfig) => {
    setConfig(newConfig);
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid), { config: newConfig }, { merge: true });
      setSyncError("");
    } catch { setSyncError("Erro ao salvar configuração."); }
  }, [user]);

  const updateBetResult = useCallback(async (betId, result) => {
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid, "bets", String(betId)), { result }, { merge: true });
    } catch { setSyncError("Erro ao salvar resultado."); }
  }, [user]);

  const deleteBet = useCallback(async (betId) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "bets", String(betId)));
    } catch { setSyncError("Erro ao excluir aposta."); }
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

  return {
    bets, config, setConfig,
    geminiKey, setGeminiKey,
    subscription, isAdmin,
    loaded, syncError, setSyncError,
    saveConfig, updateBetResult, deleteBet, saveGeminiKey,
  };
}
