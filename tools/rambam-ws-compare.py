# Round 3: compare the Rambam text we ship (Torat Emet 363) with Sefaria's independent "Wikisource Mishneh Torah"
# version, word by word on consonants, to FLAG possible source typos. Nothing is changed automatically.
# Normalisation (so that legitimate edition differences are not flagged): niqqud, punctuation, markup and verse
# citations in parentheses are removed, and the matres lectionis ו/י are dropped (Torat Emet spells חסר, Wikisource מלא).
# Usage: python3 tools/rambam-ws-compare.py   (fetches into /tmp/rs/ws, writes verification/rambam-ws-mismatches.json)
import json, os, re, sys, time, difflib, urllib.request, urllib.parse, concurrent.futures as cf
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = '/tmp/rs/ws'; os.makedirs(CACHE, exist_ok=True)
WS = 'Wikisource Mishneh Torah'
idx = json.load(open(f'{ROOT}/site/data/rambam/index.json'))
src = json.load(open(f'{ROOT}/site/data/sources.json'))
jobs = []
for name, m in idx.items():
    if name in (src.get('rambamOverrides') or {}): continue  # already from Wikisource
    for c in range(1, (len(m['chapters']) if m['depth'] == 2 else 1) + 1):
        jobs.append((name, m['slug'], c, f'Mishneh Torah, {name}.{c}' if m['depth'] == 2 else f'Mishneh Torah, {name}'))
def get(j):
    f = f'{CACHE}/{j[1]}.{j[2]}.json'
    if os.path.exists(f): return json.load(open(f))
    url = 'https://www.sefaria.org/api/v3/texts/' + urllib.parse.quote(j[3]) + '?version=' + urllib.parse.quote('hebrew|' + WS)
    for t in range(4):
        try:
            d = json.load(urllib.request.urlopen(url, timeout=60))
            v = next((x for x in d.get('versions', []) if x.get('versionTitle') == WS), None)
            out = v['text'] if v else None; json.dump(out, open(f, 'w')); return out
        except Exception: time.sleep(1.5 * (t + 1))
    return None
def words(s):
    s = re.sub(r'<[^>]+>', ' ', s); s = re.sub(r'\([^)]*\)', ' ', s)
    s = re.sub(r'[\u0591-\u05C7]', '', s); s = re.sub(r'[^\u05D0-\u05EA\s]', ' ', s)
    return s.split()
key = lambda w: re.sub(r'[וי]', '', w).replace('ך', 'כ').replace('ם', 'מ').replace('ן', 'נ').replace('ף', 'פ').replace('ץ', 'צ')
with cf.ThreadPoolExecutor(6) as ex: wss = list(ex.map(get, jobs))
meta = dict(halachot=0, identical=0, withDiff=0, missing=0, diffs=0, abbreviationOrNumeral=0, singleWordSubstitutions=0, nearIdenticalSubstitutions=0)
flags = []
for j, ws in zip(jobs, wss):
    ours = json.load(open(f'{ROOT}/site/data/rambam/{j[1]}/{j[2]}.json'))['s']
    for k, h in enumerate(ours):
        if not isinstance(ws, list) or k >= len(ws) or not ws[k]: meta['missing'] += 1; continue
        meta['halachot'] += 1
        A, B = words(h), words(ws[k])
        sm = difflib.SequenceMatcher(None, [key(w) for w in A], [key(w) for w in B], autojunk=False)
        ops = [o for o in sm.get_opcodes() if o[0] != 'equal']
        if not ops: meta['identical'] += 1; continue
        meta['withDiff'] += 1
        for tag, a1, a2, b1, b2 in ops:
            meta['diffs'] += 1
            one = tag == 'replace' and a2 - a1 == 1 and b2 - b1 == 1
            # Wikisource writes numbers and some words abbreviated (ג for שלשה, ה for על, יי for the Name): not a typo signal
            if one and (len(B[b1]) <= 2 or B[b1] in ('אפי', 'שנא', 'ואפי')): meta['abbreviationOrNumeral'] += 1; continue
            if one: meta['singleWordSubstitutions'] += 1
            flags.append(dict(ref=f'{j[1]}.{j[2]}.{k+1}', op=tag, ours=' '.join(A[a1:a2]), wikisource=' '.join(B[b1:b2]), single=one,
                              ratio=round(difflib.SequenceMatcher(None, key(A[a1]) if a2 > a1 else '', key(B[b1]) if b2 > b1 else '').ratio(), 2)))
            if one and flags[-1]['ratio'] >= 0.75: meta['nearIdenticalSubstitutions'] += 1
meta['method'] = 'word-level consonant comparison against Sefaria "Wikisource Mishneh Torah" after removing niqqud, punctuation, parenthesised verse citations and the matres ו/י; every difference is listed for human review, none is applied automatically'
json.dump(dict(meta=meta, flags=flags), open(f'{ROOT}/verification/rambam-ws-mismatches.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(json.dumps(meta, ensure_ascii=False))
