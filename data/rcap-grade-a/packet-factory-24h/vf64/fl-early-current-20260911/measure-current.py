#!/usr/bin/env python3
"""Read-only input measurement; stdout is the evidence, with no PDF rendering."""
import collections, hashlib, json, pathlib, struct, subprocess, xml.etree.ElementTree as ET
ROOT=pathlib.Path(__file__).resolve().parents[5]
F='data/rcap-all50/overlays/census-v1/fl/fl-early-juvenile-set--official-pdf-fill'
R='data/rcap-grade-a/packet-factory-24h/raster-runs/34644514161'
S='reference/source-recovery/2026-09-11-wave1/CODEX-CS2-SRC2__FL-EARLY-JUVENILE-SET__FDLE-EARLY-JUVENILE-EXPUNCTION-APPLICATION__d9417ea382c9.pdf'
P='data/rcap-grade-a/packet-factory-24h/vf64/rows-vf64-20260910.json'
D='data/rcap-grade-a/source-wave-integration/CAPTAIN_SOURCE_IDENTITY_DETERMINATIONS.json'
OLD='63a28b5fdd25bdce621ec8cfa69dbac08a7d4894'; START='b0aeaba3802a229c9fa3fc284722eec84b5d57cc'
def git(*args): return subprocess.check_output(['git',*args],cwd=ROOT)
def read(p): return (ROOT/p).read_bytes()
def obj(p): return json.loads(read(p))
def digest(b): return hashlib.sha256(b).hexdigest()
def binding(p):
 b=read(p);return {'path':p,'sha256':digest(b),'byteLength':len(b)}
def words(p):
 raw=subprocess.check_output(['pdftotext','-bbox',str(ROOT/p),'-'],cwd=ROOT)
 x=ET.fromstring(raw); ns={'x':'http://www.w3.org/1999/xhtml'}; pages=[]
 for page in x.findall('.//x:page',ns):
  h=float(page.attrib['height']); pages.append({'width':float(page.attrib['width']),'height':h,'words':[{'text':''.join(w.itertext()),'x0':float(w.attrib['xMin']),'x1':float(w.attrib['xMax']),'y0':round(h-float(w.attrib['yMax']),6),'y1':round(h-float(w.attrib['yMin']),6)} for w in page.findall('x:word',ns)]})
 return pages
def key(w): return (w['text'],*[round(w[k],4) for k in ['x0','x1','y0','y1']])
src=words(S); outputs=[]
for kind in ['canonical','boundary']:
 path=f'{F}/fixtures/{kind}.pdf'; pages=words(path); result=[]
 for i,(sp,op) in enumerate(zip(src,pages)):
  source_keys=collections.Counter(key(w) for w in sp['words']); added=[]
  for w in op['words']:
   k=key(w)
   if source_keys[k]:source_keys[k]-=1
   else:added.append(w)
  collisions=[]
  for aw in added:
   for sw in sp['words']:
    dx=min(aw['x1'],sw['x1'])-max(aw['x0'],sw['x0']);dy=min(aw['y1'],sw['y1'])-max(aw['y0'],sw['y0'])
    if dx>0.1 and dy>0.1:collisions.append({'added':aw,'source':sw,'intersectionWidth':round(dx,3),'intersectionHeight':round(dy,3)})
  result.append({'page':i+1,'sourceWords':len(sp['words']),'sourceWordsMissingOrMoved':sum(source_keys.values()),'addedWords':added,'sourceWordIntersections':collisions,'pageSizeMatches':(sp['width'],sp['height'])==(op['width'],op['height'])})
 outputs.append({**binding(path),'fixture':kind,'pageCount':len(pages),'pages':result})
family=[]
for p in sorted((ROOT/F).rglob('*')):
 if not p.is_file():continue
 rel=str(p.relative_to(ROOT));b=binding(rel)
 try: old=git('show',f'{OLD}:{rel}');b.update({'priorSha256':digest(old),'byteIdenticalToPrior':digest(old)==b['sha256']})
 except subprocess.CalledProcessError:b['byteIdenticalToPrior']=False
 start=git('show',f'{START}:{rel}');b.update({'startSha256':digest(start),'changedDuringReview':digest(start)!=b['sha256']});family.append(b)
