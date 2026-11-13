// Local-only storage: preferences + reading progress. Nothing ever leaves the device.
import { dayPlan } from './calendar.js';
import { cleanProfile } from './personal.js';
import { clampPitch } from './voice-pitch.js';
const KEY = 'chitas-reader.v1';
export const DEFAULT_PREFS = {
  theme: 'paper', font: 'noto', readingBold: false, hideSiddurInstructions: false, size: 24, lineHeight: 1.9, layout: 'pages',
  taamim: true, rashi: true, hayomNiqqud: true, biurNiqqud: true, mitzvotNiqqud: true, lessonNach: false, lessonShnayim: false, shnayimSplit: 'day', gloss: 'tap', il: true, rambamTrack: 'both', lessonMitzvot: false, lessonTolt: false, lessonRavYomi: false, lessonDaf: false, lessonAmud: false, lessonYer: false, lessonMishna: false,
  ttsRate: 1, ttsVoice: '', ttsStress: true, ttsDivine: 'hashem', ttsRashi: true, ttsSkipCites: true, ttsContinuous: true,
  ttsLockscreen: true, ttsEngine: 'web', ttsModel: 'full', ttsGender: 'male', ttsHavara: 'israeli', ttsPitch: 0, wakeLock: true, spread: true, locationChosen: false,
  zmanPlace: '', zmanGeo: null, kivunPlace: '', kivunGeo: null, kivunManual: null, candleMins: 0,
  divine: 'full', siddurLang: 'he', tachanunMode: 'off', shabbatMode: 'off', // 1.0.74 same three values
  siddurKaddish: 'read', // 1.0.90: 'read' | 'skip' (Kaddish in the siddur read-aloud)
  // 1.0.73: 'off' | 'date' | 'always' (1.0.72 boolean hideNoTachanun true → 'date')
  // round 7: language of the siddur's instructions – 'he' | 'en' | 'both'
  tehillimProfiles: [], tehillimRebbe: false,
  studyNotes: true, // round 8: "מראי מקומות" / short-explanation link after the text (texts.js 'notes' blocks) // round 8: personal Tehillim [{id, name, greg|hy/hm/hd|age, afterSunset}] – on this device only
};
// One speed scale for the footer menu and the settings slider.
export const TTS_RATES = [0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6];
export const snapRate = r => TTS_RATES.reduce((a, b) => (Math.abs(b - r) < Math.abs(a - r) ? b : a), 1);
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || '{}'), prefs = { ...DEFAULT_PREFS, ...(d.prefs || {}) };
    for (const k of ['readingBold', 'hideSiddurInstructions']) if (typeof prefs[k] !== 'boolean') prefs[k] = false;
    if (typeof prefs.hayomNiqqud !== 'boolean') prefs.hayomNiqqud = true;
    if (typeof prefs.biurNiqqud !== 'boolean') prefs.biurNiqqud = true;
    if (typeof prefs.mitzvotNiqqud !== 'boolean') prefs.mitzvotNiqqud = true;
    if (!['day', 'week'].includes(prefs.shnayimSplit)) prefs.shnayimSplit = 'day';
    prefs.ttsRate = snapRate(Number(prefs.ttsRate) || 1);
    if ('hideNoTachanun' in prefs) { if (prefs.hideNoTachanun === true && !(d.prefs || {}).tachanunMode) prefs.tachanunMode = 'date'; delete prefs.hideNoTachanun; }
    for (const k of ['tachanunMode', 'shabbatMode']) if (!['off', 'date', 'always'].includes(prefs[k])) prefs[k] = 'off';
    if (!['read', 'skip'].includes(prefs.siddurKaddish)) prefs.siddurKaddish = 'read';
    // round 7: the old on/off switch for the English instructions became a language choice. Both old values move to
    // the new default (Hebrew): those who hid the English did so because it was English.
    delete prefs.siddurEn;
    if (!['he', 'en', 'both'].includes(prefs.siddurLang)) prefs.siddurLang = 'he';
    // 1.0.59: 'web' = the browser's / device's voice (Web Speech), 'piper' = the downloaded local voice (noa)
    if (!['web', 'piper'].includes(prefs.ttsEngine)) prefs.ttsEngine = 'web';
    if (!['full', 'int8'].includes(prefs.ttsModel)) prefs.ttsModel = 'full';
    // 1.0.60: the local voice reads with a male timbre by default (signal processing of the same noa model, no extra
    // download); 'female' = the model's own voice
    // 1.0.88: 'deep' = noa lowered further (no download); 'natural' = a real male voice (separate model, downloaded on choice)
    if (!['male', 'deep', 'natural', 'female'].includes(prefs.ttsGender)) prefs.ttsGender = 'male';
    if (!['israeli', 'chabad'].includes(prefs.ttsHavara)) prefs.ttsHavara = 'israeli';   // 1.0.91
    prefs.ttsPitch = clampPitch(prefs.ttsPitch);   // 1.0.92: semitones −6…+6, step 0.5; 0 = the voice as it was
    return { prefs, progress: d.progress || {} };
  }
  catch { return { prefs: { ...DEFAULT_PREFS }, progress: {} }; }
}
const state = load();
function save() {
  // keep at most 2,500 progress entries (one per lesson and day: about 500 days of all five lessons), dropping the oldest
  const keys = Object.keys(state.progress);
  if (keys.length > 2500) keys.sort((a, b) => (state.progress[a].t || 0) - (state.progress[b].t || 0)).slice(0, keys.length - 2500).forEach(k => delete state.progress[k]);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or disabled */ }
}
export const prefs = state.prefs;
export function setPref(k, v) { state.prefs[k] = v; save(); document.dispatchEvent(new CustomEvent('prefs', { detail: { k, v } })); }
// On days when Israel and the Diaspora read a different Chumash portion (~30–40 days a year), the reading position is
// kept per location ("|il" / "|dl"), so switching location never resumes in the middle of a different text.
const divergent = new Map();
export function isDivergent(iso, unit) {
  if (unit !== 'chumash') return false;
  if (!divergent.has(iso)) {
    let d = false;
    try { d = JSON.stringify(dayPlan(iso, { il: true }).chumash?.parts) !== JSON.stringify(dayPlan(iso, { il: false }).chumash?.parts); } catch { /* bad date */ }
    divergent.set(iso, d);
  }
  return divergent.get(iso);
}
export const progressKey = (iso, unit, il = state.prefs.il) => `${iso}|${unit}${isDivergent(iso, unit) ? (il ? '|il' : '|dl') : ''}`;
export function getProgress(iso, unit) { return state.progress[progressKey(iso, unit)] || null; }
export function setProgress(iso, unit, p) {
  const k = progressKey(iso, unit), old = state.progress[k] || {};
  state.progress[k] = { ...old, ...p, done: old.done || p.done || false, t: Date.now() };
  save();
}
export function clearProgress(iso, unit) { delete state.progress[progressKey(iso, unit)]; save(); }

