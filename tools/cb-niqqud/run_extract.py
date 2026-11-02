import sys,json,pymupdf; import os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import extract as E
fn=sys.argv[1]; out=sys.argv[2]
d=pymupdf.open(fn); T=[]
for i,p in enumerate(d): T+=E.page_tokens(p,i)
json.dump(T,open(out,'w'),ensure_ascii=False)
print(fn,len(T))
