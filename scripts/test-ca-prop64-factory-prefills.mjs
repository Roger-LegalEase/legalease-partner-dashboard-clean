import assert from 'node:assert/strict';
import fs from 'node:fs';
import { caProp64CompletionMetadataForReview, caProp64CompletionInstructionsForReview } from './build-census-v1-az_marijuana_expungement_arrest_no_charges-set.mjs';
import { caProp64ActorInventoryProblems } from './rcap-packet-completeness/ca-prop64-source-actors.mjs';
import { caProp64RefusalDisposition } from './lib/ca-prop64-form-ownership.mjs';
const dir='data/rcap-all50/overlays/census-v1/ca/ca-prop64-set--official-pdf-fill';
const census=JSON.parse(fs.readFileSync(`${dir}/field-census.census-v1.json`));
const before=JSON.stringify(census);
const {fieldMap:map}=caProp64CompletionMetadataForReview(census);
assert.equal(JSON.stringify(census),before,'held census input remains unchanged');
assert.equal(map.writes.length,32,'reuse all held filer and neutral case captions across three forms');
for(const form of ['CR-400','CR-401','CR-403']) {
  const writes=map.writes.filter(r=>r.formNumber===form);
  for(const suffix of ['Name','Street','City','State','Zip','Phone','Email']) assert.ok(writes.some(r=>r.fieldName.includes(`.AttyPartyInfo[0].${suffix}[0]`)),`${form}: held filer ${suffix}`);
  assert.ok(writes.some(r=>r.factId==='matter.county'));
  assert.ok(writes.some(r=>r.factId==='matter.case_number'));
  assert.ok(writes.some(r=>r.factId==='participant.full_legal_name'&&!r.fieldName.includes('AttyPartyInfo')));
}
assert.ok(map.writes.some(r=>r.fieldName.includes('Page2[0].P2Header_sf[0].CaseNumber1[0]')));
assert.ok(map.writes.every(r=>!(/CrtUse|SigBlock|LI[1-9]|Timeserved|CrtStreet|CrtMailingAdd|CrtCityZip/.test(r.fieldName))),'no unknown court addresses, service acts, signatures or decisions filled');
const missing=map.refusals.filter(r=>/CrtStreet|CrtMailingAdd|CrtCityZip/.test(r.fieldName));
assert.equal(missing.length,9);
assert.ok(missing.every(r=>r.requiredBeforeFiling&&r.reason.includes('Superior Court in the county of conviction')));
const sections=map.refusals.filter(r=>r.completionStage==='record_section_selection');
assert.equal(sections.length,5);
assert.ok(sections.every(r=>r.requiredBeforeFiling&&r.determinedByTheCaseNotTheRoute&&r.whyTheRouteCannotDetermineIt.includes('hold no conviction-section answer')));
assert.equal(map.selections.length,4,'original branch selections preserved');
assert.ok(map.refusals.filter(r=>r.completionStage==='explicit_optional_election').every(r=>!r.requiredBeforeFiling),'no required optional waiver');
const lawyer=map.refusals.filter(r=>r.completionActor==='attorney');
assert.equal(lawyer.length,9);
assert.ok(lawyer.every(r=>r.completenessDisposition==='NOT_APPLICABLE_ON_THIS_ROUTE'&&r.routeConditionThatMakesItInapplicable.includes('self-represented')));
for (const row of lawyer) {
  const field = census.documents.find(d=>d.formNumber===row.formNumber).fields.find(f=>f.name===row.fieldName);
  for (const filerRepresentation of [undefined, 'attorney']) {
    const disposition = caProp64RefusalDisposition(field, {familyId: map.familyId, formNumber: row.formNumber, filerRepresentation});
    assert.equal(disposition.blankTreatment, null, 'unknown or represented filer cannot use self-represented inapplicability');
  }
}
const all=[...map.writes,...map.selections,...map.refusals];
assert.equal(all.length,152);assert.equal(new Set(all.map(r=>r.fieldName)).size,152);
assert.deepEqual([map.generationAllowed,map.runtimeSelectable,map.commercialRoutesOpened],[false,false,0]);
for (const facts of [{}, {'filer.representation':'attorney','attorney.full_legal_name':'Alex Counsel'}]) {
  const saved = JSON.stringify(facts);
  const {fieldMap: review} = caProp64CompletionMetadataForReview(census,facts);
  assert.equal(JSON.stringify(facts),saved,'review inputs stay unchanged');
  assert.equal(review.writes.length,facts['attorney.full_legal_name']?3:0,'review does not borrow synthetic fixture facts');
  assert.ok(review.writes.every(r=>r.factId==='attorney.full_legal_name'));
  assert.ok(review.refusals.filter(r=>r.completionActor==='attorney').every(r=>r.blankTreatment===null),'review does not borrow fixture representation');
  assert.equal(review.writes.length+review.refusals.length+review.selections.length,152);
}
assert.deepEqual(caProp64ActorInventoryProblems(map.familyId,map,census),[]);
for (const stage of ['court_assignment','judicial_action','actual_service','actual_signing','explicit_optional_election']) {
  const mutant = structuredClone(map);
  const index = mutant.refusals.findIndex(r=>r.completionStage===stage);
  assert.notEqual(index,-1,`source actor exists: ${stage}`);
  const [row] = mutant.refusals.splice(index,1);
  mutant.writes.push({...row,disposition:'WRITE',factId:'participant.full_legal_name'});
  assert.ok(caProp64ActorInventoryProblems(map.familyId,mutant,census).some(p=>p.counter==='protectedWrites'),`${stage} remains protected`);
}
const instructions=caProp64CompletionInstructionsForReview(map);
for(const r of [...missing,...sections,...lawyer]) assert.ok(instructions.includes(r.fieldName),'exact blank is disclosed');
console.log('PASS: pure factory map has 32 held writes, 4 branch controls and 116 refusal rows; no native PDF acceptance claimed.');
