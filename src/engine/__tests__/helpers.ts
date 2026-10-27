import { FFVB_6X6, applyAction, createMatch, type Action, type ActionInput, type ActionResult, type MatchConfig, type MatchState, type Team, type TeamId } from '..';

export const teamA: Team = {
  name: 'Paris',
  color: '#0A2A66',
  players: [
    ...Array.from({ length: 10 }, (_, i) => ({ number: i + 1, captain: i === 0 })),
    { number: 11, libero: true },
    { number: 12, libero: true },
  ],
};

export const teamB: Team = {
  name: 'Lyon',
  color: '#E30613',
  players: [...Array.from({ length: 9 }, (_, i) => ({ number: 21 + i })), { number: 30, libero: true }],
};

export const LINEUP_A = [1, 2, 3, 4, 5, 6];
export const LINEUP_B = [21, 22, 23, 24, 25, 26];

let clock = 1_700_000_000_000;
export const tick = (ms = 1000) => (clock += ms);

export function tryAct(state: MatchState, action: ActionInput): ActionResult {
  return applyAction(state, { ...action, at: tick() } as Action);
}

export function act(state: MatchState, action: ActionInput): MatchState {
  const r = tryAct(state, action);
  if (!r.ok) throw new Error(`Action refusée (${action.type}) : ${r.error}`);
  return r.state;
}

export function newMatch(config: Partial<MatchConfig> = {}): MatchState {
  return createMatch({ ...FFVB_6X6, ...config }, { A: teamA, B: teamB }, tick());
}

/** Match lancé : A sert en premier et est à gauche. */
export function startedMatch(config: Partial<MatchConfig> = {}, firstServe: TeamId = 'A'): MatchState {
  let s = newMatch(config);
  s = act(s, { type: 'TOSS', firstServe, leftTeam: 'A' });
  s = startSet(s);
  return s;
}

export function startSet(s: MatchState, lineupA = LINEUP_A, lineupB = LINEUP_B): MatchState {
  s = act(s, { type: 'SET_LINEUP', team: 'A', lineup: lineupA });
  s = act(s, { type: 'SET_LINEUP', team: 'B', lineup: lineupB });
  return act(s, { type: 'START_SET' });
}

export function points(s: MatchState, team: TeamId, n: number): MatchState {
  for (let i = 0; i < n; i++) s = act(s, { type: 'POINT', team });
  return s;
}

/** Amène le set en cours au score demandé en alternant les points (sans finir le set). */
export function reachScore(s: MatchState, a: number, b: number): MatchState {
  const set = () => s.sets[s.sets.length - 1];
  while (set().score.A < a || set().score.B < b) {
    const { A, B } = set().score;
    const team: TeamId = A < a && (A <= B || B >= b) ? 'A' : 'B';
    s = act(s, { type: 'POINT', team });
  }
  return s;
}

/** Fait gagner le set en cours à `team`. */
export function winSet(s: MatchState, team: TeamId): MatchState {
  const n = s.sets.length;
  while (s.sets.length === n && s.phase === 'playing' && !s.sets[n - 1].winner) {
    s = act(s, { type: 'POINT', team });
  }
  return s;
}

export const currentSet = (s: MatchState) => s.sets[s.sets.length - 1];
