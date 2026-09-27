#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fundingOutcome, stripeScheduled, assertAccounting, assertContinuity, assertFinalSlot, assertOneRemainingSlot } from './rcap-sponsored-funding-contract.mjs';
export function integrationVerdict(kind, read, context) {
  const bound = name => {
    const e = read(name); assert.equal(e.status,'PASS',`missing/failed ${name}`);
    for(const [k,v] of Object.entries(context))assert.equal(e[k],v,`${name} mismatched ${k}`);
    return e;
  };
  let emailDelivery;
  if(kind==='legal-aid'){
    for(const name of ['prerequisite','preservation','relationships']){
      const e=bound(`legal-aid/${name}.json`);
      assert.equal(e.boundary,name);assert.equal(e.native?.result,'PASS');
      if(name==='preservation')assert.equal(e.native.historicalCheckpointUnchanged,true);
    }
    for(const name of ['seed','browser']){
      const e=read(`legal-aid/${name}.json`);assert.equal(e.passed,true,`${name} native evidence required`);
      assert.equal(e.applicationSha,context.applicationSha);assert.equal(e.previewDeploymentId,context.deploymentId);
      if(name==='browser'){
        assert.equal(e.acceptanceProjectRef,context.project);
        assert.ok(Object.keys(e.cases??{}).length>0);
        for(const [id,c] of Object.entries(e.cases))assert.equal(c.passed,true,id);
        for(const field of ['checkoutCreated','paymentCompleted','stripeTouched','workerRun','migrationApplied'])assert.equal(e[field],false,field);
        emailDelivery=e.emailDelivery?.mode==='configured'?'PROVIDER_EVIDENCE_REQUIRED':'INCOMPLETE / NOT PROVEN';
        if(e.emailDelivery?.mode==='configured'){
          assert.equal(e.cases.follow_up_email_actually_delivered_to_the_test_mailbox?.passed,true);
          assert.equal(e.emailDelivery.observed?.providerMessageIdRecorded,true);
          assert.equal(e.emailDelivery.observed?.providerEvent?.status,200);
          emailDelivery='PROVIDER_EVIDENCE_RECORDED';
        }
      }
    }
  }else{
    assert.equal(kind,'sponsor-cap');
    const e=bound('sponsor-cap/outcome.json'),a=bound('sponsor-cap/accounting.json');
    assert.equal(e.observations.length,a.after.length);
    assert.ok([1,2].includes(e.observations.length));
    const dtc=e.observations.some(o=>stripeScheduled(fundingOutcome(o.response,o.before,o.after)));
    assert.equal(e.dtc,dtc);
    if(e.case==='final_slot'){assertOneRemainingSlot(e.capacity);assertFinalSlot(e.observations);}
    else { assert.equal(e.observations.length,1);assert.ok(['sponsored','exhausted'].includes(e.case));assert.equal(dtc,e.case==='exhausted'); }
    e.observations.forEach((o,i)=>{assert.equal(fundingOutcome(o.response,o.before,o.after),o.outcome);assertContinuity(o.after,a.after[i]);assertAccounting(o.outcome,a.after[i],{paid:stripeScheduled(o.outcome)});});
    if(dtc){
      const p=bound('sponsor-cap/payment.json');
      assert.equal(p.item,e.observations.find(o=>stripeScheduled(o.outcome)).before.item.id);
      const native=read('payment.json');assert.equal(native.passed,true);
      assert.ok(native.requiredCases?.length>0);assert.deepEqual(native.failedCases,[]);assert.deepEqual(native.missingCases,[]);
      for(const id of native.requiredCases)assert.equal(native.cases?.[id]?.passed,true,`missing DTC case ${id}`);
    }
  }
  return {status:'PASS',kind,...context,...(emailDelivery?{emailDelivery}:{})};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  const context={applicationSha:process.env.HOSTED_APPLICATION_SHA,project:process.env.ACCEPTANCE_SUPABASE_PROJECT_REF,
    deploymentId:process.env.HOSTED_PREVIEW_DEPLOYMENT_ID,hostname:process.env.HOSTED_PREVIEW_HOSTNAME};
  for(const value of Object.values(context))assert.ok(value,'missing verdict source/target context');
  console.log(JSON.stringify(integrationVerdict(process.argv[2],name=>JSON.parse(fs.readFileSync(path.join('hosted-acceptance-evidence',name),'utf8')),context)));
}
