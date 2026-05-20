import { createContext, useContext, useMemo, useCallback } from "react";
import { useAuthContext } from "./AuthContext";
import { useFirestore } from "../hooks/useFirestore";
import { getBetPL, getCLV, buildSegments } from "../utils/bets";
import { db } from "../firebase";
import { doc, setDoc, deleteDoc, serverTimestamp, getDocs, query, orderBy, limit, collection } from "firebase/firestore";

const BetsContext = createContext(null);

export function BetsProvider({ user, children }) {
  const firestore = useFirestore(user);

  const marketSeg = useMemo(() => buildSegments(firestore.bets, "market"), [firestore.bets]);
  const bookSeg   = useMemo(() => buildSegments(firestore.bets, "bookmaker"), [firestore.bets]);
  const sportSeg  = useMemo(() => buildSegments(firestore.bets, "sport"), [firestore.bets]);

  const syncPublicProfile = useCallback(async (enabled, displayName, stats) => {
    if (!user) return;
    const ref = doc(db, "publicProfiles", user.uid);
    if (!enabled) { try { await deleteDoc(ref); } catch (_) {} return; }
    const settled = firestore.bets.filter(b => b.result !== "pending");
    try {
      await setDoc(ref, {
        uid: user.uid,
        displayName: displayName || user.email?.split("@")[0] || "Anônimo",
        roi: stats.roi, yield: stats.yield, winRate: stats.winRate,
        totalBets: firestore.bets.length, settledBets: settled.length,
        totalPL: stats.totalPL, wins: stats.wins, losses: stats.losses,
        updatedAt: serverTimestamp(),
      });
    } catch {
      firestore.setSyncError("Perfil público requer atualização das regras do Firestore.");
    }
  }, [user, firestore.bets]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, "publicProfiles"), orderBy("roi", "desc"), limit(25)));
      return snap.docs.map(d => d.data());
    } catch { return []; }
  }, []);

  return (
    <BetsContext.Provider value={{
      ...firestore,
      marketSeg, bookSeg, sportSeg,
      syncPublicProfile, fetchLeaderboard,
    }}>
      {children}
    </BetsContext.Provider>
  );
}

export function useBetsContext() {
  const ctx = useContext(BetsContext);
  if (!ctx) throw new Error("useBetsContext must be used inside BetsProvider");
  return ctx;
}

export function InnerBetsProvider({ children }) {
  const { user } = useAuthContext();
  return <BetsProvider user={user}>{children}</BetsProvider>;
}
