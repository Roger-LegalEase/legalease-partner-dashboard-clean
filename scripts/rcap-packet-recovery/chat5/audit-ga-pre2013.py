#!/usr/bin/env python3
"""Author audit of COMPLETE GCIC packets: actual glyphs, source pixels and guide.

This does not write approvals, family state, queues or source registries. Defect
controls call the same substantive audit without an expected whole-PDF hash, so
catching a mutated PDF is not merely noticing its new checksum.
"""
import argparse, collections, hashlib, json, pathlib, re, tempfile
import fitz
import numpy as np

FAMILY='ga-nonconv-pre2013-set'
OUT='data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill'
SOURCE='reference/chat-parallel-2026-09-07/chat5/GCIC-pre2013-restriction.pdf'
SOURCE_SHA='5fe841de263070f192ddfb0e322e41b2c2a97e8d07e7e643e98fdf780aefa1ab'
def sha(b):return hashlib.sha256(b).hexdigest()
def norm(t):return re.sub(r'\s+','',t)
def pix(p):
 a=p.get_pixmap(matrix=fitz.Matrix(2,2),colorspace=fitz.csGRAY,alpha=False)
 return np.frombuffer(a.samples,dtype=np.uint8).reshape(a.height,a.width)
def box(w):
 b=w['writeBox'];return fitz.Rect(b['x']-.6,792-b['y']-b['height']-.6,b['x']+b['width']+.6,792-b['y']+3.5)
def crop(a,r):
 x0,y0,x1,y1=[max(0,round(v*2)) for v in r];return a[y0:y1,x0:x1]
def chars(p):
 return [{'c':chr(c[0]),'origin':c[2],'bbox':fitz.Rect(c[3]),'size':s['size'],'type':s['type']} for s in p.get_texttrace() if s['font']=='Helvetica' for c in s['chars']]
