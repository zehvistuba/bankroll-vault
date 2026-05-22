import { useState, useEffect, useMemo, useRef } from "react";
import { db } from "../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { Share2, Trophy, Check, ChevronLeft, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import {
  GROUPS, STADIUMS, MATCH_INFO, KNOCKOUT_ROUNDS,
  getGroupMatches, computeStandings, groupProgress,
  resolveKnockoutSlots, fmtDate,
} from "../data/copa2026";

// ─── Temas ────────────────────────────────────────────────────────────────────
const THEMES = {
  copa2026: {
    id: 'copa2026', year: '2026', host: 'EUA · CANADÁ · MÉXICO', name: 'A Nova Era', emoji: '🦅',
    tagline: 'A Copa volta ao continente americano',
    isDark: true,
    primary: '#C8102E', accent: '#FFD700',
    bg: 'linear-gradient(160deg, #07071a 0%, #0e0e28 55%, #140709 100%)',
    paper: 'rgba(200,16,46,0.04)', border: 'rgba(200,16,46,0.22)',
    text: '#f0f0ff', muted: '#8888bb', inputBg: 'rgba(200,16,46,0.10)',
    font: "'Patrick Hand', cursive",
    captionFont: "'Courier New', monospace",
    divider: 'rgba(200,16,46,0.18)',
    bandBg: 'rgba(200,16,46,0.14)',
    bandText: '#C8102E',
    glow: 'rgba(200,16,46,0.35)',
    line: 'rgba(200,16,46,0.06)',
    inkAuto: '#4f9cf6', inkPick: '#5ec46a',
    tooltipBg: '#0d0d24',
  },
  copa2014: {
    id: 'copa2014', year: '2014', host: 'BRASIL', name: 'Copa das Emoções', emoji: '🇧🇷',
    tagline: '"Não é só futebol" — a Copa do coração partido',
    isDark: true,
    primary: '#009C3B', accent: '#FFDF00',
    bg: 'linear-gradient(160deg, #001208 0%, #001e0c 55%, #001008 100%)',
    paper: 'rgba(0,156,59,0.04)', border: 'rgba(0,156,59,0.28)',
    text: '#efffee', muted: '#5a9e6a', inputBg: 'rgba(0,156,59,0.10)',
    font: "'Kalam', cursive",
    captionFont: "'Courier New', monospace",
    divider: 'rgba(0,156,59,0.22)',
    bandBg: 'rgba(0,156,59,0.16)',
    bandText: '#009C3B',
    glow: 'rgba(0,156,59,0.4)',
    line: 'rgba(0,156,59,0.06)',
    inkAuto: '#4f9cf6', inkPick: '#f5c842',
    tooltipBg: '#001a08',
  },
  copa1994: {
    id: 'copa1994', year: '1994', host: 'EUA', name: 'Tetracampeões', emoji: '🏆',
    tagline: 'Baggio caiu. O Brasil subiu ao céu.',
    isDark: false,
    primary: '#1A237E', accent: '#FFD700',
    bg: 'linear-gradient(160deg, #FAF4DC 0%, #F3EAC8 55%, #ECDFB8 100%)',
    paperBg: 'rgba(254,250,235,0.99)',
    bandBg: '#1A237E',
    bandText: '#FFFFFF',
    border: 'rgba(26,35,126,0.28)',
    text: '#0a0a1a', muted: '#4a4a7a',
    inputBg: 'rgba(26,35,126,0.07)',
    font: "'Kalam', cursive",
    captionFont: "'Courier New', monospace",
    divider: 'rgba(26,35,126,0.15)',
    scoreColor: '#B71C1C',
    glow: 'rgba(26,35,126,0.15)',
    line: 'rgba(26,35,126,0.05)',
    shadow: '0 4px 24px rgba(0,0,0,0.20), 0 1px 6px rgba(0,0,0,0.12)',
    cardRadius: 4,
    inkAuto: '#1A237E', inkPick: '#2E7D32',
    tooltipBg: '#fffff0',
  },
  copa1970: {
    id: 'copa1970', year: '1970', host: 'MÉXICO', name: 'A Copa de Pelé', emoji: '👑',
    tagline: 'O futebol foi arte, e Pelé foi o artista.',
    isDark: false,
    primary: '#4E342E', accent: '#FFA000',
    bg: 'linear-gradient(160deg, #FEF6DC 0%, #F5E9BE 55%, #EDD9A2 100%)',
    paperBg: 'rgba(255,251,234,0.99)',
    bandBg: '#4E342E',
    bandText: '#FFD54F',
    border: 'rgba(78,52,46,0.28)',
    text: '#1a0e00', muted: '#7a5e3a',
    inputBg: 'rgba(78,52,46,0.06)',
    font: "'Kalam', cursive",
    captionFont: "'Courier New', monospace",
    divider: 'rgba(78,52,46,0.15)',
    scoreColor: '#4E342E',
    glow: 'rgba(78,52,46,0.15)',
    line: 'rgba(78,52,46,0.05)',
    shadow: '0 4px 28px rgba(0,0,0,0.22), 0 1px 6px rgba(0,0,0,0.14)',
    cardRadius: 4,
    sepia: 0.12,
    inkAuto: '#1565C0', inkPick: '#4E342E',
    tooltipBg: '#fff8e1',
  },
  copa2002: {
    id: 'copa2002', year: '2002', host: 'COREIA · JAPÃO', name: 'Tabelinha de Bolso', emoji: '📋',
    tagline: 'Cola no bolso e vai torcer pro Brasil!',
    isDark: false,
    primary: '#1B5E20', accent: '#FFDF00',
    bg: 'linear-gradient(160deg, #FEFCE8 0%, #F5F0C4 55%, #EDE8B5 100%)',
    paperBg: 'rgba(255,252,224,0.99)',
    bandBg: '#1B5E20',
    bandText: '#FFDF00',
    border: 'rgba(27,94,32,0.32)',
    text: '#1a1a0a', muted: '#4a6040',
    inputBg: 'rgba(21,101,192,0.07)',
    font: "'Kalam', cursive",
    captionFont: "'Courier New', monospace",
    divider: 'rgba(27,94,32,0.16)',
    scoreColor: '#1565C0',
    scoreSep: 'X',
    glow: 'rgba(27,94,32,0.15)',
    line: 'rgba(27,94,32,0.08)',
    shadow: '0 4px 22px rgba(0,0,0,0.20), 0 1px 5px rgba(0,0,0,0.12)',
    cardRadius: 4,
    inkAuto: '#1565C0', inkPick: '#6a1010',
    tooltipBg: '#fff8dc',
  },
};

