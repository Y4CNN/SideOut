/**
 * Signaux sonores via Web Audio. Sur iOS, le contexte audio doit être créé/repris
 * pendant une interaction utilisateur : on le « déverrouille » au premier toucher.
 */
type Ctx = AudioContext;
let ctx: Ctx | null = null;
let enabled = true;

function getCtx(): Ctx | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch {
    ctx = null;
  }
  return ctx;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

export function installAudioUnlock() {
  const unlock = () => {
    const c = getCtx();
    if (!c) return;
    if (c.state === 'suspended') void c.resume();
    // tampon silencieux : requis par iOS pour autoriser les sons suivants
    const buffer = c.createBuffer(1, 1, 22050);
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.connect(c.destination);
    src.start(0);
  };
  const events = ['pointerdown', 'touchend', 'keydown'] as const;
  const handler = () => {
    unlock();
    events.forEach((e) => window.removeEventListener(e, handler, true));
  };
  events.forEach((e) => window.addEventListener(e, handler, true));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ctx?.state === 'suspended') void ctx.resume();
  });
}

function tone(freq: number, start: number, duration: number, volume = 0.35) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'square';
  osc.frequency.value = freq;
  const t0 = c.currentTime + start;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export type Signal = 'end' | 'warning' | 'alert' | 'tap';

export function playSignal(signal: Signal) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  switch (signal) {
    case 'end':
      tone(880, 0, 0.35);
      tone(880, 0.45, 0.35);
      tone(1175, 0.9, 0.7);
      break;
    case 'warning':
      tone(660, 0, 0.18, 0.25);
      break;
    case 'alert':
      tone(988, 0, 0.2);
      tone(740, 0.25, 0.35);
      break;
    case 'tap':
      tone(520, 0, 0.05, 0.08);
      break;
  }
}
