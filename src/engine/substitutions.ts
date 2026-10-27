/**
 * Validation des remplacements (règles FIVB 15.6 à 15.8).
 *
 * - Un joueur de départ peut sortir une seule fois par set et rentrer une seule fois,
 *   uniquement à sa position initiale (à la place de son remplaçant).
 * - Un remplaçant ne peut entrer qu'une fois par set, à la place d'un joueur de départ,
 *   et ne peut être remplacé que par ce même joueur de départ.
 * - Le remplacement exceptionnel (blessure/maladie) n'est pas décompté ; le joueur
 *   remplacé ne peut plus rentrer dans le match.
 */
import { currentSetState, findPlayer, playerLabel, unavailability } from './roster';
import type { MatchState, SubRecord, TeamId, TeamSetState } from './types';

export function regularSubsUsed(ts: TeamSetState): number {
  return ts.subs.filter((s) => !s.exceptional).length;
}

function lastEntry(ts: TeamSetState, n: number): SubRecord | undefined {
  for (let i = ts.subs.length - 1; i >= 0; i--) if (ts.subs[i].in === n) return ts.subs[i];
  return undefined;
}

/** Vérifie que le joueur sortant peut être remplacé. Renvoie un message d'erreur ou null. */
export function checkOutgoing(state: MatchState, team: TeamId, out: number, exceptional: boolean): string | null {
  const set = currentSetState(state);
  if (!set) return 'Les remplacements se font pendant un set.';
  const ts = set.teams[team];
  if (!ts.court.includes(out)) return `Le n°${out} n'est pas sur le terrain.`;
  if (ts.libero?.libero === out) {
    return 'Le libéro ne fait pas l’objet de remplacements : utilisez les actions « Libéro ».';
  }
  if (exceptional) return null;

  const max = state.config.substitutionsPerSet;
  if (regularSubsUsed(ts) >= max) {
    return `Les ${max} remplacements de ce set sont déjà utilisés. Seul un remplacement exceptionnel (blessure) reste possible.`;
  }

  const regular = ts.subs.filter((s) => !s.exceptional);
  if (ts.lineup.includes(out)) {
    if (regular.some((s) => s.out === out)) {
      return `Le n°${out} est un joueur de départ déjà sorti puis rentré dans ce set : il ne peut plus être remplacé (sauf remplacement exceptionnel).`;
    }
    return null;
  }

  const entry = lastEntry(ts, out);
  if (!entry || entry.exceptional) {
    return `Le n°${out} est entré par remplacement exceptionnel : seul un nouveau remplacement exceptionnel est possible.`;
  }
  const starter = entry.out;
  if (ts.court.includes(starter) || regular.some((s) => s.in === starter)) {
    return `Le n°${out} ne peut plus être remplacé : le n°${starter} a déjà effectué son retour dans ce set.`;
  }
  const why = unavailability(state, team, starter);
  if (why) {
    return `Le n°${out} ne peut être remplacé que par le n°${starter} (joueur de départ qu'il a remplacé), qui est ${why}.`;
  }
  return null;
}

/** Vérifie que le joueur entrant peut remplacer `out`. Renvoie un message d'erreur ou null. */
export function checkIncoming(
  state: MatchState,
  team: TeamId,
  out: number,
  incoming: number,
  exceptional: boolean,
): string | null {
  const set = currentSetState(state);
  if (!set) return 'Les remplacements se font pendant un set.';
  const ts = set.teams[team];
  const player = findPlayer(state, team, incoming);
  if (!player) return `Le n°${incoming} ne figure pas dans la liste des joueurs.`;
  if (ts.court.includes(incoming)) return `Le n°${incoming} est déjà sur le terrain.`;
  if (ts.libero?.replaced === incoming) {
    return `Le n°${incoming} est actuellement remplacé par le libéro : il ne revient qu'à la sortie du libéro.`;
  }
  if (player.libero) return 'Un libéro ne peut pas entrer par remplacement : utilisez les actions « Libéro ».';
  const why = unavailability(state, team, incoming);
  if (why) return `Le n°${incoming} ne peut pas entrer : ${why}.`;
  if (exceptional) return null;

  if (ts.lineup.includes(out)) {
    if (ts.lineup.includes(incoming)) {
      return `Le n°${incoming} est un joueur de départ : il ne peut rentrer qu'à sa propre position, à la place de son remplaçant.`;
    }
    if (ts.subs.some((s) => s.in === incoming)) {
      return `Le n°${incoming} est déjà entré une fois dans ce set : un remplaçant ne peut entrer qu'une seule fois par set.`;
    }
    return null;
  }

  const entry = lastEntry(ts, out);
  const starter = entry?.out;
  if (starter !== incoming) {
    return `Le n°${out} ne peut être remplacé que par le n°${starter}, le joueur de départ dont il a pris la place.`;
  }
  return null;
}

export function checkSubstitution(
  state: MatchState,
  team: TeamId,
  out: number,
  incoming: number,
  exceptional: boolean,
): string | null {
  return checkOutgoing(state, team, out, exceptional) ?? checkIncoming(state, team, out, incoming, exceptional);
}

export interface Candidate {
  number: number;
  allowed: boolean;
  reason: string | null;
}

/** Joueurs hors du terrain, avec indication s'ils peuvent remplacer `out`. */
export function substitutionCandidates(
  state: MatchState,
  team: TeamId,
  out: number,
  exceptional: boolean,
): Candidate[] {
  const set = currentSetState(state);
  if (!set) return [];
  const ts = set.teams[team];
  const outError = checkOutgoing(state, team, out, exceptional);
  return state.teams[team].players
    .filter((p) => !ts.court.includes(p.number))
    .sort((a, b) => a.number - b.number)
    .map((p) => {
      const reason = outError ?? checkIncoming(state, team, out, p.number, exceptional);
      return { number: p.number, allowed: reason === null, reason };
    });
}

/** Le joueur peut-il être remplacé régulièrement par au moins un joueur ? */
export function hasLegalSubstitution(state: MatchState, team: TeamId, out: number): boolean {
  return substitutionCandidates(state, team, out, false).some((c) => c.allowed);
}

/** Joueurs sur le terrain qui doivent sortir (expulsés ou disqualifiés). */
export function playersToReplace(state: MatchState, team: TeamId): number[] {
  const set = currentSetState(state);
  if (!set) return [];
  const ts = set.teams[team];
  return ts.court.filter((n) => {
    const why = unavailability(state, team, n);
    return why === 'disqualifié' || why === 'expulsé pour ce set';
  });
}

export function describeSub(state: MatchState, team: TeamId, s: SubRecord): string {
  return `${playerLabel(state, team, s.in)} entre, ${playerLabel(state, team, s.out)} sort`;
}
