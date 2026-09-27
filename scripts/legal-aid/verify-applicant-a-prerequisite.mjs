#!/usr/bin/env node
// Offline, read-only contract. --sql emits a SELECT in a read-only transaction;
// this executable never connects, authenticates, downloads or mutates a service.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LEGAL_AID_FIXTURE as F } from '../rcap-legal-aid/hosted-fixture.mjs';
import { pathToFileURL } from 'node:url';
import { RESUME, CHECKPOINT, resumeSql, assertResumeState, classifyDeliveryCheckpoint, assertResumeBytes, sha } from '../rcap-clinic-resume-contract.mjs';

export function assertApplicantASnapshot(snapshot) {
  assertResumeState(snapshot);
  assert.equal(classifyDeliveryCheckpoint(snapshot).state, 'SUCCESSOR_EXPLICIT_DOWNLOAD_ALREADY_PROVEN');
  assert.deepEqual(snapshot.delivery.map(row => row.id), [...CHECKPOINT.eventIds]);
  const provenance = snapshot.provenance[0];
  assert.equal(provenance.briefcase_item_id, RESUME.item);
  assert.equal(provenance.matter_id, RESUME.matter);
  assert.equal(provenance.entitlement_source, 'partner_sponsorship');
  assert.ok(snapshot.job.output_storage_path, 'existing private artifact path required');
  for (const [key, value] of Object.entries({provider:'rcap_grade_a_composer_v1',source:'grade_a_packet_specification',packetId:RESUME.item,renderJobId:RESUME.job,
    verificationHash:RESUME.verification,artifactSha256:RESUME.hash,pageCount:RESUME.pages,storagePath:snapshot.job.output_storage_path})) {
    assert.equal(provenance.artifact?.[key], value, `provenance artifact ${key}`);
    assert.equal(snapshot.item.artifact_refs_json?.[key], value, `Briefcase artifact ${key}`);
  }
  assert.equal(snapshot.item.packet_status, 'ready');
  assert.equal(snapshot.generation[0].session_id, RESUME.session);
  assert.equal(snapshot.generation[0].event_type, 'packet_generated');
  assert.equal(snapshot.generation[0].partner_slug, 'mvl-demo');
  assert.equal(snapshot.generation[0].metadata?.clinic_event_id, RESUME.event);
  assert.equal(snapshot.credit[0].render_job_id, RESUME.job);
  return { schemaVersion: 'legal-aid-applicant-a-prerequisite/v1', result: 'PASS', project: RESUME.project,
    owner: RESUME.owner, job: RESUME.job, artifactSha256: RESUME.hash, artifactBytes: RESUME.bytes,
    historicalRendererDigest: RESUME.priorDigest, deliveryEvents: 6, accessUses: 2, accessMaxUses: 2,
    snapshotSha256: sha(Buffer.from(JSON.stringify(snapshot))), readOnly: true, clinicPass: false };
}

export function assertLegalAidRelationships({ event, profile, registration, intake, task }) {
  for (const row of [event, profile, registration, intake, task]) assert.match(row.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, 'persisted row identity required');
  assert.ok(Number.isInteger(profile.version) && profile.version > 0);
  assert.ok(Number.isFinite(Date.parse(profile.approved_at)));
  assert.ok(['received', 'confirmed'].includes(registration.status));
  assert.equal(intake.status, 'approved');
  assert.equal(task.status, 'filed');
  assert.equal(event.id, F.eventId); assert.equal(event.partner_slug, F.partnerSlug);
  assert.equal(event.public_slug, F.eventSlug); assert.equal(event.experience, 'legal_aid');
  assert.equal(event.status, 'published'); assert.equal(event.capacity, F.capacity);
  assert.equal(event.policy_profile_id, profile.id); assert.equal(profile.partner_slug, F.partnerSlug);
  assert.equal(profile.status, 'approved'); assert.equal(profile.intake_schema_version, 'mvlp-intake-v1');
  assert.ok(profile.approved_at && profile.approved_by && profile.prepared_by);
  assert.notEqual(profile.approved_by, profile.prepared_by);
  assert.deepEqual(profile.profile, JSON.parse(fs.readFileSync(new URL('../../data/legal-aid/profiles/mvlp-v1.json', import.meta.url))));
  assert.equal(registration.event_id, event.id); assert.equal(registration.participant_user_id, RESUME.owner);
  assert.equal(intake.registration_id, registration.id); assert.equal(intake.event_id, event.id);
  assert.equal(intake.participant_user_id, RESUME.owner); assert.equal(intake.policy_profile_id, profile.id);
  assert.equal(task.intake_id, intake.id); assert.equal(task.unsigned_render_job_id, RESUME.job);
  assert.equal(task.unsigned_artifact_sha256, RESUME.hash);
  return { result: 'PASS', eventId: event.id, profileId: profile.id, profileVersion: profile.version,
    profileSha256: sha(Buffer.from(JSON.stringify(profile.profile))), owner: RESUME.owner, job: RESUME.job };
}

export function assertApplicantAPrerequisite(snapshot, bytes) {
  const result = assertApplicantASnapshot(snapshot);
  assertResumeBytes(bytes);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === '--sql' && process.argv.length === 3) {
    console.log(`BEGIN TRANSACTION READ ONLY;\n${await resumeSql(RESUME.project)};\nCOMMIT;`);
  } else if (process.argv[2] === '--relationships') {
    console.log(JSON.stringify(assertLegalAidRelationships(JSON.parse(fs.readFileSync(process.argv[3], 'utf8'))), null, 2));
  } else {
    const [snapshotPath, artifactPath, afterPath] = process.argv.slice(2);
    assert.ok(snapshotPath && artifactPath, 'Usage: node scripts/legal-aid/verify-applicant-a-prerequisite.mjs SNAPSHOT.json EXISTING.pdf [AFTER.json] | --sql');
    const before = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    const result = assertApplicantAPrerequisite(before, fs.readFileSync(artifactPath));
    if (afterPath) {
      const after = JSON.parse(fs.readFileSync(afterPath, 'utf8'));
      assertApplicantAPrerequisite(after, fs.readFileSync(artifactPath));
      assert.deepEqual(after, before, 'Legal Aid must preserve the complete historical packet checkpoint');
      result.historicalCheckpointUnchanged = true;
    }
    console.log(JSON.stringify(result, null, 2));
  }
}
