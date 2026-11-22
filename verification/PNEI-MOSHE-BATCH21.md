# Pnei Moshe batch 21 — Challah (ysay)

Shipped as **1.0.182**, DATA_VERSION `836d3afd7935`. Built by the PC driver (local `run-pilot.mjs` + independent Gemini review). The patched driver stopped after apply+aram4. `npm test` and the git push were done on the Linux box.

## Scope

- Corpus: Pnei Moshe `site/data/gemara/ysay/Challah/` on the 1.0.181 tree (DATA_VERSION `78bcb8b446c1`).
- 28 pages, nested `say` (205 outer, 12 empty inner arrays; 777 inner).
- Raw tokens: 42,750 = 2,388 already pointed + 40,362 bare. Of the bare baseline, 36,932 were considered after quote/abbreviation split (3,430 abbr_or_quote). `partial` on all 28 pages (values 10–46, sum 775), left byte-identical.
- Companion `yer/Challah` (28/28, hashes 56/56) was lookup-only. Did not write `bavli/Challah` or `bsay/Challah` (neither exists).
- aram4: updated 0, unchanged 0, skipped 428. `tests/fixtures/aram4-identity.json` was not modified.

## Gates

- Independent validation (first pack): 2,258 changed / 40,362 bare (602 forms), samples 650+1,896. dseg: modern 0, rabbinic 774, miss 3.
- Fix rounds: 1. New exact-only: קדשתה.
  - Round 1 (first review HOLD 9.2, harmful_error_count=1; S1–S5 = 10.0/9.2/9.6/10.0/9.8): `קדשתה`→`קְדֻשָּׁתָהּ` at `20:2:2#13` (noun pointing; context is a transitive Pi'el verb after `כבר` and before object `אותה`). Reverted; 2,258→2,257 tokens, 602→601 forms.
- Independent fix review (`gemini-4-hydrogen-high`): **SHIP 9.9**, harmful_error_count=0. S1–S5 = 10.0/9.9/9.9/10.0/9.9. 650 tokens audited; all 601 unique forms scanned.
- Apply: 28/28 pages, 2,257 tokens vs live 1.0.181, 2,388 already-pointed kept, 28 partial pages preserved. No `yer`/`bavli`/`bsay` writes.
- `npm test`: 684/684 on the Linux box (259.03s) after recomputing DATA_VERSION with `node tools/data-version.mjs`.
