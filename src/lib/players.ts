import type { Player } from '../engine/types';

/** Strip legacy identity fields; never change a shirt number or its role. */
export function cleanPlayers(players: unknown): Player[] {
  if (!Array.isArray(players)) return [];
  return players.filter((p) => p && typeof p === 'object').map((p) => ({
    number: p.number,
    ...(p.captain !== undefined ? { captain: !!p.captain } : {}),
    ...(p.libero !== undefined ? { libero: !!p.libero } : {}),
  }));
}

/** Migrate drafts, favorites, match bases and archives, including old log labels. */
export function migratePlayers<T>(value: T): T {
  const names = new Set<string>();
  const scan = (v: unknown) => {
    if (!v || typeof v !== 'object') return;
    if ('players' in v && Array.isArray(v.players)) for (const p of v.players) {
      if (p && typeof p === 'object') for (const key of ['name', 'firstName', 'lastName', 'firstname', 'lastname', 'nom', 'prenom']) {
        if (typeof p[key] === 'string' && p[key].trim()) names.add(p[key].trim());
      }
    }
    Object.values(v).forEach(scan);
  };
  scan(value);
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (!v || typeof v !== 'object') return v;
    return Object.fromEntries(Object.entries(v).map(([k,x]) => [k,
      k === 'players' ? cleanPlayers(x) : k === 'text' && typeof x === 'string'
        ? [...names].reduce((s,name) => s.replaceAll(` (${name})`, ''), x)
        : walk(x),
    ]));
  };
  return walk(value) as T;
}

export function addPlayer(players: Player[], raw: string): { players: Player[]; error?: string } {
  if (!/^\d{1,2}$/.test(raw) || Number(raw) < 1 || Number(raw) > 99) {
    return { players, error: 'Saisissez un numéro de 1 à 99.' };
  }
  const number = Number(raw);
  if (players.some((p) => p.number === number)) return { players, error: `Le n°${number} est déjà dans l’effectif. Choisissez un autre numéro.` };
  return { players: [...players, { number }].sort((a,b) => a.number-b.number) };
}

export function setPlayerRole(players: Player[], number: number, role: 'captain' | 'libero', maxLiberos: number) {
  const current = players.find((p) => p.number === number);
  if (!current) return { players };
  if (role === 'libero' && !current.libero && players.filter(p => p.libero).length >= maxLiberos) {
    return { players, error: `Ce format autorise ${maxLiberos} libéro(s). Retirez d’abord un libéro ou changez le format.` };
  }
  return { players: players.map(p => ({ ...p,
    ...(role === 'captain' ? { captain: p.number === number ? !p.captain : false } : {}),
    ...(role === 'libero' && p.number === number ? { libero: !p.libero } : {}),
  })) };
}
