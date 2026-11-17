# NPS1 חוקיות — conservative source-punctuation transfer

This policy applies only to imported phrase marks in the Chabad Bavli speech sidecar. It does not edit displayed texts or base speech. The executable specification is `candidate/site/js/bavli-nps1-rules.js`; both compiler and runtime call its `boundaryContext` and `boundaryDecision`. Runtime re-derives the evidence rather than trusting a stored rule label. The existing exact-witness vowel machinery remains tested, but this pinned production build emits **zero niqqud fills**.

## Definitions and decision order

Offsets are UTF-16 offsets. A word is the existing Hebrew-letter token, including its vowel/stress marks; classification removes everything except א–ת. No final-letter folding, spelling repair, synonym matching or inferred vowels are used. Formula recognition is literal token matching. Every listed entry accepts any leading sequence of **ו/ד/ש/כ/ה** on each of its words. Examples: ואלא, דאילו, ושמא, כאילו, האי, וכדקאמר. Homographs are protected conservatively, not disambiguated by guessing. An isolated ordinary word that can also be part of a multiword formula is not automatically that whole formula.

The quotation map requires complete commentary/speech consonantal identity, well-formed supported `<b>`/`<small>` markup and entities, and unique monotonic source matches for uninterrupted bold quotation runs of at least two words. An initial proposed edit requires two adjacent mapped source/speech words, whitespace-only target gap, and exactly one source phrase mark from **`, ; : — –`**, surrounded only by whitespace. These eligibility checks are C1. Source punctuation already present in speech does not propose an edit. Unmapped gaps and absent source marks likewise are not dropped edits: they never establish a transferable operation.

For each proposed operation, run **C1 → C2 → C3 → C4 → C5 → C8 → C6 → C7**. The first rejecting rule owns the diagnostic. C4 can supply positive evidence but does not bypass later checks. Source-order evaluation is deterministic; accepted earlier operations count as neighboring marks and participate in the pause plan. Runtime validates the complete list before replay; any rejected operation returns the entire original speech string. Profile/corpus/schema/stale-base bypasses likewise preserve the original string.

`build.json` records every rejected proposed operation with rule ID, reason, coordinates and source provenance. `rule-audit.json` separately accounts for **every removed fix2 edit**, which is the before/after denominator. It also gives the larger compiler-candidate denominator, including operations already suppressed by fix2. Those are different counts, not missing edits.

## Numbered rules

**C1 — Source, quotation and provenance gate.** Never invent a mark. Require an interior zero-length insertion, empty `before`, one approved source phrase mark, exact source token index/text/start/end and exact source-gap text/start/end, adjacent quotation mapping, and whitespace-only speech gap. Runtime checks these against the sidecar's full source and commentary. Invalid/missing evidence fails closed. Existing source/commentary/base identity checks at document assembly remain active. Questions, full stops, ellipses, compound marks and quote-boundary transfers are excluded regardless of literal word agreement.

Real examples: Avodah_Zarah/52a:18's source question after משמשין is excluded; it breaks the expanded question. The comma between the parallel clauses at Berakhot/39a:10 (`יפה ללב, וטוב לעינים`) has source evidence, though other conservative gates can still abstain. A positive surviving example is Arakhin/29a:6 (`יוצאה מתחת ידו, ומתחלקת לאחיו הכהנים`).

**C2 — A multiword formula is indivisible.** Suppress a mark between any two words of a recognized formula span, including prefixed forms. This takes priority over the single-word test. It does not matter whether the source itself punctuates there.

Real examples: Bava_Metzia/95b:9 and Ketubot/99a:1 both suppress `הוי, רישא`. Ketubot/100b:8 is also conservatively suppressed although review3 did not call it a clear error. A rule is not an assertion that every abstention was linguistically wrong.

**C3 — No insertion immediately after a connective/formula.** Suppress every phrase mark immediately after a recognized single-word member or the final word of a recognized multiword span. No exception for reporting colons, alleged discourse resets, or apparent intonation. This protects complements when commentary changes the quoted word's role.

Real examples: Sanhedrin/41a:28 suppresses `לא היה מחברי הסנהדרין אלא, תלמיד` (R2-1); Bava_Batra/28b:3 suppresses `כדקאמר, השתא` (R3-2). Even the potentially reasonable reporting colon after אמר at Avodah_Zarah/37a:14 is withheld. Existing commentary punctuation after אמר remains untouched.

