import test from'node:test';import assert from'node:assert/strict';import{serve,launch,pageWith}from'./helpers.mjs';
let srv,browser;test.before(async()=>{srv=await serve();browser=await launch();});test.after(async()=>{await browser?.close();srv?.close();});
for(const[route,label]of [['#/lib/rambam/Neighbors/9','library'],['#/r/rambam1/2026-11-08','daily one chapter'],['#/r/rambam3/2026-11-08','daily three chapters']])test('1.0.83: Rambam '+label+' attaches speech-only primary metadata to the actual local queue',async()=>{
 const p=await pageWith(browser,srv.url,{prefs:{ttsContinuous:false,layout:'scroll'}});await p.goto(srv.url+route);await p.waitForSelector('#rc .seg');assert.doesNotMatch(await p.locator('#rc').textContent(),/\u05ab/);
 await p.evaluate(async()=>{const{Speaker}=await import('/js/tts.js');window.__cap=null;Speaker.prototype.load=function(s,o){__cap={s:s.map(({el,...x})=>x),o};};Speaker.prototype.startAt=function(){};});await p.click('#b-tts');await p.waitForFunction(()=>__cap!==null);
 const q=await p.evaluate(async()=>{const{PiperSpeaker}=await import('/js/piper.js');const s=new PiperSpeaker({});s.load(__cap.s,__cap.o);return s.queue;});assert.ok(q.length);assert.ok(q.some(s=>s.acc?.primary?.includes('\u05ab')));assert.ok(q.every(s=>!s.text.includes('\u05ab')));
 if(label==='library'){assert.match(await p.locator('#rc').textContent(),/כָּתְלוֹ|כָּתְלוֹ/);assert.ok(q.some(s=>s.text.includes('\u05c7')));}
 assert.deepEqual(p.errors,[]);await p.context().close();
});
