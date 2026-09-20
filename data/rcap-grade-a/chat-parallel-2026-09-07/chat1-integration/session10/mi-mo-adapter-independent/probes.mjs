import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { MI_MO_FAMILIES, miMoCandidateMatrix, createDeclaredMiMoDelivery, selectDeclaredMiMoFixture, bindDeclaredMiMoDelivery, resolveMiMoRasterEnrollment } from '../../../../../../scripts/rcap-packet-recovery/chat1/mi-mo-declared-candidates.mjs';

const read = path => fs.readFileSync(path);
const json = path => JSON.parse(read(path));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const master = json('data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json');
const families = MI_MO_FAMILIES.map(id => master.families.find(f => f.familyId === id));
const matrices = families.map(f => miMoCandidateMatrix(f));
const records = families.map(f => createDeclaredMiMoDelivery(f, { family:f.familyId,routeKeys:f.routeKeys,paymentEligible:false,sponsorshipEligible:false }));
const checks = [];
const check = (name, task) => { task(); checks.push({name,status:'PASS'}); };
const mutationRead = selected => path => { const data = Buffer.from(read(path)); if(path === selected)data[data.length-1] ^= 1; return data; };
const expectedSources = [
  ['MC227', 'reference/chat-parallel-2026-09-07/chat9/mc227.pdf',0],
  ['CR301','reference/chat-parallel-2026-09-07/chat7/CR301.pdf',2],
  ['CR311','reference/chat-parallel-2026-09-07/chat7/CR311.pdf',2],
  ['FI-05','reference/chat-parallel-2026-09-07/chat7/FI-05.pdf',2],
];
for(const [form,source,index] of expectedSources)check(`changed ${form} source refused before candidate binding`,()=>{
  assert.throws(()=>miMoCandidateMatrix(families[index],{readFile:mutationRead(source)}),/input hash mismatch/);
});
for(const [dependency,index] of [
  ['scripts/rcap-packet-recovery/chat9/michigan.mjs',0],
  ['scripts/rcap-packet-recovery/chat9/mi-history-policy.mjs',1],
  ['scripts/rcap-packet-recovery/chat7/mistaken-identity.mjs',2],
  ['scripts/rcap-packet-recovery/chat7/mistaken-identity-follow-through.mjs',2],
])check(`changed invoking dependency ${dependency} refused`,()=>{
  assert.throws(()=>miMoCandidateMatrix(families[index],{readFile:mutationRead(dependency)}),/input hash mismatch/);
});
for(const [kind,file] of [['guide',matrices[2].fixtures[0].guide.file],['PDF',matrices[0].fixtures[0].file],['fact file',matrices[1].fixtures[0].input.file]])check(`changed delivered ${kind} refused`,()=>{
  const i=kind==='guide'?2:kind==='PDF'?0:1;
  assert.throws(()=>miMoCandidateMatrix(families[i],{readFile:mutationRead(file)}),/input hash mismatch/);
});
const inputFor = (item, index) => {
  const value=json(item.input.file);
  if(index===2&&item.fixture!=='automatic-on-notice') {
    value.opensNewCase=item.selection.opensNewCase;value.proposedOrderRequested=item.selection.proposedOrderRequested;
    if(item.selection.confidentialSheetRequired!==null)value.confidentialSheetRequired=item.selection.confidentialSheetRequired;
  }
  return value;
};
for(const [field,change] of [
  ['wrong court',input=>{input.court.county='Unreviewed County';}],
  ['missing local component election',input=>{delete input.proposedOrderRequested;}],
  ['unknown automatic-notice prerequisite',input=>{delete input.noticeRouteReviewed;}],
  ['different participant case',input=>{input.court.originalCaseNumber='OTHER CASE';}],
])check(`MO ${field} cannot select retained petition`,()=>{
  const item=matrices[2].fixtures.find(f=>f.fixture==='canonical.existing-case.no-order');
  const input=inputFor(item,2);change(input);
  assert.throws(()=>selectDeclaredMiMoFixture(records[2],input,item.fixture));
});
check('MI named manual identifiers remain required and no denied/pending history gains reapplication permission',()=>{
  for(const matrix of matrices.slice(0,2))for(const item of matrix.fixtures){
    assert.equal(item.selection.historyTreatment.permissionToReapply,false);
    assert.equal(item.filingPermitted,false);
    assert.equal(item.grantsEligibility,false);
    if(item.selection.historyTreatment.reasons.length)assert.equal(item.expectedOutcome,'PREPARATION_ONLY_ATTORNEY_REVIEW');
  }
  const known=matrices[0].fixtures.find(f=>f.fixture==='canonical');
  assert.equal(known.completion.requiredBeforeFiling.length,4);
});
check('MO actual automatic fixture binds guidance and no judge or filing component',()=>{
  const item=matrices[2].fixtures.find(f=>f.fixture==='automatic-on-notice');
  assert.equal(item.expectedOutcome,'AUTOMATIC_STATUS_GUIDANCE');
  assert.deepEqual(item.components.map(c=>c.documentId),['instructions']);
  assert.equal(item.paymentGate,null);assert.equal(item.sponsorshipGate,null);
  assert.deepEqual(item.selection.includedCourtForms,[]);
  assert.equal(item.participantExecutionCompleted,false);
});
let parsedPDFs=0,parsedPages=0;
for(let index=0;index<families.length;index++) {
  const enrollment=await resolveMiMoRasterEnrollment(families[index]);
  const matrix=matrices[index];parsedPDFs+=enrollment.documents.length;parsedPages+=matrix.outputInventory.pages;
  check(`${families[index].familyId}: every selected whole PDF enrolled exactly once`,()=>{
    assert.equal(enrollment.documents.length,matrix.fixtures.length);
    assert.equal(new Set(enrollment.documents.map(d=>d.path)).size,matrix.fixtures.length);
    assert.equal(enrollment.documents.reduce((n,d)=>n+d.pageCount,0),matrix.outputInventory.pages);
    assert.equal(enrollment.documentsDigest,sha(Buffer.from(JSON.stringify(enrollment.documents.map(d=>[d.role,d.path,d.sha256])))));
  });
}
assert.equal(parsedPDFs,27);assert.equal(parsedPages,168);
const mo=matrices[2];
const fullReceipt={familyId:families[2].familyId,documents:mo.fixtures.map(item=>({path:item.file,sha256:item.sha256,pageCount:item.pageCount})),rasterReceipt:{verdict:'RASTER_PASS',coversTheWholeFamily:true,documentsMeasured:mo.fixtures.length,pagesMeasured:mo.outputInventory.pages,documentsNotCovered:[],documentsCovered:mo.fixtures.map(item=>item.file.slice(mo.fixtureRoot.length+1)),boundToCanonicalSha256:mo.anchors.canonical.centralAndInventorySha256,boundToBoundarySha256:mo.anchors.boundary.centralAndInventorySha256}};
// These are in-memory structural negatives. No fabricated receipt is persisted or accepted.
for(const [name,change] of [
  ['wrong boundary anchor',r=>{r.rasterReceipt.boundToBoundarySha256='0'.repeat(64);}],
  ['wrong full output page count',r=>{r.documents[0].pageCount+=1;}],
  ['omitted automatic guidance',r=>{r.rasterReceipt.documentsCovered.pop();}],
  ['duplicate source-selected packet',r=>{r.documents[0]=structuredClone(r.documents[1]);}],
])check(`whole-output structural receipt refuses ${name}`,()=>{const r=structuredClone(fullReceipt);change(r);assert.throws(()=>bindDeclaredMiMoDelivery(records[2],families[2],{raster:r}));});
console.log(JSON.stringify({schemaVersion:'rcap-independent-scoped-controls/v1',reviewer:'GPT-6 Astra treatment_reconciliation agent; independent of MI/MO adapter author',checks,counts:{checks:checks.length,parsedSelectedPDFs:parsedPDFs,parsedSelectedPages:parsedPages},createsAcceptance:false,scope:'Source/facts/guide/components/selection and whole-output enrollment controls. Existing L6 remains the separate required provenance check; no central receipt authenticated or fabricated.',implementationSha256:sha(read('scripts/rcap-packet-recovery/chat1/mi-mo-declared-candidates.mjs'))},null,2));
