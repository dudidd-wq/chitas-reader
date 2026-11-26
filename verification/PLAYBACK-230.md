# PLAYBACK-230 – exact resume, quick replay, and sleep timer (A5)

App-only change. Display text, `DATA_VERSION`, `yearWord`, offline.js, and Track B / system-review files are unchanged. Built on 1.0.229 (separate scripture/Oral-Torah Name settings).

- Exact resume: progress records a sanitized integer `say` (queue index) with the matching segment `pos`. Play resumes at that queue item only when the lesson is not marked done and `pos` is still the visible current segment (no stale `p.pos` during the 400 ms progress debounce).
- Quick replay: «קטע קודם» (and Media Session previoustrack) after about two seconds into the current chunk restarts that segment from its first chunk; earlier than that, or between chunks, it goes to the previous segment. `chunkStarted` is reset at the start of `speakCurrent`, `interruptPlayback`, `pause`, and `stop` in both Speaker and PiperSpeaker.
- Sleep timer: a stored preference `ttsSleep` of 0 / 15 / 30 / 45 / 60 minutes (default off). Wall-clock, including pause. When it fires, playback stops at the end of the current chunk; the lesson is not marked learned. The deadline is kept across `ttsContinuous` auto-advance (`finish()` → `onState('stopped')` → `onEnd` → `nextUnit(true)` → `openReader()`), and is cleared on close, errors, a last-lesson finish, a manual open of another lesson, or turning the timer off (which also cancels a pending end-of-chunk stop). Changing the timer in the reader sheet does not tear down the speaker.
- Tests: `tests/tts-resume-sleep.test.mjs`, `tests/tts-resume-sleep-speaker.test.mjs`; `ttsSleep` is listed in `tests/settings-layout-193.test.mjs`.
- External review (agy, Gemini 4 Hydrogen High): SHIP 9.6 after four rounds (HOLD 8.0 → 8.5 → 8.5 → SHIP 9.6), harmful_error_count 0.
