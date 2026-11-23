# Nach commentary batch 13 — II Kings + II Chronicles (nachv)

Shipped as **1.0.207**, DATA_VERSION `699d21937d13`. Built by the PC driver (`--corpus nachv`, local `run-pilot.mjs` + independent Gemini review) with the conservative ך/ת pre-filter in place. The driver stopped after apply+aram4. `npm test` and the git push were done on the Linux box from a clean worktree (`/tmp/chitas-reader-nach-b13`) so uncommitted files in `/workspace/chitas-reader` were not touched. Origin/main was 1.0.206 / `67b0253b4ac2` (`3b6b159c`) when the version was chosen. `npm test` was run after the 1.0.207 bump. The ≥650 changed-sample gate was not loosened. `is_ship` requires an explicit `harmful_error_count = 0`. Ezra and Daniel were not included: II Kings alone yielded 675 changed (above the 650 gate, below the 700 comfort floor), so II Chronicles was packed with it; a first attempt that auto-included Daniel was stopped before review, and the packer was changed so Ezra and Daniel are never auto-added for comfort. Jeremiah stayed parked. Chabad pronunciation, global shva, and the Yerushalmi אדרבה rebuild were not started.

## Scope

- Corpus: Metzudat David on II Kings and II Chronicles, `site/data/nachv/II_Kings/` and `site/data/nachv/II_Chronicles/` on the 1.0.206 tree (DATA_VERSION `67b0253b4ac2`). Public domain.
- II Kings: 25 chapters, nested `say` (719 outer, 198 empty arrays, 976 inner). Raw tokens: 13,394 = 1,690 already pointed + 11,704 bare. `partial` on all 25 pages (values 17–67, sum 976), left byte-identical. `vd` left byte-identical on all 25 pages.
- II Chronicles: 36 chapters, nested `say` (822 outer, 183 empty arrays, 1,246 inner). Raw tokens: 13,780 = 2,066 already pointed + 11,714 bare. `partial` on all 36 pages (values 4–61, sum 1,246), left byte-identical. `vd` left byte-identical on all 36 pages.
- Companion `nach/` folders were lookup-only. Biblical `v` and commentary `e` were not written.
- aram4: no `nachv` rows; updated 0, unchanged 0, skipped 428 (per book). Fixture `base` SHA and the 428-row population were left unchanged.
- ENGINE-COV-1B: neither book has a pin (`has_pin: false`). Approved/allowlist/status/base/schema/population were not changed. No file hashes retargeted.

## Gates

- Combined first pilot (with the ך/ת veto): 1,421 changed / 23,418 bare (674 forms), samples 650, controls 2,038. Pipeline tests: 7/7 pass.
- Independent review of the first packet (`gemini-4-hydrogen-high`): HOLD 8.5, harmful_error_count=3 (`הזהירו -> הִזְהִירוּ` at `II_Kings/6.9.2#11`, required `הִזְהִירוֹ`; `וסמכה -> וְסָמְכָה` at `II_Kings/13.11.0#25`, required `וּסְמָכָהּ`; `חמלה -> חֶמְלָה` at `II_Chronicles/22.10.3#4`, required `חָמְלָה`).
- Fix round 1: exact-only `הזהירו`, `וסמכה`, `חמלה`. Pilot: 1,418 changed / 22,018 split bare (671 forms), samples 650, controls 2,041. Yield 6.44%. dseg modern 0 / rabbinic 2,222 / miss 0. Tests 7/7.
- Independent review of fix round 1 (`gemini-4-hydrogen-high`): **SHIP 9.8**, harmful_error_count=0 (explicit). S1–S5 = 10.0/10.0/9.8/10.0/10.0. 650 changed samples audited; 671 unique accepted forms. `fix_rounds=1`. New exact-only: `הזהירו`, `וסמכה`, `חמלה` (tooling only; not a site-repo `lib.mjs` change).
- Apply vs live 1.0.206: II Kings 25 pages, 25 changed, 673 tokens, 1,690 already-pointed kept, 25 partial preserved. II Chronicles 36 pages, 36 changed, 745 tokens, 2,066 already-pointed kept, 36 partial preserved. No `nach/` writes. `vd`/`partial` identity re-checked on the box (25/25 and 36/36).
- `npm test`: first full run after the bump flaked 707/708 on `tests/voice-choice-188.test.mjs` (F0 assertion `deep 118.80 < male 121.23`); the test was not changed. An isolated retry passed 6/6, then the full suite passed 708/708 in 274.04s. DATA_VERSION `699d21937d13` from `node tools/data-version.mjs`.
