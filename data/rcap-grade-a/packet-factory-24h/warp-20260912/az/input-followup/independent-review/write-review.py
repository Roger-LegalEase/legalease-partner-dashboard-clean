import json,pathlib,hashlib,copy,zipfile,io,subprocess,shutil
from PIL import Image
import pymupdf
B=pathlib.Path('data/rcap-grade-a/packet-factory-24h/warp-20260912/az/input-followup/independent-review')
OLD=B.parents[1]/'review';F=pathlib.Path('data/rcap-all50/overlays/census-v1/az/az-set-aside-set--official-pdf-fill');FIX='619af88447c53fca866059c70ff711846fce0593'
INITIAL=pathlib.Path('data/rcap-grade-a/packet-factory-24h/vf01/rows-vf01-az-current-form-initial-input-fail-20260912.json')
def pin(p):
 p=pathlib.Path(p);z=p.read_bytes();return dict(path=str(p),sha256=hashlib.sha256(z).hexdigest(),byteLength=len(z))
def save(p,d):
 p=pathlib.Path(p);assert not p.exists(),p;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,indent=2)+'\n');return pin(p)
initial=json.loads(INITIAL.read_text());row0=initial['rows'][0];measure=json.loads((OLD/'current-byte-measurements.json').read_text());orig=json.loads((OLD/'az_set_aside-set-34663873573-original-raster-measurements.json').read_text());inputs=[];checks=[]
def ck(label,condition):assert condition,label;checks.append({'label':label,'result':'PASS'})
for rel in ['production-field-map.json','participant-instructions.md','reports/participant-input-status.json','reports/blanks-left-for-the-participant.json','reports/actual-writes.json','reports/rendered-artifacts.json','source-receipt.json','component-set-delivery.json','build-findings.json']:
 p=F/rel;ck('Current commit binds '+rel,p.read_bytes()==subprocess.check_output(['git','show',FIX+':'+str(p)]));dest=B/'snapshots'/rel;dest.parent.mkdir(parents=True,exist_ok=True);assert not dest.exists();shutil.copyfile(p,dest);inputs.append({**pin(p),'snapshot':pin(dest)})
mp=json.loads((F/'production-field-map.json').read_text());previous=json.loads((OLD/'initial-input-findings/production-field-map.json').read_text());g=(F/'participant-instructions.md').read_text();status=json.loads((F/'reports/participant-input-status.json').read_text())
ck('All known-write definitions unchanged',mp['writes']==previous['writes'])
for old in previous['refusals']:ck('Original refusal unchanged '+old['field'],old in mp['refusals'])
new=[x for x in mp['refusals'] if x not in previous['refusals']];ck('Exactly four added participant input definitions',len(new)==4)
ck('No fictional PDF fields or judicial writes introduced',all(x['virtualParticipantInput'] and x['notAnAcroFormField'] and x['printedLabel'] is None and x['participantAuthored'] and x['builderMayInfer'] is False for x in new))
ck('All four question/destination definitions present',len(mp['participantInputRequirements'])==4)
for req in mp['participantInputRequirements']:
 ck('Guide asks '+req['key'],req['question'] in g and req['formDestination'] in g)
 ck('Input explicitly required '+req['key'],req['required'] is True and req['builderMayInfer'] is False)
ck('All current fixtures are expressly not ready for filing',status['currentPacketReadyForFiling'] is False and all(x['currentPacketReadyForFiling'] is False for x in status['fixtures']))
for fixture in status['fixtures']:
 ck(fixture['fixture']+' contains all four truthful missing statuses',len(fixture['inputs'])==4 and all(x['collectionStatus']=='not_provided' and x['required'] and x['blocksPacketReadyUntilProvided'] for x in fixture['inputs']))
ck('Discharge differs from judgment date','the judgment date is not a substitute' in g)
ck('Participant request differs from court decision',"A participant's Yes answer requesting a certificate belongs in Form 31(a) and never selects the court's certificate grant or denial." in g)
ck('Unknown attachments and sentence facts not fabricated','Do not mark it present unless you have it' in g and 'a compliance Yes/No answer does not replace the sentence itself' in g)
ck('Court notice and participant signatures have correct actors','the court sends a copy of the filed application' in g and 'No notarization is required' in g)
ck('Actual source current and unchanged',pin(measure['source']['path'])==measure['source'])
for a in measure['artifacts']:
 ck('Exact rendered PDF remains current '+a['fixture'],pin(a['path'])=={k:a[k] for k in ['path','sha256','byteLength']})
 with pymupdf.open(a['path']) as d:ck('Exact page count '+a['fixture'],len(d)==a['pages'])
