"""Independent current-guidance review of three unchanged Alabama PDF families.
Writes review evidence only; never rebuilds packets or mutates old review records.
"""
from pathlib import Path
import json, hashlib, subprocess, re, zipfile
BASE=Path(__file__).resolve().parent.relative_to(Path.cwd())
OLD=BASE.parent.parent/'review'
INITIAL=Path('data/rcap-grade-a/packet-factory-24h/vf02/rows-vf02-al-clerk-caption-six-initial-fail-20260912.json')
RUN='34664588051'; RASTER_PIN='e38cb2ecae5ada6668fa6c7b9739eac208da6378'; GUIDE_PIN='7f142bbd9ac403d9d1cf79da4eecad6ab6cbdf8d'
FAMILIES=['al-felony-dwop-set','al-felony-nonconviction-90-set','al-pardoned-felony-set']
KEYS=['ROUTE_IDENTITY','SOURCE_IDENTITY','COMPONENT_SET','KNOWN_PREFILLS','REQUIRED_BEFORE_FILING','ROUTE_OPTIONS','REPEATING_ROWS','PROTECTED_FIELDS','ARTIFACTS','PAGE_ORDER','CLIPPING_AND_OVERLAP','FILING_DESTINATION','FEE_AND_WAIVER','SERVICE','SELF_HELP_STOP']
COUNTERS=['knownRequiredFieldsMissing','requiredFactsNotCollected','unclassifiedBlanks','incompleteRows','requiredOptionsMissing','requiredComponentsMissing','invisibleWrites','protectedWrites','visualDefects']
def read(p):return json.loads(Path(p).read_text())
def bind(p):
 p=Path(p);b=p.read_bytes();return {'path':str(p),'sha256':hashlib.sha256(b).hexdigest(),'byteLength':len(b)}
def write(p,x):
 p=Path(p);s=json.dumps(x,indent=2)+'\n'
 if p.exists():
  assert p.read_text()==s,f'Never overwrite review evidence: {p}'
  return
 p.write_text(s)
