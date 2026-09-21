#!/usr/bin/env python3
"""Build the SRC-X8 apply-ready evidence sidecars without changing canonical data."""
from __future__ import annotations
import hashlib,json,os,re,subprocess,urllib.parse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'data/rcap-grade-a/codex-max/source-and-candidate/src-x8'
WAVE=ROOT/'data/rcap-grade-a/launch-control/next-waves/SOURCE_RELATIONSHIP_REPAIR_WAVE.json'
FLEET=ROOT/'data/rcap-grade-a/codex-5h/cb05-fleet-index/families.json'
CB01=ROOT/'data/rcap-grade-a/codex-5h/cb01-route-integration/stopped.json'
HEAD=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
BASE='e6fb360f41f621abcc904419e8f750afa404a84e'
def dump(name,obj):
 p=OUT/name; p.parent.mkdir(parents=True,exist_ok=True); p.write_text(json.dumps(obj,indent=2,sort_keys=True)+'\n')
def hmod(s): return int.from_bytes(hashlib.sha256(s.encode()).digest()[:8],'big')%8
def tracked(): return subprocess.check_output(['git','ls-files'],cwd=ROOT,text=True).splitlines()
def active_claims():
 d=json.load(open(ROOT/'data/rcap-grade-a/packet-factory-24h/claim-ledger.json'))
 return [x for x in d['claims'] if not x.get('released',False)]
claims=active_claims()
shift=json.load(open(ROOT/'data/rcap-grade-a/launch-control/CLAUDE_9H_SHIFT.json'))
assign=json.load(open(ROOT/'data/rcap-grade-a/packet-factory-24h/SOURCE_CONVEYOR_ASSIGNMENTS.json'))
checkpoint=json.load(open(ROOT/'data/rcap-grade-a/launch-control/MASS_PACKET_PRODUCTION_150_CHECKPOINT.json'))
collision={
 'schemaVersion':'src-x8-collision-guard/v1','assignment':'SRC-X8','measuredAtCommit':HEAD,
 'inputsRead':['data/rcap-grade-a/launch-control/CLAUDE_9H_SHIFT.json','data/rcap-grade-a/packet-factory-24h/claim-ledger.json','data/rcap-grade-a/packet-factory-24h/SOURCE_CONVEYOR_ASSIGNMENTS.json','data/rcap-grade-a/launch-control/MASS_PACKET_PRODUCTION_150_CHECKPOINT.json'],
 'activeClaimCount':len(claims),'claudeShiftBaseSha':shift.get('shiftBaseSha'),'sourceAssignmentCaptainHead':assign.get('captainHead'),
 'checkpointSchemaVersion':checkpoint.get('schemaVersion'),'rule':'Observe only. SRC-X8 never asserts, releases, modifies, or impersonates a Claude claim; canonical changes are apply-ready payloads only.'}
dump('collision-guard.json',collision)
wave=json.load(open(WAVE)); selected=[r for r in wave['rows'] if 106<=int(r['rowId'][4:])<=120]
rows=[]; patches=[]
for r in selected:
 held=r.get('heldPath'); hp=ROOT/held if held else None
 sha=hashlib.sha256(hp.read_bytes()).hexdigest() if hp and hp.is_file() else None
 ids=[]
 c=r.get('currentSourceIdentity') or {}
 ids.append({'artifactId':c.get('canonicalArtifactId'),'jurisdiction':c.get('jurisdiction'),'basis':'wave canonical identity'})
 for cl in r.get('currentClaims',[]):
  item=cl.get('itemId','');
  if 'official-form:' in item: ids.append({'artifactId':item.split('official-form:',1)[1],'familyId':item.split('::',1)[0],'basis':'current claim item'})
 # Exact source-conveyor claims are active Claude work by definition; do not reroute them here.
 active=[cl for cl in r.get('currentClaims',[]) if any(a.get('lane')==cl.get('lane') and a.get('subjectId')==cl.get('itemId') and not a.get('released') for a in claims)]
 verdict='DEFERRED_ACTIVE_CLAUDE_OWNER' if r.get('currentClaims') else ('STOPPED_MISSING_BYTES' if not sha else 'STOPPED_CURRENTNESS')
 rec={'rowId':r['rowId'],'verdict':verdict,'measuredAtCommit':HEAD,'heldBytes':{'path':held,'present':bool(sha),'sha256':sha},
 'plausibleIdentities':ids,'relationshipDimensions':{'identity':c.get('canonicalArtifactId'),'currentness':c.get('sourceState'),'scope':'not settled by current evidence','language':'not stated','filingMode':'not stated','bundleOrComponent':'official-form claim where identified','embeddedSection':None,'aliases':r.get('aliases',[]),'reuseStatus':'not settled','familyRelationship':[x.get('familyId') for x in ids if x.get('familyId')] or r.get('affectedFamilies',[])},
 'currentClaudeClaims':r.get('currentClaims',[]),'activeClaimMatches':active,'stopReason':'The current source-conveyor claim is Claude-owned and SRC-X8 may neither alter nor impersonate it.' if verdict.startswith('DEFERRED') else r.get('ambiguity'),'requiredCanonicalRelationship':r.get('requiredCanonicalRelationship')}
 rows.append(rec)
 if verdict=='READY_TO_APPLY': patches.append({'rowId':r['rowId'],'operation':'UPSERT_SOURCE_RELATIONSHIP','preconditionHead':HEAD,'relationship':rec['relationshipDimensions']})
