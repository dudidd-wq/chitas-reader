// Local-only storage: preferences + reading progress. Nothing ever leaves the device.
import { dayPlan } from './calendar.js';
import { cleanProfile } from './personal.js';
import { clampPitch } from './voice-pitch.js';
const KEY = 'chitas-reader.v1';
export const PROGRESS_CAP = 5000;
export const PROGRESS_WARN = 4250;
export const DEFAULT_PREFS = {
  theme: 'paper', design: 'classic', designFont: 'design', font: 'noto', readingBold: false, hideSiddurInstructions: false, size: 24, lineHeight: 1.9, layout: 'pages',
  taamim: true, rashi: true, rashiFont: 'rashi', hayomNiqqud: true, biurNiqqud: true, mitzvotNiqqud: true, lessonNach: false, lessonShnayim: false, shnayimSplit: 'day', gloss: 'tap', il: true, rambamTrack: 'both', lessonMitzvot: false, lessonTolt: false, lessonRavYomi: false, lessonDaf: false, lessonAmud: false, lessonYer: false, lessonMishna: false,
  ttsRate: 1, ttsVoice: '', ttsStress: true, ttsDivine: 'hashem', ttsRashi: true, ttsBiur: false, ttsVocalizedGemara: false, ttsGemaraBiurOnly: false, ttsSkipCites: true, ttsContinuous: true,
  ttsLockscreen: true, ttsEngine: 'web', ttsModel: 'full', ttsGender: 'male', ttsHavara: 'israeli', ttsPitch: 0, wakeLock: true, spread: true, locationChosen: false,
  zmanPlace: '', zmanGeo: null, kivunPlace: '', kivunGeo: null, kivunManual: null, candleMins: 0,
  divine: 'full', siddurLang: 'he', tachanunMode: 'off', shabbatMode: 'off', // 1.0.74 same three values
  siddurKaddish: 'read', // 1.0.90: 'read' | 'skip' (Kaddish in the siddur read-aloud)
  // 1.0.73: 'off' | 'date' | 'always' (1.0.72 boolean hideNoTachanun true → 'date')
  // round 7: language of the siddur's instructions – 'he' | 'en' | 'both'
  tehillimProfiles: [], tehillimRebbe: false,
  tehillimPre20: false, tehillimPrePersonal: false, tehillimPreRebbe: false, // 1.0.187: chapters said before the daily Tehillim
  shortBiur: true, // 1.0.100: the folded "ביאור קצר" under a paragraph (texts.js sbAi/sbLt)
  studyNotes: true, // round 8: "מראי מקומות" / short-explanation link after the text (texts.js 'notes' blocks) // round 8: personal Tehillim [{id, name, greg|hy/hm/hd|age, afterSunset}] – on this device only
};
// One speed scale for the footer menu and the settings slider.
export const TTS_RATES = [0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6];
export const snapRate = r => TTS_RATES.reduce((a, b) => (Math.abs(b - r) < Math.abs(a - r) ? b : a), 1);

const NULLABLE_OBJ_PREFS = new Set(['zmanGeo', 'kivunGeo', 'kivunManual']);
const isPlainObj = x => !!x && typeof x === 'object' && !Array.isArray(x);

