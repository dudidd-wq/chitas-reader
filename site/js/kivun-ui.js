// "כיוון התפילה" page (#/kivun): the direction to the Temple Mount from a city, the device position (read only when the
// user taps "המיקום שלי") or typed coordinates – all computed on the device, nothing is sent anywhere. With a compass
// sensor (deviceorientationabsolute on Android, webkitCompassHeading on iOS after the permission prompt) the dial turns
// with the phone; without one the direction is shown in degrees from north.
import { CITIES, cityById } from './zmanim.js';
import { kivunFor, headingFromEvent, makeSmoother, sensorQuality, turnHint, angDiff, fmtDeg, fmtKm, parseLatLon, dirName, TARGET } from './kivun.js';

export const COMPASS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>';
let stopFn = null;
/** detach the sensor listeners (called on every navigation) */
export function stopKivun() { if (stopFn) { try { stopFn(); } catch { /* ignore */ } stopFn = null; } }

const LEVEL = {
  mount: 'אתם סמוכים להר הבית: כאן הכיוון תלוי במיקום המדויק שלכם ובמקום המדויק של המקדש (שנחלקו בו) – אין לסמוך על המצפן; בררו במקום.',
  jerusalem: 'בירושלים: מכוונים כנגד המקדש (הר הבית).',
  il: 'בארץ ישראל: מכוונים כנגד ירושלים, ומכוונים גם למקדש ולבית קודש הקודשים.',
  chul: 'בחוץ לארץ: מכוונים כנגד ארץ ישראל, ומכוונים גם לירושלים ולמקדש.',
  far: 'כיוון ירושלים – הר הבית.',
};
const WARN = {
  uncal: 'המצפן אינו מכויל: הזיזו את המכשיר באוויר בתנועת הספרה 8 כמה פעמים, ואז החזיקו אותו שטוח.',
  unstable: 'הקריאה אינה יציבה: התרחקו ממתכות, מגנטים (גם נרתיק או מחזיק מגנטי) וממכשירי חשמל, והחזיקו את המכשיר יציב.',
  tilt: 'החזיקו את המכשיר שטוח, מקביל לרצפה, כשראשו מופנה קדימה.',
};

function placeOf(ctx) {
  const { prefs } = ctx, k = prefs.kivunPlace || '';
  const ok = g => g && Number.isFinite(g.lat) && Number.isFinite(g.lon) && Math.abs(g.lat) <= 90 && Math.abs(g.lon) <= 180;
  if (k === 'geo' && ok(prefs.kivunGeo)) return { id: 'geo', he: 'המיקום שלי', ...prefs.kivunGeo };
  if (k === 'manual' && ok(prefs.kivunManual)) return { id: 'manual', he: 'קואורדינטות שהוקלדו', ...prefs.kivunManual };
  const c = cityById(k);
  if (c) return c;
  const z = ctx.zmanPlace();                                     // default: the place chosen for "זמני היום"
  return { ...z, id: '', he: z.he, il: z.id === 'geo' ? undefined : z.il, fromZmanim: true };
}

function dial() {
  const ticks = Array.from({ length: 72 }, (_, i) => { const a = i * 5, long = a % 30 === 0; return `<line x1="100" y1="${long ? 14 : 18}" x2="100" y2="24" transform="rotate(${a} 100 100)" class="${long ? 'kv-tick-l' : 'kv-tick'}"/>`; }).join('');
  const lab = (t, a) => `<text x="100" y="40" transform="rotate(${a} 100 100)" class="kv-lab${a === 0 ? ' kv-n' : ''}">${t}</text>`;
  return `<svg viewBox="0 0 200 200" class="kv-svg" aria-hidden="true" focusable="false">
    <circle cx="100" cy="100" r="92" class="kv-face"/>
    <g id="kv-rose">${ticks}${lab('צ', 0)}${lab('מז', 90)}${lab('ד', 180)}${lab('מע', 270)}
      <g id="kv-tgt"><circle cx="100" cy="10" r="7" class="kv-tgt"/></g></g>
    <g id="kv-arrow"><path d="M100 30 L114 64 L104 60 L104 132 L96 132 L96 60 L86 64 Z" class="kv-arr"/></g>
    <path d="M100 196 l-7 -10 h14 z" class="kv-me"/>
    <circle cx="100" cy="100" r="5" class="kv-hub"/>
  </svg>`;
}

