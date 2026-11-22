# Pnei Moshe batch 26 — Horayot (ysay)

Shipped as **1.0.186**, DATA_VERSION `26eb189ab8b6`. Built by the PC driver (local `run-pilot.mjs` + independent Gemini review). The driver stopped after apply+aram4. `npm test` and the git push were done on the Linux box. Origin/main was 1.0.185 when the version was chosen; a concurrent personal-Tehillim release may still take a version, in which case this bump will be adjusted before push.

## Scope

- Corpus: Pnei Moshe `site/data/gemara/ysay/Horayot/` on the 1.0.185 tree (DATA_VERSION `057b02878e34`). Terumot b24 remains HOLD and was not revisited.
- 19 pages, nested `say` (140 outer, 6 empty inner arrays; 861 inner).
- Raw tokens: 34,423 = 2,985 already pointed + 31,438 bare. Of the bare baseline, 28,883 were counted after quote/abbreviation split (`bareTokens`). `partial` on all 19 pages (values 24–82, sum 860), left byte-identical. `v` left byte-identical on all 19 pages.
- Companion `yer/Horayot` (19/19, hashes 38/38) was lookup-only. `bavli/Horayot` and `bsay/Horayot` exist and were not written.
- aram4: updated 0, unchanged 0, skipped 428. No `aram4-identity.json` change.
- ENGINE-COV-1B: no pin on this tractate.

## Gates

- Independent validation: 1,936 changed / 31,438 bare (542 forms), samples 650+2,021. dseg: modern 0, rabbinic 860, miss 1. Yield 6.7%.
- Fix rounds: 0.
- Independent first review (`gemini-4-hydrogen-high`): **SHIP 9.8**, harmful_error_count=0. S1–S5 = 10.0/9.8/9.8/10.0/9.8. 650 tokens audited; 542 unique forms scanned.
- Apply: 19/19 pages, 1,936 tokens vs live 1.0.185, 2,985 already-pointed kept, 19 partial pages preserved. No `yer`/`bavli`/`bsay` writes.
- `npm test`: 684/684 in 348.47s on the Linux box after recomputing DATA_VERSION with `node tools/data-version.mjs`. Passed on the first run (no pitch-192 flake).
