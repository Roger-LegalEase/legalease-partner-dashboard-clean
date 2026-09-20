import fitz, pathlib,json,hashlib,re
root=pathlib.Path.cwd();out=root/'data/rcap-all50/overlays/census-v1/mo/mo-575-120-identity-theft-correction-set--official-pdf-fill'
report=json.loads((out/'reports/rendered-artifacts.json').read_text());fieldmap=json.loads((out/'production-field-map.json').read_text());checks=[]
def norm(s):return re.sub(r'[^a-z0-9]','',str(s).lower())
def check(f,k,ok,detail=None):checks.append(dict(fixture=f,check=k,passed=bool(ok),detail=detail))
def digest(b):return hashlib.sha256(b).hexdigest()
for p in report['packets']:
 f=p['fixture'];raw=(out/p['file']).read_bytes();pdf=fitz.open(stream=raw,filetype='pdf');check(f,'saved_hash_pages',digest(raw)==p['sha256'] and len(pdf)==p['pageCount']);check(f,'no_live_widgets',all(not list(page.widgets() or []) for page in pdf));cov=json.loads((out/(f+'.coverage.json')).read_text())
 for c in cov:
  file=out/(f+'.'+c['documentId']+'.pdf');d=fitz.open(file);check(f,'component_hash:'+c['documentId'],digest(file.read_bytes())==c['sha256'] and len(d)==c['pageCount'])
  for i,page in enumerate(d):
   assembled=pdf[c['firstPage']-1+i]
   check(f,'component_page_preservation:'+c['documentId']+':'+str(i+1),page.get_pixmap(alpha=False).samples==assembled.get_pixmap(alpha=False).samples)
  d.close()
 for w in fieldmap['writes']:
  if w['fixture']!=f:continue
  component=w['fieldId'].split('/')[1];d=fitz.open(out/(f+'.'+component+'.pdf'));page=d[w['page']-1];x,y,ww,hh=w['rect'];r=fitz.Rect(x,page.rect.height-y-hh,x+ww,page.rect.height-y);clip=r+(-1,-1,1,1);read=page.get_text(clip=clip)
  if w.get('isSelectionControl'):
   pix=page.get_pixmap(clip=r,colorspace=fitz.csGRAY,alpha=False);ok=sum(v<150 for v in pix.samples)>5
  else:ok=norm(w['value']) in norm(read)
  check(f,'saved_write:'+w['fieldId'],ok,{'expected':w['value'],'read':read.strip(),'rect':list(r)} if not ok else None)
  d.close()
 # Verify the source distinguishes party-code rows from attorney-code rows.
 fi=fitz.open(out/(f+'.FI-05.pdf'));source=next(s for s in json.loads((out/'source-receipt.json').read_text())['documents'] if s['formNumber']=='FI-05');orig=fitz.open(pathlib.Path('/workspaces/legalease-partner-dashboard-clean')/source['path']);widgets={w.field_name:w.rect for w in orig[0].widgets()};facts=json.loads((out/(f+'.fixture.json')).read_text());partycount=1+len(facts['respondents']);copies=(partycount+2)//3
 for i in range(copies):
  for slot in range(3):
   name='Party Type Code'+('' if slot==0 else '_'+str(slot*2+1));r=widgets[name];value=fi[i].get_text(clip=r+(-1,-1,1,1));expected='PET' if i==0 and slot==0 else 'RES' if i*3+slot<partycount else '';check(f,'FI05_party_role:'+str(i)+':'+str(slot),norm(value)==norm(expected),{'expected':expected,'read':value})
   name='Party Type Code_'+str(slot*2+2);r=widgets[name];check(f,'FI05_attorney_code_blank:'+str(i)+':'+str(slot),orig[0].get_pixmap(clip=r,alpha=False).samples==fi[i].get_pixmap(clip=r,alpha=False).samples)
 for i in range(copies):
  for name in ['Case Type Code','Case Type Description']:
   rect=widgets[name];check(f,'FI05_clerk_confirmed_blank:'+str(i)+':'+name,orig[0].get_pixmap(clip=rect,alpha=False).samples==fi[i].get_pixmap(clip=rect,alpha=False).samples)
 continuation=fitz.open(out/(f+'.respondent-schedule.pdf'));ctext=' '.join(page.get_text() for page in continuation)
 check(f,'account_supplied_exact',norm(facts['impersonationAccount']) in norm(ctext))
 for index,factor in enumerate(facts['identifyingFactorsUsed']):check(f,'identifying_factor:'+str(index),norm(factor) in norm(ctext))
 check(f,'relationship_answer_visible',norm(facts['impersonatorRelationship']) in norm(ctext));check(f,'police_report_answer_visible','police report: '+('yes' if facts['policeReportFiled'] else 'no') in ctext)
 for key,regions in {'CR300':[(1,[342,615,584,695]),(1,[207,70,441,115])],'CR310':[(1,[35,290,585,746])]}.items():
  cp=out/(f+'.'+key+'.pdf')
  if not cp.exists():continue
  receipt=json.loads((out/'source-receipt.json').read_text());src=next(s for s in receipt['documents'] if s['formNumber']==key);orig=fitz.open(pathlib.Path('/workspaces/legalease-partner-dashboard-clean')/src['path']);got=fitz.open(cp)
  for pg,r in regions:
   check(f,'protected_region_unchanged:'+key+':'+str(r),orig[pg-1].get_pixmap(clip=fitz.Rect(r),alpha=False).samples==got[pg-1].get_pixmap(clip=fitz.Rect(r),alpha=False).samples)
 for key in ['CR300','CR310','FI-05']:
  cp=out/(f+'.'+key+'.pdf')
  if not cp.exists():continue
  receipt=json.loads((out/'source-receipt.json').read_text());source=next(s for s in receipt['documents'] if s['formNumber']==key);orig=fitz.open(pathlib.Path('/workspaces/legalease-partner-dashboard-clean')/source['path']);got=fitz.open(cp)
  for page in orig:
   for ref in page.get_contents():
    raw=orig.xref_stream(ref);available=[got.xref_stream(x) for pg in got for x in pg.get_contents()];check(f,'original_content_stream:'+key+':'+str(ref),raw in available)
 pdf.close()
res={'schemaVersion':'rcap-author-saved-byte-preflight/v1','familyId':'mo-575-120-identity-theft-correction-set','authorSession':'/root/mt_form_b_independent_review:PF10','passed':all(c['passed'] for c in checks),'checks':checks,'limits':'Author byte checks only; independent semantics and central raster/original acceptance remain required. Selection check establishes visible ink, not semantic correctness.'}
(out/'reports/author-saved-byte-preflight.json').write_text(json.dumps(res,indent=2)+'\n');print(json.dumps({'passed':res['passed'],'checks':len(checks),'failures':[c for c in checks if not c['passed']]},indent=2));raise SystemExit(0 if res['passed'] else 1)
