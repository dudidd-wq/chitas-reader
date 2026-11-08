// Speech only; the Torah Or / Likkutei Torah source and displayed edition remain untouched.
import {siddurSpeechHtml,siddurStress,wordRE,skeleton,stampStress} from './siddur-pronunciation.mjs';
import {withPrefix} from '../site/js/tts-prep.js';
import {stressKey,letters,SHVA} from '../site/js/g2p.js';
export {wordRE,skeleton};
const knownTerms=new Map([['אַבָּא',1],['אִמָּא',1],['חָכְמָה',0],['בִּינָה',0],['חֶסֶד',1],['גְּבוּרָה',0],['נֶצַח',1],['דַּעַת',1],['תִּפְאֶרֶת',1],['יְסוֹד',0],['זְעֵיר',0],['אַנְפִּין',0]].map(([w,k])=>[stressKey(w).replace(/\u05BC/g,''),k]));
for(const[w,k]of [...knownTerms])for(const p of ['ו','ב','ל','מ','כ','ש','ה','ד','וד','וב','ול','ומ','שה','שד','הד']){knownTerms.set(stressKey(withPrefix(p,w)).replace(/\u05BC/g,''),k);if(p.endsWith('ד'))knownTerms.set(stressKey(withPrefix(p.slice(0,-1),'דְּ'+w)).replace(/\u05BC/g,''),k);}
export const reviewedStress=w=>knownTerms.get(stressKey(w).replace(/\u05BC/g,''))??siddurStress(w);
export function toltSource(html){return siddurSpeechHtml(html.replace(/<span\b[^>]*class=["'][^"']*\bdaf\b[^"']*["'][^>]*>[\s\S]*?<\/span>/g,' ').replace(/^\s*<b>\(?[א-ת][.)]?<\/b>\s+/,' '));}
const pref={'':'',ו:'וּ',ד:'דְּ',ל:'לִ',ב:'בִּ',מ:'מִ',כ:'כִּ',ש:'שֶׁ',ה:'הַ',וד:'וּדְּ',וב:'וּבִּ',ול:'וּלִ',ומ:'וּמִ',שה:'שֶׁהַ',שד:'שֶׁדְּ',הד:'הַדְּ'};
export function toltContext(text,onExpansion=()=>{}){
 const bare=text.replace(/[\u0591-\u05C7]/g,''),kab=/אצי|מלכות|נוק|פרצוף|מוחין|אימא|אבא|ספיר|מדות|מידות|זעיר|אנפין|קוין|קווין|קווים|חח["״]ן|דז["״]א|נה["״]י|או["״]א/.test(bare);
 return text.replace(wordRE,w=>{const b=w.replace(/[\u0591-\u05C7]/g,'').replace(/״/g,'"').replace(/׳/g,"'"),m=/^([ודלבמכשה]{0,2})(ז"א|חח"ן|בג"ה|דת"י)$/.exec(b);if(!m||pref[m[1]]===undefined)return w;
 const[p,body]=[m[1],m[2]];if(body==='ז"א'&&!p.includes('ד')&&!kab)return w;if(body!=='ז"א'&&!kab)return w;
 const out=body==='ז"א'?'זְעֵיר אַנְפִּין':body==='חח"ן'?'חָכְמָה חֶסֶד נֶצַח':body==='בג"ה'?'בִּינָה גְּבוּרָה הוֹד':'דַּעַת תִּפְאֶרֶת יְסוֹד';onExpansion(b,out);return body==='ז"א'&&p.endsWith('ד')?withPrefix(p.slice(0,-1),'דְּ'+out):withPrefix(p,out);
 });
}

export function toltHasGap(w){if(/["'״׳]/.test(w)||skeleton(w).length<2)return false;const L=letters(w);if(!/[\u05B0-\u05BC\u05C7]/.test(w))return true;return L.some((l,i)=>l.ch==='ש'&&!/[\u05C1\u05C2]/.test(l.all)||i<L.length-1&&!/[אהוי]/.test(l.ch)&&!l.all&&!(L[i+1]?.ch==='ו'&&/[\u05B9\u05BA\u05BC]/.test(L[i+1].all))||l.ch==='י'&&!l.all&&(L[i+1]?.all.includes(SHVA)||L[i-1]?.all.includes(SHVA)));}

// Post-morphology expansion: never confuse chapter 44 or מאן דאמר with the water imagery.
export function toltWaterContext(text,onExpansion=()=>{}){
 return text.replace(wordRE,(w,offset)=>{const b=w.replace(/[\u0591-\u05C7]/g,'').replace(/״/g,'"'),m=/^([והבשד]?)(מ"[ןד])$/.exec(b);if(!m)return w;
 const before=text.slice(0,offset).replace(/[\u0591-\u05C7]/g,''),after=text.slice(offset+w.length).replace(/[\u0591-\u05C7]/g,''),around=before.slice(-160)+' '+after.slice(0,160);
 if((before.match(/\(/g)||[]).length>(before.match(/\)/g)||[]).length)return w;
 if(/(?:דף|שער|פרק|סימן|עמוד|תיקון|אות|פסוק|הלכה|משנה|סי[׳']|פ[׳'])\s*$/.test(before)||!/(?:העלאת|המשכת|שפע|מים|מיין|נוקבין|דוכרין|מ["״]ן)/.test(around))return w;
 const body=withPrefix(m[1],'מַיִּין')+' '+(m[2].endsWith('ד')?'דּוּכְרִין':'נוּקְבִין');onExpansion();return body.replace(wordRE,w=>stampStress(w,0));
 });
}

// A second speech-only pass covers compound clitics and stronger abbreviated Kabbalah anchors.
// Kept after morphology so it cannot shift any cached token alignment.
export function toltLateContext(text,onExpansion=()=>{}){
 const bare=text.replace(/[\u0591-\u05C7]/g,''),kab=/אצי|מלכות|נוק|פרצוף|מוחין|אימא|אמא|אבא|ספיר|מדות|מידות|זעיר|אנפין|קוין|קווין|קווים|חח["״]ן|נה["״]י|או["״]א|סוכ["״]ע|יסוד|כתר|עתיק|בינה|חכמה|מל[׳']/.test(bare);if(!kab)return text;
 return text.replace(wordRE,w=>{const b=w.replace(/[\u0591-\u05C7]/g,'').replace(/״/g,'"'),m=/^([ודלבמכשה]{0,4})ז"א$/.exec(b);if(!m)return w;const p=m[1],body=p.endsWith('ד')?withPrefix(p.slice(0,-1),'דְּזְעֵיר אַנְפִּין'):withPrefix(p,'זְעֵיר אַנְפִּין');onExpansion();return body.replace(wordRE,w=>stampStress(w,0));});
}

// Reviewed speech-only completion; never replace a supplied vowel or infer a source repair from ASR.
export function toltReviewedSpeech(text,onFill=()=>{}){
 const bare=text.replace(/[\u0591-\u05C7]/g,'');
 // Toldot's same paragraph repeats ח״ע and explicitly identifies it as חכמה עילאה below.
 if(/ח["״]ע/.test(bare)&&/דאצילות/.test(bare))text=text.replace(/(^|\s)ח,ע(?=\s)/g,'$1חָכְמָ֫ה עִלָּאָ֫ה');
 const safe={התורה:'הַתּוֹרָ֫ה'};
 return text.replace(wordRE,w=>{const b=w.replace(/\u05AB/g,'');if(safe[b]){onFill();return safe[b];}return w;});
}
