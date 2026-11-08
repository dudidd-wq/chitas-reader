// 1.0.80: exact-source Siddur speech layer. --prepare; fetch-siddur-rich.py; build; npm run search.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import zlib from 'node:zlib';
import {siddurProsody,alignSiddurTokens,siddurSpeechHtml,siddurRepairs,siddurStress,wordRE,skeleton,compatibleVowels,fillMissingVowels,stampStress}from './siddur-pronunciation.mjs';
import {stressKey,nuclei,predictStress,accentWords,stressFromAccents,HATAMA}from '../site/js/g2p.js';
const ROOT=new URL('../',import.meta.url).pathname,CACHE=process.env.SIDDUR_RICH_CACHE||'/workspace/siddur-pronunciation/rich-cache';
const D=JSON.parse(fs.readFileSync(ROOT+'site/voice/stress-he.json'));
globalThis.fetch=async p=>{try{return{ok:true,json:async()=>JSON.parse(fs.readFileSync(ROOT+'site/'+p))};}catch{return{ok:false};}};
const {buildSiddurDoc}=await import('../site/js/texts.js');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+'/'+e.name):[d+'/'+e.name]);
const files=walk(ROOT+'site/data/siddur').filter(f=>f.endsWith('.json')&&!f.endsWith('/index.json')).sort();
const chapters=new Map(),unique=new Map(),chunks=[];let batch=[],size=0;
for(const f of files){
 const d=JSON.parse(fs.readFileSync(f));chapters.set(f,d);const book=path.basename(path.dirname(f)),n=+path.basename(f,'.json'),doc=await buildSiddurDoc(book,n),seen=new Set();
 for(const b of doc.blocks){if(!['p','table'].includes(b.type))continue;const i=+b.id.split('-').at(-1).replace(/x\d+$/,'');if(seen.has(i))continue;seen.add(i);
 const html=b.type==='table'?b.rows.flatMap(r=>r.filter(c=>c.k==='p').map(c=>c.html)).join(', '):b.text;
 const base=siddurRepairs(siddurSpeechHtml(html));if(!/[א-ת]/.test(base))continue;
 if(!unique.has(base))unique.set(base,{base,jobs:[]});unique.get(base).jobs.push({f,i});
 }
}
const bare=s=>s.replace(/[\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g,'');
const flush=()=>{if(!batch.length)return;const text=batch.map(p=>bare(p.base)).join('\n');chunks.push({hash:crypto.createHash('sha256').update(text).digest('hex'),text,paragraphs:batch});batch=[];size=0;};
for(const p of unique.values()){if(size+bare(p.base).length>2500)flush();batch.push(p);size+=bare(p.base).length+1;}flush();fs.mkdirSync(CACHE,{recursive:true});
if(process.argv.includes('--prepare')){fs.writeFileSync(path.join(CACHE,'input-list.json'),JSON.stringify(chunks.map(({hash,text})=>({hash,text}))));console.log('Prepared',chunks.length,'batches;',unique.size,'unique prayers;', [...unique.values()].reduce((n,p)=>n+p.jobs.length,0),'blocks');}
else{
 // Index exact 4-word source sequences; require compatible existing Siddur vowels and unanimous stress candidates.
 const index=new Map();for(const fam of ['torah','tehillim'])for(const f of walk(ROOT+'site/data/'+fam).filter(f=>f.endsWith('.json')&&!f.endsWith('/index.json'))){const d=JSON.parse(fs.readFileSync(f));for(const raw of d.v||[]){const ws=accentWords(raw).map(({word,joined})=>({w:word.replace(/[\u0591-\u05AF\u05BD\u05C3]/g,''),k:joined?null:stressFromAccents(word,{allowOle:false})}));for(let i=0;i+4<=ws.length;i++){const key=ws.slice(i,i+4).map(x=>skeleton(x.w)).join(' ');if(!index.has(key))index.set(key,[]);index.get(key).push({ws,i});}}}
 const stats={files:files.length,batches:chunks.length,uniquePrayers:unique.size,blocks:0,words:0,curated:0,exceptions:0,dicta:0,quoteWords:0,filledWords:0,fallback:0,explicit:0,polysyllables:0,splits:0,merges:0};
 for(const d of chapters.values())d.say={};
 for(const c of chunks){const cached=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(CACHE,c.hash+'.json.gz'))));if(cached.text!==c.text)throw Error('Cache mismatch');
 const aligned=alignSiddurTokens(c.paragraphs.flatMap(p=>[...p.base.matchAll(wordRE)].map(m=>skeleton(m[0]))),cached.tokens.filter(n=>/[א-ת]/.test(n.word)));if(!aligned)throw Error('Unaligned Siddur batch '+c.hash);stats.splits+=aligned.splits;stats.merges+=aligned.merges;let wi=0;
 for(const p of c.paragraphs){
  const matches=[...p.base.matchAll(wordRE)],ws=matches.map(m=>m[0].replace(/["״]$/,'')),proposals=new Map();
  for(let a=0;a+4<=ws.length;a++){const options=index.get(ws.slice(a,a+4).map(skeleton).join(' '))||[];for(const q of options){let len=0;while(a+len<ws.length&&q.i+len<q.ws.length&&skeleton(ws[a+len])===skeleton(q.ws[q.i+len].w)&&compatibleVowels(ws[a+len],q.ws[q.i+len].w))len++;if(len<4)continue;for(let j=0;j<len;j++){const b=a+j,x=q.ws[q.i+j],key=stressKey(x.w)+'|'+x.k;if(!proposals.has(b))proposals.set(b,new Map());proposals.get(b).set(key,x);}}}
  let at=0;const say=p.base.replace(wordRE,source=>{const n=aligned.tokens[wi++],pos=at++;stats.words++;let w=source,trail=/["״]$/.test(w)?w.slice(-1):'';if(trail)w=w.slice(0,-1);if(/["'״׳]/.test(w))return source;
   const q=proposals.get(pos),gold=q?.size===1?[...q.values()][0]:null;
   // Only fill missing vowels. Conflicting edited vowels are never overwritten by a model or a parallel verse.
   const cand=gold?.w||((n.confident&&(n.options||[]).find(o=>o.level===1&&skeleton(o.w)===skeleton(w)&&compatibleVowels(w,o.w)))?.w);
   if(cand){const filled=fillMissingVowels(w,cand);if(stressKey(filled)!==stressKey(w)){w=filled;stats.filledWords++;}}
   let k=siddurStress(w);
   if(k!==null)stats.curated++;
   else if(gold&&gold.k!==null&&nuclei(w).length===nuclei(gold.w).length){k=gold.k;stats.quoteWords++;}
   else if(D.exc[stressKey(w)]!==undefined){k=D.exc[stressKey(w)];stats.exceptions++;}
   if(k===null){const opts=(n.options||[]).filter(o=>/^Acc[01]$/.test(o.acc||'')&&stressKey(o.w).replace(/\u05BC/g,'')===stressKey(w).replace(/\u05BC/g,'')&&nuclei(o.w).length===nuclei(w).length),chosen=opts.find(o=>o.level===1),ks=new Set(opts.map(o=>+o.acc.slice(-1)));
    if(chosen||ks.size===1){k=chosen?+chosen.acc.slice(-1):[...ks][0];stats.dicta++;}else{const[g,src]=predictStress(w,D);if(src==='lex')k=g;else stats.fallback++;}}
   if(nuclei(w).length>1)stats.polysyllables++;const marked=stampStress(w,k);if(marked.includes(HATAMA))stats.explicit++;return marked+trail;
  });
  for(const{f,i}of p.jobs){chapters.get(f).say[i]=siddurProsody(say);stats.blocks++;}
 }
 }
 for(const[f,d]of chapters)fs.writeFileSync(f,JSON.stringify(d));fs.writeFileSync(ROOT+'verification/SIDDUR-180-metrics.json',JSON.stringify(stats,null,2)+'\n');console.log(JSON.stringify(stats,null,2));
}
