// Speech-only Rambam context and reviewed pronunciation. Original edition/nusach stays untouched.
import {siddurSpeechHtml,siddurStress,wordRE,skeleton,stampStress} from './siddur-pronunciation.mjs';
import {letters,stressKey,QAMATZ,QAMATZ_KATAN,SHVA,HOLAM,SEGOL,FULLV} from '../site/js/g2p.js';
import {niqqudForTTS} from '../site/js/niqqud.js';
import {numberWords,withPrefix} from '../site/js/tts-prep.js';
export {wordRE,skeleton};
export const rambamSource=html=>niqqudForTTS(siddurSpeechHtml(html));
export function rambamContext(text,slug,onExpansion=()=>{}){
 if(slug!=='Sanctification_of_the_New_Month')return text;
 // In these astronomical calculations ש״ס means 360, never the Talmud. Elsewhere retain shared rules.
 return text.replace(wordRE,w=>{const b=w.replace(/[\u0591-\u05C7]/g,'').replace(/״/g,'"'),m=/^([ובמכל]{0,2})(ש"ס)$/.exec(b);if(!m)return w;onExpansion();const L=letters(w),prefix=m[1]&&L.slice(0,m[1].length).some(l=>l.all)?L.slice(0,m[1].length).map(l=>l.ch+l.all).join(''):null,body=numberWords(360,'f');return prefix?prefix+body:withPrefix(m[1],body);});
}
export function rambamQatan(w,onRepair=()=>{}){
 const L=letters(w);for(let i=0;i<L.length-2;i++)if(L[i].ch==='כ'&&L[i].all.includes(QAMATZ)&&L[i+1].ch==='ת'&&L[i+1].all.includes(SHVA)&&L[i+2].ch==='ל'){
  L[i].all=L[i].all.replace(QAMATZ,QAMATZ_KATAN);onRepair();
 }return L.map(l=>l.ch+l.all).join('');
}
export function rambamStress(w){
 const L=letters(w),key=stressKey(w).replace(/\u05BC/g,'');
 if(['הָיְתָה','אֵינוֹ','וְהָיְתָה','וְאֵינוֹ'].map(x=>stressKey(x)).includes(key))return 0;
 if(L.length>=4){const a=L.at(-4),b=L.at(-3),c=L.at(-2),d=L.at(-1);if(a.ch==='כ'&&/[ָׇ]/.test(a.all)&&b.ch==='ת'&&b.all.includes(SHVA)&&c.ch==='ל'&&d.ch==='ו'&&d.all.includes(HOLAM))return 0;}
 // Segolate כֹּתֶל and its clitics: בַּכֹּתֶל / בְּכֹתֶל are penultimate, unlike suffixed כָּתְלוֹ.
 if(L.length>=3){const a=L.at(-3),b=L.at(-2),c=L.at(-1);if(a.ch==='כ'&&a.all.includes(HOLAM)&&b.ch==='ת'&&b.all.includes(SEGOL)&&c.ch==='ל'&&![...c.all].some(x=>FULLV.has(x)))return 1;}
 return siddurStress(w);
}
