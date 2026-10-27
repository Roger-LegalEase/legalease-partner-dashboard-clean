import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {observeOrdinaryAdmin,ORIGIN} from './rcap-hosted-ordinary-admin-readonly.mjs';
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
assert.ok(process.env.ORDINARY_ADMIN_EVIDENCE_FILE);const evidenceFile=path.resolve(process.env.ORDINARY_ADMIN_EVIDENCE_FILE);const output=path.dirname(evidenceFile);assert.ok(!output.startsWith('/tmp/'),'checkpoint evidence must use existing carrier artifact workspace');
await fs.mkdir(output,{recursive:true,mode:0o700});
let checkpointCount=0;
const checkpoint=async data=>{assert.equal(++checkpointCount,1);const f=await fs.open(evidenceFile,'wx',0o600);try{await f.writeFile(JSON.stringify({schema:'rcap-ordinary-admin-readonly/v1',applicationSha:APP,deploymentId:DEPLOY,...data},null,2)+'\n');}finally{await f.close();}};
const {chromium}=createRequire(path.join(process.cwd(),'package.json'))('playwright');
await fs.access('/usr/bin/google-chrome'); // Existing runner browser only; no browser install/download.
let browser,context;
try{
 browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 context=await browser.newContext({serviceWorkers:'block',acceptDownloads:false});context.setDefaultTimeout(30000);context.setDefaultNavigationTimeout(45000);
 assert.equal(typeof context.routeWebSocket,'function');await context.routeWebSocket('**/*',ws=>ws.close());
 await observeOrdinaryAdmin({context,bypass:process.env.VERCEL_AUTOMATION_BYPASS_SECRET,admit:async expected=>{assert.equal(expected.applicationSha,APP);assert.equal(expected.origin,ORIGIN);assert.equal(expected.operation,'normal-admin-readonly');},checkpoint});
 console.log('Ordinary managed QA normal-admin read-only observation complete; sanitized state only.');
}catch{console.error('Ordinary normal-admin read-only attempt failed; reconcile sanitized checkpoint before another attempt.');process.exitCode=1;}
finally{if(context)await context.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});}
