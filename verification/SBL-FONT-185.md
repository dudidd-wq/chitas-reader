# SBL Hebrew font option — 1.0.85

User-approved addition, non-default. All existing fonts and the default Noto selection remain unchanged. New picker option: **SBL Hebrew**, with a real-font live preview. Sources → גופנים credits Society of Biblical Literature, John Hudson / Tiro Typeworks and links the original EULA plus all embedded copyright/license notices. This font has its own non-commercial SBL license, separate from application code GPL; no conversion/subsetting was performed.

Original official asset: https://www.sbl-site.org/wp-content/themes/basket/fonts/bib-fonts/SBL_Hbrw.ttf . File size **315,092 bytes**, SHA-256 **98eca8ecc97af984e205c282d6a0e994af41612029e49a223e85677b71cf9e99**. Original official EULA PDF accompanies it in `site/fonts`, as does `SBL-LICENSE.txt` with the embedded copyright and complete license (including MIT for layout logic only). Editable-embedding bits unchanged. No WOFF/WOFF2 or subset SBL is shipped.

SBL supplies Regular only. CSS synthetic weight/style allows the app's existing bold toggle; this is disclosed in the picker and sources. Taamim remain visible with SBL (unlike the existing Frank/Ezra display rule). No source text, speech metadata, voice asset or DATA_VERSION changes.

Loading: the SBL file is excluded from service-worker install precache and is not requested on a default reader visit. It is downloaded when selected **or when its live preview is shown** (the unavoidable tradeoff for a real-font preview instead of a static image). On selection, page-side CacheStorage explicitly stores the font and its complete license, even on a first visit before SW control. The SW serves these from persistent `optional-fonts-v1`, which survives shell updates. No installation as a system-wide device font.

Three new tests: original SHA/default unchanged/no eager precache; actual Chromium picker, Siddur/Chumash with accents, live synthetic bold and persistent selection; real service-worker-controlled reload offline with SBL. Existing font-picker regression now expects five options instead of four. Screenshots: `/workspace/chitas-sbl-picker.png`, `/workspace/chitas-sbl-page.png`.

App version **1.0.85**. DATA_VERSION remains **55357ccfc01e** (corpus unchanged). Verification script compares live sw.js, app/CSS, exact original TTF, EULA PDF and full license, manifest and Hayom Yom data; evidence `/workspace/chitas-185/live-verification.json` after deploy. The separate multi-font research is local-only at `/workspace/hebrew-fonts/REPORT.md`; none of those extra candidates are added here.

The older blanket no-PDF tests for copyrighted lesson calendars now allow exactly the official SBL EULA PDF path; the new test pins its exact official SHA-256. No lesson/source PDF prohibition was otherwise relaxed.

Full `npm test`: **402 passed, 0 failed, 0 skipped** (including actual Chromium rendering and real SW-controlled offline SBL reload).

CI portability: screenshots are local verification artifacts, not absolute-path writes in regression tests. The initial Pages job exposed a `/workspace` output-path assumption (401/402); those screenshot writes were removed. Hash navigation also explicitly waits for the new Chumash text, rather than accepting stale Siddur DOM; font/cache assertions and app assets are unchanged.
