# Round 5: find niqqud that is *structurally impossible* in Hebrew, so a defect needs no judgement call:
#  two-vowels  – one consonant carries two vowel signs (e.g. patah+qamats)
#  two-shevas  – the first two letters of a word both carry sheva
#  sheva-hataf – the first letter has sheva and the second a hataf vowel (בְּאֱ… is always בֶּאֱ…)
#  final-hataf – a hataf vowel on the last letter of a word
# Writes verification/rambam-niqqud-invariants.json with, for each hit, the edition's dominant vocalisation of the same
# consonants (if any) as a candidate. Nothing is applied from here; see verification/RAMBAM-ERRATA.md.
import json, re, glob, os, unicodedata, collections
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = set('\u05B0\u05B1\u05B2\u05B3\u05B4\u05B5\u05B6\u05B7\u05B8\u05B9\u05BA\u05BB\u05C7'); HATAF = set('\u05B1\u05B2\u05B3')
cl = lambda w: re.findall(r'[\u05D0-\u05EA][\u0591-\u05C7]*', w)
vow = lambda c: [x for x in c[1:] if x in V]
norm = lambda c: re.sub(r'[\u05BC\u05BD\u0591-\u05AF\u05C1\u05C2]', '', c)
def defects(w):
    c = cl(w); out = []
    if not c: return out
    for x in c:
        vs = vow(x)
        # holam is not counted: a holam drawn on the next letter (לוֶֹה = lo-veh, בשֶֹׁם = bosem) is the usual
        # typographic way to write a holam that belongs to the previous letter, not an error
        if len([v for v in vs if v not in '\u05B9\u05BA']) > 1: out.append('two-vowels')
    if len(c) >= 2 and vow(c[0]) == ['\u05B0'] and vow(c[1]) == ['\u05B0']: out.append('two-shevas')
    if len(c) >= 2 and vow(c[0]) == ['\u05B0'] and len(vow(c[1])) == 1 and vow(c[1])[0] in HATAF: out.append('sheva-hataf')
    if len(c) >= 2 and any(v in HATAF for v in vow(c[-1])): out.append('final-hataf')
    return out
cnt = collections.defaultdict(collections.Counter); hits = []
for f in sorted(glob.glob(f'{ROOT}/site/data/rambam/*/*.json')):
    b = f.split('/')[-2]; ch = f.split('/')[-1][:-5]
    for i, h in enumerate(json.load(open(f))['s']):
        for w in re.findall(r'[\u05D0-\u05EA\u0591-\u05C7]+', unicodedata.normalize('NFC', h)):
            s = re.sub(r'[\u0591-\u05C7]', '', w); k = ''.join(norm(x) for x in cl(w)); cnt[s][k] += 1
            d = defects(w)
            if d: hits.append(dict(ref=f'{b}.{ch}.{i+1}', word=w, kinds=d, cons=s, key=k))
for h in hits:
    best = [(k, n) for k, n in cnt[h['cons']].most_common() if not defects(k)]
    h['candidate'], h['candidateCount'] = (best[0] if best else (None, 0))
by = collections.Counter(k for h in hits for k in h['kinds'])
meta = dict(words=len(hits), halachot=len({h['ref'] for h in hits}), byKind=dict(by))
json.dump(dict(meta=meta, hits=hits), open(f'{ROOT}/verification/rambam-niqqud-invariants.json', 'w'), ensure_ascii=False, indent=0)
print(json.dumps(meta, ensure_ascii=False))
