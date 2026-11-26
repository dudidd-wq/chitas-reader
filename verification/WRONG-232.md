# WRONG-232 – local wrong-word report («לא נשמע נכון»)

App-only change on top of 1.0.231. Display typography of the lesson, `DATA_VERSION`, `yearWord`, offline.js, store.js backup, and done semantics are unchanged. `sw.js` ASSETS adds `js/tts-wrong.js` only.

- In the reader TTS sheet (not the compact player bar): «לא נשמע נכון» saves the current spoken chunk, or the prepared speech of the current paragraph, plus optional selected text, lesson id, and voice settings.
- Storage is a dedicated `localStorage` key `chitas-reader.wrong.v1` (cap 200). The main backup is not involved.
- «דיווחים שמורים» lists, deletes, exports a JSON file, and restores from a previously exported file (merge by default; replace after confirm). Nothing is sent to a server. The existing GitHub «מצאת טעות?» link is unchanged.
- Tests: `tests/tts-wrong.test.mjs` (6/6).
- External review (agy, Gemini 4 Hydrogen High): SHIP 9.8 first try, harmful_error_count 0. Non-blocking notes: after stop(), the last spoken chunk is saved rather than a newly scrolled paragraph; localStorage quota is not specially caught; a restore file with a missing `items` array is treated as empty.
