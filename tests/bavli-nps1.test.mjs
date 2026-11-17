import test from 'node:test';
import assert from 'node:assert/strict';
import { alignPage, tokens, unique, quoteMap, segmentSidecar } from '../tools/bavli-nps1.mjs';
import { nps1Speech } from '../site/js/bavli-nps1.js';
const opts={havara:'chabad',corpus:'bavli'};
function layer(source='בית גדול, ובית קטן',commentary='<b>בית גדול ובית קטן</b>',speech='בית גדול ובית קטן',witness='בַּיִת גָּדוֹל וּבַּיִת קָטָן') {
  return segmentSidecar({source,commentary,speech,aligned:alignPage([source],tokens(witness))[0],page:'Fixture/2a',segment:0,sourceHash:'fixture',dictaHash:'fixture'});
}
test('NPS1: exact, attributed additions preserve consonants and fill only unpointed words',()=>{
  const s=layer(); assert.equal(nps1Speech(s.base,s,opts),'בַּיִת גָּדוֹל, וּבַּיִת קָטָן');
  assert.equal(s.edits.filter(e=>e.kind==='niqqud').length,4);
  assert.ok(s.edits.every(e=>e.provenance.token>=0&&e.provenance.source_sha256));
  assert.equal(s.edits.find(e=>e.kind==='punctuation').provenance.gap,', ');
});
test('NPS1: Israeli/default/unknown and all non-Bavli profiles return original bytes',()=>{
  const s=layer();for(const havara of [undefined,'israeli','ashkenazi','unknown'])assert.equal(nps1Speech(s.base,s,{havara,corpus:'bavli'}),s.base);
  for(const corpus of [undefined,'yer','mishna','Shekalim','tanya'])assert.equal(nps1Speech(s.base,s,{havara:'chabad',corpus}),s.base);
});
test('NPS1: partial pointing, source pointing and existing stress cannot be overwritten',()=>{
  for(const source of ['אָמר רב','אּמר רב','אמר֫ רב']) {
    const s=layer(source,'<b>אמר רב</b>','אמר רב','אָמַר רַב'); assert.ok(!s?.edits.some(e=>e.kind==='niqqud'&&e.provenance.token===0));
  }
  const s=layer('אמר רב','<b>אמר רב</b>','אָמר֫ רב');assert.ok(!(s?.edits||[]).some(e=>e.start===0));
});
test('NPS1: duplicate/variant/nonmonotonic Dicta segments abstain',()=>{
  assert.equal(unique(['א','ב','א','ב'],['א','ב']),null);
  assert.equal(alignPage(['אמר רב'],tokens('אָמַר רַב אָמַר רַב'))[0][0].dicta,null);
  assert.equal(alignPage(['אמר רב'],tokens('אָמַר רַבי'))[0][0].dicta,null);
  assert.equal(alignPage(['אמר רב','אמר רב'],tokens('אָמַר רַב'))[1][0].dicta,null);
});
test('NPS1: commentary, expanded and repeated quotations receive no permission',()=>{
  assert.equal(layer('אמר, רב','אמר רב'),null);
  assert.equal(layer('אמר, רב','<b>אמר רב</b>','אמר רבי',''),null);
  assert.equal(quoteMap('<b>אמר רב</b>','אמר רב',tokens('אמר רב אמר רב')).size,0);
  assert.equal(layer('אמר, רב','<b>אמר</b> <b>רב</b>'),null);
  assert.equal(layer('אמר, רב','<b><b>אמר רב</b></b>'),null);
  assert.equal(layer('אמר, רב','<b>אמר רב'),null);
  assert.equal(layer('אמר, רב','<b>אמר &unknown;רב</b>'),null);
});
test('NPS1: punctuation never crosses inserted explanation or overwrites existing marks',()=>{
  assert.equal(layer('אָמַר, רַב','<b>אמר רב</b>','אָמַר; רַב'),null);
  assert.equal(layer('אָמַר, רַב','<b>אמר</b> ביאור <b>רב</b>','אָמַר ביאור רַב'),null);
  assert.equal(layer('אָמַר רַב.','<b>אמר רב</b>','אָמַר רַב'),null);
  assert.equal(layer('אָמַר ״רַב״','<b>אמר רב</b>','אָמַר רַב'),null);
});
test('NPS1: stale bases, unsupported schema, malformed ranges fail closed',()=>{
  const s=layer();assert.equal(nps1Speech('different',s,opts),'different');
  assert.equal(nps1Speech(s.base,{...s,schema:2},opts),s.base);
  for(const edit of [{...s.edits[0],start:-1},{...s.edits[0],after:'אחר'},{...s.edits[0],kind:'stress'}])assert.equal(nps1Speech(s.base,{...s,edits:[edit]},opts),s.base);
});
test('NPS1: added vowels and punctuation can be replayed without changing source objects',()=>{
  const s=layer(), original=JSON.stringify(s);nps1Speech(s.base,s,opts);assert.equal(JSON.stringify(s),original);
  const after=nps1Speech(s.base,s,opts);assert.equal(nps1Speech(after,s,opts),after);
});
import fs from 'node:fs';
import { pauseChunks, prepareForTTS } from '../site/js/tts-prep.js';
import { buildDoc } from '../site/js/texts.js';
test('NPS1: compiled Bavli reaches the reader speech path and changes pause preparation',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async p=>{const u=new URL('../site/'+p,import.meta.url);return {ok:fs.existsSync(u),json:async()=>JSON.parse(fs.readFileSync(u,'utf8'))};};
  try {
    const doc=await buildDoc({gem:{kind:'bavli',t:'Arakhin',amudim:['14a']}},'shasBavli');
    const raw=JSON.parse(fs.readFileSync(new URL('../site/data/gemara/bavli/Arakhin/14a.json',import.meta.url),'utf8'));
    const blocks=doc.blocks.filter(b=>b.type==='p');
    assert.deepEqual(blocks.map(b=>b.text),raw.segs.map(s=>s[0]));
    assert.ok(blocks.some(b=>b.nps1));
    assert.ok(blocks.some(b=>nps1Speech(b.say,b.nps1,{...opts,corpus:b.nps1Corpus})!==b.say));
    for(const b of blocks)assert.equal(nps1Speech(b.say,b.nps1,{havara:'israeli',corpus:b.nps1Corpus}),b.say);
    const s=layer('בַּיִת גָּדוֹל, וּבַּיִת קָטָן','<b>בית גדול ובית קטן</b>','בַּיִת גָּדוֹל וּבַּיִת קָטָן','');
    const before=pauseChunks(prepareForTTS(s.base)),after=pauseChunks(prepareForTTS(nps1Speech(s.base,s,opts)));
    assert.notDeepEqual(after,before);
  } finally {globalThis.fetch=original;}
});
test('NPS1: stale display or commentary suppresses compiled metadata at document assembly',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async p=>{const u=new URL('../site/'+p,import.meta.url);return {ok:fs.existsSync(u),json:async()=>{
    const j=JSON.parse(fs.readFileSync(u,'utf8'));if(p.includes('/bavli/'))j.segs=j.segs.map(([g,s])=>[g+' ',s]);return j;
  }};};
  try {
    const {buildDoc: fresh}=await import('../site/js/texts.js?nps1-stale-test');
    const d=await fresh({gem:{kind:'bavli',t:'Arakhin',amudim:['14a']}},'shasBavli');
    assert.ok(d.blocks.filter(b=>b.type==='p').every(b=>!b.nps1));
  }finally{globalThis.fetch=original;}
});

