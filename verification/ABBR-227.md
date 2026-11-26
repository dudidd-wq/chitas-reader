# ABBR-227 – context-aware ז״א and ת״ת (A4)

Speech-only change in `prepareForTTS` (`site/js/tts-prep.js`). Display text, IPA golden hashes of compiled `say`, and `DATA_VERSION` are unchanged. `yearWord` stays undeployed.

- `'ז"א'` and `'ת"ת'` were removed from the global `ABBREVIATIONS` table (they are ambiguous). `R.unit` is threaded through `Speaker` / `PiperSpeaker` into `prepareForTTS`.
- `ז״א`: in Torah Or / Tanya (and with a `ד` prefix) → זְעֵיר אַנְפִּין; in Chumash / Nach / Rambam / mitzvot / Rav Yomi → זֹאת אוֹמֶרֶת; a “כלומר זאת אומרת” hedge (including in parentheses) is not guessed. Otherwise the letter names, with the prefix on the first letter (`לז״א` → לְזַיִן אָלֶף). The token is never left for `numeralReading` (which would have said 8 or 38, or 800 for ת״ת).
- `ת״ת`: Talmud Torah only with a direct cue (`מצות ת״ת`, `כנגד כולם`, …); Tiferet with a Kabbalah-unit cue (`ת״ת ד…`, `שבחסד`, `הוא ת״ת`). A nearby `מצות` does not override `ת״ת ד…` / `שבחסד`. In other books, `ת״ת דאורייתא` stays letter names (תָּו תָּו).
- Kabbalah cues are whole tokens only and are not applied inside the “זאת אומרת” units, so ordinary prose (`אינו קונה`, `מלכות דוד`, `מדות`) cannot flip ז״א to Zeir Anpin.
- `tests/fixtures/aram4-identity.json` updates only three Torah Or rows’ Israeli/Chabad IPA (source `say` hashes unchanged). The 1B integrity pins for `tts-prep.js` were updated surgically.
- External review (agy, Gemini 4 Hydrogen): SHIP 9.7 after three rounds (8.0 → 7.5 → 9.7), harmful_error_count 0.
