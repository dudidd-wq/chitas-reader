# Discoverability of «הצג מה שהוקרא» and «לא נשמע נכון»

Dudi could not find the buttons (t360u). They used to render only at the bottom of `ttsForm()`, and only when a lesson was already open, so they were missing in general Settings and buried under a long form in the TTS sheet.

What changed:

- In **הגדרות → הקראה**, a short hint says the buttons appear at the top of the read-aloud sheet during a lesson, and how to open that sheet (open a lesson, start reading, tap the gear on the bottom bar).
- While a lesson is open, the three buttons — «הצג מה שהוקרא», «לא נשמע נכון», «דיווחים שמורים» — sit at the **top** of the TTS sheet, just under «התחל / השהה הקראה», above the voice options. They were not added to the compact player bar, so the single-row 320px bar is unchanged.
- In **על האפליקציה**, a hint under the version number explains how to get a new version: tap «רענון» when the update message appears, or refresh the page. The update toast is no longer overwritten or auto-dismissed by later toasts, and the app checks for a new service worker on return to the tab and when Settings is opened.
