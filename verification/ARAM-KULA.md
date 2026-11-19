# 1.0.136 – context-based kula/millei stress (Stage 8), K1 only

Speech-only, addition-only U+05AB on Bavli Gemara (`gemara/bsay`) outside Mishnah and quotations.

Enabled rule: **K1** = exact pointed `לְכוּלֵּיהּ`, final stress. Evidence in the builder inventory: 20/20 already final-stressed across 13 tractates; Hebrew-loose 0; Steinsaltz-plain 0. On live 1.0.135 data the same tokens are already tagged, so the ship is the module and hook, **not a corpus data patch** (0 additions, 0 relocations).

All other kula spellings/prefixes remain OFF (insufficient same-form tagged evidence or Hebrew/Steinsaltz gates). All מִילֵּי / מִלֵּי phrase and default rules remain OFF because common contexts are mixed (e.g. `הָנֵי מִילֵּי` 468 penultimate / 179 final). A global מִילֵּי rule is forbidden and is not present. No prefix-stripping analogy (K1 does not license `כּוּלֵּיהּ` or `לְכוֹלֵּיהּ`). Existing accents are never moved.

Composition: ARAM-4 (`aramLexText`) then Stage 8 (`aramKulaText`) at the end of `aramSayText`, Bavli non-Mishnah only.

Independent review: `engine-cov-kula-millei-2-review`, agy **gemini-4-hydrogen-high**, 2026-11-19 21:12 שעון ישראל (Asia/Jerusalem). Verdict **SHIP**, overall **9.8**, harmful_error_count **0**. S1 9.8, S2 9.9, S3 9.8, S4 9.8, S5 9.9. 560 corpus tokens audited (0 reject, 0 uncertain, 0 harmful). Builder: Codex CLI (GPT-6) in `engine-cov-kula-millei-2` (status HOLD-yourself / zero yield; reviewer accepted the module). Tests: `tests/engine-aram-kula.test.mjs`.

Live `node tools/aramaic-say-pass.mjs --dry` on 1.0.135 reports a pre-existing fixed-point drift (`filesChanged` 652: Bavli 742 words, Yerushalmi 144, tolt 19). The same counts appear with and without the K1 hook. This release does **not** re-run the pass or change `site/data`; DATA_VERSION stays `7da7d86541b8`.
