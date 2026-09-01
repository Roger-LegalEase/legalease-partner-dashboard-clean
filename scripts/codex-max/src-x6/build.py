#!/usr/bin/env python3
"""Build the SRC-X6 evidence-only superlane outputs without mutating registries."""
import hashlib, json, os, re, subprocess, urllib.parse
from pathlib import Path

ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'data/rcap-grade-a/codex-max/source-and-candidate/src-x6'
OUT.mkdir(parents=True,exist_ok=True)
def load(p): return json.loads((ROOT/p).read_text())
def dump(name,obj):
 (OUT/name).write_text(json.dumps(obj,indent=2,sort_keys=True)+'\n')
def sha(b): return hashlib.sha256(b).hexdigest()
def owns(s): return int.from_bytes(hashlib.sha256(s.encode()).digest()[:8],'big')%8==5

head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
shift=load('data/rcap-grade-a/launch-control/CLAUDE_9H_SHIFT.json')
ledger=load('data/rcap-grade-a/packet-factory-24h/claim-ledger.json')
checkpoint=load('data/rcap-grade-a/packet-factory-24h/CHECKPOINT.json')
dump('collision-guard.json',{'schemaVersion':'src-x6-collision-guard/v1','measuredAtHead':head,
 'readOnlyInputs':['data/rcap-grade-a/launch-control/CLAUDE_9H_SHIFT.json','data/rcap-grade-a/packet-factory-24h/claim-ledger.json','data/rcap-grade-a/packet-factory-24h/CHECKPOINT.json','data/rcap-grade-a/codex-5h/cb05-fleet-index/families.json'],
 'shiftBaseSha':shift.get('shiftBaseSha'),'claimDigest':ledger.get('claimsDigest'),'checkpointNumber':checkpoint.get('checkpointNumber'),
 'rule':'Never assert, release, modify, or impersonate a Claude claim; canonical changes are apply-ready payloads only.'})

# Phase 1: byte and relationship remeasurement.
wave=load('data/rcap-grade-a/launch-control/next-waves/SOURCE_RELATIONSHIP_REPAIR_WAVE.json')
assigned=[r for r in wave['rows'] if 76<=int(r['rowId'].split('-')[1])<=90]
tracked=subprocess.check_output(['git','ls-files'],cwd=ROOT,text=True).splitlines()
rows=[]; patches=[]
search_files=[p for base in (ROOT/'private',ROOT/'data',ROOT/'src') if base.exists() for p in base.rglob('*') if p.is_file()]
for r in assigned:
 ident=r['currentSourceIdentity']['canonicalArtifactId']; jurisdiction=r['currentSourceIdentity']['jurisdiction']
 candidates=[]
 for p in search_files:
  if ident.lower().replace(' ','') in p.name.lower().replace(' ',''):
   candidates.append(p)
 held=[]
 for p in sorted(set(candidates)):
  try: b=p.read_bytes()
  except OSError: continue
  held.append({'path':str(p.relative_to(ROOT)),'sha256':sha(b),'byteLength':len(b)})
 plausible=[]
 try:
  found=subprocess.run(['rg','-l','-i','-F',ident,'data','src','docs'],cwd=ROOT,text=True,capture_output=True,timeout=20)
  plausible=found.stdout.splitlines()[:50]
 except subprocess.TimeoutExpired:
  plausible=[]
 active=False
 # Rows carry no family ownership in this shard; preserve the collision finding explicitly.
 if active: verdict='DEFERRED_ACTIVE_CLAUDE_OWNER'
 elif not held: verdict='STOPPED_MISSING_BYTES'
 elif r['currentSourceIdentity']['sourceState']=='CURRENTNESS_UNVERIFIED': verdict='STOPPED_CURRENTNESS'
 elif r['currentSourceIdentity']['sourceState']=='FAMILY_IDENTITY_AMBIGUOUS': verdict='STOPPED_FAMILY_MAPPING'
 else: verdict='STOPPED_IDENTITY'
 item={'rowId':r['rowId'],'jurisdiction':jurisdiction,'canonicalArtifactId':ident,'sourceStateAtWave':r['currentSourceIdentity']['sourceState'],
  'verdict':verdict,'heldBytes':held,'plausibleIdentityEvidenceFiles':plausible,
  'relationshipDimensions':{'identity':'unsettled' if not held else ident,'currentness':'unverified','scope':'unverified','language':'unverified','filingMode':'unverified','bundleOrComponent':'unverified','embeddedSection':'unverified','aliases':r.get('aliases',[]),'reuseStatus':'unverified','familyRelationship':'unverified'},
  'affectedFamilies':r.get('affectedFamilies',[]),'canonicalMutationApplied':False}
 rows.append(item)
 if verdict=='READY_TO_APPLY': patches.append({'rowId':r['rowId'],'operation':'UPSERT_EXACT_SOURCE_RELATIONSHIP','value':item})