**C4 — Clause-entry and role-change evidence.** Inspect every vocabulary/formula span intersecting token indices **i−1 through i+2** around the proposed gap after word i. This includes immediate adjacency and one intervening word on either side. If any such span exists, the expanded commentary must independently put **the same single phrase mark at that exact token gap**. A bold quotation, matching consonants, a translation bracket, or a source comma alone is not clause-entry evidence. Without that explicit evidence, suppress; do not infer that an apparently discourse-initial source connective keeps that role. C2/C3 still prohibit internal/after-formula insertion even when commentary punctuation agrees.

This is the role-change rule: C2/C3 protect the bound construction, and C4 abstains when the surrounding expanded text provides no independent boundary. For **every class below**, a mark BEFORE its connective/formula may be inserted only with this evidence and all other gates; AFTER it is never inserted. Existing target marks are preserved, not duplicated.

Real examples: R2-1's commentary already resets with `אלא יש לומר כך` and then binds the quoted אלא to תלמיד; R3-2 binds כדקאמר to temporal השתא. Neither can inherit the source role. Arakhin/14a:13's proposed comma near `ואחר כך` is also withheld by C4. The real commentary of Ketubot/99a:1 already has a comma **before** `הוי רישא`; that comma is preserved. **There are zero imported C4 positives in this corpus build**: do not mistake preserved punctuation for an inserted positive. Synthetic positive/negative C4 fixtures test the otherwise reachable permission when commentary has a mark that speech lacks.

**C5 — Conflicting/nearby boundaries (N = 2).** Suppress if an existing mark `, ; : — – . ! ? … ׃` in base speech **or expanded commentary** lies at most two Hebrew tokens from the insertion, in either direction. Count tokens in the substring between offsets, so a following dash after one word is distance one. The independently corroborating commentary mark at this exact gap is the only exception; a speech mark is never exempt. Also suppress when an already accepted imported phrase mark lies within two words. This preserves the target's grouping and prevents closely spaced additions from creating a new conflict.

Real examples: Yevamot/44b:14 suppresses the source dash after שוה because commentary already has a dash after בכל (R3-1). Arakhin/17b:15 suppresses the dash after לרבי near `ומשיבים:`. Arakhin/29a:6's retained comma passes the same distance check. The rule protects sentence boundaries as well as phrase boundaries.

**C6 — Pause-plan floor (K = 2).** Replay accepted operations plus the candidate through the actual `prepareForTTS` and `pauseChunks` functions with their default options, including the 180-character chunk limit. Count occurrences of every existing short chunk by its full text; consume one allowance for each identical short chunk in the resulting plan. Reject any excess occurrence containing fewer than two Hebrew word tokens, including a newly isolated word identical to a short chunk elsewhere. Existing short chunks are not rewritten. This is a second guard after C5, because speech preparation can alter visible text. No synthesis or listening is involved.

Real examples: the old R3-1 plan isolated בכל; the old R3-4 plan isolated הוי. Earlier C5/C2 gates already reject those, so they are not double-counted under C6. Pesachim/80b:7 reached C6 in the initial trial; final C8 rejects it earlier because its next word is בין, not independently corroborated coordination. Thus final C6 drops are zero, while its meaningful positive/negative unit tests exercise an actual planner length-cap case. Retained Arakhin/29a:6 passes C6.

**C7 — Positive non-formula permission.** Outside the protected neighborhood, permit only (a) an independently matching commentary boundary or (b) a **source comma before a vav-led coordinated member**: the next unpointed Hebrew token must match `^ו[א-ת]+$`. Lists and coordinated clauses are included; the rule does not insist that every member be a full sentence. Require the four-word quotation context, provenance, spacing and pause checks. A vav never licenses inserting after a formula or bypassing C4. Other marks can pass only with independent commentary evidence; this final corpus happens to retain commas only.

Real positives: Arakhin/29a:6, `יוצאה מתחת ידו, ומתחלקת לאחיו הכהנים`; Bava_Kamma/39b:6, `מעמידין להן אפוטרופוס, ומעידין להן בפני אפוטרופוס`. Real non-positive: the dash in Yevamot/44b:14 cannot pass the earlier conflict test. Every retained edit is assigned C7, not merely labeled “not on denylist.”

**C8 — Fail closed on unclassified evidence or role.** Require four consecutively mapped source words: i−1, i, i+1, i+2. Reject missing quotation context or any ASCII/Hebrew quote/geresh/gershayim in that local speech window; abbreviated/ambiguous words are not guessed. If commentary does not independently corroborate the gap, classify only the explicit C7 coordinated-member comma. Suppress topical dashes, reporting boundaries, comparison complements, durations, and other roles that this small policy cannot establish. Never substitute a safer-looking mark for the source's mark.

