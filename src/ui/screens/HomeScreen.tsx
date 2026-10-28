import { History, Moon, Play, Plus, Sun, Settings as SettingsIcon, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { setsWon } from '../../engine';
import { useApp } from '../../store/useApp';
import { Button, ConfirmDialog, IconButton, TeamTag } from '../components/ui';
import { Artwork } from '../components/Artwork';
import { Settings } from '../components/Settings';

export function BallLogo({ className = '' }: { className?: string }) {
  return <Artwork name="logo" eager className={className} sizes="80px" />;
}

export function HomeScreen() {
  const match = useApp((s) => s.match);
  const archive = useApp((s) => s.archive);
  const prefs = useApp((s) => s.prefs);
  const setPrefs = useApp((s) => s.setPrefs);
  const setScreen = useApp((s) => s.setScreen);
  const closeMatch = useApp((s) => s.closeMatch);
  const [confirmNew, setConfirmNew] = useState(false);
  const [settings, setSettings] = useState(false);
  const lastTeams = match?.teams ?? archive[0]?.state.teams;

  const won = match ? setsWon(match) : null;

  const newMatch = () => {
    if (match) setConfirmNew(true);
    else setScreen('setup');
  };

  return (
    <main className="home-screen scroll-area flex h-full min-h-0 flex-col pt-safe pb-safe px-safe">
      <header className="flex items-center justify-between gap-2 py-2">
        <span className="flex items-center gap-2 text-sm font-extrabold tracking-wide"><BallLogo className="size-12" /> ARBITRE VOLLEY</span>
        <div className="flex">
        <IconButton label="Réglages" onClick={() => setSettings(true)}><SettingsIcon /></IconButton>
        <IconButton
          label={prefs.theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
          onClick={() => setPrefs({ theme: prefs.theme === 'dark' ? 'light' : 'dark' })}
        >
          {prefs.theme === 'dark' ? <Sun /> : <Moon />}
        </IconButton>
        </div>
      </header>
      <div className="home-layout">
        <section className="welcome-card">
          <Artwork name="welcome" eager sizes="(orientation: landscape) 60vw, 100vw" />
          <div className="welcome-copy">
            <p className="eyebrow">À VOUS DE JOUER</p>
            <h1>Le terrain.<br />Le score.<br /><span>Le contrôle.</span></h1>
            <p className="mt-3 text-sm leading-relaxed">Votre feuille de match,<br />toujours à portée de main.</p>
          </div>
        </section>
        <section aria-label="Vos matchs" className="home-actions flex flex-col gap-3">
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
          {lastTeams && <Button onClick={() => {useApp.getState().setDraft(d => ({ ...d, teams: structuredClone(lastTeams) })); newMatch();}}><RotateCcw /> Rejouer avec les mêmes équipes</Button>}
          <p className="text-sm text-muted">Préparez les effectifs, puis tournez le téléphone en paysage pour arbitrer.</p>
        </section>
      </div>
      <p className="pb-2 text-center text-xs text-muted">
        Fonctionne hors connexion · données conservées sur cet appareil uniquement
      </p>
      {settings && <Settings onClose={() => setSettings(false)} />}
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
    </main>
  );
}
