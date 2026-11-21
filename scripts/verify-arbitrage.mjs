import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';

// Use real engine fixtures and the production bundle, including persisted action replay.
const loader = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
const { newMatch, startedMatch, startSet, winSet, act } = await loader.ssrLoadModule('/src/engine/__tests__/helpers.ts');
const { applyAction } = await loader.ssrLoadModule('/src/engine/index.ts');
await loader.close();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 852, height: 393 }, isMobile: true, hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const checks = [];
const url = process.env.VERIFY_URL ?? 'http://localhost:4173';
const shots = 'node_modules/.cache/arbitrage';
await mkdir(shots, { recursive: true });

async function seed(base) {
  const offset = Date.now() - base.createdAt;
  base = JSON.parse(JSON.stringify(base, (key, value) =>
    ['at', 'createdAt', 'startedAt', 'endedAt'].includes(key) && typeof value === 'number' ? value + offset : value));
  await page.goto(url);
  await page.evaluate(base => {
    localStorage.clear();
    localStorage.setItem('va:prefs', JSON.stringify({ onboardingDone: true, sound: false, theme: 'dark' }));
    localStorage.setItem('va:match', JSON.stringify({ base, actions: [] }));
  }, base);
  await page.reload();
}
async function state() {
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('va:match')));
  return saved.actions.reduce((s, a) => {
    const r = applyAction(s, a);
    assert(r.ok, r.error);
    return r.state;
  }, saved.base);
}
const set = async () => (await state()).sets.at(-1);
const dialog = () => page.getByRole('dialog');
const openSub = () => page.getByRole('button', { name: 'Remplacement', exact: true }).first().click();

