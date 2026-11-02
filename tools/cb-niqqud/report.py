"""Markdown table of the per-lesson verification numbers (verification/chassidut-behirah-stats.json) for the sample in
verification/CHASSIDUT-BEHIRAH.md:  python report.py slug:day ..."""
import json, os, sys
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../..')
S = json.load(open(os.path.join(R, 'verification/chassidut-behirah-stats.json')))
SC = json.load(open(os.path.join(R, 'site/data/tolt/schedule.json')))
GEM = dict(zip(range(1, 10), 'אבגדהוזחט')); GEM.update({10*i: c for i, c in zip(range(1, 10), 'יכלמנסעפצ')}); GEM.update({100: 'ק', 200: 'ר'})
def gem(n):
    s = ''
    for v in (200, 100): 
        while n >= v: s += GEM[v]; n -= v
    if n in (15, 16): return s + ('טו' if n == 15 else 'טז')
    if n >= 10: s += GEM[n // 10 * 10]; n %= 10
    return s + (GEM[n] if n else '')
print('| # | שיעור (פרשה, יום) | מקום | קובץ CB | מילים (בלי ר״ת) | אותיות זהות | מוצג מנוקד | פסקאות מנוקדות | נדחו בבדיקת ניקוד |')
print('|---|---|---|---|---|---|---|---|---|')
for i, a in enumerate(sys.argv[1:], 1):
    slug, day = a.split(':'); day = int(day); st = S[slug][day - 1]; e = SC['weeks'][slug]['days'][day - 1]
    place = f"{e.get('he') or ('תורה אור' if e['w'] == 'to' else 'לקוטי תורה')} {gem(e['daf'])}/{e['amud']}" if isinstance(e.get('daf'), int) else e.get('he', '')
    print(f"| {i} | {slug} {day} | {place} | {st['doc']} | {st['plain']} | {100*st['matched']/st['plain']:.1f}% | {100*st['shown']/st['plain']:.1f}% | {st['parasNq']}/{st['parasText']} | {st['rejected']} |")
