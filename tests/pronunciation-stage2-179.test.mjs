import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { normalize, textToIPA } from '../site/js/g2p.js';
import { prepareForTTS } from '../site/js/tts-prep.js';
import { proseContext, curatedProseStress, proseSource } from '../tools/prose-context.mjs';
const ROOT=new URL('../',import.meta.url).pathname;
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+'/'+e.name):[d+'/'+e.name]);
const files=[...walk('site/data/tanya'),...walk('site/data/ravyomi/s')].filter(f=>f.endsWith('.json')&&!f.endsWith('/index.json')).sort();
const data=JSON.parse(fs.readFileSync(ROOT+'site/voice/stress-he.json'));
test('1.0.79: Kehot display text and all original vowels are unchanged',()=>{
 const fields=files.map(f=>{const d=JSON.parse(fs.readFileSync(f));return[f,d.s,d.title];});
 assert.equal(crypto.createHash('sha256').update(JSON.stringify(fields)).digest('hex'),'9ea77a945b1c28f4d08b945e0f3058c99c1455c8be39ffa5adfee6714118b872');
});
test('1.0.79: every Tanya and Halacha paragraph has parallel speech, preserving vowels exactly',()=>{
 let n=0;for(const f of files){const d=JSON.parse(fs.readFileSync(f)),family=f.includes('/tanya/')?'tanya':'halacha';assert.equal(d.say.length,d.s.length,f);
 const check=(raw,say)=>{assert.ok(say);assert.doesNotMatch(say,/<|>|https?:/);assert.equal(normalize(say.replace(/\u05AB/g,'')),normalize(proseContext(proseSource(raw),family)),f);n++;};
 d.s.forEach((s,i)=>typeof s==='string'?check(s,d.say[i]):(assert.equal(s.length,d.say[i].length),s.forEach((p,j)=>check(p,d.say[i][j]))));}
 assert.equal(n,3986);
});
test('1.0.79: reviewed stress fixes cover pointed spellings, never blindly change other words',()=>{
 for(const w of ['דַּוְקָא','דַוְקָא','דַּוְוקָא','דְּדַוְקָא','אֶלָּא','אֶלָא','אֲפִילוּ','אֲפִלּוּ','דַּאֲפִלּוּ'])assert.equal(curatedProseStress(w),1,w);
 assert.equal(curatedProseStress('הָיְתָה'),null);assert.equal(curatedProseStress('אֵינוֹ'),null);assert.equal(textToIPA('הָיְתָה אֵינוֹ',{data}),'hajtˈa ʔejnˈo');
});
test('1.0.79: מיין דוכרין expansion is contextual, not chapter 44 or letter lamed',()=>{
 assert.equal(proseContext('שער מ״ן ומ״ד','tanya'),'שער מַיִּין נוּקְבִין וּמַיִּין דּוּכְרִין');
 for(const s of ['עץ חיים שער מ״ד פרק ג׳','סימן רמ״ד','לַמֶ״ד','מִ״דְּבַר ה׳״'])assert.equal(proseContext(s,'tanya'),s);
 assert.equal(proseContext('שער מ״ן ומ״ד','halacha'),'שער מ״ן ומ״ד');
 const d=JSON.parse(fs.readFileSync(ROOT+'site/data/tanya/KA/2.json'));assert.match(d.say[1].replace(/\u05AB/g,''),/דּוּכְרִין/);
 const tr=[];const marked=prepareForTTS(d.say[1],{primaryStress:true});textToIPA(marked.replace(/\u05AB/g,''),{data,accents:{primary:marked},trace:tr});assert.ok(tr.some(t=>t.ipa==='duχʁˈin'&&t.src==='primary'));
});
test('1.0.79: verified corrections are explicit in actual compiled corpus IPA',()=>{
 const ps=[...JSON.parse(fs.readFileSync(ROOT+'site/data/tanya/KA/2.json')).say,...JSON.parse(fs.readFileSync(ROOT+'site/data/ravyomi/s/265.json')).say.flat()];
 const tr=[];for(const p of ps){const m=prepareForTTS(p,{primaryStress:true});textToIPA(m.replace(/\u05AB/g,''),{data,accents:{primary:m},trace:tr});}
 for(const [word,ipa]of [['דַּוְקָא','dˈavka'],['אֶלָּא','ʔˈela'],['אֲפִלּוּ','ʔafˈilu']]){const hits=tr.filter(t=>normalize(t.word)===normalize(word));assert.ok(hits.length,word);assert.ok(hits.every(t=>t.ipa===ipa&&t.src==='primary'),JSON.stringify(hits));}
});

test('1.0.79: compatibility ayin is restored for speech, not discarded as a word boundary',()=>{assert.equal(proseSource('מְמוּﬠָטִין'), 'מְמוּעָטִין'.normalize('NFD'));assert.equal(proseSource('כּוּל\u200fוֹ'),'כּוּלוֹ'.normalize('NFD'));});