try {
  let prep = act(newMatch(), { type: 'TOSS', firstServe: 'A', leftTeam: 'A' });
  prep = act(prep, { type: 'SET_LINEUP', team: 'A', lineup: [1, 2, 3, 4, 5, 6] });
  prep = act(prep, { type: 'SET_LINEUP', team: 'B', lineup: [21, 22, 23, 24, 25, 26] });
  await seed(prep);
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await dialog().getByRole('button', { name: 'Inverser les côtés' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Lyon', exact: true }).last()).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await page.getByRole('button', { name: 'Commencer le set 1' }).click();
  assert.equal((await set()).leftTeam, 'B');
  assert.equal((await set()).serving, 'A');
  await expect(page.getByRole('button', { name: /^Point pour/ }).first()).toHaveAttribute('aria-label', /Lyon/);
  await page.getByRole('button', { name: 'Placement des équipes', exact: true }).click();
  await dialog().getByRole('button', { name: 'Inverser les côtés' }).click();
  await page.keyboard.press('Escape');
  await page.reload();
  assert.equal((await set()).leftTeam, 'A');
  await page.getByRole('button', { name: /^Annuler :/ }).click();
  assert.equal((await set()).leftTeam, 'B');
  checks.push('Côtés corrigés avant et pendant le set, persistés et annulables');

  await seed(winSet(startedMatch(), 'A'));
  await page.getByRole('button', { name: 'Inverser les côtés' }).click();
  await page.reload();
  assert.equal((await state()).prep.leftTeam, 'A');
  checks.push('Correction du prochain set persistée');

  await seed(startedMatch());
  await openSub();
  await dialog().getByRole('button', { name: 'Entrant n°7', exact: true }).click();
  await expect(dialog().getByRole('button', { name: 'Valider', exact: true })).toBeDisabled();
  await dialog().getByRole('button', { name: 'Sortant n°3', exact: true }).click();
  assert.equal((await set()).teams.A.subs.length, 0, 'Selecting the pair must not commit');
  await dialog().getByRole('button', { name: 'Valider', exact: true }).click();
  assert.equal((await set()).teams.A.subs.length, 1);
  assert.equal((await set()).teams.A.court[2], 7);
  await openSub();
  await expect(dialog().getByText('3 sort · 7 entre', { exact: true }).first()).toBeVisible();
  await dialog().getByRole('checkbox', { name: 'Enchaîner' }).check();
  await dialog().getByRole('button', { name: 'Sortant n°4', exact: true }).click();
  await dialog().getByRole('button', { name: 'Entrant n°8', exact: true }).click();
  await dialog().getByRole('button', { name: 'Valider', exact: true }).click();
  await expect(dialog().getByRole('button', { name: 'Valider', exact: true })).toBeDisabled();
  assert.equal((await set()).teams.A.subs.length, 2);
  await dialog().getByRole('button', { name: 'Annuler ce remplacement' }).click();
  assert.equal((await set()).teams.A.subs.length, 1);
  assert.equal((await set()).teams.A.court[3], 4);
  await dialog().getByRole('button', { name: 'Entrant n°3', exact: true }).click();
  await expect(dialog().getByRole('button', { name: 'Sortant n°1', exact: true })).toHaveAttribute('aria-disabled', 'true');
  await dialog().getByRole('button', { name: 'Sortant n°1', exact: true }).evaluate(el => el.click());
  const toast = page.locator('[role="status"][style*="animation"]');
  await expect(toast).toHaveCount(1);
  const animations = await toast.evaluate(el => el.getAnimations().map(a => ({ name: a.animationName, ...a.effect.getTiming() })));
  assert(animations.some(a => a.name === 'toast-out' && a.delay === 4000));
  await dialog().getByRole('button', { name: 'Sortant n°2', exact: true }).evaluate(el => el.click());
  await expect(toast).toHaveCount(1);
  await expect(toast).toHaveCount(0, { timeout: 5500 });
  await dialog().getByRole('button', { name: 'Sortant n°7', exact: true }).click();
  await dialog().getByRole('checkbox', { name: 'Enchaîner' }).uncheck();
  await dialog().getByRole('button', { name: 'Valider', exact: true }).click();
  assert.equal((await set()).teams.A.court[2], 3);
  checks.push('Entrant ou sortant en premier, validation explicite, enchaînement, annulation et retour légal');
  checks.push('Erreur passagère unique, animation de sortie et disparition après 4 secondes');

  await seed(startedMatch());
  await expect(page.getByRole('button', { name: 'Libéro', exact: true }).first()).toContainText('—');
  await page.getByRole('button', { name: 'Libéro', exact: true }).first().click();
  const help = dialog().locator('details').filter({ hasText: 'Comment ça marche ?' });
  assert.equal(await help.getAttribute('open'), null);
  await help.locator('summary').click();
  await expect(help.getByText(/Le tiret —/)).toBeVisible();
  await help.locator('summary').click();
  await dialog().getByRole('button', { name: '5 Position V', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Libéro', exact: true }).first()).toContainText('n°11');
  assert.equal((await set()).teams.A.subs.length, 0);
  await page.getByRole('button', { name: /^Point pour Paris/ }).click();
  await page.getByRole('button', { name: 'Libéro', exact: true }).first().click();
  await dialog().getByRole('button', { name: 'Sortie du libéro : retour du n°5' }).click();
  await expect(page.getByRole('button', { name: 'Libéro', exact: true }).first()).toContainText('—');
  checks.push('Tirets conservés, aide repliée, entrée/sortie du libéro hors compteur');

  for (const [width, height] of [[320, 568], [568, 320], [393, 852], [852, 393]]) {
    await page.setViewportSize({ width, height });
    await openSub();
    await expect(dialog().getByRole('button', { name: 'Valider', exact: true })).toBeInViewport();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running'));
    await page.screenshot({ path: `${shots}/remplacement-${width}x${height}.png` });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Placement des équipes', exact: true }).click();
    await expect(dialog().getByRole('button', { name: 'Inverser les côtés' })).toBeInViewport();
    await page.keyboard.press('Escape');
  }
  checks.push('Affichage compact vérifié en portrait/paysage, de 320 à 852 px');
  const noLibero = structuredClone(startedMatch());
  noLibero.teams.A.players = noLibero.teams.A.players.filter(p => !p.libero);
  await seed(noLibero);
  await page.getByRole('button', { name: 'Libéro', exact: true }).first().click();
  await expect(dialog().getByText("Aucun libéro n'est déclaré pour cette équipe.")).toBeVisible();
  await dialog().locator('summary').filter({ hasText: 'Comment ça marche ?' }).click();
  await expect(dialog().getByText('Déclarez vos libéros (L) dans l’effectif avant le match.')).toBeVisible();
  checks.push('Aide libéro accessible même sans libéro déclaré');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors, screenshots: shots }, null, 2));
} finally {
  await browser.close();
}
