import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const VA_V3_REGISTER = '3f8998b2fdba92b77c6804934c949bb367bf4c945ca2826d6b119da0e81cdf0b';
const VA_OLD_REGISTER = '4ffc56d4cc8dfa9b882f64ad51f49be815704fe20009ee7425b429418b54ead2'; // immutable predecessor ancestry
const VA_SOURCE = '85ac8ea0f2dc40d890fa2b37921a1b24956ed4aecb1555109a0bb5a65793c656';
const VA_URL = 'https://www.fairfaxcounty.gov/circuit/sites/circuit/files/assets/documents/pdf/expungement-order.pdf';
// Portable metadata tuple only; private PDF bytes were independently checked in custody.
// CI has no dependency on the ignored private source path and performs no network acquisition.
const sourceSuccessor = s => s.procedureAdoption?.registerSha256 === VA_V3_REGISTER
  && s.procedureAdoption?.supersededRegisterSha256 === VA_OLD_REGISTER
  && s.procedureAdoption?.currentInstrument?.officialFormId === 'CC-1474'
  && s.procedureAdoption.currentInstrument.revision === '07/26'
  && s.procedureAdoption.currentInstrument.sourceUrl === VA_URL
  && s.procedureAdoption.currentInstrument.sha256 === VA_SOURCE
  && s.procedureAdoption.currentInstrument.custodyReceipt === 'data/rcap-grade-a/source-custody/court-source-handoff-20261013/va-cc1474-current-source-20261016.json';
