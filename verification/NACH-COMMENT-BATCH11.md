# Nach commentary batch 11 — II Samuel (nachv)

Shipped as **1.0.204**, DATA_VERSION `f8870c9afe2a`. Built by the PC driver (`--corpus nachv`, local `run-pilot.mjs` + independent Gemini review) with the conservative ך/ת pre-filter in place. The driver stopped after apply+aram4. `npm test` and the git push were done on the Linux box from a clean worktree (`/tmp/chitas-reader-nach-b11`) so uncommitted files in `/workspace/chitas-reader` were not touched. Origin/main was 1.0.203 / `945cdc744bdb` (`73592aeb`) when the version was chosen. `npm test` was run after the 1.0.204 bump. The ≥650 changed-sample gate was not loosened. `is_ship` requires an explicit `harmful_error_count = 0`. Ezra and Daniel were not included. Jeremiah stayed parked after batch 7 HOLD 9.2. I Samuel batch 10 reviewed SHIP 9.9 but was not released in this version (non-identity 1B pins); a pin-file exemption (leave pinned pages at live hashes) was validated separately. Chabad pronunciation, global shva, and the Yerushalmi אדרבה rebuild were not started.

## Scope

- Corpus: Metzudat David on II Samuel, `site/data/nachv/II_Samuel/` on the 1.0.203 tree (DATA_VERSION `945cdc744bdb`). Public domain. 24 chapters, nested `say` (695 outer, 133 empty arrays, 1,043 inner).
- Raw tokens: 16,317 = 1,842 already pointed + 14,475 bare. `partial` on all 24 pages (values 14–85, sum 1,043), left byte-identical. `vd` left byte-identical on all 24 pages.
- Companion `nach/II_Samuel` was lookup-only. Biblical `v` and commentary `e` were not written.
- aram4: no `nachv` rows; updated 0, unchanged 0, skipped 428. Fixture `base` SHA and the 428-row population were left unchanged.
- ENGINE-COV-1B: II Samuel has no pin (`has_pin: false`). Approved/allowlist/status/base/schema/population were not changed. No file hashes retargeted.

## Gates

- First (and only) pilot (with the ך/ת veto): 865 changed / 14,475 bare (500 forms), samples 650, controls 1,062. Yield 6.12% of 14,145 split bare tokens. dseg modern 0 / rabbinic 1,043 / miss 0. Pipeline tests: 7/7 pass.
- Independent review (`gemini-4-hydrogen-high`): **SHIP 9.8**, harmful_error_count=0 (explicit). S1–S5 = 10.0/9.8/10.0/10.0/10.0. 650 changed samples audited; 500 unique accepted forms (865 occurrences). No exact-only fix round (`fix_rounds=0`).
- Apply vs live 1.0.203: 24 pages, 24 changed, 0 identical, 865 tokens, 1,842 already-pointed kept, 24 partial pages preserved. No `nach/` writes. `vd`/`partial` identity re-checked on the box (0 issues).
- `npm test`: 708/708 pass in 280.53s on the Linux box, run after bumping VERSION to 1.0.204 (so the historical bump-check regexes are exercised). DATA_VERSION `f8870c9afe2a` from `node tools/data-version.mjs`.
