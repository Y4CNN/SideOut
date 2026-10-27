import { ArrowRightLeft } from 'lucide-react';
import { useState } from 'react';
import {
  checkOutgoing,
  formatClock,
  positionLabel,
  regularSubsUsed,
  substitutionCandidates,
  type MatchState,
  type TeamId,
} from '../../engine';
import { textOn } from '../../lib/color';
import { useApp } from '../../store/useApp';
import { Sheet, Toggle } from '../components/ui';

export function SubstitutionSheet({
  match,
  team,
  initialOut,
  onClose,
}: {
  match: MatchState;
  team: TeamId;
  initialOut?: number;
  onClose: () => void;
}) {
  const dispatch = useApp((s) => s.dispatch);
  const set = match.sets[match.sets.length - 1];
  const ts = set.teams[team];
  const info = match.teams[team];
  const [out, setOut] = useState<number | null>(initialOut ?? null);
  const [exceptional, setExceptional] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const used = regularSubsUsed(ts);
  const max = match.config.substitutionsPerSet;

  const outError = out !== null ? checkOutgoing(match, team, out, exceptional) : null;
  const candidates = out !== null ? substitutionCandidates(match, team, out, exceptional) : [];

  const choose = (n: number, allowed: boolean, why: string | null) => {
    if (!allowed) {
      setReason(why);
      return;
    }
    if (dispatch({ type: 'SUBSTITUTION', team, out: out!, in: n, exceptional })) onClose();
  };

  return (
    <Sheet
      onClose={onClose}
      wide
      title={
        <span className="flex items-center gap-2">
          <span className="truncate rounded-md px-2" style={{ background: info.color, color: textOn(info.color) }}>
            {info.name}
          </span>
          <span>Remplacement</span>
          <span className={`tabular ml-auto text-base ${used >= max ? 'text-danger' : 'text-muted'}`}>
            {used} / {max}
          </span>
        </span>
      }
    >
      <Toggle
        label="Remplacement exceptionnel (blessure / maladie)"
        hint="Hors règles habituelles, non décompté. Le joueur remplacé ne pourra plus rentrer dans le match. À utiliser si aucun remplacement régulier n'est possible."
        checked={exceptional}
        onChange={(v) => {
          setExceptional(v);
          setReason(null);
        }}
      />

      <h3 className="mt-3 mb-2 font-bold">1. Joueur sortant</h3>
      <div className="grid grid-cols-6 gap-1.5">
        {ts.court.map((n, i) => {
          const isLib = ts.libero?.libero === n;
          return (
            <button
              key={n}
              type="button"
              disabled={isLib}
              onClick={() => {
                setOut(n);
                setReason(null);
              }}
              className={`tap flex min-h-14 flex-col items-center justify-center rounded-xl border-2 font-black disabled:opacity-35 ${
                out === n ? 'border-accent bg-accent/25' : 'border-line bg-surface-2'
              }`}
            >
              <span className="tabular text-xl leading-none">{n}</span>
              <span className="text-[11px] font-semibold text-muted">{isLib ? 'Libéro' : positionLabel(i)}</span>
            </button>
          );
        })}
      </div>

      {out !== null && (
        <>
          <h3 className="mt-4 mb-2 flex items-center gap-2 font-bold">
            2. Joueur entrant <ArrowRightLeft className="size-4 text-muted" /> n°{out}
          </h3>
          {outError && <p className="mb-2 rounded-xl bg-danger/15 p-3 text-sm font-semibold text-danger">{outError}</p>}
          {reason && (
            <p className="mb-2 rounded-xl bg-warn/15 p-3 text-sm font-semibold text-warn" role="alert">
              {reason}
            </p>
          )}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-1.5">
            {candidates.map((c) => {
              const p = info.players.find((x) => x.number === c.number);
              return (
                <button
                  key={c.number}
                  type="button"
                  onClick={() => choose(c.number, c.allowed, c.reason)}
                  aria-disabled={!c.allowed}
                  className={`tap flex min-h-14 flex-col items-center justify-center rounded-xl border-2 font-black ${
                    c.allowed ? 'border-ok bg-ok/15' : 'border-line bg-surface-2 opacity-40'
                  }`}
                >
                  <span className="tabular text-xl leading-none">{c.number}</span>
                  <span className="max-w-full truncate px-1 text-[11px] font-semibold text-muted">
                    {p?.libero ? 'Libéro' : (p?.name ?? '')}
                  </span>
                </button>
              );
            })}
          </div>
          {!outError && candidates.every((c) => !c.allowed) && (
            <p className="mt-2 text-sm text-muted">
              Aucun remplacement {exceptional ? 'exceptionnel' : 'régulier'} possible pour le n°{out}.
              {!exceptional && ' En cas de blessure, activez le remplacement exceptionnel ; sinon, l’équipe peut être déclarée incomplète (menu Plus).'}
            </p>
          )}
        </>
      )}

      <h3 className="mt-5 mb-2 font-bold">Remplacements du set {set.number}</h3>
      {ts.subs.length === 0 ? (
        <p className="text-sm text-muted">Aucun remplacement pour l'instant.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {ts.subs.map((s, i) => (
            <li key={i} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
              <span className="tabular font-black">
                n°{s.in} ⇄ n°{s.out}
              </span>
              <span className="tabular text-muted">
                {team === 'A' ? `${s.score.A}–${s.score.B}` : `${s.score.B}–${s.score.A}`}
              </span>
              {s.exceptional && <span className="rounded bg-warn px-1.5 text-xs font-bold text-black">exceptionnel</span>}
              <span className="tabular ml-auto text-xs text-muted">{formatClock(s.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
