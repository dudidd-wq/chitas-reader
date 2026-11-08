import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {serve,launch,pageWith} from './helpers.mjs';
import {DEFAULT_PREFS} from '../site/js/store.js';
const fonts=[
 ['noto-rashi','Noto Rashi Hebrew','noto-rashi',['NotoRashiHebrew.woff2','OFL.txt'],true],
 ['taamey-d','Taamey D','taamey-d',['Taamey_D.ttf','LICENSE.txt','GPL-2.0.txt'],true],
 ['keter-yg','Keter YG','keter-yg',['KeterYG-Medium.ttf','LICENSE.txt','GPL-2.0.txt'],true],
 ['cardo','Cardo','cardo',['Cardo-Regular.woff2','Cardo-Bold.woff2','OFL.txt'],true],
 ['david','David Libre','david-libre',['DavidLibre-Regular.woff2','DavidLibre-Bold.woff2','OFL.txt'],false],
 ['assistant','Assistant','assistant',['Assistant.woff2','OFL.txt'],false],
];
let srv,browser;test.before(async()=>{srv=await serve();browser=await launch();});test.after(async()=>{await browser?.close();srv?.close();});
const waitFont=async(p,name,weight=400)=>{await p.evaluate(([name,w])=>document.fonts.load(`${w} 24px "${name}"`),[name,weight]);assert.ok(await p.evaluate(([name,w])=>document.fonts.check(`${w} 24px "${name}"`),[name,weight]));};
async function actualFamily(p,selector,name){const s=await p.context().newCDPSession(p);try{await s.send('DOM.enable');await s.send('CSS.enable');const doc=await s.send('DOM.getDocument'),n=await s.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector});const{fonts}=await s.send('CSS.getPlatformFontsForNode',{nodeId:n.nodeId});assert.ok(fonts.some(f=>f.isCustomFont&&(f.familyName===name||(name==='Assistant'&&f.familyName==='Assistant ExtraLight'))&&f.glyphCount>5),JSON.stringify(fonts));return fonts;}finally{await s.detach();}}

test('1.0.86: original GPL fonts, corresponding sources, adjacent licenses and unchanged default/precache',()=>{
 assert.equal(DEFAULT_PREFS.font,'noto');assert.equal(DEFAULT_PREFS.rashi,true);
 const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 assert.equal(hash('site/fonts/taamey-d/Taamey_D.ttf'),'16a412f4cf5d7d2725864bd55ce6a02d2e56d0650525aabea937fe3806ffed42');
 assert.equal(hash('site/fonts/keter-yg/KeterYG-Medium.ttf'),'7681f312ee020df0952495e876e3f7e58b6147fd5c57ae4e52401df44932e7df');
 for(const[,name,dir,files]of fonts){for(const f of files)assert.ok(fs.statSync('site/fonts/'+dir+'/'+f).size>100,name+f);assert.match(fs.readFileSync('site/fonts/'+dir+'/'+(files.includes('OFL.txt')?'OFL.txt':'LICENSE.txt'),'utf8'),/Copyright|copyright|General Public License/);}
 for(const file of ['TaameyD-1.2-sources.zip','KeterYG-original.zip'])assert.equal(fs.readFileSync('font-sources/'+file).subarray(0,2).toString(),'PK');
 const sw=fs.readFileSync('site/sw.js','utf8'),assets=sw.match(/const ASSETS = (\[[\s\S]*?\]);/)[1];
 for(const[,name,dir]of fonts)assert.ok(!assets.includes('fonts/'+dir+'/'),name+' must remain optional');
 assert.doesNotMatch(fs.readFileSync('site/css/app.css','utf8'),/keter-yg\/.*Bold/);
});

