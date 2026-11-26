// Local-only "this word/chunk didn't sound right" reports. Nothing is sent to a server.
// Stored under a dedicated key, not in the main backup, so restore is via the exported file.

export const WRONG_KEY = 'chitas-reader.wrong.v1';
export const WRONG_CAP = 200;
export const WRONG_KIND = 'wrong-word';
export const WRONG_FORMAT = 1;

const STR_MAX = { word: 200, speech: 2000, context: 300, title: 200, unit: 64, iso: 32, sid: 80, lib: 200, pos: 80, voice: 80, engine: 16, havara: 24, variant: 16, gender: 16 };

function str(v, max) {
  if (v == null) return '';
  return String(v).replace(/\u0000/g, '').slice(0, max);
}

export function cleanWrongEntry(v, i = 0) {
  if (!v || typeof v !== 'object') return null;
  const id = Number.isInteger(v.id) && v.id >= 0 ? v.id : i;
  const t = Number.isInteger(v.t) && v.t > 0 && v.t < 1e15 ? v.t : 0;
  if (!t) return null;
  const out = { id, t };
  for (const [k, max] of Object.entries(STR_MAX)) {
    const s = str(v[k], max);
    if (s) out[k] = s;
  }
  if (Number.isInteger(v.say) && v.say >= 0 && v.say < 100000) out.say = v.say;
  if (!out.speech && !out.word) return null;
  return out;
}

function storage() {
  try { return globalThis.localStorage; } catch { return null; }
}

export function loadWrongReports() {
  const raw = storage()?.getItem(WRONG_KEY);
  if (!raw) return [];
  try {
    const d = JSON.parse(raw);
    const items = Array.isArray(d) ? d : Array.isArray(d?.items) ? d.items : [];
    return items.map(cleanWrongEntry).filter(Boolean).slice(-WRONG_CAP);
  } catch { return []; }
}

export function saveWrongReports(items) {
  const clean = (items || []).map(cleanWrongEntry).filter(Boolean);
  const trimmed = clean.length > WRONG_CAP ? clean.slice(-WRONG_CAP) : clean;
  const s = storage();
  if (!s) return trimmed;
  s.setItem(WRONG_KEY, JSON.stringify({ app: 'chitas-reader', kind: WRONG_KIND, format: WRONG_FORMAT, items: trimmed }));
  return trimmed;
}

export function addWrongReport(entry) {
  const items = loadWrongReports();
  const id = items.reduce((m, x) => Math.max(m, x.id), 0) + 1;
  const row = cleanWrongEntry({ ...entry, id, t: Number.isInteger(entry?.t) && entry.t > 0 ? entry.t : Date.now() }, id);
  if (!row) return { items, added: null };
  items.push(row);
  return { items: saveWrongReports(items), added: row };
}

export function removeWrongReport(id) {
  const items = loadWrongReports().filter(x => x.id !== id);
  return saveWrongReports(items);
}

export function clearWrongReports() {
  return saveWrongReports([]);
}

export function exportWrongJson(items = loadWrongReports()) {
  return JSON.stringify({
    app: 'chitas-reader',
    kind: WRONG_KIND,
    format: WRONG_FORMAT,
    exportedAt: new Date().toISOString(),
    items: items.map(cleanWrongEntry).filter(Boolean),
  }, null, 2);
}

export function importWrongJson(text, { replace = false } = {}) {
  const d = JSON.parse(String(text));
  if (!d || d.app !== 'chitas-reader' || d.kind !== WRONG_KIND) throw new Error('bad file');
  const incoming = (Array.isArray(d.items) ? d.items : []).map(cleanWrongEntry).filter(Boolean);
  if (replace) return saveWrongReports(incoming);
  const cur = loadWrongReports();
  const seen = new Set(cur.map(x => x.t + ':' + (x.speech || x.word || '') + ':' + (x.pos || '')));
  let nextId = cur.reduce((m, x) => Math.max(m, x.id), 0);
  const merged = cur.slice();
  for (const it of incoming) {
    const k = it.t + ':' + (it.speech || it.word || '') + ':' + (it.pos || '');
    if (seen.has(k)) continue;
    seen.add(k);
    nextId += 1;
    merged.push({ ...it, id: nextId });
  }
  return saveWrongReports(merged);
}

export function downloadWrongJson(items, filename = 'wrong-words.json') {
  const blob = new Blob([exportWrongJson(items)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return blob.size;
}

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderWrongHtml(items) {
  const n = items?.length || 0;
  if (!n) {
    return `<div class="wrong-report" id="wrong-report">
      <p class="hint">אין דיווחים שמורים במכשיר. כשמשפט לא נשמע נכון, השתמשו ב«לא נשמע נכון» – זה נשמר אצלכם בלבד, בלי לשלוח לשרת.</p>
      <button type="button" class="btn" id="sh-wrong-import">שחזור מקובץ</button>
      <input type="file" id="sh-wrong-file" accept="application/json,.json" hidden>
    </div>`;
  }
  const rows = items.slice().reverse().map(it => {
    const when = it.t ? new Date(it.t).toLocaleString('he-IL') : '';
    const where = [it.title, it.unit, it.iso || it.sid].filter(Boolean).map(esc).join(' · ');
    const text = esc(it.word || it.speech || '');
    return `<li class="wrong-item" data-id="${it.id}"><div class="wrong-h"><span class="wrong-when">${esc(when)}</span>${where ? ` <span class="wrong-where">${where}</span>` : ''}</div><p class="wrong-speech">${text}</p><button type="button" class="btn ghost wrong-del" data-id="${it.id}">מחק</button></li>`;
  }).join('');
  return `<div class="wrong-report" id="wrong-report">
    <p class="wrong-sum" id="wrong-sum">${n === 1 ? 'דיווח אחד שמור במכשיר בלבד' : n + ' דיווחים שמורים במכשיר בלבד'}. דבר אינו נשלח לשרת.</p>
    <ol class="wrong-list">${rows}</ol>
    <div class="wrong-actions">
      <button type="button" class="btn" id="sh-wrong-export">ייצוא לקובץ</button>
      <button type="button" class="btn" id="sh-wrong-import">שחזור מקובץ</button>
      <button type="button" class="btn ghost" id="sh-wrong-clear">מחק הכול</button>
    </div>
    <input type="file" id="sh-wrong-file" accept="application/json,.json" hidden>
    <p class="hint">הייצוא והשחזור הם קובץ במכשיר בלבד. אפשר לשחזר אחרי מחיקה.</p>
  </div>`;
}
