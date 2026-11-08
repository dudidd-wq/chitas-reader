// Speech only: preserve the displayed Siddur and all its omission/repetition/nusach rules.
import {markSectionLabels} from '../site/js/texts.js';
import {proseSource,curatedProseStress} from './prose-context.mjs';
import {letters,nuclei,stressKey,SHVA,DAGESH,FULLV,HATAMA} from '../site/js/g2p.js';
export const wordRE=/[א-ת][א-ת\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7"'״׳]*/g;
export const skeleton=w=>w.replace(/[^א-ת]/g,'');
export function siddurSpeechHtml(html){
 const stack=[];let out='';
 for(const t of markSectionLabels(html).match(/<[^>]*>|[^<]+/g)||[]){
  if(t[0]!=='<'){if(!stack.some(x=>x.drop))out+=t;continue;}
  const m=/^<(\/?)\s*([a-z0-9]+)/i.exec(t);if(!m)continue;const name=m[2].toLowerCase();
  if(m[1]){const at=stack.map(x=>x.name).lastIndexOf(name);if(at>=0)stack.splice(at);}
  else if(!/\/\s*>$/.test(t)&&!['br','hr','img','wbr'].includes(name))stack.push({name,drop:/\bdata-nr(?:\s|=|>)/.test(t)||/\bclass=["'][^"']*\bsid-in\b/.test(t)});
 }
 return proseSource(out.replace(/[\u0591-\u05AF\u05BD\u05C4\u05C5]/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&[a-z]+;/g,' '));
}
export function siddurRepairs(s){return s.replace(/יָדָים/g,'יָדַיִם');}
const key=w=>stressKey(w).replace(/\u05BC/g,'');
const curated=new Map([['שֶׁהֶחֱזַרְתָּ',1],['יָדַיִם',1],['הַלְלוּ',0],['אָבִינוּ',1],['וְאָבִינוּ',1],['בְּפִינוּ',1],['פִּינוּ',1]].map(([w,k])=>[key(w),k]));
// The rich rabbinic model labels even רַגְלַיִם / בְּפִינוּ Acc0. Preserve the verified -ayim dual stress.
export const siddurStress=w=>curated.get(key(w))??(/[ַָ]יִם$/.test(key(w))?1:curatedProseStress(w));
const points=L=>[...L.all].filter(c=>FULLV.has(c)||c===SHVA||c==='\u05C1'||c==='\u05C2');
/** Existing vowels / shin dots must agree. Optional dagesh is not a license to change the source. */
export function compatibleVowels(a,b){const A=letters(a),B=letters(b);return A.length===B.length&&A.every((l,i)=>l.ch===B[i].ch&&points(l).every(c=>B[i].all.includes(c))&&(!(l.ch==='ו'&&l.all.includes(DAGESH)&&!points(l).length)||(B[i].all.includes(DAGESH)&&!points(B[i]).length)));}
/** Fill only missing vowel/shin-dot marks; retain every existing mark. Never add arbitrary dagesh to partial words. */
export function fillMissingVowels(a,b){
 if(!compatibleVowels(a,b))return a;const A=letters(a),B=letters(b);
 const whole=!/[\u05B0-\u05BB\u05C7]/.test(a);
 if(A.some((l,i)=>l.all.includes(DAGESH)&&!B[i].all.includes(DAGESH)))return a;
 A.forEach((l,i)=>{if(whole&&!l.all.includes(DAGESH)&&B[i].all.includes(DAGESH))l.all+=DAGESH;if(!(l.ch==='ו'&&l.all.includes(DAGESH))&&![...l.all].some(c=>FULLV.has(c)||c===SHVA))l.all+=points(B[i]).filter(c=>FULLV.has(c)||c===SHVA).join('');
 if(l.ch==='ש'&&!/[\u05C1\u05C2]/.test(l.all))l.all+=points(B[i]).filter(c=>c==='\u05C1'||c==='\u05C2').join('');});
 return A.map(l=>l.ch+l.all).join('');
}
export function stampStress(w,k){const L=letters(w),n=nuclei(L);if(n.length<2||!Number.isInteger(k)||k<0||k>=n.length)return w;L[n[n.length-1-k].own].all+=HATAMA;return L.map(l=>l.ch+l.all).join('');}

/** Exact many-to-many consonant alignment. Dicta sometimes merges words across a closing curly quote.
 * Every split/merged group loses its morphology; never distribute a token's vowels/stress over other words. */
export function alignSiddurTokens(expected,tokens){
 let i=0,j=0,splits=0,merges=0;const aligned=[];
 while(i<expected.length&&j<tokens.length){const ai=i,bj=j;let a=expected[i++],b=skeleton(tokens[j++].word);
  while(a!==b){if(a.startsWith(b)&&j<tokens.length)b+=skeleton(tokens[j++].word);else if(b.startsWith(a)&&i<expected.length)a+=expected[i++];else return null;}
  if(i===ai+1&&j===bj+1)aligned.push(tokens[bj]);else{if(j>bj+1)splits++;if(i>ai+1)merges++;for(let k=ai;k<i;k++)aligned.push({word:expected[k],confident:false,options:[]});}
 }
 return i===expected.length&&j===tokens.length?{tokens:aligned,splits,merges}:null;
}

/** Piper's repeated ה/ח sequence is less reliable inside a long utterance.
 * Preserve the five correct vowels/stress; synthesize the natural Modeh-Ani clause separately. Display stays comma. */
export function siddurProsody(s){
 const words=[...s.matchAll(wordRE)];let out=s;
 for(let i=words.length-1;i>0;i--){const a=words[i-1],b=words[i];if(['וקים','וקיים'].includes(skeleton(a[0]))&&skeleton(b[0])==='שהחזרת'){
  const at=a.index+a[0].length,between=s.slice(at,b.index);if(/^,\s+$/.test(between))out=out.slice(0,at)+'.'+out.slice(at+1);
 }}return out;
}
