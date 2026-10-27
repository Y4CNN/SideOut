/**
 * Moteur de règles : fonction pure (état + action → nouvel état).
 * Chaque action est horodatée par l'appelant, ce qui rend le moteur déterministe
 * et permet l'annulation par simple pile d'états.
 */
import { produce, type Draft } from 'immer';
import { isDecidingSet, targetPoints, type MatchConfig } from './config';
import { checkLiberoIn, checkLiberoOut, checkLiberoSwap, checkRedesignation, liberoMustLeave } from './libero';
import { isFrontRow, isPermutation, positionLabel, rotate } from './rotation';
import { ableLiberos, findPlayer, playerLabel, validateLineup } from './roster';
import { nextSetSetup, needsToss, setsWon } from './selectors';
import { checkSubstitution, hasLegalSubstitution, regularSubsUsed } from './substitutions';
import type {
  Action,
  ActionResult,
  Alert,
  Court,
  EventType,
  MatchState,
  SanctionKind,
  SanctionTarget,
  Score,
  SetEndReason,
  SetState,
  Team,
  TeamId,
  TeamSetState,
} from './types';
import { other } from './types';

class RuleError extends Error {}

function fail(message: string): never {
  throw new RuleError(message);
}

type D = Draft<MatchState>;

export function createMatch(config: MatchConfig, teams: Record<TeamId, Team>, at: number, id?: string): MatchState {
  const state: MatchState = {
    version: 1,
    id: id ?? `m-${at.toString(36)}`,
    config: structuredClone(config),
    teams: structuredClone(teams),
    phase: 'pre-set',
    sets: [],
    prep: { toss: null, lineups: { A: null, B: null } },
    sanctions: [],
    improperRequests: { A: 0, B: 0 },
    disqualified: { A: [], B: [] },
    expelled: { A: [], B: [] },
    barred: { A: [], B: [] },
    liberosUnable: { A: [], B: [] },
    timer: null,
    events: [],
    createdAt: at,
  };
  state.events.push({
    id: 1,
    at,
    set: null,
    score: null,
    type: 'match-start',
    text: `Match créé : ${teams.A.name} – ${teams.B.name}`,
  });
  return state;
}

export function applyAction(state: MatchState, action: Action): ActionResult {
  const alerts: Alert[] = [];
  try {
    const next = produce(state, (draft) => {
      handle(draft, action, alerts);
    });
    return { ok: true, state: next, alerts };
  } catch (e) {
    if (e instanceof RuleError) return { ok: false, error: e.message };
    throw e;
  }
}

// ——— utilitaires ————————————————————————————————————————————————

const name = (d: D, t: TeamId) => d.teams[t].name;

function cur(d: D): Draft<SetState> {
  if (d.phase !== 'playing') fail("Aucun set n'est en cours.");
  return d.sets[d.sets.length - 1];
}

function log(d: D, at: number, type: EventType, text: string, team?: TeamId) {
  const set = d.phase === 'playing' || d.sets.length ? d.sets[d.sets.length - 1] : undefined;
  d.events.push({
    id: d.events.length + 1,
    at,
    set: set ? set.number : null,
    score: set ? { ...set.score } : null,
    type,
    team,
    text,
  });
}

function scoreText(d: D, score: Score): string {
  return `${name(d, 'A')} ${score.A} – ${score.B} ${name(d, 'B')}`;
}

function courtText(court: Court): string {
  return court.map((n, i) => `${positionLabel(i)}:${n}`).join(' ');
}

function emptyTeamSet(lineup: Court): TeamSetState {
  return { lineup: [...lineup], court: [...lineup], timeouts: 0, subs: [], libero: null, lastLiberoRally: null };
}

function isSetWon(config: MatchConfig, setNumber: number, score: Score, team: TeamId): boolean {
  const s = score[team];
  const o = score[other(team)];
  if (config.pointCap !== null && s >= config.pointCap) return true;
  return s >= targetPoints(config, setNumber) && s - o >= config.minLead;
}

// ——— points et fin de set ——————————————————————————————————————

