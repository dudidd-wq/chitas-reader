# Bedtime Shema (shema/1) omit blocks — 1.0.71

Source of truth: the siddur's own instruction notes in `site/data/siddur/shema/1.json`.

## Bug
The no-Tachanun note (#25) says "the following paragraphs are omitted, continue on at אנא בכח", but the
"until-note" span stopped at the first inner procedural note (#27 "strike the chest"), so only #26
(אלהינו ואלהי אבותינו) was marked and "עד כאן" appeared right after it, while אשמנו … and the יהי רצון
(סקילה/שריפה/הרג/חנק) paragraphs looked like they are always said.

## Fix
`omitPrayerFlags`: a "following paragraphs … וממשיכים ב״X״" note now spans every spoken paragraph up to the
resume point X, passing inner procedural notes. Applied site-wide; only shema/1 changed (full diff of all
omit flags before/after).

## Result
| rows | text | label |
|---|---|---|
| #1 | רבונו של עולם הריני מוחל | בשבת ויו״ט אין אומרים |
| #2 | השכיבנו | always (not marked) |
| #4 | והגן בעדנו … כי אל שומרנו | בשבת ויו״ט אין אומרים |
| #26–#36 | אלהינו ואלהי אבותינו → אשמנו → מה נאמר → אתה יודע → ובכן יהי רצון → ואם ירצה לומר על חטא → 4× יהי רצון/ואם חטאתי; עד כאן after #36 | בימים שאין אומרים תחנון |
| #38+ | אנא בכח | always |
| #45 | Psalm 51 (למנצח … בבוא אליו נתן) | בשבת ויו״ט אין אומרים |

Markings are static (no date-based hiding in the reader). On Shabbat/YT there is also no Tachanun, so the confession is skipped then too; the label names the broader condition.

## Uncertain
- #1: some printings skip on Shabbat/YT only the closing ה׳ wish (ומה שחטאתי … ) rather than the whole paragraph; we follow this data's note (whole paragraph).
- #2–#4: השכיבנו / והגן split follows the data; ברוך המפיל position not re-audited.
- #38 is a stray "אנא בכח" heading stored as a spoken paragraph.
