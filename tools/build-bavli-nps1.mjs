import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash, dictaPages, alignPage, segmentSidecar, REV } from './bavli-nps1.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const input=path.resolve(process.argv[2]||path.join(root,'engine-nps/inputs'));
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const tree=read(path.join(input,'dicta_tree.json')).tree;
const pins={Bava_Metzia:'04d495fa929f1c2d20053079d5697267fc5f7daa90317f75b9fabd0a862e2b53',Berakhot:'ad42101b4520bd16b67261431f0181cc15e3138d6c5f105b34cebf9da39fd962',Taanit:'4a5e54e6b1e489f2d7136f0e386f0e1511db5c4e8f1dbb14234ba86ffaa45d89'};
const witnesses={};
for(const tr of ['Berakhot','Taanit','Bava_Metzia']) {
  const raw=fs.readFileSync(path.join(input,`dicta-${tr}-maleh.txt`));
  if(hash(raw)!==pins[tr])throw Error('Pinned witness mismatch '+tr);
  const entry=tree.find(x=>x.path.startsWith(tr+'/')&&x.path.endsWith('combinedfullmaleh.txt'));
  const {createHash}=await import('node:crypto');
  if(!entry||createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`),raw])).digest('hex')!==entry.sha)throw Error('Dicta blob mismatch '+tr);
  witnesses[tr]={pages:dictaPages(raw.toString('utf8')),hash:hash(raw)};
}
const data=path.join(root,'site/data/gemara');
if(read(path.join(data,'index.json')).sources.gemara.license !== 'CC-BY-NC')throw Error('Unapproved punctuation license');
const counts={pages:0,segments:0,changedPages:0,changedSegments:0,punctuation:0,niqqud:0}, samples=[], dropped=[];
for(const tr of fs.readdirSync(path.join(data,'bavli')).sort())for(const f of fs.readdirSync(path.join(data,'bavli',tr)).sort()) {
  if(!f.endsWith('.json'))continue;
  const raw=fs.readFileSync(path.join(data,'bavli',tr,f)), d=JSON.parse(raw), sp=path.join(data,'bsay',tr,f);
  if(d.yer||tr==='Shekalim'||!fs.existsSync(sp))continue;
  counts.pages++;const old=fs.readFileSync(sp,'utf8'), s=JSON.parse(old), page=tr+'/'+f.slice(0,-5), w=witnesses[tr];
  const aligned=alignPage(d.segs.map(x=>x[0]),w?.pages[f.slice(0,-5)]);
  const layers=d.segs.map(([source,commentary],i)=>{
    counts.segments++;
    const layer=segmentSidecar({source,commentary:commentary||'',speech:s.say[i],aligned:aligned[i],page,segment:i,sourceHash:hash(raw),dictaHash:w?.hash,onDrop:row=>dropped.push({page,segment:i,...row})});
    if(layer){counts.changedSegments++;for(const e of layer.edits)counts[e.kind]++;if(samples.length<10)samples.push({page,segment:i,...layer});}
    return layer;
  });
  if(layers.some(Boolean)){s.nps1=layers;counts.changedPages++;}else delete s.nps1;
  const next=JSON.stringify(s);if(next!==old)fs.writeFileSync(sp,next);
}
console.log(JSON.stringify({revision:REV,...counts,samples,droppedByRule:dropped.reduce((a,x)=>(a[x.rule]=(a[x.rule]||0)+1,a),{}),dropped},null,2));
