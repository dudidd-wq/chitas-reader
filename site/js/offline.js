// Full offline manager (#/offline) and verified Cache Storage downloader shared by 30-day save, Siddur, and Library.
// Nothing is reported as "saved" until it is written to Cache Storage and verified via caches.match().
import { prefs } from './store.js';
import { piperSupported, voiceStatus, installVoice, voiceBytes, voiceMissingBytes, modelFor, mb } from './piper.js';
import { data } from './texts.js';

const CONCURRENCY = 6;
const INDEX_OR_META_RE = /(?:^|\/)(?:index|sources|glossary|rambam-errata)\.json$/;

export const CORPORA = [
  { id: 'torah', he: 'חומש ורש״י', mb: 6.4, group: 'core', prefixes: ['torah/'] },
  { id: 'tehillim', he: 'תהילים', mb: 0.4, group: 'core', prefixes: ['tehillim/'] },
  { id: 'tanya', he: 'תניא ומראי מקומות', mb: 3.2, group: 'core', prefixes: ['tanya/', 'notes/tanya/'] },
  { id: 'rambam', he: 'רמב״ם – משנה תורה', mb: 24.1, group: 'core', prefixes: ['rambam/'], extra: ['rambam-errata.json'] },
  { id: 'siddur', he: 'סידור – נוסח חב״ד', mb: 2.2, group: 'core', prefixes: ['siddur/'] },
  { id: 'hayomyom', he: 'היום יום', mb: 0.8, group: 'core', prefixes: ['hayomyom/'] },
  { id: 'mitzvot', he: 'ספר המצוות וניקוד', mb: 2.7, group: 'core', prefixes: ['mitzvot/', 'mitzvot-voc/'] },
  { id: 'onkelos', he: 'תרגום אונקלוס (לשניים מקרא)', mb: 2.6, group: 'core', prefixes: ['onkelos/'] },
  { id: 'ravyomi', he: 'שולחן ערוך הרב (רב יומי)', mb: 3.4, group: 'core', prefixes: ['ravyomi/'] },
  { id: 'tolt', he: 'תורה אור ולקוטי תורה והערות', mb: 30.8, group: 'core', prefixes: ['tolt/', 'notes/tolt/'] },
  { id: 'sbiur', he: 'ביאורים קצרים ומילון', mb: 9.0, group: 'core', prefixes: ['sbiur/'], extra: ['glossary.json', 'sources.json'] },
  { id: 'nach', he: 'נ״ך ופירושים (מצודת דוד / רש״י)', mb: 14.2, group: 'extra', prefixes: ['nach/', 'nachv/'] },
  { id: 'mishnah', he: 'משנה ופירוש ברטנורא', mb: 26.6, group: 'extra', prefixes: ['gemara/mishna/', 'gemara/msay/'], extra: ['gemara/index.json'] },
  { id: 'yerushalmi', he: 'תלמוד ירושלמי ופני משה (נפח גדול)', mb: 63.6, group: 'shas', prefixes: ['gemara/yer/', 'gemara/ysay/'], extra: ['gemara/index.json'] },
  { id: 'bavli', he: 'תלמוד בבלי וביאור שטיינזלץ (נפח גדול מאוד)', mb: 166.5, group: 'shas', prefixes: ['gemara/bavli/', 'gemara/bsay/'], extra: ['gemara/index.json'] },
  { id: 'search', he: 'אינדקס החיפוש המקומי', mb: 15.5, group: 'extra', prefixes: ['search/'] },
];

/** navigator.storage.persist(): true/false = browser's real answer, null = not supported */
export async function persistStorage() {
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch { return null; }
}

export function persistMessage(persist) {
  if (persist === true) return 'הדפדפן אישר אחסון קבוע.';
  if (persist === false) return 'הדפדפן לא אישר אחסון קבוע, ולכן ייתכן שימחק את השמירה אם יחסר מקום או לאחר זמן רב ללא שימוש (בעיקר ב-iPhone).';
  return 'הדפדפן אינו תומך בבקשת אחסון קבוע; ייתכן שימחק את השמירה אם יחסר מקום.';
}

export const fmtMb = bytes => (bytes / 1e6) >= 10 ? `${Math.round(bytes / 1e6)} MB` : `${(bytes / 1e6).toFixed(1)} MB`;

