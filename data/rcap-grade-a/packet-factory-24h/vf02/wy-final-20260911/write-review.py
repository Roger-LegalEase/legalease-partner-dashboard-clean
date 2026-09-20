import json
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[4]
EVIDENCE=str(HERE.relative_to(ROOT))
FAMILY='composed-treatment:obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708'
OUT='data/rcap-all50/overlays/census-v1/wy/composed-treatment:obligation:runtime-only:wy:human-trafficking-victim-vacatur-w-s-6-2-708--custom-pleading'
BASE='08d1157068ab93d7f5e2a3ecbecef548950a60c7'
measure=json.loads((HERE/'measurements.json').read_text())
assert measure['verifiedAtBase']==BASE and not measure['failedFocusedChecks'] and measure['readOnly']
assert len(measure['focusedChecks'])==111
def save(path,data):(ROOT/path).write_text(json.dumps(data,indent=2)+'\n')
details={
 'ROUTE_IDENTITY':'Current receipt, field map and product wiring agree on the one exact obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708 route. Both current PDFs state Motion to Vacate Conviction under W.S. 6-2-708(c), in the original criminal court and case. The final decision expressly replaces the historical Petition wording and resolves the former route-kind uncertainty. Internal route-key footers are absent from the participant pages; route identity is evidenced by the current receipt/map and the instrument/statute actually printed. This is a court request for conditional vacatur, not automatic relief.',
 'SOURCE_IDENTITY':'Independently rehashed all four currently bound committed records and matched receipt hash and byte length: single-routes.json 6ca51b6d... (100125 bytes), WY profile 33546312... (120012), current census f6fc0814... (2629290), final decision 5e3b6fb6... (22372). The real --check validates 30 anchors across those four records. Full digests are in measurements.json. Reused the valid prior VF07 finding that this composed family binds repository authority and no official participant-form binary; no new source research or external currency claim was made. The final exact-family decision is present and read at this base, unlike VF07 a0fbceb30.',
 'COMPONENT_SET':'The current source receipt, production field map and rendered-artifacts manifest name and deliver exactly three adopted components: Motion to Vacate Conviction, Participant Declaration in Support of Motion, and filing instructions. Direct original-PNG and PDF-text inspection confirms all three in both fixtures. The newly required declaration is a separately named, personally signed component with status, causal-connection and supporting-evidence fields. Current product wiring points to the exact assembled canonical PDF and its current manifest/map; the complete motion/declaration/guide set is inside those bound bytes. No additional court order, certificate, notice or hearing component was imposed beyond the adopted decision.',
 'KNOWN_PREFILLS':'Read back all 18 declared write instances from the saved PDF text of their own component pages: canonical 11/11; boundary 7/7. Canonical uses explicitly synthetic known original court and existing case number in both motion and declaration; the boundary has neither and does not copy the canonical values. Both write the participant name and available identity/contact facts, with long boundary name/address/email intact. The actual map distinguishes known writes from missing original-case facts rather than declaring a future court-assigned number.',
 'REQUIRED_BEFORE_FILING':'Counted the current map separately by fixture: canonical 7 required-before-filing fact fields and 4 protected acts; boundary 11 required-before-filing fact fields and 4 protected acts. The guide names every required field: exact conviction, date, other counts, requested effect; declaration status/period, brief causal facts and official-or-alternative evidence; plus original court/case on both documents when unknown. All 18 fixture-specific disclosures matched the guide. Personal knowledge governs the declaration; the packet asks for only brief non-graphic facts. Unknown original-case facts are expressly copied from the existing court record before filing, never inferred or newly assigned.',
 'ROUTE_OPTIONS':'The motion states the single W.S. 6-2-708(c) ground and asks the court to vacate only the identified conviction. Its authority paragraph says the court may vacate when participation resulted from trafficking victimization. Declaration item 3 and the instructions expressly retain the presumption from official victim documentation while stating that its absence does not stop filing and allowing alternative evidence. No mandatory official-document checkbox, automatic grant, unrelated waiting table or new statewide deadline is introduced. The requiredOptionsMissing counter is 0, and the alternative-evidence path was independently checked in both saved fixtures.',
 'REPEATING_ROWS':'The packet has individual labelled fact blanks and bounded narrative lines, not a repeating charge/custodian grid. The other-counts item is intentionally required before filing; no partially populated row implies an exhaustive criminal record. Inspected all motion/declaration blanks and both maps; incompleteRows is 0. The second requested-effect dotted line continues onto page 2 with its component intact and does not represent missing data or a lost row.',
 'PROTECTED_FIELDS':'Four signing fields per fixture remain blank: motion signature/date and declaration signature/date. Read from current bytes and all original PNGs: the motion signing block is on page 2, the personal-knowledge attestation and declaration signing block on page 3. No date or signature is supplied. The original court and case are correctly treated as existing participant-record facts, not court-owned future assignments. The adopted declaration does not invent notarization, a sworn-before block or statutory perjury language. Measured protectedWrites=0.',
 'ARTIFACTS':'Both current PDFs match current manifest, queue and original central receipt: canonical e659cde906f0918f7f752a76fb330d9fd2f6a3e6eae1606c8048dc50d080da7a, 11000 bytes/5 pages; boundary cab0c1fd8d4c254ea3c87331891e97696d6c1608e7e9062069aba41f750e86d1, 11140 bytes/5 pages. Git blob bytes are identical at raster pin ffa39d9bd9ddfb42b3c4e8318a5c63abf92fb0b8. Original archive digest matches accepted artifact 10275842350, original verdict equals durable verdict, and all 10 PNG members match original ZIP and durable page hashes. Run 34628970364 covers both documents and all pages with no problems. The old raster is retained as withdrawn history. The historical VF07 BLOCKED_LEGAL_INPUT is not treated as a current PASS; this is the new independent acceptance.',
 'PAGE_ORDER':'Both current page manifests and direct original-page inspection agree: motion pages 1-2; participant declaration page 3; filing instructions pages 4-5. The motion refers to the attached declaration, which immediately follows it. Page 5 is a sparse continuation carrying the final safety/other-counts/immigration/disputed-procedure stop instruction; it is present and readable in each fixture. All expected component content remains in sequence.',
 'CLIPPING_AND_OVERLAP':'Directly inspected all 10 unmodified original central PNGs. No clipping, overlapping text, invisible prefill, corrupted markup or filled protected act was observed. Independent word-box checks counted 766 canonical and 763 boundary words, with zero boxes outside 612x792 pages and zero same-baseline overlaps greater than 1 point. Long boundary identity/contact values fit, and all 18 declared writes are readable. The same-run canary passed with calibration residual 0; five exercised negative controls refused correctly. The real headless-shell render control was not exercised, and no claim is made that it was.',
 'FILING_DESTINATION':'The final decision WY-TRAFFICKING-VACATUR-6-2-708C expressly resolves the old VF07 destination hold: file a Motion to Vacate Conviction in the original criminal court/case. The current motion and declaration carry that court and original case number when known, and the boundary prints required blanks when unknown. The guide repeatedly directs copying those values exactly from the court record, never inference and never a new assignment. This obligation is now measurable against the adopted decision and passes on the delivered bytes.',
 'FEE_AND_WAIVER':'Reused the valid exact-family VF07 fee finding: the bound WY profile directs verification with the clerk for this motion and does not establish a statewide motion fee or waiver. The final decision changes the filing/service design without adding a fee or waiver. Current instructions state that no statewide amount or waiver is supplied, name the clerk of the original criminal court for the prefiling inquiry, and explicitly refuse borrowing a fee from another Wyoming procedure. No $300 felony-expungement fee or unrelated waiver rule is imported.',
 'SERVICE':'The final decision expressly resolves the old VF07 service hold by requiring service on the State/prosecutor under W.R.Cr.P. 49. That recipient and rule are printed on both current filing-instruction components and in the guide, replacing the former unknown-recipient statement. The packet does not invent a statewide hearing deadline, service mode or certificate requirement beyond the adopted instruction. Sensitive material is addressed before filing: review/redact public copies under applicable Wyoming rules, use the original court restricted-filing procedure where applicable, and ask that court about restricted filing before submitting sensitive material. No automatic sealing promise appears.',
 'SELF_HELP_STOP':'Current motion/declaration/guide use bounded personal-knowledge status and causal facts, not graphic narrative. The instructions stop for an unverified original court/case/conviction/date/count record, safety risk, other counts or cases, immigration consequences and disputed procedure requiring help. The guide also stops uncertainty about trafficking status or causal connection. Sensitive material is reviewed/redacted before filing, restricted filing is conditional on the applicable procedure, and filing does not automatically seal the motion, declaration or attachments. The relief remains a request to the court, not an eligibility or outcome guarantee.',
}
assert len(details)==15
decision={
 'decisionId':'WY-TRAFFICKING-VACATUR-6-2-708C','disposition':'LEGAL_CLEAR',
 'record':'data/rcap-grade-a/legal-decisions/LEGAL_BLOCKED_RESOLUTION_2026-09-11.json',
 'sha256':'5e3b6fb6bdeff849949d1d2c44d9b4e7badfdf6e7ba38be6135c388df176b1f2',
 'bindingProductRule':'Use a Motion to Vacate Conviction under W.S. Section 6-2-708(c) in the original criminal court/case. Collect a participant declaration/affidavit establishing trafficking-victim status and causal connection. Official victim documentation creates a presumption when available but its absence is not an automatic stop. Serve the State/prosecutor under W.R.Cr.P. 49; do not invent a statewide hearing deadline; apply Wyoming redaction/restricted-filing rules to sensitive material.',
 'independentReviewReadExactCurrentRecord':True,
 'supersededHolds':['VF07 route-kind/destination uncertainty','VF07 State/prosecutor service uncertainty'],
 'noNewLegalResearchOrOwnerApprovalClaim':True,
}
counter_names=['knownRequiredFieldsMissing','requiredFactsNotCollected','unclassifiedBlanks','incompleteRows','requiredOptionsMissing','requiredComponentsMissing','invisibleWrites','protectedWrites','visualDefects']
row={
 'schemaVersion':'rcap-verifier-lane-return/v1','lane':'VF02','laneKind':'independent-verification','isIndependentVerification':True,
 'shift':'20260911','worker':'wy-current-independent-acceptance','branch':'vf02-wy-final-20260911','worktree':str(ROOT),
 'verifiedAtBase':BASE,'familyId':FAMILY,'itemId':FAMILY,'familyDirectory':OUT,'verdict':'PASS_COMPLETE_INDEPENDENT',
 'claim':'CLAIM_OK VF02 '+FAMILY+' (independent-verification, grant set 44b4b8cf4652dc16)',
 'scope':'One exhaustive current-byte acceptance pass on this exact repaired Wyoming family, adopted final legal rule, source/output manifests and original ten-page raster. Reused valid unchanged exact-family findings; did not reopen legal research or expand the adopted three-component design.',
 'independence':'This reviewer did not build, repair or render the family. Only allowlisted VF02 review files were written; all production/family bytes and file times stayed unchanged.',
 'buildStatus':'state_built','rasterState':'RASTER_PASS','rasterWorkflowRunId':'34628970364',
 'obligationsScored':15,'proofObligations':{name:{'measured':True,'result':'PASS','detail':detail,'evidence':EVIDENCE+'/measurements.json'} for name,detail in details.items()},
 'failedObligationNames':[],'unmeasuredObligations':[],'defects':[],'remainingBlockers':[],
 'nineCounters':{**{name:0 for name in counter_names},'allZero':True,'measuredHere':True,
  'denominatorObserved':'Canonical 11 writes + 7 required fact blanks + 4 protected acts = 22 fields; boundary 7 writes + 11 required fact blanks + 4 protected acts = 22 fields. 18/18 write instances read from own components; all 10 original PNGs inspected.',
  'measuredBy':'Fresh real exact-family completeness CLI, independent saved-PDF text/map/disclosure/word-geometry checks and direct original central PNG inspection. The 11/22 CLI denominator is canonical; separate boundary measurements are recorded, not inferred.'},
 'legalDecisionConsumed':decision,
 'priorEvidence':{'path':'data/rcap-grade-a/packet-factory-24h/vf07/rows.json','familyId':FAMILY,'verifiedAtBase':'a0fbceb30','priorVerdict':'BLOCKED_LEGAL_INPUT',
  'carriedOnly':['source strategy: composed from committed authority, no official participant binary','unchanged exact-route fee/waiver finding','trauma-sensitive and conditional-relief design boundaries'],
  'notCarried':['old PDF hashes','old raster acceptance','old two-component set','old petition/new-case caption treatment','old destination/service legal hold']},
 'sourceBindings':measure['sourceBindings'],'artifactBindings':measure['artifacts'],
 'rasterEvidence':{'workflowRunId':'34628970364','artifactId':'10275842350','pinnedCommit':measure['raster']['pinnedCommit'],
  'documentsDigest':measure['raster']['documentsDigest'],'archiveSha256':measure['raster']['archiveSha256'],
  'originalPagesInspected':10,'allOriginalPageHashesVerified':True,'canary':measure['raster']['canary'],'details':EVIDENCE+'/measurements.json'},
 'actualChecks':measure['commands'],'focusedReadOnlyChecks':{'count':111,'passed':111,'failed':0,'evidence':EVIDENCE+'/measurements.json'},
 'readOnlyProof':EVIDENCE+'/read-only-proof.json','visualReview':EVIDENCE+'/visual-review.json',
 'originalFocusedTestNotRun':measure['originalFocusedTestNotRun'],
 'observations':['The current historical lastIndependentVerification field records the prior VF07 legal hold, not a stale independent PASS; central integration of this new result is the Captain task.',
  'Product wiring binds the current assembled canonical PDF, current map and current rendered manifest. Existing registry-derived empty arrays are not treated as runtime authority; no runtime installation or promotion was reviewed.',
  'The actual --check emits no overlayDirectoryTouched field. Read-only status was proved independently with all family file hashes, lengths, mtime and ctime before/after CLI and completeness, not inferred from such a flag.'],
 'unmeasuredItems':{'externalSourceCurrency':None,'participantImpact':None,'runtimeFulfillment':None,
  'reason':'No external research, participant delivery or runtime/commercial audit was authorized or performed.'},
 'packetsBuiltOrRepairedHere':0,'packetBytesModified':0,'overlayDirectoriesModified':0,'localRastersCreated':0,
 'commercialRoutesOpened':0,'productionTouched':False,'grantsReleased':0,
 'evidencePath':EVIDENCE+'/review.json',
 'grantsNothing':'This result is independent packet acceptance at the stated base and exact hashes. It admits or promotes no family, approves no participant delivery, creates no fulfillment authority and opens no commercial route. Root alone integrates and admits.',
}
visual_notes={
 1:'Motion title, original-case caption and conditional statutory relief are legible. Canonical court/case are filled; boundary court/case remain labelled required blanks. C1-C4 fact blanks are intact.',
 2:'Motion continuation includes declaration reliance, relief request, blank personal signature/date and complete contact block. Boundary long address and email fit. A continuation dotted line from C4 is visible at top.',
 3:'Separately named declaration carries original-case identity, status/period, brief causal connection, optional official-document presumption/alternative evidence, personal-knowledge attestation and blank signature/date. No graphic narrative is demanded.',
 4:'Instructions carry original court/case, declaration, Rule 49 State/prosecutor service, redaction/restricted-filing steps, no automatic seal, fee inquiry and initial stop conditions. All text fits.',
 5:'Sparse continuation carries the final safety, other-counts/cases, immigration and disputed-procedure stop instruction. The instruction is fully readable; no content is clipped or missing.',
}
visual=[]
for page in measure['raster']['originalPNGs']:
 parts=page['member'].split('/');num=int(parts[-1][5:8])
 visual.append({'fixture':parts[-2],'page':num,'member':page['member'],'sha256':page['sha256'],
  'inspectedOriginalImage':True,'imageUnmodified':True,'observation':visual_notes[num],'defects':[]})
save(EVIDENCE+'/visual-review.json',{'schemaVersion':'rcap-independent-original-page-review/v1','familyId':FAMILY,
 'workflowRunId':'34628970364','artifactId':'10275842350','pagesInspected':10,'visualDefects':0,
 'localRasterOrImageTransformPerformed':False,'pages':visual})
save(EVIDENCE+'/review.json',row)
save('data/rcap-grade-a/packet-factory-24h/vf02/rows-vf02-20260911-wy-final.json',{
 'schemaVersion':'rcap-verifier-rows/v2','lane':'VF02','laneKind':'independent-verification','isIndependentVerification':True,
 'verifiedAtBase':BASE,'rows':[row]})
print(json.dumps({'verdict':row['verdict'],'obligations':15,'failed':0,'measuredCounters':9,'evidence':EVIDENCE},indent=2))
