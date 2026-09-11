import hashlib
import json
from pathlib import Path
import subprocess

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[4]
FAMILY='composed-treatment:nd-nonconviction-auto-close-verify'
OUT='data/rcap-all50/overlays/census-v1/nd/'+FAMILY+'--custom-pleading'
EVIDENCE=str(HERE.relative_to(ROOT))
BASE='b7610435835e6163254641505d25be7680cb514c'
def read(p):return json.loads((ROOT/p).read_text())
def save(p,data):(ROOT/p).write_text(json.dumps(data,indent=2)+'\n')
measure=read(EVIDENCE+'/current-byte-measurements.json')
guards=read(EVIDENCE+'/independent-guards.json')
wiring=read(OUT+'/product-wiring.json')
manifest=read(OUT+'/reports/rendered-artifacts.json')
fieldmap=read(OUT+'/production-field-map.json')
checks=read(EVIDENCE+'/checks.json')
decision_path='data/rcap-grade-a/legal-decisions/LEGAL_BLOCKED_RESOLUTION_2026-09-11.json'
assert measure['verifiedAtBase']==BASE
assert guards['failed']==0 and guards['tests']==89
assert len(measure['raster']['pngs'])==14
assert measure['readOnly']

obligations={
 'ROUTE_IDENTITY':('PASS',
   'The same two exact ND failure-disposition route keys occur in source-receipt, production-field-map and product-wiring (including binding.routeKeys), and are readable in the proper components of both current PDFs. This is the post-period still-public correction branch. The final ND decision is controlling for entry-date cutoff and timing; the automatic parent, older-order petition, agency-history correction and contested eligibility remain outside this family. Payment, sponsorship, generation and runtime authority remain closed.'),
 'SOURCE_IDENTITY':('PASS',
   'Reused the valid VF06/VF09 findings that this is a composed four-component family with no dedicated statewide enforcement binary, not an official petition substitute. Independently rehashed all three current committed records: 918bc6616e23de07014825cd8cbd9b81dc282613a0f5f2214130ac2af30e4b7b (37333 bytes), 0aad88eff0e3d12ea9b10de9c80edcc5b3134508f097c9e85f0e35d34a9c74ef (184365 bytes), and final LEGAL_CLEAR decision 5e3b6fb6bdeff849949d1d2c44d9b4e7badfdf6e7ba38be6135c388df176b1f2 (22372 bytes). All match source-receipt; the real --check validated all 18 anchors. No new source-currency or legal-research claim is made.'),
 'COMPONENT_SET':('FAIL',
   'Both current PDFs and the production field map/rendered manifest contain the existing clerk_correction_request, enforcement_motion, proposed_order and filing_instructions in full. However, current product-wiring.binding.instrumentKinds and packetComponents are empty. The four component IDs, order and conditional motion/order descriptions that FIX112 installed at 06bbbbab0 were removed by 4e722bf83. Physical completeness is intact; the required existing four-component binding disagrees with the delivered set. Defect ND-VF01-02. No additional notice/brief/service component design has been imposed.'),
 'KNOWN_PREFILLS':('PASS',
   'Independently read every declared expected value from pdftotext output for its own component pages: 42/42 canonical and 42/42 boundary, 84/84 total. Per fixture: request 18, motion 19, proposed-order caption 4, instructions 1. Court/location/case, whole-case disposition, entered order, raw day 61, adjusted expiration, product first-check date, calendar method/source, no appeal, statutory exceptions and dated public-access facts reach both request and motion. The actual adapter derives those values from gated inputs and overwrites attempted caller-supplied derived values.'),
 'REQUIRED_BEFORE_FILING':('PASS',
   'The repaired packet collects verified case/deadline facts before composing, rather than printing the old 13 unresolved fact blanks. The map has 42 written fields and seven protected acts, no unexplained remaining fact blank. Instructions name the entered order and complete charge record, verified calendar or verified dates, and dated public-index evidence, with obtain-from instructions. Independent helper AND actual production adapter cases refuse unknown/false/ineligible facts, missing evidence, and missing court/location/case/clerk-response facts for this full four-component packet. No signatures or court decisions are fabricated.'),
 'ROUTE_OPTIONS':('PASS',
   'The packet retains the adopted sequence: request first; use the motion only if the original court requires judicial action or does not correct the record, and proposed order only with the motion. The motion condition is printed on its face and the instructions repeat it. There are no unmade checkbox or either/or elections. The independent guard battery checks both allowed all-dismissed/all-acquitted outcomes, rejects mixed/partial/unknown and any appeal, and checks all three exclusions as strict known-false predicates. Missing component conditions in product wiring are scored separately under COMPONENT_SET.'),
 'REPEATING_ROWS':('PASS',
   'Inspected all four map entries and all fourteen PDF/PNG pages: no charge table, repeating custodian list or partially filled row structure exists. The all-charges gate requires a whole-case disposition rather than inferring it from a partly populated list. Measured incompleteRows=0.'),
 'PROTECTED_FIELDS':('PASS',
   'Seven protected fields per fixture remain unfilled: request signature/date, motion signature/date, and court decision/signature/date. Direct original-PNG inspection confirms dotted blank rules. Canonical request signature is on page 1; boundary request signature is on page 2; motion signatures are on page 3; judicial blanks are on page 5. Court caption facts alone are prefilled. Measured protectedWrites=0; no participant or judicial act is supplied.'),
 'ARTIFACTS':('FAIL',
   'The current canonical 042abebbea6753740dab0b232722e76f715490cea12c634196fa6a337ad742a2 (17097 bytes, 7 pages) and boundary db085007df35154ef81207938a75181b8a8e3c5cc2d874789aac92c4c9b0546d (17490 bytes, 7 pages) match manifest, queue and original RASTER_PASS run 34628970364 pinned to ffa39d9bd9ddfb42b3c4e8318a5c63abf92fb0b8. All 14 PNGs match original ZIP members and durable hashes. Nevertheless product-wiring.lastIndependentVerification resurrects VF09 PASS_COMPLETE_INDEPENDENT at 7fcfb7d40aafe7bd7350fc735ea09d16524cb757, whose row explicitly binds different pre-repair PDFs. The superseded-history fields were deleted. This is not current-byte independent evidence (ND-VF01-01). The focused suite also fails its obsolete repair-stage requirement that a current raster receipt be null (ND-VF01-03); its real result is 9/10, not a passing suite.'),
 'PAGE_ORDER':('PASS',
   'Directly compared manifest, extracted text and all 14 original PNGs. Both fixtures are 7 pages: request 1-2, motion 3-4, proposed order 5, instructions 6-7. The request precedes motion, then its order and instructions. Long boundary address wraps safely on motion page 4; request signature moves to page 2 without disappearing. Both complete component page ranges remain present.'),
 'CLIPPING_AND_OVERLAP':('PASS',
   'Direct visual inspection of all 14 unmodified original central PNGs found no clipping, overlap, missing content, invisible prefill or occupied protected blank. Independent PDF word-box measurement counted 1327 canonical words and 1346 boundary words, zero words outside 612x792 page bounds and zero same-baseline word overlaps greater than 1 point. All 84 declared write values are readable; dense changed request/motion/instruction text and boundary contact values were specifically inspected. Central raster verdict has 14 measurements and zero problems/environment problems.'),
 'FILING_DESTINATION':('PASS',
   'Reused unchanged VF06/VF09 source/approval findings for the adopted destination. Current request is addressed to the office of the named original court for the named county; the motion uses that court/case caption. Current instructions say to send the request to the original court office and file the motion in the original criminal case. Re-read these current bytes and retained the prior source conclusion; no expanded source audit was needed.'),
 'FEE_AND_WAIVER':('PASS',
   'Reused the existing VF09 determination under DET-FEE-AND-WAIVER-001 as amended: held sources did not establish the fee/waiver treatment for this particular enforcement motion; the no-fee rule for the older petition/automatic parent was not borrowed. The final ND decision changes timing/eligibility, not that adopted finding. Current instructions still name the office of the original court as the authority to ask before filing and do not invent an amount or waiver rule. This is retained exact-family source reasoning, not fresh legal research.'),
 'SERVICE':('PASS',
   'Reused unchanged VF06/VF09 exact-family findings that this adopted correction set defers unresolved delivery mechanics to the original court office, with request-first/motion-if-needed sequencing. Current request delivery step expressly names that office and asks how it accepts delivery; participant-instructions state that how the request or motion must be delivered is unresolved and identify the same authority before sending or filing. No sibling-petition service rule or previously unadopted notice/brief/proof-of-service component was added to this acceptance standard.'),
 'SELF_HELP_STOP':('PASS',
   'Current instructions and PDF pages 6-7 stop for older orders, mixed/partial cases, appeal history, statutory exceptions, unknown gates/calendar/access facts, premature checks, a record no longer public, contested eligibility, separate agency histories and immigration questions. Independent production calls verified the 2025-08-01 entry-order cutoff; 61 calendar days excluding entry; weekend/supplied-holiday extensions; zero mail days; product-labelled next-business-day check; valid as-of and current-UTC default; and rejection of future entered orders/observations. The date oracle independently covered 366 entered dates including weekend/holiday chains. No new legal question was opened.'),
}
assert len(obligations)==15
proof={name:{'measured':True,'result':result,'detail':detail,'evidence':EVIDENCE+'/current-byte-measurements.json'} for name,(result,detail) in obligations.items()}
for name in ['REQUIRED_BEFORE_FILING','ROUTE_OPTIONS','SELF_HELP_STOP','KNOWN_PREFILLS']:
    proof[name]['additionalEvidence']=EVIDENCE+'/independent-guards.json'
