# Pnei Moshe batch 22 — Maasrot (ysay)

Shipped as **1.0.183**, DATA_VERSION `b2b62c107c94`. Built by the PC driver (local `run-pilot.mjs` + independent Gemini review). The driver stopped after apply+aram4. `npm test` and the git push were done on the Linux box.

## Scope

- Corpus: Pnei Moshe `site/data/gemara/ysay/Maasrot/` on the 1.0.182 tree (DATA_VERSION `836d3afd7935`).
- 26 pages, nested `say` (209 outer, 6 empty inner arrays; 931 inner).
- Raw tokens: 38,929 = 2,849 already pointed + 36,080 bare. Of the bare baseline, 33,360 were considered after quote/abbreviation split. `partial` on all 26 pages (values 18–60, sum 930), left byte-identical.
- Companion `yer/Maasrot` (26/26, hashes 52/52) was lookup-only. Did not write `bavli/Maasrot` or `bsay/Maasrot` (neither exists).
- aram4: updated 3, unchanged 3, skipped 422 (6 rows on `ysay/Maasrot/3.json`). `tests/fixtures/aram4-identity.json` was included in the commit.

## Gates

- Independent validation (first pack): 2,394 changed / 36,080 bare (720 forms), samples 650+1,653. dseg: modern 0, rabbinic 930, miss 1.
- Fix rounds: 1. New exact-only: כשיש.
  - Round 1 (first review HOLD 9.2, harmful_error_count=1; S1–S5 = 10.0/9.2/10.0/10.0/10.0): the reviewer flagged `כשיש` for exact-only in `UNCERTAIN_ATTESTATION_FORMS`. The first driver run failed to parse `recommendedFix.addExactOnlyForms` and stopped with no fix round; parsing was patched and the batch was resumed without rebuild. After exact-only `כשיש`: 2,394→2,393 tokens, 720→719 forms.
- Independent fix review (`gemini-4-hydrogen-high`): **SHIP 9.9**, harmful_error_count=0. S1–S5 = 10.0/9.9/10.0/10.0/10.0. 650 tokens audited; 719 unique forms scanned.
- Apply: 26/26 pages, 2,393 tokens vs live 1.0.182, 2,849 already-pointed kept, 26 partial pages preserved. No `yer`/`bavli`/`bsay` writes.
- `npm test`: 684/684 on the Linux box (299.61s) after recomputing DATA_VERSION with `node tools/data-version.mjs`.
