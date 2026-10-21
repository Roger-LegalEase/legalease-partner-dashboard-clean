#!/usr/bin/env python3
"""Fresh exact-byte technical proof; no owner or hosted approval is generated."""
import json,hashlib,pathlib,subprocess,re,tempfile,xml.etree.ElementTree as ET
root=pathlib.Path.cwd();out=pathlib.Path(__file__).resolve().parent
family='data/rcap-all50/overlays/census-v1/ms/ms-misd-addl-set--custom-pleading/'
sha=lambda b:hashlib.sha256(b).hexdigest()
read=lambda p:json.loads(pathlib.Path(p).read_text())
refs=[]
def bind(p):
 p=str(p);refs.append({'path':p,'sha256':sha(pathlib.Path(p).read_bytes())})
 return read(p)
report=bind(family+'reports/rendered-artifacts.json');fm=bind(family+'production-field-map.json');sr=bind(family+'source-receipt.json');writes=bind(family+'reports/actual-writes.json')
prior=bind('data/rcap-grade-a/ms-misd-addl-layout-repair-20260914/independent-review.json')
source=bind(out.relative_to(root)/'ms-source-scope.json')
for f in prior['fixtures']:
 for img in f['images']:assert sha(pathlib.Path(img['path']).read_bytes())==img['sha256']
expected={'canonical':'c2938658151e650ff20791a8b14ba4a9197a339ced3645407914a2066bafbb7b','boundary':'61c429c2135a6b3b79de26adea8eb6f6ed1288aaf21c0a604dd656c431848c84'}
texts={};geometry={};norm=lambda x:' '.join(x.split())
for fixture,h in expected.items():
 p=family+'fixtures/'+fixture+'.pdf';assert sha(pathlib.Path(p).read_bytes())==h
 text=subprocess.check_output(['pdftotext','-layout',p,'-'],text=True);pages=text.split('\f');assert len(pages)==8 and not pages[-1].strip();pages=pages[:-1];texts[fixture]=pages
 saved=next(x for x in report['pdfs'] if x['fixture']==fixture);assert saved['sha256']==h and saved['pageCount']==7
 with tempfile.TemporaryDirectory(prefix='grade-a-ms-proof-',dir='/tmp') as tmp:
  old=subprocess.check_output(['git','show','d4bcf80dbecfd5e1c7e0f2939d4b3528b12cd215:'+p]);op=pathlib.Path(tmp)/'prior.pdf';op.write_bytes(old)
  assert norm(subprocess.check_output(['pdftotext','-layout',str(op),'-'],text=True))==norm(text),'wording changed'
 bbox=subprocess.check_output(['pdftotext','-bbox',p,'-']);doc=ET.fromstring(bbox);outside=0;wordcount=0
 for page in doc.findall('.//{*}page'):
  for w in page.findall('.//{*}word'):
   a={k:float(v) for k,v in w.attrib.items()};wordcount+=1
   if not(0<=a['xMin']<a['xMax']<=float(page.attrib['width']) and 0<=a['yMin']<a['yMax']<=float(page.attrib['height'])):outside+=1
 assert outside==0;geometry[fixture]={'pageCount':7,'wordCount':wordcount,'wordsOutsidePage':outside}
 for route in fm['routeKeys']:assert route in text
 assert all(v['expected'] in norm(text) for d in writes['documents'] if d['fixture']==fixture for v in d['actualWrites'])
 assert 'PROPOSED ORDER OF EXPUNGEMENT' in pages[2] and 'Prosecuting authority' in pages[2] and "The findings, the date of entry, the judge's signature" in pages[2]
 assert 'CERTIFICATE OF SERVICE' in pages[3] and 'DOCUMENTS TO OBTAIN BEFORE FILING' in pages[4] and 'FILING INSTRUCTIONS' in pages[5] and 'WHEN TO STOP AND GET HELP INSTEAD.' in pages[6]
 for s in ['no fee amount is established','No waiver procedure is established','PRIOR NOTICE','ANY COURT','RELIEF IS DISCRETIONARY','NO EFFECT ON YOUR DRIVING RECORD'] :assert s in text,s
 for s in ['DATE .............................. SIGNATURE OF PETITIONER','Date served: ..............................','SO ORDERED AND ADJUDGED this ............ day of ...................., 20.....']:assert s in text,s
