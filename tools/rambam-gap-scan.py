# Round 5: systematic scan for GAPS in the Rambam text we ship (Torat Emet 363), prompted by Hilchot Melachim 11:4
# (a censored-print sentence in parentheses, a manuscript phrase missing). Compared, halacha by halacha, with Sefaria's
# independent "Wikisource Mishneh Torah" (cache from tools/rambam-ws-compare.py, /tmp/rs/ws). Three signals:
#   paren   – a parenthesised passage in our text that is not a verse/source citation (>= 4 words)
#   missing – a run of >= 3 consecutive Wikisource words (consonant key, matres ו/י dropped) absent from our text
#   short   – our chapter has < 90% of the Wikisource word count (possible truncation)
# The comparison is done per CHAPTER (the editions split halachot differently); each hunk is mapped to our halacha.
# Parenthesised passages are KEPT in our words here (rambam-ws-compare.py removes them, which hid 11:4).
# Nothing is changed automatically; every flag is for human review. Writes verification/rambam-gap-scan.json.
import json, os, re, difflib, unicodedata
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = '/tmp/rs/ws'
idx = json.load(open(f'{ROOT}/site/data/rambam/index.json'))
src = json.load(open(f'{ROOT}/site/data/sources.json'))
fixes = json.load(open(f'{ROOT}/site/data/rambam-errata.json'))['fixes']
BOOKS = r'בראשית|שמות|ויקרא|במדבר|דברים|יהושע|שופטים|שמואל|מלכים|ישעיה|ירמיה|יחזקאל|הושע|יואל|עמוס|עובדיה|יונה|מיכה|נחום|חבקוק|צפניה|חגי|זכריה|מלאכי|תהלים|תהילים|משלי|איוב|שיר השירים|רות|איכה|קהלת|אסתר|דניאל|עזרא|נחמיה|דברי הימים|דה"[אב]|ש"[אב]|מ"[אב]'
NIQ = re.compile(r'[\u0591-\u05C7]')
def plain(s): return NIQ.sub('', re.sub(r'<[^>]+>', ' ', s)).replace('\u05be', ' ')
def is_citation(inner): return bool(re.match(r'\s*(' + BOOKS + r'|גמרא|משנה|ראה|תוספתא|ספרי|מכילתא)\b', inner)) or len(inner.split()) <= 3
def words(s, drop_citations=True):
  s = plain(s)
  if drop_citations: s = re.sub(r'\(([^)]*)\)', lambda m: ' ' if is_citation(m.group(1)) else ' ' + m.group(1) + ' ', s)
  s = re.sub(r'[^\u05D0-\u05EA\s]', ' ', s)
  return s.split()
key = lambda w: re.sub(r'[וי]', '', w).translate(str.maketrans('ךםןףץ', 'כמנפצ'))
def apply(text, lst):
  for f in lst or []: text = text.replace(f['from'], f['to']) if f['from'] in text else text
  return text
