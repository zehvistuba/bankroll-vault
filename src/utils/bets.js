export const getBetPL = (bet) => {
  if (bet.type === "lay") {
    const comm = bet.commission ?? 5;
    if (bet.result === "win")  return bet.stake * (1 - comm / 100);
    if (bet.result === "loss") return -bet.stake * ((bet.odds || 2) - 1);
    return 0;
  }
  if (bet.result === "win")  return bet.stake * (bet.odds - 1);
  if (bet.result === "loss") return -bet.stake;
  return 0;
};

export const getCLV = (bet) =>
  bet.closingOdds ? ((bet.odds - bet.closingOdds) / bet.closingOdds * 100) : null;

export const defaultSelection = () => ({
  id: crypto.randomUUID(),
  description: "",
  sport: "Futebol",
  market: "1x2",
  odds: "",
});

export const defaultForm = () => ({
  date: new Date().toISOString().split("T")[0],
  time: "",
  isLive: false,
  betType: "simple",
  sport: "Futebol",
  market: "1x2",
  bookmaker: localStorage.getItem("lastBookmaker") || "Bet365",
  description: "",
  odds: "",
  closingOdds: "",
  stake: "",
  result: "pending",
  commission: 5,
  source: "Própria análise",
  notes: "",
  prob: "",
  selections: [defaultSelection(), defaultSelection()],
});

export function buildSegments(bets, key) {
  const map = {};
  bets.forEach(bet => {
    if (bet.result === "pending") return;
    const pl = getBetPL(bet);
    if (bet.type === "multiple" && bet.selections?.length > 0 && key !== "bookmaker") {
      const n = bet.selections.length;
      bet.selections.forEach(sel => {
        const k = sel[key] || "Outros";
        if (!map[k]) map[k] = { name: k, bets: 0, wins: 0, losses: 0, stake: 0, pl: 0 };
        map[k].bets   += 1;          // 1 múltipla que inclui este segmento
        map[k].stake  += bet.stake / n;
        map[k].pl     += pl / n;
        if (bet.result === "win")  map[k].wins   += 1;
        if (bet.result === "loss") map[k].losses += 1;
      });
    } else {
      const k = bet[key] || "Outros";
      if (!map[k]) map[k] = { name: k, bets: 0, wins: 0, losses: 0, stake: 0, pl: 0 };
      map[k].bets++;
      map[k].stake += bet.stake;
      map[k].pl    += pl;
      if (bet.result === "win")  map[k].wins++;
      if (bet.result === "loss") map[k].losses++;
    }
  });
  return Object.values(map).map(r => ({
    ...r,
    yield: r.stake > 0 ? r.pl / r.stake * 100 : 0,
  }));
}
