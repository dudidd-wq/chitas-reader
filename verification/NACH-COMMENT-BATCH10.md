# Nach commentary batch 10 — I Samuel (nachv), 1B pin-file exemption

Shipped as **1.0.205**, DATA_VERSION `4c531b894070`. This is the batch 10 packet after a mechanical exemption for ENGINE-COV-1B: the three non-identity pinned files were left byte-identical to live so their `after_sha256` hashes stay valid. Approved/allowlist/status/base/schema/population and `tools/engine-cov-1b.mjs` / the frozen manifest were not changed.

The original PC review of the full 31-page packet was **SHIP 9.9**, harmful_error_count=0 (explicit), 0 exact-only rounds, 847 changed tokens. Releasing all 31 pages failed `tests/engine-cov-1b.test.mjs` (stale `I_Samuel/15.json`). Leaving `site/data/nachv/I_Samuel/{6,15,20}.json` at the live 1.0.204 / 1B-after state drops 110 tokens and ships the remaining **737** (28 pages), still above the 650 gate. `vd`/`partial` identity holds on all 31 pages. `tests/engine-cov-1b.test.mjs` passed 10/10 on this reduced tree before the release suite.

Built by the PC driver (`--corpus nachv`) with the conservative ך/ת pre-filter. `npm test` and the git push were done on the Linux box from a clean worktree (`/tmp/chitas-reader-nach-b10-exempt`) so uncommitted files in `/workspace/chitas-reader` were not touched. Origin/main was 1.0.204 / `f8870c9afe2a` (`05dcda20`) when the version was chosen. `npm test` was run after the 1.0.205 bump. Ezra and Daniel were not included. Jeremiah stayed parked. Chabad pronunciation, global shva, and the Yerushalmi אדרבה rebuild were not started.

## Scope

- Corpus: Metzudat David on I Samuel, `site/data/nachv/I_Samuel/` on the 1.0.204 tree. Public domain. 31 chapters; 28 changed, 3 pinned pages left untouched (`6.json`, `15.json`, `20.json`).
- Raw tokens on the original inspect: 17,167 = 2,192 already pointed + 14,975 bare. `partial` on all 31 pages (values 13–92, sum 1,205), left byte-identical, including the three pinned pages. `vd` left byte-identical on all 31 pages.
- Companion `nach/I_Samuel` was lookup-only.
- aram4: no `nachv` rows; updated 0, unchanged 0, skipped 428.
- ENGINE-COV-1B: I Samuel has non-identity pins on pages 6, 15 and 20 (47 approved occurrences). Those three files remain at live `after_sha256`. No retarget, no population change.

## Gates

- Full-packet first pilot: 847 changed / 14,975 bare (475 forms), samples 650, controls 975. Pipeline tests 7/7. Independent review (`gemini-4-hydrogen-high`): **SHIP 9.9**, harmful_error_count=0 (explicit). S1–S5 = 10.0/9.9/10.0/10.0/10.0. `fix_rounds=0`.
- Exemption: 110 of those 847 tokens were on the three pinned pages and are not shipped. Remaining 737 changed tokens on 28 pages, still ≥650. Live pinned file hashes already equal the 1B `after_sha256` values.
- Apply vs live (exempt tree): 28 pages changed, 3 identical (pinned), 737 tokens. No `nach/` writes. `vd`/`partial` identity re-checked (0 issues). 1B files untouched.
- `npm test`: 708/708 pass in 273.58s on the Linux box, run after bumping VERSION to 1.0.205 (so the historical bump-check regexes are exercised). DATA_VERSION `4c531b894070` from `node tools/data-version.mjs`. 1B tests included in that suite.
