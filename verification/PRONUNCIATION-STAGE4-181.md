# Stage 4 — Torah Or / Likkutei Torah + Modeh Ani acoustic repair (1.0.81)

## Scope and source safety

All 54 weekly files, 8,148 passages. Each paragraph gains only a speech-only `say` field. `t`, existing Chabad/Kehot pointing (`nq`, `h`), location metadata and every other pre-existing field are unchanged. Original-field checksum: `b6453b7e466b35febce1915c06161e8a8f9c5f10a1611dcfd546908815776ec2` (sorted `[path, object]`, deleting only paragraph `say`). Source letters and every existing vowel/shva/dagesh/shin-dot are regression checked after the reviewed abbreviation expansions; no bulk re-vocalization of already pointed text. One speech-only source typo `ח,ע` is identified as חכמה עילאה by the same Toldot paragraph’s repeated ח״ע and subsequent explicit expansion, not by ASR; that narrow contextual expansion is tested separately.

Page-marker spans and section labels are excluded before speech compilation; displayed text and source references remain intact. The daily and library builders attach the same `say` field and existing local primary-metadata path. This release does not start Rambam.

## Conservative build

1. `node tools/build-tolt-pronunciation.mjs --prepare`
2. `TOLT_WORKERS=4 python3 tools/fetch-tolt-rich.py`
3. `node tools/build-tolt-pronunciation.mjs`
4. `npm run search`

Public keyless Dicta rich rabbinic morphology is used at build time only. No API calls from the app, paid service, keys or new model download. Requests and raw responses remain in `/workspace/tolt-pronunciation/rich-cache`.

- Reuse exact pointed forms only when previously cached rich stress is unanimous; committed `tools/data/tolt-rich-stress-seed.json` freezes that evidence (including conflicting sets) so future cache changes cannot silently alter query planning.
- Unanimous stress from exact pointed Torah/Psalms word forms, shared exceptions and reviewed terms take precedence. This is word-form reuse, not a claim that every Torah Or citation has been contextually matched to a verse.
- Context windows query missing vowels and unseen stress forms. A committed coordinate plan keeps consonant queries stable while reviewed vowel-only refinements are made. Holam-male/shuruq carriers are not mistaken for missing vowels.
- Fresh vowel completion requires a confident first choice, exactly the same consonants and compatibility with every existing vowel. Partially pointed words retain their original dagesh; shuruq is protected. Ambiguous candidates remain unchanged.
- Fresh/reused morphology is not accepted when compatible first/second-level alternatives disagree on stress. Unresolved words retain the existing lexical/rule fallback.
- Every response is strictly consonant-aligned. Split/merged groups receive no invented morphology; later words cannot shift.

## Reviewed Kabbalah context

`דז״א → דְּזְעֵיר אַנְפִּין`; contextually supported `ז״א` and compound clitics are zeir anpin, not the global generic “זאת אומרת”. `חח״ן → חָכְמָה חֶסֶד נֶצַח`; the corresponding בג״ה / דת״י lines are expanded with grammar-aware prefixes. Reviewed stress includes אבא/אמא, דעת/תפארת, and final stress on זעיר אנפין. Dual -ayim and previously reviewed prose exceptions are retained.

Water imagery can expand מ״ד / מ״ן into fully pointed, explicitly stressed מיין דוכרין / נוקבין. It requires positive surrounding context and skips parenthesized references and citation-unit numbers (e.g. שער מ״ד). מאן דאמר and ועל זה אמר are not globally reinterpreted as Kabbalah terms. Late expansions run only after morphology alignment, never shifting its token positions.

## Priority: שֶׁהֶחֱזַרְתָּ

The 1.0.80 source, metadata and actual Piper phonemes were already `ʃeheχezˈaʁta`: five vowels; chataf-segol `e`; silent resh shva (`ʁt`, no inserted vowel); tav `t`; stress on ZAR. The installed reference Phonikud produces the same IPA. Replacing chataf with full segol is acoustically identical; deleting it would violate the requested reading. No general chataf/shva rewrite was justified.

Controlled renders instead showed unreliable realization of the repeated he/che sequence inside the longer utterance. Three exact-baseline renders produced ASR שהחזרת once and שחזרת twice; three renders split at the natural clause boundary produced שהחזרת three times. The delivered current-queue render and its clause both recognize שהחזרת (target probabilities ~0.973 / 0.963). This is an intelligibility check, **not proof of stress from Whisper** or a substitute for Dudi's listening judgment.