// ─── CSS Animations ───────────────────────────────────────────────────────────
const COPA_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Caveat:wght@400;600;700&family=Kalam:wght@400;700&family=Oswald:wght@400;600;700;900&family=Special+Elite&display=swap');

  @keyframes copaPulse {
    0%   { box-shadow: 0 0 0 0 rgba(255,215,0,0.5); }
    40%  { box-shadow: 0 0 0 8px rgba(255,215,0,0); }
    100% { box-shadow: 0 0 0 0 rgba(255,215,0,0); }
  }
  @keyframes copaFillRow {
    0%   { transform: scale(1); }
    30%  { transform: scale(1.012); }
    100% { transform: scale(1); }
  }
  @keyframes copaCheckIn {
    0%   { transform: scale(0) rotate(-10deg); opacity: 0; }
    60%  { transform: scale(1.3) rotate(3deg); opacity: 1; }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  @keyframes copaSpin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  /* Animação "escrita de caneta" — revela da esquerda para direita */
  @keyframes copaWriteIn {
    0%   { clip-path: inset(0 100% 0 0); opacity: 0; }
    15%  { opacity: 0.7; }
    100% { clip-path: inset(0 0% 0 0); opacity: 1; }
  }
  @keyframes copaPickGlow {
    0%   { box-shadow: 0 0 0 0 rgba(94,196,106,0.7); }
    50%  { box-shadow: 0 0 0 10px rgba(94,196,106,0); }
    100% { box-shadow: 0 0 0 0 rgba(94,196,106,0); }
  }
  @keyframes copaTooltipIn {
    0%   { opacity: 0; transform: translateY(4px) translateX(-50%); }
    100% { opacity: 1; transform: translateY(0) translateX(-50%); }
  }
  /* Tinta aparece: caixa do placar ao ser preenchida */
  @keyframes inkAppear {
    0%   { transform: scale(0.72) rotate(-2.5deg); opacity: 0; }
    55%  { transform: scale(1.1) rotate(0.5deg); opacity: 1; }
    80%  { transform: scale(0.97) rotate(0deg); }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  /* Carimbo do campeão */
  @keyframes stampIn {
    0%   { transform: scale(1.7) rotate(-10deg); opacity: 0; filter: blur(4px); }
    55%  { transform: scale(0.93) rotate(2deg); opacity: 1; filter: blur(0); }
    80%  { transform: scale(1.03) rotate(-0.5deg); }
    100% { transform: scale(1) rotate(0deg); opacity: 1; filter: blur(0); }
  }
  /* Remove setas dos inputs número */
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  input[type=number] { -moz-appearance: textfield; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const Flag = ({ code, size = 28 }) => (
  <img
    src={`https://flagcdn.com/w40/${code}.png`}
    alt={code}
    style={{ width: size, height: Math.round(size * 0.67), objectFit: 'cover', borderRadius: 3, boxShadow: '0 1px 4px rgba(0,0,0,0.35)', flexShrink: 0 }}
    onError={e => { e.target.style.display = 'none'; }}
  />
);

const paperLines = (color, spacing = 32) =>
  `repeating-linear-gradient(0deg, transparent, transparent ${spacing - 1}px, ${color} ${spacing - 1}px, ${color} ${spacing}px)`;

const noise = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`;

const hexToRgb = (hex) => hex.replace('#','').match(/.{2}/g).map(x => parseInt(x,16)).join(',');

/** Resolve um slot do chaveamento para dados do time */
function resolveSlot(slot, resolvedSlots, knockoutPicks) {
  if (!slot) return null;
  if (slot === '3*') return { name: 'Melhor 3°', flag: null, id: null, isTBD: true };
  if (/^[12][A-L]$/.test(slot)) return resolvedSlots[slot] || null;
  if (slot.startsWith('W ')) {
    const matchId = slot.slice(2).trim();
    const winnerId = knockoutPicks?.[matchId];
    if (!winnerId) return null;
    for (const gk of Object.keys(GROUPS)) {
      const team = GROUPS[gk].teams.find(t => t.id === winnerId);
      if (team) return { ...team, fromGroup: gk };
    }
  }
  return null;
}

// ─── StadiumTooltip ───────────────────────────────────────────────────────────
function StadiumTooltip({ stadiumKey, date, theme: t }) {
  const [open, setOpen] = useState(false);
  const st = STADIUMS[stadiumKey];
  if (!st) return null;

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        style={{
          background: 'none', border: `1px solid ${t.border}`, cursor: 'pointer',
          color: t.muted, padding: 0,
          width: 16, height: 16, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontStyle: 'italic', fontWeight: 700,
          fontFamily: 'Georgia, serif',
          flexShrink: 0, transition: 'border-color 0.15s',
          lineHeight: 1,
        }}>
        i
      </button>
      {open && (
        <div
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          style={{
            position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
            transform: 'translateX(-50%)',
            background: t.tooltipBg || '#0d0d24',
            border: `1px solid ${t.border}`,
            borderRadius: 10, padding: '10px 13px',
            minWidth: 210, maxWidth: 260,
            zIndex: 300,
            boxShadow: `0 6px 32px rgba(0,0,0,0.75)`,
            animation: 'copaTooltipIn 0.18s ease both',
            pointerEvents: 'auto',
          }}>
          <div style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: `6px solid ${t.border}`,
          }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: t.primary, fontFamily: "'Oswald', sans-serif", marginBottom: 2, letterSpacing: 0.3 }}>
            {st.emoji} {st.name}
          </div>
          <div style={{ fontSize: 11, color: t.muted, marginBottom: 6, fontFamily: "'Oswald', sans-serif", letterSpacing: 0.3 }}>
            📍 {st.city} · {st.cap.toLocaleString('pt-BR')} 🪑
          </div>
          <div style={{ fontSize: 12, color: t.text, fontFamily: "'Patrick Hand', cursive", lineHeight: 1.55 }}>
            {st.fact}
          </div>
          {date && (
            <div style={{ fontSize: 10, color: t.accent, marginTop: 7, fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5 }}>
              📅 {fmtDate(date)} de 2026
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ScoreInput ────────────────────────────────────────────────────────────────
function ScoreInput({ value, onChange, onAdvance, theme: t, disabled, inputRef }) {
  const [focused, setFocused] = useState(false);
  const [justFilled, setJustFilled] = useState(false);
  const prevValueRef = useRef(value);
  const onAdvanceRef = useRef(onAdvance);
  useEffect(() => { onAdvanceRef.current = onAdvance; }, [onAdvance]);

  // Dispara animação inkAppear apenas quando vai de vazio → preenchido
  useEffect(() => {
    if (value !== '' && prevValueRef.current === '') {
      setJustFilled(true);
      const timer = setTimeout(() => setJustFilled(false), 460);
      return () => clearTimeout(timer);
    }
    prevValueRef.current = value;
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value;
    const lastChar = raw.length > 1 ? raw.slice(-1) : raw;
    const clamped = lastChar === '' ? '' : String(Math.max(0, Math.min(9, parseInt(lastChar) || 0)));
    onChange(clamped);
    if (clamped !== '') onAdvanceRef.current?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp')   { e.preventDefault(); onChange(String(Math.min(30, (parseInt(value) || 0) + 1))); }
    if (e.key === 'ArrowDown') { e.preventDefault(); onChange(String(Math.max(0, (parseInt(value) || 0) - 1))); }
    if (e.key === 'Enter')     { e.preventDefault(); onAdvance?.(); }
  };

  const filled = value !== '';
  const sc = t.scoreColor || t.primary;

  return (
    <div style={{
      display: 'inline-flex',
      animation: justFilled ? 'inkAppear 0.42s cubic-bezier(0.34,1.56,0.64,1) both' : undefined,
    }}>
      <input
        ref={inputRef}
        type="number" inputMode="numeric" pattern="[0-9]*"
        min="0" max="30" value={value} onChange={handleChange} onKeyDown={handleKeyDown}
        disabled={disabled}
        onFocus={e => { setFocused(true); e.target.select(); }}
        onBlur={() => setFocused(false)}
        placeholder="–"
        style={{
          width: t.isDark ? 46 : 40,
          height: t.isDark ? 50 : 44,
          textAlign: 'center',
          fontSize: t.isDark ? 26 : 28,
          fontWeight: 700,
          fontFamily: t.isDark ? t.font : "'Caveat', cursive",
          background: focused
            ? t.inputBg
            : filled
              ? (t.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.035)')
              : 'transparent',
          border: `1.5px solid ${filled ? sc : focused ? sc : t.border}`,
          borderRadius: 4,
          outline: 'none',
          color: filled ? sc : t.muted,
          transition: 'border-color 0.15s, background 0.15s',
          cursor: disabled ? 'default' : 'text',
          WebkitAppearance: 'none',
          touchAction: 'manipulation',
        }}
      />
    </div>
  );
}

// ─── StandingsTable ───────────────────────────────────────────────────────────
function StandingsTable({ standings, theme: t }) {
  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${t.isDark ? t.border : t.divider}` }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: t.muted, marginBottom: 6, fontFamily: "'Oswald', sans-serif", opacity: 0.85 }}>
        CLASSIFICAÇÃO PREVISTA
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {standings.map((team, i) => (
          <div key={team.id} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '5px 8px', borderRadius: t.isDark ? 6 : 3,
            background: i < 2 ? `rgba(${hexToRgb(t.primary)}, ${t.isDark ? 0.12 : 0.08})` : i === 2 ? `rgba(180,130,30, ${t.isDark ? 0.08 : 0.06})` : 'transparent',
            border: i < 2 ? `1px solid ${t.border}` : '1px solid transparent',
            transition: 'all 0.3s',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: i < 2 ? t.primary : t.muted, width: 14, fontFamily: "'Oswald', sans-serif" }}>{i + 1}</span>
            <Flag code={team.flag} size={18} />
            <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: t.text, fontFamily: t.isDark ? t.font : "'Oswald', sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team.name}</span>
            <span style={{ fontSize: 10, color: t.muted, width: 20, textAlign: 'center', fontFamily: "'Oswald', sans-serif" }}>{team.pj}J</span>
            <span style={{ fontSize: 10, color: team.gd > 0 ? '#4caf50' : team.gd < 0 ? '#f44' : t.muted, width: 26, textAlign: 'center', fontFamily: "'Oswald', sans-serif" }}>
              {team.gd > 0 ? `+${team.gd}` : team.gd}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: i < 2 ? t.primary : t.text, width: 22, textAlign: 'center', fontFamily: "'Oswald', sans-serif" }}>{team.pts}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 7 }}>
        <span style={{ fontSize: 9, color: t.primary, fontFamily: "'Oswald', sans-serif", opacity: 0.85 }}>■ Classificado</span>
        <span style={{ fontSize: 9, color: '#b87c1a', fontFamily: "'Oswald', sans-serif", opacity: 0.85 }}>■ Possível 3° lugar</span>
      </div>
    </div>
  );
}