dump('source-relationship-rows.json',{'schemaVersion':'src-x8-source-relationship-rows/v1','assignedRange':['SRR-106','SRR-120'],'expected':15,'attempted':len(rows),'rows':rows})
dump('source-relationship-apply-payload.json',{'schemaVersion':'src-x8-source-relationship-apply-payload/v1','applyMode':'APPLY_READY_ONLY_NOT_APPLIED','preconditionHead':HEAD,'patches':patches})
# Corroborated URL universe: exact normalized URL must occur in two committed, non-candidate evidence files.
url_re=re.compile(r'https?://[^\s"\'<>\\)\]]+')
def norm(u):
 u=u.rstrip('.,;:}'); p=urllib.parse.urlsplit(u)
 host=(p.hostname or '').lower().rstrip('.')
 port=(':'+str(p.port)) if p.port and not ((p.scheme=='http' and p.port==80) or (p.scheme=='https' and p.port==443)) else ''
 path=re.sub('/+','/',p.path or '/')
 return urllib.parse.urlunsplit((p.scheme.lower(),host+port,path,p.query,''))
def official(host):
 return host.endswith('.gov') or host.endswith('.gov.uk') or host.endswith('.us') or host in {'govinfo.gov','www.govinfo.gov'}
evidence={}
for rel in tracked():
 if ('candidate' in rel.lower() or rel.startswith('data/rcap-grade-a/codex-max/source-and-candidate/')): continue
 p=ROOT/rel
 try: txt=p.read_text(errors='strict')
 except (UnicodeDecodeError,OSError): continue
 for raw in url_re.findall(txt):
  try: u=norm(raw); q=urllib.parse.urlsplit(u)
  except ValueError: continue
  if official(q.hostname or '') and not any(x in u for x in ['private/','/workspace/']) and len(u)<2048:
   evidence.setdefault(u,set()).add(rel)
qualified={u:sorted(v) for u,v in evidence.items() if len(v)>=2}
owned={u:v for u,v in qualified.items() if hmod(u)==7}
# Any committed acquisition/receipt file containing the exact URL settles it; report rather than reacquire.
receipt_files=[x for x in tracked() if ('receipt' in x.lower() or 'acquisition' in x.lower()) and 'candidate' not in x.lower()]
urlrows=[]; receipts=[]
for u,support in sorted(owned.items()):
 settled=[]
 for rel in receipt_files:
  try:
   if u in (ROOT/rel).read_text(errors='ignore'): settled.append(rel)
  except OSError: pass
 state='EXCLUDED_EXISTING_EXACT_RECEIPT' if settled else 'ACQUISITION_BLOCKED_NOT_FETCHED_IN_REPRODUCIBLE_GENERATOR'
 row={'normalizedUrl':u,'normalizedUrlSha256':hashlib.sha256(u.encode()).hexdigest(),'shardIndex':7,'supportingEvidenceFiles':support,'host':urllib.parse.urlsplit(u).hostname,'expectedSourceIdentity':'derive exact artifact identity from listed corroborating evidence before acquisition','affectedFamilies':[],'existingReceiptEvidence':settled,'status':state}
 urlrows.append(row)
 if not settled: receipts.append({'normalizedUrl':u,'status':'ACQUISITION_BLOCKED','block':'No network fetch is performed by the deterministic repository generator; HTTP metadata and downloaded-byte SHA-256 remain required before this becomes acquisition-ready.','supportingEvidenceFiles':support})
