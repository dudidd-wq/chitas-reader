// On-device OCR for an ID-appendix photo. Loads Tesseract.js and Hebrew traineddata from this site only,
// and only when the reader opens the feature. The image is never uploaded or stored.
//
// 1.0.187: the appendix is a ruled table. With the ruling lines in place Tesseract dropped the children rows entirely
// (or read the digits next to the lines as noise), so only the spouse line was found. Now the picture is cleaned
// here first – grayscale, threshold, long horizontal/vertical rules erased, small photos enlarged – and read twice:
// as one column of rows (PSM 4, keeps "ID | name | date" on one line) and in automatic layout (PSM 3). The caller
// keeps the reading that yields more people.
const DIR = new URL('../ocr/', import.meta.url).href.replace(/\/$/, '');

async function loadBitmap(source) {
  if (typeof source === 'string') {
    const img = new Image(); img.decoding = 'async'; img.src = source;
    await img.decode(); return img;
  }
  if (typeof createImageBitmap === 'function') return createImageBitmap(source);
  const url = URL.createObjectURL(source);
  try { return await loadBitmap(url); } finally { URL.revokeObjectURL(url); }
}

/** Adaptive threshold (local mean, integral image): a phone photo has uneven light, so one global level fails. Returns ink mask. */
export function inkMask(img) {
  const { data, width: w, height: h } = img;
  // gray in bytes and the integral in 32-bit integers (the picture is capped at 6 MP, so a sum stays below 2^32)
  const g = new Uint8Array(w * h);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) g[j] = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
  const W = w + 1, S = new Uint32Array(W * (h + 1));
  for (let y = 0; y < h; y++) { let row = 0; for (let x = 0; x < w; x++) { row += g[y * w + x]; S[(y + 1) * W + x + 1] = S[y * W + x + 1] + row; } }
  const r = Math.max(8, Math.round(Math.max(w, h) / 50));
  const ink = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
      const mean = (S[y1 * W + x1] - S[y0 * W + x1] - S[y1 * W + x0] + S[y0 * W + x0]) / ((y1 - y0) * (x1 - x0));
      ink[y * w + x] = g[y * w + x] < mean * 0.82 && g[y * w + x] < 200 ? 1 : 0;
    }
  }
  return ink;
}

/** Skew of the text lines in degrees (projection-profile search, ±6°). */
export function skewAngle(ink, w, h) {
  const pts = [];
  const step = Math.max(1, Math.round(Math.sqrt((w * h) / 120000)));
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) if (ink[y * w + x]) pts.push(x, y);
  if (pts.length < 200) return 0;
  let best = 0, bestScore = -1;
  for (let a = -6; a <= 6.001; a += 0.25) {
    const t = a * Math.PI / 180, sn = Math.sin(t), cs = Math.cos(t);
    const bins = new Map();
    for (let i = 0; i < pts.length; i += 2) { const k = Math.round((pts[i + 1] * cs - pts[i] * sn) / step); bins.set(k, (bins.get(k) || 0) + 1); }
    let sc = 0; for (const v of bins.values()) sc += v * v;
    if (sc > bestScore) { bestScore = sc; best = a; }
  }
  return best;
}

/** Threshold + erase ruling lines. Pure pixel work on an ImageData-like {data,width,height}; exported for tests. */
export function cleanPixels(img) {
  const { data, width: w, height: h } = img;
  const ink = inkMask(img);
  const erase = new Uint8Array(w * h);
  const minH = Math.max(40, w / 6 | 0), minV = Math.max(30, h / 12 | 0), bridge = Math.max(3, Math.round(w / 400));
  // a rule may be broken by blur or JPEG noise: runs continue over short gaps; the rule's neighbours (±1 px) go too
  const scan = (len, n, at, mark, min) => {
    for (let a = 0; a < n; a++) {
      let start = -1, lastInk = -1;
      for (let i = 0; i <= len; i++) {
        const on = i < len && ink[at(a, i)];
        if (on) { if (start < 0) start = i; lastInk = i; continue; }
        if (start >= 0 && (i === len || i - lastInk > bridge)) {
          if (lastInk - start + 1 >= min) for (let k = start; k <= lastInk; k++) mark(a, k);
          start = -1;
        }
      }
    }
  };
  scan(w, h, (y, x) => y * w + x, (y, x) => { for (let d = -1; d <= 1; d++) if (y + d >= 0 && y + d < h) erase[(y + d) * w + x] = 1; }, minH);
  scan(h, w, (x, y) => y * w + x, (x, y) => { for (let d = -1; d <= 1; d++) if (x + d >= 0 && x + d < w) erase[y * w + x + d] = 1; }, minV);
  for (let j = 0, i = 0; j < ink.length; j++, i += 4) {
    const v = ink[j] && !erase[j] ? 0 : 255;
    data[i] = data[i + 1] = data[i + 2] = v; data[i + 3] = 255;
  }
  return img;
}

/** Within each text line band, shrink long blank gaps (table columns) to about one word space, right-aligned.
 * Tesseract's Hebrew model misreads a date standing alone far from the rest of its row; at normal spacing it reads it. */