// ─── GroupPanel ───────────────────────────────────────────────────────────────
function GroupPanel({ groupKey, predictions, onChange, theme: t, isPublic }) {
  const group = GROUPS[groupKey];
  const matches = getGroupMatches(groupKey);
  const standings = useMemo(() => computeStandings(groupKey, predictions), [groupKey, predictions]);
  const inputRefs = useRef([]);

  const advanceFrom = (matchIdx, side) => {
    if (side === 'home') {
      const ref = inputRefs.current[matchIdx * 2 + 1];
      if (ref) { ref.focus(); ref.select?.(); }
    } else {
      const ref = inputRefs.current[(matchIdx + 1) * 2];
      if (ref) { ref.focus(); ref.select?.(); }
      if (matchIdx === matches.length - 1) document.activeElement?.blur();
    }
  };

  // Halftone dots for band: visible on light paper, subtle on dark
  const halftone = `radial-gradient(circle, rgba(255,255,255,${t.isDark ? '0.06' : '0.14'}) 1px, transparent 1px)`;
  const paperBg = t.isDark ? t.paper : (t.paperBg || 'rgba(255,252,224,0.99)');
  const lineColor = t.isDark ? t.line : (t.divider || 'rgba(0,0,0,0.06)');
  const lineSpacing = t.isDark ? 32 : 27;

  return (
    <div style={{
      border: `1px solid ${t.border}`,
      borderRadius: t.cardRadius ?? 16,
      overflow: 'hidden',
      boxShadow: t.shadow || `0 0 40px ${t.glow}, 0 2px 12px rgba(0,0,0,0.5)`,
    }}>

      {/* ── Band Header ───────────────────────────────────────────── */}
      <div style={{
        background: t.bandBg,
        backgroundImage: `${halftone}, linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)`,
        backgroundSize: '6px 6px, auto',
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 10,
      }}>
        {/* Left: bandeiras dos times */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          {group.teams.map(team => (
            <Flag key={team.id} code={team.flag} size={t.isDark ? 26 : 22} />
          ))}
        </div>

        {/* Right: nome do grupo */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontSize: 8, letterSpacing: 2.5,
            color: t.isDark ? t.muted : `${t.bandText}aa`,
            fontFamily: "'Oswald', sans-serif",
          }}>
            COPA DO MUNDO
          </div>
          <div style={{
            fontSize: t.isDark ? 20 : 22,
            fontWeight: 900,
            color: t.isDark ? t.primary : t.bandText,
            fontFamily: "'Oswald', sans-serif",
            letterSpacing: t.isDark ? 1 : 2,
            lineHeight: 1,
            textShadow: t.isDark ? `0 0 20px ${t.glow}` : 'none',
          }}>
            {group.name}
          </div>
        </div>
      </div>

      {/* ── Card Body ──────────────────────────────────────────────── */}
      <div style={{
        background: paperBg,
        backgroundImage: t.isDark
          ? `${paperLines(lineColor, lineSpacing)}, ${noise}`
          : paperLines(lineColor, lineSpacing),
        padding: '12px 12px 16px',
      }}>

        {/* Partidas */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {matches.map(({ id, home, away }, matchIdx) => {
            const p = predictions[id] || { home: '', away: '' };
            const filled = p.home !== '' && p.away !== '';
            const info = MATCH_INFO[id];

            return (
              <div key={id}>
                {/* Linha de data + estádio */}
                {info && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: `${matchIdx === 0 ? 2 : 8}px 4px 3px`,
                  }}>
                    <span style={{
                      fontSize: 10, color: t.muted,
                      fontFamily: t.captionFont || "'Courier New', monospace",
                      letterSpacing: -0.2,
                    }}>
                      {fmtDate(info.date)}
                    </span>
                    <span style={{ fontSize: 9, color: t.muted, opacity: 0.45 }}>·</span>
                    <span style={{
                      fontSize: 10, color: t.muted,
                      fontFamily: t.captionFont || "'Courier New', monospace",
                      flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      letterSpacing: -0.2,
                    }}>
                      {STADIUMS[info.stadium]?.name || info.stadium}
                    </span>
                    <StadiumTooltip stadiumKey={info.stadium} date={info.date} theme={t} />
                  </div>
                )}

                {/* Linha de placar */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 4px 5px',
                  borderRadius: t.isDark ? 8 : 2,
                  background: filled && t.isDark ? `rgba(${hexToRgb(t.primary)}, 0.07)` : 'transparent',
                  animation: filled ? 'copaFillRow 0.3s ease' : undefined,
                }}>
                  {/* Casa */}
                  <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: 5,
                    justifyContent: 'flex-end', minWidth: 0,
                  }}>
                    <span style={{
                      fontSize: t.isDark ? 13 : 11,
                      fontWeight: t.isDark ? 600 : 700,
                      color: t.text,
                      fontFamily: t.isDark ? t.font : "'Oswald', sans-serif",
                      textAlign: 'right', lineHeight: 1.2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      letterSpacing: t.isDark ? 0 : 0.2,
                    }}>
                      {home.name}
                    </span>
                    <Flag code={home.flag} size={t.isDark ? 22 : 20} />
                  </div>

                  {/* Placar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    <ScoreInput
                      value={p.home}
                      onChange={v => onChange(id, 'home', v)}
                      onAdvance={() => advanceFrom(matchIdx, 'home')}
                      theme={t} disabled={isPublic}
                      inputRef={el => { inputRefs.current[matchIdx * 2] = el; }}
                    />
                    <span style={{
                      fontSize: t.scoreSep ? 13 : 17,
                      color: t.muted,
                      fontWeight: t.scoreSep ? 900 : 300,
                      fontFamily: t.scoreSep ? "'Oswald', sans-serif" : 'monospace',
                      paddingBottom: 2, userSelect: 'none',
                      letterSpacing: t.scoreSep ? 1 : 0,
                      opacity: t.scoreSep ? 1 : 0.7,
                    }}>
                      {t.scoreSep || '×'}
                    </span>
                    <ScoreInput
                      value={p.away}
                      onChange={v => onChange(id, 'away', v)}
                      onAdvance={() => advanceFrom(matchIdx, 'away')}
                      theme={t} disabled={isPublic}
                      inputRef={el => { inputRefs.current[matchIdx * 2 + 1] = el; }}
                    />
                  </div>

                  {/* Visitante */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                    <Flag code={away.flag} size={t.isDark ? 22 : 20} />
                    <span style={{
                      fontSize: t.isDark ? 13 : 11,
                      fontWeight: t.isDark ? 600 : 700,
                      color: t.text,
                      fontFamily: t.isDark ? t.font : "'Oswald', sans-serif",
                      lineHeight: 1.2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      letterSpacing: t.isDark ? 0 : 0.2,
                    }}>
                      {away.name}
                    </span>
                  </div>

                  {/* Visto de gol no dark */}
                  {filled && t.isDark && (
                    <Check size={12} color={t.accent} style={{ flexShrink: 0, animation: 'copaCheckIn 0.35s ease', opacity: 0.8 }} />
                  )}
                </div>

                {/* Divisor fino entre partidas (temas claros) */}
                {matchIdx < matches.length - 1 && !t.isDark && (
                  <div style={{
                    height: 1,
                    background: `repeating-linear-gradient(90deg, ${t.divider} 0 4px, transparent 4px 8px)`,
                    margin: '2px 4px 0',
                    opacity: 0.7,
                  }} />
                )}
              </div>
            );
          })}
        </div>

        <StandingsTable standings={standings} theme={t} />
      </div>
    </div>
  );
}

