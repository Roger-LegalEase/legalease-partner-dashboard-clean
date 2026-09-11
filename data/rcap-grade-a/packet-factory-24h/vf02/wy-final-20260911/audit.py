import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import xml.etree.ElementTree as ET
import zipfile

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[4]
BASE='08d1157068ab93d7f5e2a3ecbecef548950a60c7'
FAMILY='composed-treatment:obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708'
OUT='data/rcap-all50/overlays/census-v1/wy/composed-treatment:obligation:runtime-only:wy:human-trafficking-victim-vacatur-w-s-6-2-708--custom-pleading'
BUILDER='scripts/build-census-v1-'+FAMILY+'.mjs'
RASTER=ROOT/'data/rcap-grade-a/packet-factory-24h/raster-runs/34628970364'
ORIGINAL=Path('/tmp/rcap-original-34628970364/wy-10275842350')
CANARY=Path('/tmp/rcap-original-34628970364/canary-10275677061')
VERDICT='composed-treatment_obligation_runtime-only_WY_human-trafficking-victim-vacatur-w-s-6-2-708.verdict.json'
COMPONENTS=['wy-6-2-708-vacatur-primary-filing-1','wy-6-2-708-vacatur-participant-declaration-2','wy-6-2-708-vacatur-filing-instructions-3']
def sha(b):return hashlib.sha256(b).hexdigest()
def load(p):return json.loads(Path(p).read_text())
def write(n,d):(HERE/n).write_text(json.dumps(d,indent=2)+'\n')
def norm(s):return ' '.join(s.split())
def snapshot():
 return {str(p.relative_to(ROOT/OUT)):{'sha256':sha(p.read_bytes()),'bytes':p.stat().st_size,
  'mtimeNs':p.stat().st_mtime_ns,'ctimeNs':p.stat().st_ctime_ns} for p in sorted((ROOT/OUT).rglob('*')) if p.is_file()}
commands=[]; checks=[]
def check(name,condition,detail=None):checks.append({'name':name,'result':'PASS' if condition else 'FAIL','detail':detail})
def command(name,args):
 p=subprocess.run(args,cwd=ROOT,env={**os.environ,'RCAP_NO_LOCAL_RASTER':'1'},capture_output=True,text=True)
 for suffix,content in [('stdout',p.stdout),('stderr',p.stderr)]:
  (HERE/(name+'.'+suffix+'.log')).write_text(''.join(line.rstrip()+'\n' for line in content.splitlines()))
 commands.append({'name':name,'argv':args,'exit':p.returncode,'logNormalization':'trailing whitespace only'})
 check(name+' exit',p.returncode==0,p.stdout if p.returncode else None)
 return p
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
check('Actual base',head==BASE,head)
initial_status=subprocess.check_output(['git','status','--short'],cwd=ROOT,text=True)
before=snapshot()
command('grant-can-assert',['node','scripts/grade-a-packet-factory-24h/claim.mjs','--can-assert','VF02',FAMILY])
command('grant-assert',['node','scripts/grade-a-packet-factory-24h/claim.mjs','--assert','VF02',FAMILY])
cli=command('production-check',['node',BUILDER,'--check'])
after_cli=snapshot()
complete=command('completeness',['node','scripts/rcap-packet-completeness/verify-packet-completeness.mjs','--family',FAMILY])
after_complete=snapshot()
check('Actual --check is read-only including file times',before==after_cli)
check('Focused completeness is read-only including file times',before==after_complete)
cli_result=json.loads(cli.stdout) if cli.returncode==0 else None
check('Actual entrypoint checks current three components',cli_result and cli_result['status']=='CHECK_ONLY' and cli_result['components']==COMPONENTS,cli_result)
check('Focused completeness current family passes',bool(re.search(r'PASS_COMPLETE\s+11/22 written',complete.stdout)),complete.stdout)
write('read-only-proof.json',{'before':before,'afterCli':after_cli,'afterCompleteness':after_complete,
 'readOnly':before==after_cli==after_complete,'productionCheck':cli_result})
