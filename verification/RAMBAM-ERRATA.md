# Rambam: niqqud corrections and source scans (round 3)

The vocalised Mishneh Torah text comes from **Torat Emet 363** on Sefaria (Public Domain). It is the only vocalised free
edition we found. Sefaria's other Hebrew version, **"Wikisource Mishneh Torah"** (CC BY-SA), has no vowels, so it can
confirm the *consonants* of a word but not its *vowels*. The Introduction (מסירת תורה שבעל פה) is shown from Wikisource
(vocalised there) because Torat Emet lacks it.

## What is corrected (applied in the reader)

The corrections live in `site/data/rambam-errata.json`, which is generated and validated by `tools/rambam-errata-src.py`.
They are applied as a display overlay (`applyErrata` in `site/js/texts.js`), so the source data files are never edited.
Each lesson with a correction shows the corrected words in a line under the text ("תוקנו כאן …").

A fix is included only if **all** of the following hold. The generator asserts the first two.

1. **Niqqud-only.** The consonants of `from` and `to` are identical.
2. **Second source.** The corrected words' consonants appear in the same halacha of the Wikisource text. Matres ו/י and
   abbreviations are ignored, because Wikisource spells plene. The Introduction is excluded from this check, since it is
   itself the Wikisource text.
3. **Same edition elsewhere.** The corrected vocalisation is the one this edition uses for the same word elsewhere. The
   number of occurrences is stored per fix as `elsewhere`. For example, אֶלָּא appears 5,045 times, שֶׁאֵין 2,656 times,
   and לְהִתְגַּיֵּר 5 times.
4. **Checked by hand.** The source form is not a valid vocalisation in context.

Current count: see `meta` in `site/data/rambam-errata.json`. It holds 31 fixes in 24 halachot, and 14 of them (all
outside the Introduction) are confirmed against the Wikisource consonants. The reviewer's examples are among them:
לִהִתְגַּיֵּר → לְהִתְגַּיֵּר (Forbidden Intercourse 14:1) and שִׁאוֹסֵר → שֶׁאוֹסֵר (Forbidden Foods 12:1). Three
halachot have a damaged stretch in which the vowels have shifted (Forbidden Intercourse 1:11, Foundations of the
Torah 5:8, Marriage 3:8). Those stretches are corrected word by word.

Rejected candidates include וְשֶׁמִּן (Forbidden Foods 12:21, correct: "she-min") and לְהִתְפַּלַּל (Positive Mitzvot 1:5, a valid form).

## What is only flagged (not changed)

- **`tools/rambam-niqqud-scan.py` → `verification/rambam-niqqud-flags.json`.** This scan looks for rare vocalisations
  (≤2 occurrences) of consonants that the same edition vocalises one way at least 8 times. It flagged 2,847 words in
  2,279 halachot; 104 halachot have 3 or more flags. Most are legitimate homographs (a different binyan, tense or
  number), so none is changed without a hand check.
- **`tools/rambam-ws-compare.py` → `verification/rambam-ws-mismatches.json`.** This is a word-level consonant comparison
  with Wikisource, after removing niqqud, punctuation, parenthesised verse citations and the matres ו/י.
  - 9,287 of 14,284 halachot are identical, and 83 are missing in Wikisource.
  - There are 8,247 differences in all. Of these, 999 are abbreviations or numerals (e.g. ג for שלשה), 890 are
    single-word substitutions, and 642 of those are near-identical.
  - These are mostly genuine textual differences between the editions, and typos on *either* side (e.g. Wikisource
    במררס for במדרס). With no third source, none is applied automatically.

Reproduce: `python3 tools/rambam-ws-compare.py && python3 tools/rambam-niqqud-scan.py && python3 tools/rambam-errata-src.py`.
The Wikisource text excerpts in the mismatch list are © Wikisource contributors, CC BY-SA, via Sefaria.
