#!/usr/bin/env python3
"""Author QA of complete outputs against a separately retained before-repair pair.

Uses actual raster pixels, not text extraction as a checkbox proxy. The pinned
prior artifacts are an explicit parameter; they are never promoted as current.
"""
import argparse,hashlib,json,pathlib
import fitz
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[3]
FAMILY=ROOT/'data/rcap-all50/overlays/census-v1/co/co-motion-seal-nonconviction-set--official-pdf-fill'
# Read from source /Rect; top-left PDF coordinates, page 1 of JDF 478.
CBI=fitz.Rect(108.884,606.665,118.244,616.025)
SOURCE_CBI=fitz.Rect(126.72,348.611,136.08,357.971)
ADDRESS=fitz.Rect(297.638,405.070,540.311,417.31)
def raster(page):
    p=page.get_pixmap(matrix=fitz.Matrix(2,2),alpha=False)
    return np.frombuffer(p.samples,dtype=np.uint8).reshape(p.height,p.width,p.n).copy()
def inspect(data,before,fixture):
    doc=fitz.open(stream=data,filetype='pdf');old=fitz.open(stream=before,filetype='pdf')
    assert len(doc)==len(old)==5,'official packet pages omitted'
    rows=[]
    for i in range(5):
        a,b=raster(old[i]),raster(doc[i]);assert a.shape==b.shape,'page dimensions changed'
        changed=np.any(a!=b,axis=2);yy,xx=np.where(changed)
        if i!=3: assert len(yy)==0,'non-CBI page changed (including source-authored JDF477 mark)'
        else:
            assert len(yy)>15,'required CBI mark absent'
            assert xx.min()>=int(CBI.x0*2) and xx.max()<=int(CBI.x1*2)+1 and yy.min()>=int(CBI.y0*2) and yy.max()<=int(CBI.y1*2)+1,'new ink outside exact CBI checkbox'
            # There must be dark mark pixels newly introduced INSIDE the box,
            # not simply a changed border or an all-white erasure.
            ink=np.logical_and(np.mean(b,axis=2)<128,np.mean(a,axis=2)>192)
            assert int(ink.sum())>=8,'no visible new checked-state ink'
        rows.append({'fixture':fixture,'page':i+1,'pixelIdentical':len(yy)==0,'changedPixels':len(yy)})
    if fixture=='boundary':
        assert not doc[0].get_text(clip=ADDRESS).strip(),'refused boundary address was silently drawn'
        assert '1188 Upper Notch Crossing Road' in doc[3].get_text(),'full held address missing from other component'
    return rows

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--before',type=pathlib.Path,required=True);ap.add_argument('--out',type=pathlib.Path,required=True);a=ap.parse_args();a.out.mkdir(parents=True,exist_ok=True)
    positives=[];negatives=[]
    for fixture in ['canonical','boundary']:
        data=(FAMILY/'fixtures'/f'{fixture}.pdf').read_bytes();before=(a.before/f'{fixture}.pdf').read_bytes()
        pages=inspect(data,before,fixture);positives.append({'fixture':fixture,'sha256':hashlib.sha256(data).hexdigest(),'pages':pages})
        for mutation in ['old-empty-cbi','extra-mark-on-jdf477','unrelated-new-ink','missing-official-page']:
            doc=fitz.open(stream=data,filetype='pdf')
            if mutation=='old-empty-cbi':changed=before
            else:
                if mutation=='extra-mark-on-jdf477':doc[1].insert_text((SOURCE_CBI.x0+1,SOURCE_CBI.y1-1),'X',fontsize=9)
                if mutation=='unrelated-new-ink':doc[3].insert_text((150,550),'NOT AUTHORIZED',fontsize=10)
                if mutation=='missing-official-page':doc.delete_page(4)
                changed=doc.tobytes()
            try:inspect(changed,before,fixture)
            except AssertionError as e:negatives.append({'fixture':fixture,'mutation':mutation,'caught':str(e)})
            else:raise AssertionError('defective output escaped: '+mutation)
        doc=fitz.open(stream=data,filetype='pdf')
        for i in [0,3]:doc[i].get_pixmap(matrix=fitz.Matrix(2,2),alpha=False).save(a.out/f'{fixture}-page-{i+1}.png')
    report={'familyId':'co_motion_seal_nonconviction-set','scope':'author complete-output pixel QA, not central raster or independent review','positives':positives,'negativeControls':negatives,'negativeCount':len(negatives),'independentApproval':False}
    (a.out/'output-tests.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if __name__=='__main__':main()
