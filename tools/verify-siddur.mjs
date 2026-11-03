// Cross-checks passages of the siddur (Open Siddur, Nusach Ari – Chabad) against a second, independent edition:
// "The Metsudah Siddur" (1981), Nusach Sefard, as published by Sefaria under CC BY. Nusach Sefard is the closest
// printed nusach to Chabad, so the differences that remain are listed and classified, not "fixed".
//   node tools/verify-siddur.mjs --fetch   download the reference passages (build-time only; the app never fetches)
//   node tools/verify-siddur.mjs           recompute from verification/siddur-ref.json, write verification/SIDDUR-VERIFICATION.md
import fs from 'node:fs';
const root = new URL('..', import.meta.url).pathname;
export const PASSAGES = [
  // name, our section, Sefaria node (Siddur Sefard, …), first words, last words
  ['ברוך שאמר', 'shacharit/1', 'Weekday_Shacharit,_Hodu', 'ברוך שאמר והיה העולם', 'מהלל בתשבחות'],
  ['הודו', 'shacharit/1', 'Weekday_Shacharit,_Hodu', 'הודו ליהוה קראו בשמו', 'והלל ליהוה'],
  ['אשרי (פסוקי דזמרה)', 'shacharit/1', 'Weekday_Shacharit,_Hodu', 'אשרי יושבי ביתך', 'מעתה ועד עולם הללויה'],
  ['ישתבח', 'shacharit/1', 'Weekday_Shacharit,_Yishtabach', 'ישתבח שמך לעד', 'חי העולמים'],
  ['יוצר אור', 'shacharit/1', 'Weekday_Shacharit,_The_Shema', 'יוצר אור ובורא חשך', 'יוצר המאורות'],
  ['אהבת עולם / אהבה רבה', 'shacharit/1', 'Weekday_Shacharit,_The_Shema', 'אהבת עולם|אהבה רבה', 'הבוחר בעמו ישראל באהבה'],
  ['אמת ויציב', 'shacharit/2', 'Weekday_Shacharit,_The_Shema', 'אמת ויציב', 'גאל ישראל'],
  ['שמונה עשרה', 'shacharit/3', 'Weekday_Shacharit,_Amidah', 'אדני שפתי תפתח', 'המברך את עמו ישראל בשלום'],
  ['והוא רחום (שני וחמישי)', 'shacharit/4', 'Weekday_Shacharit,_For_Monday_&_Thursday', 'והוא רחום יכפר עון ולא ישחית והרבה', 'יהוה אלהינו יהוה אחד'],
  ['אשרי (אחרי קריאת התורה)', 'shacharit/5', 'Weekday_Shacharit,_Ashrei', 'אשרי יושבי ביתך', 'מעתה ועד עולם הללויה'],
  ['ובא לציון', 'shacharit/5', 'Weekday_Shacharit,_Ashrei', 'ובא לציון גואל', 'יגדיל תורה ויאדיר'],
  ['עלינו', 'shacharit/6', 'Weekday_Shacharit,_Aleinu', 'עלינו לשבח', 'יהיה יהוה אחד ושמו אחד'],
  ['שיר של יום – ראשון', 'shacharit/6', 'Weekday_Shacharit,_Song_of_the_Day', 'היום יום ראשון', 'לארך ימים'],
  ['אלהי נשמה', 'boker/1', 'Weekday_Shacharit,_Morning_Blessings', 'אלהי נשמה', 'לפגרים מתים'],
  ['אשר יצר', 'boker/1', 'Weekday_Shacharit,_Morning_Blessings', 'אשר יצר את האדם', 'ומפליא לעשות'],
  ['המעריב ערבים', 'maariv/1', 'Weekday_Maariv,_The_Shema', 'אשר בדברו מעריב ערבים', 'המעריב ערבים'],
  ['אמת ואמונה', 'maariv/2', 'Weekday_Maariv,_The_Shema', 'אמת ואמונה', 'גאל ישראל'],
  ['השכיבנו', 'maariv/2', 'Weekday_Maariv,_The_Shema', 'השכיבנו', 'ישראל לעד'],
  ['ויהי נועם', 'maariv/3', 'Weekday_Maariv,_Motzaei_Shabbat', 'ויהי נעם', 'ואראהו בישועתי'],
];
// Reading of the differences (both texts were read side by side). "לבדיקה" = could not be settled without a Chabad
// printed siddur, which this project does not use as a source; nothing was changed on a guess.
export const NOTES = {
  'ברוך שאמר': 'הבדלי סדר ("ברוך עושה בראשית") ו„אב / האב הרחמן”, „ונגדלך” – הבדלי נוסח מוכרים; אין טעות תעתיק.',
  'הודו': 'זהה; ההבדלים הם כתיב מלא/חסר בלבד.',
  'אשרי (פסוקי דזמרה)': 'זהה. הבדיקה מצאה שבגרסה הקודמת של הממיר נבלע הפסוק „עיני כל אליך” בתוך הוראה באנגלית שצמודה אליו במקור – תוקן בממיר.',
  'אשרי (אחרי קריאת התורה)': 'זהה (כתיב בלבד).',
  'ישתבח': 'בנוסח ספרד נוסף „לעולם ועד” ו„אל”; נוסח חב״ד בלעדיהם – תואם את המנהג הידוע.',
  'יוצר אור': '„שיצרת” מול „שעשית המה”, ‏„ומברכים…” בם׳ מול נ׳, ובנוסח ספרד נוסף „אור חדש על ציון תאיר” – הנוסח שלנו כמנהג האריז״ל שאין אומרים אותו.',
  'אהבת עולם / אהבה רבה': 'בשחרית חב״ד אומרים „אהבת עולם” (נוסח ספרד: „אהבה רבה”), עם „והביאנו לשלום” – סימני נוסח האריז״ל.',
  'אמת ויציב': 'הבדלים קטנים בסוף („צור ישראל קומה” של נוסח ספרד חסר בנוסח חב״ד, שאומר „גאל ישראל” מיד אחרי „ונאמר”).',
  'שמונה עשרה': 'אצלנו משולבים בגוף העמידה התוספות לימים מיוחדים (זכרנו, מי כמוך, המלך הקדוש, עננו, מודים דרבנן, וכתוב), ובמקור השני הן בנפרד; במקור השני יש כותרות ברכות („אבות”, „גבורות”…). הבדלי נוסח אמיתיים: „רפואה שלמה לכל מכותינו”, „המינים וכל הזדים… יאבדו”, „ומלכות הרשעה… ותכניע”, „אב הרחמן רחם עלינו” – כולם נוסח חב״ד המוכר. לבדיקה: „וכסא דוד… בתוכה / לתוכה תכין”.',
  'והוא רחום (שני וחמישי)': 'נוסח ספרד ארוך יותר (כמה פסקאות שאינן בנוסח חב״ד, כגון „חוסה ה׳ על עמך”, „אל הביטה דל כבודנו”). תוקנה טעות תעתיק „עקדת יהד” ← „יחיד”. לבדיקה: „עֹשֶׂת חסד חנם” (כנראה „עֲשׂוֹת”), „קשינו / רשענו / חטאתנו” (גוף ראשון; בנוסח ספרד גוף שלישי).',
  'ובא לציון': '„שגיא / סגיא” כתיב ארמי; תואם.',
  'עלינו': 'לבדיקה: בתעתיק חסרה השורה „ומתפללים אל אל לא יושיע” (שורה שנמחקה בדפוסים רבים בגלל הצנזורה). לא הוספה.',
  'שיר של יום – ראשון': 'הקטע שנבדק משתרע על שירי כל ימות השבוע עד „לארך ימים”; תואם (כתיב בלבד).',
  'אלהי נשמה': 'זהה.',
  'אשר יצר': 'סדר „יפתח… יסתם” הפוך בתעתיק, ובנוסח ספרד נוסף „ולעמוד לפניך” – הבדלי נוסח מוכרים.',
  'המעריב ערבים': 'בנוסח ספרד נוסף „אל חי וקיים תמיד ימלוך עלינו”; בנוסח חב״ד אין.',
  'אמת ואמונה': 'תוקנה טעות תעתיק „ונפלות” ← „ונפלאות” (גם בליל שבת). שאר ההבדלים („נסים ונקמה”, מקום „הגואלנו”) – נוסח.',
  'השכיבנו': '„השכיבנו אבינו לשלום” – נוסח האריז״ל. תוקנו: „ומאהרינו” ← „ומאחרינו”, והוחזרה המילה „וחרב”. לבדיקה: מקום „כי אל שומרנו ומצילנו אתה” (אצלנו אחרי „מעתה ועד עולם”).',
  'ויהי נועם': 'זהה (כתיב בלבד).',
};
const FIN = 'ךםןףץ', BASE = 'כמנפצ';
export const words = html => html.replace(/<small>[\s\S]*?<\/small>/g, ' ').replace(/<\/?(b|i|big|small)>/g, '').replace(/<[^>]*>/g, ' ').replace(/[\u05BE\u05C0\u05C3]/g, ' ').normalize('NFD').replace(/[\u0591-\u05C7]/g, '')
  .replace(/ײ/g, 'יי').replace(/[ךםןףץ]/g, c => BASE[FIN.indexOf(c)]).replace(/[^א-ת]+/g, ' ').trim().split(' ').filter(Boolean)
  .map(w => w.replace(/^([ובכלמשה]{0,2})(יי|יהוה)$/, '$1יהוה'));
