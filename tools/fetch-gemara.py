#!/usr/bin/env python3
"""1.0.96 Gemara / Mishnah build – network stage (public Sefaria API + the public Dicta Nakdan, no key).
Cache outside the repository (GEMARA_CACHE, default /workspace/gemara-build/cache); resumable, nothing is re-fetched.
  node tools/build-gemara.mjs --plan --from 2026-11-08 --to 2027-02-06
  python3 tools/fetch-gemara.py sefaria       # texts listed in plan.json + Sefaria calendars (Yerushalmi refs)
  node tools/build-gemara.mjs --prepare        # Dicta input batches
  python3 tools/fetch-gemara.py dicta
  node tools/build-gemara.mjs                   # writes site/data/gemara
"""
import os,sys,json,gzip,re,time,threading,urllib.request,urllib.parse,urllib.error,concurrent.futures
C=os.environ.get('GEMARA_CACHE','/workspace/gemara-build/cache')
def safe(ref): return re.sub(r'[^A-Za-z0-9.:-]','_',ref).replace(':','-')
def get(url,data=None,timeout=90):
    for attempt in range(4):
        try:
            req=urllib.request.Request(url,json.dumps(data).encode() if data is not None else None,{'Content-Type':'application/json','User-Agent':'chitas-reader build (github.com/dudidd-wq/chitas-reader)'})
            with urllib.request.urlopen(req,timeout=timeout) as r: return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code not in (429,500,502,503,504) or attempt==3: raise
        except Exception:
            if attempt==3: raise
        time.sleep(3*(attempt+1))   # bounded retries, never a busy loop
def save(f,obj):
    os.makedirs(os.path.dirname(f),exist_ok=True)
    tmp=f'{f}.{os.getpid()}.{threading.get_ident()}.tmp'   # unique: two fetch processes may finish the same job
    with gzip.open(tmp,'wt',encoding='utf8') as g: json.dump(obj,g,ensure_ascii=False)
    os.replace(tmp,f)
def sefaria(job):
    tag,ref,ver=job['tag'],job['ref'],job['version']
    f=f"{C}/sefaria/{tag}/{safe(ref)}.json.gz"
    if os.path.exists(f): return
    u='https://www.sefaria.org/api/v3/texts/'+urllib.parse.quote(ref)+'?version='+urllib.parse.quote(ver)
    try: d=get(u)
    except urllib.error.HTTPError as e:
        d={'error':f'HTTP {e.code}'}
    save(f,d)
def calendar(iso):
    f=f"{C}/cal/{iso}.json.gz"
    if os.path.exists(f): return
    y,m,d=iso.split('-')
    save(f,get(f'https://www.sefaria.org/api/calendars?year={int(y)}&month={int(m)}&day={int(d)}&diaspora=0'))
def dicta(job):
    f=f"{C}/dicta/{job['genre']}-{job['hash']}.json.gz"
    if os.path.exists(f): return
    q={'task':'nakdan','data':job['text'],'genre':job['genre'],'addmorph':True,'keepqq':True,'keepmetagim':True,'useTokenization':True}
    R=get('https://nakdan-u2-1a.loadbalancer.dicta.org.il/api',q,timeout=120)
    out=[]
    for x in R['data']:
        n=x.get('nakdan',{})
        out.append({'word':n.get('word',x.get('str','')),'sep':bool(x.get('sep')),'confident':n.get('fconfident',False),
                    'options':[{'w':o['w'],'acc':o.get('Acc'),'level':o.get('levelChoice')} for o in n.get('options',[])]})
    save(f,{'text':job['text'],'genre':job['genre'],'tokens':out})
def run(fn,jobs,workers):
    print(fn.__name__,len(jobs),flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as ex:
        for i,_ in enumerate(ex.map(fn,jobs),1):
            if i%50==0 or i==len(jobs): print(' ',i,'/',len(jobs),flush=True)
stage=sys.argv[1] if len(sys.argv)>1 else 'sefaria'
if stage=='sefaria':
    P=json.load(open(C+'/plan.json'))
    run(calendar,P['dates'],2)
    jobs=list(P['texts'])
    for iso in P['dates']:   # the Yerushalmi Yomi ref (Guggenheimer segments of the Vilna daf) comes from Sefaria's calendar
        with gzip.open(f"{C}/cal/{iso}.json.gz",'rt',encoding='utf8') as g: cal=json.load(g)
        for it in cal.get('calendar_items',[]):
            if it['title']['en']=='Yerushalmi Yomi' and it.get('ref'):
                jobs.append({'tag':'yer','ref':it['ref'],'version':P['versions']['yer']})
    seen=set(); jobs=[j for j in jobs if not ((j['tag'],j['ref']) in seen or seen.add((j['tag'],j['ref'])))]
    run(sefaria,jobs,int(os.environ.get('GEMARA_WORKERS','3')))
elif stage in ('dicta','dicta-rev','dicta-mid'):   # dicta-rev: a second process from the other end (files are written atomically)
    J=json.load(open(C+'/dicta-input.json'))
    if stage=='dicta-mid': J=J[len(J)//2:]+J[:len(J)//2]   # a third process from the middle
    run(dicta,J[::-1] if stage=='dicta-rev' else J,int(os.environ.get('GEMARA_WORKERS','2')))
