#!/usr/bin/env python3
"""Read-only Form 1 source/final-byte measurements. No rendering or PDF rewriting."""
from pathlib import Path
import json, hashlib, subprocess, re
import fitz
import numpy as np
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'data/rcap-all50/overlays/census-v1/ia/ia-901c2-set--official-pdf-fill'
SRC=ROOT/'reference/chat-parallel-2026-09-07/chat8/ia-rule-2-86-form-1-2024-08.pdf'
sha=lambda b:hashlib.sha256(b).hexdigest()
def rect(w, inset=0):
 r=w['rect'];return fitz.Rect(r['x']+inset,792-r['y']-r['height']+inset,r['x']+r['width']-inset,792-r['y']-inset)
def chars(page):
 return [c for b in page.get_text('rawdict')['blocks'] if 'lines' in b for l in b['lines'] for s in l['spans'] for c in s['chars']]
def key(c):return(c['c'],*(round(v,2) for v in c['origin']))
def delta(source,page,w):
 a=source.get_pixmap(matrix=fitz.Matrix(3,3),clip=rect(w,1),colorspace=fitz.csGRAY,alpha=False,annots=False)
 b=page.get_pixmap(matrix=fitz.Matrix(3,3),clip=rect(w,1),colorspace=fitz.csGRAY,alpha=False,annots=False)
 aa=np.frombuffer(a.samples,np.uint8).astype(int);bb=np.frombuffer(b.samples,np.uint8).astype(int)
 assert aa.shape==bb.shape
 return int(np.count_nonzero((bb<100)&(aa-bb>50)))
source=fitz.open(SRC); results=[]
for record in json.loads((OUT/'reports/rendered-artifacts.json').read_text())['fixtures']:
 fixture=record['fixture']; pdf=OUT/record['path']; raw=pdf.read_bytes();doc=fitz.open(pdf)
 assert sha(raw)==record['sha256'] and len(doc)==record['pageCount']
 report=json.loads((OUT/f'reports/{fixture}.json').read_text())
 facts=json.loads((OUT/f'fixtures/{fixture}.json').read_text())
 adds=[]
 for i in range(3):
  old={key(c) for c in chars(source[i])}; adds.append([c for c in chars(doc[i]) if key(c) not in old and c['c'].strip()])
 measurements=[];outside=0;allboxes=[(w['page'],rect(w)) for r in report['actualWrites'] for w in r['widgets']]
 for i,pagechars in enumerate(adds):
  for c in pagechars:
   x,y=c['origin'];box=fitz.Rect(c['bbox'])
   # Baseline and horizontal glyph extent: ascenders can exceed official widgets.
   if not any(pg==i+1 and r.x0-0.75<=box.x0 and box.x1<=r.x1+0.75 and r.y0-0.75<=y<=r.y1+0.75 for pg,r in allboxes):outside+=1
 for row in report['actualWrites']:
  if row['type']=='PDFTextField':
   texts=[];count=0
   for w in row['widgets']:
    r=rect(w); hit=[c for c in adds[w['page']-1] if r.x0-0.75<=c['origin'][0]<=r.x1+0.75 and r.y0-0.75<=c['origin'][1]<=r.y1+0.75]
    got=''.join(c['c'] for c in hit);expect=re.sub(r'\s','',str(row['value']))
    assert expect==got,(fixture,row['fieldId'],expect,got)
    texts.append(got);count+=len(hit)
   measurements.append({'fieldId':row['fieldId'],'expected':row['value'],'drawnText':row['value'],'glyphsMeasured':count,'allWidgetsMatched':True})
  else:
   pixels=[delta(source[w['page']-1],doc[w['page']-1],w) for w in row['widgets']]
   selected=0 if row['type']=='PDFCheckBox' or row['value']=='A' else 1
   assert pixels[selected]>0,(fixture,row['fieldId'],pixels)
   if len(pixels)>1:assert pixels[1-selected]==0,(fixture,row['fieldId'],pixels)
   measurements.append({'fieldId':row['fieldId'],'expected':row['value'],'selectedWidget':selected,'addedDarkPixelsByWidget':pixels,'dpi':216})
 blanks=[]
 for row in report['blanks']:
  if row['type']=='PDFButton':continue
  pixels=[delta(source[w['page']-1],doc[w['page']-1],w) for w in row['widgets']]
  # Source field borders/labels may survive flattening; retained baseline method
  # compares interior darkening, not total image difference.
  if any(pixels):raise AssertionError((fixture,row['fieldId'],pixels))
  blanks.append({'fieldId':row['fieldId'],'disposition':row['disposition'],'addedDarkPixelsByWidget':pixels,'dpi':216})
 assert not any(list(p.widgets() or []) for p in doc)
 text=subprocess.run(['pdftotext',str(pdf),'-'],capture_output=True,text=True,check=True).stdout
 assert facts['name'] in text and facts['caseNumber'] in text
 if facts['requestsWaiverOf180Days']:assert ' '.join(facts['goodCauseNarrative'].split()) in ' '.join(text.split())
 comp=[]
 for c in record['components']:
  p=OUT/f'components/{fixture}/{c["id"]}.pdf';b=p.read_bytes();d=fitz.open(p)
  assert sha(b)==c['sha256'] and len(d)==c['pages'];comp.append({'id':c['id'],'sha256':sha(b),'pages':len(d),'bytes':len(b)})
 results.append({'fixture':fixture,'sha256':sha(raw),'pages':len(doc),'bytes':len(raw),'writes':measurements,'blankInk':blanks,'addedGlyphsReadFromOutputBytes':sum(len(a) for a in adds),'nonWhitespaceGlyphsOutsideMeasuredWriteBoxes':outside,'components':comp,'popplerTextImporterExit':0,'guideText':'\n'.join(p.get_text() for p in doc[-record['components'][-1]['pages']:])})
assert all(x['nonWhitespaceGlyphsOutsideMeasuredWriteBoxes']==0 for x in results)
print(json.dumps({'schemaVersion':'chat8-form1-byte-measurements/v1','sourceSha256':sha(SRC.read_bytes()),'pdfsRewritten':False,'results':results},indent=2))
