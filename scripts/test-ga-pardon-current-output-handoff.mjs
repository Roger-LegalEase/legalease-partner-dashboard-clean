#!/usr/bin/env node
// Evidence-bound local acceptance: use the existing preserved candidate; no rendering.
import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync,spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {prepareGaCurrentOutputHandoff,assertGaCurrentOutputCandidateScope,assertGaParticipantAssemblyReviewScope,GA_CURRENT_OUTPUT_CANDIDATE_SHA256,GA_PARTICIPANT_ASSEMBLY_REVIEW_SHA256} from './lib/ga-pardon-current-output-handoff.mjs';
const candidatePath=process.argv[process.argv.indexOf('--candidate')+1];assert(process.argv.includes('--candidate')&&candidatePath,'pass --candidate with the existing preserved receipt');
const root=process.cwd(),readBytes=file=>fs.readFileSync(path.resolve(root,file)),candidate=JSON.parse(readBytes(candidatePath));
const sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),hash=b=>createHash('sha256').update(b).digest('hex');
const input={candidatePath,candidateSha256:GA_CURRENT_OUTPUT_CANDIDATE_SHA256,readBytes,sourceSha};let count=0;
const valid=await prepareGaCurrentOutputHandoff(input);assert.equal(valid.artifacts.outputs.length,6);assert.equal(valid.artifacts.packetBytesChanged,true);assert.equal(valid.canonicalRecord,null);assert.equal(valid.workerAdmission,null);assert.equal(valid.outputLegalApproval.state,'not_recorded');assert.equal(valid.finalVerification.state,'unbound');assert.equal(valid.opensRoute,false);assert.equal(valid.paymentAllowed,false);count++;
for(const entry of [...candidate.sourceSpecificationProvider.explicitBoundInputs,...candidate.currentOutputCandidates,...candidate.existingEvidence,...candidate.originalAdoptedArtifacts,...['OWNER_BATCH_ADOPTION_2026-09-02.json','POST_APPROVAL_CHANGE_AUDIT_2026-09-02.json'].map(file=>({path:'data/rcap-grade-a/legal-decisions/'+file}))]){
 const file=entry.path??entry.file;
 await assert.rejects(()=>prepareGaCurrentOutputHandoff({...input,readBytes:p=>p===file?Buffer.concat([readBytes(p),Buffer.from('\nchanged')]):readBytes(p)}));count++;
}
for(const file of [candidatePath,candidate.currentOutputCandidates[0].file,candidate.existingEvidence[1].path]){await assert.rejects(()=>prepareGaCurrentOutputHandoff({...input,readBytes:p=>{if(p===file)throw Error('missing fixture evidence');return readBytes(p);}}));count++;}
await assert.rejects(()=>prepareGaCurrentOutputHandoff({...input,candidateSha256:'0'.repeat(64)}));count++;
for(const [name,change]of [
 ['wrong route',c=>c.route.runtimeRouteId='GA:other'],['sibling',c=>c.route.trackId='ga-seal-m'],['aggregate',c=>c.route.tracklessAggregateAdmitted=true],['sibling admission',c=>c.route.gaSealMSiblingAdmitted=true],
 ['wrong provider',c=>c.sourceSpecificationProvider.provider='other'],['wrong provider version',c=>c.sourceSpecificationProvider.providerVersion='3'],
 ['omitted source',c=>c.sourceSpecificationProvider.explicitBoundInputs.pop()],['duplicate source',c=>c.sourceSpecificationProvider.explicitBoundInputs[1]=c.sourceSpecificationProvider.explicitBoundInputs[0]],
 ['missing output',c=>c.currentOutputCandidates.pop()],['duplicate output',c=>c.currentOutputCandidates[1]=c.currentOutputCandidates[0]],['unknown output case',c=>c.currentOutputCandidates[0].variant='new'],
 ['forged approval',c=>c.approvalDependency.currentApprovalState='passed'],['forged audit',c=>c.approvalDependency.postApprovalAuditVerdict='COVERED_BY_EXISTING_APPROVAL'],['dropped old adoption',c=>c.originalAdoptedArtifacts.pop()],['dropped independent review',c=>c.existingEvidence.pop()]
]){const changed=structuredClone(candidate);change(changed);assert.throws(()=>assertGaCurrentOutputCandidateScope(changed),undefined,name);count++;}
const authorityPaths=['data/rcap-grade-a/fulfillment-authority-registry.json','data/rcap-grade-a/fulfillment-observation-snapshot.json','data/rcap-grade-a/fulfillment-authority-projection.json','data/rcap-grade-a/legal-decisions/OWNER_BATCH_ADOPTION_2026-09-02.json','data/rcap-grade-a/legal-decisions/POST_APPROVAL_CHANGE_AUDIT_2026-09-02.json'];
const before=Object.fromEntries(authorityPaths.map(p=>[p,hash(readBytes(p))]));
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'ga-output-handoff-test-'));
const args=['scripts/generate-rcap-grade-a-fulfillment-authority.mjs','--check','--scope','ga-pardon-current-output-handoff','--candidate',candidatePath,'--candidate-sha256',GA_CURRENT_OUTPUT_CANDIDATE_SHA256,'--output-dir',temporary];
execFileSync(process.execPath,args,{stdio:'pipe'});const actual=JSON.parse(fs.readFileSync(path.join(temporary,'ga-pardon-current-output-handoff.json')));assert.deepEqual(actual,valid);count++;
assert.notEqual(spawnSync(process.execPath,args,{stdio:'pipe'}).status,0,'cannot overwrite preserved handoff');count++;
assert.notEqual(spawnSync(process.execPath,args.filter(v=>v!=='--check'),{stdio:'pipe'}).status,0,'no registry-writing scope');count++;
assert.notEqual(spawnSync(process.execPath,args.filter(v=>!['--scope','ga-pardon-current-output-handoff'].includes(v)),{stdio:'pipe',env:{...process.env,RCAP_AUTHORITY_SCOPED_CHECK_ROUTE:'ga-pardon-current-output-handoff'}}).status,0,'scope must be explicit on command line');count++;
const internal=[...args];internal[internal.length-1]=root;assert.notEqual(spawnSync(process.execPath,internal,{stdio:'pipe'}).status,0,'no repository output');count++;
const link=path.join(temporary,'repository-link');fs.symlinkSync(root,link);const linked=[...args];linked[linked.length-1]=link;assert.notEqual(spawnSync(process.execPath,linked,{stdio:'pipe'}).status,0,'no symlink into repository');count++;
assert.deepEqual(Object.fromEntries(authorityPaths.map(p=>[p,hash(readBytes(p))])),before);count++;
if(process.argv.includes('--assembly-review')){
 const assemblyReviewPath=process.argv[process.argv.indexOf('--assembly-review')+1];
 const assemblyReviewSha256=GA_PARTICIPANT_ASSEMBLY_REVIEW_SHA256;
 const review=JSON.parse(readBytes(assemblyReviewPath)),execution=JSON.parse(readBytes(review.actualRenderEvidence.path));
 const extendedInput={...input,assemblyReviewPath,assemblyReviewSha256};
 const extended=await prepareGaCurrentOutputHandoff(extendedInput);
 assert.deepEqual(extended.artifacts,valid.artifacts);assert.equal(extended.participantAssemblies.outputs.length,2);
 assert.equal(extended.participantAssemblies.qualifiedLanguageAcceptance,false);
 assert.equal(extended.participantAssemblies.protectedGenerationEstablished,false);assert.equal(extended.participantAssemblies.authorizedDeliveryEstablished,false);
 for(const key of ['canonicalRecord','workerAdmission'])assert.equal(extended[key],null);
 for(const key of ['createsApproval','createsRegistryRecord','opensRoute','paymentAllowed','productionAuthorized'])assert.equal(extended[key],false);
 assert.equal(extended.outputLegalApproval.state,'not_recorded');assert.equal(extended.finalVerification.state,'unbound');
 assert.notEqual(extended.finalVerification.preparedTechnicalInputsSha256,valid.finalVerification.preparedTechnicalInputsSha256);
 assert.deepEqual(extended.sourceSpecificationProvider.participantAssemblies,extended.participantAssemblies);count++;
 for(const file of [assemblyReviewPath,review.actualRenderEvidence.path,review.pixelEvidence.path,...Object.keys(review.sourceHashes),...review.outputs.map(output=>output.file)]){
  await assert.rejects(()=>prepareGaCurrentOutputHandoff({...extendedInput,readBytes:p=>p===file?Buffer.concat([readBytes(p),Buffer.from('\nchanged')]):readBytes(p)}));count++;
 }
 for(const file of [assemblyReviewPath,review.actualRenderEvidence.path,review.outputs[1].file]){
  await assert.rejects(()=>prepareGaCurrentOutputHandoff({...extendedInput,readBytes:p=>{if(p===file)throw Error('missing assembly evidence');return readBytes(p);}}));count++;
 }
 for(const substitute of candidate.currentOutputCandidates){
  await assert.rejects(()=>prepareGaCurrentOutputHandoff({...extendedInput,readBytes:p=>p===review.outputs[0].file?readBytes(substitute.file):readBytes(p)}));count++;
 }
 for(const change of [{assemblyReviewPath:undefined},{assemblyReviewSha256:undefined},{assemblyReviewSha256:'0'.repeat(64)}]){await assert.rejects(()=>prepareGaCurrentOutputHandoff({...extendedInput,...change}));count++;}
 for(const change of [
  (r,a)=>{r.status='approved';},(r,a)=>{r.candidate='0'.repeat(40);},(r,a)=>{r.actualRenderEvidence.productionEntry='renderGradeAPacketPdf';},
  (r,a)=>{a.artifacts[1].locale='en';r.outputs=structuredClone(a.artifacts);},
  (r,a)=>{a.artifacts=structuredClone(candidate.currentOutputCandidates);r.outputs=structuredClone(a.artifacts);},
  (r,a)=>{a.artifacts[0].guidePages=0;r.outputs=structuredClone(a.artifacts);},
  (r,a)=>{a.artifacts[1].courtPagesPreserved=10;r.outputs=structuredClone(a.artifacts);},
  (r,a)=>{delete a.sourceBindings['src/lib/rcap/render/participant-packet-assembly.ts'];r.sourceHashes=structuredClone(a.sourceBindings);},
  (r,a)=>{a.sourceBindings['invented-source.ts']='0'.repeat(64);r.sourceHashes=structuredClone(a.sourceBindings);},
  (r,a)=>{a.artifacts[0].matter.jurisdiction='MS';r.outputs=structuredClone(a.artifacts);},
  (r,a)=>{a.artifacts[0].matter.courtOrAgency=null;r.outputs=structuredClone(a.artifacts);},
  (r,a)=>{a.translationProvenance.status='APPROVED';}
 ]){const r=structuredClone(review),a=structuredClone(execution);change(r,a);assert.throws(()=>assertGaParticipantAssemblyReviewScope(r,a));count++;}
 const output=fs.mkdtempSync(path.join(os.tmpdir(),'ga-assembly-handoff-test-'));
 const cli=[...args];cli[cli.length-1]=output;cli.push('--assembly-review',assemblyReviewPath,'--assembly-review-sha256',assemblyReviewSha256);
 execFileSync(process.execPath,cli,{stdio:'pipe'});assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output,'ga-pardon-current-output-handoff.json'))),extended);count++;
 for(const omitted of ['--assembly-review','--assembly-review-sha256']){const incomplete=[...cli],index=incomplete.indexOf(omitted);incomplete.splice(index,2);assert.notEqual(spawnSync(process.execPath,incomplete,{stdio:'pipe'}).status,0);count++;}
 assert.deepEqual(Object.fromEntries(authorityPaths.map(p=>[p,hash(readBytes(p))])),before);count++;
}
console.log(JSON.stringify({status:'PASS',checks:count,scope:'Preserved six court/compositor artifacts and optional two actual participant assemblies, strictly separate and nonadmitting',renderingPerformed:false,approvalOrRegistryChanged:false,evidenceDirectory:temporary}));
