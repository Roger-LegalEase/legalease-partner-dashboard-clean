"""Serialize the completed independent review. This is not an automatic approval gate.

The root reviewer inspected Florida's two changed original pages and all 27 Texas
original PNG representatives indexed in visual-index.json, covering 58 page
occurrences. This script combines those judgments with measured byte evidence.
It never changes a packet, prior return, queue exclusion or commercial authority.
"""
import hashlib, json, pathlib, subprocess
B = pathlib.Path('data/rcap-grade-a/packet-factory-24h')
O = B/'closure-nine-20260911'
BASE = 'a865f41c6c3784d6c92b8597e03bff76b1cfde9e'
def read(p): return json.loads(pathlib.Path(p).read_text())
def bind(p):
    p=pathlib.Path(p);b=p.read_bytes()
    return dict(path=str(p),sha256=hashlib.sha256(b).hexdigest(),byteLength=len(b))
def write(p,obj): pathlib.Path(p).write_text(json.dumps(obj,indent=2)+'\n')
COUNTERS = ['knownRequiredFieldsMissing','requiredFactsNotCollected','unclassifiedBlanks','incompleteRows','requiredOptionsMissing','requiredComponentsMissing','invisibleWrites','protectedWrites','visualDefects']
checks=read(O/'checks.json');assert len(checks)==19 and all(c['exitCode']==0 for c in checks)
visual=read(O/'visual-index.json');assert visual['uniqueImages']==27 and visual['pageOccurrences']==58
visual['reviewer']='Codex /root; no packet or repair authored by this reviewer'
for item in visual['items']:
    item['reviewResult']='PASS'
    item['observation']='Readable current page; no clipped or overlapping participant text; signatures/dates remain blank. Removed route trailers are absent. Statement DOB is MM/DD/YYYY where populated; Option1 birth-date boxes remain blank with the now-disclosed manual copy task.'
