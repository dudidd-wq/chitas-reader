import test from 'node:test';
import assert from 'node:assert/strict';
import { serve,launch,pageWith,CHROME } from './helpers.mjs';
test('1.0.79: daily/library Tanya and Halacha carry primary stress; section numbers stay silent',{skip:!CHROME},async()=>{
 const srv=await serve(),b=await launch();try{
 for(const route of ['#/r/tanya/2026-11-08','#/lib/tanya/KA/2','#/r/ravyomi/2026-11-08','#/lib/rav/265']){
 const p=await pageWith(b,srv.url,{prefs:{ttsEngine:'web',layout:'scroll',ttsContinuous:false}});await p.goto(srv.url+route);await p.waitForSelector('#rc .seg');
 await p.evaluate(async()=>{const{Speaker}=await import('/js/tts.js');window.__cap=null;Speaker.prototype.load=function(segs,opts){__cap={segs:segs.map(({el,...s})=>s),opts};};Speaker.prototype.startAt=function(){};});
 await p.click('#b-tts');await p.waitForFunction(()=>__cap!==null);
 const r=await p.evaluate(async()=>{const{PiperSpeaker}=await import('/js/piper.js'),{textToIPA}=await import('/js/g2p.js');const data=await(await fetch('/voice/stress-he.json')).json();const s=new PiperSpeaker({});s.load(__cap.segs,__cap.opts);const tr=[];for(const x of s.queue)textToIPA(x.text,{data,accents:x.acc,trace:tr});return{q:s.queue,tr,first:__cap.segs[0]};});
 assert.ok(r.q.length,route);assert.ok(r.q.every(x=>x.acc?.primary&&!x.text.includes('\u05AB')),route);
 if(route.includes('tanya/')){assert.ok(r.tr.some(t=>t.ipa==='dˈavka'&&t.src==='primary'),route);assert.ok(r.tr.some(t=>t.ipa==='duχʁˈin'&&t.src==='primary'),route);}
 else{assert.ok(r.tr.some(t=>t.ipa==='ʔˈela'&&t.src==='primary'),route);assert.doesNotMatch(r.q[0].text,/^חֵית\b/);if(route.startsWith('#/r/'))assert.ok(r.first.parts[0].replace(/[^א-ת]/g,'').startsWith('כשנותן'));}
 await p.close();}
 }finally{await b.close();srv.close();}
});
