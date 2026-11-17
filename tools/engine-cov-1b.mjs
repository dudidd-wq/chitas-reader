// ENGINE-COV-1B. Offline, closed occurrence allowlist. No builder/runtime imports.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
export const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const MARK=/[\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/u;
const ALLOWED=/[\u05B0-\u05BC\u05C1\u05C2\u05C7]/gu;
const HEBREW=/^[\u05D0-\u05EA]+$/u;
const OK_PATH=/^site\/data\/nachv\/(Joshua|Judges|I_Samuel|Isaiah)\/[1-9][0-9]*\.json$/;
function demand(ok,why){if(!ok)throw Error(why);}
/** UTF-16 slice offsets; Unicode scalar and Hebrew-letter coordinates are checked separately. */
export function addPointingAt(before,r){
  demand(typeof before==='string'&&sha(before)===r.before_sha256,'stale or missing string hash');
  demand(Number.isInteger(r.start)&&Number.isInteger(r.end)&&r.start>=0&&r.end>r.start&&r.end<=before.length,'invalid UTF-16 range');
  const old=before.slice(r.start,r.end);
  demand(old===r.old&&HEBREW.test(old)&&!MARK.test(old),'not an entirely bare Hebrew word');
  demand(!/[\u05D0-\u05EA\u0591-\u05C7'"׳״]/u.test(before[r.start-1]||'')&&!/[\u05D0-\u05EA\u0591-\u05C7'"׳״]/u.test(before[r.end]||''),'not a complete token');
  demand(typeof r.new==='string'&&r.new!==old&&r.new.replace(ALLOWED,'')===old,'consonant/mater/final-letter/nonallowed change');
  demand(/^[\u05D0-\u05EA][\u05D0-\u05EA\u05B0-\u05BC\u05C1\u05C2\u05C7]*$/u.test(r.new),'invalid added marks');
  demand([...before.slice(0,r.start)].length===r.unicode_start&&[...before.slice(0,r.end)].length===r.unicode_end,'Unicode offsets differ');
  demand((before.slice(0,r.start).match(/[\u05D0-\u05EA]/gu)||[]).length===r.hebrew_letter_start,'Hebrew-letter coordinate differs');
  demand(r.language==='hebrew-prose'&&r.protected===false,'language/protection denied');
  demand(r.source_license==='Public Domain'&&/^[a-f0-9]{64}$/.test(r.annotation_terms_sha256||''),'licence/output provenance unresolved');
  demand(r.gold_status==='development-resolved'&&r.intended_ipa&&r.actual_ipa===r.intended_ipa&&r.preparation_preserves_added_marks===true,'unresolved context/preparation/IPA');
  demand(r.mapping?.unique===true&&r.mapping?.whole_sequence_exact===true&&r.mapping?.raw_to_request_proven===true,'ambiguous or missing exact mapping');
  demand(r.quote_scope==='clear'&&!/["'׳״“”‘’()[\]{}&<>0-9]/u.test(before),'quote/abbreviation/entity/numeral scope denied');
  // Acc and absent confidence are intentionally never consulted as positive evidence.
  const after=before.slice(0,r.start)+r.new+before.slice(r.end);
  demand(sha(after)===r.after_sha256,'after hash differs');
  return after;
}
export function applyManifest(root,manifest){
  demand(manifest.schema===1&&manifest.base==='9155df880a7b44d6ac7b1c3b9e5fad909043a549','wrong manifest/base');
  demand(Array.isArray(manifest.approved)&&manifest.approved.length<=800,'invalid population');
  demand(manifest.approved.length===0||manifest.status==='REVIEW_CANDIDATE','held population cannot mutate');
  const rootPath=fs.realpathSync(root), pending=[], allowed=new Set(manifest.allowlist);
  for(const p of manifest.pins){
    demand(!path.isAbsolute(p.path)&&!p.path.split('/').includes('..')&&!p.path.includes('\\'),'unsafe pin path');
    const full=path.resolve(rootPath,p.path); demand(fs.realpathSync(full).startsWith(rootPath+path.sep),'path escape');
    const b=fs.readFileSync(full);demand([p.before_sha256,p.after_sha256].includes(sha(b)),'stale file '+p.path);
  }
  demand(new Set(manifest.pins.map(p=>p.path)).size===manifest.pins.length,'duplicate pins');
  demand(allowed.size===manifest.approved.length,'allowlist population mismatch');
  const comments=new Set();const ids=new Set();
  for(const r of manifest.approved){
    demand(allowed.has(r.id)&&!ids.has(r.id)&&OK_PATH.test(r.path)&&manifest.pins.some(p=>p.path===r.path),'occurrence outside exact allowlist');ids.add(r.id);comments.add(r.path+':'+r.field);
  }
  demand(comments.size<=80,'comment cap');
  for(const pin of manifest.pins){
    const edits=manifest.approved.filter(r=>r.path===pin.path);if(!edits.length)continue;
    demand(OK_PATH.test(pin.path),'non-speech mutation');
    const full=path.join(rootPath,pin.path),beforeBytes=fs.readFileSync(full);if(sha(beforeBytes)===pin.after_sha256)continue;
    const d=JSON.parse(beforeBytes);
    // Manifest records chain exact old/new whole-string hashes in order, never remap IDs.
    for(const r of edits){const m=/^say\[(\d+)\]\[(\d+)\]$/.exec(r.field);demand(m,'invalid field');d.say[+m[1]][+m[2]]=addPointingAt(d.say[+m[1]][+m[2]],r);}
    const after=Buffer.from(JSON.stringify(d));demand(sha(after)===pin.after_sha256,'serialized output hash differs');pending.push([full,after]);
  }
  // Validate the entire population before any writes; an empty manifest is byte-idempotent.
  for(const [full,after]of pending)fs.writeFileSync(full,after);
  return {approved:manifest.approved.length,files_written:pending.length};
}
const manifestURL=new URL('./engine-cov-1b-manifest.json',import.meta.url);
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
  const bytes=fs.readFileSync(manifestURL);
  demand(sha(bytes)==='084b5bcf6a65de32f86ec1071f710f4c551c925100c7e43b745f9406729ff92a','frozen manifest changed; independent review required');
  const root=fileURLToPath(new URL('../',import.meta.url));
  console.log(JSON.stringify(applyManifest(root,JSON.parse(bytes))));
}
