import assert from 'node:assert/strict';
import fs from 'node:fs';
import {flattenedWidgets,drawnAt} from '../rcap-official-forms/pdf-flattened-widgets.mjs';
const out='data/rcap-all50/overlays/census-v1/pa/pa-pardon-expungement-set--official-pdf-fill/';
const writes=JSON.parse(fs.readFileSync(out+'reports/actual-writes.json'));
const map=JSON.parse(fs.readFileSync(out+'production-field-map.json'));
const instructions=fs.readFileSync(out+'participant-instructions.md','utf8');
for(const fixture of ['canonical','boundary']) {
 const row=writes.documents.find(r=>r.fixture===fixture&&r.formNumber==='PA-RCRIM-P-790-ORDER');
 const address=row.actualWrites.find(w=>w.field==='PetitionersAddress');
 assert.equal(address.page,2);assert.equal(address.drawnText.join(' '),address.expected);
 assert.ok(address.expected.includes(fixture==='canonical'?'Philadelphia, PA, 19107':'Wilkes-Barre Township, Pennsylvania, 18702-2214'));
 const fields=await flattenedWidgets(out+`fixtures/${fixture}--PA-RCRIM-P-790-ORDER.pdf`);
 const orderMap=map.maps.find(m=>m.formNumber==='PA-RCRIM-P-790-ORDER');
 for(const field of [...orderMap.canonicalRefusals,...orderMap.selectionControls].filter(r=>r.category==='court_prosecutor_clerk_or_agency_owned')) {
   assert.equal(drawnAt(fields,{page:field.page,rect:field.rect}).filter(x=>x.text?.trim()).length,0,`${fixture}/${field.field} contains judicial text`);
 }
}
const petition=map.maps.find(m=>m.formNumber==='PA-RCRIM-P-790-PETITION');
for(let i=1;i<=4;i++){
 const row=petition.canonicalRefusals.find(r=>r.field===`DocketSeg${i}`);
 assert.equal(row.heldFact,'matter.case_number');assert.doesNotMatch(row.why,/holds no value/);
 assert.match(row.participantMustSupply,/docket number already printed/);
}
const order=map.maps.find(m=>m.formNumber==='PA-RCRIM-P-790-ORDER');
for(let i=1;i<=3;i++){
 const row=order.selectionControls.find(r=>r.field===`Checkbox${i}`);
 assert.equal(row.category,'court_prosecutor_clerk_or_agency_owned');
 assert.match(row.why,/court owns/);assert.equal(row.requiredBeforeFiling,false);
}
assert.doesNotMatch(instructions,/Every checkbox\.\*\* Each one/);
assert.match(instructions,/Order checkboxes:\*\* leave all three ordering paragraphs blank for the court/);
console.log('PA pardon saved-byte address in source p2/rect, four held docket disclosures, three protected judicial controls PASS');
