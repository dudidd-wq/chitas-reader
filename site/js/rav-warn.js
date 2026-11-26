// 30-day advance notice that the official Rav Yomi luach in this build ends on S.last.
// No unofficial daily lessons are invented past that date.
const RAV_WARN_DAYS = 30;
const RAV_LUACH_URL = 'https://chabad.info/service/1287411/';

export const ravWarnFrom = last => {
  const [y, m, d] = last.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - RAV_WARN_DAYS)).toISOString().slice(0, 10);
};

export function ravWarnBlock(iso, last) {
  if (!last || iso < ravWarnFrom(last)) return null;
  const lastDmy = last.split('-').reverse().join('/');
  const left = Math.max(0, Math.round((Date.parse(last + 'T00:00:00Z') - Date.parse(iso + 'T00:00:00Z')) / 864e5));
  return {
    type: 'note',
    text: `התרעה: לוח ״רב יומי״ שבאתר (מחזור שלישי, שנה שנייה) מסתיים בכ״ג טבת תשפ״ז (${lastDmy}${left === 0 ? ', היום האחרון בלוח' : `, בעוד ${left} ימים`}). טרם הוטמע הלוח של השנה הבאה; לאחר מועד זה לא יוצג כאן שיעור יומי עד להוספת הלוח הרשמי.`,
    href: RAV_LUACH_URL,
    hrefText: 'הלוח הרשמי ב-chabad.info'
  };
}
