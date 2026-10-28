import { ChevronLeft, ChevronRight } from 'lucide-react';
import { setsWon } from '../../engine';
import { useApp } from '../../store/useApp';
import { IconButton, TeamTag } from '../components/ui';
import { SummaryScreen } from './SummaryScreen';
import { Artwork } from '../components/Artwork';

export function HistoryScreen() {
  const archive = useApp((s) => s.archive);
  const viewing = useApp((s) => s.viewingArchive);
  const view = useApp((s) => s.viewArchive);
  const remove = useApp((s) => s.deleteArchive);
  const setScreen = useApp((s) => s.setScreen);

  if (viewing !== null && archive[viewing]) {
    return (
      <SummaryScreen
        match={archive[viewing].state}
        archived
        onBack={() => view(null)}
        onDelete={() => remove(viewing)}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-1 border-b border-line bg-surface pt-safe px-safe">
        <IconButton label="Retour à l'accueil" onClick={() => setScreen('home')}>
          <ChevronLeft />
        </IconButton>
        <h1 className="flex-1 truncate text-lg font-bold">Historique des matchs</h1>
      </header>
      <main className="scroll-area min-h-0 flex-1 px-safe py-3 pb-safe">
        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          {archive.length === 0 && <div className="empty-state"><Artwork name="empty-matches" className="illustration-halo" /><h2 className="text-xl font-extrabold">Le prochain match ouvre l’histoire.</h2><p className="text-muted">Vos matchs terminés ou fermés apparaîtront ici.</p></div>}
          {archive.map((a, i) => {
            const m = a.state;
            const won = setsWon(m);
            return (
              <button
                key={`${m.id}-${a.savedAt}`}
                type="button"
                onClick={() => view(i)}
                className="tap flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <TeamTag name={m.teams.A.name} color={m.teams.A.color} />
                    <span className="tabular text-lg font-black">
                      {won.A} – {won.B}
                    </span>
                    <TeamTag name={m.teams.B.name} color={m.teams.B.color} />
                  </span>
                  <span className="mt-1 block text-sm text-muted">
                    {new Date(m.startedAt ?? m.createdAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                    {' · '}
                    {m.sets.map((s) => `${s.score.A}-${s.score.B}`).join(', ')}
                    {m.phase !== 'finished' && ' · inachevé'}
                  </span>
                </span>
                <ChevronRight className="shrink-0 text-muted" />
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
