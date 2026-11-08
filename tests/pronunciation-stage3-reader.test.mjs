import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import{serve,launch,pageWith,CHROME}from'./helpers.mjs';import{VOICE_FILES}from'../site/js/voice-files.js';
test('1.0.80: Siddur paragraph/table/repeats keep local primary metadata and skip source-only cells',{skip:!CHROME},async()=>{
 const srv=await serve(),b=await launch();try{const p=await pageWith(b,srv.url,{prefs:{ttsEngine:'web',layout:'scroll',ttsContinuous:false}});
 for(const route of ['#/s/boker/1','#/s/omer/1','#/s/boker/5','#/s/shema/1']){
 await p.goto(srv.url+route);await p.waitForSelector('#rc .seg');await p.evaluate(async()=>{const{Speaker}=await import('/js/tts.js');window.__cap=null;Speaker.prototype.load=function(segs,opts){__cap={segs:segs.map(({el,...s})=>s),opts};};Speaker.prototype.startAt=function(){};});await p.click('#b-tts');await p.waitForFunction(()=>__cap!==null);
 const r=await p.evaluate(async()=>{const{PiperSpeaker}=await import('/js/piper.js'),{textToIPA}=await import('/js/g2p.js');const data=await(await fetch('/voice/stress-he.json')).json(),s=new PiperSpeaker({});s.load(__cap.segs,__cap.opts);let tr=[];for(const x of s.queue)textToIPA(x.text,{data,accents:x.acc,trace:tr});return{q:s.queue,tr,html:document.querySelector('#rc').innerHTML};});
 assert.ok(r.q.length);assert.ok(r.q.every(x=>x.acc?.primary&&!x.text.includes('\u05AB')),route);assert.doesNotMatch(r.q.map(x=>x.text).join(' '),/אב"ג|ית"ץ|הקהל|ספירה \(מידה\)|\(א\)/);
 if(route==='#/s/boker/1')assert.ok(r.tr.some(t=>t.ipa==='ʃeheχezˈaʁta'&&t.src==='primary'));
 if(route.includes('omer'))assert.ok(r.html.includes('data-nr'),'omitted material still displayed');
 }
 }finally{await b.close();srv.close();}
});
test('local voice update: exact UI, no automatic fetch, click reuses models and downloads only changed stress',{skip:!CHROME},async()=>{
 const srv=await serve(),b=await launch();try{const p=await pageWith(b,srv.url);await p.goto(srv.url+'#/settings');
 await p.evaluate(async files=>{const c=await caches.open('voice-v1');for(const k of ['ort','wasm','config','full'])await c.put(new URL(files[k].url,document.baseURI),new Response('cached placeholder'));await c.put(new URL('voice/stress-he.json?v=legacy',document.baseURI),new Response('{}'));},VOICE_FILES);
 const req=[];p.on('request',r=>{if(r.url().includes('/voice/'))req.push(new URL(r.url()).pathname);});await p.reload();await p.waitForSelector('#qv-dl:visible');
 assert.equal(await p.textContent('#qv-dl'),'קול איכותי – הורדה חד-פעמית (92 MB)');assert.match(await p.textContent('#qv-st'),/אינו מותקן/);assert.deepEqual(req,[]);
 await p.click('#qv-dl');await p.waitForFunction(()=>document.querySelector('#qv-dl').hidden&&document.querySelector('input[name=ttsEngine][value=piper]').checked);
 assert.deepEqual(req,['/voice/stress-he.json']);assert.match(await p.textContent('#qv-st'),/מותקן במכשיר/);
 }finally{await b.close();srv.close();}
});
