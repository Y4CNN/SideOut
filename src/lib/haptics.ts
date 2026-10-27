/** Retour haptique (Android/Chrome) ; ignoré silencieusement ailleurs (iOS Safari). */
let enabled = true;

export function setHapticsEnabled(on: boolean) {
  enabled = on;
}

export function vibrate(pattern: number | readonly number[]) {
  if (!enabled) return;
  try {
    navigator.vibrate?.(typeof pattern === "number" ? pattern : [...pattern]);
  } catch {
    /* non supporté */
  }
}

export const HAPTIC = {
  tap: 12,
  error: [40, 60, 40],
  alert: [120, 80, 120],
  end: [300, 120, 300, 120, 500],
} as const;
