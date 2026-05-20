import { getBetPL } from "./bets";
import { fmt } from "./formatting";

export const shareAsImage = async (canvas, filename) => {
  return new Promise(resolve => {
    canvas.toBlob(async (blob) => {
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: "Banca Lógica" }); } catch (_) {}
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
      }
      resolve();
    }, "image/png");
  });
};

export const generateBetCard = async (bet) => {
  await document.fonts.ready;
  const W = 600, H = 320;
  const canvas = document.createElement("canvas");
  canvas.width = W * 2; canvas.height = H * 2;
  const ctx = canvas.getContext("2d");
  ctx.scale(2, 2);
  const pl = getBetPL(bet);
  const rc = bet.result === "win" ? "#10B981" : bet.result === "loss" ? "#EF4444" : "#3B82F6";
  const rl = bet.result === "win" ? "GREEN ✓" : bet.result === "loss" ? "RED ✗" : "PENDENTE";

  ctx.fillStyle = "#07070e"; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(80, H / 2, 0, 80, H / 2, 200);
  g.addColorStop(0, rc + "28"); g.addColorStop(1, "transparent");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = rc; ctx.fillRect(0, 0, 4, H);
  ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

  ctx.fillStyle = "#808098"; ctx.font = "600 10px monospace"; ctx.fillText("BANCA LÓGICA", 20, 32);
  ctx.fillStyle = rc; ctx.font = "700 12px monospace";
  ctx.fillText(rl, W - 20 - ctx.measureText(rl).width, 32);
  ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fillRect(20, 44, W - 40, 1);

  const desc = bet.description || "—";
  const d2 = desc.length > 55 ? desc.slice(0, 55) + "…" : desc;
  ctx.fillStyle = "#e4e4f0"; ctx.font = "bold 17px system-ui,sans-serif"; ctx.fillText(d2, 20, 84);
  ctx.fillStyle = "#808098"; ctx.font = "13px system-ui,sans-serif";
  const meta = [bet.bookmaker, bet.date, bet.type !== "multiple" && bet.sport, bet.type !== "multiple" && bet.market].filter(Boolean).join(" · ");
  ctx.fillText(meta, 20, 108);
  ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fillRect(20, 124, W - 40, 1);

  ctx.fillStyle = "#8b7ff5"; ctx.font = "bold 28px monospace"; ctx.fillText(`@${bet.odds?.toFixed(2)}`, 20, 172);
  ctx.fillStyle = "#808098"; ctx.font = "13px monospace"; ctx.fillText(`Stake: ${fmt(bet.stake)}`, 20, 196);

  if (bet.result !== "pending") {
    ctx.fillStyle = rc; ctx.font = "bold 24px monospace";
    const pt = `${pl >= 0 ? "+" : ""}${fmt(Math.abs(pl))}`;
    ctx.fillText(pt, W - 20 - ctx.measureText(pt).width, 172);
    ctx.fillStyle = "#808098"; ctx.font = "10px monospace";
    const lb = pl >= 0 ? "LUCRO" : "PREJUÍZO";
    ctx.fillText(lb, W - 20 - ctx.measureText(lb).width, 190);
  } else {
    ctx.fillStyle = "#8b7ff5"; ctx.font = "bold 18px monospace";
    const rt = `Ret: ${fmt(bet.stake * bet.odds)}`;
    ctx.fillText(rt, W - 20 - ctx.measureText(rt).width, 172);
  }

  ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(20, H - 46, W - 40, 1);
  ctx.fillStyle = "rgba(128,128,152,0.5)"; ctx.font = "10px monospace";
  ctx.fillText("banca-logica.pages.dev", 20, H - 22);
  const dt = new Date().toLocaleDateString("pt-BR");
  ctx.fillText(dt, W - 20 - ctx.measureText(dt).width, H - 22);
  return canvas;
};

export const generateStatsCard = async (st, name) => {
  await document.fonts.ready;
  const W = 600, H = 360;
  const canvas = document.createElement("canvas");
  canvas.width = W * 2; canvas.height = H * 2;
  const ctx = canvas.getContext("2d");
  ctx.scale(2, 2);
  const rc = st.roi >= 0 ? "#00d48a" : "#ff3d5a";

  ctx.fillStyle = "#07070e"; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 280);
  g.addColorStop(0, rc + "18"); g.addColorStop(1, "transparent");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = rc; ctx.fillRect(0, 0, 4, H);
  ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

  ctx.fillStyle = "#808098"; ctx.font = "600 10px monospace"; ctx.fillText("BANCA LÓGICA", 20, 34);
  if (name) {
    const nw = ctx.measureText(name).width;
    ctx.fillText(name, W - 20 - nw, 34);
  }
  ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fillRect(20, 46, W - 40, 1);
  ctx.fillStyle = "#808098"; ctx.font = "11px monospace"; ctx.fillText("MINHA PERFORMANCE", 20, 74);

  const roiText = `${st.roi >= 0 ? "+" : ""}${st.roi.toFixed(2)}% ROI`;
  ctx.fillStyle = rc; ctx.font = "bold 44px monospace";
  ctx.fillText(roiText, W / 2 - ctx.measureText(roiText).width / 2, 152);

  const cols = [
    { label: "YIELD",    v: `${st.yield   >= 0 ? "+" : ""}${st.yield.toFixed(2)}%`,     c: st.yield   >= 0 ? "#00d48a" : "#ff3d5a" },
    { label: "ACERTO",   v: `${st.winRate.toFixed(1)}%`,                                  c: "#e4e4f0" },
    { label: "P&L TOTAL",v: `${st.totalPL >= 0 ? "+" : ""}R$${Math.round(st.totalPL)}`, c: st.totalPL >= 0 ? "#00d48a" : "#ff3d5a" },
  ];
  cols.forEach((col, i) => {
    const x = 20 + i * (W - 40) / 3;
    ctx.fillStyle = "#808098"; ctx.font = "9px monospace"; ctx.fillText(col.label, x, 204);
    ctx.fillStyle = col.c;     ctx.font = "bold 18px monospace"; ctx.fillText(col.v, x, 228);
  });

  ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fillRect(20, 252, W - 40, 1);
  ctx.fillStyle = "#808098"; ctx.font = "12px monospace";
  ctx.fillText(`${st.totalBets} apostas · ${st.wins}W / ${st.losses}L`, 20, 280);

  ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(20, H - 46, W - 40, 1);
  ctx.fillStyle = "rgba(128,128,152,0.5)"; ctx.font = "10px monospace";
  ctx.fillText("banca-logica.pages.dev", 20, H - 22);
  const dt = new Date().toLocaleDateString("pt-BR");
  ctx.fillText(dt, W - 20 - ctx.measureText(dt).width, H - 22);
  return canvas;
};

export const compressImage = (file) => new Promise((res, rej) => {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    URL.revokeObjectURL(url);
    const MAX = 1600;
    let w = img.width, h = img.height;
    if (w > MAX || h > MAX) {
      if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
      else        { w = Math.round(w * MAX / h); h = MAX; }
    }
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
    const data = canvas.toDataURL("image/jpeg", 0.92).split(",")[1];
    res({ base64: data, mimeType: "image/jpeg" });
  };
  img.onerror = rej;
  img.src = url;
});
