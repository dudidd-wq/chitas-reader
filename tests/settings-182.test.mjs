import test from 'node:test';
import assert from 'node:assert/strict';
import {serve,launch,pageWith} from './helpers.mjs';
import {DEFAULT_PREFS} from '../site/js/store.js';
import {localizeRuns} from '../site/js/siddur-lang.js';
let srv,browser;
test.before(async()=>{srv=await serve();browser=await launch();});
test.after(async()=>{await browser?.close();srv?.close();});
test('1.0.82: instruction hiding and reading emphasis are opt-in; inline stripping retains prayer and headings',()=>{
 assert.equal(DEFAULT_PREFS.hideSiddurInstructions,false);assert.equal(DEFAULT_PREFS.readingBold,false);
 assert.equal(localizeRuns('(Cong: אָמֵן)',{Cong:'הקהל'},'en',{hideInstructions:true}),'(אָמֵן)');
 assert.equal(localizeRuns('Psalm 91',{'Psalm 91':'תהלים צא'},'he',{hideInstructions:true,heading:true}),'תהלים צא');
});
test('1.0.82: entire Siddur removes only typed instructions; prayer, IDs, repeat/omit metadata, headings and speech survive',async()=>{
 const p=await pageWith(browser,srv.url);await p.goto(srv.url+'#/s/boker/1');await p.waitForSelector('#rc .seg');
 const result=await p.evaluate(async()=>{
  const {siddurIndex,buildSiddurBookDoc}=await import('/js/texts.js');const {localizeRuns}=await import('/js/siddur-lang.js');const idx=await siddurIndex();let notes=0,inline=0,tables=0,prayers=0;
  const failures=[];for(const book of idx.books){const a=await buildSiddurBookDoc(book.id,{lang:'en'}),b=await buildSiddurBookDoc(book.id,{lang:'en',hideInstructions:true});const map=new Map(b.blocks.map(x=>[x.id,x]));
   for(const x of a.blocks){if(x.type==='note'){notes++;if(map.has(x.id))failures.push('note '+x.id);continue;}const y=map.get(x.id);if(!y){failures.push('missing '+x.id);continue;}
    if(x.type==='h'&&x.text!==y.text)failures.push('heading '+x.id);
    if(x.type==='p'){prayers++;if(x.text!==y.text)inline++;if(y.text!==localizeRuns(x.text,idx.heRuns,'en',{hideInstructions:true}))failures.push('prayer '+x.id);for(const k of ['say','omit','omitStart','omitEnd','omitLabel','special','specialEnd','rep','repOf'])if(x[k]!==y[k])failures.push(k+' '+x.id);}
    if(x.type==='table'){tables++;const onlyPrayer=t=>t.rows.flat().filter(c=>c.k==='p'||c.k==='x').map(c=>[c.k,localizeRuns(c.html,idx.heRuns,'en',{hideInstructions:true})]);if(JSON.stringify(onlyPrayer(x))!==JSON.stringify(onlyPrayer(y)))failures.push('table prayer '+x.id);if(y.rows.flat().some(c=>c.k==='n'))failures.push('table instruction '+x.id);if(x.say!==y.say)failures.push('table speech '+x.id);}
   }
  }return{notes,inline,tables,prayers,failures};
 });
 assert.deepEqual(result.failures,[]);assert.ok(result.notes>900);assert.ok(result.inline>20);assert.ok(result.tables>5);assert.ok(result.prayers>1500);await p.context().close();
});
test('1.0.82: fonts preview their own real family, emphasis updates live and persists; instructions disappear from DOM and both speech queues',async()=>{
 const p=await pageWith(browser,srv.url,{prefs:{layout:'scroll',siddurLang:'both'}});await p.goto(srv.url+'#/s/shacharit/3');await p.waitForSelector('#rc .sid-note');
 const before=await p.locator('#rc .seg').count(),ends=await p.locator('#rc .sid-end').count();assert.ok(ends>0);
 await p.click('#b-aa');assert.equal(await p.locator('input[name=hideSiddurInstructions]').isChecked(),false);assert.equal(await p.locator('input[name=readingBold]').isChecked(),false);
 const previews=await p.locator('.font-sample').evaluateAll(a=>a.map(e=>[e.textContent,getComputedStyle(e).fontFamily]));assert.equal(previews.length,4);assert.equal(new Set(previews.map(x=>x[1])).size,4);
 await p.locator('input[name=readingBold]').check();await p.waitForFunction(()=>getComputedStyle(document.querySelector('#rc .seg .t')).fontWeight==='700');assert.ok(await p.locator('.font-sample').evaluateAll(a=>a.every(e=>getComputedStyle(e).fontWeight==='700')));
 await p.locator('label:has(input[name=font][value=ashkenaz])').click();await p.locator('input[name=hideSiddurInstructions]').check();await p.waitForFunction(()=>!document.querySelector('#rc .sid-note'));assert.equal(await p.locator('#rc .sid-in, #rc .sd-n').count(),0);assert.equal(await p.locator('#rc .seg').count(),before);assert.equal(await p.locator('#rc .sid-end').count(),ends);assert.ok(await p.locator('#rc .sd-sec').count()>0);
 await p.click('#sh-x');
 await p.evaluate(async()=>{const{Speaker}=await import('/js/tts.js');window.__queue=null;Speaker.prototype.load=function(s,o){window.__queue={s:s.map(({el,...x})=>x),o};};Speaker.prototype.startAt=function(){};});await p.click('#b-tts');await p.waitForFunction(()=>window.__queue!==null);
 const queues=await p.evaluate(async()=>{const{PiperSpeaker}=await import('/js/piper.js');const local=new PiperSpeaker({});local.load(__queue.s,__queue.o);return{web:__queue.s.map(s=>s.parts.join(' ')).join(' '),local:local.queue.map(s=>s.text).join(' ')};});
 assert.doesNotMatch(queues.web.replace(/<[^>]+>/g,''),/בשבת אומרים|כאן מכים|[A-Za-z]/);assert.doesNotMatch(queues.local,/בשבת אומרים|כאן מכים|[A-Za-z]/);
 await p.reload();await p.waitForSelector('#rc .seg');assert.equal(await p.locator('#rc .sid-note, #rc .sid-in').count(),0);assert.equal(await p.locator('html').getAttribute('data-reading-bold'),'true');assert.equal(await p.locator('html').getAttribute('data-font'),'ashkenaz');
 await p.click('#b-aa');await p.locator('input[name=hideSiddurInstructions]').uncheck();await p.waitForSelector('#rc .sid-note');await p.locator('input[name=readingBold]').uncheck();await p.waitForFunction(()=>getComputedStyle(document.querySelector('#rc .seg:not(.sid-special):not(.sid-omit) .t')).fontWeight==='400');assert.deepEqual(p.errors,[]);await p.context().close();
});
test('1.0.82: hiding instructions retains date/always omission behavior and rejects malformed new preferences',async()=>{
 const p=await pageWith(browser,srv.url,{prefs:{hideSiddurInstructions:true,tachanunMode:'always',shabbatMode:'always',layout:'scroll'}});await p.goto(srv.url+'#/s/shacharit/4');await p.waitForSelector('#rc .seg');assert.equal(await p.locator('#rc .sid-note, #rc .sid-in, #rc .sid-omit').count(),0);await p.context().close();
 const q=await pageWith(browser,srv.url,{prefs:{hideSiddurInstructions:'false',readingBold:'true'}});await q.goto(srv.url+'#/settings');await q.waitForSelector('input[name=readingBold]');assert.equal(await q.locator('input[name=readingBold]').isChecked(),false);assert.equal(await q.locator('input[name=hideSiddurInstructions]').isChecked(),false);await q.context().close();
});

test('1.0.82: bold genuinely renders heavier glyphs in all four fonts, including static Noto and Ezra',async()=>{
 const p=await pageWith(browser,srv.url);await p.goto(srv.url+'#/settings');await p.waitForSelector('.font-sample');
 const ink=await p.evaluate(async()=>{const result={};for(const family of ['Noto Serif Hebrew','Frank Ruhl Libre','Ezra SIL','Taamey Ashkenaz']){result[family]=[];for(const weight of [400,700]){await document.fonts.load(`${weight} 60px "${family}"`);const c=document.createElement('canvas');c.width=900;c.height=120;const x=c.getContext('2d');x.font=`${weight} 60px "${family}"`;x.textAlign='center';x.fillText('תּוֹרָה אוֹר וְשִׂמְחַת לֵב',450,80);const pixels=x.getImageData(0,0,900,120).data;let alpha=0;for(let i=3;i<pixels.length;i+=4)alpha+=pixels[i];result[family].push(alpha);}}return result;});
 for(const[family,[regular,bold]]of Object.entries(ink))assert.ok(bold>regular*1.03,`${family}: ${regular} → ${bold}`);await p.context().close();
});
