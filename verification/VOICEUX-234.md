# VOICEUX-234 – clearer local-voice install and eviction handling

App-only change on top of 1.0.233. Display typography, `DATA_VERSION`, `yearWord`, offline.js, store.js backup, and the compact player bar are unchanged. `sw.js` ASSETS adds `js/voice-ux.js` only.

- Before a settings-sheet download, if `storage.estimate()` says free space is below the missing bytes, a confirm warns and may suggest the light (int8) voice. This never auto-blocks; if estimate is missing there is no prompt.
- A dedicated localStorage record distinguishes a user delete from the browser evicting the voice. In the evicted case the status line says the voice was removed (e.g. storage cleanup) and can be downloaded again.
- When a voice is installed, a secondary note reports whether the browser promised not to delete it (`persisted()` only; no new persist prompt). `installVoice` still requests persist at the end, as before.
- Deleting the voice from the sheet asks for confirm. The download-button labels are unchanged.
- Tests: `tests/voice-ux.test.mjs` (4/4).
- External review (agy, Gemini 4 Hydrogen High): SHIP 9.6 first try, harmful_error_count 0. Non-blocking notes were left as-is (setItem quota on the install record, a short double-click window before confirm, int8 suggestion while the natural voice is selected).
