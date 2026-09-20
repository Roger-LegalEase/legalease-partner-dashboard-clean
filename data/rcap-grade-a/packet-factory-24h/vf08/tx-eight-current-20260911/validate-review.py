import pathlib,json,hashlib,subprocess
O=pathlib.Path('data/rcap-grade-a/packet-factory-24h/vf08/tx-eight-current-20260911')
def read(p):return json.loads(pathlib.Path(p).read_text())
r=read(O/'review.json');flat=read(O/'obligation-rows-120.json')['rows'];m=read(O/'current-measurements.json');s=read(O/'stream-measurements.json');b=read(O/'evidence-bindings.json');v=read(O/'visual-review.json')
assert len(r['rows'])==8 and len(flat)==120
assert sum(x['result']=='PASS'for x in flat)==109 and sum(x['result']=='FAIL'for x in flat)==11
assert all(len(x['proofObligations'])==15 and x['verdict']=='FAIL_REPAIR_REQUIRED' and not x['unmeasuredObligations']for x in r['rows'])
assert all(x['result']in['PASS','FAIL'] and x['measured'] and x['finding']for x in flat)
assert sum(x['counts']['strokeOnly']for f in s for x in f['fixtures'])==546
assert all(x['counts']['strokeOnly']==x['counts']['exactSourceMatches']and not x['counts']['unmatched']for f in s for x in f['fixtures'])
assert all(x['manifestMatches'] and x['originalRasterBindingMatches']for f in m for x in f['fixtures'])
assert all(x['matchesCustody']for x in b['streamCustody'])
assert all(x['currentMatchesPrimary']and x['sourceReceiptMatchesCurrent']for x in b['primaryBindings'])
assert sum(x['originalPacketPngCount']for x in b['originalRasterBindings'])==384
assert all(x['allOriginalPngHashesMatch']for x in b['originalRasterBindings'])
assert all(x['matchesOriginal']for f in b['originalRasterBindings']for x in f['externalOriginalFiles'])
assert len(v['pages'])==70 and len(set(x['representative']for x in v['pages']))==41
assert all(x['inspected']for x in v['pages'])
for f in m:
 for x in f['bindings']:
  assert hashlib.sha256(pathlib.Path(x['path']).read_bytes()).hexdigest()==x['sha256']
 for x in f['fixtures']:
  assert hashlib.sha256(pathlib.Path(x['path']).read_bytes()).hexdigest()==x['sha256']
assert read(O/'read-only-proof.json')['identical']
assert read(O.parent/'rows-vf08-20260911-tx-eight-current.json')==r
assert all(x['exitCode']==0 for x in read(O/'commands.json')if 'scripts/verify-packet-build-environment.mjs'not in x['command'])
tracked=subprocess.check_output(['git','diff','--name-only','7f04efd687f94b2bdd19a98f78f356480da5ee8f']).decode().splitlines()
assert all(p.startswith(str(O)+'/')or p==str(O.parent/'rows-vf08-20260911-tx-eight-current.json')for p in tracked)
result={'status':'PASS_REVIEW_ARTIFACT_VALIDATION','families':8,'obligations':120,'PASS':109,'FAIL':11,'unmeasured':0,'sourceBindings':22,'currentPdfs':16,'strokeOnlyExactMatches':546,'originalPagePngs':384,'uniqueOriginalImagesViewed':41,'pagesInspectedOrExactHashDuplicate':70,'packetAndBuilderBytesChanged':False,'environmentPreflight':'NOT_READY; limitations explicitly recorded and read-only continuation authorized by root','reviewIsApproval':False}
(O/'validation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
