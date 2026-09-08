#!/usr/bin/env python3
"""Measure complete Maryland output bytes. Author QA; no admission mutation.

Reads actual glyph traces and 144-dpi pixels, not a field-map assertion alone.
Run: python scripts/rcap-packet-recovery/chat5/audit-md-favorable.py --root . --evidence <dir>
"""
import argparse, hashlib, json, pathlib, re, tempfile
import fitz
import numpy as np

FAMILY='md_10105_favorable-set'
OUT='data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill'
SOURCE='reference/chat-parallel-2026-09-07/chat5/CC-DC-CR-072A.pdf'

def digest(b): return hashlib.sha256(b).hexdigest()
def norm(s): return re.sub(r'\s+','',s)
def rect(r, height=792): return fitz.Rect(r['x'],height-r['y']-r['height'],r['x']+r['width'],height-r['y'])
def pixels(page):
    p=page.get_pixmap(matrix=fitz.Matrix(2,2),colorspace=fitz.csGRAY,alpha=False)
    return np.frombuffer(p.samples,dtype=np.uint8).reshape(p.height,p.width)
def trace_chars(page):
    # The held form's static lettering has embedded Times/Arial/MS Gothic fonts.
    # Only new, actually emitted field glyphs use standard Helvetica on page 1.
    return [{'c':chr(c[0]),'origin':c[2],'bbox':fitz.Rect(c[3])} for s in page.get_texttrace() if s['font']=='Helvetica' for c in s['chars']]

def examine(root, pdf_path, report, source_doc):
    d=fitz.open(pdf_path); errors=[]; first=d[0]; chars=trace_chars(first); writes=[]
    if len(d)!=report['output']['pageCount']:errors.append('wrong complete page count')
    text_writes=[w for w in report['writes'] if w['kind']=='held_text']
    allowed=[rect(wi['rect']) for w in text_writes for wi in w['widgets']]
    for w in text_writes:
        rs=[rect(z['rect']) for z in w['widgets']]
        selected=[c for c in chars if any(r.contains(fitz.Point(c['bbox'].tl.x+(c['bbox'].width/2),c['bbox'].tl.y+(c['bbox'].height/2))) for r in rs)]
        drawn=''.join(c['c'] for c in selected)
        ok=norm(drawn)==norm(w['value'])
        if not ok:errors.append('missing/mismatched actual glyphs: '+w['field']+' actual='+repr(drawn))
        writes.append({'field':w['field'],'factId':w['factId'],'expected':w['value'],'drawnText':drawn,'foundInOutputBytes':ok})
    outside=[c for c in chars if c['c'].strip() and not any((r+(-.6,-.6,.6,.6)).contains(c['bbox']) for r in allowed)]
    if outside:errors.append('glyphs outside source write rectangles: '+str(len(outside)))
    for i,p in enumerate(d):
        if list(p.widgets() or []): errors.append('interactive widget remains on page '+str(i+1))
        if list(p.annots() or []): errors.append('unreviewed annotation on page '+str(i+1))
        if i:
            for b in p.get_text('dict')['blocks']:
                for l in b.get('lines',[]):
                    for s in l['spans']:
                        if not (p.rect+(-.5,-.5,.5,.5)).contains(fitz.Rect(s['bbox'])):errors.append('instruction text outside page '+str(i+1))
                        if s['size'] < 8-.01:errors.append('unreadable instruction glyph')
    src=pixels(source_doc[0]); out=pixels(first); census=json.loads((root/OUT/'official-field-census.json').read_text())
    selected={w['field'] for w in report['writes'] if w['kind']=='explicit_selection'}
    checks=[]; protected=[]
    for f in census:
        for widget in f['widgets']:
            r=rect(widget['rect']); x0,y0,x1,y1=[round(v*2) for v in r]; a=src[y0:y1,x0:x1]; b=out[y0:y1,x0:x1]
            # The actual mark adds black pixels, independent of field-map claims.
            added=int(((b<100)&(a>180)).sum())
            if f['type']=='PDFCheckBox':
                ok=(added>=8) if f['name'] in selected else (added==0)
                if not ok:errors.append('wrong visible checkbox: '+f['name']+': '+str(added))
                checks.append({'field':f['name'],'selected':f['name'] in selected,'actualAddedDarkPixels':added,'pass':ok})
            if re.search(r'Signature|Signed|Attorney',f['name']):
                if added:errors.append('protected execution/attorney field has added ink: '+f['name'])
                protected.append({'field':f['name'],'addedDarkPixels':added})
    return {'fixture':report['fixture'],'pdf':str(pdf_path.relative_to(root)) if pdf_path.is_relative_to(root) else 'defect-control.pdf','sha256':digest(pdf_path.read_bytes()),'pageCount':len(d),'actualWrites':writes,'addedGlyphCount':len([c for c in chars if c['c'].strip()]),'glyphsOutsideWriteRectangles':len(outside),'visibleCheckboxes':checks,'protectedExecutionAndAttorneyFields':protected,'errors':errors,'passed':not errors}

