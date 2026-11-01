// Shared normalisation of vocalized Hebrew words (used by the glossary builder and by the reader, so keys always match):
// cantillation, meteg and dagesh removed; qamats-qatan → qamats; holam-haser-for-vav → holam; marks sorted per letter.
const MARKS = /[\u0591-\u05AF\u05BD\u05BF\u05C0\u05C3-\u05C6]/g;
export function norm(w) {
  return w.replace(MARKS, '').replace(/\u05BC/g, '').replace(/\u05C7/g, '\u05B8').replace(/\u05BA/g, '\u05B9')
    .replace(/[^\u05B0-\u05C2\u05D0-\u05EA]/g, '')
    .replace(/([\u05D0-\u05EA])([\u05B0-\u05C2]+)/g, (_, l, m) => l + [...m].sort().join(''));
}
export const cons = w => w.replace(/[^\u05D0-\u05EA]/g, '');