export function renderKivun(ctx) {
  stopKivun();
  const { prefs, setPref, esc, $, shell, PIN } = ctx;
  const pl = placeOf(ctx), k = kivunFor(pl);
  const opt = c => `<option value="${c.id}" ${c.id === pl.id ? 'selected' : ''}>${esc(c.he)}</option>`;
  const coord = p => `<bdi dir="ltr">${p.lat.toFixed(4)}, ${p.lon.toFixed(4)}</bdi>`;
  document.title = 'כיוון התפילה – מצפן';
  const summary = `כיוון: ${fmtDeg(k.bearing)} ${k.name}`;
  shell('כיוון התפילה', `
  <p class="kv-lead">לאן לפנות בתפילה: הכיוון אל הר הבית בירושלים (מקום המקדש), מחושב במכשיר. פרטים – לפי הוראת רב.</p>
  <div class="zm-place">
    <label for="kv-place">מקום</label>
    <select id="kv-place">
      <option value="" ${pl.fromZmanim ? 'selected' : ''}>כמו בזמני היום${pl.fromZmanim ? ` (${esc(pl.he)})` : ''}</option>
      ${pl.id === 'geo' || (prefs.kivunGeo && Number.isFinite(prefs.kivunGeo.lat) && Number.isFinite(prefs.kivunGeo.lon)) ? `<option value="geo" ${pl.id === 'geo' ? 'selected' : ''}>המיקום שלי (${prefs.kivunGeo.lat.toFixed(2)}, ${prefs.kivunGeo.lon.toFixed(2)})</option>` : ''}
      <optgroup label="ארץ ישראל">${CITIES.filter(c => c.il).map(opt).join('')}</optgroup>
      <optgroup label="חוץ לארץ">${CITIES.filter(c => !c.il).map(opt).join('')}</optgroup>
      <option value="manual" ${pl.id === 'manual' ? 'selected' : ''}>הקלדת קואורדינטות…</option>
    </select>
    <button class="btn" type="button" id="kv-geo">${PIN}<span>המיקום שלי</span></button>
  </div>
  <form id="kv-man" class="kv-man" ${pl.id === 'manual' || (prefs.kivunPlace === 'manual' && !prefs.kivunManual) ? '' : 'hidden'} novalidate>
    <label>קו רוחב (צפון +, דרום −)<input id="kv-lat" dir="ltr" inputmode="decimal" autocomplete="off" placeholder="31.7683" value="${prefs.kivunManual ? prefs.kivunManual.lat : ''}" aria-describedby="kv-man-err"></label>
    <label>קו אורך (מזרח +, מערב −)<input id="kv-lon" dir="ltr" inputmode="decimal" autocomplete="off" placeholder="35.2137" value="${prefs.kivunManual ? prefs.kivunManual.lon : ''}" aria-describedby="kv-man-err"></label>
    <button class="btn" type="submit">חישוב</button>
    <p id="kv-man-err" class="dateerr" role="alert"></p>
  </form>
  <p class="note" id="kv-geo-st" role="status" aria-live="polite">${pl.id === 'geo' || pl.id === 'manual' ? `לפי ${coord(pl)} – נשמר במכשיר בלבד.` : pl.fromZmanim ? 'המקום שנבחר בעמוד זמני היום; אפשר לבחור מקום אחר.' : ''}</p>

  <section class="kv-res" aria-labelledby="kv-res-h">
    <h2 id="kv-res-h" class="sr">הכיוון</h2>
    <p class="kv-big"><b id="kv-deg">${fmtDeg(k.bearing)}</b> <span id="kv-name">${esc(k.name)}</span></p>
    <p class="kv-sub">מעלות מצפון אמיתי, עם כיוון השעון${k.km >= 0.05 ? ` · מרחק ${fmtKm(k.km)}` : ''}</p>
    <p class="kv-level">${esc(LEVEL[k.level])}</p>
  </section>

  <div class="kv-dial" id="kv-dial" data-mode="static">${dial()}</div>
  <p class="kv-hint" id="kv-hint">${esc(summary)}, ללא חיישן – כוונו את ראש המכשיר לצפון (צ), והחץ יראה את הכיוון.</p>
  <p class="kv-warn" id="kv-warn" hidden></p>
  <p class="sr" id="kv-live" role="status" aria-live="polite"></p>
  <div class="kv-btns">
    <button class="btn primary" type="button" id="kv-start" aria-pressed="false">${COMPASS}<span>הפעלת המצפן</span></button>
    <button class="btn" type="button" id="kv-static" hidden>כיוון ידני, ללא חיישן</button>
  </div>
  <p class="kv-disc"><b>שימו לב:</b> המצפן מדויק עד כדי חיישן המכשיר; יש להרחיק ממתכות ומגנטים; במקרה ספק יש להתאים לפי הוראת רב.</p>

  <h2>איך משתמשים</h2>
  <ul class="zm-notes">
    <li>לוחצים ״הפעלת המצפן״ (באייפון יש לאשר גישה לחיישני התנועה), מחזיקים את המכשיר שטוח, לאורכו, ומסתובבים עד שהחץ פונה ישר קדימה – אל המשולש שבתחתית.</li>
    <li>ללא חיישן (למשל במחשב): מכוונים את ראש המכשיר לצפון לפי מצפן אחר או לפי סימן מוכר, והחץ מראה את הכיוון; או פונים לפי מספר המעלות.</li>
    <li>החיישן מודד צפון <b>מגנטי</b>; האתר מוסיף את הסטייה המגנטית במקום${k.declination === null ? '' : ` (כאן ${k.declination >= 0 ? 'מזרחה' : 'מערבה'} <bdi dir="ltr">${Math.abs(k.declination).toFixed(1)}°</bdi>)`} לפי המודל המגנטי העולמי WMM2025, כדי להציג כיוון לצפון אמיתי.${k.wmmOutdated ? ' המודל תקף עד 2030 – ייתכן שאינו מעודכן.' : ''}</li>
    <li>החישוב: הכיוון ההתחלתי של הקו הקצר ביותר על פני כדור הארץ (״קשת גדולה״) אל אבן השתייה בהר הבית (<bdi dir="ltr">${TARGET.lat}, ${TARGET.lon}</bdi>). המיקום נקרא רק בלחיצה על ״המיקום שלי״ ונשמר במכשיר בלבד; שום דבר אינו נשלח.</li>
  </ul>
  <h2>מקורות</h2>
  <ul class="zm-notes">
    <li>״היה עומד בחוצה לארץ, מחזיר פניו נוכח ארץ ישראל… היה עומד בארץ, מכוון פניו כנגד ירושלים; היה עומד בירושלים, מכוון פניו כנגד המקדש; היה עומד במקדש, מכוון פניו כנגד בית קודש הקודשים״ (רמב״ם, הלכות תפילה ה, ג). וכן בשולחן ערוך ובשולחן ערוך הרב, אורח חיים צד, א.</li>
    <li>״מי שאינו יכול לכוון את הרוחות… יכוון את ליבו כנגד השכינה״ (רמב״ם שם).</li>
    <li>הרמ״א (אורח חיים צד, ב): ״ואנו שמחזירין פנינו למזרח מפני שאנו יושבים במערבה של ארץ ישראל״. במקומות רחוקים הכיוון לפי ״קשת גדולה״ שונה ממזרח (למשל מניו יורק – צפון-מזרח); כיצד לנהוג – לפי הוראת רב.</li>
  </ul>`);

  // ---- place ----
  const rerender = () => { renderKivun(ctx); };
  $('#kv-place').onchange = e => {
    const v = e.target.value;
    if (v === 'manual') { setPref('kivunPlace', 'manual'); if (!prefs.kivunManual) { $('#kv-man').hidden = false; $('#kv-lat').focus(); return; } }
    else setPref('kivunPlace', v);
    rerender(); $('#kv-place').focus();
  };
  $('#kv-man').onsubmit = e => {
    e.preventDefault();
    const p = parseLatLon($('#kv-lat').value, $('#kv-lon').value);
    if (!p) { for (const i of ['#kv-lat', '#kv-lon']) $(i).setAttribute('aria-invalid', 'true'); $('#kv-man-err').textContent = 'יש להקליד מספרים עשרוניים: קו רוחב בין ‎−90 ל־90, קו אורך בין ‎−180 ל־180.'; return; }
    setPref('kivunManual', p); setPref('kivunPlace', 'manual'); rerender(); $('#kv-deg')?.focus?.();
  };
  $('#kv-geo').onclick = () => {
    const st = $('#kv-geo-st');
    if (!navigator.geolocation) { st.textContent = 'הדפדפן אינו תומך באיתור מיקום. אפשר לבחור עיר או להקליד קואורדינטות.'; return; }
    st.textContent = 'מאתר מיקום…';
    navigator.geolocation.getCurrentPosition(p => {
      const r4 = x => Math.round(x * 1e4) / 1e4;
      setPref('kivunGeo', { lat: r4(p.coords.latitude), lon: r4(p.coords.longitude), acc: Math.round(p.coords.accuracy || 0) }); setPref('kivunPlace', 'geo');
      rerender(); $('#kv-geo')?.focus();
    }, () => { st.textContent = 'לא התקבל מיקום (ההרשאה נדחתה או שאינו זמין). אפשר לבחור עיר או להקליד קואורדינטות.'; }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 300000 });
  };

  // ---- compass ----
  const rose = $('#kv-rose'), arrow = $('#kv-arrow'), tgt = $('#kv-tgt'), hint = $('#kv-hint'), warn = $('#kv-warn'), live = $('#kv-live');
  const dialEl = $('#kv-dial'), start = $('#kv-start'), stat = $('#kv-static');
  tgt.setAttribute('transform', `rotate(${k.bearing.toFixed(2)} 100 100)`);
  const draw = h => {                      // h = heading of the top of the screen (true north); 0 = static, north up
    rose.setAttribute('transform', `rotate(${(-h).toFixed(2)} 100 100)`);
    arrow.setAttribute('transform', `rotate(${angDiff(h, k.bearing).toFixed(2)} 100 100)`);
  };
  draw(0);
  const staticMode = (msg) => {
    stopKivun(); draw(0);
    dialEl.dataset.mode = 'static'; dialEl.classList.remove('kv-on');
    start.setAttribute('aria-pressed', 'false'); start.querySelector('span').textContent = 'הפעלת המצפן'; stat.hidden = true;
    warn.hidden = !msg; warn.textContent = msg || '';
    hint.textContent = `${summary}, ללא חיישן – כוונו את ראש המכשיר לצפון (צ), והחץ יראה את הכיוון.`;
    live.textContent = `${msg ? msg + ' ' : ''}${summary}, ללא חיישן.`;
  };
  stat.onclick = () => staticMode('');
  start.onclick = async () => {
    if (start.getAttribute('aria-pressed') === 'true') { staticMode(''); start.focus(); return; }
    const DOE = window.DeviceOrientationEvent;
    if (!DOE) { staticMode('אין במכשיר זה חיישן כיוון שהדפדפן חושף.'); return; }
    if (typeof DOE.requestPermission === 'function') {
      let r = 'denied'; try { r = await DOE.requestPermission(); } catch { /* not allowed */ }
      if (r !== 'granted') { staticMode('לא ניתנה הרשאה לחיישני התנועה (בהגדרות Safari אפשר לאשר שוב).'); return; }
    }
    listen();
  };
  function listen() {
    stopKivun();
    const sm = makeSmoother();
    let got = false, lastLive = 0, lastQ = '', lastOn = null, timer = 0;
    dialEl.dataset.mode = 'live'; start.setAttribute('aria-pressed', 'true'); start.querySelector('span').textContent = 'עצירת המצפן'; stat.hidden = false;
    hint.textContent = 'ממתין לחיישן…'; live.textContent = 'המצפן מופעל, ממתין לחיישן.';
    const angle = () => { const a = screen.orientation?.angle ?? window.orientation ?? 0; return Number(a) || 0; };
    const on = e => {
      const r = headingFromEvent(e, { screenAngle: angle(), dec: k.declination || 0 });
      if (!r) return;
      got = true;
      const now = performance.now(), h = sm.push(r.heading, now), d = angDiff(h, k.bearing);
      draw(h);
      const q = sensorQuality({ accuracy: r.accuracy, spread: sm.spread(), beta: r.beta });
      const onT = Math.abs(d) <= 5 && q === 'ok';
      dialEl.classList.toggle('kv-on', onT);
      if (q !== lastQ) { warn.hidden = q === 'ok'; warn.textContent = WARN[q] || ''; }
      const txt = q === 'uncal' ? 'המצפן אינו מכויל' : turnHint(d);
      hint.textContent = `${txt} · המכשיר מכוון ל־${fmtDeg(h)} ${dirName(h)}`;
      if (q !== lastQ || onT !== lastOn || now - lastLive > 4000) {
        live.textContent = q !== 'ok' ? `${WARN[q]} ${txt}` : txt; lastLive = now;
      }
      lastQ = q; lastOn = onT;
    };
    const evs = ['deviceorientationabsolute', 'deviceorientation'];
    for (const ev of evs) window.addEventListener(ev, on);
    timer = setTimeout(() => { if (!got) staticMode(`לא התקבלו נתוני מצפן מהחיישן. ${summary}, ללא חיישן.`); }, 2500);
    stopFn = () => { clearTimeout(timer); for (const ev of evs) window.removeEventListener(ev, on); };
  }
}
