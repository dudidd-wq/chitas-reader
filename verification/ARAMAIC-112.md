# 1.0.112 – Aramaic speech rules (speech layer only)

Display text, letters and niqqud are unchanged (display-identity check: 0 display diffs over all changed data files; the
speech text keeps every letter except the silent alef of לָאו). Only `say` speech fields and the runtime g2p / tts-prep change.

## Where
- `tools/aramaic-speech.mjs` – the rules; `tools/aramaic-say-pass.mjs` – idempotent post-pass over the compiled speech of
  Bavli (`gemara/bsay`), Yerushalmi (`gemara/ysay`), Onkelos, Tanya and Torah Or / Likkutei Torah (`tolt/w`); run by
  `npm run aramaic` and at the end of `tools/build-shas.mjs`. Onkelos is also built with it (`tools/build-nach.mjs`).
- `tools/data/aramaic-speech.json` – rule groups per source (the gate below).
- `site/js/g2p.js` – `|` (NACH) marks a quiescent shva in speech text; final ־ֵיהּ is read /ej/ (עֲלֵיהּ alˈej).
- `site/js/tts-prep.js` – יָהּ is the Name only with a qamatz under the yod; Aramaic לֵיהּ / בֵּיהּ are no longer read לֵקהּ.
- Which words are Aramaic: forms of the Davidson Bavli outside Mishnah / quotations plus Onkelos, minus forms that occur in
  the Hebrew corpus (Torah, Tehillim, Nach except Daniel/Ezra, Mishnah, Rambam). Gemara quotations (verses, Mishnah) are
  never touched; in prose (Tanya, Torah Or) Zohar quotations are processed.

## Rule groups
| group | what | sources on |
|---|---|---|
| lav | לָאו → לָו, read lav (alef silent) | all |
| eyh / yah | final ־ֵיהּ /ej/; לֵיהּ not the Name (runtime, all texts) | all |
| rules | suffix stress: ־ָא/־ֵא and ־ֵי milel, ־ִינַן milel, ־ֵיהּ milra; never on a hataf; the shva closing a milel syllable is quiescent | Bavli, Yerushalmi, Tanya, Torah Or |
| zohar | Zohar / Kabbalah lexicon (36 forms: מַלְכָּא, סִטְרָא, קוּדְשָׁא, אוֹרַיְיתָא …) | Bavli, Yerushalmi, Tanya, Torah Or |
| shva | quiescent shva after a forte / closed syllable (אִיתְּמַר itmar, מִילְּתָא milta, מִשְּׁמֵיהּ) | Yerushalmi, Onkelos |
| lexicon | general Aramaic stress lexicon (107 forms: הָכִי, הָתָם, מִסְתַּבְּרָא, כּוּלָּא …) | **off** |

A lexicon word whose group is off is left completely as in 1.0.110 (the suffix rules never guess its stress instead).

## External review (Codex CLI on Dudi's PC, read-only, whole packet as prompt; no OpenAI API / Anthropic spend)
Rubric 0–10: niqqud/vowels 40%, stress 40%, punctuation/abbreviations 20%. Deploy only strictly above 9.5.

| group | r1 | r2 | r3 | deployed |
|---|---|---|---|---|
| lav | 10 | 10 | 10.0 | yes |
| yah | 10 | 10 | 10.0 | yes |
| eyh | 9.8 | 10 | 9.8 | yes |
| shva – Onkelos | 9.8 | 9.7 | 9.8 | yes |
| shva – Yerushalmi | 8.8 | 9.3 | 9.8 | yes |
| zohar lexicon | 9.1 | 9.3 | 9.8 | yes |
| rules – Bavli | 9.0 | 9.3 | 9.7 | yes |
| rules – Yerushalmi | 9.6 | 9.8 | 9.7 | yes |
| rules – prose (Tanya, Torah Or) | 8.8 | 9.2 | 9.7 | yes |
| shva – Bavli | 9.1 | 9.3 | 9.3 | no (inherited אִיקְּלַע stress in the examples) |
| shva – prose | 9.0 | 9.4 | 9.2 | no (מִיְּסוֹד → /mijsod/, וְאַדְּרַבָּה) |
| general lexicon | 9.0 | 9.0 | 9.1 | no (כּוֹלָּא family, Hebrew גְּמָרָא / מַשְׁמַע in prose) |

Round-3 sample scores (before → after, all groups on): BM 76a 8.0 → 9.3; BM 76a Chabad 8.6 → 9.1; Bechorot 55a 8.5 → 9.2;
Onkelos Bereshit 1:1–5 9.4 → 9.4 (no change); Onkelos changed verses 9.1 → 9.6; Tanya Aramaic 8.5 → 9.2; Torah Or Zohar 7.9 → 9.3.
Reviews: /workspace/plans/samples/review/codex-rA3.md (box), C:\Users\dddud\aramaic-review\rA*.md (X1XG2-N).

Round fixes: r2 – Hebrew false positives (הִילְּכוּ, מִדְּלָא, דּוּגְמָא), intrusive vowel before a milel coda (codaFix),
initial-shva form keys; r3 – maqaf no longer glues tokens, אַדְּרַבָּה / כּוּלָּא / רַבְּתָא / גִּימַטְרִיָּא, לְגַמְרֵי skipped in prose, מִן + forte.

## Known, not part of this release
- Unvocalized Steinsaltz explanation words in the Gemara samples are read letter by letter (pre-existing, separate issue).
- הָתָם /hatˈom/ comes from the general qamatz-katan table in g2p.
- The Chabad-mode stress layer can override suffix stress (עֲבִידְתֵּיהּ a-VID-tei).
