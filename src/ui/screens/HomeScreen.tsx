import { History, Moon, Play, Plus, Sun } from 'lucide-react';
import { useState } from 'react';
import { setsWon } from '../../engine';
import { useApp } from '../../store/useApp';
import { Button, ConfirmDialog, IconButton, TeamTag } from '../components/ui';

export function BallLogo({ className = '' }: { className?: string }) {
  return <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className={className} />;
}

export function HomeScreen() {
  const match = useApp((s) => s.match);
  const archive = useApp((s) => s.archive);
  const prefs = useApp((s) => s.prefs);
  const setPrefs = useApp((s) => s.setPrefs);
  const setScreen = useApp((s) => s.setScreen);
  const closeMatch = useApp((s) => s.closeMatch);
  const [confirmNew, setConfirmNew] = useState(false);

  const won = match ? setsWon(match) : null;

  const newMatch = () => {
    if (match) setConfirmNew(true);
    else setScreen('setup');
  };

  return (
    <div className="scroll-area flex h-full flex-col pt-safe pb-safe px-safe">
      <div className="flex items-center justify-end pt-2">
        <IconButton
          label={prefs.theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
          onClick={() => setPrefs({ theme: prefs.theme === 'dark' ? 'light' : 'dark' })}
        >
          {prefs.theme === 'dark' ? <Sun /> : <Moon />}
        </IconButton>
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 py-4 landscape:max-w-2xl landscape:flex-row landscape:items-center">
        <div className="flex flex-col items-center gap-3 text-center landscape:flex-1">
          <BallLogo className="size-24 rounded-3xl shadow-lg landscape:size-20" />
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              Arbitre <span className="text-ffred">Volley</span>
            </h1>
            <p className="mt-1 text-muted">Feuille de match de poche · règles FIVB 2025‑2028</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 landscape:flex-1">
          {match && (
            <button
              type="button"
              onClick={() => setScreen('game')}
              className="tap flex items-center gap-3 rounded-2xl border-2 border-ffred bg-surface p-4 text-left"
            >
              <Play className="size-8 shrink-0 text-ffred" fill="currentColor" />
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold">Reprendre le match</span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5 text-sm">
                  <TeamTag name={match.teams.A.name} color={match.teams.A.color} />
                  <span className="tabular font-bold">
                    {won!.A} – {won!.B}
                  </span>
                  <TeamTag name={match.teams.B.name} color={match.teams.B.color} />
                </span>
              </span>
            </button>
          )}
          <Button variant={match ? 'secondary' : 'red'} className="min-h-14 text-lg" onClick={newMatch}>
            <Plus /> Nouveau match
          </Button>
          <Button className="min-h-14 text-lg" onClick={() => setScreen('history')}>
            <History /> Historique {archive.length > 0 && <span className="text-muted">({archive.length})</span>}
          </Button>
        </div>
      </div>
      <p className="pb-2 text-center text-xs text-muted">
        Fonctionne hors connexion · données conservées sur cet appareil uniquement
      </p>
      {confirmNew && (
        <ConfirmDialog
          title="Nouveau match ?"
          message="Le match en cours sera archivé dans l'historique (s'il a commencé) puis fermé."
          confirmLabel="Nouveau match"
          danger
          onCancel={() => setConfirmNew(false)}
          onConfirm={() => {
            setConfirmNew(false);
            closeMatch();
            setScreen('setup');
          }}
        />
      )}
    </div>
  );
}
