import { Coins, Menu, Play, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  leftTeam as leftTeamOf,
  needsToss,
  nextSetSetup,
  other,
  positionLabel,
  timerRemainingMs,
  unavailability,
  validateLineup,
  type MatchState,
  type TeamId,
} from '../../engine';
import { playSignal } from '../../lib/audio';
import { HAPTIC, vibrate } from '../../lib/haptics';
import { textOn } from '../../lib/color';
import { useApp } from '../../store/useApp';
import { HalfCourt } from '../components/HalfCourt';
import { Button, Card, IconButton, TeamButton, TeamTag } from '../components/ui';
import { formatCountdown, useNow } from '../hooks';
import { MenuSheet } from '../sheets/MenuSheet';

type Draft = (number | null)[];

const emptyDraft = (): Draft => [null, null, null, null, null, null];

export function PreSetScreen({ match }: { match: MatchState }) {
  const dispatch = useApp((s) => s.dispatch);
  const undo = useApp((s) => s.undo);
  const undoText = useApp((s) => s.undoLabel());
  const [menu, setMenu] = useState(false);
  const setup = nextSetSetup(match);
  const tossNeeded = needsToss(match);
  const prev = match.sets[match.sets.length - 1];
  const left = leftTeamOf(match);
  const order: TeamId[] = [left, other(left)];

  const [drafts, setDrafts] = useState<Record<TeamId, Draft>>(() => ({
    A: match.prep.lineups.A ? [...match.prep.lineups.A] : emptyDraft(),
    B: match.prep.lineups.B ? [...match.prep.lineups.B] : emptyDraft(),
  }));

  const complete = (d: Draft) => d.every((n) => n !== null);
  const errorsFor = (t: TeamId) => (complete(drafts[t]) ? validateLineup(match, t, drafts[t] as number[]) : []);
  const ready = (t: TeamId) => complete(drafts[t]) && errorsFor(t).length === 0;

  // Enregistre la composition dès qu'elle est complète et valide (persistance immédiate).
  useEffect(() => {
    for (const t of ['A', 'B'] as TeamId[]) {
      const d = drafts[t];
      const saved = match.prep.lineups[t];
      if (!complete(d)) continue;
      if (validateLineup(match, t, d as number[]).length) continue;
      if (saved && saved.every((n, i) => n === d[i])) continue;
      dispatch({ type: 'SET_LINEUP', team: t, lineup: d as number[] }, { silent: true });
    }
  }, [drafts, match, dispatch]);

  const canStart = !!setup.firstServe && !!setup.leftTeam && ready('A') && ready('B');

  const start = () => {
    for (const t of ['A', 'B'] as TeamId[]) {
      const saved = match.prep.lineups[t];
      const d = drafts[t] as number[];
      if (!saved || !saved.every((n, i) => n === d[i])) {
        if (!dispatch({ type: 'SET_LINEUP', team: t, lineup: d })) return;
      }
    }
    dispatch({ type: 'START_SET' });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-1 border-b border-line bg-surface pt-safe px-safe">
        <IconButton label="Menu" onClick={() => setMenu(true)}>
          <Menu />
        </IconButton>
        <h1 className="flex-1 truncate text-lg font-bold">
          {match.sets.length === 0 ? 'Avant le match' : `Avant le set ${setup.number}`}
          {setup.deciding && <span className="ml-2 rounded-md bg-ffred px-2 py-0.5 text-sm text-white">décisif</span>}
        </h1>
        {undoText && (
          <IconButton label={`Annuler : ${undoText}`} onClick={undo}>
            <Undo2 />
          </IconButton>
        )}
      </header>

      <main className="scroll-area min-h-0 flex-1 px-safe py-3">
        <div className="mx-auto flex max-w-4xl flex-col gap-3">
          {prev && (
            <div className="grid gap-3 landscape:grid-cols-2">
              {match.timer?.kind === 'interval' && <IntervalTimer match={match} />}
              <SetsRecap match={match} />
            </div>
          )}

          {tossNeeded ? (
            <TossCard match={match} />
          ) : (
            <Card>
              <p className="text-[15px]">
                Service : <TeamTag name={match.teams[setup.firstServe!].name} color={match.teams[setup.firstServe!].color} />{' '}
                <span className="text-muted">(n'a pas servi en premier au set précédent)</span>
              </p>
              <p className="mt-2 text-[15px]">
                À gauche : <TeamTag name={match.teams[setup.leftTeam!].name} color={match.teams[setup.leftTeam!].color} />
                {match.config.switchSidesBetweenSets && <span className="text-muted"> (changement de côté)</span>}
              </p>
            </Card>
          )}

          <div className="grid gap-3 landscape:grid-cols-2">
            {order.map((t) => (
              <LineupEditor
                key={t}
                match={match}
                team={t}
                draft={drafts[t]}
                errors={errorsFor(t)}
                onChange={(d) => setDrafts((x) => ({ ...x, [t]: d }))}
              />
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-line bg-surface px-safe pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
        <Button variant="red" className="w-full text-lg" disabled={!canStart} onClick={start}>
          <Play fill="currentColor" /> Commencer le set {setup.number}
        </Button>
        {!canStart && (
          <p className="mt-1 text-center text-sm text-muted">
            {!setup.firstServe ? 'Saisissez le tirage au sort, puis ' : 'Complétez '}les deux feuilles de position.
          </p>
        )}
      </footer>
      {menu && <MenuSheet match={match} onClose={() => setMenu(false)} />}
    </div>
  );
}

function SetsRecap({ match }: { match: MatchState }) {
  return (
    <Card title="Sets joués">
      <div className="flex flex-wrap gap-2">
        {match.sets.map((s) => (
          <div key={s.number} className="rounded-xl border border-line bg-surface-2 px-3 py-1.5 text-center">
            <div className="text-xs font-semibold text-muted">Set {s.number}</div>
            <div className="tabular text-lg font-black">
              <span style={{ color: s.winner === 'A' ? undefined : 'var(--app-muted)' }}>{s.score.A}</span>
              {' – '}
              <span style={{ color: s.winner === 'B' ? undefined : 'var(--app-muted)' }}>{s.score.B}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">
        {match.teams.A.name} – {match.teams.B.name}
      </p>
    </Card>
  );
}

function IntervalTimer({ match }: { match: MatchState }) {
  const dispatch = useApp((s) => s.dispatch);
  const now = useNow(true, 250);
  const remaining = timerRemainingMs(match, now);
  const timer = match.timer!;
  const signaled = useRef<number | null>(null);
  useEffect(() => {
    if (remaining === 0 && signaled.current !== timer.startedAt) {
      signaled.current = timer.startedAt;
      if (now - (timer.startedAt + timer.duration * 1000) < 5000) {
        playSignal('end');
        vibrate(HAPTIC.end);
      }
    }
  }, [remaining, timer, now]);
  const done = remaining === 0;
  return (
    <section
      className={`flex items-center gap-4 rounded-2xl p-4 ${done ? 'bg-ffred text-white' : 'bg-navy text-white'}`}
      role="timer"
    >
      <div className="flex-1">
        <div className="text-sm font-semibold uppercase tracking-wide opacity-80">Intervalle entre les sets</div>
        <div className="tabular text-6xl leading-tight font-black">{done ? '0:00' : formatCountdown(remaining)}</div>
        {done && <div className="font-bold">Intervalle terminé : reprise du jeu</div>}
      </div>
      <Button variant="secondary" className="!border-white/30 !bg-white/15 !text-white" onClick={() => dispatch({ type: 'TIMER_STOP' })}>
        {done ? 'Masquer' : 'Arrêter'}
      </Button>
    </section>
  );
}

function TossCard({ match }: { match: MatchState }) {
  const dispatch = useApp((s) => s.dispatch);
  const toss = match.prep.toss;
  const [serve, setServe] = useState<TeamId | null>(toss?.firstServe ?? null);
  const [left, setLeft] = useState<TeamId | null>(toss?.leftTeam ?? null);
  const [coin, setCoin] = useState<string | null>(null);

  const update = (s: TeamId | null, l: TeamId | null) => {
    setServe(s);
    setLeft(l);
    if (s && l) dispatch({ type: 'TOSS', firstServe: s, leftTeam: l });
  };

  const flip = () => {
    const r = new Uint8Array(1);
    crypto.getRandomValues(r);
    setCoin(r[0] % 2 === 0 ? 'Pile' : 'Face');
    vibrate(HAPTIC.tap);
  };

  const deciding = match.sets.length > 0;
  return (
    <Card
      title={deciding ? 'Nouveau tirage au sort (set décisif)' : 'Tirage au sort'}
      action={
        <Button className="min-h-10 px-3 text-sm" onClick={flip}>
          <Coins className="size-4" /> {coin ?? 'Pile ou face'}
        </Button>
      }
    >
      <div className="mb-1 text-sm font-medium text-muted">Équipe au service</div>
      <div className="flex gap-3">
        {(['A', 'B'] as TeamId[]).map((t) => (
          <TeamButton key={t} name={match.teams[t].name} color={match.teams[t].color} selected={serve === t} onClick={() => update(t, left)} />
        ))}
      </div>
      <div className="mt-3 mb-1 text-sm font-medium text-muted">Équipe à gauche (vue depuis la chaise d'arbitre)</div>
      <div className="flex gap-3">
        {(['A', 'B'] as TeamId[]).map((t) => (
          <TeamButton key={t} name={match.teams[t].name} color={match.teams[t].color} selected={left === t} onClick={() => update(serve, t)} />
        ))}
      </div>
    </Card>
  );
}

function LineupEditor({
  match,
  team,
  draft,
  errors,
  onChange,
}: {
  match: MatchState;
  team: TeamId;
  draft: Draft;
  errors: string[];
  onChange: (d: Draft) => void;
}) {
  const info = match.teams[team];
  const firstEmpty = draft.findIndex((n) => n === null);
  const [selected, setSelected] = useState<number>(firstEmpty >= 0 ? firstEmpty : 0);
  const prevLineup = match.sets.length ? match.sets[match.sets.length - 1].teams[team].lineup : null;
  const players = useMemo(() => [...info.players].sort((a, b) => a.number - b.number), [info.players]);

  const assign = (n: number) => {
    const next = [...draft];
    const existing = next.indexOf(n);
    if (existing >= 0) next[existing] = next[selected];
    next[selected] = n;
    onChange(next);
    const empty = next.findIndex((x, i) => x === null && i !== selected);
    if (empty >= 0) setSelected(empty);
    else setSelected((selected + 1) % 6);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex items-center gap-2 px-4 py-2" style={{ background: info.color, color: textOn(info.color) }}>
        <h3 className="min-w-0 flex-1 truncate text-lg font-black">{info.name}</h3>
        <span className="text-sm font-semibold">Feuille de position</span>
      </div>
      <div className="p-3">
        <div className="mx-auto max-w-72 landscape:max-w-56">
          <HalfCourt
            court={draft}
            orientation="top"
            color={info.color}
            selected={selected}
            onCellClick={setSelected}
            label={`Feuille de position ${info.name}`}
          />
        </div>
        <p className="mt-1 text-center text-sm text-muted">
          Position <strong className="text-fg">{positionLabel(selected)}</strong> sélectionnée — touchez un numéro
        </p>
        <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-1.5">
          {players.map((p) => {
            const at = draft.indexOf(p.number);
            const why = p.libero ? 'libéro' : unavailability(match, team, p.number);
            const disabled = !!why;
            return (
              <button
                key={p.number}
                type="button"
                disabled={disabled}
                title={why ?? undefined}
                onClick={() => assign(p.number)}
                className={`tap relative flex min-h-12 flex-col items-center justify-center rounded-xl border text-lg font-black disabled:opacity-35 ${
                  at >= 0 ? 'border-accent bg-accent/20' : 'border-line bg-surface-2'
                }`}
              >
                <span className="tabular leading-none">{p.number}</span>
                <span className="text-[10px] leading-tight font-semibold text-muted">
                  {at >= 0 ? positionLabel(at) : p.libero ? 'L' : p.captain ? 'C' : ' '}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex gap-2">
          {prevLineup && prevLineup.length === 6 && (
            <Button className="min-h-10 flex-1 text-sm" onClick={() => onChange([...prevLineup])}>
              Reprendre le set {match.sets.length}
            </Button>
          )}
          <Button className="min-h-10 flex-1 text-sm" onClick={() => { onChange(emptyDraft()); setSelected(0); }}>
            Effacer
          </Button>
        </div>
        {errors.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-sm text-danger">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
