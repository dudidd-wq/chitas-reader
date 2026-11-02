#!/usr/bin/env python3
"""Second, independent check for every Wiktionary gloss candidate (round-3 review: "accuracy first").

A candidate (a Wiktionary sense that quotes this exact verse, not flagged as defective) is kept only if its meaning
agrees with TWO independent English witnesses of the word *in this verse*:
  1. STEPBible TAHOT (Translators Amalgamated Hebrew OT, CC BY 4.0, Tyndale House Cambridge): the word-by-word,
     occurrence-level contextual English gloss and the sense-disambiguated lexicon gloss (extended Strong's / BDB).
     The TAHOT root lemma must also be the same root as the Wiktionary lemma (consonants, ignoring matres lectionis).
  2. The JPS 1917 translation of the verse (public domain; text via Sefaria).
The Hebrew gloss words are bridged to English with English Wiktionary's Hebrew entries (kaikki.org extract, CC BY-SA)
and compared with WordNet 3.0 (Princeton licence): same lemma, shared synset, or derivationally related form.
Every pass/fail and its evidence is written to tools/gloss-xcheck.json; survivors are then reviewed by hand
(tools/gloss-review.json). Anything that fails is dropped.

Inputs (not committed — large third-party files; fetched by tools/fetch-xcheck-data.sh):
  /tmp/xchk/tahot1.txt, /tmp/xchk/tahot3.txt   STEPBible-Data TAHOT Gen-Deu, Job-Sng
  /tmp/xchk/he.jsonl                           kaikki.org English-Wiktionary Hebrew dictionary
  /tmp/xchk/jps.json                           JPS 1917 chapters from Sefaria (tools/fetch-jps.mjs)
  /tmp/gloss-cands.json                        candidates written by tools/build-glossary.mjs (check a passed)
"""
import json, re, sys, unicodedata, datetime
from collections import defaultdict
from nltk.corpus import wordnet as wn
from nltk.stem import WordNetLemmatizer

X = '/tmp/xchk/'
OUT = __file__.rsplit('/', 1)[0] + '/gloss-xcheck.json'

# ---- Hebrew normalisation (same as site/js/hnorm.js) ----
MARKS = re.compile('[\u0591-\u05AF\u05BD\u05BF\u05C0\u05C3-\u05C6]')
def norm(w):
    w = MARKS.sub('', w).replace('\u05BC', '').replace('\u05C7', '\u05B8').replace('\u05BA', '\u05B9')
    w = re.sub('[^\u05B0-\u05C2\u05D0-\u05EA]', '', w)
    return re.sub('([\u05D0-\u05EA])([\u05B0-\u05C2]+)', lambda m: m.group(1) + ''.join(sorted(m.group(2))), w)
def cons(w): return re.sub('[^\u05D0-\u05EA]', '', w)
FIN = str.maketrans('ךםןףץ', 'כמנפצ')
def root(w):
    # strong-consonant skeleton: weak letters (א ה ו י נ) dropped, doubled letters collapsed — so hif'il הִשִּׂיג ~ נָשַׂג,
    # נָסַב ~ סָבַב, but תְּרֹעֵם (רעע) ≠ רָעָה only when skeletons differ.
    k = re.sub('[אהוינ]', '', cons(w).translate(FIN))
    return re.sub(r'(.)\1', r'\1', k)

# ---- TAHOT ----
BK = {'Gen': 'Genesis', 'Exo': 'Exodus', 'Lev': 'Leviticus', 'Num': 'Numbers', 'Deu': 'Deuteronomy', 'Psa': 'Psalms'}
tahot = defaultdict(list)  # 'Book c:v' (Hebrew numbering) -> [word dicts]
for f in ('tahot1.txt', 'tahot3.txt'):
    for line in open(X + f, encoding='utf-8'):
        m = re.match(r'^(Gen|Exo|Lev|Num|Deu|Psa)\.(\d+)\.(\d+)(?:\((\d+)\.(\d+)\))?#\d+=([A-Z]+)', line)
        if not m or m.group(6).startswith('X'): continue
        c, v = (m.group(4), m.group(5)) if m.group(4) else (m.group(2), m.group(3))
        cols = line.rstrip('\n').split('\t')
        heb = cols[1]
        lex = re.findall(r'\{(H\d+[A-Za-z]?)=([^=}]+)=([^}]*)\}', line)
        tahot[f'{BK[m.group(1)]} {int(c)}:{int(v)}'].append({
            'he': heb, 'n': norm(re.sub(r'[/\\\u05BE]', '', heb)), 'en': cols[3],
            'lemma': [l[1] for l in lex], 'lex': [l[2] for l in lex]})