defects=[
 {'id':'ND-VF01-01','severity':'blocking','obligation':'ARTIFACTS',
  'path':OUT+'/product-wiring.json','pointer':'/binding/lastIndependentVerification',
  'problem':'Stale pre-repair VF09 approval restored as current independent verification; superseded review-history fields removed.',
  'observed':wiring['binding']['lastIndependentVerification'],
  'oldVerifiedPdfHashes':{'canonical':'61bedadea4d79733ae2903993d4525835e08df8f28d191bdb2b3b66fe2e78c96','boundary':'6088a70b8bd9b67f92862393562c3a0dd9feadee39a4f445a7e56c740d7790b7'},
  'currentPdfHashes':{p['fixture']:p['sha256'] for p in measure['pdfs']},
  'requiredCorrection':'Retain the authentic current raster receipt; restore superseded review provenance and clear stale current independent approval until a real current-byte independent acceptance is integrated. Preserve this through the generator so a routine regeneration cannot resurrect the old approval.',
  'notAReasonToRerender':'No PDF byte defect or raster mismatch was found.'},
 {'id':'ND-VF01-02','severity':'blocking','obligation':'COMPONENT_SET',
  'path':OUT+'/product-wiring.json','pointers':['/binding/instrumentKinds','/binding/packetComponents'],
  'problem':'The existing four component IDs, order and motion/order conditions installed by the repair were replaced by empty arrays.',
  'observed':{'instrumentKinds':wiring['binding']['instrumentKinds'],'packetComponents':wiring['binding']['packetComponents']},
  'requiredSet':fieldmap['componentSet'],'requiredConditions':fieldmap['componentConditions'],
  'requiredCorrection':'Restore the existing four-component manifest binding and its recorded conditions; preserve them through regeneration. Do not expand the component design.',
  'physicalPacketCounterNote':'requiredComponentsMissing remains 0 because all four components are physically present in both PDFs; this failure is a current binding disagreement.'},
 {'id':'ND-VF01-03','severity':'validation','obligation':'ARTIFACTS',
  'path':'scripts/rcap-packet-recovery/test-nd-nonconviction-timing.mjs','line':251,
  'problem':'The focused suite asserts acceptanceReceipt is null even after legitimate exact-byte central RASTER_PASS. Actual result is 9 passed, 1 failed. Later stale-review/component assertions are masked by this first failure.',
  'requiredCorrection':'Make the check accept either an honestly pending receipt or a verified current-byte receipt while continuing to reject stale independent approvals and lost component bindings; rerun the focused suite read-only.',
  'evidence':EVIDENCE+'/existing-focused-tests.stdout.log'},
]
counter_names=['knownRequiredFieldsMissing','requiredFactsNotCollected','unclassifiedBlanks','incompleteRows','requiredOptionsMissing','requiredComponentsMissing','invisibleWrites','protectedWrites','visualDefects']
counters={k:0 for k in counter_names}
row={
 'schemaVersion':'rcap-verifier-lane-return/v1','lane':'VF01','laneKind':'independent-verification',
 'isIndependentVerification':True,'shift':'20260911','worker':'nd-current-independent-acceptance',
 'branch':'vf01-nd-final-20260911','worktree':str(ROOT),'verifiedAtBase':BASE,
 'claim':'CLAIM_OK VF01 '+FAMILY+' (independent-verification, grant set a4767d19bcace15c)',
 'familyId':FAMILY,'itemId':FAMILY,'familyDirectory':OUT,'verdict':'FAIL_REPAIR_REQUIRED',
 'independence':'This reviewer did not author, repair or render the packet. Only allowlisted VF01 evidence and rows were written. No builder mutation, local raster, legal research, admission or production action occurred.',
 'scope':'One exhaustive acceptance pass on current ND repaired entry-order/61-day/Rule-45/whole-case/appeal/still-public guards, current four-component artifacts and current manifests at the exact base. Unchanged valid exact-family source and approval facts from VF06/VF09 were reused; their old PDF/independent verdict was not carried to new bytes.',
 'buildStatus':'state_built','rasterState':'RASTER_PASS','rasterWorkflowRunId':'34628970364',
 'obligationsScored':15,'proofObligations':proof,
 'failedObligationNames':[k for k,v in proof.items() if v['result']=='FAIL'],'unmeasuredObligations':[],
 'nineCounters':{**counters,'allZero':True,'measuredHere':True,'denominatorObserved':'42/49 written per fixture; 84 independently read-back writes, 14 protected acts across two fixtures, all 14 original PNG pages inspected.',
   'measuredBy':'Fresh exact-family verify-packet-completeness CLI plus independent per-component PDF text readback, all-page word geometry and original central PNG inspection. Counters describe physical packet completeness. Manifest/provenance defects are explicitly failed obligations and are not disguised as missing PDF components.'},
 'defects':defects,'evidencePath':EVIDENCE+'/review.json',
 'checks':checks,'independentGuardChecks':{'tests':89,'passed':89,'failed':0,'independentDateOracleCases':366,'productionEntryPoints':guards['productionCalls']},
 'readOnlyProof':EVIDENCE+'/read-only-proof.json',
 'rasterHashBinding':{p['fixture']:p['sha256'] for p in measure['pdfs']},
 'rasterReceiptConfirmedIndependently':measure['raster'],
 'priorEvidence':[{'path':'data/rcap-grade-a/packet-factory-24h/vf06/rows.json','exactFamilyOnly':True},
                  {'path':'data/rcap-grade-a/packet-factory-24h/vf09/rows.json','exactFamilyOnly':True,'oldIndependentVerdictNotTransferred':True}],
 'carriedFacts':['existing four-component contract and absence of dedicated statewide enforcement binary','unchanged filing destination','unchanged adopted fee/waiver and service determinations'],
 'notNewDefects':['sourceVersion was empty before FIX112 and has not changed; it is not included as a new defect.','Fresh RASTER_PASS is authentic current-byte evidence and must not be removed merely to satisfy an obsolete null assertion.'],
 'unmeasuredItems':{'externalSourceCurrency':None,'participantImpact':None,'runtimeFulfillmentBehavior':None,
  'reason':'No new source research, participant delivery or runtime/commercial audit was authorized or performed.'},
 'remainingBlockers':['ND-VF01-01 stale independent approval provenance','ND-VF01-02 lost existing component binding','ND-VF01-03 failing focused test assumption'],
 'reviewAfterCorrection':'If correction is confined to metadata/tests and both PDF hashes remain unchanged, reuse these source, guard, PDF and 14-page raster findings. Reassess the identified changed bindings and focused test result; no new render or repeated unchanged legal approval is justified.',
 'packetsBuiltOrRepairedHere':0,'packetBytesModified':0,'overlayDirectoriesModified':0,
 'commercialRoutesOpened':0,'productionTouched':False,'grantsReleased':0,
 'grantsNothing':'This independent FAIL neither admits nor promotes the family, approves participant delivery, creates fulfillment authority, nor opens a commercial route. Root alone integrates and admits.',
}
save(EVIDENCE+'/review.json',row)
save('data/rcap-grade-a/packet-factory-24h/vf01/rows-vf01-20260911-nd-final.json',{
 'schemaVersion':'rcap-verifier-rows/v2','lane':'VF01','laneKind':'independent-verification','isIndependentVerification':True,
 'verifiedAtBase':BASE,'rows':[row],
})