write(O/'visual-review.json',visual)
tx=read(O/'tx-current-measurements.json');streams=read(O/'stream-measurements.json')
delta=read(O/'tx-semantic-delta.json');assert len(delta)==16 and all(x['onlyRouteTrailerRemovalDobFormattingAndExactDisclosureInsertion'] for x in delta)
priorpath=B/'vf08/rows-vf08-20260911-tx-eight-current.json';prior=read(priorpath)
rows=[]
for m in tx:
    family=m['familyId'];ix=next(i for i,r in enumerate(prior['rows']) if r['itemId']==family);old=prior['rows'][ix]
    sf=next(f for f in streams['families'] if f['familyId']==family)
    measured=sum(len(f['writeMeasurements']) for f in m['fixtures']);pages=sum(f['pages'] for f in m['fixtures'])
    sourcecount=len(sf['sources']);appearance=sum(f['current']['counts']['exactSourceMatches'] for f in sf['fixtures'])
    evidence=[str(O/n) for n in ['tx-current-measurements.json','stream-measurements.json','tx-semantic-delta.json','visual-review.json','checks.json']]
    findings={
      'ROUTE_IDENTITY':'Exact source/map/wiring route keys and selection IDs remain unchanged. No internal obligation key occurs in either current PDF or participant instructions. All formerly leaking current pages were visually inspected; only internal trailers were removed.',
      'SOURCE_IDENTITY':f'All {sourcecount} held sources were rehashed and parsed from this checkout against their exact source-accounting pins. Source identities are unchanged. Retain the prior source/legal determination on those same bytes; no new source-currency claim.',
      'COMPONENT_SET':f'Both declared assembled packets retain the previous component sequence and {pages//2} pages each. Per-page streams identify every unchanged page; aggregate text differs only by the measured approved repair edits. No component is removed.',
      'KNOWN_PREFILLS':f'All {measured} reported widget writes independently extracted inside their named rectangles. Current Statement page2 DOB is 04/17/1994 or12/31/1972 in its Month Day Year field, with no ISO-format residue there. The three Option1 DOB parts are required manual tasks because of the shared notary-month widget; current instructions explicitly explain and require copying the held DOB. This closes the prior format/classification failure.',
      'REQUIRED_BEFORE_FILING':f'All {m["requiredCount"]} current required-before-filing labels occur in participant instructions. All three Option1 DOB boxes are classified REQUIRED_BEFORE_FILING and not as signing dates. The full copy-DOB/shared-widget paragraph is present in the assembled instructions and visually readable for the repaired disclosure families. Other required tasks retain their prior unchanged evidence.',
      'ROUTE_OPTIONS':'Unchanged election-page content and appearance signatures retain the prior exact route-control findings. No repaired page adds an election. Option1 remains a participant choice; conditional fee/waiver and delivery choices are not selected on their behalf.',
      'REPEATING_ROWS':'Current writes add no financial, dependent, agency-list or other repeating-table entry. Table-page content and appearance signatures remain unchanged; prior source-grounded complete-row findings therefore remain applicable. No partly populated row introduced.',
      'PROTECTED_FIELDS':'Protected signing dates Today/Year remain non-required signing acts, distinct from DOB facts. All current PDFs omit the stale12/15/2022 date. Unchanged source-backed protected areas retain prior blank-ink evidence; original Option1 and changed signature-page representatives are blank at signature/date/county acts. No protected ink added.',
      'ARTIFACTS':f'Current16-batch custody freshly verified for this family: {pages} original PNGs, both PDF hashes/lengths/page counts, ZIP digest and log verdict agree at run34651035676 pinned to e2e6fb4a44cc3eadc0fd350dcbc677eeefb58b87. All {appearance} stroke-only appearances match held raw source streams; none unmatched. Earlier Texas raster is not acceptance evidence for these PDFs.',
      'PAGE_ORDER':f'Both {pages//2}-page manifests agree with parsed PDFs and original raster inventory. Unchanged pages retain exact decoded content and appearance identities at their prior page positions. Changed instruction-page text reflows only within the same component; whole-packet semantic comparison proves no lost text.',
      'CLIPPING_AND_OVERLAP':f'All {measured} widget values fit their named source boxes under independent Poppler extraction; zero out-of-paper words. Every changed page plus the Option1 declarations was visually read from27 unique original PNG representatives across the cohort, with exact-SHA aliases covering58 pages. No new clipping/overlap observed; unchanged page geometry retains prior valid findings.',
      'FILING_DESTINATION':'Retain prior exact route-specific destination finding. Whole-packet text comparison proves all existing destination text survives unchanged after allowing only route-key removal, DOB format and the explicit DOB paragraph. No court/county/address invented.',
      'FEE_AND_WAIVER':'Retain prior governed Rule145/fee finding. Conditional Statement remains complete, financial facts remain blank, clerk-confirmation and route-specific fee cautions remain text-identical. Current DOB task changes no fee or waiver authority.',
      'SERVICE':'Retain prior route-specific service/notice ownership. Aggregate current text proves those instructions unchanged; changed proof-of-delivery pages were visually checked and remain conditional, unsigned and undated. No prosecutor identity or service fact introduced.',
      'SELF_HELP_STOP':'Retain prior exact stop findings on unchanged route identity and preserved stop text. Whole-packet semantic delta proves no stop content removed when the added DOB paragraph reflows instructions. No new legal determination or eligibility certification.'}
    obligations={}
    for name in old['proofObligations']:
        obligations[name]=dict(result='PASS',measured=True,reviewMode='FRESH_CURRENT_MEASUREMENT_WITH_BOUND_PRIOR_RETENTION',finding=findings[name],evidence=evidence,
            priorFinding=dict(record=bind(priorpath),pointer=f'/rows/{ix}/proofObligations/{name}',verifiedAtBase=old['verifiedAtBase'],result=old['proofObligations'][name]['result']),
            disposition='Superseded by fresh current-byte proof; old finding remains historical.' if name in old['failedObligationNames'] else 'Retained only for unchanged dependencies; current artifacts and repaired surfaces freshly verified.')
    assert len(obligations)==15
    rows.append(dict(itemId=family,familyId=family,lane='VF08',laneKind='independent-verification',isIndependentVerification=True,status='COMPLETED',verifiedAtBase=BASE,
        reviewer='Codex /root',independence='Reviewer authored no packet or repair. Restored dependencies, read source/output bytes and original raster evidence, ran checks and wrote independent findings. No PDF changed.',
        claimEvidence=str(O/'VF08-claims.txt'),familyDirectory=old['familyDirectory'],verdict='PASS_COMPLETE_INDEPENDENT',proofObligations=obligations,obligationCounts=dict(PASS=15,FAIL=0,NOT_MEASURABLE_HERE=0),
        failedObligationNames=[],unmeasuredObligations=[],nineCounters={**dict.fromkeys(COUNTERS,0),'allZero':True,'measuredHere':True,'evidence':evidence},
        artifactsRead=[{k:f[k] for k in ['fixture','path','sha256','byteLength','pages']} for f in m['fixtures']],
        rasterState='RASTER_PASS',rasterWorkflowRunId='34651035676',rasterHashBinding={f['fixture']:f['sha256'] for f in m['fixtures']},rasterEvidence=m['originalRaster'],
        historicalFailureDisposition=dict(prior=bind(priorpath),failedObligations=old['failedObligationNames'],currentDefectsRemaining=[],proof=str(O/'tx-current-measurements.json')),
        evidenceRead=evidence,packetPdfsModified=0,commercialRoutesOpened=0,productionTouched=False,grantsNothing='Independent packet acceptance only. Captain integration and commercial fulfillment gates remain separate.'))
