# Extract vocalized text from ChassidutBehirah PDFs by glyph id + glyph geometry.
# The PDFs' ToUnicode maps are scrambled per cluster (marks map to spaces / other marks), so we use
# the embedded fonts' own cmap for every drawn glyph, and the glyph ink box to attach marks to letters.
import pymupdf, re, json, sys, unicodedata
ALIAS={'Hadassah Friedlaender,Bo':'Hadassah Friedlaender,Bold'}
MIRROR={'(':')',')':'(','[':']',']':'[','<':'>','>':'<','{':'}','}':'{'}
IGN={0,8,9,10,13,0x1d,0xa0,0xca}
def base(n): return re.sub(r'^[A-Z]{6}\+','',n)
def isheb(c): return '\u05d0'<=c<='\u05ea'
def ismark(c): return '\u0591'<=c<='\u05c7' and c not in '\u05be\u05c0\u05c3\u05c6'
import os
CBD=os.environ.get('CB_DIR','/tmp/cbh')
GI=json.load(open(os.path.join(CBD,'gidinfo.json'))); BD=json.load(open(os.path.join(CBD,'bounds.json')))
LIG=json.load(open(os.path.join(CBD,'ligs.json')))  # ligature glyph -> components (ligmap.py)
_cm={}
def gcmap(fb,gid):
  k=(fb,gid)
  if k in _cm: return _cm[k]
  g=GI.get(ALIAS.get(fb,fb),{}).get(str(gid)); r=None
  if g:
    cs=[c for c in g['cmap'] if c not in IGN]
    if cs:
      heb=[c for c in cs if 0x590<=c<0x600 or 0xfb1d<=c<=0xfb4f]
      r=chr((heb or cs)[0])
  _cm[k]=r; return r
def glyphs(page):
  out=[]
  for s in page.get_texttrace():
    fb=base(s['font']); sz=s['size']; B=BD.get(ALIAS.get(fb,fb),{})
    for (u,gid,org,bbox) in s['chars']:
      if gid==-1: continue
      c=gcmap(fb,gid); tu=chr(u) if u>0 else ''
      pre=None
      if c is None:
        # ligature glyph (letter+mark drawn as one glyph, no cmap): take its GSUB components
        lg=LIG.get(ALIAS.get(fb,fb),{}).get(str(gid))
        if lg and None not in lg:
          cs=[chr(x) for x in lg]
          if isheb(cs[0]) and len(cs)>1 and all(ismark(ch) for ch in cs[1:]) and (not isheb(tu) or tu==cs[0]):
            c=cs[0]; pre=list(cs[1:])
      if c is None:
        if tu and (isheb(tu) or tu.isdigit() or tu in '.,:;!?"\'־'): c=tu
        else: continue
      elif c in MIRROR: c=tu if tu in MIRROR else MIRROR[c]
      if c==' ': continue
      c=unicodedata.normalize('NFKD' if all('\ufb20'<=ch<='\ufb29' or ch=='\ufb4f' for ch in c) else 'NFD',c)
      x0,x1=min(bbox[0],bbox[2]),max(bbox[0],bbox[2])
      if all(ismark(ch) for ch in c):
        b=B.get(str(gid))
        cx=org[0]+((b[0]+b[1])/2*sz if b else 0)
        cy=org[1]-((b[2]+b[3])/2*sz if b else 0)
        out.append(dict(c=c,m=1,x=cx,y=org[1],cy=cy,sz=sz,f=fb,gid=gid))
      else:
        g=dict(c=c,m=0,x=org[0],y=org[1],x0=x0,x1=x1,sz=sz,f=fb,gid=gid)
        if pre: g['ms']=pre
        out.append(g)
  # drop faux-bold duplicates
  seen=set(); res=[]
  for g in out:
    k=(g['c'],round(g['x']*2),round(g['y']*2))
    if k in seen: continue
    seen.add(k); res.append(g)
  return res
def gutter(gl,w):
  bs=[g for g in gl if not g['m']]
  if not bs: return None
  best=None
  for x in range(int(w*0.38),int(w*0.62)):
    n=sum(1 for g in bs if g['x0']-0.5<=x<=g['x1']+0.5)
    if best is None or n<best[0]: best=(n,x)
  left=sum(1 for g in bs if g['x1']<best[1])
  if best[0]<=len(bs)*0.01 and len(bs)*0.15<left<len(bs)*0.85: return best[1]
  return None
