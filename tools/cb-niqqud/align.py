"""Align the Chassidut Behirah vocalised text (extracted by extract.py) with the Kehot/Sefaria text of each luach
lesson (site/data/tolt/w/*.json). A Kehot word receives niqqud only when its letters are identical to an aligned CB
word (or differ only by a vav/yod mater lectionis, see adapt). Kehot abbreviations are never vocalised."""
import json, glob, re, sys, difflib, collections, html
import os
W=os.environ.get('TOLT_DIR',os.path.join(os.path.dirname(__file__),'../../site/data/tolt'))
WORK=os.environ.get('CB_WORK','/tmp/cbh/work')
CB=[]; DOCS=[]
for fn in sorted(glob.glob(os.path.join(WORK,'*.json'))):
  T=json.load(open(fn)); n=fn[-7:-5]
  sz=collections.Counter(t['s'] for t in T if len(t['k'])>1).most_common(1)[0][0]
  for t in T:
    if t['s']>=5: t['d']=n; CB.append(t)
  DOCS.append((n,sz))
CBK=[t['k'] for t in CB]
NG=4
IDX=collections.defaultdict(list)
for i in range(len(CB)-NG):
  IDX[' '.join(CBK[i:i+NG])].append(i)
HEB='\u05d0-\u05ea'
TOK=re.compile(r'(<[^>]+>)|([^\s<]+)')
def inside_daf(h):
  # positions inside the daf span are not text
  spans=[(m.start(),m.end()) for m in re.finditer(r'<span class="daf"[^>]*>.*?</span>',h)]
  return lambda p:any(a<=p<b for a,b in spans)
GERESH=re.compile('[\u05f3\u05f4\'"`\u2019\u201d]')
def ktokens(h):
  out=[]
  for m in TOK.finditer(h):
    if m.group(1): continue
    s=m.group(2); st=m.start(2)
    mm=re.match(r'^([^'+HEB+r']*)(['+HEB+r'](?:.*['+HEB+r'])?)([^'+HEB+r']*)$',s)
    if not mm: continue
    core=mm.group(2)
    abbr=bool(GERESH.search(s)) or not re.fullmatch('['+HEB+']+',core)
    out.append(dict(a=st+len(mm.group(1)),b=st+len(mm.group(1))+len(core),k=re.sub('[^'+HEB+']','',core),abbr=abbr,core=core))
  return out
MK=re.compile('[\u0591-\u05c7]')
def clusters(v):
  cl=[]
  for ch in v:
    if MK.match(ch) and cl: cl[-1][1].append(ch)
    else: cl.append([ch,[]])
  return cl
import unicodedata
def rend(cl): return unicodedata.normalize('NFC',''.join(c+''.join(m) for c,m in cl))
VOWELS=set('\u05b0\u05b1\u05b2\u05b3\u05b4\u05b5\u05b6\u05b7\u05b8\u05b9\u05ba\u05bb\u05c7')
HOL='\u05b9'; QUB='\u05bb'; DAG='\u05bc'
def vow(ms): return [m for m in ms if m in VOWELS]
def adapt(v,k):
  """CB vocalized word v -> same niqqud on Kehot letters k, allowing only mater-lectionis (ו/י) differences. None if not safe."""
  cl=[[c,list(m)] for c,m in clusters(v)]
  out=[]; i=0; j=0
  while i<len(cl) or j<len(k):
    c=cl[i] if i<len(cl) else None; L=k[j] if j<len(k) else None
    if c and L and c[0]==L: out.append([c[0],list(c[1])]); i+=1; j+=1; continue
    # CB has an extra mater
    if c and c[0]=='י' and not c[1] and out and set(vow(out[-1][1]))&set('\u05b4\u05b5\u05b6') : i+=1; continue
    if c and c[0]=='ו' and out and not vow(out[-1][1]):
      if c[1]==[HOL]: out[-1][1].append(HOL); i+=1; continue
      if c[1]==[DAG]: out[-1][1].append(QUB); i+=1; continue
    # Kehot has an extra mater
    if L=='י' and out and (c is None or c[0]!='י') and set(vow(out[-1][1]))&set('\u05b4\u05b5\u05b6'): out.append(['י',[]]); j+=1; continue
    if L=='ו' and out:
      pv=vow(out[-1][1])
      if pv==[QUB]: out[-1][1].remove(QUB); out.append(['ו',[DAG]]); j+=1; continue
      if pv==[HOL]: out[-1][1].remove(HOL); out.append(['ו',[HOL]]); j+=1; continue
    return None
  if ''.join(c for c,_ in out)!=k: return None
  return rend(out)
