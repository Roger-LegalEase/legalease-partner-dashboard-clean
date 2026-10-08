import assert from 'node:assert/strict';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {LAUNCH_EXCEPTION_POLICY,resolveEffectiveReadiness,canAssignedSuccessManagerAct}=await import('../src/lib/partners/onboarding/launch-exception-policy.ts');
const {LAUNCH_CHECK_DEFINITIONS}=await import('../src/lib/partners/onboarding/launch-readiness.ts');
assert.deepEqual(Object.keys(LAUNCH_EXCEPTION_POLICY).sort(),LAUNCH_CHECK_DEFINITIONS.map(c=>c.key).sort());
const base={raw:{checks:[{key:'staff_training_completed',blocking:true,status:'not_started'},{key:'partner_launch_approval_received',blocking:true,status:'passing'}]},partnerSlug:'synthetic-alpha',workspaceId:'synthetic-workspace',snapshotHash:'a'.repeat(64),now:'2026-10-08T12:00:00Z',policyAuthorized:true};
const event={id:'grant-1',kind:'grant',grantId:null,partnerSlug:base.partnerSlug,workspaceId:base.workspaceId,checkKey:'staff_training_completed',actorAuthUserId:'verified-admin',actorRole:'internal_admin',requestId:'request-1',reason:'Supervised launch with documented training alternative.',authorityReference:'Owner-approved synthetic policy fixture',snapshotHash:base.snapshotHash,createdAt:'2026-10-08T11:00:00Z',expiresAt:'2026-10-09T11:00:00Z'};
assert.equal(resolveEffectiveReadiness({...base,events:[event]}).label,'Ready with authorized exceptions');
assert.equal(base.raw.checks[0].status,'not_started');
let count=3;
for(const patch of [{expiresAt:'2026-10-07T00:00:00Z'},{reason:''},{actorRole:'partner_admin'},{snapshotHash:'b'.repeat(64)},{partnerSlug:'synthetic-beta'},{authorityReference:''},{createdAt:'bad-date'},{createdAt:'2026-10-09T00:00:00Z'}]){assert.equal(resolveEffectiveReadiness({...base,events:[{...event,...patch}]}).ready,false);count++;}
assert.equal(resolveEffectiveReadiness({...base,policyAuthorized:false,events:[event]}).ready,false);count++;
assert.equal(resolveEffectiveReadiness({...base,events:[event,{...event,id:'revoke-1',kind:'revoke',grantId:event.id}]}).ready,false);count++;
for(const checkKey of Object.keys(LAUNCH_EXCEPTION_POLICY).filter(k=>LAUNCH_EXCEPTION_POLICY[k].classification==='hard_stop')) {
 assert.equal(resolveEffectiveReadiness({...base,raw:{checks:[{key:checkKey,blocking:true,status:'failing'}]},events:[{...event,checkKey}]}).ready,false);count++;
}
const assigned={authUserId:'psm-fixture',partnerSlug:'synthetic-alpha',capability:'prepare',assignments:[{authUserId:'psm-fixture',partnerSlug:'synthetic-alpha',expiresAt:null,revokedAt:null,capabilities:['prepare','review_operational_material']}],now:base.now,delegationAuthorized:true};
assert.equal(canAssignedSuccessManagerAct(assigned),true);count++;
for(const patch of [{partnerSlug:'synthetic-beta'},{authUserId:'other-psm'},{capability:'finance'},{capability:'legal_approval'},{capability:'grant_exception'},{capability:'launch'},{delegationAuthorized:false}]) {assert.equal(canAssignedSuccessManagerAct({...assigned,...patch}),false);count++;}
assert.equal(resolveEffectiveReadiness({...base,raw:{checks:[{key:'partner_launch_approval_received',blocking:true,status:'waived'}]},events:[]}).ready,false); count++;
console.log(`${count} exception and assigned-PSM policy cases PASS; no live grants.`);
