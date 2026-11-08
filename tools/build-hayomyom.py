#!/usr/bin/env python3
"""Hayom Yom (Hebrew) from ChabadText (text.chabadpedia.com, GFDL 1.3 typed text; © Kehot, used under Kehot's general
permission for free study sites/apps). Input: raw/*.json (MediaWiki action=parse of each "היום יום <day> <month>" page,
fetched once by fetch.py). Output: site/data/hayomyom/days.json  {"<month key>-<day>": {"ref", "rev", "p": [[html, italic]]}}"""
import json, re, sys, os, html as H
RAW = sys.argv[1] if len(sys.argv) > 1 else '/workspace/hayomyom/raw'
OUT = os.path.join(os.path.dirname(__file__), '..', 'site', 'data', 'hayomyom', 'days.json')
MON = {'תשרי': 'tishrei', 'חשון': 'cheshvan', 'כסלו': 'kislev', 'טבת': 'tevet', 'שבט': 'shvat', 'אדר א\'': 'adar1', 'אדר ב\'': 'adar2',
       'ניסן': 'nisan', 'אייר': 'iyyar', 'סיון': 'sivan', 'תמוז': 'tamuz', 'מנחם אב': 'av', 'אב': 'av', 'אלול': 'elul'}
L = {c: v for v, c in zip([1,2,3,4,5,6,7,8,9,10,20,30], 'אבגדהוזחטיכל')}
def num(s):
    s = re.sub(r'[\'"״׳]', '', s); return 15 if s == 'טו' else 16 if s == 'טז' else sum(L[c] for c in s)
def clean(h):
    h = re.sub(r'<a [^>]*>(.*?)</a>', r'\1', h, flags=re.S)
    h = re.sub(r'<(?!/?(b|i|br)\b)[^>]+>', '', h)
    return re.sub(r'\s+', ' ', H.unescape(h)).strip()
out = {}
for f in sorted(os.listdir(RAW)):
    d = json.load(open(os.path.join(RAW, f)))['parse']; t = d['title'][len('היום יום '):]
    day, mon = t.split(' ', 1); k = f"{MON[mon]}-{num(day)}"
    h = d['text']['*']; h = h[h.find('</table>') + 8:]; h = h[:h.find('<!--')]
    m = re.search(r'<div style="text-align:justify">(.*)</div>', h, re.S); body = m.group(1) if m else h
    parts = re.split(r'</?p>', body); P = []
    for x in parts:
        x = x.strip()
        if not x: continue
        it = x.startswith('<i>') and x.rstrip().endswith('</i>')
        c = clean(x[3:-4] if it else x)
        if c and re.search('[\u05d0-\u05ea]', re.sub('<[^>]+>', '', c)): P.append([c, it])
    assert P, t
    out[k] = {'ref': t, 'rev': d.get('revid'), 'p': P}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(out, open(OUT, 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(out), os.path.getsize(OUT))
