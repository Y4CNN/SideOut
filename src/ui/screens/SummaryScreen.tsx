import { ChevronLeft, Copy, FileJson, Plus, ScrollText, Share2, Trash2, Trophy, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { formatDuration, matchSummary, sanctionText, summaryJson, summaryText, type MatchState, type TeamId } from '../../engine';
import { textOn } from '../../lib/color';
import { copyText, shareFile, shareText } from '../../lib/share';
import { useApp } from '../../store/useApp';
import { Button, Card, ConfirmDialog, IconButton } from '../components/ui';
import { LogSheet } from '../sheets/LogSheet';
import { Artwork } from '../components/Artwork';

export function SummaryScreen({
  match,
  archived = false,
  onBack,
  onDelete,
}: {
  match: MatchState;
  archived?: boolean;
  onBack?: () => void;
  onDelete?: () => void;
}) {
  const toast = useApp((s) => s.toast);
  const undo = useApp((s) => s.undo);
  const closeMatch = useApp((s) => s.closeMatch);
  const setScreen = useApp((s) => s.setScreen);
  const [log, setLog] = useState(false);
  const [confirm, setConfirm] = useState<'new' | 'delete' | null>(null);
  const sum = matchSummary(match);
  const teams: TeamId[] = ['A', 'B'];
  const title = `${match.teams.A.name} – ${match.teams.B.name}`;
  const date = new Date(match.startedAt ?? match.createdAt).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const share = async () => {
    const r = await shareText(title, summaryText(match));
    if (r === 'copied') toast('success', 'Récapitulatif copié dans le presse-papiers.');
  };
  const copy = async () => {
    toast((await copyText(summaryText(match))) ? 'success' : 'error', 'Récapitulatif copié dans le presse-papiers.');
  };
  const exportJson = async () => {
    const d = new Date(match.startedAt ?? match.createdAt).toISOString().slice(0, 10);
    const safe = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
    const r = await shareFile(`match-${d}-${safe(match.teams.A.name)}-${safe(match.teams.B.name)}.json`, summaryJson(match));
    if (r === 'downloaded') toast('success', 'Fichier JSON téléchargé.');
  };

  const winner = sum.winner ? match.teams[sum.winner] : null;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-1 border-b border-line bg-surface pt-safe px-safe">
        {onBack && (
          <IconButton label="Retour" onClick={onBack}>
            <ChevronLeft />
          </IconButton>
        )}
        <h1 className="flex-1 truncate text-lg font-bold">{archived ? 'Match archivé' : 'Fin du match'}</h1>
        <IconButton label="Journal" onClick={() => setLog(true)}>
          <ScrollText />
        </IconButton>
      </header>

      <main className="scroll-area min-h-0 flex-1 px-safe py-3">
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          {match.phase === 'finished' && <Artwork name="match-end" className="summary-art illustration-halo" />}
          {winner && (
            <section
              className="flex items-center gap-3 rounded-2xl p-4"
              style={{ background: winner.color, color: textOn(winner.color) }}
            >
              <Trophy className="size-10 shrink-0" />
              <div className="min-w-0">
                <div className="truncate text-2xl font-black">{winner.name}</div>
                <div className="font-semibold">
                  remporte le match {sum.setsWon[sum.winner!]}–{sum.setsWon[sum.winner === 'A' ? 'B' : 'A']}
                </div>
              </div>
            </section>
          )}
          <p className="text-sm text-muted first-letter:uppercase">
            {date} · durée {formatDuration(sum.durationMs)}
            {match.incomplete && ` · ${match.teams[match.incomplete.team].name} déclarée incomplète`}
          </p>

          <Card title="Score par set">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-sm text-muted">
                    <th className="py-1 pr-2 font-semibold">Équipe</th>
                    {sum.sets.map((s) => (
                      <th key={s.number} className="px-1 py-1 text-center font-semibold">
                        S{s.number}
                      </th>
                    ))}
                    <th className="px-1 py-1 text-center font-semibold">Sets</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((t) => (
                    <tr key={t} className="border-t border-line">
                      <td className="max-w-32 truncate py-2 pr-2 font-bold">
                        <span className="mr-1.5 inline-block size-3 rounded-full align-middle" style={{ background: match.teams[t].color }} />
                        {match.teams[t].name}
                      </td>
                      {sum.sets.map((s) => (
                        <td key={s.number} className={`tabular px-1 py-2 text-center text-lg ${s.winner === t ? 'font-black' : 'text-muted'}`}>
                          {s.score[t]}
                        </td>
                      ))}
                      <td className="tabular px-1 py-2 text-center text-xl font-black">{sum.setsWon[t]}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-line text-sm text-muted">
                    <td className="py-1 pr-2">Durée</td>
                    {sum.sets.map((s) => (
                      <td key={s.number} className="px-1 py-1 text-center whitespace-nowrap">
                        {formatDuration(s.durationMs)}
                      </td>
                    ))}
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Temps morts et remplacements">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-muted">
                  <th className="py-1 font-semibold" />
                  <th className="py-1 text-center font-semibold">Temps morts</th>
                  <th className="py-1 text-center font-semibold">Remplacements</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t) => (
                  <tr key={t} className="border-t border-line">
                    <td className="max-w-28 truncate py-2 font-bold">{match.teams[t].name}</td>
                    <td className="tabular py-2 text-center">
                      <strong>{sum.totals.timeouts[t]}</strong>
                      <span className="ml-1 text-muted">({sum.sets.map((s) => s.timeouts[t]).join(' · ')})</span>
                    </td>
                    <td className="tabular py-2 text-center">
                      <strong>{sum.totals.subs[t]}</strong>
                      <span className="ml-1 text-muted">({sum.sets.map((s) => s.subs[t]).join(' · ')})</span>
                      {sum.sets.some((s) => s.exceptionalSubs[t]) && (
                        <span className="ml-1 text-warn">+{sum.sets.reduce((a, s) => a + s.exceptionalSubs[t], 0)} exc.</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card title="Sanctions">
            {sum.sanctions.length === 0 && !sum.improperRequests.A && !sum.improperRequests.B ? (
              <p className="text-sm text-muted">Aucune sanction.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {sum.sanctions.map((s, i) => (
                  <li key={i} className="rounded-lg bg-surface-2 px-3 py-2">
                    {sanctionText(match, s)}
                  </li>
                ))}
                {teams
                  .filter((t) => sum.improperRequests[t])
                  .map((t) => (
                    <li key={t} className="rounded-lg bg-surface-2 px-3 py-2">
                      Demandes irrégulières — {match.teams[t].name} : {sum.improperRequests[t]}
                    </li>
                  ))}
              </ul>
            )}
          </Card>

          <div className="grid grid-cols-3 gap-2">
            <Button variant="primary" onClick={share}>
              <Share2 /> Partager
            </Button>
            <Button onClick={copy}>
              <Copy /> Copier
            </Button>
            <Button onClick={exportJson}>
              <FileJson /> JSON
            </Button>
          </div>
        </div>
      </main>

      <footer className="flex gap-2 border-t border-line bg-surface px-safe pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
        {archived ? (
          <Button variant="danger" className="flex-1" onClick={() => setConfirm('delete')}>
            <Trash2 /> Supprimer
          </Button>
        ) : (
          <>
            <Button className="flex-1" onClick={undo}>
              <Undo2 /> Annuler
            </Button>
            <Button variant="red" className="flex-1" onClick={() => setConfirm('new')}>
              <Plus /> Nouveau match
            </Button>
          </>
        )}
      </footer>

      {log && <LogSheet match={match} onClose={() => setLog(false)} />}
      {confirm === 'new' && (
        <ConfirmDialog
          title="Nouveau match ?"
          message="Ce match sera archivé dans l'historique (consultable depuis l'accueil)."
          confirmLabel="Nouveau match"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null);
            closeMatch();
            setScreen('setup');
          }}
        />
      )}
      {confirm === 'delete' && (
        <ConfirmDialog
          title="Supprimer ce match ?"
          message="Il sera définitivement retiré de l'historique."
          confirmLabel="Supprimer"
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null);
            onDelete?.();
          }}
        />
      )}
    </div>
  );
}
