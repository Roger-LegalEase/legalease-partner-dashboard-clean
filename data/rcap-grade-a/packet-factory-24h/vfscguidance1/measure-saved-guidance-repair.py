import json,hashlib,pathlib
root=pathlib.Path.cwd(); base=root/'data/rcap-grade-a/packet-factory-24h/pf01/sc-guidance-repair-20260914'
read=lambda p:json.loads(p.read_text())
h=read(base/'handoff.json'); s=read(base/'saved-byte-checks.json'); g=read(base/'guidance.json'); bundles=read(base/'saved-native-bundles.json'); candidate=read(base/'SC_GUIDANCE_TERMINAL_TREATMENT_CANDIDATE.json')['families'][0]
tracks={t['trackId']:t for t in read(root/'data/record-clearing/legal-design-track-registry.json')['tracks']}; measurements=[]
for b in h['candidateBindings']+s['sourceBindings']+s['retiredArtifactBindings']:
 p=root/b['path']; raw=p.read_bytes(); actual=hashlib.sha256(raw).hexdigest(); measurements.append(dict(path=b['path'],sha256=actual,byteLength=len(raw),passBinding=actual==b['sha256'] and len(raw)==b['byteLength']))
routeChecks=[]
for t in g['treatments']:
 tid=t['trackId']; orig=tracks[tid]; pair=[b for b in bundles if b['trackId']==tid]; checks={'twoSavedLocales':{b['locale'] for b in pair}=={'en','es'},'englishFeesExact':t['feeSchedule']['en']==orig['rules']['fees'],'englishFeeReliefExact':t['feeRelief']['en']==orig['rules']['feeWaiver'],'destinationExact':t['destination']['name']==orig['destination']['name'],'commerceClosed':all([t['runtimeContract']['sellable']==False,t['runtimeContract']['paymentAllowed']==False,t['runtimeContract']['checkoutSuppressed']==True,t['runtimeContract']['renderJobAllowed']==False,t['runtimeContract']['rendererKind']=='none',t['runtimeContract']['packetCreditConsumption']=='none',t['runtimeContract']['partnerCreditConsumption']=='none'])}
 for b in pair:
  loc=b['locale'];
  for key in ['routeLabel','mechanism','participantFiles','controllingActor','stopReason','destination','nextStep','gather','doNot','timing','afterNextStep','escalation','nextSteps']:
   checks[loc+'.saved.'+key]=b[key]==t[key][loc]
  checks[loc+'.feesVisible']=t['feeSchedule'][loc] in ' '.join(b['nextSteps'])
  checks[loc+'.reliefVisible']=t['feeRelief'][loc] in ' '.join(b['nextSteps'])
 routeChecks.append(dict(trackId=tid,checks=checks,passAll=all(checks.values())))
out={'schemaVersion':'rcap-independent-guidance-measurements/v1','familyId':'rcap-sc-custom-pleading','reviewerSession':'/root/mt_form_b_independent_review','lane':'VFSCGUIDANCE1','bindingCount':len(measurements),'bindings':measurements,'routeChecks':routeChecks,'savedBundleCount':len(bundles),'allMeasuredChecksPass':all(x['passBinding'] for x in measurements) and all(x['passAll'] for x in routeChecks),'measurementScope':'Exact saved bindings and native projection; semantic acceptance is separate.'}
(root/'data/rcap-grade-a/packet-factory-24h/vfscguidance1/saved-guidance-repair-measurements-20260914.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({k:v for k,v in out.items() if k not in ['bindings','routeChecks']}));print([x for x in measurements if not x['passBinding']]);print([x for x in routeChecks if not x['passAll']])
