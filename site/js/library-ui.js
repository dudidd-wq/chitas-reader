// The library pages (#/lib, #/lib/<node>) and the global search page (#/search?q=…). A chapter itself opens in the
// reader (app.js openReader with R.lib). Everything is local: lists come from site/data, the search index from
// site/data/search (fetched per book on demand, cached by the service worker); the query never leaves the page.
import { FAMILIES, family, libNode, libFiles } from './library.js';
import { compileQuery, prepShard, searchShard, hitHref } from './search.js';
import { gem } from './calendar.js';
import { data } from './texts.js';
import { divineName } from './divine.js';
import { verifyCacheFiles, persistStorage, persistMessage, fmtMb } from './offline.js';

const SEARCH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/></svg>';
export const LIB_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h4v16H4zM10 4h4v16h-4zM16.5 4.5l3.6 1-3.9 14.5-3.6-1"/></svg>';
export { SEARCH_ICON };

const CREDITS = `<section class="lib-credits" aria-labelledby="lib-cr"><h2 id="lib-cr">זכויות ורישיונות</h2>
  <p>הטקסטים נלקחו דרך <a href="https://www.sefaria.org" target="_blank" rel="noopener">ספריא</a> מגרסאות שהרישיון שלהן מתיר הצגה כאן: חומש, נ״ך ותהילים (״מקרא על פי המסורה״) – CC BY-SA; רש״י, הרמב״ם (תורת אמת), המשנה, ברטנורא, מצודת דוד וספר המצוות – נחלת הכלל (כמה פרקי רמב״ם ממהדורות אחרות, CC BY-SA); הסידור – CC0; <b>התניא, תורה אור ולקוטי תורה, שולחן ערוך אדמו״ר הזקן וגמרא בבלי עם שטיינזלץ (קה״ת / דייוידסון) – CC BY-NC, לשימוש לא מסחרי בלבד</b>; <b>הניקוד של ״חסידות בהירה״ בתורה אור ולקוטי תורה – באישור, לשימוש לא מסחרי בלבד</b>. אינדקס החיפוש נגזר מאותם טקסטים וכפוף לאותם רישיונות. מקור ורישיון מופיעים גם בסוף כל פרק. <a href="#/sources">הפירוט המלא – מקורות ורישיונות</a>.</p></section>`;

const searchForm = (q = '', id = 'gs-q') => `<form class="sd-search lib-search" role="search" action="#/search" data-gs><label for="${id}">חיפוש בספרים (חומש, נ״ך, תהילים, משנה, תניא, רמב״ם, מצוות, תורה אור, היום יום, שו״ע הרב וסידור)</label>
  <div class="lib-sbar"><input type="search" id="${id}" name="q" value="${esc(q)}" placeholder="מילה או צירוף, עם ניקוד או בלעדיו" autocomplete="off" enterkeyhint="search"><button class="btn" type="submit" aria-label="חיפוש">${SEARCH_ICON}<span>חיפוש</span></button></div></form>`;
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
function bindSearchForm(root) {
  root.querySelectorAll('form[data-gs]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault(); const q = f.querySelector('input').value.trim();
    location.hash = '#/search' + (q ? '?q=' + encodeURIComponent(q) : '');
  }));
}

