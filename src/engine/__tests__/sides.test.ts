import { describe, expect, it } from 'vitest';
import { currentServer, leftTeam, nextSetSetup } from '..';
import { initHistory, present, pushAction, undo } from '../../store/history';
import { act, currentSet, newMatch, points, startSet, startedMatch, tryAct, winSet } from './helpers';

describe('correction des côtés', () => {
  it('permet de choisir un côté avant le tirage sans contourner le choix du service', () => {
    const s = act(newMatch(), { type: 'SET_SIDES', leftTeam: 'B' });
    expect(leftTeam(s)).toBe('B');
    expect(nextSetSetup(s).firstServe).toBeNull();
    expect(tryAct(s, { type: 'START_SET' }).ok).toBe(false);
  });

  it('corrige le tirage en conservant le service et les compositions', () => {
    let s = act(newMatch(), { type: 'TOSS', firstServe: 'A', leftTeam: 'A' });
    s = act(s, { type: 'SET_LINEUP', team: 'A', lineup: [1, 2, 3, 4, 5, 6] });
    s = act(s, { type: 'SET_SIDES', leftTeam: 'B' });
    expect(s.prep.toss).toEqual({ firstServe: 'A', leftTeam: 'B' });
    expect(s.prep.lineups.A).toEqual([1, 2, 3, 4, 5, 6]);
    s = startSet(s);
    expect(leftTeam(s)).toBe('B');
    expect(currentServer(s)).toEqual({ team: 'A', number: 1 });
  });

  it('ne modifie ni score, ni rotations, ni compteurs et se conserve au set suivant', () => {
    let s = points(startedMatch(), 'B', 2);
    s = act(s, { type: 'TIMEOUT', team: 'A' });
    s = act(s, { type: 'SUBSTITUTION', team: 'A', out: 3, in: 7 });
    s = act(s, { type: 'LIBERO_IN', team: 'A', libero: 11, replaced: 5 });
    const before = currentSet(s);
    s = act(s, { type: 'SET_SIDES', leftTeam: 'B' });
    expect(currentSet(s)).toEqual({ ...before, leftTeam: 'B' });
    expect(leftTeam(s)).toBe('B');
    s = winSet(s, 'A');
    expect(nextSetSetup(s).leftTeam).toBe('A');
  });

  it('corrige le prochain set sans réécrire le précédent', () => {
    let s = winSet(startedMatch(), 'A');
    const previous = currentSet(s);
    expect(nextSetSetup(s).leftTeam).toBe('B');
    s = act(s, { type: 'SET_SIDES', leftTeam: 'A' });
    expect(currentSet(s)).toEqual(previous);
    s = startSet(s);
    expect(leftTeam(s)).toBe('A');
    expect(currentSet(s).serving).toBe('B');
    expect(s.prep.leftTeam).toBeUndefined();
  });

  it('préserve le changement automatique unique au set décisif avant et après correction', () => {
    let s = winSet(startedMatch({ setsToWin: 2 }), 'A');
    s = winSet(startSet(s), 'B');
    s = act(s, { type: 'TOSS', firstServe: 'A', leftTeam: 'A' });
    s = startSet(s);
    s = act(s, { type: 'SET_SIDES', leftTeam: 'B' });
    s = points(s, 'A', 8);
    expect(currentSet(s).switched).toBe(true);
    expect(leftTeam(s)).toBe('A');
    s = act(s, { type: 'SET_SIDES', leftTeam: 'B' });
    expect(currentSet(s).switched).toBe(true);
    expect(leftTeam(s)).toBe('B');
    s = points(s, 'B', 8);
    expect(leftTeam(s)).toBe('B');
    expect(s.events.filter(e => e.text.startsWith('Changement de côté'))).toHaveLength(1);
  });

  it('se restaure après rechargement et peut être annulée', () => {
    const base = startedMatch();
    const result = pushAction(initHistory(base), { type: 'SET_SIDES', leftTeam: 'B', at: 123 });
    if (!result.ok) throw new Error(result.error);
    const restored = initHistory(base, JSON.parse(JSON.stringify(result.history.actions)));
    expect(leftTeam(present(restored))).toBe('B');
    expect(present(undo(restored)!.history)).toEqual(base);
  });

  it('refuse les corrections sur un match terminé', () => {
    const s = winSet(startSet(winSet(startedMatch({ setsToWin: 2 }), 'A')), 'A');
    expect(tryAct(s, { type: 'SET_SIDES', leftTeam: 'B' }).ok).toBe(false);
  });
});
