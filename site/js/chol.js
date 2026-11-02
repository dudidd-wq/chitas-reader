// Occurrences of אלהים-forms in Torah/Tehillim that do NOT refer to God (idols, judges, rulers, angels),
// so the "השם"-mode reading (ה→ק) is NOT applied to them. Principle: Masechet Soferim ch. 4 and Rambam,
// Hil. Yesodei HaTorah 6:9 (a name referring to idols or judges is "chol"). The identification of each
// occurrence follows Rashi's plain-sense commentary on the verse. Collocations such as אלהים אחרים,
// אלהי הנכר/מצרים/העמים/הגוים, אלהי כסף/זהב/מסכה are handled generically in tts-prep.js (CHOL_NEXT).
// Key: "Book chapter:verse" → indices (0-based) of the אלהים-form words in that verse.
export const CHOL = {
  'Genesis 3:5': [1], 'Genesis 6:2': [0], 'Genesis 6:4': [0], 'Genesis 31:30': [0], 'Genesis 31:32': [0],
  'Exodus 4:16': [0], 'Exodus 7:1': [0], 'Exodus 18:11': [0], 'Exodus 21:6': [0], 'Exodus 22:7': [0], 'Exodus 22:8': [0, 1],
  'Exodus 22:19': [0], 'Exodus 23:24': [0], 'Exodus 23:32': [0], 'Exodus 23:33': [0], 'Exodus 32:1': [0], 'Exodus 32:4': [0],
  'Exodus 32:8': [0], 'Exodus 32:23': [0], 'Exodus 34:15': [0, 1], 'Exodus 34:16': [0, 1],
  'Numbers 25:2': [0, 1], 'Numbers 33:4': [0],
  'Deuteronomy 4:28': [0], 'Deuteronomy 7:16': [1], 'Deuteronomy 7:25': [0], 'Deuteronomy 12:2': [0], 'Deuteronomy 12:3': [0],
  'Deuteronomy 12:30': [0, 1], 'Deuteronomy 12:31': [1, 2], 'Deuteronomy 20:18': [0], 'Deuteronomy 29:25': [1], 'Deuteronomy 32:17': [0],
  'Psalms 82:1': [1], 'Psalms 82:6': [0], 'Psalms 86:8': [0], 'Psalms 95:3': [0], 'Psalms 96:4': [0], 'Psalms 97:7': [0],
  'Psalms 97:9': [0], 'Psalms 135:5': [0], 'Psalms 138:1': [0],
};