// ─── KnockoutTeamSlot ─────────────────────────────────────────────────────────
function KnockoutTeamSlot({ team, isWinner, isPicked, onPick, theme: t, isPublic, side }) {
  const prevTeamRef = useRef(null);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (team && !prevTeamRef.current) setAnimKey(k => k + 1);
    prevTeamRef.current = team;
  }, [team?.id]);

  const canPick = !isPublic && onPick && team && !team.isTBD;
  const inkColor = isPicked ? t.inkPick : t.inkAuto;
  const isActive = team && !team.isTBD;

  return (
    <div
      onClick={canPick ? onPick : undefined}
      style={{
        flex: 1, display: 'flex', alignItems: 'center',
        gap: 5, padding: '7px 9px',
        borderRadius: 7,
        background: isWinner
          ? `rgba(${hexToRgb(t.primary)}, ${t.isDark ? 0.12 : 0.08})`
          : canPick
            ? `rgba(255,255,255,${t.isDark ? '0.03' : '0.5'})`
            : 'transparent',
        border: isWinner
          ? `1.5px solid ${t.primary}`
          : canPick
            ? `1px dashed ${t.border}`
            : `1px solid transparent`,
        cursor: canPick ? 'pointer' : 'default',
        transition: 'all 0.2s',
        justifyContent: side === 'right' ? 'flex-end' : 'flex-start',
        animation: isWinner ? 'copaPickGlow 0.6s ease' : undefined,
        flexShrink: 0, maxWidth: '46%', minWidth: 0,
      }}>
      {isActive && side === 'right' && (
        <span key={`name-${animKey}`} style={{
          fontSize: 12, fontWeight: isPicked ? 700 : 600,
          color: isWinner ? t.primary : inkColor,
          fontFamily: t.isDark ? "'Caveat', cursive" : "'Oswald', sans-serif",
          letterSpacing: 0.3, lineHeight: 1.2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          animation: animKey > 0 ? 'copaWriteIn 0.45s ease both' : undefined,
          textAlign: 'right',
        }}>{team.name}</span>
      )}
      {isActive && <Flag code={team.flag} size={20} />}
      {isActive && side === 'left' && (
        <span key={`name-${animKey}`} style={{
          fontSize: 12, fontWeight: isPicked ? 700 : 600,
          color: isWinner ? t.primary : inkColor,
          fontFamily: t.isDark ? "'Caveat', cursive" : "'Oswald', sans-serif",
          letterSpacing: 0.3, lineHeight: 1.2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          animation: animKey > 0 ? 'copaWriteIn 0.45s ease both' : undefined,
        }}>{team.name}</span>
      )}
      {!isActive && (
        <span style={{ fontSize: 12, color: t.muted, fontFamily: "'Caveat', cursive", opacity: 0.5 }}>
          {team?.isTBD ? 'Melhor 3°' : '?'}
        </span>
      )}
    </div>
  );
}

