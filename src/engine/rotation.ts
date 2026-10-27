import type { Court } from './types';

export const POSITION_LABELS = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;

/** Index des positions de la ligne avant (II, III, IV). */
export const FRONT_ROW = [1, 2, 3] as const;
/** Index des positions de la ligne arrière (I, VI, V). */
export const BACK_ROW = [0, 5, 4] as const;

export const POSITION_IV = 3;

export function positionLabel(index: number): string {
  return POSITION_LABELS[index] ?? '?';
}

export function isFrontRow(index: number): boolean {
  return index >= 1 && index <= 3;
}

export function isBackRow(index: number): boolean {
  return !isFrontRow(index);
}

/**
 * Rotation dans le sens des aiguilles d'une montre :
 * II → I, III → II, IV → III, V → IV, VI → V, I → VI.
 */
export function rotate(court: Court): Court {
  return court.map((_, i) => court[(i + 1) % court.length]);
}

/** Rotation inverse (correction manuelle). */
export function rotateBack(court: Court): Court {
  const n = court.length;
  return court.map((_, i) => court[(i - 1 + n) % n]);
}

export interface PositionConstraint {
  kind: 'front-back' | 'left-right';
  /** Index de position du joueur qui doit être devant / à gauche. */
  a: number;
  /** Index de position du joueur qui doit être derrière / à droite. */
  b: number;
}

/**
 * Contraintes de placement au moment de la frappe du service (règle 7.4) :
 * - avant/arrière : II devant I, III devant VI, IV devant V ;
 * - gauche/droite : IV à gauche de III, III à gauche de II ; V à gauche de VI, VI à gauche de I.
 */
export const POSITION_CONSTRAINTS: PositionConstraint[] = [
  { kind: 'front-back', a: 1, b: 0 },
  { kind: 'front-back', a: 2, b: 5 },
  { kind: 'front-back', a: 3, b: 4 },
  { kind: 'left-right', a: 3, b: 2 },
  { kind: 'left-right', a: 2, b: 1 },
  { kind: 'left-right', a: 4, b: 5 },
  { kind: 'left-right', a: 5, b: 0 },
];

export function describeConstraint(c: PositionConstraint, court: Court): string {
  const a = `n°${court[c.a]} (${positionLabel(c.a)})`;
  const b = `n°${court[c.b]} (${positionLabel(c.b)})`;
  return c.kind === 'front-back' ? `${a} plus près du filet que ${b}` : `${a} à gauche de ${b}`;
}

/** Vérifie que `next` contient exactement les mêmes joueurs que `current`. */
export function isPermutation(current: Court, next: Court): boolean {
  if (current.length !== next.length) return false;
  const a = [...current].sort((x, y) => x - y);
  const b = [...next].sort((x, y) => x - y);
  return a.every((v, i) => v === b[i]);
}