def main():
    a=argparse.ArgumentParser();a.add_argument('--root',default='.');a.add_argument('--evidence',required=True);o=a.parse_args()
    root=pathlib.Path(o.root).resolve(); dest=pathlib.Path(o.evidence); dest.mkdir(parents=True,exist_ok=True)
    src=fitz.open(root/SOURCE)
    index=json.loads((root/OUT/'reports/rendered-artifacts.json').read_text())
    measured=[]; pages=[]; seen={}; rasterdir=dest/'pages';rasterdir.mkdir(exist_ok=True)
    for rec in index['pdfs']:
        p=root/rec['file']; report=json.loads((root/OUT/'reports'/f"{rec['fixture']}.json").read_text())
        assert digest(p.read_bytes())==rec['sha256'],'report hash mismatch'
        measured.append(examine(root,p,report,src))
        d=fitz.open(p)
        for i,page in enumerate(d):
            png=page.get_pixmap(matrix=fitz.Matrix(1.5,1.5),alpha=False).tobytes('png');h=digest(png)
            filename=f"{rec['fixture'].replace('/','--')}-p{i+1:02d}.png"
            if h not in seen:(rasterdir/filename).write_bytes(png);seen[h]=filename
            pages.append({'fixture':rec['fixture'],'packetPage':i+1,'pngSha256':h,'pixelEquivalentRepresentative':seen[h]})
    # Defects are injected into COMPLETE copies, then the same audit must fail.
    neg=[]; cp=root/OUT/'fixtures/canonical.pdf'; cr=json.loads((root/OUT/'reports/canonical.json').read_text())
    with tempfile.TemporaryDirectory(prefix='chat5-md-defects-') as td:
        for name in ['wrong_name','signature_ink','unselected_box_mark','missing_page','outside_glyph']:
            d=fitz.open(cp)
            if name=='wrong_name':d[0].add_redact_annot(fitz.Rect(334,85,486,97),fill=(1,1,1));d[0].apply_redactions()
            elif name=='signature_ink':d[0].insert_text((325,670),'SIGNED',fontsize=10)
            elif name=='unselected_box_mark':d[0].draw_line((38.6,291.5),(43.4,296.3),color=(0,0,0),width=1.5)
            elif name=='missing_page':d.delete_page(-1)
            elif name=='outside_glyph':d[0].insert_text((20,15),'CLIPPED TEST',fontsize=10)
            target=pathlib.Path(td)/(name+'.pdf');d.save(target)
            r=examine(root,target,cr,src);neg.append({'name':name,'detected':bool(r['errors']),'errors':r['errors']})
    result={'familyId':FAMILY,'kind':'AUTHOR_BYTE_AND_RASTER_QA_NOT_INDEPENDENT_REVIEW','sourceSha256':digest((root/SOURCE).read_bytes()),'pdfCount':len(measured),'pageCount':len(pages),'distinctRasterImages':len(seen),'measurements':measured,'completeOutputDefectControls':neg,'passed':all(m['passed'] for m in measured) and all(n['detected'] for n in neg)}
    (dest/'byte-audit.json').write_text(json.dumps(result,indent=2)+'\n');(dest/'page-inventory.json').write_text(json.dumps(pages,indent=2)+'\n')
    print(json.dumps({'passed':result['passed'],'pdfs':len(measured),'pages':len(pages),'distinctImages':len(seen),'errors':[{m['fixture']:m['errors']} for m in measured if m['errors']],'defectControls':neg},indent=2))
    raise SystemExit(0 if result['passed'] else 1)
if __name__=='__main__':main()
