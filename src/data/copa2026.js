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
    { id: 'COD', name: 'R. D. Congo',      flag: 'cd' },
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

// ─── Estádios ─────────────────────────────────────────────────────────────────
export const STADIUMS = {
  AZTECA:     { name: 'Estadio Azteca',          city: 'Cidade do México, MX', cap: 87523, emoji: '🏟️', fact: 'Único estádio a sediar DUAS finais de Copa do Mundo (1970 e 1986). Lendário!' },
  BBVA:       { name: 'Estadio BBVA',            city: 'Monterrey, MX',        cap: 53500, emoji: '⚽', fact: 'Um dos estádios mais modernos da América Latina, inaugurado em 2015. Casa do Rayados.' },
  AKRON:      { name: 'Estadio Akron',           city: 'Guadalajara, MX',      cap: 46232, emoji: '🐐', fact: 'Casa do Chivas, o "time do povo" mexicano. Toda a estrutura foi projetada ao redor do futebol.' },
  METLIFE:    { name: 'MetLife Stadium',         city: 'East Rutherford, NJ',  cap: 82500, emoji: '🏆', fact: 'Palco da FINAL da Copa 2026! Maior estádio da competição. Fica do lado do Rio Hudson, com vista para Manhattan.' },
  ATT:        { name: 'AT&T Stadium',            city: 'Arlington, TX',        cap: 80000, emoji: '📺', fact: 'Lar do Dallas Cowboys. Possui a maior tela de telão interno do mundo — 160×72 pés!' },
  SOFI:       { name: 'SoFi Stadium',            city: 'Inglewood, CA',        cap: 70240, emoji: '💰', fact: 'O estádio mais caro dos EUA — US$ 5,5 bilhões. Abriu em 2020 e já sediou o Super Bowl LVI.' },
  LEVIS:      { name: "Levi's Stadium",          city: 'Santa Clara, CA',      cap: 68500, emoji: '☀️', fact: 'Primeiro estádio "verde" certificado da NFL, com painéis solares na cobertura. Sede do Super Bowl 50.' },
  ARROWHEAD:  { name: 'Arrowhead Stadium',       city: 'Kansas City, MO',      cap: 76416, emoji: '🔊', fact: 'Certificado pelo Guinness Book como o estádio mais barulhento do mundo. A torcida chega a 142 decibéis!' },
  ALLEGIANT:  { name: 'Allegiant Stadium',       city: 'Las Vegas, NV',        cap: 65000, emoji: '🎰', fact: 'Apelidado de "A Nave". Primeiro grande estádio no coração de Las Vegas — inaugurado em 2020.' },
  ROSEBOWL:   { name: 'Rose Bowl Stadium',       city: 'Pasadena, CA',         cap: 92542, emoji: '🌹', fact: 'Sede da Final de 1994 — Brasil 3×2 Itália nos pênaltis. Romário, Bebeto e o grito de campeão do Parreira.' },
  LUMENFIELD: { name: 'Lumen Field',             city: 'Seattle, WA',          cap: 69000, emoji: '⚡', fact: 'O barulho da torcida do Seattle Seahawks já causou microtremores detectados por sismógrafo. Sério!' },
  LINCOLN:    { name: 'Lincoln Financial Field', city: 'Filadélfia, PA',       cap: 69179, emoji: '🗽', fact: 'Cidade onde a Declaração de Independência dos EUA foi assinada. Torcedores do Eagles são os mais bravos da NFL.' },
  HARDROCK:   { name: 'Hard Rock Stadium',       city: 'Miami Gardens, FL',    cap: 65326, emoji: '🌴', fact: 'Miami, a mais latina das cidades americanas. Calor, música e futebol com sabor caribenho.' },
  BCPLACE:    { name: 'BC Place',                city: 'Vancouver, Canadá',    cap: 54500, emoji: '🍁', fact: 'Palco da cerimônia de ABERTURA da Copa 2026! Único estádio da América do Norte com teto retrátil de cabo.' },
  BMOFIELD:   { name: 'BMO Field',               city: 'Toronto, Canadá',      cap: 45736, emoji: '🏙️', fact: 'O coração do futebol canadense. O Toronto FC foi o primeiro clube MLS a ganhar o triplete (2017).' },
};

