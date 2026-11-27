# A6 — stress lexicon and qamatz katan from Nach (and Biblical Aramaic)

Production change: rebuild `site/voice/stress-he.json` (and the `?v=` hash in `site/js/voice-files.js`). Display text is unchanged. The suffix model is unchanged (812 endings, Torah + Tehillim only). Exceptions are unchanged (187).

## Why this is conservative

A full suffix refit on Nach raised held-out Torah/Tehillim accuracy, but it also flipped common rabbinic words that barely appear in Tanakh (`אֶלָּא` default milra → milel, `אֲפִלּוּ`, `לְפִיכָךְ`). Those flips are not shipped.

Shipped instead:

- **Suffixes:** still fitted only on Torah + Tehillim. Confirmed byte-identical to 1.0.234 (`suf` size 812).
- **Lexicon:** 797 → 1291. New keys come from consistent Nach (and Daniel/Ezra Aramaic) forms whose gold stress from te'amim disagrees with the existing suffix/default, with at least two agreeing occurrences and no tie. When a key already occurs in Torah/Tehillim, those counts win. Dropped on purpose: `מְבָרֵךְ` (Isaiah milel vs Proverbs milra, 1–1) and hapaxes such as Daniel `מַנִּי` (would have flipped Gemara "who?" from milel to milra) and Ezekiel `מוֹצָאֵי`.
- **Qamatz katan:** 519 → 662. Every Torah/Tehillim entry is kept even if a Nach verse writes the same key with a regular qamatz (that would otherwise have dropped חָכְמָה). Nach-only keys need at least four letters, at least two marked occurrences, must not be maqaf-joined, and must not be the stem of a form that appears with a regular qamatz (so חָרָבָה cannot turn Torah בֶּחָרָבָה / לֶחָרָבָה into choravah, and אֲמָר cannot turn מַאֲמָר into "ma'amor").
- **`nach/Psalms`:** skipped so the Tehillim edition is not mixed with the Nach copy (the two sets are not identical).
- **`he_lexicon.tsv`:** not imported.

## Held-out accuracy (te'amim gold, `allowOle: false`)

Torah ↔ Tehillim cross-eval is unchanged (suffixes unchanged): 93.3% / 93.7%. In-sample Torah+Tehillim stays 99.6%.

| Test | Baseline (TT only) | Conservative (this ship) |
|---|---|---|
| All Nach | 96.7% (n=158,990) | 98.1% in-sample |
| Daniel + Ezra | 94.9% (n=7,570) | 97.5% in-sample; 95.4% when Daniel, Ezra, Isaiah and Jeremiah are held out; LOO Daniel 95.7%, LOO Ezra 96.5% |

Decision-source: only repeated, consistent Nach forms become `lex` hits. The tts-eval golden snapshot is unchanged (0 diffs): the two sample words that a hapax lex would have flipped (`מוֹצָאֵי`, `מַנִּי`) are not in the shipped lexicon.

## Unaccented corpora

Flips are only exact new lex keys with two or more agreeing te'amim (suffixes identical). `אֶלָּא` / `אֲפִלּוּ` / `אֵלּוּ` / `לְפִיכָךְ` / `מַנִּי` unchanged. Frequent justified examples: `מַחֲשָׁבָה` milel→milra, `עֵצָה` / `בִינָה` milel→milra, `צֶמַח` / `עֹנֶג` milra→milel, Biblical Aramaic `עֲלוֹהִי` and `אָסְפַּרְנָא`.

## Cache

`stress-he.json` grew 48 KB → 62 KB (63,573 bytes in Round 4). Voices keep using `?v=` (now `c0aaec0a3b1d`); the file is not in the shell/data cache, so `DATA_VERSION` is unchanged.

## Frozen IPA fixtures

`tests/fixtures/aram4-identity.json` (27 Israeli IPA rows) and `aram4-builder.json` (Berakhot 39a Israeli IPA) were retargeted mechanically. Speech text and say hashes are unchanged. Chabad IPA is unchanged. The Israeli changes are the intended lex/qk updates (`כָּתַב` milra, `מַחֲשָׁבָה` milra, `רָצָה` milra, `יָלָדָה` milel, `נֶהִי` milel, and qamatz katan on `אָמְנָם`, `חָכְמְתָא`, `מָתְנֶיהָ`, `לְעָבְדוֹ`, `מִגָּרְנְךָ`, `כְּיָרָבְעָם`, compounds of `חָכְמָה`). `מַאֲמָר` is unchanged.
The ENGINE-COV-1B manifest pin for `site/voice/stress-he.json` was updated to the new content hash (`c0aaec0a3b1d…`). The 158 frozen gold IPA values still match; `site/js/g2p.js` is unchanged.

