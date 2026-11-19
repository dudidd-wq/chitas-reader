// On-device OCR for an ID-appendix photo. Loads Tesseract.js and Hebrew traineddata from this site only,
// and only when the reader opens the feature. The image is never uploaded or stored.
const DIR = new URL('../ocr/', import.meta.url).href.replace(/\/$/, '');

export async function recognizeSapachImage(source, onProgress) {
  const Tesseract = (await import(`${DIR}/tesseract.esm.min.js`)).default;
  const worker = await Tesseract.createWorker('heb', 1, {
    workerPath: `${DIR}/worker.min.js`,
    corePath: DIR,
    langPath: DIR,
    gzip: false,
    cacheMethod: 'none',
    logger: m => { try { onProgress?.(m); } catch { /* ignore */ } },
  });
  try {
    const res = await worker.recognize(source);
    return String(res?.data?.text || '');
  } finally {
    try { await worker.terminate(); } catch { /* ignore */ }
  }
}
