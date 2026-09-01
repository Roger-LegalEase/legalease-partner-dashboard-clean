#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";

const databaseUrl = process.env.CONSUMER_ACCEPTANCE_DATABASE_URL;
if (!databaseUrl) {
  console.error("Set CONSUMER_ACCEPTANCE_DATABASE_URL to a local Supabase PostgreSQL URL.");
  process.exit(2);
}
const parsedUrl = new URL(databaseUrl);
if (!new Set(["127.0.0.1", "localhost", "::1"]).has(parsedUrl.hostname)) {
  console.error("Refusing to run consumer launch-rail fixtures against a non-local database.");
  process.exit(2);
}

const ids = {
  userA: randomUUID(),
  userB: randomUUID(),
  itemA: randomUUID(),
  itemB: randomUUID(),
  personA: randomUUID(),
  packetA: randomUUID(),
  packetB: randomUUID()
};
const hashA = "a".repeat(64);
const hashB = "b".repeat(64);
const inputHash = "c".repeat(64);
const correctedInputHash = "9".repeat(64);
const draftHashA = "d".repeat(64);
const draftHashB = "e".repeat(64);
const pathway = "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";
const emailA = `consumer-${ids.userA}@example.test`;
const emailB = `consumer-${ids.userB}@example.test`;
const checkoutSessionId = `cs_test_${randomUUID().replaceAll("-", "")}`;
const providerEventId = `evt_${randomUUID().replaceAll("-", "")}`;

