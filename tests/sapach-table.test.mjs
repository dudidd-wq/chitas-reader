// 1.0.187 (Dudi: "תהילים אישי לא מבין נכון את ספח התעודת זהות"): the real appendix is a table – one row per child
// (ID | first name | birth date | sex) and a spouse line. All data below is synthetic (IDs are invalid placeholders).
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSapachText, pickReading } from '../site/js/sapach.js';

const TABLE = `מדינת ישראל - משרד הפנים
ספח לתעודת זהות
מספר זהות: 000000018 שם משפחה: ישראלי שם פרטי: אברהם
מען: רחוב הרצל 12 תל אביב
מצב אישי: נשוי
בן/בת זוג: שרה מספר זהות: 000000026 תאריך לידה: 15/03/1982
ילדים
מספר זהות שם פרטי תאריך לידה מין
000000034 דוד 20/07/2010 ז
000000042 רבקה 03/11/2013 נ
000000059 יעקב 03/11/2013 ז
תאריך הנפקה: 01/01/2020`;
const brief = ps => ps.map(p => `${p.name}|${p.greg}|${p.role}`);

test('table rows: each child keeps the name on its own row (no shift to the next date)', () => {
  const { people } = parseSapachText(TABLE);
  assert.deepEqual(brief(people), [
    'אברהם ישראלי||holder', 'שרה|1982-03-15|spouse', 'דוד|2010-07-20|child', 'רבקה|2013-11-03|child', 'יעקב|2013-11-03|child',
  ]);
  assert.ok(people[0].noDate, 'the holder has no birth date on the appendix – returned for the reader to fill in');
  const dump = JSON.stringify(people);
  for (const id of ['000000018', '000000026', '000000034', '000000042', '000000059']) assert.ok(!dump.includes(id));
  assert.ok(!people.some(p => p.greg === '2020-01-01'), 'the issue date is not a person');
});

test('twins (same birth date, different names) are both kept', () => {
  const { people } = parseSapachText(TABLE);
  assert.equal(people.filter(p => p.greg === '2013-11-03').length, 2);
});

test('OCR column order does not matter; compound names; yyyy/mm/dd and two-digit years', () => {
  const { people } = parseSapachText('ילדים\nז 20/07/2010 דוד 000000034\nנ 2013/11/03 בת שבע 000000042\nז 20.07.10 בן ציון 000000059');
  assert.deepEqual(brief(people), ['דוד|2010-07-20|child', 'בת שבע|2013-11-03|child', 'בן ציון|2010-07-20|child']);
  assert.ok(people.every(p => /^\d\d\/\d\d\/\d{4}$/.test(p.dateRaw)), 'dates are shown as dd/mm/yyyy');
});

test('a Hebrew date next to the civil date stays out of the name; a Hebrew-only date is converted', () => {
  const a = parseSapachText('שם פרטי ישראל שם משפחה לוי תאריך לידה 01.05.1980 כ"ה בניסן התש"ם\nילדים:\nמנחם מענדל 20/07/2010 ח\' באב התש"ע ז\nאבי-גיל 05/06/2015 י"ח בסיון תשע"ה נ').people;
  assert.deepEqual(brief(a), ['ישראל לוי|1980-05-01|holder', 'מנחם מענדל|2010-07-20|child', 'אבי-גיל|2015-06-05|child']);
  const b = parseSapachText('ילדים\nדוד ח\' באב התש"ע\nרבקה א\' באדר ב\' תשע"ד').people;
  assert.equal(b[0].greg, '2010-07-19'); // ח׳ אב תש״ע
  assert.equal(b[0].fromHebrew, 'ח\' באב התש"ע');
  assert.equal(b[1].greg, '2014-03-03'); // א׳ אדר ב׳ תשע״ד
});

test('a child marked ז"ל: the death date is never a birth date, and the row is flagged', () => {
  const { people } = parseSapachText('ילדים\nיוסף 01/02/2005 ז"ל 03/04/2006');
  assert.equal(people.length, 1);
  assert.equal(people[0].greg, '2005-02-01');
  assert.equal(people[0].deceased, true);
});

test('OCR that reads the table column by column is put back together', () => {
  const { people } = parseSapachText('ילדים\nשם פרטי\nדוד\nרבקה\nיעקב\nתאריך לידה\n20/07/2010\n03/11/2013\n03/11/2013');
  assert.deepEqual(brief(people), ['דוד|2010-07-20|child', 'רבקה|2013-11-03|child', 'יעקב|2013-11-03|child']);
});

test('pickReading keeps the OCR reading with the most complete people', () => {
  const bad = 'ילדים\nמספר זהות שם פרטי תאריך לידה מין\n4" דוד 20 ז';
  assert.equal(pickReading([bad, TABLE]), TABLE);
  assert.equal(pickReading([TABLE, bad]), TABLE);
});