// ─── KnockoutMatchCard ────────────────────────────────────────────────────────
function KnockoutMatchCard({ match, team1, team2, winner, onPickWinner, theme: t, isPublic }) {
  const st = STADIUMS[match.stadium];
  const canPick = !isPublic && team1 && !team1.isTBD && team2 && !team2.isTBD;
  const paperBg = t.isDark ? t.paper : (t.paperBg || 'rgba(255,252,224,0.98)');

  return (
    <div style={{
      background: paperBg,
      backgroundImage: t.isDark ? noise : undefined,
      border: `1px solid ${winner ? t.border : `rgba(${hexToRgb(t.primary)},0.12)`}`,
      borderRadius: t.isDark ? 10 : 4,
      padding: '8px 10px',
      transition: 'all 0.2s',
    }}>
      {/* Data + Estádio */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
        <span style={{ fontSize: 10, color: t.muted, fontFamily: t.captionFont || "'Courier New', monospace", letterSpacing: -0.2 }}>
          {fmtDate(match.date)}
        </span>
        {st && <>
          <span style={{ fontSize: 9, color: t.muted, opacity: 0.4 }}>·</span>
          <span style={{ fontSize: 10, color: t.muted, fontFamily: t.captionFont || "'Courier New', monospace", flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: -0.2 }}>
            {st.name}
          </span>
        </>}
        <StadiumTooltip stadiumKey={match.stadium} date={match.date} theme={t} />
      </div>

      {/* Times */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <KnockoutTeamSlot
          team={team1} isWinner={winner?.id === team1?.id} isPicked={false}
          onPick={canPick ? () => onPickWinner?.(team1.id) : undefined}
          theme={t} isPublic={isPublic} side="left"
        />
        <span style={{ fontSize: 11, color: t.muted, fontFamily: "'Oswald', sans-serif", flexShrink: 0, opacity: 0.6 }}>×</span>
        <KnockoutTeamSlot
          team={team2} isWinner={winner?.id === team2?.id} isPicked={false}
          onPick={canPick ? () => onPickWinner?.(team2.id) : undefined}
          theme={t} isPublic={isPublic} side="right"
        />
      </div>

      {canPick && !winner && (
        <div style={{ fontSize: 9, color: t.muted, textAlign: 'center', marginTop: 4, fontFamily: "'Oswald', sans-serif", letterSpacing: 0.8, opacity: 0.55 }}>
          TOQUE PARA AVANÇAR →
        </div>
      )}
    </div>
  );
}

// ─── ChampionStamp ────────────────────────────────────────────────────────────
function ChampionStamp({ champion, theme: t }) {
  const sc = t.scoreColor || t.accent;
  return (
    <div style={{
      textAlign: 'center',
      margin: '18px 4px 4px',
      padding: '22px 20px 18px',
      border: `3px solid ${t.accent}`,
      borderRadius: t.isDark ? 12 : 6,
      background: t.isDark
        ? `rgba(${hexToRgb(t.accent)}, 0.07)`
        : `rgba(${hexToRgb(t.accent)}, 0.12)`,
      boxShadow: `0 0 0 1px rgba(${hexToRgb(t.accent)}, 0.25), inset 0 0 40px rgba(${hexToRgb(t.accent)}, 0.04)`,
      animation: 'stampIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      position: 'relative',
    }}>
      {/* Topo decorativo */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        marginBottom: 12,
      }}>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${t.accent})` }} />
        <span style={{ fontSize: 18 }}>🏆</span>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${t.accent}, transparent)` }} />
      </div>

      <div style={{ fontSize: 10, letterSpacing: 4, color: t.accent, fontFamily: "'Oswald', sans-serif", marginBottom: 14, opacity: 0.9 }}>
        CAMPEÃO MUNDIAL
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <Flag code={champion.flag} size={52} />
      </div>

      <div style={{
        fontSize: 30, fontWeight: 900,
        color: t.isDark ? t.accent : (t.scoreColor || t.accent),
        fontFamily: "'Oswald', sans-serif",
        letterSpacing: 3, lineHeight: 1, marginBottom: 6,
        textShadow: t.isDark ? `0 0 30px ${t.glow}` : 'none',
      }}>
        {champion.name.toUpperCase()}
      </div>

      <div style={{ fontSize: 10, letterSpacing: 3, color: t.muted, fontFamily: "'Oswald', sans-serif" }}>
        COPA DO MUNDO 2026
      </div>

      {/* Rodapé decorativo */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        marginTop: 14,
      }}>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${t.accent})` }} />
        <span style={{ fontSize: 12, color: t.accent, fontFamily: "'Oswald', sans-serif", letterSpacing: 2 }}>★★★</span>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${t.accent}, transparent)` }} />
      </div>
    </div>
  );
}

