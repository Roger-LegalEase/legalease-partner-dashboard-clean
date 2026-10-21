#!/usr/bin/env python3
"""Read-only source/appearance delta proof for the MO01/MO02 correction.
PDF/PNG identities are separate. No independent or central-raster approval.
"""
import argparse, hashlib, json
from pathlib import Path
import fitz
import pypdfium2 as pdfium

def sha(data): return hashlib.sha256(data).hexdigest()
def read(path): return json.loads(path.read_text())

def inspect(before, after, images, receipt):
    images.mkdir(parents=True,exist_ok=True)
    old=read(before/'packet-manifest.json'); new=read(after/'packet-manifest.json')
    prior={x['id']:x for x in old['variants']}
    assert set(prior)=={x['id'] for x in new['variants']}
    result={'method':'Author diagnostic: whole-PDF SHA256; complete 144-DPI PyMuPDF images; PDFium cross-render of every new post-order page', 'independentReview':False,'centralRasterAdmission':False,'variants':[], 'uniqueChangedPages':[], 'officialPagesUnchanged':0,'unchangedOldPageInstances':0,'changedOldPageInstances':0,'newPageInstances':0}
    unique={}
    for variant in new['variants']:
        prev=prior[variant['id']]; p0=before/prev['packet']; p1=after/variant['packet']
        a=fitz.open(p0); b=fitz.open(p1); assert len(b)==len(a)+1
        source_pages={i for c in prev['components'] if c['component']!='instructions' for i in range(c['firstPage']-1,c['lastPage'])}
        record={'id':variant['id'],'path':variant['packet'],'beforeSha256':sha(p0.read_bytes()),'afterSha256':sha(p1.read_bytes()),'beforePages':len(a),'afterPages':len(b),'pages':[]}
        for i,page in enumerate(b):
            img=page.get_pixmap(matrix=fitz.Matrix(2,2),alpha=False); png=img.tobytes('png'); digest=sha(png)
            same=False
            if i<len(a):
                oldimg=a[i].get_pixmap(matrix=fitz.Matrix(2,2),alpha=False)
                same=oldimg.samples==img.samples and (oldimg.width,oldimg.height)==(img.width,img.height)
                result['unchangedOldPageInstances' if same else 'changedOldPageInstances']+=1
            else: result['newPageInstances']+=1
            if i in source_pages:
                assert same, f'OFFICIAL_SOURCE_PAGE_CHANGED: {variant["id"]} page {i+1}'
                result['officialPagesUnchanged']+=1
            if not same and digest not in unique:
                name=f'changed-{len(unique)+1:02}.png'; (images/name).write_bytes(png)
                unique[digest]=name
                result['uniqueChangedPages'].append({'file':name,'sha256':digest,'firstOccurrence':variant['id'],'page':i+1,'width':img.width,'height':img.height,'visualInspection':'PENDING'})
            record['pages'].append({'page':i+1,'pngSha256':digest,'sameAsPriorPage':same,'officialComponent':i in source_pages,'changedImage':unique.get(digest)})
            # Existing printed official source may touch margins; guide ink must fit.
            if i not in source_pages:
                for word in page.get_text('words'):
                    assert word[0]>=20 and word[1]>=20 and word[2]<=page.rect.width-20 and word[3]<=page.rect.height-20, (variant['id'],i+1,word)
        pdf=pdfium.PdfDocument(str(p1)); pi=pdf[len(pdf)-1].render(scale=2).to_pil()
        import io
        stream=io.BytesIO(); pi.save(stream,format='PNG'); pi_bytes=stream.getvalue()
        pi_name=f'pdfium-post-order-{variant["id"]}.png'; (images/pi_name).write_bytes(pi_bytes)
        text=b[-1].get_text()
        for term in ['certified corrected driver history','three-year period immediately before','notify the insurer','clerk notifies','Department of Corrections']:
            assert term in ' '.join(text.split()), (variant['id'],term)
        record['pdfiumLastPage']={'path':pi_name,'sha256':sha(pi_bytes),'dimensions':list(pi.size)}
        result['variants'].append(record)
    oldmap=read(before/'production-field-map.json'); newmap=read(after/'production-field-map.json')
    result['machineRowsPreserved']={key:oldmap[key]==newmap[key] for key in ['writes','refusals']}
    assert all(result['machineRowsPreserved'].values()),'Qualified machine rows changed'
    delta=[]
    for p in sorted(before.rglob('*.pdf')):
        rel=p.relative_to(before); target=after/rel
        assert target.is_file(),f'Missing prior output {rel}'
        delta.append({'path':str(rel),'beforeSha256':sha(p.read_bytes()),'afterSha256':sha(target.read_bytes()),'unchanged':p.read_bytes()==target.read_bytes()})
    result['pdfDelta']=delta
    result['summary']={'completePdfs':len(new['variants']),'beforePages':sum(v['pages'] for v in old['variants']),'afterPages':sum(v['pages'] for v in new['variants']),'changedPdfs':sum(not x['unchanged'] for x in delta),'unchangedPdfs':sum(x['unchanged'] for x in delta),'uniqueCompleteChangedPages':len(unique)}
    receipt.parent.mkdir(parents=True,exist_ok=True);receipt.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result['summary'],indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--before',type=Path,required=True);parser.add_argument('--after',type=Path,required=True);parser.add_argument('--images',type=Path,required=True);parser.add_argument('--receipt',type=Path,required=True);args=parser.parse_args()
    inspect(args.before,args.after,args.images,args.receipt)
