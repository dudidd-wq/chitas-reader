# Nach commentary batch 21 — Jonah, Haggai, Obadiah, Lamentations, Esther, Ruth (nachv), approved full review

Shipped as **1.0.212**, DATA_VERSION `2f68e1a9c6b6`. This is the first of two packets Dudi approved on 14:54 Asia/Jerusalem (widget t331s1886) for a full review of every changed token instead of the 650-sample gate. The SHIP score gate was unchanged: overall strictly above 9.5, explicit `harmful_error_count = 0`, at most two exact-only fix rounds. The 650-sample gate was not loosened for any other packet. Built by the PC driver (`--corpus nachv`, `-Tractates Jonah,Haggai,Obadiah,Lamentations,Esther,Ruth`) with the conservative ך/ת pre-filter. The driver stopped after apply+aram4. `npm test` and the git push were done on the Linux box from a clean worktree (`/tmp/chitas-reader-nach-b21`) so uncommitted files in `/workspace/chitas-reader` were not touched. Origin/main was 1.0.211 / `1c0af546c895` (`1335fccf`) when the version was chosen. `npm test` was run after the 1.0.212 bump. Ezra and Daniel were not included. Joshua and Judges had already shipped in 1.0.211. Jeremiah, Zechariah, Nehemiah, and the five batch-18 books stayed parked. Chabad pronunciation, global shva, and the Yerushalmi אדרבה rebuild were not started.

## Scope

- Corpus: Metzudat David on Jonah, Haggai, Obadiah, Lamentations, Esther, and Ruth, `site/data/nachv/{...}/` on the 1.0.211 tree (DATA_VERSION `1c0af546c895`). Public domain; Rashi on the Megillot is Metsudah CC BY.
- Combined first packet: 26 pages, 239 changed / 149 forms. After exact-only `שגלו`, 237 changed / 148 forms. Lamentations, Esther, and Ruth contributed 0 new tokens (already pointed; raw_bare 35/22/10, leftover bare tokens stayed bare). The seven files actually written are Jonah 1–4, Haggai 1–2, and Obadiah 1 (102+77+58 = 237).
- `vd` left byte-identical on all 26 pages. `partial` is present and unchanged on Jonah (4, values 13–42, sum 102), Haggai (2, 29–58, sum 87), and Obadiah (1, 57); it is absent and stayed absent on Lamentations, Esther, and Ruth (allowed).
- Companion `nach/` folders were lookup-only. Biblical `v` and commentary `e` were not written.
- aram4: no `nachv` rows; updated 0, unchanged 0, skipped 428 for each book.
- ENGINE-COV-1B: none of these books has a pin (`has_pin: false`). Approved/allowlist/population and the frozen manifest were not changed.

## Gates

- First pilot: 239 changed / 149 forms. Because the packed set is the exact approved full-review packet, the driver reviewed every changed token (samples=239) with 616 controls instead of refusing the under-650 pack. Pipeline tests: 7/7. VALIDATE ok (bare_in 3,705, pointed_in 7,253).
- Independent review (`gemini-4-hydrogen-high`): HOLD 9.1, harmful_error_count=1, S1–S5 = 10.0/9.1/9.4/10.0/9.8, tokens_audited=239 (all changes). Harmful form: `שגלו -> שֶׁגָּלוּ` at `Obadiah/1` (segment 13, token 9); the surface is a typo/truncation for Hif'il `שֶׁהִגְלוּ` (“who exiled”), so it must stay bare rather than be pointed as intransitive Qal.
- Fix round 1: exact-only `שגלו`. Pilot: 237 changed / 148 forms, samples=237 (all remaining changes), controls 619. Tests 7/7. VALIDATE ok.
- Independent review of fix round 1 (`gemini-4-hydrogen-high`): **SHIP 9.9**, harmful_error_count=0 (explicit). S1–S5 = 10.0/10.0/10.0/10.0/9.9. 237 changed samples audited. `fix_rounds=1`. New exact-only: `שגלו` (tooling only; not a site-repo `lib.mjs` change).
- Apply vs live 1.0.211: Jonah 4/4 pages, 102 tokens, 180 already-pointed kept, 4 partial pages preserved. Haggai 2/2, 77 tokens, 179 kept, 2 partial. Obadiah 1/1, 58 tokens, 111 kept, 1 partial. Lamentations, Esther, and Ruth already identical to live (0 new tokens). Total 237. No `nach/` writes. `vd`/`partial` identity re-checked on the box (26/26).
- `npm test`: 708/708 pass in 289.25s on the Linux box, run after bumping VERSION to 1.0.212 (so the historical bump-check regexes are exercised). DATA_VERSION `2f68e1a9c6b6` from `node tools/data-version.mjs`.

## Release

- Clean worktree `/tmp/chitas-reader-nach-b21`, branch `release-nach-b21` from `origin/main` at `1335fccf`. Symlinked `node_modules` from `/workspace/chitas-reader/node_modules`.
- Next free version rechecked against `origin/main` immediately before the bump: 1.0.212.
- Exact-only form to persist in BASE_TOOLING (`engine-cov-pnei-moshe-ysay-b18-fix`): `שגלו`.
