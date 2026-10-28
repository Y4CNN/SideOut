import { create } from 'zustand';
import {
  FFVB_6X6,
  createMatch,
  validateTeam,
  type Action,
  type ActionInput,
  type Alert,
  type MatchConfig,
  type MatchState,
  type Team,
  type TeamId,
} from '../engine';
import { playSignal, setSoundEnabled } from '../lib/audio';
import { HAPTIC, setHapticsEnabled, vibrate } from '../lib/haptics';
import { load, save } from '../lib/storage';
import { canUndo, initHistory, present, pushAction, undo, undoLabel, type History } from './history';

export type Screen = 'home' | 'setup' | 'game' | 'history';

export interface Prefs {
  theme: 'dark' | 'light';
  sound: boolean;
  haptics: boolean;
  /** Vue depuis le côté opposé (inverse haut/bas des terrains). */
  flipView: boolean;
  /** Affiche les positions dans les zones d'équipe. */
  showCourt: boolean;
}

export interface SetupDraft {
  config: MatchConfig;
  teams: Record<TeamId, Team>;
}

export interface ArchivedMatch {
  savedAt: number;
  state: MatchState;
}

export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}

const KEYS = {
  match: 'va:match',
  draft: 'va:draft',
  prefs: 'va:prefs',
  archive: 'va:archive',
} as const;

const ARCHIVE_SIZE = 20;

const DEFAULT_PREFS: Prefs = { theme: 'dark', sound: true, haptics: true, flipView: false, showCourt: false };

export function defaultDraft(): SetupDraft {
  return {
    config: structuredClone(FFVB_6X6),
    teams: {
      A: { name: 'Équipe A', color: '#0A2A66', players: [] },
      B: { name: 'Équipe B', color: '#E30613', players: [] },
    },
  };
}

interface Persisted {
  base: MatchState;
  actions: Action[];
}

function restoreHistory(): History | null {
  const p = load<Persisted | null>(KEYS.match, null);
  if (!p?.base || !Array.isArray(p.actions)) return null;
  try {
    return initHistory(p.base, p.actions);
  } catch {
    return null;
  }
}

interface AppState {
  screen: Screen;
  history: History | null;
  match: MatchState | null;
  draft: SetupDraft;
  prefs: Prefs;
  archive: ArchivedMatch[];
  toasts: Toast[];
  /** Message d'alerte plein écran (changement de côté). */
  bigAlert: string | null;
  viewingArchive: number | null;

  setScreen: (s: Screen) => void;
  setDraft: (fn: (d: SetupDraft) => SetupDraft) => void;
  setPrefs: (p: Partial<Prefs>) => void;
  toast: (kind: ToastKind, text: string) => void;
  dismissToast: (id: number) => void;
  clearBigAlert: () => void;
  dispatch: (a: ActionInput, opts?: { silent?: boolean }) => boolean;
  undo: () => void;
  canUndo: () => boolean;
  undoLabel: () => string | null;
  startMatch: () => string[];
  editTeams: () => void;
  closeMatch: () => void;
  viewArchive: (index: number | null) => void;
  deleteArchive: (index: number) => void;
}

let toastId = 0;

function feedback(alerts: Alert[], get: () => AppState, set: (p: Partial<AppState>) => void) {
  for (const a of alerts) {
    switch (a.kind) {
      case 'side-switch':
        set({ bigAlert: a.text });
        playSignal('alert');
        vibrate(HAPTIC.alert);
        break;
      case 'set-end':
        get().toast('success', a.text);
        playSignal('alert');
        vibrate(HAPTIC.alert);
        break;
      case 'match-end':
        get().toast('success', a.text);
        playSignal('end');
        vibrate(HAPTIC.end);
        break;
      case 'warning':
        get().toast('warning', a.text);
        playSignal('alert');
        vibrate(HAPTIC.alert);
        break;
      default:
        get().toast(a.kind === 'success' ? 'success' : 'info', a.text);
    }
  }
}

const initialHistory = restoreHistory();
const initialPrefs = { ...DEFAULT_PREFS, ...load<Partial<Prefs>>(KEYS.prefs, {}) };
setSoundEnabled(initialPrefs.sound);
setHapticsEnabled(initialPrefs.haptics);

