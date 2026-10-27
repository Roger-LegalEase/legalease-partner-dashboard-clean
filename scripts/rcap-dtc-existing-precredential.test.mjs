import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync,execFileSync} from 'node:child_process';
import {NO_PAY_RESULT_SHA,assertFrozenExistingNoPay,assertReadyExistingCheckout} from './rcap-dtc-existing-fulfillment.mjs';
assert(process.env.DTC_NO_PAY_EVIDENCE_FILE,'Existing immutable actual evidence fixture required');
const evidence=fs.readFileSync(process.env.DTC_NO_PAY_EVIDENCE_FILE),inspection=JSON.parse(evidence).inspection;
const before=execFileSync('git',['show','6991b50021fbe087ffd75c95a482b5d0ea15a85d:scripts/rcap-dtc-existing-session-no-pay-inspection.mjs'],{encoding:'utf8'});
const names=/const SAFE_NAMES=new Set\(\[.*?\]\);/.exec(before)[0];
const originalProjection=before.slice(before.indexOf('export function safeSubmitInspection(value)'),before.indexOf('\nfunction admit(')).replace('export function','function');
const project=Function('assert',names+'\n'+originalProjection+'\nreturn safeSubmitInspection;')(assert);
test('dependency-free copied projection preserves accepted names/types/booleans and strips private fields',()=>{
 const value=structuredClone(inspection);value.privateToken='PRIVATE_TOKEN';value.controls[0].privateValue='PRIVATE_VALUE';assert.deepEqual(assertReadyExistingCheckout(value),project(value));assert(!JSON.stringify(assertReadyExistingCheckout(value)).includes('PRIVATE_'));assertFrozenExistingNoPay(evidence,NO_PAY_RESULT_SHA);
});
for(const [name,mutate]of [['incomplete',v=>v.inspectionComplete=false],['disabled',v=>v.submitDisabled=true],['free',v=>v.pageTotalClassifiedFree=true],['unknown checkbox',v=>v.controls.push({name:'unrecognized_control',type:'checkbox',required:true,missing:false,invalid:false,checked:false,unknownRequiredCheckbox:true})],['missing required',v=>v.controls.find(c=>c.required).missing=true],['invalid required',v=>v.controls.find(c=>c.required).invalid=true],['unknown required',v=>v.controls.find(c=>c.required).name='private-field-name'],['bad type',v=>v.controls[0].type='PRIVATE_TYPE'],['bad boolean',v=>v.controls[0].missing='PRIVATE_VALUE']])test('strict precredential projection still refuses '+name,()=>{const value=structuredClone(inspection);mutate(value);assert.throws(()=>assertReadyExistingCheckout(value));});
test('actual helper imports and frozen source guard run without node_modules, network or browser package',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'b-dtc-precredential-nodeps-'));
 try{
  const dir=path.join(tmp,'scripts');fs.mkdirSync(dir);
  for(const file of ['rcap-dtc-existing-fulfillment.mjs','rcap-hosted-saved-dtc-contracts.mjs','rcap-dtc-existing-session-readonly.mjs','rcap-hosted-existing-dtc-continuation.mjs','rcap-hosted-response-contract.mjs'])fs.copyFileSync(new URL('./'+file,import.meta.url),path.join(dir,file));
  const script="globalThis.fetch=()=>{throw Error('Network forbidden')};const m=await import('./scripts/rcap-dtc-existing-fulfillment.mjs');await m.loadExistingNoPayEvidence();console.log('FROZEN_EVIDENCE_QUALIFIED_WITHOUT_PACKAGES');";
  const run=()=>spawnSync(process.execPath,['--input-type=module','-e',script],{cwd:tmp,encoding:'utf8',timeout:15000});
  const missing=run();assert.notEqual(missing.status,0);assert(missing.stderr.includes('ENOENT'));assert(!missing.stderr.includes('ERR_MODULE_NOT_FOUND'));
  fs.writeFileSync(path.join(dir,'dtc-existing-session-no-pay-result.json'),evidence);fs.writeFileSync(path.join(dir,'dtc-existing-session-no-pay-result.sha256'),NO_PAY_RESULT_SHA+'\n');
  const valid=run();assert.equal(valid.status,0,valid.stderr);assert.equal(valid.stdout.trim(),'FROZEN_EVIDENCE_QUALIFIED_WITHOUT_PACKAGES');assert(!fs.existsSync(path.join(tmp,'node_modules')));
  fs.appendFileSync(path.join(dir,'dtc-existing-session-no-pay-result.json'),' ');assert.notEqual(run().status,0);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
