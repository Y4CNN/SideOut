/** Couleurs d'équipe et contraste automatique du texte (WCAG). */

export const TEAM_PALETTE = [
  { name: 'Bleu accessible', value: '#0072B2' },
  { name: 'Orange accessible', value: '#E69F00' },
  { name: 'Vert bleuté', value: '#009E73' },
  { name: 'Pourpre', value: '#CC79A7' },
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

/** Conservative distance under normal, protan, deutan and tritan approximations.
 * This warning is guidance, not a diagnosis; team names remain the identifier. */
export function teamColorsConfusable(a: string, b: string): boolean {
  const transforms = [
    [[1,0,0],[0,1,0],[0,0,1]],
    [[0.567,0.433,0],[0.558,0.442,0],[0,0.242,0.758]],
    [[0.625,0.375,0],[0.7,0.3,0],[0,0.3,0.7]],
    [[0.95,0.05,0],[0,0.433,0.567],[0,0.475,0.525]],
  ];
  const x = parseHex(a), y = parseHex(b);
  return transforms.some(m => Math.hypot(...m.map(row => row.reduce((s,c,i) => s + c*(x[i]-y[i]), 0))) < 75);
}

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

/** Le noir pur garantit un contraste ≥ 4,5 pour toute couleur sRGB opaque. */
export function textOn(bg: string): string {
  return contrastRatio(bg, '#FFFFFF') >= contrastRatio(bg, '#000000') ? '#FFFFFF' : '#000000';
}

/** Couleur translucide du texte pour les éléments secondaires. */
export function softOn(bg: string, alpha = 0.18): string {
  return textOn(bg) === '#FFFFFF' ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
}

export function teamStyle(color: string): { background: string; color: string } {
  return { background: color, color: textOn(color) };
}
