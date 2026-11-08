# Hayom Yom display niqqud — 1.0.84

User-requested display-only option, **הצג ניקוד בהיום יום**, enabled by default for new and existing installations. Location: Settings → תצוגה → היום יום; also the reader's Aא display sheet, same section. Explicit false persists through reload/backup; malformed values revert to the default true.

The display reuses the existing 1.0.77 Dicta/curated read-aloud layer (no new API requests, data rebuild or voice download). It removes ole/U+05AB and all other cantillation/stress controls, meteg/U+05BD, internal bars and invisible directional/control marks. Standard niqqud including dagesh, shin/sin dots and qamatz-qatan remains. Source HTML tags, whitespace, line breaks, outer italics, paragraph structure, navigation headings, source links and Kehot/ChabadText credit are retained. Small speech-layer spelling adjustments (e.g. כונת → כוונת) are inherited in pointed mode; off mode uses the exact original source/display path.

A grapheme-level alignment maps inline tag boundaries through existing speech spelling changes (including bold initial-letter mnemonics). If a future paragraph loses word alignment, fall back to its source HTML rather than scramble it. All current **383 entries / 660 paragraphs** align and display niqqud, with identical original HTML-tag and whitespace sequences and no speech-control artifacts. The new module is included in the service worker offline shell.

The original `b.text` and `b.say` data remain untouched. Actual Web Speech preparation and local Piper queues (including primary-stress metadata) are byte-for-field identical with the display option on/off. Hayom Yom search uses the unchanged consonant-normalized index and returns identical results for pointed/unpointed queries. All four bundled font options were browser-tested with pointed display. Browser tests also cover live switching, persistent off state, invalid/legacy preference defaults, daily/library routes, inline bold and source credit.

The old generic “not vocalized / no licensed source” notice is replaced in pointed mode by an accurate Dicta automatic-niqqud disclaimer; off mode keeps the old display path. The automatic niqqud is **not fully human-proofread**, particularly Yiddish/Aramaic and names.

Screenshot (today, 28 Cheshvan / 2026-11-08): `/workspace/chitas-hayomyom-niqqud.png`.
Data version remains **55357ccfc01e**: this is an app-shell/display release; original corpus and speech data are unchanged. Live verification checks sw.js version/data version, manifest, exact deployed JS bytes and all 383 Hayom Yom entries; evidence at `/workspace/chitas-184/live-verification.json` after deployment.

Validation: **399/399 tests passed** with `npm test`, including all four new display regressions; `git diff --check` passes. Font cmap inspection additionally confirms all standard niqqud characters U+05B0–U+05BC, U+05C1/U+05C2/U+05C7 exist in each of Noto Serif Hebrew, Frank Ruhl Libre, Ezra SIL and Taamey Ashkenaz. Screenshot inspected: pointed text and original source credits render without internal stress artifacts.