test('review fixes: an ID right before a date never eats the date; previous names; issue date after a birth date; Hebrew birth date beside an issue date', () => {
  const a = parseSapachText('בן/בת זוג: שרה ת.ז. 000000026 15/03/1982\nילדים\nמספר זהות: 000000034  25/07/2010 דוד').people;
  assert.deepEqual(a.map(p => `${p.name}|${p.greg}`), ['שרה|1982-03-15', 'דוד|2010-07-25']);
  const b = parseSapachText('שם משפחה קודם: גולדברג שם פרטי: חנה שם משפחה: כהן תאריך לידה: 02/02/1985').people;
  assert.deepEqual(b.map(p => p.name), ['חנה כהן']);
  const c = parseSapachText('ילדים\nדוד 20/07/2010 תאריך הנפקה: 01/01/2020').people;
  assert.deepEqual(c.map(p => `${p.name}|${p.greg}`), ['דוד|2010-07-20']);
  const d = parseSapachText('ילדים\nדוד ח\' באב התש"ע הונפק 01/01/2020').people;
  assert.deepEqual(d.map(p => `${p.name}|${p.greg}`), ['דוד|2010-07-19']);
});

test('review fixes: a pending holder is kept when the next line has its own "שם פרטי:" with a date', () => {
  const { people } = parseSapachText('שם משפחה: ישראלי שם פרטי: אברהם\nבן/בת זוג: שם פרטי: שרה תאריך לידה: 15/03/1982');
  assert.deepEqual(people.map(p => `${p.name}|${p.greg}|${p.role}`), ['אברהם ישראלי||holder', 'שרה|1982-03-15|spouse']);
});

test('review fixes 2: blank earlier-name / parent fields never swallow the next label; Hebrew issue/marriage dates are not people; an earlier issue date on a merged line does not drop the next birth date', () => {
  const a = parseSapachText('שם משפחה: ישראלי שם משפחה קודם: שם פרטי: אברהם תאריך לידה: 01/05/1980').people;
  assert.deepEqual(a.map(p => `${p.name}|${p.greg}`), ['אברהם ישראלי|1980-05-01']);
  const b = parseSapachText('שם פרטי: אברהם שם משפחה: ישראלי תאריך לידה: 01/05/1980\nשם משפחה קודם: תאריך הנפקה: 01/01/2020').people;
  assert.deepEqual(b.map(p => `${p.name}|${p.greg}`), ['אברהם ישראלי|1980-05-01']);
  const c = parseSapachText('שם האב: שם פרטי: שרה תאריך לידה: 15/03/1982').people;
  assert.deepEqual(c.map(p => `${p.name}|${p.greg}`), ['שרה|1982-03-15']);
  const d = parseSapachText('שם פרטי: אברהם שם משפחה: ישראלי תאריך לידה: 01/05/1980\nתאריך הנפקה: 01/01/2020 ו\' בטבת התש"ף\nתאריך נישואין: י"ח באדר התש"ס').people;
  assert.deepEqual(d.map(p => p.name), ['אברהם ישראלי']);
  const e = parseSapachText('ילדים\nהונפק 01/01/2020 דוד 20/07/2010').people;
  assert.deepEqual(e.map(p => `${p.name}|${p.greg}`), ['דוד|2010-07-20']);
  assert.ok(!/\d/.test(parseSapachText('מספר 1234567-8').raw.replace(/\s/g, '')));
});

test('review fixes 3: unquoted ז ל, month-named people, a dateless line with more fields, a reversed Hebrew issue date', () => {
  const a = parseSapachText('שם פרטי: אברהם שם משפחה: ישראלי תאריך לידה: 01/05/1980\nילדים\nיוסף 01/02/2005 ז ל 03/04/2006').people;
  assert.equal(a.find(p => p.name === 'יוסף')?.deceased, true);
  const b = parseSapachText('ילדים\nסיון 03/06/2012\nניסן 04/04/2014').people;
  assert.deepEqual(b.map(p => p.name), ['סיון', 'ניסן']);
  const c = parseSapachText('ילדים\nדוד ח\' באב התש"ע').people;
  assert.deepEqual(c.map(p => p.name), ['דוד']);
  const d = parseSapachText('שם משפחה: ישראלי\nשם פרטי: אברהם מצב אישי: נשוי לאום: יהודי').people;
  assert.deepEqual(d.map(p => `${p.name}|${p.role}`), ['אברהם ישראלי|holder']);
  const e = parseSapachText('שם פרטי: אברהם שם משפחה: ישראלי תאריך לידה: 01/05/1980\n01/01/2020 ו\' בטבת התש"ף תאריך הנפקה:').people;
  assert.deepEqual(e.map(p => p.name), ['אברהם ישראלי']);
});
