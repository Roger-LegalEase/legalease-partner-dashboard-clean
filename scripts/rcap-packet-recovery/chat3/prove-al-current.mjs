#!/usr/bin/env node
/** Two full CLI builds, all-family-byte comparison and actual Node regressions. */
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import{spawnSync}from'node:child_process';import{fileURLToPath}from'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const families=['al-felony-dwop-set','al-felony-nonconviction-90-set'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);
const snap=()=>Object.fromEntries(families.flatMap(f=>walk(path.join(root,`data/rcap-all50/overlays/census-v1/al/${f}--official-pdf-fill`))).sort().map(p=>[path.relative(root,p),{sha256:sha(fs.readFileSync(p)),bytes:fs.statSync(p).size}]));
const evidence=path.resolve(process.env.AL_CURRENT_EVIDENCE_DIR??path.join(root,'data/rcap-grade-a/chat-parallel-2026-09-07/build/al-four-current/evidence'));fs.mkdirSync(evidence,{recursive:true});
const results=[];
function run(script,label){const r=spawnSync(process.execPath,[script],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});fs.writeFileSync(path.join(evidence,label+'.log'),r.stdout+'\n'+r.stderr);results.push({command:`node ${script}`,exitCode:r.status,log:label+'.log'});assert.equal(r.status,0,`${label}: ${r.stderr}`);}
const sources=['scripts/lib/corpus-index-paths.mjs','data/rcap-all50/local-source-corpus-index.json','data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json','package-lock.json'];
const inputHashes=Object.fromEntries(sources.map(p=>[p,sha(fs.readFileSync(path.join(root,p)))]));
for(const f of families)run(`scripts/build-census-v1-${f}.mjs`,f+'-pass1');const a=snap();
for(const f of families)run(`scripts/build-census-v1-${f}.mjs`,f+'-pass2');const b=snap();assert.deepEqual(b,a,'NONDETERMINISTIC_COMPLETE_FAMILY_FILES');
for(const t of ['test-al-current-complete.mjs','test-al-completion.mjs','test-al-ssn-complete.mjs'])run('scripts/rcap-packet-recovery/chat3/'+t,t);
assert.deepEqual(snap(),b,'TEST_CHANGED_FAMILY_BYTES');
const sourceHashesAfter=Object.fromEntries(sources.map(p=>[p,sha(fs.readFileSync(path.join(root,p)))]));assert.deepEqual(sourceHashesAfter,inputHashes);
const result={fullRendererRuns:4,rendererPassesPerFamily:2,commands:results,allFilesCompared:Object.keys(b).length,filesPerFamily:Object.fromEntries(families.map(f=>[f,Object.keys(b).filter(p=>p.includes('/'+f+'--')).length])),wholeFileManifest:b,inputHashes,nodeVersion:process.version,allGeneratedFilesEqual:true,readOnlyInputsUnchanged:true,testsPreservedOutputs:true,independentApproval:false};
fs.writeFileSync(path.join(evidence,'deterministic-builds.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({fullRendererRuns:4,allFilesCompared:Object.keys(b).length,filesPerFamily:result.filesPerFamily,allGeneratedFilesEqual:true,commands:results.map(({command,exitCode})=>({command,exitCode}))},null,2));
