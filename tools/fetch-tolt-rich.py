#!/usr/bin/env python3
"""Public rich Nakdan cache for the Torah Or / Likkutei Torah speech build, no key, two workers, resumable.
Prepare with build-tolt-pronunciation.mjs --prepare. Cache is outside the repository.
"""
import os,json,gzip,urllib.request,urllib.error,concurrent.futures,time
C=os.environ.get('TOLT_RICH_CACHE','/workspace/tolt-pronunciation/rich-cache')
P=json.load(open(C+'/input-list.json'))
def job(p):
 f=C+'/'+p['hash']+'.json.gz'
 if os.path.exists(f): return
 q={'task':'nakdan','data':p['text'],'genre':'rabbinic','addmorph':True,'keepqq':True,'keepmetagim':True,'useTokenization':True}
 for attempt in range(3):
  try:
   req=urllib.request.Request('https://nakdan-u2-1a.loadbalancer.dicta.org.il/api',json.dumps(q).encode(),{'Content-Type':'application/json'})
   with urllib.request.urlopen(req,timeout=90) as r: R=json.load(r)
   out=[]
   for x in R['data']:
    n=x.get('nakdan',{});out.append({'word':n.get('word',x.get('str','')),'confident':n.get('fconfident',False),'options':[{'w':o['w'],'acc':o.get('Acc'),'level':o.get('levelChoice')} for o in n.get('options',[])]})
   with gzip.open(f+'.tmp','wt',encoding='utf8') as g:json.dump({'text':p['text'],'tokens':out},g,ensure_ascii=False)
   os.replace(f+'.tmp',f);return
  except Exception as error:
   if isinstance(error,urllib.error.HTTPError) and error.code not in (500,502,503,504):raise
   if attempt==2:raise
   # Bounded request retries, never a busy loop.
   time.sleep(2*(attempt+1))
print('batches',len(P),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=int(os.environ.get('TOLT_WORKERS','2'))) as ex:
 for i,_ in enumerate(ex.map(job,P),1):
  if i%20==0 or i==len(P):print(i,'/',len(P),flush=True)
