import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const server = await createServer({configFile:false,server:{middlewareMode:true},appType:'custom'});
const { startedMatch, winSet, startSet } = await server.ssrLoadModule('/src/engine/__tests__/helpers.ts');
const live = startedMatch({setsToWin:2});
const finished = winSet(startSet(winSet(live,'A')),'A');
await server.close();
const browser = await chromium.launch({channel:'chrome',headless:true});
const context = await browser.newContext({viewport:{width:852,height:393},isMobile:true,hasTouch:true});
const page = await context.newPage();
const errors=[]; page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:4173');
const report={layouts:[],axe:[],errors};
await mkdir('reports/screenshots',{recursive:true});
const phones=process.env.OVERLAYS_ONLY ? [] : [['SE-compact',320,568],['SE',375,667],['iPhone-15-16',393,852],['iPhone-16-Pro',402,874],['Pixel',412,915],['Android',360,640]];
for (const [name,w,h] of phones) for (const landscape of [true,false]) for (const theme of ['dark','light']) {
  await page.setViewportSize({width:landscape?h:w,height:landscape?w:h});
  for (const screen of ['onboarding','home','setup','history','pre-set','match','summary']) {
    const state=screen==='match'?live:screen==='summary'?finished:screen==='pre-set'?{...live,sets:[],phase:'pre-set',prep:{toss:null,lineups:{A:null,B:null}}}:null;
    await page.evaluate(({state,theme,screen})=>{
      localStorage.clear();
      localStorage.setItem('va:prefs',JSON.stringify({theme,onboardingDone:screen!=='onboarding',sound:false}));
      if(state) localStorage.setItem('va:match',JSON.stringify({base:state,actions:[]}));
    },{state,theme,screen});
    await page.reload();
    if(screen==='setup') await page.getByRole('button',{name:'Nouveau match',exact:true}).click();
    if(screen==='history') await page.getByRole('button',{name:'Historique',exact:true}).click();
    await page.evaluate(()=>document.fonts.ready);
    const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,
      small:[...document.querySelectorAll('button:not(:disabled),input,select,[role="button"]')].map(e=>({label:e.getAttribute('aria-label')??e.textContent.trim().slice(0,40),r:e.getBoundingClientRect()})).filter(({r})=>r.width>0&&r.height>0&&(r.width<47.9||r.height<47.9)).map(({label,r})=>({label,width:r.width,height:r.height}))}));
    report.layouts.push({name,landscape,theme,screen,...layout});
    if(name==='iPhone-15-16'&&landscape) {
      const a11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
      report.axe.push({screen,theme,violations:a11y.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))}))});
      await page.screenshot({path:`reports/screenshots/${screen}-${theme}.png`});
    }
    if(name==='SE-compact'&&!landscape&&theme==='dark') {
      await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth || [...document.querySelectorAll('.match-screen > header, .match-screen > nav')].some(e=>e.scrollWidth>e.clientWidth+1));
      report.layouts.push({name,landscape,theme,screen,zoom:200,overflow});
      if(screen==='match') await page.screenshot({path:'reports/screenshots/match-text-200.png'});
    }
  }
}
// Exercise overlays and a free color near the black/white contrast crossover.
for (const theme of ['dark','light']) {
  await page.setViewportSize({width:852,height:393});
  const custom = structuredClone(live);
  custom.teams.A.color = '#767676';
  custom.teams.B.color = '#E30613';
  const seed = async (state) => {
    await page.evaluate(({state,theme}) => {
      localStorage.setItem('va:prefs',JSON.stringify({theme,onboardingDone:true,sound:false,showCourt:true}));
      localStorage.setItem('va:match',JSON.stringify({base:state,actions:[]}));
    },{state,theme});
    await page.reload();
  };
  const audit = async (screen) => {
    await page.waitForFunction(() => document.getAnimations().filter(a => a instanceof CSSAnimation).every(a => a.playState !== 'running' || a.effect.getComputedTiming().iterations === Infinity));
    const a = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    report.axe.push({screen,theme,violations:a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))}))});
  };
  await seed(custom);
  await audit('match-custom-color-with-court');
  for (const [label,name] of [['Terrain','court-dialog'],['Remplacement','substitution-dialog'],['Libéro','libero-dialog'],['Sanctions','sanction-dialog'],['Menu','menu-dialog']]) {
    await page.getByRole('button',{name:label,exact:true}).first().click();
    await audit(name);
    await page.keyboard.press('Escape');
  }
  await seed({...custom,timer:{kind:'timeout',team:'A',startedAt:Date.now(),duration:30}});
  await audit('timeout-dialog');
  const winner = structuredClone(finished); winner.teams.A.color='#E30613';
  await seed(winner);
  await audit('summary-red-winner');
}
await writeFile('reports/ui-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({layouts:report.layouts.length,overflow:report.layouts.filter(v=>v.overflow),small:report.layouts.filter(v=>v.small?.length),axe:report.axe.filter(a=>a.violations.length),errors},null,2));
await browser.close();
assert.equal(report.layouts.filter(v=>v.overflow||v.small?.length).length,0,'layout issues');
assert.equal(report.axe.filter(a=>a.violations.length).length,0,'accessibility issues');
assert.equal(errors.length,0,'browser errors');
