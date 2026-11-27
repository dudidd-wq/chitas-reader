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

## t362u (1.0.240): enlarge the spoken text; mark ~2 lines in Rashi

- A size setting «הגדלת הטקסט המוקרא» (ללא / בינוני / גדול, default **בינוני**) sits next to the highlight toggle in the TTS sheet and in Settings → הקראה. It is stored as `prefs.ttsSpeakSize`. Enlargement applies only while the live highlight is on, and only to the active chunk (`1.2em` / `1.35em`), so the rest of the paragraph does not jump.
- In long commentary (Rashi `<p>`, and similar `.biur` / `.sbiur` / a long verse `.t` when needed) the spoken paragraph is split into follow-chunks of about two visual lines, at the dibur hamatchil (`וגו`) and sentence/clause punctuation. Each chunk is a real sub-utterance (the concatenated speech text is unchanged; `texts.js` / `tts-prep.js` / `g2p.js` are untouched). The highlight moves from chunk to chunk with the queue.
- Auto-follow now tracks the active `.hl-now` chunk. Manual scroll still pauses follow for 4 seconds.

## t362u r2 — speech stays unsplitted until after TTS prep

Round-1 review (HOLD 4.0 / harmful=4) found that splitting `parts[]` *before* `prepareSpeechForTTS()` / `pauseChunks()` changed the spoken text (citations split and spoken, HTML attributes, `cites`/`chol` on later verse chunks, extra `GAP_CUT`).

r2 keeps one TTS part per verse, Rashi paragraph, or biur item. Display is wrapped into ~2-line `.hl-chunk` spans at the lemma (`וגו` plus its trailing punctuation) and sentence/clause punctuation, never inside parentheses, and only by wrapping text nodes (inline elements such as `.lbl` / `.gl` are not extracted). After `pauseChunks(prepared)`, `followPauseChunks` slices the already-prepared text onto those display chunks. Concatenation equals the prepared string; new mid-chunk slices have gap 0, so original sentence pauses stay where `pauseChunks` put them. The size setting and `.hl-now` enlargement are unchanged. Contrast ink also covers `.hl-now .gl::after` and Omer cells. `currentWrongEntry()` restores the live highlight after it rebuilds segments.

## t362u r3 — clear the previous segment's highlight

Round-2 review (HOLD 5.0 / harmful=1) found that `applyHlNow(id, el)` only cleared `.hl-now` inside the new segment, so earlier segments stayed highlighted and enlarged, and `document.querySelector('.hl-now')` hit the stale first chunk.

r3 always clears `.hl-now` on the whole document first. Paint and enlargement CSS for `.hl-now` are also scoped under `.speaking`. Punctuation-only followCuts tails (for example a leftover `.`) are merged into the previous slice so concatenation stays identical and Web Speech does not get a too-short utterance. The follow target prefers a node that is not `.sr`. Piper skip while paused now passes the queue item so the highlight can update.

## t362u r4 — read speech from an unwrapped clone

Round-3 review (HOLD 6.0 / harmful=1) found that a second `ttsSegments()` on an already-wrapped DOM (TTS setting restart, or `currentWrongEntry`) changed spoken text: `vowelHeadword()` no longer matched Rashi `<b>` once an `.hl-chunk` was nested inside it, so headwords lost verse vocalization, and the verse HTML fallback could stop at an inner `</span>`.

r4 reads `ttsHtml` and `vowelHeadword` from `cloneWithoutFollowChunks(el)`, which unwraps follow-chunk wrappers on a clone and leaves the live highlight DOM alone. The spoken part text on a later `ttsSegments()` call is therefore the same as on the first play. `ttsSpeakSize` and turning the highlight back on also re-run `layout()` in `pages` mode when the text is enlarged.
