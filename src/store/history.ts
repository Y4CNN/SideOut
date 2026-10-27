/**
 * Pile d'états pour l'annulation multi-niveaux.
 * On conserve l'état initial et la liste des actions (persistées) ;
 * les états intermédiaires sont recalculés en mémoire.
 */
import { applyAction, type Action, type ActionType, type Alert, type MatchState } from '../engine';

export interface History {
  base: MatchState;
  actions: Action[];
  /** states[i] = état après i actions (states[0] = base). */
  states: MatchState[];
}

/** Actions non annulables (l'annulation les ignore et les conserve). */
export const NON_UNDOABLE: ReadonlySet<ActionType> = new Set<ActionType>(['TIMER_STOP']);

function replay(from: MatchState, actions: Action[]): { actions: Action[]; states: MatchState[] } {
  const kept: Action[] = [];
  const states: MatchState[] = [];
  let state = from;
  for (const a of actions) {
    const r = applyAction(state, a);
    if (!r.ok) continue;
    state = r.state;
    kept.push(a);
    states.push(state);
  }
  return { actions: kept, states };
}

export function initHistory(base: MatchState, actions: Action[] = []): History {
  const r = replay(base, actions);
  return { base, actions: r.actions, states: [base, ...r.states] };
}

export function present(h: History): MatchState {
  return h.states[h.states.length - 1];
}

export type PushResult = { ok: true; history: History; alerts: Alert[] } | { ok: false; error: string };

export function pushAction(h: History, action: Action): PushResult {
  const r = applyAction(present(h), action);
  if (!r.ok) return r;
  return {
    ok: true,
    alerts: r.alerts,
    history: { base: h.base, actions: [...h.actions, action], states: [...h.states, r.state] },
  };
}

function lastUndoableIndex(h: History): number {
  for (let i = h.actions.length - 1; i >= 0; i--) if (!NON_UNDOABLE.has(h.actions[i].type)) return i;
  return -1;
}

export function canUndo(h: History): boolean {
  return lastUndoableIndex(h) >= 0;
}

/** Dernier événement du journal produit par l'action annulable la plus récente. */
export function lastUndoableAction(h: History): Action | null {
  const i = lastUndoableIndex(h);
  return i >= 0 ? h.actions[i] : null;
}

const ACTION_LABELS: Partial<Record<ActionType, string>> = {
  SET_LINEUP: 'saisie de la feuille de position',
  TOSS: 'tirage au sort',
};

/** Description (texte du journal) de l'action que « Annuler » supprimerait. */
export function undoLabel(h: History): string | null {
  const i = lastUndoableIndex(h);
  if (i < 0) return null;
  const before = h.states[i].events.length;
  const produced = h.states[i + 1].events.slice(before);
  return produced[0]?.text ?? ACTION_LABELS[h.actions[i].type] ?? 'dernière action';
}

export function undo(h: History): { history: History; undone: Action } | null {
  const i = lastUndoableIndex(h);
  if (i < 0) return null;
  const undone = h.actions[i];
  const before = h.states[i];
  const r = replay(before, h.actions.slice(i + 1));
  return {
    undone,
    history: {
      base: h.base,
      actions: [...h.actions.slice(0, i), ...r.actions],
      states: [...h.states.slice(0, i + 1), ...r.states],
    },
  };
}
