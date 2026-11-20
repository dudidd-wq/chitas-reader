// On-device reading of an ID-appendix PDF. Loads Mozilla PDF.js from this site
// only when a PDF is chosen. Text is taken from the file's text layer when it
// is usable; otherwise pages are rasterized here and handed to the existing
// on-device OCR. The file is never uploaded or stored. At most four pages.
const DIR = new URL('../vendor/pdfjs/', import.meta.url).href;
const MAX_PAGES = 4;
const TARGET_WIDTH = 1800;

/** PDF.js marks Hebrew lines as dir=rtl and stores them in visual order. Turn that back into logical order so the parser sees כהן, not ןהכ. */
function logicalFromRtl(s) {
  const runs = [];
  for (const ch of String(s)) {
    const k = /\s/.test(ch) ? 'sp' : /[\u0590-\u05FF]/.test(ch) ? 'he' : 'other';
    const last = runs[runs.length - 1];
    if (last && last.k === k) last.t += ch;
    else runs.push({ k, t: ch });
  }
  return runs.reverse().map(r => r.k === 'he' ? [...r.t].reverse().join('') : r.t).join('');
}
function itemStr(it) {
  const s = it?.str || '';
  return it?.dir === 'rtl' ? logicalFromRtl(s) : s;
}
function itemsToText(items) {
  const rows = (items || []).filter(it => it && it.str);
  if (!rows.length) return '';
  const sorted = [...rows].sort((a, b) => {
    const ya = a.transform?.[5] ?? 0, yb = b.transform?.[5] ?? 0;
    if (Math.abs(ya - yb) > 4) return yb - ya;
    return (a.transform?.[4] ?? 0) - (b.transform?.[4] ?? 0);
  });
  const lines = [];
  let cur = [], curY = null;
  for (const it of sorted) {
    const y = it.transform?.[5] ?? 0;
    if (curY != null && Math.abs(y - curY) > 4) { lines.push(cur); cur = []; }
    cur.push({ ...it, str: itemStr(it) });
    curY = y;
  }
  if (cur.length) lines.push(cur);
  return lines.map(line => line.map(it => it.str).join(' ').replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
}

function usefulText(s) {
  const heb = (String(s).match(/[\u05D0-\u05EA]/g) || []).length;
  const dates = (String(s).match(/\d{1,2}\s*[./\-]\s*\d{1,2}\s*[./\-]\s*\d{4}/g) || []).length;
  return heb >= 10 && dates >= 1;
}

async function rasterPage(page) {
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(3, Math.max(1.5, TARGET_WIDTH / (base.width || TARGET_WIDTH)));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(viewport.width));
  canvas.height = Math.max(1, Math.ceil(viewport.height));
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  const blob = await new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('raster')), 'image/png'));
  canvas.width = canvas.height = 0;
  return URL.createObjectURL(blob);
}

export async function readSapachPdf(file, onStatus) {
  const pdfjs = await import(`${DIR}pdf.min.mjs`);
  if (pdfjs.GlobalWorkerOptions) pdfjs.GlobalWorkerOptions.workerSrc = `${DIR}pdf.worker.min.mjs`;
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({
    data,
    isEvalSupported: false,
    useSystemFonts: true,
    useWasm: false,
    useWorkerFetch: false,
    disableAutoFetch: true,
    disableStream: true,
    stopAtErrors: false,
  });
  const doc = await task.promise;
  try {
    const n = Math.min(doc.numPages || 0, MAX_PAGES);
    if (!n) throw new Error('empty-pdf');
    const texts = [];
    const images = [];
    for (let i = 1; i <= n; i++) {
      onStatus?.(`קורא את קובץ ה־PDF במכשיר… עמוד ${i} מתוך ${n}`);
      const page = await doc.getPage(i);
      let text = '';
      try { text = itemsToText((await page.getTextContent()).items); } catch { /* raster instead */ }
      if (usefulText(text)) texts.push(text);
      else images.push(await rasterPage(page));
    }
    return { text: texts.join('\n\n'), images };
  } finally {
    try { await doc.destroy(); } catch { /* ignore */ }
  }
}
