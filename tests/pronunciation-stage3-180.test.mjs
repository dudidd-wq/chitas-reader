import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import{siddurProsody,alignSiddurTokens,siddurSpeechHtml,siddurRepairs,compatibleVowels,fillMissingVowels,siddurStress}from'../tools/siddur-pronunciation.mjs';
import{prepareForTTS}from'../site/js/tts-prep.js';import{textToIPA,normalize,letters}from'../site/js/g2p.js';
const ROOT=new URL('../',import.meta.url).pathname,walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+'/'+e.name):[d+'/'+e.name]);
const files=walk('site/data/siddur').filter(f=>f.endsWith('.json')&&!f.endsWith('/index.json')).sort(),data=JSON.parse(fs.readFileSync(ROOT+'site/voice/stress-he.json'));
const trace=s=>{const m=prepareForTTS(s,{primaryStress:true}),tr=[];textToIPA(m.replace(/\u05AB/g,''),{data,accents:{primary:m},trace:tr});return tr;};
test('1.0.80: every original Siddur source field is identical; display/nusach was not edited',()=>{
 const original=files.map(f=>{const d=JSON.parse(fs.readFileSync(f));delete d.say;return[f,d];});assert.equal(crypto.createHash('sha256').update(JSON.stringify(original)).digest('hex'),'f11cb7682c5dc614b9b6e12b404e332016d032d07181f11bcf0f9580f99efc28');
});
test('1.0.80: speech sanitizer drops nested nonspoken markers/instructions, keeps prayer words',()=>{
 assert.equal(siddurSpeechHtml('(א) אָמֵן <span class="sid-in">הקהל <span lang="en">Cong</span></span> <span data-nr="1">אבג</span> תּוֹדָה').replace(/\s+/g,' ').trim(),'אָמֵן תּוֹדָה'.normalize('NFD'));
 assert.equal(siddurRepairs('יָדָים'),'יָדַיִם');assert.equal(siddurStress('שֶׁהֶחֱזַרְתָּ'),1);
});
test('1.0.80: gap filling is additive and refuses conflicting existing vowels',()=>{
 assert.equal(compatibleVowels('שגְּבֵנוּ','שַׂגְּבֵנוּ'),true);assert.equal(normalize(fillMissingVowels('שגְּבֵנוּ','שַׂגְּבֵנוּ')),normalize('שַׂגְּבֵנוּ'));
 assert.equal(fillMissingVowels('מֶלֶךְ','מָלַךְ'),'מֶלֶךְ');assert.equal(fillMissingVowels('מֶלֶךְ','סֵפֶר'),'מֶלֶךְ');assert.equal(fillMissingVowels('קוּם','קְוֵם'),'קוּם');
});
test('1.0.80: compiled Siddur has prayer-only speech, unchanged consonants, no accidental instruction labels',async()=>{
 globalThis.fetch=async p=>{try{return{ok:true,json:async()=>JSON.parse(fs.readFileSync(ROOT+'site/'+p))};}catch{return{ok:false};}};
 const{buildSiddurDoc}=await import('../site/js/texts.js');let n=0;
 for(const f of files){const d=JSON.parse(fs.readFileSync(f)),book=f.split('/').at(-2),num=+f.split('/').at(-1).replace('.json',''),doc=await buildSiddurDoc(book,num);
 for(const b of doc.blocks){if(!['p','table'].includes(b.type)||/x\d+$/.test(b.id))continue;const i=b.id.split('-').at(-1),say=d.say[i];
 const html=b.type==='table'?b.rows.flatMap(r=>r.filter(c=>c.k==='p').map(c=>c.html)).join(', '):b.text;
 const sk=x=>x.replace(/[^א-ת]/g,'');const original=siddurRepairs(siddurSpeechHtml(html));if(!/[א-ת]/.test(original))continue;assert.ok(say,b.id);assert.doesNotMatch(say,/[A-Za-z<>]|[\u0591-\u05AA\u05AC-\u05AF]/);assert.equal(sk(say),sk(original),b.id);const A=letters(original),B=letters(say);assert.equal(A.length,B.length,b.id);A.forEach((l,j)=>{for(const mark of l.all)if(/[\u05B0-\u05BC\u05BF\u05C1\u05C2\u05C7]/.test(mark))assert.ok(B[j].all.includes(mark),b.id+' lost vowel/point '+l.ch+mark);});n++;}}
 assert.equal(n,1994);
});
test('1.0.80: modeh ani stress and netilat yadayim are corrected in the compiled IPA',()=>{
 const d=JSON.parse(fs.readFileSync(ROOT+'site/data/siddur/boker/1.json')),tr=trace(Object.values(d.say).join(' '));
 for(const[word,ipa]of [['שֶׁהֶחֱזַרְתָּ','ʃeheχezˈaʁta'],['יָדַיִם','jadˈajim'],['בְּפִינוּ','befˈinu']]){const h=tr.filter(t=>normalize(t.word)===normalize(word));assert.ok(h.length,word);assert.ok(h.every(t=>t.ipa===ipa&&t.src==='primary'),JSON.stringify(h));}
 assert.equal(textToIPA('הָיְתָה אֵינוֹ',{data}),'hajtˈa ʔejnˈo');
});