const FILE='data/record-clearing/legal-design-packet-set-manifests.json';
const TARGET='va_exp_absolute_pardon-set';
const manifest=JSON.parse(fs.readFileSync(FILE));
const entry=manifest.packetSets.find(s=>s.packetSetId===TARGET);
const ids={
 'FAIL-1d5c156e9080d8e0c10c':'date_of_birth',
 'FAIL-c51b156e4e789fb5258d':'mailing_address',
 'FAIL-7741ca998d4ebc329173':'phone_number',
 'FAIL-71980e94e226f0150146':'email_address',
 'FAIL-e37b5260716f7f609b94':'full_name_at_time_of_arrest',
 'FAIL-4ff4dbb566801032326a':'charges_to_be_expunged',
 'FAIL-3219c8b753dcf9bfb9f2':'final_disposition_dates_and_courts'
};
let checks=0;
function check(fn){fn();checks++;}
function assertMechanism(s){
 assert.ok(s.components.every(c=>c.outputStrategy==='process_guidance'&&c.officialFormId===null),'VA01 does not establish a participant petition or official form');
 assert.ok(!s.components.some(c=>c.role==='primary_filing'),'no manufactured participant primary filing');
 assert.equal(s.procedureAdoption?.decisionId,'VA-01');
 assert.equal(s.procedureAdoption?.disposition,'MODIFY');
 assert.equal(s.procedureAdoption?.evidenceKind,'owner_relayed_counsel_adoption');
 assert.ok(sourceSuccessor(s), 'exact adopted v3/source successor');
 assert.equal(s.procedureAdoption?.mechanism?.transmissionActor,'Secretary of the Commonwealth');
 assert.equal(s.procedureAdoption?.mechanism?.implementationActor,'receiving circuit court');
 assert.equal(s.procedureAdoption?.mechanism?.policeTransmissionActor,'court/clerk');
 assert.equal(s.procedureAdoption?.participantPetitionEstablished,false);
 assert.equal(s.procedureAdoption?.documentAcceptance,'NOT_VERIFIED');
 assert.equal(s.packetSetCompleteness?.state,'incomplete');
 assert.deepEqual(s.requiredBeforeFiling,[]);
 assert.ok(!s.participantActionRequired.some(a=>['sign','pay_fee','serve_party','file'].includes(a.kind)),'no imported ordinary petition acts');
 assert.ok(s.participantActionRequired.every(a=>a.requiredBeforeFiling===false),'verification is not a prerequisite petition');
}
check(()=>assertMechanism(entry));
for (const drift of [s=>{s.procedureAdoption.currentInstrument.sha256='0'.repeat(64);},s=>{s.procedureAdoption.registerSha256=VA_OLD_REGISTER;},s=>{s.procedureAdoption.currentInstrument.revision='11/15';}]) { const bad=structuredClone(entry);drift(bad);check(()=>assert.throws(()=>assertMechanism(bad),/exact adopted v3/)); }
for(const [id,factId]of Object.entries(ids)){
 const row=entry.procedureAdoption.originalFactDispositions.find(r=>r.assertionId===id);
 check(()=>assert.equal(row?.factId,factId));
 check(()=>assert.equal(row?.officialFormDestination, factId === 'charges_to_be_expunged' ? 'CC-1474 page2: LIST CHARGE(S)/OFFENSE(S) INCLUDING CIRCUIT COURT AND DISTRICT COURT CASE NUMBERS, IF KNOWN' : null));
 check(()=>assert.equal(row?.actualOutputAcceptance,'NOT_VERIFIED'));
 check(()=>assert.equal(row?.historicalRawAnswerPreserved,true));
 check(()=>assert.equal(row?.participantPetitionRequired,false));
}
check(()=>assert.equal(entry.procedureAdoption.originalFactDispositions.length,7));
check(()=>assert.equal(entry.procedureAdoption.relatedContactObligation,'GA15-DECLARED_COMPONENT_PURPOSE_CURRENT_OFFICIAL_OUTPUT_UNBOUND'));
// Pinned before-change identities require only tracked checkout bytes, not a
// worker-local Git object (fresh CI may have a shallow history).
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
check(()=>assert.equal(sha(manifest.packetSets.filter(s=>s.packetSetId!==TARGET)),'7d6fcd8b39c8d03b4855b742a454f875fb352e5ca97e53d344c74b7a85aaed2e'));
check(()=>assert.equal(sha(manifest.factoryV2RouteMigrations),'c6cd3a19ccceec2bbf793c017fb0f162db303de3ca0095a0adeb0b9601a14e83'));
const predecessor=structuredClone(entry);
predecessor.components[0].outputStrategy='official_pdf_fill';
predecessor.components[0].officialFormId='CC-1472';
check(()=>assert.throws(()=>assertMechanism(predecessor),/does not establish a participant petition/));
for(const form of ['CC-1472','CC-1473','CC-1474A']){
 const mutated=structuredClone(entry);mutated.components[0].officialFormId=form;mutated.components[0].outputStrategy='official_pdf_fill';
 check(()=>assert.throws(()=>assertMechanism(mutated),/does not establish a participant petition/));
}
const packet=JSON.parse(fs.readFileSync('data/rcap-ledger/session-a-evidence-packet.json'));
const current=packet.records.find(r=>r.pathwayKey==='VA:regime-1-expungement-available-now');
check(()=>assert.equal(current.ownerApprovedLegal.basis,'owner_relayed_counsel_adopted_modified_procedure'));
check(()=>assert.equal(current.ownerApprovedLegal.documentAcceptance,'NOT_VERIFIED'));
check(()=>assert.equal(current.ownerApprovedLegal.currentProcedureDecision.decisionId,'VA-01'));
check(()=>assert.equal(current.ownerApprovedLegal.currentProcedureDecision.registerSha256,entry.procedureAdoption.registerSha256));
check(()=>assert.ok(current.ownerApprovedLegal.historicalOwnerDecision.recordId,'historical adoption ancestry retained'));
check(()=>assert.equal(current.ownerApprovedLegal.historicalOwnerDecision.appliesToCurrentDocument,false));
check(()=>assert.equal(current.ownerApprovedLegal.escalationRequired,false,'covered VA01 must not reopen legal approval'));
check(()=>assert.equal(current.packetFamilyBridge.packetSets[0].procedureAdoption.decisionId,'VA-01'));
check(()=>assert.equal(current.packetFamilyBridge.packetSets[0].packetSetCompleteness.state,'incomplete'));
console.log(JSON.stringify({status:'PASS',checks,sourceSha256:createHash('sha256').update(fs.readFileSync(FILE)).digest('hex'),scope:'Adopted v3 portable source/meaning metadata and actual SessionA projection only; local PDF bytes separately reviewed in custody. Actual applicable context/guidance/save/purpose/output acceptance remains; geometry only if demonstrated applicable generated output requires it. No hosted or commercial acceptance.'},null,2));