// Review's actual commentary expansions: these are not invented aligned strings.
const boundaryErrors=JSON.parse(fs.readFileSync(new URL('./fixtures/nps1-boundary-errors.json',import.meta.url),'utf8'));
for(const f of boundaryErrors)test(`NPS1 regression: ${f.edit.provenance.page}:${f.edit.provenance.segment+1} rejects unsafe boundary`,()=>{
  const p=f.edit.provenance;
  const aligned=alignPage([f.source])[0];
  const map=quoteMap(f.commentary,f.speech,aligned);
  assert.ok([...map.values()].includes(p.token),'fixture must exercise a matched quotation');
  const s=segmentSidecar({source:f.source,commentary:f.commentary,speech:f.speech,aligned,page:p.page,segment:p.segment,sourceHash:p.source_sha256});
  assert.ok(!(s?.edits||[]).some(e=>e.start===f.edit.start&&e.after===f.edit.after),f.reason);
  assert.ok(!(s?.edits||[]).some(e=>/[.?!…׃]/.test(e.after)));
  const compiled=JSON.parse(fs.readFileSync(new URL(`../site/data/gemara/bsay/${p.page}.json`,import.meta.url),'utf8'));
  assert.ok(!(compiled.nps1?.[p.segment]?.edits||[]).some(e=>e.start===f.edit.start&&e.after===f.edit.after));
});
test('NPS1: all sentence boundaries and compound punctuation abstain in builder and runtime',()=>{
  for(const mark of ['?','.','...','…','!','׃','–,',',?',';;']) {
    assert.equal(layer(`אָמַר${mark} רַב`,'<b>אמר רב</b>','אָמַר רַב',''),null);
    const s=layer('בַּיִת גָּדוֹל, וּבַּיִת קָטָן','<b>בית גדול ובית קטן</b>','בַּיִת גָּדוֹל וּבַּיִת קָטָן','');
    s.edits[0].after=mark;
    assert.equal(nps1Speech(s.base,s,opts),s.base);
  }
});
test('NPS1: malformed entries fail closed even after an otherwise valid edit',()=>{
  const s=layer();
  const bad=[null,undefined,0,1,false,true,'edit',[],{}, {start:0},
    {...s.edits[0],provenance:null},{...s.edits[0],provenance:[]},
    {...s.edits[0],provenance:'bad'}, {...s.edits[0],provenance:{source_sha256:1}},
    {...s.edits[0],before:null}, {...s.edits[0],after:null},
    {...s.edits[0],start:NaN}, {...s.edits[0],end:Infinity},
    {...s.edits[0],start:'0'}, {...s.edits[0],kind:null}];
  for(const e of bad)for(const edits of [[e],[s.edits[0],e]])
    assert.equal(nps1Speech(s.base,{...s,edits},opts),s.base);
});

