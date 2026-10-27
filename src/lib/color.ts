/** Couleurs d'équipe et contraste automatique du texte (WCAG). */

export const TEAM_PALETTE = [
  { name: 'Bleu marine', value: '#0A2A66' },
  { name: 'Rouge', value: '#E30613' },
  { name: 'Blanc', value: '#FFFFFF' },
  { name: 'Noir', value: '#111111' },
  { name: 'Bleu ciel', value: '#2E9BEA' },
  { name: 'Vert', value: '#0E8A3E' },
  { name: 'Jaune', value: '#FFD200' },
  { name: 'Orange', value: '#F57C00' },
  { name: 'Violet', value: '#6A2C91' },
  { name: 'Rose', value: '#E5448A' },
  { name: 'Bordeaux', value: '#7A1029' },
  { name: 'Gris', value: '#6B7280' },
];

function parseHex(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Couleur de texte (blanc ou quasi-noir) offrant le meilleur contraste. */
export function textOn(bg: string): string {
  return contrastRatio(bg, '#FFFFFF') >= contrastRatio(bg, '#0B0B0B') ? '#FFFFFF' : '#0B0B0B';
}

/** Couleur translucide du texte pour les éléments secondaires. */
export function softOn(bg: string, alpha = 0.18): string {
  return textOn(bg) === '#FFFFFF' ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
}

export function teamStyle(color: string): { background: string; color: string } {
  return { background: color, color: textOn(color) };
}
