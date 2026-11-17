import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {addPointingAt,applyManifest,sha} from '../tools/engine-cov-1b.mjs';
import {prepareForTTS} from '../site/js/tts-prep.js';import {textToIPA} from '../site/js/g2p.js';
const root=new URL('../',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('../tools/engine-cov-1b-manifest.json',import.meta.url)));
// Author-written mechanical fixture; these asserted evidence fields are mocks,
// not source/licence certification or a production-approved occurrence.
const fixture=(before='עם הקוצים היה מייסרם ומשברם:',old='עם',next='עִם')=>{
 const start=before.indexOf(old),end=start+old.length,after=before.slice(0,start)+next+before.slice(end);
 return {before_sha256:sha(before),after_sha256:sha(after),start,end,old,new:next,unicode_start:[...before.slice(0,start)].length,unicode_end:[...before.slice(0,end)].length,hebrew_letter_start:(before.slice(0,start).match(/[א-ת]/g)||[]).length,language:'hebrew-prose',protected:false,source_license:'Public Domain',annotation_terms_sha256:'a'.repeat(64),gold_status:'development-resolved',intended_ipa:'ʔim',actual_ipa:'ʔim',preparation_preserves_added_marks:true,mapping:{unique:true,whole_sequence_exact:true,raw_to_request_proven:true},quote_scope:'clear'};
};
test('ENGINE-COV-1B development context: instrumental עם differs from people עַם',()=>{
 const d=JSON.parse(fs.readFileSync(new URL('../site/data/nach/Judges/8.json',import.meta.url)));
 assert.equal(d.e[15][0],'<b>וידע בהם.</b> עם הקוצים היה מייסרם ומשברם:');
 const before='עם הקוצים היה מייסרם ומשברם:';assert.equal(addPointingAt(before,fixture()),'עִם הקוצים היה מייסרם ומשברם:');
 // The engine explicitly marks even a monosyllable; gold omits redundant stress.
 assert.equal(textToIPA(prepareForTTS('עִם',{stress:true})).replace('ˈ',''),'ʔim');
 assert.notEqual(textToIPA('עַם').replace('ˈ',''),'ʔim');
});
test('ENGINE-COV-1B refuses missing/stale hashes and coordinate shifts',()=>{
 const b='עם הקוצים היה מייסרם ומשברם:';for(const r of [{...fixture(),before_sha256:null},{...fixture(),before_sha256:'0'.repeat(64)},{...fixture(),start:1},{...fixture(),unicode_start:1},{...fixture(),hebrew_letter_start:1},{...fixture(),after_sha256:null}])assert.throws(()=>addPointingAt(b,r));
});
test('ENGINE-COV-1B confidence and every Acc spelling grant no permission',()=>{
 const b='עם הקוצים היה מייסרם ומשברם:';for(const acc of ['Acc0','Acc1','AccUnk','Acc0Acc1','Acc2',null])assert.throws(()=>addPointingAt(b,{...fixture(),acc,confidence_status:'missing',gold_status:'unknown'}));
 assert.throws(()=>addPointingAt(b,{...fixture(),annotation_terms_sha256:null}));
});
test('ENGINE-COV-1B denies ambiguous repeats, mapping gaps and protected language',()=>{
 const b='עם הקוצים היה מייסרם ומשברם:';
 for(const r of [{...fixture(),mapping:{unique:false}},{...fixture(),mapping:null},{...fixture(),protected:true},{...fixture(),language:'Aramaic'},{...fixture(),language:'unknown'}])assert.throws(()=>addPointingAt(b,r));
 const repeated='עם עם';assert.throws(()=>addPointingAt(repeated,{...fixture(repeated),mapping:{unique:false,whole_sequence_exact:true,raw_to_request_proven:true}}));
});
test('ENGINE-COV-1B denies quotes, nested/malformed scope, abbreviation, entity and numerals',()=>{
 for(const s of ['"עם"','עם "מלה','עם (מלה [מלה])','עם ר״ל','עם &amp;','עם 12','עם <b>מלה</b>','עם ׳מלה׳'])assert.throws(()=>addPointingAt(s,fixture(s)));
 assert.throws(()=>addPointingAt('עם הקוצים היה מייסרם ומשברם:',{...fixture(),quote_scope:'unknown'}));
});
test('ENGINE-COV-1B preserves matres/final letters, punctuation and all existing marks',()=>{
 for(const next of ['עִמ','עִים','עִם֫','עִםֽ','עִם|','עִם,','עִם '])assert.throws(()=>addPointingAt('עם הקוצים היה מייסרם ומשברם:',fixture(undefined,undefined,next)));
 for(const old of ['עִם','עּם','ע֫ם','עׁם'])assert.throws(()=>addPointingAt(old,fixture(old,old,'עִם')));
});
test('ENGINE-COV-1B denies unresolved Israeli shva/stop preparation or differing IPA',()=>{
 const b='עם הקוצים היה מייסרם ומשברם:';assert.throws(()=>addPointingAt(b,{...fixture(),preparation_preserves_added_marks:false}));assert.throws(()=>addPointingAt(b,{...fixture(),actual_ipa:'ʔam'}));
 // Current initial-shva/stop outputs are observed controls, not a new correction rule.
 assert.notEqual(textToIPA('זְמַן'),textToIPA('זמַן'));
 assert.notEqual(textToIPA('בָר'),textToIPA('בָּר'));
});
test('ENGINE-COV-1B frozen accepted population is bounded, deterministic and byte-idempotent',()=>{
 const before=manifest.pins.map(p=>sha(fs.readFileSync(new URL('../'+p.path,import.meta.url))));
 assert.equal(manifest.approved.length,158);assert.equal(manifest.status,'REVIEW_CANDIDATE');
 assert.deepEqual(applyManifest(root,manifest),{approved:158,files_written:0});assert.deepEqual(applyManifest(root,manifest),{approved:158,files_written:0});
 assert.deepEqual(manifest.pins.map(p=>sha(fs.readFileSync(new URL('../'+p.path,import.meta.url)))),before);
 assert.throws(()=>applyManifest(root,{...manifest,approved:[{id:'invented',path:'site/data/nachv/Joshua/15.json'}]}));
 assert.throws(()=>applyManifest(root,{...manifest,base:'stale'}));
 assert.throws(()=>applyManifest(root,{...manifest,pins:[{...manifest.pins[0],before_sha256:'0'.repeat(64),after_sha256:'0'.repeat(64)}]}));
});

