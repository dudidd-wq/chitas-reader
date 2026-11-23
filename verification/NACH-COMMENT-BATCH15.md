# Nach commentary batch 15 — Song of Songs + Ezekiel (nachv)

Shipped as **1.0.209**, DATA_VERSION `ffd1f000cedb`. Built by the PC driver (`--corpus nachv`, local `run-pilot.mjs` + independent Gemini review) with the conservative ך/ת pre-filter and `PIN_NACHV = {Joshua, Judges}` in place. The driver stopped after apply+aram4. `npm test` and the git push were done on the Linux box from a clean worktree (`/tmp/chitas-reader-nach-b15`) so uncommitted files in `/workspace/chitas-reader` were not touched. Origin/main was 1.0.208 / `b42309a7eb44` (`c846726b`) when the version was chosen. `npm test` was run after the 1.0.209 bump. The ≥650 changed-sample gate was not loosened. `is_ship` requires an explicit `harmful_error_count = 0`. Ezra and Daniel were not included. Joshua and Judges were excluded from auto-pack by `PIN_NACHV`. Jeremiah stayed parked. Chabad pronunciation, global shva, and the Yerushalmi אדרבה rebuild were not started.

## Scope

- Corpus: Metzudat David / Rashi on Song of Songs and Ezekiel, `site/data/nachv/Song_of_Songs/` and `site/data/nachv/Ezekiel/` on the 1.0.208 tree (DATA_VERSION `b42309a7eb44`).
- Song of Songs: 8 chapters, raw_bare 9,374, already 415, `partial` on all 8 pages (values 15–32, sum 192). Ezekiel: 48 chapters, raw_bare 9,545, already 37,330, `partial` on 15 pages (values 1–72, sum 521).
- Song of Songs alone yielded 614 changed (below the 650 gate and the 700 comfort floor), so Ezekiel was packed. Combined first packet: 942 changed / 512 forms. `vd` and `partial` left byte-identical on all 56 pages (re-checked on the box, 0 issues; 17 pages with `say` changes, 39 Ezekiel pages fully identical).
- Companion `nach/Song_of_Songs` and `nach/Ezekiel` were lookup-only. Biblical `v` and commentary `e` were not written.
- aram4: no `nachv` rows; updated 0, unchanged 0, skipped 428 for each book. Fixture `base` SHA and the 428-row population were left unchanged.
- ENGINE-COV-1B: neither book has a pin (`has_pin: false`). Approved/allowlist/status/base/schema/population were not changed. No file hashes retargeted.

## Gates

- First pilot, Song of Songs alone: 614 changed, below comfort 700, so Ezekiel was added (not Joshua/Judges). Combined: 942 changed / 512 forms, samples 650, controls 2,839. Pipeline tests: 7/7 pass. VALIDATE ok (bare_in 18,919, pointed_in 37,745).
- Independent review of the first packet (`gemini-4-hydrogen-high`): HOLD 9.0, harmful_error_count=2 (`לומד -> לוֹמֵד` at `Song_of_Songs/8/7.0#56`, print typo for `לומר` in the formula `והנמשל הוא לומר`, pointed as participle; and `צורה -> צוּרָה` at `Song_of_Songs/4/3.2#42`, required `צַוָּארָהּ` or 3fs mappiq `צוּרָהּ`, not indefinite `צוּרָה`).
- Fix round 1: exact-only `לומד` and `צורה`. Pilot: 939 changed / 510 forms, samples 650, controls 2,843. Tests 7/7. VALIDATE ok.
- Independent review of fix round 1 (`gemini-4-hydrogen-high`): **SHIP 10.0**, harmful_error_count=0 (explicit). S1–S5 = 10.0/10.0/10.0/10.0/10.0. 650 changed samples audited; 510 unique accepted forms. `fix_rounds=1`. New exact-only: `לומד`, `צורה` (tooling only; not a site-repo `lib.mjs` change).
- Apply vs live 1.0.208: Song of Songs 8 pages, 8 changed, 0 identical, 612 tokens, 415 already-pointed kept, 8 partial pages preserved. Ezekiel 48 pages, 9 changed, 39 identical, 327 tokens, 37,330 already-pointed kept, 15 partial pages preserved. Total 939 tokens. No `nach/` writes. `vd`/`partial` identity re-checked on the box (56/56).
- `npm test`: 708/708 pass in 269.43s on the Linux box, run after bumping VERSION to 1.0.209 (so the historical bump-check regexes are exercised). DATA_VERSION `ffd1f000cedb` from `node tools/data-version.mjs`.
