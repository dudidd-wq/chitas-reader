# Nach commentary batch 6 — Job retry (nachv)

Shipped as **1.0.200**, DATA_VERSION `bc38becf4f3d`. This is a fresh retry of Job after the conservative ך/ת pre-filter was added (batch 4 had HOLD 8.8 / 3 harmful). Built by the PC driver (`--corpus nachv`, local `run-pilot.mjs` + independent Gemini review). The driver stopped after apply+aram4. `npm test` and the git push were done on the Linux box from a clean worktree (`/tmp/chitas-reader-nach-b6`) so uncommitted files in `/workspace/chitas-reader` were not touched. Origin/main was 1.0.199 / `05524c82591f` (`836d7136`) when the version was chosen. The ≥650 changed-sample gate was not loosened. `is_ship` now requires an explicit `harmful_error_count = 0` (null/missing is fail-closed). Ezra and Daniel were not included. Psalms and Jeremiah remained parked during this batch. Chabad pronunciation, global shva, and the Yerushalmi אדרבה rebuild were not started.

## Scope

- Corpus: Metzudat David on Job, `site/data/nachv/Job/` on the 1.0.199 tree (DATA_VERSION `05524c82591f`). Public domain. 42 chapters, nested `say` (1,070 outer, 20 empty arrays, 1,452 inner).
- Raw tokens: 35,275 = 2,207 already pointed + 33,068 bare. Of the bare baseline, 31,952 were counted after quote/abbreviation split (`bareTokens`). `partial` on all 42 pages (values 9–53, sum 1,452), left byte-identical. `vd` left byte-identical on all 42 pages.
- Companion `nach/Job` was lookup-only. Biblical `v` and commentary `e` were not written.
- aram4: no `nachv` rows; updated 0, unchanged 0, skipped 428. Fixture `base` SHA and the 428-row population were left unchanged.
- ENGINE-COV-1B: Job has no pin (`has_pin: false`). Approved/allowlist/status/base/schema/population were not changed. No file hashes retargeted.
- ך/ת veto held: first-pilot unique quarantines `quarantine_tav_person_construct=139`, `quarantine_person_gender_kaf=20`. Review confirmed 0 trailing ך/ת leaks. Changed tokens fell from 2,554 in batch 4 to 2,249 on this first pilot (2,236 after two exact-only rounds), still well above 650.

## Gates

- First pilot (with the ך/ת veto): 2,249 changed / 31,952 bare (947 forms), samples 650, controls 1,139. dseg modern 0 / rabbinic 1,452 / miss 0. Pipeline tests: 7/7 pass. Independent first review (`gemini-4-hydrogen-high`): **HOLD 7.6**, harmful_error_count=7 (explicit). S1–S5 = 10.0/9.8/7.6/10.0/9.9. Exact-only forms in fix round 1 of 2: `והסתירה`, `יגיעו`, `מתיקה`, `שמרני`, `מעביר`, `ירוע`, `השמחה` (none end in ך/ת).
- After fix 1: 2,242 changed / 31,952 bare (940 forms), samples 650, controls 1,146. Fix review: **HOLD 8.2**, harmful_error_count=5 (explicit). S1–S5 = 10.0/9.7/8.2/9.9/10.0. Exact-only forms in fix round 2 of 2: `ותמים`, `לומד`, `פועלי`, `מאון`, `הגופים`.
- After fix 2: 2,236 changed / 31,952 bare (935 forms), samples 650, controls 1,152. Yield 7.00%. dseg unchanged at 0 miss.
- Independent final review (`gemini-4-hydrogen-high`): **SHIP 9.8**, harmful_error_count=0 (explicit). S1–S5 = 10.0/9.8/9.9/9.9/10.0. 650 changed samples audited; 935 unique accepted forms scanned (2,236 occurrences); 1,152 unchanged controls; 21 no_dseg_match tokens audited. 0 harmful in all of those.
- Apply vs live 1.0.199: 42/42 pages, 2,236 tokens, 2,207 already-pointed kept, 42 partial pages preserved. No `nach/` writes. `vd`/`partial` identity re-checked on the box (0 issues).
- `npm test`: first two runs hit the known `pitch-192` flake (707/708, duration then F0; unrelated to Job data). Third run: 708/708 pass in 276.36s on the Linux box. DATA_VERSION `bc38becf4f3d` from `node tools/data-version.mjs`.
