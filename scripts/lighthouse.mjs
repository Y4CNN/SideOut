import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const chrome = await launch({chromeFlags:['--headless','--no-sandbox']});
try {
  const browser = await chromium.connectOverCDP(`http://localhost:${chrome.port}`);
  const context = browser.contexts()[0];
  const page = await context.newPage();
  await page.goto('http://localhost:4173');
  await page.evaluate(async () => {
    localStorage.clear();
    localStorage.setItem('va:prefs',JSON.stringify({theme:'dark',onboardingDone:true,sound:false}));
    for(const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for(const key of await caches.keys()) await caches.delete(key);
  });
  await (await context.newCDPSession(page)).send('Network.clearBrowserCache');
  const result = await lighthouse('http://localhost:4173', {port:chrome.port,onlyCategories:['performance','accessibility','best-practices'],output:'json',logLevel:'error',disableStorageReset:true});
  await writeFile('reports/lighthouse-after.json',result.report);
  console.log(JSON.stringify(Object.fromEntries(Object.entries(result.lhr.categories).map(([k,v])=>[k,v.score*100]))));
} finally { await chrome.kill(); }
