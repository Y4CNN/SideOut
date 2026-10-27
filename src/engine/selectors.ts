import { isDecidingSet } from './config';
import type { MatchState, Score, SetState, TeamId } from './types';
import { other } from './types';

export function lastSet(state: MatchState): SetState | undefined {
  return state.sets[state.sets.length - 1];
}

export function setsWon(state: MatchState): Score {
  const won: Score = { A: 0, B: 0 };
  for (const s of state.sets) if (s.winner) won[s.winner]++;
  return won;
}

/** Faut-il un tirage au sort avant le prochain set ? (1er set et set décisif) */
export function needsToss(state: MatchState): boolean {
  const next = state.sets.length + 1;
  return state.sets.length === 0 || isDecidingSet(state.config, next);
}

export interface NextSetSetup {
  number: number;
  deciding: boolean;
  firstServe: TeamId | null;
  leftTeam: TeamId | null;
}

/**
 * Paramètres du prochain set. Hors tirage au sort, l'équipe qui n'a pas servi
 * en premier au set précédent sert en premier, et les équipes changent de côté.
 */
export function nextSetSetup(state: MatchState): NextSetSetup {
  const number = state.sets.length + 1;
  const deciding = isDecidingSet(state.config, number);
  if (needsToss(state)) {
    const toss = state.prep.toss;
    return { number, deciding, firstServe: toss?.firstServe ?? null, leftTeam: toss?.leftTeam ?? null };
  }
  const prev = lastSet(state)!;
  return {
    number,
    deciding,
    firstServe: other(prev.firstServe),
    leftTeam: state.config.switchSidesBetweenSets ? other(prev.leftTeam) : prev.leftTeam,
  };
}

/** Équipe affichée à gauche (vue depuis la chaise d'arbitre). */
export function leftTeam(state: MatchState): TeamId {
  if (state.phase === 'pre-set') {
    const next = nextSetSetup(state);
    if (next.leftTeam) return next.leftTeam;
  }
  const set = lastSet(state);
  if (!set) return 'A';
  return set.switched ? other(set.leftTeam) : set.leftTeam;
}

export interface Server {
  team: TeamId;
  number: number;
}

export function currentServer(state: MatchState): Server | null {
  if (state.phase !== 'playing') return null;
  const set = lastSet(state)!;
  return { team: set.serving, number: set.teams[set.serving].court[0] };
}

export function setDurationMs(set: SetState, now: number): number {
  return (set.endedAt ?? now) - set.startedAt;
}

export function timerRemainingMs(state: MatchState, now: number): number {
  const t = state.timer;
  if (!t) return 0;
  return Math.max(0, t.startedAt + t.duration * 1000 - now);
}
