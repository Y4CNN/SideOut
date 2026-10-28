import { useEffect, useRef } from 'react';
import { timerRemainingMs } from '../../engine';
import { playSignal } from '../../lib/audio';
import { teamStyle } from '../../lib/color';
import { HAPTIC, vibrate } from '../../lib/haptics';
import { useApp } from '../../store/useApp';
import { formatCountdown, useNow } from '../hooks';
import { Button } from './ui';

/** Délai pendant lequel « Temps écoulé » reste affiché avant fermeture automatique. */
const LINGER_MS = 2500;

/** Chrono plein écran des temps morts (y compris techniques). */
export function TimerOverlay() {
  const match = useApp((s) => s.match);
  const dispatch = useApp((s) => s.dispatch);
  const undo = useApp((s) => s.undo);
  const timer = match?.timer;
  const active = !!timer && timer.kind !== 'interval';
  const now = useNow(active, 200);
  const remaining = match && active ? timerRemainingMs(match, now) : 0;
  const warnAt = (match?.config.timeoutWarningAt ?? 10) * 1000;
  const key = timer ? `${timer.kind}-${timer.startedAt}` : '';
  const signals = useRef<{ key: string; warned: boolean; ended: boolean }>({ key: '', warned: false, ended: false });

  if (signals.current.key !== key) signals.current = { key, warned: false, ended: false };

  const endAt = timer ? timer.startedAt + timer.duration * 1000 : 0;
  const expiredFor = timer ? now - endAt : 0;

  useEffect(() => {
    if (!active || !timer) return;
    const sig = signals.current;
    if (!sig.warned && remaining > 0 && remaining <= warnAt && warnAt < timer.duration * 1000) {
      sig.warned = true;
      playSignal('warning');
      vibrate(80);
    }
    // signal de fin seulement s'il est récent (pas au retour d'un long verrouillage)
    if (!sig.ended && remaining === 0) {
      sig.ended = true;
      if (expiredFor < 5000) {
        playSignal('end');
        vibrate(HAPTIC.end);
      }
    }
    if (remaining === 0 && expiredFor > LINGER_MS) dispatch({ type: 'TIMER_STOP' }, { silent: true });
  }, [active, timer, remaining, warnAt, expiredFor, dispatch]);

  if (!match || !active || !timer) return null;

  const team = timer.team ? match.teams[timer.team] : null;
  const title = timer.kind === 'technical' ? 'Temps mort technique' : `Temps mort`;
  const warning = remaining > 0 && remaining <= warnAt;
  const done = remaining === 0;
  const style = team ? teamStyle(team.color) : { background: '#0A2A66', color: '#fff' };
  const progress = Math.min(1, 1 - remaining / (timer.duration * 1000));
  const set = match.sets[match.sets.length - 1];
  const used = timer.team && set ? set.teams[timer.team].timeouts : null;

  return (
    <div
      className="animate-fade fixed inset-0 z-50 flex flex-col pt-safe pb-safe pl-safe pr-safe"
      style={done ? { background: '#E30613', color: '#fff' } : warning ? { background: '#0B0B0B', color: '#FFB547' } : style}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-3 px-4 pt-3 text-center text-xl font-bold landscape:pt-2">
        <span className="uppercase tracking-wide">{title}</span>
        {team && (
          <span>
            {team.name}
            {used !== null && ` · ${used}/${match.config.timeoutsPerSet}`}
          </span>
        )}
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <span role="timer" aria-live="off" className="tabular text-[min(52vh,60vw)] leading-none font-black landscape:text-[min(62vh,40vw)]">
          {done ? '0' : formatCountdown(remaining)}
        </span>
      </div>
      <div className="mx-6 h-2 overflow-hidden rounded-full bg-black/20">
        <div className="h-full bg-current transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="flex items-center justify-center gap-3 p-4">
        <span className="sr-only" role="status" aria-live="assertive">{done ? 'Fin du temps mort. Reprise du jeu.' : ''}</span>
        {done ? (
          <span className="text-2xl font-black uppercase">Temps écoulé — reprise du jeu</span>
        ) : (
          <>
            <Button
              variant="secondary"
              className="min-w-48 !border-black/20 !bg-white text-lg !text-black"
              onClick={() => dispatch({ type: 'TIMER_STOP' })}
            >
              Arrêter le chrono
            </Button>
            {timer.kind === 'timeout' && (
              <Button variant="ghost" className="!text-current underline" onClick={undo}>
                Annuler ce temps mort
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
