import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {configureCapacity,ORIGIN,qualifyProvisionReceipt} from './rcap-hosted-ordinary-admin-configure-capacity.mjs';
const APP='c0052e13d9801d24080275aab02c70c6ea213fa3';
const DEPLOY='dpl_7dmD2g1xZccLiTbkJL9Xp3wCrWyF';
const DIGEST='sha256:cd0d3ab9098ed47028d5d89ae5280904520f28bc7331fc9ca17b2a2978a3f494';
// F's existing carrier downloads the original accepted native artifact, never creates a Preview.
const nativeBytes=await fs.readFile(process.env.RCAP_ADMIN_NATIVE_DEPLOY_FILE);
assert.equal(createHash('sha256').update(nativeBytes).digest('hex'),'76e5b1baaf13de456482194956deedaff8f6468abef6ff0a90fe615a4c451711');
const native=JSON.parse(nativeBytes),m=native.deployment?.metadata;
assert.equal(native.passed,true);assert.equal(native.deployment.id,DEPLOY);assert.equal(native.applicationSha,APP);assert.equal(native.deployment.gitSourceSha,APP);
assert.equal(native.acceptanceProjectRef,'hyflxnlhpmiqxvvcoiia');assert.equal(native.neverPassedProdFlag,true);assert.equal(native.neverWroteProjectLevelEnv,true);assert.deepEqual(native.productionBefore,native.productionAfter);assert.equal(native.deployment.readyState,'READY');assert.equal(native.deployment.target,null);
assert.equal(m.rcapPreviewPurpose,'managed_start');assert.equal(m.rcapReturnOrigin,ORIGIN);assert.equal(m.rcapApplicationSha,APP);assert.equal(m.rcapAcceptanceProjectRef,'hyflxnlhpmiqxvvcoiia');assert.equal(m.rcapStripeConfigured,'false');assert.equal(m.rcapClinicDemoMode,'none');assert.equal(m.rcapWorkerSourceSha,'32499751569359315248c2048fa111064a47c67f');assert.equal(m.rcapWorkerDigest,DIGEST);
const provisionBytes=await fs.readFile(process.env.RCAP_ADMIN_PROVISION_RESULT_FILE);assert.equal(createHash('sha256').update(provisionBytes).digest('hex'),'a69afa9948a75ed94b7bab969f2c6c9c63e1fc4b822c26ecccf733b692c9019c');const provisionResult=JSON.parse(provisionBytes);qualifyProvisionReceipt(provisionResult);
assert.ok(process.env.ORDINARY_ADMIN_EVIDENCE_FILE);const evidenceFile=path.resolve(process.env.ORDINARY_ADMIN_EVIDENCE_FILE);const output=path.dirname(evidenceFile);assert.ok(!output.startsWith('/tmp/'),'checkpoint evidence must use existing carrier artifact workspace');
await fs.mkdir(output,{recursive:true,mode:0o700});
const written=new Set();const allow=new Set(['initial.json','configuration_save-before.json','configuration_save-response.json','configuration_save-state.json','allocation-before.json','allocation-response.json','allocation-state.json','result.json']);
const checkpoint=async(name,data)=>{assert.ok(allow.has(name));assert.ok(!written.has(name));written.add(name);const f=await fs.open(path.join(output,name),'wx',0o600);try{await f.writeFile(JSON.stringify({schema:'rcap-ordinary-configure-capacity/v1',applicationSha:APP,deploymentId:DEPLOY,...data},null,2)+'\n');}finally{await f.close();}};
const {chromium}=createRequire(path.join(process.cwd(),'package.json'))('playwright');
await fs.access('/usr/bin/google-chrome'); // Existing runner browser only; no browser install/download.
let browser,context;
try{
 browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 context=await browser.newContext({serviceWorkers:'block',acceptDownloads:false});context.setDefaultTimeout(30000);context.setDefaultNavigationTimeout(45000);
 assert.equal(typeof context.routeWebSocket,'function');await context.routeWebSocket('**/*',ws=>ws.close());
 await configureCapacity({context,provisionResult,bypass:process.env.VERCEL_AUTOMATION_BYPASS_SECRET,admit:async expected=>{assert.equal(expected.applicationSha,APP);assert.equal(expected.origin,ORIGIN);assert.equal(expected.operation,'normal-admin-configure-capacity');assert.equal(expected.provisionRun,'40433891473');},checkpoint});
 console.log('Ordinary managed QA Configure/capacity invocation stopped at its bounded checkpoint; inspect typed state.');
}catch{console.error('Ordinary Configure/capacity attempt stopped; reconcile persisted exact requests before continuation.');process.exitCode=1;}
finally{if(context)await context.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});}
