import fitz, pathlib,json,hashlib,re
root=pathlib.Path.cwd();out=root/'data/rcap-all50/overlays/census-v1/mo/mo-610-122-arrest-expungement-set--official-pdf-fill'
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
 for key,regions in {'CR145':[(2,[328,405,580,428]),(2,[35,502,590,570])],'CR143':[(1,[35,305,580,748])]}.items():
  cp=out/(f+'.'+key+'.pdf')
  if not cp.exists():continue
  receipt=json.loads((out/'source-receipt.json').read_text());src=next(s for s in receipt['documents'] if s['formNumber']==key);orig=fitz.open(root/src['path']);got=fitz.open(cp)
  for pg,r in regions:
   check(f,'protected_region_unchanged:'+key+':'+str(r),orig[pg-1].get_pixmap(clip=fitz.Rect(r),alpha=False).samples==got[pg-1].get_pixmap(clip=fitz.Rect(r),alpha=False).samples)
 pdf.close()
res={'schemaVersion':'rcap-author-saved-byte-preflight/v1','familyId':'mo-610-122-arrest-expungement-set','authorSession':'/root/ut_original_acceptance:PF09','passed':all(c['passed'] for c in checks),'checks':checks,'limits':'Author byte checks only; independent semantics and central raster/original acceptance remain required. Selection check establishes visible ink, not semantic correctness.'}
(out/'reports/author-saved-byte-preflight.json').write_text(json.dumps(res,indent=2)+'\n');print(json.dumps({'passed':res['passed'],'checks':len(checks),'failures':[c for c in checks if not c['passed']]},indent=2));raise SystemExit(0 if res['passed'] else 1)
