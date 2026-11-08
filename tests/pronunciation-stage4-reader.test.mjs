import test from'node:test';import assert from'node:assert/strict';import{serve,launch,pageWith,CHROME}from'./helpers.mjs';
test('1.0.81: Torah Or and Likkutei Torah reader queues retain primary metadata and never read page markers',{skip:!CHROME},async()=>{
 const srv=await serve(),b=await launch();try{const p=await pageWith(b,srv.url,{prefs:{ttsEngine:'web',layout:'scroll',ttsContinuous:false}});
 for(const route of ['#/r/tolt/2026-11-08','#/lib/tolt/shemini/1']){await p.goto(srv.url+route);await p.waitForSelector('#rc .seg');await p.evaluate(async()=>{const{Speaker}=await import('/js/tts.js');window.__cap=null;Speaker.prototype.load=function(segs,opts){__cap={segs:segs.map(({el,...s})=>s),opts};};Speaker.prototype.startAt=function(){};});await p.click('#b-tts');await p.waitForFunction(()=>__cap!==null);
 const r=await p.evaluate(async()=>{const{PiperSpeaker}=await import('/js/piper.js'),{textToIPA}=await import('/js/g2p.js'),data=await(await fetch('/voice/stress-he.json')).json(),s=new PiperSpeaker({});s.load(__cap.segs,__cap.opts);const tr=[];for(const x of s.queue)textToIPA(x.text,{data,accents:x.acc,trace:tr});return{q:s.queue,tr};});
 assert.ok(r.q.length,route);assert.ok(r.q.every(x=>x.acc?.primary&&!x.text.includes('\u05AB')),route);assert.ok(r.tr.some(x=>x.src==='primary'));assert.ok(!r.tr.some(x=>x.src==='spell'&&/^\[/.test(x.word)));assert.doesNotMatch(r.q.map(x=>x.text).join(' '),/<span|\[\s*[א-ת]{1,3}\s+[א-ד]\s*\]/);
 }}finally{await b.close();srv.close();}
});
test('1.0.81: Modeh Ani clause boundary actually reaches two local synthesis chunks with the same word IPA',{skip:!CHROME},async()=>{
 const srv=await serve(),b=await launch();try{const p=await pageWith(b,srv.url,{prefs:{ttsEngine:'web',layout:'scroll'}});await p.goto(srv.url+'#/s/boker/1');await p.waitForSelector('#rc .seg');await p.evaluate(async()=>{const{Speaker}=await import('/js/tts.js');window.__cap=null;Speaker.prototype.load=function(segs,opts){__cap={segs:segs.map(({el,...s})=>s),opts};};Speaker.prototype.startAt=function(){};});await p.click('#b-tts');await p.waitForFunction(()=>__cap!==null);
 const r=await p.evaluate(async()=>{const{PiperSpeaker}=await import('/js/piper.js'),{textToIPA}=await import('/js/g2p.js'),data=await(await fetch('/voice/stress-he.json')).json(),s=new PiperSpeaker({});s.load(__cap.segs,__cap.opts);const tr=[];for(const x of s.queue.slice(0,2))textToIPA(x.text,{data,accents:x.acc,trace:tr});return{q:s.queue.slice(0,2),tr,display:document.querySelector('#rc .seg .t').textContent};});
 assert.match(r.q[0].text,/ם\.$/);assert.match(r.q[1].text,/^שֶׁהֶחֱזַרְתָּ/);assert.ok(r.tr.some(x=>x.ipa==='ʃeheχezˈaʁta'&&x.src==='primary'));assert.match(r.display,/ם, ש/,'display must retain the original comma');
 }finally{await b.close();srv.close();}
});
