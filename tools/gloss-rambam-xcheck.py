#!/usr/bin/env python3
"""Round 5 — check (b) for the Rambam gloss candidates of tools/gloss-rambam.mjs (check a: a Hebrew-Wiktionary sense
quotes this very halacha). Same machinery and thresholds as tools/gloss-xcheck.py (the Torah/Tehillim check):
the Hebrew gloss is bridged to English (English Wiktionary via kaikki) and must AGREE (WordNet: same lemma, shared
synset, derivational relation, near hypernym) with BOTH independent witnesses:
  1. the English-Wiktionary entry of the headword (lexicon witness — editorially independent of Hebrew Wiktionary);
  2. the English translation of THIS halacha (context witness): Mishneh Torah, trans. Eliyahu Touger (Moznaim),
     as published on Sefaria (CC BY-NC). It is only read for this check; no translated text is shipped — the evidence
     keeps the matched English words and the Sefaria link.
Anything that fails is dropped. Survivors still need the manual review (tools/gloss-rambam-review.json).
Inputs: /tmp/gr/cands.json (check a), /tmp/gr/en.json (Sefaria, fetched by --fetch), /tmp/xchk/he.jsonl.
Output: tools/gloss-rambam-xcheck.json
"""
import json, re, sys, os, time, urllib.request, urllib.parse, importlib.util, datetime
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('gx', os.path.join(HERE, 'gloss-xcheck.py')); gx = importlib.util.module_from_spec(spec); spec.loader.exec_module(gx)
C = json.load(open('/tmp/gr/cands.json'))
idx = json.load(open(os.path.join(HERE, '../site/data/rambam/index.json')))
slug2name = {m['slug']: n for n, m in idx.items()}
EN = '/tmp/gr/en.json'
en = json.load(open(EN)) if os.path.exists(EN) else {}
if '--fetch' in sys.argv:
    for r in sorted({c['ref'][7:] for c in C['cands']}):
        if r in en and en[r].get('en'): continue
        slug, c, s = r.split('.')
        ref = f"Mishneh Torah, {slug2name[slug]}.{c}.{s}"
        u = "https://www.sefaria.org/api/v3/texts/" + urllib.parse.quote(ref) + "?version=english"
        v = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'chitas-reader-verify/1.0'}), timeout=30))['versions'][0]
        en[r] = {'en': v.get('text'), 'versionTitle': v.get('versionTitle'), 'license': v.get('license'), 'ref': ref}
        time.sleep(0.3)
    json.dump(en, open(EN, 'w'), ensure_ascii=False, indent=1)
def plain(h):  # drop footnotes and markup
    h = re.sub(r'<sup[^>]*>.*?</sup>', ' ', h or '', flags=re.S); h = re.sub(r'<i class="footnote">.*?</i>', ' ', h, flags=re.S)
    return re.sub(r'<[^>]+>', ' ', h)
entries = {}
for c in C['cands']:
    r = c['ref'][7:]
    A, used = gx.gloss_en(c['g'])
    lemma_en = set()
    for k in {gx.strip_he(c['l'].split(' ')[0]), gx.strip_he(c['page'])}:
        for h in gx.he2en.get(k, ()): lemma_en |= gx.en_words(h)
    tr = plain((en.get(r) or {}).get('en'))
    T = gx.en_words(tr)
    la, ta = gx.agree(A, lemma_en), gx.agree(A, T)
    why = [] if A else ['gloss not bridged to English']
    if A and not la: why.append('English Wiktionary lemma disagrees / missing')
    if A and not ta: why.append('translation of the halacha disagrees')
    entries[f"{c['ref']}|{c['key']}"] = {'g': c['g'], 'l': c['l'], 'glossEn': sorted(A), 'bridge': used, 'lemmaEn': sorted(lemma_en)[:30],
        'lemmaAgree': la[:6], 'translationAgree': ta[:6], 'translation': {'ref': (en.get(r) or {}).get('ref'), 'version': (en.get(r) or {}).get('versionTitle'), 'license': (en.get(r) or {}).get('license')},
        'pass': bool(A and la and ta), 'why': why}
P = sum(e['pass'] for e in entries.values())
meta = {'built': datetime.date.today().isoformat(), 'checkA': C['stats'], 'candidates': len(entries), 'pass': P, 'fail': len(entries) - P,
        'sources': {'lexicon': 'English Wiktionary Hebrew entries via kaikki.org (CC BY-SA)', 'translation': 'Mishneh Torah, trans. Eliyahu Touger (Moznaim), via Sefaria (CC BY-NC) — read for the check only, not shipped', 'wordnet': 'Princeton WordNet 3.0'}}
json.dump({'meta': meta, 'entries': entries}, open(os.path.join(HERE, 'gloss-rambam-xcheck.json'), 'w'), ensure_ascii=False, indent=1)
print('candidates', len(entries), 'pass', P)
for k, e in entries.items(): print('PASS' if e['pass'] else 'fail', k, '|', e['g'], '|', e['lemmaAgree'][:2], e['translationAgree'][:2], e['why'])

# ---- publish: survivors of (a)+(b) that the manual review keeps → the "rambam" part of site/data/glossary.json ----
R = json.load(open(os.path.join(HERE, 'gloss-rambam-review.json')))
rv = {f"{e['ref']}|{e['key']}": e for e in R['entries']}
cand = {f"{c['ref']}|{c['key']}": c for c in C['cands']}
verses, unrev = {}, 0
for k, x in entries.items():
    if not x['pass']: continue
    r = rv.get(k)
    if not r or r['g'] != x['g']: unrev += 1; continue
    if r['decision'] == 'keep':
        c = cand[k]; verses.setdefault(c['ref'], {})[c['key']] = {'g': c['g'], 'l': c['l'], 'src': c['src']}
pub = sum(len(v) for v in verses.values())
GF = os.path.join(HERE, '../site/data/glossary.json')
G = json.load(open(GF))
G['rambam'] = {'meta': {'scope': 'Mishneh Torah (round 5)', 'wiktionaryRambamQuotes': C['stats'].get('quotes', 0), 'checkA': len(entries), 'checkB': P,
                         'rejectedByHand': P - pub - unrev, 'notReviewedSoNotPublished': unrev, 'published': pub, 'words': len({v['l'] for w in verses.values() for v in w.values()})},
               'verses': verses}
json.dump(G, open(GF, 'w'), ensure_ascii=False, separators=(',', ':'))
print('published', pub, G['rambam']['meta'])
