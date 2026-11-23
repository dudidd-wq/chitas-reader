# Method — Onkelos speech-only conservative ole (Torah-verse-aligned)

1. Same lexicon and gates as Mishnah / commentary stress: unique-milel biblical forms, minCount 5, k ≥ 1, `זָרַע` blocked, never stamp «לאו» or prefixed «לאו».
2. Candidate stamps come from `applyOleToText` on Onkelos `say` only. Words that already carry ole or cantillation, or that lack niqqud, are skipped. Display `t` is never written; existing 1,310 ole marks in `say` stay in place.
3. Fail-closed alignment: keep a stamp only if `stressKey(token)` is among the `stressKey`s of the words in the parallel Torah verse (`cleanVerse` of `torah/<book>/<ch>.json` `v[i]`, tokenized with the same word regex). Maqaf-bound Hebrew phrases do not contribute the inner member as a free key, so forms such as `עֵבֶר` in `בְּנֵי־עֵבֶר` are not treated as present.
4. Yield of this aligned set: 196 tokens, 29 forms, 75 pages (raw unaligned pass would be 270 / 35 / 86). 74 lexicon hits were left unstamped because they failed alignment on that verse.
5. This packet is a full review of every changed token (Dudi, 24/11/2026), not a 650-sample subset.