async function resolveCacheNames() {
  let version = '', dataVersion = '';
  try {
    const swText = await fetch('sw.js').then(r => (r.ok ? r.text() : ''));
    version = swText.match(/const VERSION = '([^']*)'/)?.[1] || '';
    dataVersion = swText.match(/const DATA_VERSION = '([^']*)'/)?.[1] || '';
  } catch { /* offline */ }
  if (!dataVersion && typeof caches === 'object') {
    const keys = await caches.keys().catch(() => []);
    const dk = keys.find(k => k.startsWith('data-'));
    if (dk) dataVersion = dk.slice(5);
    const sk = keys.find(k => k.startsWith('shell-'));
    if (!version && sk) version = sk.slice(6);
  }
  return {
    dataCacheName: dataVersion ? `data-${dataVersion}` : 'data-offline',
    shellCacheName: version ? `shell-${version}` : null,
  };
}

/**
 * Fetch and explicitly store every relative data path in Cache Storage, verifying each file via match().
 * Files already present in Cache Storage are counted immediately without re-downloading.
 */
export async function verifyCacheFiles(relPaths, { onProgress = () => {}, signal, concurrency = CONCURRENCY } = {}) {
  const unique = [...new Set(relPaths.filter(Boolean))];
  const total = unique.length;
  let done = 0, verified = 0, failed = 0, bytes = 0, alreadyCached = 0, aborted = false;
  const failedFiles = [];
  if (!total) return { total: 0, verified: 0, failed: 0, failedFiles, bytes: 0, alreadyCached: 0, aborted: false };
  if (typeof caches !== 'object') {
    return { total, verified: 0, failed: total, failedFiles: unique, bytes: 0, alreadyCached: 0, aborted: false };
  }

  const { dataCacheName, shellCacheName } = await resolveCacheNames();
  const dataCache = await caches.open(dataCacheName);
  const shellCache = shellCacheName ? await caches.open(shellCacheName) : dataCache;
  const base = typeof document !== 'undefined' ? document.baseURI : location.href;

  let idx = 0;
  async function worker() {
    while (idx < unique.length) {
      if (signal?.aborted) { aborted = true; return; }
      const f = unique[idx++];
      const url = new URL('data/' + f, base).href;
      const targetCache = INDEX_OR_META_RE.test(f) ? shellCache : dataCache;
      try {
        const existing = await caches.match(url);
        if (existing) {
          alreadyCached++;
          verified++;
          done++;
          onProgress({ done, total, verified, failed, bytes, alreadyCached });
          continue;
        }
        const r = await fetch(url, { signal });
        if (!r.ok) {
          failed++;
          failedFiles.push(f);
        } else {
          const buf = await r.arrayBuffer();
          const headers = new Headers(r.headers);
          if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
          await targetCache.put(url, new Response(buf, { status: r.status, statusText: r.statusText, headers }));
          const confirmed = await targetCache.match(url);
          if (confirmed) {
            verified++;
            bytes += buf.byteLength;
          } else {
            failed++;
            failedFiles.push(f);
          }
        }
      } catch (e) {
        if (e?.name === 'AbortError' || signal?.aborted) { aborted = true; return; }
        failed++;
        failedFiles.push(f);
      }
      done++;
      onProgress({ done, total, verified, failed, bytes, alreadyCached });
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, unique.length) }, worker);
  await Promise.all(workers);
  return { total, verified, failed, failedFiles, bytes, alreadyCached, aborted };
}

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }

async function loadManifestAndSearch() {
  const [man, searchMeta] = await Promise.all([
    fetch('data/manifest.json').then(r => (r.ok ? r.json() : null)).catch(() => null),
    data('search/shards.json').catch(() => null),
  ]);
  return { man, searchMeta };
}

function filesForCorpus(c, manifestFiles, searchMeta) {
  if (c.id === 'search') {
    if (searchMeta?.shards?.length) return ['search/shards.json', ...searchMeta.shards.map(s => `search/${s.id}.json`)];
    return manifestFiles.filter(f => f.startsWith('search/'));
  }
  const set = new Set(c.extra || []);
  for (const f of manifestFiles) if (c.prefixes.some(p => f.startsWith(p))) set.add(f);
  return [...set];
}

