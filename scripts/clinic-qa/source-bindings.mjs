import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createWorkerInputPlan} from '../rcap-hosted-acceptance-worker-input-plan.mjs';

export function applicationBinding(directory) {
  const files=[...new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z','src'],
    {cwd:directory,encoding:'utf8'}).split('\0').filter(Boolean))].sort();
  const hashes=files.map(file=>[file,createHash('sha256').update(fs.readFileSync(path.join(directory,file))).digest('hex')]);
  return {files,sha256:createHash('sha256').update(JSON.stringify(hashes)).digest('hex')};
}
export function assertApplicationBindingsEqual(runner,served) {
  assert.deepEqual(runner.files,served.files,'Runner and served application source file sets differ');
  assert.equal(runner.sha256,served.sha256,'Runner and served application source bytes differ');
}

/** A finalized job's self-reported digest is useful only when it matches the
 * independently accepted publication and this application's actual inputs. */
export function assertArtifactWorkerBinding({job,publicationBytes,observation,plan}) {
  const publication=JSON.parse(publicationBytes);
  const binding=observation?.externalPublication;
  const provider=observation?.provider;
  assert.match(publication.sourceSha??'',/^[a-f0-9]{40}$/,'Exact published source required');
  assert.match(publication.immutableRegistryDigest??'',/^sha256:[a-f0-9]{64}$/,'Published immutable digest required');
  assert.match(publication.workerInputFingerprint??'',/^sha256:[a-f0-9]{64}$/,'Published input fingerprint required');
  assert(typeof publication.imageRepository==='string'&&publication.imageRepository.length>0,'Published provider identity required');
  assert.equal(publication.workflowConclusion,'success','Successful publication required');
  assert.equal(publication.runtimeAccepted,true,'Image acceptance required independently of publication');
  const accepted=publication.imageAcceptance;
  assert.equal(accepted?.conclusion,'success','Successful image acceptance required');
  assert.equal(accepted?.readOnly,true,'Existing read-only image acceptance required');
  assert(Number.isInteger(accepted?.runId)&&accepted.runId>0,'Exact image acceptance run required');
  assert.equal(accepted?.sourceSha,publication.sourceSha,'Image acceptance source binding');
  assert.equal(accepted?.tag,publication.sourceSha,'Image acceptance source tag binding');
  assert.equal(accepted?.digest,publication.immutableRegistryDigest,'Image acceptance digest binding');
  assert.equal(binding?.workflowConclusion,'success','Route publication observation required');
  assert.equal(binding?.evidenceSha256,createHash('sha256').update(publicationBytes).digest('hex'),'Exact route publication receipt binding');
  assert.equal(binding?.currentInputsEquivalent,true,'Route must observe current worker inputs');
  assert.equal(binding?.sourceSha,publication.sourceSha,'Route publication source binding');
  assert.equal(binding?.immutableRegistryDigest,publication.immutableRegistryDigest,'Route publication digest binding');
  assert.equal(provider?.imageDigest,publication.immutableRegistryDigest,'Route provider digest binding');
  assert.equal(provider?.providerId,publication.imageRepository,'Route provider identity binding');
  assert.equal(plan.acceptedSourceSha,publication.sourceSha,'Recomputed input comparison source');
  assert.equal(plan.acceptedDigest,publication.immutableRegistryDigest,'Recomputed input comparison digest');
  assert.equal(plan.rebuildRequired,false,'Published worker inputs differ from application');
  assert.deepEqual(plan.changedPaths,[],'No changed worker inputs');
  assert.deepEqual(plan.missingCanonicalInputs,[],'No missing worker inputs');
  assert.equal(plan.aggregateInputSha256,publication.workerInputFingerprint,'Publication input fingerprint matches application');
  assert.equal(job.container_digest,publication.immutableRegistryDigest,'Finalized job must name the current accepted worker digest');
  assert.equal(job.renderer_kind,provider?.rendererKind,'Finalized job renderer kind');
  assert.equal(job.renderer_version,provider?.rendererVersion,'Finalized job renderer version');
  assert(typeof provider?.rendererKind==='string'&&provider.rendererKind.length>0&&typeof provider.rendererVersion==='string'&&provider.rendererVersion.length>0,'Route renderer identity required');
  return {sourceSha:publication.sourceSha,containerDigest:job.container_digest,rendererKind:job.renderer_kind,
    rendererVersion:job.renderer_version,workerInputFingerprint:plan.aggregateInputSha256,
    publicationEvidenceSha256:binding.evidenceSha256,imageAcceptanceRunId:accepted.runId};
}

export function artifactWorkerBinding(job,directory=path.resolve(process.env.CLINIC_QA_APPLICATION_ROOT??process.cwd())) {
  const publicationBytes=fs.readFileSync(path.join(directory,'data/rcap-render/worker-publication-evidence.json'));
  const publication=JSON.parse(publicationBytes);
  const observation=JSON.parse(fs.readFileSync(path.join(directory,'data/rcap-grade-a/fulfillment-observation-snapshot.json'))).routes?.[job.route_id];
  const git=args=>execFileSync('git',args,{cwd:directory,encoding:'utf8',stdio:'pipe'}).trim();
  const plan=createWorkerInputPlan({rootDir:directory,acceptedSourceSha:publication.sourceSha,
    acceptedDigest:publication.immutableRegistryDigest,candidateSha:git(['rev-parse','HEAD'])});
  // Receipt/test-only commits may follow publication. Equal canonical inputs,
  // including Dockerfile-derived runtime data, are the requirement, not HEAD
  // equality. Also reject uncommitted and untracked runtime input changes.
  assert.equal(git(['diff','--name-only','HEAD','--',...plan.comparedInputs]),'','Uncommitted worker input changes');
  assert.equal(git(['ls-files','--others','--exclude-standard','--',...plan.comparedInputs]),'','Untracked worker inputs');
  return assertArtifactWorkerBinding({job,publicationBytes,observation,plan});
}
