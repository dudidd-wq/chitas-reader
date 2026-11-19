// Parse an Israeli ID-appendix text: names + birth dates only; never keep ID numbers.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseSapachText, stripIdNumbers } from '../site/js/sapach.js';
import { parseDmy, formatDmyInput } from '../site/js/calendar.js';

const SAMPLE = `משרד הפנים
ספח תעודת זהות
מספר זהות 012345678
שם משפחה כהן
שם פרטי יוסי
שם האב משה
תאריך לידה 01.05.1980
מין זכר

בני משפחה
שם משפחה כהן
שם פרטי שרה
תאריך לידה 15.03.1982
קרבה אשה

שם משפחה כהן
שם פרטי דני
תאריך לידה 20.07.2010
קרבה בן

שם משפחה כהן
שם פרטי רות
תאריך לידה 03.11.2013
קרבה בת

תאריך הנפקה 01.01.2020
תוקף 01.01.2030
`;

test('stripIdNumbers removes 9-digit IDs and מספר זהות groups', () => {
  const s = stripIdNumbers('מספר זהות 012345678 כהן 01.05.1980 987654321');
  assert.doesNotMatch(s, /012345678/);
  assert.doesNotMatch(s, /987654321/);
  assert.match(s, /כהן/);
  assert.match(s, /01\.05\.1980/);
});

test('parseSapachText finds holder, spouse and children; drops IDs and issue dates', () => {
  const { people } = parseSapachText(SAMPLE);
  const byName = Object.fromEntries(people.map(p => [p.name, p]));
  assert.ok(people.length >= 4, String(people.map(p => p.name)));
  assert.equal(byName['כהן יוסי']?.greg, '1980-05-01');
  assert.equal(byName['כהן שרה']?.greg, '1982-03-15');
  assert.equal(byName['כהן שרה']?.role, 'spouse');
  assert.equal(byName['כהן דני']?.greg, '2010-07-20');
  assert.equal(byName['כהן דני']?.role, 'child');
  assert.equal(byName['כהן רות']?.greg, '2013-11-03');
  assert.equal(byName['כהן רות']?.role, 'child');
  const dump = JSON.stringify(people);
  assert.doesNotMatch(dump, /012345678/);
  assert.doesNotMatch(dump, /987654321/);
  assert.ok(!people.some(p => p.greg === '2020-01-01' || p.greg === '2030-01-01'), 'issue/expiry dates must be ignored');
  assert.ok(!people.some(p => /משה/.test(p.name)), "father's name should not become a person");
});

test('slash and dash dates, messy OCR spacing, US-order rejected', () => {
  const { people } = parseSapachText('שם משפחה לוי\nשם פרטי דוד\nתאריך לידה 7/4/1991\n\nשם רחל 31-02-2000\nשם נועה 05/24/1990');
  assert.equal(people.find(p => p.name.includes('דוד'))?.greg, '1991-04-07');
  assert.ok(!people.some(p => p.greg === '2000-02-31'));
  assert.ok(!people.some(p => p.greg === '1990-24-05' || p.greg === '1990-05-24'), 'US order is not swapped');
});

test('docs mention on-device processing and no ID storage', () => {
  const md = fs.readFileSync(new URL('../verification/PERSONAL-TEHILLIM.md', import.meta.url), 'utf8');
  for (const s of ['ספח', 'במכשיר בלבד', 'מספרי הזהות אינם נשמרים', 'רשימת בדיקה']) assert.ok(md.includes(s), s);
  assert.equal(parseDmy('01051980'), '1980-05-01');
  assert.equal(formatDmyInput('01051980'), '01/05/1980');
});
