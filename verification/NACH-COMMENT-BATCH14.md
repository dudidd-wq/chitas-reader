# Nach commentary batch 14 — Ecclesiastes (nachv)

Shipped as **1.0.208**, DATA_VERSION `b42309a7eb44`. Built by the PC driver (`--corpus nachv`, local `run-pilot.mjs` + independent Gemini review) with the conservative ך/ת pre-filter in place. The driver stopped after apply+aram4. `npm test` and the git push were done on the Linux box from a clean worktree (`/tmp/chitas-reader-nach-b14`) so uncommitted files in `/workspace/chitas-reader` were not touched. Origin/main was 1.0.207 / `699d21937d13` (`4ac75ecc`) when the version was chosen. `npm test` was run after the 1.0.208 bump. The ≥650 changed-sample gate was not loosened. `is_ship` requires an explicit `harmful_error_count = 0`. Ezra and Daniel were not included. Joshua and Judges were ranked during inspect and have non-identity 1B pins, but Ecclesiastes alone yielded 791 changed (above the 700 comfort floor), so no other book was packed. Jeremiah stayed parked. Chabad pronunciation, global shva, and the Yerushalmi אדרבה rebuild were not started.

## Scope

- Corpus: Metzudat David / Rashi on Ecclesiastes, `site/data/nachv/Ecclesiastes/` on the 1.0.207 tree (DATA_VERSION `699d21937d13`). 12 chapters, nested `say` (222 outer, 1 empty array, 556 inner).
- Raw tokens: 12,701 = 1,121 already pointed + 11,580 bare. `partial` on all 12 pages (values 21–65, sum 556), left byte-identical. `vd` left byte-identical on all 12 pages (re-checked on the box, 0 issues).
- Companion `nach/Ecclesiastes` was lookup-only. Biblical `v` and commentary `e` were not written.
- aram4: no `nachv` rows; updated 0, unchanged 0, skipped 428. Fixture `base` SHA and the 428-row population were left unchanged.
- ENGINE-COV-1B: Ecclesiastes has no pin (`has_pin: false`). Approved/allowlist/status/base/schema/population were not changed. No file hashes retargeted.

## Gates

- First pilot (with the ך/ת veto): 791 changed / 11,580 bare (391 forms), samples 650, controls 582. Pipeline tests: 7/7 pass.
- Independent review of the first packet (`gemini-4-hydrogen-high`): HOLD 9.3, harmful_error_count=1 (`יגיעו -> יַגִּיעוּ` at `Ecclesiastes/1.6.3#62`, required noun+suffix `יְגִיעוֹ` from י-ג-ע, not 3pl Hifil from נ-ג-ע).
- Fix round 1: exact-only `יגיעו`. Pilot: 790 changed / 390 forms, samples 650, controls 583. Tests 7/7. Review: HOLD 9.0, harmful_error_count=2 (`הרגיש` and `השכיל`, Hifil past vs infinitive construct at `Ecclesiastes/7:16:1#4` and `8:15:0#22`).
- Fix round 2 (last allowed): exact-only `הרגיש` and `השכיל` (also preserving `יגיעו`). Pilot: 786 changed / 11,509 split bare (388 forms), samples 650, controls 587. Yield 6.83%. dseg modern 0 / rabbinic 556 / miss 0. Tests 7/7.
- Independent review of fix round 2 (`gemini-4-hydrogen-high`): **SHIP 9.8**, harmful_error_count=0 (explicit). S1–S5 = 10.0/10.0/10.0/9.8/10.0. 650 changed samples audited; 388 unique accepted forms. `fix_rounds=2`. New exact-only: `יגיעו`, `הרגיש`, `השכיל` (tooling only; not a site-repo `lib.mjs` change).
- Apply vs live 1.0.207: 12 pages, 12 changed, 0 identical, 786 tokens, 1,121 already-pointed kept, 12 partial pages preserved. No `nach/` writes. `vd`/`partial` identity re-checked on the box (12/12).
- `npm test`: 708/708 pass in 277.36s on the Linux box, run after bumping VERSION to 1.0.208 (so the historical bump-check regexes are exercised). DATA_VERSION `b42309a7eb44` from `node tools/data-version.mjs`.
