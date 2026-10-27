import { Flag, House, Pencil, ScrollText, Share2, UserRoundX, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { other, summaryText, type MatchState, type TeamId } from '../../engine';
import { shareText } from '../../lib/share';
import { useApp } from '../../store/useApp';
import { Button, ConfirmDialog, Segmented, Sheet, TeamButton, Toggle } from '../components/ui';
import { LogSheet } from './LogSheet';

function Item({ icon, label, hint, onClick, danger }: { icon: ReactNode; label: string; hint?: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tap flex min-h-14 w-full items-center gap-3 rounded-xl px-2 text-left active:bg-surface-2 ${danger ? 'text-danger' : ''}`}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-2">{icon}</span>
      <span className="min-w-0">
        <span className="block font-semibold">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
    </button>
  );
}

export function MenuSheet({ match, onClose, onOpenLog }: { match: MatchState; onClose: () => void; onOpenLog?: () => void }) {
  const prefs = useApp((s) => s.prefs);
  const setPrefs = useApp((s) => s.setPrefs);
  const setScreen = useApp((s) => s.setScreen);
  const editTeams = useApp((s) => s.editTeams);
  const closeMatch = useApp((s) => s.closeMatch);
  const dispatch = useApp((s) => s.dispatch);
  const toast = useApp((s) => s.toast);
  const [log, setLog] = useState(false);
  const [dialog, setDialog] = useState<'force' | 'incomplete' | 'close' | null>(null);
  const [team, setTeam] = useState<TeamId | null>(null);
  const [scope, setScope] = useState<'set' | 'match'>('set');
  const playing = match.phase === 'playing';

  if (log) return <LogSheet match={match} onClose={onClose} />;

  const share = async () => {
    const r = await shareText(`${match.teams.A.name} – ${match.teams.B.name}`, summaryText(match));
    if (r === 'copied') toast('success', 'Récapitulatif copié dans le presse-papiers.');
  };

  return (
    <Sheet title="Menu" onClose={onClose}>
      <div className="flex flex-col gap-1">
        <Item icon={<ScrollText />} label="Journal du match" onClick={() => (onOpenLog ? onOpenLog() : setLog(true))} />
        <Item icon={<Share2 />} label="Partager le récapitulatif provisoire" onClick={share} />
        {playing && (
          <Item
            icon={<Flag />}
            label="Fin de set forcée"
            hint="Termine le set avec le score actuel"
            onClick={() => {
              setTeam(null);
              setDialog('force');
            }}
          />
        )}
        {match.phase !== 'finished' && (
          <Item
            icon={<UserRoundX />}
            label="Déclarer une équipe incomplète"
            hint="L'adversaire reçoit les points et sets nécessaires"
            onClick={() => {
              setTeam(null);
              setScope(playing ? 'set' : 'match');
              setDialog('incomplete');
            }}
          />
        )}
        {match.phase === 'pre-set' && match.sets.length === 0 && (
          <Item icon={<Pencil />} label="Modifier les équipes et réglages" hint="Le tirage au sort sera à refaire" onClick={editTeams} />
        )}
        <Item icon={<House />} label="Accueil" hint="Le match est conservé, reprise à tout moment" onClick={() => setScreen('home')} />
        <Item icon={<X />} label="Fermer le match" hint="Archive le match dans l'historique" danger onClick={() => setDialog('close')} />
      </div>

      <h3 className="mt-4 mb-1 font-bold">Affichage et retours</h3>
      <Toggle label="Mode sombre" checked={prefs.theme === 'dark'} onChange={(v) => setPrefs({ theme: v ? 'dark' : 'light' })} />
      <Toggle label="Sons" hint="Fin de chrono, alertes" checked={prefs.sound} onChange={(v) => setPrefs({ sound: v })} />
      <Toggle label="Vibrations" hint="Android uniquement" checked={prefs.haptics} onChange={(v) => setPrefs({ haptics: v })} />
      <Toggle label="Positions dans les zones d'équipe" checked={prefs.showCourt} onChange={(v) => setPrefs({ showCourt: v })} />
      <Toggle
        label="Inverser haut / bas des terrains"
        hint="Vue depuis le côté opposé (2e arbitre)"
        checked={prefs.flipView}
        onChange={(v) => setPrefs({ flipView: v })}
      />

      {(dialog === 'force' || dialog === 'incomplete') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDialog(null)} />
          <div className="animate-pop relative w-full max-w-md rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-xl font-bold">{dialog === 'force' ? 'Fin de set forcée' : 'Équipe incomplète'}</h2>
            <p className="mt-1 text-sm text-muted">
              {dialog === 'force' ? 'Vainqueur du set :' : 'Équipe déclarée incomplète :'}
            </p>
            <div className="mt-2 flex gap-3">
              {(['A', 'B'] as TeamId[]).map((t) => (
                <TeamButton key={t} name={match.teams[t].name} color={match.teams[t].color} selected={team === t} onClick={() => setTeam(t)} />
              ))}
            </div>
            {dialog === 'incomplete' && (
              <Segmented
                className="mt-3"
                value={scope}
                onChange={setScope}
                options={[
                  ...(playing ? [{ value: 'set' as const, label: 'Pour le set' }] : []),
                  { value: 'match' as const, label: 'Pour le match' },
                ]}
              />
            )}
            {team && dialog === 'incomplete' && (
              <p className="mt-3 text-sm">
                {match.teams[other(team)].name} reçoit les points {scope === 'match' ? 'et les sets nécessaires pour gagner le match' : 'nécessaires pour gagner le set'}.
              </p>
            )}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button onClick={() => setDialog(null)}>Annuler</Button>
              <Button
                variant="red"
                disabled={!team}
                onClick={() => {
                  if (!team) return;
                  const ok =
                    dialog === 'force'
                      ? dispatch({ type: 'FORCE_END_SET', winner: team })
                      : dispatch({ type: 'DECLARE_INCOMPLETE', team, scope });
                  setDialog(null);
                  if (ok) onClose();
                }}
              >
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}

      {dialog === 'close' && (
        <ConfirmDialog
          title="Fermer le match ?"
          message="Le match sera archivé dans l'historique (s'il a commencé). Cette action ne peut pas être annulée."
          confirmLabel="Fermer"
          danger
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            setDialog(null);
            closeMatch();
          }}
        />
      )}
    </Sheet>
  );
}
