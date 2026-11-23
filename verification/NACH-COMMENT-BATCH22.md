# Nach commentary batch 22 — Ezra and Daniel (nachv), Hebrew commentary only

Shipped as **1.0.214**, DATA_VERSION `5edacaeb230f`. This is the explicit Ezra+Daniel packet requested at 16:16 Asia/Jerusalem: Hebrew commentary only; any token inside an Aramaic-quoting context (the lemma of an Aramaic biblical verse, or a token whose letters match a word in that Aramaic verse; Daniel 2:4 only after «ארמית») and any form the speech engine marks as exclusive-Aramaic (`corpusForms().ARAM`, `quarantine_aramaic_form`) stayed bare. Packed changed tokens were 1,024 (≥650), so the review used the normal 650-sample gate, not a full review. The under-650 full-review path added for this exact set (16:16 parent instruction) was not used. The 650-sample gate was not loosened for any other packet. The SHIP score gate was unchanged: overall strictly above 9.5, explicit `harmful_error_count = 0`, at most two exact-only fix rounds. Built by the PC driver (`--corpus nachv`, `-Tractates Ezra,Daniel`) with the conservative ך/ת pre-filter and the new Aramaic leave-bare rules. The driver stopped after apply+aram4. `npm test` and the git push were done on the Linux box from a clean worktree (`/tmp/chitas-reader-nach-b22`) so uncommitted files in `/workspace/chitas-reader` were not touched. Origin/main was 1.0.213 / `85f2b80e3652` (`54ee2b64`) when the version was chosen. `npm test` was run after the 1.0.214 bump. Chabad pronunciation, global shva, and the Yerushalmi אדרבה rebuild were not started. Linguistic HOLDs (Jeremiah; Zechariah+Nehemiah; Malachi+Habakkuk+Joel+Nahum+Zephaniah; Terumot; Rosh Hashanah) stayed parked.

## Scope

- Corpus: Metzudat David on Ezra and Daniel, `site/data/nachv/{Ezra,Daniel}/` on the 1.0.213 tree (DATA_VERSION `85f2b80e3652`). Public domain. Biblical Aramaic verses themselves were not rewritten; companion `nach/` was lookup-only.
- Combined first packet: 22 pages, 1,024 changed / 498 forms (Ezra 253 on 10/10 pages, Daniel 771 on 12/12 pages). Yield 6.43% of 15,915 bare tokens. No exact-only fix rounds.
- `vd` left byte-identical on all 22 pages. `partial` is present and unchanged on all 22 pages (Ezra 10, values 23–58, sum 405; Daniel 12, values 40–147, sum 809).
- Already-pointed tokens kept: Ezra 584, Daniel 1,179 (1,763 total). Letters, nested `say` shape, and non-`say` keys unchanged.
- Companion `nach/` folders were lookup-only. Biblical `v` and commentary `e` were not written.
- aram4: no `nachv` rows; updated 0, unchanged 0, skipped 428 for each book.
- ENGINE-COV-1B: neither book has a pin (`has_pin: false`). Approved/allowlist/population and the frozen manifest were not changed.
- `engine-aram-forms.json` for this packet: 71,300 `corpusForms().ARAM` keys, with formKey fixtures checked in the pilot.

## Gates

- First pilot: 1,024 changed / 498 forms, samples=650, controls 1,532. Pipeline tests: 7/7. VALIDATE ok (bare_in 16,776, pointed_in 1,763, errors=0). dseg modern 0 / rabbinic 1,214 / miss 0. denylistHits 1,263, quarantineHits 13,435 (includes `quarantine_aramaic_quote`, `quarantine_aramaic_form`, ך/ת, and inherited gates).
- Independent review (`gemini-4-hydrogen-high`): **SHIP 9.9**, harmful_error_count=0 (explicit). S1–S5 = 10.0/10.0/9.9/9.9/9.9. tokens_audited=650. `fix_rounds=0`.
- Apply vs live 1.0.213: Ezra 10/10 pages, 253 tokens, 584 already-pointed kept, 10 partial pages preserved. Daniel 12/12, 771 tokens, 1,179 kept, 12 partial. Total 1,024. No `nach/` writes. `vd`/`partial` identity re-checked on the box (22/22).
- `npm test`: 708/708 pass in 298.29s before the bump and 708/708 in 302.06s after bumping VERSION to 1.0.214 (so the historical bump-check regexes are exercised). DATA_VERSION `5edacaeb230f` from `node tools/data-version.mjs`.

## Release

- Clean worktree `/tmp/chitas-reader-nach-b22`, branch `release-nach-b22` from `origin/main` at `54ee2b64`. Symlinked `node_modules` from `/workspace/chitas-reader/node_modules`.
- Next free version rechecked against `origin/main` immediately before the bump: 1.0.214.
- No new exact-only forms to persist in BASE_TOOLING.
