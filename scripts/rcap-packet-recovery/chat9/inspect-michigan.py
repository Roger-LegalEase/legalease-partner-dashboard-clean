"""Byte-derived author QA; does not issue independent or central-raster approvals."""
from pathlib import Path
import hashlib,json,collections
import fitz,numpy as np
ROOT=Path(__file__).resolve().parents[3]
E=ROOT/'data/rcap-grade-a/chat-parallel-2026-09-07/chat9-build'
E.mkdir(parents=True,exist_ok=True)
visual=E/'visual';visual.mkdir(exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
source=fitz.open(ROOT/'reference/chat-parallel-2026-09-07/chat9/mc227.pdf')
base=[p.get_pixmap(matrix=fitz.Matrix(1.5,1.5),alpha=False) for p in source]
basearr=[np.frombuffer(p.samples,np.uint8).reshape(p.height,p.width,3) for p in base]
all_results=[];unique={}; errors=[]
for stem in ['mi-setaside-application-set','mi-setaside-first-owi-set']:
    directory=ROOT/f'data/rcap-all50/overlays/census-v1/mi/{stem}--official-pdf-fill'
    rendered=json.loads((directory/'reports/rendered-artifacts.json').read_text())
    proof=[];documents=[]
    for a in rendered['artifacts']:
        file=directory/a['path'];d=fitz.open(file)
        report=json.loads((directory/f'reports/{a["variant"]}-render.json').read_text())
        census=report['fieldLedger'];values=report['explicitFacts']; result={'familyId':rendered['familyId'],'fixture':a['variant'],'sha256':sha(file.read_bytes()),'pages':[],'protectedRegions':[],'textWrites':[]}
        arrays=[]
        for n,page in enumerate(d):
            assert not list(page.widgets() or []),'interactive form field survived'
            pix=page.get_pixmap(matrix=fitz.Matrix(1.5,1.5),alpha=False)
            arr=np.frombuffer(pix.samples,np.uint8).reshape(pix.height,pix.width,3);arrays.append(arr)
            ph=sha(pix.samples);name=ph[:20]+'.png'
            if ph not in unique:
                pix.save(visual/name);unique[ph]={'file':str((visual/name).relative_to(ROOT)),'coverage':[]}
            unique[ph]['coverage'].append({'familyId':rendered['familyId'],'fixture':a['variant'],'page':n+1})
            result['pages'].append({'page':n+1,'pixelSha256':ph,'pngSha256':sha((visual/name).read_bytes()),'png':str((visual/name).relative_to(ROOT))})
        assert np.array_equal(arrays[3],basearr[3]),'official instructions changed'
        widget_evidence=[]
        for row in census:
            for w in row['widgets']:
                idx=w['page']-1;rect=w['rect'];h=d[idx].rect.height
                r=fitz.Rect(rect['x'],h-rect['y']-rect['height'],rect['x']+rect['width'],h-rect['y'])
                if row['disposition']=='PROTECTED_FIELD':
                    # Rounded outward bounds include the entire original control.
                    x0,y0=max(0,int(r.x0*1.5)),max(0,int(r.y0*1.5));x1,y1=int(r.x1*1.5+1),int(r.y1*1.5+1)
                    delta=np.any(arrays[idx][y0:y1,x0:x1]!=basearr[idx][y0:y1,x0:x1],axis=2)
                    ev={'field':row['name'],'page':idx+1,'changedPixels':int(delta.sum())}
                    result['protectedRegions'].append(ev)
                    if delta.any():errors.append({'fixture':a['variant'],'family':rendered['familyId'],'protectedRegionChanged':ev})
                if row['name'] in values and isinstance(values[row['name']],str):
                    actual=d[idx].get_textbox(r+(-2,-2,2,2))
                    normalize=lambda t:''.join(t.split())
                    expected=values[row['name']]
                    ok=normalize(expected) in normalize(actual)
                    ev={'field':row['name'],'page':idx+1,'expected':expected,'extractedWithinMeasuredWidget':actual,'matches':ok,'factId':f"{a['variant']}.MC227.{row['name']}"}
                    widget_evidence.append(ev)
                    if not ok:errors.append({'fixture':a['variant'],'family':rendered['familyId'],'textMismatch':ev})
        result['textWrites']=widget_evidence
        # Whole-byte text extraction, never an assumption from the finalizer log.
        sourcechar=sum(len(p.get_text()) for p in source)
        outputchar=sum(len(p.get_text()) for p in d)
        proof.append({'fixture':a['variant'],'file':a['file'],'sha256':result['sha256'],'valuesReportedByFinalizer':len(values),'addedGlyphsReadFromOutputBytes':outputchar-sourcechar,'refusedFieldsWithInk':[x['field']for x in result['protectedRegions'] if x['changedPixels']],'officialInstructionPixelsUnchanged':True})
        documents.append({'formNumber':'MC227','fixture':a['variant'],'actualWrites':[dict(x,drawnText=x['extractedWithinMeasuredWidget']) for x in widget_evidence]})
        all_results.append(result)
    (directory/'reports/actual-writes.json').write_text(json.dumps({'schemaVersion':'rcap-actual-writes-byte-proof/v1','derivedFromArtifactBytes':True,'method':'PyMuPDF text extraction in each original measured widget and full protected-region raster equality at 108dpi','documents':documents,'artifacts':proof},indent=2)+'\n')
(E/'byte-and-pixel-proof.json').write_text(json.dumps({'authorQA':True,'independentReview':False,'centralRaster':False,'artifacts':all_results,'errors':errors},indent=2)+'\n')
(E/'visual-index.json').write_text(json.dumps({'uniquePages':list(unique.values()),'count':len(unique),'outputPageCount':sum(len(r['pages'])for r in all_results),'errors':errors},indent=2)+'\n')
print(json.dumps({'artifacts':len(all_results),'pages':sum(len(r['pages'])for r in all_results),'uniquePageRasters':len(unique),'protectedRegionTests':sum(len(r['protectedRegions'])for r in all_results),'textWidgetTests':sum(len(r['textWrites'])for r in all_results),'errors':errors},indent=2))
raise SystemExit(bool(errors))