// ─── KnockoutBracket ──────────────────────────────────────────────────────────
function KnockoutBracket({ predictions, knockoutPicks, onPickWinner, theme: t, isPublic }) {
  const resolvedSlots = useMemo(() => resolveKnockoutSlots(predictions), [predictions]);
  const [openRound, setOpenRound] = useState('r32');

  const paperBg = t.isDark ? t.paper : (t.paperBg || 'rgba(255,252,224,0.99)');
  const lineColor = t.isDark ? t.line : (t.divider || 'rgba(0,0,0,0.06)');
  const halftone = `radial-gradient(circle, rgba(255,255,255,${t.isDark ? '0.06' : '0.14'}) 1px, transparent 1px)`;

  const groupsDone = useMemo(() => {
    return Object.keys(GROUPS).filter(gk => groupProgress(gk, predictions).complete).length;
  }, [predictions]);

  const getTeams = (slot1, slot2) => ({
    team1: resolveSlot(slot1, resolvedSlots, knockoutPicks),
    team2: resolveSlot(slot2, resolvedSlots, knockoutPicks),
  });

  const getWinner = (matchId) => {
    const winnerId = knockoutPicks?.[matchId];
    if (!winnerId) return null;
    for (const gk of Object.keys(GROUPS)) {
      const team = GROUPS[gk].teams.find(tm => tm.id === winnerId);
      if (team) return team;
    }
    return null;
  };

  const champion = getWinner('final_01');

  return (
    <div style={{
      border: `1px solid ${t.border}`,
      borderRadius: t.cardRadius ?? 16,
      overflow: 'hidden',
      boxShadow: t.shadow || `0 0 40px ${t.glow}, 0 2px 12px rgba(0,0,0,0.5)`,
    }}>

      {/* ── Band Header ── */}
      <div style={{
        background: t.bandBg,
        backgroundImage: `${halftone}, linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)`,
        backgroundSize: '6px 6px, auto',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontSize: t.isDark ? 22 : 20,
            fontWeight: 900,
            color: t.isDark ? t.primary : t.bandText,
            fontFamily: "'Oswald', sans-serif",
            letterSpacing: t.isDark ? 1 : 2,
            lineHeight: 1,
            textShadow: t.isDark ? `0 0 20px ${t.glow}` : 'none',
          }}>
            🏆 CHAVEAMENTO
          </div>
          <div style={{ fontSize: 9, color: t.isDark ? t.muted : `${t.bandText}aa`, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, marginTop: 2 }}>
            COPA DO MUNDO 2026 · FASE ELIMINATÓRIA
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, color: t.isDark ? t.muted : `${t.bandText}99`, fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5 }}>
            Grupos completos
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: groupsDone === 12 ? t.accent : (t.isDark ? t.primary : t.bandText), fontFamily: "'Oswald', sans-serif" }}>
            {groupsDone}/12
          </div>
        </div>
      </div>

      {/* ── Card Body ── */}
      <div style={{
        background: paperBg,
        backgroundImage: t.isDark ? `${paperLines(lineColor, 32)}, ${noise}` : paperLines(lineColor, 27),
        padding: '14px 14px 18px',
      }}>

        {/* Legenda de cores */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 16, height: 3, background: t.inkAuto, borderRadius: 2 }} />
            <span style={{ fontSize: 9, color: t.muted, fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5 }}>Preenchido automático</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 16, height: 3, background: t.inkPick, borderRadius: 2 }} />
            <span style={{ fontSize: 9, color: t.muted, fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5 }}>Sua escolha de vencedor</span>
          </div>
        </div>

        <div style={{ height: 1, background: t.isDark ? t.border : t.divider, marginBottom: 14, opacity: 0.5 }} />

        {/* Tabs de rodadas */}
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 6, marginBottom: 12, scrollbarWidth: 'none' }}>
          {KNOCKOUT_ROUNDS.map(round => (
            <button key={round.id} onClick={() => setOpenRound(round.id)}
              style={{
                flexShrink: 0, padding: '6px 11px', borderRadius: t.isDark ? 8 : 4, cursor: 'pointer',
                border: `1.5px solid ${openRound === round.id ? t.primary : t.border}`,
                background: openRound === round.id ? `rgba(${hexToRgb(t.primary)},0.15)` : 'transparent',
                color: openRound === round.id ? t.primary : t.muted,
                fontSize: 11, fontWeight: 700, fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5,
                transition: 'all 0.15s',
              }}>
              {round.shortLabel}
              {/* Dot indicator if final round has champion */}
              {round.id === 'final' && champion && (
                <span style={{ marginLeft: 4, fontSize: 10 }}>🏆</span>
              )}
            </button>
          ))}
        </div>

        {/* Partidas da rodada selecionada */}
        {KNOCKOUT_ROUNDS.filter(r => r.id === openRound).map(round => (
          <div key={round.id}>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.accent, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, marginBottom: 10 }}>
              {round.label}{' '}
              <span style={{ color: t.muted, fontWeight: 400, fontSize: 10 }}>· {round.dates}</span>
            </div>

            {/* Aviso de grupos incompletos para o R32 */}
            {round.id === 'r32' && groupsDone < 12 && (
              <div style={{
                padding: '10px 14px', borderRadius: t.isDark ? 8 : 4,
                background: `rgba(${hexToRgb(t.primary)},0.06)`,
                border: `1px dashed ${t.border}`,
                marginBottom: 12,
              }}>
                <div style={{ fontSize: 12, color: t.muted, fontFamily: "'Patrick Hand', cursive", lineHeight: 1.5 }}>
                  ✏️ Preencha os placares dos grupos para ver o chaveamento automático!
                  <br />
                  <span style={{ fontSize: 11, color: t.inkAuto }}>Os times classificados aparecem aqui em tinta azul, como se alguém os fosse escrevendo à mão.</span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {round.matches.map((match, idx) => {
                const { team1, team2 } = getTeams(match.slot1, match.slot2);
                const winner = getWinner(match.id);
                return (
                  <div key={match.id}>
                    {round.id === 'r32' && idx > 0 && idx % 4 === 0 && (
                      <div style={{ height: 1, background: t.isDark ? t.border : t.divider, opacity: 0.35, margin: '4px 0' }} />
                    )}
                    <KnockoutMatchCard
                      match={match}
                      team1={team1} team2={team2} winner={winner}
                      onPickWinner={!isPublic ? (teamId) => onPickWinner(match.id, teamId) : undefined}
                      theme={t} isPublic={isPublic}
                    />
                  </div>
                );
              })}
            </div>

            {/* Carimbo do Campeão — apenas na final */}
            {round.id === 'final' && champion && (
              <ChampionStamp champion={champion} theme={t} />
            )}
          </div>
        ))}

        {/* Nota de rodapé */}
        <div style={{ marginTop: 16, padding: '8px 12px', borderRadius: t.isDark ? 8 : 4, background: `rgba(${hexToRgb(t.primary)},0.04)`, border: `1px solid ${t.isDark ? t.border : t.divider}` }}>
          <div style={{ fontSize: 11, color: t.muted, fontFamily: "'Patrick Hand', cursive", lineHeight: 1.6 }}>
            📝 Os slots dos <strong style={{ color: t.inkAuto }}>16 Avos</strong> são preenchidos automaticamente conforme você completa os grupos.
            Toque nos times para avançá-los ao próximo round — o chaveamento vai se completando como uma tabelinha de papel! 🏆
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CopaShareView (leitura pública, sem auth) ────────────────────────────────
export function CopaShareView({ shareUID }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [themeId, setThemeId] = useState('copa2026');
  const [activeGroup, setActiveGroup] = useState('C');
  const [activeTab, setActiveTab] = useState('grupos');

  useEffect(() => {
    if (!shareUID) return;
    getDoc(doc(db, 'publicBoloes', shareUID))
      .then(snap => {
        if (snap.exists()) {
          const d = snap.data();
          setData(d);
          if (d.theme) setThemeId(d.theme);
        }
      })
      .finally(() => setLoading(false));
  }, [shareUID]);

  const t = THEMES[themeId] || THEMES.copa2026;

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07071a' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 40 }}>🏆</span>
        <div style={{ fontSize: 13, color: '#8888bb', fontFamily: "'Oswald', sans-serif", letterSpacing: 2 }}>CARREGANDO BOLÃO...</div>
      </div>
    </div>
  );

  if (!data) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#07071a', color: '#fff', gap: 16, padding: 32, textAlign: 'center' }}>
      <span style={{ fontSize: 56 }}>🏆</span>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Oswald', sans-serif" }}>Bolão não encontrado</div>
      <div style={{ fontSize: 14, color: '#8888bb' }}>Este link pode ter expirado ou o bolão foi removido.</div>
      <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, background: '#FFD700', color: '#000', fontWeight: 700, fontSize: 14, padding: '12px 20px', borderRadius: 10, textDecoration: 'none' }}>
        <Trophy size={15} /> Criar meu bolão na Banca Lógica
      </a>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: t.bg, color: t.text, fontFamily: t.font, filter: t.sepia ? `sepia(${t.sepia})` : undefined }}>
      <CopaInner
        user={null} isPublic={true}
        themeId={themeId} setThemeId={setThemeId}
        activeGroup={activeGroup} setActiveGroup={setActiveGroup}
        activeTab={activeTab} setActiveTab={setActiveTab}
        predictions={data.predictions || {}}
        knockoutPicks={data.knockoutPicks || {}}
        onChange={() => {}} onPickWinner={() => {}}
        ownerName={data.ownerName}
        saved={false} setSaved={() => {}} saving={false}
        onShare={() => {}} shareToast={''}
      />
      {/* CTA */}
      <div style={{
        position: 'sticky', bottom: 0, zIndex: 100,
        background: `linear-gradient(135deg, ${t.primary}dd 0%, #0d0d20 100%)`,
        borderTop: `1px solid ${t.border}`,
        padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
        backdropFilter: 'blur(12px)',
        boxShadow: `0 -4px 32px ${t.glow}`,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5 }}>
            Faça o seu bolão! 🏆
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
            Registre apostas e análises profissionais em Banca Lógica
          </div>
        </div>
        <a href="https://bancalogica.app" target="_blank" rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#FFD700', color: '#000', fontWeight: 800,
            fontSize: 13, padding: '10px 18px', borderRadius: 10,
            textDecoration: 'none', whiteSpace: 'nowrap',
            fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5,
            boxShadow: '0 2px 12px rgba(255,215,0,0.4)',
          }}>
          <ExternalLink size={14} /> Acessar Banca Lógica
        </a>
      </div>
    </div>
  );
}

