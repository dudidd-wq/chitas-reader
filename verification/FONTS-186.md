# Six optional reading font families — 1.0.86

Explicitly approved choices: Noto Rashi Hebrew, Taamey D, Keter YG, Cardo, David Libre, Assistant. Added after all five existing choices; Noto Serif Hebrew remains the default. No text corpus, niqqud data or voice changes. There is no existing separate Rashi-font preference (only show/hide Rashi), so no new section-specific default was introduced: the chosen general font applies to Rashi as well.

| Family | Delivered font bytes | Bold | Cantillation | License |
|---|---:|---|---|---|
| Noto Rashi Hebrew | 53,696 (52.4 KiB), variable WOFF2 100–900 | real variable 700 | all 31 | OFL 1.1 |
| Taamey D 1.2 | 55,572 (54.3 KiB), original Medium TTF | CSS synthetic (only Medium shipped) | all 31 | GPLv2 + font-embedding exception |
| Keter YG | 107,084 (104.6 KiB), original Medium TTF | CSS synthetic; native Bold deliberately excluded (empty taamim) | all 31 | GPLv2 + font-embedding exception |
| Cardo | 147,820 + 134,464 = 282,284 (275.7 KiB), regular/bold WOFF2 | real Bold | all 31, regular and bold | OFL 1.1 |
| David Libre | 51,500 + 54,704 = 106,204 (103.7 KiB), regular/bold WOFF2 | real Bold | none | OFL 1.1 |
| Assistant | 39,412 (38.5 KiB), variable WOFF2 200–800 | real variable 700 | none | OFL 1.1 |

All shipped faces have visible outlines for all 16 tested niqqud signs, including qamats qatan. Local FontTools outline audit also checks both 400/700 variable instances and native bold files, not just cmap membership (`/workspace/chitas-186/glyph-audit.json`). OFL files are full-font WOFF2 packaging only, without subsetting, outline or naming changes; copyright and RFN/license notices retained. GPL TTFs are byte-identical to their original downloads and pinned by SHA-256 in regression tests.

## License and corresponding-source compliance

Every new font folder contains its original OFL or GPL/exception notices; the two GPL folders additionally contain the complete GPLv2 text. Sources → גופנים credits authors and links licenses and upstream. `font-sources/` in the same public repository contains the complete original Keter YG distribution (SFDs included) and the exact Taamey D 1.2 corresponding-source archive (sources and build scripts), with upstream immutable URLs and explanatory README. That directory is linked prominently from the Sources page. These source archives are not included in PWA precache.

## Loading and preferences

The service worker's ASSETS array is exactly unchanged from 1.0.85 (SHA-256 of its array text: `39f257e38eb911f486626b83087eb69a80c1d4ec6ccc75ad18135122eb23a097`). No new font is requested on a default reading visit. Showing real previews loads used faces; selection additionally stores all family faces and licenses in persistent `optional-fonts-v1`. Thus switching to bold offline works even if bold was not used before going offline. Page-side caching covers first visits before SW control; SW cache-first serving covers offline reloads and survives shell updates.

David Libre and Assistant are labeled **ללא טעמים**. They show all niqqud but suppress unsupported cantillation in Tanakh rather than silently mixing another font into combining marks. Unlike the legacy Frank/Ezra selection behavior, selecting these two does not change the user's global taamim preference; returning to a capable family restores accents according to that preference. Speech source data is untouched.

## Verification

Nine new regressions cover original hashes, corresponding-source archives, adjacent licenses, no eager font requests, eleven unique real previews, actual Chromium custom-font glyph usage via CDP in Siddur, Chumash, Rashi, Tanya and vocalized Hayom Yom for all six fonts; real Cardo/David Bold faces, visible weight difference for every font, retained Chumash taamim under bold; and actual SW-controlled offline switching/reload of all six families including bold faces and licenses. Assistant's variable font exposes legacy family name “Assistant ExtraLight” in CDP even at different CSS weights; its typographic family is Assistant and the weight axis remains intact.

Existing picker regression expects eleven instead of five options. Screenshots are optional local artifacts via CHITAS_FONT_SHOTS, never mandatory absolute CI output paths.

Screenshots: `/workspace/chitas-fonts-picker.png`, `/workspace/chitas-fonts-new.png`. The latter uses verse HTML extracted from the actual local reader per chosen font, with the app's CSS and delivered font assets, displaying both normal and bold. The two no-taamim families are explicitly labeled and show the same accent-stripped niqqud text as the app.

DATA_VERSION remains **55357ccfc01e**. Live verification evidence: `/workspace/chitas-186/live-verification.json` after deploy. Font assets + licenses, app/CSS, sw.js and data manifest are compared byte-for-byte to the release. The public corresponding-source archives are also fetched and compared.

Full `npm test`: **411 passed, 0 failed, 0 skipped**. Focused browser/license regression subset also passes.
