import { describe, expect, it } from 'vitest';
import type { Action, ActionInput } from '../engine';
import { newMatch, tick } from '../engine/__tests__/helpers';
import { canUndo, initHistory, present, pushAction, undo, type History } from './history';

function push(h: History, a: ActionInput): History {
  const r = pushAction(h, { ...a, at: tick() } as Action);
  if (!r.ok) throw new Error(r.error);
  return r.history;
}

function started(): History {
  let h = initHistory(newMatch());
  h = push(h, { type: 'TOSS', firstServe: 'A', leftTeam: 'A' });
  h = push(h, { type: 'SET_LINEUP', team: 'A', lineup: [1, 2, 3, 4, 5, 6] });
  h = push(h, { type: 'SET_LINEUP', team: 'B', lineup: [21, 22, 23, 24, 25, 26] });
  return push(h, { type: 'START_SET' });
}

const set = (h: History) => present(h).sets.at(-1)!;

describe('annulation (pile d’états)', () => {
  it('annule plusieurs niveaux : point, rotation, remplacement, temps mort, sanction', () => {
    let h = started();
    const initial = present(h);
    h = push(h, { type: 'POINT', team: 'B' });
    h = push(h, { type: 'SUBSTITUTION', team: 'A', out: 3, in: 7 });
    h = push(h, { type: 'TIMEOUT', team: 'A' });
    h = push(h, { type: 'SANCTION', team: 'A', kind: 'penalty', target: { kind: 'player', number: 2 } });
    expect(set(h).score).toEqual({ A: 0, B: 2 });

    h = undo(h)!.history;
    expect(set(h).score).toEqual({ A: 0, B: 1 });
    expect(present(h).sanctions).toHaveLength(0);
    h = undo(h)!.history;
    expect(set(h).teams.A.timeouts).toBe(0);
    expect(present(h).timer).toBeNull();
    h = undo(h)!.history;
    expect(set(h).teams.A.court).toEqual([1, 2, 3, 4, 5, 6]);
    h = undo(h)!.history;
    expect(set(h).teams.B.court).toEqual([21, 22, 23, 24, 25, 26]);
    expect(present(h)).toBe(initial);
  });

  it('annule une fin de set et de match', () => {
    let h = started();
    for (let i = 0; i < 25; i++) h = push(h, { type: 'POINT', team: 'A' });
    expect(present(h).phase).toBe('pre-set');
    h = undo(h)!.history;
    expect(present(h).phase).toBe('playing');
    expect(set(h).score.A).toBe(24);
    expect(set(h).winner).toBeUndefined();
  });

  it('l’arrêt du chrono n’est pas annulable et reste appliqué', () => {
    let h = started();
    h = push(h, { type: 'TIMEOUT', team: 'B' });
    h = push(h, { type: 'TIMER_STOP' });
    h = push(h, { type: 'POINT', team: 'A' });
    h = undo(h)!.history; // annule le point
    expect(present(h).timer).toBeNull();
    expect(set(h).teams.B.timeouts).toBe(1);
    h = undo(h)!.history; // annule le temps mort (l'arrêt du chrono est ignoré)
    expect(set(h).teams.B.timeouts).toBe(0);
  });

  it('reconstruit l’état depuis les actions persistées', () => {
    const h = started();
    let h2 = push(h, { type: 'POINT', team: 'B' });
    h2 = push(h2, { type: 'POINT', team: 'B' });
    const restored = initHistory(h2.base, JSON.parse(JSON.stringify(h2.actions)));
    expect(present(restored)).toEqual(present(h2));
    expect(restored.states).toHaveLength(h2.states.length);
  });

  it('rien à annuler sur un match neuf', () => {
    const h = initHistory(newMatch());
    expect(canUndo(h)).toBe(false);
    expect(undo(h)).toBeNull();
  });
});
