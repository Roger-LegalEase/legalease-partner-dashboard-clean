// Classification never changes application-input or worker-input discovery.
// Explicit successor custody supplements reviewed source and bounded tooling.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {applicationInputManifest,applicationInputEquivalence} from '../rcap-application-inputs.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const blob=(root,sha,p)=>execFileSync('git',['show',`${sha}:${p}`],{cwd:root,maxBuffer:64*1024*1024});
export const boundedControl=p=>/^(scripts\/grade-a-launch-control\/|\.github\/workflows\/|scripts\/rcap-worker-identity)/.test(p);
// Explicitly authorized Preview caller; no scripts/** or runtime exemption.
export const previewControl=p=>['scripts/rcap-hosted-vercel-rest-transport.mjs','scripts/rcap-hosted-vercel-rest-transport.test.mjs','scripts/rcap-hosted-acceptance-preflight.test.mjs'].includes(p);
const runtimeAuthority=new Set(['data/rcap-render/worker-publication-evidence.json','data/rcap-grade-a/fulfillment-authority-registry.json','data/rcap-grade-a/fulfillment-observation-snapshot.json','data/rcap-grade-a/fulfillment-authority-projection.json']);
export function publicationNativeFiles(e){
 const refs=[e.nativeArchive,e.nativeRunMetadata,e.nativeJobMetadata,e.nativeLog,{path:e.originalPublicationPath,bytes:e.originalPublicationBytes,sha256:e.originalPublicationSha256},...Object.values(e.imageAcceptance??{}).filter(v=>v&&typeof v==='object'&&v.path)];
 const out={};for(const ref of refs){assert(ref?.path?.startsWith('hosted-acceptance-evidence/worker/')&&!ref.path.split('/').includes('..'),'scoped publication native reference');assert(Number.isSafeInteger(ref.bytes)&&ref.bytes>0);assert.match(ref.sha256,/^[0-9a-f]{64}$/);if(out[ref.path])assert.deepEqual(out[ref.path],ref);out[ref.path]=ref;}
 return out;
}
export function executedWorkflowFiles(root,sha,workflow){
 const files={},queue=[workflow],seen=new Set();
 while(queue.length){const rel=queue.shift();if(seen.has(rel))continue;seen.add(rel);const bytes=blob(root,sha,rel);files[rel]=hash(bytes);const text=bytes.toString();
  for(const m of text.matchAll(/scripts\/[A-Za-z0-9_./-]+\.mjs/g))queue.push(m[0]);
  if(rel.endsWith('.mjs'))for(const m of text.matchAll(/(?:from\s*|import\s*\(|require\s*\()["'](\.[^"']+)["']/g)){const dep=path.posix.normalize(path.posix.join(path.posix.dirname(rel),m[1]));if(dep.endsWith('.mjs'))queue.push(dep);}
 }
 return Object.fromEntries(Object.entries(files).sort(([a],[b])=>a.localeCompare(b)));
}
export function successorResponsibilities(root,{releaseBaseSha,sourceSha,toolsSha,applicationSha,reviewedFiles}){
 assert.match(applicationSha,/^[a-f0-9]{40}$/);assert.equal(git(root,['rev-parse',`${applicationSha}^{commit}`]),applicationSha);git(root,['merge-base','--is-ancestor',sourceSha,applicationSha]);git(root,['merge-base','--is-ancestor',applicationSha,toolsSha]);
 const publication=JSON.parse(blob(root,applicationSha,'data/rcap-render/worker-publication-evidence.json'));
 assert.equal(publication.sourceSha,sourceSha);assert.equal(publication.runtimeAccepted,true);assert.equal(publication.imageAcceptance?.conclusion,'success');assert.equal(publication.imageAcceptance?.sourceSha,sourceSha);assert.equal(publication.imageAcceptance?.digest,publication.immutableRegistryDigest);assert.match(publication.immutableRegistryDigest,/^sha256:[0-9a-f]{64}$/);
 const native=publicationNativeFiles(publication);
 const appDelta=git(root,['diff','--no-renames','--name-only',sourceSha,applicationSha]).split('\n').filter(Boolean);
 assert.equal(git(root,['diff','--no-renames','--diff-filter=D','--name-only',releaseBaseSha,toolsSha]),'','successor deletions are not representable');
 for(const p of appDelta)assert(runtimeAuthority.has(p)||Object.hasOwn(native,p),'authorized runtime successor contains only runtime authority and native publication evidence: '+p);
 const runtimeFiles={},nativeFiles={},controlFiles={};
 const inputs=new Set(applicationInputManifest(root,applicationSha).files.map(f=>f.path));
 for(const p of git(root,['diff','--name-only',releaseBaseSha,toolsSha]).split('\n').filter(Boolean)){
  if(Object.hasOwn(reviewedFiles,p))continue;
  let accounted=false;
  if(runtimeAuthority.has(p)||inputs.has(p)&&Object.hasOwn(native,p)){assert.equal(hash(blob(root,toolsSha,p)),hash(blob(root,applicationSha,p)),p+' frozen application input');runtimeFiles[p]=hash(blob(root,applicationSha,p));accounted=true;}
  if(Object.hasOwn(native,p)){const b=blob(root,applicationSha,p);assert.equal(b.length,native[p].bytes);assert.equal(hash(b),native[p].sha256);assert.equal(hash(blob(root,toolsSha,p)),hash(b));nativeFiles[p]=native[p];accounted=true;}
  if(boundedControl(p)||previewControl(p)){controlFiles[p]=hash(blob(root,toolsSha,p));accounted=true;}
  assert(accounted,'unclassified successor path: '+p);
 }
 const executedControls={};for(const [workflow,sha]of [['.github/workflows/publish-rcap-render-worker.yml',publication.workflowSourceSha],['.github/workflows/rcap-worker-image-acceptance.yml',publication.imageAcceptance.workflowSourceSha]])executedControls[workflow]={workflowSourceSha:sha,files:executedWorkflowFiles(root,sha,workflow)};
 return {controlFiles,inputs:{schemaVersion:'rcap-pinned-successor-responsibilities/v1',applicationSha,applicationFingerprint:applicationInputManifest(root,applicationSha).fingerprint,runtimeFiles,nativeFiles,executedControls}};
}
export function verifySuccessorResponsibilities(root,p,tools){
 const bound=tools.successorInputs;assert(bound,'explicit successor responsibilities');
 const actual=successorResponsibilities(root,{releaseBaseSha:p.releaseBaseSha,sourceSha:p.sourceCommit,toolsSha:tools.toolsSha,applicationSha:bound.applicationSha,reviewedFiles:p.files});
 assert.deepEqual(bound,actual.inputs,'complete runtime/native/executed responsibility manifest');assert.deepEqual(tools.successorTools.files,actual.controlFiles,'complete bounded tooling manifest');
 assert(applicationInputEquivalence(root,bound.applicationSha,'HEAD').equivalent,'current application inputs match authorized runtime successor');
 for(const [rel,digest]of Object.entries(bound.runtimeFiles))assert.equal(hash(fs.readFileSync(path.join(root,rel))),digest,'frozen runtime bytes: '+rel);
 for(const ref of Object.values(bound.nativeFiles)){const b=fs.readFileSync(path.join(root,ref.path));assert.equal(b.length,ref.bytes);assert.equal(hash(b),ref.sha256,'frozen native bytes: '+ref.path);}
 return bound;
}
