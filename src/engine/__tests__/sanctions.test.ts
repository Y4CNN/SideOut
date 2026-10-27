import { describe, expect, it } from 'vitest';
import { summaryText } from '..';
import { act, currentSet, reachScore, startedMatch, tryAct, winSet } from './helpers';

describe('sanctions', () => {
  it('avertissement : enregistré, sans conséquence sur le score', () => {
    let s = startedMatch();
    s = act(s, { type: 'SANCTION', team: 'A', kind: 'warning', target: { kind: 'player', number: 3 } });
    expect(currentSet(s).score).toEqual({ A: 0, B: 0 });
    expect(s.sanctions).toHaveLength(1);
    expect(s.sanctions[0]).toMatchObject({ kind: 'warning', set: 1, score: { A: 0, B: 0 } });
    expect(s.events.at(-1)?.type).toBe('sanction');
  });

  it('pénalité : point et service à l’adversaire (avec rotation)', () => {
    let s = startedMatch();
    s = act(s, { type: 'SANCTION', team: 'A', kind: 'penalty', target: { kind: 'player', number: 3 } });
    expect(currentSet(s).score).toEqual({ A: 0, B: 1 });
    expect(currentSet(s).serving).toBe('B');
    expect(currentSet(s).teams.B.court[0]).toBe(22);
  });

  it('pénalité contre l’équipe en réception : point au serveur, sans rotation', () => {
    let s = startedMatch();
    s = act(s, { type: 'SANCTION', team: 'B', kind: 'penalty', target: { kind: 'staff', role: 'Entraîneur' } });
    expect(currentSet(s).score).toEqual({ A: 1, B: 0 });
    expect(currentSet(s).teams.A.court).toEqual([1, 2, 3, 4, 5, 6]);
    expect(s.events.some((e) => e.text.includes('Entraîneur'))).toBe(true);
  });

  it('une pénalité peut terminer le set', () => {
    let s = startedMatch();
    s = reachScore(s, 20, 24);
    s = act(s, { type: 'SANCTION', team: 'A', kind: 'penalty', target: { kind: 'player', number: 1 } });
    expect(s.sets[0].winner).toBe('B');
    expect(s.phase).toBe('pre-set');
  });

  it('rappelle les sanctions déjà reçues par le même membre', () => {
    let s = startedMatch();
    s = act(s, { type: 'SANCTION', team: 'A', kind: 'warning', target: { kind: 'player', number: 3 } });
    const r = tryAct(s, { type: 'SANCTION', team: 'A', kind: 'penalty', target: { kind: 'player', number: 3 } });
    expect(r.ok && r.alerts.some((a) => /déjà reçu/.test(a.text))).toBe(true);
  });

  it('avertissement possible entre deux sets, pénalité non', () => {
    let s = startedMatch();
    s = winSet(s, 'A');
    expect(tryAct(s, { type: 'SANCTION', team: 'B', kind: 'warning', target: { kind: 'player', number: 21 } }).ok).toBe(
      true,
    );
    expect(tryAct(s, { type: 'SANCTION', team: 'B', kind: 'penalty', target: { kind: 'player', number: 21 } }).ok).toBe(
      false,
    );
  });
});

describe('retards et demandes irrégulières', () => {
  it('1er retard : avertissement ; retard suivant : pénalité (point adverse)', () => {
    let s = startedMatch();
    s = act(s, { type: 'DELAY', team: 'A' });
    expect(s.sanctions.at(-1)?.kind).toBe('delay-warning');
    expect(currentSet(s).score).toEqual({ A: 0, B: 0 });
    s = act(s, { type: 'DELAY', team: 'A' });
    expect(s.sanctions.at(-1)?.kind).toBe('delay-penalty');
    expect(currentSet(s).score).toEqual({ A: 0, B: 1 });
    // l'avertissement pour retard vaut pour tout le match
    s = winSet(s, 'A');
    s = act(s, { type: 'SET_LINEUP', team: 'A', lineup: [1, 2, 3, 4, 5, 6] });
    s = act(s, { type: 'SET_LINEUP', team: 'B', lineup: [21, 22, 23, 24, 25, 26] });
    s = act(s, { type: 'START_SET' });
    s = act(s, { type: 'DELAY', team: 'A' });
    expect(s.sanctions.at(-1)?.kind).toBe('delay-penalty');
  });

  it('demande irrégulière : notée la 1re fois, puis sanctionnée comme un retard', () => {
    let s = startedMatch();
    s = act(s, { type: 'IMPROPER_REQUEST', team: 'B' });
    expect(s.improperRequests.B).toBe(1);
    expect(s.sanctions).toHaveLength(0);
    s = act(s, { type: 'IMPROPER_REQUEST', team: 'B' });
    expect(s.sanctions.at(-1)?.kind).toBe('delay-warning');
    s = act(s, { type: 'IMPROPER_REQUEST', team: 'B' });
    expect(s.sanctions.at(-1)?.kind).toBe('delay-penalty');
    expect(currentSet(s).score).toEqual({ A: 1, B: 0 });
  });
});

describe('fautes de position et de rotation', () => {
  it('faute de position : point à l’adversaire', () => {
    let s = startedMatch();
    s = act(s, { type: 'POSITION_FAULT', team: 'B' });
    expect(currentSet(s).score).toEqual({ A: 1, B: 0 });
    expect(s.events.some((e) => e.type === 'fault')).toBe(true);
  });

  it('faute de rotation avec rectification de l’ordre', () => {
    let s = startedMatch();
    s = act(s, { type: 'ROTATION_FAULT', team: 'A', corrected: [2, 1, 3, 4, 5, 6] });
    expect(currentSet(s).teams.A.court).toEqual([2, 1, 3, 4, 5, 6]);
    expect(currentSet(s).score).toEqual({ A: 0, B: 1 });
    expect(tryAct(s, { type: 'ROTATION_FAULT', team: 'A', corrected: [7, 1, 3, 4, 5, 6] }).ok).toBe(false);
  });

  it('correction manuelle de la rotation', () => {
    let s = startedMatch();
    s = act(s, { type: 'SET_COURT', team: 'B', court: [26, 21, 22, 23, 24, 25] });
    expect(currentSet(s).teams.B.court).toEqual([26, 21, 22, 23, 24, 25]);
    expect(tryAct(s, { type: 'SET_COURT', team: 'B', court: [26, 21, 22, 23, 24, 25] }).ok).toBe(false);
    s = act(s, { type: 'LIBERO_IN', team: 'A', libero: 11, replaced: 5 });
    expect(tryAct(s, { type: 'SET_COURT', team: 'A', court: [1, 2, 11, 4, 5, 6].map((n) => (n === 5 ? 3 : n)) }).ok).toBe(
      false,
    );
  });
});

describe('récapitulatif', () => {
  it('produit un texte avec scores par set et sanctions', () => {
    let s = startedMatch();
    s = act(s, { type: 'SANCTION', team: 'A', kind: 'warning', target: { kind: 'player', number: 3 } });
    s = winSet(s, 'B');
    const text = summaryText(s);
    expect(text).toContain('Paris – Lyon');
    expect(text).toContain('Set 1 : 0–25');
    expect(text).toContain('Avertissement');
  });
});
