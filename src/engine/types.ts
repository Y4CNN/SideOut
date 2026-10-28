import type { MatchConfig } from './config';

export type TeamId = 'A' | 'B';
export const TEAM_IDS: readonly TeamId[] = ['A', 'B'];
export const other = (t: TeamId): TeamId => (t === 'A' ? 'B' : 'A');

export type Score = Record<TeamId, number>;

export interface Player {
  number: number;
  captain?: boolean;
  libero?: boolean;
}

export interface Team {
  name: string;
  color: string;
  secondaryColor?: string;
  players: Player[];
}

/** Numéros de maillot par position : index 0 = position I, 1 = II … 5 = VI. */
export type Court = number[];

export interface SubRecord {
  out: number;
  in: number;
  exceptional: boolean;
  score: Score;
  at: number;
}

export interface LiberoOnCourt {
  libero: number;
  /** Joueur de ligne arrière remplacé par le libéro (hors du terrain). */
  replaced: number;
}

export interface TeamSetState {
  lineup: Court;
  court: Court;
  timeouts: number;
  subs: SubRecord[];
  libero: LiberoOnCourt | null;
  /** Numéro d'échange (rallies) lors du dernier remplacement libéro. */
  lastLiberoRally: number | null;
}

export type SetEndReason = 'normal' | 'forced' | 'incomplete';

export interface SetState {
  number: number;
  score: Score;
  serving: TeamId;
  firstServe: TeamId;
  /** Équipe affichée à gauche au début du set. */
  leftTeam: TeamId;
  /** Changement de côté effectué en cours de set (set décisif). */
  switched: boolean;
  teams: Record<TeamId, TeamSetState>;
  /** Nombre d'échanges terminés dans le set. */
  rallies: number;
  technicalTimeouts: number[];
  startedAt: number;
  endedAt?: number;
  winner?: TeamId;
  endReason?: SetEndReason;
}

export type SanctionKind =
  | 'warning'
  | 'penalty'
  | 'expulsion'
  | 'disqualification'
  | 'delay-warning'
  | 'delay-penalty';

export type SanctionTarget =
  | { kind: 'player'; number: number }
  | { kind: 'staff'; role: string }
  | { kind: 'team' };

export interface SanctionRecord {
  team: TeamId;
  kind: SanctionKind;
  target: SanctionTarget;
  set: number | null;
  score: Score | null;
  at: number;
}

export type TimerKind = 'timeout' | 'technical' | 'interval';

export interface Timer {
  kind: TimerKind;
  team?: TeamId;
  startedAt: number;
  /** Durée en secondes. */
  duration: number;
}

export type EventType =
  | 'match-start'
  | 'toss'
  | 'lineup'
  | 'set-start'
  | 'point'
  | 'side-switch'
  | 'timeout'
  | 'technical-timeout'
  | 'substitution'
  | 'libero'
  | 'sanction'
  | 'improper-request'
  | 'fault'
  | 'rotation-correction'
  | 'set-end'
  | 'match-end'
  | 'incomplete';

export interface LogEvent {
  id: number;
  at: number;
  set: number | null;
  score: Score | null;
  type: EventType;
  team?: TeamId;
  text: string;
}

export interface Toss {
  firstServe: TeamId;
  leftTeam: TeamId;
}

export type MatchPhase = 'pre-set' | 'playing' | 'finished';

export interface MatchState {
  version: 1;
  id: string;
  config: MatchConfig;
  teams: Record<TeamId, Team>;
  phase: MatchPhase;
  sets: SetState[];
  /** Préparation du prochain set (tirage au sort, feuilles de position). */
  prep: { toss: Toss | null; lineups: Record<TeamId, Court | null> };
  sanctions: SanctionRecord[];
  improperRequests: Record<TeamId, number>;
  /** Joueurs disqualifiés (reste du match). */
  disqualified: Record<TeamId, number[]>;
  /** Joueurs expulsés, par set. */
  expelled: Record<TeamId, { number: number; set: number }[]>;
  /** Joueurs remplacés exceptionnellement (blessure) : ne peuvent plus rentrer. */
  barred: Record<TeamId, number[]>;
  /** Libéros déclarés inaptes. */
  liberosUnable: Record<TeamId, number[]>;
  timer: Timer | null;
  events: LogEvent[];
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  winner?: TeamId;
  incomplete?: { team: TeamId; scope: 'set' | 'match' };
}

export type SanctionAction = Exclude<SanctionKind, 'delay-warning' | 'delay-penalty'>;

export type Action =
  | { type: 'TOSS'; firstServe: TeamId; leftTeam: TeamId; at: number }
  | { type: 'SET_LINEUP'; team: TeamId; lineup: Court; at: number }
  | { type: 'START_SET'; at: number }
  | { type: 'POINT'; team: TeamId; at: number }
  | { type: 'TIMEOUT'; team: TeamId; at: number }
  | { type: 'TIMER_STOP'; at: number }
  | { type: 'SUBSTITUTION'; team: TeamId; out: number; in: number; exceptional?: boolean; at: number }
  | { type: 'LIBERO_IN'; team: TeamId; libero: number; replaced: number; at: number }
  | { type: 'LIBERO_OUT'; team: TeamId; at: number }
  | { type: 'LIBERO_SWAP'; team: TeamId; libero: number; at: number }
  | { type: 'LIBERO_REDESIGNATE'; team: TeamId; unable: number; newLibero: number | null; at: number }
  | { type: 'SANCTION'; team: TeamId; kind: SanctionAction; target: SanctionTarget; at: number }
  | { type: 'DELAY'; team: TeamId; at: number }
  | { type: 'IMPROPER_REQUEST'; team: TeamId; at: number }
  | { type: 'POSITION_FAULT'; team: TeamId; at: number }
  | { type: 'ROTATION_FAULT'; team: TeamId; corrected?: Court; at: number }
  | { type: 'SET_COURT'; team: TeamId; court: Court; at: number }
  | { type: 'FORCE_END_SET'; winner: TeamId; at: number }
  | { type: 'DECLARE_INCOMPLETE'; team: TeamId; scope: 'set' | 'match'; at: number };

export type ActionType = Action['type'];

/** Action sans horodatage, telle qu'émise par l'interface. */
export type ActionInput = Action extends infer A ? (A extends Action ? Omit<A, 'at'> : never) : never;

export type AlertKind = 'info' | 'success' | 'warning' | 'side-switch' | 'set-end' | 'match-end';

export interface Alert {
  kind: AlertKind;
  text: string;
}

export type ActionResult =
  | { ok: true; state: MatchState; alerts: Alert[] }
  | { ok: false; error: string };
