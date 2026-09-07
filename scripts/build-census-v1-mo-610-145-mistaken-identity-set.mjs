#!/usr/bin/env node
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {buildFamily,buildPacket,importFacts,ROOT,OUTPUT_DIR} from './rcap-packet-recovery/chat7/mistaken-identity.mjs';
import {auditFamily} from './rcap-packet-completeness/verify-packet-completeness.mjs';
export {buildFamily,buildPacket,importFacts};
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.some(x=>x!=='--no-raster'))throw Error('This CLI always performs a FULL build; optional --no-raster preserves separate central admission.');
 const result=await buildFamily();
 const measured=spawnSync(process.env.PYTHON??'python3',[path.join(ROOT,'scripts/rcap-packet-recovery/chat7/mistaken-identity-reports.py')],{cwd:ROOT,encoding:'utf8',timeout:180000});
 if(measured.status!==0)throw Error('Actual-byte report failed: '+measured.stdout+'\n'+measured.stderr);
 const audit=auditFamily(OUTPUT_DIR,result.familyId);
 fs.writeFileSync(path.join(ROOT,OUTPUT_DIR,'reports/completeness.json'),JSON.stringify({...audit,evidenceRole:'Measured author QA from the unmodified central verifier; NOT independent review, raster admission or production approval'},null,2)+'\n');
 console.log(JSON.stringify({familyId:result.familyId,variants:result.variants.length,pages:result.variants.reduce((n,x)=>n+x.pages,0),status:result.status,rasterAdmission:result.rasterAdmission,counters:audit.counters,centralVerifierResult:audit.result},null,2));
 if(audit.failedCounters?.length)process.exitCode=1;
}
