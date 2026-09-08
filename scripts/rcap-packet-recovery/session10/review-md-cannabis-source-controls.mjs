#!/usr/bin/env node
// Independent source-rule controls through the installed validator. The author
// renderer corpus remains attributed to its original report and is not rerun.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {hash,json,cannabisFixtures,validateMdCannabis} from '../chat5/md-cannabis.mjs';
const out='data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/md-independent-review';
const fixtures=cannabisFixtures(),rows=[];
function test(name,fixture,change,expected) {
  const facts=structuredClone(fixtures[fixture]);change(facts);
  try {
    if(expected.refusal)assert.throws(()=>validateMdCannabis(facts),expected.refusal);
    else {const r=validateMdCannabis(facts);assert.equal(r.mayMarkBasis,expected.mayMarkBasis);if('earliest' in expected)assert.equal(r.earliest,expected.earliest);if(expected.missing)assert(r.missing.some(x=>x.factId===expected.missing));}
    rows.push({name,fixture,factsSha256:hash(Buffer.from(json(facts))),passed:true,expected:{...expected,refusal:expected.refusal?.source}});
  } catch(error) {rows.push({name,fixture,passed:false,error:error.stack});}
}
test('10-105(a)(11) has no added completion date','canonical',f=>{delete f.case.completionDate;},{mayMarkBasis:true,earliest:null});
test('10-105(c)(8) actual completion day is supported','selectable/possession-paid',()=>{},{mayMarkBasis:true,earliest:'2026-09-07'});
test('unknown completion does not select possession recital','selectable/possession-paid',f=>{delete f.case.completionDate;},{mayMarkBasis:false,missing:'case.completionDate'});
test('10-110(c)(5) PWID exact three-year day supported','selectable/pwid-paid',()=>{},{mayMarkBasis:true,earliest:'2026-09-07'});
test('PWID one day too early rejected','selectable/pwid-paid',f=>{f.asOf='2026-09-06';},{refusal:/WAITING_PERIOD_NOT_MET/});
test('pending criminal proceeding rejected','canonical',f=>{f.confirmations.pendingCriminalProceeding=true;},{refusal:/CONDITION_NOT_MET: confirmations.pendingCriminalProceeding/});
test('known new conviction not yet eligible rejected','selectable/pwid-new-conviction-now-eligible',f=>{f.confirmations.newConvictionNowEligible=false;},{refusal:/CONDITION_NOT_MET: confirmations.newConvictionNowEligible/});
test('10-107 possession stays separate from ineligible assault','selectable/possession-separate-from-ineligible-unit',()=>{},{mayMarkBasis:true});
test('PWID does not receive the simple-possession exception','selectable/pwid-paid',f=>{f.case.otherOffenses=true;f.case.charges.push({id:'2',description:'Assault',statute:'CR 3-202',disposition:'guilty',requested:false});},{refusal:/OTHER_UNIT_CHARGE_REQUIRES_COMPONENT_REVIEW/});
test('already expunged court file rejected','canonical',f=>{f.records.courtRecordStatus='already_expunged';},{refusal:/ALREADY_EXPUNGED/});
test('Case Search absence with unknown court file cannot select recital','canonical',f=>{f.records.courtRecordStatus=null;delete f.records.confirmationReference;},{mayMarkBasis:false,missing:'records.courtRecordStatus'});
test('source-specific restricted-case exclusion blocks financial notice','selectable/possession-waiver',f=>{f.court.restrictedCaseType=true;},{refusal:/CONDITION_NOT_MET: court.restrictedCaseType/});
const result={scope:'INDEPENDENT_CURRENT_CANNABIS_SOURCE_RULE_CONTROLS',reviewer:'/root/independent_md_review',implementationAuthoredByReviewer:false,scriptSha256:hash(fs.readFileSync('scripts/rcap-packet-recovery/session10/review-md-cannabis-source-controls.mjs')),cannabisSha256:hash(fs.readFileSync('scripts/rcap-packet-recovery/chat5/md-cannabis.mjs')),helperSha256:hash(fs.readFileSync('scripts/rcap-packet-recovery/chat5/md-conviction.mjs')),nativeValidator:true,rendererExecuted:false,rows,passed:rows.filter(x=>x.passed).length,failed:rows.filter(x=>!x.passed).length,terminalPromotion:false};
fs.writeFileSync(`${out}/cannabis-independent-source-controls.json`,json(result));
console.log(json({passed:result.passed,failed:result.failed,failures:rows.filter(x=>!x.passed)}));if(result.failed)process.exitCode=1;
