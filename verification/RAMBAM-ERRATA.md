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

Current count: see `meta` in `site/data/rambam-errata.json`. It holds 41 fixes in 34 halachot (plus 1 text fix, Kings 11:4 – see "Text fixes" below), and 24 of them (all
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

## Structurally impossible niqqud (round 5): `tools/rambam-niqqud-invariants.py` → `rambam-niqqud-invariants.json`

The 2,279 flagged halachot above are *rare* vocalisations, and most are valid homographs, so they cannot be fixed
automatically. This scan instead looks for niqqud that no Hebrew word can have, so a hit is a defect without any
judgement call:

- **sheva-hataf**: the first letter has sheva and the second a hataf (e.g. בְּאֳ… – the grammar requires בָּאֳ…);
- **two-shevas**: the first two letters both carry sheva (כְּשְׁחוֹגֵר);
- **final-hataf**: a hataf on the last letter;
- **two-vowels**: two vowel signs on one letter. Holam is not counted, because a holam written on the next letter
  (לוֶֹה = lo-veh, בשֶֹׁם) is the normal typographic convention; with holam counted the scan gave 258 false hits.

Result: **12 words in 12 halachot**. 10 are corrected (overlay, same rules 1–4 above; every one is confirmed
against the Wikisource consonants; where the corrected word occurs only here, the evidence is the same prefix
pattern in this edition, recorded as `analogue:` with its count, at least 5): וָחֳדָשִׁים ×2, שְׁאָלָהּ (Borrowing 1:2,
"borrowed it"), בָּאֳנָסָיו ×2, בַּהֲנָיָתוֹ, כְּשֶׁחוֹגֵר, לָאֳכָלִים, אֶמְצָעִיִּים, שֶׁיְּקַפְּלוּ. Two are left: Inheritances
11:8 "הָאֲ [חֵ] רִים" is a bracketed reconstruction in the print, and Levirate 4:30 בְּיֳדָהּ is in the get formula,
which the Wikisource text lacks, so there is no second source. `tests/round5.test.mjs` asserts exactly these two remain.

What this does **not** do: it cannot find a wrong but *possible* vocalisation (e.g. a wrong binyan). Those remain in
the rare-vocalisation list for human review; no further automatic fix was found that we could verify.

## Text fixes (round 5)

A text fix changes wording, not only niqqud, so the bar is higher. Two independent sources must agree on the wording, and every added word must be vocalised the way this edition vocalises it elsewhere. Text fixes are stored in the same overlay as `kind: "text"`, with `sources` and `note`. The reader shows them as "תיקון נוסח", separately from the niqqud fixes.

| Ref | Before (Torat Emet) | After | Sources |
|---|---|---|---|
| Kings 11:4 | "…בְּחֶזְקַת שֶׁהוּא מָשִׁיחַ. (אִם עָשָׂה וְהִצְלִיחַ וּבָנָה מִקְדָּשׁ … וִיתַקֵּן אֶת הָעוֹלָם כֻּלּוֹ … שְׁכֶם אֶחָד):". This is the censored Warsaw–Vilna sentence, in parentheses. It lacks "וניצח כל האומות שסביביו". | "…אִם עָשָׂה וְהִצְלִיחַ וְנִצֵּחַ כָּל הָאֻמּוֹת שֶׁסְּבִיבָיו וּבָנָה מִקְדָּשׁ בִּמְקוֹמוֹ וְקִבֵּץ נִדְחֵי יִשְׂרָאֵל הֲרֵי זֶה מָשִׁיחַ בְּוַדַּאי:" | (1) Sefaria "Wikisource Mishneh Torah" 11:4. (2) The manuscript-corrected הגהה section of he.wikisource "רמב"ם הלכות מלכים ומלחמות יא". The idea in "ויתקן את העולם…" appears in the full text in halacha 7, which is already shown. Vocalisation: וְנִצֵּחַ (Kings 7:15), הָאֻמּוֹת (18 times), שֶׁסְּבִיבָיו (from סְבִיבָיו 11 times and שֶׁסְּבִיבוֹתָיו 3 times). |

## Gap scan (round 5): `tools/rambam-gap-scan.py` → `rambam-gap-scan.json`

This is a systematic search for passages like 11:4. Every chapter of our text, after the overlay, is compared word by word with Sefaria's "Wikisource Mishneh Torah" chapter. The comparison runs per chapter because the two editions split halachot differently; a per-halacha diff produced about 90 false alarms from alignment alone. The diff uses a consonant key with matres lectionis dropped. Citations are ignored.

| Kind | Count | Review result |
|---|---|---|
| Our halachot / compared with Wikisource | 14,367 / 14,284 | The rest are the Introduction and the chapters taken from other versions. |
| **missing**: 3 or more Wikisource words absent from our text in one place | 12 before the fix, **11** after | Kings 11:4 was a real gap and is **fixed**. The other 11 were read in both texts. None of them is a gap in our text: 4 are verse references, 1 is an editorial note in Wikisource, 1 is a closing formula, 3 are duplications or word-order errors in Wikisource, and 2 are Wikisource artefacts (a duplicated halacha, and a lemma glued onto the start of a sentence). The verdict for each is in the JSON (`review`). |
| **colophon**: "סליקו להו… / בריך רחמנא…" absent from our text | 21 | These are closing formulas, not halacha text. Not a gap. |
| **paren**: non-citation parentheses of 4 or more words | 32 (64 before excluding "(גמרא …)" and "(משנה …)" source references) | In 30 of them the same words are also in Wikisource; in our edition they are only bracketed editorially. One is a broken citation parenthesis. One ("אף על פי שאינו סימן מבהק", Robbery 15:10) is an editorial addition in our edition. Nothing is missing. |
| **short**: our chapter has under 90% of the Wikisource word count | 1 | Kings 12, where only the book's long colophon is missing. |

**Result:** one confirmed gap (11:4), now fixed; 0 open gaps; 0 flags left unreviewed. The read-aloud skips only parentheses that are citations, so the bracketed halacha text above is still read aloud.
