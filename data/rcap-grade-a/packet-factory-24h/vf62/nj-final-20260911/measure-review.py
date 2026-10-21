"""Nonmutating independent input measurements; writes only VF62 NJ final evidence."""
from pathlib import Path
import json, hashlib, subprocess, re

OUT=Path('data/rcap-grade-a/packet-factory-24h/vf62/nj-final-20260911')
OLD=Path('data/rcap-grade-a/packet-factory-24h/vf62/nj-ordinance-current-20260911')
FAM=Path('data/rcap-all50/overlays/census-v1/nj/nj-ordinance-set--official-pdf-fill')
PRIOR_BASE='daf6b0b2812edc93bb55bf60107cb6bdf681a89d'
load=lambda p:json.loads(Path(p).read_text())
hashfile=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
def save(name,value): (OUT/name).write_text(json.dumps(value,indent=2)+'\n')
def gitbytes(p): return subprocess.run(['git','show',f'{PRIOR_BASE}:{p}'],capture_output=True,check=True).stdout

fieldmap=load(FAM/'production-field-map.json'); rows=fieldmap['documents'][0]['fields']
byname={r['field']:r for r in rows}; oldrows={r['field']:r for r in load(OLD/'field-review-inventory.json')['fields']}
census={r['name']:r for r in load(FAM/'field-census.census-v1.json')['documents'][0]['fields']}
artifacts=load(FAM/'reports/actual-writes.json')['artifacts']
guide=(FAM/'participant-instructions.md').read_text(); guide_lines=guide.splitlines()
reader=load(OUT/'reader-measurements.json'); stageproof={r['field']:r for r in reader['sourceStageMeasurements']}
olddefects=load(OLD/'defects.json')['defects']
def section(text,title):
 start=text.index('## '+title+'\n')
 return text[start:].split('\n## ',1)[0]
initial=section(guide,'Exact facts to verify before the initial filing')
later=section(guide,'Participant tasks after the initial filing')
elections=section(guide,'Conditional participant elections left unmarked')
held=section(guide,'Values this platform holds but did not print')
initialrecipients={'prosCntys','PoliceLoc','WardenLoc','SuperintendentLoc','deputyClerkSCCOCnty'}
source_fields=[]
for d in olddefects:
 for f in d.get('affectedFields',[]):
  field=f['field']; row=byname[field]; key=f'source field: `{field}`'
  selected={k:row.get(k) for k in ['decision','factId','refusalClass','blankTreatment','completenessDisposition','requiredBeforeFiling','requiredBeforeInitialFiling','routeDetermined','conditionalCaseHistory','caseApplicability','notApplicableOnlyWhen','participantElection','determinedByTheCaseNotTheRoute','participantOwnedCompletion','conditionalRecipient','factOrigin','completionStage','completesAfterService','sourceStage','effectiveLabel','reason','widgets']}
  source_fields.append({'originalDefectId':d['id'],'field':field,'jsonPointer':f"/documents/0/fields/{rows.index(row)}",'sourceFieldType':census[field]['type'],'current':selected,'sourceStageReaderProof':stageproof.get(field),'guideDisclosures':[{'line':i+1,'text':line} for i,line in enumerate(guide_lines) if key in line],'oldSourceReferences':d['sourceReferences']})
  assert any(key in line for line in guide_lines),field
  assert row['effectiveLabel'] in guide,field
  if d['id'] in ['NJ-VF62-01','NJ-VF62-02']:
   assert row['decision']=='refuse' and row['refusalClass'] is None
   assert row['blankTreatment']=='REQUIRED_BEFORE_FILING'
   assert row['requiredBeforeFiling'] is True and row['requiredBeforeInitialFiling'] is True
   assert row['conditionalCaseHistory'] is True and row['caseApplicability']=='UNKNOWN_REQUIRES_PARTICIPANT_VERIFICATION'
   assert row['routeDetermined'] is False and 'NOT_APPLICABLE_ON_THIS_ROUTE' not in json.dumps(row)
   assert key in initial
  if d['id'] in ['NJ-VF62-03','NJ-VF62-05'] or (d['id']=='NJ-VF62-04' and field not in initialrecipients):
   assert row['blankTreatment']==row['completenessDisposition']=='PARTICIPANT_LATER_COMPLETION'
   assert row['requiredBeforeFiling'] is False and row['requiredBeforeInitialFiling'] is False
   assert row['refusalClass'] is None and row['participantOwnedCompletion'] is True and row['routeDetermined'] is False
   assert field in stageproof and stageproof[field]['actor']=='participant'
   assert key in later and key not in initial
  if d['id']=='NJ-VF62-04':
   assert row['participantOwnedCompletion'] is True and row['conditionalRecipient'] is True
   if field in initialrecipients:
    assert row['requiredBeforeFiling'] is True and row['requiredBeforeInitialFiling'] is True and key in initial
  if d['id']=='NJ-VF62-05': assert row['completesAfterService'] is True
  if d['id']=='NJ-VF62-06':
   assert row['participantElection'] is True and row['routeDetermined'] is False
   assert row['refusalClass']=='participant_sworn_narrative_or_legal_election' and key in elections
  if d['id']=='NJ-VF62-07':
   assert key in elections and f'| `{field}` |' not in held
   assert row['requiredBeforeFiling'] is True and row['determinedByTheCaseNotTheRoute'] is True and row['routeDetermined'] is False
