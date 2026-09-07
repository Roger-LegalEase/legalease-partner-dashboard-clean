#!/usr/bin/env python3
import argparse, copy, importlib.util, json, pathlib, subprocess
p=pathlib.Path(__file__).with_name('registry_anchor_refresh.py')
spec=importlib.util.spec_from_file_location('refresh',p);mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
ap=argparse.ArgumentParser();ap.add_argument('--base',required=True);args=ap.parse_args()
root=pathlib.Path(subprocess.check_output(['git','rev-parse','--show-toplevel'],text=True).strip())
show=lambda p:subprocess.check_output(['git','show',args.base+':'+p],cwd=root)
before=show(mod.REGISTRY);after=(root/mod.REGISTRY).read_bytes()
master=json.loads(show('data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json'));families=[]
for fam in master['families']:
 if fam['state']!='COMPLETE_PACKET_PROVEN':continue
 path=fam['directory']+'/source-receipt.json'
 if not (root/path).exists():continue
 rec=json.loads(show(path))
 if any(x.get('pathInRepository')==mod.REGISTRY for x in rec.get('committedRecords',[])):families.append((fam,rec))
assert len(families)==15
positives=0
for fam,rec in families:
 original=copy.deepcopy(rec);changed=mod.refresh(rec,fam,before,after,args.base);assert original==rec
 target=next(x for x in changed['committedRecords'] if x.get('pathInRepository')==mod.REGISTRY)
 assert target['sha256']==mod.SHA(after) and target['identityRefresh']['anchorsCompared']==target['identityRefresh']['anchorsIdentical']>0
 normalized=copy.deepcopy(changed);r=next(x for x in normalized['committedRecords'] if x.get('pathInRepository')==mod.REGISTRY)
 orig=next(x for x in rec['committedRecords'] if x.get('pathInRepository')==mod.REGISTRY)
 for k in ['identityRefresh','sha256','byteLength']:
  if k in orig:r[k]=copy.deepcopy(orig[k])
  else:r.pop(k,None)
 assert normalized==rec;positives+=1
fam,receipt=families[0];new=json.loads(after);cases=[]
def fail(name,r=receipt,f=fam,b=before,a=after):
 try:mod.refresh(r,f,b,a,args.base)
 except (ValueError,KeyError):cases.append(name)
 else:raise AssertionError(name)
for field,val in [('sha256','0'*64),('byteLength',1),('recordId','unknown'),('pathInRepository','wrong')]:
 r=copy.deepcopy(receipt);r['committedRecords'][0][field]=val;fail(field,r=r)
r=copy.deepcopy(receipt);r['committedRecords'].append(copy.deepcopy(r['committedRecords'][0]));fail('duplicate binding',r=r)
r=copy.deepcopy(receipt);r['familyId']='wrong';fail('wrong family',r=r)
r=copy.deepcopy(receipt);r['routeKeys']=[];fail('missing routes',r=r)
f=copy.deepcopy(fam);f['state']='FAIL_REPAIR_REQUIRED';fail('not prior proven',f=f)
n=copy.deepcopy(new);n['tracks'].append(copy.deepcopy(n['tracks'][0]));fail('duplicate track',a=json.dumps(n).encode())
id=receipt['committedRecords'][0]['recordId'].split(':',1)[1]
n=copy.deepcopy(new);next(x for x in n['tracks'] if x['trackId']==id)['injected']='changed';fail('changed bound track',a=json.dumps(n).encode())
n=copy.deepcopy(new);n['tracks']=[x for x in n['tracks'] if x['trackId']!=id];fail('missing bound track',a=json.dumps(n).encode())
n=copy.deepcopy(new);n['global-test-change']=True;fail('global metadata changed',a=json.dumps(n).encode())
r=copy.deepcopy(receipt);r['routeKeys']=['unbound-route'];f=copy.deepcopy(fam);f['routeKeys']=r['routeKeys'];fail('route outside anchor',r=r,f=f)
print(json.dumps({'positiveReceiptComparisons':positives,'rejectedCases':len(cases),'controls':cases,'sourceInputsUnchanged':True}))
