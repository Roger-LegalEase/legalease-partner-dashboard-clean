import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "../../node_modules/@electric-sql/pglite/dist/index.cjs";

// Legal Aid Clinic Mode schema, RLS and RPC contract. Applies the four Clinic
// Mode migrations plus the legal-aid migration into an isolated in-process
// database and exercises the workflow with synthetic identities only:
// two tenants, a coordinator, an intake reviewer, an attorney, a notary, an
// unassigned staff member, two applicants, a sponsor-like outsider.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const migrationPaths = [
  "supabase/migrations/20260825120000_clinic_mode_core.sql",
  "supabase/migrations/20260825121000_clinic_mode_security.sql",
  "supabase/migrations/20260825122000_clinic_mode_accounting_reporting.sql",
  "supabase/migrations/20260903120000_clinic_event_jurisdiction_lock.sql",
  "supabase/migrations/20260916120000_legal_aid_clinic_mode.sql"
];
const newTables = [
  "legal_aid_policy_profiles", "clinic_registrations", "legal_aid_intakes", "legal_aid_restricted_fields",
  "legal_aid_intake_signatures", "legal_aid_documents", "legal_aid_information_requests",
  "legal_aid_review_decisions", "legal_aid_document_tasks", "legal_aid_next_steps",
  "legal_aid_case_exports", "legal_aid_access_audit"
];
const serviceOnlyFunctions = [
  "legal_aid_audit", "legal_aid_prepare_policy_profile", "legal_aid_approve_policy_profile", "legal_aid_configure_event",
  "legal_aid_register", "legal_aid_set_registration_status", "legal_aid_save_intake_draft", "legal_aid_sign_intake",
  "legal_aid_submit_intake", "legal_aid_withdraw_intake", "legal_aid_set_restricted_field", "legal_aid_reveal_restricted_field",
  "legal_aid_record_intake_view", "legal_aid_request_information", "legal_aid_withdraw_information_request",
  "legal_aid_start_review", "legal_aid_set_attorney_review", "legal_aid_record_decision", "legal_aid_record_document",
  "legal_aid_remove_document", "legal_aid_create_document_task", "legal_aid_transition_document_task",
  "legal_aid_replace_document_artifact", "legal_aid_save_next_step", "legal_aid_record_export",
  "legal_aid_set_external_case_reference", "legal_aid_record_access"
];
const ids = {
  internal: "10000000-0000-4000-8000-000000000001",
  adminA: "10000000-0000-4000-8000-000000000002",
  adminA2: "10000000-0000-4000-8000-000000000012",
  coordinator: "10000000-0000-4000-8000-000000000003",
  intakeReviewer: "10000000-0000-4000-8000-000000000004",
  attorney: "10000000-0000-4000-8000-000000000005",
  notary: "10000000-0000-4000-8000-000000000006",
  unassigned: "10000000-0000-4000-8000-000000000007",
  adminB: "10000000-0000-4000-8000-000000000008",
  applicantA: "10000000-0000-4000-8000-000000000009",
  applicantB: "10000000-0000-4000-8000-000000000010",
  outsider: "10000000-0000-4000-8000-000000000011",
  eventA: "20000000-0000-4000-8000-000000000001",
  eventStd: "20000000-0000-4000-8000-000000000002",
  eventB: "20000000-0000-4000-8000-000000000003",
  renderA: "60000000-0000-4000-8000-000000000001",
  renderB: "60000000-0000-4000-8000-000000000002",
  matterA: "50000000-0000-4000-8000-000000000001",
  matterB: "50000000-0000-4000-8000-000000000002"
};
const pseudonym = (suffix) => suffix.repeat(64).slice(0, 64);
const pseudoA = pseudonym("a");
const pseudoB = pseudonym("b");
const hash1 = "1".repeat(64);
const hash2 = "2".repeat(64);
const statementHash = "5".repeat(64);

const migrations = migrationPaths.map((p) => fs.readFileSync(path.join(root, p), "utf8"));
verifySource(migrations[4]);

const db = new PGlite();
try {
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
  await db.exec(stubs());
  await db.exec(migrations.join("\n"));
  await seed(db);
  await verifyPrivileges(db);
  const profileId = await verifyPolicyProfileAndEvent(db);
  await verifyRegistration(db);
  const intakeId = await verifyIntakeLifecycle(db, profileId);
  await verifyRestrictedFields(db, intakeId);
  await verifyReview(db, intakeId);
  await verifyDocumentsAndExecution(db, intakeId);
  await verifyExportAndReads(db, intakeId);
  await verifyStandardUntouched(db);
} finally {
  await db.close();
}

console.log("Legal Aid Clinic Mode schema/RLS/RPC suite passed (isolated PGlite; no external database).");