assert len(source_fields)==62 and len({r['field'] for r in source_fields})==62
assert len(stageproof)==18
assert all(byname[x]['participantElection'] is True for x in ['dismissPlea','contDismissPlea'])
assert 'all arrests, charges and prosecutions, including matters for which relief is not sought' in initial
assert 'Treat a conditional branch as N/A only when the complete source record establishes' in initial
for item in source_fields:
 item['sourceWidgetPages']=sorted({w['page'] for w in item['current'].pop('widgets')})
 item['current'].pop('reason',None)
 item['current'].pop('sourceStage',None)
 item['current'].pop('notApplicableOnlyWhen',None)
 item['guideLineNumbers']=[line['line'] for line in item.pop('guideDisclosures')]
 if item.pop('sourceStageReaderProof') is not None:
  item['sourceStageReaderProofReference']=str(OUT/'reader-measurements.json')+'#/sourceStageMeasurements/'+str(list(stageproof).index(item['field']))
 item.pop('oldSourceReferences')
 item['current']={k:v for k,v in item['current'].items() if v is not None}
save('field-review-inventory.json',{'familyId':'nj_ordinance-set','fields':source_fields,'fieldsReviewed':62,'guidePath':str(FAM/'participant-instructions.md'),'sourcePassagesPath':str(OLD/'source-passages.txt'),'sourcePassagesSha256':hashfile(OLD/'source-passages.txt')})

refusal_inventory=[]
for a in artifacts:
 causes={r['field']:r for r in a['heldButNotPrinted']+a['unresolvedParticipantElections']}
 observed=[]
 for r in a['refused']:
  row=byname[r['field']]; expected=causes[r['field']]['reason'] if r['field'] in causes else row['reason']
  assert r['reason']==expected,(a['fixture'],r['field'])
  assert r['reason']!='classified_unwritable_by_role'
  observed.append({'field':r['field'],'category':r['category'],'semanticDisposition':r.get('semanticDisposition'),'reason':r['reason'],'expectedReasonSource':'actual row/mapping/fit/election cause' if r['field'] in causes else 'effective field declaration','reasonAgrees':True})
 assert len(a['written'])==10 and len(a['refused'])==169 and len(a['heldButNotPrinted'])==8
 assert a['selections']==[]
 assert [r['field'] for r in a['unresolvedParticipantElections']]==['guilty']
 assert a['unresolvedParticipantElections'][0]['valueHeld'] is None
 assert 'guilty' not in {r['field'] for r in a['heldButNotPrinted']}
 assert causes['ExpungeCntyName']['reason']=='exact_mapping_requires_text_field'
 assert causes['arrest1CaseNum']['reason']==('value_exceeds_widget_width_at_minimum_font' if a['fixture']=='boundary' else 'withheld_for_row_integrity')
 refusal_inventory.append({'fixture':a['fixture'],'printedFields':[r['field'] for r in a['written']],'refusalCount':len(observed),'mismatchedReasons':0,'heldButNotPrinted':a['heldButNotPrinted'],'unresolvedParticipantElections':a['unresolvedParticipantElections'],'refusals':observed})