test('1.0.80: exact quote-boundary token merges lose morphology without shifting subsequent words',()=>{
 const t=[{word:'כהן"ותגלה',options:[{w:'bad'}]},{word:'ותראה',options:[{w:'good'}]}],a=alignSiddurTokens(['כהן','ותגלה','ותראה'],t);
 assert.equal(a.merges,1);assert.deepEqual(a.tokens.slice(0,2).map(x=>x.options),[[],[]]);assert.deepEqual(a.tokens[2],t[1]);assert.equal(alignSiddurTokens(['כהן','ותגלה','ותראה'],[{word:'כהניםותגלה'},t[1]]),null);
});

test('1.0.80: curated Siddur stress refuses known rabbinic Acc0 errors on duals and our-father suffix',()=>{
 for(const w of ['אָבִינוּ','בְּפִינוּ','רַגְלַיִם','הָעַרְבָּיִם','שָׁמַיִם'])assert.equal(siddurStress(w),1,w);
 const d=JSON.parse(fs.readFileSync(ROOT+'site/data/siddur/shema/1.json'));assert.ok(trace(Object.values(d.say).join(' ')).some(t=>normalize(t.word)===normalize('אָבִינוּ')&&t.ipa==='ʔavˈinu'&&t.src==='primary'));
});

test('1.0.80: compiled prayer speech is stable across instruction languages, repeats and hidden sections',async()=>{
 globalThis.fetch=async p=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(ROOT+'site/'+p))});const{buildSiddurDoc}=await import('../site/js/texts.js');
 const he=await buildSiddurDoc('boker',5),en=await buildSiddurDoc('boker',5,{lang:'en'}),both=await buildSiddurDoc('boker',5,{lang:'both'});
 const says=d=>d.blocks.filter(b=>b.type==='p').map(b=>[b.id,b.say]);assert.deepEqual(says(he),says(en));assert.deepEqual(says(he),says(both));assert.ok(he.blocks.some(b=>b.rep&&b.say),'repeated prayers keep the same speech layer');
 const normal=await buildSiddurDoc('shacharit',4),hidden=await buildSiddurDoc('shacharit',4,{hideNoTachanun:true}),hiddenIds=new Set(hidden.blocks.map(b=>b.id));assert.ok(hidden.blocks.length<normal.blocks.length);assert.ok(normal.blocks.some(b=>b.type==='p'&&b.say&&!hiddenIds.has(b.id)));for(const b of hidden.blocks.filter(b=>b.say))assert.equal(b.say,normal.blocks.find(x=>x.id===b.id).say);
});

test('1.0.81: Modeh Ani acoustic clause repair keeps chataf/shva/dagesh and exact primary stress',()=>{
 const d=JSON.parse(fs.readFileSync(ROOT+'site/data/siddur/boker/1.json')),s=d.say[1];assert.match(s,/ם\. ש/);const m=prepareForTTS(s,{primaryStress:true});assert.ok(m.includes('. '));assert.ok(trace(s).some(t=>normalize(t.word)===normalize('שֶׁהֶחֱזַרְתָּ')&&t.ipa==='ʃeheχezˈaʁta'&&t.src==='primary'));
 assert.equal(siddurProsody('וְקַיָּם, שֶׁהֶחֱזַרְתָּ'),'וְקַיָּם. שֶׁהֶחֱזַרְתָּ');assert.equal(siddurProsody('וְקַיָּם, כָּל הָעוֹלָם'),'וְקַיָּם, כָּל הָעוֹלָם');
});
