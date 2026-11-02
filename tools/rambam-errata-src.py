# Source list for site/data/rambam-errata.json (round 3). Every entry was checked by hand:
#  (1) the consonants are identical in Sefaria's independent "Wikisource Mishneh Torah" text (so only the niqqud differs),
#  (2) the corrected vocalisation is the one the same edition (Torat Emet 363) uses for that word elsewhere (count recorded),
#  (3) the source form is not a valid Hebrew vocalisation in context.
# Run: python3 tools/rambam-errata-src.py  → validates every "from" occurs in its halacha and writes the JSON.
import json, re, glob, unicodedata, collections
N = lambda s: unicodedata.normalize('NFC', s)
ROOT = __file__.rsplit('/tools/', 1)[0]
E = [
 ('Forbidden_Intercourse.14.1', 'לִהִתְגַּיֵּר', 'לְהִתְגַּיֵּר'),
 ('Forbidden_Foods.12.1', 'שִׁאוֹסֵר', 'שֶׁאוֹסֵר'),
 ('Robbery_and_Lost_Property.15.1', 'בֵּין שִׁאִין בָּהּ', 'בֵּין שֶׁאֵין בָּהּ'),
 ('Defilement_by_a_Corpse.19.1', 'כַּוְּרֶת שְׁהִיא', 'כַּוְּרֶת שֶׁהִיא'),
 ('Foreign_Worship_and_Customs_of_the_Nations.3.4', 'כְּמוֹ שֵׁהוּא', 'כְּמוֹ שֶׁהוּא'),
 ('Sabbath.11.1', 'וְלֹא שׁוֹחִט בִּלְבַד', 'וְלֹא שׁוֹחֵט בִּלְבַד'),
 ('Ritual_Slaughter.14.1', 'דָּם שִׁחִיטַת', 'דָּם שְׁחִיטַת'),
 ('Offerings_for_Unintentional_Transgressions.10.13', 'קְדֵשַּׁת דָּמִים', 'קְדֻשַּׁת דָּמִים'),
 ('The_Sanhedrin_and_the_Penalties_within_their_Jurisdiction.11.2', 'לְהָרְגוֹֹ', 'לְהָרְגוֹ'),
 # a damaged stretch at the end of three halachot (vowels shifted); corrected word by word
 ('Forbidden_Intercourse.1.11', 'וְלֹא מַלִקוֹת וִאֵין צָרִיךְ לוֹמַר מִיתָה. שֵׁאֵין זוֹ', 'וְלֹא מַלְקוֹת וְאֵין צָרִיךְ לוֹמַר מִיתָה. שֶׁאֵין זוֹ'),
 ('Forbidden_Intercourse.1.11', 'מִן הַתִּרוּמָה. וּבֵית דִּין מַכִּין אֵת שִׁנֵיהֵם מַכַּת מַרִדּוּת', 'מִן הַתְּרוּמָה. וּבֵית דִּין מַכִּין אֶת שְׁנֵיהֶם מַכַּת מַרְדּוּת'),
 ('Foundations_of_the_Torah.5.8', 'בְּחָלָב שֵׁהֵן אֲסוּרִים אֲפִלּוּ שֵׁלֹּא דֵּרֵךְ הֲנָאָתָן', 'בְּחָלָב שֶׁהֵן אֲסוּרִים אֲפִלּוּ שֶׁלֹּא דֶּרֶךְ הֲנָאָתָן'),
 ('Foundations_of_the_Torah.5.8', 'שֶׁלֹּא דֶּרֵךְ הֲנָאָתָן אֵלָּא בִּמִקוֹם סַכָּנָה', 'שֶׁלֹּא דֶּרֶךְ הֲנָאָתָן אֶלָּא בִּמְקוֹם סַכָּנָה'),
 ('Marriage.3.8', 'לוֹמַר לָהֵם אַתֵּם עֵדַי. אֵלָּא כֵּיוָן שֵׁגֵּרֵשׁ אוֹ קִדֵּשׁ בִּפִנֵיהֵם הֲרֵי זוֹ מְקֻדֶּשֶׁת אוֹ מִגֹרֵשֵׁת', 'לוֹמַר לָהֶם אַתֶּם עֵדַי. אֶלָּא כֵּיוָן שֶׁגֵּרֵשׁ אוֹ קִדֵּשׁ בִּפְנֵיהֶם הֲרֵי זוֹ מְקֻדֶּשֶׁת אוֹ מְגֹרֶשֶׁת'),
]
# Transmission of the Oral Law (Introduction) comes from Wikisource (vocalised there); systematic שְׁ/אֵלָא for שֶׁ/אֶלָּא
INTRO = [('שְׁהִיא', 'שֶׁהִיא'), ('שְׁהוּא', 'שֶׁהוּא'), ('שְׁאֵין', 'שֶׁאֵין'), ('שְׁאֵינוּ', 'שֶׁאֵינוֹ'), ('שְׁהֶם', 'שֶׁהֵם'), ('שְׁהֶן', 'שֶׁהֵן'), ('אֵלָא', 'אֶלָּא')]
intro = json.load(open(f'{ROOT}/site/data/rambam/Transmission_of_the_Oral_Law/1.json'))['s']
for i, h in enumerate(intro):
  for a, b in INTRO:
    if re.search(r'(?<![\u05D0-\u05EA\u0591-\u05C7])' + re.escape(N(a)) + r'(?![\u05D0-\u05EA\u0591-\u05C7])', N(h)): E.append((f'Transmission_of_the_Oral_Law.1.{i+1}', a, b))
