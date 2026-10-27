import { describe, expect, it } from 'vitest';
import { hasLegalSubstitution, playersToReplace, regularSubsUsed, substitutionCandidates } from '..';
import { act, currentSet, startSet, startedMatch, tryAct, winSet } from './helpers';

const sub = (out: number, inn: number, exceptional = false) =>
  ({ type: 'SUBSTITUTION', team: 'A', out, in: inn, exceptional }) as const;

function expectRefused(r: ReturnType<typeof tryAct>, pattern: RegExp) {
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error).toMatch(pattern);
}

describe('remplacements réguliers', () => {
  it('un remplaçant entre à la place d’un joueur de départ, à sa position', () => {
    let s = startedMatch();
    s = act(s, sub(3, 7));
    const ts = currentSet(s).teams.A;
    expect(ts.court).toEqual([1, 2, 7, 4, 5, 6]);
    expect(regularSubsUsed(ts)).toBe(1);
    expect(ts.subs[0]).toMatchObject({ out: 3, in: 7, score: { A: 0, B: 0 } });
    expect(s.events.at(-1)?.text).toContain('(1/6)');
  });

  it('le joueur de départ revient à sa position initiale, même après rotation', () => {
    let s = startedMatch();
    s = act(s, sub(3, 7));
    s = act(s, { type: 'POINT', team: 'B' });
    s = act(s, { type: 'POINT', team: 'A' }); // rotation de A
    expect(currentSet(s).teams.A.court).toEqual([2, 7, 4, 5, 6, 1]);
    s = act(s, sub(7, 3));
    expect(currentSet(s).teams.A.court).toEqual([2, 3, 4, 5, 6, 1]);
    expect(regularSubsUsed(currentSet(s).teams.A)).toBe(2);
  });

  it('un remplaçant ne peut être remplacé que par le joueur de départ qu’il a remplacé', () => {
    let s = startedMatch();
    s = act(s, sub(3, 7));
    expectRefused(tryAct(s, sub(7, 8)), /que par le n°3/);
  });

  it('un joueur de départ ne sort qu’une fois par set', () => {
    let s = startedMatch();
    s = act(s, sub(3, 7));
    s = act(s, sub(7, 3));
    expectRefused(tryAct(s, sub(3, 8)), /déjà sorti puis rentré/);
  });

  it('un remplaçant n’entre qu’une fois par set', () => {
    let s = startedMatch();
    s = act(s, sub(3, 7));
    s = act(s, sub(7, 3));
    expectRefused(tryAct(s, sub(4, 7)), /déjà entré une fois/);
  });

  it('le remplaçant ne peut plus être remplacé une fois le cycle bouclé', () => {
    let s = startedMatch();
    s = act(s, sub(3, 7));
    s = act(s, sub(7, 3));
    // 7 est hors du terrain : il ne peut plus entrer pour personne dans ce set
    expect(substitutionCandidates(s, 'A', 5, false).find((c) => c.number === 7)?.allowed).toBe(false);
  });

  it('un joueur de départ ne peut pas entrer à la place d’un autre joueur de départ', () => {
    let s = startedMatch();
    s = act(s, sub(3, 7));
    expectRefused(tryAct(s, sub(4, 3)), /sa propre position/);
  });

  it('refuse un joueur déjà sur le terrain ou un libéro', () => {
    const s = startedMatch();
    expectRefused(tryAct(s, sub(3, 4)), /déjà sur le terrain/);
    expectRefused(tryAct(s, sub(3, 11)), /libéro/);
  });

  it('limite de 6 remplacements par set, remise à zéro au set suivant', () => {
    let s = startedMatch();
    s = act(s, sub(1, 7));
    s = act(s, sub(2, 8));
    s = act(s, sub(3, 9));
    s = act(s, sub(4, 10));
    s = act(s, sub(7, 1));
    s = act(s, sub(8, 2));
    expect(regularSubsUsed(currentSet(s).teams.A)).toBe(6);
    expectRefused(tryAct(s, sub(9, 3)), /6 remplacements/);
    s = winSet(s, 'A');
    s = startSet(s);
    expect(tryAct(s, sub(1, 7)).ok).toBe(true);
  });

  it('liste les candidats autorisés et grisés avec la raison', () => {
    let s = startedMatch();
    s = act(s, sub(3, 7));
    const c = substitutionCandidates(s, 'A', 7, false);
    expect(c.filter((x) => x.allowed).map((x) => x.number)).toEqual([3]);
    const eight = c.find((x) => x.number === 8)!;
    expect(eight.allowed).toBe(false);
    expect(eight.reason).toMatch(/que par le n°3/);
  });
});

