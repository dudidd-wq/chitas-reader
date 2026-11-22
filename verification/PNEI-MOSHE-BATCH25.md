# Pnei Moshe batch 25 — Orlah (ysay)

Shipped as **1.0.185**, DATA_VERSION `057b02878e34`. Built by the PC driver (local `run-pilot.mjs` + independent Gemini review). The driver stopped after apply+aram4. `npm test` and the git push were done on the Linux box.

## Scope

- Corpus: Pnei Moshe `site/data/gemara/ysay/Orlah/` on the 1.0.184 tree (DATA_VERSION `804638d9ce62`). Terumot b24 remains HOLD and was skipped.
- 20 pages, nested `say` (195 outer, 6 empty inner arrays; 624 inner).
- Raw tokens: 33,997 = 2,107 already pointed + 31,890 bare. Of the bare baseline, 29,338 were considered after quote/abbreviation split. `partial` on all 20 pages (values 22–45, sum 624), left byte-identical. `v` left byte-identical on all 20 pages.
- Companion `yer/Orlah` (20/20, hashes 40/40) was lookup-only. No `bavli/Orlah` or `bsay/Orlah`.
- aram4: updated 0, unchanged 0, skipped 428. No `aram4-identity.json` change.
- ENGINE-COV-1B: no pin on this tractate.

## Gates

- Independent validation: 1,765 changed / 31,890 bare (600 forms), samples 650+1,636. dseg: modern 0, rabbinic 623, miss 1.
- Fix rounds: 0.
- Independent first review (`gemini-4-hydrogen-high`): **SHIP 9.8**, harmful_error_count=0. S1–S5 = 10.0/9.9/9.8/10.0/9.8. 650 tokens audited; 600 unique forms scanned.
- Apply: 20/20 pages, 1,765 tokens vs live 1.0.184, 2,107 already-pointed kept, 20 partial pages preserved. No `yer`/`bavli`/`bsay` writes.
- `npm test`: 684/684 in 302.08s on the Linux box after recomputing DATA_VERSION with `node tools/data-version.mjs`. First run failed on the known `pitch-192` flake (683/684); one retry passed.
