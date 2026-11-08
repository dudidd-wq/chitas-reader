import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import crypto from'node:crypto';
import{toltSource,toltContext,reviewedStress,toltHasGap,toltWaterContext,toltLateContext,toltReviewedSpeech}from'../tools/tolt-pronunciation.mjs';import{letters,normalize,textToIPA}from'../site/js/g2p.js';import{prepareForTTS}from'../site/js/tts-prep.js';
const files=fs.readdirSync('site/data/tolt/w').filter(x=>x.endsWith('.json')).sort().map(x=>'site/data/tolt/w/'+x),data=JSON.parse(fs.readFileSync('site/voice/stress-he.json'));
test('1.0.81: every pre-existing Torah Or/Likkutei Torah source field remains identical',()=>{const all=files.map(f=>{const d=JSON.parse(fs.readFileSync(f));for(const day of d.days)for(const p of day||[])delete p.say;return[f,d];});assert.equal(crypto.createHash('sha256').update(JSON.stringify(all)).digest('hex'),'b6453b7e466b35febce1915c06161e8a8f9c5f10a1611dcfd546908815776ec2');});
test('1.0.81: corpus-aware abbreviations, prefixes and omitted markers',()=>{
 assert.equal(toltSource('<b>ב</b> (א) תּוֹרָה <span class="daf" aria-hidden="true">[לז ב]</span> אוֹר').replace(/\s+/g,' ').trim(),normalize('תּוֹרָה אוֹר'));
 assert.match(normalize(toltContext('המידות דז״א')),new RegExp(normalize('דְּזְעֵיר אַנְפִּין')));assert.match(normalize(toltContext('חח״ן קו ימין ובג״ה קו שמאל ודת״י באמצע')),new RegExp(normalize('חָכְמָה חֶסֶד נֶצַח')));
 assert.match(normalize(toltContext('חח״ן קו ימין ובג״ה קו שמאל ודת״י באמצע')),new RegExp(normalize('וּבִינָה גְּבוּרָה הוֹד')));assert.match(normalize(toltContext('חח״ן קו ימין ובג״ה קו שמאל ודת״י באמצע')),new RegExp(normalize('וְדַעַת תִּפְאֶרֶת יְסוֹד')));
 assert.equal(toltContext('ז״א כלומר זאת אומרת'),'ז״א כלומר זאת אומרת');assert.equal(toltContext('שער מ״ד'), 'שער מ״ד');
 for(const w of ['קָדוֹשׁ','דְּרוֹמִית','גְּבוּרָה'])assert.equal(toltHasGap(w),false,w);for(const w of ['מִשגָּב','לְידְעֶיךָ','שגְּבֵנוּ','ישראל'])assert.equal(toltHasGap(w),true,w);
 assert.equal(reviewedStress('אִמָּא'),1);assert.equal(reviewedStress('דְּזְעֵיר'),0);assert.equal(reviewedStress('תִּפְאֶרֶת'),1);
});
test('1.0.81: all 8148 passages have compiled speech, preserving every original prayer letter/vowel',()=>{let n=0,filled=0,tags=0;for(const f of files)for(const day of JSON.parse(fs.readFileSync(f)).days)for(const p of day||[]){assert.ok(p.say,f);const base=toltReviewedSpeech(toltLateContext(toltWaterContext(toltContext(toltSource(p.t))))),A=letters(base),B=letters(p.say);assert.equal(A.length,B.length,f);assert.equal(base.replace(/[^א-ת]/g,''),p.say.replace(/[^א-ת]/g,''),f);A.forEach((l,i)=>{for(const c of l.all)if(/[\u05B0-\u05BC\u05BF\u05C1\u05C2\u05C7]/.test(c))assert.ok(B[i].all.includes(c),f+' lost '+l.ch+c);});assert.doesNotMatch(p.say,/[<>A-Za-z]/);tags+=p.say.split('\u05AB').length-1;if(base.replace(/\u05AB/g,'')!==p.say.replace(/\u05AB/g,''))filled++;n++;}assert.equal(n,8148);assert.ok(tags>100000);assert.ok(filled>100);});

test('1.0.81: water abbreviations expand only with positive context, never citation 44',()=>{
 const s=toltWaterContext('העלאת מ״ן והמשכת מ״ד כמבואר בשער מ״ד (דף מ״ד)');assert.match(s.replace(/\u05AB/g,''),new RegExp(normalize('מַיִּין דּוּכְרִין')));assert.match(s,/שער מ״ד \(דף מ״ד\)/);assert.equal(toltWaterContext('ומ״ד סבר לה כרבי'),'ומ״ד סבר לה כרבי');
});

test('1.0.81: compound Kabbalistic clitics resolve, but ועל זה אמר is not zeir anpin',()=>{
 const s=toltLateContext('יסוד אבא מהז״א ושבז״א וכשהז״א ועז״א');assert.doesNotMatch(s,/מהז״א|שבז״א|כשהז״א/);assert.match(s,/ועז״א/);assert.equal(toltLateContext('ז״א כלומר זאת אומרת'),'ז״א כלומר זאת אומרת');
});

test('1.0.81: reviewed unpointed gaps and independently evidenced source abbreviation',()=>{
 assert.equal(toltReviewedSpeech('התורה הוא היא'),'הַתּוֹרָ֫ה הוא היא');
 assert.equal(toltReviewedSpeech('הַתּוֹרָה הִוא'),'הַתּוֹרָה הִוא');
 assert.match(toltReviewedSpeech('היא ח,ע דאצילות וח״ע'),/חָכְמָ֫ה עִלָּאָ֫ה/);
 assert.equal(toltReviewedSpeech('ח,ע מספר'),'ח,ע מספר');
});