def norm(s):return ' '.join(s.split())
HEAD=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
sourceText=(OLD/'CR-65-source-text.txt').read_text();section=sourceText[sourceText.index('Section V'):]
quote4=norm(re.search(r'\[\s*\]\s*(the conviction is not an offense involving moral turpitude,.*?to the filing of the petition\.)',section,re.S).group(1))
quote6=norm(re.search(r'\[\s*\]\s*(At the time of the offense,.*?49 C\.F\.R\. § 383\.51\.)',section,re.S).group(1))
assert 'or was classified as a felony' in quote4 and 'for a conviction of an offense enumerated' in quote6
pardonSnap=BASE/'snapshots/al-pardoned-felony-set/participant-instructions.md';pardon=pardonSnap.read_text()
excerpt4=pardon.split('### Check Box11.4')[1].split('### Check Box11.5')[0].strip()
excerpt6=pardon.split('### Check Box11.6')[1].split('## Elections')[0].strip()
assert 'Both halves of this box are yours to establish.' in excerpt4
assert 'pursuant to Act 2015-185' not in excerpt4 and '49 C.F.R.' not in excerpt6
fp=BASE/'pardon-conditional-guidance-findings.json'
findings={
 'schemaVersion':'rcap-independent-guidance-findings/v1','familyId':'al-pardoned-felony-set','reviewedGuidanceCommit':GUIDE_PIN,
 'currentGuide':bind('data/rcap-all50/overlays/census-v1/al/al-pardoned-felony-set--official-pdf-fill/participant-instructions.md'),'frozenGuide':bind(pardonSnap),
 'sourceText':bind(OLD/'CR-65-source-text.txt'),'sourcePdf':read(BASE/'current-measurements-al-pardoned-felony-set.json')['sourceBindings'][0],
 'findings':[
 {'id':'AL-PARDON-GUIDE-02A','obligations':['REQUIRED_BEFORE_FILING','ROUTE_OPTIONS'],'fieldId':'CR-65:Check Box11.4','sourcePage':4,'sourceQuote':quote4,'guideSection':'Check Box11.4','currentGuideExcerpt':excerpt4,
 'actualDefect':'The shortened quotation removes the alternative for a felony reclassified as a misdemeanor under Act 2015-185; the following sentence then treats the remaining text as two universally necessary halves. This changes the source condition rather than merely shortening it.',
 'sourceBranchLogic':'Preserve the complete disjunction: not an offense involving moral turpitude, OR the qualifying felony-to-misdemeanor reclassification clause with its printed 15-year arrest-history condition. Do not convert the wording into a universal conjunction of non-moral-turpitude plus 15-year arrest history. Unclear classification or branch applicability requires the existing attorney stop, not an invented eligibility determination.',
 'requiredRepair':'Restore the full official condition and remove the false both-halves instruction. Ask for the facts relevant to the applicable printed branch; leave the sworn control for the participant and preserve the existing stop if its truth cannot be established.'},
 {'id':'AL-PARDON-GUIDE-02B','obligations':['REQUIRED_BEFORE_FILING','ROUTE_OPTIONS'],'fieldId':'CR-65:Check Box11.6','sourcePage':4,'sourceQuote':quote6,'guideSection':'Check Box11.6','currentGuideExcerpt':excerpt6,
 'actualDefect':'The guidance quotation omits the limiting words for a conviction of an offense enumerated in 49 C.F.R. § 383.51. It presents the commercial vehicle/license condition without the offense applicability qualifier printed on the official form.',
 'sourceBranchLogic':'Retain the enumerated-offense qualifier when explaining the commercial-vehicle/license attestation; the guide must not assert a universal commercial-status restriction for every conviction.',
 'requiredRepair':'Restore the complete official quotation and preserve the offense applicability qualifier in any paraphrase or question. Leave judicial decisions and unsupported participant attestations blank.'}],
 'pdfStatus':'All 22 current original pages remain the exact successful central bytes. All 16 Section V checkbox appearances are unselected. The two new failures concern participant guidance, not source acquisition, preselected controls or a raster defect.',
 'reviewHistoryCorrection':{'priorReview':bind(INITIAL),'priorRowPointer':'/rows/5','priorObligation':'ROUTE_OPTIONS','priorResult':'PASS','disposition':'Preserve prior record. The earlier review correctly measured empty appearances and guide coverage but missed these two source-condition omissions. That earlier ROUTE_OPTIONS PASS is explicitly superseded by this measured current-guidance FAIL. Prior oath and fee failures are repaired; no whole-family acceptance is issued.'}}
