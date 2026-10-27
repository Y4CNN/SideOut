/**
 * Paramètres de match. Toutes les valeurs de règles sont configurables ;
 * les préréglages fournissent les valeurs par défaut d'un format donné.
 */

export type PresetId = 'ffvb-6x6' | 'custom';

/** Règle de contrôle des fautes de position au moment du service. */
export type PositionRule =
  /** Règles FIVB 2025-2028 : seule l'équipe en réception est contrôlée. */
  | 'receiving-only'
  /** Ancienne règle : les deux équipes sont contrôlées. */
  | 'both';

export interface TechnicalTimeoutConfig {
  enabled: boolean;
  /** Seuils de points (ex. 8 et 16), atteints par l'équipe qui mène. */
  atPoints: number[];
  /** Durée en secondes. */
  duration: number;
}

export interface MatchConfig {
  preset: PresetId;
  /** Nombre de joueurs sur le terrain (6 pour le 6x6). */
  courtSize: 6;
  setsToWin: 2 | 3;
  pointsPerSet: number;
  pointsDecidingSet: number;
  minLead: number;
  /** Plafond de points (null = sans plafond). */
  pointCap: number | null;
  /** Changement de côté au set décisif quand une équipe atteint ce score (null = aucun). */
  decidingSetSwitchAt: number | null;
  timeoutsPerSet: number;
  /** Durée d'un temps mort, en secondes. */
  timeoutDuration: number;
  /** Avertissement visuel/sonore quand il reste N secondes. */
  timeoutWarningAt: number;
  technicalTimeouts: TechnicalTimeoutConfig;
  substitutionsPerSet: number;
  /** Intervalle entre les sets, en secondes. */
  intervalDuration: number;
  maxLiberos: 0 | 1 | 2;
  /** Inversion des côtés entre les sets. */
  switchSidesBetweenSets: boolean;
  positionRule: PositionRule;
}

export interface Preset {
  id: PresetId;
  label: string;
  description: string;
  config: MatchConfig;
}

export const FFVB_6X6: MatchConfig = {
  preset: 'ffvb-6x6',
  courtSize: 6,
  setsToWin: 3,
  pointsPerSet: 25,
  pointsDecidingSet: 15,
  minLead: 2,
  pointCap: null,
  decidingSetSwitchAt: 8,
  timeoutsPerSet: 2,
  timeoutDuration: 30,
  timeoutWarningAt: 10,
  technicalTimeouts: { enabled: false, atPoints: [8, 16], duration: 60 },
  substitutionsPerSet: 6,
  intervalDuration: 180,
  maxLiberos: 2,
  switchSidesBetweenSets: true,
  positionRule: 'receiving-only',
};

export const PRESETS: Preset[] = [
  {
    id: 'ffvb-6x6',
    label: 'FFVB standard 6x6',
    description: 'Règles FIVB 2025-2028 : 3 sets gagnants, 25 pts (15 au set décisif), 2 TM de 30 s, 6 remplacements.',
    config: FFVB_6X6,
  },
  {
    id: 'custom',
    label: 'Personnalisé',
    description: 'Partez des valeurs FFVB et ajustez chaque paramètre.',
    config: { ...FFVB_6X6, preset: 'custom' },
  },
];

export function presetConfig(id: PresetId): MatchConfig {
  const preset = PRESETS.find((p) => p.id === id) ?? PRESETS[0];
  return structuredClone(preset.config);
}

export function totalSets(config: MatchConfig): number {
  return config.setsToWin * 2 - 1;
}

export function isDecidingSet(config: MatchConfig, setNumber: number): boolean {
  return setNumber === totalSets(config);
}

export function targetPoints(config: MatchConfig, setNumber: number): number {
  return isDecidingSet(config, setNumber) ? config.pointsDecidingSet : config.pointsPerSet;
}
