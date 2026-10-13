import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
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
 assert.equal(s.procedureAdoption?.registerSha256,'4ffc56d4cc8dfa9b882f64ad51f49be815704fe20009ee7425b429418b54ead2');
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
for(const [id,factId]of Object.entries(ids)){
 const row=entry.procedureAdoption.originalFactDispositions.find(r=>r.assertionId===id);
 check(()=>assert.equal(row?.factId,factId));
 check(()=>assert.equal(row?.officialFormDestination,null));
 check(()=>assert.equal(row?.actualOutputAcceptance,'NOT_VERIFIED'));
 check(()=>assert.equal(row?.historicalRawAnswerPreserved,true));
 check(()=>assert.equal(row?.participantPetitionRequired,false));
}
check(()=>assert.equal(entry.procedureAdoption.originalFactDispositions.length,7));
check(()=>assert.equal(entry.procedureAdoption.relatedContactObligation,'GA15-DECLARED_COMPONENT_PURPOSE_CURRENT_OFFICIAL_OUTPUT_UNBOUND'));
const historical=JSON.parse(execFileSync('git',['show','38e5f204fa5c3151ee73af58301a2a3772791a49:'+FILE],{encoding:'utf8',maxBuffer:16*1024*1024}));
check(()=>assert.deepEqual(manifest.packetSets.filter(s=>s.packetSetId!==TARGET),historical.packetSets.filter(s=>s.packetSetId!==TARGET)));
check(()=>assert.deepEqual(manifest.factoryV2RouteMigrations,historical.factoryV2RouteMigrations));
check(()=>assert.throws(()=>assertMechanism(historical.packetSets.find(s=>s.packetSetId===TARGET)),/does not establish a participant petition/));
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
console.log(JSON.stringify({status:'PASS',checks,sourceSha256:createHash('sha256').update(fs.readFileSync(FILE)).digest('hex'),scope:'Adopted VA01 manifest and actual SessionA projection; no court-source, field geometry, authenticated or rendered-output acceptance claimed.'},null,2));
