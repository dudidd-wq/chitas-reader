// A debounced callback from a detached search form used to overwrite a later scoped search.
import test from 'node:test';
import assert from 'node:assert/strict';
import {serve,launch,pageWith,CHROME}from './helpers.mjs';
test('search debounce: submit cancels the timer and a detached form cannot overwrite the next route',{skip:!CHROME},async()=>{
 const srv=await serve(),b=await launch();try{
 const p=await pageWith(b,srv.url,{init:()=>{
  const set=window.setTimeout,clear=window.clearTimeout;let id=-1;window.__searchTimers=new Map();
  window.setTimeout=(fn,ms,...args)=>{if(ms!==450)return set(fn,ms,...args);const n=id--;__searchTimers.set(n,()=>fn(...args));return n;};
  window.clearTimeout=n=>{if(__searchTimers.has(n))__searchTimers.delete(n);else clear(n);};
 }});
 await p.goto(srv.url+'#/search?q='+encodeURIComponent('שמע ישראל'));await p.waitForSelector('#gs-q');
 await p.fill('#gs-q','שְׁמַע יִשְׂרָאֵל');assert.equal(await p.evaluate(()=>__searchTimers.size),1);
 await p.press('#gs-q','Enter');assert.equal(await p.evaluate(()=>__searchTimers.size),0);
 await p.fill('#gs-q','תורה');assert.equal(await p.evaluate(()=>__searchTimers.size),1);
 const route='#/search?q='+encodeURIComponent('רמב"ם')+'&in=tanya';await p.goto(srv.url+route);
 await p.waitForFunction(()=>document.querySelector('#gs-scope')?.value==='tanya'&&document.querySelector('#gs-q')?.value==='רמב"ם');
 await p.evaluate(()=>{const f=[...__searchTimers.values()];__searchTimers.clear();f.forEach(fn=>fn());});
 await p.waitForFunction(async()=>{const{searchStats}=await import('/js/library-ui.js');return searchStats.last?.q==='רמב"ם'&&!document.querySelector('#gs-st')?.textContent.includes('…');});
 assert.equal(await p.evaluate(()=>location.hash),route);
 assert.deepEqual(await p.$$eval('.gs-book h2',a=>a.map(x=>x.textContent.split(' (')[0])),['תניא']);
 assert.deepEqual(p.errors,[]);
 }finally{await b.close();srv.close();}
});