test('1.0.86: no optional font requested on default reading; eleven real previews and per-font hints',async()=>{
 const p=await pageWith(browser,srv.url,{prefs:{layout:'scroll'},viewport:{width:1100,height:1900}}),req=[];p.on('request',r=>{if(/\/fonts\/(noto-rashi|taamey-d|keter-yg|cardo|david-libre|assistant)\//.test(r.url()))req.push(r.url());});
 await p.goto(srv.url+'#/s/boker/1');await p.waitForSelector('#rc .seg .t');assert.equal(req.length,0);await p.click('#b-aa');assert.equal(await p.locator('.font-sample').count(),11);await p.evaluate(()=>document.fonts.ready);
 for(const[id,name,,,taamim]of fonts){const l=p.locator(`label:has(input[name=font][value="${id}"])`);assert.match(await l.locator('.font-sample').evaluate(e=>getComputedStyle(e).fontFamily),new RegExp(name));if(!taamim)assert.match(await l.textContent(),/ללא טעמים/);}
 if(process.env.CHITAS_FONT_SHOTS)await p.screenshot({path:process.env.CHITAS_FONT_SHOTS+'/chitas-fonts-picker.png'});
 assert.deepEqual(p.errors,[]);await p.context().close();
});

for(const[id,name,,,taamim]of fonts)test('1.0.86: '+name+' actually renders Siddur, Chumash+Rashi, Tanya, vocalized Hayom Yom and bold',async()=>{
 const p=await pageWith(browser,srv.url,{prefs:{font:id,layout:'scroll',rashi:true,taamim:true},viewport:{width:1100,height:1000}});
 for(const [i,route]of ['#/s/boker/1','#/lib/torah/Genesis/1','#/r/tanya/2026-11-08','#/lib/hayomyom/cheshvan-28'].entries()){
  // A full navigation makes each assertion inspect the new document, not stale hash-route DOM.
  await p.goto(srv.url+'?fontcase='+i+route);await p.waitForSelector('#rc .seg .t');await waitFont(p,name);await actualFamily(p,'#rc .seg .t',name);
  const t=await p.locator('#rc .seg .t').first().textContent();assert.match(t,/[\u05b0-\u05bc]/,name+route);
  if(i===1){assert.equal(/[\u0591-\u05af]/.test(t),taamim);await p.waitForSelector('#rc .rashi p');await actualFamily(p,'#rc .rashi p',name);await p.click('#b-aa');await p.locator('input[name=readingBold]').check();await p.click('#sh-x');await waitFont(p,name,700);const used=await actualFamily(p,'#rc .seg .t',name);if(['cardo','david'].includes(id))assert.ok(used.some(f=>f.postScriptName.endsWith('-Bold')),'native bold face used');assert.equal(/[\u0591-\u05af]/.test(await p.locator('#rc .seg .t').first().textContent()),taamim);}
 }
 await p.click('#b-aa');await p.locator('input[name=readingBold]').check();await waitFont(p,name,700);assert.equal(await p.locator('#rc .seg .t').first().evaluate(e=>getComputedStyle(e).fontWeight),'700');
 const different=await p.evaluate(name=>{const c=document.createElement('canvas'),x=c.getContext('2d');c.width=600;c.height=90;const draw=w=>{x.clearRect(0,0,600,90);x.font=`${w} 32px "${name}"`;x.fillText('תּוֹרָה אוֹר וְשִׂמְחַת לֵב',10,55);return c.toDataURL();};return draw(400)!==draw(700);},name);assert.ok(different,'bold must visibly differ');
 // Fonts without accents do not destroy the global preference for subsequent fonts.
 assert.equal(await p.locator('input[name=taamim]').isChecked(),true);assert.deepEqual(p.errors,[]);await p.context().close();
});

test('1.0.86: all selected optional families, real bold and licenses survive actual SW offline reload',async()=>{
 const ctx=await browser.newContext({serviceWorkers:'allow',locale:'he-IL',viewport:{width:1100,height:1500}}),p=await ctx.newPage();await p.addInitScript(()=>{if(!localStorage.getItem('chitas-reader.v1'))localStorage.setItem('chitas-reader.v1',JSON.stringify({prefs:{locationChosen:true,layout:'scroll'}}));});
 await p.goto(srv.url+'#/s/boker/1');await p.waitForSelector('#rc .seg .t');await p.evaluate(()=>navigator.serviceWorker.ready);await p.waitForFunction(()=>navigator.serviceWorker.controller!==null);await p.reload();await p.waitForSelector('#rc .seg .t');
 for(const[id,,dir,files]of fonts){await p.click('#b-aa');await p.locator(`label:has(input[name=font][value="${id}"])`).click();await p.waitForFunction(async paths=>{const c=await caches.open('optional-fonts-v1');return(await Promise.all(paths.map(f=>c.match(new URL('fonts/'+f,document.baseURI).href)))).every(Boolean);},files.map(f=>dir+'/'+f));await p.click('#sh-x');}
 await ctx.setOffline(true);
 for(const[id,name]of fonts){await p.click('#b-aa');await p.locator(`label:has(input[name=font][value="${id}"])`).click();await p.click('#sh-x');await p.reload();await p.waitForSelector('#rc .seg .t');await waitFont(p,name);await waitFont(p,name,700);assert.equal(await p.locator('html').getAttribute('data-font'),id);await actualFamily(p,'#rc .seg .t',name);}
 await ctx.close();
});
