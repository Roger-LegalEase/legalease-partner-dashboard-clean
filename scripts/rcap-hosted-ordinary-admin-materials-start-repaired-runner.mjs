import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {materialsStartRepaired,ORIGIN,qualifyConfigureReceipt} from './rcap-hosted-ordinary-admin-materials-start-repaired-caller.mjs';
import {admitOrdinaryRepair,qualifyPost404404} from './rcap-hosted-ordinary-repair-admission.mjs';
const args=process.argv.slice(2);assert(args.length===0||(args.length===1&&args[0]==='--verify'));
const APP='c0052e13d9801d24080275aab02c70c6ea213fa3';
const binding=JSON.parse(await fs.readFile('scripts/ordinary-repair-native-binding.json'));
const repairTarget=admitOrdinaryRepair({binding,creatorBytes:await fs.readFile(process.env.RCAP_ADMIN_ORIGINAL_NATIVE_FILE),repairBytes:await fs.readFile(process.env.RCAP_ADMIN_REPAIR_NATIVE_FILE),repairRun:JSON.parse(await fs.readFile(process.env.RCAP_ADMIN_REPAIR_RUN_FILE))});
const DEPLOY=repairTarget.deploymentId;
const poststateSummary=JSON.parse(await fs.readFile('scripts/ordinary-post404404-summary.json'));
const retainedFiles={result:['result.json','fe9007b61fd08de6c96b3473964d918a47acfd23e3895557af5804829cc775d6'],allocationBefore:['allocation-before.json','adcdb5aa0869f136082fc52c6cee27f7598d12783e933e21c5d84c28ff10493a'],allocationResponse:['allocation-response.json','c25261920aec7b648a2716a23548fa964feb7e46c690a9f50a3eaaae9fa9cecd'],allocationState:['allocation-state.json','f367a781043e31568168d0d4c869cfb28329dfd9f52ee5ddea258dcafb790b90']};
const configureReceipts={};for(const[key,[name,hash]]of Object.entries(retainedFiles)){const bytes=await fs.readFile(path.join(process.env.RCAP_ADMIN_CONFIGURE_RECEIPT_DIR,name));assert.equal(createHash('sha256').update(bytes).digest('hex'),hash);configureReceipts[key]=JSON.parse(bytes);}qualifyConfigureReceipt(configureReceipts);
const failedFiles={before:['materials_prepare-before.json','f3225d20d40138f22c325d8431e3fc4a84f80865dab215d0c8c4ac4b74fd02c6'],response:['materials_prepare-response.json','03752cab7f3a35a0639a8054d243a1c2f975c6b1b08c737cfa2a890292ace1fa'],result:['result.json','a8377f7b1e6b301ee3afd9de6fe81017d760a0db4561b440d355b4d195cbb38e']};const failedPrepareReceipts={};for(const[key,[name,digest]]of Object.entries(failedFiles)){const raw=await fs.readFile(path.join(process.env.RCAP_ADMIN_FAILED_PREPARE_RECEIPT_DIR,name));assert.equal(createHash('sha256').update(raw).digest('hex'),digest);failedPrepareReceipts[key]=JSON.parse(raw);}
qualifyPost404404(poststateSummary,failedPrepareReceipts);
if(args[0]==='--verify'){console.log('Actual repaired native/source and retained operation history verified; zero browser/Auth/SQL/customer operations.');}else{
assert.ok(process.env.ORDINARY_ADMIN_EVIDENCE_FILE);const evidenceFile=path.resolve(process.env.ORDINARY_ADMIN_EVIDENCE_FILE);const output=path.dirname(evidenceFile);assert.ok(!output.startsWith('/tmp/'),'checkpoint evidence must use existing carrier artifact workspace');
await fs.mkdir(output,{recursive:true,mode:0o700});
const written=new Set();const allow=new Set(['initial.json','materials_prepare-before.json','materials_prepare-response.json','materials_prepare-state.json','material-review.json','start-before.json','start-response.json','start-state.json','result.json']);
const checkpoint=async(name,data)=>{assert.ok(allow.has(name));assert.ok(!written.has(name));written.add(name);const f=await fs.open(path.join(output,name),'wx',0o600);try{await f.writeFile(JSON.stringify({schema:'rcap-ordinary-materials-start/v1',applicationSha:APP,deploymentId:DEPLOY,...data},null,2)+'\n');}finally{await f.close();}};
const {chromium}=createRequire(path.join(process.cwd(),'package.json'))('playwright');
await fs.access('/usr/bin/google-chrome'); // Existing runner browser only; no browser install/download.
let browser,context;
try{
 browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 context=await browser.newContext({serviceWorkers:'block',acceptDownloads:false});context.setDefaultTimeout(30000);context.setDefaultNavigationTimeout(45000);
 assert.equal(typeof context.routeWebSocket,'function');await context.routeWebSocket('**/*',ws=>ws.close());
 await materialsStartRepaired({context,configureReceipts,repairTarget,poststateSummary,failedPrepareReceipts,bypass:process.env.VERCEL_AUTOMATION_BYPASS_SECRET,admit:async expected=>{assert.equal(expected.applicationSha,APP);assert.equal(expected.origin,ORIGIN);assert.equal(expected.operation,'normal-admin-materials-start-post-repair');assert.equal(expected.repairDeploymentId,DEPLOY);assert.equal(expected.repairNativeSha256,binding.repairNativeSha256);assert.equal(expected.configureRun,'40438747490');},checkpoint});
 console.log('Ordinary managed QA materials/Start stopped at its bounded checkpoint; inspect typed state.');
}catch{console.error('Ordinary materials/Start attempt stopped; reconcile persisted exact requests before continuation.');process.exitCode=1;}
finally{if(context)await context.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});}

}
