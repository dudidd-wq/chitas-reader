# 1.0.101 – Pauses in the read-aloud (every source; taamim as cues)

Dudi asked whether the engine uses commas and periods for a natural (not robotic) delivery, and whether our texts are punctuated so it can. After the audit he said: «תתחיל / תוסיף אותם גם בטקסט עצמו לא רק בהקראה».

This version ships the engine work (parts 1–2). Auto-punctuation of the displayed text of Torah Or / Likkutei Torah, Rambam, Sefer HaMitzvot and Penei Moshe (part 3) is a follow-up: it needs a cross-model review above 9.5 and shares the $25/provider cap with the short-biur pipeline.

## 1. Pauses at commas and periods – every source

`pauseChunks` (1.0.96, originally Gemara only) now runs for **every** source, in both engines:

- comma → 0.18 s of silence after the chunk
- `. : ; ? !` → 0.38 s
- a one-word piece is glued to its neighbour (same “lone-word glue” as 1.0.96)

The local Piper voice already did this for Gemara by appending silence to the buffer (Gemara behaviour is unchanged). The Web Speech fallback now waits the same gap after each utterance. Playwright tests set `window.__ttsPauseScale = 0` so they do not wait out the gaps.

## 2. Disjunctive taamim → read-aloud pauses (display unchanged)

`insertTaamPauses` in `tts-prep.js` runs inside `prepareForTTS`, **after** HTML is stripped and sof-pasuq is already a period, **before** the accents are removed. The verse files and the on-screen text are not edited; the taamim remain the visual division.

| Accent | Pause |
|---|---|
| sof pasuq (already) | period, 0.38 s |
| atnach, segolta, shalshelet, ole ve-yored (only in cantillated text) | `;`, 0.38 s |
| zaqef qatan / gadol, revia | `,`, 0.18 s — skipped in short verses (≤ 8 words) and when a side has fewer than 3 words |
| tipcha, tevir, pashta, geresh, … | `,` only in verses longer than 12 words, ≥ 4 words on each side |

Compiled ole stress tags in prose (Hayom Yom, Tanya, siddur `say`, …) are not treated as cantillation.

Onkelos is not word-aligned 1:1 with the Hebrew verse, so it keeps only the sof-pasuq pause. No commas are invented in the Targum.

## Samples

Before/after MP3s: `/workspace/punct-pauses/` (generated with the same Piper path as the app).

## Tests

`tests/pauses-201.test.mjs` plus the existing Gemara `pauseChunks` contract.
