# A7 – Aramaic applicability map (speech layer only)

The approved 1.0.112 groups (and later ARAM-4 / K1) already reach the mixed-commentary path (`block.say`, baked by `tools/aramaic-say-pass.mjs`). They did not reach the opt-in vocalized-Gemara path (`ttsVocalizedGemara` → raw `block.text`).

This release applies the same source × group gates to that path at runtime. Display typography is unchanged. Disabled groups stay off: shva on Bavli and prose, the general 1.0.112 lexicon, and no new אדרבה treatment. There is no suffix-based language detector.

## Matrix (source × group × path)

| group | bavli | yerushalmi | onkelos | tanya / tolt | mixed commentary (`say`) | vocalized Gemara (`text`) |
|---|---|---|---|---|---|---|
| lav | on | on | on | on | baked at build | runtime, this release |
| rules | on | on | off | on | baked at build | runtime, this release (Gemara only) |
| zohar | on | on | off | on | baked at build | runtime, this release (Gemara only) |
| shva | **off** | on | on | **off** | baked at build | runtime, this release (Yerushalmi only) |
| lexicon (1.0.112 general) | **off** | **off** | **off** | **off** | not applied | not applied |
| ARAM-4 exact lexicon | on | off | off | off | baked at build | runtime, this release (Bavli non-Mishnah) |
| K1 (`לְכוּלֵּיהּ`) | on | off | off | off | baked at build | runtime, this release (Bavli non-Mishnah) |
| ־ֵיהּ / לֵיהּ (g2p, tts-prep) | runtime, all texts | same | same | same | already | already |

Onkelos, Tanya and Torah Or already use their processed `say` and are not routed through this runtime path.

## How

- `site/js/aram-speech.js` is a browser-safe port of the approved transform. Membership in the ARAM∖HEB set comes from `site/engine/aram-forms.json` (regenerate with `node tools/build-aram-forms.mjs`). The file is fetched lazily and cached (`optional-engine-v1`); it is not in the shell precache and does not change `DATA_VERSION`.
- Mishnah segments on a Bavli amud are tagged with the existing `segMishnah` state in `texts.js` and left untouched. Quotations inside Gemara text are skipped, as in the build pass.
- `speechTextForBlock` applies the transform only when `ttsVocalizedGemara` is on for a Bavli/Yerushalmi block. Forms are loaded before playback (`ttsToggle`) and before «הצג מה שהוקרא».

## Not in this release

- Re-enabling shva on Bavli or prose, the general lexicon, or a new אדרבה rule.
- A suffix-based Aramaic detector.
- Changes to `g2p.js`, display typography, or baked `site/data` speech fields.

## Round 1 review fixes

Independent review HOLD 8.2 (harmful_error_count=0). Fixes in this candidate:

1. `vocalizedGemaraSpeech` runs `plainSpeechText` (strip tags and entities) before `aramSayText`, so ARAM-4 and K1 `scanSpeech` are not fail-closed by `<b>גְּמָ׳</b>` / `<b>מַתְנִי׳</b>`, and `"` in HTML attributes cannot flip quote state. Display `block.text` is unchanged.
2. `isVocalizedGemaraBlock` also treats `aramSource === 'yerushalmi'|'bavli'` as a Gemara body, including Yerushalmi / Shekalim segments with no Penei Moshe. Those body-text paths (toggle on, or default when there is no baked `say`) go through `aramSayText`. Mishnah (`ברטנורא`) is unchanged. `ttsGemaraBiurOnly` still skips a body with no commentary.
3. `let mi = false` is hoisted outside the Daf Yomi `spec.amudim` loop so a Mishnah that opens at the end of amud א continues on amud ב in the same lesson.

## Round 2 review fixes

Independent review HOLD 8.8 (harmful_error_count=0). The default no-commentary path in the real reader still skipped the transform because `app.js` `ttsSegments` passes `fallback: ''`, which short-circuited `speechTextForBlock` before `vocalizedGemaraSpeech`. The body-text branch now runs first. `ensureAramForms()` is also awaited when the open lesson has a no-`say` Bavli/Yerushalmi body, not only when `ttsVocalizedGemara` is on. A test calls `primaryPartForSegment` with the same `{ fallback: '', displayedFallback: '' }` options as `ttsSegments`.