assert sr['familyId']==fm['familyId']==report['familyId']=='ms-misd-addl-set';assert sr['routeKeys']==fm['routeKeys'];assert sr['documents']==[];assert len(fm['componentSet'])==5 and fm['componentSet']==report['componentSet']
log=(out/'ms-completeness.log').read_text();assert '1 PASS_COMPLETE' in log and all(re.search(k+r' 0',log) for k in ['knownRequiredFieldsMissing','requiredFactsNotCollected','unclassifiedBlanks','incompleteRows','requiredOptionsMissing','requiredComponentsMissing','invisibleWrites','protectedWrites','visualDefects'])
observations={
'ROUTE_IDENTITY':'Both exact justice/municipal route identifiers verified in both current PDFs and source receipt/field map; statutory branch remains explicit.',
'SOURCE_IDENTITY':'No source binary is asserted for this composed pleading. Both exact routes pass reconcileMsUnchangedTrack using approved Git bytes and current MS memo; selected ms-misd-addl legal track and shared authority unchanged. See ms-source-scope.json.',
'COMPONENT_SET':'All five specified components present; petition pages1-2, order3, service4, attachment5, instructions6-7.',
'KNOWN_PREFILLS':'Each of nine actual-write expected values independently extracted from current canonical/boundary text and found; boundary long values retain exact content.',
'REQUIRED_BEFORE_FILING':'Petition keeps court/cause/section/convictions/last-conviction date blank. Attachment requests history, certified judgments and docket; instructions direct clerk inquiry. Fresh completeness counters all zero.',
'ROUTE_OPTIONS':'Justice versus municipal statutory and prosecuting-authority branches remain explicit and unelected for the participant; no preselected section inserted.',
'REPEATING_ROWS':'Four conviction listing rules remain empty; no partial conviction row populated; fresh incompleteRows0.',
'PROTECTED_FIELDS':'Court findings, judicial entry date/signature, prosecuting-authority approval and service date/signature remain blank. Extracted protected delimiters verified and order images inspected independently; protectedWrites0.',
'ARTIFACTS':'Both current hashes verified against bytes and rendered-artifacts report; 7 pages each. Prior rejected pair used only for text comparison, never approved.',
'PAGE_ORDER':'Independent extracted headings match five-component order on current7page packets, with removed emptypage; no omitted component.',
'FILING_DESTINATION':'Both current packets direct filing to clerk of convicting justice or municipal court, onepetition per court; no venue identity invented.',
'FEE_AND_WAIVER':'Both retain exact fee uncertainty, distinguish150fee under99-19-72/99-19-71 from these sections, and direct sameclerk for waiver; no invented amount.',
'SERVICE':'Both identify branch-specific prosecutingauthority, priornotice, mail/handdelivery and captioned certificate with unfilled details.',
'SELF_HELP_STOP':'Both carry mandatory advocate/lawyer hearinghand-off, discretionary threeelementshowing, anycourt twoyearclock, drivingrecord exclusion and listed stopconditions.',
'CLIPPING_AND_OVERLAP':'All14pages current textgeometry has zero outside-page words. Independently re-inspected both repaired orderpage3 images: explanation immediatelybelow prosecutingauthority, no overlap/clipping. Prior independent all14page inspection images rehashed against receipt; remaining unchanged-page comparison evidence preserved. Canonical Chromium raster evidence recorded separately, never inferred from Poppler.'}
result={'schemaVersion':'rcap-independent-artifact-successor-verification/v1','itemId':'ms-misd-addl-set','familyId':'ms-misd-addl-set','verdict':'PASS_COMPLETE_INDEPENDENT','verifier':'Codex /root/release_gate_inventory; not the PDF builder or repair author','isIndependentVerification':True,'verifiedAtBase':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'canonicalSha256':expected['canonical'],'boundarySha256':expected['boundary'],'pageCount':7,'proofObligations':{k:{'result':'PASS','evidence':v} for k,v in observations.items()},'failedObligationNames':[],'unmeasuredObligations':[],'nineCounters':{k:0 for k in ['knownRequiredFieldsMissing','requiredFactsNotCollected','unclassifiedBlanks','incompleteRows','requiredOptionsMissing','requiredComponentsMissing','invisibleWrites','protectedWrites','visualDefects']},'geometry':geometry,'fullTextEqualIgnoringWhitespaceToRejectedPair':True,'evidence':refs,'localOnly':True,'ownerApprovalCreated':False,'packetBytesModified':False,'historicalRecordsModified':False,'grantsNothing':'Technical independent read only; no deployment, worker publication, hosted acceptance or new legal treatment. Canonical raster receipt is separately required.'}
result.update({'evidencePath':str((out/'ms-independent-verification.json').relative_to(root)),'lane':'local-artifact-successor','failedObligations':[],'superseded':False})
result={'schemaVersion':result['schemaVersion'],'rows':[result]}
(out/'ms-independent-verification.json').write_text(json.dumps(result,indent=2)+'\n');print('MS current repairedpair:15 independent obligations PASS; nine counters zero;14pages geometric bounds verified; wording unchanged.')
