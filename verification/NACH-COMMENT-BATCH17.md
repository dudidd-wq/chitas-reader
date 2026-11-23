# Nach commentary batch 17 — Hosea + Amos + Micah (nachv)

Shipped as **1.0.210**, DATA_VERSION `dddba71396db`. Built by the PC driver (`--corpus nachv`, local `run-pilot.mjs` + independent Gemini review) with the conservative ך/ת pre-filter, `PIN_NACHV = {Joshua, Judges}`, and `CAUTION_NACHV = {Ezra, Daniel}` in place. The driver stopped after apply+aram4. `npm test` and the git push were done on the Linux box from a clean worktree (`/tmp/chitas-reader-nach-b17`) so uncommitted files in `/workspace/chitas-reader` were not touched. Origin/main was 1.0.209 / `ffd1f000cedb` (`3b696601`) when the version was chosen. `npm test` was run after the 1.0.210 bump. The ≥650 changed-sample gate was not loosened. `is_ship` requires an explicit `harmful_error_count = 0`. Ezra and Daniel were not included. Joshua and Judges were excluded from auto-pack by `PIN_NACHV`. Jeremiah, Zechariah, and Nehemiah stayed parked. Chabad pronunciation, global shva, and the Yerushalmi אדרבה rebuild were not started.

## Scope

- Corpus: Metzudat David / Rashi on Hosea, Amos, and Micah, `site/data/nachv/{Hosea,Amos,Micah}/` on the 1.0.209 tree (DATA_VERSION `ffd1f000cedb`).
- Hosea: 14 chapters, raw_bare 5,147, already 2,971, `partial` on 11 pages (values 2–44, sum 304). Amos: 9 chapters, raw_bare 5,103, already 521, `partial` on all 9 pages (values 23–51, sum 314). Micah: 7 chapters, raw_bare 4,341, already 500, `partial` on all 7 pages (values 31–53, sum 274).
- Hosea alone yielded 319 changed (below the 650 gate and the 700 comfort floor), so Amos was packed (698, still below comfort), then Micah. Combined first packet: 1,001 changed / 562 forms. `vd` and `partial` left byte-identical on all 30 pages (re-checked on the box, 0 issues; 25 pages with `say` changes, 5 Hosea pages fully identical). `partial` is absent on 3 Hosea pages, which is allowed.
- Companion `nach/{Hosea,Amos,Micah}` were lookup-only. Biblical `v` and commentary `e` were not written.
- aram4: no `nachv` rows; updated 0, unchanged 0, skipped 428 for each book. Fixture `base` SHA and the 428-row population were left unchanged.
- ENGINE-COV-1B: none of the three books has a pin (`has_pin: false`). Approved/allowlist/status/base/schema/population were not changed. No file hashes retargeted.

## Gates

- First pilot, Hosea alone: 319 changed. Added Amos (698, still below comfort 700), then Micah. Combined: 1,001 changed / 562 forms, samples 650, controls 925. Pipeline tests: 7/7 pass. VALIDATE ok (bare_in 14,591, pointed_in 3,992).
- Independent review of the first packet (`gemini-4-hydrogen-high`): HOLD 9.0, harmful_error_count=3 (`יורידו -> יוֹרִידוּ` at `Micah/5:5.1#30`, required `יוֹרִידוֹ`; `ויוכל -> וְיוּכַל` at `Hosea/12:4.0#9`, required vav-consecutive past `וַיֻּכָל`/`וַיּוּכַל`; `נביאי -> נְבִיאֵי` at `Hosea/12:13.0#4`, required `נְבִיאִי`).
- Fix round 1: exact-only `יורידו`, `ויוכל`, `נביאי`. Pilot: 995 changed / 559 forms, samples 650, controls 932. Tests 7/7. Review: HOLD 8.8, harmful_error_count=2 (`באדון -> בָּאָדוֹן` at `Micah/2:3.3#8`, required `בְּאָדוֹן`; `לחרפה -> לְחֶרְפָּה` at `Micah/7:5.0#17`, required `לְחָרְפָהּ`).
- Fix round 2 (last allowed): exact-only `באדון` and `לחרפה` (also preserving the first-round forms). Pilot: 993 changed / 557 forms, samples 650, controls 934. Tests 7/7. VALIDATE ok.
- Independent review of fix round 2 (`gemini-4-hydrogen-high`): **SHIP 9.9**, harmful_error_count=0 (explicit). S1–S5 = 10.0/9.9/9.9/10.0/10.0. 650 changed samples audited; 557 unique accepted forms. `fix_rounds=2`. New exact-only: `יורידו`, `ויוכל`, `נביאי`, `באדון`, `לחרפה` (tooling only; not a site-repo `lib.mjs` change).
- Apply vs live 1.0.209: Hosea 14 pages, 9 changed, 5 identical, 316 tokens, 2,971 already-pointed kept, 11 partial pages preserved. Amos 9 pages, 9 changed, 0 identical, 379 tokens, 521 already-pointed kept, 9 partial pages preserved. Micah 7 pages, 7 changed, 0 identical, 298 tokens, 500 already-pointed kept, 7 partial pages preserved. Total 993 tokens. No `nach/` writes. `vd`/`partial` identity re-checked on the box (30/30).
- `npm test`: 708/708 pass in 278.01s on the Linux box, run after bumping VERSION to 1.0.210 (so the historical bump-check regexes are exercised). DATA_VERSION `dddba71396db` from `node tools/data-version.mjs`.