// ─── Calendário de Partidas (fase de grupos) ──────────────────────────────────
// IDs gerados por getGroupMatches: `${grupo}_${time1.id}_${time2.id}` (i < j)
export const MATCH_INFO = {
  // GRUPO A — México, África do Sul, Coreia do Sul, Rep. Tcheca
  'A_MEX_ZAF': { date: '2026-06-11', stadium: 'AZTECA'    },
  'A_KOR_CZE': { date: '2026-06-12', stadium: 'BBVA'      },
  'A_MEX_KOR': { date: '2026-06-17', stadium: 'AZTECA'    },
  'A_ZAF_CZE': { date: '2026-06-17', stadium: 'AKRON'     },
  'A_MEX_CZE': { date: '2026-06-22', stadium: 'AZTECA'    },
  'A_ZAF_KOR': { date: '2026-06-22', stadium: 'BBVA'      },

  // GRUPO B — Canadá, Suíça, Qatar, Bósnia
  'B_CAN_SUI': { date: '2026-06-12', stadium: 'BCPLACE'   },
  'B_QAT_BIH': { date: '2026-06-13', stadium: 'BMOFIELD'  },
  'B_CAN_QAT': { date: '2026-06-18', stadium: 'BCPLACE'   },
  'B_SUI_BIH': { date: '2026-06-18', stadium: 'ARROWHEAD' },
  'B_CAN_BIH': { date: '2026-06-23', stadium: 'BCPLACE'   },
  'B_SUI_QAT': { date: '2026-06-23', stadium: 'BMOFIELD'  },

  // GRUPO C — Brasil, Marrocos, Haiti, Escócia
  'C_BRA_MAR': { date: '2026-06-13', stadium: 'ATT'       },
  'C_HAI_SCO': { date: '2026-06-14', stadium: 'LINCOLN'   },
  'C_BRA_HAI': { date: '2026-06-18', stadium: 'HARDROCK'  },
  'C_MAR_SCO': { date: '2026-06-19', stadium: 'ATT'       },
  'C_BRA_SCO': { date: '2026-06-24', stadium: 'METLIFE'   },
  'C_MAR_HAI': { date: '2026-06-24', stadium: 'LINCOLN'   },

  // GRUPO D — EUA, Paraguai, Austrália, Turquia
  'D_USA_PAR': { date: '2026-06-14', stadium: 'METLIFE'   },
  'D_AUS_TUR': { date: '2026-06-15', stadium: 'SOFI'      },
  'D_USA_AUS': { date: '2026-06-19', stadium: 'ATT'       },
  'D_PAR_TUR': { date: '2026-06-20', stadium: 'HARDROCK'  },
  'D_USA_TUR': { date: '2026-06-25', stadium: 'METLIFE'   },
  'D_PAR_AUS': { date: '2026-06-25', stadium: 'LINCOLN'   },

  // GRUPO E — Alemanha, Curaçao, Costa do Marfim, Equador
  'E_GER_CUW': { date: '2026-06-15', stadium: 'ARROWHEAD' },
  'E_CIV_ECU': { date: '2026-06-15', stadium: 'ATT'       },
  'E_GER_CIV': { date: '2026-06-20', stadium: 'ARROWHEAD' },
  'E_CUW_ECU': { date: '2026-06-20', stadium: 'SOFI'      },
  'E_GER_ECU': { date: '2026-06-25', stadium: 'ARROWHEAD' },
  'E_CUW_CIV': { date: '2026-06-25', stadium: 'ALLEGIANT' },

  // GRUPO F — Holanda, Japão, Suécia, Tunísia
  'F_NED_JPN': { date: '2026-06-13', stadium: 'ALLEGIANT' },
  'F_SWE_TUN': { date: '2026-06-14', stadium: 'ROSEBOWL'  },
  'F_NED_SWE': { date: '2026-06-18', stadium: 'LUMENFIELD'},
  'F_JPN_TUN': { date: '2026-06-19', stadium: 'ALLEGIANT' },
  'F_NED_TUN': { date: '2026-06-24', stadium: 'LEVIS'     },
  'F_JPN_SWE': { date: '2026-06-24', stadium: 'ROSEBOWL'  },

  // GRUPO G — Bélgica, Egito, Irã, Nova Zelândia
  'G_BEL_EGY': { date: '2026-06-14', stadium: 'LUMENFIELD'},
  'G_IRN_NZL': { date: '2026-06-15', stadium: 'HARDROCK'  },
  'G_BEL_IRN': { date: '2026-06-19', stadium: 'LINCOLN'   },
  'G_EGY_NZL': { date: '2026-06-20', stadium: 'LUMENFIELD'},
  'G_BEL_NZL': { date: '2026-06-25', stadium: 'SOFI'      },
  'G_EGY_IRN': { date: '2026-06-25', stadium: 'HARDROCK'  },

  // GRUPO H — Espanha, Cabo Verde, Arábia Saudita, Uruguai
  'H_ESP_CPV': { date: '2026-06-12', stadium: 'AZTECA'    },
  'H_KSA_URU': { date: '2026-06-13', stadium: 'AKRON'     },
  'H_ESP_KSA': { date: '2026-06-17', stadium: 'BBVA'      },
  'H_CPV_URU': { date: '2026-06-18', stadium: 'AKRON'     },
  'H_ESP_URU': { date: '2026-06-23', stadium: 'AZTECA'    },
  'H_CPV_KSA': { date: '2026-06-23', stadium: 'BBVA'      },

  // GRUPO I — França, Senegal, Noruega, Iraque
  'I_FRA_SEN': { date: '2026-06-16', stadium: 'METLIFE'   },
  'I_NOR_IRQ': { date: '2026-06-17', stadium: 'ARROWHEAD' },
  'I_FRA_NOR': { date: '2026-06-21', stadium: 'METLIFE'   },
  'I_SEN_IRQ': { date: '2026-06-22', stadium: 'ATT'       },
  'I_FRA_IRQ': { date: '2026-06-26', stadium: 'METLIFE'   },
  'I_SEN_NOR': { date: '2026-06-26', stadium: 'ARROWHEAD' },

  // GRUPO J — Argentina, Argélia, Áustria, Jordânia
  'J_ARG_ALG': { date: '2026-06-11', stadium: 'HARDROCK'  },
  'J_AUT_JOR': { date: '2026-06-12', stadium: 'BMOFIELD'  },
  'J_ARG_AUT': { date: '2026-06-17', stadium: 'SOFI'      },
  'J_ALG_JOR': { date: '2026-06-17', stadium: 'LEVIS'     },
  'J_ARG_JOR': { date: '2026-06-22', stadium: 'SOFI'      },
  'J_ALG_AUT': { date: '2026-06-22', stadium: 'ROSEBOWL'  },

  // GRUPO K — Portugal, R.D. Congo, Uzbequistão, Colômbia
  'K_POR_COD': { date: '2026-06-15', stadium: 'LEVIS'     },
  'K_UZB_COL': { date: '2026-06-16', stadium: 'ROSEBOWL'  },
  'K_POR_UZB': { date: '2026-06-21', stadium: 'ALLEGIANT' },
  'K_COD_COL': { date: '2026-06-21', stadium: 'LEVIS'     },
  'K_POR_COL': { date: '2026-06-26', stadium: 'LEVIS'     },
  'K_COD_UZB': { date: '2026-06-26', stadium: 'ROSEBOWL'  },

  // GRUPO L — Inglaterra, Croácia, Gana, Panamá
  'L_ENG_CRO': { date: '2026-06-11', stadium: 'BCPLACE'   },
  'L_GHA_PAN': { date: '2026-06-12', stadium: 'ARROWHEAD' },
  'L_ENG_GHA': { date: '2026-06-17', stadium: 'BMOFIELD'  },
  'L_CRO_PAN': { date: '2026-06-18', stadium: 'BCPLACE'   },
  'L_ENG_PAN': { date: '2026-06-23', stadium: 'BMOFIELD'  },
  'L_GHA_CRO': { date: '2026-06-23', stadium: 'ARROWHEAD' },
};

