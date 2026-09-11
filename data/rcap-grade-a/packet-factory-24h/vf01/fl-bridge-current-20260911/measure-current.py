#!/usr/bin/env python3
"""Read-only VF01 measurements. Only review evidence under this script's directory is written."""
from pathlib import Path
import collections, hashlib, json, os, re, struct, subprocess, xml.etree.ElementTree as ET
ROOT=Path.cwd()
OUT=Path(__file__).resolve().parent
FAMILY='fl-10yr-bridge-set'
FD=Path('data/rcap-all50/overlays/census-v1/fl/fl-10yr-bridge-set--official-pdf-fill')
RD=Path('data/rcap-grade-a/packet-factory-24h/raster-runs/34645317724')
PRIOR='7a7a484dced5c4033c518703aa683905a560c60b'
PIN='45bbfb5e86a19b40f55833792564ab86019147f5'
BUILDER='scripts/build-census-v1-fl-10yr-bridge-set.mjs'
TEST='scripts/rcap-packet-recovery/fl-bridge-complete.test.mjs'
def read(p): return json.loads(Path(p).read_text())
def digest(b): return hashlib.sha256(b).hexdigest()
def identity(p):
 p=Path(p); b=p.read_bytes(); return dict(path=p.as_posix(),sha256=digest(b),byteLength=len(b))
def save(name,v): (OUT/name).write_text(json.dumps(v,indent=2,ensure_ascii=False)+'\n')
def gitbytes(rev,p): return subprocess.check_output(['git','show',f'{rev}:{p}'])
def snapshot(paths):
 out={}
 for p in paths:
  s=p.stat();out[p.as_posix()]=dict(sha256=digest(p.read_bytes()),byteLength=s.st_size,mode=s.st_mode,mtimeNs=s.st_mtime_ns,ctimeNs=s.st_ctime_ns)
 return out
receipt=read(FD/'source-receipt.json'); source=Path(receipt['mountedReadOnlySource']['custodyPath'])
inputs=sorted(p for p in FD.rglob('*') if p.is_file())+[source,Path(BUILDER),Path(TEST)]+[Path(r['path']) for r in receipt['compositionAuthority']['records']]
inputs+=sorted(p for p in RD.rglob('*') if p.is_file())
before=snapshot(inputs)
commands=[]
env=dict(os.environ,RCAP_NO_LOCAL_RASTER='1')
tmp=OUT/'.tmp';tmp.mkdir(exist_ok=True);env['TMPDIR']=str(tmp)
for name,args in [
 ('builder-check.log',['node',BUILDER,'--check']),
 ('completeness.log',['node','scripts/rcap-packet-completeness/verify-packet-completeness.mjs','--family',FAMILY]),
 ('focused-tests.log',['node','--test',TEST])]:
 result=subprocess.run(args,env=env,text=True,capture_output=True)
 (OUT/name).write_text(result.stdout+result.stderr)
 commands.append(dict(command='RCAP_NO_LOCAL_RASTER=1 '+' '.join(args),exitCode=result.returncode,log=(OUT/name).relative_to(ROOT).as_posix()))
 assert result.returncode==0,(args,result.stdout,result.stderr)
tmp.rmdir()
after=snapshot(inputs)
assert before==after,'A measured input changed during read-only checks'
save('read-only-checks.json',dict(commands=commands,inputFilesMeasured=len(inputs),unchanged=True,before=before,afterEqualsBefore=after==before,excludedMetadata='atime: reading may change filesystem access time'))
sourceBinding=identity(source);assert sourceBinding['sha256']==receipt['mountedReadOnlySource']['sha256'];assert sourceBinding['byteLength']==26602
bindings=[]
for record in receipt['compositionAuthority']['records']:
 b=identity(record['path']);b['matchesReceipt']=b['sha256']==record['sha256'] and b['byteLength']==record['byteLength'];b['identicalToPriorReview']=Path(record['path']).read_bytes()==gitbytes(PRIOR,record['path']);bindings.append(b)
 assert b['matchesReceipt'] and b['identicalToPriorReview']