Real examples: Bava_Batra/164a:1 (`אינו דומה נמחק פעם אחת, לנמחק שתי פעמים`) and Bava_Batra/54a:6 (comma before `תליסר שנין`) were uncertain in the initial self-review and now abstain by this general rule. Bava_Kamma/111a:1's comparative comma and Bava_Kamma/24b:1's dash inside a reported question also abstain. These are not page exceptions or asserted newly confirmed errors. C7's positive examples pass the same context gate.

## Class policy and complete vocabulary

All classes use exactly the same conservative boundary policy: BEFORE = C4's independently corroborated clause entry plus all gates; AFTER = never (C3); INSIDE = never (C2); unknown/changed role = C4/C8 suppression. The lexical class identifies what must be protected, not a permission to punctuate. Categories may overlap (notably השתא). No class authorizes a new mark absent from the source.

The tables below are generated from the executable exported vocabulary. `legacy` preserves fix2's extra particles/adverbs as a conservative coverage floor, not page exclusions. Multiword spans, contextual evidence, spacing, planner checks and the positive coordination rule supply the general logic beyond that vocabulary.

| Class | Exact members (prefix closure described above) | Before / after / suppression |
|---|---|---|
| Discourse reset / contrast | אלא · ואלא · אבל · ברם · מיהו · אף · אפילו | C4 / never C3 / C2+C4+C8 |
| Question / challenge | מאי · מאי טעמא · מאי איכא · והא · והתניא · ותו · אמאי · היכי · היכי דמי · מנא הני מילי | C4 / never C3 / C2+C4+C8 |
| Conditional | אי · אי הכי · אי נמי · אילו · אם · אלא אם | C4 / never C3 / C2+C4+C8 |
| Citation / report | דתניא · תניא · תנן · תנו רבנן · אמר · אמר ליה · אמר מר · דאמר · כדקאמר · דקתני · קתני · איתמר · שנאמר · דכתיב · כתיב | C4 / never C3 / C2+C4+C8 |
| Inference / consequence | הוי · הוי אומר · הוי רישא · אלמא · שמע מינה · נמצא · השתא · הלכך · משום הכי · לפיכך · מכלל | C4 / never C3 / C2+C4+C8 |
| Resolution | איבעית אימא · אלא מאי · לא קשיא · הכא במאי עסקינן · תיובתא | C4 / never C3 / C2+C4+C8 |
| Deictic / time | השתא · הכא · התם · האידנא | C4 / never C3 / C2+C4+C8 |
| Particle | נמי · קא · הא · לאו | C4 / never C3 / C2+C4+C8 |
| Additional inherited protection | מעיקרא · מכאן · מהתם · שאני · כרחך · כרחו · כרחין · זאת · אלא · אם · אי · אבל · אף · או · לא · לאו · אל · אין · איני · אינן · אינו · אינה · איננו · אילו · אילולא · אילולי · אלמלא · אלמלי · לולא · לולי · כי · וכי · דכי · דאי · דילמא · דלמא · שמא · גם · רק · אך · אכן · אטו · הא · הרי · הן · כן · כך · ככה · הכי · הכא · התם · כאן · שם · נמי · עוד · שוב · כבר · עדיין · אכתי · השתא · מיהו · מיהת · ברם · מכלל · מכללא · ממילא · אדרבה · אדרבא · לפיכך · לפום · משום · מפני · מחמת · למען · כדי · לכן · לכך · הלכך · הילכך · הלככך · הואיל · היות · כאשר · כשם · כמו · כגון · כעין · היכי · היכא · איכא · ליכא · אימתי · אמאי · למה · מדוע · מה · מאי · מי · עד · על · פי · אחר · קודם · לפני · אחרי · בכן · ובכן · מעתה · לעולם · דוקא · דווקא · ודאי · בודאי · בוודאי · לכאורה · מסתמא · כלומר · דהיינו · דהכי · היינו · תו · ותו · אלאמאי · בשלמא · תיפוק · תיתי · תימא · אימא · אומר · אומרת · אומרין · לטעמיך · לטעמיה · לטעמא · לטעמייהו · סוף · לחוד · בלבד · זולת · מלבד · למרות · אףעלפי · אעפ · אףעלגב · אעגב | C4 / never C3 / C2+C4+C8 |

