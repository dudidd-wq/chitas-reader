# Nach commentary batch 1 — Isaiah (nachv)

Shipped as **1.0.198**, DATA_VERSION `ab555cfad32f`. Built by the PC driver after adapting it to `--corpus nachv` (local `run-pilot.mjs` + independent Gemini review). The driver stopped after apply+aram4+1B. `npm test` and the git push were done on the Linux box from a clean worktree so uncommitted files in `/workspace/chitas-reader` were not touched. Origin/main was 1.0.197 / `8cb1c30e1204` (`16a7ab6b`) when the version was chosen. The ≥650 changed-sample gate was not loosened. Ezra and Daniel were not included (Aramaic caution). Chabad pronunciation, global shva, and the Yerushalmi אדרבה rebuild were not started.

## Scope

- Corpus: Metzudat David on Isaiah, `site/data/nachv/Isaiah/` on the 1.0.197 tree (DATA_VERSION `8cb1c30e1204`). Public domain. 66 chapters, nested `say` (1,291 outer, 30 empty inner arrays; 3,322 inner).
- Raw tokens: 48,614 = 5,695 already pointed + 42,919 bare. Of the bare baseline, 40,595 were counted after quote/abbreviation split (`bareTokens`). `partial` on all 66 pages (values 8–95, sum 3,322), left byte-identical. `vd` left byte-identical on all 66 pages.
- Companion `nach/Isaiah` (66/66, keys `v`/`e`/`el=md`, hashes 132/132, 0 length mismatches) was lookup-only. Biblical `v` and commentary `e` were not written.
- aram4: no `nachv` rows; updated 0, unchanged 0, skipped 428. Fixture `base` SHA and the 428-row population were left unchanged.
- ENGINE-COV-1B: the 19 Isaiah gold say-segments in 22/27/61.json were byte-identical to 1.0.197 (already-pointed kept). Approved/allowlist/status/base/schema/population (158 tokens) were not changed. Because other say-segments in those three files were newly pointed, the file-level pin hashes were retargeted mechanically: after = current file SHA, before = current file with only the frozen 1B additions reversed. All 19 string-level hashes, offsets, and addPointingAt still match. Frozen manifest SHA in tools/engine-cov-1b.mjs updated to `63ef5f8383dd637bd3f61e10d9d82f2891b222099f2ef7c96b0c2e8d8ef2f09e`. Companion identity pins on `nach/Isaiah` were left unchanged. `node tools/engine-cov-1b.mjs` reports `{approved:158, files_written:0}`.

## Gates

- Independent first validation: 3,501 changed / 40,595 bare (1,532 forms), samples 650, controls 2,360. dseg modern 0 / rabbinic 3,322 / miss 0. First review (`gemini-4-hydrogen-high`): **HOLD 8.4**, harmful_error_count=10. Exact-only forms in fix round 1 of 2: `הטעינו`, `שרוע`, `מישרים`, `ושפטו`, `נכרתה`, `נצלת`, `עזבת`, `בשלומך`, `ובשעריך`, `וממשלתך`.
- After fix 1: 3,486 changed / 40,595 bare (1,522 forms), samples 650, controls 2,377. Fix review: **HOLD 8.8**, harmful_error_count=2, S1–S5 = 10.0/9.3/8.8/9.8/9.9. Exact-only forms in fix round 2 of 2: `מנעו`, `השרד`.
- After fix 2: 3,483 changed / 40,595 bare (1,520 forms), samples 650, controls 2,380. Yield 8.62% on the first packet (8.58% after both fix rounds vs bareTokens 40,595). dseg unchanged at 0 miss.
- Independent final review (`gemini-4-hydrogen-high`): **SHIP 9.9**, harmful_error_count=0. S1–S5 = 10.0/10.0/10.0/9.9/10.0. 950 tokens audited; 1,520 unique forms scanned.
- Apply vs live 1.0.197: 66/66 pages, 3,483 tokens, 5,695 already-pointed kept, 66 partial pages preserved. No `nach/` writes.
- `npm test`: 708/708 pass in 279.81s on the Linux box after the mechanical 1B file-hash retarget. DATA_VERSION `ab555cfad32f` from `node tools/data-version.mjs`.
