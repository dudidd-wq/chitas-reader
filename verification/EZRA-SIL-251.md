# Ezra SIL 2.51 (full official font) and per-font coverage table

Approved in t328u: replace the subset `site/fonts/EzraSIL.woff2` (0/31 taamim) with the official SIL Ezra font, and state precisely in the settings font table what each family includes.

## Font source

- Official package: [Ezra SIL 2.51](https://software.sil.org/ezra/), final release (4 Oct 2007); web package 16 Jun 2015.
- Download: `https://software.sil.org/downloads/r/ezra/EzraSIL-2.51.zip` (SHA-256 `f16bcb3ec4473ac6a9f138ee0dbde7cc2f835e93a90cbe8649b3f32677760cc1`) and the matching web package `EzraSIL-2.51-web.zip` (SHA-256 `7c19544c173c91e6ac47f605dae2cfa7e61e428abdafe27cf3f225fec4406357`).
- Source face used: official `SILEOT.ttf` (Ezra SIL, not Ezra SIL SR). SHA-256 `53c98ab95d2b5bd615527cdd05da42d7dd77f2690b79c043e9f90753d4930dce`.
- Shipped file: `site/fonts/EzraSIL.woff2`, a WOFF2 format conversion of that TTF with fontTools 4.65.0. No subsetting, no outline or naming changes, so the Reserved Font Names "SIL" and "Ezra" are kept. Size 45,204 bytes. SHA-256 `57c96c7dc045def72e0447ec7e9b64614f9dd93aeab482fffc4e242b265194f3`.
- License file `site/fonts/licenses/EzraSIL-OFL.txt` is byte-identical to official `Licenses.txt` (OFL 1.1 + MIT/X11 for Hebrew layout intelligence).

The previous site file was a subset of version 2.51 with 0/31 cantillation glyphs (U+0591–05AF) and 24 niqqud/marks. Official coverage: all 31 taamim, all 24 codepoints U+05B0–05C7, maqaf, paseq, sof pasuq, nun hafukha, geresh/gershayim, 38 presentation forms in U+FB1D–FB4F, and GPOS lookup types 4 (mark-to-base), 6 (mark-to-mark) and 8 (extension). Regular weight only; bold in the app is synthetic.

## Behaviour

`ezra` was removed from taamim-hiding logic (`setPref` on font change, the Tanakh strip list, settings help, and Sources credits). Frank Ruhl Libre, David Libre and Assistant still hide unsupported taamim. Selecting Ezra no longer turns the global taamim preference off.

## Settings table

The details block under the font picker is an RTL table (stacked labeled rows under 560 px) whose cells were filled from `tools/font-coverage.py` against the actual delivered files, including lazily loaded families:

| Family | Niqqud | Taamim | Rashi script | Bold | License |
|---|---|---|---|---|---|
| Noto Serif Hebrew | full 20/20 | full 31 | no | synthetic (regular only) | OFL 1.1 |
| Ezra SIL 2.51 | full 20/20 | full 31 | no | synthetic (regular only) | OFL 1.1 |
| Frank Ruhl Libre | partial: missing U+05C4, U+05C5; also no nun hafukha | none | no | real variable 300–900 | OFL 1.1 |
| Taamey Ashkenaz | full 20/20 | full 31 | no | real Medium + Bold | GPLv2 + embedding exception |
| SBL Hebrew | full 20/20 | full 31 | no | synthetic (regular only) | SBL, non-commercial |
| Noto Rashi Hebrew | full 20/20 | full 31 | yes | real variable 100–900 | OFL 1.1 |
| Taamey D | full 20/20 | full 31 | no | synthetic (Medium only) | GPLv2 + embedding exception |
| Keter YG | full 20/20 | full 31 | no | synthetic (Medium only; native Bold omitted, empty taamim) | GPLv2 + embedding exception |
| David Libre | partial: missing meteg U+05BD | none | no | real Regular + Bold | OFL 1.1 |
| Assistant | partial: missing meteg, U+05C4, U+05C5; also no nun hafukha | none | no | real variable 200–800 | OFL 1.1 |


## External review

Independent review via `agy` / `gemini-4-hydrogen-high` on PC X1XG2-N.

Round 1 (stale pre-`dir="ltr"` screenshots still in the packet, and mobile `display:flex` on `td` would split the LTR span): score 8.5, 1 harmful (unverified reversed ranges). Not shipped.

Fixes: wrap every table value in a single `.font-cov-val` span so the LTR range is one flex item; retake screenshots.

Round 2 (post-fix screenshots): **score 9.8, harmful_errors 0, ship yes.** Genesis 1 in Ezra shows full niqqud and taamim with clean GPOS placement at 1100px and 390px. Table ranges render as 300–900 / 100–900 / 200–800, not reversed. Phone table stacks into readable RTL cards. One non-blocking note: muted hint text on the selected (brown) font card had low contrast; CSS now inherits the selected label color for `.font-hint`.

`npm test`: 704 passed before the wrap/contrast follow-ups; focused `tests/font-coverage.test.mjs` passed after them.