/** #/lib and #/lib/<node> (a node that is not a chapter). */
export async function renderLibrary(path, ctx) {
  const { shell, $, getProgress, toast } = ctx;
  if (!path) {
    document.title = 'ספרייה – חת״ת ורמב״ם';
    shell('ספרייה', `<p>כל הספרים שבאתר, לעיון בכל פרק – בלי קשר ללוח השיעורים. הפרק נפתח באותו קורא (גופן, מסך מלא, הקראה, ביאורי מילים, שמירת מקום), ולכל פרק קישור קבוע שעובד גם ללא רשת אחרי שנפתח פעם אחת.</p>
      ${searchForm()}
      <p class="lib-off-link"><a class="btn" href="#/offline">הורד הכל לשימוש בלי אינטרנט (בחירת ספרים)</a></p>
      <ul class="lib-fams">${FAMILIES.map(f => `<li><a class="lib-card" href="${f.href || '#/lib/' + f.id}"><b>${esc(f.he)}</b><span>${esc(f.desc)}</span></a></li>`).join('')}</ul>
      <p class="note lib-note">עיון בספרייה אינו מסמן את שיעורי היום כנלמדו. פרק שקראת עד סופו בספרייה מסומן ✓ ברשימות הספרייה בלבד.</p>
      ${CREDITS}`);
    bindSearchForm($('#view'));
    return;
  }
  shell('ספרייה', '<p>טוען…</p>');
  let r = null; try { r = await libNode(path); } catch { /* offline, index not saved */ }
  if (location.hash.replace(/^#\/?lib\/?/, '').split('?')[0] !== path) return; // navigated away meanwhile
  if (!r) { $('.page').innerHTML = `<h1>ספרייה</h1><p role="alert">${navigator.onLine === false ? 'אין חיבור לרשת, ורשימה זו לא נשמרה במכשיר.' : 'הדף לא נמצא.'}</p><p><a href="#/lib">לכל הספרים</a></p>`; return; }
  const { node, fam, crumbs } = r;
  document.title = `${node.he} – ספרייה`;
  const done = l => getProgress('lib', l.id)?.done;
  const short = kids => kids.every(k => k.leaf && k.he.length <= 9);
  const item = k => k.leaf ? `<li><a href="#/lib/${k.id}"${done(k) ? ' class="done"' : ''}>${esc(k.he)}${done(k) ? '<span class="sr"> – נקרא</span><i aria-hidden="true"> ✓</i>' : ''}</a></li>`
    : `<li><a href="#/lib/${k.id}">${esc(k.he)}<small> · ${countLeaves(k)} ${k.kids?.every(x => x.leaf) ? 'פרקים' : 'חלקים'}</small></a></li>`;
  const list = kids => `<ul class="${short(kids) ? 'lib-grid' : 'lib-list'}">${kids.map(item).join('')}</ul>`;
  let body = '', loose = [];
  const flush = () => { if (loose.length) body += list(loose); loose = []; };
  for (const k of node.kids || []) { if (k.group) { flush(); body += `<h2>${esc(k.he)}</h2>${list(k.kids)}`; } else loose.push(k); }
  flush();
  const files = await libFiles(path).catch(() => []);
  const bigWarn = files.length > 500 ? ` · נפח גדול (${files.length.toLocaleString('he-IL')} קבצים)` : '';
  $('.page').innerHTML = `<nav class="lib-crumbs" aria-label="מיקום בספרייה"><a href="#/lib">ספרייה</a>${crumbs.map(c => ` <i aria-hidden="true">›</i> <a href="#/lib/${c.id}">${esc(c.he)}</a>`).join('')}</nav>
    <h1>${esc(node.he)}</h1>${fam === path ? searchForm() : ''}${body}
    ${files.length ? `<p class="lib-save"><button class="btn" id="lib-dl">שמירת ״${esc(node.he)}״ לשימוש ללא רשת (${files.length.toLocaleString('he-IL')} קבצים${bigWarn})</button></p><p class="note" id="lib-dl-st" role="status" aria-live="polite"></p>` : ''}
    ${fam === path ? CREDITS : ''}`;
  bindSearchForm($('.page'));
  $('#lib-dl')?.addEventListener('click', async () => {
    const b = $('#lib-dl'), st = $('#lib-dl-st');
    const all = [...new Set([...files, 'sources.json'])];
    if (all.length > 500 && !confirm(`הורדת ״${node.he}״ כוללת ${all.length.toLocaleString('he-IL')} קבצים. להמשיך בהורדה למכשיר?`)) return;
    b.disabled = true;
    const res = await verifyCacheFiles(all, {
      onProgress: ({ done: n, total, bytes }) => {
        if (!b.isConnected) return;
        b.textContent = `מוריד ומאמת… ${n.toLocaleString('he-IL')}/${total.toLocaleString('he-IL')} (${fmtMb(bytes)})`;
      },
    });
    if (!b.isConnected) return;
    const persist = await persistStorage();
    const pmsg = persistMessage(persist);
    b.textContent = res.failed === 0 ? '✓ נשמר ואומת במכשיר' : 'שמירה חלקית – נסו שוב';
    b.disabled = res.failed === 0;
    st.textContent = res.failed === 0
      ? `${res.verified.toLocaleString('he-IL')} קבצים נשמרו ואומתו במטמון (${fmtMb(res.bytes)} ירדו); הפרקים ייפתחו גם ללא רשת. ${pmsg}`
      : `שמירה חלקית: אומתו ${res.verified.toLocaleString('he-IL')} מתוך ${res.total.toLocaleString('he-IL')} קבצים (${fmtMb(res.bytes)} ירדו). בדקו חיבור ונסו שוב. ${pmsg}`;
    st.dataset.persisted = String(persist);
    toast?.(st.textContent);
  });
}
const countLeaves = n => n.leaf ? 1 : (n.kids || []).reduce((a, k) => a + countLeaves(k), 0);

// ---------------- search ----------------
const shardCache = new Map(); // id → Promise<prepared shard>; loaded per book on demand
let metaP = null;
const loadMeta = () => (metaP ||= data('search/shards.json').catch(e => { metaP = null; throw e; }));
function loadShard(id) {
  if (!shardCache.has(id)) shardCache.set(id, data(`search/${id}.json`).then(prepShard).catch(e => { shardCache.delete(id); throw e; }));
  return shardCache.get(id);
}
const SHOW = 5;
let runId = 0;
export const searchStats = { last: null };

/** #/search?q=… */
export async function renderSearch(q, scope, ctx) {
  const { shell, $, prefs } = ctx;
  const included = FAMILIES.filter(f => !f.noSearch);
  const excluded = FAMILIES.filter(f => f.noSearch);
  document.title = 'חיפוש בספרים';
  shell('חיפוש בספרים', `<form class="sd-search lib-search" role="search" id="gs-form"><label for="gs-q">מילה או צירוף</label>
    <div class="lib-sbar"><input type="search" id="gs-q" value="${esc(q || '')}" placeholder="למשל: שמע ישראל" autocomplete="off" enterkeyhint="search" aria-describedby="gs-hint"><button class="btn" type="submit" aria-label="חיפוש">${SEARCH_ICON}<span>חיפוש</span></button></div>
    <label class="lib-scope" for="gs-scope">חיפוש ב:</label> <select id="gs-scope"><option value="">כל הספרים שבאינדקס</option>${included.map(f => `<option value="${f.id}"${scope === f.id ? ' selected' : ''}>${esc(f.he)}</option>`).join('')}</select>
    <p class="note" id="gs-hint">אפשר להקליד עם ניקוד או בלעדיו, בכתיב מלא או חסר; גרש וגרשיים אינם משנים. החיפוש נעשה במכשיר בלבד – דבר אינו נשלח. בפעם הראשונה כל ספר נטען (ונשמר במכשיר) כשמחפשים בו.</p>
    <p class="note" id="gs-cov"><b>כלול באינדקס:</b> ${included.map(f => esc(f.he)).join(', ')}. <b>אינו כלול בחיפוש:</b> ${excluded.map(f => esc(f.he)).join(', ')} (בשל נפחם הגדול – ניתן לעיין בהם דרך <a href="#/lib">הספרייה</a>).</p></form>
    <p id="gs-st" role="status" aria-live="polite"></p><div id="gs-res"></div>
    <p class="note"><a href="#/lib">לספרייה</a> · <a href="#/offline">הורדה לאופליין</a> · <a href="#/sources">מקורות ורישיונות</a></p>`);
  const inp = $('#gs-q'), sc = $('#gs-scope');
  let t;
  const go = () => {
    clearTimeout(t); // submitting/changing scope supersedes a pending input debounce
    if (!inp.isConnected) return; // a previous search form must never navigate after leaving it
    const v = inp.value.trim(), s = sc.value;
    const h = '#/search' + (v ? `?q=${encodeURIComponent(v)}${s ? '&in=' + s : ''}` : '');
    if (location.hash !== h) history.replaceState(history.state, '', h);
    run(v, s, ctx);
  };
  $('#gs-form').addEventListener('submit', e => { e.preventDefault(); go(); });
  sc.addEventListener('change', go);
  inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(go, 450); });
  if (q) run(q, scope, ctx); else inp.focus();
}
async function run(q, scope, { $, prefs }) {
  const my = ++runId, st = $('#gs-st'), res = $('#gs-res');
  res.innerHTML = '';
  const Q = compileQuery(q);
  if (!Q) { st.textContent = q ? 'יש להקליד לפחות שתי אותיות.' : ''; return; }
  let meta; try { meta = await loadMeta(); } catch { st.textContent = 'אינדקס החיפוש אינו זמין (אין רשת, והוא לא נשמר במכשיר).'; return; }
  if (my !== runId) return;
  const shards = meta.shards.filter(s => !scope || s.fam === scope);
  const t0 = performance.now(); let first = null, total = 0, books = 0, failed = 0, done = 0, loadedBytes = 0;
  st.textContent = 'מחפש…';
  // fetch a few shards ahead; render each book's results in the fixed book order as soon as it is ready
  const jobs = shards.map(s => ({ s, p: null }));
  const start = i => { if (jobs[i] && !jobs[i].p) jobs[i].p = loadShard(jobs[i].s.id).then(S => ({ S })).catch(() => ({ err: true })); };
  for (let i = 0; i < 4; i++) start(i);
  for (const [i, j] of jobs.entries()) {
    start(i + 4);
    const { S, err } = await j.p;
    if (my !== runId) return;
    done++;
    if (err) { failed++; continue; }
    loadedBytes += j.s.bytes;
    const { hits, more } = searchShard(S, Q, 200);
    if (hits.length) {
      if (first == null) first = performance.now() - t0;
      total += hits.length; books++;
      const sec = document.createElement('section'); sec.className = 'gs-book'; sec.setAttribute('aria-labelledby', `gs-h-${S.id}`);
      sec.innerHTML = `<h2 id="gs-h-${S.id}">${esc(S.he)} <small>(${hits.length}${more ? '+' : ''})</small></h2><ol class="sd-hits gs-hits">${hits.slice(0, SHOW).map(h => hitHtml(h, prefs)).join('')}</ol>${hits.length > SHOW ? `<button class="btn gs-more" aria-expanded="false">עוד ${hits.length - SHOW} תוצאות ב${esc(S.he)}</button>` : ''}`;
      sec.querySelector('.gs-more')?.addEventListener('click', e => { const ol = sec.querySelector('ol'); ol.insertAdjacentHTML('beforeend', hits.slice(SHOW).map(h => hitHtml(h, prefs)).join('')); e.currentTarget.remove(); ol.children[SHOW]?.querySelector('a')?.focus(); });
      res.append(sec);
    }
    st.textContent = `${total ? `נמצאו ${total.toLocaleString('he-IL')} תוצאות ב־${books} ${books === 1 ? 'ספר' : 'ספרים'}` : 'לא נמצאו תוצאות עדיין'} · נבדקו ${done} מתוך ${jobs.length}${done < jobs.length ? '…' : ''}`;
  }
  const ms = performance.now() - t0;
  if (!total) st.textContent = `לא נמצאו תוצאות ל״${q}״.${failed ? ` ${failed} ספרים לא נבדקו (אין רשת, והם לא נשמרו במכשיר).` : ''}`;
  else if (failed) st.textContent += ` · ${failed} ספרים לא נבדקו (אין רשת)`;
  searchStats.last = { q, firstMs: first, totalMs: ms, shards: jobs.length, failed, total, loadedBytes, heap: performance.memory?.usedJSHeapSize || null };
  document.body.dataset.searchDone = String(my);
}
function hitHtml(h, prefs) {
  const [path, label] = h.chapter, seg = h.id;
  let where = '';
  if (path.startsWith('torah/')) { const v = +seg.replace(/^r/, '').split(':')[1]; where = `${seg.startsWith('r') ? 'רש״י על ' : ''}פסוק ${gem(v)}`; }
  else if (path.startsWith('nach/')) { const v = +seg.split(':')[1]; if (v) where = `פסוק ${gem(v)}`; }
  else if (path.startsWith('mishnah/')) { const n = +seg.split('.')[1]; if (n) where = `משנה ${gem(n)}`; }
  else if (path.startsWith('tehillim/')) where = `פסוק ${gem(+seg.split(':')[1])}`;
  else if (path.startsWith('rambam/')) { const n = +seg.split('.').pop(); if (n) where = `הלכה ${gem(n)}`; }
  const [a, m, b] = h.snip.map(x => divineName(esc(x), prefs.divine));
  return `<li><a href="${hitHref(h)}">${esc(label)}${where ? ` · ${where}` : ''}</a><p lang="he">${a}<mark>${m}</mark>${b}</p></li>`;
}
