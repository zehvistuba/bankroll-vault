// ─── Copa do Mundo 2026 — Dados Oficiais ──────────────────────────────────────
// Grupos confirmados após sorteio. Início: 11 de junho de 2026.

export const GROUPS = {
  A: { name: 'Grupo A', teams: [
    { id: 'MEX', name: 'México',           flag: 'mx' },
    { id: 'ZAF', name: 'África do Sul',    flag: 'za' },
    { id: 'KOR', name: 'Coreia do Sul',    flag: 'kr' },
    { id: 'CZE', name: 'Rep. Tcheca',      flag: 'cz' },
  ]},
  B: { name: 'Grupo B', teams: [
    { id: 'CAN', name: 'Canadá',           flag: 'ca' },
    { id: 'SUI', name: 'Suíça',            flag: 'ch' },
    { id: 'QAT', name: 'Qatar',            flag: 'qa' },
    { id: 'BIH', name: 'Bósnia-Herz.',    flag: 'ba' },
  ]},
  C: { name: 'Grupo C', teams: [
    { id: 'BRA', name: 'Brasil',           flag: 'br' },
    { id: 'MAR', name: 'Marrocos',         flag: 'ma' },
    { id: 'HAI', name: 'Haiti',            flag: 'ht' },
    { id: 'SCO', name: 'Escócia',          flag: 'gb-sct' },
  ]},
  D: { name: 'Grupo D', teams: [
    { id: 'USA', name: 'EUA',              flag: 'us' },
    { id: 'PAR', name: 'Paraguai',         flag: 'py' },
    { id: 'AUS', name: 'Austrália',        flag: 'au' },
    { id: 'TUR', name: 'Turquia',          flag: 'tr' },
  ]},
  E: { name: 'Grupo E', teams: [
    { id: 'GER', name: 'Alemanha',         flag: 'de' },
    { id: 'CUW', name: 'Curaçao',          flag: 'cw' },
    { id: 'CIV', name: 'Costa do Marfim',  flag: 'ci' },
    { id: 'ECU', name: 'Equador',          flag: 'ec' },
  ]},
  F: { name: 'Grupo F', teams: [
    { id: 'NED', name: 'Holanda',          flag: 'nl' },
    { id: 'JPN', name: 'Japão',            flag: 'jp' },
    { id: 'SWE', name: 'Suécia',           flag: 'se' },
    { id: 'TUN', name: 'Tunísia',          flag: 'tn' },
  ]},
  G: { name: 'Grupo G', teams: [
    { id: 'BEL', name: 'Bélgica',          flag: 'be' },
    { id: 'EGY', name: 'Egito',            flag: 'eg' },
    { id: 'IRN', name: 'Irã',              flag: 'ir' },
    { id: 'NZL', name: 'Nova Zelândia',    flag: 'nz' },
  ]},
  H: { name: 'Grupo H', teams: [
    { id: 'ESP', name: 'Espanha',          flag: 'es' },
    { id: 'CPV', name: 'Cabo Verde',       flag: 'cv' },
    { id: 'KSA', name: 'Arábia Saudita',  flag: 'sa' },
    { id: 'URU', name: 'Uruguai',          flag: 'uy' },
  ]},
  I: { name: 'Grupo I', teams: [
    { id: 'FRA', name: 'França',           flag: 'fr' },
    { id: 'SEN', name: 'Senegal',          flag: 'sn' },
    { id: 'NOR', name: 'Noruega',          flag: 'no' },
    { id: 'IRQ', name: 'Iraque',           flag: 'iq' },
  ]},
  J: { name: 'Grupo J', teams: [
    { id: 'ARG', name: 'Argentina',        flag: 'ar' },
    { id: 'ALG', name: 'Argélia',          flag: 'dz' },
    { id: 'AUT', name: 'Áustria',          flag: 'at' },
    { id: 'JOR', name: 'Jordânia',         flag: 'jo' },
  ]},
  K: { name: 'Grupo K', teams: [
    { id: 'POR', name: 'Portugal',         flag: 'pt' },
    { id: 'COD', name: 'Rep. D. Congo',   flag: 'cd' },
    { id: 'UZB', name: 'Uzbequistão',     flag: 'uz' },
    { id: 'COL', name: 'Colômbia',         flag: 'co' },
  ]},
  L: { name: 'Grupo L', teams: [
    { id: 'ENG', name: 'Inglaterra',       flag: 'gb-eng' },
    { id: 'CRO', name: 'Croácia',          flag: 'hr' },
    { id: 'GHA', name: 'Gana',             flag: 'gh' },
    { id: 'PAN', name: 'Panamá',           flag: 'pa' },
  ]},
};

/** Gera as 6 partidas round-robin de um grupo */
export function getGroupMatches(groupKey) {
  const { teams } = GROUPS[groupKey];
  const matches = [];
  for (let i = 0; i < 4; i++)
    for (let j = i + 1; j < 4; j++)
      matches.push({ id: `${groupKey}_${teams[i].id}_${teams[j].id}`, home: teams[i], away: teams[j] });
  return matches;
}

/** Calcula classificação de um grupo a partir das previsões */
export function computeStandings(groupKey, predictions = {}) {
  const { teams } = GROUPS[groupKey];
  const tbl = {};
  teams.forEach(t => { tbl[t.id] = { ...t, pts: 0, gf: 0, ga: 0, gd: 0, pj: 0, v: 0, e: 0, d: 0 }; });

  getGroupMatches(groupKey).forEach(({ id, home, away }) => {
    const p = predictions[id];
    if (!p || p.home === '' || p.away === '') return;
    const h = parseInt(p.home, 10), a = parseInt(p.away, 10);
    if (isNaN(h) || isNaN(a)) return;

    tbl[home.id].pj++; tbl[away.id].pj++;
    tbl[home.id].gf += h; tbl[home.id].ga += a;
    tbl[away.id].gf += a; tbl[away.id].ga += h;

    if (h > a)      { tbl[home.id].pts += 3; tbl[home.id].v++; tbl[away.id].d++; }
    else if (h < a) { tbl[away.id].pts += 3; tbl[away.id].v++; tbl[home.id].d++; }
    else            { tbl[home.id].pts++; tbl[home.id].e++; tbl[away.id].pts++; tbl[away.id].e++; }

    tbl[home.id].gd = tbl[home.id].gf - tbl[home.id].ga;
    tbl[away.id].gd = tbl[away.id].gf - tbl[away.id].ga;
  });

  return Object.values(tbl).sort((a, b) =>
    b.pts !== a.pts ? b.pts - a.pts :
    b.gd  !== a.gd  ? b.gd  - a.gd  :
    b.gf  - a.gf
  );
}

/** Retorna quantas partidas de um grupo foram preenchidas */
export function groupProgress(groupKey, predictions = {}) {
  const matches = getGroupMatches(groupKey);
  const filled = matches.filter(({ id }) => {
    const p = predictions[id];
    return p && p.home !== '' && p.away !== '' && !isNaN(parseInt(p.home)) && !isNaN(parseInt(p.away));
  });
  return { filled: filled.length, total: matches.length, complete: filled.length === matches.length };
}
