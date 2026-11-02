# Round 3: flag probable niqqud typos in the Rambam edition we ship (Torat Emet 363 is the only vocalised free
# edition, so there is no second vocalised text to compare with). A word is flagged when its vocalisation is rare
# (<=2 occurrences) while the same consonants are vocalised one way at least 8 times elsewhere in the edition and the
# letter count matches. Many flags are legitimate homographs (e.g. different binyan or tense): NOTHING is changed
# automatically; hand-checked fixes go to tools/rambam-errata-src.py. Writes verification/rambam-niqqud-flags.json.
import json, re, glob, os, unicodedata, collections
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cnt = collections.defaultdict(collections.Counter); occ = []
cl = lambda w: re.findall(r'[\u05D0-\u05EA][\u0591-\u05C7]*', w)
norm = lambda c: re.sub(r'[\u05BC\u05BD\u0591-\u05AF\u05C1\u05C2]', '', c)
for f in sorted(glob.glob(f'{ROOT}/site/data/rambam/*/*.json')):
    b = f.split('/')[-2]; c = f.split('/')[-1][:-5]
    for i, h in enumerate(json.load(open(f))['s']):
        for w in re.findall(r'[\u05D0-\u05EA\u0591-\u05C7]+', unicodedata.normalize('NFC', h)):
            if not re.search(r'[\u05B0-\u05BB]', w): continue
            s = re.sub(r'[\u0591-\u05C7]', '', w); k = ''.join(norm(x) for x in cl(w)); cnt[s][k] += 1; occ.append((f'{b}.{c}.{i+1}', s, k, w))
per = collections.defaultdict(list)
for ref, s, k, w in occ:
    (maj, mc), = cnt[s].most_common(1)
    if k != maj and cnt[s][k] <= 2 and mc >= 8 and len(cl(maj)) == len(cl(k)): per[ref].append(w)
r = sorted(per.items(), key=lambda x: (-len(x[1]), x[0]))
meta = dict(halachotFlagged=len(r), halachotWith3plus=sum(1 for _, w in r if len(w) >= 3), wordsFlagged=sum(len(w) for _, w in r),
            method='rare vocalisation (<=2) of consonants vocalised one way >=8 times elsewhere in the same edition; for human review only')
json.dump(dict(meta=meta, flags=dict(r)), open(f'{ROOT}/verification/rambam-niqqud-flags.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(json.dumps(meta, ensure_ascii=False))
