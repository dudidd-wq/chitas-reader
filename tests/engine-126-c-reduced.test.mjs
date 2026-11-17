import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { textToIPA, wordToIPA, HAVAROT } from '../site/js/g2p.js';
import { PiperSpeaker } from '../site/js/piper.js';
const data=JSON.parse(fs.readFileSync(new URL('../site/voice/stress-he.json',import.meta.url)));
const headHavara={...HAVAROT.chabad,holam:'ej'};
const norm=s=>s.replaceAll('oj','ej');

test('Task C reduced: holam oy edge cases, tsere ey unchanged',()=>{
 assert.equal(HAVAROT.chabad.holam,'oj'); assert.equal(HAVAROT.chabad.tsere,'ej');
 for(const [word,expected] of [['קוֹל','kˈojl'],['קֹל','kˈojl'],['מִצְוֺת','mitsvˈojs'],['וֹ','ˈoj'],['וֺ','vˈoj'],['גּוֹי','ɡˈoj'],['בֵּית','bˈejs']])
  assert.equal(wordToIPA(word,null,data,{havara:'chabad'}),expected,word);
 for(const word of ['הוֹוֶה','יוֹרְדִים','מִצְווֹת','לְלַוּוֹתוֹ','חַטֹּאותָי','צֹאונֵנוּ','הושִׁיעֵנוּ','אדמו״ר']) {
  const before=textToIPA(word,{data,havara:headHavara});
  const after=textToIPA(word,{data,havara:'chabad'});
  assert.equal(norm(after),norm(before),word);
 }
});

test('Task C reduced: siddur retains HEAD blanket milel and occurrence stress; only holam changes',()=>{
 const speaker=new PiperSpeaker({});
 speaker.load([{parts:['בָּרוּ֫ךְ אַתָּ֫ה מוֹדֶ֫ה תּוֹרָ֫ה קָ֫מָה קָמָ֫ה עִמָּ֫נוּ לָּ֫נוּ'],primaryParts:[true],pause:true}],{},{});
 for(const q of speaker.queue){
  const before=[],after=[];
  const opts={data,accents:q.acc,source:'siddur'};
  const a=textToIPA(q.text,{...opts,havara:headHavara,trace:before});
  const b=textToIPA(q.text,{...opts,havara:'chabad',trace:after});
  assert.equal(norm(b),norm(a));
  assert.deepEqual(after.map(x=>[x.word,x.k,x.src]),before.map(x=>[x.word,x.k,x.src]));
  assert.equal(b,textToIPA(q.text,{...opts,source:'tanya',havara:'chabad'}));
 }
 assert.equal(textToIPA('בָּרוּךְ אַתָּה תּוֹרָה',{data,havara:'chabad',source:'siddur'}),'bˈoʁuχ ˈato tˈojʁo');
});

test('Task C reduced: afilu requires boolean true, is Chabad-only and has no state leakage',()=>{
 for(const word of ['אֲפִלוּ','אֲפִלּוּ','אֲפִילוּ','אֲפִילּוּ','וַאֲפִילוּ','בַּאֲפִילוּ','שֶׁאֲפִילוּ','כַּאֲפִילוּ']){
  const opts={data,havara:'chabad'}; const off=textToIPA(word,opts);
  for(const value of [false,undefined,null,0,1,'true'])assert.equal(textToIPA(word,{...opts,afiluGemination:value}),off);
  assert.match(textToIPA(word,{...opts,afiluGemination:true}),/ll/);
  assert.equal(textToIPA(word,opts),off);
  assert.equal(textToIPA(word,{data,afiluGemination:true}),textToIPA(word,{data}));
 }
 for(const word of ['הִצִּילוּ','גִּלּוּ','אֵלּוּ','אֲפֵלוּ','אפילו','תַּאֲפִילוּ','אֲפִילוּת'])assert.equal(textToIPA(word,{data,havara:'chabad',afiluGemination:true}),textToIPA(word,{data,havara:'chabad'}));
 for(const file of ['app.js','piper.js','piper-core.js','piper-worker.js'])assert.doesNotMatch(fs.readFileSync(new URL('../site/js/'+file,import.meta.url),'utf8'),/afiluGemination/);
});
