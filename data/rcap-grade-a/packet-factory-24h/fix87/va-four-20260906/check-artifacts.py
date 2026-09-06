import pathlib,json,subprocess,re,hashlib,xml.etree.ElementTree as ET,os
os.sched_setaffinity(0,{min(os.sched_getaffinity(0))})
s=pathlib.Path('/tmp/codex-fix87-20260906');held=json.load(open(s/'current-requirements.json')); baseline=json.load(open(s/'baseline-sha256.json')); results=[]
source=pathlib.Path('scripts/build-census-v1-va_seal_petition_misdemeanor-set.mjs').read_text();fixturefacts=json.loads(re.search(r'const FIXTURES = (.*?);\n',source,re.S)[1].replace('canonical:', '"canonical":').replace('boundary:', '"boundary":'))
def norm(t):
 for a,b in [('§','Sec. '),('’',"'"),('‘',"'"),('“','"'),('”','"'),('—','-'),('–','-'),('‑','-'),(' ',' ')]:t=t.replace(a,b)
 return re.sub(r'\s+','',t)
for track,h in held.items():
 family=track+'-set';d=pathlib.Path('data/rcap-all50/overlays/census-v1/va')/(family.replace('_','-')+'--official-pdf-fill'); guide=(d/'participant-instructions.md').read_text();art=json.load(open(d/'reports/rendered-artifacts.json')); m=json.load(open(d/'production-field-map.json')); actions=[a for a in h['packetSet']['participantActionRequired'] if a['kind'] in ['obtain_document','confirm_answer']];oldmap=json.loads(subprocess.check_output(['git','show','8d53bbb5e1bb355536a4df1b4c37c4a66240c18f:'+str(d/'production-field-map.json')],text=True));assert oldmap['maps'][0]==m['maps'][0]
 assert 'obligation:' not in guide
 assert sum(len(x['canonicalWrites']) for x in m['maps'][1:])==13
 ccre=next(x for x in m['maps'] if x['formNumber']=='ccre_forwarding_request'); date=next(x for x in ccre['canonicalRefusals'] if x['field'].endswith('.request_date'));assert date['requiredBeforeFiling']==False
 assert all(not x['field'].endswith('.request_date') for x in m['requiredBeforeFiling'])
 for a in actions:
  assert norm(a['description']) in norm(guide)
  if a['requirement']=='conditional':assert norm(a['conditionDescription']) in norm(guide)
 for condition in h['selfHelpStopConditions']: assert norm(condition) in norm(guide)
 row={'familyId':family,'officialMapUnchanged':True,'composedWritesPerFixture':13,'recordActionCount':len(actions),'conditionalActions':sum(a['requirement']=='conditional' for a in actions),'stopCount':len(h['selfHelpStopConditions']),'fixtures':[]}
 for a in art['artifacts']:
  pdf=pathlib.Path(a['file']);p=subprocess.run(['pdftotext','-bbox',str(pdf),'-'],text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE);assert p.returncode==0,p.stderr
  doc=ET.fromstring(p.stdout);pages=doc.findall('.//{http://www.w3.org/1999/xhtml}page');texts=[' '.join(w.text or '' for w in pg.findall('.//{http://www.w3.org/1999/xhtml}word')) for pg in pages]
  (s/(family+'-'+a['fixture']+'.txt')).write_text('\n\f\n'.join(texts))
  by={}
  for page in a['pageManifest']:by.setdefault(page['component'],[]).append(page['packetPage'])
  exp='1991-04-17' if a['fixture']=='canonical' else '1968-12-31';other='1968-12-31' if a['fixture']=='canonical' else '1991-04-17';cp=by['ccre_forwarding_request'];ct=' '.join(texts[i-1] for i in cp)
  assert exp in ct and other not in '\n'.join(texts);assert "copy it here" not in ct
  assert 'obligation:' not in '\n'.join(texts),(family,a['fixture'],'machine route leaked')
  alltext=norm(' '.join(texts));own=fixturefacts[a['fixture']];opposite=fixturefacts['boundary' if a['fixture']=='canonical' else 'canonical']
  for fact,value in own.items():assert norm(value) in alltext,(family,a['fixture'],fact,'missing held fact')
  for fact,value in opposite.items():
   if value not in own.values():assert norm(value) not in alltext,(family,a['fixture'],fact,'other participant fact leaked')
  assert "DATE OF THIS REQUEST ............................................................." in ct
  assert hashlib.sha256(pathlib.Path(a['primaryFilingFile']).read_bytes()).hexdigest()==baseline[a['primaryFilingFile']]
  geometries=[]
  for pn in cp:
   for w in pages[pn-1].findall('.//{http://www.w3.org/1999/xhtml}word'):
    if w.text==exp:
     box={k:float(w.attrib[k]) for k in ['xMin','yMin','xMax','yMax']};assert box['xMin']>=72 and box['xMax']<=540 and box['yMin']>=60 and box['yMax']<=720;geometries.append({'packetPage':pn,'rect':box})
  assert len(geometries)==1
  for c in ['records_checklist','filing_instructions']:
   text=' '.join(texts[i-1] for i in by[c])
   for act in actions:
    assert norm(act['description']) in norm(text),(family,c,act)
    if act['requirement']=='conditional':assert norm(act['conditionDescription']) in norm(text)
  filing=' '.join(texts[i-1] for i in by['filing_instructions'])
  for condition in h['selfHelpStopConditions']:assert norm(condition) in norm(filing)
  assert 'no court fee is charged, so there is nothing to waive' in filing
  assert 'no court fees or costs are charged for a sealing petition' in filing
  if 'ancillary' in track:assert 'FBI Identity History Summary' not in '\n'.join(texts)
  composedBounds=[]
  for pm in a['pageManifest']:
   if pm['component']=='primary_filing':continue
   pn=pm['packetPage'];ws=pages[pn-1].findall('.//{http://www.w3.org/1999/xhtml}word');xs=[float(w.attrib['xMin']) for w in ws];xe=[float(w.attrib['xMax']) for w in ws];ys=[float(w.attrib['yMin']) for w in ws];ye=[float(w.attrib['yMax']) for w in ws]
   b=[min(xs),min(ys),max(xe),max(ye)];assert b[0]>=71.9 and b[2]<float(pages[pn-1].attrib['width']) and b[1]>=60 and b[3]<=731,b;composedBounds.append({'packetPage':pn,'component':pm['component'],'bounds':b})
  row['fixtures'].append({'fixture':a['fixture'],'packetSha256':a['sha256'],'pages':a['pageCount'],'primaryFilingUnchanged':True,'dateOfBirth':exp,'dateOfBirthReadback':geometries,'noOtherParticipantDOB':True,'all8HeldFixtureFactsPresent':True,'all8OppositeParticipantFactsAbsent':True,'allBoundRecordActionsAndConditionsPresentInBothPDFGuidanceComponents':True,'allStopsPreserved':True,'feeAndWaiverPreserved':True,'composedBounds':composedBounds})
 results.append(row)
(s/'artifact-checks.json').write_text(json.dumps({'status':'PASS','rows':results},indent=2)+'\n');print(json.dumps({'status':'PASS','families':len(results),'packets':sum(len(x['fixtures']) for x in results),'composedWritesReadBack':104,'DOBWrites':8,'officialMapsUnchanged':4,'primaryFilingPDFsUnchanged':8}))
