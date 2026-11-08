# 1.0.79 — stage 2: Tanya and Halacha

## Source / scope

The original Kehot Tanya and vocalized Shulchan Arukh HaRav text and vowels remain untouched. Speech-only `say` arrays run parallel to source `s` arrays in all 124 Tanya files and 86 Halacha simanim (daily and library builders). Source/title checksum before and after: `9ea77a945b1c28f4d08b945e0f3058c99c1455c8be39ffa5adfee6714118b872`.

Unlike stage 1's partial Rashi vowel fill, this stage **does not replace or automatically fill the edited Kehot vowels**. It adds primary-stress metadata; unknown editorial/unpointed words remain conservative fallbacks. Display, nusach, notes, section headings and source citations are unchanged.

## Method

- Public keyless Dicta rabbinic morphology at build time only, exact consonant alignment, compatible existing vowel signature and nucleus count. No runtime API, paid service, key, ElevenLabs or recordings.
- Curated pointed-word stress overrides take priority, followed by the shared verified exception dictionary, compatible morphology and verified lexicon; uncertain words retain the existing suffix/default fallback.
- The existing stage-1 occurrence-specific transport carries each compiled primary tag through preparation/chunking to the real local voice's IPA. Metadata is rejected if its unmarked text does not match the prepared chunk.
- Reviewed variants/prefixes of דוקא, אלא and אפילו receive penultimate stress. הָיְתָה and אֵינוֹ retain final stress.
- In a verified Tanya מיין נוקבין / מ״ן ומ״ד context, מ״ד is מיין דוכרין (including its ו prefix), not letter names. מ״ן is expanded in the same context. Chapter-number שער מ״ד (44), רמ״ד (244), לַמֶ״ד and prefixed quotations such as מִ״דְּבַר remain untouched by this contextual rule. Other abbreviation handling still uses the existing shared preparer.
- Halacha's speech text comes from source paragraphs before display-only section numbers are attached. Section ח therefore stays visible but is not spoken as חית. Genuine in-text references keep their existing reading rules.

## Corpus results

All 499 batches aligned exactly (prefix splits discard morphology for the split word rather than shift subsequent annotations). All 3,986 paragraphs have a parallel speech layer:

| Corpus | Paragraphs | Explicitly stressed eligible polysyllables |
| --- | ---: | ---: |
| Tanya | 1,623 | 50,170 / 55,775 (89.95%) |
| Halacha | 2,363 | 74,734 / 77,711 (96.17%) |

These are metadata coverage figures, **not measured pronunciation-accuracy percentages**. Three contextual abbreviation expansions were applied. Hebrew compatibility glyph ﬠ was also restored to ordinary ע in speech; previously it could break a word into two and lose the consonant. Invisible bidi controls are removed before morphology alignment, matching the existing runtime preparer.

Concrete actual IPA (`PRONUNCIATION-STAGE2-179-evidence.json`):

- דוקא: `davkˈa` → `dˈavka`.
- אלא: `ʔelˈa` → `ʔˈela`.
- אפילו (אֲפִלּוּ): `ʔafilˈu` → `ʔafˈilu`.
- מ״ד in Tanya KA 2: letter names מֵם דָּלֶת → מַיִּין דּוּכְרִין; דוכרין is `duχʁˈin`, explicitly transported as `src:primary`.
- Section ח: the old standalone label produced `χˈet` (`src:spell`); the label is now absent from speech, still visible on screen.
- שֶׁמְּמוּﬠָטִין: the compatibility glyph previously split the IPA into `ʃˈememu tˈin`; normalizing the glyph restores the intact word, without changing the source edition.

## Tests / evidence

Regression tests enforce the full source checksum and exact preservation of every original speech vowel (apart from explicit abbreviation expansion), every parallel paragraph, contextual safeguards, known IPA fixes and actual daily/library queue transport for both sections. No ASR transcription was used to invent pronunciation fixes; stress is checked in the actual local G2P output. No new WER claim is made.

Rebuild (cache outside the repository):

```sh
node tools/build-prose-pronunciation.mjs --prepare
PROSE_WORKERS=2 python3 tools/fetch-prose-rich.py
node tools/build-prose-pronunciation.mjs
npm run search
npm test
```

Default cache `/workspace/prose-pronunciation/rich-cache`, override `PROSE_RICH_CACHE`. The fetcher reuses cached public responses and retries transient server errors only a bounded number of times. Corpus metrics are in `PROSE-179-metrics.json`.

## Audio

`/workspace/chitas-stage2-tanya.mp3` and `/workspace/chitas-stage2-halacha.mp3`: approximately 25 seconds each from the actual daily browser queue for 2026-11-08, the same full local Noa ONNX/G2P core, male timbre, rate 1 as the 1.0.77 sample. The files do not use browser Web Speech or an outside voice service. Detailed text/chunks/IPA/duration trace: `/workspace/chitas-stage2/samples.json`.

## Limitations

Edited vowels and Dicta's automatic stress choices are not a guarantee of perfect Hebrew/Aramaic pronunciation. Ambiguous/unmatched forms and some abbreviation expansions still use the shared fallback. The explicit-stress guarantees are for the installed local voice, not Google/Apple/Microsoft Web Speech. The voice model/stress asset did not change since 1.0.78; an installation already updated for stage 1 needs no further model download. Stages 3–5 are not implemented here.

## Deployment prerequisites discovered during stage 1

The approved 82e3985 push ran the full GitHub suite and exposed a real old search debounce race: an input timer could fire after Enter/navigation and overwrite a later scoped search. The source fix cancels pending timers on submit/scope changes and ignores callbacks from detached forms; a deterministic timer-controlled browser test reproduces both conditions. No assertion was removed or relaxed. A connector request to rerun the unchanged workflow was unavailable (`MCP server does not exist: user-GitHub-xai`); no alternate rerun endpoint was used. The subsequent commit fixes the actual race through the normal approved edit/test/commit/push workflow.

Audio durations from the final queue: Tanya 24.33s; Halacha 24.41s. Expected release shell/data identifiers: `1.0.79` / `ecc8a683d939`.

## Final local validation / staged deployment record

- Final full `npm test`: **364/364 passed**, 0 failures; seven new stage-2 tests. Log: `/workspace/chitas-stage2/npm-test.log`. `git diff --check` passed.
- Stage-1 original commit `82e3985122b24823f5e5c1c5a52bcd4e06f2a664` was pushed as approved. The CI-discovered search race was repaired in `42c7a8c286abdff4c83e6de6f11267b7788f199b` (357/357 local tests passed before that push).
- Before pushing stage 2, the public GitHub Pages `sw.js` was successfully fetched and verified as **VERSION 1.0.78 / DATA_VERSION dc1c9550c8ef**. Captured response: `/workspace/chitas-stage1/live-sw-178.js`.
- Stage-2 expected live identifiers: **VERSION 1.0.79 / DATA_VERSION ecc8a683d939**. Post-push verification is recorded separately in `/workspace/chitas-stage2/live-sw-179.js` when observed, not presumed from a successful push.