type PointReason = 'rally' | 'penalty' | 'delay' | 'position-fault' | 'rotation-fault';

const POINT_SUFFIX: Record<PointReason, string> = {
  rally: '',
  penalty: ' (pénalité adverse)',
  delay: ' (pénalité pour retard adverse)',
  'position-fault': ' (faute de position adverse)',
  'rotation-fault': ' (faute de rotation adverse)',
};

function awardPoint(d: D, team: TeamId, at: number, reason: PointReason, alerts: Alert[]) {
  const set = cur(d);
  set.score[team]++;
  set.rallies++;
  let text = `Point ${name(d, team)}${POINT_SUFFIX[reason]}`;
  if (set.serving !== team) {
    set.serving = team;
    const ts = set.teams[team];
    ts.court = rotate(ts.court);
    text += ` — gain du service, rotation (service n°${ts.court[0]})`;
  }
  log(d, at, 'point', text, team);

  if (liberoMustLeave(set as SetState, team) && set.teams[team].libero) {
    const lib = set.teams[team].libero!;
    alerts.push({
      kind: 'warning',
      text: `${name(d, team)} : le libéro n°${lib.libero} passe en position IV, il doit sortir (retour du n°${lib.replaced}).`,
    });
  }

  if (isSetWon(d.config, set.number, set.score, team)) {
    endSet(d, team, at, 'normal', alerts);
    return;
  }

  const switchAt = d.config.decidingSetSwitchAt;
  const deciding = isDecidingSet(d.config, set.number);
  if (
    deciding &&
    switchAt !== null &&
    !set.switched &&
    set.score[team] === switchAt &&
    set.score[other(team)] < switchAt
  ) {
    set.switched = true;
    log(d, at, 'side-switch', `Changement de côté (${switchAt} points au set décisif)`);
    alerts.push({ kind: 'side-switch', text: `Changement de côté : ${name(d, team)} atteint ${switchAt} points.` });
  }

  const tto = d.config.technicalTimeouts;
  if (tto.enabled && !deciding) {
    for (const th of tto.atPoints) {
      if (!set.technicalTimeouts.includes(th) && set.score[team] === th && set.score[other(team)] < th) {
        set.technicalTimeouts.push(th);
        d.timer = { kind: 'technical', startedAt: at, duration: tto.duration };
        log(d, at, 'technical-timeout', `Temps mort technique (${th} points)`);
        alerts.push({ kind: 'info', text: `Temps mort technique (${th} points).` });
      }
    }
  }
}

function endSet(d: D, winner: TeamId, at: number, reason: SetEndReason, alerts: Alert[]) {
  const set = cur(d);
  set.winner = winner;
  set.endedAt = at;
  set.endReason = reason;
  d.timer = null;
  const forced = reason === 'forced' ? ' (fin de set forcée)' : reason === 'incomplete' ? ' (équipe incomplète)' : '';
  log(d, at, 'set-end', `Fin du set ${set.number} : ${scoreText(d, set.score)} — gagné par ${name(d, winner)}${forced}`, winner);

  const won = setsWon(d as MatchState);
  if (won[winner] >= d.config.setsToWin) {
    d.phase = 'finished';
    d.winner = winner;
    d.endedAt = at;
    log(d, at, 'match-end', `Fin du match : ${name(d, winner)} gagne ${won[winner]}–${won[other(winner)]}`, winner);
    alerts.push({ kind: 'match-end', text: `${name(d, winner)} remporte le match ${won[winner]}–${won[other(winner)]} !` });
    return;
  }
  d.phase = 'pre-set';
  d.prep = { toss: null, lineups: { A: null, B: null } };
  if (d.config.intervalDuration > 0) {
    d.timer = { kind: 'interval', startedAt: at, duration: d.config.intervalDuration };
  }
  alerts.push({ kind: 'set-end', text: `${name(d, winner)} remporte le set ${set.number} (${set.score.A}–${set.score.B}).` });
}

