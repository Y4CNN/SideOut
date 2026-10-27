import { RotateCcw, RotateCw } from 'lucide-react';
import { useState } from 'react';
import {
  POSITION_CONSTRAINTS,
  describeConstraint,
  isFrontRow,
  leftTeam as leftTeamOf,
  other,
  rotate,
  rotateBack,
  type Court,
  type MatchState,
  type TeamId,
} from '../../engine';
import { textOn } from '../../lib/color';
import { useApp } from '../../store/useApp';
import { HalfCourt } from '../components/HalfCourt';
import { Button, ConfirmDialog, Sheet } from '../components/ui';

type Edit = { team: TeamId; mode: 'correct' | 'fault'; court: Court; picked: number | null };

export function CourtSheet({ match, onClose }: { match: MatchState; onClose: () => void }) {
  const dispatch = useApp((s) => s.dispatch);
  const flip = useApp((s) => s.prefs.flipView);
  const set = match.sets[match.sets.length - 1];
  const left = leftTeamOf(match);
  const order: TeamId[] = [left, other(left)];
  const [edit, setEdit] = useState<Edit | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; run: () => boolean } | null>(null);

  const checked = (t: TeamId) => match.config.positionRule === 'both' || set.serving !== t;

  const tap = (i: number) => {
    if (!edit) return;
    if (edit.picked === null) return setEdit({ ...edit, picked: i });
    if (edit.picked === i) return setEdit({ ...edit, picked: null });
    const c = [...edit.court];
    [c[edit.picked], c[i]] = [c[i], c[edit.picked]];
    setEdit({ ...edit, court: c, picked: null });
  };

  const libero = (t: TeamId) => set.teams[t].libero?.libero ?? null;
  const editCourtInvalid =
    edit && libero(edit.team) !== null && isFrontRow(edit.court.indexOf(libero(edit.team)!))
      ? 'Le libéro ne peut pas être placé en ligne avant.'
      : null;

  return (
    <Sheet title="Terrain · contrôle des positions" onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-2 landscape:flex landscape:justify-center landscape:gap-0">
        {order.map((t, k) => {
          const info = match.teams[t];
          const ts = set.teams[t];
          const editing = edit?.team === t;
          const court = editing ? edit.court : ts.court;
          return (
            <div key={t} className="min-w-0">
              <div className="mb-1 flex flex-col items-center text-center">
                <span className="max-w-full truncate rounded-md px-2 font-bold" style={{ background: info.color, color: textOn(info.color) }}>
                  {info.name}
                </span>
                <span className={`text-sm font-semibold ${set.serving === t ? 'text-ok' : 'text-muted'}`}>
                  {set.serving === t ? `Au service · n°${ts.court[0]}` : 'En réception'}
                </span>
              </div>
              <HalfCourt
                court={court}
                orientation={k === 0 ? 'left' : 'right'}
                flip={flip}
                color={info.color}
                libero={ts.libero?.libero}
                server={set.serving === t ? ts.court[0] : null}
                showConstraints={!editing && checked(t)}
                selected={editing ? edit.picked : null}
                onCellClick={editing ? tap : undefined}
                className="mx-auto w-full max-w-56 landscape:h-[52dvh] landscape:w-auto landscape:max-w-full"
              />
            </div>
          );
        })}
      </div>

      {edit ? (
        <section className="mt-3 rounded-2xl border-2 border-accent p-3">
          <h3 className="font-bold">
            {edit.mode === 'fault' ? 'Faute de rotation' : 'Correction de la rotation'} — {match.teams[edit.team].name}
          </h3>
          <p className="mt-1 text-sm text-muted">
            Touchez deux positions pour échanger les joueurs, ou faites tourner l'ensemble.
            {edit.mode === 'fault' && ' La faute donne le point et le service à l’adversaire.'}
          </p>
          <div className="mt-2 flex gap-2">
            <Button className="flex-1" onClick={() => setEdit({ ...edit, court: rotateBack(edit.court), picked: null })}>
              <RotateCcw /> Arrière
            </Button>
            <Button className="flex-1" onClick={() => setEdit({ ...edit, court: rotate(edit.court), picked: null })}>
              <RotateCw /> Avant
            </Button>
          </div>
          {editCourtInvalid && <p className="mt-2 text-sm font-semibold text-danger">{editCourtInvalid}</p>}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button onClick={() => setEdit(null)}>Annuler</Button>
            <Button
              variant="red"
              disabled={!!editCourtInvalid}
              onClick={() => {
                const e = edit;
                const changed = e.court.some((n, i) => n !== set.teams[e.team].court[i]);
                if (e.mode === 'correct') {
                  if (!changed) return setEdit(null);
                  setConfirm({
                    title: 'Corriger la rotation ?',
                    message: `Nouvel ordre pour ${match.teams[e.team].name}. Aucun point n'est attribué.`,
                    run: () => dispatch({ type: 'SET_COURT', team: e.team, court: e.court }),
                  });
                } else {
                  setConfirm({
                    title: 'Faute de rotation ?',
                    message: `Point et service à ${match.teams[other(e.team)].name}${changed ? ', ordre rectifié' : ''}.`,
                    run: () =>
                      dispatch({ type: 'ROTATION_FAULT', team: e.team, corrected: changed ? e.court : undefined }),
                  });
                }
              }}
            >
              Valider
            </Button>
          </div>
        </section>
      ) : (
        <>
          <section className="mt-3 rounded-2xl bg-surface-2 p-3 text-sm">
            <h3 className="mb-1 font-bold">Placement au moment de la frappe du service</h3>
            {match.config.positionRule === 'receiving-only' ? (
              <p className="text-muted">
                Règles 2025-2028 : l'équipe <strong className="text-fg">au service</strong> se place librement dans son camp ; seule l'équipe{' '}
                <strong className="text-fg">en réception</strong> est contrôlée.
              </p>
            ) : (
              <p className="text-muted">Ancienne règle : les deux équipes sont contrôlées.</p>
            )}
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <span>
                <span className="mr-1 inline-block h-1.5 w-5 rounded bg-[#ffb547] align-middle" /> avant / arrière
              </span>
              <span>
                <span className="mr-1 inline-block h-1.5 w-5 rounded bg-[#6fd3ff] align-middle" /> gauche / droite
              </span>
            </p>
            {order
              .filter((t) => checked(t))
              .map((t) => (
                <div key={t} className="mt-2">
                  <div className="font-bold">{match.teams[t].name}</div>
                  <ul className="mt-1 grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
                    {POSITION_CONSTRAINTS.map((c, i) => (
                      <li key={i} className="flex gap-1.5">
                        <span
                          className="mt-1.5 inline-block h-1.5 w-3 shrink-0 rounded"
                          style={{ background: c.kind === 'front-back' ? '#ffb547' : '#6fd3ff' }}
                        />
                        {describeConstraint(c, set.teams[t].court)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </section>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {order.map((t) => (
              <div key={t} className="flex flex-col gap-2">
                <Button
                  variant="danger"
                  className="text-sm"
                  onClick={() =>
                    setConfirm({
                      title: 'Faute de position ?',
                      message: `${match.teams[t].name} : point et service à ${match.teams[other(t)].name}.`,
                      run: () => dispatch({ type: 'POSITION_FAULT', team: t }),
                    })
                  }
                >
                  Faute de position
                </Button>
                <Button
                  variant="danger"
                  className="text-sm"
                  onClick={() => setEdit({ team: t, mode: 'fault', court: [...set.teams[t].court], picked: null })}
                >
                  Faute de rotation
                </Button>
                <Button
                  className="text-sm"
                  onClick={() => setEdit({ team: t, mode: 'correct', court: [...set.teams[t].court], picked: null })}
                >
                  Corriger la rotation
                </Button>
              </div>
            ))}
          </div>
        </>
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const ok = confirm.run();
            setConfirm(null);
            if (ok) {
              setEdit(null);
              onClose();
            }
          }}
        />
      )}
    </Sheet>
  );
}
