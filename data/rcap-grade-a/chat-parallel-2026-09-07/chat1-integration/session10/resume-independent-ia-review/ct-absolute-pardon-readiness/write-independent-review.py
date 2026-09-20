#!/usr/bin/env python3
"""Record the separately performed four-page visual and static-treatment review."""
import hashlib
import json
from pathlib import Path

OUT=Path(__file__).resolve().parent
ROOT=Path.cwd()
CENTRAL=OUT.parents[1]/'resume-central-34232991361'
read=lambda p:json.loads(p.read_text())
sha=lambda b:hashlib.sha256(b).hexdigest()
relative=lambda p:str(p.relative_to(ROOT)) if p.is_absolute() else str(p)
pin=lambda p:dict(path=relative(p),sha256=sha(p.read_bytes()),byteLength=p.stat().st_size)
inventory=read(OUT/'inventory-check.json')['inventory']
receipt=read(OUT/'actual-receipt-verification.json')
observations={
 'canonical/page-001.png':'All five synthetic identity/contact values are legible; the exact absolute-pardon route, guidance-only disclaimer, Board-determined hearing/expedited distinction, on-or-after-1974 boundary, ePardon URL and official-instructions URL are visible. No clipped or overlapping text observed.',
 'canonical/page-002.png':'All five required confirmation labels, blank lines and check-with directions are fully visible. The protected-items text refuses signing this guide and official-owned completion. Route footer is visible; no clipped or overlapping text observed.',
 'boundary/page-001.png':'The long participant name, multi-line address, telephone extension and long email remain fully legible. All pathway/process text and the final counsel-stop sentence fit inside the page. No clipped or overlapping text observed.',
 'boundary/page-002.png':'The complete five confirmation blocks and protected-items instructions remain present in normal reading order. No orphaned label/blank pair, clipped text or overlap observed.',
}
visual=[]
for page in receipt['numberedPageImages']:
    suffix='/'.join(page['archiveMember'].split('/')[-2:])
    visual.append(dict(archiveMember=page['archiveMember'],sha256=page['sha256'],byteLength=page['byteLength'],
        viewedBy='/root/session10_admission_review',tool='view_image, original detail',
        entirePageViewed=True,clippingObserved=False,overlapObserved=False,finding=observations[suffix]))
visual_record=dict(schemaVersion='rcap-independent-ct-guidance-delta-review/v1',reviewer='/root/session10_admission_review',
    reviewDate='2026-09-08',familyId=inventory['familyId'],candidateCommit=inventory['candidateCommit'],
    rasterCommit=receipt['packetCommit'],workflowRunId=receipt['workflowRunId'],artifactId=receipt['artifactId'],artifactDigest=receipt['artifactDigest'],
    independentlyViewedCurrentPages=visual,reviewedDocuments=2,reviewedPageInstances=4,
    sourceAndTreatmentFindings=[
      'The exact held CT memo expressly approves process guidance/portal assistance for this executive-clemency track until a stable participant application document is available. The guide accurately disclaims being that application and leaves the participant’s later portal action open.',
      'The retained official application-instructions HTML names https://epardonportal.ct.gov/portal, matching the complete guide. The retained Board FAQ distinguishes an expedited review without a hearing from the standard process; current guide wording leaves that decision to the Board.',
      'The participant-instructions output and both complete PDFs retain the exact post-1974 route boundary, distinguish provisional/certificate relief, identify the receiving Board and current instructions, withhold the memo’s unverified waiting-period/no-fee numbers, and retain the counsel stop for hearing or immigration issues.',
      'This guide contains five known synthetic identity/contact facts and five participant confirmation blanks. A new read-only auditFamily check measures PASS_COMPLETE with 10 areas, five writes, five required-before-filing blanks and nine zero counters. No participant execution, application submission or agency decision is supplied.',
    ],
    originalReview=inventory['originalIndependentReview'],
    priorVisualScope='VF05 inspected older output hashes. Its finding remains intact; current four-page inspection above is newly performed by this independent reviewer.',
    authorDeltaScope='Implementation author’s delivered-delta-measurements.json remains author evidence and is not relabeled.',
    receiptEvidence=pin(OUT/'actual-receipt-verification.json'),
    completenessEvidence=pin(OUT/'independent-completeness.json'),
    treatmentOutcome='TREATMENT_CORRECT for the exact static guidance family only',
    candidateFilesEdited=False,buildersExecuted=False,newRasterCreated=False,networkSourcesReacquired=False,
    originalReviewsEdited=False,runtimeInstalled=False,participantApplicationDischarged=False,commercialAuthority=False)
visual_path=OUT/'independent-current-four-page-review.json'
visual_path.write_text(json.dumps(visual_record,indent=2)+'\n')

