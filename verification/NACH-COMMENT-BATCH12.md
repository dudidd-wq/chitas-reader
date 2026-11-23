# Nach commentary batch 12 — I Chronicles (nachv)

Shipped as **1.0.206**, DATA_VERSION `67b0253b4ac2`. Built by the PC driver (`--corpus nachv`, local `run-pilot.mjs` + independent Gemini review) with the conservative ך/ת pre-filter in place. The driver stopped after apply+aram4. `npm test` and the git push were done on the Linux box from a clean worktree (`/tmp/chitas-reader-nach-b12`) so uncommitted files in `/workspace/chitas-reader` were not touched. Origin/main was 1.0.205 / `4c531b894070` (`64b30633`) when the version was chosen. `npm test` was run after the 1.0.206 bump. The ≥650 changed-sample gate was not loosened. `is_ship` requires an explicit `harmful_error_count = 0`. Ezra and Daniel were not included. Jeremiah stayed parked after batch 7 HOLD 9.2. I Samuel 1.0.205 (pin-file exemption) was already live. Chabad pronunciation, global shva, and the Yerushalmi אדרבה rebuild were not started.

## Scope

- Corpus: Metzudat David on I Chronicles, `site/data/nachv/I_Chronicles/` on the 1.0.205 tree (DATA_VERSION `4c531b894070`). Public domain. 29 chapters, nested `say` (943 outer, 329 empty arrays, 1,096 inner).
- Raw tokens: 13,613 = 1,837 already pointed + 11,776 bare. `partial` on all 29 pages (values 6–68, sum 1,096), left byte-identical. `vd` left byte-identical on all 29 pages (re-checked on the box, 0 issues).
- Companion `nach/I_Chronicles` was lookup-only. Biblical `v` and commentary `e` were not written.
- aram4: no `nachv` rows; updated 0, unchanged 0, skipped 428. Fixture `base` SHA and the 428-row population were left unchanged.
- ENGINE-COV-1B: I Chronicles has no pin (`has_pin: false`). Approved/allowlist/status/base/schema/population were not changed. No file hashes retargeted.

## Gates

- First pilot (with the ך/ת veto): 744 changed / 11,776 bare (371 forms), samples 650, controls 1,094. Pipeline tests: 7/7 pass.
- Independent review of the first packet (`gemini-4-hydrogen-high`): HOLD 8.8, harmful_error_count=2 (1 unique form: `מנעו -> מָנְעוּ` at `I_Chronicles/22:7.0#8` and `28:2.0#3`; required `מְנָעוֹ`). A first exact-only insertion failed because `forms_from_review` treated the `recommended_fix` instruction sentence as a form and broke `lib.mjs` syntax; the driver was fixed to accept only short Hebrew surface forms (and to extract `מנעו` from the sentence), tests were added, and the batch was relaunched. The first review artifacts were reused.
- Fix round 1: exact-only `מנעו`. Pilot: 742 changed / 370 forms, samples 650, controls 1,096. Tests 7/7. Review: HOLD 8.8, harmful_error_count=2 (`זכרם -> זִכְרָם` at `19:17.0#18`, required verb+suffix `זְכָרָם`; `אצלנו -> אֶצְלֵנוּ` at `13:13.1#5`, Pietrkov typo for `אצלו`).
- Fix round 2 (last allowed): exact-only `זכרם` and `אצלנו` (also preserving `מנעו`). Pilot: 740 changed / 10,943 split bare (368 forms), samples 650, controls 1,098. Yield 6.76%. dseg modern 0 / rabbinic 1,096 / miss 0. Tests 7/7.
- Independent review of fix round 2 (`gemini-4-hydrogen-high`): **SHIP 9.8**, harmful_error_count=0 (explicit). S1–S5 = 10.0/9.9/9.8/10.0/10.0. 650 changed samples audited; 368 unique accepted forms. `fix_rounds=2`. New exact-only: `מנעו`, `זכרם`, `אצלנו` (tooling only; not a site-repo `lib.mjs` change).
- Apply vs live 1.0.205: 29 pages, 29 changed, 0 identical, 740 tokens, 1,837 already-pointed kept, 29 partial pages preserved. No `nach/` writes. `vd`/`partial` identity re-checked on the box (29/29).
- `npm test`: 708/708 pass in 272.08s on the Linux box, run after bumping VERSION to 1.0.206 (so the historical bump-check regexes are exercised). DATA_VERSION `67b0253b4ac2` from `node tools/data-version.mjs`.
