# Pnei Moshe batch 23 — Megillah (ysay)

Shipped as **1.0.184**, DATA_VERSION `804638d9ce62`. Built by the PC driver (local `run-pilot.mjs` + independent Gemini review). The driver stopped after apply+aram4. `npm test` and the git push were done on the Linux box.

## Scope

- Corpus: Pnei Moshe `site/data/gemara/ysay/Megillah/` on the 1.0.183 tree (DATA_VERSION `b2b62c107c94`).
- 34 pages, nested `say` (265 outer, 24 empty inner arrays; 1,275 inner).
- Raw tokens: 39,894 = 3,837 already pointed + 36,057 bare. Of the bare baseline, 32,932 were considered after quote/abbreviation split. `partial` on all 34 pages (values 17–59, sum 1,267), left byte-identical. `v` left byte-identical on all 34 pages.
- Companion `yer/Megillah` (34/34, hashes 68/68) was lookup-only. Did not write `bavli/Megillah` or `bsay/Megillah` (Steinsaltz already shipped).
- aram4: updated 0, unchanged 0, skipped 428. No `aram4-identity.json` change.

## Gates

- Independent validation (first pack): 2,123 changed / 36,057 bare (839 forms), samples 650+2,537. dseg: modern 0, rabbinic 1,274, miss 1.
- Fix rounds: 1. New exact-only: שרוע.
  - Round 1 (first review HOLD 9.2, harmful_error_count=1; S1–S5 = 9.2/10.0/9.8/10.0/10.0): the reviewer flagged `שרוע`→`שָׂרוּעַ` at `Megillah/30:6.0` as a Pietrkov typo for `שְׁמַע`, and recommended exact-only `שרוע`. The first driver run failed to parse the form (it lived in `audit.json` / `REVIEW.md`, not in `scores.json`) and stopped with no fix round. Parsing was extended to those artifacts (fail-closed `HOLD-needs-attention` if harmful errors exist but no forms can be found), tested on Megillah b23, Maasrot b22 and Challah b21, and the batch was resumed without rebuild. After exact-only `שרוע`: 2,123→2,122 tokens, 839→838 forms.
- Independent fix review (`gemini-4-hydrogen-high`): **SHIP 9.8**, harmful_error_count=0. S1–S5 = 9.9/10.0/9.8/10.0/10.0. 650 tokens audited; 838 unique forms scanned.
- Apply: 34/34 pages, 2,122 tokens vs live 1.0.183, 3,837 already-pointed kept, 34 partial pages preserved. No `yer`/`bavli`/`bsay` writes.
- `npm test`: 684/684 on the Linux box (300.73s) after recomputing DATA_VERSION with `node tools/data-version.mjs`.