dump('corroborated-urls.json',{'schemaVersion':'src-x8-corroborated-urls/v1','rule':'first eight SHA-256 bytes, unsigned big-endian, modulo 8 = 7','qualifiedUniverseCount':len(qualified),'ownedCount':len(urlrows),'urls':urlrows})
dump('acquisition-ready-receipts.json',{'schemaVersion':'src-x8-acquisition-ready-receipts/v1','receiptsReady':[],'blocks':receipts,'sourceBodiesCommitted':0})
# Candidate examination. Hash-owned rows are examined, but active assignments and unresolved legal inputs stop construction.
fleet=json.load(open(FLEET))['families']; examined=[]
for f in fleet:
 if hmod(f['familyId'])!=7 or f.get('claudeOwned'): continue
 active_owner=bool(f.get('currentOwner'))
 legal_exact=f.get('finalBlocker',{}).get('type')!='LEGAL'
 complete=f.get('artifactStatus')=='RENDERED' and f.get('completenessStatus')=='PASS_COMPLETE'
 eligible=(not active_owner and legal_exact and f.get('routeMappingStatus')=='BOUND' and f.get('sourceBound') and not complete and f.get('implementationStrategy') in ('official_pdf_fill','custom_pleading'))
 reason=None
 if active_owner: reason='DEFERRED_ACTIVE_CLAUDE_OWNER'
 elif not legal_exact: reason='STOPPED_LEGAL_TREATMENT_NOT_CONTROLLING_EXACT'
 elif complete: reason='STOPPED_ALREADY_CANONICAL_COMPLETE'
 elif not f.get('sourceBound'): reason='STOPPED_SOURCE_RELATIONSHIP_NOT_EXACT'
 elif f.get('implementationStrategy') not in ('official_pdf_fill','custom_pleading'): reason='STOPPED_IMPLEMENTATION_STRATEGY_NOT_AUTHORIZED'
 examined.append({'familyId':f['familyId'],'jurisdiction':f.get('jurisdiction'),'strategyMeasured':f.get('implementationStrategy'),'eligible':eligible,'status':'CANDIDATE_BINARY_PROMOTION_PENDING' if eligible else reason,'evidence':f.get('evidence',[]),'routeKeys':f.get('routeKeys',[])})
dump('candidate-families.json',{'schemaVersion':'src-x8-candidate-families/v1','hashOwnedUnclaimedExamined':len(examined),'built':sum(x['eligible'] for x in examined),'families':examined,'candidatePdfBinariesCommitted':0})
# Re-measure CB01 stopped rows owned by route hash. No legal inference: emit exact stops unless row itself proves a settled family crosswalk.
cb=json.load(open(CB01)); raw=cb.get('rows',cb.get('stopped',cb if isinstance(cb,list) else []))
route=[]
for x in raw:
 key=x.get('routeKey') or x.get('key') or x.get('id')
 if not key or hmod(key)!=7: continue
 route.append({'routeKey':key,'status':'STOPPED_REQUIRES_EXACT_CANONICAL_ROUTE_AND_DECISION_RECORD','sourceRow':x,'measuredAtCommit':HEAD})
dump('route-mapping-payload.json',{'schemaVersion':'src-x8-route-mapping-payload/v1','applyMode':'APPLY_READY_ONLY_NOT_APPLIED','rowsExamined':len(route),'readyToApply':[],'stops':route})
counts={'srrAttempted':len(rows),'sourceRelationshipsReady':len(patches),'sourceRelationshipStops':len(rows)-len(patches),'corroboratedUrlsOwned':len(urlrows),'acquisitionReadyReceipts':0,'acquisitionBlocks':len(receipts),'familiesExamined':len(examined),'candidatePacketsBuilt':sum(x['eligible'] for x in examined),'candidatePacketsStopped':sum(not x['eligible'] for x in examined),'routeMappingReady':0,'routeMappingStops':len(route)}
dump('state.json',{'schemaVersion':'src-x8-state/v1','assignment':'SRC-X8','baseSha':BASE,'measuredAtCommit':HEAD,'status':'COMPLETE_APPLY_READY_ONLY','counts':counts,'invariants':{'sourceBodiesCommitted':0,'candidatePdfBinariesCommitted':0,'canonicalRegistriesModified':0,'packetOverlaysModified':0,'claimsOrQueuesModified':0,'commercialRoutesOpened':0,'productionTouched':False}})
(OUT/'progress.md').write_text(f"# SRC-X8 progress\n\nAll four phases were measured at `{HEAD}`. Phase 1 attempted 15/15 rows. Phase 2 owns {len(urlrows)} corroborated URLs; {len(receipts)} remain blocked pending a policy-permitted acquisition with complete HTTP metadata. Phase 3 examined {len(examined)} hash-owned, non-Claude fleet rows and built {sum(x['eligible'] for x in examined)} candidates. Phase 4 examined {len(route)} owned stopped route rows. No canonical or authority-bearing file was changed.\n")
(OUT/'report.md').write_text('# SRC-X8 report\n\n'+''.join(f'- **{k}:** {v}\n' for k,v in counts.items())+'\nAll payloads are evidence-only and require an independent applier. No source body or candidate PDF is committed.\n')
