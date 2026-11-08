# 1.0.78 — stage 1: Chumash, Tehillim, Rashi

## Scope / invariants

- Chumash and Tehillim retain the existing Masoretic vowels; this release fixes extraction of primary stress from the source cantillation, not their display text.
- All 187 Torah chapter files retain **identical** `v` and `r` fields. Only parallel speech-only `rs` fields were added. Source checksum (sorted `[file,v,r]`): `59997f8f32ab2e641f6f5eaa41572e77c2104d545860892abd3091cf87bc01a9`.
- Daily lessons and library use the same Rashi builder. Display rendering/nusach is unchanged. Stages 2–5 have not been implemented. The shared stress fallback model can incidentally affect other sections.

## Primary stress, not musical auxiliaries

`g2p.js` now preserves maqaf boundaries while decoding accents. A secondary mark in the first maqaf component is not treated as its lexical stress. The decoder distinguishes poetic tsinnorit, revia-mugrash, ole-veyored, prepositive dehi and its auxiliary munach; it handles duplicated pashta/telisha, priority of disjunctive signs, and the final meteg-shaped silluq before sof-pasuq. Ordinary meteg is not primary stress. Source punctuation is excluded from lookup keys.

The fallback stress lexicon/suffix model was rebuilt from these corrected labels. Comparing the complete prepared Torah/Psalms corpus against 1.0.77: 6,793 Torah and 4,232 Psalms token occurrences newly obtain direct source-accent stress; 198/80,001 Torah and 312/19,609 Psalms token IPAs change. These are coverage/change counts, **not a claimed accuracy improvement percentage**. Evidence with source verses: `PRONUNCIATION-STAGE1-178-evidence.json`.

## Rashi corpus

All 7,816 paragraphs were processed in 444 public, keyless build-time Dicta rabbinic batches. No runtime API, paid service or recorded speech is involved. Existing source vowels are preserved (apart from the already-shared safe niqqud repairs); only entirely unvowelled, consonant-identical, confidently selected non-foreign words are filled. Hebrew presentation forms are decomposed in speech only.

Selection order: verified verse headword stress, curated pointed-word overrides, shared verified exceptions, Dicta morphology whose pointed form/nucleus count matches the existing source, verified lexicon, then the existing fallback. API prefix splitting is aligned exactly and cannot shift later metadata. Final alignment failures: **0**.

Final counts (`RASHI-178-metrics.json`): 164,369 source word tokens; 1,862 unvowelled occurrences filled; 106,827 of 114,595 eligible polysyllabic tokens explicitly stress-marked (~93.2%); 72 context expansions of prose ע״ז to עבודה זרה. Parenthesized source-page ע״ז and בלע״ז are not expanded as עבודה זרה. Generic abbreviation expansion remains in the shared preparer.

Compiled stress is transported **per occurrence and per chunk**, not merely a distinct-word dictionary. The local pipeline validates that removing the private marks reproduces the exact prepared text before using the metadata. Private U+05AB tags never reach the audible text or the ordinary Web Speech path. Existing correct final stress in הָיְתָה / אֵינוֹ is protected by regression tests.

## Verified before / after IPA

- Psalm 135 הַלְלוּ: `hˈalelu` → `halelˈu`.
- Deuteronomy 2:9 תָּצַר: `tatsˈaʁ` → `tˈatsaʁ` (duplicated pashta).
- Deuteronomy 2:31 הַחִלֹּתִי: `haχilotˈi` → `haχilˈoti`.
- Rashi Genesis 25:19 כַּמָּה: `kamˈa` → `kˈama`; שֶׁכָּתַב: `ʃekˈatav` → `ʃekatˈav`.

Assertions inspect the real local voice's IPA and actual browser daily/library queues. ASR noise was not used to invent word fixes. No fresh WER claim is made for this stage.

## Audio / validation

Generated from the final browser `ttsSegments` → `PiperSpeaker.load` queue, then the identical local full Noa ONNX/G2P core, default male timbre, rate 1 (same pipeline as the 1.0.77 sample):

- `/workspace/chitas-stage1-chumash.mp3` — Genesis 25:19 onward, 22.44 seconds.
- `/workspace/chitas-stage1-tehillim.mp3` — Psalm 135, 23.54 seconds.
- `/workspace/chitas-stage1-rashi.mp3` — Rashi Genesis 25:19, 26.59 seconds.

Ten new regression tests cover the source invariants, specific accent/IPA cases, abbreviation context, API alignment, occurrence-specific stress, and real daily/library transport. Final `npm test`: **356/356 passed, 0 failed** (including all ten new tests). `git diff --check` passed. The initial full run found stale search provenance (rebuilt with `npm run search`) and one stochastic int8-duration assertion; the final complete rerun passed without weakening or changing that assertion. Logs: `/workspace/chitas-stage1/npm-test-final.log`.

## Rebuild

```sh
node tools/build-voice-stress.mjs
node tools/build-rashi-pronunciation.mjs --prepare
RASHI_WORKERS=2 python3 tools/fetch-rashi-rich.py
node tools/build-rashi-pronunciation.mjs
npm run search
npm test
```

Public service: `https://nakdan-u2-1a.loadbalancer.dicta.org.il/api`; cache defaults to `/workspace/rashi-pronunciation/rich-cache` (`RASHI_RICH_CACHE` override). Fetch uses two workers and bounded transient-server retries; no secrets. Cache is outside the repository; a fully cached rebuild makes no service calls.

## Limitations / update notes

- Automatically filled vowels/morphology are not human-proofread throughout. Some Rashi words still use suffix/default stress; foreign glosses and uncertain/unmatched words are deliberately not guessed.
- Unusable/prepositive-only and conflicting same-spelling Tanakh accents still fall back to the lexicon/model. This is not a claim of perfect stress in every word.
- The quality/stress evidence applies to the **installed local voice**. Browser Web Speech engines do not receive IPA and have no guaranteed stress control.
- The stress file's hashed URL changes. Existing installations need one user-triggered local-voice download/update; unchanged model/WASM assets are reused, and the changed stress file is only 47,976 bytes (~48 kB). No silent voice download was added.
- Local release version: 1.0.78. Deployment/live verification must be logged separately after an authorized push; this document does not claim the release is live.

Release preparation: local `VERSION=1.0.78`, `DATA_VERSION=dc1c9550c8ef`. Public live `sw.js` was read and still reports `1.0.77` / `32bb346993b2`; no push/deployment has been performed by this executor.
