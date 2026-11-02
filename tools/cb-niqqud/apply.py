"""Write the Chassidut Behirah niqqud into the Torah Or / Likkutei Torah lessons (site/data/tolt/w/*.json).
Run after tools/build-tolt.mjs, on its fresh (unvocalised) output:  CB_WORK=<dir of extracted *.json> python apply.py
Rules (verification/CHASSIDUT-BEHIRAH.md):
  * a word is vocalised only if, after removing the niqqud, its letters are exactly the Kehot word (final letters
    included); Kehot abbreviations (׳ ״ ' ") and anything that is not plain letters are left as they are;
  * a paragraph is shown vocalised (flag nq) only if >= ACCEPT of its plain words were matched; otherwise it stays the
    unvocalised Kehot/Sefaria paragraph, untouched;
  * every vocalised paragraph carries h = sha1 of its text with the niqqud removed (tests check it against the text)."""
import os, sys, json, re, hashlib, collections, multiprocessing as mp
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import align as A
ACCEPT = 0.85
NIQ = re.compile('[\u05b0-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7]')
VOW = set('\u05b0\u05b1\u05b2\u05b3\u05b4\u05b5\u05b6\u05b7\u05b8\u05b9\u05ba\u05bb\u05c7')
ORDER = {'\u05bc': 0, '\u05c1': 1, '\u05c2': 1}  # dagesh, shin/sin dot, then the vowel, then meteg
def strip(s): return NIQ.sub('', s)
def h(s): return hashlib.sha1(strip(s).encode()).hexdigest()[:12]
def valid(v, core):
    """the CB word on the Kehot letters, marks in a fixed order; None if not exactly the same letters or impossible marks"""
    if not v: return None
    out = []
    for ch in v:
        if '\u05d0' <= ch <= '\u05ea': out.append([ch, []])
        elif NIQ.match(ch) and out:
            if ch not in out[-1][1]: out[-1][1].append(ch)
        else: return None
    if ''.join(c for c, _ in out) != core: return None
    for i, (c, ms) in enumerate(out):
        if sum(m in VOW for m in ms) > 1: return None
        if c == 'ש' and not ('\u05c1' in ms or '\u05c2' in ms):
            # a holam on the letter before shares its dot with the shin (מֹשֶׁה, חֹשֶׁךְ): printed once, encoded twice
            if i and '\u05b9' in out[i - 1][1]: ms.append('\u05c1')
            else: return None
        if '\u05bc' in ms and (c in 'אעחר' or (c == 'ה' and i < len(out) - 1)): return None
        if c in 'םןףץ' and ms: return None
        if c == 'ך' and any(m not in '\u05b0\u05b8\u05bc' for m in ms): return None
        if ('\u05c1' in ms or '\u05c2' in ms) and (c != 'ש' or ('\u05c1' in ms and '\u05c2' in ms)): return None
        if any(m in '\u05bf\u05c4\u05c5' for m in ms): return None
    # a vowel lost in the PDF (a mark drawn by a glyph we could not read): in a vocalised word every letter but the
    # last carries a vowel/shva, except the quiescent אהוי and a letter whose vowel is on the next ו (וּ / וֹ)
    if any(m in VOW for _, ms in out for m in ms):
        for i, (c, ms) in enumerate(out[:-1]):
            if c in 'אהוי' or any(m in VOW for m in ms): continue
            n, nm = out[i + 1]
            if n == 'ו' and ('\u05bc' in nm or '\u05b9' in nm): continue
            return None
    return ''.join(c + ''.join(sorted(ms, key=lambda m: ORDER.get(m, 2 if m in VOW else 3))) for c, ms in out)

def week(slug):
    f = os.path.join(A.W, 'w', slug + '.json'); d = json.load(open(f)); stats = []
    for di, day in enumerate(d['days']):
        if not day: stats.append(None); continue
        if any(p.get('nq') for p in day): raise SystemExit(f'{slug}: already vocalised – run tools/build-tolt.mjs first')
        toks, info = A.align_lesson(day)
        by = collections.defaultdict(list)
        for t in toks: by[t['pi']].append(t)
        c = collections.Counter(); P = [0, 0]; shown = 0
        for pi, p in enumerate(day):
            T = by.get(pi, []); plain = [t for t in T if not t['abbr']]
            ok = [(t, valid(t.get('v'), t['core'])) for t in plain if t['st'] in ('eq', 'adapt')]
            # a word printed without any niqqud in the PDF (a few passages are not vocalised there) is not counted as matched
            ok = [(t, v) for t, v in ok if v and NIQ.search(v)]
            c['words'] += len(T); c['abbr'] += len(T) - len(plain); c['plain'] += len(plain); c['matched'] += len(ok)
            c['rejected'] += sum(1 for t in plain if t['st'] in ('eq', 'adapt')) - len(ok)
            P[1] += 1 if plain else 0
            if not plain or len(ok) < ACCEPT * len(plain): continue
            s = p['t']; orig = s
            for t, v in sorted(ok, key=lambda x: -x[0]['a']):
                assert s[t['a']:t['b']] == t['core']
                s = s[:t['a']] + v + s[t['b']:]
            assert strip(s) == strip(orig)
            p['t'] = s; p['nq'] = 1; p['h'] = h(orig); P[0] += 1; shown += len(ok)
        stats.append(dict(doc=info[0] if info else None, paras=len(day), parasNq=P[0], parasText=P[1], shown=shown, **c))
    return slug, d, stats

if __name__ == '__main__':
    S = json.load(open(os.path.join(A.W, 'schedule.json')))
    with mp.Pool(8) as pool: R = pool.map(week, list(S['weeks']))
    allst = {}
    for slug, d, st in R:
        json.dump(d, open(os.path.join(A.W, 'w', slug + '.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
        allst[slug] = st
    out = os.environ.get('CB_STATS', os.path.join(os.path.dirname(__file__), '../../verification/chassidut-behirah-stats.json'))
    json.dump(allst, open(out, 'w'), ensure_ascii=False, indent=0)
    tot = collections.Counter()
    for st in allst.values():
        for x in st or []:
            if x: tot.update({k: v for k, v in x.items() if isinstance(v, int)})
    print(dict(tot))