receipt=obj(f'{F}/source-receipt.json');authorities=[]
for a in receipt['authorityRecords']:
 b=binding(a['path']);b.update({'receiptSha256':a['sha256'],'matchesReceipt':b['sha256']==a['sha256'] and b['byteLength']==a['byteLength'],'byteIdenticalToPrior':digest(git('show',f"{OLD}:{a['path']}"))==b['sha256']});authorities.append(b)
rv=obj(f'{R}/fl-early-juvenile-set.verdict.json'); inv=obj(f'{R}/fl-early-juvenile-set.PAGE_IMAGES_SHA256.json');images=[]
for p in inv['pages']:
 b=read(p['path']);w,h=struct.unpack('>II',b[16:24]);m=next(m for m in rv['measurements'] if m['document']==p['document'] and m['page']==p['page']);images.append({**binding(p['path']),'document':p['document'],'page':p['page'],'canvasWidth':w,'canvasHeight':h,'paper':m['paper'],'matchesOriginalInventory':digest(b)==p['sha256'] and len(b)==p['byteLength'],'matchesVerdict':digest(b)==m['pngSha256'] and len(b)==m['bytes']})
fm=obj(f'{F}/production-field-map.json')['maps'][0];blank_counts=collections.Counter(r.get('completenessDisposition') or ('OPTIONAL_PARTICIPANT_CONTENT' if 'optional' in r['reason'] else 'UNCLASSIFIED') for r in fm['canonicalRefusals'])
prior=obj(P);ix=next(i for i,r in enumerate(prior['rows']) if r['familyId']=='fl-early-juvenile-set');decision=obj(D)['reconciliation42']['families'];di=next(i for i,r in enumerate(decision) if r['familyId']=='fl-early-juvenile-set')
result={'schemaVersion':'vf64-fl-early-current-measurements/v1','verifiedAtBase':git('rev-parse','HEAD').decode().strip(),'initialReviewBase':START,'source':{**binding(S),'pageCount':len(src),'matchesAssignedPin':digest(read(S))=='d9417ea382c9c1ea170153b5aa25e63230799de836b8aefca0ee80a47e23f6eb','page1SourceUuid':[w for w in src[0]['words'] if '034fdaae' in w['text']]},'authorityBindings':authorities,'sourceDecision':{**binding(D),'pointer':f'/reconciliation42/families/{di}','decision':decision[di]},'prior':{**binding(P),'rowPointer':f'/rows/{ix}','verifiedAtBase':OLD},'familyBindings':family,'outputs':outputs,'terminalInventory':{'writesPerFixture':len(fm['canonicalWrites']),'blanksPerFixture':len(fm['canonicalRefusals']),'blankDispositions':dict(blank_counts),'canonicalAndBoundaryWriteInventoryEqual':fm['canonicalWrites']==fm['boundaryWrites'],'canonicalAndBoundaryRefusalInventoryEqual':fm['canonicalRefusals']==fm['boundaryRefusals']},'raster':{'verdict':binding(f'{R}/fl-early-juvenile-set.verdict.json'),'custodyProof':binding(f'{R}/fl-early-juvenile-set.ORIGINAL_EVIDENCE_VERIFIED.json'),'inventory':binding(f'{R}/fl-early-juvenile-set.PAGE_IMAGES_SHA256.json'),'canary':binding(f'{R}/canary-receipt.json'),'negativeControls':binding(f'{R}/negative-controls.json'),'runtime':binding(f'{R}/runtime-receipt.json'),'workflowRunId':rv['workflowRunId'],'packetCommitSha':rv['packetCommitSha'],'documentsDigest':rv['documentsDigest'],'pdfPinsMatchCurrent':all(rv['hashesBound'][o['fixture']]['pinned']==o['sha256'] for o in outputs),'pages':images,'actualCanvasVsProducerPaper':'IHDR2448x3168; producer pngWidth/pngHeight2040x2640 describe paper, not surrounding canvas.','archiveInspection':'Not performed here; original acquisition/ZIP/job-log custody reused from the hashed ORIGINAL_EVIDENCE_VERIFIED record.'}}
assert len(images)==10 and all(i['matchesOriginalInventory'] and i['matchesVerdict'] for i in images)
assert all(a['matchesReceipt'] and a['byteIdenticalToPrior'] for a in authorities)
assert all(p['sourceWordsMissingOrMoved']==0 for o in outputs for p in o['pages'])
assert result['raster']['pdfPinsMatchCurrent']
print(json.dumps(result,indent=2))