page_notes={
 'canonical':['Request: entered 2025-08-01, day61/expiration 2025-10-01, product check 2025-10-02, dismissed whole case, no appeal/exceptions, evidence and blank signature visible.',
  'Request continuation: personal-signature instruction and exact request route key are intact.',
  'Motion: conditional use warning, populated court/case, matching entry/timing/whole-case facts, clerk response and blank signature visible.',
  'Motion continuation: personal-signature instruction and all contact details intact.',
  'Proposed order: caption filled, ORDERS/DATED/judicial-signature rules blank.',
  'Instructions: verified case/timing/failure and ordered steps present; text continues to next page.',
  'Instructions continuation: contested-case sentence, full stop conditions and non-advice/no-filing disclaimer intact.'],
 'boundary':['Long name, address, phone/email wrap safely; acquittal, 2025-08-04 entry, Saturday day61 2025-10-04, Monday expiration 2025-10-06 and Tuesday product check 2025-10-07 visible.',
  'Request continuation: blank participant DATE/SIGNATURE and personal-signing instruction visible; no lost signature after page break.',
  'Motion: long caption, matching acquittal/timing facts, prior written request and clerk noncorrection response; blank signature visible.',
  'Motion continuation: long mailing address wraps; phone/email fully visible.',
  'Proposed order: long name/case caption intact; court decision/date/signature remain blank.',
  'Instructions: verified facts and steps; no clipping in dense long-value content.',
  'Instructions continuation: contested eligibility, all stop conditions and disclaimer intact.'],
}
visual=[]
for record in measure['raster']['pngs']:
    parts=record['member'].split('/');fixture=parts[-2];page=int(parts[-1][5:8])
    visual.append({**record,'fixture':fixture,'page':page,'inspectedOriginalImage':True,'findings':[],
      'observation':page_notes[fixture][page-1]})