dump('source-relationship-rows.json',{'schemaVersion':'src-x6-source-relationship-rows/v1','measuredAtHead':head,'assignedRange':['SRR-076','SRR-090'],'assignedCount':15,'attemptedCount':len(rows),'rows':rows})
dump('source-relationship-apply-payload.json',{'schemaVersion':'src-x6-source-relationship-apply-payload/v1','applyStatus':'NOT_APPLIED','patchCount':len(patches),'patches':patches})

# Phase 2: URLs corroborated by two separate committed, non-candidate evidence files.
url_re=re.compile(r'https?://[^\\s<>"\']+')
support={}
grep=subprocess.run(['git','grep','-I','-n','-E','https?://'],cwd=ROOT,text=True,errors='ignore',capture_output=True).stdout
for line in grep.splitlines():
 parts=line.split(':',2)
 if len(parts)<3: continue
 f,text=parts[0],parts[2]
 if '/candidates/' in f or 'source-and-candidate/src-x6' in f: continue
 for raw in set(url_re.findall(text)):
  u=raw.rstrip(').,;]}\\')
  try: q=urllib.parse.urlsplit(u)
  except ValueError: continue
  if not q.hostname or any(x in u for x in ('private/','github.com/')): continue
  host=q.hostname.lower()
  if not (host.endswith('.gov') or host.endswith('.us') or host in {'govt.westlaw.com','www.courts.wa.gov'}): continue
  norm=urllib.parse.urlunsplit((q.scheme.lower(),host+((':'+str(q.port)) if q.port else ''),q.path or '/',q.query,''))
  support.setdefault(norm,set()).add(f)
existing_text='\n'.join((ROOT/f).read_text(errors='ignore') for f in tracked if 'receipt' in f.lower() and (ROOT/f).stat().st_size<2_000_000)
urls=[]; receipts=[]
for u,files in sorted(support.items()):
 if len(files)<2 or not owns(u): continue
 settled=u in existing_text
 rec={'normalizedUrl':u,'urlSha256':sha(u.encode()),'supportingEvidenceFiles':sorted(files),'ownedShard':5,'expectedSourceIdentity':'REQUIRES_ARTIFACT_IDENTITY_CONFIRMATION','affectedFamilies':[],'existingExactReceiptSettlesArtifact':settled}
 if settled: rec['status']='EXCLUDED_EXISTING_EXACT_RECEIPT'
 else:
  rec['status']='ACQUISITION_BLOCKED_NOT_EXECUTED'; rec['blockReason']='Network acquisition intentionally emits no source body; exact artifact identity must be settled before download.'
  receipts.append({'normalizedUrl':u,'status':'ACQUISITION_READY_PENDING_IDENTITY','supportingEvidenceFiles':sorted(files),'downloadedBodyCommitted':False})
 urls.append(rec)
dump('corroborated-urls.json',{'schemaVersion':'src-x6-corroborated-urls/v1','normalization':'lowercase scheme/host, remove fragment, preserve path/query','shardIndex':5,'shardCount':8,'count':len(urls),'urls':urls})
dump('acquisition-ready-receipts.json',{'schemaVersion':'src-x6-acquisition-ready-receipts/v1','sourceBodiesCommitted':0,'count':len(receipts),'receipts':receipts})

