// Local-voice install UX helpers. Does not download, persist, or touch the text offline manager.
// Storage checks are read-only (estimate / persisted). A soft warning never blocks a download.

export const VOICE_INSTALLED_KEY = 'chitas-reader.voice-installed.v1';
export const VOICE_VARIANTS = ['full', 'int8', 'natural'];

function storage() {
  try { return globalThis.localStorage; } catch { return null; }
}

function cleanVariants(list) {
  const out = [];
  for (const v of Array.isArray(list) ? list : []) if (VOICE_VARIANTS.includes(v) && !out.includes(v)) out.push(v);
  return out;
}

export function loadVoiceInstallRecord() {
  const raw = storage()?.getItem(VOICE_INSTALLED_KEY);
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return null;
    const variants = cleanVariants(d.variants);
    const t = Number.isInteger(d.t) && d.t > 0 && d.t < 1e15 ? d.t : 0;
    return { variants, userRemoved: d.userRemoved === true, t };
  } catch { return null; }
}

export function saveVoiceInstallRecord(rec) {
  const s = storage();
  if (!s) return rec;
  const variants = cleanVariants(rec?.variants);
  const out = { variants, userRemoved: rec?.userRemoved === true, t: Number.isInteger(rec?.t) && rec.t > 0 ? rec.t : Date.now() };
  s.setItem(VOICE_INSTALLED_KEY, JSON.stringify(out));
  return out;
}

export function markVoiceInstalled(variant) {
  const rec = loadVoiceInstallRecord() || { variants: [], userRemoved: false, t: 0 };
  const variants = cleanVariants([...rec.variants, variant]);
  return saveVoiceInstallRecord({ variants, userRemoved: false, t: Date.now() });
}

export function markVoiceRemovedByUser() {
  return saveVoiceInstallRecord({ variants: [], userRemoved: true, t: Date.now() });
}

/** True when a recorded install is gone from Cache Storage and the user did not delete it. */
export function voiceEvicted(status = {}, record = loadVoiceInstallRecord()) {
  if (!record || record.userRemoved) return false;
  const had = cleanVariants(record.variants);
  if (!had.length) return false;
  return had.every(v => !status[v]);
}

export async function storageEstimate() {
  try {
    const e = await navigator.storage?.estimate?.();
    if (!e || !Number.isFinite(e.quota)) return null;
    const usage = Number.isFinite(e.usage) ? e.usage : 0;
    return { quota: e.quota, usage, free: e.quota - usage };
  } catch { return null; }
}

/** Read-only. Does not call persist(). true/false = browser answer, null = missing/unsupported. */
export async function storagePersisted() {
  try {
    if (!navigator.storage?.persisted) return null;
    return await navigator.storage.persisted();
  } catch { return null; }
}

export function spaceWarning({ need, estimate, int8Need, alreadyInt8 = false } = {}) {
  if (!estimate || !Number.isFinite(estimate.quota) || !Number.isFinite(need) || need <= 0) return null;
  const usage = Number.isFinite(estimate.usage) ? estimate.usage : 0;
  const free = estimate.quota - usage;
  if (free >= need) return null;
  const freeMb = Math.max(0, Math.round(free / 1e6));
  const needMb = Math.max(1, Math.round(need / 1e6));
  const suggestInt8 = !alreadyInt8 && Number.isFinite(int8Need) && int8Need < need && free >= int8Need;
  return { free, need, freeMb, needMb, suggestInt8 };
}

export function spaceWarningText(w, { int8Mb } = {}) {
  if (!w) return '';
  const base = `נראה שיש במכשיר כ־${w.freeMb} MB פנויים, והקול דורש כ־${w.needMb} MB. ההערכה אינה מדויקת בכל דפדפן.`;
  if (w.suggestInt8) return base + ` אפשר לבחור בגרסה הקלה (כ־${int8Mb} MB) או להמשיך בכל זאת.`;
  return base + ' להמשיך בכל זאת?';
}

export function persistStatusText(persisted) {
  if (persisted === true) return 'הדפדפן אישר לא למחוק את הקול.';
  if (persisted === false) return 'הדפדפן לא הבטיח שישמור את הקול; הוא עלול להימחק כשהמקום במכשיר נגמר, במיוחד באייפון.';
  return '';
}

export const EVICTED_TEXT = 'הקול הוסר מהמכשיר (למשל בניקוי אחסון). אפשר להוריד שוב. באייפון, הוספה למסך הבית מפחיתה את הסיכוי למחיקה.';
export const DELETE_CONFIRM = 'למחוק את הקול האיכותי מהמכשיר? אפשר להוריד אותו שוב אחר כך.';
