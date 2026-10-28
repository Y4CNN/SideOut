import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PRESETS, presetConfig, validateTeam, type MatchConfig, type Player, type Team, type TeamId } from '../../engine';
import { TEAM_PALETTE, softOn, textOn } from '../../lib/color';
import { useApp } from '../../store/useApp';
import { Button, Card, IconButton, Segmented, Stepper, Toggle } from '../components/ui';

type Tab = 'config' | TeamId;

export function SetupScreen() {
  const draft = useApp((s) => s.draft);
  const setDraft = useApp((s) => s.setDraft);
  const setScreen = useApp((s) => s.setScreen);
  const startMatch = useApp((s) => s.startMatch);
  const [tab, setTab] = useState<Tab>('A');
  const [errors, setErrors] = useState<string[]>([]);

  const setConfig = (patch: Partial<MatchConfig>, keepPreset = false) =>
    setDraft((d) => ({ ...d, config: { ...d.config, ...patch, preset: keepPreset ? (patch.preset ?? d.config.preset) : 'custom' } }));
  const setTeam = (id: TeamId, fn: (t: Team) => Team) =>
    setDraft((d) => ({ ...d, teams: { ...d.teams, [id]: fn(d.teams[id]) } }));

  const submit = () => {
    const errs = startMatch();
    setErrors(errs);
  };

  const teamErrors = (id: TeamId) => validateTeam(draft.teams[id], draft.config).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-1 border-b border-line bg-surface pt-safe px-safe">
        <IconButton label="Retour à l'accueil" onClick={() => setScreen('home')}>
          <ChevronLeft />
        </IconButton>
        <h1 className="flex-1 truncate text-lg font-bold">Préparation du match</h1>
      </header>
      <div className="border-b border-line bg-surface px-safe py-2">
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'A', label: <TabLabel text={draft.teams.A.name || 'Équipe A'} color={draft.teams.A.color} bad={teamErrors('A') > 0} /> },
            { value: 'B', label: <TabLabel text={draft.teams.B.name || 'Équipe B'} color={draft.teams.B.color} bad={teamErrors('B') > 0} /> },
            { value: 'config', label: 'Réglages' },
          ]}
        />
      </div>
      <main className="scroll-area min-h-0 flex-1 px-safe py-3">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {tab === 'config' ? (
            <ConfigEditor config={draft.config} setConfig={setConfig} />
          ) : (
            <TeamEditor key={tab} team={draft.teams[tab]} config={draft.config} onChange={(fn) => setTeam(tab, fn)} />
          )}
        </div>
      </main>
      <footer className="border-t border-line bg-surface px-safe pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
        {errors.length > 0 && (
          <ul className="scroll-area mb-2 max-h-28 list-disc rounded-xl bg-danger/10 py-2 pr-2 pl-7 text-sm text-danger">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        <Button variant="red" className="w-full text-lg" onClick={submit}>
          Valider · tirage au sort
        </Button>
      </footer>
    </div>
  );
}

function TabLabel({ text, color, bad }: { text: string; color: string; bad: boolean }) {
  return (
    <span className="flex min-w-0 items-center justify-center gap-1.5">
      <span className="size-3 shrink-0 rounded-full" style={{ background: color, boxShadow: '0 0 0 1px rgba(255,255,255,.5)' }} />
      <span className="max-w-[7rem] truncate">{text}</span>
      {bad && <span className="text-warn">•</span>}
    </span>
  );
}

// ——— Réglages ————————————————————————————————————————————————

