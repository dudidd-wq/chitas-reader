# Nach commentary batch 8 — Psalms retry (nachv)

Shipped as **1.0.202**, DATA_VERSION `5aed3dcbc9af`. This is a fresh retry of Psalms after the conservative ך/ת pre-filter was added (batch 2 had HOLD). Built by the PC driver (`--corpus nachv`, local `run-pilot.mjs` + independent Gemini review). The driver stopped after apply+aram4. `npm test` and the git push were done on the Linux box from a clean worktree (`/tmp/chitas-reader-nach-b8`) so uncommitted files in `/workspace/chitas-reader` were not touched. Origin/main was 1.0.201 / `bc38becf4f3d` (`89ce20fb`) when the version was chosen — 1.0.201 is the shell fix that lets VERSION 1.0.200+ pass historical bump checks; Job commentary data is already in that DATA_VERSION. `npm test` was run after the 1.0.202 bump. The ≥650 changed-sample gate was not loosened. `is_ship` requires an explicit `harmful_error_count = 0`. Ezra and Daniel were not included. Jeremiah was re-parked after batch 7 HOLD 9.2 / 1 harmful (`תרפא`). Chabad pronunciation, global shva, and the Yerushalmi אדרבה rebuild were not started.

## Scope

- Corpus: Metzudat David on Psalms, `site/data/nachv/Psalms/` on the 1.0.201 tree (DATA_VERSION `bc38becf4f3d`). Public domain. 150 chapters, nested `say` (2,527 outer, 192 empty arrays, 3,570 inner).
- Raw tokens: 46,177 = 5,113 already pointed + 41,064 bare. Of the bare baseline, 38,886 were counted after quote/abbreviation split (`bareTokens`). `partial` on all 150 pages (values 2–218, sum 3,570), left byte-identical. `vd` left byte-identical on all 150 pages.
- Companion `nach/Psalms` was lookup-only. Biblical `v` and commentary `e` were not written.
- aram4: no `nachv` rows; updated 0, unchanged 0, skipped 428. Fixture `base` SHA and the 428-row population were left unchanged.
- ENGINE-COV-1B: Psalms has no pin (`has_pin: false`). Approved/allowlist/status/base/schema/population were not changed. No file hashes retargeted.
- ך/ת veto held: first-pilot unique quarantines `quarantine_tav_person_construct=165`, `quarantine_person_gender_kaf=46`. Final review: 0 trailing ך/ת leaks. Changed tokens fell from 3,312 in batch 2 to 2,894 on this first pilot (2,881 after one exact-only round), still well above 650.

## Gates

- First pilot (with the ך/ת veto): 2,894 changed / 38,886 bare (1,253 forms), samples 650, controls 1,863. dseg modern 0 / rabbinic 3,570 / miss 0. Pipeline tests: 7/7 pass. Independent first review (`gemini-4-hydrogen-high`): **HOLD 7.2**, harmful_error_count=10 (explicit). S1–S5 = 10.0/10.0/7.2/9.9/10.0. Exact-only forms in fix round 1 of 2: `הכחיש`, `התרפה`, `הודיע`, `נתתי`, `המסורה`, `השגיח`, `הוציאנו`, `נקוה`, `ערוב`, `דמהו` (none end in ך/ת; Hifil past/imperative forms were not turned into a broad pre-filter).
- After fix 1: 2,881 changed / 38,886 bare (1,243 forms), samples 650, controls 1,877. Yield 7.41%. dseg unchanged at 0 miss.
- Independent final review (`gemini-4-hydrogen-high`): **SHIP 9.9**, harmful_error_count=0 (explicit). S1–S5 = 10.0/9.9/9.9/10.0/10.0. 650 changed samples + 360 unchanged controls audited (1,010 tokens); 1,243 unique accepted forms scanned (2,881 occurrences). 0 ך/ת leaks, 0 exact-only leaks, 0 harmful.
- Apply vs live 1.0.201: 150 pages, 148 changed, 2 identical (`117.json`, `131.json`), 2,881 tokens, 5,113 already-pointed kept, 150 partial pages preserved. No `nach/` writes. `vd`/`partial` identity re-checked on the box (0 issues).
- `npm test`: 708/708 pass in 267.05s on the Linux box, run after bumping VERSION to 1.0.202 (so the historical bump-check regexes are exercised). DATA_VERSION `5aed3dcbc9af` from `node tools/data-version.mjs`.