export function exportBackup() {
  const data = { app: 'chitas-reader', format: 1, exportedAt: new Date().toISOString(), prefs: state.prefs, progress: state.progress };
  return new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
}
export function importBackup(text) {
  const d = JSON.parse(text);
  if (d.app !== 'chitas-reader' || typeof d.progress !== 'object') throw new Error('bad file');
  for (const [k, v] of Object.entries(d.prefs || {})) if (k in DEFAULT_PREFS && typeof v === typeof DEFAULT_PREFS[k] && Array.isArray(v) === Array.isArray(DEFAULT_PREFS[k])) state.prefs[k] = v;
  if (Array.isArray(state.prefs.tehillimProfiles)) state.prefs.tehillimProfiles = state.prefs.tehillimProfiles.map(cleanProfile).filter(Boolean).slice(0, 50);
  for (const [k, v] of Object.entries(d.progress)) if ((/^\d{4}-\d\d-\d\d\|[a-z0-9]+(\|il|\|dl)?$/.test(k) || /^siddur\|[a-z]+\/\d+$/.test(k) || /^lib\|[a-z]+(\/[A-Za-z0-9_-]+){1,3}$/.test(k)) && v && typeof v === 'object') state.progress[k] = v;
  save();
}
export function resetAll() { localStorage.removeItem(KEY); location.reload(); }