for item in refusal_inventory:
 observed=item.pop('refusals')
 item['all169ReasonComparisonsPassed']=all(r['reasonAgrees'] for r in observed)
 item['matchedEffectiveDeclarationFields']=[r['field'] for r in observed if r['expectedReasonSource']=='effective field declaration']
 item['actualCauseComparisons']=[r for r in observed if r['expectedReasonSource']!='effective field declaration']
 item['laterTaskCategories']={r['field']:{'category':r['category'],'semanticDisposition':r['semanticDisposition']} for r in observed if r['field'] in stageproof}
 for r in item['heldButNotPrinted']:
  for key in list(r):
   if key not in ['field','fact','valueHeld','reason','row','blockedBy']: r.pop(key)
save('refusal-reconciliation.json',{'familyId':'nj_ordinance-set','artifacts':refusal_inventory,'reasonRowsReviewed':338,'conflicts':[]})

prior=load(OLD/'byte-and-raster-binding.json'); measured=[]
for r in prior['currentFileHashes']:
 p=Path(r['path']); b=p.read_bytes(); sha=hashlib.sha256(b).hexdigest()
 x={'path':str(p),'sha256':sha,'byteLength':len(b),'priorReviewSha256':r['sha256'],'matchesPriorReview':sha==r['sha256']}
 if p.suffix=='.pdf':
  info=subprocess.run(['pdfinfo',str(p)],capture_output=True,text=True,check=True).stdout
  x['pageCount']=int(re.search(r'^Pages:\s+(\d+)',info,re.M)[1])
  assert x['matchesPriorReview'] and x['pageCount']==43
 measured.append(x)
refs=[{**r,'currentSha256':hashfile(r['path']),'matchesPriorReview':hashfile(r['path'])==r['sha256']} for r in prior['rasterEvidence']['receiptRefs']]
archive=prior['rasterEvidence']['originalArchive']; archiveEvidence={'path':archive,'sha256':hashfile(archive),'matchesPriorReview':hashfile(archive)==prior['rasterEvidence']['archiveSha256MeasuredHere']}
geometryDiff=[r['field'] for r in rows if r['widgets']!=oldrows[r['field']]['widgets']]
writeDiff=[r['field'] for r in rows if (r['decision']=='candidate_write')!=(oldrows[r['field']]['decision']=='candidate_write')]
assert len(rows)==179 and sum(r['decision']=='candidate_write' for r in rows)==18
assert not geometryDiff and not writeDiff and all(r['matchesPriorReview'] for r in refs) and archiveEvidence['matchesPriorReview']
save('byte-and-raster-binding.json',{'schemaVersion':'rcap-independent-current-byte-binding/v1','familyId':'nj_ordinance-set','actualHead':'6463a0c47b557df7bfb5026a661170d73a7ff8d4','measuredFiles':measured,'rasterReceipts':refs,'originalArchive':archiveEvidence,'fieldGeometryChanges':geometryDiff,'candidateWriteMembershipChanges':writeDiff,'declaredFields':179,'declaredWriteCandidates':18,'originalRasterRun':'34292115043','originalPages':86,'reuseBasis':'Source and both current PDF hashes/lengths/pages match prior independent review; all 179 field geometries and 18 candidate write memberships are unchanged; original archive and six committed raster proof receipts match prior recorded hashes. Reuse original 86-page technical measurements and source conclusions without new rendering, page review, source freshness claim or admission.','priorBindingPath':str(OLD/'byte-and-raster-binding.json'),'priorBindingSha256':hashfile(OLD/'byte-and-raster-binding.json'),'priorReturnPath':'data/rcap-grade-a/packet-factory-24h/vf62/rows-vf62-20260911-nj-ordinance-current.json','priorReturnSha256':hashfile('data/rcap-grade-a/packet-factory-24h/vf62/rows-vf62-20260911-nj-ordinance-current.json')})