# Read only the exact family entries from the bound legal design records.
anchors=[]
for p,key,selector,value in [
 ('data/record-clearing/legal-design-intake/FL.memo.json','tracks','trackId','fl-10yr-bridge'),
 ('data/record-clearing/legal-design-track-registry.json','tracks','trackId','fl-10yr-bridge'),
 ('data/record-clearing/legal-design-packet-set-manifests.json','packetSets','packetSetId',FAMILY)]:
 rows=read(p)[key];idx=next(i for i,x in enumerate(rows) if x.get(selector)==value);entry=rows[idx]
 anchors.append(dict(path=p,pointer=f'/{key}/{idx}',anchorSha256=digest(json.dumps(entry,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()),entry=entry))
fieldMap=read(FD/'production-field-map.json')
facts=json.loads(subprocess.check_output(['node','--input-type=module','-e',f'import {{FIXTURES}} from "./{BUILDER}";console.log(JSON.stringify(FIXTURES));']))
def pages(p):
 root=ET.fromstring(subprocess.check_output(['pdftotext','-bbox',str(p),'-']))
 return [dict(width=float(page.attrib['width']),height=float(page.attrib['height']),words=[dict(text=w.text or '',**{k:float(w.attrib[k]) for k in ['xMin','yMin','xMax','yMax']}) for w in page.iter() if w.tag.endswith('}word')]) for page in root.iter() if page.tag.endswith('}page')]
def token(w):return (w['text'],w['xMin'],w['yMin'],w['xMax'],w['yMax'])
def overlaps(a,b): return (min(a['xMax'],b['xMax'])-max(a['xMin'],b['xMin']),min(a['yMax'],b['yMax'])-max(a['yMin'],b['yMin']))
sp=pages(source);assert len(sp)==6
geometry={};artifacts=[];readbacks={}
rendered=read(FD/'reports/rendered-artifacts.json')
for fixture in ['canonical','boundary']:
 p=FD/'fixtures'/f'{fixture}.pdf'; ps=pages(p);assert len(ps)==8
 b=identity(p);b['pageCount']=len(ps);b['matchesPinnedCommit']=p.read_bytes()==gitbytes(PIN,p);assert b['matchesPinnedCommit']
 declared=next(x for x in rendered['artifacts'] if x['fixture']==fixture)
 b['matchesRenderedReport']=all(b[k]==declared[k] for k in ['sha256','byteLength','pageCount']);assert b['matchesRenderedReport'];artifacts.append(dict(fixture=fixture,**b))
 extracted=subprocess.check_output(['pdftotext','-layout',str(p),'-']).decode();(OUT/f'{fixture}-text.txt').write_text(extracted);texts=extracted.split('\f')[:8]
 additions=[];missing=[];collisions=[];addedCollisions=[];offPage=[]
 for i in range(6):
  sc=collections.Counter(token(w) for w in sp[i]['words']);oc=collections.Counter(token(w) for w in ps[i]['words'])
  missing.extend(dict(page=i+1,word=w) for w in (sc-oc).elements())
  added=[dict(text=w[0],xMin=w[1],yMin=w[2],xMax=w[3],yMax=w[4]) for w in (oc-sc).elements()]
  additions.append(dict(page=i+1,sourceWords=len(sp[i]['words']),addedWords=added))
  for a in added:
   for s in sp[i]['words']:
    dx,dy=overlaps(a,s)
    if dx>0.5 and dy>0.5:collisions.append(dict(page=i+1,added=a,source=s,intersectionWidthPt=dx,intersectionHeightPt=dy))
  for ai,a in enumerate(added):
   for b2 in added[ai+1:]:
    dx,dy=overlaps(a,b2)
    if dx>0.5 and dy>0.5:addedCollisions.append(dict(page=i+1,left=a,right=b2,intersectionWidthPt=dx,intersectionHeightPt=dy))
 for i,page in enumerate(ps):
  for w in page['words']:
   if w['xMin']<0 or w['yMin']<0 or w['xMax']>page['width'] or w['yMax']>page['height']:offPage.append(dict(page=i+1,word=w))
 matches=[]
 for m in fieldMap['maps']:
  for w in m[fixture+'Writes']:
   key=w['field'].split('.')[-1]; expected=facts[fixture][w['factId']]
   if key=='page2_name': expected=f"{facts[fixture]['participant.last_name']}, {facts[fixture]['participant.first_name']} {facts[fixture]['participant.middle_name']}"
   if m['formNumber'].startswith('FDLE'):
    box=fieldMap['sourceWriteBoxes'][key];regions=[]
    for sb in ([box['areaCode'],box['localNumber']] if key=='page1_phone' else [box]):
     selected=[a for a in additions[box['page']-1]['addedWords'] if a['xMin']>=sb['x']-0.1 and a['xMax']<=sb['x']+sb['width']+0.1 and a['yMin']>=792-box['y']-10 and a['yMax']<=792-box['y']+3]
     regions.append(' '.join(a['text'] for a in sorted(selected,key=lambda a:a['xMin'])))
    actual='-'.join(regions) if key=='page1_phone' else regions[0]
    ok=actual==expected
    page=box['page']; method='Poppler words within declared box, independently checked for collisions against every source word'
   else:
    page=7 if m['formNumber'].endswith('PETITION') else 8;actual=re.sub(r'\s+',' ',texts[page-1]);ok=expected in actual;method='Poppler text of exact composed component page, plus independent original-page inspection';actual=expected if ok else actual
   matches.append(dict(field=w['field'],factId=w['factId'],page=page,expected=expected,actual=actual,found=ok,method=method))
 assert all(x['found'] for x in matches),matches
 assert not missing and not collisions and not addedCollisions and not offPage
 readbacks[fixture]=matches
 geometry[fixture]=dict(sourceWordsPreserved=sum(len(p['words']) for p in sp),sourcePages=6,missingSourceWords=missing,addedSourceWords=sum(len(a['addedWords']) for a in additions),addedSourceNonWhitespaceCharacters=sum(len(w['text']) for a in additions for w in a['addedWords']),addedWordsByPage=additions,sourceWordIntersections=collisions,addedWordIntersections=addedCollisions,wordsOutsideMediaBox=offPage,allDeclaredWritesReadBack=len(matches))
# Exact custody bindings for every original PNG; actual IHDR is a canvas, while original verdict dimensions describe the paper region.
verdict=read(RD/f'{FAMILY}.verdict.json');inventory=read(RD/f'{FAMILY}.PAGE_IMAGES_SHA256.json')['pages'];original=read(RD/f'{FAMILY}.ORIGINAL_PAGE_IMAGES_SHA256.json');custody=read(RD/f'{FAMILY}.ORIGINAL_EVIDENCE_VERIFIED.json')
assert verdict['verdict']=='RASTER_PASS' and verdict['packetCommitSha']==PIN and verdict['pagesMeasured']==16
pngs=[]
for item in inventory:
 p=Path(item['path']);ident=identity(p); member=p.relative_to(RD).as_posix(); old=next(x for x in original if x['member']==member);m=next(x for x in verdict['measurements'] if x['png']==member)
 assert ident['sha256']==item['sha256']==old['sha256']==m['pngSha256']
 assert ident['byteLength']==item['byteLength']==old['bytes']==m['bytes']
 width,height=struct.unpack('>II',p.read_bytes()[16:24]);assert (width,height)==(item['canvasWidth'],item['canvasHeight'])
 pngs.append(dict(**ident,actualCanvasWidth=width,actualCanvasHeight=height,paper=item['paper'],matchesOriginalInventory=True,matchesVerdict=True))
assert len(pngs)==16
for a in artifacts:assert verdict['hashesBound'][a['fixture']]['pinned']==a['sha256']
assert read(RD/'runtime-receipt.json')['commitSha']==PIN and read(RD/'canary-receipt.json')['verdict']=='CANARY_PASSED'
assert custody['scope']['pinnedPacketCommitSha']==PIN and custody['actualCoverage']['documentsDigest']==verdict['documentsDigest']
# Preserve all 140 terminal identities and refusal classifications from the previous review map.
oldMap=json.loads(gitbytes(PRIOR,FD/'production-field-map.json'))
fieldInventory=[]
for m,old in zip(fieldMap['maps'],oldMap['maps']):
 assert m['formNumber']==old['formNumber']
 assert m['canonicalRefusals']==old['canonicalRefusals']
 assert [(w['field'],w['factId']) for w in m['canonicalWrites']]==[(w['field'],w['factId']) for w in old['canonicalWrites']]
 fieldInventory.append(dict(document=m['formNumber'],writes=len(m['canonicalWrites']),blanks=len(m['canonicalRefusals']),protected=sum(w.get('category') in ['signature_or_date_participant_completion','court_prosecutor_clerk_or_agency_owned'] for w in m['canonicalRefusals']),manualLater=sum(w.get('requiredBeforeFiling') is True for w in m['canonicalRefusals']),blanksUnchangedFromPrior=True,fields=[dict(field=w['field'],category=w.get('category'),requiredBeforeFiling=w.get('requiredBeforeFiling'),why=w.get('why')) for w in m['canonicalRefusals']]))
# Source-label clearances for the repaired name and fingerprint locations.
for fixture,fg in geometry.items():
 fields=[]
 for a in fg['addedWordsByPage'][0]['addedWords'][:3]:
  adjacent=[w for w in sp[0]['words'] if w['xMin']>=a['xMin']-2 and w['xMin']<a['xMin']+40 and w['text']=='Alias']
  alias=min(adjacent,key=lambda w:abs(w['yMin']-a['yMax']))
  fields.append(dict(page=1,text=a['text'],rect=a,gapToNextAliasLabelPt=round(alias['yMin']-a['yMax'],4)))
 for a in fg['addedWordsByPage'][2]['addedWords']:
  left=[w for w in sp[2]['words'] if 0<a['xMin']-w['xMax']<10 and abs(a['yMin']-w['yMin'])<2]
  fields.append(dict(page=3,text=a['text'],rect=a,leftSourceLabel=left[-1] if left else None,gapFromLabelPt=round(a['xMin']-left[-1]['xMax'],4) if left else None))
 fg['repairedFieldClearances']=fields
save('word-geometry.json',dict(coordinateSystem='PDF points, origin top left; pdftotext -bbox on exact source and saved packets; no rendering',criterion='Added/source or added/added word rectangle intersection greater than 0.5 pt in both axes, all page words inside MediaBox',fixtures=geometry))
save('current-byte-measurements.json',dict(schemaVersion='rcap-vf01-current-byte-measurements/v1',familyId=FAMILY,initialBase='38eeb2cbb8e53b38a84817aebd1c4a1a31eb911c',verifiedAtBase=subprocess.check_output(['git','rev-parse','HEAD']).decode().strip(),metadataUpdateFromCaptain='43943cb16223b0701449cb9bef8671f8a9233231',priorBase=PRIOR,sourceBinding=sourceBinding,compositionBindings=bindings,exactFamilyAnchors=anchors,familyFiles=[identity(p) for p in sorted(FD.rglob('*')) if p.is_file()],artifacts=artifacts,fieldInventory=fieldInventory,readbacks=readbacks,originalRaster=dict(workflowRunId='34645317724',packetCommitSha=PIN,documentsDigest=verdict['documentsDigest'],proofBindings=[identity(p) for p in sorted(RD.glob('*.json'))],pngs=pngs,custodyProofReused=custody,canary=read(RD/'canary-receipt.json'),negativeControls=read(RD/'negative-controls.json'),noNewRender=True,dimensionInterpretation='PNG IHDR is 2448x3168 browser canvas; paper is 2040x2640. Original verdict pngWidth/pngHeight name the calibrated paper, not IHDR.'),builder=identity(BUILDER),focusedTest=identity(TEST),readonlyChecks=(OUT/'read-only-checks.json').relative_to(ROOT).as_posix(),unknowns=dict(externalSourceCurrency=None,runtimeFulfillmentBehavior=None,realParticipantEligibility=None)))
print(json.dumps(dict(commands=commands,sourceBinding=sourceBinding,artifacts=artifacts,sourceWordsPreservedEach=geometry['canonical']['sourceWordsPreserved'],declaredWritesReadBackEach=len(readbacks['canonical']),pngsBound=len(pngs),geometry={f:{k:v for k,v in g.items() if k not in ['addedWordsByPage']} for f,g in geometry.items()}),indent=2))