function ConfigEditor({
  config,
  setConfig,
}: {
  config: MatchConfig;
  setConfig: (patch: Partial<MatchConfig>, keepPreset?: boolean) => void;
}) {
  const tto = config.technicalTimeouts;
  const preset = PRESETS.find((p) => p.id === config.preset);
  return (
    <>
      <Card title="Format">
        <Segmented
          value={config.preset}
          onChange={(id) => setConfig(presetConfig(id), true)}
          options={PRESETS.map((p) => ({ value: p.id, label: p.label }))}
        />
        {preset && <p className="mt-2 text-sm text-muted">{preset.description}</p>}
      </Card>

      <Card title="Sets et points">
        <div className="flex min-h-12 items-center gap-3 py-2">
          <span className="flex-1 font-medium">Match en</span>
          <Segmented
            value={config.setsToWin}
            onChange={(v) => setConfig({ setsToWin: v })}
            options={[
              { value: 3, label: '3 sets gagnants' },
              { value: 2, label: '2 sets gagnants' },
            ]}
          />
        </div>
        <Stepper label="Points par set" hint="Sets non décisifs" value={config.pointsPerSet} min={5} max={50} onChange={(v) => setConfig({ pointsPerSet: v })} />
        <Stepper label="Points au set décisif" value={config.pointsDecidingSet} min={5} max={50} onChange={(v) => setConfig({ pointsDecidingSet: v })} />
        <Stepper label="Écart minimum" value={config.minLead} min={1} max={5} onChange={(v) => setConfig({ minLead: v })} />
        <Toggle
          label="Plafond de points"
          hint={config.pointCap === null ? 'Sans plafond (règle officielle)' : 'Le set s’arrête au plafond, quel que soit l’écart'}
          checked={config.pointCap !== null}
          onChange={(on) => setConfig({ pointCap: on ? config.pointsPerSet + 5 : null })}
        />
        {config.pointCap !== null && (
          <Stepper label="Plafond" value={config.pointCap} min={5} max={60} onChange={(v) => setConfig({ pointCap: v })} />
        )}
      </Card>

      <Card title="Côtés">
        <Toggle
          label="Changer de côté entre les sets"
          hint="Inversion de l'affichage gauche/droite"
          checked={config.switchSidesBetweenSets}
          onChange={(v) => setConfig({ switchSidesBetweenSets: v })}
        />
        <Toggle
          label="Changement de côté au set décisif"
          checked={config.decidingSetSwitchAt !== null}
          onChange={(on) => setConfig({ decidingSetSwitchAt: on ? 8 : null })}
        />
        {config.decidingSetSwitchAt !== null && (
          <Stepper
            label="Quand une équipe atteint"
            unit=" pts"
            value={config.decidingSetSwitchAt}
            min={1}
            max={config.pointsDecidingSet - 1}
            onChange={(v) => setConfig({ decidingSetSwitchAt: v })}
          />
        )}
      </Card>

      <Card title="Temps morts">
        <Stepper label="Par équipe et par set" value={config.timeoutsPerSet} min={0} max={5} onChange={(v) => setConfig({ timeoutsPerSet: v })} />
        <Stepper label="Durée" unit=" s" value={config.timeoutDuration} min={10} max={120} step={5} onChange={(v) => setConfig({ timeoutDuration: v })} />
        <div className="flex min-h-12 items-center gap-3 py-2">
          <span className="flex-1 font-medium">Avertissement à</span>
          <Segmented
            value={config.timeoutWarningAt}
            onChange={(v) => setConfig({ timeoutWarningAt: v })}
            options={[
              { value: 10, label: '10 s' },
              { value: 15, label: '15 s' },
            ]}
          />
        </div>
        <Toggle
          label="Temps morts techniques"
          hint="Automatiques, sets non décisifs uniquement"
          checked={tto.enabled}
          onChange={(v) => setConfig({ technicalTimeouts: { ...tto, enabled: v } })}
        />
        {tto.enabled && (
          <>
            <Stepper
              label="1er temps mort technique à"
              unit=" pts"
              value={tto.atPoints[0] ?? 8}
              min={1}
              max={config.pointsPerSet - 1}
              onChange={(v) => setConfig({ technicalTimeouts: { ...tto, atPoints: [v, tto.atPoints[1] ?? 16].sort((a, b) => a - b) } })}
            />
            <Stepper
              label="2e temps mort technique à"
              unit=" pts"
              value={tto.atPoints[1] ?? 16}
              min={1}
              max={config.pointsPerSet - 1}
              onChange={(v) => setConfig({ technicalTimeouts: { ...tto, atPoints: [tto.atPoints[0] ?? 8, v].sort((a, b) => a - b) } })}
            />
            <Stepper
              label="Durée"
              unit=" s"
              value={tto.duration}
              min={15}
              max={120}
              step={5}
              onChange={(v) => setConfig({ technicalTimeouts: { ...tto, duration: v } })}
            />
          </>
        )}
      </Card>

      <Card title="Remplacements et libéros">
        <Stepper label="Remplacements par set" value={config.substitutionsPerSet} min={0} max={12} onChange={(v) => setConfig({ substitutionsPerSet: v })} />
        <div className="flex min-h-12 items-center gap-3 py-2">
          <span className="flex-1 font-medium">Libéros par équipe</span>
          <Segmented
            value={config.maxLiberos}
            onChange={(v) => setConfig({ maxLiberos: v })}
            options={[
              { value: 0, label: '0' },
              { value: 1, label: '1' },
              { value: 2, label: '2' },
            ]}
          />
        </div>
      </Card>

      <Card title="Intervalle et positions">
        <Stepper
          label="Intervalle entre les sets"
          unit=" min"
          value={Math.round(config.intervalDuration / 60)}
          min={0}
          max={15}
          onChange={(v) => setConfig({ intervalDuration: v * 60 })}
        />
        <div className="py-2">
          <div className="mb-2 font-medium">Contrôle des fautes de position au service</div>
          <Segmented
            value={config.positionRule}
            onChange={(v) => setConfig({ positionRule: v })}
            options={[
              { value: 'receiving-only', label: 'Réception seule (2025)' },
              { value: 'both', label: 'Les deux équipes' },
            ]}
          />
          <p className="mt-2 text-sm text-muted">
            Règles 2025-2028 : l'équipe au service se place librement ; seule l'équipe en réception est contrôlée. Choisissez
            « Les deux équipes » si la compétition applique l'ancienne règle.
          </p>
        </div>
      </Card>
    </>
  );
}