def lines(gl):
  bases=sorted([g for g in gl if not g['m']],key=lambda g:g['y'])
  L=[]
  for g in bases:
    if L and abs(L[-1]['y']-g['y'])<=max(1.0,g['sz']*0.2): L[-1]['g'].append(g)
    else: L.append({'y':g['y'],'g':[g]})
  for g in (g for g in gl if g['m']):
    best=None
    if g['c']=='\u05b9':
      # holam haser sits on its letter's top-left corner; holam male in the middle of the vav
      for l in L:
        if abs(l['y']-g['y'])>g['sz']*0.5: continue
        for b in l['g']:
          if isheb(b['c'][0]) and abs(b['x0']-g['x'])<=0.08*g['sz']:
            if best is None or abs(b['x0']-g['x'])<best[0]: best=(abs(b['x0']-g['x']),b)
      if best: best[1].setdefault('ms',[]).append(g['c']); continue
    for l in L:
      dy=abs(l['y']-g['y'])
      if dy>g['sz']*0.5: continue
      for b in l['g']:
        if not isheb(b['c'][0]): continue
        d=0 if b['x0']-0.2<=g['x']<=b['x1']+0.2 else min(abs(g['x']-b['x0']),abs(g['x']-b['x1']))
        sc=d*4+dy
        if best is None or sc<best[0]: best=(sc,b)
    if best and best[0]<g['sz']*0.8: best[1].setdefault('ms',[]).append(g['c'])
    else: g['orphan']=1
  for l in L: l['g'].sort(key=lambda g:-g['x'])
  return L
ORDER={c:i for i,c in enumerate('\u05c1\u05c2\u05bc\u05bf\u05b0\u05b1\u05b2\u05b3\u05b4\u05b5\u05b6\u05b7\u05b8\u05c7\u05b9\u05ba\u05bb')}
def cluster(b):
  ms=[]
  for m in b.get('ms',[]):
    for ch in m:
      if ch not in ms: ms.append(ch)
  ms.sort(key=lambda c:ORDER.get(c,50))
  return b['c']+''.join(ms)
GAP=0.12
def line_words(l):
  """returns list of words: each word = list of glyph dicts (with 'ms')"""
  W=[]; prev=None
  for g in l['g']:
    if prev is None or prev['x0']-g['x1']>g['sz']*GAP: W.append([])
    W[-1].append(g); prev=g
  return W
def page_lines(page):
  gl=glyphs(page); x=gutter(gl,page.rect.width)
  cols=[gl] if x is None else [[g for g in gl if g['x']>=x],[g for g in gl if g['x']<x]]
  out=[]
  for ci,c in enumerate(cols):
    for l in lines(c): out.append((ci,l))
  return out
if __name__=='__main__':
  d=pymupdf.open(sys.argv[1]); pg=int(sys.argv[2])
  for ci,l in page_lines(d[pg]):
    print(ci,round(max(g['sz'] for g in l['g']),1),' '.join(''.join(cluster(g) for g in w) for w in line_words(l)))

VOW=set('\u05b0\u05b1\u05b2\u05b3\u05b4\u05b5\u05b6\u05b7\u05b8\u05b9\u05ba\u05bb\u05c7')
HOLAM='\u05b9'
def fix_word(cl):
  """cl: list of [letter, set_of_marks]. Repair holam drawn over the following letter."""
  for i in range(1,len(cl)):
    L,ms=cl[i]; P,pm=cl[i-1]
    if HOLAM not in ms or not isheb(P): continue
    others=(ms&VOW)-{HOLAM}
    if pm&VOW: continue
    if others:
      ms.discard(HOLAM); pm.add(HOLAM)
  return cl
def word_clusters(w):
  cl=[]
  for g in w:
    for i,ch in enumerate(g['c']):
      if ismark(ch):
        if cl: cl[-1][1].add(ch)
      else:
        cl.append([ch,set()])
    for m in g.get('ms',[]):
      for ch in m:
        if cl: cl[-1][1].add(ch)
  return cl
def render(cl):
  return unicodedata.normalize('NFC',''.join(c+''.join(sorted(ms,key=lambda m:ORDER.get(m,50))) for c,ms in cl))
WIDE={chr(c):unicodedata.normalize('NFKD',chr(c)) for c in range(0xfb20,0xfb29)}
def page_tokens(page,pno):
  toks=[]
  for ci,l in page_lines(page):
    for w in line_words(l):
      for g in w:
        if g['c'] in WIDE: g['c']=WIDE[g['c']]
        if g['c'] in ('Ð',): g['c']='–'
      cl=fix_word(word_clusters(w))
      sz=max(g['sz'] for g in w)
      # split at maqaf / dashes
      cur=[]
      parts=[]
      for c in cl:
        if c[0] in '\u05be-–—': parts.append(cur); cur=[]
        else: cur.append(c)
      parts.append(cur)
      for p in parts:
        letters=''.join(c[0] for c in p if isheb(c[0]))
        if not letters: continue
        raw=render(p)
        core=[c for c in p if isheb(c[0])]
        # abbreviation: a quote mark between letters
        s=''.join(c[0] for c in p)
        abbr=bool(re.search('[\u05d0-\u05ea]["\'\u05f3\u05f4\u201d\u2019][\u05d0-\u05ea]',s)) or bool(re.search('[\u05d0-\u05ea]["\'\u05f3\u05f4]$',s))
        toks.append({'k':letters,'v':render(core),'a':abbr,'p':pno,'s':round(sz,1),'c':ci})
  return toks
