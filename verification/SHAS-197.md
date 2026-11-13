# 1.0.97 – the whole Shas (Bavli, Yerushalmi, Mishnah), Penei Moshe, displayed niqqud for the explanations

Requests: "צריך נגיש את כל השס בבלי ירושלמי משניות"; "החייבים ביאור הירושלמי / וכן ניקוד לכל הביאורים".

## What is built (verification/SHAS-197-metrics.json has the exact numbers of this build)
- **Bavli**: 37 tractates (Sefaria shape), 5,349 amudim, all with the vocalized Gemara (William Davidson) and the
  Steinsaltz explanation (Koren – William Davidson, CC BY-NC). Plus the Daf Yomi "Shekalim": 42 amudim of the Jerusalem
  Talmud on the Vilna Bavli pages (hebcal shekalimDafYomiMap). Kinnim / Middot have no Bavli Gemara (Daf Yomi days show a note + Sefaria link).
- **Yerushalmi**: 39 tractates, 1,554 Vilna dafim (daf → ref from Sefaria's own Yerushalmi Yomi calendar for one full
  cycle; hebcal's map has slips), Guggenheimer vocalized text. Under every segment: **Penei Moshe** (Sefaria,
  "Piotrków, 1898-1900", Public Domain), aligned per segment from the nesting of Sefaria's answer; the read-aloud reads it.
  Gaps: Peah daf 19 and Niddah daf 13 have no text in Sefaria's Guggenheimer edition.
- **Mishnah**: 63 tractates, 525 chapters, 4,192 mishnayot (Torat Emet 357; Bikkurim ch. 4 from the vocalized
  Gemara version) with Bartenura (On Your Way). Gap: Avot ch. 6 (Kinyan Torah) has no Bartenura.

## Speech and displayed niqqud
- Speech (`say`): the 1.0.96 pipeline unchanged (Davidson niqqud for the bold Gemara words, Dicta for the rest, Israeli
  shva, stress, pauses, verse references skipped, ר׳ → רבי). Bartenura / Penei Moshe bold words now also take the
  niqqud of the vocalized mishnah / Yerushalmi segment they quote.
- Displayed niqqud (`v`, setting "הצג ניקוד בביאורים", default on): the same choice of vowels, but no speech marks;
  letters, tags and verse references of the edition are never changed (tested: stripping the vowels gives the edition back).
- Dicta runs per *segment* cache (cache/dseg), so the build is resumable and order-free. New Bavli batches use the
  Dicta "modern" genre only (bold words come from Davidson); Bartenura / Penei Moshe use "rabbinic".
- Pages whose Dicta niqqud is not finished get a note on top ("בבנייה"); their words are shown without niqqud and read
  with the bold-word niqqud only. The build continues in the background (priority: Bartenura → Steinsaltz of the next
  120 days of Daf Yomi / Amud Yomi → Penei Moshe → the rest of the Steinsaltz).

## Hosting
- Kept in the main repository / GitHub Pages: site/data/gemara ≈ 264 MB, ~14,900 files (Pages limit 1 GB).
- Display files are written once; Dicta progress only replaces the speech/niqqud files (bsay/ysay/msay).
- Nothing of the Shas is precached by the service worker (only gemara/index.json); each amud / daf / chapter is cached when opened.
- The Shas is not in the search index (FAMILIES noSearch).

## Build
    python3 tools/fetch-gemara.py shapes; node tools/shas-plan.mjs; python3 tools/fetch-gemara.py yercal; node tools/shas-plan.mjs
    python3 tools/fetch-gemara.py shas
    node tools/build-shas.mjs --prepare; python3 tools/fetch-gemara.py dicta   (resumable; dicta-mid / dicta-rev in parallel)
    node tools/build-shas.mjs; npm run search
