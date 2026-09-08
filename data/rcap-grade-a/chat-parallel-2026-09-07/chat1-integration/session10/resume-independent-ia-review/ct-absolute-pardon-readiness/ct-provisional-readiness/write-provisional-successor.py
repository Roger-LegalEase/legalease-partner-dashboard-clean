#!/usr/bin/env python3
import copy,hashlib,json,subprocess
from pathlib import Path
OUT=Path(__file__).resolve().parent
BASE=OUT.parent
read=lambda p:json.loads(p.read_text())
sha=lambda b:hashlib.sha256(b).hexdigest()
rel=lambda p:str(p.relative_to(Path.cwd())) if p.is_absolute() else str(p)
pin=lambda p:dict(path=rel(p),sha256=sha(p.read_bytes()),byteLength=p.stat().st_size)
canonical=lambda o:json.dumps(o,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
original_path=BASE/'ct-absolute-pardon-independent-treatment-review.json'
previous_path=BASE/'ct-destruction-source-only/ct-absolute-plus-destruction-independent-successor.json'
previous=read(previous_path);configured=read(Path('data/rcap-grade-a/terminal-treatment-verification/SESSION10_CT_GUIDANCE_ROWS.json'))
assert previous['families']==configured['families']
assert previous['families'][0]==read(original_path)['families'][0]
record=read(OUT/'input-and-receipt-audit.json');i=record['inventory'];linkage=read(OUT/'independent-current-pdf-image-linkage.json')
review=copy.deepcopy(previous)
evidencePaths=[OUT/'input-and-receipt-audit.json',OUT/'independent-current-pdf-image-linkage.json',OUT/'independent-current-completeness.json',OUT/'independent-source-and-current-four-page-review.json',Path(linkage['retainedMeasurementPath']),Path(linkage['retainedRendererScript'])]+[Path(p['pngPath'])for p in linkage['pages']]
evidence=[pin(p)for p in dict.fromkeys(evidencePaths)]
source_review=pin(OUT/'independent-source-and-current-four-page-review.json')
row=dict(familyId=i['familyId'],routeKeys=i['routeKeys'],reviewer='/root/session10_admission_review',
 reviewAttribution='Separately performed current source/delta and four-page visual review by /root/session10_admission_review, who authored neither current candidate nor original VF04 review. No original author observation is relabeled.',
 verdict='TREATMENT_CORRECT',recordedTreatment='GUIDANCE_READY',scope='static_family_treatment',
 verdictScope='Independent acceptance of the exact two-PDF/four-page provisional-pardon preparation guidance and complete instructions under the existing static guidance contract. The qualified supervision handoff, unknown-fact refusal and supporting-document ownership are source-bound. The participant still uses the Board’s own application process. This does not claim a current central receipt, filed application, eligibility approval, installed runtime, commercial fulfillment or production authority.',
 runtimeInstalled=False,participantFilesGeneratedOutput=False,participantApplicationDischarged=False,commercialAuthority=False,
 failedObligations=[],unmeasuredObligations=[],reviewedInputs=i['reviewedInputs'],reviewedOutputs=i['reviewedOutputs'],originalIndependentReview=i['originalIndependentReview'],sourceRefreshEvidence=i['sourceRefreshEvidence'],
 closedPriorFindings=[dict(**prior,result='CLOSED_BY_INDEPENDENT_DELTA',finding='The original VF04 SOURCE_IDENTITY failure named the stale whole-file counsel-manifest pin. I recomputed the old pinned source and current committed bytes and compared the complete CT counsel family, global authority and applicable exceptions; all CT substance is identical. The census refresh likewise preserves the exact complete provisional route object. The current receipt now binds all seven actual committed composition sources, including the held Board eligibility, required-documents and FAQ snapshots. I reviewed the changed current guide and complete instructions against those sources and independently viewed all four current page images with their current-PDF linkage; this new delta review preserves the old independent finding and does not reuse its different-PDF central receipt.',evidence=[source_review,i['sourceRefreshEvidence'],pin(OUT/'independent-current-pdf-image-linkage.json')])for prior in i['priorFindings']],
 closedSourceHolds=[],closedCurrentVerdicts=[],reviewedEvidence=evidence,
 historicalRasterScope=dict(recordedAt=i['originalIndependentReview']['verifiedAtBase'],workflowRunId=record['historicalQueueRow']['rasterReceipt']['workflowRunId'],scope='Old canonical-only receipt has different PDF hashes. Preserved as history, not reused for this changed candidate or called a new central acceptance.'),
 newVisualInspection=True,newVisualDocuments=2,newVisualPageInstances=4,newRasterCreated=False,oldCentralReceiptReused=False,activeClaimChanged=False)
review['families'].append(row)
review['provisionalCurrentDeltaSuccessor']=dict(reviewer='/root/session10_admission_review',scope='Adds only a separate provisional source/current-output review; original absolute and destruction family rows remain structurally unchanged.',previousReview=pin(previous_path),previousRowSha256=[sha(canonical(r))for r in previous['families']],previousRowsUnchanged=True,newVisualInspection=True,viewedCurrentPageInstances=4,newRasterCreated=False,oldCentralReceiptReused=False,sharedRecordsEditedByReviewer=False)
assert review['families'][:2]==previous['families']
out=OUT/'ct-three-family-independent-successor.json';assert not out.exists(),'Preserve issued independent successor'
out.write_text(json.dumps(review,indent=2)+'\n')
required=[out,Path(__file__),OUT/'review-source-and-delta.py']+evidencePaths
allpaths={rel(p):pin(p)for p in required}
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
for path,item in allpaths.items():
 r=subprocess.run(['git','show',head+':'+path],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
 item['alreadyCommittedAtObservedHead']=r.returncode==0 and sha(r.stdout)==item['sha256']
manifest=dict(reviewer='/root/session10_admission_review',head=head,successor=pin(out),previousRowsUnchanged=True,files=list(allpaths.values()),scope='Publication prerequisites only. Root is the sole shared integrator; this record grants no current admission.')
(OUT/'successor-publication-inputs.json').write_text(json.dumps(manifest,indent=2)+'\n')
(OUT/'review-publication-paths.txt').write_text('\n'.join(sorted(allpaths))+'\n'+rel(OUT/'successor-publication-inputs.json')+'\n')
print(json.dumps(dict(successor=pin(out),preservedRows=2,newFamily=i['familyId'],publicationFiles=len(allpaths),newFiles=sum(not f['alreadyCommittedAtObservedHead']for f in allpaths.values()))))
