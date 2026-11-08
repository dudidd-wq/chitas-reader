// Speech only. Keep every original vowel; these overrides select stress, not a different lemma.
import { stressKey } from '../site/js/g2p.js';
const words = [
 'דַּוְקָא','דַוְקָא','דַּוְוקָא','דַוְוקָא','דְּדַוְקָא',
 'אֶלָּא','אֶלָא','וְאֶלָּא',
 'אֲפִילוּ','אֲפִלּוּ','וַאֲפִילוּ','וַאֲפִלּוּ','שֶׁאֲפִילוּ','שֶׁאֲפִלּוּ','דַּאֲפִילוּ','דַּאֲפִלּוּ',
];
const key=w=>stressKey(w).replace(/\u05BC/g,'');
const overrides=new Map([...words.map(w=>[key(w),1]),...['מַיִּין','וּמַיִּין','נוּקְבִין','דּוּכְרִין'].map(w=>[key(w),0])]);
export const curatedProseStress=w=>overrides.get(key(w))??null;
export function proseContext(text,family,onExpansion=()=>{}){
 if(family!=='tanya')return text;
 const bare=text.replace(/[\u0591-\u05C7]/g,'');
 // Do NOT expand שער מ״ד (chapter 44), רמ״ד (244), לַמֶ״ד, or a prefixed quotation like מִ״דְּבַר.
 if(!/מיין\s+נוקבין/.test(bare)&&!/מ["״]ן\s+ו["״]?מ["״]ד/.test(bare))return text;
 return text.replace(/[א-ת][א-ת\u0591-\u05C7"'״׳]*/g,w=>{
  const b=w.replace(/[\u0591-\u05C7]/g,''),m=/^(ו?)מ["״]([ןד])$/.exec(b);if(!m)return w;
  onExpansion();return(m[1]?'וּ':'')+'מַיִּין '+(m[2]==='ד'?'דּוּכְרִין':'נוּקְבִין');
 });
}

// Compatibility AYIN (ﬠ) is not decomposed by NFD; normalize Hebrew presentation forms in speech only.
export const proseSource = text => text.replace(/[\uFB1D-\uFB4F]/g, c => c.normalize('NFKD')).normalize('NFD').replace(/[\u200E\u200F\u202A-\u202E]/g, '').replace(/<[^>]+>/g, '');