const fin = w => w.replace(/[כמנפצ]$/, c => FIN[BASE.indexOf(c)]);
const find = (ws, phrase, from = 0) => {
  for (const alt of phrase.split('|')) { const p = words(alt); for (let i = from; i <= ws.length - p.length; i++) if (p.every((x, j) => ws[i + j] === x)) return [i, i + p.length]; }
  return null;
};
export const cut = (ws, a, b) => { const s = find(ws, a); if (!s) return null; const e = find(ws, b, s[1]); return e ? ws.slice(s[0], e[1]) : null; };
// word-level LCS diff → [[ours…],[ref…]] change groups
export function diff(A, B) {
  const n = A.length, m = B.length, L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = []; let i = 0, j = 0, cur = null;
  const add = (k, w) => { (cur ||= [[], []])[k].push(w); };
  while (i < n || j < m) {
    if (i < n && j < m && A[i] === B[j]) { if (cur) out.push(cur), cur = null; i++; j++; }
    else if (j >= m || (i < n && L[i + 1][j] >= L[i][j + 1])) add(0, A[i++]); else add(1, B[j++]);
  }
  if (cur) out.push(cur);
  return { same: L[0][0], groups: out };
}
const plene = w => w.replace(/[וי]/g, '');
export const kind = ([a, b]) => a.length && b.length && plene(a.join('')) === plene(b.join('')) ? 'כתיב מלא/חסר' : a.join('') === b.join('') ? 'חלוקת מילים' : 'נוסח';
const ourText = sec => JSON.parse(fs.readFileSync(`${root}site/data/siddur/${sec}.json`)).b.flatMap(x => x[0] === 'p' ? [x[1]] : x[0] === 't' ? x[1].flatMap(r => r.filter(c => c[0] === 'p').map(c => c[1])) : []).join(' '); // 1.0.61: the spoken cells of a table
export function compare(ref) {
  return PASSAGES.map(([name, sec, node, a, b]) => {
    const ours = cut(words(ourText(sec)), a, b), theirs = ref[name] ? ref[name].split(' ') : null;
    if (!ours || !theirs) return { name, sec, node, missing: !ours ? 'ours' : 'ref' };
    const d = diff(ours, theirs);
    return { name, sec, node, n: ours.length, m: theirs.length, sim: 2 * d.same / (ours.length + theirs.length), groups: d.groups.map(g => [g[0].map(fin).join(' '), g[1].map(fin).join(' '), kind(g)]) };
  });
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const refPath = `${root}verification/siddur-ref.json`;
  if (process.argv.includes('--fetch')) {
    const ref = { _source: 'Siddur Sefard – The Metsudah Siddur (1981), Sefaria, CC BY 4.0 – https://www.sefaria.org/Siddur_Sefard', _note: 'Consonantal word skeletons of the passages only, for verification.' };
    const cache = {};
    for (const [name, , node, a, b] of PASSAGES) {
      cache[node] ??= await fetch(`https://www.sefaria.org/api/v3/texts/Siddur_Sefard,_${encodeURIComponent(node)}?version=hebrew`).then(r => r.json()).then(j => [j.versions[0].text].flat(9).join(' '));
      const w = cut(words(cache[node]), a, b);
      if (!w) console.warn('not found in reference:', name); else ref[name] = w.join(' ');
    }
    fs.writeFileSync(refPath, JSON.stringify(ref, null, 1) + '\n');
  }
  const res = compare(JSON.parse(fs.readFileSync(refPath)));
  let md = `# אימות הסידור מול מקור שני\n\nהסידור באפליקציה: Open Siddur – נוסח האריז״ל חב״ד (תעתיק שמואל גונזלס, CC0).\n` +
    `מקור ההשוואה: **סידור מצודה, נוסח ספרד (1981)**, כפי שפורסם בספריא ברישיון CC BY 4.0 (https://www.sefaria.org/Siddur_Sefard).\n` +
    `נוסח ספרד הוא הנוסח המודפס הקרוב ביותר לנוסח חב״ד, ולכן ההבדלים שנשארו מסווגים כאן ולא „תוקנו”. ההשוואה היא על שלד העיצורים (בלי ניקוד, אותיות סופיות מאוחדות, שם ה׳ בכל צורותיו = יהוה).\n\n` +
    `נוצר ב־\`node tools/verify-siddur.mjs\`; הבדיקה \`tests/siddur-verify.test.mjs\` מריצה אותה מחדש.\n\n| קטע | מקום באפליקציה | מילים (אצלנו/מצודה) | התאמה | הבדלי נוסח | הבדלי כתיב |\n|---|---|---|---|---|---|\n`;
  for (const r of res) md += r.missing ? `| ${r.name} | ${r.sec} | – | לא נמצא (${r.missing}) | | |\n` : `| ${r.name} | \`#/s/${r.sec}\` | ${r.n}/${r.m} | ${(r.sim * 100).toFixed(1)}% | ${r.groups.filter(g => g[2] === 'נוסח').length} | ${r.groups.filter(g => g[2] !== 'נוסח').length} |\n`;
  md += `\n## פירוט ההבדלים (אצלנו ← → מצודה ספרד)\n`;
  for (const r of res) if (!r.missing) {
    md += `\n### ${r.name}\n\n**הערכה:** ${NOTES[r.name] || '–'}\n\n`;
    const g = r.groups.filter(x => x[2] === 'נוסח');
    md += g.length ? g.map(([a, b]) => `- ${a || '∅'} ⟷ ${b || '∅'}`).join('\n') + '\n' : '- אין הבדלי נוסח.\n';
    const s = r.groups.filter(x => x[2] !== 'נוסח'); if (s.length) md += `- כתיב בלבד: ${s.map(([a, b]) => `${a}/${b}`).join(' · ')}\n`;
  }
  const idx = JSON.parse(fs.readFileSync(`${root}site/data/siddur/index.json`));
  md += `\n## תיקוני תעתיק שהוחלו (tools/build-siddur.mjs → TEXT_FIX)\n\n` + idx.fixes.map(f => `- ${f.from} ← ${f.to}: ${f.why}`).join('\n') + '\n';
  md += `\n## תיקוני מבנה בממיר שהבדיקה חשפה\n\n- הוראה באנגלית שצמודה במקור לפסוק שאחריה („…when saying the second'''''עֵ'''ינֵי כֹל”) גרמה לפסוק „עיני כל אליך” באשרי של שחרית להיחשב הוראה ולהיעלם מהטקסט. הממיר מפריד אותם כעת.\n- שורות תפילה עם הערה באנגלית בסוגריים (למשל „עֹשֶׂה שָׁלוֹם (During the Ten Days… הַשָּׁלוֹם) בִּמְרוֹמָיו”) סווגו כהוראה. כעת שורה שעיקרה עברית מחוץ לסוגריים נשארת טקסט תפילה.\n`;
  md += `\n## מה לא חב״ד / לבדיקה\n\nלא נמצא קטע בנוסח שאינו נוסח האריז״ל–חב״ד. הנקודות המסומנות „לבדיקה” למעלה הן מקומות שבהם התעתיק עשוי להיות שונה מסידור „תהלת ה׳” המודפס; הן לא שונו בניחוש. התעתיק עצמו מצהיר שהוא „בהתאם לתהלת ה׳” אך אינו מהדורה שלו.\n`;
  fs.writeFileSync(`${root}verification/SIDDUR-VERIFICATION.md`, md);
  for (const r of res) console.log(r.name, r.missing ? 'MISSING ' + r.missing : `${r.n}/${r.m} ${(r.sim * 100).toFixed(1)}% nusach-diffs ${r.groups.filter(g => g[2] === 'נוסח').length}`);
}
