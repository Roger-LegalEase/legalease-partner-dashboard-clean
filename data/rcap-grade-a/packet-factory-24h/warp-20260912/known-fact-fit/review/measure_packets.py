#!/usr/bin/env python3
"""Independent review measurements; imports no packet builder or counters."""
import json, hashlib, re, sys
from pathlib import Path
import pymupdf as pdf
import numpy as np
ROOT=Path.cwd(); OUT=ROOT/'data/rcap-grade-a/packet-factory-24h/warp-20260912/known-fact-fit/review'
CORPUS=ROOT/'private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1'
FAMILIES={
'nm_conviction-set':'nm/nm-conviction-set--official-pdf-fill',
'nm_identity_theft-set':'nm/nm-identity-theft-set--official-pdf-fill',
'nm_release_without_conviction-set':'nm/nm-release-without-conviction-set--official-pdf-fill',
'co_motion_seal_conviction-set':'co/co-motion-seal-conviction-set--official-pdf-fill',
'co_motion_seal_nonconviction-set':'co/co-motion-seal-nonconviction-set--official-pdf-fill',
'la-987-set-aside-and-dismiss-set':'la/la-987-set-aside-and-dismiss-set--official-pdf-fill',
'official-form-treatment:obligation:research-decision-route:CA:ca-1203-4b':'ca/official-form-treatment:obligation:research-decision-route:ca:ca-1203-4b--official-pdf-fill'}
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def norm(s):return re.sub(r'\s+','',str(s)).replace('’',"'").replace('−','-')
def load(p):return json.loads(Path(p).read_text())
def bound(p):return {'path':str(Path(p).relative_to(ROOT)),'sha256':sha(p),'byteLength':Path(p).stat().st_size}
def resolve_source(s):
 expected=s.get('sha256',s.get('pinnedSha256'));candidates=[]
 for k in ['heldCorpusPath','pathInGovernedCustody','pathInCustody','pathInArchive','pathInCorpus','path']:
  if s.get(k):candidates.extend([ROOT/s[k],CORPUS/s[k]])
 for p in candidates:
  if p.is_file() and sha(p)==expected:return p
 # Historical index paths can be unmounted; resolve exact digest in mounted custody.
 for p in (ROOT/'private/source-imports').rglob('*.pdf'):
  if (not s.get('byteLength') or p.stat().st_size==s['byteLength']) and sha(p)==expected:return p
 raise ValueError('No exact source: '+str(s))
def source_rows(receipt):
 rows=receipt.get('documents',[])+receipt.get('sources',[])
 return [x for x in rows if x.get('sha256') or x.get('pinnedSha256')]
def render(page):
 p=page.get_pixmap(matrix=pdf.Matrix(2,2),colorspace=pdf.csGRAY,alpha=False)
 return np.frombuffer(p.samples,np.uint8).reshape(p.height,p.width)
def rect_array(r,h):
 if isinstance(r,list):return [r[0],h-r[3],r[2],h-r[1]]
 return [r['x'],h-r['y']-r['height'],r['x']+r['width'],h-r['y']]
def mask_rect(mask,r,h,pad=2):
 x0,y0,x1,y1=rect_array(r,h);x0=max(0,int((x0-pad)*2));y0=max(0,int((y0-pad)*2));x1=min(mask.shape[1],int((x1+pad)*2)+1);y1=min(mask.shape[0],int((y1+pad)*2)+1);mask[y0:y1,x0:x1]=True

