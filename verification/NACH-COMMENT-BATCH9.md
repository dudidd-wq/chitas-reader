# Nach commentary batch 9 — I Kings (nachv)

Shipped as **1.0.203**, DATA_VERSION `945cdc744bdb`. Built by the PC driver (`--corpus nachv`, local `run-pilot.mjs` + independent Gemini review) with the conservative ך/ת pre-filter in place. The driver stopped after apply+aram4. `npm test` and the git push were done on the Linux box from a clean worktree (`/tmp/chitas-reader-nach-b9`) so uncommitted files in `/workspace/chitas-reader` were not touched. Origin/main was 1.0.202 / `5aed3dcbc9af` (`3cabe356`) when the version was chosen. `npm test` was run after the 1.0.203 bump. The ≥650 changed-sample gate was not loosened. `is_ship` requires an explicit `harmful_error_count = 0`. Ezra and Daniel were not included. Jeremiah stayed parked after batch 7 HOLD 9.2. Chabad pronunciation, global shva, and the Yerushalmi אדרבה rebuild were not started.

## Scope

- Corpus: Metzudat David on I Kings, `site/data/nachv/I_Kings/` on the 1.0.202 tree (DATA_VERSION `5aed3dcbc9af`). Public domain. 22 chapters, nested `say` (817 outer, 197 empty arrays, 1,173 inner).
- Raw tokens: 17,253 = 2,125 already pointed + 15,128 bare. `partial` on all 22 pages (values 23–131, sum 1,171), left byte-identical. `vd` left byte-identical on all 22 pages.
- Companion `nach/I_Kings` was lookup-only. Biblical `v` and commentary `e` were not written.
- aram4: no `nachv` rows; updated 0, unchanged 0, skipped 428. Fixture `base` SHA and the 428-row population were left unchanged.
- ENGINE-COV-1B: I Kings has no pin (`has_pin: false`). Approved/allowlist/status/base/schema/population were not changed. No file hashes retargeted.

## Gates

- First pilot (with the ך/ת veto): 915 changed / 15,128 bare (506 forms), samples 650, controls 1,169. Pipeline tests: 7/7 pass. Independent first review (`gemini-4-hydrogen-high`): **HOLD 8.8**, harmful_error_count=5 (explicit). S1–S5 = 10.0/8.8/9.6/9.9/10.0. Exact-only forms in fix round 1 of 2: `רזון`, `מעלתי`, `חוצב`, `לומד`.
- After fix 1: 910 changed (502 forms), samples 650, controls 1,174. Yield 6.19% of 14,702 split bare tokens. dseg modern 0 / rabbinic 1,173 / miss 0.
- Independent final review (`gemini-4-hydrogen-high`): **SHIP 9.9**, harmful_error_count=0 (explicit). S1–S5 = 10.0/9.9/10.0/10.0/10.0. 650 changed samples audited; 502 unique accepted forms (910 occurrences).
- Apply vs live 1.0.202: 22 pages, 22 changed, 0 identical, 910 tokens, 2,125 already-pointed kept, 22 partial pages preserved. No `nach/` writes. `vd`/`partial` identity re-checked on the box (0 issues).
- `npm test`: 708/708 pass in 273.89s on the Linux box, run after bumping VERSION to 1.0.203 (so the historical bump-check regexes are exercised). DATA_VERSION `945cdc744bdb` from `node tools/data-version.mjs`.
