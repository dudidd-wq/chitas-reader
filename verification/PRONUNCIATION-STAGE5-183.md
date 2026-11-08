# Stage 5 — Rambam speech-only pronunciation (1.0.83)

## Scope and safety

The measured corpus is **1,023 chapter files / 15,937 source rows** (including one existing blank row) (mixed Torat Emet and the app's existing chapter overrides). 1,111 paragraphs have fewer than 5 vowel marks per 100 Hebrew letters, totalling 225,431 source characters. This is the current corpus measurement, not the earlier approximate 1,081 figure.

Every chapter gains only a parallel `say` array. Original source fields remain unchanged, checksum `d1238c57409d6a8eb64fce06050229fc276dcc6cf250fd53e7ad1733ddb299ae` over sorted `[path, original object]` pairs, excluding only new `say`. Existing displayed errata, source attribution, navigation and halacha numbering remain. Daily one-/three-chapter tracks and library chapters share the same existing `rambamDoc` builder.

## Pilot gate, then full processing

Five files: Neighbors 9; Immersion Pools 6; Tefillin/Mezuzah/Torah Scroll 1; Positive Mitzvot 1; Sanctification of the New Month 13. **306 paragraphs**, 11 public keyless Dicta requests. Source/letter/existing-vowel checks passed; **2,542/2,751 (92.4%)** regular multi-letter words in fully unpointed pilot paragraphs received pointing. Quoted abbreviations and one-letter numbers are excluded from that denominator.

Actual primary-metadata IPA verified: כָּתְלוֹ formerly `katlˈo`, now `kotlˈo`; בַּכֹּתֶל formerly `bakotˈel`, now `bakˈotel`. Pilot evidence is retained at `/workspace/chitas-stage5/pilot-evidence.json`. Only after this gate did the full 498-batch processing start.

## Compiler and review policy

- Public keyless Dicta rich rabbinic Nakdan, build-time only. No paid service, key, runtime network call or new voice/model download.
- Reuse unanimous stress for exact pointed forms from earlier rich outputs (frozen seed), exact-pointed Tanakh forms, shared reviewed exceptions and the local lexicon.
- Context windows for gaps and unseen forms. Long unpointed lists use overlapping 64-word windows, not an oversized API request. Committed coordinates and request hashes protect alignment.
- Strict consonant alignment; split/merged groups get no invented morphology. Every candidate must preserve source consonants and compatible existing vowels. Supplied dagesh/shin dots/shuruq are protected.
- For **fully unpointed words**, use Dicta's context-selected level-1 option even when its confidence flag is false; count these separately. Otherwise most ambiguous ordinary bare words would remain unreadable. This is automated vocalization, not a claim of expert proofreading. For partially pointed words, filling still requires a confident compatible choice. Existing points are not overwritten by a new model choice.
- Original app errata and existing speech-only malformed-niqqud normalization are applied before compilation, consistently with the prior pipeline.
- No generic closed-syllable kamatz rewrite: the narrow reviewed כָּתְל… wall stem before תְ gets explicit U+05C7. Unrelated words such as שָׁמְרוּ are untouched. כָּתְלוֹ receives final primary stress; כֹּתֶל and its clitics receive penultimate primary stress.
- Owner-reviewed הָיְתָה / אֵינוֹ retain final stress. Shared אלא/אפילו/דוקא overrides apply where the pointed spelling matches.
- In **Kiddush Hachodesh calculations only**, ש״ס means 360, not the Talmud; expand it with its prefixed vowels intact. No global Kabbalistic expansion is imported into Rambam. Other abbreviations and citation/number rules retain the existing shared context logic.

## Reproduction

```
node tools/build-rambam-pronunciation.mjs --prepare --pilot
python3 tools/fetch-rambam-rich.py
node tools/build-rambam-pronunciation.mjs --pilot
node /workspace/chitas-stage5/pilot-check.mjs
node tools/build-rambam-pronunciation.mjs --prepare
RAMBAM_WORKERS=2 python3 tools/fetch-rambam-rich.py
node tools/build-rambam-pronunciation.mjs
npm run search
npm test
```

Raw responses: `/workspace/rambam-pronunciation/rich-cache`; pilot/source/voice traces and same-pipeline before/after WAVs: `/workspace/chitas-stage5`. No source display change is inferred from ASR; IPA is inspected for phonology/stress. ASR is only an intelligibility measure and cannot certify primary stress.

## Voice update and limitations

No additional voice installation/update is required for an already up-to-date local voice. A normal app/data update supplies the new speech. Explicit stress is guaranteed only to reach the **local** pipeline; external browser voices still have no stress-control guarantee. Unknown words, ambiguous model readings, unusual names and isolated source errors may remain. No unrelated global G2P rewrites or paid recording are used.

## Full-corpus result

All **498/498** contextual batches completed. All **1,023 files / 15,937 rows** now have parallel speech data. **47,298 words** gained missing points (including **14,043** context-selected low-confidence bare-word fills). **542,799 / 575,516 polysyllabic words (94.3%)** carry explicit primary-stress tags; remaining words use the existing fallback, not a fabricated stress guarantee. **37** narrowly reviewed wall-stem kamatz-katan repairs and **22** book-specific ש״ס expansions were applied. In completely unpointed source rows, **40,568 / 41,322 (98.2%)** eligible regular multi-letter words now contain vowel marks; this measures coverage, not correctness.

Generated data version: **55357ccfc01e**. Display/source checksum remains unchanged; source-letter and existing-vowel preservation checks pass across the full corpus. Seven stage-specific tests pass, including actual library and daily one-/three-chapter local voice queues.

Final same-pipeline audio: `/workspace/chitas-stage5-rambam.mp3` (Neighbors 9, about 23s) and `/workspace/chitas-stage5-rambam-unpointed.mp3` (Tefillin 1, about 24s). Captured queues/primary metadata/IPA are in `/workspace/chitas-stage5/samples.json`. MP3s are generated from the current actual local reading queue, not an external voice. No code/phoneme-model voice asset changed.

Final one-run ASR WER (same 55-word passage, before/after, local cached ivrit-ai Whisper; ordinary Hebrew/numeric character normalization, word Levenshtein):
- rambam: **15/55 (27.3%) → 18/55 (32.7%)**.
- rambam-bare: **53/55 (96.4%) → 8/55 (14.5%)**.
These are small stochastic synthesis/ASR samples, not a corpus-wide accuracy claim or a stress test. Full transcripts and score inputs: `/workspace/chitas-stage5/final-wer.json`. No pronunciation rule was invented from an ASR substitution.

Full regression suite: **395/395 passed** (`npm test`), plus `git diff --check`. In the earlier pilot synthesis run WER was 29.1%→25.5% (pointed Neighbors) and 98.2%→16.4% (bare Tefillin). The final second synthesis run above did not show a consistent WER gain for the already-pointed paragraph; therefore only the large unpointed-sample improvement is supported across both runs. Reviewed wall vowel/stress fixes are independently verified by exact IPA assertions.
