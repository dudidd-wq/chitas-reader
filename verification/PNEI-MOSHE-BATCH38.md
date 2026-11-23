# Pnei Moshe batch 38 — Demai, Peah, Berakhot (ysay), approved full review

Shipped as **1.0.213**, DATA_VERSION `85f2b80e3652`. This is the second of two packets Dudi approved on 14:54 Asia/Jerusalem (widget t331s1886) for a full review of every changed token instead of the 650-sample gate. The SHIP score gate was unchanged: overall strictly above 9.5, explicit `harmful_error_count = 0`, at most two exact-only fix rounds. The 650-sample gate was not loosened for any other packet. Built by the PC driver (`--corpus ysay`, `-Tractates Demai,Peah,Berakhot`). The driver stopped after apply+aram4. `npm test` and the git push were done on the Linux box from a clean worktree (`/tmp/chitas-reader-ysay-b38`) so uncommitted files in `/workspace/chitas-reader` were not touched. Origin/main was 1.0.212 / `2f68e1a9c6b6` (`dff964b8`) when the version was chosen. `npm test` was run after the 1.0.213 bump. Terumot and Rosh Hashanah stayed parked. Ezra and Daniel were not started. Chabad pronunciation, global shva, and the Yerushalmi אדרבה rebuild were not started.

An earlier under-gate measurement of this packet was 174 changed tokens. On the 1.0.212 tree, after accumulated exact-only forms in BASE_TOOLING, the first packet yielded 142 changed / 93 forms. Every remaining change was reviewed.

## Scope

- Corpus: Pnei Moshe on Yerushalmi Demai, Peah, and Berakhot, `site/data/gemara/ysay/{Demai,Peah,Berakhot}/` on the 1.0.212 tree (DATA_VERSION `2f68e1a9c6b6`). Public domain (Pietrkov 5658–5660 / 1898–1900).
- Demai: 34 pages, raw_bare 6,892, already 59,349, `partial` on 7 pages (values 1–18, sum 62). Peah: 36 pages, raw_bare 5,151, already 54,721, `partial` on 1 page (value 7). Berakhot: 68 pages, raw_bare 4,933, already 57,988, `partial` on 2 pages (values 10–27, sum 37).
- After exact-only `החררה`, the tree ships **141** changed tokens on 8 pages (Demai 1, 2, 7, 25, 33 = 80; Peah 29 = 31; Berakhot 36, 37 = 30). `v` left byte-identical on all 138 pages. `partial` is unchanged where present and stays absent elsewhere (allowed).
- Companion `yer/` folders were lookup-only, as were Berakhot `bavli` and `bsay`. Those files were not written.
- aram4: updated 0; existing identity rows unchanged (Demai 6, Peah 5, Berakhot 6); skipped 422/423/422. Fixture population left unchanged.
- ENGINE-COV-1B: all pins for these tractates are identity pins and were not among the 8 changed pages. Driver retarget: updated=0, skipped_non_identity=0, unchanged=1 (Demai/23), 4 (Peah/5, 23, 26, 36), 3 (Berakhot/19, 46, 47). Those eight files remain at live `after_sha256`. Approved/allowlist/population and the frozen manifest were not changed. No pin-file exemption was needed.

## Gates

- First pilot: 142 changed / 93 forms. Because the packed set is the exact approved full-review packet, the driver reviewed every changed token (samples=142) with 9,577 controls instead of refusing the under-650 pack. Pipeline tests: 7/7. VALIDATE ok (bare_in 16,976, pointed_in 172,058).
- Independent review (`gemini-4-hydrogen-high`): HOLD 9.0, harmful_error_count=1, S1–S5 = 10.0/9.0/10.0/10.0/9.4, tokens_audited=142 (all changes). Harmful form: `החררה -> הַחֲרָרָה` at `Berakhot/37:4:0#5`. Pietrkov ד/ר typo for `החרדה` (trembling/awe, glossing `בְּחֶרְדַת קדש`); it must stay bare rather than be pointed as “the ash-baked cake.”
- Fix round 1: exact-only `החררה`. Pilot: 141 changed / 92 forms, samples=141 (all remaining changes), controls 9,578. Tests 7/7. VALIDATE ok.
- Independent review of fix round 1 (`gemini-4-hydrogen-high`): **SHIP 9.8**, harmful_error_count=0 (explicit). S1–S5 = 10.0/9.9/10.0/10.0/9.8. 141 changed samples audited. `fix_rounds=1`. New exact-only: `החררה` (tooling only; not a site-repo `lib.mjs` change).
- Apply vs live 1.0.212: Demai 34 pages, 5 changed, 29 identical, 80 tokens, 59,349 already-pointed kept, 7 partial pages preserved. Peah 36 pages, 1 changed, 35 identical, 31 tokens, 54,721 kept, 1 partial. Berakhot 68 pages, 2 changed, 66 identical, 30 tokens, 57,988 kept, 2 partial. Total 141. No `yer/` / `bavli` / `bsay` writes. `v`/`partial` identity re-checked on the box (138/138). 1B pin files and the frozen manifest were left untouched. `tests/engine-cov-1b.test.mjs` is included in the release suite.
- `npm test`: 708/708 pass in 293.45s on the Linux box, run after bumping VERSION to 1.0.213 (so the historical bump-check regexes are exercised). DATA_VERSION `85f2b80e3652` from `node tools/data-version.mjs`. `tests/engine-cov-1b.test.mjs` is included in that suite.

## Release

- Clean worktree `/tmp/chitas-reader-ysay-b38`, branch `release-ysay-b38` from `origin/main` at `dff964b8`. Symlinked `node_modules` from `/workspace/chitas-reader/node_modules`.
- Next free version rechecked against `origin/main` immediately before the bump: 1.0.213.
- Exact-only form to persist in BASE_TOOLING (`engine-cov-pnei-moshe-ysay-b18-fix`): `החררה`.
