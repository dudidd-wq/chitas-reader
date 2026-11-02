# אימות ביאורי המילים (סבב 3: "דיוק קודם")

ביאור מתפרסם רק אם עבר **שתי בדיקות בלתי תלויות** ואחריהן **בדיקה ידנית**. כל מה שלא עבר – נשמט. אין ביאורים שנכתבו "מהראש" ואין ניסוחים מעודנים.

## בדיקה א – ויקימילון, אותו פסוק, ללא תבנית אזהרה (`tools/build-glossary.mjs`)
* ההגדרה בוויקימילון העברי מצטטת את **אותו פסוק** (`{{צט/תנ"ך|…|ספר|פרק|פסוק}}`) והמילה מודגשת בציטוט; כשהמילה חוזרת בפסוק – רק המופע המודגש.
* נפסלת הגדרה שיש עליה תבנית אזהרה (`tools/gloss-flags.mjs`): פירוש לקוי, הגדרה לקויה, משוערת, הבהרה, דרוש מקור, לשכתוב/שכתוב, להשלים/השלמה, קצרמר, מפוקפק, בדיקה/לבדוק, ספק. תבנית ברמת הערך (מחוץ להגדרות או בראש הדף) פוסלת את כל הגדרות הערך.
* רשימת הנפסלים בגלל תבנית: `tools/gloss-flagged.json` (91 – למשל בראשית כג:יח "לְמִקְנָה", "פירוש לקוי").

