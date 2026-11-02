# ligature glyphs (letter+marks drawn as one glyph, no cmap entry) -> their components, from each font's GSUB
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
        t=TTFont(io.BytesIO(buf)); go=t.getGlyphOrder()
        rev={}
        for tb in t['cmap'].tables:
          for k,v in tb.cmap.items(): rev.setdefault(v,k)
        if 'GSUB' not in t: continue
        L=out.setdefault(base,{})
        # resolve chains: a ligature component may itself be a ligature/alternate glyph
        single={}
        for lk in t['GSUB'].table.LookupList.Lookup:
          for st in lk.SubTable:
            if lk.LookupType==7: st=st.ExtSubTable
            tp=getattr(st,'LookupType',lk.LookupType)
            if tp==1:
              for a,b in st.mapping.items(): single.setdefault(b,a)
            if tp==4:
              for first,ligs in st.ligatures.items():
                for lg in ligs:
                  comps=[first]+list(lg.Component)
                  L.setdefault(str(go.index(lg.LigGlyph)),comps)
        for gid,comps in list(L.items()):
          if not isinstance(comps[0],str): continue
          cps=[]
          for c in comps:
            seen2=0
            while c not in rev and c in single and seen2<5: c=single[c]; seen2+=1
            cps.append(rev.get(c))
          L[gid]=cps
      except Exception as e: print(fn,x,e)
json.dump(out,open('ligs.json','w'))
print({k:len(v) for k,v in out.items()})