save(EVIDENCE+'/visual-review.json',{'schemaVersion':'rcap-independent-original-page-review/v1','familyId':FAMILY,
  'runId':'34628970364','artifactId':'10276130128','localRasterOrImageTransformPerformed':False,
  'pagesInspected':14,'visualDefects':0,'pages':visual})
input_paths=[
 'AGENTS.md','docs/PRODUCT_CONTRACT.md','scripts/build-census-v1-'+FAMILY+'.mjs',
 'scripts/rcap-packet-recovery/nd-nonconviction-timing.mjs','scripts/rcap-packet-recovery/test-nd-nonconviction-timing.mjs',
 'data/rcap-grade-a/packet-factory-24h/fix112/nd-current-gates-20260911/repair-evidence.json',
 'data/rcap-grade-a/packet-factory-24h/fix112/rows-fix112-20260911-nd-current-gates.json',decision_path,
]
save(EVIDENCE+'/preflight.json',{'verifiedAtBase':BASE,'actualHead':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
 'actualBranch':subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip(),
 'actualCheckout':str(ROOT),'privateCorpusMounted':(ROOT/'private/Nationwide Record Clearing').exists(),
 'claim':row['claim'],'inputHashes':[{'path':p,'sha256':hashlib.sha256((ROOT/p).read_bytes()).hexdigest(),'bytes':(ROOT/p).stat().st_size} for p in input_paths],
 'scopeConflictEscalatedToCaptain':'Current binding regression was reported during review; evaluation continued on the exact assigned base without repairing or revising scope.'})
diff=subprocess.check_output(['git','diff','06bbbbab0','HEAD','--',OUT+'/product-wiring.json'],cwd=ROOT,text=True)
(HERE/'binding-regression.diff').write_text(diff)
print(json.dumps({'verdict':row['verdict'],'obligations':15,'passed':13,'failed':row['failedObligationNames'],'defects':len(defects)},indent=2))
