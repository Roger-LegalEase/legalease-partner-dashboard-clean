import json,hashlib,pathlib,subprocess,re
D=pathlib.Path('data/rcap-all50/overlays/census-v1/nc/nc-145-8a-youthful-set--official-pdf-fill'); O=pathlib.Path('data/rcap-grade-a/packet-factory-24h/vfncyouthsem1')
def read(p):return json.loads(pathlib.Path(p).read_text())
def bind(p):
 b=pathlib.Path(p).read_bytes();return {'path':str(p),'sha256':hashlib.sha256(b).hexdigest(),'byteLength':len(b)}
def txt(p):return subprocess.check_output(['pdftotext','-layout',str(p),'-'],text=True)
def norm(x):return re.sub(r'\s+','',str(x))
a=read('data/rcap-grade-a/packet-factory-24h/pf01/nc-youthful-repair-20260914/saved-candidate-evidence.json'); bindings=[]
for x in a['candidateBindings']:
 y=bind(x['path']);y['pass']=y['sha256']==x['sha256'] and y['byteLength']==x['byteLength'];bindings.append(y)
sources=[]
for x in read(D/'source-receipt.json')['documents']:
 y=bind(x['path']);y['pass']=y['sha256']==x['sha256'] and y['byteLength']==x['byteLength'];sources.append(y)
texts={p.name:txt(p) for p in D.glob('*.pdf')}; fixtures=[]
for k in ['canonical','boundary']:
 p=D/'fixtures'/f'{k}.pdf';s=txt(p);info=subprocess.check_output(['pdfinfo',str(p)],text=True);fixtures.append({**bind(p),'fixture':k,'pages':int(re.search(r'Pages:\s+(\d+)',info)[1]),'wholeText':s,'guideSBIRecordInstruction':bool(re.search(r'(SBI|State Bureau of Investigation).{0,150}(right.to.review|criminal|record)',texts[f'{k}.participant-guide.pdf'],re.I))})
m=read(D/'production-field-map.json');writes=[]
for w in m['writes']:
 if w.get('isSelectionControl'):continue
 k,c=w['documentId'].split('/',1);writes.append({'fixture':k,'component':c,'field':w['field'],'value':w['value'],'presentInComponent':norm(w['value']) in norm(texts[f'{k}.{c}.pdf'])})
missingNames=[x for x in m['refusals'] if x['field'] in ['SignedName1','SignedByApplicantName','SigningApplicantIsDefendantCkBox']]
result={'familyId':'nc_145_8a_youthful-set','reviewer':'/root/mt_form_b_independent_review','bindings':bindings,'sources':sources,'fixtures':fixtures,'mappedTextChecks':writes,'knownParticipantFieldsMisclassifiedProtected':missingNames,'allBindingsExact':all(x['pass'] for x in bindings+sources),'mappedTextChecksPass':all(x['presentInComponent'] for x in writes),'originalPageReviewPerformed':False}
(O/'repair-saved-byte-measurements.json').write_text(json.dumps(result,indent=2)+'\n');print({'bindings':len(bindings),'sources':len(sources),'mappedTextChecks':len(writes),'mappedTextPass':result['mappedTextChecksPass'],'exact':result['allBindingsExact'],'pages':sum(x['pages'] for x in fixtures)})