def audit(pdf_path,report,source_doc,source_pixels):
 d=fitz.open(pdf_path);errors=[];checks=[];measure=[]
 if len(d)!=report['output']['pageCount']:errors.append('complete page count mismatch')
 if len(d)<4:return {'passed':False,'errors':errors+['official source pages missing']}
 for i in [0,2,3]:
  good=d[i].rect==source_doc[i].rect and np.array_equal(pix(d[i]),source_pixels[i])
  checks.append({'page':i+1,'region':'entire unchanged official page','pixelIdentical':good})
  if not good:errors.append('source/official-owned page changed: '+str(i+1))
 page=d[1];ink=chars(page);allowed=[box(w) for w in report['writes']];p=pix(page);s=source_pixels[1]
 for w in report['writes']:
  b=box(w);selected=[c for c in ink if b.contains(fitz.Point(c['origin']))]
  actual=''.join(c['c'] for c in selected)
  exact=actual==w['value'];a=crop(p,b);z=crop(s,b);added=int(((a<140)&(z>200)).sum()) if a.shape==z.shape else -1
  measure.append({'fieldId':w['fieldId'],'factId':w['factId'],'page':2,'expected':w['value'],'drawnText':actual,'matchesExpected':exact,'addedDarkPixels':added})
  if not exact:errors.append('wrong/missing glyphs: '+w['fieldId'])
  if added<5:errors.append('invisible/covered write: '+w['fieldId'])
  if any(c['type']==3 for c in selected):errors.append('invisible text rendering mode: '+w['fieldId'])
 outside=[c for c in ink if c['c'].strip() and not any(b.contains(c['bbox']) for b in allowed)]
 if outside:errors.append('new glyphs outside measured write boxes: '+str(len(outside)))
 # All source marks outside the explicit participant write boxes must survive.
 mask=np.ones(s.shape,dtype=bool)
 for b in allowed:
  x0,y0,x1,y1=[max(0,round(v*2)) for v in b];mask[y0:y1,x0:x1]=False
 changedOutside=int(((p!=s)&mask).sum()) if p.shape==s.shape else -1
 if changedOutside:errors.append('page 2 changed outside participant boxes: '+str(changedOutside))
 for label,r in [('GBI Use Only',[400,150,540,208]),('Social Security Number',[183,272,540,288]),('signature and execution date',[70,608,542,641])]:
  same=np.array_equal(crop(p,r),crop(s,r));checks.append({'page':2,'region':label,'pixelIdentical':same})
  if not same:errors.append('protected/private blank changed: '+label)
 for i,page in enumerate(d):
  if page.rect!=fitz.Rect(0,0,612,792):errors.append('wrong page size '+str(i+1))
  if list(page.widgets() or []):errors.append('live widgets '+str(i+1))
  if list(page.annots() or []):errors.append('unreviewed annotation '+str(i+1))
  if i>=4:
   for block in page.get_text('dict')['blocks']:
    for line in block.get('lines',[]):
     for span in line['spans']:
      r=fitz.Rect(span['bbox'])
      if not (page.rect+(-.2,-.2,.2,.2)).contains(r):errors.append('guide text outside page '+str(i+1))
      if span['size']<7.4:errors.append('unreadably small guide text '+str(i+1))
 for i,g in enumerate(report['guide'],start=4):
  if i>=len(d):errors.append('guide page absent '+g['title']);continue
  got=norm(d[i].get_text())
  for text in [g['title'],*[s for pair in g['sections'] for s in pair]]:
   if norm(text) not in got:errors.append('guide content absent/changed: '+g['title']+': '+text[:45])
 return {'fixture':report['fixture'],'sha256':sha(pathlib.Path(pdf_path).read_bytes()),'pages':len(d),'passed':not errors,'errors':errors,'actualWrites':measure,'actualNewNonspaceGlyphs':sum(bool(x['c'].strip()) for x in ink),'glyphsOutsideWriteBoxes':len(outside),'changedPixelsOutsideWriteBoxes':changedOutside,'protectedSourcePixelChecks':checks}
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--root',default='.');parser.add_argument('--evidence',required=True);args=parser.parse_args()
 root=pathlib.Path(args.root).resolve();dest=pathlib.Path(args.evidence).resolve();dest.mkdir(parents=True,exist_ok=True);(dest/'pages').mkdir(exist_ok=True)
 raw=(root/SOURCE).read_bytes();assert sha(raw)==SOURCE_SHA
 src=fitz.open(stream=raw,filetype='pdf');source_pixels=[pix(x) for x in src]
 index=json.loads((root/OUT/'reports/rendered-artifacts.json').read_text())['artifacts']
 complete=[];pages=[];seen={}
 for item in index:
  p=root/OUT/item['path'];report=json.loads((root/OUT/'reports'/f"{item['fixture']}.json").read_text());assert sha(p.read_bytes())==item['sha256']
  result=audit(p,report,src,source_pixels);complete.append(result)
  doc=fitz.open(p)
  for n,page in enumerate(doc,1):
   data=page.get_pixmap(matrix=fitz.Matrix(1.5,1.5),alpha=False).tobytes('png');h=sha(data);name=f"{item['fixture']}-p{n:02d}.png"
   is_new=h not in seen
   if is_new:(dest/'pages'/name).write_bytes(data);seen[h]=name
   pages.append({'fixture':item['fixture'],'page':n,'sha256':h,'image':'pages/'+seen[h],'exactPixelAlias':not is_new,'visuallyInspected':False})
 controls=[];canon=root/OUT/'fixtures/canonical.pdf';report=json.loads((root/OUT/'reports/canonical.json').read_text())
 def corrupt(name,fn):
  with tempfile.TemporaryDirectory() as tmp:
   d=fitz.open(canon);fn(d);out=pathlib.Path(tmp)/'changed.pdf';d.save(out,garbage=4,deflate=True);d.close();r=audit(out,report,src,source_pixels)
   controls.append({'name':name,'caught':not r['passed'],'errors':r['errors'],'wholePdfChecksumNotUsedAsDefectTest':True})
 corrupt('fabricated applicant signature',lambda d:d[1].insert_text((145,630),'CONTROL SIGNATURE',fontsize=9))
 corrupt('fabricated signing date',lambda d:d[1].insert_text((425,630),'09/07/2026',fontsize=9))
 corrupt('private SSN field injection',lambda d:d[1].insert_text((205,280),'CONTROL ONLY',fontsize=9))
 corrupt('payment-use-only mark',lambda d:d[1].insert_text((480,177),'X',fontsize=9))
 corrupt('agency repeated arrest fact',lambda d:d[2].insert_text((190,260),'06/15/2010',fontsize=9))
 corrupt('prosecutor approval mark',lambda d:d[3].insert_text((80,252),'X',fontsize=10))
 corrupt('missing complete page',lambda d:d.delete_page(6))
 corrupt('swapped agency and prosecutor pages',lambda d:d.select([0,1,3,2,4,5,6]))
 corrupt('stray off-page glyph',lambda d:d[1].insert_text((600,500),'OUTSIDE',fontsize=10))
 def cover_name(d):d[1].draw_rect(fitz.Rect(108.5,219,537,234),color=None,fill=(1,1,1),overlay=True)
 corrupt('visible name concealed with white rectangle',cover_name)
 def wrong_fee(d):
  r=d[6].search_for('$25')[0];d[6].add_redact_annot(r,fill=(1,1,1));d[6].apply_redactions();d[6].insert_text((r.x0,r.y1-2),'$50',fontsize=10.4)
 corrupt('wrong GCIC fee in complete guide',wrong_fee)
 def wrong_title(d):
  r=d[4].search_for('Before you submit')[0];d[4].add_redact_annot(r,fill=(1,1,1));d[4].apply_redactions();d[4].insert_text((r.x0,r.y1-3),'APPROVED FOR FILING',fontsize=13)
 corrupt('guide falsely labeled approved',wrong_title)
 summary={'schemaVersion':'chat5-ga-complete-pdf-author-audit/v1','familyId':FAMILY,'authorQaOnly':True,'sourceSha256':SOURCE_SHA,'completePdfs':len(complete),'completePages':len(pages),'distinctPageImages':len(seen),'exactPageAliases':len(pages)-len(seen),'actualTextWrites':sum(len(x['actualWrites']) for x in complete),'protectedPixelChecks':sum(len(x['protectedSourcePixelChecks']) for x in complete),'completeOutputAuditPass':all(x['passed'] for x in complete),'defectControlsCaught':sum(x['caught'] for x in controls),'defectControls':controls,'outputs':complete,'visualInspectionPending':True,'independentReview':'PENDING','centralRaster':'PENDING'}
 (dest/'complete-pdf-audit.json').write_text(json.dumps(summary,indent=2)+'\n');(dest/'page-inventory.json').write_text(json.dumps(pages,indent=2)+'\n')
 print(json.dumps({k:v for k,v in summary.items() if k not in ['outputs','defectControls']},indent=2))
 errors=[(x['fixture'],x['errors']) for x in complete if not x['passed']]
 if errors:print(json.dumps(errors,indent=2))
 assert summary['completeOutputAuditPass'];assert summary['defectControlsCaught']==len(controls)
if __name__=='__main__':main()
