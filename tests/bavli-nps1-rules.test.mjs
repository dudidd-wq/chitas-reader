import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {boundaryContext,boundaryDecision,NPS1_CLASSES,nps1Connector,formulaSpans,tokens} from '../site/js/bavli-nps1-rules.js';
import {nps1Speech} from '../site/js/bavli-nps1.js';
import {segmentSidecar,alignPage} from '../tools/bavli-nps1.mjs';
import {prepareForTTS,pauseChunks} from '../site/js/tts-prep.js';
const opts={havara:'chabad',corpus:'bavli'};
function fixture(source='בית גדול, ובית קטן',speech=source.replace(',',''),commentary='<b>'+speech+'</b>') {
  const st=tokens(source),j=st.findIndex((t,i)=>source.slice(t.end,st[i+1]?.start).includes(','));
  const ts=tokens(speech),at=ts[j].end;
  const edit={kind:'punctuation',start:at,end:at,before:'',after:',',provenance:{token:j,start:st[j].start,end:st[j].end,text:st[j].text,gap_start:st[j].end,gap_end:st[j+1].start,gap:source.slice(st[j].end,st[j+1].start),license:'CC BY-NC',source_sha256:'fixture'}};
  const ctx=boundaryContext({source,speech,commentary});
  return {source,speech,commentary,ctx,edit,sidecar:{schema:1,base:speech,source,commentary,edits:[edit]}};
}
function check(f,rule,allowed=false,prior=[]) {
  const d=boundaryDecision(f.ctx,f.edit,prior);assert.equal(d.rule,rule);assert.equal(d.allowed,allowed);
  if(!prior.length)assert.equal(nps1Speech(f.speech,f.sidecar,opts),allowed?f.speech.slice(0,f.edit.start)+','+f.speech.slice(f.edit.start):f.speech);
}
test('NPS1 rules C1: source-only exact provenance; missing source/changed gap never replay',()=>{
  check(fixture(),'C7',true);
  for(const mutate of [f=>f.edit.after=';',f=>f.edit.provenance.token++,f=>f.edit.provenance.gap='; ',f=>{f.ctx=null;delete f.sidecar.source;}]){const f=fixture();mutate(f);check(f,'C1');}
});
for(const [group,entries] of Object.entries(NPS1_CLASSES))test('NPS1 vocabulary and prefixes: '+group,()=>{
  for(const entry of entries)for(const prefix of ['','ו','ד','ש','כ','ה','וד','וכ','שכ','והד']) {
    const words=(prefix+entry).split(' ');
    if(words.length===1)assert.ok(nps1Connector(words[0]),prefix+entry);
    else assert.ok(formulaSpans(tokens(prefix+entry)).some(s=>s.phrase===entry),prefix+entry);
  }
  assert.equal(nps1Connector('גדול'),false);
});
test('NPS1 rules C2: internal formula boundary forbidden; boundary away from formula permitted',()=>{
  check(fixture('בית גדול הוי, רישא ובית קטן'),'C2');
  check(fixture(),'C7',true);
});
test('NPS1 rules C3: after every single connective and final formula word forbidden',()=>{
  for(const group of Object.values(NPS1_CLASSES))for(const entry of group){
    const f=fixture('בית גדול '+entry+', ובית קטן');
    assert.ok(['C2','C3'].includes(boundaryDecision(f.ctx,f.edit).rule),entry);
  }
  check(fixture(),'C7',true);
});
test('NPS1 rules C4: before connective requires explicit expanded-commentary boundary',()=>{
  check(fixture('בית גדול, אבל ובית קטן'),'C4');
  const f=fixture('בית גדול, אבל ובית קטן','בית גדול אבל ובית קטן','<b>בית גדול, אבל ובית קטן</b>');check(f,'C4',true);
  const s=segmentSidecar({...f,speech:f.speech,aligned:alignPage([f.source])[0],sourceHash:'fixture'});assert.equal(s.edits.length,1);
});
for(const [group,entries] of Object.entries(NPS1_CLASSES))test('NPS1 C4 before-class positive and negative: '+group,()=>{
  for(const entry of entries){
    const source='בית גדול, '+entry+' בית קטן',speech=source.replace(',','');
    check(fixture(source,speech,'<b>'+speech+'</b>'),'C4');
    check(fixture(source,speech,'<b>'+source+'</b>'),'C4',true);
  }
});
test('NPS1 rules C5: N=2 both directions, sentence marks, commentary and accepted marks',()=>{
  check(fixture('בית גדול, ובית קטן','בית גדול ובית קטן.'),'C5');
  check(fixture('בית גדול, ובית קטן','בית גדול ובית קטן','<b>בית גדול ובית קטן.</b>'),'C5');
  check(fixture('בית גדול, ובית קטן','— בית גדול ובית קטן'),'C5');
  check(fixture('בית גדול, ובית קטן חצר גדולה.'),'C7',true);
  const f=fixture();check(f,'C5',false,[{kind:'punctuation',start:3,end:3,after:','}]);
});
test('NPS1 rules C6: real planner rejects short chunk created at its length cap',()=>{
  const g=fixture('ב'.repeat(178)+' גָדוֹל, וּבַיִת קָטָן');
  check(g,'C6');
  // A pre-existing identical short chunk must not hide a second new occurrence.
  const prefix='גָדוֹל, בית רחב שדה רחב ',h=fixture('ב'.repeat(178)+' גָדוֹל, וּבַיִת קָטָן');
  h.speech=prefix+h.speech;h.commentary=prefix+h.commentary;
  h.edit.start+=prefix.length;h.edit.end+=prefix.length;
  h.ctx=boundaryContext(h);h.sidecar={...h.sidecar,base:h.speech,commentary:h.commentary};
  check(h,'C6');
  check(fixture(),'C7',true);
});
test('NPS1 rules C7/C8: literal four-word context permits; quotation edge or abbreviation abstains',()=>{
  check(fixture(),'C7',true);
  check(fixture('גדול, ובית קטן'),'C8');
  check(fixture('בית גדול, ובית קטן','בית גדול ובית קטן','<b>בית גדול ובית</b> קטן'),'C8');
  check(fixture('בית גדול, בית קטן'),'C8');
  check(fixture('בית גדול, ובית קטן','בית גדול בית ק"טן','<b>בית גדול בית ק"טן</b>'),'C1');
});
const errors=JSON.parse(fs.readFileSync(new URL('./fixtures/nps1-boundary-errors.json',import.meta.url)));
for(const f of errors.filter(x=>x.id?.startsWith('R3-')||x.edit.provenance.page==='Sanhedrin/41a'))test('NPS1 rules real compiler/runtime/pause regression: '+(f.id||'R2-1'),()=>{
  const drops=[],p=f.edit.provenance;
  const compiled=segmentSidecar({source:f.source,commentary:f.commentary,speech:f.speech,aligned:alignPage([f.source])[0],page:p.page,segment:p.segment,sourceHash:p.source_sha256,onDrop:r=>drops.push(r)});
  assert.ok(!compiled?.edits.some(e=>e.start===f.edit.start&&e.after===f.edit.after));
  assert.ok(drops.some(d=>d.edit.start===f.edit.start&&/^C[2-6]$/.test(d.rule)));
  const stale={schema:1,source:f.source,commentary:f.commentary,base:f.speech,edits:[f.edit]};
  const rejected=[];assert.equal(nps1Speech(f.speech,stale,{...opts,onDrop:x=>rejected.push(x)}),f.speech);
  assert.equal(rejected.length,1);
  assert.deepEqual(pauseChunks(prepareForTTS(nps1Speech(f.speech,stale,opts))),f.beforePauseChunks);
  const page=JSON.parse(fs.readFileSync(new URL('../site/data/gemara/bsay/'+p.page+'.json',import.meta.url)));
  const current=page.nps1?.[p.segment];
  assert.ok(!current?.edits.some(e=>e.start===f.edit.start&&e.after===f.edit.after));
  assert.deepEqual(pauseChunks(prepareForTTS(nps1Speech(f.speech,current,opts))),f.beforePauseChunks);
});
