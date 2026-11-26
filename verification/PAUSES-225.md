# PAUSES-225 – sentence-level synthesis (A2, engine 2)

Contract of `pauseChunks` from 1.0.225 (supersedes the per-comma rule of PAUSES-201 / 1.0.96):

- A sentence (`chunkText` split on `[.:;?!]`) is ONE synthesis chunk, commas included. Commas stay in the spoken text
  (intonation) but never cut the audio.
- Only a sentence longer than `max` (180) is cut (`chunkText`: at a comma if possible, else a space). A piece of one Hebrew
  word is glued to its neighbour (lone-word glue).
- `gap` after a chunk: **0.38 s** if it ends in `[.:;?!]`; **0.22 s** for a forced length cut (or an unpunctuated tail).
  There is no 0.18 s gap after commas any more.
- `insertTaamPauses` is unchanged: atnach / ole-ve-yored → `;` (sentence split, 0.38 s), zaqef / revia → `,` (inside the chunk).
- Audio finish (`piper-core.js` `finishAudio`, after `trim`): fade-in 6 ms, fade-out 10 ms (linear), peak-normalise to 0.89
  (never clips; peak < 0.02 is left alone). IPA / phoneme ids are untouched.
- Noise: `DEFAULT_NOISE_SCALE` 0.5, `DEFAULT_NOISE_W` 0.6. Both shipped voices list the stock Piper values 0.667 / 0.8 in
  their config; A2 uses the lower constants anyway so the reduction is not a no-op. `length_scale` still comes from the
  voice config.
- NPS1: rules and speech text unchanged. Only the frozen `beforePauseChunks` arrays in `tests/fixtures/nps1-boundary-errors.json`
  were regenerated. Rule C6 (short chunk created by a comma) can no longer be triggered by a comma, so its test now expects the
  length-cap case to be allowed (C7); the planner guard stays.
- Measured by `node tools/tts-eval.mjs` (prosody line; `--prosody` lists every item) – golden prep/IPA snapshot unchanged.
