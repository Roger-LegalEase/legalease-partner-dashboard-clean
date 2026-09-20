#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import ts from 'typescript';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const root = process.cwd();
const source = fs.readFileSync('src/lib/rcap/documents/guidance-packet-registry.ts','utf8');
const helper = source.match(/function componentEvidenceExists\(relativePath: string\): boolean \{[\s\S]*?\n\}/)?.[0];
assert.ok(helper, 'exercise the actual bounded reader');
let missing;
const exists = vm.runInNewContext(ts.transpileModule(helper,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+'; componentEvidenceExists', {
  fs:{existsSync:p => p !== missing && fs.existsSync(p)}, path, process:{cwd:()=>root}
});
const refs = new Set();
// Only component deferral treatments use this evidence reader.
function* treatments(dir) {
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())yield* treatments(p);else if(e.name==='deferral-treatment.json')yield p;}
}
for (const p of treatments('data/rcap-all50/composed-routes')) {
 const v=JSON.parse(fs.readFileSync(p,'utf8'));
 function visit(x){if(!x||typeof x!=='object')return;if(Array.isArray(x.evidence))for(const e of x.evidence)if(e?.path)refs.add(e.path);for(const y of Object.values(x))visit(y)} visit(v);
}
assert.ok(refs.size > 0,'current evidence references must be enumerated');
for(const ref of refs){assert.equal(exists(ref),true,ref);missing=path.join(root,ref);assert.equal(exists(ref),false,`missing original evidence refuses: ${ref}`);missing=undefined;}
for(const p of ['package.json','data/rcap-all50/composed-routes/../review-artifacts/c-dependency-correction-assignment.json','data/rcap-all50/composed-routes/../../package.json','data/rcap-all50/composed-routes//route.json','/etc/passwd','data/rcap-all50/composed-routes/..\\package.json']) assert.equal(exists(p),false,p);
const {loadMsPaidConsumerSuccessor,MS_PAID_SUCCESSOR_DECISION_PATH:decisionPath,MS_PAID_SUCCESSOR_PRIOR_DECISION_PATH:priorDecisionPath}=await import('../src/lib/rcap/fulfillment/paid-consumer-successor.ts');
const approval=JSON.parse(fs.readFileSync(decisionPath));
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-original-evidence-'));
try {
 // The successor closure is the decision, the decision it supersedes, the
 // preserved evidence and the approved bytes themselves; the loader reads all
 // of it and every part must be present for it to admit anything.
 for(const rel of [decisionPath,priorDecisionPath,...approval.preservedEvidence.map(e=>e.path),...approval.approvedArtifacts.map(a=>a.path)]){fs.mkdirSync(path.dirname(path.join(scratch,rel)),{recursive:true});fs.copyFileSync(rel,path.join(scratch,rel));}
 assert.deepEqual(loadMsPaidConsumerSuccessor(scratch),loadMsPaidConsumerSuccessor(root));
 assert.ok(loadMsPaidConsumerSuccessor(scratch));
 for(const e of [...approval.preservedEvidence,...approval.approvedArtifacts]){const p=path.join(scratch,e.path),b=fs.readFileSync(p);fs.appendFileSync(p,'\n');assert.equal(loadMsPaidConsumerSuccessor(scratch),null,'original-byte digest must refuse '+e.path);fs.unlinkSync(p);assert.equal(loadMsPaidConsumerSuccessor(scratch),null,'missing evidence must refuse '+e.path);fs.writeFileSync(p,b);}
} finally {fs.rmSync(scratch,{recursive:true,force:true});}
console.log(`PASS: ${refs.size} original component evidence references; missing evidence and traversal refusal; ${approval.preservedEvidence.length + approval.approvedArtifacts.length} MS evidence and approved-artifact byte hash and presence checks.`);
