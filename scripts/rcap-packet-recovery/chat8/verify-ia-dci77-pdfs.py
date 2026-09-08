#!/usr/bin/env python3
"""DCI-only full-PDF byte/text/selection/blank evidence. Does not modify candidates."""
import argparse, hashlib, json, subprocess, copy
from pathlib import Path
from collections import Counter
import fitz
import numpy as np

SOURCE='reference/chat-parallel-2026-09-07/chat8/ia-dci76-77-2021-09-22.pdf'
SOURCE_SHA='321062c91b3d9e2c8f255d62d20186352a2b5884e0ccd4310a18a3a073d7f516'
OUTPUT='data/rcap-all50/overlays/census-v1/ia/ia-dci77-set--official-pdf-fill'
AGENCY={'DCI_USE_DATE','DCI_USE_Criminal_Record','DCI_USE_DCI#','DCI_USE_Processed_By'}
def sha(b): return hashlib.sha256(b).hexdigest()
def rect(w):
 r=w['rect']; return fitz.Rect(r['x'],792-r['y']-r['height'],r['x']+r['width'],792-r['y'])
def chars(p): return [c for b in p.get_text('rawdict')['blocks'] for l in b.get('lines',[]) for s in l['spans'] for c in s['chars'] if c['c'].strip()]
def key(c): return (c['c'],*(round(v,2) for v in c['origin']))
def pixel(p,r):
 z=p.get_pixmap(matrix=fitz.Matrix(3,3),colorspace=fitz.csGRAY,clip=r,alpha=False,annots=True)
 return np.frombuffer(z.samples,np.uint8).astype(int)
def in_box(c,b): return b.x0-.75<=c['origin'][0]<=b.x1+.75 and b.y0-.75<=c['origin'][1]<=b.y1+.75

