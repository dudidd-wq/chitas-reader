// Local-only storage: preferences + reading progress. Nothing ever leaves the device.
const KEY = 'chitas-reader.v1';
export const DEFAULT_PREFS = {
  theme: 'paper', font: 'noto', size: 24, lineHeight: 1.9, layout: 'pages',
  taamim: true, rashi: true, gloss: 'tap', il: true, rambamTrack: 'both',
  ttsRate: 1, ttsVoice: '', ttsStress: true, ttsDivine: 'hashem', ttsRashi: true, ttsContinuous: true,
  ttsLockscreen: true, wakeLock: true, spread: true, locationChosen: false,
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
  // keep at most ~400 days of progress
  const keys = Object.keys(state.progress);
  if (keys.length > 2500) keys.sort((a, b) => (state.progress[a].t || 0) - (state.progress[b].t || 0)).slice(0, keys.length - 2500).forEach(k => delete state.progress[k]);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or disabled */ }
}
export const prefs = state.prefs;
export function setPref(k, v) { state.prefs[k] = v; save(); document.dispatchEvent(new CustomEvent('prefs', { detail: { k, v } })); }
export const progressKey = (iso, unit) => `${iso}|${unit}`;
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
  for (const [k, v] of Object.entries(d.progress)) if (/^\d{4}-\d\d-\d\d\|[a-z0-9]+$/.test(k) && v && typeof v === 'object') state.progress[k] = v;
  save();
}
export function resetAll() { localStorage.removeItem(KEY); location.reload(); }
