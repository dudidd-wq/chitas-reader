# 1.0.102 – partial displayed punctuation (Rambam, Sefer HaMitzvot)

After six external review rounds (gpt-5.4, same 770-item hard-case sample), neither source cleared an average above 9.5. Dudi approved deploying only units that individually scored above 9.5, and leaving the rest unchanged.

Best official average per source:

| Source | Best round | Average | Sample n | Units deployed (score > 9.5) |
|---|---|---:|---:|---:|
| Rambam | r6 | 9.287 | 719 | 334 |
| Sefer HaMitzvot | r5 | 8.996 | 50 | 6 |

Unreviewed paragraphs and anything scored 9.5 or below are unchanged. Letters and niqqud are identical to the pre-punctuation text (`tests/punct-identity-202.test.mjs`, snapshot `verification/punct-identity-202.json`). A few `say`/`vd` transfers were skipped where those fields already differed in letters from `s`.