source_pins={Path(p['path']).name:p for p in inventory['reviewedInputs']}
memo=next(p for p in inventory['reviewedInputs'] if p['path']=='data/record-clearing/legal-design-intake/CT.memo.json')
guide=next(p for p in inventory['reviewedOutputs'] if p['mediaType']=='text/markdown')
common=pin(visual_path)
evidence={
 'ROUTE_IDENTITY':[memo,source_pins['ct-application-instructions.html.gz'],common],
 'COMPONENT_SET':[memo,guide,source_pins['rendered-artifacts.json'],common],
 'CLIPPING_AND_OVERLAP':[pin(OUT/'actual-receipt-verification.json'),pin(CENTRAL/'ct-absolute-pardon.verdict.json'),pin(CENTRAL/'ct-absolute-pardon-artifact.json'),common],
}
findings={
 'ROUTE_IDENTITY':'The controlling unchanged CT memo expressly limits this track to process guidance and portal assistance. The current guide gives the exact absolute-pardon/erasure route, receiving Board, ePardon portal and official-instructions handoff, and explicitly leaves application/signature/submission to the participant. The old participant_agency_application mismatch is closed only for the authorized static guidance treatment; no application is represented as delivered.',
 'COMPONENT_SET':'The two exact current complete outputs and participant instructions deliver the declared agency_preparation_guide required by the controlling guidance treatment. Every actual page was independently viewed; all facts, confirmation blanks, process boundaries and receiving-authority handoff are present. The original missing application remains the participant’s later portal obligation and is not falsely discharged by this guide.',
 'CLIPPING_AND_OVERLAP':'The immutable central run 34232991361 artifact 10058860836 now proves both exact current PDF hashes and all four numbered pages, with successful shared canary/plan/own family and unchanged-byte gates. I independently verified its ZIP digest, metadata, committed/current inputs and complete calibrated page measurements, then viewed all four current images at original detail and observed no clipping or overlap. This closes the exact governed-receipt gap and adds a new current-page visual inspection without relabeling VF05 or author evidence.',
}
closed=[dict(**prior,result='CLOSED_BY_INDEPENDENT_DELTA',finding=findings[prior['obligation']],evidence=evidence[prior['obligation']]) for prior in inventory['priorFindings']]
row=dict(familyId=inventory['familyId'],routeKeys=inventory['routeKeys'],verdict='TREATMENT_CORRECT',
    recordedTreatment='GUIDANCE_READY',scope='static_family_treatment',
    verdictScope='Independent acceptance of only the exact two-PDF/four-page preparation guidance and authority handoff. The participant completes the Board’s own application separately. No filing packet, submitted application, approved relief, installed runtime, commercial fulfillment or production authority is created.',
    runtimeInstalled=False,participantFilesGeneratedOutput=False,participantApplicationDischarged=False,commercialAuthority=False,
    failedObligations=[],unmeasuredObligations=[],reviewedInputs=inventory['reviewedInputs'],reviewedOutputs=inventory['reviewedOutputs'],
    originalIndependentReview=inventory['originalIndependentReview'],sourceRefreshEvidence=inventory['sourceRefreshEvidence'],
    closedPriorFindings=closed,closedSourceHolds=[],closedCurrentVerdicts=[],
    reviewedEvidence=[pin(p) for p in [OUT/'inventory-check.json',OUT/'actual-receipt-verification.json',OUT/'independent-completeness.json',visual_path,CENTRAL/'final-run.json',CENTRAL/'final-jobs.json',CENTRAL/'ct-absolute-pardon-artifact.json',CENTRAL/'ct-absolute-pardon.verdict.json']])
review=dict(schemaVersion='rcap-terminal-treatment-independent-verification/v1',reviewer='/root/session10_admission_review',
    lane='session10_independent_ct_guidance_review',verifiedAtBase=inventory['candidateCommit'],
    authoredByADifferentLaneThanTheTreatmentRecord=True,editsNothingItVerifies=True,createsNoApproval=True,opensNoRoute=True,
    reviewDate='2026-09-08',families=[row],
    independence='Reviewer authored neither CT candidate, original treatment record, CT adapter nor central renderer. Original VF05 and author observations are preserved with separate attribution.',
    publicationStatus='Independent review issued in assigned evidence directory; root must publish under the existing configured review path and integrate the existing hook. No shared terminal record changed by reviewer.')
review_path=OUT/'ct-absolute-pardon-independent-treatment-review.json'
assert not review_path.exists(),'Preserve issued independent review'
review_path.write_text(json.dumps(review,indent=2)+'\n')
print(json.dumps(dict(reviewPath=relative(review_path),reviewSha256=sha(review_path.read_bytes()),closedFindings=[p['obligation']for p in closed],documents=2,pages=4,sharedFilesEdited=False)))