# usage counts of the corrected words in the same edition (evidence (2))
cnt = collections.Counter()
for f in glob.glob(f'{ROOT}/site/data/rambam/*/*.json'):
  for h in json.load(open(f))['s']:
    for w in re.findall(r'[\u05D0-\u05EA\u0591-\u05C7]+', N(h)): cnt[w] += 1
import os
def wsk(t):  # consonant key, ignoring matres ו/י and final forms (Wikisource spells מלא)
  t = re.sub(r'<[^>]+>|\([^)]*\)', ' ', t); t = re.sub(r'[\u0591-\u05C7]', '', t); t = re.sub(r'[^\u05D0-\u05EA\s]', ' ', t)
  return ' '.join(re.sub(r'[וי]', '', w).translate(str.maketrans('ךםןףץ', 'כמנפצ')) for w in t.split())
wsChecked = 0
out = {}
for ref, a, b in E:
  slug, c, s = ref.rsplit('.', 2)
  h = N(json.load(open(f'{ROOT}/site/data/rambam/{slug}/{c}.json'))['s'][int(s) - 1])
  assert N(a) in h, ('not found', ref, a)
  assert re.sub(r'[\u0591-\u05C7]', '', a) == re.sub(r'[\u0591-\u05C7]', '', b), ('consonants changed', ref)
  ev = {w: cnt[w] for w in re.findall(r'[\u05D0-\u05EA\u0591-\u05C7]+', N(b)) if w not in N(a).split()}
  # evidence (1): the same consonants in Sefaria's Wikisource text (cache from tools/rambam-ws-compare.py; the
  # Introduction IS the Wikisource text, so it is checked against itself trivially and marked as such)
  wsf = f'/tmp/rs/ws/{slug}.{c}.json'
  ws = None
  if slug != 'Transmission_of_the_Oral_Law' and os.path.exists(wsf):
    t = json.load(open(wsf))
    if isinstance(t, list) and len(t) >= int(s):
      have = set(wsk(t[int(s) - 1]).split())
      ws = all(k in have for k in wsk(' '.join(w for w in N(a).split() if w not in N(b).split())).split())
    assert ws is not False, ('consonants not in Wikisource', ref, a)
    wsChecked += ws is True
  out.setdefault(ref, []).append({'from': N(a), 'to': N(b), 'elsewhere': ev, 'wikisourceConsonants': ws})
