#!/usr/bin/env python3
"""Build-time public Dicta Nakdan rich morphology/stress cache. No credentials, no runtime network.
Re-run safely: existing SHA256 paragraph cache files are reused. Then run improve-hayomyom.mjs.
"""
import json,urllib.request,concurrent.futures,re,hashlib,os,time
D=json.load(open(os.path.join(os.path.dirname(__file__), '..', 'site/data/hayomyom/days.json')));C=os.environ.get('HAYOM_RICH_CACHE','/workspace/hayomyom/rich-cache');os.makedirs(C,exist_ok=True)
P=list(dict.fromkeys(re.sub('<[^>]+>','',p[0]) for e in D.values() for p in e['p']))
def job(t):
 f=C+'/'+hashlib.sha256(t.encode()).hexdigest()+'.json'
 if os.path.exists(f):return
 b={'task':'nakdan','data':t,'genre':'rabbinic','addmorph':True,'keepqq':True,'keepmetagim':True,'useTokenization':True}
 req=urllib.request.Request('https://nakdan-u2-1a.loadbalancer.dicta.org.il/api',json.dumps(b).encode(),{'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=90) as r:R=json.load(r)
 out=[]
 for x in R['data']:
  n=x.get('nakdan',{});opts=n.get('options',[])
  o=next((a for a in opts if a['levelChoice']==1),opts[0] if opts else {})
  out.append({'word':n.get('word',x.get('str','')),'w':o.get('w',n.get('word',x.get('str',''))),'acc':o.get('Acc'),'sep':x.get('sep',False)})
 json.dump({'text':t,'tokens':out},open(f,'w'),ensure_ascii=False)
print('paragraphs',len(P),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
 for i,_ in enumerate(ex.map(job,P)):
  if i%30==0:print(i,flush=True)
