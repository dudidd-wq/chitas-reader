# Nach commentary batch 5 — Proverbs (nachv)

Shipped as **1.0.199**, DATA_VERSION `05524c82591f`. Built by the PC driver (`--corpus nachv`, local `run-pilot.mjs` + independent Gemini review) after a conservative pre-filter for recurring ך/ת person/construct collisions. The driver stopped after apply+aram4. `npm test` and the git push were done on the Linux box from a clean worktree (`/tmp/chitas-reader-nach-b5`) so uncommitted files in `/workspace/chitas-reader` were not touched. Origin/main was 1.0.198 / `ab555cfad32f` (`f57939df`) when the version was chosen. The ≥650 changed-sample gate was not loosened. Ezra and Daniel were not included (Aramaic caution). Chabad pronunciation, global shva, and the Yerushalmi אדרבה rebuild were not started. Psalms, Jeremiah and Job remain parked HOLD.

## Pre-filter (before this batch)

Recurring harmful errors in the Isaiah/Psalms/Jeremiah/Job reviews were dominated by two mechanical classes: final ך (2ms vs 2fs suffix, e.g. `בשלומך`) and final ת (2ms/2fs past vs construct, e.g. `חזקת`, `עזבת`). A cheap letter-ending veto was added to `templates/run-pilot.mjs` (`quarantine_person_gender_kaf` / `quarantine_tav_person_construct`) for already length≥4 bare forms. It does not change the denylist, `HEBREW_PREFIXES`, or the inherited `refCount >= 10` stem-homograph bypass. A pipeline test asserts no accepted form ends in ך or ת. Driver SHA after the change: `run_batch.py` `886618e52585e610f77e9416f6dfc5ac4cc5cdeefe3be762b72523b88dbf50a4`, template `1555350cae8c7306ac00684a28e53c7df6d71baa288013672573ffe819f21add`.

## Scope

- Corpus: Metzudat David on Proverbs, `site/data/nachv/Proverbs/` on the 1.0.198 tree (DATA_VERSION `ab555cfad32f`). Public domain. 31 chapters, nested `say` (915 outer, 9 empty arrays at 2:21, 4:13, 4:19, 4:20, 5:12, 6:8, 6:20, 7:0, 7:2; 1,319 inner).
- Raw tokens: 23,320 = 1,831 already pointed + 21,489 bare. Of the bare baseline, 20,701 were counted after quote/abbreviation split (`bareTokens`). `partial` on all 31 pages (values 28–72, sum 1,319), left byte-identical. `vd` left byte-identical on all 31 pages.
- Companion `nach/Proverbs` was lookup-only. Biblical `v` and commentary `e` were not written.
- aram4: no `nachv` rows; updated 0, unchanged 0, skipped 428. Fixture `base` SHA and the 428-row population were left unchanged.
- ENGINE-COV-1B: Proverbs has no pin (`has_pin: false`). Approved/allowlist/status/base/schema/population were not changed. No file hashes retargeted.

## Gates

- First pilot (with the new ך/ת veto): 1,614 changed / 20,701 bare (777 forms), samples 650, controls 829. Yield 7.8%. dseg modern 0 / rabbinic 1,319 / miss 0. Pipeline tests: 7/7 pass. New quarantine unique forms: `quarantine_tav_person_construct` 112, `quarantine_person_gender_kaf` 19. Independent first review (`gemini-4-hydrogen-high`): **HOLD 7.8**, harmful_error_count=6. S1–S5 = 10.0/9.8/7.8/10.0/9.9. Exact-only forms in fix round 1 of 2: `מוליכה`, `יאהב`, `כבוי`, `מצילתו`, `הוקר`, `תלכד` (none end in ך/ת; the pre-filter was not widened).
- After fix 1: 1,605 changed / 20,701 bare (771 forms), samples 650, controls 840. Yield 7.75%. dseg unchanged at 0 miss.
- Independent final review (`gemini-4-hydrogen-high`): **SHIP 9.9**, harmful_error_count=0. S1–S5 = 10.0/10.0/9.9/9.9/10.0. 650 changed samples audited; 771 unique accepted forms scanned (1,605 occurrences); 840 unchanged controls.
- Apply vs live 1.0.198: 31/31 pages, 1,605 tokens, 1,831 already-pointed kept, 31 partial pages preserved. No `nach/` writes. `vd`/`partial` identity re-checked on the box (0 issues).
- `npm test`: 708/708 pass in 279.75s on the Linux box. DATA_VERSION `05524c82591f` from `node tools/data-version.mjs`.
