# Task B: conservative speech audit follow-up

No version bump, display edits, general Aramaic lexicon enablement, or paid API calls.
These are candidates for independent review, not a claim of a new external score.

## Long-vowel shva

`markShvaNa` admits only the exact pointed forms יֵלְכוּ, וַיֵּלְכוּ,
יֵצְאוּ, אֵלְכָה, יִירְאוּ. The lookup ignores cantillation and mark ordering,
but not vowels, letters, or dagesh. Explicit speech-only NACH still wins.
No arbitrary prefix stripping or productive morphological guessing.

Blanket tsere would damage קֵדְמָה and חֵטְא; blanket hiriq-male would
damage עִירְךָ and יְמִינְךָ. Qamatz remains unchanged: neither vowel length
nor untagged spelling reliably distinguishes the requested careful reading
from a closed syllable. The exact verb subset is ready for independent review.

## Chabad initial vowels: held

Bare a/e/i/o already produce audio, unlike the reported initial-shuruk failure.
The existing havara-191 contract explicitly requires silent alef/ayin, including
word-initial position, and checks that only initial shuruk has a glottal onset.
A blanket onset would break those assertions and change hundreds of ordinary
words. No particular a/e/i/o glide failure was demonstrated in this task, so
there is no justified narrower exception. Keep the proven 1.0.123 shuruk fix;
pin unchanged a/e/i/o and Israeli output in new tests. Hold onset expansion
until a reproducible local Piper sample establishes which forms need it.

## Square brackets

Corpus inspection found 133 distinct bracket contents in Tanya display fields.
They are NOT all editorial. IK 15 has הַטּוֹחֵן [חִטִּים] בָּרֵחַיִים;
LA 8 has כַּף הַקֶּלַע [לְבַדּוֹ] מוֹעִיל. Other brackets contain entire
explanatory paragraphs. Neither short length nor containing פרק is sufficient.

After both existing ketiv/qere handlers, omit only duplicated one/two-word
alternatives (including שהוא [הוא] / שהיא [היא], attested in IK 15) and a
closed chapter-citation grammar: Avot / the three Bava tractates + chapter
number, or chapter + דנדה / דשבועות / דחגיגה (optional בסוף / ב prefix).
Chapter numbers are a single Hebrew letter or a quoted numeral, never arbitrary
short words such as זה. Vocalized and unvocalized citations share the grammar.
Keep other single-word alternatives without sufficient contextual evidence.
The old explicit editorial-note handlers are unchanged. This subset is ready
for review; broader citation/variant recognition is held.

## Experimental Aramaic shva

With `shva: true`, couple exact אִיקְּלַע / וְאִיקְּלַע to final stress and
אַדְּרַבָּה / וְאַדְּרַבָּה to penultimate stress, overriding inherited ole
tags only when necessary. This is a four-form repair, not enabling `lexicon`.
Allow these exact forms through corpus fallback with the shva group alone.
Apply the existing prose eligibility guard to assimilated מִן as well as to
`withNach`, so Hebrew מִֽיְּסוֹד retains /mijesod/ rather than /mijsod/.
Gemara quotation and Mishnah protection still precede the fallback.

Bavli, Tanya and tolt shva gates remain OFF. The named examples now have exact
IPA regression tests, but inherited stress outside the four forms, mixed
Hebrew/Aramaic eligibility, and Chabad stress interactions require a fresh
corpus/audio review before claiming a source-wide score strictly above 9.5.
Yerushalmi and Onkelos remain enabled; all general lexicon gates remain off.

## Validation

`tests/engine-126-b.test.mjs` adds exact IPA / preparation outputs, negative
cases, mark-order checks, explicit NACH precedence, pass idempotence, quotation
protection, and assertions that held gates remain off. Existing assertions in
audit-124, g2p, tts-prep, aramaic-abbr-112 and havara-191 are retained.
Windows file-URL conversion was corrected in the Aramaic tools, local voice
synthesizer and the two affected speech tests using `fileURLToPath` (and
`pathToFileURL` for the dynamic voice-module import).

See CODEX-B-SUMMARY.md in the delivery packet for final test counts and the
compiled-speech dry-run result. Full-suite environment failures must not be
reported as passing or as an independent pronunciation review.

The production-gate post-pass dry run proposed 647 changed files (732 Bavli,
144 Yerushalmi, 0 Onkelos, 0 Tanya, 19 tolt changed words). Comparing its word
report against the starting commit's rules isolated only 12 new changes, all
Yerushalmi forms of אדרבה; the rest is pre-existing compilation drift, mostly
the older shuruk/holam rules interacting with codaFix. No compiled data was
written: the runtime fixes need no rebuild, and the tool repairs remain for a
reviewed post-pass. The current displayed and compiled text stays byte-identical.
