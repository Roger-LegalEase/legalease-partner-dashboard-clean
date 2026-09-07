#!/usr/bin/env python3
"""Read and rasterize final Form 2 packets, with real complete-PDF defect controls.
Author QA only; no source approval, independent review or central-raster admission.
"""
from __future__ import annotations
import argparse, hashlib, json, subprocess, tempfile
from pathlib import Path
import fitz
import numpy as np

REL = Path('data/rcap-all50/overlays/census-v1/ia/ia-901c3-set--official-pdf-fill')
SOURCE = Path('reference/chat-parallel-2026-09-07/chat8/ia-rule-2-86-form-2-2024-08.pdf')

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def rect(widget: dict, height: float) -> fitz.Rect:
    b = widget['rect']
    return fitz.Rect(b['x'], height-b['y']-b['height'], b['x']+b['width'], height-b['y'])

def normalized(s: str) -> str:
    return ''.join(s.split())

def gray(page: fitz.Page, box: fitz.Rect) -> np.ndarray:
    p = page.get_pixmap(matrix=fitz.Matrix(3,3), clip=box, colorspace=fitz.csGRAY, alpha=False, annots=True)
    return np.frombuffer(p.samples, dtype=np.uint8).reshape(p.height,p.width)

def validate_pdf(data: bytes, report: dict, source: fitz.Document) -> dict:
    doc=fitz.open(stream=data,filetype='pdf')
    expected=sum(c['pages'] for c in report['components'])
    assert len(doc)==expected, 'complete component/page coverage changed'
    assert all(not list(p.widgets() or []) for p in doc), 'interactive fields survived'
    assert 'Rule 2.86' in doc[0].get_text() and '901C.3' in doc[0].get_text(), 'wrong official form'
    all_text='\n'.join(p.get_text() for p in doc)
    assert 'not a fully assembled filing' in all_text, 'external-report disclosure absent'
    assert 'Item 9 remains blank' in all_text, 'actual attachment truth missing'
    assert 'Sources and official assistance' in all_text, 'instruction component incomplete'
    def chars(page):
        return [c for b in page.get_text('rawdict')['blocks'] if 'lines' in b for l in b['lines'] for s in l['spans'] for c in s['chars'] if c['c'].strip()]
    from collections import Counter
    for i in range(3):
        original=Counter((round(c['bbox'][0],2),round(c['bbox'][1],2),c['c']) for c in chars(source[i]))
        boxes=[rect(g,doc[i].rect.height)+(-.6,-.6,.6,.6) for w in report['actualWrites'] if w['type']=='PDFTextField' for g in w['widgets'] if g['page']==i+1]
        for c in chars(doc[i]):
            key=(round(c['bbox'][0],2),round(c['bbox'][1],2),c['c'])
            if original[key]: original[key]-=1; continue
            assert any(b.contains(fitz.Rect(c['bbox'])) for b in boxes), f'added text outside every measured write box on page {i+1}: {c}'
    for p in doc:
        for b in p.get_text('dict')['blocks']:
            if 'lines' in b: assert (p.rect+(-.5,-.5,.5,.5)).contains(fitz.Rect(b['bbox'])), 'text outside page boundary'
    checks=[]
    for w in report['actualWrites']:
        widget=w['widgets'][0]; p=doc[widget['page']-1]; box=rect(widget,p.rect.height)
        if w['type']=='PDFTextField':
            read=p.get_textbox(box+(-.5,-.5,.5,.5))
            assert normalized(str(w['value'])) in normalized(read), f"known value not visible in its own widget: {w['fieldId']} / {read!r}"
            assert w['fit']['fontSize']>=8, 'font floor violated'
            spans=[s for b in p.get_text('dict',clip=box+(-.5,-.5,.5,.5))['blocks'] if 'lines' in b for l in b['lines'] for s in l['spans']]
            matching=[s for s in spans if normalized(s['text']) and normalized(s['text']) in normalized(str(w['value']))]
            for s in matching:
                # Actual glyph boxes, not estimated font advances from the shared parser.
                assert (box+(-.5,-.5,.5,.5)).contains(fitz.Rect(s['bbox'])), f"ink outside widget {w['fieldId']}"
            checks.append({'field':w['fieldId'],'value':w['value'],'kind':'text','visibleInOwnWidget':True})
        elif w['type']=='PDFCheckBox':
            inside=box+(1.4,1.4,-1.4,-1.4)
            before=gray(source[widget['page']-1],inside); after=gray(p,inside)
            assert before.shape==after.shape
            pixels=int(((after<90)&(before>180)).sum())
            assert pixels>=3, f"selected checkbox has no added ink: {w['fieldId']}"
            checks.append({'field':w['fieldId'],'kind':'selection','addedDarkPixels':pixels})
    protected=[]
    for b in report['blanks']:
        if b['type']=='PDFButton': continue
        for widget in b['widgets']:
            p=doc[widget['page']-1]; box=rect(widget,p.rect.height)
            before=gray(source[widget['page']-1],box); after=gray(p,box)
            assert before.shape==after.shape
            added=int(((after<80)&(before>180)).sum())
            assert added==0, f"blank has new ink: {b['fieldId']} ({added} pixels)"
            protected.append({'field':b['fieldId'],'page':widget['page'],'addedDarkPixels':added,'disposition':b['completenessDisposition']})
    expected_alias=report['assessment']['facts']['aliases'][1:]
    alias_components=[c for c in report['components'] if c['id']=='additional-alternate-names']
    assert bool(expected_alias)==bool(alias_components), 'false alternate-name component claim'
    if expected_alias:
        c=alias_components[0]
        txt='\n'.join(doc[i].get_text() for i in range(c['firstPacketPage']-1,c['lastPacketPage']))
        for n in expected_alias:
            assert f"First: {n['first']};" in txt and f"last: {n['last']}." in txt, 'held alternate name absent from attachment'
    assert report['assessment']['externalHistoryIncluded'] is False
    assert all(c['id']!='returned-dci-history' for c in report['components'])
    return {'wholePdfSha256':sha(data),'pages':len(doc),'knownValuesAndSelections':checks,'allNonViewerBlanks':protected,'externalHistoryIncluded':False,'filingReady':False}

