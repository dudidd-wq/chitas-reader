# SAID-231 – «מה שהוקרא»: heard / skipped / learned

App-only change on top of 1.0.230. Display typography of the lesson, `DATA_VERSION`, `yearWord`, offline.js, and backup/import are unchanged. `sw.js` ASSETS adds `js/tts-said.js` only.

- A button «הצג מה שהוקרא» in the reader TTS sheet (not the compact player bar) opens a hidden-by-default report of the current lesson.
- Each segment shows the speech text after `prepareSpeechForTTS` / `pauseChunks` (the same path as Speaker / PiperSpeaker) and a status: הושמע, דולג (קדיש / גמרא / ריק), יוקרא, לא הושמע (התחלה באמצע או דילוג קדימה), או מוקרא עכשיו.
- «נלמד» is shown separately from what was actually heard. This release does not change when a lesson is marked `done`.
- Local TSV download only. Nothing is sent to a server.
- When a speaker is already running, the report follows that engine (Web Speech fallback is not described as Piper). After a mid-lesson start that later finishes, earlier unheard segments stay «לא הושמע».
- Tests: `tests/tts-said.test.mjs`.
- External review (agy, Gemini 4 Hydrogen High): SHIP 9.8 after two rounds (HOLD 8.0 → SHIP 9.8), harmful_error_count 0.
