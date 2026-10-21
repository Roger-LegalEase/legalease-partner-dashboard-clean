import fs from 'node:fs';import assert from 'node:assert/strict';
import { composedArtifactReportBindings as parse } from './composed-artifact-report-bindings.mjs';
import { reconcileReleaseEvidence } from './reconcile-release-evidence.mjs';
const masterQueue=JSON.parse(fs.readFileSync('data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json'));
const registry=JSON.parse(fs.readFileSync('data/rcap-grade-a/fulfillment-authority-registry.json'));
const projection=JSON.parse(fs.readFileSync('data/rcap-grade-a/fulfillment-authority-projection.json'));
let count=0;
for(const familyId of ['wy_fel_1502-set','dc_innocence_expungement-set']) {
 const family=masterQueue.families.find(f=>f.familyId===familyId);const directory=family.directory;
 const report=JSON.parse(fs.readFileSync(`${directory}/reports/rendered-artifacts.json`));
 const input={familyId,directory,report,readBytes:p=>fs.readFileSync(p)};
 const parsed=parse(input);assert.equal(parsed.bytesVerified,true);assert.equal(parsed.packets.length,2);count++;
 for(const [name,mutate] of [
  ['wrong family',i=>i.familyId='sibling'],['wrong directory',i=>i.directory+='-sibling'],
  ['wrong report family',i=>i.report.familyId='sibling'],['missing report schema',i=>delete i.report.schemaVersion],
  ['missing fixture',i=>i.report.pdfs.pop()],['duplicate fixture',i=>i.report.pdfs[1]=i.report.pdfs[0]],
  ['changed manifest',i=>i.report.artifacts[0].pageManifest.pop()],
  ['sibling file',i=>{i.report.pdfs[0].file=i.report.artifacts[0].file=directory+'/fixtures/sibling.pdf';}],
  ['stale hash',i=>{i.report.pdfs[0].sha256=i.report.artifacts[0].sha256='0'.repeat(64);}],
  ['disagreeing arrays',i=>i.report.artifacts[0].sha256='0'.repeat(64)],
  ['missing bytes',i=>i.readBytes=()=>{throw Error('missing');}],
  ['changed bytes',i=>i.readBytes=p=>Buffer.concat([fs.readFileSync(p),Buffer.from('changed')])],
  ['ambiguous packets',i=>i.report.packets=[]]
 ]){const i={...input,report:structuredClone(report)};mutate(i);assert.deepEqual(parse(i).packets,[],name);count++;}
 const release=reconcileReleaseEvidence({masterQueue:{...masterQueue,families:[family]},registry,projection,launchGraph:{rows:[]},artifactBindings:{[familyId]:parsed}});
 assert.ok(release.families[0].routes.every(r=>r.dimensions.output_approval.status==='SATISFIED'));count++;
 assert.ok(release.families[0].routes.every(r=>r.dimensions.fulfillment_authority.status==='SATISFIED'));count++;
 const wrong=structuredClone(parsed);wrong.packets.forEach(p=>p.sha256='0'.repeat(64));
 const denied=reconcileReleaseEvidence({masterQueue:{...masterQueue,families:[family]},registry,projection,launchGraph:{rows:[]},artifactBindings:{[familyId]:wrong}});
 assert.ok(denied.families[0].routes.every(r=>r.dimensions.output_approval.status==='MISSING'&&r.dimensions.fulfillment_authority.status==='MISSING'));count++;
}
console.log(`${count} native WY/DC artifact adapter controls PASS; no files rendered or mutated.`);
