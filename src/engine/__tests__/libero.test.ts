import { describe, expect, it } from 'vitest';
import { liberoMustLeave, regularSubsUsed } from '..';
import { act, currentSet, startedMatch, tryAct } from './helpers';

function expectRefused(r: ReturnType<typeof tryAct>, pattern: RegExp) {
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error).toMatch(pattern);
}

describe('libéro', () => {
  it('remplace un joueur de la ligne arrière, sans compter dans les remplacements', () => {
    let s = startedMatch();
    s = act(s, { type: 'LIBERO_IN', team: 'A', libero: 11, replaced: 5 });
    const ts = currentSet(s).teams.A;
    expect(ts.court).toEqual([1, 2, 3, 4, 11, 6]);
    expect(ts.libero).toEqual({ libero: 11, replaced: 5 });
    expect(regularSubsUsed(ts)).toBe(0);
  });

  it('ne peut pas remplacer un joueur de la ligne avant', () => {
    const s = startedMatch();
    expectRefused(tryAct(s, { type: 'LIBERO_IN', team: 'A', libero: 11, replaced: 3 }), /ligne arrière/);
  });

  it('ne peut pas servir : refus de remplacer le serveur', () => {
    const s = startedMatch();
    expectRefused(tryAct(s, { type: 'LIBERO_IN', team: 'A', libero: 11, replaced: 1 }), /servir/);
  });

  it('peut remplacer le joueur en position I quand l’équipe est en réception', () => {
    const s = startedMatch({}, 'B');
    expect(tryAct(s, { type: 'LIBERO_IN', team: 'A', libero: 11, replaced: 1 }).ok).toBe(true);
  });

  it('un échange doit séparer deux remplacements libéro', () => {
    let s = startedMatch();
    s = act(s, { type: 'LIBERO_IN', team: 'A', libero: 11, replaced: 5 });
    expectRefused(tryAct(s, { type: 'LIBERO_OUT', team: 'A' }), /échange doit avoir eu lieu/);
    s = act(s, { type: 'POINT', team: 'A' });
    s = act(s, { type: 'LIBERO_OUT', team: 'A' });
    expect(currentSet(s).teams.A.court).toEqual([1, 2, 3, 4, 5, 6]);
    expect(currentSet(s).teams.A.libero).toBeNull();
  });

  it('le libéro ne peut être remplacé que par le joueur qu’il a remplacé', () => {
    let s = startedMatch();
    s = act(s, { type: 'LIBERO_IN', team: 'A', libero: 11, replaced: 5 });
    s = act(s, { type: 'POINT', team: 'A' });
    // le n°5 est lié au libéro : il ne peut pas entrer par remplacement régulier
    expectRefused(tryAct(s, { type: 'SUBSTITUTION', team: 'A', out: 3, in: 5 }), /remplacé par le libéro/);
    // le libéro ne fait pas l'objet d'un remplacement régulier
    expectRefused(tryAct(s, { type: 'SUBSTITUTION', team: 'A', out: 11, in: 7 }), /Libéro/);
    s = act(s, { type: 'LIBERO_OUT', team: 'A' });
    expect(currentSet(s).teams.A.court[4]).toBe(5);
  });

  it('alerte « le libéro doit sortir » quand sa position passe en IV', () => {
    let s = startedMatch();
    s = act(s, { type: 'LIBERO_IN', team: 'A', libero: 11, replaced: 5 });
    s = act(s, { type: 'POINT', team: 'B' });
    const r = tryAct(s, { type: 'POINT', team: 'A' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.alerts.some((a) => /doit sortir/.test(a.text))).toBe(true);
    s = r.state;
    expect(currentSet(s).teams.A.court[3]).toBe(11);
    expect(liberoMustLeave(currentSet(s), 'A')).toBe(true);
    expectRefused(tryAct(s, { type: 'LIBERO_SWAP', team: 'A', libero: 12 }), /doit sortir/);
    s = act(s, { type: 'LIBERO_OUT', team: 'A' });
    expect(currentSet(s).teams.A.court).toEqual([2, 3, 4, 5, 6, 1]);
    expect(liberoMustLeave(currentSet(s), 'A')).toBe(false);
  });

  it('échange libéro/libéro avec deux libéros', () => {
    let s = startedMatch();
    s = act(s, { type: 'LIBERO_IN', team: 'A', libero: 11, replaced: 6 });
    expectRefused(tryAct(s, { type: 'LIBERO_SWAP', team: 'A', libero: 12 }), /échange doit avoir eu lieu/);
    s = act(s, { type: 'POINT', team: 'A' });
    s = act(s, { type: 'LIBERO_SWAP', team: 'A', libero: 12 });
    const ts = currentSet(s).teams.A;
    expect(ts.court[5]).toBe(12);
    expect(ts.libero).toEqual({ libero: 12, replaced: 6 });
    expectRefused(tryAct(s, { type: 'LIBERO_IN', team: 'A', libero: 11, replaced: 5 }), /déjà sur le terrain/);
  });

  it('re-désignation d’un libéro quand l’équipe n’a plus de libéro apte', () => {
    let s = startedMatch();
    expectRefused(
      tryAct(s, { type: 'LIBERO_REDESIGNATE', team: 'B', unable: 30, newLibero: 21 }),
      /sur le terrain/,
    );
    s = act(s, { type: 'LIBERO_REDESIGNATE', team: 'B', unable: 30, newLibero: 27 });
    expect(s.teams.B.players.find((p) => p.number === 27)?.libero).toBe(true);
    expect(s.liberosUnable.B).toEqual([30]);
    expectRefused(tryAct(s, { type: 'LIBERO_IN', team: 'B', libero: 30, replaced: 25 }), /inapte/);
    expect(tryAct(s, { type: 'LIBERO_IN', team: 'B', libero: 27, replaced: 25 }).ok).toBe(true);
  });

  it('re-désignation refusée tant qu’un second libéro est apte', () => {
    let s = startedMatch();
    expectRefused(
      tryAct(s, { type: 'LIBERO_REDESIGNATE', team: 'A', unable: 11, newLibero: 7 }),
      /encore d'un libéro apte/,
    );
    s = act(s, { type: 'LIBERO_IN', team: 'A', libero: 11, replaced: 5 });
    s = act(s, { type: 'LIBERO_REDESIGNATE', team: 'A', unable: 11, newLibero: null });
    // le libéro inapte sur le terrain sort automatiquement
    expect(currentSet(s).teams.A.court[4]).toBe(5);
    expect(currentSet(s).teams.A.libero).toBeNull();
  });

  it('un libéro expulsé sort immédiatement', () => {
    let s = startedMatch();
    s = act(s, { type: 'LIBERO_IN', team: 'B', libero: 30, replaced: 25 });
    const r = tryAct(s, { type: 'SANCTION', team: 'B', kind: 'expulsion', target: { kind: 'player', number: 30 } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(currentSet(r.state).teams.B.court).toEqual([21, 22, 23, 24, 25, 26]);
    expect(r.alerts.some((a) => /re-désignation/.test(a.text))).toBe(true);
  });
});