### Corpus examples per class

These are **suppressed proposed edits**, not permission examples; this build has no imported C4 positives. Allowed existing commentary boundaries are described under C4. Positive permissions for every class are exercised with explicitly labeled synthetic fixtures.

**Particle**

- Arakhin/12a:13, C3, protected **נמי**: שַׁע עֶשְׂרֵ֫ה (בְּלֹא שׁנַת הַחֻורְבָּ֫ן עַצְמָ֫הּ), לְדִידִ֫י נָמֵ֫י⟦—⟧ לְבַר מִשַּׁתָּ֫א [לְשִׁיטָתִ֫י, שׁמוֹנִ֫ים אַרְבַּ֫ע עֶשְׂרֵ֫ה שָׁנָ
- Avodah_Zarah/12a:6, C4, protected **נמי**: דִּכְוָותַהּ⟦,⟧ הָכָא נָמֵי [כיוצא בה כאן גם כן] לֹא חַשּׁוּ לָהֶם חֲכָמִים לשאת ולתת

**Additional inherited protection**

- Arakhin/12a:13, C3, protected **נמי**: שַׁע עֶשְׂרֵ֫ה (בְּלֹא שׁנַת הַחֻורְבָּ֫ן עַצְמָ֫הּ), לְדִידִ֫י נָמֵ֫י⟦—⟧ לְבַר מִשַּׁתָּ֫א [לְשִׁיטָתִ֫י, שׁמוֹנִ֫ים אַרְבַּ֫ע עֶשְׂרֵ֫ה שָׁנָ
- Arakhin/14a:13, C4, protected **כך**: הֶם נִפְדִּ֫ים לְעַצְמָ֫ם, אֶ֫לָּא אֲפִ֫ילּוּ הִקְדִּ֫ישׁ אִילָנוֹתָיו⟦,⟧ וְאַחַ֫ר כָּךְ הִקְדִּ֫ישׁ בְּפֵירוּ֫שׁ גַּם אֶת הַקַּרְקַ֫ע, כְּשֶׁה

**Conditional**

- Arakhin/16a:4, C4, protected **אם**: מַ֫עְתִּי אוֹתָ֫הּ] אֶת הָאֲמִירָ֫ה הַזּוֹ֫, וְאִי הֲוָה שׁמִ֫יעָא לִי⟦—⟧ קַיֵּימְתַּהּ [וְאִם הָיִ֫יתִי שׁוֹמֵ֫עַ אוֹתָ֫הּ הָיִ֫יתִי מְקַיֵּ֫י
- Arakhin/27b:8, C3, protected **אי**: וְאוֹמְרִ֫ים: אִי הָכִי⟦,⟧ אֵימָא סֵיפָא [אִם כָּךְ אֱמֹ֫ור אֶת סוֹפָ֫הּ] שֶׁל הֲלָכָ֫ה זוֹ: חָז

**Discourse reset / contrast**

- Arakhin/24b:11, C4, protected **אלא**: ְהַקְדִּ֫ישׁ, וּמִמֵּילָ֫א גַּם אֵין צֹ֫ורֶךְ לִגְאֹ֫ול. אֶ֫לָּא לְרַב⟦—⟧ מַאי [מָה פֵּירוּ֫שׁ] לֹא גּוֹאֲלִ֫ין אַחַ֫ר הַיּוֹבֵ֫ל פָּחוֹ֫ת מִשָ
- Arakhin/27a:4, C3, protected **אלא**: , לְמָה לִי לְאׇומְרוֹ֫? וַהֲרֵ֫י כְּבָר נֶאֱמַ֫ר "לְעוֹלָ֫ם"! אֶ֫לָּא⟦,⟧ אַ֫יְּ|ידֵי דִּ֫תְנָא רֵישָׁא [מִתּוֹ֫ךְ שֶׁשָּׁנָ֫ה בִּתְחִילַּ֫ת הַ

**Question / challenge**

- Arakhin/24b:11, C4, protected **מאי**: ְהַקְדִּ֫ישׁ, וּמִמֵּילָ֫א גַּם אֵין צֹ֫ורֶךְ לִגְאֹ֫ול. אֶ֫לָּא לְרַב⟦—⟧ מַאי [מָה פֵּירוּ֫שׁ] לֹא גּוֹאֲלִ֫ין אַחַ֫ר הַיּוֹבֵ֫ל פָּחוֹ֫ת מִשָ
- Avodah_Zarah/21b:4, C4, protected **מאי**: ועוד מדייקים: לא ישכיר מרחץ לגוי, אֲבָל להשכיר שָׂדֵהוּ לְגוֹי⟦,⟧ מַאי [מה] הדין? שׁרֵי [מותר], מַאי טַעְמָא [מה טעם הדבר]? אין זה קרוי

**Deictic / time**

- Arakhin/30b:20, C4, protected **הכא**: אָמַ֫ר רָבָא: אֵין כָּאן סתִירָ֫ה, אֶ֫לָּא הָכָא מֵעִנְיָנָ֫א דִקְרָ֫א⟦,⟧ וְהָכָא מֵעִנְיָנָ֫א דִקְרָ֫א [כָּאן נִלְמַ֫ד הַדָּבָ֫ר מֵעִנְיָינוֹ֫
- Avodah_Zarah/12a:6, C4, protected **הכא**: דִּכְוָותַהּ⟦,⟧ הָכָא נָמֵי [כיוצא בה כאן גם כן] לֹא חַשּׁוּ לָהֶם חֲכָמִים לשאת ולתת

**Citation / report**

- Avodah_Zarah/35b:18, C4, protected **אמר**:  יוֹסֵף וְאִיתֵּ֫ימָא [ויש אומרים] שאמר זאת רַב שׁמוּאֵל בַּר יְהוּדָה⟦,⟧ אָמַ֫ר: לֹא כָּךְ הָיָה מַעֲשֶׂה, אֶ֫לָּא אָמְרוּ֫: פַּעַם אַחַת הָלַ
- Avodah_Zarah/37a:14, C3, protected **אמר**: רַב פָּפָּא אָמַ֫ר⟦:⟧ שׁוֹשִׁ֫יבָא הוא, וְקָמִיפַּלְגִי [והם חלוקים] יוסי בן יועזר והחכמים 

**Resolution**

- Avodah_Zarah/48a:12, C3, protected **איבעית אימא**: ולהיפך, אִיבָּעֵית אֵימָא⟦:⟧ רַבָּנַן [אם תרצה אמור שהוא שיטת חכמים], "גִּידְּעוֹ וּפִיסְּלוֹ" אִי
- Eruvin/103a:9, C4, protected **לא קשיא**: ָמַ֫ר: הָא וְהָא [זוֹ וְזוֹ] שֶׁמּוֹרִידִ֫ים אֶת הַיַּבֶּ֫לֶת בַּיָּ֫ד⟦,⟧ וְלָא קַשְׁיָא [קָשֶׁ֫ה] הָא [זֶה] שֶׁאָסְרוּ֫ — בְּיַבֶּ֫לֶת לַחָ֫ה,

**Inference / consequence**

- Bava_Batra/104a:7, C3, protected **השתא**: שהקונה רוצה בקרקע היתירה, אלא כְּגוֹן דַּהֲוָה יַקִּ֫ירָא מֵעִיקָּ֫רָא⟦,⟧ וְזָל הַשְׁתָּא [שהיתה הקרקע יקרה מתחילה, בשעת המכירה, והוזלה עכשיו] 
- Bava_Batra/126a:4, C4, protected **השתא**: ועל דברים אלה תוהים: גם אם דְּרָכוּם?! הלא מֵעִיקָּ֫רָא עִ֫ינְבֵי⟦,⟧ הַשְׁתָּא חַ֫מְרָא [מתחילה היו ענבים, עכשיו הם יין], ובשינוי גדול כזה

## Intentional non-goals

- No general Hebrew/Aramaic parser, discourse classifier, semantic certainty, inflection dictionary, or automatic translation analysis. Unknown non-coordination roles abstain; literal alignment alone is never claimed to prove linguistic correctness.
- No reconstruction of every safe pause, coverage target, or claim that withheld marks are errors. The large coverage reduction is deliberate.
- No correction/removal of existing punctuation; no new questions, full stops, ellipses, compound marks or segment-edge stops.
- No page/tractate exceptions to these rules. The pre-existing **corpus** exclusion of Yerushalmi/Shekalim remains; all 12 specified Yerushalmi אדרבה strings are unchanged.
- No display/Israeli/default speech modifications, base say/v/partial changes, paid APIs, network retrieval, audio generation, or listening claims.
- No production Dicta niqqud fills in this pinned build; no licensing changes. Maryles/Sefaria attribution and existing restrictions remain.
- No statistical precision claim or shipment score from the self-audit. It is evidence for review, not independent approval.
