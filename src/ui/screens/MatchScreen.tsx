import { Ellipsis, Eye, LayoutGrid, Menu, ScrollText, Undo2 } from 'lucide-react';
import { useState } from 'react';
import {
  leftTeam as leftTeamOf,
  liberoMustLeave,
  liberos,
  other,
  playersToReplace,
  regularSubsUsed,
  setsWon,
  type MatchState,
  type TeamId,
} from '../../engine';
import { teamStyle } from '../../lib/color';
import { useApp } from '../../store/useApp';
import { HalfCourt } from '../components/HalfCourt';
import { formatElapsed, useNow } from '../hooks';
import { CourtSheet } from '../sheets/CourtSheet';
import { LiberoSheet } from '../sheets/LiberoSheet';
import { LogSheet } from '../sheets/LogSheet';
import { MenuSheet } from '../sheets/MenuSheet';
import { SanctionSheet } from '../sheets/SanctionSheet';
import { SubstitutionSheet } from '../sheets/SubstitutionSheet';

export type SheetState =
  | { kind: 'sub'; team: TeamId; out?: number }
  | { kind: 'libero'; team: TeamId }
  | { kind: 'sanction'; team?: TeamId }
  | { kind: 'court' }
  | { kind: 'log' }
  | { kind: 'menu' }
  | null;

export function MatchScreen({ match }: { match: MatchState }) {
  const [sheet, setSheet] = useState<SheetState>(null);
  const undo = useApp((s) => s.undo);
  const undoText = useApp((s) => s.undoLabel());
  const prefs = useApp((s) => s.prefs);
  const setPrefs = useApp((s) => s.setPrefs);
  const set = match.sets[match.sets.length - 1];
  const left = leftTeamOf(match);
  const won = setsWon(match);
  const now = useNow(true, 1000);
  const close = () => setSheet(null);

  return (
    <div className="match-screen flex h-full min-h-0 flex-col bg-black">
      {/* barre du haut */}
      <header className="flex items-center gap-1 bg-surface pt-safe pl-safe pr-safe text-fg">
        <button type="button" onClick={() => setSheet({ kind: 'menu' })} className="tap flex size-11 items-center justify-center" aria-label="Menu">
          <Menu />
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2 text-sm font-bold sm:text-base">
          <span className="rounded-md bg-navy px-2 py-0.5 text-white">Set {set.number}</span>
          <span className="tabular">
            Sets {won[left]}–{won[other(left)]}
          </span>
          <span className="tabular text-muted">{formatElapsed(now - set.startedAt)}</span>
        </div>
        <button type="button" onClick={() => setSheet({ kind: 'log' })} className="tap flex size-11 items-center justify-center" aria-label="Journal">
          <ScrollText />
        </button>
      </header>

      {/* zones des équipes */}
      <main className="match-scoreboard relative flex min-h-0 flex-1 portrait:flex-col" aria-label="Score et commandes du match">
        <TeamPanel match={match} team={left} side="left" openSheet={setSheet} />
        <div className="z-10 bg-white/90 shadow-[0_0_8px_rgba(0,0,0,.6)] landscape:w-1 portrait:h-1" aria-hidden />
        <TeamPanel match={match} team={other(left)} side="right" openSheet={setSheet} />
      </main>

      {/* barre du bas */}
      <nav className="flex items-stretch gap-1 bg-surface sm:gap-1.5 px-safe pt-1.5 pb-[max(env(safe-area-inset-bottom),0.375rem)] text-fg">
        <BarButton label="Positions" active={prefs.showCourt} onClick={() => setPrefs({ showCourt: !prefs.showCourt })}>
          <LayoutGrid />
        </BarButton>
        <BarButton label="Terrain" onClick={() => setSheet({ kind: 'court' })}>
          <Eye />
        </BarButton>
        <button
          type="button"
          onClick={undo}
          disabled={!undoText}
          aria-label={undoText ? `Annuler : ${undoText}` : 'Annuler'}
          className="tap flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl bg-surface-2 px-2 font-bold active:brightness-125 disabled:opacity-40 sm:px-3"
        >
          <Undo2 className="shrink-0" />
          <span className="hidden min-w-0 flex-col items-start leading-tight min-[360px]:flex">
            <span className="max-w-full truncate">Annuler</span>
            {undoText && <span className="w-full truncate text-xs font-medium text-muted">{undoText}</span>}
          </span>
        </button>
        <BarButton label="Sanctions" onClick={() => setSheet({ kind: 'sanction' })}>
          <span className="relative block h-6 w-6" aria-hidden>
            <span className="absolute top-0 left-0.5 h-5 w-3.5 -rotate-12 rounded-sm bg-[#FFD200]" />
            <span className="absolute top-1 left-2.5 h-5 w-3.5 rotate-12 rounded-sm bg-ffred" />
          </span>
        </BarButton>
        <BarButton label="Plus" onClick={() => setSheet({ kind: 'menu' })}>
          <Ellipsis />
        </BarButton>
      </nav>

      {sheet?.kind === 'sub' && <SubstitutionSheet match={match} team={sheet.team} initialOut={sheet.out} onClose={close} />}
      {sheet?.kind === 'libero' && <LiberoSheet match={match} team={sheet.team} onClose={close} />}
      {sheet?.kind === 'sanction' && <SanctionSheet match={match} initialTeam={sheet.team} onClose={close} />}
      {sheet?.kind === 'court' && <CourtSheet match={match} onClose={close} />}
      {sheet?.kind === 'log' && <LogSheet match={match} onClose={close} />}
      {sheet?.kind === 'menu' && <MenuSheet match={match} onClose={close} onOpenLog={() => setSheet({ kind: 'log' })} />}
    </div>
  );
}

