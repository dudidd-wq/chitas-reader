// Live highlight of the segment currently being spoken in the reader (t361u).
// Word-level tracking is not used: Web Speech onboundary is uneven for Hebrew,
// Piper has no word timestamps, and the speech string (prepareForTTS) is not the displayed HTML.

export const FOLLOW_PAUSE_MS = 4000;

/** Auto-follow only when the toggle is on and the user has not just scrolled by hand. */
export function shouldFollow({ enabled, now = Date.now(), pausedUntil = 0 } = {}) {
  return !!enabled && !(Number.isFinite(pausedUntil) && now < pausedUntil);
}

export function nextPauseUntil(now = Date.now(), ms = FOLLOW_PAUSE_MS) {
  return now + ms;
}