# ---- JPS 1917 ----
jps_ch = json.load(open(X + 'jps.json'))
def jps(ref):
    b, cv = ref.rsplit(' ', 1); c, v = cv.split(':')
    t = jps_ch.get(f'{b} {c}', [])
    s = t[int(v) - 1] if int(v) <= len(t) else ''
    return re.sub(r'<[^>]+>', ' ', s if isinstance(s, str) else ' '.join(s))

# ---- Hebrew -> English bridge (English Wiktionary via kaikki) ----
def strip_he(w): return cons(unicodedata.normalize('NFC', w)).translate(FIN)
he2en = defaultdict(set)
for line in open(X + 'he.jsonl', encoding='utf-8'):
    e = json.loads(line)
    gl = [g for s in e.get('senses', []) for g in s.get('glosses', [])[:1]
          if not re.search(r'(form|plural|inflection|alternative|spelling|construct|abbreviation) of', g)]
    if not gl: continue
    keys = {strip_he(e.get('word', ''))} | {strip_he(f['form']) for f in e.get('forms', []) if re.search('[\u05D0-\u05EA]', f.get('form', ''))}
    for k in keys:
        if len(k) >= 2: he2en[k].update(gl)

HE_STOP = set('של את על אל מן או עם כמו מי מה זה זו גם לא כל אשר ש כי אם רק עוד כך יותר אחד אחת אחר מאוד היה היתה הוא היא בו בה לו לה שם עד בין'.split())
EN_STOP = set('''a an the of to in on at by for from with as or and be is are was were been being have has had do does did not no
it its this that these those which who whom what one ones some any someone something thing things person people make made
up out into over about also very more most much many such other another etc used use way kind sort type state act manner
he she they him her them his their i we you me my our your thee thou thy ye unto upon shall will would let lo behold
masculine feminine singular plural participle tense present future past construct first second third noun verb adjective
form forms word words hebrew biblical literally figuratively especially usually'''.split())
lem = WordNetLemmatizer()
def en_words(text):
    text = re.sub(r'\([^)]*\)', ' ', text)
    out = set()
    for w in re.findall(r"[A-Za-z]+", text.lower()):
        if w in EN_STOP or len(w) < 3: continue
        out.add(w)
    return out
def archaic(w):
    c = {w}
    for suf in ('eth', 'est'):
        if w.endswith(suf) and len(w) > 5: c |= {w[:-3], w[:-3] + 'e', w[:-2]}
    if w.endswith('edst'): c.add(w[:-2])
    return c
def lemmas(w):
    return {lem.lemmatize(x, p) for x in archaic(w) for p in 'nvar'} - EN_STOP
def syns(w):
    s = set()
    for l in lemmas(w):
        for sy in wn.synsets(l):
            s.add(sy.name())
            for lm in sy.lemmas():
                for d in lm.derivationally_related_forms(): s.add(d.synset().name())
    return s
def hyper(w):
    """specific nouns only: hypernyms up to 2 levels of synsets at WordNet depth >= 6 (a hornet IS-A insect),
    never generic classes like 'object' or 'act'."""
    s = set()
    for l in lemmas(w):
        for sy in wn.synsets(l, pos='n'):
            if sy.min_depth() < 6: continue
            for h in sy.hypernyms():
                if h.min_depth() >= 5: s.add(h.name())
                for h2 in h.hypernyms():
                    if h2.min_depth() >= 5: s.add(h2.name())
    return s
def agree(A, B):
    """pairs (a, b) of English words that agree: same lemma, shared synset, derivational relation,
    or b is a specific kind of a (a is b's near hypernym, a genus+differentia definition)."""
    pairs = []
    sB = {b: (lemmas(b), syns(b), hyper(b)) for b in B}
    for a in A:
        la, sa = lemmas(a), syns(a)
        na = {sy.name() for l in la for sy in wn.synsets(l, pos='n')}
        for b, (lb, sb, hb) in sB.items():
            if la & lb or sa & sb or na & hb: pairs.append((a, b))
    return pairs

