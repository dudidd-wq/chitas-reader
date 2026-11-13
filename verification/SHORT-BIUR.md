# ״ביאור קצר״ – a short explanation under each paragraph (1.0.100)

Dudi's request (verbatim): "כן אבל זה רק לביעור לדוגמא אני מתכוון לביעור המלא שלפני שאתה מעלה אותו לייצור תבדוק אותו גם בעצמך כבוחן חיצוני עד לציון שואף ל-10 ורק אז תפרסם אותו בייצור".

## What is shown
- **Tanya, Rambam (3 chapters and 1 chapter), Sefer HaMitzvot:** a short Hebrew explanation of each paragraph, written for this site with a computer. The reader labels it "ביאור קצר ממוחשב – אינו פירוש רבני. ייתכנו טעויות; העיקר הוא המקור."
- **Torah Or / Likkutei Torah:** a computer-made Hebrew condensation of the English paragraph explanation at LikuteiTorah.com (CC BY-NC 4.0, as that site states). Each paragraph links to its source page.
- **Display:** folded (`<details class="sbiur">`) under the paragraph.
  - It can be turned off with the `shortBiur` setting (default on).
  - Its niqqud follows `biurNiqqud`.
  - It is read aloud only with `ttsBiur` (default off).
  - Glosses skip it.
- **Writing rules:**
  - Stay faithful to the paragraph; add nothing the text does not say.
  - In sensitive places (Kabbalah terms, halachic rulings), stay conservative and close to the wording.
  - Never present the text as a ruling or as a rabbinic commentary.

## Data
- `site/data/sbiur/<same path as the source file>.json`:
  - Tanya, Rambam, Mitzvot: `{src:'ai', s:{<segment>:{p,v}}}`.
  - Torah Or / Likkutei Torah: `{src:'lt', days:{<day>:{<para>:{p,v,lt,ltp}}}}`.
- `sbiur/index.json` lists the files.
- **Loading:**
  - `texts.js` fetches a file only when its lesson opens, and only if the index lists it.
  - `filesFor` adds the files for offline saving.
- **Fields:** `p` is the plain text; `v` is the vocalized text.
- **Niqqud pipeline:**
  1. Dicta Nakdan (modern).
  2. Correction rules: ktiv-male doubled letters, qamats katan with silent vav, and common Dicta errors.
  3. Per-paragraph edits from a full manual proofreading.
  4. A cross-check against Dicta's rabbinic model; every disagreement was reviewed.
  5. Every quoted verse was checked against the Masoretic text.
- The working files (drafts, rules, edits, review log) are kept outside the repository, on the build box (`/workspace/biur-pilot/full`, `REVIEW-FULL.md`).

## Batches
| Batch | Days | Paragraphs | Review rounds | Final average |
|---|---|---|---|---|
| 1 | 15–17.11.2026 (Tanya Kuntres Acharon 4; Rambam Forbidden Foods 5–7, Hiring 1–3, Slaves 4–9; Sefer HaMitzvot 9 mitzvot; Likkutei Torah Shir HaShirim 18–19) | 222 | 2 (8.9 → 9.54) | 9.54 |

## Tests
`tests/short-biur-200.test.mjs` checks:
- every paragraph of batch 1 has an explanation;
- the vocalized and plain texts have the same word count;
- no ktiv-male doubled letters and no unvocalized words;
- lazy loading and offline files;
- the labels and settings.
