/** Accès localStorage tolérant aux erreurs (navigation privée, quota). */
import { migratePlayers } from './players';

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const value = migratePlayers(JSON.parse(raw) as T);
    try { if (JSON.stringify(value) !== raw) localStorage.setItem(key, JSON.stringify(value)); } catch { /* lecture possible sans écriture */ }
    return value;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(migratePlayers(value)));
  } catch {
    /* quota dépassé ou stockage indisponible */
  }
}