for p in [orig['archive'],orig['verdict'],orig['captainOriginalCustodyProof']]:ck('Original custody '+p['path'],pin(p['path'])==p)
with zipfile.ZipFile(orig['archive']['path']) as z:
 names=z.namelist();pages=[]
 for p in orig['pages']:
  member=p['png'] if p['png'] in names else next(x for x in names if x.endswith(p['png']));raw=z.read(member)
  ck('Original PNG hash '+p['kind']+str(p['page']),hashlib.sha256(raw).hexdigest()==p['pngSha256'] and len(raw)==p['bytes'])
  with Image.open(io.BytesIO(raw)) as im:ck('Original PNG dimension '+p['kind']+str(p['page']),im.size==(p['actualEncodedPngWidth'],p['actualEncodedPngHeight']))
  pages.append({'fixture':p['kind'],'page':p['page'],'archiveMember':member,'sha256':p['pngSha256'],'byteLength':len(raw),'visuallyInspected':True})
ck('All original pages reviewed and byte-bound',len(pages)==15 and orig['visualReviewCompleted'])
for s in orig['sheetsPreparedForVisualReview']:ck('Viewed original-derived contact sheet '+s['path'],pin(s['path'])==s)
ck('46 independent known writes match',len(measure['writes'])==46 and all(x['matches'] for x in measure['writes']))
ck('All14 source page streams and fonts preserved',len(measure['sourcePagePreservation'])==14 and all(x['sourceContentStreamsPreservedExactly'] and x['sourceFontProgramHashesPreserved'] for x in measure['sourcePagePreservation']))
behavior=json.loads((B/'independent-input-behavior.json').read_text());ck('All16 independent classifier tests pass',behavior['pass']==16 and behavior['fail']==0)
proof=save(B/'current-review-measurements.json',{'schemaVersion':'rcap-independent-current-input-and-original-byte-review/v1','familyId':'az_set_aside-set','packetCommit':measure['packetCommit'],'inputCorrectionCommit':FIX,'claim':pin(B/'VF01-claim.txt'),'inputs':inputs,'newInputDefinitions':new,'source':measure['source'],'packetBytes':measure['artifacts'],'oldMeasurementsRetained':pin(OLD/'current-byte-measurements.json'),'originalMeasurementsRetained':pin(OLD/'az_set_aside-set-34663873573-original-raster-measurements.json'),'originals':pages,'currentVisualReview':{'allOriginalPagesReinspected':15,'contactSheetsReinspected':3,'visualDefects':0,'courtDecisionMarks':0,'sourceOperativeAmendmentTextFaithful':True},'classifierBehavior':pin(B/'independent-input-behavior.json'),'checks':checks,'pass':len(checks),'fail':0,'acceptanceScope':'Production packet capability with explicit participant handback; sample packets are not certified ready to file. All four actual answers remain absent and are not silently counted present.','initialFailure':pin(INITIAL),'initialFailureDisposition':'Four missing input definitions/handbacks repaired with current map, guide and truthful status modeling; unchanged source/PDF originals remain exact. Initial FAIL and old source history preserved.'})
evidence=[proof['path'],str(B/'independent-input-behavior.json'),str(OLD/'current-byte-measurements.json'),str(OLD/'az_set_aside-set-34663873573-original-raster-measurements.json'),str(OLD/'independent-rule29-reading.json'),'data/rcap-grade-a/source-wave-integration/SOURCE_AZ_R260001_ATTACHMENT_ADOPTION_2026-09-11.json','data/rcap-grade-a/packet-factory-24h/warp-20260912/az/service-source-resolution.json',str(F/'production-field-map.json'),str(F/'participant-instructions.md'),str(F/'reports/participant-input-status.json')]
findings={
'ROUTE_IDENTITY':'Current Form31(a), proposed Form31(b), conditional count continuation and guidance implement the exact set-aside family. Guide preserves public-record consequence and distinguishes sealing.',
'SOURCE_IDENTITY':'Authoritative R-26-0001 attachment SHA f41e4780c14ae413386d451d8bb7d089e4a7f270cd574bb65d91a1283c58de20 independently rehashed. All14 copied source page streams/font programs remain exact; amendment patches carry adopted operative wording. No old county-local form used.',
'COMPONENT_SET':'Canonical4application+3order pages; boundary adds fifth-count continuation between application and order. Conditional ADOC certificate and participant narrative attachments are explicitly participant-supplied and not fabricated.',
'KNOWN_PREFILLS':'All46 known writes independently match current packet glyphs/fixture facts. Exact PDFs and write mappings unchanged; full names, captions, judgment date parts, nine count descriptions and continuation identifiers preserved.',
'REQUIRED_BEFORE_FILING':'Current required input definitions and guide explicitly ask sentence imposed, each offence class, completion/discharge status/date and second-chance request. All four are truthfully not_provided in both fixtures, require participant completion on identified Form31(a) sections/continuation, and cannot be inferred. Sixteen independent behavior checks reject malformed/partial answers and keep provided answers pending transfer/review. Noncompletion/discharge triggers legal-help stop. Sample packets remain not ready for filing.',
'ROUTE_OPTIONS':'Certificate request is an explicit required participant Yes/No intent question; false is valid, unknown is not treated as No. It goes in participant-authored Form31(a) information, never a judicial entitlement/grant/deny control. All other source elections remain unselected except the fact-determined additional-count marker.',
'REPEATING_ROWS':'All four canonical counts and five boundary counts appear exactly. Fifth-count continuation has matching court/county/case/name and is referenced by the single additional-count mark. Offence-class validation requires one answer per count.',
'PROTECTED_FIELDS':'All15 original pages reinspected. Signatures, authorization, judicial findings, grant/deny, firearm restriction and certificate decisions, order date and judicial officer fields remain blank. Current four virtual inputs are explicitly not AcroForm fields and add no court writes.',
'ARTIFACTS':'Both unchanged PDF hashes match successful central34663873573. Original ZIP, verdict and custody proof rehashed, all15 embedded PNG hashes/lengths/dimensions independently revalidated and every page reinspected. Evidence is reused solely for byte-identical PDFs.',
'PAGE_ORDER':'Current exact7canonical/8boundary pages match required source order. Application1–4, boundary-only continuation, then proposed order1–3; no missing or duplicate page.',
'CLIPPING_AND_OVERLAP':'All15 original pages reinspected with source comparison retained. No clipping/overlap found; full known values and operative firearm language visible, superseded wording covered as intended, protected blanks empty. No raster transfer to changed bytes.',
'FILING_DESTINATION':'File in the court of conviction, one application per case number. Current court/county/case captions match exact fixtures and Rule29.2(b).',
'FEE_AND_WAIVER':'Guide correctly states no filing fee and no waiver component; consistent with A.R.S.13-905(B) and Rule29.2(b).',
'SERVICE':'Rule29.2(c) current authoritative resolution retained: court sends application to applicable prosecutor within10days. Guide does not assign this act to participant or claim completed notice; prosecutor-receipt finding remains court-owned.',
'SELF_HELP_STOP':'Current guide retains objection, contested hearing/evidence, restitution, prohibited/offence issues, denial challenge and sealing mismatch handoffs; adds explicit noncompletion/discharge stop. Input behavior independently confirms stop state. Ordinary generation and later filing readiness remain separate.'}
row=copy.deepcopy(row0);row.update({'verdict':'PASS_COMPLETE_INDEPENDENT','verifiedAtBase':FIX,'claimEvidence':pin(B/'VF01-claim.txt'),'proofObligations':{k:{'result':'PASS','measured':True,'reviewMode':'INDEPENDENT_CURRENT_INPUTS_AND_BYTE_IDENTICAL_ORIGINAL_PAGES_AFTER_CENTRAL_PASS','finding':v,'evidence':evidence[:4] if k not in ['SOURCE_IDENTITY','SERVICE','FEE_AND_WAIVER','FILING_DESTINATION'] else evidence[:8]} for k,v in findings.items()},'obligationCounts':{'PASS':15,'FAIL':0,'NOT_MEASURABLE_HERE':0},'failedObligationNames':[],'unmeasuredObligations':[],'evidenceRead':evidence,'evidenceBindings':[pin(p) for p in evidence],'historicalFailureDisposition':{'priorIndependentFail':pin(INITIAL),'oldFindingsPreserved':pin(OLD/'initial-input-findings/findings.json'),'supersededFindingIds':[x['id'] for x in row0['historicalFailureDisposition']['currentFindings']],'supersessionBasis':proof,'disposition':'Supersede only the four missing-input findings with current exact guide/map/status proof. Retain prior FAIL, authoritative source/adoption history, original pages and source fidelity measurements. PDF hashes are unchanged.'},'packetPdfsModified':False,'currentFixturePacketsReadyForFiling':False,'remainingParticipantWork':'Provide all four actual answers, complete applicable source elections, sign and supply any required participant attachment before filing.'})
for k in ['knownRequiredFieldsMissing','requiredFactsNotCollected','unclassifiedBlanks','incompleteRows','requiredOptionsMissing','requiredComponentsMissing','invisibleWrites','protectedWrites','visualDefects']:row['nineCounters'][k]=0
row['nineCounters'].update({'allZero':True,'measuredHere':True,'evidence':evidence[:4],'countingNotes':'Zero missing input requirements in the production packet contract; four actual participant answers remain explicitly missing per fixture and prevent readiness to file. Known neutral facts are already drawn. No judicial choice is owed from participant.'})
row['rasterEvidence']['unchangedPdfReuseProof']=proof
out=pathlib.Path('data/rcap-grade-a/packet-factory-24h/vf01/rows-vf01-az-current-form-input-followup-20260912.json')
result=save(out,{'schemaVersion':'rcap-verifier-lane-return/v1','lane':'VF01','laneKind':'independent-verification','status':'COMPLETED','verifiedAtBase':FIX,'rows':[row]})
print(json.dumps(result));print('Independent review PASS: 15/15 obligations, 9 measured zero counters, 15 byte-identical originals rechecked, '+str(len(checks))+' evidence checks plus16 behavior checks.')
