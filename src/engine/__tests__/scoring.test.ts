import { describe, expect, it } from 'vitest';
import { currentServer, isPermutation, leftTeam, needsToss, rotate, rotateBack, timerRemainingMs } from '..';
import { act, currentSet, newMatch, points, reachScore, startSet, startedMatch, tryAct, winSet } from './helpers';

describe('rotation', () => {
  it('tourne dans le sens des aiguilles d’une montre (II → I, I → VI)', () => {
    expect(rotate([1, 2, 3, 4, 5, 6])).toEqual([2, 3, 4, 5, 6, 1]);
  });
  it('six rotations ramènent la composition initiale ; rotateBack est l’inverse', () => {
    let c = [1, 2, 3, 4, 5, 6];
    for (let i = 0; i < 6; i++) c = rotate(c);
    expect(c).toEqual([1, 2, 3, 4, 5, 6]);
    expect(rotateBack(rotate([7, 8, 9, 10, 11, 12]))).toEqual([7, 8, 9, 10, 11, 12]);
  });
  it('détecte une permutation', () => {
    expect(isPermutation([1, 2, 3], [3, 1, 2])).toBe(true);
    expect(isPermutation([1, 2, 3], [3, 1, 4])).toBe(false);
  });
});

describe('préparation et début de set', () => {
  it('exige le tirage au sort et les deux feuilles de position', () => {
    let s = newMatch();
    expect(needsToss(s)).toBe(true);
    expect(tryAct(s, { type: 'START_SET' })).toMatchObject({ ok: false });
    s = act(s, { type: 'TOSS', firstServe: 'B', leftTeam: 'B' });
    s = act(s, { type: 'SET_LINEUP', team: 'A', lineup: [1, 2, 3, 4, 5, 6] });
    const r = tryAct(s, { type: 'START_SET' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('Lyon');
  });

  it('refuse une composition invalide (doublon, joueur inconnu, libéro)', () => {
    const s = newMatch();
    const dup = tryAct(s, { type: 'SET_LINEUP', team: 'A', lineup: [1, 1, 3, 4, 5, 6] });
    expect(dup.ok).toBe(false);
    const unknown = tryAct(s, { type: 'SET_LINEUP', team: 'A', lineup: [1, 2, 3, 4, 5, 99] });
    expect(unknown.ok).toBe(false);
    const libero = tryAct(s, { type: 'SET_LINEUP', team: 'A', lineup: [1, 2, 3, 4, 5, 11] });
    expect(libero.ok).toBe(false);
    if (!libero.ok) expect(libero.error).toMatch(/libéro/);
    const short = tryAct(s, { type: 'SET_LINEUP', team: 'A', lineup: [1, 2, 3] });
    expect(short.ok).toBe(false);
  });

  it('le serveur est le joueur en position I de l’équipe au service', () => {
    const s = startedMatch({}, 'B');
    expect(currentServer(s)).toEqual({ team: 'B', number: 21 });
  });
});

describe('score et service', () => {
  it('point de l’équipe au service : pas de rotation', () => {
    let s = startedMatch();
    s = act(s, { type: 'POINT', team: 'A' });
    expect(currentSet(s).score).toEqual({ A: 1, B: 0 });
    expect(currentSet(s).teams.A.court).toEqual([1, 2, 3, 4, 5, 6]);
    expect(currentSet(s).serving).toBe('A');
  });

  it('side-out : l’équipe en réception gagne le service et tourne', () => {
    let s = startedMatch();
    s = act(s, { type: 'POINT', team: 'B' });
    expect(currentSet(s).serving).toBe('B');
    expect(currentSet(s).teams.B.court).toEqual([22, 23, 24, 25, 26, 21]);
    expect(currentSet(s).teams.A.court).toEqual([1, 2, 3, 4, 5, 6]);
    expect(currentServer(s)).toEqual({ team: 'B', number: 22 });
    s = act(s, { type: 'POINT', team: 'A' });
    expect(currentSet(s).teams.A.court).toEqual([2, 3, 4, 5, 6, 1]);
  });

  it('ne modifie jamais l’état précédent (fonction pure)', () => {
    const s = startedMatch();
    const snapshot = JSON.stringify(s);
    act(s, { type: 'POINT', team: 'B' });
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  it('journalise chaque point avec le score', () => {
    let s = startedMatch();
    s = act(s, { type: 'POINT', team: 'B' });
    const last = s.events[s.events.length - 1];
    expect(last.type).toBe('point');
    expect(last.score).toEqual({ A: 0, B: 1 });
    expect(last.text).toContain('Lyon');
  });
});

describe('fin de set', () => {
  it('25–23 termine le set', () => {
    let s = startedMatch();
    s = reachScore(s, 24, 23);
    expect(s.phase).toBe('playing');
    s = act(s, { type: 'POINT', team: 'A' });
    expect(s.sets[0].winner).toBe('A');
    expect(s.sets[0].score).toEqual({ A: 25, B: 23 });
    expect(s.phase).toBe('pre-set');
  });

  it('pas de fin de set à 25–24 ; 24–24 se joue jusqu’à 2 points d’écart', () => {
    let s = startedMatch();
    s = reachScore(s, 24, 24);
    s = act(s, { type: 'POINT', team: 'A' });
    expect(currentSet(s).winner).toBeUndefined();
    s = act(s, { type: 'POINT', team: 'B' });
    s = act(s, { type: 'POINT', team: 'B' });
    expect(currentSet(s).winner).toBeUndefined();
    s = act(s, { type: 'POINT', team: 'B' });
    expect(s.sets[0].winner).toBe('B');
    expect(s.sets[0].score).toEqual({ A: 25, B: 27 });
  });

  it('plafond de points optionnel', () => {
    let s = startedMatch({ pointCap: 27 });
    s = reachScore(s, 26, 26);
    s = act(s, { type: 'POINT', team: 'B' });
    expect(s.sets[0].winner).toBe('B');
  });

  it('lance le chrono d’intervalle et alterne service et côtés au set suivant', () => {
    let s = startedMatch();
    s = winSet(s, 'A');
    expect(s.timer?.kind).toBe('interval');
    expect(s.timer?.duration).toBe(180);
    expect(needsToss(s)).toBe(false);
    expect(leftTeam(s)).toBe('B');
    s = startSet(s);
    expect(currentSet(s).number).toBe(2);
    expect(currentSet(s).firstServe).toBe('B');
    expect(currentSet(s).leftTeam).toBe('B');
    expect(s.timer).toBeNull();
    expect(currentSet(s).teams.A.timeouts).toBe(0);
  });

  it('côtés conservés si l’inversion entre les sets est désactivée', () => {
    let s = startedMatch({ switchSidesBetweenSets: false });
    s = winSet(s, 'A');
    expect(leftTeam(s)).toBe('A');
  });

  it('fin forcée du set avec le score actuel', () => {
    let s = startedMatch();
    s = points(s, 'B', 3);
    s = act(s, { type: 'FORCE_END_SET', winner: 'B' });
    expect(s.sets[0]).toMatchObject({ winner: 'B', endReason: 'forced', score: { A: 0, B: 3 } });
  });
});

describe('fin de match et set décisif', () => {
  it('3 sets gagnants : 3–0 termine le match', () => {
    let s = startedMatch();
    for (let i = 0; i < 3; i++) {
      if (i > 0) s = startSet(s);
      s = winSet(s, 'B');
    }
    expect(s.phase).toBe('finished');
    expect(s.winner).toBe('B');
    expect(s.timer).toBeNull();
    expect(tryAct(s, { type: 'POINT', team: 'A' }).ok).toBe(false);
  });

  it('set décisif : nouveau tirage, 15 points, changement de côté à 8', () => {
    let s = startedMatch();
    for (const w of ['A', 'B', 'A', 'B'] as const) {
      s = winSet(s, w);
      if (s.sets.length < 4) s = startSet(s);
    }
    expect(s.phase).toBe('pre-set');
    expect(needsToss(s)).toBe(true);
    expect(tryAct(s, { type: 'SET_LINEUP', team: 'A', lineup: [1, 2, 3, 4, 5, 6] }).ok).toBe(true);
    s = act(s, { type: 'TOSS', firstServe: 'A', leftTeam: 'B' });
    s = startSet(s);
    expect(currentSet(s).number).toBe(5);
    expect(leftTeam(s)).toBe('B');

    s = reachScore(s, 7, 7);
    expect(currentSet(s).switched).toBe(false);
    const r = tryAct(s, { type: 'POINT', team: 'A' });
    expect(r.ok && r.alerts.some((a) => a.kind === 'side-switch')).toBe(true);
    s = r.ok ? r.state : s;
    expect(currentSet(s).switched).toBe(true);
    expect(leftTeam(s)).toBe('A');
    // pas de second changement quand l'autre équipe atteint 8
    s = act(s, { type: 'POINT', team: 'B' });
    expect(s.events.filter((e) => e.type === 'side-switch')).toHaveLength(1);

    s = reachScore(s, 14, 14);
    s = act(s, { type: 'POINT', team: 'A' });
    expect(s.phase).toBe('playing');
    s = act(s, { type: 'POINT', team: 'A' });
    expect(s.phase).toBe('finished');
    expect(s.sets[4].score).toEqual({ A: 16, B: 14 });
    expect(s.winner).toBe('A');
  });

  it('pas de changement de côté à 8 hors set décisif', () => {
    let s = startedMatch();
    s = points(s, 'A', 8);
    expect(currentSet(s).switched).toBe(false);
  });

  it('2 sets gagnants : le 3e set est décisif (15 points)', () => {
    let s = startedMatch({ setsToWin: 2 });
    s = winSet(s, 'A');
    s = startSet(s);
    s = winSet(s, 'B');
    expect(needsToss(s)).toBe(true);
    s = act(s, { type: 'TOSS', firstServe: 'B', leftTeam: 'A' });
    s = startSet(s);
    s = winSet(s, 'B');
    expect(s.sets[2].score.B).toBe(15);
    expect(s.winner).toBe('B');
  });
});

describe('temps morts', () => {
  it('2 temps morts par set, le 3e est refusé, chrono de 30 s', () => {
    let s = startedMatch();
    s = act(s, { type: 'TIMEOUT', team: 'A' });
    expect(s.timer).toMatchObject({ kind: 'timeout', team: 'A', duration: 30 });
    expect(timerRemainingMs(s, s.timer!.startedAt + 12_000)).toBe(18_000);
    expect(timerRemainingMs(s, s.timer!.startedAt + 45_000)).toBe(0);
    s = act(s, { type: 'TIMER_STOP' });
    expect(s.timer).toBeNull();
    s = act(s, { type: 'TIMEOUT', team: 'A' });
    const r = tryAct(s, { type: 'TIMEOUT', team: 'A' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('2 temps morts');
    expect(tryAct(s, { type: 'TIMEOUT', team: 'B' }).ok).toBe(true);
  });

  it('compteur remis à zéro au set suivant', () => {
    let s = startedMatch();
    s = act(s, { type: 'TIMEOUT', team: 'A' });
    s = act(s, { type: 'TIMEOUT', team: 'A' });
    s = winSet(s, 'A');
    s = startSet(s);
    expect(tryAct(s, { type: 'TIMEOUT', team: 'A' }).ok).toBe(true);
  });

  it('temps morts techniques à 8 et 16 (sets 1 à 4) quand activés', () => {
    let s = startedMatch({ technicalTimeouts: { enabled: true, atPoints: [8, 16], duration: 60 } });
    s = points(s, 'A', 7);
    expect(s.timer).toBeNull();
    s = act(s, { type: 'POINT', team: 'A' });
    expect(s.timer).toMatchObject({ kind: 'technical', duration: 60 });
    s = act(s, { type: 'TIMER_STOP' });
    s = points(s, 'B', 8);
    expect(s.timer).toBeNull();
    s = points(s, 'A', 8);
    expect(currentSet(s).technicalTimeouts).toEqual([8, 16]);
  });

  it('pas de temps mort technique par défaut', () => {
    let s = startedMatch();
    s = points(s, 'A', 8);
    expect(s.timer).toBeNull();
  });
});
