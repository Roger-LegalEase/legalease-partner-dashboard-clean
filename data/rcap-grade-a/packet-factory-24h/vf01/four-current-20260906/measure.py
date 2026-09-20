import json, pathlib, xml.etree.ElementTree as ET, re
from PIL import Image, ImageChops, ImageDraw
root=pathlib.Path('/tmp/vf01-four'); metadata=json.loads((root/'metadata.json').read_text())
def words(p):
 tree=ET.parse(p); out=[]
 for pi,page in enumerate(tree.findall('.//{*}page'),1):
  for w in page.findall('.//{*}word'):
   out.append(dict(page=pi,text=w.text or '',x=float(w.attrib['xMin']),y=float(w.attrib['yMin']),x2=float(w.attrib['xMax']),y2=float(w.attrib['yMax']),height=float(page.attrib['height'])))
 return out
def flat(s):return re.sub(r'[^a-zA-Z0-9]','',s).lower()
def within(w,r,p):return w['page']==p and r['x']-1<=(w['x']+w['x2'])/2<=r['x']+r['width']+1 and w['height']-r['y']-r['height']-1<=(w['y']+w['y2'])/2<=w['height']-r['y']+1
results=[]; pixels=[]
for f in metadata:
 d=pathlib.Path(f['directory']); aw=json.loads((d/'reports/actual-writes.json').read_text()); fm=json.loads((d/'production-field-map.json').read_text())
 for a in f['fixtures']:
  current=words(pathlib.Path(a['outDir'])/'bbox.html'); reports=[]
  if f['familyId'].startswith('pa_'):
   ar=next(x for x in aw['artifacts'] if pathlib.Path(x['file']).name==a['name']);mp=next(x for x in fm['documents'] if x['documentId']==ar['documentId']); off=0
   fields={x['field']:x for x in mp.get('fields',[])}
   for wr in ar['proof'].get('writtenProof',[]):
    field=fields.get(wr['field'],{}); reports.append(dict(field=wr['field'],expected=str(wr['expectedValue']),rects=field.get('widgets',[])))
   docid=ar['documentId']; sr=root/'source-images'/docid
  else:
   for ar in aw['documents']:
    if ar['fixture']!=a['role']: continue
    off=3 if ar['formNumber']=='JDF-478' else 0
    for wr in ar['actualWrites']:reports.append(dict(field=ar['formNumber']+'/'+wr['field'],expected=str(wr['expected']),rects=[dict(page=wr['page']+off,rect=wr['rect'])]))
   docid='CC-1473' if f['familyId'].startswith('va_') else None; sr=root/'source-images'/str(docid)
  checks=[]
  for r in reports:
   hit=[]
   for wr in r['rects']:
    hit+= [w for w in current if within(w,wr['rect'],wr['page'])]
   hit.sort(key=lambda w:(w['page'],round(w['y']/3),w['x']))
   actual=' '.join(w['text'] for w in hit) if r['rects'] else ' '.join(w['text'] for w in current);checks.append(dict(field=r['field'],expected=r['expected'],observed=actual,expectedPresent=flat(r['expected']) in flat(actual),measurementScope='widget_rects' if r['rects'] else 'composed_page_text_no_declared_widget',rects=r['rects']))
  results.append(dict(familyId=f['familyId'],fixture=a['name'],checks=checks,checked=len(checks),missing=[r for r in checks if not r['expectedPresent']],offPageWords=[w for w in current if w['x']<-.5 or w['y']<-.5 or w['x2']>612.5 or w['y2']>792.5]))
  if sr.exists():
   for p in sorted(sr.glob('page-*.png')):
    pg=int(p.stem.split('-')[-1]);op=pathlib.Path(a['outDir'])/p.name
    si=Image.open(p).convert('RGB');oi=Image.open(op).convert('RGB'); diff=ImageChops.difference(si,oi).convert('L').point(lambda v:255 if v>24 else 0)
    for r in reports:
     for wr in r['rects']:
      if wr['page']!=pg:continue
      rect=wr['rect'];s=300/72; box=((rect['x']-2)*s,(792-rect['y']-rect['height']-2)*s,(rect['x']+rect['width']+2)*s,(792-rect['y']+2)*s);ImageDraw.Draw(diff).rectangle(box,fill=0)
    if docid=='CC-1473':
     for ar in aw['documents']:
      if ar['fixture']!=a['role']:continue
      for mark in ar.get('routeSelectionMarks',[]):
       if mark['page']==pg:
        b=mark['box'];s=300/72;ImageDraw.Draw(diff).rectangle(((b['x0']-2)*s,(792-b['y1']-2)*s,(b['x1']+2)*s,(792-b['y0']+2)*s),fill=0)
    n=diff.histogram()[255]; pixels.append(dict(familyId=f['familyId'],fixture=a['name'],page=pg,sourceDocumentId=docid,pixelsDifferentOutsideReportedWritesAndRouteMarks=n,boundingBox=diff.getbbox()))
(root/'readback-measurements.json').write_text(json.dumps(results,indent=2)+'\n');(root/'source-pixel-measurements.json').write_text(json.dumps(pixels,indent=2)+'\n')
print(json.dumps({'declaredTextWritesChecked':sum(r['checked'] for r in results),'unmatched':[(r['fixture'],[x['field'] for x in r['missing']]) for r in results if r['missing']], 'pagesPixelCompared':len(pixels),'nonzeroPixelComparisons':[r for r in pixels if r['pixelsDifferentOutsideReportedWritesAndRouteMarks']]},indent=2))