receipt=load(ROOT/OUT/'source-receipt.json'); fmap=load(ROOT/OUT/'production-field-map.json')
manifest=load(ROOT/OUT/'reports/rendered-artifacts.json'); proofs=load(ROOT/OUT/'reports/actual-writes.json')
wiring=load(ROOT/OUT/'product-wiring.json'); guide=(ROOT/OUT/'participant-instructions.md').read_text()
queue=load(ROOT/'data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json')
def find_family(x):
 if isinstance(x,dict):
  if x.get('familyId')==FAMILY and 'rasterReceipt' in x:return x
  for value in x.values():
   found=find_family(value)
   if found:return found
 elif isinstance(x,list):
  for value in x:
   found=find_family(value)
   if found:return found
q=find_family(queue)
verdict=load(RASTER/VERDICT)
source_bindings=[]
for record in receipt['committedRecords']:
 p=ROOT/record['pathInRepository'];raw=p.read_bytes()
 measured={'path':record['pathInRepository'],'sha256':sha(raw),'bytes':len(raw),'recordId':record['recordId'],
  'matchesReceipt':sha(raw)==record['sha256'] and len(raw)==record['byteLength'],'anchors':record['anchorStatementsVerified']}
 source_bindings.append(measured);check('Source '+record['recordId'],measured['matchesReceipt'],measured)
check('Exact route agreement',receipt['routeKeys']==fmap['routeKeys']==wiring['routeKeys']==wiring['binding']['routeKeys'])
check('Exact adopted component agreement',receipt['composedComponentsAuthoredByThisBuild']==fmap['componentSet']==manifest['componentSet']==COMPONENTS)
check('Approval pending and authority closed',load(ROOT/OUT/'approval-request.json')['counselQuestionsRaised']==[] and not wiring['binding']['paymentEligible'] and not wiring['binding']['sponsorshipEligible'] and not wiring['currentState']['generationAllowed'])
artifacts=[];pages=[];writes=[];texts={};component_texts={}
for art in manifest['artifacts']:
 fixture=art['fixture'];p=ROOT/art['file'];raw=p.read_bytes()
 extracted=subprocess.check_output(['pdftotext','-layout',str(p),'-'],text=True)
 (HERE/(fixture+'.extracted.txt')).write_text(extracted)
 page_text=extracted.split('\f');page_text=page_text[:-1] if not page_text[-1].strip() else page_text
 texts[fixture]=norm(extracted)
 own={component:norm(' '.join(page_text[m['packetPage']-1] for m in art['pageManifest'] if m['component']==component)) for component in COMPONENTS}
 component_texts[fixture]=own
 prior_bytes=subprocess.check_output(['git','show',verdict['packetCommitSha']+':'+art['file']],cwd=ROOT)
 queued=next(d for d in q['documents'] if d['role']==fixture)
 art_measure={'fixture':fixture,'path':art['file'],'sha256':sha(raw),'bytes':len(raw),'pages':len(page_text),
  'matchesManifest':sha(raw)==art['sha256'] and len(raw)==art['byteLength'] and len(page_text)==art['pageCount'],
  'matchesQueueAndVerdict':sha(raw)==queued['sha256']==verdict['hashesBound'][fixture]['pinned'],
  'identicalAtPinnedRasterCommit':raw==prior_bytes}
 artifacts.append(art_measure)
 check(fixture+' artifact binding',all(art_measure[k] for k in ['matchesManifest','matchesQueueAndVerdict','identicalAtPinnedRasterCommit']),art_measure)
 check(fixture+' actual page order',[m['component'] for m in art['pageManifest']]==[COMPONENTS[0],COMPONENTS[0],COMPONENTS[1],COMPONENTS[2],COMPONENTS[2]])
 for item in next(d for d in proofs['documents'] if d['fixture']==fixture)['actualWrites']:
  found=norm(item['expected']) in own[item['document']]
  writes.append({'fixture':fixture,'field':item['field'],'factId':item['factId'],'expected':item['expected'],'foundInOwnComponent':found})
  check(fixture+' visible '+item['field'],found)
 dom=ET.fromstring(subprocess.check_output(['pdftotext','-bbox',str(p),'-'],text=True))
 for number,node in enumerate(dom.findall('.//{*}page'),1):
  words=[];outside=[];overlap=[]
  for w in node.findall('.//{*}word'):
   box={k:float(w.attrib[k]) for k in ['xMin','xMax','yMin','yMax']};box['text']=w.text or '';words.append(box)
   if box['xMin']<0 or box['yMin']<0 or box['xMax']>float(node.attrib['width']) or box['yMax']>float(node.attrib['height']):outside.append(box)
  for i,a in enumerate(words):
   for b in words[i+1:]:
    if abs(a['yMin']-b['yMin'])<1 and min(a['xMax'],b['xMax'])-max(a['xMin'],b['xMin'])>1:overlap.append([a,b])
  pages.append({'fixture':fixture,'page':number,'component':art['pageManifest'][number-1]['component'],'wordCount':len(words),
   'clippedWords':outside,'sameBaselineOverlaps':overlap})
  check(f'{fixture} page {number} geometry',not outside and not overlap)
 for component in COMPONENTS[:2]:
  check(fixture+' blank signing acts '+component,bool(re.search(r'DATE \.{3,} SIGNATURE OF (?:MOVANT|DECLARANT) \.{3,}',own[component])))
 check(fixture+' bounded declaration facts',all(phrase in own[COMPONENTS[1]] for phrase in ['personal knowledge','TRAFFICKING-VICTIM STATUS','CAUSAL CONNECTION','SUPPORTING EVIDENCE','PERSONAL-KNOWLEDGE ATTESTATION']))
 check(fixture+' official documentation optional',all(phrase in own[COMPONENTS[1]] for phrase in ['Official documentation creates a presumption','its absence does not stop this Motion','identify alternative evidence']))
 check(fixture+' conditional court relief',"may vacate it when the person's participation in the offense resulted from being a victim" in own[COMPONENTS[0]])
 check(fixture+' State service under Rule 49','Serve the State/prosecutor under W.R.Cr.P. 49.' in own[COMPONENTS[2]])
 check(fixture+' sensitive-filing steps',all(phrase in own[COMPONENTS[2]] for phrase in ['review every public copy and redact sensitive material',"original criminal court's Wyoming restricted-filing procedure where applicable",'does not automatically seal the Motion, declaration, or attachments']))
 check(fixture+' no invented deadline or formal affidavit requirement',not re.search(r'within \d+ days?|under penalty of perjury|notari[sz]|sworn before',texts[fixture],re.I))
 check(fixture+' no former petition/new-case label',not re.search(r'vacatur petition|case number, if the court assigns|petition signature',texts[fixture],re.I))
 check(fixture+' no source IDs/route keys/markup',not re.search(r'WY-TRAFFICKING-VACATUR-6-2-708C|synthetic fixture|compiled (?:Wyoming )?profile|committed (?:record|contract)|Route: obligation:|\*\*|__|\{\{',texts[fixture],re.I))

