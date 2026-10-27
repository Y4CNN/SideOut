import { useState } from 'react';
import {
  BACK_ROW,
  ableLiberos,
  checkLiberoIn,
  checkLiberoOut,
  checkLiberoSwap,
  checkRedesignation,
  liberoMustLeave,
  liberos,
  positionLabel,
  type MatchState,
  type TeamId,
} from '../../engine';
import { textOn } from '../../lib/color';
import { useApp } from '../../store/useApp';
import { Button, ConfirmDialog, Sheet } from '../components/ui';

export function LiberoSheet({ match, team, onClose }: { match: MatchState; team: TeamId; onClose: () => void }) {
  const dispatch = useApp((s) => s.dispatch);
  const set = match.sets[match.sets.length - 1];
  const ts = set.teams[team];
  const info = match.teams[team];
  const all = liberos(match, team);
  const able = ableLiberos(match, team);
  const [libero, setLibero] = useState<number | null>(able.find((n) => n !== ts.libero?.libero) ?? null);
  const [reason, setReason] = useState<string | null>(null);
  const [unable, setUnable] = useState<number | null>(null);
  const [newLibero, setNewLibero] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);

  const run = (ok: boolean) => ok && onClose();
  const onCourt = ts.libero;
  const mustLeave = liberoMustLeave(set, team);
  const outError = onCourt ? checkLiberoOut(match, team) : null;

  const offCourt = info.players
    .filter((p) => !p.libero && !ts.court.includes(p.number) && ts.libero?.replaced !== p.number)
    .map((p) => p.number);
  const remainingAfter = unable !== null ? able.filter((n) => n !== unable) : able;
  const redesignError = unable !== null ? checkRedesignation(match, team, unable, newLibero) : null;

  return (
    <Sheet
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <span className="truncate rounded-md px-2" style={{ background: info.color, color: textOn(info.color) }}>
            {info.name}
          </span>
          <span>Libéro</span>
        </span>
      }
    >
      {all.length === 0 && <p className="text-muted">Aucun libéro n'est déclaré pour cette équipe.</p>}

      {onCourt ? (
        <section className="rounded-2xl border-2 border-[#FFD200] p-3">
          <p className="font-semibold">
            Libéro <strong>n°{onCourt.libero}</strong> sur le terrain (position {positionLabel(ts.court.indexOf(onCourt.libero))}) à
            la place du <strong>n°{onCourt.replaced}</strong>.
          </p>
          {mustLeave && <p className="mt-1 font-bold text-warn">Il doit sortir : sa position passe en ligne avant.</p>}
          <Button
            variant="primary"
            className="mt-3 w-full"
            onClick={() => (outError ? setReason(outError) : run(dispatch({ type: 'LIBERO_OUT', team })))}
          >
            Sortie du libéro : retour du n°{onCourt.replaced}
          </Button>
          {able
            .filter((n) => n !== onCourt.libero)
            .map((n) => {
              const err = checkLiberoSwap(match, team, n);
              return (
                <Button
                  key={n}
                  className={`mt-2 w-full ${err ? 'opacity-50' : ''}`}
                  onClick={() => (err ? setReason(err) : run(dispatch({ type: 'LIBERO_SWAP', team, libero: n })))}
                >
                  Échange libéro / libéro : n°{n} remplace n°{onCourt.libero}
                </Button>
              );
            })}
        </section>
      ) : (
        able.length > 0 && (
          <section>
            {able.length > 1 && (
              <>
                <h3 className="mb-2 font-bold">Libéro qui entre</h3>
                <div className="mb-3 flex gap-2">
                  {able.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setLibero(n)}
                      className={`tap min-h-12 flex-1 rounded-xl border-2 text-xl font-black ${
                        libero === n ? 'border-[#FFD200] bg-[#FFD200] text-black' : 'border-line bg-surface-2'
                      }`}
                    >
                      n°{n}
                    </button>
                  ))}
                </div>
              </>
            )}
            <h3 className="mb-2 font-bold">Joueur de ligne arrière remplacé {able.length === 1 && `par le libéro n°${able[0]}`}</h3>
            <div className="grid grid-cols-3 gap-2">
              {BACK_ROW.map((i) => {
                const n = ts.court[i];
                const err = libero !== null ? checkLiberoIn(match, team, libero, n) : 'Choisissez un libéro.';
                return (
                  <button
                    key={i}
                    type="button"
                    aria-disabled={!!err}
                    onClick={() => (err ? setReason(err) : run(dispatch({ type: 'LIBERO_IN', team, libero: libero!, replaced: n })))}
                    className={`tap flex min-h-16 flex-col items-center justify-center rounded-xl border-2 font-black ${
                      err ? 'border-line bg-surface-2 opacity-40' : 'border-ok bg-ok/15'
                    }`}
                  >
                    <span className="tabular text-2xl leading-none">{n}</span>
                    <span className="text-xs font-semibold text-muted">Position {positionLabel(i)}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )
      )}

      {reason && (
        <p className="mt-3 rounded-xl bg-warn/15 p-3 text-sm font-semibold text-warn" role="alert">
          {reason}
        </p>
      )}

      <div className="mt-4 rounded-xl bg-surface-2 p-3 text-sm text-muted">
        <p>• Remplacements libéro illimités et non décomptés dans les {match.config.substitutionsPerSet} remplacements.</p>
        <p>• Uniquement en ligne arrière ; le libéro ne sert pas.</p>
        <p>• Un échange doit avoir eu lieu entre deux remplacements libéro.</p>
        <p>• Le libéro ne peut être remplacé que par le joueur qu'il a remplacé.</p>
      </div>

      {all.length > 0 && (
        <section className="mt-5">
          <h3 className="mb-2 font-bold">Libéro inapte / re-désignation</h3>
          <div className="flex flex-wrap gap-2">
            {all.map((n) => {
              const already = match.liberosUnable[team].includes(n);
              return (
                <button
                  key={n}
                  type="button"
                  disabled={already}
                  onClick={() => {
                    setUnable(unable === n ? null : n);
                    setNewLibero(null);
                  }}
                  className={`tap min-h-12 rounded-xl border-2 px-4 font-bold disabled:opacity-40 ${
                    unable === n ? 'border-danger bg-danger/15' : 'border-line bg-surface-2'
                  }`}
                >
                  n°{n} {already ? '(inapte)' : ''}
                </button>
              );
            })}
          </div>
          {unable !== null && (
            <>
              {remainingAfter.length === 0 ? (
                <>
                  <p className="mt-3 text-sm text-muted">
                    Plus aucun libéro apte : vous pouvez re-désigner un joueur hors du terrain comme libéro pour la suite du match (facultatif).
                  </p>
                  <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-1.5">
                    {offCourt.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setNewLibero(newLibero === n ? null : n)}
                        className={`tap min-h-12 rounded-xl border-2 text-lg font-black ${
                          newLibero === n ? 'border-[#FFD200] bg-[#FFD200] text-black' : 'border-line bg-surface-2'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-muted">L'équipe continue avec le libéro n°{remainingAfter.join(', n°')}.</p>
              )}
              {redesignError && <p className="mt-2 text-sm font-semibold text-danger">{redesignError}</p>}
              <Button variant="danger" className="mt-3 w-full" disabled={!!redesignError} onClick={() => setConfirm(true)}>
                Déclarer le n°{unable} inapte{newLibero !== null ? ` et re-désigner le n°${newLibero}` : ''}
              </Button>
            </>
          )}
        </section>
      )}

      {confirm && unable !== null && (
        <ConfirmDialog
          title="Libéro inapte"
          message={`Le libéro n°${unable} ne pourra plus jouer dans ce match.${newLibero !== null ? ` Le n°${newLibero} devient libéro.` : ''}`}
          danger
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            setConfirm(false);
            run(dispatch({ type: 'LIBERO_REDESIGNATE', team, unable, newLibero }));
          }}
        />
      )}
    </Sheet>
  );
}