function verifySource(source) {
  const stripped = source.replace(/--.*$/gmu, "");
  for (const table of newTables) {
    assert.match(source, new RegExp(`create table public\\.${table}`, "iu"), `${table} table missing`);
    assert.match(source, new RegExp(`alter table public\\.${table} enable row level security`, "iu"), `${table} RLS missing`);
    assert.match(source, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`, "iu"), `${table} revoke missing`);
  }
  assert.ok(!/drop\s+(table|column)/iu.test(stripped), "legal-aid migration must be additive");
  assert.ok(!/create or replace function public\.clinic_(create_event|set_event_status|upsert_case|reserve_packet_credit|finalize_packet_credit|release_packet_credit|start_assisted_session)/iu.test(stripped),
    "legal-aid migration must not redefine Standard Clinic Mode controls");
  assert.ok(!/create policy [a-z_]+ on public\.legal_aid_restricted_fields/iu.test(stripped), "restricted fields must carry no browser-role policy");
  for (const forbidden of ["user_metadata", "app_metadata", "current_setting('request.jwt.claims", "email like", "@legalease"]) {
    assert.ok(!source.toLowerCase().includes(forbidden), `forbidden identity authority: ${forbidden}`);
  }
}

async function verifyPrivileges(db) {
  for (const table of newTables) {
    assert.equal(await scalar(db, `select relrowsecurity from pg_class where oid='public.${table}'::regclass`), true, `${table} must enforce RLS`);
    for (const privilege of ["INSERT", "UPDATE", "DELETE"]) {
      assert.equal(await scalar(db, `select has_table_privilege('authenticated','public.${table}','${privilege}')`), false, `${table} authenticated ${privilege} leaked`);
      assert.equal(await scalar(db, `select has_table_privilege('anon','public.${table}','${privilege}')`), false, `${table} anon ${privilege} leaked`);
    }
  }
  assert.equal(await scalar(db, "select has_table_privilege('authenticated','public.legal_aid_restricted_fields','SELECT')"), false, "browser role can select ciphertext");
  for (const fn of serviceOnlyFunctions) {
    const definition = await scalar(db, `select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='${fn}' limit 1`);
    assert.ok(definition, `${fn} missing`);
    assert.ok(definition.includes("SET search_path TO ''"), `${fn} must pin search_path`);
    assert.equal(await scalar(db, `select has_function_privilege('authenticated',p.oid,'EXECUTE') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='${fn}' limit 1`), false, `${fn} leaked browser execution`);
  }
  // The Standard Clinic Mode contract is untouched: the original permission
  // values and every original function still exist.
  for (const fn of ["clinic_create_event", "clinic_set_event_status", "clinic_reserve_packet_credit", "clinic_get_event_report"]) {
    assert.ok(await scalar(db, `select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='${fn}'`) > 0, `${fn} lost`);
  }
}

async function verifyPolicyProfileAndEvent(db) {
  const profileId = await scalar(db, `select public.legal_aid_prepare_policy_profile('${ids.adminA}','tenant-a','mvlp-intake-v1','{"household":{"definition":"applicant plus members of the same household"}}'::jsonb)`);
  assert.ok(profileId, "profile not prepared");
  await assert.rejects(() => serviceCall(db, `select public.legal_aid_prepare_policy_profile('${ids.adminB}','tenant-a','mvlp-intake-v1','{}'::jsonb)`), /legal_aid_profile_forbidden/);
  assert.equal(await scalar(db, `select public.legal_aid_approve_policy_profile('${ids.adminA}','${profileId}',null)`), "same_person", "preparer approved own profile");
  assert.equal(await scalar(db, `select public.legal_aid_approve_policy_profile('${ids.adminB}','${profileId}',null)`), "forbidden", "other tenant approved profile");
  // Configuring the draft event is allowed with a draft profile; publishing is not.
  assert.equal(await scalar(db, `select public.legal_aid_configure_event('${ids.adminA}','${ids.eventA}','${profileId}',now()-interval '1 day',now()+interval '30 days','walk_in','Court filing fees are not covered by the clinic.','Bring your court paperwork.')`), "configured");
  assert.equal(await scalar(db, `select experience from public.clinic_events where id='${ids.eventA}'`), "legal_aid");
  await assert.rejects(() => serviceCall(db, `select public.clinic_set_event_status('${ids.eventA}','${ids.adminA}','published')`), /legal_aid_policy_profile_not_approved/, "legal-aid event published on a draft profile");
  assert.equal(await scalar(db, `select status from public.clinic_events where id='${ids.eventA}'`), "draft", "legal-aid event published without an approved profile");
  assert.equal(await scalar(db, `select public.legal_aid_approve_policy_profile('${ids.adminA2}','${profileId}','Approved by the designated MVLP owner')`), "approved");
  assert.equal(await scalar(db, `select public.clinic_set_event_status('${ids.eventA}','${ids.adminA}','published')`), "updated");
  assert.equal(await scalar(db, `select status from public.clinic_events where id='${ids.eventA}'`), "published");
  return profileId;
}

async function verifyRegistration(db) {
  const register = (user, pseudo, key, name) => serviceCall(db,
    `select * from public.legal_aid_register('${ids.eventA}','${user}','${pseudo}','${key}','${name}','${name.toLowerCase().replace(/ /g, ".")}@rcap-acceptance.test',null,'email',null,'Needs a large-print form','public_web',null)`, true);
  const first = await register(ids.applicantA, pseudoA, "idem-applicant-a-000001", "Synthetic Applicant A");
  assert.equal(first[0].outcome, "registered");
  assert.equal(first[0].status, "received");
  const replay = await register(ids.applicantA, pseudoA, "idem-applicant-a-000001", "Synthetic Applicant A");
  assert.equal(replay[0].outcome, "already_registered", "refresh created a duplicate booking");
  assert.equal(replay[0].registration_id, first[0].registration_id);
  const otherKey = await register(ids.applicantA, pseudoA, "idem-applicant-a-000002", "Synthetic Applicant A");
  assert.equal(otherKey[0].outcome, "already_registered", "same person registered twice with a new key");
  assert.equal(await scalar(db, `select count(*)::int from public.clinic_registrations where event_id='${ids.eventA}'`), 1);
  // Capacity 1: the next person is waitlisted, atomically.
  const second = await register(ids.applicantB, pseudoB, "idem-applicant-b-000001", "Synthetic Applicant B");
  assert.equal(second[0].outcome, "waitlisted");
  assert.equal(second[0].status, "waitlisted");
  // Standard event refuses legal-aid registration outright.
  const standard = await serviceCall(db, `select * from public.legal_aid_register('${ids.eventStd}','${ids.applicantA}','${pseudoA}','idem-std-000001','Synthetic Applicant A','a@rcap-acceptance.test',null,'email',null,null,'public_web',null)`);
  assert.equal(standard[0].outcome, "event_unavailable");
  // Closed window refuses.
  await db.exec(`update public.clinic_events set registration_closes_at = now() - interval '1 minute' where id='${ids.eventA}'`);
  const closed = await serviceCall(db, `select * from public.legal_aid_register('${ids.eventA}','${ids.outsider}','${pseudonym("c")}','idem-c-000001','Synthetic Outsider','c@rcap-acceptance.test',null,'email',null,null,'public_web',null)`);
  assert.equal(closed[0].outcome, "registration_closed");
  await db.exec(`update public.clinic_events set registration_closes_at = now() + interval '30 days' where id='${ids.eventA}'`);
  // Participant may cancel own registration; staff without coordinator cannot confirm.
  assert.equal(await scalar(db, `select public.legal_aid_set_registration_status('${second[0].registration_id}','${ids.applicantA}','cancelled')`), "forbidden");
  assert.equal(await scalar(db, `select public.legal_aid_set_registration_status('${second[0].registration_id}','${ids.intakeReviewer}','confirmed')`), "forbidden");
  assert.equal(await scalar(db, `select public.legal_aid_set_registration_status('${second[0].registration_id}','${ids.coordinator}','confirmed')`), "updated");
  // Applicant A sees only own registration; staff reviewer sees the event's; other tenant sees none.
  assert.equal((await asUser(db, ids.applicantA, "select count(*)::int as count from public.clinic_registrations"))[0].count, 1);
  assert.equal((await asUser(db, ids.applicantB, "select count(*)::int as count from public.clinic_registrations"))[0].count, 1);
  assert.equal((await asUser(db, ids.intakeReviewer, "select count(*)::int as count from public.clinic_registrations"))[0].count, 2);
  assert.equal((await asUser(db, ids.adminB, "select count(*)::int as count from public.clinic_registrations"))[0].count, 0);
  assert.equal((await asUser(db, ids.outsider, "select count(*)::int as count from public.clinic_registrations"))[0].count, 0);
}

async function verifyIntakeLifecycle(db, profileId) {
  const answers1 = `{"name.first":{"state":"answered","value":"Synthetic"},"monthly_receipts.food_stamps":{"state":"answered","value":"250"},"is_us_citizen":{"state":"answered","value":"no"}}`;
  const created = await serviceCall(db, `select * from public.legal_aid_save_intake_draft('${ids.eventA}','${ids.applicantA}','${pseudoA}','${answers1}'::jsonb,'${hash1}','misdemeanor_expungement',null)`, true);
  assert.equal(created[0].outcome, "created");
  const intakeId = created[0].intake_id;
  assert.equal(await scalar(db, `select policy_profile_id from public.legal_aid_intakes where id='${intakeId}'`), profileId, "intake did not pin the event's profile");
  // Unregistered outsider cannot start an intake.
  const noReg = await serviceCall(db, `select * from public.legal_aid_save_intake_draft('${ids.eventA}','${ids.outsider}','${pseudonym("c")}','{}'::jsonb,'${hash1}',null,null)`);
  assert.equal(noReg[0].outcome, "registration_required");
  // Sign, then edit: the signature is superseded and submission refuses.
  await assert.rejects(() => serviceCall(db, `select public.legal_aid_sign_intake('${intakeId}','${ids.intakeReviewer}','financial_attestation','v1','${statementHash}','Synthetic Applicant A','typed',null)`), /legal_aid_signer_mismatch/, "a volunteer signed as the applicant");
  await serviceCall(db, `select public.legal_aid_sign_intake('${intakeId}','${ids.applicantA}','financial_attestation','v1','${statementHash}','Synthetic Applicant A','typed',null)`, true);
  const stale = await serviceCall(db, `select * from public.legal_aid_save_intake_draft('${ids.eventA}','${ids.applicantA}','${pseudoA}','${answers1}'::jsonb,'${hash2}','misdemeanor_expungement',7)`);
  assert.equal(stale[0].outcome, "version_conflict", "optimistic version was ignored");
  const edited = await serviceCall(db, `select * from public.legal_aid_save_intake_draft('${ids.eventA}','${ids.applicantA}','${pseudoA}','${answers1}'::jsonb,'${hash2}','misdemeanor_expungement',1)`, true);
  assert.equal(edited[0].outcome, "saved");
  assert.equal(edited[0].version, 2);
  assert.equal(await scalar(db, `select status from public.legal_aid_intake_signatures where intake_id='${intakeId}'`), "superseded", "material edit inherited an old signature");
  assert.match(await scalar(db, `select public.legal_aid_submit_intake('${intakeId}','${ids.applicantA}',array['financial_attestation'])`), /^signature_required:financial_attestation$/);
  // The noncitizen answer must not require the citizenship statement: the
  // caller passes only the statements that apply. Re-sign and submit.
  await serviceCall(db, `select public.legal_aid_sign_intake('${intakeId}','${ids.applicantA}','financial_attestation','v1','${statementHash}','Synthetic Applicant A','typed',null)`, true);
  await serviceCall(db, `select public.legal_aid_sign_intake('${intakeId}','${ids.applicantA}','noncitizen_review_acknowledgment','v1','${statementHash}','Synthetic Applicant A','typed',null)`, true);
  assert.equal(await scalar(db, `select public.legal_aid_submit_intake('${intakeId}','${ids.applicantB}',array['financial_attestation'])`), "forbidden");
  assert.equal(await scalar(db, `select public.legal_aid_submit_intake('${intakeId}','${ids.applicantA}',array['financial_attestation','noncitizen_review_acknowledgment'])`), "submitted");
  assert.equal(await scalar(db, `select public.legal_aid_submit_intake('${intakeId}','${ids.applicantA}',array['financial_attestation'])`), "already_submitted", "double submit was not idempotent");
  assert.equal(await scalar(db, `select count(*)::int from public.legal_aid_intakes where event_id='${ids.eventA}'`), 1);
  assert.ok(await scalar(db, `select clinic_case_id from public.legal_aid_intakes where id='${intakeId}'`), "submission did not bind a clinic case");
  assert.equal(await scalar(db, `select queue_status from public.clinic_cases c join public.legal_aid_intakes i on i.clinic_case_id=c.id where i.id='${intakeId}'`), "needs_information");
  // Submitted intake is read-only for the applicant.
  const locked = await serviceCall(db, `select * from public.legal_aid_save_intake_draft('${ids.eventA}','${ids.applicantA}','${pseudoA}','${answers1}'::jsonb,'${hash1}',null,null)`);
  assert.equal(locked[0].outcome, "not_editable");
  return intakeId;
}

async function verifyRestrictedFields(db, intakeId) {
  // Restricted write needs a draft or needs_information intake; reopen via an information request first.
  const requestId = await scalar(db, `select public.legal_aid_request_information('${intakeId}','${ids.intakeReviewer}','Please add the county where the case was filed.')`);
  assert.ok(requestId);
  assert.equal(await scalar(db, `select status from public.legal_aid_intakes where id='${intakeId}'`), "needs_information");
  await assert.rejects(() => serviceCall(db, `select public.legal_aid_set_restricted_field('${intakeId}','${ids.notary}','ssn','ciphertext-placeholder-0001','v1','1234')`), /legal_aid_restricted_forbidden/, "notary wrote a restricted field");
  await serviceCall(db, `select public.legal_aid_set_restricted_field('${intakeId}','${ids.applicantA}','ssn','ciphertext-placeholder-0001','v1','1234')`, true);
  await serviceCall(db, `select public.legal_aid_set_restricted_field('${intakeId}','${ids.applicantA}','ssn','ciphertext-placeholder-0002','v1','1234')`, true);
  assert.equal(await scalar(db, `select count(*)::int from public.legal_aid_restricted_fields where intake_id='${intakeId}'`), 1);
  assert.equal(await scalar(db, `select ciphertext from public.legal_aid_restricted_fields where intake_id='${intakeId}'`), "ciphertext-placeholder-0002");
  for (const actor of [ids.intakeReviewer, ids.notary, ids.applicantA, ids.adminB, ids.outsider]) {
    await assert.rejects(() => serviceCall(db, `select * from public.legal_aid_reveal_restricted_field('${intakeId}','${actor}','ssn','court filing')`), /legal_aid_restricted_forbidden/, `reveal leaked to ${actor}`);
  }
  await assert.rejects(() => serviceCall(db, `select * from public.legal_aid_reveal_restricted_field('${intakeId}','${ids.attorney}','ssn','')`), /legal_aid_purpose_required/);
  const revealed = await serviceCall(db, `select * from public.legal_aid_reveal_restricted_field('${intakeId}','${ids.attorney}','ssn','Preparing the petition caption')`, true);
  assert.equal(revealed[0].ciphertext, "ciphertext-placeholder-0002");
  assert.equal(await scalar(db, `select count(*)::int from public.legal_aid_access_audit where intake_id='${intakeId}' and action='restricted_revealed' and actor_user_id='${ids.attorney}'`), 1, "reveal was not audited");
  // Browser roles cannot read ciphertext under any identity.
  for (const actor of [ids.applicantA, ids.attorney, ids.coordinator, ids.internal]) {
    await assert.rejects(() => asUser(db, actor, "select ciphertext from public.legal_aid_restricted_fields"), undefined, `browser role ${actor} read ciphertext`);
  }
  // Resubmit so review can proceed.
  await serviceCall(db, `select public.legal_aid_sign_intake('${intakeId}','${ids.applicantA}','financial_attestation','v1','${statementHash}','Synthetic Applicant A','typed',null)`, true);
  await serviceCall(db, `select public.legal_aid_sign_intake('${intakeId}','${ids.applicantA}','noncitizen_review_acknowledgment','v1','${statementHash}','Synthetic Applicant A','typed',null)`, true);
  assert.equal(await scalar(db, `select public.legal_aid_submit_intake('${intakeId}','${ids.applicantA}',array['financial_attestation','noncitizen_review_acknowledgment'])`), "submitted");
  assert.equal(await scalar(db, `select status from public.legal_aid_information_requests where id='${requestId}'`), "fulfilled");
}

async function verifyReview(db, intakeId) {
  assert.equal(await scalar(db, `select public.legal_aid_start_review('${intakeId}','${ids.unassigned}')`), "forbidden");
  assert.equal(await scalar(db, `select public.legal_aid_start_review('${intakeId}','${ids.notary}')`), "forbidden");
  assert.equal(await scalar(db, `select public.legal_aid_start_review('${intakeId}','${ids.intakeReviewer}')`), "updated");
  // Program decision requires program_review; intake reviewer alone cannot approve.
  await assert.rejects(() => serviceCall(db, `select public.legal_aid_record_decision('${intakeId}','${ids.intakeReviewer}','program_eligibility','approved','Looks fine',null,'{}'::jsonb)`), /legal_aid_decision_forbidden/);
  // Attorney review requires the attorney assignment.
  await assert.rejects(() => serviceCall(db, `select public.legal_aid_record_decision('${intakeId}','${ids.coordinator}','attorney_review','reviewed','Reviewed',null,'{}'::jsonb)`), /legal_aid_decision_forbidden/);
  assert.equal(await scalar(db, `select public.legal_aid_set_attorney_review('${intakeId}','${ids.attorney}','in_review')`), "updated");
  await serviceCall(db, `select public.legal_aid_record_decision('${intakeId}','${ids.coordinator}','program_eligibility','approved','Household and income reviewed under MVLP profile v1; noncitizen status routed to confidential review and resolved by the program reviewer.','mvlp-profile-v1/finance','{"countable_income_basis":"reviewer"}'::jsonb)`, true);
  assert.equal(await scalar(db, `select status from public.legal_aid_intakes where id='${intakeId}'`), "approved");
  assert.equal(await scalar(db, `select program_decision from public.legal_aid_intakes where id='${intakeId}'`), "approved");
  await serviceCall(db, `select public.legal_aid_record_decision('${intakeId}','${ids.attorney}','attorney_review','reviewed','Case facts support a non-conviction expungement petition.',null,'{}'::jsonb)`, true);
  assert.equal(await scalar(db, `select attorney_review_status from public.legal_aid_intakes where id='${intakeId}'`), "reviewed");
  assert.equal(await scalar(db, `select count(*)::int from public.legal_aid_review_decisions where intake_id='${intakeId}'`), 2);
  // Program approval changed nothing about the packet route or sponsorship.
  assert.equal(await scalar(db, `select route_disposition from public.clinic_cases c join public.legal_aid_intakes i on i.clinic_case_id=c.id where i.id='${intakeId}'`), "pending", "program approval leaked into packet authority");
}

async function verifyDocumentsAndExecution(db, intakeId) {
  // A participant cannot record an executed document; staff can.
  await assert.rejects(() => serviceCall(db, `select public.legal_aid_record_document('${intakeId}','${ids.applicantA}','executed_document','legal-aid/${intakeId}/x.pdf','x.pdf','application/pdf',100,'${hash1}')`), /legal_aid_document_forbidden/);
  await assert.rejects(() => serviceCall(db, `select public.legal_aid_record_document('${intakeId}','${ids.applicantA}','court_record','legal-aid/other/x.pdf','x.pdf','application/pdf',100,'${hash1}')`), /legal_aid_storage_path_invalid/);
  const courtDoc = await scalar(db, `select public.legal_aid_record_document('${intakeId}','${ids.applicantA}','court_record','legal-aid/${intakeId}/court-record-0001.pdf','order.pdf','application/pdf',1200,'${hash1}')`);
  assert.ok(courtDoc);
  // Document task bound to the applicant's own render job; another person's job is refused.
  await assert.rejects(() => serviceCall(db, `select public.legal_aid_create_document_task('${intakeId}','${ids.attorney}','ms-petition','Petition for expungement','applicant_and_notary','notary_jurat','MS approved pleading; verification before a notary','ms-2026-09','${ids.renderB}','${hash1}')`), /legal_aid_render_job_owner_mismatch/);
  await assert.rejects(() => serviceCall(db, `select public.legal_aid_create_document_task('${intakeId}','${ids.notary}','ms-petition','Petition for expungement','applicant_and_notary','notary_jurat',null,null,null,null)`), /legal_aid_task_forbidden/);
  const taskId = await scalar(db, `select public.legal_aid_create_document_task('${intakeId}','${ids.attorney}','ms-petition','Petition for expungement','applicant_and_notary','notary_jurat','MS approved pleading; verification before a notary','ms-2026-09','${ids.renderA}','${hash1}')`);
  assert.equal(await scalar(db, `select matter_id from public.legal_aid_document_tasks where id='${taskId}'`), ids.matterA);
  const move = (actor, status, doc = null) => scalar(db, `select public.legal_aid_transition_document_task('${taskId}','${actor}','${status}',${doc ? `'${doc}'` : "null"},null)`);
  assert.equal(await move(ids.coordinator, "attorney_reviewed"), "invalid_transition", "non-attorney marked attorney review");
  assert.equal(await move(ids.attorney, "attorney_reviewed"), "updated");
  assert.equal(await move(ids.attorney, "ready_for_execution"), "updated");
  // Printing / handing the unsigned copy can only mark it pending.
  assert.equal(await move(ids.notary, "signature_or_notary_pending"), "updated");
  assert.equal(await move(ids.notary, "ready_to_file"), "invalid_transition", "pending task jumped to ready to file");
  assert.equal(await move(ids.notary, "executed_copy_received"), "invalid_transition", "executed copy recorded without a document");
  assert.equal(await move(ids.notary, "executed_copy_received", courtDoc), "invalid_transition", "a non-executed document counted as the executed copy");
  const executed = await scalar(db, `select public.legal_aid_record_document('${intakeId}','${ids.notary}','executed_document','legal-aid/${intakeId}/executed-0001.pdf','executed.pdf','application/pdf',2200,'${hash2}')`);
  assert.equal(await move(ids.notary, "executed_copy_received", executed), "updated");
  assert.equal(await move(ids.notary, "execution_reviewed"), "invalid_transition", "notary reviewed execution");
  assert.equal(await move(ids.attorney, "execution_reviewed"), "updated");
  assert.equal(await move(ids.attorney, "ready_to_file"), "updated");
  // A changed unsigned artifact cannot inherit the execution.
  assert.equal(await scalar(db, `select public.legal_aid_replace_document_artifact('${taskId}','${ids.attorney}','${ids.renderA}','${hash2}')`), "replaced");
  assert.equal(await scalar(db, `select status from public.legal_aid_document_tasks where id='${taskId}'`), "attorney_reviewed");
  assert.equal(await scalar(db, `select executed_document_id from public.legal_aid_document_tasks where id='${taskId}'`), null, "replaced artifact kept the old executed copy");
  assert.equal(await scalar(db, `select public.legal_aid_remove_document('${executed}','${ids.applicantA}')`), "forbidden");
  // Next steps require follow_up / attorney / coordinator.
  await assert.rejects(() => serviceCall(db, `select public.legal_aid_save_next_step(null,'${intakeId}','${ids.notary}','Bring photo ID','Bring a photo ID to the notary',null,null,'pending')`), /legal_aid_next_step_forbidden/);
  const step = await scalar(db, `select public.legal_aid_save_next_step(null,'${intakeId}','${ids.coordinator}','Sign before a notary','Take the printed petition to the clinic notary table.',now()+interval '7 days',null,'pending')`);
  assert.ok(step);
}

async function verifyExportAndReads(db, intakeId) {
  await assert.rejects(() => serviceCall(db, `select public.legal_aid_record_export('${intakeId}','${ids.attorney}','${hash1}','legal-aid/${intakeId}/exports/1.json',false,null)`), /legal_aid_export_forbidden/, "attorney without export permission exported");
  await assert.rejects(() => serviceCall(db, `select public.legal_aid_record_export('${intakeId}','${ids.intakeReviewer}','${hash1}','legal-aid/${intakeId}/exports/1.json',true,null)`), /legal_aid_restricted_forbidden/, "export with restricted data by a non-attorney");
  const exportId = await scalar(db, `select public.legal_aid_record_export('${intakeId}','${ids.intakeReviewer}','${hash1}','legal-aid/${intakeId}/exports/1.json',false,'MVLP case file')`);
  assert.ok(exportId);
  assert.equal(await scalar(db, `select export_version from public.legal_aid_case_exports where id='${exportId}'`), 1);
  assert.equal(await scalar(db, `select public.legal_aid_set_external_case_reference('${intakeId}','${ids.coordinator}','MVLP-2026-000123')`), "updated");
  // RLS reads under browser roles.
  const count = async (actor, sql) => (await asUser(db, actor, sql))[0].count;
  assert.equal(await count(ids.applicantA, "select count(*)::int as count from public.legal_aid_intakes"), 1);
  assert.equal(await count(ids.applicantB, "select count(*)::int as count from public.legal_aid_intakes"), 0, "applicant B read applicant A's intake");
  assert.equal(await count(ids.intakeReviewer, "select count(*)::int as count from public.legal_aid_intakes"), 1);
  assert.equal(await count(ids.attorney, "select count(*)::int as count from public.legal_aid_intakes"), 1);
  assert.equal(await count(ids.notary, "select count(*)::int as count from public.legal_aid_intakes"), 0, "notary read the full intake");
  assert.equal(await count(ids.notary, "select count(*)::int as count from public.legal_aid_document_tasks"), 1, "notary cannot see the execution task");
  assert.equal(await count(ids.unassigned, "select count(*)::int as count from public.legal_aid_intakes"), 0, "unassigned tenant staff read the intake");
  assert.equal(await count(ids.adminB, "select count(*)::int as count from public.legal_aid_intakes"), 0, "other tenant read the intake");
  assert.equal(await count(ids.outsider, "select count(*)::int as count from public.legal_aid_intakes"), 0, "outsider read the intake");
  assert.equal(await count(ids.applicantA, "select count(*)::int as count from public.legal_aid_review_decisions"), 0, "applicant read reviewer rationale");
  assert.equal(await count(ids.applicantA, "select count(*)::int as count from public.legal_aid_next_steps"), 1);
  assert.equal(await count(ids.applicantA, "select count(*)::int as count from public.legal_aid_case_exports"), 0);
  assert.equal(await count(ids.adminA, "select count(*)::int as count from public.legal_aid_case_exports"), 1);
  assert.equal(await count(ids.internal, "select count(*)::int as count from public.legal_aid_intakes"), 1);
  // Revocation removes access immediately.
  await db.exec(`update public.clinic_event_staff set status='revoked', revoked_at=now() where partner_user_id='90000000-0000-4000-8000-000000000004'`);
  assert.equal(await count(ids.intakeReviewer, "select count(*)::int as count from public.legal_aid_intakes"), 0, "revoked staff kept access");
  assert.equal(await scalar(db, `select public.legal_aid_start_review('${intakeId}','${ids.intakeReviewer}')`), "forbidden");
}

async function verifyStandardUntouched(db) {
  assert.equal(await scalar(db, `select experience from public.clinic_events where id='${ids.eventStd}'`), "standard");
  assert.equal(await scalar(db, `select public.clinic_set_event_status('${ids.eventStd}','${ids.adminA}','published')`), "updated", "standard event publication changed");
  const standardStaff = await serviceCall(db, `select public.clinic_set_event_staff('${ids.adminA}','${ids.eventStd}','90000000-0000-4000-8000-000000000003','approved',array['assist','queue'])`, true);
  assert.ok(standardStaff[0]);
  const report = await scalar(db, `select public.clinic_get_event_report('${ids.eventStd}','${ids.adminA}')`);
  assert.equal(report.eventStatus, "published");
}

async function seed(db) {
  await db.exec(`
    insert into auth.users(id) values ('${ids.internal}'),('${ids.adminA}'),('${ids.adminA2}'),('${ids.coordinator}'),('${ids.intakeReviewer}'),('${ids.attorney}'),('${ids.notary}'),('${ids.unassigned}'),('${ids.adminB}'),('${ids.applicantA}'),('${ids.applicantB}'),('${ids.outsider}');
    insert into public.partner_records(id, partner_slug) values ('80000000-0000-4000-8000-000000000001','tenant-a'),('80000000-0000-4000-8000-000000000002','tenant-b');
    insert into public.partner_users(id, auth_user_id, partner_slug, role, status) values
      ('90000000-0000-4000-8000-000000000001','${ids.internal}',null,'internal_admin','active'),
      ('90000000-0000-4000-8000-000000000002','${ids.adminA}','tenant-a','partner_admin','active'),
      ('90000000-0000-4000-8000-000000000012','${ids.adminA2}','tenant-a','partner_admin','active'),
      ('90000000-0000-4000-8000-000000000003','${ids.coordinator}','tenant-a','partner_staff','active'),
      ('90000000-0000-4000-8000-000000000004','${ids.intakeReviewer}','tenant-a','partner_staff','active'),
      ('90000000-0000-4000-8000-000000000005','${ids.attorney}','tenant-a','partner_staff','active'),
      ('90000000-0000-4000-8000-000000000006','${ids.notary}','tenant-a','partner_staff','active'),
      ('90000000-0000-4000-8000-000000000007','${ids.unassigned}','tenant-a','partner_staff','active'),
      ('90000000-0000-4000-8000-000000000008','${ids.adminB}','tenant-b','partner_admin','active');
    insert into public.clinic_events(id, partner_slug, public_slug, name, starts_at, ends_at, timezone, location_name, geography, capacity, status, sponsorship_allocation, created_by, jurisdiction) values
      ('${ids.eventA}','tenant-a','tenant-a-legal-aid','Tenant A legal aid clinic','2026-10-01T15:00:00Z','2026-10-01T21:00:00Z','America/Chicago','Community center','Mississippi',1,'draft',2,'${ids.adminA}','MS'),
      ('${ids.eventStd}','tenant-a','tenant-a-standard','Tenant A standard clinic','2026-10-02T15:00:00Z','2026-10-02T21:00:00Z','America/Chicago','Library','Mississippi',50,'draft',null,'${ids.adminA}','MS'),
      ('${ids.eventB}','tenant-b','tenant-b-clinic','Tenant B clinic','2026-10-03T15:00:00Z','2026-10-03T21:00:00Z','America/Chicago','Center','Mississippi',50,'published',null,'${ids.adminB}','MS');
    insert into public.clinic_event_staff(event_id, partner_user_id, approved_by, status, permissions) values
      ('${ids.eventA}','90000000-0000-4000-8000-000000000003','${ids.adminA}','approved',array['coordinator','program_review','follow_up','export']),
      ('${ids.eventA}','90000000-0000-4000-8000-000000000004','${ids.adminA}','approved',array['intake_review','export']),
      ('${ids.eventA}','90000000-0000-4000-8000-000000000005','${ids.adminA}','approved',array['attorney']),
      ('${ids.eventA}','90000000-0000-4000-8000-000000000006','${ids.adminA}','approved',array['notary']);
    insert into public.consumer_briefcase_items(id,user_id) values ('${ids.matterA}','${ids.applicantA}'),('${ids.matterB}','${ids.applicantB}');
    insert into public.packet_render_jobs(id, status, accounting_result, partner_id, matter_id, consumer_auth_user_id) values
      ('${ids.renderA}','artifact_validated','consumed','80000000-0000-4000-8000-000000000001','${ids.matterA}','${ids.applicantA}'),
      ('${ids.renderB}','artifact_validated','consumed','80000000-0000-4000-8000-000000000001','${ids.matterB}','${ids.applicantB}');
  `);
}

function stubs() {
  return `
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    create table public.partner_records(id uuid primary key, partner_slug text unique not null);
    create table public.partner_users(id uuid primary key, auth_user_id uuid unique not null references auth.users(id), partner_slug text references public.partner_records(partner_slug), role text not null, status text not null);
    create table public.screening_sessions(session_id uuid primary key);
    create table public.consumer_briefcase_items(id uuid primary key, user_id uuid not null references auth.users(id));
    create table public.packet_credit_ledger(id uuid primary key);
    create table public.packet_render_jobs(
      id uuid primary key, status text not null, accounting_result text, failure_disposition text,
      credit_ledger_id uuid references public.packet_credit_ledger(id), partner_id uuid references public.partner_records(id),
      matter_id uuid, consumer_auth_user_id uuid references auth.users(id)
    );
    grant usage on schema public to anon, authenticated, service_role;
    grant usage on schema auth to anon, authenticated, service_role;
    grant select on auth.users, public.partner_records, public.partner_users, public.screening_sessions, public.consumer_briefcase_items, public.packet_render_jobs, public.packet_credit_ledger to service_role;
  `;
}

async function asUser(db, userId, sql) {
  return asRole(db, "authenticated", userId, sql);
}

async function serviceCall(db, sql, commit = false) {
  return asRole(db, "service_role", null, sql, commit);
}

async function asRole(db, role, userId, sql, commit = false) {
  await db.exec("begin");
  try {
    await db.exec(`set local role ${role}`);
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
    const result = await db.query(sql);
    await db.exec(commit ? "commit" : "rollback");
    return result.rows;
  } catch (error) {
    await db.exec("rollback");
    throw error;
  }
}

async function scalar(db, sql) {
  const rows = await serviceCall(db, sql, true);
  const row = rows[0];
  return row ? Object.values(row)[0] : undefined;
}
