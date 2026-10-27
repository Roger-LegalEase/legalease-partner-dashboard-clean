import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const RECOVERY_IMAGE=Object.freeze({source:'8da23f009b0ec5f291f74ef4527295bf07cd8fbe',digest:'sha256:d96419e7a79b1662662471f07d7d278d5fe7644571818f02e49f5d0e75b2cf37',image:'ghcr.io/roger-legalease/rcap-render-worker@sha256:d96419e7a79b1662662471f07d7d278d5fe7644571818f02e49f5d0e75b2cf37'});
export function admitRecoveryPublication(bytes,run){
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'59bf626a291e21fe0bd1048bc131c15ec7b59a16fc385712347b17f8277c3bab');
 const p=JSON.parse(bytes);for(const[k,v]of Object.entries({sourceSha:RECOVERY_IMAGE.source,requestedIntegrationSha:RECOVERY_IMAGE.source,immutableRegistryDigest:RECOVERY_IMAGE.digest,digestPinnedReference:RECOVERY_IMAGE.image,workflowRunId:'40499365575',workflowSourceSha:'fab79c4c9085d6e6102f06db0984f6ceaef52d06',publishOnlyNoDeploy:true,workerClaimingStarted:false,tagReplacementAuthorization:''}))assert.equal(p[k],v);
 for(const[k,v]of Object.entries({id:40499365575,head_sha:p.workflowSourceSha,head_branch:'captain-release',event:'workflow_dispatch',run_attempt:1,status:'completed',conclusion:'success'}))assert.equal(run[k],v);
 return RECOVERY_IMAGE;
}