function BarButton({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`tap flex min-h-12 w-11 shrink-0 flex-col min-[360px]:w-12 items-center justify-center rounded-xl sm:w-16 ${
        active ? 'bg-navy text-white' : 'active:bg-surface-2'
      }`}
    >
      {children}
      <span className="mt-0.5 hidden text-[10px] font-semibold sm:block">{label}</span>
    </button>
  );
}

function TeamPanel({
  match,
  team,
  side,
  openSheet,
}: {
  match: MatchState;
  team: TeamId;
  side: 'left' | 'right';
  openSheet: (s: SheetState) => void;
}) {
  const dispatch = useApp((s) => s.dispatch);
  const prefs = useApp((s) => s.prefs);
  const set = match.sets[match.sets.length - 1];
  const ts = set.teams[team];
  const info = match.teams[team];
  const displayColor = prefs.highVisibility ? (prefs.theme === 'dark' ? '#000000' : '#FFFFFF') : info.color;
  const style = teamStyle(displayColor);
  const soft = style.color === '#FFFFFF' ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.16)';
  const serving = set.serving === team;
  const server = serving ? ts.court[0] : null;
  const score = set.score[team];
  const won = setsWon(match)[team];
  const mustLeave = liberoMustLeave(set, team);
  const toReplace = playersToReplace(match, team);
  const hasLibero = liberos(match, team).length > 0;
  const tmMax = match.config.timeoutsPerSet;
  const subMax = match.config.substitutionsPerSet;
  const subs = regularSubsUsed(ts);
  const showCourt = prefs.showCourt;

  const scoreEl = (
    <span
      key={score}
      className={`score-digits animate-pop tabular block leading-none font-black tracking-tighter ${
        showCourt
          ? 'text-[min(28vh,13vw)] portrait:text-[min(13vh,26vw)]'
          : 'text-[min(44vh,21vw)] portrait:text-[min(21vh,44vw)]'
      }`}
    >
      {score}
    </span>
  );

  return (
    <section
      className="relative flex min-h-0 min-w-0 flex-1 flex-col"
      style={{
        ...style,
        boxShadow: info.secondaryColor ? `inset 0 -6px 0 ${info.secondaryColor}` : undefined,
      }}
    >
      <div className={`flex items-center gap-2 px-3 pt-1.5 ${side === 'right' ? 'flex-row-reverse text-right' : ''}`}>
        <span className="min-w-0 flex-1 truncate text-lg font-black sm:text-xl">{info.name}</span>
        <span className="flex gap-1" role="img" aria-label={`${won} set(s) gagné(s)`}>
          {Array.from({ length: match.config.setsToWin }, (_, i) => (
            <span
              key={i}
              className="size-3 rounded-full border-2"
              style={{ borderColor: style.color, background: i < won ? style.color : 'transparent' }}
            />
          ))}
        </span>
      </div>

      <button
        type="button"
        onClick={() => dispatch({ type: 'POINT', team })}
        aria-label={`Point pour ${info.name} (score ${score})`}
        className="tap relative flex min-h-0 flex-1 items-center justify-center gap-3 px-2 active:bg-black/10"
      >
        {showCourt ? (
          <span className={`flex h-full min-h-0 w-full items-center justify-center gap-3 ${side === 'right' ? 'flex-row-reverse' : ''}`}>
            {scoreEl}
            <HalfCourt
              court={ts.court}
              orientation={side}
              flip={prefs.flipView}
              color={displayColor}
              libero={ts.libero?.libero}
              server={server}
              onTeamColor
              alert={mustLeave && ts.libero ? [ts.court.indexOf(ts.libero.libero)] : []}
              className="h-full max-h-[min(100%,15rem)] w-auto max-w-[55%] py-1"
            />
          </span>
        ) : (
          scoreEl
        )}
        {serving && (
          <span
            className={`absolute top-1 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold ${side === 'left' ? 'left-2' : 'right-2'}`}
            style={{ background: style.color, color: displayColor }}
          >
            <ServeBall seam={style.color} /> Service n°{server}
          </span>
        )}
      </button>

      {(mustLeave || toReplace.length > 0) && (
        <div className="flex flex-col gap-1 px-1.5">
          {mustLeave && ts.libero && (
            <button
              type="button"
              onClick={() => dispatch({ type: 'LIBERO_OUT', team })}
              className="tap animate-pulse rounded-lg bg-warn px-2 py-1.5 text-sm font-bold text-black"
            >
              Libéro n°{ts.libero.libero} doit sortir → retour du n°{ts.libero.replaced}
            </button>
          )}
          {toReplace.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => openSheet({ kind: 'sub', team, out: n })}
              className="tap rounded-lg bg-danger px-2 py-1.5 text-sm font-bold text-white"
            >
              n°{n} sanctionné : à remplacer
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-1.5 p-1.5">
        <PanelButton
          soft={soft}
          disabled={ts.timeouts >= tmMax}
          onClick={() => dispatch({ type: 'TIMEOUT', team })}
          label="Temps mort"
          value={
            <span className="flex gap-1" role="img" aria-label={`${ts.timeouts} sur ${tmMax}`}>
              {Array.from({ length: tmMax }, (_, i) => (
                <span key={i} className="size-2.5 rounded-full border-2 border-current" style={{ background: i < ts.timeouts ? 'currentColor' : 'transparent' }} />
              ))}
            </span>
          }
          short="TM"
        />
        <PanelButton
          soft={soft}
          onClick={() => openSheet({ kind: 'sub', team })}
          label="Remplacement"
          short="Rempl."
          value={
            <span className={`tabular ${subs >= subMax ? 'text-current underline decoration-2' : ''}`}>
              {subs}/{subMax}
            </span>
          }
        />
        <PanelButton
          soft={soft}
          disabled={!hasLibero}
          onClick={() => openSheet({ kind: 'libero', team })}
          label="Libéro"
          short="Libéro"
          value={<span className="tabular">{ts.libero ? `n°${ts.libero.libero}` : '—'}</span>}
        />
      </div>
    </section>
  );
}

function PanelButton({
  soft,
  label,
  short,
  value,
  onClick,
  disabled,
}: {
  soft: string;
  label: string;
  short: string;
  value: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="tap flex min-h-12 min-w-0 flex-col items-center justify-center rounded-xl px-1 py-1 leading-tight font-bold active:brightness-90 disabled:opacity-40"
      style={{ background: soft }}
    >
      <span className="truncate text-xs font-semibold sm:text-sm">{short}</span>
      <span className="text-base">{value}</span>
    </button>
  );
}

function ServeBall({ seam }: { seam: string }) {
  return (
    <svg viewBox="-12 -12 24 24" className="size-4" aria-hidden>
      <circle r="11" fill="currentColor" />
      <path d="M-11 0 Q 0 -4 8 -8 M-4 10 Q -2 0 4 -10 M 11 1 Q 2 2 -8 8" stroke={seam} strokeWidth="2" fill="none" />
    </svg>
  );
}
