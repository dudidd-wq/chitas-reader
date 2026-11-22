# Pnei Moshe batch 20 — Shekalim (ysay)

Shipped as **1.0.181**, DATA_VERSION `78bcb8b446c1`. Built by the PC driver (local `run-pilot.mjs` + independent Gemini review). `npm test` and the git push were done on the Linux box: the Windows test suite times out / fails because `new URL(...).pathname` becomes `C:\C:\...`, and `tools/data-version.mjs` must run on Linux so DATA_VERSION matches `sw-data` (Windows had written `88b1cda0c07b`).

## Scope

- Corpus: Pnei Moshe `site/data/gemara/ysay/Shekalim/` on the 1.0.180 tree (DATA_VERSION `570d6716e316`). This is Yerushalmi Shekalim, not `Shekalim_Bavli`.
- 33 pages, nested `say` (256 outer, 36 empty inner arrays at positions `10:1`–`32:3`; 1,103 inner).
- Raw tokens: 44,911 = 3,440 already pointed + 3,070 abbr_or_quote + 38,401 bare considered (raw bare baseline 41,471 = 38,401 + 3,070). `partial` on all 33 pages (values 10–57, sum 1,101), left byte-identical.
- Companion `yer/Shekalim` (33/33, hashes 66/66) was lookup-only. Did not write `bavli/Shekalim` or `bsay/Shekalim`.
- aram4: updated 0, unchanged 0, skipped 428. `tests/fixtures/aram4-identity.json` was not modified.

## Gates

- Independent validation (first pack): 2,690 changed / 38,401 bare considered (929 forms, yield 7.01%), samples 650+2,420. dseg: modern 0, rabbinic 1,103, miss 0. denylist hits 2,129; quarantine 33,582. denylist SHA unchanged.
- Fix rounds: 0. New exact-only: none.
- Independent first review (`gemini-4-hydrogen-high`): **SHIP 9.8**, harmful_error_count=0. S1–S5 = 10.0/9.9/9.8/10.0/9.8. 650 tokens audited; all 929 unique forms scanned.
- Apply: 33/33 pages, 2,690 tokens vs live 1.0.180, 3,440 already-pointed kept, 33 partial pages preserved. No `yer`/`bavli`/`bsay` writes.
- `npm test`: 684/684 on the Linux box (260.24s) after recomputing DATA_VERSION with `node tools/data-version.mjs`.