// ─── Fase Eliminatória — Chaveamento ─────────────────────────────────────────
// slot: '1A' = 1º do Grupo A, '2B' = 2º do Grupo B, '3*' = melhor 3º lugar
export const KNOCKOUT_ROUNDS = [
  {
    id: 'r32',
    label: '16 Avos de Final',
    shortLabel: '16°',
    dates: '29 Jun – 3 Jul',
    matches: [
      { id: 'r32_01', date: '2026-06-29', stadium: 'METLIFE',    slot1: '1A', slot2: '2B' },
      { id: 'r32_02', date: '2026-06-29', stadium: 'ROSEBOWL',   slot1: '1C', slot2: '2D' },
      { id: 'r32_03', date: '2026-06-30', stadium: 'ARROWHEAD',  slot1: '1E', slot2: '2F' },
      { id: 'r32_04', date: '2026-06-30', stadium: 'LUMENFIELD', slot1: '1G', slot2: '2H' },
      { id: 'r32_05', date: '2026-07-01', stadium: 'ATT',        slot1: '1I', slot2: '2J' },
      { id: 'r32_06', date: '2026-07-01', stadium: 'LEVIS',      slot1: '1K', slot2: '2L' },
      { id: 'r32_07', date: '2026-07-01', stadium: 'BCPLACE',    slot1: '2A', slot2: '1B' },
      { id: 'r32_08', date: '2026-07-02', stadium: 'HARDROCK',   slot1: '2C', slot2: '1D' },
      { id: 'r32_09', date: '2026-07-02', stadium: 'SOFI',       slot1: '2E', slot2: '1F' },
      { id: 'r32_10', date: '2026-07-02', stadium: 'ALLEGIANT',  slot1: '2G', slot2: '1H' },
      { id: 'r32_11', date: '2026-07-03', stadium: 'LINCOLN',    slot1: '2I', slot2: '1J' },
      { id: 'r32_12', date: '2026-07-03', stadium: 'BMOFIELD',   slot1: '2K', slot2: '1L' },
      { id: 'r32_13', date: '2026-07-03', stadium: 'AZTECA',     slot1: '3*', slot2: '3*' },
      { id: 'r32_14', date: '2026-07-03', stadium: 'BBVA',       slot1: '3*', slot2: '3*' },
      { id: 'r32_15', date: '2026-07-03', stadium: 'AKRON',      slot1: '3*', slot2: '3*' },
      { id: 'r32_16', date: '2026-07-03', stadium: 'ATT',        slot1: '3*', slot2: '3*' },
    ],
  },
  {
    id: 'r16',
    label: 'Oitavas de Final',
    shortLabel: 'Oitavas',
    dates: '5–8 Jul',
    matches: [
      { id: 'r16_01', date: '2026-07-05', stadium: 'METLIFE',    slot1: 'W r32_01', slot2: 'W r32_02' },
      { id: 'r16_02', date: '2026-07-05', stadium: 'ROSEBOWL',   slot1: 'W r32_03', slot2: 'W r32_04' },
      { id: 'r16_03', date: '2026-07-06', stadium: 'ATT',        slot1: 'W r32_05', slot2: 'W r32_06' },
      { id: 'r16_04', date: '2026-07-06', stadium: 'ARROWHEAD',  slot1: 'W r32_07', slot2: 'W r32_08' },
      { id: 'r16_05', date: '2026-07-07', stadium: 'SOFI',       slot1: 'W r32_09', slot2: 'W r32_10' },
      { id: 'r16_06', date: '2026-07-07', stadium: 'LUMENFIELD', slot1: 'W r32_11', slot2: 'W r32_12' },
      { id: 'r16_07', date: '2026-07-08', stadium: 'HARDROCK',   slot1: 'W r32_13', slot2: 'W r32_14' },
      { id: 'r16_08', date: '2026-07-08', stadium: 'LINCOLN',    slot1: 'W r32_15', slot2: 'W r32_16' },
    ],
  },
  {
    id: 'qf',
    label: 'Quartas de Final',
    shortLabel: 'Quartas',
    dates: '10–12 Jul',
    matches: [
      { id: 'qf_01', date: '2026-07-10', stadium: 'METLIFE',   slot1: 'W r16_01', slot2: 'W r16_02' },
      { id: 'qf_02', date: '2026-07-10', stadium: 'ATT',       slot1: 'W r16_03', slot2: 'W r16_04' },
      { id: 'qf_03', date: '2026-07-11', stadium: 'SOFI',      slot1: 'W r16_05', slot2: 'W r16_06' },
      { id: 'qf_04', date: '2026-07-12', stadium: 'ROSEBOWL',  slot1: 'W r16_07', slot2: 'W r16_08' },
    ],
  },
  {
    id: 'sf',
    label: 'Semifinais',
    shortLabel: 'Semis',
    dates: '14–15 Jul',
    matches: [
      { id: 'sf_01', date: '2026-07-14', stadium: 'ATT',     slot1: 'W qf_01', slot2: 'W qf_02' },
      { id: 'sf_02', date: '2026-07-15', stadium: 'METLIFE', slot1: 'W qf_03', slot2: 'W qf_04' },
    ],
  },
  {
    id: 'final',
    label: 'Final',
    shortLabel: 'Final',
    dates: '19 Jul',
    matches: [
      { id: 'final_01', date: '2026-07-19', stadium: 'METLIFE', slot1: 'W sf_01', slot2: 'W sf_02' },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Gera as 6 partidas round-robin de um grupo */
export function getGroupMatches(groupKey) {
  const { teams } = GROUPS[groupKey];
  const matches = [];
  for (let i = 0; i < 4; i++)
    for (let j = i + 1; j < 4; j++)
      matches.push({
        id: `${groupKey}_${teams[i].id}_${teams[j].id}`,
        home: teams[i],
        away: teams[j],
      });
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

/**
 * Resolve os 16 slots do R32 a partir dos resultados de grupos previstos.
 * Retorna { slot_id: { team, flag, fromGroup, pos } | null }
 */
export function resolveKnockoutSlots(predictions = {}) {
  // Calcula o 1º e 2º lugar de cada grupo
  const resolved = {};
  Object.keys(GROUPS).forEach(gk => {
    const standings = computeStandings(gk, predictions);
    const prog = groupProgress(gk, predictions);
    if (prog.complete) {
      resolved[`1${gk}`] = { ...standings[0], fromGroup: gk, pos: 1 };
      resolved[`2${gk}`] = { ...standings[1], fromGroup: gk, pos: 2 };
    }
  });
  return resolved;
}

/** Formata data pt-BR abreviada: "13 Jun" */
export function fmtDate(isoDate) {
  if (!isoDate) return '';
  const [, m, d] = isoDate.split('-');
  const months = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${parseInt(d)} ${months[parseInt(m)]}`;
}
