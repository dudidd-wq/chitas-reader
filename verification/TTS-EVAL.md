# חבילת מדידה להקראה (TTS-EVAL)

בדיקה מקומית, דטרמיניסטית, בלי האזנה ובלי רשת. נועדה לתפוס שינוי לא מכוון ב־`tts-prep.js` / `g2p.js`.

## מה בפנים
- `tests/fixtures/tts-eval/sample.json` – מדגם קבוע (31 פריטים, כ־480 מילים) מטקסטי האפליקציה עצמה: מקרא (בראשית, שמות, תהילים; עם טעמים), רש״י, משנה, הלכה (רמב״ם), חסידות (תניא, היום יום), ארמית (אונקלוס, גמרא), סידור, ופריט סינתטי לראשי תיבות/מספרים.
- `tests/fixtures/tts-eval/golden.json` – ה־snapshot הזהב. לכל פריט: פלט `prepareForTTS`, פלט `textToIPA` בשתי המסורות (`israeli`, `chabad`) ועקבות החלטה לכל מילה (`מילה|IPA|k|src` – `src` מציין מקור הטעמה: acc / primary / excForce / suffix / milel / spell …).
- `tools/tts-eval.mjs` – הכלי. `tests/tts-eval.test.mjs` – הבדיקה.

## הרצה
```
node tools/tts-eval.mjs                  # דוח הפרשים מול הזהב + השמטות שקטות; קוד יציאה 1 אם יש
node --test tests/tts-eval.test.mjs      # אותו דבר כבדיקה (נכללת ב-npm test)
TTS_EVAL_AUDIO=1 node --test tests/tts-eval.test.mjs   # בנוסף: מדדי אודיו עם הקול המקומי
node tools/tts-eval.mjs --audio          # הדפסת מדדי אודיו
```

## סיווג ההפרשים
`prep` (טקסט ההכנה), `ipa-stress` (רק ˈ זז), `ipa-phoneme` (פונמה השתנתה), `trace-only` (אותו IPA, החלטה/מקור שונה), `item-added` / `item-removed`. הדוח מציג עד 8 דוגמאות לכל מחלקה.

## עדכון זהב במכוון
אחרי שינוי מכוון (ושבדקת את הדוח):
```
node tools/tts-eval.mjs --update-golden
git diff tests/fixtures/tts-eval/golden.json     # לעבור על ההפרשים לפני קומיט
```
אין לעדכן זהב כדי "להשתיק" בדיקה בלי להבין כל הפרש. שינוי במדגם עצמו: `node tools/tts-eval.mjs --build-fixtures` ואז `--update-golden`.

## השמטה שקטה
מהנתונים בלבד (בלי סינתזה): (1) מילה עברית בטקסט המוכן שאין לה תעתיק; (2) מילה שתועתקה לריק; (3) פונמה שהמסנן הסופי של `textToIPA` היה מוחק; (4) פונמה שאין לה id ב־`phoneme_id_map` של הקול (`noa` ו־`ilspeech-male`, מתוך ה־json של הקולות) – `ipaToIds` מדלג עליה בשקט. כל ממצא מכשיל את הבדיקה.

## מדדי אודיו (אופציונלי)
רק כשהקול המקומי מותקן (`site/voice/…`) ורק עם `TTS_EVAL_AUDIO=1`; אחרת הבדיקה מדלגת ולא נכשלת. נמדדים: משך, עוצמה (RMS dBFS), שיא, שתיקה ארוכה ביותר, שיא ב־5 ms הראשונים/האחרונים (חיתוך קצוות). הסינתזה סטוכסטית (noise_scale) ולכן אלה גבולות סבירות, לא זהב. אין Whisper.

## מגבלות v1
המדגם קטן ולא מייצג סטטיסטית; מודד תעתיק ולא צליל. ניתן להרחיב ב־`buildFixtureItems()`.