check('Canonical known original court and number reach motion/declaration',all('Example County District Court' in component_texts['canonical'][c] and 'CR-EXAMPLE-2020-001' in component_texts['canonical'][c] for c in COMPONENTS[:2]))
check('Boundary does not borrow canonical court/case',not re.search(r'Example County|CR-EXAMPLE',texts['boundary']))
blank_counts={}
for fixture in ['canonical','boundary']:
 blanks=[b for m in fmap['maps'] for b in m[fixture+'Refusals']]
 blank_counts[fixture]={'writes':sum(len(m[fixture+'Writes']) for m in fmap['maps']),
  'requiredBeforeFiling':sum(b.get('requiredBeforeFiling') is True for b in blanks),
  'protectedActs':sum(b.get('category')=='signature_or_date_participant_completion' for b in blanks)}
 for b in blanks:
  if b.get('requiredBeforeFiling'):
   check(fixture+' disclosed '+b['field'],norm(b['effectiveLabel']).lower() in norm(guide).lower())
for m in fmap['maps'][:2]:
 for suffix in ['original_criminal_court','original_case_number']:
  refused=next(b for b in m['boundaryRefusals'] if b['field'].endswith('.'+suffix))
  check('Boundary original fact classification '+refused['field'],refused['requiredBeforeFiling'] is True and refused['disposition']=='REQUIRED_BEFORE_FILING')
check('Boundary known/unknown fields measured separately',blank_counts=={'canonical':{'writes':11,'requiredBeforeFiling':7,'protectedActs':4},'boundary':{'writes':7,'requiredBeforeFiling':11,'protectedActs':4}},blank_counts)

