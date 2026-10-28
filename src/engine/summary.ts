import { SANCTION_LABELS, targetLabel } from './reducer';
import { migratePlayers } from '../lib/players';
import { regularSubsUsed } from './substitutions';
import { setDurationMs, setsWon } from './selectors';
import type { MatchState, SanctionRecord, Score, SetEndReason, TeamId } from './types';

export interface SetSummary {
  number: number;
  score: Score;
  winner?: TeamId;
  durationMs: number;
  timeouts: Score;
  subs: Score;
  exceptionalSubs: Score;
  endReason?: SetEndReason;
}

export interface MatchSummary {
  teams: Record<TeamId, string>;
  winner?: TeamId;
  setsWon: Score;
  sets: SetSummary[];
  durationMs: number;
  totals: { timeouts: Score; subs: Score };
  sanctions: SanctionRecord[];
  improperRequests: Score;
}

export function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h} h ${String(m).padStart(2, '0')}`;
}

export function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function matchSummary(state: MatchState, now = Date.now()): MatchSummary {
  const sets: SetSummary[] = state.sets.map((s) => ({
    number: s.number,
    score: { ...s.score },
    winner: s.winner,
    durationMs: setDurationMs(s, now),
    timeouts: { A: s.teams.A.timeouts, B: s.teams.B.timeouts },
    subs: { A: regularSubsUsed(s.teams.A), B: regularSubsUsed(s.teams.B) },
    exceptionalSubs: {
      A: s.teams.A.subs.length - regularSubsUsed(s.teams.A),
      B: s.teams.B.subs.length - regularSubsUsed(s.teams.B),
    },
    endReason: s.endReason,
  }));
  const sum = (f: (s: SetSummary) => Score): Score => ({
    A: sets.reduce((acc, s) => acc + f(s).A, 0),
    B: sets.reduce((acc, s) => acc + f(s).B, 0),
  });
  const start = state.startedAt ?? state.createdAt;
  return {
    teams: { A: state.teams.A.name, B: state.teams.B.name },
    winner: state.winner,
    setsWon: setsWon(state),
    sets,
    durationMs: state.startedAt ? (state.endedAt ?? now) - start : 0,
    totals: { timeouts: sum((s) => s.timeouts), subs: sum((s) => s.subs) },
    sanctions: state.sanctions,
    improperRequests: { ...state.improperRequests },
  };
}

export function sanctionText(state: MatchState, s: SanctionRecord): string {
  const where = s.set ? ` — set ${s.set}${s.score ? ` (${s.score.A}–${s.score.B})` : ''}` : '';
  return `${SANCTION_LABELS[s.kind]} : ${state.teams[s.team].name}, ${targetLabel(state, s.team, s.target)}${where}`;
}

export function summaryText(state: MatchState, now = Date.now()): string {
  const sum = matchSummary(state, now);
  const { A, B } = sum.teams;
  const lines: string[] = [];
  const date = new Date(state.startedAt ?? state.createdAt).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  lines.push(`🏐 ${A} – ${B}`);
  lines.push(date);
  lines.push('');
  if (sum.winner) {
    lines.push(`Vainqueur : ${sum.teams[sum.winner]} (${sum.setsWon[sum.winner]}–${sum.setsWon[sum.winner === 'A' ? 'B' : 'A']})`);
  } else {
    lines.push(`Sets : ${A} ${sum.setsWon.A} – ${sum.setsWon.B} ${B} (match en cours)`);
  }
  if (state.incomplete) {
    lines.push(`${sum.teams[state.incomplete.team]} déclarée incomplète (${state.incomplete.scope === 'set' ? 'set' : 'match'}).`);
  }
  lines.push('');
  lines.push('Score par set :');
  for (const s of sum.sets) {
    const note = s.endReason === 'forced' ? ' (fin forcée)' : s.endReason === 'incomplete' ? ' (incomplet)' : '';
    lines.push(`  Set ${s.number} : ${s.score.A}–${s.score.B} (${formatDuration(s.durationMs)})${note}`);
  }
  if (sum.durationMs) lines.push(`Durée du match : ${formatDuration(sum.durationMs)}`);
  lines.push('');
  lines.push(`Temps morts : ${A} ${sum.totals.timeouts.A} · ${B} ${sum.totals.timeouts.B}`);
  lines.push(`Remplacements : ${A} ${sum.totals.subs.A} · ${B} ${sum.totals.subs.B}`);
  const exc = sum.sets.reduce((acc, s) => acc + s.exceptionalSubs.A + s.exceptionalSubs.B, 0);
  if (exc) lines.push(`Remplacements exceptionnels : ${exc}`);
  lines.push('');
  if (sum.sanctions.length) {
    lines.push('Sanctions :');
    for (const s of sum.sanctions) lines.push(`  • ${sanctionText(state, s)}`);
  } else {
    lines.push('Sanctions : aucune');
  }
  if (sum.improperRequests.A || sum.improperRequests.B) {
    lines.push(`Demandes irrégulières : ${A} ${sum.improperRequests.A} · ${B} ${sum.improperRequests.B}`);
  }
  return lines.join('\n');
}

export function summaryJson(state: MatchState): string {
  state = migratePlayers(state);
  return JSON.stringify(
    {
      format: 'arbitre-volley/match',
      version: state.version,
      exportedAt: new Date().toISOString(),
      summary: matchSummary(state),
      teams: state.teams,
      config: state.config,
      events: state.events,
    },
    null,
    2,
  );
}
