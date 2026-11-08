import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import crypto from'node:crypto';
import{rambamSource,rambamContext,rambamQatan,rambamStress,wordRE}from'../tools/rambam-pronunciation.mjs';
import{applyErrata}from'../site/js/texts.js';import{letters,textToIPA,stressKey}from'../site/js/g2p.js';import{stampStress}from'../tools/siddur-pronunciation.mjs';
const dir='site/data/rambam',files=fs.readdirSync(dir,{recursive:true}).filter(p=>p.endsWith('.json')&&p!=='index.json').sort(),errata=JSON.parse(fs.readFileSync('site/data/rambam-errata.json')).fixes,data=JSON.parse(fs.readFileSync('site/voice/stress-he.json'));
test('1.0.83: every original Rambam source field is byte-for-field unchanged',()=>{const all=files.map(f=>{const d=JSON.parse(fs.readFileSync(dir+'/'+f));delete d.say;return[dir+'/'+f,d]});assert.equal(crypto.createHash('sha256').update(JSON.stringify(all)).digest('hex'),'d1238c57409d6a8eb64fce06050229fc276dcc6cf250fd53e7ad1733ddb299ae');});
test('1.0.83: reviewed wall kamatz-katan and stress really change the phonemes, not the display',()=>{
 const trace=(w,primary)=>{const t=[];textToIPA(w,{data,...(primary?{accents:{primary}}:{}),trace:t});return t[0]};
 assert.equal(trace('כָּתְלוֹ').ipa,'katlˈo');const q=rambamQatan('כָּתְלוֹ'),primary=stampStress(q,rambamStress(q));assert.equal(trace(q,primary).ipa,'kotlˈo');assert.equal(trace(q,primary).src,'primary');
 assert.equal(trace('בַּכֹּתֶל').ipa,'bakotˈel');const p=stampStress('בַּכֹּתֶל',rambamStress('בַּכֹּתֶל'));assert.equal(trace('בַּכֹּתֶל',p).ipa,'bakˈotel');
 for(const w of ['הָיְתָה','אֵינוֹ'])assert.equal(rambamStress(w),0,w);assert.equal(rambamQatan('שָׁמְרוּ'),'שָׁמְרוּ');
 assert.equal(rambamSource('<b>ח</b> (ב) הַכֹּתֶל').replace(/\s+/g,' ').trim(),'ח הַכֹּתֶל');
});
test('1.0.83: astronomical ש״ס is 360 only in Kiddush Hachodesh, not a global dictionary rewrite',()=>{
 const s=rambamContext('עַד ש״ס וּמִש״ס מַעֲלוֹת','Sanctification_of_the_New_Month');assert.doesNotMatch(s,/ש״ס/);assert.match(s,/מֵאוֹת/);assert.equal(rambamContext('ש״ס','Neighbors'),'ש״ס');
});
test('1.0.83: all 15937 Rambam passages have speech; letters and existing corrected source vowels survive',()=>{
 let n=0,tags=0,unpointed=0,filled=0;
 for(const f of files){const d=JSON.parse(fs.readFileSync(dir+'/'+f)),[slug,chapter]=f.replace('.json','').split('/');assert.equal(d.say?.length,d.s.length,f);
 for(const[i,source]of d.s.entries()){const raw=applyErrata(source,errata[`${slug}.${chapter}.${i+1}`]).text,base=rambamContext(rambamSource(raw),slug).replace(wordRE,w=>rambamQatan(w)),A=letters(base),B=letters(d.say[i]);assert.equal(A.length,B.length,f+':'+i);A.forEach((l,j)=>{assert.equal(l.ch,B[j].ch,f);for(const c of l.all)if(/[\u05B0-\u05BC\u05C1\u05C2\u05C7]/.test(c))assert.ok(B[j].all.includes(c),f+' lost '+l.ch+c);});assert.ok(d.say[i].trim()||!base.trim(),f);tags+=d.say[i].split('\u05ab').length-1;
 if(!/[\u05B0-\u05BC]/.test(raw))for(const w of d.say[i].match(wordRE)||[])if(w.replace(/[^א-ת]/g,'').length>1&&!/["'״׳]/.test(w)){unpointed++;if(/[\u05B0-\u05BC\u05C7]/.test(w))filled++;}n++;}}
 assert.equal(files.length,1023);assert.equal(n,15937);assert.ok(tags>300000);assert.ok(filled/unpointed>.9,`${filled}/${unpointed}`);
});