function sql(statement) {
  return execFileSync("psql", [databaseUrl, "-X", "-v", "ON_ERROR_STOP=1", "-A", "-t", "-c", statement], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function sqlError(statement) {
  try {
    sql(statement);
  } catch (error) {
    return String(error.stderr ?? error.message);
  }
  throw new Error("SQL unexpectedly succeeded");
}

function json(statement) {
  return JSON.parse(sql(`select coalesce((${statement})::text, 'null')`));
}

function literal(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const draftA = { schemaVersion: "expungement-ai/protected-packet-draft/v1", capturedAt: "2026-09-01T00:00:00.000Z" };
const draftB = { ...draftA, capturedAt: "2026-09-01T00:01:00.000Z" };
const verifiedA = { schemaVersion: "expungement-ai/final-verification/v1", verifiedAt: "2026-09-01T00:00:10.000Z" };
const verifiedB = { ...verifiedA, verifiedAt: "2026-09-01T00:01:10.000Z" };
const checks = [];
function check(label, condition) {
  assert.equal(Boolean(condition), true, label);
  checks.push(label);
  console.log(`ok ${checks.length} - ${label}`);
}

try {
  sql(`
    delete from auth.users where id in ('${ids.userA}','${ids.userB}');
    delete from public.rcap_persons where id='${ids.personA}';
    insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
      values
      ('${ids.userA}','authenticated','authenticated','${emailA}','',now(),now(),now()),
      ('${ids.userB}','authenticated','authenticated','${emailB}','',now(),now(),now());
    insert into public.consumer_briefcase_items(
      id,user_id,item_type,jurisdiction,pathway_label,result_code,packet_type,
      payment_allowed,status,payment_status,packet_status
    ) values
      ('${ids.itemA}','${ids.userA}','result','MS','${pathway}','packet_ready','custom_pleading',true,'packet_ready','unpaid','not_started'),
      ('${ids.itemB}','${ids.userA}','result','MS','${pathway}','packet_ready','custom_pleading',true,'packet_ready','unpaid','not_started');
    insert into public.rcap_persons(id,partner_slug,match_key)
      values ('${ids.personA}','expungement-ai-consumer','consumer:' || encode(extensions.digest(convert_to('rcap:consumer-person:v1:${ids.userA}','utf8'),'sha256'),'hex'));
    insert into public.consumer_packet_verifications(
      briefcase_item_id,consumer_auth_user_id,matter_id,status,reason,
      verification_hash,verification_snapshot,draft_hash,draft_snapshot,revision
    ) values (
      '${ids.itemA}','${ids.userA}',public.consumer_matter_id_for_briefcase_item('${ids.itemA}'),
      'verified','fixture_verified','${hashA}',${literal(JSON.stringify(verifiedA))}::jsonb,
      '${draftHashA}',${literal(JSON.stringify(draftA))}::jsonb,1
    );
  `);

  check("browser roles cannot write protected verification", sql(`select not has_table_privilege('authenticated','public.consumer_packet_verifications','INSERT,UPDATE,DELETE')`) === "t");

  const wrongOwner = json(`select to_jsonb(x) from public.bind_consumer_checkout_verification(
    '${ids.userB}','${ids.itemA}','cs_test_owner','dry_run','expungement_packet','${ids.personA}',
    public.consumer_matter_id_for_briefcase_item('${ids.itemA}'),'${hashA}') x`);
  check("cross-user checkout binding is denied without revealing the matter", wrongOwner.ok === false && wrongOwner.briefcase_item_id === null);

  const bound = json(`select to_jsonb(x) from public.bind_consumer_checkout_verification(
    '${ids.userA}','${ids.itemA}','${checkoutSessionId}','dry_run','expungement_packet','${ids.personA}',
    public.consumer_matter_id_for_briefcase_item('${ids.itemA}'),'${hashA}') x`);
  check("checkout binds the exact user, matter, person, product, session and verification", bound.ok === true && bound.checkout_session_id === checkoutSessionId);
  check("creating checkout does not mark paid", sql(`select payment_status from public.consumer_briefcase_items where id='${ids.itemA}'`) === "unpaid");
  check("creating checkout enqueues no render", sql(`select count(*) from public.packet_render_jobs where consumer_briefcase_item_id='${ids.itemA}'`) === "0");

  const forged = json(`select to_jsonb(x) from public.record_consumer_packet_payment(
    '${ids.itemA}','paid',5000,'usd','dry_run','evt_forged_${ids.itemA}','${checkoutSessionId}',null,null,
    'server_webhook','local_acceptance','expungement_packet','${ids.personA}',
    public.consumer_matter_id_for_briefcase_item('${ids.itemA}'),'${hashB}') x`);
  check("payment with a forged or stale verification hash is denied", forged.outcome === "invalid_payment_evidence");

  const paid = json(`select to_jsonb(x) from public.record_consumer_packet_payment(
    '${ids.itemA}','paid',5000,'usd','dry_run','${providerEventId}','${checkoutSessionId}','pi_exact',null,
    'server_webhook','local_acceptance','expungement_packet','${ids.personA}',
    public.consumer_matter_id_for_briefcase_item('${ids.itemA}'),'${hashA}') x`);
  check("verified event records exactly $50 USD for the matter", paid.outcome === "recorded_paid");
  const replay = json(`select to_jsonb(x) from public.record_consumer_packet_payment(
    '${ids.itemA}','paid',5000,'usd','dry_run','${providerEventId}','${checkoutSessionId}','pi_exact',null,
    'server_webhook','local_acceptance','expungement_packet','${ids.personA}',
    public.consumer_matter_id_for_briefcase_item('${ids.itemA}'),'${hashA}') x`);
  check("webhook replay is idempotent", replay.outcome === "already_paid");
  const authority = json(`select to_jsonb(x) from public.consumer_packet_payment_authority(
    '${ids.itemA}','${ids.userA}','expungement_packet','${ids.personA}',
    public.consumer_matter_id_for_briefcase_item('${ids.itemA}')) x`);
  check("payment authority is exact-matter entitlement", authority.valid === true);
  const otherAuthority = json(`select to_jsonb(x) from public.consumer_packet_payment_authority(
    '${ids.itemB}','${ids.userA}','expungement_packet','${ids.personA}',
    public.consumer_matter_id_for_briefcase_item('${ids.itemB}')) x`);
  check("one matter does not inherit another matter's entitlement", otherAuthority.valid === false);

  const renderPacket = {
    id: ids.packetA,
    user_id: ids.userA,
    briefcase_id: ids.itemA,
    person_id: ids.personA,
    state: "MS",
    jurisdiction: "MS",
    document_type: "source_driven_packet",
    pathway: "source_engine_packet_plan",
    status: "ready_for_review",
    filing_instructions: [],
    county_court_instructions: [],
    missing_fields: [],
    needs_record_review: true,
    safety_disclaimer: "Accepted synthetic self-help fixture; not legal advice."
  };
  const matterA = sql(`select public.consumer_matter_id_for_briefcase_item('${ids.itemA}')`);
  const renderInput = {
    authUserId: ids.userA,
    briefcaseItemId: ids.itemA,
    matterId: matterA,
    verificationHash: hashA,
    inputHash
  };
  const enqueueSql = `select to_jsonb(x) from public.enqueue_verified_consumer_packet_render(
    '${ids.packetA}','MS:${pathway}','custom_pleading','1.0.0','${"f".repeat(64)}','MS','1.0.0','${inputHash}',
    '${ids.itemA}','${ids.personA}','${matterA}',5,'${ids.itemA}','${ids.userA}','${hashA}',
    ${literal(JSON.stringify(renderPacket))}::jsonb,${literal(JSON.stringify(renderInput))}::jsonb) x`;
  const job = json(enqueueSql);
  check("verified payment creates a durable exact-bound render job", job.status === "queued" && job.consumer_auth_user_id === ids.userA && job.matter_id === matterA);
  const replayJob = json(enqueueSql);
  check("render enqueue retry returns the same job", replayJob.id === job.id && sql(`select count(*) from public.packet_render_jobs where consumer_briefcase_item_id='${ids.itemA}'`) === "1");

  const invalidated = json(`select to_jsonb(x) from public.persist_consumer_packet_verification(
    '${ids.userA}','${ids.itemA}','${hashA}',1,'{"court":"changed"}'::jsonb,'{"stage":"facts_complete"}'::jsonb,
    '${draftHashB}',${literal(JSON.stringify(draftB))}::jsonb,'invalidated','facts_saved_after_verification',
    null,null,now()) x`);
  check("material answer edit invalidates stale verification", invalidated.status === "invalidated" && invalidated.revision === 2);
  check("material answer edit preserves payment history", sql(`select payment_status || ':' || provider_event_id from public.consumer_briefcase_items where id='${ids.itemA}'`) === `paid:${providerEventId}`);
  check("stale job cannot advance to delivery", /stale verification authority/.test(sqlError(`update public.packet_render_jobs set status='artifact_validated' where id='${job.id}'`)));

  const staleClaim = json(`select to_jsonb(x) from public.claim_packet_render_job(
    'consumer-launch-rails-stale-fixture',null,600) x`);
  check("the worker can claim the pre-edit job for a fail-closed attempt", staleClaim.id === job.id);
  check("the stale attempt enters rendering", sql(`select public.start_packet_render('${job.id}','${staleClaim.fencing_token}')`) === "t");
  check("the stale attempt enters validation", sql(`select public.start_packet_validation('${job.id}','${staleClaim.fencing_token}')`) === "t");
  check("canonical finalization also refuses stale generation authority", /stale verification authority/.test(sqlError(`
    select * from public.finalize_packet_render_job('${job.id}','${staleClaim.fencing_token}',
      'packet-artifacts/consumer/${matterA}/${job.id}/${"8".repeat(64)}.pdf',
      '${"8".repeat(64)}','${"7".repeat(64)}','${"8".repeat(64)}','${"7".repeat(64)}',512,1,'sha256:stale-fixture')`)));
  check("the failed stale attempt is terminalized without changing payment",
    sql(`select public.fail_packet_render_job('${job.id}','${staleClaim.fencing_token}','render_failed','stale verification fixture',false)`) === "terminal"
      && sql(`select payment_status from public.consumer_briefcase_items where id='${ids.itemA}'`) === "paid");

  const reverified = json(`select to_jsonb(x) from public.persist_consumer_packet_verification(
    '${ids.userA}','${ids.itemA}',null,2,'{}'::jsonb,'{"stage":"ready_to_generate"}'::jsonb,
    '${draftHashB}',${literal(JSON.stringify(draftB))}::jsonb,'verified','explicit_final_verification',
    '${hashB}',${literal(JSON.stringify(verifiedB))}::jsonb,null) x`);
  check("same-matter correction can be re-verified without another payment", reverified.status === "verified" && sql(`select count(*) from public.consumer_briefcase_items where id='${ids.itemA}' and provider_event_id='${providerEventId}'`) === "1");

  const correctedRenderPacket = { ...renderPacket, id: ids.packetB };
  const correctedRenderInput = { ...renderInput, verificationHash: hashB, inputHash: correctedInputHash };
  const correctedEnqueueSql = `select to_jsonb(x) from public.enqueue_verified_consumer_packet_render(
    '${ids.packetB}','MS:${pathway}','custom_pleading','1.0.0','${"f".repeat(64)}','MS','1.0.0','${correctedInputHash}',
    '${ids.itemA}','${ids.personA}','${matterA}',5,'${ids.itemA}','${ids.userA}','${hashB}',
    ${literal(JSON.stringify(correctedRenderPacket))}::jsonb,${literal(JSON.stringify(correctedRenderInput))}::jsonb) x`;
  const correctedJob = json(correctedEnqueueSql);
  check("a re-verified same-matter correction enqueues a new exact-bound job without recharge",
    correctedJob.id !== job.id && correctedJob.consumer_verification_hash === hashB
      && sql(`select count(*) from public.consumer_briefcase_items where id='${ids.itemA}' and provider_event_id='${providerEventId}'`) === "1");
  check("retrying the corrected render enqueue returns its same durable job", json(correctedEnqueueSql).id === correctedJob.id);

  const claim = json(`select to_jsonb(x) from public.claim_packet_render_job(
    'consumer-launch-rails-fixture',null,600) x`);
  check("the durable worker claims the exact paid matter job", claim.id === correctedJob.id && Boolean(claim.fencing_token));
  check("the durable worker starts the render", sql(`select public.start_packet_render('${correctedJob.id}','${claim.fencing_token}')`) === "t");
  check("the durable worker starts artifact validation", sql(`select public.start_packet_validation('${correctedJob.id}','${claim.fencing_token}')`) === "t");
  const artifactSha256 = createHash("sha256").update("accepted-synthetic-packet-v1").digest("hex");
  const normalizedSha256 = createHash("sha256").update("accepted-synthetic-packet-v1-normalized").digest("hex");
  const storagePath = `packet-artifacts/consumer/${matterA}/${correctedJob.id}/${artifactSha256}.pdf`;
  const finalized = json(`select to_jsonb(x) from public.finalize_packet_render_job(
    '${correctedJob.id}','${claim.fencing_token}','${storagePath}','${artifactSha256}','${normalizedSha256}',
    '${artifactSha256}','${normalizedSha256}',1024,1,'sha256:accepted-synthetic-fixture') x`);
  check("the canonical finalizer validates the synthetic job without another charge",
    finalized.accounting_result === "zero_charge" && finalized.delivery_eligibility === "eligible");
  const ownedArtifact = json(`select to_jsonb(x) from public.get_consumer_packet_artifact_authority('${ids.userA}','${ids.itemA}') x`);
  const foreignArtifact = json(`select to_jsonb(x) from public.get_consumer_packet_artifact_authority('${ids.userB}','${ids.itemA}') x`);
  check("validated durable artifact publishes only to the exact entitlement",
    ownedArtifact.status === "ready" && ownedArtifact.verification_hash === hashB
      && ownedArtifact.artifact.renderJobId === correctedJob.id && ownedArtifact.artifact.storagePath === storagePath);
  check("cross-user artifact access fails closed", foreignArtifact.status === "absent" && foreignArtifact.artifact === null);
  check("the packet artifact bucket is private", sql(`select public is false from storage.buckets where id='rcap-packet-artifacts-private'`) === "t");

  const grantToken = randomBytes(32).toString("base64url");
  const grantHash = createHash("sha256").update(grantToken).digest("hex");
  const grant = json(`select to_jsonb(x) from public.issue_consumer_artifact_download_grant(
    '${ids.userA}','${ids.itemA}','${grantHash}',now()+interval '5 minutes') x`);
  check("owner can issue a short-lived exact-artifact grant", Boolean(grant.grant_id));
  const authorized = json(`select to_jsonb(x) from public.authorize_consumer_artifact_download(
    '${ids.userA}','${ids.itemA}','${grantHash}') x`);
  check("exact grant authorizes only its private storage object", authorized.artifact_storage_path === storagePath);
  const repeated = json(`select to_jsonb(x) from public.authorize_consumer_artifact_download(
    '${ids.userA}','${ids.itemA}','${grantHash}') x`);
  check("repeat download uses the same entitlement without recharge", repeated.grant_id === grant.grant_id
    && sql(`select download_count from public.consumer_artifact_download_grants where id='${grant.grant_id}'`) === "2"
    && sql(`select provider_event_id from public.consumer_briefcase_items where id='${ids.itemA}'`) === providerEventId);
  check("cross-user grant use fails closed", json(`select to_jsonb(x) from public.authorize_consumer_artifact_download(
    '${ids.userB}','${ids.itemA}','${grantHash}') x`) === null);
  check("cross-matter grant use fails closed", json(`select to_jsonb(x) from public.authorize_consumer_artifact_download(
    '${ids.userA}','${ids.itemB}','${grantHash}') x`) === null);
  check("guessed grant token fails closed", json(`select to_jsonb(x) from public.authorize_consumer_artifact_download(
    '${ids.userA}','${ids.itemA}','${"9".repeat(64)}') x`) === null);
  check("owner can revoke a grant", sql(`select public.revoke_consumer_artifact_download_grant('${ids.userA}','${ids.itemA}','${grant.grant_id}')`) === "t");
  check("revoked grant fails closed", json(`select to_jsonb(x) from public.authorize_consumer_artifact_download(
    '${ids.userA}','${ids.itemA}','${grantHash}') x`) === null);

  const expiredHash = createHash("sha256").update(randomBytes(32)).digest("hex");
  sql(`insert into public.consumer_artifact_download_grants(
    token_hash,consumer_auth_user_id,briefcase_item_id,matter_id,artifact_revision,
    verification_hash,artifact_storage_path,artifact_sha256,file_name,content_type,
    created_at,expires_at
  ) values ('${expiredHash}','${ids.userA}','${ids.itemA}','${matterA}',1,'${hashB}',
    '${storagePath}','${artifactSha256}','expired.pdf','application/pdf',
    now()-interval '2 minutes',now()-interval '1 minute')`);
  check("expired grant fails closed", json(`select to_jsonb(x) from public.authorize_consumer_artifact_download(
    '${ids.userA}','${ids.itemA}','${expiredHash}') x`) === null);
  check("browser roles cannot inspect or mint grants", sql(`select not has_table_privilege('authenticated','public.consumer_artifact_download_grants','SELECT,INSERT,UPDATE,DELETE')`) === "t");

  check("browser roles cannot write payment authority columns", sql(`select not has_column_privilege('authenticated','public.consumer_briefcase_items','payment_status','UPDATE')`) === "t");
  check("browser roles cannot write job completion", sql(`select not has_table_privilege('authenticated','public.packet_render_jobs','UPDATE')`) === "t");

  console.log(`Consumer launch-rail database acceptance passed: ${checks.length}/${checks.length}.`);
} finally {
  // The acceptance database is disposable. Durable render jobs are intentionally
  // undeletable, so teardown is the local Supabase reset/stop, not fixture SQL.
}
