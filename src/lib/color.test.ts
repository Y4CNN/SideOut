import { expect, it } from 'vitest';
import { TEAM_PALETTE, contrastRatio, teamColorsConfusable, textOn } from './color';

it('garantit le contraste AA pour la palette et les couleurs libres échantillonnées', () => {
  const colors = TEAM_PALETTE.map(c => c.value);
  for (let r=0;r<256;r+=17) for (let g=0;g<256;g+=17) for (let b=0;b<256;b+=17) colors.push(`#${[r,g,b].map(c=>c.toString(16).padStart(2,'0')).join('')}`);
  for (const c of colors) expect(contrastRatio(c,textOn(c)),c).toBeGreaterThanOrEqual(4.5);
});
it('avertit pour les couleurs proches et propose une paire distincte', () => {
  expect(teamColorsConfusable('#E30613','#E30714')).toBe(true);
  expect(teamColorsConfusable('#FFFFFF','#FFFFFF')).toBe(true);
  expect(teamColorsConfusable('#0072B2','#E69F00')).toBe(false);
});
