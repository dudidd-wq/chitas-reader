# 1.0.107 – partial displayed punctuation (Pnei Moshe)

After two official external-review rounds (gpt-5.4) on a compact 300-item sample (180 random, 80 longest, and the heaviest punctuation), the source average stayed at or below 9.5. Dudi approved deploying only units that individually scored above 9.5, and leaving the rest unchanged.

| Round | Official / hybrid average | Sample n (scored) | Units with score > 9.5 |
|---|---:|---:|---:|
| r1 | 9.170 | 300/300 | 85 |
| r2 (mechanical HTML tag-position cleanup + compact re-review of 88 lows; stopped at the ~$4 OpenAI cap) | 9.244 | 300 hybrid | 90 |

90 comments received added clause punctuation in the displayed Pnei Moshe text. Unreviewed comments and anything scored 9.5 or below are unchanged. Letters and niqqud are identical to the pre-punctuation text (`tests/punct-identity-pnei.test.mjs`). Speech (`gemara/ysay` `say`) was updated only when its letters already matched the comment (67 transferred, 23 left unchanged).