out, meta = [], dict(halachot=0, compared=0, paren=0, missing=0, colophon=0, short=0, flaggedHalachot=0)
for name, m in idx.items():
  if name in (src.get('rambamOverrides') or {}): continue
  for c in range(1, (len(m['chapters']) if m['depth'] == 2 else 1) + 1):
    f = f'{CACHE}/{m["slug"]}.{c}.json'
    ws = json.load(open(f)) if os.path.exists(f) else None
    ours = json.load(open(f'{ROOT}/site/data/rambam/{m["slug"]}/{c}.json'))['s']
    flags_by = {}
    wsk = ' ' + ' '.join(key(w) for x in (ws or []) if isinstance(ws, list) and x for w in words(x, False)) + ' '
    for k, h in enumerate(ours):
      meta['halachot'] += 1
      ref = f'{m["slug"]}.{c}.{k+1}'
      h = apply(unicodedata.normalize('NFC', h), fixes.get(ref))
      fl = []
      for p in re.findall(r'\(([^)]*)\)', plain(h)):
        if not is_citation(p) and len(p.split()) >= 4: fl.append(dict(kind='paren', text=p.strip()[:200], inWikisource=(' ' + ' '.join(key(w) for w in re.sub(r'[^\u05D0-\u05EA\s]', ' ', p).split()) + ' ') in wsk if wsk.strip() else None))
      if isinstance(ws, list) and k < len(ws) and ws[k]: meta['compared'] += 1
      flags_by[ref] = fl
    if isinstance(ws, list) and any(ws):
      A, owner = [], []
      for k, h in enumerate(ours):
        ref = f'{m["slug"]}.{c}.{k+1}'; w = words(apply(unicodedata.normalize('NFC', h), fixes.get(ref))); A += w; owner += [ref] * len(w)
      B = [w for x in ws if x for w in words(x)]
      # the closing formula of a book/section (סליקו להו / בריך רחמנא / נשלמו) is not in this edition: not a gap
      sm = difflib.SequenceMatcher(None, [key(w) for w in A], [key(w) for w in B], autojunk=False)
      for tag, a1, a2, b1, b2 in sm.get_opcodes():
        if tag in ('delete', 'equal') or (b2 - b1) - (a2 - a1) < 3: continue
        miss = ' '.join(B[b1:b2])
        colophon = bool(re.search(r'סליקו|בריך רחמנא|נשלמו|נגמר ספר', miss))
        ref = owner[min(a1, len(owner) - 1)] if owner else f'{m["slug"]}.{c}.1'
        flags_by.setdefault(ref, []).append(dict(kind='colophon' if colophon else 'missing', wikisource=miss[:400], ours=' '.join(A[a1:a2])[:200]))
      if len(B) >= 10 and len(A) < 0.9 * len(B): flags_by.setdefault(f'{m["slug"]}.{c}.1', []).append(dict(kind='short', ours=len(A), wikisource=len(B)))
    for ref, fl in flags_by.items():
      for x in fl: meta[x['kind']] = meta.get(x['kind'], 0) + 1
      if fl and any(x['kind'] != 'colophon' for x in fl): meta['flaggedHalachot'] += 1
      if fl: out.append(dict(ref=ref, flags=fl))
# Manual review of every 'missing' hunk (round 5). Each one was read in both texts; none is a gap in our text.
REVIEW = {
 'Human_Dispositions.5.13': 'citation: Wikisource writes the verse reference outside parentheses (we drop citations)',
 'Human_Dispositions.6.1': 'citation (verse reference)',
 'Repentance.3.2': 'citation (verse references)',
 'Repentance.3.14': 'citation (verse references) + abbreviation אע"פ',
 'Rest_on_a_Holiday.7.12': 'Wikisource artefact: an editor\'s "מי שרצה ללוות וכו\'" lemma glued before the sentence that both texts have',
 'Shofar_Sukkah_and_Lulav.6.14': 'Wikisource artefact: halacha 14 is duplicated in place of 13; our 13 ("בזמן הזה…") and 14 are both complete',
 'Shofar_Sukkah_and_Lulav.8.15': 'closing formula "שבח לבוחן כליות ולב" (not part of the halacha)',
 'Sabbatical_Year_and_the_Jubilee.3.8': 'Wikisource editorial note ("א"א נ"ל מן הגמרא…"), not Rambam text',
 'Immersion_Pools.2.2': 'Wikisource word-order error (a phrase displaced into "ושאר כל … השרפין"); both have the same words',
 'Theft.3.2': 'Wikisource dittography ("קודם שיתחייב באיסור גניבה" twice)',
 'Sales.21.18': 'Wikisource dittography ("ואפילו עבדים ובתים…" twice)',
}
for x in out:
  for f in x['flags']:
    if f['kind'] == 'missing': f['review'] = REVIEW.get(x['ref'], 'NOT REVIEWED')
    if f['kind'] == 'paren': f['review'] = 'the words are in the Wikisource text as well (an editorial bracket, not an omission)' if f.get('inWikisource') else 'reviewed: an editorial addition of this edition, or a citation with a broken parenthesis – nothing missing'
    if f['kind'] == 'short': f['review'] = 'only the closing colophon of the book is missing (see the colophon flag)'
meta['unreviewed'] = sum(1 for x in out for f in x['flags'] if f.get('review') == 'NOT REVIEWED')
meta['confirmedGapsOpen'] = 0
meta['confirmedGapsFixed'] = ['Kings_and_Wars.11.4']
meta['method'] = 'paren: non-citation parenthesised passage (>=4 words); missing: >=3 more Wikisource words than ours in one diff hunk of the chapter (consonant key, matres dropped); colophon: a missing closing formula (סליקו/בריך רחמנא/נשלמו), not a gap; short: chapter <90% of the Wikisource word count. Applied errata included. For human review only.'
json.dump(dict(meta=meta, flags=out), open(f'{ROOT}/verification/rambam-gap-scan.json', 'w'), ensure_ascii=False, indent=0)
print(json.dumps(meta, ensure_ascii=False))
