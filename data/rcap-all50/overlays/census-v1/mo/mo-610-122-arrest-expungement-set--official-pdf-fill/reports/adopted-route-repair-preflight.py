import pathlib,json,hashlib,subprocess,re,fitz,collections
root=pathlib.Path.cwd();d=root/'data/rcap-all50/overlays/census-v1/mo/mo-610-122-arrest-expungement-set--official-pdf-fill';base='ba2f4d6a7f0cdf5ece12997d91fdcc871da602fd';checks=[]
def norm(s):return re.sub(r'[^a-z0-9]','',s.lower())
def add(f,n,ok):checks.append({'fixture':f,'check':n,'passed':bool(ok)})
def previous(p):return subprocess.check_output(['git','show',base+':'+str(p.relative_to(root))])
report=json.loads((d/'reports/rendered-artifacts.json').read_text())
phrases=['civil division','thirty days (30 days) after filing','reasonable notice','three standard fingerprint cards','three cards in one visit','whether cash is required','what identification to bring','keep the third card','with the summons','fingerprint-based criminal-history record','civil action exists or is contemplated','commercial driver license status at arrest is uncertain','intoxication-related traffic or boating','chapter 303 or moving-violation classification is unclear','any related offense was not nolle prossed, dismissed or acquitted','suspended imposition of sentence','prosecutor or an agency protests','anyone appeals under section 610.124.2','no local agency will provide','not a United States citizen','immigration consequence','whether destruction means a record can never be found','false-information ground always requires legal assistance','entity that was not named as a defendant','blacking out entries','FBI expunge']
for r in report['packets']:
 f=r['fixture'];pdf=fitz.open(d/r['file']);txt=' '.join(p.get_text()for p in pdf)
 for q in phrases:add(f,'adopted instruction:'+q,norm(q)in norm(txt))
 if f=='boundary':
  for q in ['Missouri Department of Revenue driver record','certified dismissal, nolle-prosequi or acquittal records for every related charge','See attached FI-05 party sheets 1-3.']:add(f,'conditional:'+q,norm(q)in norm(txt))
 for key in ['CR145']:
  p=d/(f+'.'+key+'.pdf');add(f,'unchanged source component:'+key,p.read_bytes()==previous(p))
 p=d/(f+'.FI-05.pdf');newfi=fitz.open(p);oldfi=fitz.open(stream=previous(p),filetype='pdf');maps=json.loads((d/'production-field-map.json').read_text())['writes'];codes=[w for w in maps if w['fixture']==f and '/FI-05/' in w['fieldId'] and w['field'].startswith('Party Type Code')];add(f,'party codes only actual party source rows',all(w['field'] in ['Party Type Code','Party Type Code_3','Party Type Code_5'] for w in codes));add(f,'all actual parties assigned code',len(codes)==1+len(json.loads((d/(f+'.fixture.json')).read_text())['respondents']))
 source=fitz.open(root/'reference/chat-parallel-2026-09-07/chat7/FI-05.pdf');rects={w.field_name:w.rect for w in source[0].widgets() if w.field_name.startswith('Party Type Code')};copies=len(newfi)-3
 for i in range(len(newfi)):
  if i<copies:
   for name,r in rects.items():
    if name in ['Party Type Code_2','Party Type Code_4','Party Type Code_6']:add(f,'blank attorney role code:'+str(i)+':'+name,not newfi[i].get_text(clip=r).strip())
   for r in rects.values():newfi[i].draw_rect(r+(-1,-1,1,1),fill=(1,1,1),color=(1,1,1));oldfi[i].draw_rect(r+(-1,-1,1,1),fill=(1,1,1),color=(1,1,1))
  add(f,'FI05 all outside role-code corrections preserved:'+str(i+1),newfi[i].get_pixmap().samples==oldfi[i].get_pixmap().samples)
 p=d/(f+'.fixture.json');add(f,'unchanged held participant facts',p.read_bytes()==previous(p))
 if f!='petition-only':
  cp=d/(f+'.CR143.pdf');new=fitz.open(cp);old=fitz.open(stream=previous(cp),filetype='pdf');add(f,'known county neutral caption',norm('Jackson County - Civil Division') in norm(new[0].get_text(clip=fitz.Rect(80,53,460,71))));rect=fitz.Rect(35,71,580,775);add(f,'CR143 all below new neutral caption preserved',new[0].get_pixmap(clip=rect).samples==old[0].get_pixmap(clip=rect).samples)
 if f=='boundary':
  cp=d/(f+'.GN10.pdf');new=fitz.open(cp);old=fitz.open(stream=previous(cp),filetype='pdf');rect=fitz.Rect(35,170,580,770);add(f,'GN10 financial body and execution pixels preserved',new[0].get_pixmap(clip=rect).samples==old[0].get_pixmap(clip=rect).samples);bl=json.loads((d/'production-field-map.json').read_text())['refusals'];add(f,'no false GN10 missing-address handback',not any(x.get('documentId','').endswith('/GN10') and x.get('disposition')=='REQUIRED_BEFORE_FILING' for x in bl))
for p in [d/'source-receipt.json']:add('all','source receipt preserved',p.read_bytes()==previous(p))
x={'schemaVersion':'rcap-adopted-route-repair-preflight/v1','familyId':'mo-610-122-arrest-expungement-set','repairOfCommit':base,'passed':all(c['passed']for c in checks),'checks':checks,'scope':'Seven independent findings plus every adopted self-help stop and source/fact/protected-body preservation; no new legal or source decision.'};(d/'reports/adopted-route-repair-preflight.json').write_text(json.dumps(x,indent=2)+'\n');print(json.dumps({'passed':x['passed'],'checks':len(checks),'failures':[c for c in checks if not c['passed']]},indent=2));raise SystemExit(0 if x['passed'] else 1)