/** Attribue un set à `winner` (équipe adverse incomplète). */
function awardSet(d: D, winner: TeamId, at: number, alerts: Alert[]) {
  const loser = other(winner);
  if (d.phase === 'pre-set') {
    const setup = nextSetSetup(d as MatchState);
    const lineupA = d.prep.lineups.A ?? [];
    const lineupB = d.prep.lineups.B ?? [];
    d.sets.push({
      number: setup.number,
      score: { A: 0, B: 0 },
      serving: setup.firstServe ?? 'A',
      firstServe: setup.firstServe ?? 'A',
      leftTeam: setup.leftTeam ?? 'A',
      switched: false,
      teams: { A: emptyTeamSet(lineupA), B: emptyTeamSet(lineupB) },
      rallies: 0,
      technicalTimeouts: [],
      startedAt: at,
    });
    d.phase = 'playing';
  }
  const set = cur(d);
  const target = targetPoints(d.config, set.number);
  set.score[winner] = Math.max(target, set.score[winner], set.score[loser] + d.config.minLead);
  endSet(d, winner, at, 'incomplete', alerts);
}

// ——— sanctions ——————————————————————————————————————————————————

export const SANCTION_LABELS: Record<SanctionKind, string> = {
  warning: 'Avertissement (carton jaune)',
  penalty: 'Pénalité (carton rouge)',
  expulsion: 'Expulsion (rouge + jaune ensemble)',
  disqualification: 'Disqualification (rouge et jaune séparés)',
  'delay-warning': 'Avertissement pour retard',
  'delay-penalty': 'Pénalité pour retard',
};

export function targetLabel(state: MatchState, team: TeamId, target: SanctionTarget): string {
  if (target.kind === 'player') return playerLabel(state, team, target.number);
  if (target.kind === 'staff') return target.role;
  return 'équipe';
}

function recordSanction(d: D, team: TeamId, kind: SanctionKind, target: SanctionTarget, at: number) {
  const set = d.phase === 'playing' ? d.sets[d.sets.length - 1] : undefined;
  d.sanctions.push({
    team,
    kind,
    target,
    set: set ? set.number : null,
    score: set ? { ...set.score } : null,
    at,
  });
  log(d, at, 'sanction', `${SANCTION_LABELS[kind]} — ${name(d, team)}, ${targetLabel(d as MatchState, team, target)}`, team);
}

function applyDelay(d: D, team: TeamId, at: number, alerts: Alert[]) {
  cur(d);
  const warned = d.sanctions.some((s) => s.team === team && s.kind === 'delay-warning');
  if (!warned) {
    recordSanction(d, team, 'delay-warning', { kind: 'team' }, at);
    alerts.push({ kind: 'info', text: `${name(d, team)} : avertissement pour retard.` });
  } else {
    recordSanction(d, team, 'delay-penalty', { kind: 'team' }, at);
    alerts.push({ kind: 'warning', text: `${name(d, team)} : pénalité pour retard, point et service à l'adversaire.` });
    awardPoint(d, other(team), at, 'delay', alerts);
  }
}

/** Le joueur sanctionné doit quitter le terrain (expulsion / disqualification). */
function removeSanctionedPlayer(d: D, team: TeamId, n: number, at: number, alerts: Alert[]) {
  if (d.phase !== 'playing') return;
  const set = cur(d);
  const ts = set.teams[team];
  if (ts.libero?.libero === n) {
    const pos = ts.court.indexOf(n);
    ts.court[pos] = ts.libero.replaced;
    log(d, at, 'libero', `Libéro n°${n} sanctionné : retour du n°${ts.libero.replaced}`, team);
    ts.libero = null;
    if (ableLiberos(d as MatchState, team).length === 0) {
      alerts.push({ kind: 'info', text: `${name(d, team)} n'a plus de libéro apte : une re-désignation est possible.` });
    }
    return;
  }
  if (ts.court.includes(n)) {
    if (hasLegalSubstitution(d as MatchState, team, n)) {
      alerts.push({ kind: 'warning', text: `Le n°${n} doit quitter le terrain : effectuez un remplacement régulier.` });
    } else {
      alerts.push({
        kind: 'warning',
        text: `Le n°${n} doit quitter le terrain mais aucun remplacement régulier n'est possible : ${name(d, team)} peut être déclarée incomplète.`,
      });
    }
  }
}