Speech-only `וקיים, שהחזרת` now uses a synthesis boundary (`וקיים. שהחזרת` in `say`). The displayed comma, niqqud and primary stress remain unchanged. Browser regression proves two real local chunks and unchanged target IPA. Other prayers and general shva/chataf rules are not rewritten. Alternative stress-marker positions, syllable splitting, epsilon/x/r substitutions and stressed-vowel duplication were tested and rejected as inconsistent/worse.

Evidence: `verification/SHEHE-181-evidence.json`; full experiments/actual IDs/alignments under `/workspace/chitas-stage4/shehe-*`.

Comparison: `/workspace/chitas-shehechezarta-fix.mp3` (10.45 s): original sentence, 0.8-second gap, repaired current-queue sentence. The original isolated cut is also retained; its ASR “שהחזרתי” alone is not used to infer a vowel error because cut boundaries can affect recognition.

## Voice update

No voice assets, model, stress table, G2P or phoneme-ID map change in this stage. **No additional voice installation/update is needed** for users already updated in 1.0.78/79. Normal app/data update to 1.0.81 supplies the new speech. Choose `קול איכותי (מקומי)` to use explicit local stress; external Web Speech voices still have no stress guarantee.

## Remaining limitations

Automatic morphology is not full human proofreading. Ambiguous terms, source consonant typos and rare Aramaic can still require narrow review; they are not silently respelled from ASR. Conservative uncertain gaps/stress remain on fallback. Source display stays as supplied, even where speech has been completed.

## Measured coverage and concrete phonemes

The completed build covers all 8,148 paragraphs / 54 files, ~937,090 pre-expansion words. Contextual Dicta fills 2,809 compatible word occurrences; 61 reviewed exact bare התורה occurrences fill additional gaps. Bare הוא/היא are not forced to Hebrew vowels, since Aramaic may differ. It does **not** mean all unpointed source words were confidently resolved. The final corpus has 499,900 explicit primary tags (~87% of recognized polysyllables; the denominator is measured before final contextual expansions). Uncertain remaining gaps are deliberately retained rather than blindly accepting ambiguous morphology.

Actual same-pipeline traces, in Acharei paragraphs 0:0–1:
- הַתְּשׁוּבָה `hateʃˈuva` → `hateʃuvˈa` (final stress).
- בַּזֹּהַר `bazohˈaʁ` → `bazˈohaʁ` (penultimate).
- אֶלָּא `ʔelˈa` → `ʔˈela`; דַּוְקָא `davkˈa` → `dˈavka`.
- Bare הלא formerly `hˈl` → הֲלֹא `halˈo`; מקץ `mˈkts` → מִקֵּץ `mikˈets`.
- דז״א previously followed the generic דזאת אומרת expansion; now דְּזְעֵיר אַנְפִּין. חח״ן previously spelled letter names; now חָכְמָה חֶסֶד נֶצַח.

Word/IPA traces: `/workspace/chitas-stage4/word-examples.json`, `stress-examples.json`. Browser-queue captures, parallel primary metadata and samples: `/workspace/chitas-stage4/samples.json`. The two stage-4 MP3s use the same full local noa model/male timbre as earlier stages, with no new voice assets. ASR checks intelligibility only; it cannot certify stress or overrule source/IPA evidence.

## Final release artifacts

Release: **1.0.81**, DATA_VERSION **bd6e893e32a5**. Search content/shards are unchanged apart from the source-provenance hash. Files below contain the same local synthesis settings as the prior stage:
- `/workspace/chitas-stage4-torah-or.mp3` — today’s Torah Or (~27 s).
- `/workspace/chitas-stage4-likutei-torah.mp3` — Likkutei Torah, Bamidbar (~25 s).
- `/workspace/chitas-shehechezarta-fix.mp3` — original then repaired Modeh Ani sentence (10.45 s).

Public post-push verification is captured in `/workspace/chitas-stage4/live-verification.json` and `live-sw-181.js`: sw.js version/data version; manifest hashes against local bytes for three weekly files and the Siddur repair; compiled speech and primary tags present; runtime `say` routing attached.

Full `npm test`: **383/383 passed**, zero skipped/failed (final log `/workspace/chitas-stage4/final-tests-2.log`). Eight focused stage-4 tests also pass, including all original fields/letters/points, browser primary-metadata routing and the actual two-chunk Modeh Ani fix. `git diff --check` is clean.
