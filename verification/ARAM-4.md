# 1.0.132 – conservative Bavli Aramaic stress lexicon (ARAM-4)

Speech layer only: 125 exact pointed Aramaic forms, enabled for Bavli Gemara outside Mishnah and quotations.
6,766 addition-only U+05AB stress tags in 3,212 `gemara/bsay` files (3,284 audible Israeli tokens). Display text,
Yerushalmi, Onkelos, Tanya, Torah Or, NPS1, Metzudat David, shva gates, Chabad pronunciation and the 12 Yerushalmi
אדרבה strings are untouched. Chabad IPA changes: 0.

Fail-closed: Hebrew-corpus homographs, the כּוּלָּא/כּוֹלָּא family, מִילֵּי/מִלֵּי, split-tradition forms, already-stressed
tokens (no relocation), quotation/bracket interiors, unpaired or malformed quotes, opening single quotes (gershayim and
word-final geresh are not quote delimiters). Far fewer than ~500: 1,345 frequent candidates were excluded.

Independent review (fresh Claude Code session on X1XG2-N; Codex was occupied by mafteiach-ls; Gemini CLI auth was
ineligible). Round 0: 8.5 because the cache patch was hashed on a CRLF tree. Fix round 1 regenerated
`aram4-cache.patch` on an LF tree. Round 1: **9.6 SHIP** (S1 9.6, S2 9.7, S3 9.7, S4 9.7, S5 9.6; 0 confirmed errors).
DATA_VERSION **7f93a4ea40e9**; `search/shards.json` remains `83fbcf00d3c3614c`. Packets: `engine-aram-4\`,
`engine-aram-4-review\`, `engine-aram-4-fix\`, `engine-aram-4-fix-review\`.
