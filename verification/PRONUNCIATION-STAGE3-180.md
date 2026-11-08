# Stage 3 — Siddur speech (1.0.80)

## Scope and preservation

- 73 section files; compiled `say` for all 1,994 nonempty original audible prayer/table rows (repeated rows reuse the same speech), deduplicated into 1,150 unique prayers.
- Every pre-existing Siddur JSON field is unchanged, including source `b`, titles, instructions, table metadata and nusach. Source-only SHA256: `f11cb7682c5dc614b9b6e12b404e332016d032d07181f11bcf0f9580f99efc28` (sorted `[path, originalObject]`, deleting only new `say`). Covered by a regression test.
- Runtime changes only attach `say` to paragraphs, repeats and prayer tables. Existing omission, display, repetition, section-navigation and instruction-language rules are not replaced.
- Nested `data-nr` / inline `sid-in` instructions and (א)…(יד) section markers are excluded from compiled speech. Table cells are spoken only when `k === 'p'`: Names/Omer metadata, headers and instructions remain displayed but silent. Conditional whole-block hiding still operates in `buildSiddurDoc` before the speech queue is made.

## Build, stress and vowels

`node tools/build-siddur-pronunciation.mjs --prepare`; `python3 tools/fetch-siddur-rich.py`; `node tools/build-siddur-pronunciation.mjs`; `npm run search`.

- Keyless public Dicta rich rabbinic output, cached outside repo at `/workspace/siddur-pronunciation/rich-cache`; 93 batches. **No runtime API calls**, payments, keys or voice/model changes.
- Existing vowel/shin-dot/dagesh marks are retained, not replaced by Dicta. Only missing compatible vowel/shva/shin-dot marks are filled; optional dagesh is not added to partially pointed words. Shuruq is protected from being misread as an unpointed consonantal vav.
- Exact, compatible Torah/Psalms quotations require at least four consecutive matching words. No fuzzy match, paraphrase replacement or nusach harmonization. Ambiguous parallel forms are rejected. Biblical stress must agree with the resulting syllable count.
- Stress priority: reviewed Siddur overrides → unambiguous compatible Biblical quotation → shared exception dictionary → compatible rich morphology → verified lexical stress → existing fallback. Private U+05AB primary tags reach local G2P occurrence-by-occurrence; they are not displayed or spoken as characters.
- Speech-only source repair `יָדָים → יָדַיִם` in three source rows. No global change to displayed Siddur spelling.
- Raw Dicta incorrectly proposed Acc0 for `אָבִינוּ`, `בְּפִינוּ`, `רַגְלַיִם`; reviewed overrides protect these and pointed -ayim duals. `הָיְתָה` / `אֵינוֹ` remain milra (all 12 / 6 exact compiled occurrences checked in actual IPA). One token merge across a closing curly quote is aligned by exact consonants and given **no** fabricated morphology; later words do not shift.

Metrics (unique prayer text, not multiplicity-weighted): 37,681 words; 396 words received additive vowel/dot completion; 9,389 words selected compatible Biblical stress. 26,249 / 29,838 polysyllables (88.0%) receive explicit primary tags. Remaining words retain the existing lexical/rule fallback; this is not a claim of perfect proofreading.

## Actual IPA evidence

`verification/SIDDUR-180-evidence.json` records source versus compiled local G2P traces, not ASR guesses:

| Source/prayer | Before | After |
|---|---|---|
| שֶׁהֶחֱזַרְתָּ | `ʃeheχezaʁtˈa` | `ʃeheχezˈaʁta` |
| יָדָים | `jadˈam` | יָדַיִם `jadˈajim` |
| לְידְעֶיךָ | `ledʔˈeχa` | לְיֹדְעֶיךָ `lejodʔˈeχa` |
| מִשגָּב | `miʃɡˈav` | מִשְׂגָּב `misɡˈav` |

`בְּפִינוּ → befˈinu` and `אָבִינוּ → ʔavˈinu` are explicitly guarded against the newly observed Dicta regressions, not misrepresented as improvements over the previous suffix rule.

## Playback samples and tests

- `/workspace/chitas-stage3-siddur.mp3`: opening morning prayers, 26.8 s.
- `/workspace/chitas-stage3-siddur-shema.mp3`: bedtime Shema introduction, 23.5 s.
- `/workspace/chitas-stage3/samples.mjs` captures the **actual browser reader queue**, passes it through `PiperSpeaker.load`, and synthesizes the first 55 prepared words using `nodeVoice`, the existing full model, male timbre and rate 1; same pipeline as stage 2 / accepted Hayom Yom sample. Prepared text, exact chunks, parallel primary metadata and IPA are in `/workspace/chitas-stage3/samples.json`.
- New tests cover original-field checksum, additive vowel preservation for the entire corpus, shuruq protection, safe quote-boundary alignment, concrete IPA, reviewed stress, repeats, instruction languages, conditional omissions, actual browser paragraph/table queues and the exact local-voice update UI/cache behavior.

## Exact local voice installation / update UI

**Not automatic on next load.** `voiceStatus()` inspects cache; it does not download missing voice assets. Home **הגדרות** → **הקראה** → **קול איכותי (פועל במכשיר, ניסיוני)** → button **קול איכותי – הורדה חד-פעמית (92 MB)** (38 MB for the lightweight model). The same form opens from the reading bar **הגדרות הקראה** gear or a long press on the speaker button. There is no button literally named “עדכון קול”.

For a pre-1.0.78 installation with the same model already cached, the click reuses the model/WASM/config and fetches only the changed 47,976-byte stress table, despite the full-size button label. A browser regression seeds this old cache, proves zero automatic voice requests, then proves the button fetches only `/voice/stress-he.json` and automatically selects **קול איכותי (מקומי)**.

If the local voice was already installed/updated for 1.0.78 or 1.0.79, **stage 3 needs no further voice download**: no voice assets changed. Updated speech text is part of the normal app data update. If **קול הדפדפן / המכשיר** is selected, select **קול איכותי (מקומי)** to hear the local method.

## Limitations

No guarantee that external Web Speech voices obey stress (their path strips private tags). Conservative vowel filling deliberately leaves uncertain source gaps/conflicts alone. Rare Aramaic/conditional meanings and automatic morphology still need review; exact quotation lookup currently covers Torah/Psalms, not all Tanakh. No stage 4 or Rambam changes in this release.

## Release validation

Final `npm test`: **374 / 374 passed**, 0 skipped (log `/workspace/chitas-stage3/final-tests.log`). `git diff --check` passed. Rebuild from the cached rich responses reproduced DATA_VERSION **c79a1481c734**. Public deployment verification is recorded separately at `/workspace/chitas-stage3/live-verification.json` after push.
