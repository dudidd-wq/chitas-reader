# 1.0.82 — Siddur instructions, live font previews, reading emphasis

## User controls

Both Settings → תצוגה and the reader’s Aa / תצוגה sheet use the same controls:
- **הסתר הנחיות בסידור** (`hideSiddurInstructions`, false by default).
- Each font radio card renders **תּוֹרָה אוֹר וְשִׂמְחַת לֵב** in that option’s real font, independent of the currently selected family. Native radio/label keyboard semantics remain; repeated decorative samples are aria-hidden.
- **הדגשת גופן הקריאה** (`readingBold`, false by default); reading weight 400 → 700, reflected immediately in the previews and reader. Stored locally, exported/imported with other preferences. Malformed persisted non-boolean values revert to false.

## Instruction safety

The Siddur builder, not a CSS overlay, removes typed instruction notes, inline English instruction runs (before translation in all three language modes), and typed instruction table cells. Instruction-only table rows disappear; mixed rows retain empty positional cells so prayer/Name columns do not shift. Prayer text, names shown only, section headings, stable IDs, repeat counts, omit/special flags and their boundaries remain. Omission ranges are computed from the **original** raw rows before any filtering, so date/always logic still works. Displayed אין אומרים / עד כאן boundary markers are intentionally retained, as requested. No source data or nusach changes.

Existing compiled `say` text already excludes these instructions and remains byte-identical. Fallback speech sees the stripped display text. Changing the option in the reader invalidates an already prepared Web/Piper queue before rebuilding. The tests capture both real queue preparation paths.

## Real bold, not only a CSS number

Bundled Noto is a **static 400 font**, not a variable font; its old 100–900 declaration prevented actual synthetic bold despite computed weight 700. The face descriptor is corrected to 400. Frank Ruhl Libre has its real variable wght axis; Taamey Ashkenaz has a real separate bold face. Noto and Ezra use browser-synthesized bold (no new download). A canvas ink test renders the same pointed phrase at 400/700 and requires a genuine increase for all four families. Omit/special styles retain their semantic distinction while supporting emphasized text, including Ezra synthetic weight.

## Regression and artifacts

New tests in `tests/settings-182.test.mjs`: defaults and inline prayer retention; whole-Siddur prayer/ID/heading/repeat/omission/speech invariance; font family previews; live and persisted settings; removal from DOM and both speech queues; always-omit compatibility; malformed preferences; rendered font-weight ink checks.

Requested screenshots (actual UI, options enabled):
- `/workspace/chitas-settings-instr-font.png`
- `/workspace/chitas-siddur-noinstr.png`

Release VERSION 1.0.82. DATA_VERSION is 7ba2ce4dcd67 after regenerating the search builder provenance; all source text and voice data are unchanged. No voice update/download is needed. Stage 5 Rambam is not started.

Final full `npm test`: **388/388 pass**, zero skipped/failed (`/workspace/chitas-settings/full-tests-2.log`). The initial run identified stale search provenance and the existing raw-source font-option formatting assertion; both were corrected. An unrelated stochastic voice-duration assertion failed once and passed unchanged in the focused recheck and final full run. Screenshots currently show the local candidate, not a deployed release.
