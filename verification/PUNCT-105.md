# 1.0.105 – partial displayed punctuation (Torah Or / Likkutei Torah)

After three official external-review rounds (gpt-5.4) on the same 1,032-item sample, the source average stayed at or below 9.5. Dudi approved deploying only units that individually scored above 9.5, and leaving the rest unchanged.

| Round | Official / hybrid average | Sample n | Units with score > 9.5 |
|---|---:|---:|---:|
| r1 | 8.673 | 1032 | 129 |
| r2 (mechanical cleanup + compact re-review) | 8.991 | 1032 | 167 |
| r3 (conservative Haiku rewrite of lows + compact re-review) | 9.101 | 1032 | 189 |

189 units passed the bar (min 9.6, max 9.8). 187 of them received added clause punctuation in the displayed text (`t`). Two already matched the original wording and were left as they were. Unreviewed paragraphs and anything scored 9.5 or below are unchanged. Letters and niqqud are identical to the pre-punctuation text (`tests/punct-identity-105.test.mjs`). `say` was updated only when its letters already matched `t` (140 transferred, 47 left unchanged). The paragraph letter-hash `h` was recomputed only on the 187 changed vocalised paragraphs, as sha1 of the new display text with niqqud removed, so `tests/tolt-niqqud.test.mjs` still checks consistency. The 1.0.81 frozen source-hash test now ignores clause punctuation and `h`, and still protects letters and niqqud of all 8,148 passages.