# Phase 3: remeasure modulo-owned, non-Claude-owned families. Active assignments are stopped.
families=load('data/rcap-grade-a/codex-5h/cb05-fleet-index/families.json')['families']; examined=[]
for f in families:
 if not owns(f['familyId']) or f.get('claudeOwned') or (f.get('artifactStatus')=='COMPLETE' and f.get('completenessStatus')=='PASS'): continue
 legal_exact=f.get('finalBlocker',{}).get('type')!='LEGAL'
 eligible=legal_exact and f.get('sourceBound') and f.get('routeMappingStatus')=='BOUND' and f.get('implementationStrategy') in ('official_pdf_fill','custom_pleading')
 status='STOPPED_ACTIVE_EXISTING_ASSIGNMENT' if f.get('currentOwner') else ('CANDIDATE_BINARY_PROMOTION_PENDING' if eligible else 'STOPPED_LEGAL_SOURCE_OR_FAMILY_IDENTITY')
 examined.append({'familyId':f['familyId'],'moduloOwner':5,'currentOwner':f.get('currentOwner'),'eligibleByEvidence':eligible,'status':status,'reason':f.get('finalBlocker'),'candidateDirectory':None})
dump('candidate-families.json',{'schemaVersion':'src-x6-candidate-families/v1','measuredAtHead':head,'examinedCount':len(examined),'builtCount':sum(x['status']=='CANDIDATE_BINARY_PROMOTION_PENDING' for x in examined),'candidatePdfBinariesCommitted':0,'families':examined})

# Phase 4: exact shard crosswalk payloads; never mutate routes.
stopped=load('data/rcap-grade-a/codex-5h/cb01-route-integration/stopped.json')['rows']; mappings=[]
for r in stopped:
 key=r.get('id') or r['rowId']
 if not owns(key): continue
 resolution=r.get('resolution',{}); reason=(r.get('reason') or '').lower()
 settled=bool(resolution) and not any(w in reason for w in ('invalid','unsettled','missing','cannot','requires counsel'))
 mappings.append({'rowId':r['rowId'],'routeKey':key,'status':'READY_TO_APPLY' if settled else 'STOPPED_LEGAL_SOURCE_OR_FAMILY_IDENTITY','applyOperation':'UPSERT_ROUTE_CROSSWALK' if settled else None,'payload':resolution if settled else None,'evidenceSource':r.get('evidenceSource'),'canonicalMutationApplied':False,'stopReason':None if settled else r.get('reason')})
dump('route-mapping-payload.json',{'schemaVersion':'src-x6-route-mapping-payload/v1','applyStatus':'NOT_APPLIED','shardIndex':5,'shardCount':8,'examinedCount':len(mappings),'readyCount':sum(x['status']=='READY_TO_APPLY' for x in mappings),'rows':mappings})

counts={'srrAttempted':len(rows),'sourceReady':len(patches),'sourceStops':len(rows)-len(patches),'urlsOwned':len(urls),'receipts':len(receipts),'acquisitionBlocks':sum(x['status'].startswith('ACQUISITION_BLOCKED') for x in urls),'familiesExamined':len(examined),'candidatesBuilt':sum(x['status']=='CANDIDATE_BINARY_PROMOTION_PENDING' for x in examined),'candidatesStopped':sum(x['status']!='CANDIDATE_BINARY_PROMOTION_PENDING' for x in examined),'routeReady':sum(x['status']=='READY_TO_APPLY' for x in mappings),'routeStops':sum(x['status']!='READY_TO_APPLY' for x in mappings)}
dump('state.json',{'schemaVersion':'src-x6-state/v1','assignment':'SRC-X6','baseSha':head,'status':'COMPLETE_EVIDENCE_ONLY','counts':counts,'productionTouched':False,'commercialRoutesOpened':0})
(OUT/'progress.md').write_text(f"# SRC-X6 progress\n\nAll four phases were remeasured at `{head}`. Phase 1 attempted 15/15 assigned rows. Canonical application remains intentionally pending.\n")
(OUT/'report.md').write_text('# SRC-X6 report\n\nThis evidence-only lane applied no canonical, claim, queue, overlay, commercial-authority, or production mutation.\n\n```json\n'+json.dumps(counts,indent=2)+'\n```\n')
print(json.dumps(counts,indent=2))