def gloss_en(g):
    out, used = set(), []
    for tok in re.split(r'[\s,;־\-]+', g):
        t = strip_he(tok)
        if len(t) < 2 or t in HE_STOP: continue
        hits = he2en.get(t)
        cand = t
        for _ in range(2):  # strip one/two prefix letters ו ה ב ל מ ש כ
            if hits or len(cand) < 4 or cand[0] not in 'והבלמשכ': break
            cand = cand[1:]; hits = he2en.get(cand)
        if hits:
            used.append(cand)
            for h in hits: out |= en_words(h)
    return out, used

def align(ref, key, toks_n):
    ws = tahot.get(ref, [])
    n, k = (key.split('#') + ['1'])[:2]; k = int(k)
    hits = [w for w in ws if w['n'] == n]
    if len(hits) < k:
        hits = [w for w in ws if cons(w['n']) == cons(n)]
    return hits[k - 1] if len(hits) >= k else None

def main():
    cands = json.load(open('/tmp/gloss-cands.json'))
    review = {f"{e['ref']}|{e['form']}": e for e in json.load(open(__file__.rsplit('/', 1)[0] + '/gloss-review.json'))['entries']}
    res, cnt = {}, defaultdict(int)
    for ref, ws in cands.items():
        J = jps(ref); Jw = en_words(J)
        for key, rec in ws.items():
            texts = [rec['g']]
            rv = review.get(f'{ref}|{key}') or review.get(f"{ref}|{key.split('#')[0]}")
            if rv and rv.get('decision') == 'adapt': texts.append(rv['g2'])
            t = align(ref, key, None)
            r = {'g': rec['g'], 'l': rec['l']}
            if not t:
                r.update(pass_=False, why='no TAHOT word'); cnt['noTahot'] += 1; res[f'{ref}|{key}'] = r; continue
            r['tahot'] = {'he': t['he'], 'en': t['en'], 'lemma': t['lemma'], 'lex': t['lex']}
            r['jps'] = J
            wl = [w for w in re.split(r'\s*(?:<[^>]*>|\(|\)|,|\bגם\b|\bאו\b)\s*', rec['l']) if cons(w)]
            def same(a, b): ra, rb = root(a), root(b); return ra == rb or (min(len(ra), len(rb)) >= 2 and (ra.startswith(rb) or rb.startswith(ra)))
            lemma_ok = any(same(x, w) for x in t['lemma'] for w in wl if re.search('[\u05D0-\u05EA]', x))
            ok_all, ev = True, []
            for g in texts:
                G, used = gloss_en(g)
                T = en_words(t['en']) | set().union(*[en_words(re.sub(r'^:?\s*', '', x).replace('»', ' ').replace('_', ' ')) for x in t['lex']] or [set()])
                p1 = agree(G, T); p2 = agree(G, Jw)
                ev.append({'text': g, 'heWords': used, 'en': sorted(G)[:40], 'tahotAgree': p1[:6], 'jpsAgree': p2[:6]})
                ok_all = ok_all and bool(p1) and bool(p2)
            r['ev'] = ev; r['lemmaOk'] = lemma_ok
            r['pass_'] = bool(ok_all and lemma_ok)
            if not lemma_ok: r['why'] = 'lemma mismatch'; cnt['lemma'] += 1
            elif not ev[0]['en']: r['why'] = 'no English bridge'; cnt['bridge'] += 1
            elif not ok_all:
                r['why'] = 'TAHOT disagrees' if not all(e['tahotAgree'] for e in ev) else 'JPS disagrees'; cnt[r['why']] += 1
            else: cnt['pass'] += 1
            res[f'{ref}|{key}'] = r
    for r in res.values(): r['pass'] = r.pop('pass_')
    meta = {'built': datetime.date.today().isoformat(), 'candidates': len(res), 'counts': dict(cnt),
            'sources': {'tahot': 'STEPBible-Data TAHOT (CC BY 4.0, Tyndale House Cambridge) https://github.com/STEPBible/STEPBible-Data',
                        'jps1917': 'JPS 1917 (public domain) via Sefaria', 'bridge': 'English Wiktionary Hebrew entries via kaikki.org (CC BY-SA)',
                        'wordnet': 'Princeton WordNet 3.0 (WordNet licence)'}}
    json.dump({'meta': meta, 'entries': res}, open(OUT, 'w'), ensure_ascii=False, indent=0, sort_keys=True)
    print(json.dumps(meta['counts']))
main()