export async function renderOffline({ shell, $, toast }) {
  document.title = 'הורדה לשימוש בלי אינטרנט – חת״ת ורמב״ם';
  shell('הורדה לשימוש בלי אינטרנט', `<p>כאן אפשר להוריד למכשיר ספרים שלמים – ובהם כל הטקסטים, הפירושים והאינדקסים – כך שיעבדו במלואם גם בלי חיבור לרשת.</p>
    <p class="note" id="off-quota">בודק מצב אחסון במכשיר…</p>
    <div class="set-actions" id="off-presets">
      <button type="button" class="btn" id="off-core">בחירת חת״ת, רמב״ם וסידור</button>
      <button type="button" class="btn" id="off-all-no-shas">בחר הכל (ללא בבלי וירושלמי)</button>
      <button type="button" class="btn" id="off-all">בחר הכל (כולל ש״ס)</button>
      <button type="button" class="btn ghost" id="off-none">נקה בחירה</button>
    </div>
    <form class="form" id="off-form" onsubmit="return false">
      <fieldset><legend>ספרי ליבה ושיעורים יומיים</legend><div id="off-core-list"></div></fieldset>
      <fieldset><legend>ספרייה מורחבת וחיפוש</legend><div id="off-extra-list"></div></fieldset>
      <fieldset><legend>תלמוד בבלי וירושלמי (נפח גדול)</legend><div id="off-shas-list"></div>
        <small>שימו לב: הבבלי והירושלמי כוללים מעל 13,800 קבצים (~230 MB על הדיסק). בדפדפנים מסוימים (במיוחד במכשירים ניידים) שמירה של מאות מגה־בייט עלולה להיחסם או להידחק ממכסת האחסון.</small>
      </fieldset>
      <fieldset id="off-voice-box"><legend>קול איכותי להקראה (אופציונלי)</legend><div id="off-voice-list">בודק קולות…</div>
        <small>קולות ההקראה נשמרים בנפרד ואינם יורדים אוטומטית. אפשר לבחור כאן את הקול הרצוי לפי הגדרות ההקראה שלך.</small>
      </fieldset>
    </form>
    <p id="off-summary" class="warn">טוען רשימת קבצים…</p>
    <div class="set-actions">
      <button type="button" class="btn primary" id="off-start" disabled>הורד למכשיר</button>
      <button type="button" class="btn" id="off-retry" hidden>נסה שוב להשלים חסרים</button>
      <button type="button" class="btn ghost" id="off-cancel" hidden>ביטול</button>
    </div>
    <progress id="off-prog" max="1" value="0" hidden></progress>
    <p id="off-st" role="status" aria-live="polite"></p>
    <p class="note">הגדלים המוצגים הם גודל הקבצים על הדיסק; ההעברה מהרשת דחוסה וקטנה יותר. אישור ״נשמר״ מוצג רק לאחר אימות שהקבצים נכתבו בפועל למטמון במכשיר.</p>`);

  const quotaEl = $('#off-quota'), sumEl = $('#off-summary'), startBtn = $('#off-start'), retryBtn = $('#off-retry'), cancelBtn = $('#off-cancel'), prog = $('#off-prog'), stEl = $('#off-st');
  const defaultCore = new Set(['torah', 'tehillim', 'tanya', 'rambam', 'siddur', 'hayomyom', 'mitzvot', 'onkelos', 'ravyomi', 'sbiur']);
  const renderList = (sel, items, checkedFn) => {
    const host = $(sel);
    host.innerHTML = items.map(c => `<label class="check"><input type="checkbox" name="off-c" value="${c.id}"${checkedFn(c) ? ' checked' : ''}><span><b>${esc(c.he)}</b> <small>(כ־${c.mb} MB${c.count ? `, ${c.count.toLocaleString('he-IL')} קבצים` : ''})</small></span></label>`).join('');
  };

  // Initial render before manifest loads
  renderList('#off-core-list', CORPORA.filter(c => c.group === 'core'), c => defaultCore.has(c.id));
  renderList('#off-extra-list', CORPORA.filter(c => c.group === 'extra'), () => false);
  renderList('#off-shas-list', CORPORA.filter(c => c.group === 'shas'), () => false);

  // Storage estimate & persisted status
  (async () => {
    const parts = [];
    try {
      const p = await navigator.storage?.persisted?.();
      if (p === true) parts.push('אחסון קבוע: מאושר');
      else if (p === false) parts.push('אחסון קבוע: טרם אושר (יתבקש בעת השמירה)');
      const est = await navigator.storage?.estimate?.();
      if (est?.quota) parts.push(`בשימוש במכשיר: ${fmtMb(est.usage || 0)} מתוך כ־${fmtMb(est.quota)}`);
    } catch { /* ignore */ }
    if (quotaEl && quotaEl.isConnected) quotaEl.textContent = parts.length ? parts.join(' · ') : 'הקבצים נשמרים במטמון המקומי של הדפדפן (Cache Storage).';
  })();

  // Piper voices (honest sizes, pre-highlight user's active preference, never forced)
  const vMap = {};
  const activeVoice = modelFor(prefs.ttsGender, prefs.ttsModel);
  const voiceChoices = [
    ['full', 'קול איכותי רגיל (noa)'],
    ['int8', 'קול איכותי קל (noa int8)'],
    ['natural', 'קול גברי טבעי (CC BY-NC)'],
  ];
  let vSt = { full: false, int8: false, natural: false };
  if (piperSupported()) {
    vSt = await voiceStatus();
    for (const [id] of voiceChoices) vMap[id] = vSt[id] ? 0 : await voiceMissingBytes(id);
    if ($('#off-voice-list')) {
      $('#off-voice-list').innerHTML = voiceChoices.map(([id, label]) => {
        const have = vSt[id], miss = vMap[id];
        const tag = id === activeVoice ? ' · נבחר בהגדרות' : '';
        return `<label class="check"><input type="checkbox" name="off-v" value="${id}"${have ? ' disabled' : ''}><span><b>${esc(label)}</b> <small>(${have ? 'מותקן במכשיר' : `כ־${mb(miss)} MB להורדה`}${tag})</small></span></label>`;
      }).join('');
    }
  } else if ($('#off-voice-box')) {
    $('#off-voice-box').hidden = true;
  }

  const { man, searchMeta } = await loadManifestAndSearch();
  if (!$('#off-form')) return;
  const manifestFiles = man?.files ? Object.keys(man.files) : [];
  if (searchMeta?.bytes) {
    const sc = CORPORA.find(c => c.id === 'search');
    if (sc) sc.mb = +(searchMeta.bytes / 1e6).toFixed(1);
  }
  const corpusFiles = new Map();
  for (const c of CORPORA) {
    const files = filesForCorpus(c, manifestFiles, searchMeta);
    c.count = files.length;
    corpusFiles.set(c.id, files);
  }
  // Re-render lists with exact file counts while preserving checked state
  const prevChecked = new Set([...$('#off-form').querySelectorAll('input[name=off-c]:checked')].map(x => x.value));
  renderList('#off-core-list', CORPORA.filter(c => c.group === 'core'), c => prevChecked.has(c.id));
  renderList('#off-extra-list', CORPORA.filter(c => c.group === 'extra'), c => prevChecked.has(c.id));
  renderList('#off-shas-list', CORPORA.filter(c => c.group === 'shas'), c => prevChecked.has(c.id));

  const selectedCorpora = () => [...$('#off-form').querySelectorAll('input[name=off-c]:checked')].map(x => x.value);
  const selectedVoices = () => [...$('#off-form').querySelectorAll('input[name=off-v]:checked')].map(x => x.value);
  const updateSummary = () => {
    const cIds = selectedCorpora(), vIds = selectedVoices();
    const files = new Set();
    let dataMb = 0;
    for (const id of cIds) {
      const c = CORPORA.find(x => x.id === id);
      if (c) dataMb += c.mb;
      for (const f of corpusFiles.get(id) || []) files.add(f);
    }
    let voiceMb = 0;
    for (const v of vIds) voiceMb += (vMap[v] || voiceBytes(v)) / 1e6;
    const totalMb = dataMb + voiceMb;
    if (!files.size && !vIds.length) {
      sumEl.textContent = 'לא נבחר אף פריט להורדה.';
      startBtn.disabled = true;
      return;
    }
    const parts = [];
    if (files.size) parts.push(`${files.size.toLocaleString('he-IL')} קבצי טקסט (כ־${dataMb >= 10 ? Math.round(dataMb) : dataMb.toFixed(1)} MB)`);
    if (vIds.length) parts.push(`${vIds.length} קולות הקראה (כ־${Math.round(voiceMb)} MB)`);
    sumEl.textContent = `נבחרו להורדה: ${parts.join(' + ')} · סה״כ כ־${totalMb >= 10 ? Math.round(totalMb) : totalMb.toFixed(1)} MB על הדיסק.`;
    startBtn.disabled = false;
  };
  updateSummary();
  $('#off-form').addEventListener('change', updateSummary);

  const setChecks = fn => {
    $('#off-form').querySelectorAll('input[name=off-c]').forEach(el => { el.checked = fn(CORPORA.find(c => c.id === el.value)); });
    updateSummary();
  };
  $('#off-core').onclick = () => setChecks(c => defaultCore.has(c.id));
  $('#off-all-no-shas').onclick = () => setChecks(c => c.group !== 'shas');
  $('#off-all').onclick = () => setChecks(() => true);
  $('#off-none').onclick = () => {
    $('#off-form').querySelectorAll('input[name=off-v]').forEach(el => { el.checked = false; });
    setChecks(() => false);
  };

  let lastFailed = [], ctrl = null;
  async function runDownload(overrideFiles = null) {
    const cIds = selectedCorpora(), vIds = overrideFiles ? [] : selectedVoices();
    const files = overrideFiles || [...new Set(cIds.flatMap(id => corpusFiles.get(id) || []))];
    if (!files.length && !vIds.length) return;
    ctrl = new AbortController();
    startBtn.disabled = true; retryBtn.hidden = true; cancelBtn.hidden = false; prog.hidden = false; prog.value = 0;
    let res = { total: files.length, verified: 0, failed: 0, failedFiles: [], bytes: 0, alreadyCached: 0, aborted: false };
    try {
      if (files.length) {
        res = await verifyCacheFiles(files, {
          signal: ctrl.signal,
          onProgress: ({ done, total, bytes, alreadyCached }) => {
            if (!stEl.isConnected) return;
            prog.value = total ? done / total : 1;
            const cachedNote = alreadyCached ? ` (${alreadyCached.toLocaleString('he-IL')} כבר במטמון)` : '';
            stEl.textContent = `מוריד ומאמת… ${done.toLocaleString('he-IL')} מתוך ${total.toLocaleString('he-IL')} קבצים · ${fmtMb(bytes)} ירדו${cachedNote}`;
          },
        });
      }
      let voiceOk = true, voiceErr = '';
      for (const v of vIds) {
        if (ctrl.signal.aborted) break;
        try {
          await installVoice(v, (d, t) => {
            if (!stEl.isConnected) return;
            prog.value = t ? d / t : 0;
            stEl.textContent = `מוריד קול איכותי… ${mb(d)} מתוך ${mb(t)} MB`;
          }, ctrl.signal);
        } catch (e) {
          if (e?.name === 'AbortError' || ctrl.signal.aborted) break;
          voiceOk = false; voiceErr = e?.message || 'שגיאה בהורדת הקול';
        }
      }
      if (!stEl.isConnected) return;
      const persist = await persistStorage();
      const pmsg = persistMessage(persist);
      lastFailed = res.failedFiles;
      if (res.aborted || ctrl.signal.aborted) {
        stEl.textContent = `ההורדה בוטלה. אומתו במטמון ${res.verified.toLocaleString('he-IL')} מתוך ${res.total.toLocaleString('he-IL')} קבצים (${fmtMb(res.bytes)}).`;
        retryBtn.hidden = !lastFailed.length;
      } else if (res.failed === 0 && voiceOk) {
        stEl.textContent = `✓ נשמר במכשיר ואומת במטמון: ${res.verified.toLocaleString('he-IL')} קבצים (${fmtMb(res.bytes)} ירדו${res.alreadyCached ? `, ${res.alreadyCached.toLocaleString('he-IL')} כבר היו שמורים` : ''}). ${pmsg}`;
        toast?.('הקבצים נשמרו ואומתו לשימוש בלי אינטרנט');
      } else {
        const parts = [`שמירה חלקית: אומתו במטמון ${res.verified.toLocaleString('he-IL')} מתוך ${res.total.toLocaleString('he-IL')} קבצים (${fmtMb(res.bytes)})`];
        if (res.failed) parts.push(`${res.failed.toLocaleString('he-IL')} קבצים נכשלו`);
        if (!voiceOk) parts.push(`הורדת הקול נכשלה (${voiceErr})`);
        stEl.textContent = parts.join(' · ') + '. ' + pmsg;
        retryBtn.hidden = !lastFailed.length;
      }
      stEl.dataset.persisted = String(persist);
      if (piperSupported()) {
        const freshSt = await voiceStatus();
        $('#off-form')?.querySelectorAll('input[name=off-v]').forEach(el => {
          if (freshSt[el.value]) { el.checked = false; el.disabled = true; }
        });
      }
    } finally {
      ctrl = null;
      if (startBtn.isConnected) { startBtn.disabled = false; cancelBtn.hidden = true; prog.hidden = true; updateSummary(); }
    }
  }
  startBtn.onclick = () => runDownload(null);
  retryBtn.onclick = () => runDownload(lastFailed);
  cancelBtn.onclick = () => ctrl?.abort();
}