describe('remplacement exceptionnel', () => {
  it('possible au-delà de la limite, non décompté, joueur blessé exclu du match', () => {
    let s = startedMatch();
    s = act(s, sub(1, 7));
    s = act(s, sub(2, 8));
    s = act(s, sub(3, 9));
    s = act(s, sub(4, 10));
    s = act(s, sub(7, 1));
    s = act(s, sub(8, 2));
    expectRefused(tryAct(s, sub(5, 8)), /6 remplacements/);
    // un joueur ayant déjà joué (8) peut entrer exceptionnellement
    s = act(s, sub(5, 8, true));
    const ts = currentSet(s).teams.A;
    expect(ts.court).toContain(8);
    expect(regularSubsUsed(ts)).toBe(6);
    expect(s.barred.A).toEqual([5]);
    expect(s.events.at(-1)?.text).toMatch(/exceptionnel/);
    // le blessé ne peut plus rentrer, ni dans ce set ni au suivant
    s = winSet(s, 'A');
    const r = tryAct(s, { type: 'SET_LINEUP', team: 'A', lineup: [1, 2, 3, 4, 5, 6] });
    expectRefused(r, /ne peut pas jouer/);
  });

  it('interdit au libéro et aux joueurs sur le terrain', () => {
    const s = startedMatch();
    expectRefused(tryAct(s, sub(3, 11, true)), /libéro/);
    expectRefused(tryAct(s, sub(3, 4, true)), /déjà sur le terrain/);
  });
});

describe('expulsion et disqualification', () => {
  it('le joueur expulsé doit être remplacé légalement et revient au set suivant', () => {
    let s = startedMatch();
    const r = tryAct(s, { type: 'SANCTION', team: 'A', kind: 'expulsion', target: { kind: 'player', number: 4 } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.alerts.some((a) => /remplacement régulier/.test(a.text))).toBe(true);
    s = r.state;
    expect(currentSet(s).score).toEqual({ A: 0, B: 0 });
    expect(playersToReplace(s, 'A')).toEqual([4]);
    s = act(s, sub(4, 7));
    expect(playersToReplace(s, 'A')).toEqual([]);
    expectRefused(tryAct(s, sub(7, 4)), /expulsé/);
    s = winSet(s, 'B');
    expect(tryAct(s, { type: 'SET_LINEUP', team: 'A', lineup: [1, 2, 3, 4, 5, 6] }).ok).toBe(true);
  });

  it('le joueur disqualifié ne peut plus jouer du match', () => {
    let s = startedMatch();
    s = act(s, { type: 'SANCTION', team: 'A', kind: 'disqualification', target: { kind: 'player', number: 4 } });
    s = act(s, sub(4, 7));
    s = winSet(s, 'B');
    expectRefused(tryAct(s, { type: 'SET_LINEUP', team: 'A', lineup: [1, 2, 3, 4, 5, 6] }), /disqualifié/);
  });

  it('sans remplacement légal possible, l’équipe peut être déclarée incomplète', () => {
    let s = startedMatch();
    s = act(s, sub(4, 7));
    s = act(s, sub(7, 4));
    expect(hasLegalSubstitution(s, 'A', 4)).toBe(false);
    const r = tryAct(s, { type: 'SANCTION', team: 'A', kind: 'expulsion', target: { kind: 'player', number: 4 } });
    expect(r.ok && r.alerts.some((a) => /incomplète/.test(a.text))).toBe(true);
    s = r.ok ? r.state : s;
    s = act(s, { type: 'DECLARE_INCOMPLETE', team: 'A', scope: 'set' });
    expect(s.sets[0]).toMatchObject({ winner: 'B', endReason: 'incomplete', score: { A: 0, B: 25 } });
    expect(s.phase).toBe('pre-set');
  });

  it('équipe incomplète pour le match : l’adversaire reçoit les sets nécessaires', () => {
    let s = startedMatch();
    s = winSet(s, 'A');
    s = startSet(s);
    s = act(s, { type: 'POINT', team: 'A' });
    s = act(s, { type: 'DECLARE_INCOMPLETE', team: 'A', scope: 'match' });
    expect(s.phase).toBe('finished');
    expect(s.winner).toBe('B');
    expect(s.sets.map((x) => x.score)).toEqual([
      { A: 25, B: 0 },
      { A: 1, B: 25 },
      { A: 0, B: 25 },
      { A: 0, B: 25 },
    ]);
  });
});