def verify(raw,report,facts,src):
 d=fitz.open(stream=raw,filetype='pdf'); components=report['components'];
 assert len(d)==sum(c['pages'] for c in components),'missing complete component page'
 assert all(not list(p.widgets() or []) for p in d),'interactive fields survive'
 text=' '.join(' '.join(p.get_text() for p in d).split())
 assert 'Iowa DCI record request: next steps' in text,'guide missing'
 assert 'DO NOT SUBMIT THESE EXAMPLES.' in text,'synthetic disclaimer missing'
 assert 'not an expungement petition' in text,'wrong relief classification'
 assert report['assessment']['submissionReady'] is False,'false submission approval'
 assert report['assessment']['agencyReportIncluded'] is False,'fabricated report presence'
 assert report['assessment']['pendingActions'],'execution requirements hidden'
 portal=facts['channel']=='online_portal'
 if portal:
  assert len(components)==1 and components[0]['id']=='participant-instructions','PDF request/billing masquerading as portal output'
  assert 'separate request AND billing submission for EACH' in text,'wrong online billing scope'
  assert not report['actualWrites'] and not report['blanks'] and not report['sourceFields'],'portal claim invents filled forms'
  assert 'has not filled either online form' in text,'portal actual-entry warning missing'
  assert 'Known source-required identity/payment-reference fields are entered' not in text,'false portal prefill claim'
  assert 'that exact allowed value is entered on the printed form' not in text,'false portal gender entry claim'
 else:
  assert sum(c['id']=='billing' for c in components)==1,'missing/duplicate batch bill'
  assert sum(c['id'].startswith('request-') for c in components)==len(facts['names']),'one requested surname missing'
  assert any(c['id']=='official-instructions' for c in components),'official instructions missing'
 if facts['gender'] is None:
  assert 'NOT submission-ready' in text,'missing gender conflict warning'
  assert report['assessment']['genderTreatment']=='UNRESOLVED_UNKNOWN_NOT_SUBMISSION_READY'
  assert not any(x['fieldId']=='Gender' for x in report['actualWrites']),'invented gender write'
 if facts['purpose']=='901c3_preparation':
  assert 'within 30 days' in text and 'not this request date' in text,'wrong downstream clock'
 assert 'no releasable information' in text,'no-record misleadingly called clean'
 assert 'No fee was paid or waived' in text,'fictitious payment'
 result={'sha256':sha(raw),'pages':len(d),'textWrites':[],'selectionInteriors':[],'sourceRadioRings':[],'blankInteriors':[],'sourceBodyCharactersPreserved':0,'sourceActorAreas':[],'replacedSourceDefaults':[]}
 # Every source field is in exactly one write/blank disposition per component.
 fields=report['actualWrites']+report['blanks'];ids=[(r['documentId'],r['fieldId']) for r in fields]
 assert len(ids)==len(set(ids))==len(report['sourceFields']),'incomplete or duplicate source-area census'
 for comp in components:
  did=comp['id']
  for offset,source_page in enumerate(comp.get('sourcePages',[])):
   outpage=comp['firstPacketPage']-1+offset;p=d[outpage];sp=src[source_page-1]
   assert p.rect==sp.rect,'source page geometry changed'
   # The held AcroForm displays default 0 / $0.00 in its two computed billing fields.
   # These are replaced field appearances, not static issuer body text.
   defaults=[w.rect for w in (sp.widgets() or []) if source_page==1 and w.field_name in ('Number_Requests','Total_Due')]
   original_chars=chars(sp);replaced=[c for c in original_chars if any(in_box(c,b) for b in defaults)]
   if replaced:result['replacedSourceDefaults'].append({'component':did,'sourcePage':source_page,'oldAppearanceText':''.join(c['c'] for c in replaced),'fields':['Number_Requests','Total_Due']})
   source_chars=Counter(key(c) for c in original_chars if not any(in_box(c,b) for b in defaults));added=[]
   for c in chars(p):
    if source_chars[key(c)]: source_chars[key(c)]-=1;result['sourceBodyCharactersPreserved']+=1
    else: added.append(c)
   assert not any(source_chars.values()),('source text dropped/moved',did,source_page,[(k,v) for k,v in source_chars.items() if v][:8])
   known=[r for r in report['actualWrites'] if r['documentId']==did]
   blanks=[r for r in report['blanks'] if r['documentId']==did]
   allowed=[rect(w)+(-.8,-.8,.8,.8) for r in known if r['type'] in ('PDFTextField','PDFDropdown') for w in r['widgets'] if w['sourcePage']==source_page]
   for c in added:
    x=fitz.Rect(c['bbox']);assert any(b.x0<=x.x0 and x.x1<=b.x1 and b.y0<=c['origin'][1]<=b.y1 for b in allowed),('added glyph outside known box',did,c)
   for row in known:
    assert row['fieldId'] not in AGENCY|{'Signature2','Date_af_date','Results_Notorized'},'forbidden actual execution write'
    for w in row['widgets']:
     if w['sourcePage']!=source_page: continue
     box=rect(w)
     if row['type'] in ('PDFTextField','PDFDropdown'):
      actual=''.join(c['c'] for c in added if in_box(c,box));expected=''.join(str(row['value']).split());assert actual==expected,(did,row['fieldId'],actual,expected)
      if row.get('fit'): assert row['fit']['fontSize']>=8,'unreadable font floor'
      result['textWrites'].append({'component':did,'fieldId':row['fieldId'],'matched':True,'value':row['value'],'page':outpage+1,'glyphs':len(actual)})
     elif row['type']=='PDFRadioGroup':
      inside=box+(3,3,-3,-3);a=pixel(sp,inside);z=pixel(p,inside);assert a.shape==z.shape
      count=int(np.count_nonzero((z<90)&(a-z>50)));selected=w['selectionValue']==row['value']
      assert (count>0)==selected,(did,row['fieldId'],'wrong selected/unselected radio',w['selectionValue'],row['value'],count)
      ap=sp.get_pixmap(matrix=fitz.Matrix(3,3),colorspace=fitz.csGRAY,clip=box,alpha=False,annots=True);zp=p.get_pixmap(matrix=fitz.Matrix(3,3),colorspace=fitz.csGRAY,clip=box,alpha=False,annots=True)
      aa=np.frombuffer(ap.samples,np.uint8).astype(int).reshape(ap.height,ap.width);zz=np.frombuffer(zp.samples,np.uint8).astype(int).reshape(zp.height,zp.width);assert aa.shape==zz.shape
      ring=np.ones(aa.shape,dtype=bool);ring[9:-9,9:-9]=False;changed=int(np.count_nonzero((np.abs(aa-zz)>50)&ring));assert changed==0,(did,row['fieldId'],'issuer radio circle changed',w['selectionValue'],changed)
      result['sourceRadioRings'].append({'component':did,'fieldId':row['fieldId'],'option':w['selectionValue'],'sourceRingChangedPixels':changed,'dpi':216})
      result['selectionInteriors'].append({'component':did,'fieldId':row['fieldId'],'option':w['selectionValue'],'selected':selected,'addedDarkPixels':count,'dpi':216})
   for row in blanks:
    if row['fieldId'] in AGENCY:
     proof=row.get('sourceActorEvidence');assert proof and proof['sourceSha256']==SOURCE_SHA and proof['sourceFieldId']==row['fieldId'] and proof['sourcePage']==2,'wrong source actor identity'
     assert proof['printedHeading']=='FOR DCI USE ONLY' and sp.search_for(proof['printedHeading']),'missing real actor heading'
     result['sourceActorAreas'].append({'fieldId':row['fieldId'],'component':did,'sourceSha256':SOURCE_SHA,'owner':'DCI','sourceHeadingFound':True})
    for w in row['widgets']:
     if w['sourcePage']!=source_page:continue
     box=rect(w)
     if row['fieldId'] in AGENCY: assert 554<box.y0 and box.y1<675,'actor field outside actual reserved block'
     a=pixel(sp,box+(1.5,1.5,-1.5,-1.5));z=pixel(p,box+(1.5,1.5,-1.5,-1.5));assert a.shape==z.shape
     count=int(np.count_nonzero((z<90)&(a-z>50)));assert count==0,(did,row['fieldId'],'unwritten blank has new ink',count)
     result['blankInteriors'].append({'component':did,'fieldId':row['fieldId'],'page':outpage+1,'addedDarkPixels':count,'dpi':216,'disposition':row['completenessDisposition']})
 for p in d:
  for block in p.get_text('dict')['blocks']:
   if 'lines' in block: assert (p.rect+(-.5,-.5,.5,.5)).contains(fitz.Rect(block['bbox'])),'text outside page'
 return result

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[3]);ap.add_argument('--evidence',type=Path,required=True);ap.add_argument('--measure-only',action='store_true');args=ap.parse_args()
 root=args.root;out=root/OUTPUT;e=args.evidence;e.mkdir(parents=True,exist_ok=True);(e/'pages').mkdir(exist_ok=True);(e/'poppler').mkdir(exist_ok=True)
 source=(root/SOURCE).read_bytes();assert sha(source)==SOURCE_SHA;src=fitz.open(stream=source,filetype='pdf');assert len(src)==3
 before={p.relative_to(out).as_posix():sha(p.read_bytes()) for p in out.rglob('*') if p.is_file()}
 rows=[];images=[];seen={};componentchecks=[]
 for entry in json.loads((out/'reports/rendered-artifacts.json').read_text())['packets']:
  fixture=entry['fixture'];packet=out/entry['relativePath'];raw=packet.read_bytes();assert sha(raw)==entry['sha256'],'manifest/PDF mismatch'
  report=json.loads((out/f'reports/{fixture}.json').read_text());facts=json.loads((out/f'fixtures/{fixture}.json').read_text());row=verify(raw,report,facts,src);row['fixture']=fixture;d=fitz.open(stream=raw,filetype='pdf')
  for c in report['components']:
   cp=out/f'components/{fixture}/{c["id"]}.pdf';cb=cp.read_bytes();assert sha(cb)==c['sha256'],'component checksum mismatch';cd=fitz.open(stream=cb,filetype='pdf');assert len(cd)==c['pages']
   for idx,p in enumerate(cd):
    one=p.get_pixmap(matrix=fitz.Matrix(1,1),alpha=False,annots=False).samples;two=d[c['firstPacketPage']-1+idx].get_pixmap(matrix=fitz.Matrix(1,1),alpha=False,annots=False).samples;assert one==two,'component page changed in assembly'
   componentchecks.append({'fixture':fixture,'id':c['id'],'pages':c['pages'],'sha256':sha(cb),'assembledPagesMatch':True})
  t=subprocess.run(['pdftotext','-layout',str(packet),'-'],capture_output=True,text=True);assert t.returncode==0,t.stderr
  assert facts['names'][0]['first'] in t.stdout and facts['names'][0]['last'] in t.stdout,'second text importer missed identity'
  row['popplerTextExit']=t.returncode
  if not args.measure_only:
   z=subprocess.run(['pdftoppm','-r','96','-png',str(packet),str(e/'poppler'/fixture)],capture_output=True,text=True);assert z.returncode==0,z.stderr;row['popplerRasterExit']=z.returncode
   for i,p in enumerate(d):
    data=p.get_pixmap(matrix=fitz.Matrix(1.75,1.75),alpha=False,annots=False).tobytes('png');h=sha(data);file=f'pages/{fixture}-{i+1:02}.png';(e/file).write_bytes(data)
    images.append({'fixture':fixture,'page':i+1,'path':file,'sha256':h,'identicalTo':seen.get(h)});seen.setdefault(h,file)
  rows.append(row)
 controls=[]
 if not args.measure_only:
  original=(out/'fixtures/canonical.pdf').read_bytes();report=json.loads((out/'reports/canonical.json').read_text());facts=json.loads((out/'fixtures/canonical.json').read_text())
  def reject(name,doc,r=None,f=None):
   data=doc.tobytes();
   try:verify(data,r or report,f or facts,src)
   except (AssertionError,ValueError,RuntimeError) as err:controls.append({'name':name,'rejected':True,'error':str(err),'wholePdfSha256':sha(data)})
   else:raise AssertionError('corrupted complete PDF accepted: '+name)
  def openone(): return fitz.open(stream=original,filetype='pdf')
  d=openone();d.delete_page(1);reject('missing requested surname page',d)
  d=openone();d.delete_page(2);reject('missing official instruction page',d)
  d=openone();d.delete_page(len(d)-1);reject('missing participant guide last page',d)
  d=openone();target=next(w for w in report['actualWrites'] if w['fieldId']=='Total_Due');d[0].add_redact_annot(rect(target['widgets'][0]),fill=(1,1,1));d[0].apply_redactions();reject('erase actual amount',d)
  d=openone();target=next(w for w in report['blanks'] if w['fieldId']=='Signature2');b=rect(target['widgets'][0]);d[1].insert_text((b.x0+2,b.y1-3),'FORGED',fontsize=9);reject('fabricated participant signature',d)
  d=openone();target=next(w for w in report['blanks'] if w['fieldId']=='DCI_USE_DATE');b=rect(target['widgets'][0]);d[1].insert_text((b.x0+2,b.y1-3),'2026-09-08',fontsize=9);reject('fabricated actual agency search date',d)
  d=openone();target=next(w for w in report['blanks'] if w['fieldId']=='DCI_USE_Criminal_Record');b=rect(target['widgets'][0]);d[1].draw_line((b.x0+4,b.y0+4),(b.x1-4,b.y1-4),width=1);reject('fabricated clean record checkbox',d)
  d=openone();target=next(w for w in report['actualWrites'] if w['fieldId']=='Results');b=rect(target['widgets'][1]);d[1].draw_line((b.x0+4,b.y0+4),(b.x1-4,b.y1-4),width=1);reject('double-selected return method',d)
  d=openone();d[1].insert_text((575,700),'EXTRA',fontsize=9);reject('unmapped stray glyphs',d)
  d=openone();target=next(w for w in report['actualWrites'] if w['fieldId']=='Results');b=rect(target['widgets'][1]);d[1].add_redact_annot(b,fill=(1,1,1));d[1].apply_redactions();reject('erase actual issuer radio circle',d)
  unknown=(out/'fixtures/unknown-gender.pdf').read_bytes();ur=json.loads((out/'reports/unknown-gender.json').read_text());uf=json.loads((out/'fixtures/unknown-gender.json').read_text());d=fitz.open(stream=unknown,filetype='pdf');target=next(w for w in ur['blanks'] if w['fieldId']=='Gender');b=rect(target['widgets'][0]);d[1].insert_text((b.x0+3,b.y1-4),'Other',fontsize=10);reject('invent unknown gender',d,ur,uf)
  d=openone();r=copy.deepcopy(report);r['assessment']['submissionReady']=True;reject('false submission-ready declaration',d,r)
  d=openone();r=copy.deepcopy(report);r['assessment']['agencyReportIncluded']=True;reject('false returned-report presence',d,r)
  pr=json.loads((out/'reports/portal-known-answer.json').read_text());pf=json.loads((out/'fixtures/portal-known-answer.json').read_text());pb=(out/'fixtures/portal-known-answer.pdf').read_bytes()
  for name,sentence in [('invent portal prefill','Known source-required identity/payment-reference fields are entered'),('invent portal gender entry','that exact allowed value is entered on the printed form')]:
   d=fitz.open(stream=pb,filetype='pdf');d[-1].insert_text((48,720),sentence,fontsize=8);reject(name,d,pr,pf)
 after={p.relative_to(out).as_posix():sha(p.read_bytes()) for p in out.rglob('*') if p.is_file()};assert before==after,'read-only verifier mutated candidate'
 result={'familyId':'ia-dci77-set','sourceSha256':SOURCE_SHA,'sourcePages':3,'fixtureCount':len(rows),'completePages':sum(r['pages'] for r in rows),'distinctImages':len(seen),'pageImages':images,'fixtures':rows,'components':componentchecks,'negativeControls':controls,'candidateFilesUnchanged':len(before),'authorQAOnly':True,'independentReview':'PENDING_CHAT10','centralRaster':'PENDING_OWNER'}
 (e/'pdf-verification.json').write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps({'fixtures':len(rows),'pages':result['completePages'],'distinctImages':len(seen),'texts':sum(len(r['textWrites']) for r in rows),'selectionInteriors':sum(len(r['selectionInteriors']) for r in rows),'blankInteriors':sum(len(r['blankInteriors']) for r in rows),'sourceActorAreas':sum(len(r['sourceActorAreas']) for r in rows),'negativeWholePdfs':len(controls),'unchangedFiles':len(before)}))
if __name__=='__main__': main()