export const useApp = create<AppState>((set, get) => ({
  screen: initialHistory ? 'game' : 'home',
  history: initialHistory,
  match: initialHistory ? present(initialHistory) : null,
  draft: load<SetupDraft>(KEYS.draft, defaultDraft()),
  prefs: initialPrefs,
  archive: load<ArchivedMatch[]>(KEYS.archive, []),
  toasts: [],
  bigAlert: null,
  viewingArchive: null,

  setScreen: (screen) => set({ screen }),
  setDraft: (fn) => set({ draft: fn(get().draft) }),
  setPrefs: (p) => {
    const prefs = { ...get().prefs, ...p };
    setSoundEnabled(prefs.sound);
    setHapticsEnabled(prefs.haptics);
    set({ prefs });
  },
  toast: (kind, text) => {
    const id = ++toastId;
    set({ toasts: [...get().toasts.slice(-1), { id, kind, text }] });
    const ms = kind === 'error' || kind === 'warning' ? 5000 : 3000;
    setTimeout(() => get().dismissToast(id), ms);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  clearBigAlert: () => set({ bigAlert: null }),

  dispatch: (input, opts) => {
    const h = get().history;
    if (!h) return false;
    const r = pushAction(h, { ...input, at: Date.now() } as Action);
    if (!r.ok) {
      if (!opts?.silent) {
        get().toast('error', r.error);
        vibrate(HAPTIC.error);
      }
      return false;
    }
    set({ history: r.history, match: present(r.history) });
    if (input.type === 'POINT') vibrate(HAPTIC.tap);
    feedback(r.alerts, get, set);
    return true;
  },

  undo: () => {
    const h = get().history;
    if (!h) return;
    const label = undoLabel(h);
    const r = undo(h);
    if (!r) return;
    set({ history: r.history, match: present(r.history) });
    vibrate(HAPTIC.tap);
    get().toast('info', `Annulé : ${label}`);
  },
  canUndo: () => {
    const h = get().history;
    return !!h && canUndo(h);
  },
  undoLabel: () => {
    const h = get().history;
    return h ? undoLabel(h) : null;
  },

  startMatch: () => {
    const { draft } = get();
    const nameA = draft.teams.A.name.trim() || 'Équipe A';
    const nameB = draft.teams.B.name.trim() || 'Équipe B';
    const errors = [...validateTeam({ ...draft.teams.A, name: nameA }, draft.config), ...validateTeam({ ...draft.teams.B, name: nameB }, draft.config)];
    if (nameA === nameB) {
      errors.push('Les deux équipes doivent avoir des noms différents.');
    }
    if (errors.length) return errors;
    const clean = (t: Team, fallback: string): Team => ({
      ...t,
      name: (t.name.trim() || fallback).trim(),
      players: [...t.players]
        .map((p) => ({ ...p, name: undefined }))
        .sort((a, b) => a.number - b.number),
    });
    const at = Date.now();
    const base = createMatch(draft.config, { A: clean(draft.teams.A, nameA), B: clean(draft.teams.B, nameB) }, at, `m-${at}`);
    const history = initHistory(base);
    set({ history, match: base, screen: 'game' });
    return [];
  },

  editTeams: () => {
    const m = get().match;
    if (!m || m.sets.length > 0) return;
    set({ draft: { config: m.config, teams: m.teams }, history: null, match: null, screen: 'setup' });
  },

  closeMatch: () => {
    const m = get().match;
    let archive = get().archive;
    if (m && m.sets.length > 0) archive = [{ savedAt: Date.now(), state: m }, ...archive].slice(0, ARCHIVE_SIZE);
    set({ history: null, match: null, archive, screen: 'home', bigAlert: null });
  },

  viewArchive: (index) => set({ viewingArchive: index }),
  deleteArchive: (index) => set({ archive: get().archive.filter((_, i) => i !== index), viewingArchive: null }),
}));

// ——— persistance automatique après chaque changement ———
useApp.subscribe((s, prev) => {
  if (s.history !== prev.history) {
    save(KEYS.match, s.history ? { base: s.history.base, actions: s.history.actions } : null);
  }
  if (s.draft !== prev.draft) save(KEYS.draft, s.draft);
  if (s.prefs !== prev.prefs) save(KEYS.prefs, s.prefs);
  if (s.archive !== prev.archive) save(KEYS.archive, s.archive);
});