export function normalizePrefs(raw) {
  const src = isPlainObj(raw) ? raw : {};
  const prefs = { ...DEFAULT_PREFS };
  for (const [k, v] of Object.entries(src)) {
    if (!(k in DEFAULT_PREFS)) continue;
    const def = DEFAULT_PREFS[k];
    if (NULLABLE_OBJ_PREFS.has(k)) {
      if (v === null || isPlainObj(v)) prefs[k] = v;
    } else if (Array.isArray(def)) {
      if (Array.isArray(v)) prefs[k] = v;
    } else if (typeof v === typeof def) {
      prefs[k] = v;
    }
  }
  if (!['paper', 'sepia', 'dark', 'night'].includes(prefs.theme)) prefs.theme = 'paper';
  for (const k of ['readingBold', 'hideSiddurInstructions', 'ttsVocalizedGemara', 'ttsGemaraBiurOnly']) if (typeof prefs[k] !== 'boolean') prefs[k] = false;
  if (prefs.font === 'cardo') prefs.font = 'noto'; // 1.0.139: Cardo removed – its Hebrew marks are misplaced
  if (typeof prefs.hayomNiqqud !== 'boolean') prefs.hayomNiqqud = true;
  if (typeof prefs.biurNiqqud !== 'boolean') prefs.biurNiqqud = true;
  if (typeof prefs.mitzvotNiqqud !== 'boolean') prefs.mitzvotNiqqud = true;
  if (!['pages', 'scroll'].includes(prefs.layout)) prefs.layout = 'pages';
  if (!['day', 'week'].includes(prefs.shnayimSplit)) prefs.shnayimSplit = 'day';
  if (!['classic', 'sefer', 'modern', 'nocturne'].includes(prefs.design)) prefs.design = 'classic';
  if (!['design', 'mine'].includes(prefs.designFont)) prefs.designFont = 'design';
  if (!['rashi', 'text'].includes(prefs.rashiFont)) prefs.rashiFont = 'rashi';
  if (!['tap', 'inline', 'off'].includes(prefs.gloss)) prefs.gloss = 'tap';
  if (!['1', '3', 'both'].includes(prefs.rambamTrack)) prefs.rambamTrack = 'both';
  if (!['full', 'abbr'].includes(prefs.divine)) prefs.divine = 'full';
  if (!['hashem', 'adonai'].includes(prefs.ttsDivine)) prefs.ttsDivine = 'hashem';
  prefs.size = Number.isFinite(prefs.size) ? Math.min(48, Math.max(12, Math.round(prefs.size))) : DEFAULT_PREFS.size;
  prefs.lineHeight = Number.isFinite(prefs.lineHeight) ? Math.min(2.6, Math.max(1.2, Math.round(prefs.lineHeight * 10) / 10)) : DEFAULT_PREFS.lineHeight;
  prefs.candleMins = Number.isFinite(prefs.candleMins) && prefs.candleMins >= 0 && prefs.candleMins <= 120 ? prefs.candleMins : 0;
  prefs.ttsRate = snapRate(Number(prefs.ttsRate) || 1);
  if ('hideNoTachanun' in src) { if (src.hideNoTachanun === true && !src.tachanunMode) prefs.tachanunMode = 'date'; }
  for (const k of ['tachanunMode', 'shabbatMode']) if (!['off', 'date', 'always'].includes(prefs[k])) prefs[k] = 'off';
  if (!['read', 'skip'].includes(prefs.siddurKaddish)) prefs.siddurKaddish = 'read';
  if (!['he', 'en', 'both'].includes(prefs.siddurLang)) prefs.siddurLang = 'he';
  if (!['web', 'piper'].includes(prefs.ttsEngine)) prefs.ttsEngine = 'web';
  if (!['full', 'int8'].includes(prefs.ttsModel)) prefs.ttsModel = 'full';
  if (!['male', 'deep', 'natural', 'female'].includes(prefs.ttsGender)) prefs.ttsGender = 'male';
  if (!['israeli', 'chabad'].includes(prefs.ttsHavara)) prefs.ttsHavara = 'israeli';   // 1.0.91
  prefs.ttsPitch = clampPitch(prefs.ttsPitch);   // 1.0.92: semitones −6…+6, step 0.5; 0 = the voice as it was
  prefs.tehillimProfiles = Array.isArray(prefs.tehillimProfiles) ? prefs.tehillimProfiles.map(cleanProfile).filter(Boolean).slice(0, 50) : [];
  return prefs;
}

const DAILY_KEY_RE = /^\d{4}-\d\d-\d\d\|[a-z0-9]+(\|il|\|dl)?$/;
const SIDDUR_KEY_RE = /^siddur\|[a-z]+\/\d+$/;
// Library keys may contain spaces in book/tractate names (e.g. Nach "I Samuel", "Song of Songs", Shas "Bava Kamma").
// URL-encoded %20 is also accepted and normalized to space on import.
const LIB_KEY_RE = /^lib\|[a-z]+(\/[A-Za-z0-9_-]+(?:(?: |%20)[A-Za-z0-9_-]+)*){1,3}$/;
export const isValidProgressKey = k => typeof k === 'string' && (DAILY_KEY_RE.test(k) || SIDDUR_KEY_RE.test(k) || LIB_KEY_RE.test(k));
const normalizeProgressKey = k => k.startsWith('lib|') ? k.replace(/%20/gi, ' ') : k;

