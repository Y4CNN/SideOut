import { Undo2 } from 'lucide-react';
import { useState } from 'react';
import {
  checkOutgoing, checkSubstitution, formatClock, positionLabel, regularSubsUsed,
  type MatchState, type TeamId,
} from '../../engine';
import { textOn } from '../../lib/color';
import { lastUndoableAction } from '../../store/history';
import { useApp } from '../../store/useApp';
import { Button, IconButton, Sheet, Toggle } from '../components/ui';

export function SubstitutionSheet({ match, team, initialOut, onClose }: {
  match: MatchState; team: TeamId; initialOut?: number; onClose: () => void;
}) {
  const dispatch = useApp(s => s.dispatch);
  const toast = useApp(s => s.toast);
  const undo = useApp(s => s.undo);
  const history = useApp(s => s.history);
  const set = match.sets[match.sets.length - 1];
  const ts = set.teams[team];
  const info = match.teams[team];
  const [out, setOut] = useState<number | null>(initialOut ?? null);
  const [incoming, setIncoming] = useState<number | null>(null);
  const [exceptional, setExceptional] = useState(false);
  const [chain, setChain] = useState(false);
  const used = regularSubsUsed(ts);
  const max = match.config.substitutionsPerSet;
  const bench = [...info.players].filter(p => !p.libero && !ts.court.includes(p.number)).sort((a, b) => a.number - b.number);
  const last = ts.subs.at(-1);
  const lastAction = history ? lastUndoableAction(history) : null;
  const canUndoLast = lastAction?.type === 'SUBSTITUTION' && lastAction.team === team;
  const error = out !== null && incoming !== null ? checkSubstitution(match, team, out, incoming, exceptional) : null;

  const clear = () => { setOut(null); setIncoming(null); };
  const confirm = () => {
    if (out === null || incoming === null) return;
    if (!dispatch({ type: 'SUBSTITUTION', team, out, in: incoming, exceptional })) return;
    clear();
    setExceptional(false);
    if (!chain) onClose();
  };

  return (
    <Sheet wide onClose={onClose} title={
      <span className="flex items-center gap-2">
        <span className="truncate rounded-md px-2" style={{ background: info.color, color: textOn(info.color) }}>{info.name}</span>
        <span>Remplacement</span>
        <span className={`tabular ml-auto text-base ${used >= max ? 'text-danger' : 'text-muted'}`}>{used}/{max}</span>
      </span>
    } footer={
      <div>
        <div className="mb-2 grid grid-cols-2 gap-2 text-center" aria-live="polite">
          <div className="rounded-xl bg-surface-2 py-1"><span className="text-sm text-muted">Sort</span><strong className="tabular ml-2 text-2xl">{out === null ? '—' : `n°${out}`}</strong></div>
          <div className="rounded-xl bg-ok/15 py-1"><span className="text-sm text-muted">Entre</span><strong className="tabular ml-2 text-2xl">{incoming === null ? '—' : `n°${incoming}`}</strong></div>
        </div>
        {error && <p className="mb-2 text-sm text-danger" role="status">{error}</p>}
        <div className="flex items-center gap-3">
          <label className="flex min-h-12 cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="size-5 accent-[var(--app-accent)]" checked={chain} onChange={e => setChain(e.target.checked)} />Enchaîner</label>
          <Button className="flex-1" variant="primary" disabled={out === null || incoming === null || !!error} onClick={confirm}>Valider</Button>
        </div>
      </div>
    }>
      <div className="grid gap-4 landscape:grid-cols-2">
        <section aria-label="Joueur sortant">
          <h3 className="mb-2 font-bold">Sortant</h3>
          <div className="grid grid-cols-3 gap-2">
            {ts.court.map((n, i) => {
              const reason = incoming === null ? checkOutgoing(match, team, n, exceptional) : checkSubstitution(match, team, n, incoming, exceptional);
              const isLib = ts.libero?.libero === n;
              return <button key={n} type="button" aria-label={`Sortant n°${n}`} aria-pressed={out === n} aria-disabled={!!reason}
                onClick={() => reason ? toast('warning', reason) : setOut(out === n ? null : n)}
                className={`tap flex min-h-16 flex-col items-center justify-center rounded-xl border-2 font-black ${out === n ? 'border-accent bg-accent/25' : 'border-line bg-surface-2'} ${reason ? 'opacity-40' : ''}`}>
                <span className="tabular text-2xl leading-none">{n}</span><span className="text-sm font-semibold text-muted">{isLib ? 'Libéro' : positionLabel(i)}</span>
              </button>;
            })}
          </div>
        </section>
        <section aria-label="Joueur entrant">
          <h3 className="mb-2 font-bold">Entrant</h3>
          <div className="grid grid-cols-3 gap-2">
            {bench.map(p => {
              const reasons = (out === null ? ts.court : [out]).map(n => checkSubstitution(match, team, n, p.number, exceptional));
              const reason = reasons.includes(null) ? null : reasons[0];
              return <button key={p.number} type="button" aria-label={`Entrant n°${p.number}`} aria-pressed={incoming === p.number} aria-disabled={!!reason}
                onClick={() => reason ? toast('warning', reason) : setIncoming(incoming === p.number ? null : p.number)}
                className={`tap min-h-16 rounded-xl border-2 text-2xl font-black ${incoming === p.number ? 'border-ok bg-ok/25' : 'border-line bg-surface-2'} ${reason ? 'opacity-40' : ''}`}>
                {p.number}
              </button>;
            })}
          </div>
          {bench.length === 0 && <p className="text-sm text-muted">Aucun joueur sur le banc.</p>}
        </section>
      </div>
      {last && <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-1">
        <span className="min-w-0 flex-1 text-sm">Dernier : <strong>{last.out} sort · {last.in} entre</strong></span>
        {canUndoLast && <IconButton label="Annuler ce remplacement" onClick={() => { undo(); clear(); }}><Undo2 className="size-5" /></IconButton>}
      </div>}
      <details className="mt-2">
        <summary className="cursor-pointer py-3 text-sm font-semibold text-muted">Options{exceptional ? ' · exceptionnel' : ''}</summary>
        <Toggle label="Exceptionnel (blessure / maladie)" hint="Non décompté. Le sortant ne pourra plus jouer dans ce match. À utiliser si aucun remplacement régulier n’est possible." checked={exceptional} onChange={v => { setExceptional(v); clear(); }} />
      </details>
      {ts.subs.length > 0 && <details>
        <summary className="cursor-pointer py-3 text-sm font-semibold text-muted">Historique ({ts.subs.length})</summary>
        <ul className="flex flex-col gap-1">
          {[...ts.subs].reverse().map((s, i) => <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
            <strong>{s.out} sort · {s.in} entre</strong>
            <span className="tabular text-muted">{team === 'A' ? `${s.score.A}–${s.score.B}` : `${s.score.B}–${s.score.A}`}</span>
            {s.exceptional && <span className="text-warn">exceptionnel</span>}
            <span className="tabular ml-auto text-muted">{formatClock(s.at)}</span>
          </li>)}
        </ul>
      </details>}
    </Sheet>
  );
}