export function squeezeGaps(img) {
  const { data, width: w, height: h } = img;
  const inkAt = (x, y) => data[(y * w + x) * 4] < 128;
  const rowInk = new Uint8Array(h);
  for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) if (inkAt(x, y)) { rowInk[y] = 1; break; } }
  const out = new Uint8ClampedArray(data.length).fill(255);
  const bands = [];
  for (let y = 0; y < h;) { if (!rowInk[y]) { y++; continue; } let y2 = y; while (y2 < h && rowInk[y2]) y2++; bands.push([y, y2]); y = y2; }
  bands.forEach(([y, y2], bi) => {
    // copy a little above and below the band (anti-aliasing), but never into the neighbouring band's rows
    const top = Math.max(0, y - 2, bi ? Math.ceil((bands[bi - 1][1] + y) / 2) : 0);
    const bottom = Math.min(h, y2 + 2, bi < bands.length - 1 ? Math.floor((y2 + bands[bi + 1][0]) / 2) : h);
    const bandH = y2 - y, gap = Math.max(12, Math.round(bandH * 0.9));
    const colInk = new Uint8Array(w);
    for (let x = 0; x < w; x++) for (let yy = y; yy < y2; yy++) if (inkAt(x, yy)) { colInk[x] = 1; break; }
    const keep = []; let blank = 0;
    for (let x = w - 1; x >= 0; x--) {
      if (colInk[x]) { blank = 0; keep.push(x); } else if (++blank <= gap) keep.push(x);
    }
    for (let i = 0; i < keep.length; i++) {
      const sx = keep[i], dx = w - 1 - i;
      for (let yy = top; yy < bottom; yy++) {
        const si = (yy * w + sx) * 4, di = (yy * w + dx) * 4;
        out[di] = data[si]; out[di + 1] = data[si + 1]; out[di + 2] = data[si + 2]; out[di + 3] = 255;
      }
    }
  });
  for (let i = 3; i < out.length; i += 4) out[i] = 255;
  data.set(out);
  return img;
}

function drawTo(bmp, bw, bh, scale, angle) {
  const c = document.createElement('canvas');
  c.width = Math.round(bw * scale); c.height = Math.round(bh * scale);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  if (angle) { ctx.translate(c.width / 2, c.height / 2); ctx.rotate(-angle * Math.PI / 180); ctx.translate(-c.width / 2, -c.height / 2); }
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  return c;
}
export async function prepareSapachImage(source) {
  try {
    const bmp = await loadBitmap(source);
    const bw = bmp.width || bmp.naturalWidth, bh = bmp.height || bmp.naturalHeight;
    if (!bw || !bh) return source;
    // small photos are enlarged; the result is capped at 6 MP (memory on a phone)
    let scale = bw < 1600 ? Math.min(2.5, 1600 / bw) : bw > 3200 ? 3200 / bw : 1;
    scale = Math.min(scale, Math.sqrt(6e6 / (bw * bh)));
    // straighten a tilted photo first (estimated on a small copy), so the rows stay on one line each
    const small = drawTo(bmp, bw, bh, Math.min(1, 900 / bw), 0);
    const sid = small.getContext('2d').getImageData(0, 0, small.width, small.height);
    const angle = skewAngle(inkMask(sid), small.width, small.height);
    small.width = small.height = 0;
    const c = drawTo(bmp, bw, bh, scale, Math.abs(angle) >= 0.25 ? angle : 0);
    bmp.close?.();
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const id = ctx.getImageData(0, 0, c.width, c.height);
    ctx.putImageData(squeezeGaps(cleanPixels(id)), 0, 0);
    return c;
  } catch { return source; }
}

/** @returns {Promise<string[]>} one or two readings of the same picture (row-wise first). */
export async function recognizeSapachReadings(source, onProgress) {
  const Tesseract = (await import(`${DIR}/tesseract.esm.min.js`)).default;
  let pass = 0;
  const worker = await Tesseract.createWorker('heb', 1, {
    workerPath: `${DIR}/worker.min.js`,
    corePath: DIR,
    langPath: DIR,
    gzip: false,
    cacheMethod: 'none',
    logger: m => { try { onProgress?.({ ...m, pass, passes: 2 }); } catch { /* ignore */ } },
  });
  try {
    const img = await prepareSapachImage(source);
    const out = [];
    for (const psm of ['4', '3']) {
      pass++;
      await worker.setParameters({ tessedit_pageseg_mode: psm });
      const res = await worker.recognize(img);
      out.push(String(res?.data?.text || ''));
    }
    if (img && img.width) { img.width = img.height = 0; }
    return out;
  } finally {
    try { await worker.terminate(); } catch { /* ignore */ }
  }
}

/** Backwards-compatible: both readings joined (the parser de-duplicates). Prefer recognizeSapachReadings + bestReading. */
export async function recognizeSapachImage(source, onProgress) {
  return (await recognizeSapachReadings(source, onProgress)).join('\n\n');
}
