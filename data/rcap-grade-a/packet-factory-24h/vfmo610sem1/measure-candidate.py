import json,hashlib,pathlib,subprocess,re
stage=pathlib.Path('private/transfers/pf09-mo610-complete-20260914/semantic-staging');h=json.load(open(stage/'data/rcap-grade-a/packet-factory-24h/pf09/rows-pf09-mo610-complete-20260914.json'));d=stage/h['rows'][0]['directory'];checks=[]
for b in h['savedByteBindings']:
 raw=(stage/b['path']).read_bytes();checks.append({'path':b['path'],'sha256':hashlib.sha256(raw).hexdigest(),'byteLength':len(raw),'passed':hashlib.sha256(raw).hexdigest()==b['sha256'] and len(raw)==b['byteLength']})
packets=[]
for fixture in ['canonical','boundary','petition-only']:
 file=d/(fixture+'.packet.pdf'); txt=subprocess.check_output(['pdftotext','-layout',str(file),'-']).decode();metadata=subprocess.check_output(['pdfinfo',str(file)]).decode();pages=int(re.search(r'Pages:\s+(\d+)',metadata)[1]);packet={'fixture':fixture,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'pages':pages,'characters':len(txt),'coverage':json.load(open(d/(fixture+'.coverage.json')))};packets.append(packet)
out={'familyId':h['rows'][0]['familyId'],'reviewerSession':'/root/mt_form_b_independent_review','lane':'VFMO610SEM1','candidateBindings':checks,'bindingCount':len(checks),'allBindingsPass':all(c['passed'] for c in checks),'packetMeasurements':packets,'totalPages':sum(p['pages'] for p in packets),'semanticAcceptance':'Separate verdict required; binding accuracy cannot replace source/route obligations.'}
pathlib.Path('data/rcap-grade-a/packet-factory-24h/vfmo610sem1/candidate-measurements-20260914.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({'bindingCount':len(checks),'allBindingsPass':out['allBindingsPass'],'totalPages':out['totalPages']}))