function cleanProgressEntry(v) {
  if (!isPlainObj(v)) return null;
  const out = { done: !!v.done, t: Number.isFinite(v.t) && v.t >= 0 ? v.t : 0 };
  if (typeof v.pos === 'string') out.pos = v.pos;
  if (Number.isFinite(v.sub)) out.sub = v.sub;
  if (Number.isFinite(v.sec) || v.sec === null) out.sec = v.sec;
  if (Number.isFinite(v.frac)) out.frac = Math.max(0, Math.min(1, v.frac));
  return out;
}

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || '{}');
    const prefs = normalizePrefs(d.prefs);
    const progress = {};
    if (isPlainObj(d.progress)) {
      for (const [k, v] of Object.entries(d.progress)) {
        const clean = isValidProgressKey(k) ? cleanProgressEntry(v) : null;
        if (clean) progress[normalizeProgressKey(k)] = clean;
      }
    }
    return { prefs, progress };
  }
  catch { return { prefs: { ...DEFAULT_PREFS }, progress: {} }; }
}
const state = load();
let storageStatus = { ok: true, error: null, nearLimit: Object.keys(state.progress).length >= PROGRESS_WARN, count: Object.keys(state.progress).length, cap: PROGRESS_CAP, warnAt: PROGRESS_WARN };
const emitStorage = () => { if (typeof document !== 'undefined' && typeof CustomEvent === 'function') document.dispatchEvent(new CustomEvent('chitas-storage', { detail: { ...storageStatus } })); };
export const getStorageStatus = () => ({ ...storageStatus, count: Object.keys(state.progress).length });

function trimProgress(progress) {
  const keys = Object.keys(progress);
  if (keys.length <= PROGRESS_CAP) return;
  // Evict oldest incomplete (non-done) entries first, preserving completed lessons and library/siddur checkmarks.
  const incomplete = keys.filter(k => !progress[k]?.done).sort((a, b) => (progress[a]?.t || 0) - (progress[b]?.t || 0));
  const drop = Math.min(incomplete.length, keys.length - PROGRESS_CAP);
  for (let i = 0; i < drop; i++) delete progress[incomplete[i]];
}

function save() {
  trimProgress(state.progress);
  const count = Object.keys(state.progress).length;
  const nearLimit = count >= PROGRESS_WARN;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    storageStatus = { ok: true, error: null, nearLimit, count, cap: PROGRESS_CAP, warnAt: PROGRESS_WARN };
    if (nearLimit) emitStorage();
    return { ok: true, nearLimit, count };
  } catch (e) {
    storageStatus = { ok: false, error: e?.name || e?.message || 'storage-error', nearLimit: true, count, cap: PROGRESS_CAP, warnAt: PROGRESS_WARN };
    emitStorage();
    return { ok: false, error: storageStatus.error, nearLimit: true, count };
  }
}
export const prefs = state.prefs;
export function setPref(k, v) { state.prefs[k] = v; const res = save(); if (typeof document !== 'undefined' && typeof CustomEvent === 'function') document.dispatchEvent(new CustomEvent('prefs', { detail: { k, v } })); return res; }
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
  return save();
}
export function clearProgress(iso, unit) { delete state.progress[progressKey(iso, unit)]; return save(); }

export function exportBackup() {
  const data = { app: 'chitas-reader', format: 1, exportedAt: new Date().toISOString(), prefs: state.prefs, progress: state.progress };
  return new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
}
export function importBackup(text, { mode = 'merge' } = {}) {
  const d = JSON.parse(text);
  if (!isPlainObj(d) || d.app !== 'chitas-reader') throw new Error('bad file');
  if (d.format !== undefined && d.format !== 1) throw new Error('unsupported format');
  if (!isPlainObj(d.progress)) throw new Error('bad progress');
  if (d.prefs !== undefined && !isPlainObj(d.prefs)) throw new Error('bad prefs');
  const nextPrefs = normalizePrefs(mode === 'replace' ? (d.prefs || {}) : { ...state.prefs, ...(d.prefs || {}) });
  const nextProgress = mode === 'replace' ? {} : { ...state.progress };
  for (const [rawKey, v] of Object.entries(d.progress)) {
    if (!isValidProgressKey(rawKey)) continue;
    const clean = cleanProgressEntry(v);
    if (!clean) continue;
    const k = normalizeProgressKey(rawKey), prev = nextProgress[k];
    nextProgress[k] = prev && mode === 'merge' ? { ...prev, ...clean, done: !!(prev.done || clean.done), t: Math.max(prev.t || 0, clean.t || 0) } : clean;
  }
  const snapPrefs = structuredClone(state.prefs), snapProgress = structuredClone(state.progress);
  Object.keys(state.prefs).forEach(k => delete state.prefs[k]);
  Object.assign(state.prefs, nextPrefs);
  Object.keys(state.progress).forEach(k => delete state.progress[k]);
  Object.assign(state.progress, nextProgress);
  const res = save();
  if (!res.ok) {
    Object.keys(state.prefs).forEach(k => delete state.prefs[k]);
    Object.assign(state.prefs, snapPrefs);
    Object.keys(state.progress).forEach(k => delete state.progress[k]);
    Object.assign(state.progress, snapProgress);
    throw new Error(res.error || 'storage write failed');
  }
  return res;
}
export function resetAll() { localStorage.removeItem(KEY); location.reload(); }
