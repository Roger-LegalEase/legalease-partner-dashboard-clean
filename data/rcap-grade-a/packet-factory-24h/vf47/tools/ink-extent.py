#!/usr/bin/env python3
"""VF47 ink-extent measurement. pdftoppm -gray writes PGM (P5, mode L) directly:
no PNG, so no RGB-masquerading-as-grayscale trap. Verified by asserting P5."""
import subprocess, sys, os, glob, json
import numpy as np

def read_pgm(path):
    with open(path,"rb") as f: data=f.read()
    assert data[:2]==b"P5", "not a binary PGM: %r" % data[:2]
    i=2; vals=[]
    while len(vals)<3:
        while data[i] in b" \t\r\n": i+=1
        if data[i:i+1]==b"#":
            while data[i] not in b"\r\n": i+=1
            continue
        j=i
        while data[j] not in b" \t\r\n": j+=1
        vals.append(int(data[i:j])); i=j
    i+=1
    w,h,mx=vals; assert mx==255
    a=np.frombuffer(data,dtype=np.uint8,count=w*h,offset=i).reshape(h,w)
    return a

def measure(pdf,page,dpi,thresholds,outdir):
    stem=os.path.join(outdir,"pg")
    for old in glob.glob(stem+"*.pgm"): os.remove(old)
    subprocess.run(["pdftoppm","-r",str(dpi),"-gray","-f",str(page),"-l",str(page),pdf,stem],check=True)
    f=glob.glob(stem+"*.pgm"); assert len(f)==1,f
    a=read_pgm(f[0]); h,w=a.shape
    res={}
    for t in thresholds:
        m=a<t; n=int(m.sum())
        if n==0: res[str(t)]={"darkPixels":0,"inkBoxPt":None}
        else:
            ys,xs=np.where(m)
            res[str(t)]={"darkPixels":n,
              "inkBoxPt":[round(int(xs.min())*72.0/dpi,2),round(int(ys.min())*72.0/dpi,2),
                          round((int(xs.max())+1)*72.0/dpi,2),round((int(ys.max())+1)*72.0/dpi,2)]}
    os.remove(f[0])
    return {"page":page,"sheetPt":[round(w*72.0/dpi,2),round(h*72.0/dpi,2)],"byThreshold":res}

if __name__=="__main__":
    pdf=sys.argv[1]; dpi=int(sys.argv[2]); outdir=sys.argv[3]
    n=int(subprocess.run(["pdfinfo",pdf],capture_output=True,text=True).stdout.split("Pages:")[1].split()[0])
    print(json.dumps({"pdf":pdf,"dpi":dpi,"pages":n,
      "perPage":[measure(pdf,p,dpi,[240,200,128],outdir) for p in range(1,n+1)]}))
