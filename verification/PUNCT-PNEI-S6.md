# Stage 6 — written Pnei Moshe punctuation rules (fail-closed)

These rules add clause punctuation only. They do not copy Myles, do not
rewrite wording, and do not invent question marks or semicolons.

## Invariants
- Letters and niqqud stay byte-identical (only `.,;:?!` may be inserted).
- Existing punctuation, HTML, and niqqud/ole clusters are never deleted,
  reordered, or replaced.
- No insertion inside an HTML tag.
- A marker must sit on a Hebrew word boundary (the characters immediately
  before and after are not Hebrew letters).
- Do not punctuate a site that already has clause punctuation
  (`.,;:?!`) at that boundary (tags and spaces in between are ignored).
- The 90 comments shipped in 1.0.107 (`verification/punct-identity-pnei.json`)
  are left untouched.
- Speech `ysay.say` is updated only when Hebrew letters already match the
  display comment. Insert the same marks after the corresponding
  letter+niqqud/ole cluster. If letters differ, leave `say` unchanged.
- Do not unit-split ship.

## Why this narrow set
The 1.0.107 LLM pass added many context-sensitive commas and still scored
≤9.5 overall. Gold comments that cleared 9.5 consistently mark three
discourse tags: `כלומר` / `וכלומר` and `בתמיה`. Other frequent words
(`והיינו`, `דהיינו`, `פירוש`, `משני`, `קשיא`, `הלכך`, `גרסינן`, `פריך`
before `עלה`/`ר'`) are often mid-phrase and are left alone in this packet.

## Rules

### R1. Period before `בתמיה`
When the last visible character before `בתמיה` (skipping spaces and tags)
is a Hebrew letter or a geresh/gershayim (`' ׳ " ״`), insert `.` immediately
after that character.
Example: `מותר בתמיה` → `מותר. בתמיה`; `וכו' בתמיה` → `וכו'. בתמיה`.

### R2. Period after `בתמיה`
When more non-punctuation content follows `בתמיה`, insert `.` immediately
after the word.
Example: `בתמיה כלומר` → `בתמיה. כלומר`.

### R3. Period before `כלומר` / `וכלומר`
Same placement as R1, for the gloss introducers.
Example: `וכו' כלומר` → `וכו'. כלומר`.

### R4. Comma after `כלומר` / `וכלומר`
When more non-punctuation content follows, insert `,` immediately after
the word.
Example: `כלומר שלש שנים` → `כלומר, שלש שנים`.

Together, `מותר בתמיה כלומר דלא` becomes `מותר. בתמיה. כלומר, דלא`.

## Out of scope for this packet
Colon after `ומשני` / `פריך` / `ה"ג` / `גרסינן`, commas after `והיינו` or
`הלכך`, and general clause commas. Those need a later, separately reviewed
packet if density is still below the 12–14 / 100 plan target.

## Fail-closed guards (fixRound 1, from review 0)
- R1/R3 look backward through HTML *tag characters only*, not through the
  whole `<b>…</b>` lemma, so an existing period already inside the lemma
  (`<b>…. </b>` or `<b>….</b>`) blocks a period after `גמ'` / `מתני'`.
- R3 does not insert a period after the bound conjunction `אלא` before
  `כלומר` / `וכלומר`.
- R1 does not insert a period after `לשון` / `בלשון` / `כלשון` / `ללשון`
  before `בתמיה`.
- R2 does not insert a period after `בתמיה` when the next word is
  `הוא`, `היא`, `הם`, `הן`, `הוי`, `קאמר`, or `מיתפרשא`.
- R2 is also skipped when `בתמיה` is immediately preceded by `לשון` / `בלשון` / `כלשון` / `ללשון`, or when the next word is `כפולה` (so `לשון בתמיה כפולה היא` stays one clause).
- R1 does not insert a period after a geresh abbreviation of «כלומר» (`כלו'`, `וכלו'`, `כלומ'`, `וכלומ'`, and short prefixes) before `בתמיה`. `וכו'` (etc.) is not this lemma and may still take a period.


## Shipped as 1.0.219

External review (fixRound 3, agy `gemini-4-hydrogen-high`): SHIP, overall **9.7** (S1=9.9, S2=9.7, S3=9.9, S4=9.8, S5=9.8), explicit `harmful_error_count = 0`, `non_harmful_error_count = 0`, 650 changed samples + 200 unchanged controls. `recommended_exact_only_removals` was empty. DATA_VERSION `b3ba813ccb70`.

Yield: **11,888** display comments changed, **18,185** marks (R1 829, R2 1,451, R3 4,321, R4 11,584), density 6.36 → 7.18 per 100 words. **8,898** letter-matched `ysay.say` transfers; **2,990** left because letters already differed; **90** comments from 1.0.107 skipped. Twenty ARAM-4 identity rows and eleven identity ENGINE-COV-1B `ysay` pins were retargeted mechanically. Onkelos was not touched. The remaining density gap versus 12–14 / 100 is intentional under this four-rule packet.

The worktree was rebuilt from `origin/main` (`3eb95425` / 1.0.218) after `/tmp` was cleared, then verified byte-identical to the reviewed fixRound 3 packet (all 650 samples, Bikkurim/10 `וכלו' בתמיה.`, letter/niqqud identity, and the yield counts above).
