import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { conditionalFamilyScope, NC_SCOPE_PATH, NC_SUPPLEMENT } from './conditional-family-scope.mjs';
import { reconcileReleaseEvidence } from './reconcile-release-evidence.mjs';
import { applyNationalReleaseControl } from './apply-national-release-control.mjs';
const ownerScope=JSON.parse(fs.readFileSync(NC_SCOPE_PATH));
const masterQueue=JSON.parse(fs.readFileSync('data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json'));
test('bound optional supplement cannot consume a required slot or borrow core packet PASS',()=>{
 const before=JSON.stringify(masterQueue);
 const r=reconcileReleaseEvidence({masterQueue,ownerScope});
 const f=r.families.find(f=>f.familyId===NC_SUPPLEMENT);
 assert.equal(f.launchRequired,false);assert.equal(f.terminal,false);
 assert.equal(f.conditionalScope.packetComplete,false);
 assert.equal(r.counts.launchRequired,345);assert.equal(r.counts.terminal,345);
 assert.equal(r.counts.conditionalSupplemental,1);
 assert.ok(!r.gaps.some(g=>g.familyId===NC_SUPPLEMENT));
 assert.ok(r.supplementalGaps.some(g=>g.familyId===NC_SUPPLEMENT && g.dimension==='terminal_treatment'));
 const doc=applyNationalReleaseControl({lineage:{}},{families:r.families,releaseReconciliation:r},masterQueue);
 assert.equal(doc.packetFamilies.total,346);assert.equal(doc.packetFamilies.launchRequired,345);
 assert.equal(doc.packetFamilies.byDisposition.SOURCE_READY??0,0);
 assert.equal(doc.goHold.decision,'HOLD');assert.equal(JSON.stringify(masterQueue),before);
});
for(const [name,change] of [
 ['blocking supplement',d=>{d.supplement.blocksCoreExpunction=true;}],
 ['different route',d=>{d.supplement.routeKey+='-different';}],
 ['absent decision',d=>{d.status='DRAFT';}],
 ['invented completion',d=>{d.supplement.participantInstrumentOrAcceptanceProcedure='COMPLETE';}]
])test(`refuses ${name}`,()=>{const d=structuredClone(ownerScope);change(d);assert.throws(()=>conditionalFamilyScope(d,masterQueue.families));});
test('scope cannot conceal an actual core regression',()=>{
 const q=structuredClone(masterQueue);q.families.find(f=>f.familyId==='nc_146_dismissal_petition-set').state='SOURCE_READY';
 assert.throws(()=>conditionalFamilyScope(ownerScope,q.families));
});
test('no decision supplies no exclusion',()=>assert.equal(conditionalFamilyScope(null,masterQueue.families).size,0));
test('CI establishes corpus before convergence, exports binding, and stops on first failed generator',()=>{
 const w=fs.readFileSync('.github/workflows/rcap-source-conveyor-ready.yml','utf8');
 assert.ok(w.indexOf('id: corpus_environment')<w.indexOf('id: convergence'));
 assert.match(w,/requireMasterLibraryEnvironment/);assert.match(w,/>> "\$GITHUB_ENV"/);
 assert.match(w,/id: convergence\n        run: \|\n          set -euo pipefail/);
 assert.match(w,/secrets.SOURCE_CORPUS_READ_TOKEN/);
});