# TEXT corrections (round 5): not niqqud – a wording fix where our edition is incomplete or mixes in the censored
# print. Each one needs two independent sources that agree on the wording (recorded in 'sources'); the vocalisation of
# every added word is the one this edition uses elsewhere (counts in 'elsewhere').
TEXT = [
 ('Kings_and_Wars.11.4',
  "(אִם עָשָׂה וְהִצְלִיחַ וּבָנָה מִקְדָּשׁ בִּמְקוֹמוֹ וְקִבֵּץ נִדְחֵי יִשְׂרָאֵל הֲרֵי זֶה מָשִׁיחַ בְּוַדַּאי. וִיתַקֵּן אֶת הָעוֹלָם כֻּלּוֹ לַעֲבֹד אֶת ה' בְּיַחַד שֶׁנֶּאֱמַר כִּי אָז אֶהְפֹּךְ אֶל עַמִּים שָׂפָה בְרוּרָה לִקְרֹא כֻלָּם בְּשֵׁם ה' וּלְעָבְדוֹ שְׁכֶם אֶחָד)",
  "אִם עָשָׂה וְהִצְלִיחַ וְנִצֵּחַ כָּל הָאֻמּוֹת שֶׁסְּבִיבָיו וּבָנָה מִקְדָּשׁ בִּמְקוֹמוֹ וְקִבֵּץ נִדְחֵי יִשְׂרָאֵל הֲרֵי זֶה מָשִׁיחַ בְּוַדַּאי",
  ['Sefaria "Wikisource Mishneh Torah" 11:4 (ends "…וניצח כל האומות שסביביו ובנה מקדש במקומו וקבץ נדחי ישראל הרי זה משיח בודאי")',
   'he.wikisource.org "רמב\"ם הלכות מלכים ומלחמות יא", section הגהה (manuscript-corrected): "אם עשה והצליח, ונצח כל האומות שסביביו, ובנה מקדש במקומו וקבץ נדחי ישראל – הרי זה משיח בוודאי."'],
  'The parenthesised sentence is the censored Warsaw–Vilna print (he.wikisource section דפוס), which lacks "וניצח כל האומות שסביביו" and ends with "ויתקן את העולם…"; in the full text that idea appears in halacha 7 (already shown). Vocalisation: וְנִצֵּחַ as in Kings 7:15 (וְאִם לֹא נִצֵּחַ); הָאֻמּוֹת 18×; שֶׁסְּבִיבָיו = שֶׁ + סְבִיבָיו (11×), dagesh as in שֶׁסְּבִיבוֹתָיו (3×).'),
]
textFixes = 0
for ref, a, b, sources, note in TEXT:
  slug, c, s = ref.rsplit('.', 2)
  h = N(json.load(open(f'{ROOT}/site/data/rambam/{slug}/{c}.json'))['s'][int(s) - 1])
  assert N(a) in h, ('not found', ref)
  assert len(sources) >= 2, ('two sources needed', ref)
  added = [w for w in re.findall(r'[\u05D0-\u05EA\u0591-\u05C7]+', N(b)) if w not in N(a).split()]
  t = json.load(open(f'/tmp/rs/ws/{slug}.{c}.json'))[int(s) - 1] if os.path.exists(f'/tmp/rs/ws/{slug}.{c}.json') else None
  if t is not None:
    have = set(wsk(t).split()); assert all(k in have for k in wsk(' '.join(added)).split()), ('added words not in Wikisource', ref)
  out.setdefault(ref, []).append({'from': N(a), 'to': N(b), 'kind': 'text', 'sources': sources, 'note': note, 'elsewhere': {w: cnt[w] for w in added}})
  textFixes += 1
total = sum(len(v) for v in out.values()) - textFixes
niqqudHalachot = sum(1 for v in out.values() if any(f.get('kind') != 'text' for f in v))
json.dump({'meta': {'edition': 'Torat Emet 363 (Sefaria) and, for the Introduction, Wikisource', 'fixes': total, 'textFixes': textFixes, 'halachot': niqqudHalachot,
  'method': 'niqqud-only corrections; consonants identical to Sefaria "Wikisource Mishneh Torah"; corrected form = the form this edition uses elsewhere ("elsewhere" = occurrences); checked by hand',
  'doc': 'verification/RAMBAM-ERRATA.md', 'wikisourceConsonantsChecked': wsChecked,
  'scans': {k: json.load(open(f'{ROOT}/verification/{f}'))['meta'] for k, f in (('niqqud', 'rambam-niqqud-flags.json'), ('wikisource', 'rambam-ws-mismatches.json'), ('gaps', 'rambam-gap-scan.json')) if os.path.exists(f'{ROOT}/verification/{f}')}}, 'fixes': out}, open(f'{ROOT}/site/data/rambam-errata.json', 'w'), ensure_ascii=False, indent=1)
print(total, 'fixes in', niqqudHalachot, 'halachot;', textFixes, 'text fix(es);', wsChecked, 'checked against Wikisource consonants')
