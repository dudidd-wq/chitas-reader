// NPS1 policy C1-C8. Shared by the offline compiler and browser replay.
import { prepareForTTS, pauseChunks } from './tts-prep.js';
export const NPS1_CLASSES = Object.freeze({
  reset: ['אלא','ואלא','אבל','ברם','מיהו','אף','אפילו'],
  question: ['מאי','מאי טעמא','מאי איכא','והא','והתניא','ותו','אמאי','היכי','היכי דמי','מנא הני מילי'],
  conditional: ['אי','אי הכי','אי נמי','אילו','אם','אלא אם'],
  citation: ['דתניא','תניא','תנן','תנו רבנן','אמר','אמר ליה','אמר מר','דאמר','כדקאמר','דקתני','קתני','איתמר','שנאמר','דכתיב','כתיב'],
  inference: ['הוי','הוי אומר','הוי רישא','אלמא','שמע מינה','נמצא','השתא','הלכך','משום הכי','לפיכך','מכלל'],
  resolution: ['איבעית אימא','אלא מאי','לא קשיא','הכא במאי עסקינן','תיובתא'],
  deictic: ['השתא','הכא','התם','האידנא'],
  particle: ['נמי','קא','הא','לאו'],
  legacy: ["מעיקרא", "מכאן", "מהתם", "שאני", "כרחך", "כרחו", "כרחין", "זאת", "אלא", "אם", "אי", "אבל", "אף", "או", "לא", "לאו", "אל", "אין", "איני", "אינן", "אינו", "אינה", "איננו", "אילו", "אילולא", "אילולי", "אלמלא", "אלמלי", "לולא", "לולי", "כי", "וכי", "דכי", "דאי", "דילמא", "דלמא", "שמא", "גם", "רק", "אך", "אכן", "אטו", "הא", "הרי", "הן", "כן", "כך", "ככה", "הכי", "הכא", "התם", "כאן", "שם", "נמי", "עוד", "שוב", "כבר", "עדיין", "אכתי", "השתא", "מיהו", "מיהת", "ברם", "מכלל", "מכללא", "ממילא", "אדרבה", "אדרבא", "לפיכך", "לפום", "משום", "מפני", "מחמת", "למען", "כדי", "לכן", "לכך", "הלכך", "הילכך", "הלככך", "הואיל", "היות", "כאשר", "כשם", "כמו", "כגון", "כעין", "היכי", "היכא", "איכא", "ליכא", "אימתי", "אמאי", "למה", "מדוע", "מה", "מאי", "מי", "עד", "על", "פי", "אחר", "קודם", "לפני", "אחרי", "בכן", "ובכן", "מעתה", "לעולם", "דוקא", "דווקא", "ודאי", "בודאי", "בוודאי", "לכאורה", "מסתמא", "כלומר", "דהיינו", "דהכי", "היינו", "תו", "ותו", "אלאמאי", "בשלמא", "תיפוק", "תיתי", "תימא", "אימא", "אומר", "אומרת", "אומרין", "לטעמיך", "לטעמיה", "לטעמא", "לטעמייהו", "סוף", "לחוד", "בלבד", "זולת", "מלבד", "למרות", "אףעלפי", "אעפ", "אףעלגב", "אעגב"]
});
export const NPS1_CONNECTORS = Object.freeze([...new Set(Object.values(NPS1_CLASSES).flat().filter(x=>!x.includes(' ')))]);
const singles = new Set(NPS1_CONNECTORS);
export const NPS1_LIMITS = Object.freeze({nearWords:2,minChunkWords:2,contextWords:2});
export function nps1Connector(word) {
  const w=String(word).replace(/[^א-ת]/g,'');
  // Any number of these prefixes is protected, including ambiguous homographs.
  for(let i=0;i<w.length;i++) {
    if(singles.has(w.slice(i)))return true;
    if(!/[ודשכה]/.test(w[i]))break;
  }
  return false;
}
function member(word, lemma) {
  if(word===lemma)return true;
  return word.endsWith(lemma)&&/^[ודשכה]+$/.test(word.slice(0,-lemma.length));
}
export function formulaSpans(ts) {
  const spans=[];
  for(const [group,entries] of Object.entries(NPS1_CLASSES))for(const phrase of entries) {
    const ws=phrase.split(' ');
    for(let i=0;i<=ts.length-ws.length;i++)if(ws.every((w,j)=>member(ts[i+j].word,w)))
      spans.push({group,phrase,start:i,end:i+ws.length-1});
  }
  return spans;
}
export const tokens = s => [...s.matchAll(/[א-ת][א-ת\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7|]*/g)].map(m => ({text:m[0], word:m[0].replace(/[^א-ת]/g,''), start:m.index, end:m.index+m[0].length}));
export const plain = s => s.replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
export function unique(hay, needle) {
  if (!needle.length) return null;
  let at = null;
  for (let i=0;i<=hay.length-needle.length;i++) if (needle.every((w,j)=>w===hay[i+j])) { if(at!==null)return null; at=i; }
  return at;
}
export function quoteMap(html, speech, source) {
  if (/&(?!(?:nbsp|quot|amp|lt|gt|#39);)/.test(html)) return new Map();
  let depth=0, text='', flags=[];
  for(const p of html.split(/(<[^>]*>)/)) {
    if(p.startsWith('<')) { if(/^<b>$/i.test(p))depth++; else if(/^<\/b>$/i.test(p))depth--; else if(!/^<\/?small>$/i.test(p))return new Map(); if(depth<0||depth>1)return new Map(); }
    else { const q=plain(p); text+=q; flags.push(...Array(q.length).fill(depth===1)); }
  }
  if(depth!==0)return new Map();
  const a=tokens(text), b=tokens(speech), map=new Map();
  if(a.length!==b.length || a.some((t,i)=>t.word!==b[i].word))return map;
  let last=-1;
  for(let i=0;i<a.length;) {
    if(!flags[a[i].start]) {i++;continue;}
    let j=i+1; while(j<a.length && flags[a[j].start] && flags.slice(a[j-1].end,a[j].start).every(Boolean))j++;
    const run=a.slice(i,j);
    const at=run.length>=2?unique(source.map(t=>t.word),run.map(t=>t.word)):null;
    if(at!==null && at>last) { for(let k=i;k<j;k++)map.set(k,at+k-i); last=at+run.length-1; }
    i=j;
  }
  return map;
}

export function boundaryContext({source,commentary,speech}) {
  if(typeof source!=='string'||typeof commentary!=='string'||typeof speech!=='string')return null;
  const src=plain(source), expanded=plain(commentary), st=tokens(src), ts=tokens(speech), ct=tokens(expanded);
  const map=quoteMap(commentary,speech,st);
  return {source:src,commentary:expanded,speech,st,ts,ct,map,spans:formulaSpans(ts)};
}
export function adjacentVocabulary(ctx,at) {
  const i=ctx.ts.findIndex(t=>t.end===at);
  return ctx.spans.filter(s=>s.end>=i-1&&s.start<=i+2);
}
const reject=(rule,reason)=>({allowed:false,rule,reason});
function render(base,edits) {
  let s=base;for(const e of [...edits].sort((a,b)=>b.start-a.start))s=s.slice(0,e.start)+e.after+s.slice(e.end);return s;
}
export function boundaryDecision(ctx,e,accepted=[]) {
  // C1: derive evidence again; never trust caller-supplied classifications.
  if(!ctx||e?.kind!=='punctuation'||e.start!==e.end||e.before!==''||! /^[,;:—–]$/.test(e.after))return reject('C1','not a single source phrase insertion');
  const {ts,st,ct,map,spans,speech,source,commentary}=ctx;
  const i=ts.findIndex(t=>t.end===e.start),j=map.get(i),p=e.provenance;
  if(i<0||j===undefined||map.get(i+1)!==j+1||!ts[i+1]||!st[j+1]||
     !/^\s+$/.test(speech.slice(e.start,ts[i+1].start))||
     source.slice(st[j].end,st[j+1].start).trim()!==e.after||
     !/^\s*[,;:—–]\s*$/.test(source.slice(st[j].end,st[j+1].start))||
     !p||p.token!==j||p.start!==st[j].start||p.end!==st[j].end||p.text!==st[j].text||
     p.gap_start!==st[j].end||p.gap_end!==st[j+1].start||p.gap!==source.slice(st[j].end,st[j+1].start))
    return reject('C1','missing or changed literal quotation/source provenance');
  if(spans.some(s=>s.start<=i&&s.end>i))return reject('C2','inside a multiword formula');
  if(nps1Connector(ts[i].word)||spans.some(s=>s.end===i))return reject('C3','after connective/formula; role may be repurposed');
  const near=adjacentVocabulary(ctx,e.start);
  const cg=commentary.slice(ct[i].end,ct[i+1].start);
  // C4: only an explicit commentary boundary licenses a nearby connective.
  // A matching word sequence alone never licenses its role.
  const explicit=cg.trim()===e.after;
  if(near.length&&!explicit)return reject('C4','connective neighborhood lacks independent commentary clause boundary');
  // C5 counts complete Hebrew tokens between a mark and this insertion.
  for(const [text,at] of [[speech,e.start],[commentary,ct[i].end]])
    for(const m of text.matchAll(/[,;:—–.!?…׃]/g))
      if(tokens(text.slice(Math.min(at,m.index),Math.max(at,m.index))).length<=NPS1_LIMITS.nearWords) {
        // The corroborating mark at the exact commentary boundary is evidence,
        // not a conflicting neighboring boundary; target marks never exempted.
        if(text===commentary&&explicit&&m.index>=ct[i].end&&m.index<ct[i+1].start)continue;
        return reject('C5','existing target/commentary mark within two words');
      }
  for(const prior of accepted)if(prior.kind==='punctuation'&&tokens(speech.slice(Math.min(e.start,prior.start),Math.max(e.start,prior.start))).length<=NPS1_LIMITS.nearWords)
    return reject('C5','accepted imported mark within two words');
  // C8 abstains at weak quotation edges or unidentified/abbreviated words.
  if(![i-1,i,i+1,i+2].every(k=>map.get(k)===j+k-i)||
     /["'״׳]/.test(speech.slice(ts[i-1]?.start??0,ts[i+2]?.end??speech.length)))
    return reject('C8','insufficient four-word literal context or ambiguous abbreviation');
  // Without independent commentary punctuation, only the source's comma
  // separating a vav-led coordinated member receives a non-formula role.
  // Topic/predicate dashes, complements, durations and comparisons abstain.
  if(!explicit&&!(e.after===','&&/^ו[א-ת]+$/.test(ts[i+1].word)))
    return reject('C8','non-coordination role lacks independent commentary boundary');
  // C6 uses the real planner, including bracket cleanup and default 180-char cap.
  const before=pauseChunks(prepareForTTS(render(speech,accepted)));
  const after=pauseChunks(prepareForTTS(render(speech,[...accepted,e])));
  const existing=new Map();
  for(const x of before)if(tokens(x.c).length<NPS1_LIMITS.minChunkWords)
    existing.set(x.c,(existing.get(x.c)||0)+1);
  for(const x of after)if(tokens(x.c).length<NPS1_LIMITS.minChunkWords) {
    const count=existing.get(x.c)||0;
    if(!count)return reject('C6','new pause chunk contains fewer than two Hebrew words');
    existing.set(x.c,count-1);
  }
  return {allowed:true,rule:near.length?'C4':'C7',reason:near.length?'explicit matching commentary boundary':explicit?'explicit commentary boundary outside formula neighborhood':'source comma before vav-led coordinated member; four-word context, spacing and pause checks passed'};
}