## Round 2 (after the 7.5 HOLD)

The first external review (agy, gemini-4-hydrogen-high) scored overall 7.5 with 7 harmful errors. All seven now match 1.0.234 again:

- Qamatz katan: `חָרָבָה` (and prefixed `בֶּחָרָבָה`, `לֶחָרָבָה`, `הֶחָרָבָה`, `וְחָרָבָה`) stays *charavah*; `בִּקְרָב` stays *biqrav*; `עָזְבָה` stays *azvah*.
- Lexicon: `לְהִנָּתֵן`, `וְיִנָּתֵן`, `עֹשֵׁק`, `בָּגְדוּ`, and `כְּלִילַת` are not forced to nesiga milel.

Guards added in the builder only (`site/js/g2p.js` still unchanged): skip nesiga (including a following monosyllable) when fitting Nach lex; skip maqaf-joined tokens, keys shorter than 4 letters, hapax marks, and stems of a regular-qamatz prefixed form when adding Nach qk. `cleanVerse` was left with tag-stripping to `''` because tags often wrap a first letter (`<big>מִ֭</big>שְׁלֵי`); replacing them with a space would split words.

Intended improvements kept: `מַחֲשָׁבָה`, `כָּתַב`, `צֶמַח`, `עֲלוֹהִי`, `אָמְנָם`, `חָכְמָה`.

## Round 3 (after the 9.0 HOLD)

The second external review (agy, gemini-4-hydrogen-high) scored overall 9.0 with 1 harmful error. All Round 1 items still match 1.0.234. The remaining error:

- Lexicon: `טָעַם` had been added as milel from the Proverbs noun "sense" (and would also have been fed by the same CāCaC-milel class: place-name `גָּעַשׁ`, noun `רָחַם` "womb", noun `קָמַח` "flour", name `תָמַח`). That forced the common unaccented Hebrew 3ms Qal `טָעַם` ("he tasted", I Samuel) from milra `taʔˈam` to milel `tˈaʔam`.

Guard added in the builder only (`site/js/g2p.js` still unchanged): Nach-only CāCaC (qamatz+patah, three letters) milel is not added to the lex. Milra CāCaC such as `כָּתַב` is still added, because it corrects a suffix-model miss. Biblical verses keep their te'amim at runtime.

Lexicon is 1,286 (five CāCaC-milel keys dropped from the Round 2 set of 1,291). `?v=` is `b6183da703fa`. Intended improvements still kept: `מַחֲשָׁבָה`, `כָּתַב`, `צֶמַח`, `עֲלוֹהִי`, `אָמְנָם`, `חָכְמָה`.

## Round 4 (after the 9.2 HOLD)

The third external review (agy, gemini-4-hydrogen-high) scored overall 9.2 with 1 harmful error. All Round 1 and Round 2 items still match 1.0.234. The remaining error:

- Lexicon: `פַּחַת` and `פַחַת` had been added as milra from the Nach/Aramaic construct "governor of" (Haggai, Ezra, Nehemiah: פַּחַת יְהוּדָה / פַּחַת מוֹאָב). That forced the common unaccented Hebrew segolate noun `פַּחַת` ("pit / depreciation", suffix milel `pˈaχat`) to milra `paχˈat`.

Guard added in the builder only (`site/js/g2p.js` still unchanged): Nach-only CaCaC (patah+patah, three letters) milra is not added to the lex. Milel CaCaC such as `זַעַם` and `רַעַשׁ` is still added. Biblical verses keep their te'amim at runtime.

Lexicon is 1,283 (three CaCaC-patah milra keys dropped from the Round 3 set of 1,286, including `הַעַל`). `?v=` is `c0aaec0a3b1d`. Intended improvements still kept: `מַחֲשָׁבָה`, `כָּתַב`, `צֶמַח`, `עֲלוֹהִי`, `אָמְנָם`, `חָכְמָה`.
