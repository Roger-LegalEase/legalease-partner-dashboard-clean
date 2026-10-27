import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {admit,main,PINS,loadRecoveryView} from './rcap-hosted-existing-dtc-readonly-runner.mjs';
async function entry(){
const sha=x=>createHash('sha256').update(x).digest('hex');
const binding=JSON.parse(await fs.readFile('scripts/dtc-readonly-native-binding.json'));
// Unresolved native pins deliberately stop this prepared lane before any secret or remote read.
assert(Number.isSafeInteger(binding.recoveryArtifactId)&&binding.recoveryArtifactId>0);assert.match(binding.recoverySha256??'',/^[a-f0-9]{64}$/);
const evidenceFile=path.resolve('dtc-saved-readonly-evidence/result.json');await fs.mkdir(path.dirname(evidenceFile),{mode:0o700});

const inventory=path.resolve('scripts/dtc-local-prior-receipt-inventory.json');
const config={creationRun:PINS.creationRun,toolsSha:PINS.tools,controllerSha:PINS.controller,origin:binding.origin,deploymentId:binding.deploymentId,recoveryBinding:binding,creatorNativeFile:process.env.DTC_CREATOR_NATIVE_FILE,creatorRunFile:process.env.DTC_CREATOR_RUN_FILE,recoveryFile:process.env.DTC_RECOVERY_FILE,recoveryRunFile:process.env.DTC_RECOVERY_RUN_FILE,savedCaseSha256:JSON.parse(await fs.readFile('scripts/dtc-local-prior-receipt-inventory.json')).savedCaseSha256,priorReceiptInventoryFile:inventory,priorReceiptInventorySha256:sha(await fs.readFile(inventory)),evidenceFile};
const native=await loadRecoveryView(config);admit(config,native);
const input=JSON.parse(process.env.DISPATCH_INPUTS);assert.equal(sha(input.resume_matter_id??''),config.savedCaseSha256);
// Parse two literal values only. Never import or execute the historical full payment harness.
const blob=execFileSync('git',['show','4feb8e94b3dee4085fe05ea75d78853fe21e5097:scripts/rcap-hosted-acceptance-payment.mjs'],{stdio:['ignore','pipe','ignore']});
assert.equal(sha(blob),'2f1cb63c403c33b1cf8e7ac737c4ee1bdc79b8703ee338faa2db8d36a841fa12');
const source=blob.toString();const line=source.split('\n').find(l=>l.startsWith('const A = await signIn(CAP_INPUT?.email ?? '));assert(line);
const match=line.match(/^const A = await signIn\(CAP_INPUT\?\.email \?\? "([^"\r\n]+)", CAP_INPUT \? process\.env\.HOSTED_CLINIC_DEMO_PASSWORD : "([^"\r\n]+)"\);$/);assert(match,'frozen literal-only normal account reader');
assert(match[1].endsWith('@rcap-acceptance.test'));process.env.DTC_OWNER_EMAIL=match[1];process.env.DTC_OWNER_PASSWORD=match[2];
assert(process.env.SUPABASE_ACCESS_TOKEN?.trim());
const response=await fetch('https://api.supabase.com/v1/projects/hyflxnlhpmiqxvvcoiia/api-keys',{headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`},redirect:'error',signal:AbortSignal.timeout(15000)});assert.equal(response.status,200);
const keys=await response.json();assert(Array.isArray(keys));const anon=keys.filter(k=>k.name==='anon');assert.equal(anon.length,1);assert(anon[0].api_key);process.env.SUPABASE_ANON_KEY=anon[0].api_key;
const configFile=path.join(process.env.RUNNER_TEMP,'dtc-readonly-config.private.json');await fs.writeFile(configFile,JSON.stringify(config),{flag:'wx',mode:0o600});
await main([configFile]);console.log('Saved DTC read-only reconciliation finished; sanitized checkpoint only.');

}
entry().catch(()=>{console.error('Saved DTC read-only source/admission/observation held; preserve typed checkpoint if present.');process.exitCode=1;});
