"""Run with python3 + fontTools. Audit displayed corpus strings, not JSON escapes/HTML tags."""
from pathlib import Path
from collections import Counter
from fontTools.ttLib import TTFont
import html, json, re, unicodedata
root = Path(__file__).resolve().parents[1]
font = TTFont(root / 'site/fonts/taamey-ashkenaz-medium.woff2')
fallback = TTFont(root / 'site/fonts/NotoSerifHebrew.woff2').getBestCmap()
cmap = font.getBestCmap()
counts = Counter()
def walk(v):
    if isinstance(v, str):
        counts.update(html.unescape(re.sub(r'<[^>]*>', '', v)))
    elif isinstance(v, list):
        for x in v: walk(x)
    elif isinstance(v, dict):
        for x in v.values(): walk(x)
for corpus in ['torah', 'tehillim', 'tanya', 'siddur']:
    for p in (root / 'site/data' / corpus).rglob('*.json'):
        walk(json.loads(p.read_text()))
missing = []
for c, count in sorted(counts.items()):
    if ord(c) not in cmap:
        target = 'Noto Serif Hebrew' if ord(c) in fallback else 'non-rendering bidi control' if ord(c) in [0x202A, 0x202C] else 'UNEXPECTED'
        missing.append(dict(codepoint=f'U+{ord(c):04X}', name=unicodedata.name(c, '?'), count=count, fallback=target))
assert not [x for x in missing if x['fallback'] == 'UNEXPECTED'], missing
for variant in ['medium', 'bold']:
    f = TTFont(root / f'site/fonts/taamey-ashkenaz-{variant}.woff2')
    assert all(c in f.getBestCmap() for c in range(0x591, 0x5C8))
    assert {4, 6}.issubset({x.LookupType for x in f['GPOS'].table.LookupList.Lookup})
print(json.dumps(dict(corpora=['torah', 'tehillim', 'tanya', 'siddur'], unique_codepoints=len(counts), missing_from_taamey=missing, unexpected_missing=[], all_niqqud_and_taamim=True, GPOS_mark_and_mark_to_mark=True), indent=2, ensure_ascii=False))
