# Data licence / רישיון הנתונים

The GPL licence of this repository covers the **code only**. The text files in this directory are **not** GPL;
each is licensed by its source exactly as the source states it (Sefaria lists "CC-BY-SA" / "CC-BY-NC" without a
version number; Wikisource itself states CC BY-SA 4.0). Per-file metadata: `sources.json`.

| Path | Text | Source | Licence |
|---|---|---|---|
| `torah/`, `tehillim/` (verses) | Miqra according to the Masorah | Wikisource via Sefaria | CC BY-SA |
| `torah/` (Rashi) | Rosenbaum–Silbermann 1929–34 | Sefaria | Public domain (per Sefaria's label) |
| `tanya/` | Tanya, Kehot Publication Society | Sefaria | **CC BY-NC – non-commercial use only** |
| `rambam/` | Mishneh Torah, Torat Emet 363/370 | Sefaria | Public domain (per Sefaria's label) |
| `rambam/` (overrides listed in `sources.json`) | Mishneh Torah | Wikisource via Sefaria | CC BY-SA |
| `tolt/` | Torah Or / Likkutei Torah, Kehot Publication Society; daily division (references only) from "לוח המורה שיעור" – Kinus HaShluchim / Hisachdus HaChassidim (torahor.app); the luach PDF is not included | Sefaria | **CC BY-NC – non-commercial use only** |
| `tolt/` (niqqud of the paragraphs flagged `nq`) | נוסח מנוקד: חסידות בהירה, על פי מהדורת קה״ת ה׳תשע״ה; באישור, לשימוש לא מסחרי בלבד | [chassidutbehirah.com](https://chassidutbehirah.com/) (PDF files, not included) | **Non-commercial use only.** לפי דיווח בעל האתר, אושר ע״י חסידות בהירה וקה״ת, לשימוש לא מסחרי בלבד. No written licence document is held; see `verification/CHASSIDUT-BEHIRAH.md` |
| `ravyomi/` | Shulchan Arukh HaRav, Orach Chaim – Vocalized Edition, Kehot Publication Society; daily division (references only) from the "Rav Yomi" luach (chabad.info/service/1287411) | Sefaria | **CC BY-NC – non-commercial use only** |
| `mitzvot/` | Sefer HaMitzvot, Warsaw 1883 (NLI scan) | Sefaria | Public domain (per Sefaria's label) |
| `gemara/bavli/` | Talmud Bavli, William Davidson Edition – Vocalized Aramaic; Steinsaltz Hebrew explanation (Koren – William Davidson) | Sefaria | **CC BY-NC – non-commercial use only** |
| `gemara/yer/` | Jerusalem Talmud (Guggenheimer edition text); Penei Moshe | Sefaria | CC BY (text); Penei Moshe: public domain (per Sefaria's label) |
| `gemara/mishna/` | Mishnah, Torat Emet 357; Bartenura ("On Your Way") | Sefaria | Public domain (per Sefaria's label) |
| `nach/` (verses) | Miqra according to the Masorah | Wikisource via Sefaria | CC BY-SA |
| `nach/` (commentary) | Metzudat David ("On Your Way"); for Ruth, Lamentations and Esther: Rashi, The Metsudah Five Megillot (2001) | Sefaria | Public domain (Metzudat David); CC BY (Metsudah Rashi) |
| `onkelos/` | Targum Onkelos, vocalized according to the Yemenite Taj | Wikisource via Sefaria | CC BY-SA |
| `nachv/`, `mitzvot-voc/`, `gemara/*say/` | automatic niqqud and speech text generated with the Dicta Nakdan (nakdan.dicta.org.il) from the texts above | derived | same licence as the underlying text |
| `siddur/` (prayer text) | Siddur Nusach Ha-Ari (Chabad), transcribed by Shmuel Gonzales | Open Siddur Project (Internet Archive copy) | CC0 |
| `siddur/` (English instructions, `n` blocks) | same | Open Siddur Project | CC BY (attribution: Contributors to the Open Siddur Project, including Shmueli Gonzales) |
| `glossary.json` | short glosses | Hebrew Wiktionary | CC BY-SA 4.0 |
| `notes/tolt/` | "מראי מקומות הערות וציונים" (Sources and References on Torah Ohr / Likkutei Torah), Kehot Publication Society | Sefaria | **CC BY-NC – non-commercial use only** |
| `notes/tanya/` | "מראי מקומות" of "תניא מנוקד" (source references only) | Hebrew Wikisource | CC BY-SA 4.0 |
| `sbiur/tanya/`, `sbiur/rambam/`, `sbiur/mitzvot/` | "ביאור קצר": short Hebrew explanations written for this site with a computer (labelled in the reader "ביאור קצר ממוחשב – אינו פירוש רבני"), reviewed before publishing (`verification/SHORT-BIUR.md`) | this site | same licence as the underlying text |
| `sbiur/tolt/` | "ביאור קצר": a computer-made Hebrew condensation of the English paragraph explanations of Torah Or / Likkutei Torah at LikuteiTorah.com (linked per paragraph in the reader) | [LikuteiTorah.com](https://www.likuteitorah.com/) | **CC BY-NC 4.0 – non-commercial use only** (as LikuteiTorah.com states) |

Outside this directory, `verification/siddur-ref.json` holds consonant-only word skeletons of 19 passages of the Metsudah Siddur Sefard (Sefaria, CC BY 4.0), used only to verify the siddur; it is not served by the site.

**Non-commercial restriction:** a fork, a paid app-store build, an ad-supported site or any other commercial use
must not ship `tanya/`, `tolt/`, `notes/tolt/`, `sbiur/tanya/`, `sbiur/tolt/`, `ravyomi/` or `gemara/bavli/` (with `gemara/bsay/`) without permission from the rights holders; remove or replace them instead.
The niqqud in `tolt/` (Chassidut Behirah) was permitted for this non-commercial site only; it may not be reused elsewhere
without asking Chassidut Behirah and Kehot.

עברית: הקוד ב-GPL; הטקסטים – לפי רישיון המקור. **התניא ב-CC BY-NC – שימוש לא מסחרי בלבד**, ומי שמעתיק את המאגר לשימוש מסחרי צריך להסיר אותו או להחליפו.
תורה אור ולקוטי תורה: נוסח מנוקד: חסידות בהירה, על פי מהדורת קה״ת ה׳תשע״ה; באישור, לשימוש לא מסחרי בלבד. לפי דיווח בעל האתר, אושר ע״י חסידות בהירה וקה״ת, לשימוש לא מסחרי בלבד. אין בידינו מסמך רישיון בכתב. מי שמעתיק את המאגר צריך להסיר את הניקוד (להריץ מחדש את tools/build-tolt.mjs), אלא אם קיבל רשות בעצמו.
