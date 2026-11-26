// Read-only report of what the current lesson will say / has said, vs what the
// settings skip, vs whether the lesson is marked learned. Display text is unchanged.
import { pauseChunks } from './tts-prep.js';
import { prepareSpeechForTTS } from './divine-tts.js';

export const SAID_STATUS = {
  skipped: 'דולג',
  heard: 'הושמע',
  playing: 'מוקרא עכשיו',
  pending: 'יוקרא',
  unheard: 'לא הושמע',
};

export const SAID_REASON = {
  kaddish: 'קדיש, לפי ההגדרה',
  gemara: 'הגמרא הארמית, לפי ההגדרה',
  empty: 'אין טקסט להקראה',
  midstart: 'לא הושמע – ההקראה דילגה או התחילה בהמשך',
};

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/** When a speaker is already running, the report must follow that engine, not the preference
 *  (Piper may have fallen back to Web Speech without setting piperBroken). */
export function resolveSaidEngine({ hasSpeaker = false, speakerIsPiper = false, preferPiper = false } = {}) {
  if (hasSpeaker) return speakerIsPiper ? 'piper' : 'web';
  return preferPiper ? 'piper' : 'web';
}


/** Mirror Speaker / PiperSpeaker.load: one speech string per segment (chunks joined with a space). */
export function speechForSegment(seg, opts = {}) {
  const piper = opts.engine !== 'web';
  const parts = [];
  (seg.parts || []).forEach((html, pi) => {
    const primary = !!(piper && seg.primaryParts?.[pi]);
    const prepared = prepareSpeechForTTS(html, {
      stress: piper ? true : opts.stress !== false,
      divineName: seg.divineNames?.[pi] ?? opts.divineName,
      chol: pi === 0 ? seg.chol : undefined,
      cites: opts.skipCites !== false && !!seg.cites?.[pi],
      primaryStress: primary,
      unit: opts.unit,
    });
    if (primary) parts.push(prepared.replace(/\u05AB/g, ''));
    else if (prepared) parts.push(prepared);
  });
  const text = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  const chunks = text ? pauseChunks(text).map(x => x.c) : [];
  return { text: chunks.join(' ').replace(/\s+/g, ' ').trim(), chunks };
}

export function skipReason(seg, spoken) {
  if (seg?.kaddish) return 'kaddish';
  if (seg?.gemaraSkip) return 'gemara';
  if (!spoken) return 'empty';
  return null;
}

/**
 * segments: ttsSegments()-shaped objects ({ parts, kaddish, gemaraSkip, divineNames, cites, chol, primaryParts, el }).
 * opts: { engine, stress, skipCites, divineName, unit }
 * playback: { heardSi: Set|array, currentSi, started, complete }
 * learned: boolean (progress.done) – independent of what was actually heard.
 */
export function buildSaidReport({ segments = [], opts = {}, playback = {}, learned = false } = {}) {
  const heardSi = playback.heardSi instanceof Set ? playback.heardSi : new Set(playback.heardSi || []);
  const started = !!playback.started;
  const complete = !!playback.complete;
  const currentSi = playback.currentSi;
  const items = [];
  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si] || {};
    const { text } = speechForSegment(seg, opts);
    const reason0 = skipReason(seg, text);
    let status, reason = reason0;
    if (reason0) status = 'skipped';
    else if (!started) status = 'pending';
    else if (heardSi.has(si)) {
      status = (!complete && currentSi === si && playback.playing) ? 'playing' : 'heard';
    } else if (currentSi === si && playback.playing) status = 'playing';
    else if (complete || (typeof currentSi === 'number' && si < currentSi)) {
      status = 'unheard';
      reason = 'midstart';
    } else status = 'pending';
    items.push({
      si,
      id: seg.el?.dataset?.id ?? String(si),
      status,
      reason,
      speech: reason0 ? '' : text,
    });
  }
  const counts = { skipped: 0, heard: 0, playing: 0, pending: 0, unheard: 0 };
  for (const it of items) counts[it.status] = (counts[it.status] || 0) + 1;
  return { learned: !!learned, started, complete, counts, items };
}

export function saidToTsv(report) {
  const head = ['si', 'id', 'status', 'status_he', 'reason', 'reason_he', 'speech'].join('\t');
  const lines = (report.items || []).map(it => [
    it.si,
    String(it.id ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, ' '),
    it.status,
    SAID_STATUS[it.status] || it.status,
    it.reason || '',
    it.reason ? (SAID_REASON[it.reason] || it.reason) : '',
    String(it.speech || '').replace(/\t/g, ' ').replace(/\r?\n/g, ' '),
  ].join('\t'));
  return [head, ...lines].join('\n') + '\n';
}

export function renderSaidHtml(report) {
  const n = report.items?.length || 0;
  const c = report.counts || {};
  const learned = report.learned
    ? 'השיעור מסומן כנלמד'
    : 'השיעור לא מסומן כנלמד';
  const skipNote = c.skipped || c.unheard
    ? ' סימון «נלמד» אינו זהה ל«הושמע»: חלק מהקטעים דולגו לפי ההגדרות, או שההקראה התחילה באמצע.'
    : '';
  const summary = `קטעים: ${n}. הושמע: ${c.heard || 0}, דולג: ${c.skipped || 0}, יוקרא: ${c.pending || 0}, לא הושמע: ${c.unheard || 0}${c.playing ? ', מוקרא עכשיו: ' + c.playing : ''}.`;
  const rows = (report.items || []).map(it => {
    const why = it.reason ? ` <span class="said-why">(${esc(SAID_REASON[it.reason] || it.reason)})</span>` : '';
    const body = it.speech
      ? `<p class="said-speech">${esc(it.speech)}</p>`
      : '<p class="said-speech said-empty">—</p>';
    return `<li class="said-item" data-status="${esc(it.status)}" data-si="${it.si}"><div class="said-h"><span class="said-st">${esc(SAID_STATUS[it.status] || it.status)}</span>${why}</div>${body}</li>`;
  }).join('');
  return `<div class="said-report" id="said-report">
    <p class="said-sum" id="said-sum">${esc(summary)} ${esc(learned)}.${esc(skipNote)}</p>
    <ol class="said-list">${rows}</ol>
    <button type="button" class="btn" id="sh-said-export">ייצוא לקובץ (רק במכשיר)</button>
    <p class="hint">הקובץ נשמר אצלך בלבד. דבר אינו נשלח לשרת. הטקסט שמוצג בשיעור עצמו לא משתנה.</p>
  </div>`;
}

/** Local file only: a Blob download, no network. */
export function downloadSaidTsv(report, filename = 'said.tsv') {
  const blob = new Blob([saidToTsv(report)], { type: 'text/tab-separated-values;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return blob.size;
}
