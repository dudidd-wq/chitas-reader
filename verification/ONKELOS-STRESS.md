# Onkelos conservative speech stress — Torah-verse-aligned packet

Speech-only ole (`U+05AB`, HATAMA) on Onkelos `say`, using the same fail-closed biblical unique-milel lexicon as Mishnah 1.0.216 and commentary 1.0.218 (minCount 5, k ≥ 1, `זָרַע` blocked, «לאו» and prefixed «לאו» never stamped). Display `t` stays byte-identical. Existing 1,310 ole marks already in `say` are left untouched.

Because Onkelos is Aramaic with Yemenite-Taj vocalization, a lexicon hit is stamped only when its `stressKey` also appears as a word in the parallel Torah verse (`torah/<book>/<chapter>.json` field `v`, same verse index). A raw lexicon pass would have yielded 270 tokens / 35 forms / 86 pages; the safer aligned set is **196 tokens / 29 forms / 75 pages**. Six raw forms never occur as a free word in the parallel verse and are left unstamped: `עֵבֶר` (6), `כְּנַעַן` (2), `עֵשֶׂב`, `יֶתֶר`, `צֶדֶק`, `חֵלֶק` (1). Seventy-four token occurrences were rejected as unaligned even when the form is sometimes aligned elsewhere.

Dudi approved a full review of every change in this packet (24/11/2026), with the same production gates: overall strictly above 9.5 and explicit `harmful_error_count = 0`. At most two exact-only rounds.


## Shipped as 1.0.220

External review (fixRound 0, agy `gemini-4-hydrogen-high`): SHIP, overall **9.9** (S1=9.9, S2=10.0, S3=10.0, S4=9.9, S5=9.9), explicit `harmful_error_count = 0`, `non_harmful_error_count = 0`, full review of all **196** changed tokens and all **29** forms, plus 200 unchanged controls. `recommended_exact_only_removals` was empty. DATA_VERSION `9b79d15c3e8d`.

Yield: **196** speech tokens, **29** forms, **75** pages. Display `t` unchanged (0 ole). Existing **1,310** ole marks in `say` kept; `say` now has **1,506** ole. One ARAM-4 Onkelos identity row was retargeted mechanically (59 of 60 unchanged). The raw unaligned 270-token set was not shipped.
