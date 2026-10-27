import type { MatchConfig } from './config';
import type { Court, MatchState, Player, SetState, Team, TeamId } from './types';

export function findPlayer(state: MatchState, team: TeamId, n: number): Player | undefined {
  return state.teams[team].players.find((p) => p.number === n);
}

export function isLibero(state: MatchState, team: TeamId, n: number): boolean {
  return !!findPlayer(state, team, n)?.libero;
}

export function liberos(state: MatchState, team: TeamId): number[] {
  return state.teams[team].players.filter((p) => p.libero).map((p) => p.number);
}

export function currentSetState(state: MatchState): SetState | undefined {
  return state.phase === 'playing' ? state.sets[state.sets.length - 1] : undefined;
}

/** Numéro du set en cours ou, entre deux sets, du set à venir. */
export function activeSetNumber(state: MatchState): number {
  return state.phase === 'playing' ? state.sets.length : state.sets.length + 1;
}

/**
 * Raison pour laquelle un joueur ne peut pas jouer (dans le set en cours ou à venir),
 * ou null s'il est disponible.
 */
export function unavailability(state: MatchState, team: TeamId, n: number): string | null {
  if (state.disqualified[team].includes(n)) return 'disqualifié';
  const setNumber = activeSetNumber(state);
  if (state.expelled[team].some((e) => e.number === n && e.set === setNumber)) return 'expulsé pour ce set';
  if (state.barred[team].includes(n)) return 'remplacé exceptionnellement (blessure), il ne peut plus rentrer dans le match';
  if (state.liberosUnable[team].includes(n)) return 'libéro déclaré inapte';
  return null;
}

export function ableLiberos(state: MatchState, team: TeamId): number[] {
  return liberos(state, team).filter((n) => unavailability(state, team, n) === null);
}

export function playerLabel(state: MatchState, team: TeamId, n: number): string {
  const p = findPlayer(state, team, n);
  return p?.name ? `n°${n} (${p.name})` : `n°${n}`;
}

/** Validation de l'effectif saisi lors de la préparation du match. */
export function validateTeam(team: Team, config: MatchConfig): string[] {
  const errors: string[] = [];
  const label = team.name.trim() || 'Équipe sans nom';
  if (!team.name.trim()) errors.push("Donnez un nom à l'équipe.");
  const numbers = team.players.map((p) => p.number);
  if (numbers.some((n) => !Number.isInteger(n) || n < 1 || n > 99)) {
    errors.push(`${label} : les numéros de maillot doivent être compris entre 1 et 99.`);
  }
  const dup = numbers.filter((n, i) => numbers.indexOf(n) !== i);
  if (dup.length) errors.push(`${label} : numéro(s) en double : ${[...new Set(dup)].join(', ')}.`);
  const libs = team.players.filter((p) => p.libero).length;
  if (libs > config.maxLiberos) {
    errors.push(
      config.maxLiberos === 0
        ? `${label} : aucun libéro n'est autorisé dans ce format.`
        : `${label} : ${config.maxLiberos} libéro(s) au maximum.`,
    );
  }
  const regular = team.players.length - libs;
  if (regular < config.courtSize) {
    errors.push(`${label} : il faut au moins ${config.courtSize} joueurs hors libéro (${regular} saisis).`);
  }
  if (team.players.filter((p) => p.captain).length > 1) errors.push(`${label} : un seul capitaine.`);
  return errors;
}

/** Validation d'une feuille de position (positions I à VI). */
export function validateLineup(state: MatchState, team: TeamId, lineup: Court): string[] {
  const size = state.config.courtSize;
  const errors: string[] = [];
  if (lineup.length !== size || lineup.some((n) => !n)) {
    errors.push(`La feuille de position doit comporter ${size} joueurs.`);
    return errors;
  }
  const seen = new Set<number>();
  for (const n of lineup) {
    if (seen.has(n)) errors.push(`Le n°${n} figure plusieurs fois dans la composition.`);
    seen.add(n);
    const p = findPlayer(state, team, n);
    if (!p) {
      errors.push(`Le n°${n} ne figure pas dans la liste des joueurs.`);
      continue;
    }
    if (p.libero) errors.push(`Le n°${n} est libéro : il ne peut pas figurer dans la composition de départ.`);
    const why = unavailability(state, team, n);
    if (why && !p.libero) errors.push(`Le n°${n} ne peut pas jouer : ${why}.`);
  }
  return errors;
}