def _map(keys,region,off_i,off_j,M,used,minblock=1):
  sm=difflib.SequenceMatcher(None,keys,region,autojunk=False)
  for b in sm.get_matching_blocks():
    if b.size<minblock: continue
    for q in range(b.size):
      i=off_i+b.a+q; j=off_j+b.b+q
      if i not in M and j not in used: M[i]=(j,'eq',b.size); used.add(j)
  for op,i1,i2,j1,j2 in sm.get_opcodes():
    if op=='replace' and i2-i1==j2-j1:
      for q in range(i2-i1):
        i=off_i+i1+q; j=off_j+j1+q
        if i not in M and j not in used: M[i]=(j,'rep',0); used.add(j)
def locate(keys):
  offs=[]
  for i in range(0,len(keys)-NG,2):
    for p in IDX.get(' '.join(keys[i:i+NG]),[])[:20]: offs.append(p-i)
  if not offs: return None
  votes=collections.Counter(o//200 for o in offs)
  (b,v),=votes.most_common(1)
  c=b*200; span=int(len(keys)*0.7)+300
  near=sorted(o for o in offs if c-span<=o<=c+span)
  return near[max(0,len(near)//50)], v
def chunk_locate(keys, lo, hi):
  offs=[]
  for i in range(0,len(keys)-NG):
    for p in IDX.get(' '.join(keys[i:i+NG]),[]):
      if lo<=p<hi: offs.append(p-i)
  if not offs: return None
  votes=collections.Counter(o//50 for o in offs)
  (b,v),=votes.most_common(1)
  near=sorted(o for o in offs if b*50-150<=o<=b*50+200)
  return near[len(near)//10]
def align_lesson(day, CH=250):
  toks=[]
  for pi,p in enumerate(day):
    isd=inside_daf(p['t'])
    for t in ktokens(p['t']):
      if not isd(t['a']): t['pi']=pi; toks.append(t)
  keys=[t['k'] for t in toks]
  g=locate(keys)
  if not g: return toks,None
  doc=CB[g[0]]['d']
    # doc bounds
  lo=g[0]; 
  while lo>0 and CB[lo-1]['d']==doc: lo-=1
  hi=g[0]
  while hi<len(CB) and CB[hi]['d']==doc: hi+=1
  M={}; used=set()
  for c0 in range(0,len(keys),CH):
    ck=keys[c0:c0+CH]
    o=chunk_locate(ck,0,len(CB))
    if o is None: continue
    doc=CB[min(len(CB)-1,o+20)]['d']; lo=o
    while lo>0 and CB[lo-1]['d']==doc: lo-=1
    hi=o
    while hi<len(CB) and CB[hi]['d']==doc: hi+=1
    j0=max(lo,o-150); j1=min(hi,o+int(len(ck)*1.8)+250)
    _map(ck,CBK[j0:j1],c0,j0,M,used)
  # second pass for moved passages, searched near their neighbours
  for _ in range(2):
    i=0
    while i<len(keys):
      if i in M: i+=1; continue
      e=i
      while e<len(keys) and e not in M: e+=1
      if e-i>=3:
        prev=[M[q][0] for q in range(max(0,i-30),i) if q in M]; nxt=[M[q][0] for q in range(e,min(len(keys),e+30)) if q in M]
        anc=(prev or nxt or [g[0]])[-1 if prev else 0]
        doc=CB[anc]['d']; lo=anc
        while lo>0 and CB[lo-1]['d']==doc: lo-=1
        hi=anc
        while hi<len(CB) and CB[hi]['d']==doc: hi+=1
        j0=max(lo,anc-1500); j1=min(hi,anc+1500)
        sm=difflib.SequenceMatcher(None,keys[i:e],CBK[j0:j1],autojunk=False)
        b=max(sm.get_matching_blocks(),key=lambda b:b.size)
        if b.size>=3:
          k0=max(lo,j0+b.b-b.a-20); k1=min(hi,j0+b.b+(e-i)*2+20)
          _map(keys[i:e],CBK[k0:k1],i,k0,M,used)
      i=e
  for i,t in enumerate(toks):
    t['st']='none'
    if t['abbr']: t['st']='abbr'; continue
    if i not in M: continue
    j,kind,size=M[i]; c=CB[j]; t['cbj']=j
    anch=size>=2 or (M.get(i-1,(None,))[0]==j-1) or (M.get(i+1,(None,))[0]==j+1)
    if not anch:
      # accept an isolated match only when sandwiched, in order and nearby, between solid matches
      ps=[q for q in range(i-1,max(-1,i-8),-1) if q in M and M[q][2]>=2]
      ns=[q for q in range(i+1,min(len(toks),i+8)) if q in M and M[q][2]>=2]
      ok=bool(ps and ns) and M[ps[0]][0]<j<M[ns[0]][0] and (M[ns[0]][0]-M[ps[0]][0])<=(ns[0]-ps[0])*4+2
      if not ok: t['st']='lone'; continue
    if kind=='eq': t['v']=c['v']; t['st']='eq'
    elif len(c['k'])>1 or len(t['k'])==1:
      a=adapt(c['v'],t['k'])
      if a: t['v']=a; t['st']='adapt'
      else: t['cb']=c['v']; t['st']='diff'
  return toks,(doc,g[1])
