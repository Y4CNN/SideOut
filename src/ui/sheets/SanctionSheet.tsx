import { useState } from 'react';
import {
  SANCTION_LABELS,
  sanctionText,
  type MatchState,
  type SanctionAction,
  type SanctionTarget,
  type TeamId,
} from '../../engine';
import { useApp } from '../../store/useApp';
import { Button, Sheet, TeamButton } from '../components/ui';

type Kind = SanctionAction | 'delay' | 'improper';

const STAFF = ['Entraîneur', 'Entraîneur adjoint', 'Soigneur / kiné', 'Médecin'];

function Cards({ kind }: { kind: Kind }) {
  const y = <span className="inline-block h-6 w-4 rounded-sm bg-[#FFD200] shadow" />;
  const r = <span className="inline-block h-6 w-4 rounded-sm bg-ffred shadow" />;
  switch (kind) {
    case 'warning':
      return y;
    case 'penalty':
      return r;
    case 'expulsion':
      return (
        <span className="relative inline-block h-6 w-6">
          <span className="absolute left-0 h-6 w-4 rounded-sm bg-ffred shadow" />
          <span className="absolute left-2 h-6 w-4 rounded-sm bg-[#FFD200] shadow" />
        </span>
      );
    case 'disqualification':
      return (
        <span className="inline-flex gap-1">
          {r}
          {y}
        </span>
      );
    case 'delay':
      return <span className="text-xl">⏱</span>;
    case 'improper':
      return <span className="text-xl">✋</span>;
  }
}

export function SanctionSheet({
  match,
  initialTeam,
  onClose,
}: {
  match: MatchState;
  initialTeam?: TeamId;
  onClose: () => void;
}) {
  const dispatch = useApp((s) => s.dispatch);
  const [team, setTeam] = useState<TeamId | null>(initialTeam ?? null);
  const [kind, setKind] = useState<Kind | null>(null);
  const [target, setTarget] = useState<SanctionTarget | null>(null);
  const playing = match.phase === 'playing';

  const delayWarned = team ? match.sanctions.some((s) => s.team === team && s.kind === 'delay-warning') : false;
  const improperCount = team ? match.improperRequests[team] : 0;

  const kinds: { kind: Kind; label: string; hint: string; needsPlay: boolean }[] = [
    { kind: 'warning', label: SANCTION_LABELS.warning, hint: 'Sans conséquence', needsPlay: false },
    { kind: 'penalty', label: SANCTION_LABELS.penalty, hint: 'Point et service à l’adversaire', needsPlay: true },
    { kind: 'expulsion', label: SANCTION_LABELS.expulsion, hint: 'Quitte le jeu pour le reste du set', needsPlay: true },
    { kind: 'disqualification', label: SANCTION_LABELS.disqualification, hint: 'Quitte le match', needsPlay: true },
    {
      kind: 'delay',
      label: 'Retard de jeu',
      hint: delayWarned ? '→ Pénalité pour retard (point adverse)' : '→ Avertissement pour retard',
      needsPlay: true,
    },
    {
      kind: 'improper',
      label: 'Demande irrégulière',
      hint: improperCount === 0 ? 'Notée, sans conséquence' : '→ Répétition : sanction pour retard',
      needsPlay: improperCount > 0,
    },
  ];

  const needsTarget = kind === 'warning' || kind === 'penalty' || kind === 'expulsion' || kind === 'disqualification';
  const canApply = team && kind && (!needsTarget || target);

  const apply = () => {
    if (!team || !kind) return;
    let ok = false;
    if (kind === 'delay') ok = dispatch({ type: 'DELAY', team });
    else if (kind === 'improper') ok = dispatch({ type: 'IMPROPER_REQUEST', team });
    else if (target) ok = dispatch({ type: 'SANCTION', team, kind, target });
    if (ok) onClose();
  };

  const set = match.sets[match.sets.length - 1];
  const onCourt = playing && team ? set.teams[team].court : [];
  const teamSanctions = team ? match.sanctions.filter((s) => s.team === team) : [];

  return (
    <Sheet
      onClose={onClose}
      wide
      title="Sanctions"
      footer={
        <Button variant="red" className="w-full text-lg" disabled={!canApply} onClick={apply}>
          Appliquer
        </Button>
      }
    >
      <div className="flex gap-3">
        {(['A', 'B'] as TeamId[]).map((t) => (
          <TeamButton
            key={t}
            name={match.teams[t].name}
            color={match.teams[t].color}
            selected={team === t}
            onClick={() => {
              setTeam(t);
              setTarget(null);
            }}
          />
        ))}
      </div>

      {team && (
        <>
          <h3 className="mt-4 mb-2 font-bold">Type</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {kinds.map((k) => {
              const disabled = k.needsPlay && !playing;
              return (
                <button
                  key={k.kind}
                  type="button"
                  disabled={disabled}
                  onClick={() => setKind(k.kind)}
                  className={`tap flex min-h-14 items-center gap-3 rounded-xl border-2 px-3 py-2 text-left disabled:opacity-35 ${
                    kind === k.kind ? 'border-accent bg-accent/15' : 'border-line bg-surface-2'
                  }`}
                >
                  <span className="flex w-8 shrink-0 justify-center">
                    <Cards kind={k.kind} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-bold">{k.label}</span>
                    <span className="block text-sm text-muted">{k.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {needsTarget && (
            <>
              <h3 className="mt-4 mb-2 font-bold">Membre sanctionné</h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-1.5">
                {match.teams[team].players.map((p) => {
                  const sel = target?.kind === 'player' && target.number === p.number;
                  return (
                    <button
                      key={p.number}
                      type="button"
                      onClick={() => setTarget({ kind: 'player', number: p.number })}
                      className={`tap relative flex min-h-12 flex-col items-center justify-center rounded-xl border-2 font-black ${
                        sel ? 'border-accent bg-accent/25' : 'border-line bg-surface-2'
                      }`}
                    >
                      <span className="tabular text-lg leading-none">{p.number}</span>
                      <span className="text-[10px] font-semibold text-muted">
                        {onCourt.includes(p.number) ? 'terrain' : p.libero ? 'L' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {STAFF.map((role) => {
                  const sel = target?.kind === 'staff' && target.role === role;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setTarget({ kind: 'staff', role })}
                      className={`tap min-h-12 rounded-xl border-2 px-3 text-sm font-bold ${
                        sel ? 'border-accent bg-accent/25' : 'border-line bg-surface-2'
                      }`}
                    >
                      {role}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <h3 className="mt-5 mb-2 font-bold">Sanctions de l'équipe</h3>
          {teamSanctions.length === 0 && improperCount === 0 ? (
            <p className="text-sm text-muted">Aucune.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {improperCount > 0 && <li className="rounded-lg bg-surface-2 px-3 py-2">Demandes irrégulières : {improperCount}</li>}
              {teamSanctions.map((s, i) => (
                <li key={i} className="rounded-lg bg-surface-2 px-3 py-2">
                  {sanctionText(match, s)}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Sheet>
  );
}
