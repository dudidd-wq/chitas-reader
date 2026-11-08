# Duplicate titles (1.0.72)

Rule: a note right after a heading whose Hebrew only repeats the heading is dropped (row ids kept). Titles stored as spoken paragraphs (shema/1#38 אנא בכח, shacharit/5#28 and shabbat/5#55 ברכת הגומל) now render as headings and are not read aloud.

## Dropped (47)
- boker/1#36	ברכות התורה
- boker/1#50	סדר לבישת טלית קטן
- boker/1#55	סדר לבישת טלית גדול
- boker/1#65	סדר הנחת תפילין
- boker/4#1	תרומת הדשן
- boker/4#5	קרבן התמיד
- boker/6#4	קדיש דרבנן
- brachot/2#20	ברכות הריח
- brachot/3#58	ברכות שונות
- brachot/4#15	מים אחרונים
- brachot/5#1	ברכה מעין שלוש
- kabbalat/2#47	קדיש יתום
- kabbalat/3#19	ברכות קריאת שמע
- kabbalat/5#78	קדיש שלם
- kabbalat/5#104	קדיש יתום
- levana/1#27	קדיש יתום
- maariv/1#21	ברכות קריאת שמע
- maariv/3#113	קדיש שלם
- maariv/3#127	קדיש יתום
- mincha/3#20	קדיש שלם
- mincha/3#36	קדיש יתום
- minchashabbat/2#15	ברכות קריאת התורה
- minchashabbat/3#83	קדיש יתום
- rc/1#57	קדיש
- rc/3#69	קדיש שלם
- shabbat/1#148	שירת הים
- shabbat/1#180	ברכות קריאת שמע
- shabbat/3#86	קדיש שלם
- shabbat/4#13	קדיש יתום
- shabbat/5#40	ברכות קריאת התורה
- shabbat/5#56	ברכת הגומל
- shabbat/5#93	ברכות ההפטרה
- shabbat/5#127	ברכת החודש
- shabbat/6#86	קדיש שלם
- shabbat/6#104	קדיש דרבנן
- shabbat/6#117	קדיש יתום
- shabbat/6#132	שש זכירות
- shacharit/1#58	שירת הים
- shacharit/1#81	ברכות קריאת שמע
- shacharit/5#16	ברכות קריאת התורה
- shacharit/5#29	ברכת הגומל
- shacharit/5#90	קדיש שלם
- shacharit/6#27	קדיש יתום
- shacharit/6#43	קדיש דרבנן
- shacharit/6#56	קדיש יתום
- shacharit/7#12	שש זכירות
- shema/1#39	אנא בכח

## Left unchanged (intentional)
- repeated spoken lines: לכה דודי refrain, ברוך ה׳ המברך (cong/chazzan), אנא ה׳ הושיעה/הצליחה נא, ה׳ מלך…, ובני, בעבורו, אני והו
- repeated instruction notes (Say three times / Congregation then chazzan / Others respond אמן)

# Hide no-Tachanun spans (1.0.72)
Setting hideNoTachanun (off by default). Spans labelled 'בימים שאין אומרים תחנון' or 'רק בימי שני וחמישי' (and notes inside them) are removed from the document (so not read aloud) when the device's Hebrew date - next date after local sunset - is a Chabad no-Tachanun day (list in tefila.js noTachanun). A one-line placeholder note marks the gap.

# 1.0.73
Placeholder note removed. Setting is now tachanunMode: off (default) / date / always; old hideNoTachanun=true migrates to date. Hidden blocks are removed from the document, so read-aloud skips them in both modes.
