import pymupdf, io, sys, glob, json, re
from fontTools.ttLib import TTFont
from collections import defaultdict
# base font -> gid -> {'cmap': set(names), 'tu': Counter}
info=defaultdict(lambda: defaultdict(lambda: {'cmap':set(),'tu':defaultdict(int)}))
for fn in sorted(glob.glob('pdf/*.pdf')):
  d=pymupdf.open(fn)
  seen=set()
  for pg in d:
    for f in pg.get_fonts(full=True):
      x=f[0]
      if x in seen: continue
      seen.add(x)
      try:
        name,ext,typ,buf=d.extract_font(x)
        base=re.sub(r'^[A-Z]{6}\+','',name)
        t=TTFont(io.BytesIO(buf)); go=t.getGlyphOrder()
        for tb in t['cmap'].tables:
          for k,v in tb.cmap.items():
            info[base][go.index(v)]['cmap'].add(k)
      except Exception as e: pass
    for s in pg.get_texttrace():
      base=re.sub(r'^[A-Z]{6}\+','',s['font'])
      for ch in s['chars']:
        info[base][ch[1]]['tu'][ch[0]]+=1
out={}
for b,g in info.items():
  out[b]={str(k):{'cmap':sorted(v['cmap']),'tu':dict(v['tu'])} for k,v in g.items()}
json.dump(out,open('gidinfo.json','w'),ensure_ascii=False)
