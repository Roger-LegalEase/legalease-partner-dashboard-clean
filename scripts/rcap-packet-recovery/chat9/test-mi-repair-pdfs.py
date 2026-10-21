"""Author QA against complete emitted PDFs and actual emitted guide text.
Mutated PDFs are rebuilt in memory, not passed as stale hashes; input files never
change. Negative controls test the same complete-PDF protected-region checker.
"""
from pathlib import Path
import hashlib,json,re
import fitz
ROOT=Path(__file__).resolve().parents[3]
E=ROOT/'data/rcap-grade-a/chat-parallel-2026-09-07/chat9-build/mi-correction-20260907'
sha=lambda b:hashlib.sha256(b).hexdigest()
SOURCE=ROOT/'reference/chat-parallel-2026-09-07/chat9/mc227.pdf'
source=fitz.open(SOURCE)
def rect(w,page):
 r=w['rect'];return fitz.Rect(r['x'],page.rect.height-r['y']-r['height'],r['x']+r['width'],page.rect.height-r['y'])
def protected(pdf,ledger):
 d=fitz.open(stream=pdf,filetype='pdf');assert len(d)>=4
 checks=0
 for row in ledger:
  if row['disposition']!='PROTECTED_FIELD':continue
  for w in row['widgets']:
   n=w['page']-1;r=rect(w,d[n]);m=fitz.Matrix(2,2)
   assert d[n].get_pixmap(matrix=m,clip=r,alpha=False).samples==source[n].get_pixmap(matrix=m,clip=r,alpha=False).samples,('protected ink',row['name'],n+1)
   checks+=1
 assert d[3].get_pixmap(matrix=fitz.Matrix(1,1)).samples==source[3].get_pixmap(matrix=fitz.Matrix(1,1)).samples,'official instruction page changed'
 assert not any(list(p.widgets()or[])for p in d),'interactive fields'
 return checks
REQUIRED=['Only after actual mailing','The court supplies hearing details','If a victim appears or submits a written or oral statement','does not extinguish an obligation to pay restitution','does not entitle the participant to a refund of a fine, costs, or other money','PO Box 30217, Lansing, MI 48909']
def guide(text,owi,serious=False,prior=False):
 for phrase in REQUIRED:assert phrase in text,phrase
 assert 'Confirm the receiving address with the AG' not in text,'stale resolved-address hold'
 assert 'a prior application is contradictory even if denied' not in text,'false lifetime predicate'
 if owi:
  assert 'I have not previously applied to have and had a first violation operating while intoxicated offense conviction set aside.' in text
  assert 'remains on the driving record' in text
 if serious:
  for phrase in ['prosecuting attorney notifies the victim','first-class mail to the last known address','do not contact the victim or certify that the prosecutor sent notice','even without a formal objection']:assert phrase in text,phrase
 if prior:assert 'STOP BEFORE REAPPLICATION' in text and 'No denial order is supplied' in text
 assert not re.search(r'(?:restores|does not restore|restore your) firearm rights',text,re.I)
positives=[];inputs={};pdfs={};guides={}
for stem in ['mi-setaside-application-set','mi-setaside-first-owi-set']:
 folder=ROOT/f'data/rcap-all50/overlays/census-v1/mi/{stem}--official-pdf-fill'
 for p in folder.rglob('*'):
  if p.is_file():inputs[str(p.relative_to(ROOT))]=sha(p.read_bytes())
 artifacts=json.loads((folder/'reports/rendered-artifacts.json').read_text())['artifacts']
 for a in artifacts:
  n=a['variant'];pdf=(folder/a['path']).read_bytes();assert sha(pdf)==a['sha256']
  report=json.loads((folder/f'reports/{n}-render.json').read_text());assert report['artifactSha256']==sha(pdf)
  assert a['fileable'] is False and a['executionComplete'] is False
  if a['historyTreatment']['reasons']:assert not a['historyTreatment']['permissionToReapply']
  count=protected(pdf,report['fieldLedger'])
  text=(folder/f'{n}-next-steps.md').read_text();owi='first-owi' in stem
  guide(text,owi,n=='serious-misdemeanor',n.startswith('prior-'))
  key=f'{stem}/{n}';pdfs[key]=(pdf,report['fieldLedger']);guides[key]=(text,owi,n=='serious-misdemeanor',n.startswith('prior-'))
  positives.append({'family':stem,'variant':n,'sha256':sha(pdf),'pages':len(fitz.open(stream=pdf,filetype='pdf')),'protectedRegions':count,'guideSha256':sha(text.encode()),'guideChecked':True})
controls=[]
base,ledger=pdfs['mi-setaside-first-owi-set/prior-denial-interval-elapsed-handoff']
for field in ['appsig','hdate','posofficialdate']:
 d=fitz.open(stream=base,filetype='pdf');row=next(r for r in ledger if r['name']==field);w=row['widgets'][0];n=w['page']-1;r=rect(w,d[n]);d[n].draw_rect(fitz.Rect(r.x0+2,r.y0+2,r.x0+8,r.y0+8),fill=(0,0,0),color=(0,0,0));bad=d.tobytes(garbage=4,deflate=True)
 caught=False
 try:protected(bad,ledger)
 except AssertionError:caught=True
 assert caught,field
 controls.append({'kind':'complete-PDF-protected-region','field':field,'sha256':sha(bad),'pages':len(d),'rejected':True})
ordinary=guides['mi-setaside-application-set/serious-misdemeanor'];owi=guides['mi-setaside-first-owi-set/prior-denial-interval-elapsed-handoff']
for label,case,old,new in [
 ('victim notice actor',ordinary,'prosecuting attorney notifies the victim','participant must notify the victim'),
 ('victim handoff',ordinary,'If a victim appears or submits a written or oral statement','If there is a formal objection'),
 ('restitution caution',ordinary,'does not extinguish an obligation to pay restitution','eliminates all restitution'),
 ('no refund caution',owi,'does not entitle the participant to a refund of a fine, costs, or other money','automatically refunds every payment'),
 ('driving record',owi,'remains on the driving record','is removed from the driving record'),
 ('denial handoff',owi,'STOP BEFORE REAPPLICATION','ELIGIBLE TO REAPPLY'),
 ('OWI quotation',owi,'applied to have and had','applied for')]:
 text,*args=case;assert old in text;bad=text.replace(old,new);caught=False
 try:guide(bad,*args)
 except AssertionError:caught=True
 assert caught,label
 controls.append({'kind':'actual-guide-mutation','case':label,'sha256':sha(bad.encode()),'rejected':True})
for p,h in inputs.items():assert sha((ROOT/p).read_bytes())==h,'original changed: '+p
result={'authorQA':True,'independentApproval':False,'positiveCompletePdfs':positives,'negativeControls':controls,'originalFamilyFilesUnchanged':len(inputs),'sourceSha256':sha(SOURCE.read_bytes())}
(E/'complete-pdf-and-guide-controls.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'completePdfs':len(positives),'pages':sum(p['pages']for p in positives),'protectedRegions':sum(p['protectedRegions']for p in positives),'negativeControlsRejected':len(controls),'originalsUnchanged':len(inputs)}))
