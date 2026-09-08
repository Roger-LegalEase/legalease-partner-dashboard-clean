#!/usr/bin/env node
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {buildFamily,buildPacket,importFacts,ROOT,OUTPUT_DIR,FAMILY} from './rcap-packet-recovery/chat7/identity-theft.mjs';
import {auditFamily} from './rcap-packet-completeness/verify-packet-completeness.mjs';
export {buildFamily,buildPacket,importFacts};
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.slice(2).some(x=>x!=='--no-raster'))throw Error('This CLI performs a full build; only --no-raster is supported.');
 const result=await buildFamily();
 const proof=spawnSync(process.env.PYTHON??'python3',[path.join(ROOT,'scripts/rcap-packet-recovery/chat7/identity-theft-reports.py')],{cwd:ROOT,encoding:'utf8',timeout:180000});
 if(proof.status!==0)throw Error('BYTE_REPORT_FAILURE: '+proof.stdout+'\n'+proof.stderr);
 const a=auditFamily(OUTPUT_DIR,FAMILY);
 fs.writeFileSync(path.join(ROOT,OUTPUT_DIR,'reports/completeness.json'),JSON.stringify({...a,evidenceRole:'Author-executed existing shared verifier, not independent review or filing/production readiness'},null,2)+'\n');
 console.log(JSON.stringify({familyId:FAMILY,variants:result.variants.length,pages:result.variants.reduce((s,v)=>s+v.pages,0),nativeByteReport:JSON.parse(proof.stdout),centralResult:a.result,counters:a.counters,status:result.status},null,2));
 if(a.failedCounters?.length)process.exitCode=1;
}