test('NPS1 R2-1: actual repurposed אלא fails closed at runtime and preserves pause plan',()=>{
  const f=boundaryErrors.find(f=>f.edit.provenance.page==='Sanhedrin/41a');
  const stale={schema:1,source:f.source,commentary:f.commentary,base:f.speech,edits:[f.edit]};
  assert.equal(nps1Speech(f.speech,stale,opts),f.speech);
  assert.deepEqual(pauseChunks(prepareForTTS(nps1Speech(f.speech,stale,opts))),f.beforePauseChunks);
  const d=JSON.parse(fs.readFileSync(new URL('../site/data/gemara/bsay/Sanhedrin/41a.json',import.meta.url)));
  assert.deepEqual(pauseChunks(prepareForTTS(nps1Speech(f.speech,d.nps1?.[27],opts))),f.beforePauseChunks);
});
test('NPS1: connector roles and prefixed/multiword variants abstain for every phrase mark',()=>{
  for(const connector of ['אלא','אלא אם','אי','אבל','ואלא','ולא','אף','ואף','דאילו','ושמא','אף על פי כן','אי הכי','אדרבה','לפיכך','לטעמיך'])
    for(const mark of [',',';',':','—','–']) {
      const text=connector+' תלמיד היושב', at=connector.length;
      const source=connector+mark+' תלמיד היושב';
      const compiled=layer(source,'ביאור <b>'+text+'</b>','ביאור '+text,'');
      assert.equal(compiled,null,connector+mark);
      const sidecar={schema:1,base:text,edits:[{start:at,end:at,before:'',after:mark,kind:'punctuation',provenance:{license:'CC BY-NC',source_sha256:'fixture'}}]};
      assert.equal(nps1Speech(text,sidecar,opts),text);
    }
  const text='אֶ֫לָּא תלמיד';
  const sidecar={schema:1,base:text,edits:[{start:text.indexOf(' '),end:text.indexOf(' '),before:'',after:',',kind:'punctuation',provenance:{license:'CC BY-NC',source_sha256:'fixture'}}]};
  assert.equal(nps1Speech(text,sidecar,opts),text);
  assert.equal(nps1Speech('אלא, תלמיד',null,opts),'אלא, תלמיד','existing punctuation is untouched');
});
