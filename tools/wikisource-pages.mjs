// Sefaria's "Wikisource Mishneh Torah" version points every book to a generic or wrong Wikisource page
// (e.g. Chametz uMatzah ch. 9 → ch. 1, Sefer Ahava → the Mishneh Torah index). Attribution should link the exact page.
const W = t => 'https://he.wikisource.org/wiki/' + encodeURIComponent(t.replace(/ /g, '_'));
export const WIKISOURCE_PAGE = {
  'Tefillin, Mezuzah and the Torah Scroll': W('רמב"ם הלכות תפילין ומזוזה וספר תורה'),
  'Negative Mitzvot': W('רמב"ם הקדמה למשנה תורה (מצוות לא תעשה)'),
  'Fringes': W('רמב"ם הלכות ציצית'),
  'Blessings': W('רמב"ם הלכות ברכות'),
  'Circumcision': W('רמב"ם הלכות מילה'),
  'Leavened and Unleavened Bread 9': W('רמב"ם הלכות חמץ ומצה, נוסח ההגדה'),
};
/** Replace a Wikisource versionSource by the exact page for this book/chapter, when known. */
export const fixWikisource = (key, meta) => (/Wikisource/.test(meta.versionTitle) && WIKISOURCE_PAGE[key] ? { ...meta, versionSource: WIKISOURCE_PAGE[key] } : meta);
