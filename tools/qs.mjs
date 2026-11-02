import { chromium } from 'playwright-core';
const base='http://localhost:8765/', out='/workspace/shots2';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const errs=[];
const list = JSON.parse(process.argv[2]);
for (const [name,w,h,hash,prefs,act] of list) {
  const ctx = await b.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:1.5, locale:'he-IL', serviceWorkers:'block' });
  const p = await ctx.newPage(); p.on('pageerror', e=>errs.push(name+': '+e.message));
  await p.addInitScript(pr => { if(!sessionStorage.s){localStorage.setItem('chitas-reader.v1', JSON.stringify({ prefs: pr, progress: {'2026-11-02|chumash':{done:true,frac:1},'2026-11-02|tehillim':{frac:.4,pos:'x'}} })); sessionStorage.s=1;} }, {il:true, locationChosen:true, ...(prefs||{})});
  await p.goto(base+'#/'+hash); await p.waitForTimeout(1300);
  if (act==='imm') { await p.mouse.click(w/2,h/2); await p.waitForTimeout(700); }
  if (act==='aa') { await p.click('#b-aa'); await p.waitForTimeout(300); }
  if (act==='next') { await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(500); }
  await p.screenshot({ path:`${out}/${name}.png` }); await ctx.close();
}
await b.close(); console.log(errs.join('\n')||'no errors');
