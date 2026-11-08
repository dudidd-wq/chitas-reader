// 1.0.79 stage 2: preserve Kehot source/vowels and compile per-occurrence primary stress.
// --prepare -> fetch-prose-rich.py -> build (all external work is public/keyless and build-time only).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { alignRashiTokens } from './rashi-context.mjs';
import { proseContext, curatedProseStress, proseSource } from './prose-context.mjs';
import { letters, nuclei, stressKey, predictStress, HATAMA } from '../site/js/g2p.js';
const ROOT = new URL('../', import.meta.url).pathname;
const CACHE = process.env.PROSE_RICH_CACHE || '/workspace/prose-pronunciation/rich-cache';
const D = JSON.parse(fs.readFileSync(ROOT + 'site/voice/stress-he.json'));
const sk = s => s.replace(/[^א-ת]/g, '');
const bare = s => s.replace(/[\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g, '');
const wordRE = /[א-ת][א-ת\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7"'״׳]*/g;
const signature = w => stressKey(w).replace(/\u05BC/g, '');
const walk = d => fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+'/'+e.name):[d+'/'+e.name]);
const files = [...walk(ROOT+'site/data/tanya'),...walk(ROOT+'site/data/ravyomi/s')].filter(f=>f.endsWith('.json')&&!f.endsWith('/index.json')).sort();
const chunks=[], chapters=new Map();
for(const f of files){
 const d=JSON.parse(fs.readFileSync(f));if(!d.s)continue; chapters.set(f,d);
 const family=f.includes('/tanya/')?'tanya':'halacha';let batch=[],size=0;
 const flush=()=>{if(!batch.length)return;const text=batch.map(p=>bare(p.base)).join('\n');chunks.push({hash:crypto.createHash('sha256').update(text).digest('hex'),text,paragraphs:batch});batch=[];size=0;};
 const add=(p,indices)=>{const base=proseContext(proseSource(p),family);if(size+bare(base).length>2500)flush();batch.push({f,indices,family,base});size+=bare(base).length+1;};
 d.s.forEach((p,i)=>typeof p==='string'?add(p,[i]):p.forEach((s,j)=>add(s,[i,j])));flush();
}
fs.mkdirSync(CACHE,{recursive:true});
if(process.argv.includes('--prepare')){
 fs.writeFileSync(path.join(CACHE,'input-list.json'),JSON.stringify(chunks.map(({hash,text})=>({hash,text}))));console.log('Prepared',chunks.length,'batches');
}else{
 const stats={batches:chunks.length,files:chapters.size,tanya:{},halacha:{}};
 for(const family of ['tanya','halacha'])Object.assign(stats[family],{paragraphs:0,words:0,curated:0,exceptions:0,dicta:0,lexicon:0,fallback:0,polysyllables:0,explicit:0,context:0,splits:0});
 for(const d of chapters.values())d.say=d.s.map(p=>typeof p==='string'?'':p.map(()=>''));
 for(const c of chunks){
  const cached=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(CACHE,c.hash+'.json.gz'))));if(cached.text!==c.text)throw Error('Cache mismatch '+c.hash);
  const alignment=alignRashiTokens(c.paragraphs.flatMap(p=>[...p.base.matchAll(wordRE)].map(m=>sk(m[0]))),cached.tokens.filter(n=>/[א-ת]/.test(n.word)));
  if(!alignment)throw Error('Unaligned prose batch '+c.hash);let wi=0;
  stats[c.paragraphs[0].family].splits+=alignment.splits;
  for(const p of c.paragraphs){
   const st=stats[p.family];st.paragraphs++;
   let say=p.base.replace(wordRE,source=>{
    const n=alignment.tokens[wi++];st.words++;let w=source,trail=/["״]$/.test(w)?w.slice(-1):'';if(trail)w=w.slice(0,-1);
    if(/["'״׳]/.test(w))return source;
    let k=curatedProseStress(w);if(k!==null)st.curated++;
    else if(D.exc[stressKey(w)]!==undefined){k=D.exc[stressKey(w)];st.exceptions++;}
    else{
     const matches=(n.options||[]).filter(o=>/^Acc[01]$/.test(o.acc||'')&&signature(o.w)===signature(w)&&nuclei(o.w).length===nuclei(w).length);
     const chosen=matches.find(o=>o.level===1),ks=new Set(matches.map(o=>+o.acc.slice(-1)));
     if(chosen||ks.size===1){k=chosen?+chosen.acc.slice(-1):[...ks][0];st.dicta++;}
     else{const [guess,src]=predictStress(w,D);if(src==='lex'){k=guess;st.lexicon++;}else st.fallback++;}
    }
    const L=letters(w),nu=nuclei(L);if(nu.length>1){st.polysyllables++;if(Number.isInteger(k)&&k>=0&&k<nu.length){L[nu[nu.length-1-k].own].all+=HATAMA;st.explicit++;return L.map(l=>l.ch+l.all).join('')+trail;}}
    return source;
   });
   const d=chapters.get(p.f);if(p.indices.length===1)d.say[p.indices[0]]=say;else d.say[p.indices[0]][p.indices[1]]=say;
  }
 }
 for(const [f,d] of chapters)fs.writeFileSync(f,JSON.stringify(d));
 // Count the narrow, corpus-reviewed context expansion separately from ordinary stress tags.
 for(const [f,d]of chapters){const family=f.includes('/tanya/')?'tanya':'halacha';for(const p of d.s.flat())proseContext(p,family,()=>stats[family].context++);}
 fs.writeFileSync(ROOT+'verification/PROSE-179-metrics.json',JSON.stringify(stats,null,2)+'\n');console.log(JSON.stringify(stats,null,2));
}
