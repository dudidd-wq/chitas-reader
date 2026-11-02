import pymupdf, io, glob, json, re
from fontTools.ttLib import TTFont
out={}
for fn in sorted(glob.glob('pdf/*.pdf')):
  d=pymupdf.open(fn); seen=set()
  for pg in d:
    for f in pg.get_fonts(full=True):
      x=f[0]
      if x in seen: continue
      seen.add(x)
      try:
        name,ext,typ,buf=d.extract_font(x)
        if not buf: continue
        base=re.sub(r'^[A-Z]{6}\+','',name)
        t=TTFont(io.BytesIO(buf)); upem=t['head'].unitsPerEm
        if 'glyf' not in t: continue
        gl=t['glyf']; go=t.getGlyphOrder(); hm=t['hmtx'].metrics
        B=out.setdefault(base,{})
        for i,n in enumerate(go):
          g=gl[n]
          if getattr(g,'numberOfContours',0)==0: continue
          g.recalcBounds(gl)
          B[str(i)]=[g.xMin/upem,g.xMax/upem,g.yMin/upem,g.yMax/upem,hm[n][0]/upem]
      except Exception as e: print(fn,x,e)
json.dump(out,open('bounds.json','w'))
print({k:len(v) for k,v in out.items()})