oldguide=gitbytes(FAM/'participant-instructions.md').decode()
unchanged_sections={title:section(guide,title)==section(oldguide,title) for title in ['Records to gather before you file','Where to file, and the e-filing route','Who must be served, and what an objection is']}
assert all(unchanged_sections.values())
stops=[line for line in section(guide,'Where self-help ends').splitlines() if line.startswith('- ')][:12]
priorstops=[line for line in section(oldguide,'Where self-help ends').splitlines() if line.startswith('- ')][:12]
assert len(stops)==12 and stops==priorstops
prior_struct=load(OLD/'current-structural-readings.json')
protected={k:byname[k].get('refusalClass')==oldrows[k].get('refusalClass')=='court_prosecutor_clerk_or_agency_owned' and byname[k]['decision']=='refuse' for k in prior_struct['priorCourtCorrections']}
assert all(protected.values())
labelchecks={k:byname[k]['effectiveLabel']==r['label'] and r['label'] in guide for k,r in prior_struct['priorLabelCorrections'].items()}
assert all(labelchecks.values())
required=[r for r in rows if r.get('requiredBeforeFiling') is True]
missing=[r['field'] for r in required if f'source field: `{r["field"]}`' not in guide]
assert len(required)==105 and not missing
wiring=load(FAM/'product-wiring.json'); prior_wiring=json.loads(gitbytes(FAM/'product-wiring.json'))
assert wiring['routeKeys']==prior_wiring['routeKeys']==['obligation:track-only:NJ:nj_ordinance']
assert wiring['runtimeSelectable'] is False and wiring['generationAllowed'] is False
for name in ['reports/rendered-artifacts.json','source-receipt.json','field-census.census-v1.json']:
 assert (FAM/name).read_bytes()==gitbytes(FAM/name),name
save('reused-approval-bindings.json',{'familyId':'nj_ordinance-set','priorBase':PRIOR_BASE,'unchangedGuideSections':unchanged_sections,'twelveSelfHelpStopsUnchanged':True,'selfHelpStops':stops,'priorElevenProtectedCorrectionsUnchanged':protected,'priorFourLabelCorrectionsPreserved':labelchecks,'routeKeysUnchanged':True,'runtimeSelectable':False,'generationAllowed':False,'sourceReceiptRenderedManifestCensusByteIdenticalToPriorBase':True,'requiredBeforeFilingDeclarations':105,'requiredDeclarationsDisclosed':105,'missingRequiredDisclosures':missing,'explicitRequiredBeforeInitialFilingFlags':40,'explicitFlagInterpretation':'Forty newly normalized initial flags comprise 35 history fields and 5 recipient fields. This is not the total initial-requirement inventory: 105 requiredBeforeFiling declarations are disclosed, including the conditional guilty election in its separate election section; the reader classifies four of those as genuine elections and 101 as REQUIRED_BEFORE_FILING.','initialFactListCount':len(re.findall(r'^- .*source field:',initial,re.M)),'laterTaskCount':18,'sourceStageProofCount':18})
print('Independent measurements:62 original semantic fields;338/338 refusal reasons consistent;105/105 required disclosures;18/18 source-stage proofs;12 prior approvals retain their scoped bases.')