test('ENGINE-COV-1B reverses only frozen say additions to exact original file hashes',()=>{
 for(const pin of manifest.pins){
  const edits=manifest.approved.filter(r=>r.path===pin.path);if(!edits.length)continue;
  const d=JSON.parse(fs.readFileSync(new URL('../'+pin.path,import.meta.url)));
  assert.equal(sha(JSON.stringify(d)),pin.after_sha256);
  for(const r of edits.slice().reverse()){
   const [,a,b]=/^say\[(\d+)\]\[(\d+)\]$/.exec(r.field);const after=d.say[+a][+b];
   assert.equal(sha(after),r.after_sha256);assert.equal(after.slice(r.start,r.start+r.new.length),r.new);
   const before=after.slice(0,r.start)+r.old+after.slice(r.start+r.new.length);
   assert.equal(sha(before),r.before_sha256);assert.equal(addPointingAt(before,r),after);
   assert.equal(r.new.replace(/[\u05B0-\u05BC\u05C1\u05C2\u05C7]/gu,''),r.old);
   assert.equal(/[^א-ת]/u.test(r.old),false);assert.equal(/[\u0591-\u05AF\u05BD|]/u.test(r.new),false);
   d.say[+a][+b]=before;
  }
  assert.equal(sha(JSON.stringify(d)),pin.before_sha256);
 }
});
test('ENGINE-COV-1B all accepted words match frozen intended Israeli phonemes in full utterances',()=>{
 const stress=JSON.parse(fs.readFileSync(new URL('../site/voice/stress-he.json',import.meta.url)));
 for(const r of manifest.approved){
  const d=JSON.parse(fs.readFileSync(new URL('../'+r.path,import.meta.url))),[,a,b]=/^say\[(\d+)\]\[(\d+)\]$/.exec(r.field);
  const p=prepareForTTS(d.say[+a][+b],{stress:true,divineName:'hashem',primaryStress:true}),trace=[];
  textToIPA(p.replace(/\u05AB/g,''),{data:stress,havara:'israeli',accents:{primary:p},trace});
  const hits=trace.filter(t=>t.word.normalize('NFD')===r.new.normalize('NFD'));
  assert.equal(hits.length,1);assert.equal(hits[0].ipa,r.gold.intended_israeli_ipa);
  assert.equal(r.source_license,'Public Domain');assert.equal(r.gold.status,'development-resolved');
  assert.equal(r.mapping.unique,true);assert.equal(r.mapping.whole_sequence_exact,true);
 }
});