// ─── CopaInner (layout principal compartilhado) ────────────────────────────────
function CopaInner({
  user, isPublic, themeId, setThemeId,
  activeGroup, setActiveGroup,
  activeTab, setActiveTab,
  predictions, knockoutPicks, onChange, onPickWinner,
  ownerName, saved, setSaved, saving, onShare, shareToast,
}) {
  const t = THEMES[themeId];
  const groupKeys = Object.keys(GROUPS);
  const groupRef = useRef(null);

  // Injeta fontes e animações
  useEffect(() => {
    if (!document.getElementById('copa-animations')) {
      const style = document.createElement('style');
      style.id = 'copa-animations';
      style.textContent = COPA_STYLES;
      document.head.appendChild(style);
    }
  }, []);

  const scrollGroup = (dir) => {
    const idx = groupKeys.indexOf(activeGroup);
    setActiveGroup(groupKeys[Math.max(0, Math.min(groupKeys.length - 1, idx + dir))]);
  };

  const totalProgress = useMemo(() => {
    let filled = 0, total = 0;
    groupKeys.forEach(k => { const p = groupProgress(k, predictions); filled += p.filled; total += p.total; });
    return { filled, total, pct: total > 0 ? Math.round((filled / total) * 100) : 0 };
  }, [predictions, groupKeys]);

  useEffect(() => {
    if (groupRef.current) groupRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeGroup]);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px 120px' }}>

      {/* ── Header editorial ── */}
      <div style={{
        textAlign: 'center', paddingTop: 28, paddingBottom: 18,
        borderBottom: `1px solid ${t.isDark ? t.border : t.divider}`,
        marginBottom: 20,
      }}>
        {/* Logotipo + subtítulo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
          <img src="/logo-banca-logica.png" alt="Banca Lógica"
            style={{ width: 44, height: 44, borderRadius: 10, boxShadow: `0 0 16px ${t.glow}`, objectFit: 'cover' }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: t.text, letterSpacing: 0.5, fontFamily: "'Oswald', sans-serif", lineHeight: 1 }}>
              BANCA LÓGICA
            </div>
            <div style={{ fontSize: 10, color: t.muted, letterSpacing: 1.5, fontFamily: "'Oswald', sans-serif", display: 'flex', alignItems: 'center', gap: 5 }}>
              {isPublic ? `BOLÃO DE ${(ownerName || 'USUÁRIO').toUpperCase()}` : 'MEU BOLÃO DA COPA'}
              {!isPublic && saving && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: t.accent, fontSize: 10 }}>
                  <Loader2 size={10} style={{ animation: 'copaSpin 1s linear infinite' }} /> salvando
                </span>
              )}
              {!isPublic && saved && !saving && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: t.accent, fontSize: 10 }}>
                  <Check size={10} /> salvo
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Masthead principal */}
        <div style={{
          fontSize: 38, fontWeight: 900, color: t.primary,
          fontFamily: "'Oswald', sans-serif", letterSpacing: 3, lineHeight: 1,
          marginBottom: 4,
          textShadow: t.isDark ? `0 0 40px ${t.glow}` : 'none',
        }}>
          {t.emoji} COPA DO MUNDO
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: t.accent, fontFamily: "'Oswald', sans-serif", letterSpacing: 5, marginBottom: 4 }}>
          {t.year} · {t.name.toUpperCase()}
        </div>
        <div style={{ fontSize: 12, color: t.muted, fontFamily: t.font, fontStyle: 'italic', marginBottom: 16, opacity: 0.9 }}>
          "{t.tagline}"
        </div>

        {/* Barra de progresso */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 9, color: t.muted, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5 }}>
              {isPublic ? `PREVISÕES DE ${(ownerName || 'USUÁRIO').toUpperCase()}` : 'PROGRESSO DO BOLÃO'}
            </span>
            <span style={{ fontSize: 9, color: t.primary, fontFamily: "'Oswald', sans-serif", fontWeight: 700 }}>
              {totalProgress.filled}/{totalProgress.total} jogos · {totalProgress.pct}%
            </span>
          </div>
          <div style={{ height: 4, background: `rgba(${hexToRgb(t.primary)}, 0.15)`, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${totalProgress.pct}%`,
              background: `linear-gradient(90deg, ${t.primary}, ${t.accent})`,
              borderRadius: 2, transition: 'width 0.5s ease',
              boxShadow: `0 0 8px ${t.glow}`,
            }} />
          </div>
        </div>
      </div>

      {/* ── Seletor de tema ── */}
      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4, marginBottom: 18, scrollbarWidth: 'none' }}>
        {Object.values(THEMES).map(th => (
          <button key={th.id} onClick={() => !isPublic && setThemeId(th.id)} disabled={isPublic}
            style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7,
              padding: '7px 12px', borderRadius: t.isDark ? 20 : 4, cursor: isPublic ? 'default' : 'pointer',
              border: `1.5px solid ${themeId === th.id ? th.primary : t.border}`,
              background: themeId === th.id ? `rgba(${hexToRgb(th.primary)}, 0.15)` : 'transparent',
              transition: 'all 0.2s',
            }}>
            <span style={{ fontSize: 15 }}>{th.emoji}</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: themeId === th.id ? th.primary : t.muted, fontFamily: "'Oswald', sans-serif", lineHeight: 1.1 }}>
                {th.year}
              </div>
              {themeId === th.id && (
                <div style={{ fontSize: 8, color: t.muted, fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5 }}>{th.host}</div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* ── Tabs: Grupos | Chaveamento ── */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 18,
        borderRadius: t.isDark ? 12 : 4,
        overflow: 'hidden',
        border: `1px solid ${t.border}`,
      }}>
        {[
          { id: 'grupos',      label: '⚽ Fase de Grupos' },
          { id: 'chaveamento', label: '🏆 Chaveamento' },
        ].map((tab, i) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '11px 8px', cursor: 'pointer',
              background: activeTab === tab.id ? `rgba(${hexToRgb(t.primary)},0.16)` : 'transparent',
              border: 'none',
              borderRight: i === 0 ? `1px solid ${t.border}` : 'none',
              color: activeTab === tab.id ? t.primary : t.muted,
              fontSize: 12, fontWeight: 700, fontFamily: "'Oswald', sans-serif",
              letterSpacing: 0.5, transition: 'all 0.15s',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Conteúdo: Grupos ── */}
      {activeTab === 'grupos' && <>
        {/* Tabs de grupos */}
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 6, marginBottom: 14, scrollbarWidth: 'none' }}>
          {groupKeys.map(k => {
            const prog = groupProgress(k, predictions);
            const active = k === activeGroup;
            return (
              <button key={k} ref={active ? groupRef : null} onClick={() => setActiveGroup(k)}
                style={{
                  flexShrink: 0, width: 42, height: 44, borderRadius: t.isDark ? 10 : 4, cursor: 'pointer',
                  border: `1.5px solid ${active ? t.primary : prog.complete ? t.accent : t.border}`,
                  background: active ? `rgba(${hexToRgb(t.primary)}, 0.18)` : prog.complete ? `rgba(${hexToRgb(t.accent)}, 0.08)` : 'transparent',
                  color: active ? t.primary : prog.complete ? t.accent : t.muted,
                  fontSize: 12, fontWeight: 700, fontFamily: "'Oswald', sans-serif",
                  position: 'relative', transition: 'all 0.15s',
                  boxShadow: active ? `0 0 12px ${t.glow}` : 'none',
                }}>
                {k}
                {prog.complete && !active && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    width: 14, height: 14, borderRadius: '50%',
                    background: t.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'copaPulse 1.5s ease infinite',
                  }}>
                    <Check size={8} color="#000" strokeWidth={3} />
                  </span>
                )}
                {!prog.complete && prog.filled > 0 && (
                  <span style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', fontSize: 7, color: t.muted, fontFamily: 'monospace' }}>
                    {prog.filled}/6
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Navegação entre grupos */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button onClick={() => scrollGroup(-1)} disabled={activeGroup === 'A'}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'transparent', border: `1px solid ${t.border}`,
              color: t.muted, borderRadius: t.isDark ? 8 : 4, padding: '6px 12px',
              cursor: activeGroup === 'A' ? 'not-allowed' : 'pointer',
              opacity: activeGroup === 'A' ? 0.3 : 1,
              fontSize: 11, fontFamily: "'Oswald', sans-serif", transition: 'opacity 0.2s',
            }}>
            <ChevronLeft size={13} /> Anterior
          </button>
          <span style={{
            fontSize: 11, color: t.muted, fontFamily: "'Oswald', sans-serif",
            letterSpacing: 0.5, textAlign: 'center', maxWidth: 200,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {GROUPS[activeGroup].name} — {GROUPS[activeGroup].teams.map(tm => tm.name).join(', ')}
          </span>
          <button onClick={() => scrollGroup(1)} disabled={activeGroup === 'L'}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'transparent', border: `1px solid ${t.border}`,
              color: t.muted, borderRadius: t.isDark ? 8 : 4, padding: '6px 12px',
              cursor: activeGroup === 'L' ? 'not-allowed' : 'pointer',
              opacity: activeGroup === 'L' ? 0.3 : 1,
              fontSize: 11, fontFamily: "'Oswald', sans-serif", transition: 'opacity 0.2s',
            }}>
            Próximo <ChevronRight size={13} />
          </button>
        </div>

        {/* Painel do grupo */}
        <GroupPanel
          key={activeGroup}
          groupKey={activeGroup}
          predictions={predictions}
          onChange={onChange}
          theme={t}
          isPublic={isPublic}
        />
      </>}

      {/* ── Conteúdo: Chaveamento ── */}
      {activeTab === 'chaveamento' && (
        <KnockoutBracket
          predictions={predictions}
          knockoutPicks={knockoutPicks}
          onPickWinner={onPickWinner}
          theme={t}
          isPublic={isPublic}
        />
      )}

      {/* ── Rodapé: Compartilhar ── */}
      {!isPublic && (
        <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={onShare}
            style={{
              flex: 1, minWidth: 180,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '13px 20px', borderRadius: t.isDark ? 12 : 6, cursor: 'pointer',
              border: `1.5px solid ${shareToast ? t.accent : t.border}`,
              background: shareToast ? `rgba(${hexToRgb(t.accent)}, 0.1)` : 'transparent',
              color: shareToast ? t.accent : t.muted,
              fontSize: 12, fontWeight: 700, fontFamily: "'Oswald', sans-serif",
              transition: 'all 0.25s', letterSpacing: 0.5,
            }}>
            <Share2 size={14} />
            {shareToast || 'Compartilhar bolão'}
          </button>

          {totalProgress.pct === 100 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              color: t.accent, fontSize: 12, fontFamily: "'Oswald', sans-serif",
              background: `rgba(${hexToRgb(t.accent)}, 0.1)`,
              padding: '8px 14px', borderRadius: t.isDark ? 10 : 4,
              border: `1px solid rgba(${hexToRgb(t.accent)}, 0.3)`,
            }}>
              <Trophy size={13} /> Bolão completo!
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CopaPage (autenticado) ───────────────────────────────────────────────────
export function CopaPage({ user }) {
  const [themeId, setThemeId] = useState(() => localStorage.getItem('copaTheme') || 'copa2026');
  const [activeGroup, setActiveGroup] = useState('C');
  const [activeTab, setActiveTab] = useState('grupos');
  const [predictions, setPredictions] = useState({});
  const [knockoutPicks, setKnockoutPicks] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shareToast, setShareToast] = useState('');
  const saveTimer = useRef(null);

  const t = THEMES[themeId];

  // Carrega do Firestore
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'boloes', user.uid)).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.predictions)   setPredictions(d.predictions);
        if (d.knockoutPicks) setKnockoutPicks(d.knockoutPicks);
        if (d.theme)         setThemeId(d.theme);
      }
    });
  }, [user]);

  const handleThemeChange = (id) => {
    setThemeId(id);
    localStorage.setItem('copaTheme', id);
  };

  const autoSave = async (preds, koPicks, theme) => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'boloes', user.uid), {
        predictions: preds,
        knockoutPicks: koPicks,
        theme,
        ownerName: user.displayName || user.email?.split('@')[0] || 'Usuário',
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (_) {}
    setSaving(false);
  };

  const scheduleAutoSave = (preds, koPicks) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => autoSave(preds, koPicks, themeId), 2000);
  };

  const handleChange = (matchId, side, value) => {
    const v = value === '' ? '' : String(Math.max(0, Math.min(30, parseInt(value) || 0)));
    setPredictions(prev => {
      const next = { ...prev, [matchId]: { ...(prev[matchId] || {}), [side]: v } };
      scheduleAutoSave(next, knockoutPicks);
      return next;
    });
    setSaved(false);
  };

  const handlePickWinner = (matchId, teamId) => {
    setKnockoutPicks(prev => {
      const next = { ...prev, [matchId]: teamId };
      scheduleAutoSave(predictions, next);
      return next;
    });
    setSaved(false);
  };

  const handleShare = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'publicBoloes', user.uid), {
        predictions,
        knockoutPicks,
        theme: themeId,
        ownerName: user.displayName || user.email?.split('@')[0] || 'Usuário',
        updatedAt: new Date().toISOString(),
      });
      const url = `${window.location.origin}/copa?share=${user.uid}`;
      await navigator.clipboard.writeText(url);
      setShareToast('Link copiado! 🏆');
      setTimeout(() => setShareToast(''), 4000);
    } catch (_) {
      setShareToast('Erro ao compartilhar');
      setTimeout(() => setShareToast(''), 3000);
    }
    setSaving(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: t.bg, filter: t.sepia ? `sepia(${t.sepia})` : undefined }}>
      <CopaInner
        user={user} isPublic={false}
        themeId={themeId} setThemeId={handleThemeChange}
        activeGroup={activeGroup} setActiveGroup={setActiveGroup}
        activeTab={activeTab} setActiveTab={setActiveTab}
        predictions={predictions} knockoutPicks={knockoutPicks}
        onChange={handleChange} onPickWinner={handlePickWinner}
        ownerName={user?.displayName || user?.email?.split('@')[0]}
        saved={saved} setSaved={setSaved} saving={saving}
        onShare={handleShare} shareToast={shareToast}
      />
    </div>
  );
}
