#!/usr/bin/env node
/** Mutate only bounded recovery implementations, require a green baseline,
 * then prove the regression suite rejects each deliberately broken behavior.
 * Every original file is restored byte-for-byte even on failure.
 */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';import {fileURLToPath}from'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');process.chdir(root);
const run=()=>spawnSync(process.execPath,['scripts/rcap-packet-recovery/test-recovery.mjs','--unit'],{encoding:'utf8',maxBuffer:10*1024*1024});
const baseline=run();if(baseline.status!==0){console.error('BASELINE_FAILED: zero mutations attempted\n'+baseline.stdout+baseline.stderr);process.exit(1);}
const mutations=[
 ['D agreement bypass','scripts/rcap-packet-recovery/va-nonconviction-basis.mjs',"record.subsectionDAgreement !== 'established' || !nonempty(record.agreementEvidence)","!nonempty(record.agreementEvidence)"],
 ['other first-offender imported','scripts/rcap-packet-recovery/va-nonconviction-basis.mjs','if (record.deferredStatute != null) {','if (false) {'],
 ['future filing silently accepted','scripts/rcap-packet-recovery/va-nonconviction-basis.mjs','asOf >= VA_BASIS_POLICY.futureVersionStarts','false'],
 ['IFP included without election','scripts/rcap-packet-recovery/pa-790-recovery.mjs',"...(requestFeeWaiver?['ifp-ccp']:[])","...['ifp-ccp']"],
 ['optional order made mandatory','scripts/rcap-packet-recovery/pa-790-recovery.mjs',"...(includeProposedOrder?['rule-790-order']:[])","...['rule-790-order']"],
 ['recipient phone removed','scripts/rcap-packet-recovery/pa-790-recovery.mjs','Commonwealth attorney telephone number:','Commonwealth attorney contact:'],
 ['MA notice shortened','scripts/build-census-v1-ma-bmc-multi-set.mjs','at least 30 days before the final hearing','at least 15 days before the final hearing'],
];
let caught=0;const results=[];
for(const [name,file,needle,replacement]of mutations){
 const original=fs.readFileSync(file);const text=original.toString('utf8');assert.ok(text.includes(needle),`Mutation anchor absent: ${name}`);
 try{fs.writeFileSync(file,text.replace(needle,replacement));const test=run();assert.equal(test.error,undefined);const detected=test.status!==0&&test.stdout.includes('"failed"')&&(test.stdout+test.stderr).includes('FAIL ');results.push({name,detected});if(detected)caught++;else console.error('MUTATION_ESCAPED '+name+'\n'+test.stdout+test.stderr);}
 finally{fs.writeFileSync(file,original);assert.deepEqual(fs.readFileSync(file),original,`Restore failed: ${file}`);}
}
console.log(JSON.stringify({schemaVersion:'rcap-recovery-mutations/v1',baseline:'PASS',attempted:mutations.length,caught,results,originalFilesRestored:true},null,2));
if(caught!==mutations.length)process.exitCode=1;