// ——— Équipe ——————————————————————————————————————————————————

function ColorPicker({ value, onChange, label }: { value: string; onChange: (c: string) => void; label: string }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-muted">{label}</div>
      <div className="flex flex-wrap gap-2">
        {TEAM_PALETTE.map((c) => (
          <button
            key={c.value}
            type="button"
            aria-label={c.name}
            title={c.name}
            onClick={() => onChange(c.value)}
            className={`tap size-11 rounded-full border-2 ${value.toUpperCase() === c.value ? 'border-accent ring-2 ring-accent ring-offset-2 ring-offset-surface' : 'border-line'}`}
            style={{ background: c.value }}
          />
        ))}
        <label
          className="tap relative flex size-11 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-line text-xs font-bold"
          title="Couleur libre"
        >
          <span aria-hidden>+</span>
          <input
            type="color"
            aria-label="Couleur libre"
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
      </div>
    </div>
  );
}

function TeamEditor({ team, config, onChange }: { team: Team; config: MatchConfig; onChange: (fn: (t: Team) => Team) => void }) {
  const errors = validateTeam(team, config);
  const players = team.players;
  const setPlayer = (i: number, patch: Partial<Player>) =>
    onChange((t) => ({ ...t, players: t.players.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));
  const nextNumber = () => {
    for (let n = 1; n <= 99; n++) if (!players.some((p) => p.number === n)) return n;
    return 0;
  };
  const libs = players.filter((p) => p.libero).length;

  return (
    <>
      <Card title="Identité">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-muted">Nom de l'équipe</span>
          <input
            value={team.name}
            onChange={(e) => onChange((t) => ({ ...t, name: e.target.value }))}
            maxLength={30}
            className="min-h-12 w-full rounded-xl border border-line bg-surface-2 px-3 font-semibold"
            placeholder="Ex. : VB Lyon"
          />
        </label>
        <div
          className="mt-3 flex min-h-14 items-center justify-center rounded-xl px-3 text-xl font-black"
          style={{
            background: team.color,
            color: textOn(team.color),
            boxShadow: `inset 0 0 0 1px ${softOn(team.color, 0.3)}`,
            borderBottom: team.secondaryColor ? `8px solid ${team.secondaryColor}` : undefined,
          }}
        >
          <span className="truncate">{team.name || 'Aperçu'}</span>
        </div>
        <div className="mt-3 flex flex-col gap-4">
          <ColorPicker label="Couleur principale" value={team.color} onChange={(c) => onChange((t) => ({ ...t, color: c }))} />
          <Toggle
            label="Couleur secondaire"
            checked={!!team.secondaryColor}
            onChange={(on) => onChange((t) => ({ ...t, secondaryColor: on ? '#FFFFFF' : undefined }))}
          />
          {team.secondaryColor && (
            <ColorPicker
              label="Couleur secondaire"
              value={team.secondaryColor}
              onChange={(c) => onChange((t) => ({ ...t, secondaryColor: c }))}
            />
          )}
        </div>
      </Card>

      <Card
        title={
          <>
            Joueurs <span className="font-medium text-muted">({players.length}{libs ? `, dont ${libs} libéro${libs > 1 ? 's' : ''}` : ''})</span>
          </>
        }
      >
        {players.length === 0 && (
          <Button
            variant="primary"
            className="mb-3 w-full"
            onClick={() =>
              onChange((t) => ({ ...t, players: Array.from({ length: 12 }, (_, i) => ({ number: i + 1 })) }))
            }
          >
            Créer les n° 1 à 12
          </Button>
        )}
        <div className="mb-1 grid grid-cols-[4rem_1fr_2.75rem_2.75rem_2.75rem] gap-1.5 px-0.5 text-xs font-semibold text-muted">
          <span>N°</span>
          <span />
          <span className="text-center">Cap.</span>
          <span className="text-center">Lib.</span>
          <span />
        </div>
        <ul className="flex flex-col gap-1.5">
          {players.map((p, i) => (
            <li key={i} className="grid grid-cols-[4rem_1fr_2.75rem_2.75rem_2.75rem] items-center gap-1.5">
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label="Numéro de maillot"
                value={p.number || ''}
                onChange={(e) => {
                  const n = parseInt(e.target.value.replace(/\D/g, '').slice(0, 2), 10);
                  setPlayer(i, { number: Number.isNaN(n) ? 0 : n });
                }}
                className="tabular min-h-11 w-full rounded-xl border border-line bg-surface-2 text-center text-lg font-bold"
              />
              <div />
              <button
                type="button"
                aria-label="Capitaine"
                aria-pressed={!!p.captain}
                onClick={() =>
                  onChange((t) => ({
                    ...t,
                    players: t.players.map((q, j) => ({ ...q, captain: j === i ? !q.captain : false })),
                  }))
                }
                className={`tap min-h-11 rounded-xl border font-black ${p.captain ? 'border-navy-400 bg-navy text-white' : 'border-line text-muted'}`}
              >
                C
              </button>
              <button
                type="button"
                aria-label="Libéro"
                aria-pressed={!!p.libero}
                onClick={() => setPlayer(i, { libero: !p.libero })}
                className={`tap min-h-11 rounded-xl border font-black ${p.libero ? 'border-yellow-500 bg-[#FFD200] text-black' : 'border-line text-muted'}`}
              >
                L
              </button>
              <IconButton
                label="Supprimer le joueur"
                className="text-muted"
                onClick={() => onChange((t) => ({ ...t, players: t.players.filter((_, j) => j !== i) }))}
              >
                <Trash2 className="size-5" />
              </IconButton>
            </li>
          ))}
        </ul>
        <Button
          className="mt-3 w-full"
          disabled={players.length >= 30}
          onClick={() => onChange((t) => ({ ...t, players: [...t.players, { number: nextNumber() }] }))}
        >
          <Plus /> Ajouter un joueur
        </Button>
        {errors.length > 0 && (
          <ul className="mt-3 list-disc pl-5 text-sm text-warn">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