def controls(root: Path, source: fitz.Document) -> list[dict]:
    family=root/REL
    report=json.loads((family/'reports/canonical.json').read_text())
    base=(family/'fixtures/canonical.pdf').read_bytes()
    records=[]
    def reject(label: str, data: bytes, r: dict=report) -> None:
        try: validate_pdf(data,r,source)
        except (AssertionError,RuntimeError,ValueError) as e: records.append({'control':label,'rejected':True,'error':str(e),'wholePdfSha256':sha(data)})
        else: raise AssertionError('defective complete PDF was accepted: '+label)
    d=fitz.open(stream=base,filetype='pdf');w=next(w for w in report['actualWrites'] if w['fieldId']=='2.86-2.cap.03');box=rect(w['widgets'][0],792);d[0].add_redact_annot(box,fill=(1,1,1));d[0].apply_redactions();reject('erase known full name',d.tobytes())
    d=fitz.open(stream=base,filetype='pdf');d[2].insert_text((310,195),'FORGED SIGNATURE',fontsize=9);reject('invent participant signature',d.tobytes())
    d=fitz.open(stream=base,filetype='pdf');b=next(x for x in report['blanks'] if x['fieldId']=='2.86-2.09');r=rect(b['widgets'][0],792);d[1].draw_line((r.x0+2,r.y0+2),(r.x1-2,r.y1-2),width=1);reject('assert report attached with no report',d.tobytes())
    d=fitz.open(stream=base,filetype='pdf');d.delete_page(len(d)-1);reject('omit final instruction page',d.tobytes())
    alias_report=json.loads((family/'reports/additional-aliases.json').read_text());d=fitz.open(family/'fixtures/additional-aliases.pdf');d.delete_page(3);reject('omit selected alternate-name sheet',d.tobytes(),alias_report)
    d=fitz.open(stream=base,filetype='pdf');d.delete_page(0);d.new_page(pno=0,width=612,height=792);reject('replace official first page with blank',d.tobytes())
    d=fitz.open(stream=base,filetype='pdf');d[0].insert_text((555,400),'OUTSIDE',fontsize=10);reject('add text outside every allowed write box',d.tobytes())
    return records

def main() -> None:
    ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[3]);ap.add_argument('--evidence',type=Path,required=True);args=ap.parse_args()
    root=args.root.resolve();out=args.evidence;out.mkdir(parents=True,exist_ok=True);family=root/REL
    source=fitz.open(root/SOURCE)
    artifacts=json.loads((family/'reports/rendered-artifacts.json').read_text())['packets']
    result=[];images=[];first_by_hash={}
    for a in artifacts:
        name=a['fixture']; data=(family/a['relativePath']).read_bytes();report=json.loads((family/'reports'/f'{name}.json').read_text())
        assert sha(data)==a['sha256']; measured=validate_pdf(data,report,source)
        with tempfile.TemporaryDirectory() as td:
            pdf=Path(td)/'packet.pdf';pdf.write_bytes(data)
            r=subprocess.run(['pdftotext','-layout',str(pdf),'-'],capture_output=True,text=True)
            assert r.returncode==0,r.stderr
            assert '901C.3' in r.stdout and 'Item 9 remains blank' in r.stdout
            measured['popplerTextImportExit']=r.returncode
            pop=out/'poppler';pop.mkdir(exist_ok=True)
            cmd=['pdftoppm','-r','110','-png',str(pdf),str(pop/name)]
            r=subprocess.run(cmd,capture_output=True,text=True);assert r.returncode==0,r.stderr
            measured['popplerRasterCommand']=cmd[:-2]+['<exact whole PDF>',str(pop/name)]
            measured['popplerRasterExit']=r.returncode
        doc=fitz.open(stream=data,filetype='pdf');renders=out/'pages';renders.mkdir(exist_ok=True)
        for i,p in enumerate(doc):
            pix=p.get_pixmap(matrix=fitz.Matrix(1.75,1.75));data=pix.tobytes('png');h=sha(data);rel=f'pages/{name}-{i+1:02}.png';(out/rel).write_bytes(data)
            row={'fixture':name,'page':i+1,'png':rel,'pngSha256':h,'wholePdfSha256':a['sha256']}
            if h in first_by_hash:row['pixelIdenticalTo']=first_by_hash[h]
            else:first_by_hash[h]=rel
            images.append(row)
        result.append({'fixture':name,**measured})
    negative=controls(root,source)
    payload={'familyId':'ia-901c3-set','authorQaOnly':True,'sourceSha256':sha((root/SOURCE).read_bytes()),'fixtures':result,'images':images,'wholePagesRasterized':len(images),'distinctPageImages':len(first_by_hash),'completePdfDefectControls':negative,'independentReview':'PENDING_CHAT10','centralRaster':'PENDING_CHAT_A'}
    (out/'pdf-verification.json').write_text(json.dumps(payload,indent=2)+'\n')
    print(json.dumps({'fixtures':len(result),'wholePages':len(images),'distinctPages':len(first_by_hash),'completePdfDefectControlsRejected':len(negative),'status':'AUTHOR_QA_EXECUTED_EXTERNAL_REPORT_NOT_INCLUDED'},indent=2))
if __name__=='__main__':main()