def measure(family):
 base=ROOT/'data/rcap-all50/overlays/census-v1'/FAMILIES[family]
 receipt=load(base/'source-receipt.json'); rendered=load(base/'reports/rendered-artifacts.json');maps=load(base/'production-field-map.json');writes=load(base/'reports/actual-writes.json')
 result={'familyId':family,'directory':str(base.relative_to(ROOT)),'inputs':[bound(base/f) for f in ['source-receipt.json','production-field-map.json','reports/actual-writes.json','reports/rendered-artifacts.json','participant-instructions.md']],'sources':[],'artifacts':[]}
 ca_facts={}
 if family.startswith('official-form-treatment:'):
  # Read the fixture declarations as data, without importing or running the builder.
  fixture_source=ROOT/'scripts/build-census-v1-ca-1203-4-set.mjs'
  declaration=fixture_source.read_text()
  for name in ['CANONICAL','BOUNDARY']:
   block=declaration.split('const '+name+' = Object.freeze({',1)[1].split('\n});',1)[0]
   facts=dict(re.findall(r'"([^"]+)"\s*:\s*"([^"]*)"',block))
   ca_facts[name.lower()]={**ca_facts.get('canonical',{}),**facts}
  result['fixtureSource']=bound(fixture_source)
  result['fixtureFactsIndependentlyReadFromDeclarations']=ca_facts
 sources={}; source_by_form={}
 for s in source_rows(receipt):
  p=resolve_source(s);ident=s.get('documentId',s.get('formNumber',s.get('sourceId')));info={**bound(p),'documentId':ident}; result['sources'].append(info)
  if p.suffix.lower()=='.pdf':
   sources[sha(p)]=pdf.open(p)
   source_by_form[s.get('formNumber',ident)]={'sha256':sha(p),'documentId':ident}
 arts=rendered.get('artifacts',rendered.get('pdfs',[]));seen=set()
 for a in arts:
  fn=a.get('file',a.get('path',a.get('outputFile')))
  if not fn or fn in seen or not fn.endswith('.pdf'):continue
  seen.add(fn);p=ROOT/fn;d=pdf.open(p);art={**bound(p),'fixture':a.get('fixture'),'pages':len(d),'declaredHashMatches':sha(p)==a.get('sha256'),'pageMeasurements':[],'writeMeasurements':[]}
  fixture=a.get('fixture');pm=a.get('pageManifest',[])
  if not pm and a.get('formNumber') in source_by_form:
   ident=source_by_form[a['formNumber']]
   pm=[{'sourcePage':i+1,'sourceSha256':ident['sha256'],'documentId':ident['documentId'],'formNumber':a['formNumber']} for i in range(len(d))]

  for pi,page in enumerate(d):
   txt=page.get_text(); info={'page':pi+1,'textSha256':hashlib.sha256(txt.encode()).hexdigest(),'wordCount':len(page.get_text('words')),'internalRouteLeak':bool(re.search(r'obligation:|Assigned component identity:',txt)),'sixthDistrictLeak':bool(re.search(r'SIXTH JUDICIAL DISTRICT',txt,re.I))}
   if pm:
    assignment=pm[pi];sd=sources.get(assignment['sourceSha256']);sp=sd[assignment['sourcePage']-1] if sd else None;info['sourcePage']=assignment
    if sp:
     outim=render(page);srcim=render(sp);mask=np.zeros(outim.shape,dtype=bool);docid=assignment.get('documentId',assignment.get('formNumber'))
     declared=[w for x in writes.get('documents',[]) if x.get('fixture')==fixture and x.get('documentId',x.get('formNumber'))==docid for w in x.get('actualWrites',[]) if w.get('page')==assignment['sourcePage']]
     if family.startswith('official-form-treatment:'):
      ca=next((x for x in writes.get('artifacts',[]) if x.get('outputFile')==fn),{})
      declared=[{'field':w['fieldName'],'expected':ca_facts[fixture][w['factId']],'rect':w['rect']} for w in ca.get('writtenProof',[]) if w.get('page')==assignment['sourcePage'] and w.get('disposition')=='WRITE' and w.get('textReadFromOutputBytes')]
     for w in declared:
      r=w['rect'];mask_rect(mask,r,page.rect.height);pr=pdf.Rect(rect_array(r,page.rect.height));pr+=(-2,-2,2,2);read=page.get_textbox(pr);expected=w['expected'];art['writeMeasurements'].append({'page':pi+1,'documentId':docid,'field':w['field'],'expected':expected,'rect':r,'read':read,'matches':norm(expected) in norm(read)})
     if docid=='NM-4-222' and assignment['sourcePage']==4 and maps.get('routeDeterminedSelections'):
      # Source-measured underscore for the fixed petitioner role. This is an express route selection,
      # never a financial or merits choice. Its stroke geometry is reviewed separately.
      mask_rect(mask,{'x':290,'y':334.22,'width':20,'height':12},page.rect.height)
     if outim.shape==srcim.shape:
      added=(srcim>240)&(outim<180);removed=(srcim<180)&(outim>240)
      info.update({'addedDarkPixels':int(added.sum()),'addedPixelsOutsideWriteRects':int((added&~mask).sum()),'removedDarkPixels':int(removed.sum()),'removedPixelsOutsideWriteRects':int((removed&~mask).sum()),'sourceAndOutputSameDimensions':True})
     else:info['sourceAndOutputSameDimensions']=False
   art['pageMeasurements'].append(info)
  result['artifacts'].append(art)
 # Disclosure and stop obligations measured independently from delivered text.
 guide=(base/'participant-instructions.md').read_text()
 req=[]
 for m in maps.get('maps',[]):
  for fixture in ['canonical','boundary']:
   for r in m.get(fixture+'Refusals',[]):
    if r.get('requiredBeforeFiling'):
     label=r.get('effectiveLabel',r.get('printedLabel',r.get('disclosureLabel','')))
     req.append({'fixture':fixture,'document':m.get('documentId'),'field':r.get('field'),'label':label,'labelInInstructions':bool(label) and norm(label) in norm(guide)})
 result['requiredDisclosureMeasurements']=req
 reg=load(ROOT/'data/record-clearing/legal-design-track-registry.json')['tracks']
 track_id=family.removesuffix('-set')
 track=next((x for x in reg if x['trackId']==track_id),None)
 if track:result['stopConditionMeasurements']=[{'condition':v,'literalInInstructions':v in guide} for v in track.get('selfHelpStopConditions',[])]

 result['totals']={'pdfs':len(result['artifacts']),'pages':sum(a['pages'] for a in result['artifacts']),'declaredWritesRead':sum(len(a['writeMeasurements']) for a in result['artifacts']),'writeReadMismatches':sum(not w['matches'] for a in result['artifacts'] for w in a['writeMeasurements']),'internalRouteLeakPages':sum(p['internalRouteLeak'] for a in result['artifacts'] for p in a['pageMeasurements']),'sixthDistrictLeakPages':sum(p['sixthDistrictLeak'] for a in result['artifacts'] for p in a['pageMeasurements'])}
 return result
if __name__=='__main__':
 rows=[]
 for f in sys.argv[1:] or FAMILIES:
  r=measure(f);rows.append(r);print(f,r['totals'])
 p=OUT/('measurements-'+(sys.argv[1].replace(':','_') if len(sys.argv)==2 else 'all')+'.json');p.write_text(json.dumps({'schemaVersion':'rcap-independent-current-packet-measurements/v1','measurementMethod':'PyMuPDF independent parser; exact source hashing; 144 dpi grayscale source-output pixel differences, measured write rectangles expanded by 2pt to include glyph descenders; no builder counters imported','rows':rows},indent=2)+'\n');print(p)
