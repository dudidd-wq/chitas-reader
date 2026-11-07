# Taamey Ashkenaz — 1.0.70

Additional `ashkenaz` font choice, Hebrew label טעמי אשכנז. Default remains `noto`; existing font assets and their rules are unchanged. Original Culmus Medium (weight 500, mapped to normal body text) and Bold (700, for existing bold content) are packaged losslessly as WOFF2, without subsetting, widening, outline editing, or stripping metadata. Body text uses Medium; no new bold styling was introduced.

Author: Yoram Gnat, copyright 2012–2014. Source: https://culmus.sourceforge.net/taamim/index.html (Taamey-Ashkenaz package). Original GPLv2 text and embedding exception are beside the fonts and precached. Credit and source link are on the sources page.

## Verification

- `python3 tools/verify-taamey.py`: scans recursively all string values from Torah (including Rashi), Tehillim, Tanya, and siddur JSON; strips markup and decodes entities. 186 unique codepoints. All Hebrew letters, niqqud U+05B0–U+05C7 and taamim U+0591–U+05AF are present in both weights.
- Five non-Hebrew symbols intentionally use the explicit Noto fallback: U+00A7 §, U+00AF ¯, U+2013 –, U+2014 —, U+2026 …. U+202A/U+202C are non-rendering bidi controls. No unexpected missing characters. Counts: TAAMEY-ASHKENAZ-COVERAGE.json.
- GPOS (including mark-to-base and mark-to-mark), GSUB, hmtx and name metadata are byte-identical to the original TTF. WOFF2 re-encodes glyf storage; decomposed outline drawing commands are identical for all 358 glyphs per weight. Source hashes and table checks: TAAMEY-ASHKENAZ-CONVERSION.json.
- Browser regression checks font picker, unchanged default, persistence, taamim retained, and Chromium's actual platform-font report at 390px and 1280px (no fallback in the inspected vocalized Chumash passage).
- Fonts and both license files are in the service-worker shell precache.
- `npm run data-version` regenerates DATA_VERSION correctly. The data content is unchanged, so its content hash remains `f0e113105381`; only the shell VERSION bumps to 1.0.70. Artificially changing the data hash would fail the invariant tests and unnecessarily evict cached text.