pngs=load(RASTER/(FAMILY+'.PAGE_IMAGES_SHA256.json'))
zip_path=Path(str(ORIGINAL)+'.zip')
with zipfile.ZipFile(zip_path) as z:
 png_measures=[]
 for record in pngs:
  raw=(ORIGINAL/record['member']).read_bytes()
  result={**record,'matchesDurablePin':sha(raw)==record['sha256'] and len(raw)==record['bytes'],'matchesOriginalZipMember':raw==z.read(record['member'])}
  png_measures.append(result);check('Original PNG '+record['member'],result['matchesDurablePin'] and result['matchesOriginalZipMember'])
 check('Durable verdict is original ZIP verdict',z.read(VERDICT)==(RASTER/VERDICT).read_bytes())
check('Archive matches accepted digest','sha256:'+sha(zip_path.read_bytes())==q['rasterReceipt']['receiptArtifact']['digest'])
check('All 10 pages bound to current raster',len(png_measures)==verdict['pagesMeasured']==10 and verdict['verdict']=='RASTER_PASS' and not verdict['problems'] and not verdict['environmentProblems'])
check('Document digest agreement',verdict['documentsDigest']==q['documentsDigest']==q['rasterReceipt']['documentsDigest'])
check('Wiring canonical assembled PDF current',wiring['proposedRepresentation']['components'][0]['sha256']==artifacts[0]['sha256'])
canary=load(RASTER/'canary-receipt.json');negative=load(RASTER/'negative-controls.json')
for name in ['canary-receipt.json','negative-controls.json']:
 check('Canary original/durable '+name,(CANARY/name).read_bytes()==(RASTER/name).read_bytes())
check('Canary and exercised controls passed',canary['verdict']=='CANARY_PASSED' and not canary['problems'] and negative['allExercisedRefused'] and not negative['failed'])
canary_records={'verdict':canary['verdict'],'calibrationResidualPx':canary['calibrationResidualPx'],
 'negativeControlsExercisedRefused':negative['refusedCount'],'notExercised':negative['notExercised'],'noClaimOnUnexercisedControl':True}
input_paths=['AGENTS.md','docs/PRODUCT_CONTRACT.md',BUILDER,'scripts/rcap-packet-recovery/test-wy-trafficking-current-rule.mjs',
 'data/rcap-grade-a/packet-factory-24h/fix114/wy-current-rule-20260911/repair-evidence.json','data/rcap-grade-a/packet-factory-24h/fix114/rows-fix114-20260911-wy-current-rule.json']
write('measurements.json',{'schemaVersion':'rcap-independent-current-byte-measurement/v1','familyId':FAMILY,'verifiedAtBase':head,
 'worktree':str(ROOT),'branch':subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip(),
 'initialStatus':initial_status,'privateCorpusMounted':(ROOT/'private/Nationwide Record Clearing').exists(),
 'inputBindings':[{'path':p,'sha256':sha((ROOT/p).read_bytes()),'bytes':(ROOT/p).stat().st_size} for p in input_paths],
 'commands':commands,'readOnly':before==after_cli==after_complete,'sourceBindings':source_bindings,
 'artifacts':artifacts,'currentComponents':COMPONENTS,'blankCounts':blank_counts,'writes':writes,'pages':pages,
 'raster':{'workflowRunId':'34628970364','artifactId':'10275842350','pinnedCommit':verdict['packetCommitSha'],
  'documentsDigest':verdict['documentsDigest'],'archiveSha256':sha(zip_path.read_bytes()),'originalPNGs':png_measures,'canary':canary_records},
 'originalFocusedTestNotRun':{'path':'scripts/rcap-packet-recovery/test-wy-trafficking-current-rule.mjs',
  'reason':'Invokes the mutating production builder with --no-raster before testing. Rendering and family writes are excluded. This audit directly checks saved current artifacts/maps and executes actual --check without modifying production code.'},
 'focusedChecks':checks,'failedFocusedChecks':[c for c in checks if c['result']=='FAIL']})
print(json.dumps({'tests':len(checks),'passed':sum(c['result']=='PASS' for c in checks),'failed':[c for c in checks if c['result']=='FAIL'],
 'readOnly':before==after_cli==after_complete,'writesRead':len(writes),'pages':len(pages),'blankCounts':blank_counts},indent=2))
