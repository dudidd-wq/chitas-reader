// Onkelos speech-only conservative ole. Display `t` is never written.
// A lexicon hit is stamped only when its stressKey also appears in the
// parallel Torah verse (fail-closed; Onkelos is Aramaic / Yemenite-Taj).
import { endOfJsonValue } from './lib-comment-stress.mjs';
import {
  applyOleToText, cleanVerse, stressKey, RE_WORD,
} from './lib-mishna-stress.mjs';

export function writeOnkelosSay(raw, newSay) {
  if (!raw.startsWith('{"t":')) throw new Error('onkelos file must start with {"t":');
  const tEnd = endOfJsonValue(raw, '{"t":'.length);
  if (raw.slice(tEnd, tEnd + 7) !== ',"say":') {
    throw new Error('expected ,"say": after t array, got ' + JSON.stringify(raw.slice(tEnd, tEnd + 20)));
  }
  const sayStart = tEnd + ',"say":'.length;
  const sayEnd = endOfJsonValue(raw, sayStart);
  return raw.slice(0, sayStart) + JSON.stringify(newSay) + raw.slice(sayEnd);
}

export function torahVerseKeys(verse) {
  const keys = new Set();
  for (const w of cleanVerse(verse).match(RE_WORD) || []) keys.add(stressKey(w));
  return keys;
}

/** Apply lexicon ole, then keep only stamps whose stressKey is in the Torah verse. */
export function applyAlignedOle(say, verse, lexicon, blocked) {
  const { changed } = applyOleToText(say, lexicon, blocked);
  const keys = torahVerseKeys(verse);
  const aligned = changed.filter(ch => keys.has(ch.key));
  const rejected = changed.filter(ch => !keys.has(ch.key));
  let text = say;
  for (const ch of aligned.slice().sort((a, b) => b.start - a.start)) {
    text = text.slice(0, ch.start) + ch.dest + text.slice(ch.start + ch.src.length);
  }
  return { text, aligned, rejected, rawChanged: changed };
}
