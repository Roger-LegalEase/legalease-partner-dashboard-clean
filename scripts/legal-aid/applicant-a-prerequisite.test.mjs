import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { RESUME, CHECKPOINT } from '../rcap-clinic-resume-contract.mjs';
import { ENTITLEMENT_ID, PARTNER_ID, NOTE } from '../rcap-clinic-packet-capacity.mjs';
import { assertApplicantASnapshot, assertApplicantAPrerequisite } from './verify-applicant-a-prerequisite.mjs';

function fixture() {
  // Reuse the established connected tuple, with complete capacity/provenance
  // rows. This is synthetic validation input, never historical evidence.
  const source = fs.readFileSync('scripts/rcap-clinic-resume-connected-fixture.mjs','utf8');
  const functions = source.slice(source.indexOf('function pinnedEvents'),source.indexOf('\nexport async function startConnectedFixture'));
  const s = JSON.parse(JSON.stringify(vm.runInNewContext(functions+';fixture()', {RESUME,CHECKPOINT})));
  s.delivery = JSON.parse(JSON.stringify(vm.runInNewContext(functions+';pinnedEvents(6)', {RESUME,CHECKPOINT})));
  Object.assign(s.capacity.allPartnerRows[0], {id:ENTITLEMENT_ID,partner_id:PARTNER_ID,entitlement_scope:'sponsored_packets',active:true,expires_at:null,contract_note:NOTE,overage_enabled:false,overage_cap:0,pause_at_cap:true,overageConsumed:0});
  Object.assign(s.capacity.screening,{partner_slug:'mvl-demo',pause_at_cap:true,overage_enabled:false});
  Object.assign(s.capacity.event,{id:RESUME.event,partner_slug:'mvl-demo',status:'published'});
  Object.assign(s.provenance[0],{briefcase_item_id:RESUME.item,matter_id:RESUME.matter,entitlement_source:'partner_sponsorship',artifact:{provider:'rcap_grade_a_composer_v1',source:'grade_a_packet_specification',packetId:RESUME.item,renderJobId:RESUME.job,verificationHash:RESUME.verification,artifactSha256:RESUME.hash,pageCount:RESUME.pages,storagePath:'private/existing.pdf'}});
  Object.assign(s.generation[0],{session_id:RESUME.session,event_type:'packet_generated',partner_slug:'mvl-demo',metadata:{clinic_event_id:RESUME.event}});
  s.job.output_storage_path='private/existing.pdf';s.item.packet_status='ready';s.item.artifact_refs_json=structuredClone(s.provenance[0].artifact);
  s.credit[0].render_job_id=RESUME.job;
  return s;
}
test('exact six-event preserved snapshot passes offline; no Clinic PASS is fabricated',()=>{
 const report=assertApplicantASnapshot(fixture());assert.equal(report.deliveryEvents,6);assert.equal(report.clinicPass,false);
});
for(const [label,mutate] of Object.entries({
 owner:s=>s.job.sponsored_consumer_auth_user_id='wrong',hash:s=>s.job.output_sha256='0'.repeat(64),status:s=>s.job.status='artifact_validated',
 renderer:s=>s.job.container_digest='new',provenance:s=>s.provenance[0].matter_id='wrong',generation:s=>s.generation[0].session_id='wrong',
 artifact:s=>s.provenance[0].artifact.artifactSha256='wrong',attribution:s=>s.generation[0].metadata.clinic_event_id='wrong',credit:s=>s.credit[0].render_job_id='wrong',delivery:s=>s.delivery.pop(),counter:s=>s.access.uses_count=0,case:s=>s.case.assisted_session_id='wrong',
 verification:s=>s.verification.verification_hash='wrong',session:s=>s.assisted.participant_user_id='wrong',queued:s=>s.claimable.push('new')
})) test(`prerequisite refuses ${label} drift`,()=>{const s=fixture();mutate(s);assert.throws(()=>assertApplicantASnapshot(s));});
test('PDF mismatch fails even when all metadata matches',()=>assert.throws(()=>assertApplicantAPrerequisite(fixture(),Buffer.alloc(RESUME.bytes))));
test('SQL command only emits the pinned read-only transaction',()=>{
 const sql=execFileSync(process.execPath,['scripts/legal-aid/verify-applicant-a-prerequisite.mjs','--sql'],{encoding:'utf8'});
 assert.ok(sql.startsWith('BEGIN TRANSACTION READ ONLY;\nselect '));assert.ok(sql.trim().endsWith('COMMIT;'));
 assert.ok(sql.includes(RESUME.job));assert.doesNotMatch(sql,/\b(update|insert|delete|alter|drop|truncate|create)\b/i);
});

const { assertLegalAidRelationships } = await import('./verify-applicant-a-prerequisite.mjs');
const { LEGAL_AID_FIXTURE: F } = await import('../rcap-legal-aid/hosted-fixture.mjs');
function relationships() {
 return {event:{id:F.eventId,partner_slug:F.partnerSlug,public_slug:F.eventSlug,experience:'legal_aid',status:'published',capacity:2,policy_profile_id:'78000000-0000-4000-8000-000000000002'},
 profile:{id:'78000000-0000-4000-8000-000000000002',version:1,partner_slug:F.partnerSlug,status:'approved',intake_schema_version:'mvlp-intake-v1',approved_at:'2026-09-27',approved_by:'second-admin',prepared_by:'first-admin',profile:JSON.parse(fs.readFileSync('data/legal-aid/profiles/mvlp-v1.json','utf8'))},
 registration:{status:'received',id:'78000000-0000-4000-8000-000000000003',event_id:F.eventId,participant_user_id:RESUME.owner},
 intake:{status:'approved',id:'78000000-0000-4000-8000-000000000004',registration_id:'78000000-0000-4000-8000-000000000003',event_id:F.eventId,participant_user_id:RESUME.owner,policy_profile_id:'78000000-0000-4000-8000-000000000002'},
 task:{id:'78000000-0000-4000-8000-000000000005',status:'filed',intake_id:'78000000-0000-4000-8000-000000000004',unsigned_render_job_id:RESUME.job,unsigned_artifact_sha256:RESUME.hash}};
}
test('exact configured MVLP event/profile/owner/task relationship passes',()=>assert.equal(assertLegalAidRelationships(relationships()).result,'PASS'));
for(const [label,mutate] of Object.entries({
 missing_ids:s=>{delete s.profile.id;delete s.event.policy_profile_id;delete s.intake.policy_profile_id},version:s=>delete s.profile.version,registration_status:s=>s.registration.status='cancelled',intake_status:s=>s.intake.status='draft',task_status:s=>s.task.status='signature_or_notary_pending',approval_date:s=>s.profile.approved_at='invalid',
 tenant:s=>s.event.partner_slug='mvl-demo',profile:s=>s.event.policy_profile_id='unrelated',approval:s=>s.profile.approved_by=s.profile.prepared_by,
 rules:s=>s.profile.profile.finance.incomeGuideline=200,intake:s=>s.intake.registration_id='unrelated',applicant:s=>s.intake.participant_user_id='wrong',
 task:s=>s.task.intake_id='wrong',packet:s=>s.task.unsigned_render_job_id='new'
})) test(`relationship refuses ${label} drift`,()=>{const s=relationships();mutate(s);assert.throws(()=>assertLegalAidRelationships(s));});
