# 1.0.201 — accept VERSION 1.0.200+ in historical bump checks

Job commentary niqqud is already in 1.0.200 (`c6fa15f6`, DATA_VERSION `bc38becf4f3d`). GitHub Pages for that commit failed twice (`45113840744`, then a fresh `pages.yml` `45115700150`) on the same four tests, both times including the workflow's built-in retry:

- `tests/havara-191.test.mjs` — `/VERSION = '1\.0\.(9[1-9]|1\d\d)'/`
- `tests/pitch-192.test.mjs` — `/VERSION = '1\.0\.(9[2-9]|1\d\d)'/`
- `tests/shin-vav-187.test.mjs` — `/VERSION = '1\.0\.(8[7-9]|9\d|1\d\d)'/`
- `tests/voice-choice-188.test.mjs` — `/VERSION = '1\.0\.(8[89]|9\d|1\d\d)'/`

`1\d\d` matches 100–199 only, so `const VERSION = '1.0.200'` failed. This is not a data or niqqud-gate issue. Local `npm test` for 1.0.200 ran before the version bump (standing order) and therefore did not catch it. Each lower bound is unchanged; `1\d\d` is widened to `[1-9]\d\d` so 1.0.200–1.0.999 still count as "version bumped" after the original feature. No `site/data` changes; DATA_VERSION stays `bc38becf4f3d`. Shell VERSION is 1.0.201.
