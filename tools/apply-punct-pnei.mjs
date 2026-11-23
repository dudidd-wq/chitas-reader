// Apply written Pnei Moshe punctuation (R1–R4) to display comments,
// and transfer marks to ysay.say only when letters already match.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import {
  punctuateComment, transferPunct, lettersFromDisplay, hebrewLetters,
  loadShipped107, commentKey, stripPunct, RULES_REV,
} from './lib-punct-pnei.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith('.json')) yield p;
  }
}

export function applyPneiPunct({ dry = false, root = ROOT } = {}) {
  const yerRoot = path.join(root, 'site/data/gemara/yer');
  const ysayRoot = path.join(root, 'site/data/gemara/ysay');
  const snapPath = path.join(root, 'verification/punct-identity-pnei.json');
  const { set: shipped } = loadShipped107(snapPath, fs);
  const rows = [];
  let comments = 0, skipped107 = 0, displayChanged = 0, sayTransferred = 0, sayLeft = 0, sayMissing = 0;
  let marks = 0;
  const pagesDisplay = new Set(), pagesSay = new Set();
  const ruleCounts = {};

  for (const file of walk(yerRoot)) {
    const relPage = path.relative(yerRoot, file).replaceAll('\\', '/');
    const rel = 'gemara/yer/' + relPage;
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    let fileChanged = false;
    const ysayPath = path.join(ysayRoot, relPage);
    let ysay = null, ysayChanged = false;
    if (fs.existsSync(ysayPath)) ysay = JSON.parse(fs.readFileSync(ysayPath, 'utf8'));
    const sayArr = ysay?.say || [];

    for (let si = 0; si < (data.segs || []).length; si++) {
      const row = data.segs[si];
      if (!Array.isArray(row) || row.length < 2 || !Array.isArray(row[1])) continue;
      if (!Array.isArray(sayArr[si])) {
        // keep non-array slots as-is; treat comments as missing say
      }
      const slot = Array.isArray(sayArr[si]) ? sayArr[si] : [];
      for (let ci = 0; ci < row[1].length; ci++) {
        const c = row[1][ci];
        if (typeof c !== 'string' || !c.trim()) continue;
        comments++;
        const key = commentKey(rel, si, ci);
        if (shipped.has(key)) { skipped107++; continue; }
        const before = c;
        const { text: after, insertions } = punctuateComment(before);
        if (!insertions.length || after === before) continue;
        if (stripPunct(after) !== stripPunct(before)) {
          throw new Error('letters/niqqud changed: ' + key);
        }
        displayChanged++;
        marks += insertions.length;
        pagesDisplay.add(rel);
        for (const ins of insertions) ruleCounts[ins.rule] = (ruleCounts[ins.rule] || 0) + 1;
        const idHash = sha256(stripPunct(before));
        let sayStatus = 'missing';
        if (!ysay) { sayMissing++; }
        else {
          const s = slot[ci];
          if (typeof s !== 'string' || !s) { sayMissing++; sayStatus = 'missing'; }
          else if (lettersFromDisplay(after) !== hebrewLetters(s)) {
            sayLeft++; sayStatus = 'letters-differ-left';
          } else {
            const tr = transferPunct(after, s);
            if (!tr.ok) {
              sayLeft++; sayStatus = tr.reason;
            } else if (tr.say !== s) {
              slot[ci] = tr.say;
              sayArr[si] = slot;
              ysay.say[si] = slot;
              ysayChanged = true;
              sayTransferred++;
              sayStatus = 'transferred';
              pagesSay.add('gemara/ysay/' + relPage);
            } else {
              sayLeft++;
              sayStatus = 'already';
            }
          }
        }
        row[1][ci] = after;
        fileChanged = true;
        rows.push({
          file: rel, seg: si, idx: ci, hash: idHash,
          rules: insertions.map(x => x.rule),
          marks: insertions.map(x => x.mark),
          nIns: insertions.length,
          say: sayStatus,
        });
      }
    }
    if (fileChanged && !dry) fs.writeFileSync(file, JSON.stringify(data));
    if (ysay && ysayChanged && !dry) fs.writeFileSync(ysayPath, JSON.stringify(ysay));
  }

  return {
    rulesRev: RULES_REV,
    dry,
    comments,
    skipped107,
    displayChanged,
    marks,
    ruleCounts,
    sayTransferred,
    sayLeft,
    sayMissing,
    pagesDisplay: pagesDisplay.size,
    pagesSay: pagesSay.size,
    rows,
  };
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const dry = process.argv.includes('--dry');
  const report = applyPneiPunct({ dry });
  const outDir = path.join(ROOT, 'tools/data');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'punct-pnei-s6-report.json'), JSON.stringify(report));
  const { rows, ...sum } = report;
  console.log(JSON.stringify(sum, null, 2));
}
