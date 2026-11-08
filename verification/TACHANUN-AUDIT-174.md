# Tachanun audit — 1.0.74

## Sources
- S1 chabad.org, "Tachanun – The penitential prayers": https://www.chabad.org/library/article_cdo/aid/5776805/jewish/Tachanun.htm
- S2 chabad.org (Siddur commentary), "The Conclusion of Shacharis": https://www.chabad.org/library/article_cdo/aid/4153543/jewish/The-Conclusion-of-Shacharis.htm
- S3 Sefer HaMinhagim (Eng.), Months and Holidays: https://www25.sichos-in-english.org/books/sefer-haminhagim/48.htm
- S4 Hiskashrus 721/1240 (chabad.org.il), Iyar: https://www.chabad.org.il/Magazines/Article.asp?ArticleID=4913&CategoryID=1158
- S5 torahrecordings.com list incl. "Chabad custom": https://www.torahrecordings.com/prayer/0000

## Day list (tefila.js noTachanun) — verified
| day | status | source |
|---|---|---|
| Shabbat, RC, YT, Chol haMoed | yes | S1 |
| all Nisan | yes | S1, S2 |
| 14 Iyar Pesach Sheni | yes; Minchah before: said | S2, S4 |
| 18 Iyar Lag baOmer | yes, from Minchah before | S1, S2, S4 |
| 1–12 Sivan | yes | S1, S2 |
| 9 Av (and deferred 10 Av) | yes, from Minchah before | S1 |
| 15 Av | yes, from Minchah before | S1, S2 |
| 29 Elul (Erev RH) | yes; Minchah of 28 Elul: said | S1, S2 |
| 9 Tishrei – end of Tishrei | yes; Minchah of 8 Tishrei: said | S1, S2 |
| 10 Kislev | yes, from Minchah of 9 | S1, S2, S5 |
| 19 **and 20** Kislev | yes, from Minchah of 18 — **20 Kislev was missing, added** | S1, S2, S5 |
| Chanukah | yes, from Minchah of 24 Kislev | S1, S2 |
| 15 Shevat | yes, from Minchah before | S1, S2 |
| 14–15 Adar I; 14–15 Adar (II) | yes, from Minchah of 13 | S1, S2 |
| 12–13 Tammuz | yes, from Minchah of 11 | S1, S2, S3 |
| 18 Elul, 5 Tevet, 3 Tammuz | **not added** — "not universally practiced within Chabad" | S1 note 6 |
| 10 Shevat, 24 Tevet, 20 Av, birthdays/yahrzeits | not omitted ("not Chabad custom to omit on anniversaries of birth or passing") | S1 |

**Minchah-before rule (new):** in "לפי התאריך" mode, after midday the next day is checked; if it is a no-Tachanun day whose omission starts at the preceding Minchah, hidden — except Erev RH, Erev YK, Pesach Sheni (S2). After sunset the next date is used (as before).
Not handled (personal/communal): brit, chatan, house of mourning.

## Siddur blocks — scan of every note mentioning תחנון/וידוי/למנצח/צדקתך/אבינו מלכנו/שני וחמישי
Fixed (were unmarked):
- shacharit/4 #2–#45: Tachanun itself (Vidui, 13 Middot, Nefilat Apayim, Mon/Thu prayers, Avinu Malkeinu, ואנחנו לא נדע) — "בימים שאין אומרים תחנון" (data: shacharit/3#120 "on days that Tachanun is not said the chazzan should continue on to the Hatzi Kaddish").
- mincha/3 #2–#18: same at Minchah (mincha/2#122 → "continue on to the Full Kaddish").
- chatzot/1 #15–#31: Tikkun Rachel (chatzot/1#10 "only said on days in which Tachanun is said").
Already correct: shacharit/4#52 אל ארך אפים (Mon/Thu); shacharit/5#85 Ps 20 למנצח יענך; shacharit/5#105 Ps 86 תפלה לדוד; minchashabbat/3#78 צדקתך; shabbat/5#168 אב הרחמים; shema/1#26–36 KSHM confession; chatzot/1#42 Ps 20, #51 Ps 51.
Not marked (correctly): Kaddish after Tachanun; brachot/4 (always-available Birkat haMazon); kabbalat/1#10 (navigation).

## Uncertain
- The data's Tachanun follows the transcription: Avinu Malkeinu on every non-Mon/Thu day (shacharit/4#15). Chabad (Tehillat Hashem) says Avinu Malkeinu only in the Ten Days and on fast days — text not changed, flagged.
- KSHM Psalm 51 is labelled Shabbat/YT per the data's own note; not changed.
