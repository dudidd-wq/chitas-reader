import json,urllib.request,urllib.parse,time,os
T=json.load(open(os.path.join(os.path.dirname(__file__),'data','hayomyom-titles.json'))); os.makedirs('/workspace/hayomyom/raw',exist_ok=True)
for t in T:
  f='/workspace/hayomyom/raw/'+t.replace('/','_')+'.json'
  if os.path.exists(f): continue
  u='https://text.chabadpedia.com/api.php?'+urllib.parse.urlencode({'action':'parse','page':t,'prop':'text|revid','format':'json','disableeditsection':1})
  for k in range(3):
    try:
      d=urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'chitas-reader importer (local study app)'}),timeout=30).read(); break
    except Exception as e: time.sleep(3)
  open(f,'wb').write(d); time.sleep(0.4)
print('ok')
