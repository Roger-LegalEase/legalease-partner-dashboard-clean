import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {resolveObservation,resetObservationCache}=await import('../src/lib/rcap/fulfillment/grade-a-admission.ts');
const root=process.cwd(),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'publication-admission-'));
const publication='data/rcap-render/worker-publication-evidence.json',observations='data/rcap-grade-a/fulfillment-observation-snapshot.json';
const route='MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal';
const original=fs.readFileSync(publication), snapshot=fs.readFileSync(observations);
try {
 for(const [file,bytes] of [[publication,original],[observations,snapshot]]) {fs.mkdirSync(path.dirname(path.join(tmp,file)),{recursive:true});fs.writeFileSync(path.join(tmp,file),bytes);}
 process.chdir(tmp);
 const check=()=>{resetObservationCache();return resolveObservation(route);};
 assert(check(),'current native publication binding resolves');
 fs.renameSync(publication,publication+'.held'); assert.equal(check(),null,'missing publication refuses');fs.renameSync(publication+'.held',publication);
 for(const patch of [{workflowConclusion:'failure'},{sourceSha:'0'.repeat(40)},{immutableRegistryDigest:'sha256:'+'0'.repeat(64)},{imageAcceptance:{workflowConclusion:'invented'}}]) {
  fs.writeFileSync(publication,JSON.stringify({...JSON.parse(original),...patch}));assert.equal(check(),null,'changed publication receipt refuses');
 }
 fs.writeFileSync(publication,original);assert(check());console.log('Publication admission: current proof passes; missing, failed, wrong-source, wrong-digest and changed receipt all refuse (7/7).');
} finally {process.chdir(root);resetObservationCache();fs.rmSync(tmp,{recursive:true,force:true});}
