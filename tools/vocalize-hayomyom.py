#!/usr/bin/env python3
"""1.0.76: adds a vocalized reading text ("v") to every Hayom Yom paragraph, for read-aloud only (display keeps the book's
unvocalized text). Vocalizer: Dicta Nakdan (rabbinic genre, nakdan.dicta.org.il), called once at build time; cached in
/workspace/hayomyom/voc-cache.json. Abbreviations (words with " or ') stay unvocalized so the app's tts-prep table expands them."""
import json, re, os, time, urllib.request, html as H
P = os.path.join(os.path.dirname(__file__), '..', 'site', 'data', 'hayomyom', 'days.json')
C = '/workspace/hayomyom/voc-cache.json'
cache = json.load(open(C)) if os.path.exists(C) else {}
def nakdan(t):
    if t in cache: return cache[t]
    body = json.dumps({'task': 'nakdan', 'data': t, 'genre': 'rabbinic', 'addmorph': False, 'keepqq': True, 'nodageshdefmem': False, 'patachma': False, 'keepmetagim': True}).encode()
    for k in range(4):
        try:
            r = urllib.request.urlopen(urllib.request.Request('https://nakdan-u1-0.loadbalancer.dicta.org.il/api', body, {'Content-Type': 'application/json'}), timeout=60).read(); break
        except Exception: time.sleep(5)
    out = []
    for w in json.loads(r):
        o = w['word']
        if w.get('sep') or not w.get('options') or re.search(r'["\'״׳]', o) or not re.search(r'[\u05d0-\u05ea]', o): out.append(o)
        else: out.append(w['options'][0].replace('|', ''))
    cache[t] = ''.join(out); time.sleep(0.3); return cache[t]
D = json.load(open(P)); n = 0
for k, e in D.items():
    for p in e['p']:
        plain = re.sub(r'<[^>]+>', '', p[0])
        if len(p) < 3: p.append(nakdan(plain)); n += 1
    if n % 50 == 0: json.dump(cache, open(C, 'w'), ensure_ascii=False)
json.dump(cache, open(C, 'w'), ensure_ascii=False)
json.dump(D, open(P, 'w'), ensure_ascii=False, separators=(',', ':'))
print('vocalized', n, os.path.getsize(P))
