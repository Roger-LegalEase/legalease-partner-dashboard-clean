import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {assessDeReviewedGuidance,additiveOtherFamilyRegistry} from './de-reviewed-guidance.mjs';
import {acceptedRasterFor,candidateRowsByFamily} from './acceptance-identity.mjs';
const root=process.cwd(), read=p=>fs.readFileSync(p), json=p=>JSON.parse(read(p));
const family='de_mandatory_expungement-set';
const dir='data/rcap-all50/overlays/census-v1/de/de-mandatory-expungement-set--official-pdf-fill';
const registry='data/rcap-grade-a/source-wave-integration/CAPTAIN_SOURCE_IDENTITY_DETERMINATIONS.json';
const returned=json('data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json').rows.find(r=>r.familyId===family&&!r.superseded);
const baseline=assessDeReviewedGuidance(root,returned);
assert.equal(baseline.eligible,true,baseline.reason);
assert.equal(baseline.terminalTreatment,'GUIDANCE_READY');
assert.equal(baseline.sourceChecks.length,9);
assert.equal(baseline.outputs.length,2);
for(const k of ['runtimeInstalled','filingPermitted','paymentEligible','sponsorshipEligible','reviewAuthoredByIntegrator','packetBytesChanged'])assert.equal(baseline[k],false);
let positives=1,negatives=0;
const identityFiles=Object.fromEntries([...baseline.outputs.map(x=>x.file),...baseline.sourceChecks.map(x=>x.path),returned.evidencePath].map(p=>[p,crypto.createHash('sha256').update(read(p)).digest('hex')]));
const deny=(name,overrides={},r=returned)=>{const x=assessDeReviewedGuidance(root,r,overrides);assert.notEqual(x?.eligible,true,name);negatives++;};
const altered=(p,modify)=>({readBytes:q=>q===p?Buffer.from(modify(read(q))):read(q)});
const changeJson=(p,modify)=>altered(p,b=>{const d=JSON.parse(b);modify(d);return JSON.stringify(d);});
for(const p of [`${dir}/fixtures/canonical.pdf`,`${dir}/fixtures/boundary.pdf`,`${dir}/production-field-map.json`,`${dir}/reports/actual-writes.json`,`${dir}/reports/blanks-left-for-the-participant.json`,`${dir}/participant-instructions.md`,`${dir}/source-receipt.json`,`${dir}/reports/rendered-artifacts.json`,baseline.sourceChecks[0].path,baseline.sourceChecks[1].path,baseline.sourceChecks[2].path,baseline.sourceChecks[4].path])deny('changed bound input '+p,altered(p,b=>Buffer.concat([b,Buffer.from('changed')])));
deny('wrong evidence path',{}, {...returned,evidencePath:'invented.json'});
deny('wrong evidence hash',{}, {...returned,evidenceSha256:'0'.repeat(64)});
deny('different review base',{}, {...returned,verifiedAtBase:'0'.repeat(40)});
for(const [name,mutate] of [
 ['application instead of guide',d=>d.binding.deliveryType='agency_application'],
 ['filing permitted',d=>d.binding.filingPermitted=true],
 ['court role',d=>d.proposedRepresentation.components[0].role='primary_filing'],
 ['installed',d=>d.status='INSTALLED'],['payment',d=>d.binding.paymentEligible=true],
 ['sponsorship',d=>d.binding.sponsorshipEligible=true],['generation',d=>d.currentState.generationAllowed=true],
 ['authority',d=>d.authorityCreated='granted'],['stale fixture',d=>d.proposedRepresentation.fixtureBindings[1].sha256='0'.repeat(64)],
])deny(name,changeJson(`${dir}/product-wiring.json`,mutate));
deny('unknown family routes',{currentFamily:{familyId:family,directory:dir,routeKeys:['other']}});
deny('historical registry mismatch',{readHistorical:()=>Buffer.from('{}')});
const rq=json('data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json');
const ev=acceptedRasterFor(root,candidateRowsByFamily(rq).get(family),{requireReceiptDeclaredCoverage:true});
for(const [name,mutate] of [
 ['no pass',d=>d.proven=false],['partial coverage',d=>d.row.rasterReceipt.coversTheWholeFamily=false],
 ['missing output',d=>d.documents.pop()],['wrong page total',d=>d.row.rasterReceipt.pagesMeasured=3],
 ['wrong run',d=>d.row.rasterReceipt.workflowRunId='1'],['wrong artifact',d=>d.row.rasterReceipt.receiptArtifact.id='1'],
 ['wrong ZIP',d=>d.row.rasterReceipt.receiptArtifact.zipSha256='0'.repeat(64)],
 ['unmatched PDF',d=>d.documents[0].actual='0'.repeat(64)]
]){const d=structuredClone(ev);mutate(d);deny(name,{rasterEvaluation:d});}
const old=execFileSync('git',['show',`c6af0d84134216c5d0757e5543ccf3fcaa42f19c:${registry}`]);
const now=read(registry);const result=additiveOtherFamilyRegistry(old,now,family);
assert.deepEqual(result.appendedFamilyIds,['nc_146_dismissal_petition-set']);assert.equal(result.unchangedPriorFamilyEntries,73);positives++;
for(const mutate of [
 d=>d.reconciliation42.families[0].decision='changed',
 d=>d.reconciliation42.families.splice(0,1),
 d=>d.reconciliation42.families.reverse(),
 d=>d.reconciliation42.families.at(-1).familyId=family,
 d=>d.reconciliation42.acquisitionEvidencePaths.push('unrelated-evidence'),
 d=>d.unreviewedNewTopLevel='changed'
]){const d=JSON.parse(now);mutate(d);assert.throws(()=>additiveOtherFamilyRegistry(old,Buffer.from(JSON.stringify(d)),family));negatives++;}
assert.equal(assessDeReviewedGuidance(root,{familyId:'other',verdict:'PASS_COMPLETE_INDEPENDENT'}),null);positives++;
assert.equal(assessDeReviewedGuidance(root,{...returned,verdict:'FAIL_REPAIR_REQUIRED'}),null);positives++;
for(const [p,h]of Object.entries(identityFiles))assert.equal(crypto.createHash('sha256').update(read(p)).digest('hex'),h);
console.log(JSON.stringify({suite:'de-reviewed-guidance-admission',positiveCases:positives,rejectionControls:negatives,currentWholePdfsRehashed:2,reviewedPagesBoundToAdmittedReceipt:6,compositionSourcesChecked:9,unchangedPriorRegistryEntries:73,inputsUnchanged:true,newIndependentReview:false,packetRebuilds:0},null,2));