// ——— gestion des actions ——————————————————————————————————————

function handle(d: D, a: Action, alerts: Alert[]) {
  if (d.phase === 'finished' && a.type !== 'TIMER_STOP') fail('Le match est terminé.');

  switch (a.type) {
    case 'TOSS': {
      if (d.phase !== 'pre-set' || !needsToss(d as MatchState)) fail("Aucun tirage au sort n'est prévu à ce stade.");
      d.prep.toss = { firstServe: a.firstServe, leftTeam: a.leftTeam };
      log(
        d,
        a.at,
        'toss',
        `Tirage au sort (set ${d.sets.length + 1}) : service ${name(d, a.firstServe)}, ${name(d, a.leftTeam)} à gauche`,
      );
      return;
    }

    case 'SET_LINEUP': {
      if (d.phase !== 'pre-set') fail('La feuille de position se saisit avant le début du set.');
      const errors = validateLineup(d as MatchState, a.team, a.lineup);
      if (errors.length) fail(errors[0]);
      d.prep.lineups[a.team] = [...a.lineup];
      return;
    }

    case 'START_SET': {
      if (d.phase !== 'pre-set') fail('Un set est déjà en cours.');
      const setup = nextSetSetup(d as MatchState);
      if (!setup.firstServe || !setup.leftTeam) fail("Effectuez d'abord le tirage au sort.");
      const lineups = d.prep.lineups;
      for (const t of ['A', 'B'] as TeamId[]) {
        const lu = lineups[t];
        if (!lu) fail(`Saisissez la feuille de position de ${name(d, t)}.`);
        const errors = validateLineup(d as MatchState, t, lu);
        if (errors.length) fail(`${name(d, t)} : ${errors[0]}`);
      }
      d.sets.push({
        number: setup.number,
        score: { A: 0, B: 0 },
        serving: setup.firstServe,
        firstServe: setup.firstServe,
        leftTeam: setup.leftTeam,
        switched: false,
        teams: { A: emptyTeamSet(lineups.A!), B: emptyTeamSet(lineups.B!) },
        rallies: 0,
        technicalTimeouts: [],
        startedAt: a.at,
      });
      d.phase = 'playing';
      d.timer = null;
      d.startedAt ??= a.at;
      d.prep = { toss: null, lineups: { A: null, B: null } };
      const server = lineups[setup.firstServe]![0];
      log(d, a.at, 'set-start', `Début du set ${setup.number} — service ${name(d, setup.firstServe)} (n°${server})`);
      for (const t of ['A', 'B'] as TeamId[]) {
        log(d, a.at, 'lineup', `Composition ${name(d, t)} : ${courtText(d.sets[d.sets.length - 1].teams[t].lineup)}`, t);
      }
      return;
    }

    case 'POINT':
      cur(d);
      awardPoint(d, a.team, a.at, 'rally', alerts);
      return;

    case 'TIMEOUT': {
      const set = cur(d);
      const ts = set.teams[a.team];
      const max = d.config.timeoutsPerSet;
      if (ts.timeouts >= max) fail(`${name(d, a.team)} a déjà utilisé ses ${max} temps morts dans ce set.`);
      ts.timeouts++;
      d.timer = { kind: 'timeout', team: a.team, startedAt: a.at, duration: d.config.timeoutDuration };
      log(d, a.at, 'timeout', `Temps mort ${name(d, a.team)} (${ts.timeouts}/${max})`, a.team);
      return;
    }

    case 'TIMER_STOP':
      d.timer = null;
      return;

    case 'SUBSTITUTION': {
      const set = cur(d);
      const exceptional = !!a.exceptional;
      const error = checkSubstitution(d as MatchState, a.team, a.out, a.in, exceptional);
      if (error) fail(error);
      const ts = set.teams[a.team];
      ts.court[ts.court.indexOf(a.out)] = a.in;
      ts.subs.push({ out: a.out, in: a.in, exceptional, score: { ...set.score }, at: a.at });
      if (exceptional) {
        d.barred[a.team].push(a.out);
        log(
          d,
          a.at,
          'substitution',
          `Remplacement exceptionnel ${name(d, a.team)} : n°${a.in} entre, n°${a.out} sort (blessure, non décompté — n°${a.out} ne peut plus rentrer)`,
          a.team,
        );
      } else {
        const used = regularSubsUsed(ts as TeamSetState);
        log(
          d,
          a.at,
          'substitution',
          `Remplacement ${name(d, a.team)} : n°${a.in} entre, n°${a.out} sort (${used}/${d.config.substitutionsPerSet})`,
          a.team,
        );
      }
      return;
    }

    case 'LIBERO_IN': {
      const set = cur(d);
      const error = checkLiberoIn(d as MatchState, a.team, a.libero, a.replaced);
      if (error) fail(error);
      const ts = set.teams[a.team];
      const pos = ts.court.indexOf(a.replaced);
      ts.court[pos] = a.libero;
      ts.libero = { libero: a.libero, replaced: a.replaced };
      ts.lastLiberoRally = set.rallies;
      log(d, a.at, 'libero', `Libéro ${name(d, a.team)} : n°${a.libero} remplace n°${a.replaced} (${positionLabel(pos)})`, a.team);
      return;
    }

    case 'LIBERO_OUT': {
      const set = cur(d);
      const error = checkLiberoOut(d as MatchState, a.team);
      if (error) fail(error);
      const ts = set.teams[a.team];
      const lib = ts.libero!;
      const pos = ts.court.indexOf(lib.libero);
      ts.court[pos] = lib.replaced;
      ts.libero = null;
      ts.lastLiberoRally = set.rallies;
      log(d, a.at, 'libero', `Libéro ${name(d, a.team)} : n°${lib.replaced} revient à la place du n°${lib.libero}`, a.team);
      return;
    }

    case 'LIBERO_SWAP': {
      const set = cur(d);
      const error = checkLiberoSwap(d as MatchState, a.team, a.libero);
      if (error) fail(error);
      const ts = set.teams[a.team];
      const lib = ts.libero!;
      const previous = lib.libero;
      ts.court[ts.court.indexOf(previous)] = a.libero;
      lib.libero = a.libero;
      ts.lastLiberoRally = set.rallies;
      log(d, a.at, 'libero', `Échange libéro ${name(d, a.team)} : n°${a.libero} remplace le libéro n°${previous}`, a.team);
      return;
    }

    case 'LIBERO_REDESIGNATE': {
      const error = checkRedesignation(d as MatchState, a.team, a.unable, a.newLibero);
      if (error) fail(error);
      if (d.phase === 'playing') {
        const ts = cur(d).teams[a.team];
        if (ts.libero?.libero === a.unable) {
          ts.court[ts.court.indexOf(a.unable)] = ts.libero.replaced;
          log(d, a.at, 'libero', `Libéro n°${a.unable} inapte : retour du n°${ts.libero.replaced}`, a.team);
          ts.libero = null;
        }
      }
      d.liberosUnable[a.team].push(a.unable);
      log(d, a.at, 'libero', `${name(d, a.team)} : libéro n°${a.unable} déclaré inapte`, a.team);
      if (a.newLibero !== null) {
        const p = d.teams[a.team].players.find((x) => x.number === a.newLibero)!;
        p.libero = true;
        log(d, a.at, 'libero', `${name(d, a.team)} : n°${a.newLibero} re-désigné libéro pour la suite du match`, a.team);
      }
      return;
    }

    case 'SANCTION': {
      if (a.kind !== 'warning') cur(d);
      if (a.target.kind === 'player' && !findPlayer(d as MatchState, a.team, a.target.number)) {
        fail(`Le n°${a.target.number} ne figure pas dans la liste des joueurs.`);
      }
      const t = a.target;
      const previous = d.sanctions.filter(
        (s) =>
          s.team === a.team &&
          ((t.kind === 'player' && s.target.kind === 'player' && s.target.number === t.number) ||
            (t.kind === 'staff' && s.target.kind === 'staff' && s.target.role === t.role)),
      );
      recordSanction(d, a.team, a.kind, a.target, a.at);
      if (previous.length) {
        alerts.push({
          kind: 'info',
          text: `Rappel : ${targetLabel(d as MatchState, a.team, t)} avait déjà reçu : ${previous
            .map((s) => SANCTION_LABELS[s.kind].toLowerCase())
            .join(', ')}.`,
        });
      }
      if (a.kind === 'penalty') {
        alerts.push({ kind: 'warning', text: `Pénalité : point et service à ${name(d, other(a.team))}.` });
        awardPoint(d, other(a.team), a.at, 'penalty', alerts);
      } else if (a.kind === 'expulsion' || a.kind === 'disqualification') {
        if (t.kind === 'player') {
          if (a.kind === 'expulsion') d.expelled[a.team].push({ number: t.number, set: cur(d).number });
          else d.disqualified[a.team].push(t.number);
          removeSanctionedPlayer(d, a.team, t.number, a.at, alerts);
        }
      }
      return;
    }

    case 'DELAY':
      applyDelay(d, a.team, a.at, alerts);
      return;

    case 'IMPROPER_REQUEST': {
      if (d.improperRequests[a.team] >= 1 && d.phase === 'playing') {
        alerts.push({ kind: 'info', text: 'Demande irrégulière répétée dans le match : sanction pour retard.' });
        d.improperRequests[a.team]++;
        log(d, a.at, 'improper-request', `Demande irrégulière répétée — ${name(d, a.team)}`, a.team);
        applyDelay(d, a.team, a.at, alerts);
        return;
      }
      d.improperRequests[a.team]++;
      log(d, a.at, 'improper-request', `Demande irrégulière — ${name(d, a.team)} (sans conséquence)`, a.team);
      return;
    }

    case 'POSITION_FAULT':
      cur(d);
      log(d, a.at, 'fault', `Faute de position — ${name(d, a.team)}`, a.team);
      awardPoint(d, other(a.team), a.at, 'position-fault', alerts);
      return;

    case 'ROTATION_FAULT': {
      const set = cur(d);
      const ts = set.teams[a.team];
      if (a.corrected) {
        if (!isPermutation(ts.court, a.corrected)) fail("L'ordre rectifié doit contenir les mêmes joueurs.");
        ts.court = [...a.corrected];
        log(d, a.at, 'fault', `Faute de rotation — ${name(d, a.team)}, ordre rectifié : ${courtText(ts.court)}`, a.team);
      } else {
        log(d, a.at, 'fault', `Faute de rotation — ${name(d, a.team)}`, a.team);
      }
      awardPoint(d, other(a.team), a.at, 'rotation-fault', alerts);
      return;
    }

    case 'SET_COURT': {
      const set = cur(d);
      const ts = set.teams[a.team];
      if (!isPermutation(ts.court, a.court)) fail('La correction doit contenir les mêmes joueurs.');
      if (a.court.every((n, i) => n === ts.court[i])) fail('Aucune modification.');
      if (ts.libero && isFrontRow(a.court.indexOf(ts.libero.libero))) {
        fail('Le libéro ne peut pas être placé en ligne avant.');
      }
      ts.court = [...a.court];
      log(d, a.at, 'rotation-correction', `Correction de la rotation ${name(d, a.team)} : ${courtText(ts.court)}`, a.team);
      return;
    }

    case 'FORCE_END_SET':
      cur(d);
      endSet(d, a.winner, a.at, 'forced', alerts);
      return;

    case 'DECLARE_INCOMPLETE': {
      const winner = other(a.team);
      d.incomplete = { team: a.team, scope: a.scope };
      log(
        d,
        a.at,
        'incomplete',
        `${name(d, a.team)} déclarée incomplète pour ${a.scope === 'set' ? 'le set' : 'le match'}`,
        a.team,
      );
      if (a.scope === 'set') {
        awardSet(d, winner, a.at, alerts);
      } else {
        let guard = 10;
        while (d.phase !== 'finished' && guard-- > 0) awardSet(d, winner, a.at, alerts);
      }
      return;
    }
  }
}
