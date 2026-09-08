#!/usr/bin/env python3
"""Reproduce only the retained destruction guide's exact source-anchor repair."""
import hashlib
import json
from pathlib import Path
import subprocess

OUT=Path(__file__).resolve().parent
record=json.loads((OUT/'source-only-input-verification.json').read_text())
inventory=record['inventory'];family=inventory['familyId'];route=inventory['routeKeys'][0]
sha=lambda b:hashlib.sha256(b).hexdigest()
canonical=lambda o:json.dumps(o,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
show=lambda commit,path:subprocess.check_output(['git','show',commit+':'+path])
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
census='data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json'
counsel='data/rcap-ledger/completed-output-counsel-manifest.json'
old_census=show('21d53521ff4d6a1dd24f9d5fb0fd56a6258a6f14',census)
old_counsel=show('eab70f9265c837929c0b73fc208e6c5c1db80670',counsel)
assert sha(old_census)=='9816a479e532017f630e8847e23e709a1b3efc2e554e211edb11cc2ebc0743c1'
assert sha(old_counsel)=='99e8029120d705df8970d0deba651a95b00f4b81097c46a28ac8d0e128f8c93c'
comparisons=[]
for path,old_bytes in [(census,old_census),(counsel,old_counsel)]:
    current=Path(path).read_bytes();assert current==show(head,path)
    old,new=json.loads(old_bytes),json.loads(current)
    if path==census:
        left=[r for r in old['routes']if r['routeKey']==route]
        right=[r for r in new['routes']if r['routeKey']==route]
        assert len(left)==len(right)==1
        anchors={'exactFullRouteObject':(left[0],right[0])}
    else:
        left=[r for r in old['families']if r['familyId']=='rcap-ct-guidance-implementation']
        right=[r for r in new['families']if r['familyId']=='rcap-ct-guidance-implementation']
        assert len(left)==len(right)==1 and 'ct-destruction-request'in left[0]['tracksServed']
        anchors={
          'exactFullCtCounselFamily':(left[0],right[0]),
          'globalAuthority':({k:v for k,v in old.items()if k not in ['families','exceptions']},{k:v for k,v in new.items()if k not in ['families','exceptions']}),
          'applicableExceptions':({k:v for k,v in old['exceptions'].items()if k!='pathwaysWithNoFamilyBridge'},{k:v for k,v in new['exceptions'].items()if k!='pathwaysWithNoFamilyBridge'}),
        }
    for name,(before,after)in anchors.items():
        assert before==after,name
        comparisons.append(dict(source=path,anchor=name,oldWholeSourceSha256=sha(old_bytes),currentWholeSourceSha256=sha(current),identicalAnchorSha256=sha(canonical(after)),unchanged=True))

receipt_path=Path(inventory['directory'])/'source-receipt.json'
receipt=json.loads(receipt_path.read_text());pins=[]
for pin in receipt['compositionSources']:
    current=Path(pin['path']).read_bytes()
    assert sha(current)==pin['sha256'] and len(current)==pin['byteLength'] and current==show(head,pin['path'])
    pins.append(dict(path=pin['path'],sha256=sha(current),byteLength=len(current),currentAndCommittedMatch=True))
assert len(pins)==4
original_path=inventory['originalIndependentReview']['path']
original_doc=json.loads(Path(original_path).read_text())
original=next(r for r in original_doc['rows']if r.get('itemId',r.get('familyId'))==family and r.get('verifiedAtBase')==inventory['originalIndependentReview']['verifiedAtBase'])
assert sha(canonical(original))==inventory['originalIndependentReview']['rowSha256']
historical_queue_path='data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json'
historical_queue=json.loads(show(inventory['originalIndependentReview']['verifiedAtBase'],historical_queue_path))
historical_row=next(r for r in historical_queue['rows']if r['familyId']==family)
for pdf in record['pdfs']:
    fixture=Path(pdf['path']).stem
    assert historical_row[fixture+'PdfSha256']==pdf['sha256']
    assert sha(show(historical_row['rasterReceipt']['renderedCommitSha'],pdf['path']))==pdf['sha256']
historical_receipt=dict(recordedAtCommit=inventory['originalIndependentReview']['verifiedAtBase'],queuePath=historical_queue_path,
    queueRowSha256=sha(canonical(historical_row)),receipt=historical_row['rasterReceipt'],
    scope='Historical queue records canonical-only coverage and both PDF pins. Its own receipt says its ZIP/PNGs were not downloaded there. This reviewer neither downloads nor re-renders them, and does not claim a new two-page central acceptance.')
(OUT/'historical-raster-scope.json').write_text(json.dumps(historical_receipt,indent=2)+'\n')
review=dict(schemaVersion='rcap-independent-source-only-closure/v1',reviewer='/root/session10_admission_review',
    familyId=family,observedHead=head,candidateCommit=inventory['candidateCommit'],priorReview=inventory['originalIndependentReview'],
    sourceAnchorComparisons=comparisons,currentCompositionSources=pins,
    priorFailedFinding=original['proofObligations']['SOURCE_IDENTITY'],priorFailedFindingSha256=inventory['priorFindings'][0]['priorFindingSha256'],
    originalReviewFindingPreserved=True,sourceIdentityNowExact=True,newLegalConclusion=False,
    originalVisualReuse=dict(base=inventory['originalIndependentReview']['verifiedAtBase'],obligation='CLIPPING_AND_OVERLAP',result=original['proofObligations']['CLIPPING_AND_OVERLAP']['result'],
      evidence=original['proofObligations']['CLIPPING_AND_OVERLAP']['evidence'],pdfs=record['pdfs'],unchangedReviewedFiles=inventory['unchangedOriginalOutputs'],
      scope='Reuse only the later VF03 one-page-per-fixture review on identical guide, instructions, field map, builder and artifact-report bytes. The earlier two-page split failure remains historically superseded by VF03, not relabeled here.'),
    treatmentFinding='The unchanged controlling CT memo limits this route to preparation guidance until counsel confirms the accepted written-request destination and format. The exact retained guide tells the participant to confirm prior erasure, timing and clerk requirements; it explicitly does not draft or submit the later request.',
    activeOwnershipObserved='FIX106 remains recorded in MASTER_QUEUE; this reviewer changes no claim, assignment or ownership record.',
    runtimeInstalled=False,participantRequestDischarged=False,commercialAuthority=False,sharedFilesEdited=False,newVisualInspection=False,newRasterCreated=False)
(OUT/'independent-source-closure.json').write_text(json.dumps(review,indent=2)+'\n')
print(json.dumps(dict(sourceAnchorsCompared=len(comparisons),allUnchanged=True,currentSourcePins=len(pins),originalFinding='SOURCE_IDENTITY',visualEvidenceReusedFrom=inventory['originalIndependentReview']['verifiedAtBase'],newRaster=False)))
