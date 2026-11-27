# t361u: live highlight of the current spoken segment

Dudi asked that «הצג מה שהוקרא» strongly highlight what is being spoken *now* on the reader screen, and not show a list of past or upcoming speech.

## What shipped

- The button at the top of the TTS sheet (opened from a lesson, gear on the player bar or a long-press on the read-aloud button) is now a toggle: **«הדגשת המוקרא כעת»**, with `aria-pressed`. The choice is stored locally as `prefs.ttsLiveHighlight` (default **on**).
- When the toggle is on, the current spoken paragraph (`.seg.speaking`) gets a high-contrast background and a visible outline (`--speak-bg` / `--speak-ring` / `--speak-ink`) in paper, sepia, dark and night. The same tokens apply across designs. Forced-colors uses a Highlight outline.
- Auto-scroll (and page-turns in page layout) keeps that paragraph in view, using the existing `followSpeech` path. After a *manual* scroll, wheel, swipe, page-turn or Home/End, follow pauses for 4 seconds, then resumes. Programmatic follow uses instant (`auto`) scrolling so it does not lag behind the voice.
- The past/future list (`#said-view`, export TSV from the sheet) is removed. `speechForSegment` / `resolveSaidEngine` remain, because «לא נשמע נכון» still needs the current segment's speech text. «לא נשמע נכון» and «דיווחים שמורים» are unchanged.
- Word-level highlighting was considered and rejected: Web Speech `onboundary` is uneven for Hebrew (often missing on Safari), Piper has no word timestamps, and the speech string after `prepareForTTS` is not the displayed HTML (Divine Name, skipped citations, etc.). A guessed mapping would mis-highlight. The highlight stays at segment level.

## What was not changed

- Display typography of the lesson text (no new wrappers around words).
- `site/js/texts.js`, `site/js/tts-prep.js`, `g2p.js`, voice files, `DATA_VERSION`.
- The compact 320px player bar (no new button on the bar).


## Round 2 (after HOLD 7.0)

- `:root[data-design="nocturne"]` now has its own `--speak-*` tokens (`#5c3d12` / `#f1d79a` / `#fff6df`), so nocturne is not left with the paper yellow highlight on light child text.
- Child text that shares the highlight background (`.vn`, `.hn`, `.ketiv`, `.rashi`, labels, `.biur`, `.sbiur`) uses `--speak-ink`. Modern badges/panels that have their own opaque background keep their own ink.
- `pointercancel` and `pointerleave` clear the manual-scroll flag, same as `pointerup`.
- `ArrowUp` / `ArrowDown` in scroll layout pause follow.
- `openReader()` resets follow-pause state so it does not carry into the next lesson.

## Round 3 (after HOLD 8.5)

Round 2 left unreadable child text in some designs, and put `[data-design="modern"]` highlight exceptions in the early CSS (which broke the designs-203 "one section at the end" rule).

- The modern exceptions moved into the end-of-file modern design section. `.rashi .lbl` and verse numbers stay `#fff` on their opaque badges; Rashi body uses `--rashi-ink`; biur/sbiur use `--ink` (which tracks paper vs dark). `color: unset` is gone.
- The general `--speak-ink` descendant list now also covers `.fn`, `.daf`, `.sid-rep`, `.sid-bound`, `.sd-n`, `.sd-x`, omer day colours, `.sbiur > summary`, links, and inline glossary `::after`.
- Contrast is retested on chumash (which actually contains `.vn`, `.rashi`, `.rashi .lbl`) in nocturne, modern paper, and sefer dark, without skipping missing selectors.
- `pointerdown` cancels the pending `clearUserPtr` timer. `closeReader()` also resets follow-pause state.
- A Chromium check confirms follow stays off during the 4-second pause and resumes after (`window.__shouldFollowNow`).

## Round 4 (after HOLD 8.8)

- Added `.sid-in` (inline siddur instructions) and `.sid-mark` (`(א)`/`(ב)` section markers) to the `--speak-ink` descendant list. They sit inside `.t` on `--speak-bg` and were still `color: var(--muted)` (as low as 2.22:1 in dark).
- Contrast is retested on siddur pages that actually contain those classes, in classic dark/night, sefer dark, and nocturne.
