import assert from 'node:assert/strict';
export function assertPurposeRuntimeIdentity({status,body,applicationSha,adminLaunch}){
 assert.equal(typeof adminLaunch,'boolean');assert(body&&typeof body==='object'&&!Array.isArray(body));assert.equal(body.application,'RCAP 2.0');assert.equal(body.policyVersion,'rcap2.2');assert.equal(body.buildSha,applicationSha);assert.equal(body.runtimeSha,applicationSha);
 assert.equal(status,adminLaunch?200:503);assert.equal(body.sourceBound,adminLaunch);
 return {runtimeSourceIdentityVerified:true,adminLaunchSourceBound:body.sourceBound};
}

export function assertConsumerPurposeRelease(response,purpose){
 assert(['configured_sandbox_preview','clinic_deploy'].includes(purpose));
 assert.deepEqual(Object.keys(response.json).sort(),['application','policyVersion','buildSha','runtimeSha','sourceBound'].sort());
 return assertPurposeRuntimeIdentity({status:response.status,body:response.json,applicationSha:'c0052e13d9801d24080275aab02c70c6ea213fa3',adminLaunch:false});
}
