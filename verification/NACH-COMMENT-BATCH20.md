# Nach commentary batch 20 — Joshua + Judges (nachv), 1B pin-file exemption

Shipped as **1.0.211**, DATA_VERSION `1c0af546c895`. Built by the PC driver (`--corpus nachv`, `-Tractates Joshua,Judges`, local `run-pilot.mjs` + independent Gemini review) with the conservative ך/ת pre-filter, `PIN_NACHV = {Joshua, Judges}`, and `CAUTION_NACHV = {Ezra, Daniel}` in place. The driver stopped after apply+aram4. `npm test` and the git push were done on the Linux box from a clean worktree (`/tmp/chitas-reader-nach-b20`) so uncommitted files in `/workspace/chitas-reader` were not touched. Origin/main was 1.0.210 / `dddba71396db` (`434e15bd`) when the version was chosen. `npm test` was run after the 1.0.211 bump. The ≥650 changed-sample gate was not loosened. `is_ship` requires an explicit `harmful_error_count = 0`. Ezra and Daniel were not included. The six small remaining books were not packed into this batch. Jeremiah, Zechariah, Nehemiah, and the five batch-18 books stayed parked. Chabad pronunciation, global shva, and the Yerushalmi אדרבה rebuild were not started.

This is the Joshua+Judges packet after a mechanical exemption for ENGINE-COV-1B: the six non-identity pinned files were left byte-identical to live so their `after_sha256` hashes stay valid. Approved/allowlist/status/base/schema/population and `tools/engine-cov-1b.mjs` / the frozen manifest were not changed.

## Scope

- Corpus: Metzudat David on Joshua and Judges, `site/data/nachv/{Joshua,Judges}/` on the 1.0.210 tree (DATA_VERSION `dddba71396db`). Public domain.
- Joshua: 24 chapters, raw_bare 8,130, already 1,237, `partial` on all 24 pages (values 7–56, sum 705). Judges: 21 chapters, raw_bare 11,122, already 1,722, `partial` on all 21 pages (values 15–77, sum 937).
- Pre-apply unpinned yield on live 1.0.210: Joshua 528 total / 432 unpinned / 96 pinned (15=48, 16=18, 17=30); Judges 688 total / 582 unpinned / 106 pinned (8=23, 14=35, 20=48); combined 1,216 / 1,014 / 202. Each book alone is under 650 after the exemption, so both were started together (`-Tractates Joshua,Judges`) and not auto-packed with Jonah or Ezra/Daniel.
- After exact-only fix round 1, the exempt tree ships **1,011** unpinned changed tokens (Joshua 431 + Judges 580) on 39 pages, still above the 650 gate. The six pinned pages stay untouched. `vd` and `partial` left byte-identical on all 45 pages (re-checked on the box, 0 issues).
- Companion `nach/{Joshua,Judges}` were lookup-only. Biblical `v` and commentary `e` were not written. The companion `nach/` pins for the same chapters are identity pins and were not written.
- aram4: no `nachv` rows; updated 0, unchanged 0, skipped 428 for each book. Fixture `base` SHA and the 428-row population were left unchanged.
- ENGINE-COV-1B: non-identity pins on Joshua 15/16/17 and Judges 8/14/20. Those six files remain at live `after_sha256`:
  - `site/data/nachv/Joshua/15.json` `95582fdf8596ebb7214820d20be0638b6955e08d6d2ab134a60abb5d0125c931`
  - `site/data/nachv/Joshua/16.json` `fe2b0868b1041d97ae510217bc621fa46f51e263550f021280286e4c0fcc013a`
  - `site/data/nachv/Joshua/17.json` `cd59ee4c27eebb4b44503e2938d6af5977c2b68dfcd47e633c7f311da63703b5`
  - `site/data/nachv/Judges/8.json` `effc4b50f2a8353b1ba1382a328dc32d1783b04bba20dedd0729adb4aa23c81b`
  - `site/data/nachv/Judges/14.json` `f1e1524aac05260c6ba68d27c070c63e76b58611f3a25394d5223145c723ff3b`
  - `site/data/nachv/Judges/20.json` `18d1841a58383ccbb669aedc5bfcac5f3a11146fc96680ac87d61a421c2b6f61`
  Driver apply recorded `skipped_non_identity=3` per book (no identity retarget). Approved/allowlist/population were not changed.

## Gates

- First pilot, Joshua+Judges together (pin-file tokens still in the review packet): 1,216 changed / 546 forms, samples 650, controls 1,393. Pipeline tests: 7/7 pass. VALIDATE ok (bare_in 19,252, pointed_in 2,959).
- Independent review of the first packet (`gemini-4-hydrogen-high`): HOLD 8.6, harmful_error_count=3 (`הנחילו -> הַנְחִילוֹ` at `Joshua/19`, required `הִנְחִילוּ`; `להערים -> לְהַעֲרִים` at `Judges/5`, required `לְהֶעָרִים`; `תשמענה -> תִּשְׁמַעְנָה` at `Judges/3`, required `תִּשְׁמָעֶנָּה`). None of those sites are on pin files.
- Fix round 1: exact-only `הנחילו`, `להערים`, `תשמענה`. Pilot: 1,213 changed / 543 forms, samples 650, controls 1,396. Tests 7/7. VALIDATE ok.
- Independent review of fix round 1 (`gemini-4-hydrogen-high`): **SHIP 9.9**, harmful_error_count=0 (explicit). S1–S5 = 10.0/10.0/10.0/10.0/9.9. 650 changed samples audited. `fix_rounds=1`. New exact-only: `הנחילו`, `להערים`, `תשמענה` (tooling only; not a site-repo `lib.mjs` change).
- Apply vs live 1.0.210 on the PC (including pin files): Joshua 24 pages, 24 changed, 0 identical, 527 tokens, 1,237 already-pointed kept, 24 partial pages preserved. Judges 21 pages, 21 changed, 0 identical, 686 tokens, 1,722 already-pointed kept, 21 partial pages preserved. Total 1,213 tokens.
- Exemption on the box: the six pinned files were not copied into the worktree and remain byte-identical to live. Remaining **1,011** changed tokens on 39 pages (Joshua 431, Judges 580), still ≥650. Pinned-file changed count vs live: 0. `vd`/`partial` identity re-checked on the box (45/45). No `nach/` writes. 1B files and the frozen manifest were left untouched. `tests/engine-cov-1b.test.mjs` is included in the release suite.
- `npm test`: 708/708 pass in 291.55s on the Linux box, run after bumping VERSION to 1.0.211 (so the historical bump-check regexes are exercised). DATA_VERSION `1c0af546c895` from `node tools/data-version.mjs`. `tests/engine-cov-1b.test.mjs` also passed 10/10 on the exempt tree before the full suite.

## Release

- Clean worktree `/tmp/chitas-reader-nach-b20`, branch `release-nach-b20` from `origin/main` at `434e15bd`. Symlinked `node_modules` from `/workspace/chitas-reader/node_modules`.
- Next free version rechecked against `origin/main` immediately before the bump: 1.0.211.
- Exact-only forms to persist in BASE_TOOLING (`engine-cov-pnei-moshe-ysay-b18-fix`): `הנחילו`, `להערים`, `תשמענה`.
