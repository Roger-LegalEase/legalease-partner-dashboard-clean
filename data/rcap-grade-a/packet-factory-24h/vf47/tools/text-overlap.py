#!/usr/bin/env python3
"""Text-on-text overlap from pdftotext -bbox-layout word boxes."""
import subprocess,sys,json,re
from xml.etree import ElementTree as ET
NS="{http://www.w3.org/1999/xhtml}"
def words(pdf):
    x=subprocess.run(["pdftotext","-bbox-layout",pdf,"-"],capture_output=True,text=True,check=True).stdout
    root=ET.fromstring(x); out=[]
    for pi,pg in enumerate(root.iter(NS+"page"),1):
        pw=float(pg.get("width")); ph=float(pg.get("height")); ws=[]
        for w in pg.iter(NS+"word"):
            ws.append((float(w.get("xMin")),float(w.get("yMin")),float(w.get("xMax")),float(w.get("yMax")),(w.text or "").strip()))
        out.append((pi,pw,ph,ws))
    return out
def area(a,b):
    ox=min(a[2],b[2])-max(a[0],b[0]); oy=min(a[3],b[3])-max(a[1],b[1])
    return ox*oy if ox>0 and oy>0 else 0.0
if __name__=="__main__":
    pdf=sys.argv[1]; minfrac=float(sys.argv[2]) if len(sys.argv)>2 else 0.30
    rep=[]
    for pi,pw,ph,ws in words(pdf):
        # bucket by y band to keep it O(n * small)
        for i in range(len(ws)):
            for j in range(i+1,len(ws)):
                a,b=ws[i],ws[j]
                if b[1]>a[3]: break
                ov=area(a,b)
                if ov<=0: continue
                sa=(a[2]-a[0])*(a[3]-a[1]); sb=(b[2]-b[0])*(b[3]-b[1])
                f=ov/max(1e-9,min(sa,sb))
                if f>=minfrac:
                    rep.append({"page":pi,"a":a[4],"b":b[4],"overlapFractionOfSmaller":round(f,3),
                                "aBox":[round(v,2) for v in a[:4]],"bBox":[round(v,2) for v in b[:4]]})
    print(json.dumps({"pdf":pdf,"minOverlapFractionOfSmallerBox":minfrac,"overlaps":rep,"count":len(rep)},indent=1))
