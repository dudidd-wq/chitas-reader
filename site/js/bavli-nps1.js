import { boundaryContext, boundaryDecision } from './bavli-nps1-rules.js';
export { NPS1_CONNECTORS, nps1Connector } from './bavli-nps1-rules.js';
// Speech-only additive sidecar. Unknown profiles, stale bases and malformed
// operations fail closed. The default Israeli string is returned verbatim.
export function nps1Speech(text, sidecar, {havara, corpus, onDrop=()=>{}}={}) {
  if(typeof text!=='string'||havara!=='chabad'||corpus!=='bavli'||sidecar?.schema!==1||sidecar.base!==text||!Array.isArray(sidecar.edits))return text;
  let end=0; const context=boundaryContext({source:sidecar.source,commentary:sidecar.commentary,speech:text}), accepted=[];
  for(const e of sidecar.edits) {
    if(!e||typeof e!=='object'||Array.isArray(e)||!e.provenance||typeof e.provenance!=='object'||Array.isArray(e.provenance))return text;
    if(typeof e.before!=='string'||typeof e.provenance.source_sha256!=='string'||!Number.isInteger(e.start)||!Number.isInteger(e.end)||e.start<end||e.end<e.start||e.end>text.length||text.slice(e.start,e.end)!==e.before||typeof e.after!=='string'||!e.provenance?.source_sha256)return text;
    if(e.kind==='punctuation') { if(e.before!==''||! /^[,;:—–]$/.test(e.after)||e.provenance.license!=='CC BY-NC'){onDrop({rule:'C1',edit:e});return text;} const decision=boundaryDecision(context,e,accepted); if(!decision.allowed){onDrop({...decision,edit:e});return text;} }
    else if(e.kind==='niqqud') { if(!/^[א-ת]+$/.test(e.before)||e.after.replace(/[\u05b0-\u05bc\u05bf\u05c1\u05c2\u05c7]/g,'')!==e.before||e.provenance.license!=='CC BY-SA')return text; }
    else return text;
    accepted.push(e); end=e.end;
  }
  let out=text;
  for(const e of [...sidecar.edits].reverse())out=out.slice(0,e.start)+e.after+out.slice(e.end);
  return out;
}