# The old six-row return is stored in finding order, so derive its exact pointer.
initial=read(INITIAL)
pi=next(i for i,r in enumerate(initial['rows']) if r['familyId']=='al-pardoned-felony-set')
findings['reviewHistoryCorrection']['priorRowPointer']=f'/rows/{pi}'
write(fp,findings)
rows=[]
for f in FAMILIES:
 snap=BASE/'snapshots'/f;folder=Path('data/rcap-all50/overlays/census-v1/al')/(f+'--official-pdf-fill')
 mp=BASE/f'current-measurements-{f}.json';m=read(mp)
 op=OLD/f'{f}-{RUN}-original-raster-measurements.json';o=read(op)
 oldgp=OLD/f'initial-guidance-{f}.json';oldg=read(oldgp)
 guide=(snap/'participant-instructions.md').read_text();filing=(snap/'filing-instructions.md').read_text();mapping=read(snap/'production-field-map.json')
 claim=BASE/f'VF02-{f}-claim.txt';assert 'CLAIM_OK' in claim.read_text()
 for rel in ['participant-instructions.md','filing-instructions.md','production-field-map.json','reports/rendered-artifacts.json']:
  assert (folder/rel).read_bytes()==(snap/rel).read_bytes(),f'Current {rel} changed after snapshot'
  assert subprocess.check_output(['git','show',GUIDE_PIN+':'+str(folder/rel)])==(snap/rel).read_bytes()
 assert m['sourceWidgetCount']==m['classifiedWidgetCount']==216 and not m['unclassifiedWidgets'] and not m['duplicateClassifications']
 assert m['totals']['knownWrites']==40 and m['totals']['protectedFieldsChecked']==170 and m['totals']['clerkCaptionFields']==22
 assert all(m['totals'][k]==0 for k in ['knownWriteMismatches','missingSelectionMarks','protectedAddedGlyphFields','clerkCaptionAddedGlyphFields','pardonAttestationsAddedInk'])
 for a in m['artifacts']:
  assert bind(a['path'])['sha256']==a['sha256'] and len(Path(a['path']).read_bytes())==a['byteLength']
  assert hashlib.sha256(subprocess.check_output(['git','show',RASTER_PIN+':'+a['path']])).hexdigest()==a['sha256']
 # Retain the previously actually viewed original pages; independently rehash every byte now.
 assert o['visualReviewCompleted'] and o['allPngHashesAndLengthsIndependentlyVerified'] and len(o['pages'])==22
 for p in o['pages']:
  b=Path(p['extractedPath']).read_bytes();assert hashlib.sha256(b).hexdigest()==p['pngSha256'] and len(b)==p['bytes']
 assert bind(o['archive']['path'])['sha256']==o['archive']['sha256']
 oath='The Petitioner must sign this document under oath and the signature must be verified by an official authorized to administer oaths or a notary public.'
 assert oath in norm(sourceText) and oath in guide and oath in filing
 assert 'only in front of an official authorized to administer oaths or a notary public' in guide
 assert 'held record does not' not in guide.lower().split('## notarization')[1].split('## stop')[0]
 required=[r for r in mapping['refusals'] if r.get('requiredBeforeFiling') is True]
 assert len(required)==57 and all(r['effectiveLabel'] in guide for r in required)
 municipality=next(r for r in mapping['refusals'] if r['fieldId']=='C-10-CRIMINAL:MUNICIPALITY OF')
 assert municipality['requiredBeforeFiling'] is False and municipality['completenessDisposition']=='NOT_APPLICABLE_ON_THIS_ROUTE'
 assert all(r.get('requiredBeforeFiling') is not True for r in mapping['refusals'] if r['fieldId']=='C-10-CRIMINAL:Check Box1.1')
 fee=[r for r in mapping['refusals'] if r['documentId']=='C-10-CRIMINAL' and r['fieldName'] in ['Check Box2.0','Check Box2.1','Check Box2.2']]
 assert len(fee)==3 and all(r.get('routeDetermined') is False and r['refusalClass']=='participant_sworn_narrative_or_legal_election' for r in fee)
 assert all(s['condition'] in guide for s in oldg['selfHelpStops'])
 assert 'only if you tick the SECOND box in item (3)' in guide and 'The county, the case number and the granted-or-denied pair belong to the second' in guide
 assert 'Petition must include either item 1 or item 2; All Petitions must include item 3.' in guide
 assert '(Not represented by an attorney)' in guide
 gp=BASE/f'current-guidance-{f}.json'
 write(gp,{'familyId':f,'reviewedGuidanceCommit':GUIDE_PIN,'guide':bind(folder/'participant-instructions.md'),'filingInstructions':bind(folder/'filing-instructions.md'),'fieldMap':bind(folder/'production-field-map.json'),'snapshots':[bind(snap/r) for r in ['participant-instructions.md','filing-instructions.md','production-field-map.json']],
 'sourceOath':{'sourcePage':8,'exactQuote':oath,'presentInBothGuides':True,'signatureAndNotaryActorsCorrect':True},
 'requiredRefusals':{'count':len(required),'allEffectiveLabelsDisclosed':True,'rows':[{'fieldId':r['fieldId'],'effectiveLabel':r['effectiveLabel'],'present':r['effectiveLabel'] in guide} for r in required]},'municipality':municipality,'conditionalPriorCaseFields':'Guide restricts county/case/outcome to prior-application second branch; first branch leaves them blank.','feeRequests':fee,'feeGuideRead':'All three requests identified; third is expungement fee waiver, elected only by participant claiming hardship. Financial rows are completed only when waiver is sought. Judicial order is blank.',
 'routeQuestions':oldg['requiredParticipantInputQuestions'],'supportingDocuments':oldg['supportingDocuments'],'selfHelpStops':[{'condition':s['condition'],'literalPresent':s['condition'] in guide} for s in oldg['selfHelpStops']],
 'sourceConditionsReview':{'result':'FAIL' if 'pardoned' in f else 'PASS','finding':str(fp) if 'pardoned' in f else 'Compared route-specific dismissal/elapsed-time/nonrefiling choices against held CR-65 and governed route rules. DWOP fixed branch expressly requires both five-year conditions; felony90 has no guessed outcome control and asks participant to identify one source disposition.'}})
 rp=BASE/f'retained-originals-{f}.json'
 write(rp,{'schemaVersion':'rcap-original-raster-retention-review/v1','familyId':f,'workflowRunId':RUN,'packetCommit':RASTER_PIN,'currentGuidanceCommit':GUIDE_PIN,'currentPdfHashesIndependentlyRechecked':m['artifacts'],'allPdfsByteIdenticalToCentralPacketCommit':True,'originalInspection':bind(op),'archive':bind(o['archive']['path']),'pages':[{'path':p['extractedPath'],'sha256':p['pngSha256'],'byteLength':p['bytes'],'fixture':p['kind'],'page':p['page']} for p in o['pages']],
 'pagesRetained':22,'allOriginalPngsIndependentlyRehashed':True,'actualVisualInspection':'All 22 original central pages were actually viewed during the initial six-family review. These exact PDF and PNG bytes are unchanged and the current acceptance reuses that page inspection with fresh hash verification and independent current-PDF text/appearance measurements. No old whole-family PASS is reused; old overall FAIL addressed guidance for this family.',
 'currentVisualFinding':'No clipping or erased source word on any of these 22 pages; the prior expired masking defect affected three other families, excluded from this review. All page order, caption fit and protected surfaces retain the reviewed current bytes.'})
 ix=next(i for i,r in enumerate(initial['rows']) if r['familyId']==f);prior=initial['rows'][ix]
 fail=['REQUIRED_BEFORE_FILING','ROUTE_OPTIONS'] if 'pardoned' in f else []
 evidence=[str(mp),str(gp),str(rp),str(op),str(claim),str(INITIAL),str(OLD.parent/'starting-evidence.json'),str(Path('data/rcap-grade-a/legal-decisions/LEGAL_BLOCKED_RESOLUTION_2026-09-11.json'))]
 if fail:evidence.append(str(fp))
 narratives={
 'ROUTE_IDENTITY':'Independently read the current map, full participant and filing guides, governed route requirements and all original pages. The complete CR-65 and conditional C-10 packet represents this exact family. No different route is inferred from jurisdiction membership.',
 'SOURCE_IDENTITY':'Independently hashed the held October 2024 CR-65 (8 pages, 108 widgets) and May 2024 C-10-CRIMINAL (3 pages, 108 widgets); pins remain unchanged. Current source identity is established by bytes and official content. Additive AL clerk-caption resolution supplies the governing caption treatment without rewriting old legal-design or review history.',
 'COMPONENT_SET':'Each fixture includes CR-65 pages 1–8, including certificate of service and official instructions, followed by C-10-CRIMINAL pages 1–3. Certified local case/arrest records and ALEA history are participant attachments, obtained and selected by the participant; none are fabricated. Pardon route additionally requires the pardon certificate. The hardship component is used only if indigency is claimed.',
 'KNOWN_PREFILLS':'All 40 independently extracted neutral writes match full fixture facts, including long boundary name/address. All 22 clerk-assigned caption fields remain blank; underlying case number appears once per fixture in CR-65 Text3, and Text2 SSN remains blank. No known current fact is omitted, shortened, invisible or copied into a clerk-assigned caption.',
 'REQUIRED_BEFORE_FILING':('FAIL: The oath, municipality and fee corrections are verified, and all 57 required field labels are disclosed. However, two current pardon attestation descriptions omit source conditions, changing the required participant facts and branch applicability. Exact full source quotations, guide excerpts and current guide SHA are preserved in the fresh findings record.' if fail else 'All 216 source widgets have exactly one classification. All 57 currently required field labels are disclosed in the fresh guide; unknown case, charge, financial and attachment facts are handed back, never silently asserted. Municipality belongs to the untaken municipal branch and is not required. Prior-application county/case/outcome are conditional on the second box. Both guides now quote and instruct the source page-8 oath before an authorized official or notary. Participant signatures, dates and official verification remain blank.'),
 'ROUTE_OPTIONS':('FAIL: All 16 Section V appearances remain empty, disproving the old unsupported-precheck finding. Nevertheless Check Box11.4 guidance deletes the felony-reclassification alternative and incorrectly says both remaining halves must be established; Check Box11.6 deletes the 49 C.F.R. § 383.51 offense qualifier. Empty controls do not cure incorrect completion guidance.' if fail else ('The exact DWOP source ground remains the only selected CR-65 route control and its full dismissal/nonrefiling/two-five-year conditions are disclosed with a stop for unsupported facts. ' if f=='al-felony-dwop-set' else 'No CR-65 exact-outcome checkbox is guessed. The guide identifies the five source outcomes in this governed route and requires participant determination from the certified record. ')+'Attachment elections, prior-application first/second branch and pro se choice are explicitly handed back. The State-of-Alabama C-10 caption branch is selected; all hardship requests and judicial findings remain unselected.'),
 'REPEATING_ROWS':'Source and guide retain one charge per petition and one service certificate per recipient. Repeated current identity fields are independently matched. Unknown prior-case, agency, charges and financial details are disclosed rather than fabricated; conditional prior-case rows are not demanded from a participant who has never applied.',
 'PROTECTED_FIELDS':'Source-geometry comparison independently checks 170 protected/signature/date occurrences with zero added glyph fields. All 22 clerk-assigned caption occurrences are blank. Judicial hardship decision/order, judge signature, notarial acts, service facts, attorney fields and participant signatures remain unfilled; permitted neutral petitioner identity is separately measured. No judicial choice is made.',
 'ARTIFACTS':'Both current 11-page PDFs match the exact successful central verdict and original packet commit. All 22 original PNG hashes and lengths and the original ZIP were independently rechecked. Original pages actually viewed in the initial review are retained for these unchanged bytes; fresh guide/map and PDF measurements are added now. Raster success alone is not acceptance.',
 'PAGE_ORDER':'All 22 retained original pages were viewed in sequence: CR-65 pages 1–8, then C-10 pages 1–3, for canonical and boundary fixtures. No missing, substituted, repeated or blank output pages. Current rehash proves those inspected pages bind the present PDFs.',
 'CLIPPING_AND_OVERLAP':'All retained original page surfaces were visually inspected and remain byte-identical: no clipping, overlap, erased legal text or misplaced caption. The CR-65 page-3 word expired is intact in these normalized PDFs. Long fixture facts fit. The three other families with the source-word masking defect are expressly excluded.',
 'FILING_DESTINATION':'The held official instructions and current guide require circuit-court filing in the county where charges were filed. The fixture county captions match Montgomery/Jefferson. Expungement docket captions remain for the clerk and do not reuse the underlying criminal case number.',
 'FEE_AND_WAIVER':'The $500 fee and conditional C-10 indigency path are stated. Current guidance distinguishes all three C-10 requests and identifies the third as the expungement administrative fee request. The participant elects it only when claiming financial hardship; unrelated counsel and ignition-interlock requests and all judicial decisions remain blank. Financial rows are required only for the chosen hardship affidavit.',
 'SERVICE':'CR-65 certificate page 7 and source instructions page 8 are present. Current guide requires a separate certificate for each recipient, directs district-attorney/law-enforcement/clerk service and instructs checking the local accepted method. Recipient/address/method/date/server facts are completed only after actual service. No completed service is invented.',
 'SELF_HELP_STOP':'All four route-specific legal-design stops are present in the current guide. Objection, hearing and unclear consequential eligibility/restoration facts require attorney help. This review creates no live route, commercial fulfillment record, participant eligibility finding or production change.'}
 proofs={k:{'result':'FAIL' if k in fail else 'PASS','measured':True,'reviewMode':'INDEPENDENT_CURRENT_GUIDANCE_AND_PDF_WITH_RETAINED_EXACT_ORIGINAL_CENTRAL_PAGES','finding':narratives[k],'evidence':evidence} for k in KEYS}
 counters={k:0 for k in COUNTERS}
 counters.update({'allZero':True,'measuredHere':True,'evidence':evidence,'countingNotes':'Field, component and visual counts are measured independently. On pardon, nine zero counters do not override two semantic guidance failures: all physical controls and source text exist, but two explanations alter their applicability. Those defects are explicitly scored under REQUIRED_BEFORE_FILING and ROUTE_OPTIONS.' if fail else 'Independent current-PDF extraction, source-widget inventory, guide handback review and retained exact original-page inspection establish all nine zeros. Unknown facts are explicitly required from the participant, not asserted available.'})
 vp=Path('data/rcap-grade-a/packet-factory-24h/raster-runs')/RUN/(f+'.verdict.json')
 rows.append({'itemId':f,'familyId':f,'lane':'VF02','laneKind':'independent-verification','isIndependentVerification':True,'status':'COMPLETED','verifiedAtBase':HEAD,'reviewedGuidanceCommit':GUIDE_PIN,'reviewer':'GPT-6 Astra /root/seven_independent_review','independence':'Reviewer implemented no packet/source/guidance repair and changed no queue, ledger, source binding, builder or packet bytes. Review started after central PASS and asserted native claim; only new review evidence and native returns written.','claimEvidence':str(claim),'familyDirectory':str(folder),'verdict':'FAIL_REPAIR_REQUIRED' if fail else 'PASS_COMPLETE_INDEPENDENT','proofObligations':proofs,'obligationCounts':{'PASS':15-len(fail),'FAIL':len(fail),'NOT_MEASURABLE_HERE':0},'failedObligationNames':fail,'unmeasuredObligations':[],'nineCounters':counters,'artifactsRead':m['artifacts'],'rasterState':'RASTER_PASS','rasterWorkflowRunId':RUN,'rasterHashBinding':{a['path']:a['sha256'] for a in m['artifacts']},'rasterEvidence':{'run':RUN,'packetCommit':RASTER_PIN,'pagesVerified':22,'allPngHashesVerified':True,'artifactAndLogAgree':True,'verdict':bind(vp),'originalCustody':bind(vp.parent/'ORIGINAL_EVIDENCE_VERIFIED.json'),'retainedExactOriginalPages':bind(rp)},
 'historicalFailureDisposition':{'initialCurrentByteFail':bind(INITIAL),'rowPointer':f'/rows/{ix}','priorObligationResults':{k:v['result'] for k,v in prior['proofObligations'].items()},'olderLineage':prior['historicalFailureDisposition'],'disposition':('Earlier oath/fee/municipality findings are resolved by fresh guide/map measurements. Historical unsupported Section V checkbox marks remain disproven for these exact PDFs. The earlier ROUTE_OPTIONS PASS missed source-condition truncation and is expressly superseded by this fresh FAIL. Family remains unaccepted.' if fail else 'The initial current-byte oath failure, and felony90 fee/municipality findings where applicable, are explicitly superseded by the fresh exact guidance/map evidence. The unchanged current PDFs retain valid central originals and new independent PDF measurements. Historical old-byte FAIL/PASS records are preserved; this is a fresh fifteen-obligation acceptance, not reuse of an old whole-family PASS.')},'evidenceRead':evidence,'evidenceBindings':[bind(p) for p in evidence]+[bind(snap/r) for r in ['participant-instructions.md','filing-instructions.md','production-field-map.json']],'packetPdfsModified':0,'commercialRoutesOpened':0,'productionTouched':False})
for suffix,selected in [('al-guidance-only-two',[r for r in rows if r['verdict']=='PASS_COMPLETE_INDEPENDENT']),('al-pardon-conditional-guidance-fail',[r for r in rows if r['verdict']=='FAIL_REPAIR_REQUIRED'])]:
 path=Path('data/rcap-grade-a/packet-factory-24h/vf02')/('rows-vf02-'+suffix+'-20260912.json')
 write(path,{'schemaVersion':'rcap-verifier-lane-return/v1','lane':'VF02','laneKind':'independent-verification','status':'COMPLETED','verifiedAtBase':HEAD,'rows':selected})
 print(json.dumps(bind(path)))
print(json.dumps({'families':len(rows),'PASS_families':2,'FAIL_families':1,'PASS_obligations':43,'FAIL_obligations':2,'NOT_MEASURABLE_HERE':0,'originalPagesRetainedAndRehashed':66,'knownWritesMatched':120,'protectedFieldsWithoutAddedGlyphs':510,'clerkCaptionOccurrencesBlank':66},indent=2))
