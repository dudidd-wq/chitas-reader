import { tokens, plain, unique, quoteMap, boundaryContext, boundaryDecision } from '../site/js/bavli-nps1-rules.js';
export { tokens, plain, unique, quoteMap } from '../site/js/bavli-nps1-rules.js';
import crypto from 'node:crypto';
export const hash = x => crypto.createHash('sha256').update(x).digest('hex');
export const REV = '8772e90fac22060ea423c168c0f95868653f6ef1';
export const pointed = s => /[\u05b0-\u05bc\u05bf\u05c1\u05c2\u05c7]/.test(s);
export function dictaPages(text) {
  const values = Object.fromEntries([...'אבגדהוזחטיכלמנסעפצקרשת'].map((c,i)=>[c,[1,2,3,4,5,6,7,8,9,10,20,30,40,50,60,70,80,90,100,200,300,400][i]]));
  const p=text.split(/\*\*\*\s*דף\s+([א-ת]+)([.:])\s*\*\*\*/), out={};
  for(let i=1;i<p.length;i+=3)out[[...p[i]].reduce((n,c)=>n+values[c],0)+(p[i+1]==='.'?'a':'b')]=tokens(p[i+2]);
  return out;
}
export function alignPage(segments, witness=[]) {
  let end=-1;
  return segments.map(s=>{
    const ts=tokens(plain(s)), skip=Number(['מתני','גמ'].includes(ts[0]?.word));
    let at=unique(witness.map(t=>t.word),ts.slice(skip).map(t=>t.word));
    if(at!==null && at<=end)at=null;
    if(at!==null)end=at+ts.length-skip-1;
    return ts.map((t,i)=>({...t,dicta:at!==null&&i>=skip?{...witness[at+i-skip],token:at+i-skip}:null}));
  });
}
export function segmentSidecar({source, commentary, speech, aligned, page, segment, sourceHash, dictaHash, onDrop=()=>{}}) {
  if(typeof speech!=='string'||!speech)return null;
  const ts=tokens(speech), st=aligned, map=quoteMap(commentary,speech,st), edits=[];
  const src=plain(source), context=boundaryContext({source,commentary,speech});
  for(const [i,j] of map) {
    const t=ts[i], s=st[j];
    const provenance={page,segment,token:j,start:s.start,end:s.end,text:s.text,source_sha256:sourceHash};
    // Any pointing or stress in either the edition or speech forbids filling.
    if(s.dicta && !pointed(s.text) && !pointed(t.text) && !/[\u0591-\u05af\u05bd|]/.test(s.text+t.text) && pointed(s.dicta.text)) {
      const after=s.dicta.text.replace(/[\u0591-\u05af\u05bd]/g,'');
      edits.push({start:t.start,end:t.end,before:t.text,after,kind:'niqqud',provenance:{...provenance,license:'CC BY-SA',witness:'Dicta',revision:REV,witness_sha256:dictaHash,witness_token:s.dicta.token,witness_start:s.dicta.start,witness_end:s.dicta.end}});
    }
    // Interior adjacent mapped words only. Never copy across commentary/quotes,
    // replace existing punctuation, or invent a stop at a segment/page boundary.
    // Exact words do not establish sentence syntax in expanded commentary.
    // Abstain from ALL sentence/question/ellipsis stops and compound marks.
    // Only a single phrase-level mark is eligible; never strip unsafe marks.
    if(map.get(i+1)!==j+1 || !ts[i+1] || !st[j+1])continue;
    const gap=src.slice(s.end,st[j+1].start), target=speech.slice(t.end,ts[i+1].start);
    if(!/^\s+$/.test(target)||!/^\s*[,;:—–]\s*$/.test(gap))continue;
    // A quoted discourse connector may become part of a larger construction.
    // No imported phrase mark after it is proven safe by literal alignment.
    const punctuation=gap.trim();
    const edit={start:t.end,end:t.end,before:'',after:punctuation,kind:'punctuation',provenance:{...provenance,license:'CC BY-NC',witness:'Sefaria William Davidson Edition - Vocalized Aramaic',gap_start:s.end,gap_end:st[j+1].start,gap}};
    const decision=boundaryDecision(context,edit,edits);
    if(decision.allowed)edits.push(edit);else onDrop({...decision,edit});
  }
  edits.sort((a,b)=>a.start-b.start||a.end-b.end);
  return edits.length?{schema:1,source,commentary,base:speech,edits}:null;
}
