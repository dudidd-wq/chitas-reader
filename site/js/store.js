// Local-only storage: preferences + reading progress. Nothing ever leaves the device.
import { dayPlan } from './calendar.js';
const KEY = 'chitas-reader.v1';
export const DEFAULT_PREFS = {
  theme: 'paper', font: 'noto', size: 24, lineHeight: 1.9, layout: 'pages',
  taamim: true, rashi: true, gloss: 'tap', il: true, rambamTrack: 'both', lessonMitzvot: false, lessonTolt: false,
  ttsRate: 1, ttsVoice: '', ttsStress: true, ttsDivine: 'hashem', ttsRashi: true, ttsSkipCites: true, ttsContinuous: true,
  ttsLockscreen: true, wakeLock: true, spread: true, locationChosen: false,
  zmanPlace: '', zmanGeo: null, candleMins: 0,
  divine: 'full', siddurEn: true,
};
// One speed scale for the footer menu and the settings slider.
export const TTS_RATES = [0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6];
export const snapRate = r => TTS_RATES.reduce((a, b) => (Math.abs(b - r) < Math.abs(a - r) ? b : a), 1);
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || '{}'), prefs = { ...DEFAULT_PREFS, ...(d.prefs || {}) };
    prefs.ttsRate = snapRate(Number(prefs.ttsRate) || 1);
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
  for (const [k, v] of Object.entries(d.prefs || {})) if (k in DEFAULT_PREFS && typeof v === typeof DEFAULT_PREFS[k]) state.prefs[k] = v;
  for (const [k, v] of Object.entries(d.progress)) if (/^\d{4}-\d\d-\d\d\|[a-z0-9]+(\|il|\|dl)?$/.test(k) && v && typeof v === 'object') state.progress[k] = v;
  save();
}
export function resetAll() { localStorage.removeItem(KEY); location.reload(); }
