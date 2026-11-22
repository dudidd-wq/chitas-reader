# Pnei Moshe batch 19 — Nedarim (ysay)

Shipped as **1.0.180**, DATA_VERSION `570d6716e316`. Built by the PC driver (local `run-pilot.mjs` + independent Gemini review). `npm test` and the git push were done on the Linux box: the Windows test suite fails because `new URL(...).pathname` becomes `C:\C:\...`, and `tools/data-version.mjs` must run on Linux so DATA_VERSION matches `sw-data` (Windows had written `32528f88827f`).

## Scope

- Corpus: Pnei Moshe `site/data/gemara/ysay/Nedarim/` on the 1.0.179 tree (DATA_VERSION `64d6d29dd496`).
- 40 pages, nested `say` (384 outer, 9 empty at `13:7`, `13:8`, `14:0`, `14:1`, `14:2`, `19:5`, `4:3`, `4:8`, `4:9`; 1,772 inner).
- Raw tokens: 47,164 = 5,497 already pointed + 41,667 bare. `partial` on all 40 pages (sum 1,758), left byte-identical.
- Companion `yer/Nedarim` (40/40, mismatches 0) was lookup-only. Did not write `bavli/Nedarim` or `bsay/Nedarim` (Steinsaltz Nedarim already shipped as 1.0.150). Hashes 80/80.
- aram4: updated 3, unchanged 2, skipped 423 (rows on `ysay/Nedarim/19.json`).

## Gates

- Independent validation (fix2 pack): 2,303 changed / 41,667 bare (901 forms), samples 650+2,118.
- Fix rounds: 2. New exact-only: בפיל, ממין, קנתה.
  - Round 1 (first review HOLD 8.9): `בפיל` at `24:9:0#2` (Pietrkov ו/י for פול), `ממין` at `28:2:2#23` (Pietrkov for ממון; second occurrence at `37:3:2#29` also reverted). 3 tokens, 2 forms.
  - Round 2 (fix review HOLD 9.2): `קנתה` at `2:3:1#6` (Aramaic noun קַנְתָּה "handle", not the Hebrew verb). The already-pointed lemma at `2:3:1#4` stayed `קָנְתָה` (preservation).
- Independent fix2 review (`gemini-4-hydrogen-high`): **SHIP 9.9**, harmful_error_count=0. S1–S5 = 10.0/9.9/9.9/9.9/10.0. 650 tokens audited.
- Apply: 40/40 pages, 2,303 tokens vs live 1.0.179, 5,497 already-pointed kept, 40 partial pages preserved. No `yer`/`bavli`/`bsay` writes.
- `npm test`: 684/684 on the Linux box (260.97s) after recomputing DATA_VERSION with `node tools/data-version.mjs`.
