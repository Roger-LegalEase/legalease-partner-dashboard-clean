#!/usr/bin/env python3
"""Read FINAL PDFs. Compare exact value text, geometry, and protected ink to held source."""
from pathlib import Path
import json, hashlib, re, subprocess
import fitz
import numpy as np
ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'data/rcap-all50/overlays/census-v1/ia/ia-901c2-set--official-pdf-fill'
SOURCE = ROOT / 'reference/chat-parallel-2026-09-07/chat8/ia-rule-2-86-form-1-2024-08.pdf'
source = fitz.open(SOURCE)
results=[]
for record in json.loads((OUT/'reports/rendered-artifacts.json').read_text())['fixtures']:
    name=record['fixture']; p=OUT/record['path']; b=p.read_bytes(); d=fitz.open(p)
    assert hashlib.sha256(b).hexdigest()==record['sha256']
    assert len(d)==record['pageCount']
    report=json.loads((OUT/f'reports/{name}.json').read_text())
    facts=json.loads((OUT/f'fixtures/{name}.json').read_text())
    text='\n'.join(page.get_text() for page in d)
    assert not re.search(r'\bundefined\b|\bNaN\b|\[object Object\]', text)
    assert facts['name'] in text and facts['caseNumber'] in text
    assert '20 days after service' in ' '.join(text.split())
    assert 'not destroy the record' in text
    for page in d:
        assert len(list(page.widgets() or []))==0
        assert len(list(page.annots() or []))==0
    spans=[]
    for w in report['actualWrites']:
        if w['type']!='PDFTextField': continue
        for widget in w['widgets']:
            page=d[widget['page']-1]; r=widget['rect']
            rect=fitz.Rect(r['x'], page.rect.height-r['y']-r['height'], r['x']+r['width'], page.rect.height-r['y'])
            # pdf-lib Helvetica ascenders can cross the widget by fractions of a point.
            found=' '.join(page.get_textbox(rect+(-1,-1,1,1)).split())
            assert w['value'] in found, (name,w['fieldId'],w['value'],found)
            assert w['fit']['fontSize']>=8
            spans.append({'fieldId':w['fieldId'],'textReadBack':w['value'],'fontSize':w['fit']['fontSize']})
    protections=[]
    for b in report['blanks']:
        if b['disposition']!='PROTECTED_FIELD' or b['type']=='PDFRadioGroup': continue
        for widget in b['widgets']:
            i=widget['page']-1; r=widget['rect']; rect=fitz.Rect(r['x']+1, 792-r['y']-r['height']+1, r['x']+r['width']-1, 792-r['y']-1)
            # Compare the writing area, excluding the underlying rule. Never infer
            # a signature is blank only because text extraction returned nothing.
            before=source[i].get_pixmap(matrix=fitz.Matrix(3,3),clip=rect,colorspace=fitz.csGRAY,alpha=False)
            after=d[i].get_pixmap(matrix=fitz.Matrix(3,3),clip=rect,colorspace=fitz.csGRAY,alpha=False)
            a=np.frombuffer(before.samples,np.uint8).astype(int); z=np.frombuffer(after.samples,np.uint8).astype(int)
            assert a.shape==z.shape
            added=int(np.count_nonzero((z<100)&(a-z>50)))
            assert added==0,(name,b['fieldId'],added)
            protections.append({'fieldId':b['fieldId'],'addedDarkPixels':added,'resolutionDpi':216})
    # An actual independent text importer, not only the first PDF engine.
    read=subprocess.run(['pdftotext',str(p),'-'],capture_output=True,text=True,check=True)
    assert facts['name'] in read.stdout and facts['caseNumber'] in read.stdout
    if facts['requestsWaiverOf180Days']:
        normalized=' '.join(read.stdout.split())
        assert ' '.join(facts['goodCauseNarrative'].split()) in normalized
    results.append({'fixture':name,'sha256':record['sha256'],'pages':len(d),'knownTextWritesVerified':len(spans),'textWrites':spans,'protectedInkComparisons':protections,'engines':['PyMuPDF','Poppler pdftotext']})
print(json.dumps({'familyId':'ia-901c2-set','completePdfs':len(results),'pages':sum(r['pages'] for r in results),'results':results},indent=2))