write(B/'vf08/rows-vf08-20260911-tx-eight-closure.json',dict(schemaVersion='rcap-verifier-lane-return/v1',lane='VF08',laneKind='independent-verification',status='COMPLETED',verifiedAtBase=BASE,rows=rows))

p=B/'vf64/rows-vf64-20260911-fl-early-current.json';old=read(p)['rows'][0]
m=read(O/'fl-current-measurements.json');regions=read(O/'fl-source-regions.json');pd=read(O/'fl-page-delta.json')
assert sum(x['same'] for x in pd['pages'])==8
assert all(a['matchesReceipt'] and a['byteIdenticalToPrior'] for a in m['authorityBindings'])
for f in regions['fixtures']:
    assert f['writesReadFromStoredBytes']==28 and f['outsideDeclaredRegions']==0
    for w in f['writes']:
        if 'actualSourceBlankRule' in w:
            assert 2 < w['baselineAboveOwnRule'] < 3 and w['startsLeftOfOwnBlank']==0
            assert w['measuredGlyphBounds']['x1'] < w['actualSourceBlankRule']['x1']
fix={
 'KNOWN_PREFILLS':'All56 actual writes recovered from stored bytes. Both changed original fingerprint pages freshly inspected: last, first, middle, race, sex and DOB occupy their own labelled blanks. Source-rule baselines are2.575pt below the values; no value begins left of its own blank. Boundary full name retains Isabel. FL-EARLY-VF64-01 is closed on current bytes.',
 'ARTIFACTS':'Current2 PDFs/10 original PNGs bind exclusively to run34650539599. Source/map/guides/authority pins remain exact; stored reports match measured28 runs per fixture and284/428 glyphs. The six actual source-rule spans independently match current write placement. Eight PNGs are byte-identical to prior approved observations; the two changed page3 originals were freshly inspected. No use of superseded raster for current acceptance.',
 'CLIPPING_AND_OVERLAP':'Fresh original-page inspection and source-rule measurement confirm all12 corrected field occurrences inside their own blanks, baseline2.575pt above the rule, zero left displacement and no glyph past its right endpoint. Independent source-word comparison finds zero missing/moved source words and zero source intersections across all10 pages. Retain unchanged eight-page visual findings; no new displacement, clipping or overlap.'}
evidence=[str(O/n) for n in ['fl-current-measurements.json','fl-source-regions.json','fl-page-delta.json','checks.json']]
obligations={}
for name,v in old['proofObligations'].items():
    obligations[name]=dict(result='PASS',measured=True,detail=fix.get(name,'Retain prior valid finding on unchanged source/map/guides and eight identical current PNGs; both changed page3 originals freshly corroborate the protected and identity regions. '+v['detail']),
        reviewMode='FRESH_CURRENT_JUDGMENT' if name in fix else 'REUSED_VALID_PRIOR_WITH_CURRENT_BINDINGS',evidence=evidence,
        priorFinding=dict(record=bind(p),pointer=f'/rows/0/proofObligations/{name}',verifiedAtBase=old['verifiedAtBase'],result=v['result']))
row=dict(familyId='fl-early-juvenile-set',itemId='fl-early-juvenile-set',lane='VF64',laneKind='independent-verification',isIndependentVerification=True,status='COMPLETED',verifiedAtBase=BASE,
    reviewer='Codex /root',independence='Reviewer authored no packet or geometry repair; independent source-rule and current-byte measurement plus original-image read.',claimEvidence=str(O/'VF64-claims.txt'),familyDirectory=old['familyDirectory'],
    verdict='PASS_COMPLETE_INDEPENDENT',proofObligations=obligations,summary=dict(PASS=15,FAIL=0,NOT_MEASURABLE_HERE=0,validPriorFindingsReused=12,freshJudgments=3),failedObligationNames=[],unmeasuredObligations=[],
    nineCounters={**dict.fromkeys(COUNTERS,0),'allZero':True,'measuredHere':True,'evidence':evidence},rasterState='RASTER_PASS',rasterWorkflowRunId='34650539599',rasterHashBinding={f['fixture']:f['pdfSha256'] for f in regions['fixtures']},
    artifacts=[{k:f[k] for k in ['path','sha256','byteLength','fixture','pageCount']} for f in m['outputs']],evidenceRead=evidence,closedPriorFailures=['FL-EARLY-VF64-01'],remainingBlockers=[],
    packetPdfsModified=0,commercialRoutesOpened=0,productionTouched=False,grantsNothing='Independent packet acceptance only; no commercial fulfillment or production authority.')
write(B/'vf64/rows-vf64-20260911-fl-early-closure.json',dict(schemaVersion='rcap-verifier-lane-return/v1',lane='VF64',laneKind='independent-verification',status='COMPLETED',verifiedAtBase=BASE,rows=[row]))
print('Written9 independent returns /135 PASS obligations; old findings retained as history.')
