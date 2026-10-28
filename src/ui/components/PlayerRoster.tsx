import { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { MatchConfig, Team } from '../../engine';
import { addPlayer, setPlayerRole } from '../../lib/players';
import { useApp } from '../../store/useApp';
import { Artwork } from './Artwork';
import { Button, Card, IconButton, Sheet, Toggle } from './ui';

export function PlayerRoster({ team, config, onChange }: { team: Team; config: MatchConfig; onChange: (fn: (t: Team) => Team) => void }) {
  const [number, setNumber] = useState('');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const favorites = useApp(s => s.favorites);
  const saveFavorite = useApp(s => s.saveFavorite);
  const removeFavorite = useApp(s => s.removeFavorite);
  const player = team.players.find(p => p.number === selected);
  const role = (kind: 'captain' | 'libero') => {
    if (!player) return;
    const r = setPlayerRole(team.players, player.number, kind, config.maxLiberos);
    setError(r.error ?? '');
    if (!r.error) onChange(t => ({ ...t, players: r.players }));
  };
  return <Card title={`Effectif · ${team.players.length} joueurs`}>
    <p className="mb-3 text-sm text-muted">Numéros uniquement. Touchez un numéro pour désigner le capitaine (C) ou un libéro (L).</p>
    {team.players.length === 0 && <div className="empty-roster">
      <Artwork name="empty-players" className="illustration-halo" sizes="120px" />
      <Button onClick={() => onChange(t => ({ ...t, players: Array.from({length:12}, (_,i) => ({number:i+1})) }))}>Créer les n° 1 à 12</Button>
    </div>}
    <form className="flex flex-wrap items-end gap-2" onSubmit={e => {
      e.preventDefault();
      const result = addPlayer(team.players, number);
      setError(result.error ?? '');
      if (!result.error) { onChange(t => ({ ...t, players: result.players })); setNumber(''); }
      input.current?.focus();
    }}>
      <label className="min-w-24 flex-1 text-sm font-semibold">N° de maillot
        <input ref={input} value={number} inputMode="numeric" pattern="[0-9]*" maxLength={2} autoComplete="off" enterKeyHint="done" aria-invalid={!!error} aria-describedby="roster-help" onChange={e => {setNumber(e.target.value); setError('');}} className="mt-1 min-h-12 w-full rounded-xl border border-line bg-surface-2 px-3 text-lg" />
      </label>
      <Button type="submit" variant="primary">Ajouter</Button>
    </form>
    <p id="roster-help" role="status" className={`mt-2 text-sm ${error ? 'text-danger' : 'text-muted'}`}>{error || 'Ajoutez les numéros à la suite, sans fermer ce panneau.'}</p>
    <ul className="roster-grid mt-3" aria-label={`Effectif ${team.name}`}>
      {team.players.map(p => <li key={p.number}><button type="button" className="roster-number tap" aria-label={`N°${p.number}${p.captain ? ', capitaine' : ''}${p.libero ? ', libéro' : ''}, modifier les rôles`} onClick={() => {setSelected(p.number); setError('');}}>
        <strong>{p.number}</strong><span className="text-xs">{p.captain && 'C'}{p.captain && p.libero && ' · '}{p.libero && 'L'}</span>
      </button></li>)}
    </ul>
    <div className="mt-4 border-t border-line pt-3">
      <Button className="w-full" disabled={!team.name.trim() || team.players.length === 0} onClick={() => saveFavorite(team)}>Enregistrer cette équipe favorite</Button>
      {favorites.length > 0 && <label className="mt-3 block text-sm font-semibold">Charger une équipe favorite
        <select value="" onChange={e => { const favorite = favorites.find(t => t.name === e.target.value); if (favorite) onChange(() => structuredClone(favorite)); }} className="mt-1 min-h-12 w-full rounded-xl border border-line bg-surface-2 px-3">
          <option value="">Choisir une équipe…</option>{favorites.map(t => <option key={t.name} value={t.name}>{t.name} · {t.players.length} joueurs</option>)}
        </select>
      </label>}
      {favorites.length > 0 && <details className="mt-2"><summary className="flex min-h-12 cursor-pointer items-center text-sm text-muted">Gérer les favoris</summary>{favorites.map(t => <div key={t.name} className="flex items-center justify-between gap-2"><span>{t.name}</span><IconButton label={`Retirer ${t.name} des favoris`} onClick={() => removeFavorite(t.name)}><Trash2 /></IconButton></div>)}</details>}
    </div>
    {player && <Sheet title={`Joueur n°${player.number}`} onClose={() => setSelected(null)}>
      <Toggle label="Capitaine (C)" checked={!!player.captain} onChange={() => role('captain')} />
      <Toggle label="Libéro (L)" hint={`Au maximum ${config.maxLiberos} libéro(s) pour ce format`} checked={!!player.libero} onChange={() => role('libero')} />
      {error && <p role="alert" className="text-danger">{error}</p>}
      <Button className="mt-3 w-full" variant="danger" onClick={() => {onChange(t => ({ ...t, players: t.players.filter(p => p.number !== player.number) })); setSelected(null);}}>Retirer le n°{player.number}</Button>
      <Button className="mt-2 w-full" onClick={() => setSelected(null)}>Terminé</Button>
    </Sheet>}
  </Card>;
}
