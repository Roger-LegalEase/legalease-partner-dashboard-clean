#!/usr/bin/env python3
"""Full-page diagnostic checks for CR301/CR311/FI-05. NOT central raster admission."""
from pathlib import Path
import hashlib,json,re,sys
import fitz
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'data/rcap-all50/overlays/census-v1/mo/mo-610-145-mistaken-identity-set--official-pdf-fill'
EVIDENCE=ROOT/'data/rcap-grade-a/chat-parallel-2026-09-07/chat7-build'
SOURCE=ROOT/'reference/chat-parallel-2026-09-07/chat7'
def pixels(page,rect):return page.get_pixmap(matrix=fitz.Matrix(2,2),clip=fitz.Rect(rect),alpha=False).samples
def normal(s):return re.sub(r'\s+',' ',s).strip()
manifest=json.loads((OUT/'packet-manifest.json').read_text())
checks=[]
for variant in manifest['variants']:
    doc=fitz.open(OUT/variant['packet'])
    assert len(doc)==variant['pages'],variant['id']
    for page in doc:
        assert not list(page.widgets() or []),'surviving widget'
        assert not list(page.annots() or []),'surviving annotation'
        for word in page.get_text('words'):
            assert word[0]>=0 and word[1]>=0 and word[2]<=page.rect.width+.1 and word[3]<=page.rect.height+.1,(variant['id'],word)
    if variant['id']=='automatic-on-notice':
        assert len(doc)==1
        continue
    coverage=json.loads((OUT/(variant['id']+'.coverage.json')).read_text())
    for component in coverage:
        pages=[doc[i] for i in range(component['firstPage']-1,component['lastPage'])]
        rendered=normal(' '.join(p.get_text() for p in pages))
        audit=component['audit']
        written=audit.get('mapped',[])
        for sub in audit.get('fills',[]):written+=sub['mapped']
        for entry in written:
            if 'value' in entry:assert normal(entry['value']) in rendered,(variant['id'],component['component'],entry)
        if component['component']=='CR301':
            source=fitz.open(SOURCE/'CR301.pdf')[0]
            assert pixels(source,[344,623,558,654])==pixels(pages[0],[344,623,558,654]),'CR301 signature region changed'
            # Agency value must be below, never over, the official printed label.
            label=pages[0].search_for('Name of Arresting Agency')[0]
            fact=json.loads((OUT/(variant['id'].split('.')[0]+'.fixture.json')).read_text())['arrest']['agency']
            value=pages[0].search_for(fact)[0]
            assert value.y0>label.y1+.5,(label,value)
        if component['component']=='CR311':
            source=fitz.open(SOURCE/'CR311.pdf')[0]
            assert pixels(source,[34,319,578,669])==pixels(pages[0],[34,319,578,669]),'judicial body or execution changed'
        if component['component']=='FI-05':
            source=fitz.open(SOURCE/'FI-05.pdf')
            # Official code pages are retained in full, without added content.
            assert pixels(source[2],source[2].rect)==pixels(pages[-2],pages[-2].rect),'first case-type page changed'
            assert pixels(source[3],source[3].rect)==pixels(pages[-1],pages[-1].rect),'case code page changed'
    checks.append({'variant':variant['id'],'pages':len(doc),'mappedTextPresent':True,'protectedExecutionPixelsUnchanged':True,'allPageBoundsChecked':True})
result={'method':'PyMuPDF full-page text/bounds and 144dpi protected-region pixel comparison, not calibrated Chromium raster','variants':9,'totalVariantPages':sum(x['pages'] for x in manifest['variants']),'petitionsVerified':checks,'status':'PASS_DIAGNOSTIC_ONLY'}
EVIDENCE.mkdir(parents=True,exist_ok=True);(EVIDENCE/'mistaken-identity-pdf-content.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
