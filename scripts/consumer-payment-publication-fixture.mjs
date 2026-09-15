// Local PostgreSQL test support only. Simulates the not-yet-published successor
// receipt; preserves every real legal/source/packet approval and assertion.
// No tracked record is written and this fixture never supplies release proof.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
export async function installLocalPublicationFixture() {
 const registryModule=await import('../src/lib/rcap/fulfillment/grade-a-registry.ts');
 const admission=await import('../src/lib/rcap/fulfillment/grade-a-admission.ts');
 const root=process.cwd();
 const registry=JSON.parse(fs.readFileSync('data/rcap-grade-a/fulfillment-authority-registry.json'));
 const observations=JSON.parse(fs.readFileSync('data/rcap-grade-a/fulfillment-observation-snapshot.json'));
 const sourceSha='1'.repeat(40),digest='sha256:'+'a'.repeat(64);
 const publication=JSON.stringify({sourceSha,immutableRegistryDigest:digest,workflowConclusion:'success',syntheticLocalTestOnly:true});
 const externalPublication={sourceSha,immutableRegistryDigest:digest,workflowConclusion:'success',evidenceSha256:createHash('sha256').update(publication).digest('hex')};
 for(const record of registry.records) {
  record.provider.imageDigest=digest;
  record.history.at(-1).recordSha256=registryModule.fulfillmentRecordSha256(record);
  observations.routes[record.routeId].provider.imageDigest=digest;
  observations.routes[record.routeId].externalPublication=externalPublication;
 }
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ms-local-publication-fixture-'));
 try {
  for(const [file,bytes] of [['data/rcap-grade-a/fulfillment-authority-registry.json',JSON.stringify(registry)],['data/rcap-grade-a/fulfillment-observation-snapshot.json',JSON.stringify(observations)],['data/rcap-render/worker-publication-evidence.json',publication]]) {fs.mkdirSync(path.dirname(path.join(tmp,file)),{recursive:true});fs.writeFileSync(path.join(tmp,file),bytes);}
  process.chdir(tmp);registryModule.resetFulfillmentRegistryCache();admission.resetObservationCache();
  const loaded=registryModule.loadFulfillmentRegistry();if(loaded.problems.length)throw new Error(JSON.stringify(loaded.problems));
  for(const record of registry.records)admission.resolveObservation(record.routeId);
 } finally {process.chdir(root);fs.rmSync(tmp,{recursive:true,force:true});}
 console.log('LOCAL PUBLICATION FIXTURE: synthetic successor receipt only; no shipping publication or equivalence asserted. Legal/source/packet authority is unchanged.');
}
