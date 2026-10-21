import hashlib,json,pathlib,subprocess,sys
root=pathlib.Path(__file__).resolve().parents[5]
fam=root/'data/rcap-all50/overlays/census-v1/nh/nh-petition-nonconviction-pre2019-set--official-pdf-fill'
read=lambda name:json.loads((fam/name).read_text())
mapping=read('production-field-map.json');rendered=read('reports/rendered-artifacts.json');proof=read('reports/actual-writes.json');guide=(fam/'participant-instructions.md').read_text()
refusals=[]
for m in mapping['maps']:
 canonical={w['field'] for w in m['canonicalWrites']};boundary={w['field'] for w in m['boundaryWrites']}
 for r in m['boundaryRefusals']:
  if not r.get('unfittable'):continue
  assert r['field'] in canonical and r['field'] not in boundary,r['field']
  assert r['declaredMaxLength']<r['valueLength'] and r['requiredBeforeFiling']
  assert r['widgetLocations'] and all(w['rect'] for w in r['widgetLocations'])
  assert any(x['field']==r['field'] and x.get('conditional') and x['fixturesInWhichThisBoxIsBlank']==['boundary'] for x in mapping['requiredBeforeFiling'])
  refusals.append({'document':m['formNumber'],'field':r['field'],'maxLength':r['declaredMaxLength'],'valueLength':r['valueLength'],'widgetLocations':r['widgetLocations']})
assert refusals,'no actual-source MaxLen refusals were recorded'
assert all(x['disclosureLabel'] in guide for x in mapping['requiredBeforeFiling'])
assert all(not d['refusedFieldsWithInk'] for d in proof['documents'])
assert all(w['matchesExpected'] for d in proof['documents'] for w in d['actualWrites'])
assert not proof['blockingFindings']
assert 'every mailed request requires both sections completed and Section II notarized' in guide
assert 'in-person request for your own record requires only Section I' in guide
assert 'leave it blank, because this request is for your own record' not in guide
assert '## Who else has to be told' in guide and 'Nobody is served by you on this route.' in guide
assert 'wherever the form\'s own box is long enough to hold them' in guide
artifacts=[]
for a in rendered['artifacts']:
 b=(root/a['file']).read_bytes();h=hashlib.sha256(b).hexdigest()
 assert h==a['sha256'] and len(b)==a['byteLength']
 old=subprocess.check_output(['git','show','68c2aa4d4696f1c27e14f90ffed9a0d3c76dc9fa:'+a['file']],cwd=root)
 artifacts.append({'fixture':a['fixture'],'sha256':h,'byteLength':len(b),'pageCount':a['pageCount'],'unchangedFromWorkerBase':old==b})
assert rendered['everyPageRastered'] and len(rendered['rasterPages'])==18
for r in rendered['rasterPages']:
 b=(root/r['file']).read_bytes();assert hashlib.sha256(b).hexdigest()==r['sha256'];assert r['calibrationResidualPx']<=1.5
summary={'familyId':'nh_petition_nonconviction_pre2019-set','canonicalWrites':sum(len(m['canonicalWrites']) for m in mapping['maps']),'boundaryWrites':sum(len(m['boundaryWrites']) for m in mapping['maps']),'maxLenRefusedFields':len(refusals),'maxLenRefusedWidgetInstances':sum(len(r['widgetLocations']) for r in refusals),'maxLenRefusals':refusals,'requiredBeforeFiling':len(mapping['requiredBeforeFiling']),'allRequiredItemsDisclosed':True,'allActualWritesMatchHeldFacts':True,'refusedFieldsWithInk':0,'sourceMailingConditionsDisclosed':True,'serviceConditionsDisclosed':True,'artifacts':artifacts,'calibratedRasterPages':len(rendered['rasterPages']),'maxCalibrationResidualPx':max(r['calibrationResidualPx'] for r in rendered['rasterPages'])}
pathlib.Path(sys.argv[1]).write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps({k:v for k,v in summary.items() if k!='maxLenRefusals'}))