## בדיקה ב – הצלבה אוטומטית עם שני עדים חיצוניים (`tools/gloss-xcheck.py`)
לכל מועמד שעבר את בדיקה א, המשמעות צריכה להתאים **לשני** המקורות:
1. **STEPBible TAHOT** (Translators Amalgamated Hebrew OT, Tyndale House Cambridge, CC BY 4.0, https://github.com/STEPBible/STEPBible-Data) – התרגום של המילה **במופע הזה** ושל הערך המילוני המובחן (Strong's מורחב/BDB). בנוסף, שורש הלמה של TAHOT חייב להתאים לערך בוויקימילון.
2. **JPS 1917** (The Holy Scriptures, תרגום ה-Jewish Publication Society, נחלת הכלל, דרך ה-API של ספריא) – תרגום הפסוק כולו.

הגישור עברית→אנגלית: ערכי עברית בוויקימילון האנגלי (kaikki.org, CC BY-SA), והשוואה ב-Princeton WordNet 3.0 (אותה למה, synset משותף, צורה גזורה, או היפרנים ספציפי). כל תוצאה והראיות שלה נשמרות ב-`tools/gloss-xcheck.json` (כולל התרגום מ-TAHOT, הפסוק ב-JPS והמילים שהתאימו). מקורות העזר משמשים לבדיקה בלבד ואינם מוצגים באתר.

## בדיקה ידנית (`tools/gloss-review.json`)
כל ביאור שעבר את שתי הבדיקות נקרא ידנית מול הפסוק, TAHOT ו-JPS. ספק – נדחה. בסבב 3 נדחו 6 נוספים שעברו את הבדיקה האוטומטית (למשל במדבר יא:לא "וַיָּגָז" – בפסוק: הביא/הסיע; תהילים קיט:קמז "בַנֶּשֶׁף" – JPS: dawn; בראשית טו:טז "הֵנָּה" השני – "עד עתה"). פירוט בשדה `note3`. בסבב 4 נדחה תהילים לז:יז "וְסוֹמֵךְ" (הגדרת ויקימילון "החזיק בדבר אחר" = אחיזה פיזית; בפסוק: תומך, JPS: upholdeth). לא שוכתב ל"תומך", כי ניסוח שאינו הגדרה מצוטטת בוויקימילון אינו עומד בכלל שתי הבדיקות (`note4`).

## מספרים (נוצר 2026-11-02)
| שלב | מספר |
|---|---|
| מילים בתורה ובתהילים (מופעים) | 93,367 |
| הגדרות ויקימילון שמצטטות את אותו פסוק | 1,085 |
| נפסלו בגלל תבנית אזהרה | 91 |
| עברו את בדיקה א | 994 |
| נכשלו בבדיקה ב: TAHOT לא מסכים / JPS לא מסכים / שורש שונה / אין גישור / אין מופע ב-TAHOT | 361 / 50 / 23 / 7 / 10 |
| עברו את שתי הבדיקות | 543 |
| נדחו בבדיקה הידנית | 96 |
| לא נבדקו ידנית ולכן לא פורסמו | 1 |
| **פורסמו** | **446** |

(לפני סבב 3 פורסמו 826 ביאורים שעברו רק את בדיקה א ובדיקה ידנית. הכיסוי ירד בכוונה.)

## מגבלות
* הכיסוי קטן: 446 מילים בכל התורה ותהילים. הרחבה – רק בערכים שעוברים את שתי הבדיקות.
* **רש"י, תניא ורמב"ם – אין ביאורים.** TAHOT ו-JPS מכסים רק תנ"ך, ולא מצאנו לטקסטים אלה מקור שני חופשי ברמת המילה (Jastrow בספריא מחייב עבודת התאמה ידנית לכל מופע, בלי עד שני בלתי תלוי). לכן אי אפשר לעמוד שם בכלל שתי הבדיקות.
* ההתאמה האוטומטית באנגלית שמרנית אך לא מושלמת: היא יכולה להחמיץ ביאור נכון (נשמט) ולפעמים למצוא התאמה מקרית – לכן יש גם בדיקה ידנית.

## הרצה מחדש
```
sh tools/fetch-xcheck-data.sh          # TAHOT, kaikki, JPS 1917 (Sefaria API), WordNet → /tmp/xchk
node tools/build-glossary.mjs          # בדיקה א → /tmp/gloss-cands.json
python3 tools/gloss-xcheck.py          # בדיקה ב → tools/gloss-xcheck.json
node tools/build-glossary.mjs          # מפרסם רק: א ✓ + ב ✓ + החלטה ידנית "keep" → site/data/glossary.json
```
הבדיקות `tests/gloss-two-check.test.mjs` ו-`tests/glossary.test.mjs` נכשלות אם ביאור שפורסם לא עבר את שתי הבדיקות, אם הוא מגיע מהגדרה מסומנת, או אם המספרים בעמוד "מקורות" לא תואמים לנתונים.

## Rambam (round 5) – a small, careful extension

The Tanakh rule, applied to Mishneh Torah. Nothing ships unless it passes all three steps:

1. **Check A – location** (`tools/gloss-rambam.mjs`): a Hebrew-Wiktionary sense whose quote names the Rambam/Mishneh Torah and puts the word in bold, with no defect template and a short gloss (≤ 4 words). The bold word must be found in **our** halacha through a run of ≥ 5 consonant-folded words that is unique across all 14,367 halachot, and the hilchot name in the quote must match. 126 quotes → 37 located.
2. **Check B – independent agreement** (`tools/gloss-rambam-xcheck.py` → `tools/gloss-rambam-xcheck.json`): the gloss must agree (same WordNet machinery as for the Tanakh) with **both** the English Wiktionary entry for the headword and Eliyahu Touger's English translation of that halacha (Sefaria, CC BY-NC; used only as a witness, not shown in the app). 37 → 21.
3. **Manual review** (`tools/gloss-rambam-review.json`): each survivor was read against the halacha and the translation. 12 were rejected: 11 because the word is trivial (אם, הרג, חתך, נלחם, ניגש – a pop-up there is noise), and 1 because the form doesn't match (רפוי is an adjective, glossed with a verb definition). Several of the automated agreements behind the rejects were weak; the kept ones were checked by hand against the translation's wording (recorded in the `why` field).

**Published: 9 glosses (8 words)** – stored under `rambam` in `site/data/glossary.json`, keyed `Rambam <slug>.<chapter>.<halacha>`. The test `tests/round5.test.mjs` checks that every published gloss has a passing check B entry with evidence and a manual `keep`.

**Tanya: none.** Hebrew Wiktionary has no quotes from the Tanya to anchor a gloss to (the 19 hits for "תניא" are the Talmudic "תניא"), so the rule can't be met and nothing is published.
