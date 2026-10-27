/**
 * Libéro (règle FIVB 19) :
 * - remplacements libéro illimités, non décomptés ;
 * - uniquement à la place d'un joueur de la ligne arrière ; le libéro ne sert pas ;
 * - il ne peut être remplacé que par le joueur qu'il a remplacé ;
 * - un échange terminé doit séparer deux remplacements libéro ;
 * - il doit sortir quand sa position passe en IV par rotation.
 */
import { isBackRow, isFrontRow, positionLabel } from './rotation';
import { ableLiberos, currentSetState, findPlayer, unavailability } from './roster';
import type { MatchState, SetState, TeamId } from './types';

export function liberoPosition(set: SetState, team: TeamId): number {
  const lib = set.teams[team].libero;
  return lib ? set.teams[team].court.indexOf(lib.libero) : -1;
}

/** Le libéro se trouve en ligne avant (après rotation) ou au service : il doit sortir. */
export function liberoMustLeave(set: SetState, team: TeamId): boolean {
  const pos = liberoPosition(set, team);
  if (pos < 0) return false;
  return isFrontRow(pos) || (pos === 0 && set.serving === team);
}

function rallyGapMissing(set: SetState, team: TeamId): boolean {
  const last = set.teams[team].lastLiberoRally;
  return last !== null && last === set.rallies;
}

const GAP_MESSAGE =
  'Un échange doit avoir eu lieu depuis le dernier remplacement libéro avant un nouveau remplacement libéro.';

export function checkLiberoIn(state: MatchState, team: TeamId, libero: number, replaced: number): string | null {
  const set = currentSetState(state);
  if (!set) return 'Les remplacements libéro se font pendant un set.';
  const ts = set.teams[team];
  const p = findPlayer(state, team, libero);
  if (!p?.libero) return `Le n°${libero} n'est pas libéro.`;
  const why = unavailability(state, team, libero);
  if (why) return `Le libéro n°${libero} ne peut pas jouer : ${why}.`;
  if (ts.libero) return `Le libéro n°${ts.libero.libero} est déjà sur le terrain : utilisez l'échange libéro/libéro.`;
  const pos = ts.court.indexOf(replaced);
  if (pos < 0) return `Le n°${replaced} n'est pas sur le terrain.`;
  if (!isBackRow(pos)) {
    return `Le n°${replaced} est en position ${positionLabel(pos)} (ligne avant) : le libéro ne peut remplacer qu'un joueur de la ligne arrière (I, VI, V).`;
  }
  if (pos === 0 && set.serving === team) {
    return `Le n°${replaced} est au service : le libéro ne peut pas servir.`;
  }
  if (rallyGapMissing(set, team)) return GAP_MESSAGE;
  return null;
}

export function checkLiberoOut(state: MatchState, team: TeamId): string | null {
  const set = currentSetState(state);
  if (!set) return 'Les remplacements libéro se font pendant un set.';
  const lib = set.teams[team].libero;
  if (!lib) return "Aucun libéro n'est sur le terrain.";
  if (liberoMustLeave(set, team)) return null;
  const why = unavailability(state, team, lib.replaced);
  if (why) return `Le n°${lib.replaced} ne peut pas revenir : ${why}.`;
  if (rallyGapMissing(set, team)) return GAP_MESSAGE;
  return null;
}

export function checkLiberoSwap(state: MatchState, team: TeamId, libero: number): string | null {
  const set = currentSetState(state);
  if (!set) return 'Les remplacements libéro se font pendant un set.';
  const lib = set.teams[team].libero;
  if (!lib) return "Aucun libéro n'est sur le terrain.";
  if (lib.libero === libero) return `Le n°${libero} est déjà sur le terrain.`;
  const p = findPlayer(state, team, libero);
  if (!p?.libero) return `Le n°${libero} n'est pas libéro.`;
  const why = unavailability(state, team, libero);
  if (why) return `Le libéro n°${libero} ne peut pas jouer : ${why}.`;
  if (liberoMustLeave(set, team)) {
    return `Le libéro doit sortir (position ${positionLabel(liberoPosition(set, team))}) : le n°${lib.replaced} doit revenir.`;
  }
  if (rallyGapMissing(set, team)) return GAP_MESSAGE;
  return null;
}

export function checkRedesignation(
  state: MatchState,
  team: TeamId,
  unable: number,
  newLibero: number | null,
): string | null {
  if (state.phase === 'finished') return 'Le match est terminé.';
  const p = findPlayer(state, team, unable);
  if (!p?.libero) return `Le n°${unable} n'est pas libéro.`;
  if (state.liberosUnable[team].includes(unable)) return `Le libéro n°${unable} est déjà déclaré inapte.`;
  if (newLibero === null) return null;
  const remaining = ableLiberos(state, team).filter((n) => n !== unable);
  if (remaining.length > 0) {
    return `L'équipe dispose encore d'un libéro apte (n°${remaining.join(', n°')}) : re-désignation impossible.`;
  }
  const np = findPlayer(state, team, newLibero);
  if (!np) return `Le n°${newLibero} ne figure pas dans la liste des joueurs.`;
  if (np.libero) return `Le n°${newLibero} est déjà libéro.`;
  const set = currentSetState(state);
  if (set) {
    const ts = set.teams[team];
    if (ts.court.includes(newLibero) || ts.libero?.replaced === newLibero) {
      return `Le n°${newLibero} est sur le terrain : seul un joueur hors du terrain peut être re-désigné libéro.`;
    }
  }
  const why = unavailability(state, team, newLibero);
  if (why) return `Le n°${newLibero} ne peut pas être re-désigné : ${why}.`;
  return null;
}
