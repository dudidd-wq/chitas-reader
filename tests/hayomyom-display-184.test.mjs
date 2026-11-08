import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {hayomVocalizedHtml} from '../site/js/hayomyom-display.js';
import {DEFAULT_PREFS} from '../site/js/store.js';
import {serve,launch,pageWith} from './helpers.mjs';
import {compileQuery,searchShard,prepShard} from '../site/js/search.js';
const D=JSON.parse(fs.readFileSync('site/data/hayomyom/days.json'));
const controls=/[\u0591-\u05AF\u05BD\u05C4\u05C5|\u200B-\u200F\u202A-\u202E\u2066-\u2069]/;
const bare=s=>s.replace(/[\u0591-\u05C7]/g,'');
let srv,browser;
test.before(async()=>{srv=await serve();browser=await launch();});
test.after(async()=>{await browser?.close();srv?.close();});
test('1.0.84: default-on display covers all 383 entries, keeps HTML/whitespace and never leaks speech controls',()=>{
 assert.equal(DEFAULT_PREFS.hayomNiqqud,true);let n=0;
 for(const e of Object.values(D))for(const[t,it,v]of e.p){const html=hayomVocalizedHtml(t,v);assert.doesNotMatch(html,controls);assert.match(html,/[\u05B0-\u05BC\u05C7]/);assert.deepEqual(html.match(/<[^>]*>/g),t.match(/<[^>]*>/g));assert.deepEqual(html.match(/\s+/g),t.match(/\s+/g));n++;}
 assert.equal(n,660);assert.equal(hayomVocalizedHtml('<b>מקור</b>',null),'<b>מקור</b>');
 assert.equal(hayomVocalizedHtml('שתי מילים','אַחַת'),'שתי מילים');
 assert.equal(hayomVocalizedHtml('<b>ש</b>או','שְׂא֫וּ'),'<b>שְׂ</b>אוּ');
 assert.equal(hayomVocalizedHtml('<b>כונת</b>:','כַּוָּנַ֫ת:'),'<b>כַּוָּנַת</b>:');
});
test('1.0.84: Hayom Yom search finds the same passage with/without displayed niqqud',()=>{
 const shard=prepShard(JSON.parse(fs.readFileSync('site/data/search/hayomyom.json')));
 const a=searchShard(shard,compileQuery('ענין ההשגחה פרטית'),100).hits;
 const b=searchShard(shard,compileQuery('עִנְיַן הַהַשְׁגָּחָה פְּרָטִית'),100).hits;
 assert.ok(a.length);assert.deepEqual(a,b);
});
async function capture(p){
 await p.evaluate(async()=>{const{Speaker}=await import('/js/tts.js');window.__cap=null;Speaker.prototype.load=function(s,o){__cap={s:s.map(({el,...x})=>x),o};};Speaker.prototype.startAt=function(){};});
 await p.click('#b-tts');await p.waitForFunction(()=>__cap!==null);
 return p.evaluate(async()=>{const{PiperSpeaker}=await import('/js/piper.js');const local=new PiperSpeaker({});local.load(__cap.s,__cap.o);return{web:__cap,local:local.queue};});
}
test('1.0.84: default/migrated setting, live toggle, original off text, all fonts and unchanged local/web queues',async()=>{
 const p=await pageWith(browser,srv.url,{prefs:{layout:'scroll'}});
 await p.goto(srv.url+'#/lib/hayomyom/cheshvan-28');await p.waitForSelector('#rc .seg .t');
 assert.equal(await p.locator('#unvoc').count(),0);assert.match(await p.locator('#hayom-niqqud-note').textContent(),/דיקטה/);
 const text=()=>p.locator('#rc .seg .t').allTextContents();const on=await text();assert.match(on.join(' '),/[\u05B0-\u05BC]/);assert.doesNotMatch(on.join(' '),controls);
 const voiceOn=await capture(p);assert.ok(voiceOn.local.some(x=>x.acc?.primary));
 await p.click('#b-aa');assert.ok(await p.locator('input[name=hayomNiqqud]').isChecked());
 for(const font of ['noto','ezra','frank','ashkenaz']){await p.locator(`label:has(input[name=font][value=${font}])`).click();await p.evaluate(()=>document.fonts.ready);assert.deepEqual(await text(),on);const family=await p.locator('#rc .seg .t').first().evaluate(e=>getComputedStyle(e).fontFamily);assert.ok(await p.evaluate(f=>document.fonts.check(`24px ${f.split(',')[0]}`),family));}
 await p.locator('input[name=hayomNiqqud]').uncheck();await p.waitForFunction(()=>!/[\u05B0-\u05BC]/.test(document.querySelector('#rc .seg .t').textContent));
 assert.deepEqual(await text(),D['cheshvan-28'].p.map(([t])=>t));await p.click('#sh-x');
 await p.reload();await p.waitForSelector('#rc .seg .t');const voiceOff=await capture(p);assert.deepEqual(voiceOff,voiceOn);
 await p.reload();await p.waitForSelector('#rc .seg .t');assert.deepEqual(await text(),D['cheshvan-28'].p.map(([t])=>t));
 await p.goto(srv.url+'#/settings');await p.waitForSelector('input[name=hayomNiqqud]');assert.equal(await p.locator('input[name=hayomNiqqud]').isChecked(),false);
 await p.locator('input[name=hayomNiqqud]').check();await p.goto(srv.url+'#/lib/hayomyom/cheshvan-28');await p.waitForSelector('#rc .seg .t');assert.deepEqual(await text(),on);assert.deepEqual(p.errors,[]);await p.context().close();
});
test('1.0.84: inline bold/italics and date/source credits survive both display modes; daily route defaults on',async()=>{
 const p=await pageWith(browser,srv.url,{prefs:{layout:'scroll',hayomNiqqud:'false'}});
 await p.goto(srv.url+'#/lib/hayomyom/iyyar-1');await p.waitForSelector('#rc .seg .t b');
 const a=await p.locator('#rc .seg .t b').allTextContents();assert.match(a.join(''),/[\u05B0-\u05BC]/);
 await p.click('#b-aa');assert.ok(await p.locator('input[name=hayomNiqqud]').isChecked());await p.locator('input[name=hayomNiqqud]').uncheck();await p.waitForFunction(()=>!/[\u05B0-\u05BC]/.test(document.querySelector('#rc .seg .t b').textContent));assert.deepEqual((await p.locator('#rc .seg .t b').allTextContents()),a.map(bare));await p.click('#sh-x');
 await p.goto(srv.url+'#/about');await p.waitForSelector('#hayomyom-about');assert.match(await p.locator('#hayomyom-about').textContent(),/קה״ת/);assert.match(await p.locator('#hayomyom-about').textContent(),/חב״דפדיה/);await p.context().close();
 const q=await pageWith(browser,srv.url,{prefs:{layout:'scroll'}});await q.goto(srv.url+'#/r/hayomyom/2026-11-08');await q.waitForSelector('#rc .seg .t');assert.match(await q.locator('#rc .seg .t').first().textContent(),/[\u05B0-\u05BC]/);await q.context().close();
});
