import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { documentContractFor, captionTreatmentIsResolved } = await import('../src/lib/rcap/grade-a/document-contract.ts');
const { renderGradeAPacketPdf } = await import('../src/lib/rcap/grade-a/renderer.ts');
const { composeParticipantDeliveryPacket } = await import('../src/lib/rcap/grade-a/participant-packet.ts');
const { composablePacketSpecificationFor } = await import('../src/lib/rcap/grade-a/packet-specification.ts');
const source = fs.readFileSync('scripts/generate-rcap-document-contracts.mjs', 'utf8');
const context = { UNRESOLVED: 'unresolved' };
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('const NOT_ESTABLISHED ='), source.indexOf('function contractFor(')) + '\nthis.executionFrom=executionFrom; this.serviceFrom=serviceFrom;', context);
const memo = JSON.parse(fs.readFileSync('data/record-clearing/legal-design-intake/KS.memo.json'));
const sets = JSON.parse(fs.readFileSync('data/record-clearing/legal-design-packet-set-manifests.json')).packetSets;
let checks = 0;
const equal = (a,b,message) => { assert.deepEqual(a,b,message); checks++; };
for (const suffix of ['conviction-or-diversion-expungement-under-12-4516','arrest-record-expungement-under-12-4516a']) {
  const spec = JSON.parse(fs.readFileSync(`data/record-clearing/packet-specifications/KS-municipal-${suffix}.v1.json`));
  const track = memo.tracks.find(t=>t.trackId===spec.trackId), set = sets.find(s=>s.trackId===spec.trackId);
  equal(track.rules.service, 'The court causes notice to be given. The participant does not serve.');
  equal(context.executionFrom(set)[0], 'signature', 'A negated verification/notarization statement cannot establish a requirement');
  equal(context.serviceFrom(set)[0], 'court_causes_notice', 'Notice assigned to the court cannot become participant service');
  for (const doc of spec.documents.filter(d=>d.role!=='process_guidance')) {
    const contract = documentContractFor(doc);
    equal(contract.executionType,'signature');
    equal(contract.serviceTreatment,'court_causes_notice');
    equal(contract.signer,doc.role==='proposed_order'?'judge':'participant');
    equal(contract.captionTreatment,'unresolved');
    equal(captionTreatmentIsResolved(contract),false);
    equal(contract.localVariant,'unresolved');
  }
  const packet=composeParticipantDeliveryPacket(spec,{routeKey:spec.routeKey,generationPurpose:'internal_review',facts:{},verifiedAt:'2026-10-12T12:00:00Z',verificationHash:'synthetic-ks-caption-hold'});
  await assert.rejects(()=>renderGradeAPacketPdf(packet),/no resolved caption treatment/); checks++;
  equal(spec.legalSectionsBound,false);
  equal(composablePacketSpecificationFor(spec.routeKey),undefined);
}
for (const [description,expected] of [
  ['The petitioner signs the petition. No verification is required.','signature'],
  ['The petitioner signs a verified petition.','verified'],
  ['The petitioner signs the petition.','signature'],
]) equal(context.executionFrom({participantActionRequired:[{kind:'sign',description}]})[0],expected);
for (const [description,expected] of [
  ['The clerk serves the prosecutor.','clerk_serves'],
  ['Service is made by the petitioner.','participant_serves'],
  ['Who serves is unresolved; confirm with the clerk.','unresolved'],
]) equal(context.serviceFrom({participantActionRequired:[{kind:'serve_party',description}]})[0],expected);
equal(context.executionFrom({participantActionRequired:[{kind:'sign',description:'Verification is required by statute.'},{kind:'notarize',description:'Confirm with the clerk whether notarization is required.'}]})[0],'verified');
equal(context.executionFrom({participantActionRequired:[{kind:'sign',description:'Sign the petition.'},{kind:'notarize',description:'Sign before a notary public.'}]})[0],'sworn_notarised');
console.log(JSON.stringify({status:'PASS',checks,scope:'Two KS municipal document responsibilities; caption, source, local-form and commercial holds preserved. No output approval.'}));
