import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {productionProjectDomains,productionDeploymentAliases,assertVercelProductionScopes,productionDomainsPath} from './vercel-production-scopes.mjs';
import {assertForwardOwner,forwardOwnerNote,FORWARD_PHASES,replacementOwnerReason,assertRefusedAttemptDocuments,verifyRefusedForwardAttempt} from './verify-forward-production-successor.mjs';
import {createHash} from 'node:crypto';
const aliases=productionDeploymentAliases({aliases:[{alias:'legalease.com'},{alias:'candidate-git.invalid'}]});
const inventory={domains:[{name:'legalease.com',verified:true},{name:'www.legalease.com',redirect:'legalease.com',redirectStatusCode:308,verified:false}]};
const domains=productionProjectDomains(inventory);
const authorization={productionDeploymentAliases:aliases,productionProjectDomains:domains};
test('existing unverified project redirect absent from deployment aliases is accepted',()=>{assertVercelProductionScopes(aliases,domains,authorization);assert.equal(aliases.some(a=>a.alias==='www.legalease.com'),false);assert(productionDomainsPath('prj_exact').includes('production=true&redirects=true'));assert.deepEqual(productionProjectDomains({domains:inventory.domains.map(d=>({...d,verified:!d.verified}))}),domains);});
for(const [name,edit] of [
 ['extra deployment alias',(a,d)=>a.push({alias:'extra.invalid',redirect:null})],
 ['missing deployment alias',(a,d)=>a.pop()],
 ['extra direct project domain',(a,d)=>d.push({name:'extra.invalid',redirect:null,redirectStatusCode:null,gitBranch:null,customEnvironmentId:null})],
 ['extra redirect project domain',(a,d)=>d.push({name:'extra.invalid',redirect:'legalease.com',redirectStatusCode:308,gitBranch:null,customEnvironmentId:null})],
 ['redirect target changed',(a,d)=>d.find(x=>x.redirect).redirect='elsewhere.invalid'],
 ['redirect status changed',(a,d)=>d.find(x=>x.redirect).redirectStatusCode=307],
 ['project domain removed',(a,d)=>d.pop()],
 ['redirect converted to direct',(a,d)=>Object.assign(d.find(x=>x.redirect),{redirect:null,redirectStatusCode:null})]
])test(`scope refuses ${name}`,()=>{const a=structuredClone(aliases),d=structuredClone(domains);edit(a,d);assert.throws(()=>assertVercelProductionScopes(a,d,authorization));});
test('authorization cannot collapse inventories into legacy productionAliases',()=>{assert.throws(()=>assertVercelProductionScopes(aliases,domains,{productionAliases:aliases}));assert.throws(()=>assertVercelProductionScopes(aliases,domains,{...authorization,productionAliases:aliases}));});
for(const [name,body]of [['pagination',{...inventory,pagination:{next:1}}],['branch',{domains:[{name:'legalease.com',gitBranch:'other'}]}],['custom environment',{domains:[{name:'legalease.com',customEnvironmentId:'env_other'}]}],['duplicate',{domains:[inventory.domains[0],inventory.domains[0]]}]])test(`inventory refuses ${name}`,()=>assert.throws(()=>productionProjectDomains(body)));
const root=new URL('../../',import.meta.url).pathname;
const prefix='hosted-acceptance-evidence/forward-production/refused-37476296905/';
const read=n=>JSON.parse(fs.readFileSync(root+prefix+n));
const docs={run:read('closure-run.json'),jobs:read('closure-jobs.json'),artifact:read('closure-artifact.json'),receipt:read('production-activation.json')};
const ref={runId:37476296905,workflowSourceSha:docs.run.head_sha,jobId:112312471148,artifactId:11419248711,finishedAt:docs.receipt.finishedAt,runPath:prefix+'closure-run.json',jobsPath:prefix+'closure-jobs.json',artifactPath:prefix+'closure-artifact.json',archivePath:prefix+'closure-native.zip',receiptPath:prefix+'production-activation.json',receiptSha256:createHash('sha256').update(fs.readFileSync(root+prefix+'production-activation.json')).digest('hex'),files:['closure-run.json','closure-jobs.json','closure-artifact.json','closure-native.zip','production-activation.json'].map(n=>{const b=fs.readFileSync(root+prefix+n);return {path:prefix+n,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};})};
const held={...Object.fromEntries(['applicationSha','workerSourceSha','workerDigest'].map(k=>[k,docs.receipt[k]])),workerInputFingerprint:'sha256:'+'d'.repeat(64),toolsSha:'e'.repeat(40),productionAuthorized:false,productionAuthorization:null,hostedAdmission:{schemaVersion:'rcap-readonly-successor-admission/v2',deploymentId:docs.receipt.stagedDeploymentId,productionRollback:docs.receipt.rollbackDeploymentId,runId:123456789,capturedAt:new Date(Date.now()-60000).toISOString(),...authorization}};
const owner={schemaVersion:'rcap-forward-owner-authorization/v2',authorized:true,recordedBy:'Roger Roman',recordedAt:new Date(Date.now()-30000).toISOString(),productionProjectRef:docs.receipt.productionProjectRef,...Object.fromEntries(['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','toolsSha'].map(k=>[k,held[k]])),stagedDeploymentId:held.hostedAdmission.deploymentId,rollbackDeploymentId:held.hostedAdmission.productionRollback,...authorization,refusedAttempt:ref,reason:replacementOwnerReason(),hostedRunId:held.hostedAdmission.runId,phases:FORWARD_PHASES,maxActivationAttempts:1,maxPublicVerificationAttempts:1,note:forwardOwnerNote(held)};
test('fresh separately scoped owner preserves native refused attempt and unchanged product identities',()=>{assertForwardOwner(owner,held);verifyRefusedForwardAttempt(root,ref,owner);assert.equal(docs.receipt.promotionAttempted,false);assert.equal(docs.receipt.passed,false);});
for(const [name,edit] of [['relabeled successful receipt',d=>d.receipt.passed=true],['relabeled successful run',d=>d.run.conclusion='success'],['promotion occurred',d=>d.receipt.promotionAttempted=true],['alias moved',d=>d.receipt.productionAliasChanged=true],['worker changed',d=>d.receipt.workerChanged=true],['application changed',d=>d.receipt.applicationChanged=true],['wrong job',d=>d.jobs.jobs=[]]])test(`refused attempt rejects ${name}`,()=>{const d=structuredClone(docs);edit(d);assert.throws(()=>assertRefusedAttemptDocuments(d,ref,owner));});
for(const key of ['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','toolsSha'])test(`separate scopes do not permit ${key} change`,()=>assert.throws(()=>assertForwardOwner({...owner,[key]:'wrong'},held)));
test('old single-scope approval and old owner timestamp cannot authorize replacement',()=>{assert.throws(()=>assertForwardOwner({...owner,schemaVersion:'rcap-forward-owner-authorization/v1',productionAliases:aliases},held));assert.throws(()=>assertForwardOwner({...owner,recordedAt:'2026-10-06T13:43:39.325Z'},held));});
