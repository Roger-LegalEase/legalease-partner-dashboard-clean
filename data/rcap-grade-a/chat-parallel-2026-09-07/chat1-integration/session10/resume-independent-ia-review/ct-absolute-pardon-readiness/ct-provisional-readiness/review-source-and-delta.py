#!/usr/bin/env python3
"""Independent exact source repair and observed current four-page delta record."""
import hashlib,json,subprocess
from pathlib import Path
OUT=Path(__file__).resolve().parent
record=json.loads((OUT/'input-and-receipt-audit.json').read_text());inventory=record['inventory'];family=inventory['familyId'];route=inventory['routeKeys'][0]
sha=lambda b:hashlib.sha256(b).hexdigest()
canonical=lambda o:json.dumps(o,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
show=lambda commit,path:subprocess.check_output(['git','show',commit+':'+path])
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
census='data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json';counsel='data/rcap-ledger/completed-output-counsel-manifest.json'
comparisons=[]
for path,old_bytes in [(census,show(inventory['originalIndependentReview']['verifiedAtBase'],census)),(counsel,show('eab70f9265c837929c0b73fc208e6c5c1db80670',counsel))]:
 current=Path(path).read_bytes();assert current==show(head,path)
 old,new=json.loads(old_bytes),json.loads(current)
 if path==census:
  left=[r for r in old['routes']if r['routeKey']==route];right=[r for r in new['routes']if r['routeKey']==route];assert len(left)==len(right)==1
  anchors={'exactFullRouteObject':(left[0],right[0])}
 else:
  assert sha(old_bytes)=='99e8029120d705df8970d0deba651a95b00f4b81097c46a28ac8d0e128f8c93c'
  left=[r for r in old['families']if r['familyId']=='rcap-ct-guidance-implementation'];right=[r for r in new['families']if r['familyId']=='rcap-ct-guidance-implementation'];assert len(left)==len(right)==1 and 'ct-provisional-pardon'in left[0]['tracksServed']
  anchors={'exactFullCtCounselFamily':(left[0],right[0]),'globalAuthority':({k:v for k,v in old.items()if k not in ['families','exceptions']},{k:v for k,v in new.items()if k not in ['families','exceptions']}),'applicableExceptions':({k:v for k,v in old['exceptions'].items()if k!='pathwaysWithNoFamilyBridge'},{k:v for k,v in new['exceptions'].items()if k!='pathwaysWithNoFamilyBridge'})}
 for name,(before,after)in anchors.items():
  assert before==after,name
  comparisons.append(dict(source=path,anchor=name,oldWholeSourceSha256=sha(old_bytes),currentWholeSourceSha256=sha(current),identicalAnchorSha256=sha(canonical(after)),unchanged=True))
receipt=json.loads((Path(inventory['directory'])/'source-receipt.json').read_text());pins=[]
for pin in receipt['compositionSources']:
 b=Path(pin['path']).read_bytes();assert sha(b)==pin['sha256'] and len(b)==pin['byteLength'] and b==show(head,pin['path'])
 pins.append(dict(path=pin['path'],sha256=sha(b),byteLength=len(b),currentAndCommittedMatch=True))
assert len(pins)==7
for pin in inventory['reviewedInputs']+inventory['reviewedOutputs']:
 b=Path(pin['path']).read_bytes();assert sha(b)==pin['sha256'] and b==show(head,pin['path'])
original_doc=json.loads(Path(inventory['originalIndependentReview']['path']).read_text())
original=next(r for r in original_doc['rows']if r.get('itemId',r.get('familyId'))==family and r.get('verifiedAtBase')==inventory['originalIndependentReview']['verifiedAtBase'])
assert sha(canonical(original))==inventory['originalIndependentReview']['rowSha256']
assert sha(canonical(original['proofObligations']['SOURCE_IDENTITY']))==inventory['priorFindings'][0]['priorFindingSha256']
linkage=json.loads((OUT/'independent-current-pdf-image-linkage.json').read_text());assert linkage['pageInstances']==4
for page in linkage['pages']:
 for key,digest in [('pdfPath','pdfSha256'),('pngPath','pngSha256')]:
  b=Path(page[key]).read_bytes();assert sha(b)==page[digest] and b==show(head,page[key])
audit=json.loads((OUT/'independent-current-completeness.json').read_text())['audit'];assert audit['result']=='PASS_COMPLETE' and all(v==0 for v in audit['counters'].values())
review=dict(schemaVersion='rcap-independent-ct-provisional-current-delta/v1',reviewer='/root/session10_admission_review',reviewDate='2026-09-08',familyId=family,observedHead=head,candidateCommit=inventory['candidateCommit'],sourceAnchorComparisons=comparisons,currentCompositionSources=pins,priorReview=inventory['originalIndependentReview'],priorFailedFinding=original['proofObligations']['SOURCE_IDENTITY'],priorFailedFindingSha256=inventory['priorFindings'][0]['priorFindingSha256'],originalReviewFindingPreserved=True,sourceIdentityNowExact=True,
 sourceAndTreatmentFindings=[
 'The exact retained CT memo authorizes process guidance and portal assistance for provisional-pardon/certificate-of-employability relief, and expressly distinguishes employment/licensure relief from erasure. The guide keeps this scope, supplies Board-process handoff, and does not substitute for a participant application.',
 'The retained official COE eligibility snapshot expressly directs a person currently on probation with more than 90 days remaining through the probation officer. Current PDFs and complete participant instructions state that qualified handoff, require verification of unknown status/time, and state that exactly 90 days neither matches that handoff nor establishes eligibility. The source has other eligibility branches; this guide explicitly requires the Board’s current eligibility review and does not purport to resolve all branches.',
 'The retained COE required-documents snapshot identifies the Background Investigation Authorization as supporting material, requires signing it in the notary’s presence, and assigns the supervision questionnaire to the current supervising officer. The current guide matches those ownership and execution limits and does not fill official-owned answers.',
 'The retained Board FAQ supports the provisional-pardon/COE distinction from erasure. The guide and instructions preserve that limit, the Board portal and both specific official source URLs, confirmation of current instruments/attachments/fee/timing, and the hearing/immigration counsel stop. No new fee figure, eligibility conclusion, court-filing instrument or agency application is invented.',
 ],
 independentVisual=dict(scope='New inspection of all four held current PNGs, separately attributed from VF04 and implementation-author measurements. Each PNG is pinned to the actual current PDF and numbered page through the preserved renderer measurement; independently extracted actual PDF text, fixture-specific values, order, geometry and current committed hashes were cross-checked without rendering.',pageInstances=4,documents=2,clippingObserved=False,overlapObserved=False,observations=[
 'Canonical page 1: all five synthetic identity/contact facts, route and guidance-only disclaimer, relief boundary, qualified probation handoff, unknown/exact-90 handling, portal and required-document links, notarization/officer ownership and counsel stop are legible and within the page.',
 'Boundary page 1: long name, wrapped address, telephone extension and long email remain legible. Every process sentence, qualified handoff and final counsel stop fits, with no overlap or clipping.',
 'Canonical and boundary page 2: all five confirmation labels, blank lines and complete check-with directions fit together in reading order. Protected signature/date/official-field directions and route footer are visible; no orphaned label or overlapping text. The two page-2 images are byte-identical but both page instances were viewed.',
 ]),currentCompleteness=dict(result=audit['result'],totals=audit['totals'],counters=audit['counters']),
 oldEvidenceScope='Original VF04 SOURCE_IDENTITY FAIL and passing old content/visual findings remain unchanged. Its old canonical-only central receipt binds different PDF bytes and is not reused for the changed current PDFs. Current new visual inspection and static guidance acceptance do not assert a new central receipt.',
 authorEvidenceScope='The preserved delivered-delta-measurements.json remains implementation-author evidence with independentReview PENDING as originally written; the new independent review is this separate record.',
 newVisualInspection=True,newRasterCreated=False,oldCentralReceiptReused=False,networkSourcesReacquired=False,candidateFilesEdited=False,originalReviewsEdited=False,activeClaimChanged=False,runtimeInstalled=False,participantApplicationDischarged=False,commercialAuthority=False)
(OUT/'independent-source-and-current-four-page-review.json').write_text(json.dumps(review,indent=2)+'\n')
print(json.dumps(dict(sourceAnchorsCompared=len(comparisons),currentSourcePins=len(pins),allCurrentCandidatePinsMatch=True,newlyInspectedCurrentPages=4,completeness=audit['totals'],oldCentralReceiptReused=False)))
