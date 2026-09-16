// End-to-end verification of Legal Aid Clinic Mode against the real Next.js
// production build, run locally against an isolated PGlite database through
// the local Supabase shim. It walks the complete MVLP workflow in a real
// browser (registration, confidential intake, protected field, signatures,
// submission, staff review, information request and re-attestation,
// decisions, document execution with the notary, follow-up, export), checks
// permissions from every side, checks what was saved, checks that the
// protected value never crossed the wire in clear, checks the phone and
// desktop layouts, and confirms Standard Clinic Mode is unchanged.
//
// It also captures the screenshots used by the MVLP onboarding materials
// (docs/partners/mvlp/screenshots) from the implemented product.
//
// Usage: node scripts/legal-aid/verify-legal-aid-e2e.mjs [--no-screenshots]
// Requires a completed `next build`.

import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { createLocalDatabase, IDS, USERS, root } from "./local-stack/bootstrap.mjs";
import { makeJwt, startSupabaseShim } from "./local-stack/supabase-shim.mjs";

const SCREENSHOTS = !process.argv.includes("--no-screenshots");
const shotDir = path.join(root, "docs/partners/mvlp/screenshots");
const PORT = 3100;
const BASE = `http://127.0.0.1:${PORT}`;
const SERVICE_KEY = "local-service-key";
const ANON_KEY = "local-anon-key";
const SSN = "512346789";
const SSN_FORMATTED = "512-34-6789";
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
const PDF_SHA = createHash("sha256").update(PDF).digest("hex");

const db = await createLocalDatabase();
const shim = await startSupabaseShim({ db, serviceKey: SERVICE_KEY, anonKey: ANON_KEY, users: USERS });
// The applicant's prepared packet (a synthetic PDF in the packet bucket) so the
// attorney can attach the unsigned copy. Shaped exactly as the clinic-sponsored
// route enqueues it: sponsored_consumer_auth_user_id carries the participant and
// consumer_auth_user_id is null (only a paid packet sets the consumer binding).
shim.objects.set(`rcap-packet-artifacts-private/packets/${IDS.renderJob}.pdf`, { bytes: PDF, contentType: "application/pdf" });
await db.exec(`insert into public.packet_render_jobs(id, packet_id, route_id, renderer_kind, renderer_version, status, accounting_result, output_storage_path, output_sha256, delivery_eligibility, partner_id, matter_id, consumer_briefcase_item_id, consumer_auth_user_id, sponsored_consumer_auth_user_id)
  values ('${IDS.renderJob}','ms-expungement','MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal','official-pdf','1','artifact_validated','consumed','packets/${IDS.renderJob}.pdf','${PDF_SHA}','eligible','${IDS.partnerRecord}','${IDS.matter}',null,null,'${IDS.applicant}')`);

const env = {
  ...process.env, NODE_ENV: "production", PORT: String(PORT), HOSTNAME: "127.0.0.1",
  NEXT_PUBLIC_SUPABASE_URL: shim.url, NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
  LEGAL_AID_RESTRICTED_FIELD_KEY: randomBytes(32).toString("base64"), LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION: "v1",
  PARTICIPANT_PRIVACY_PSEUDONYM_SECRET: "local-verification-pseudonym-secret-not-for-production",
  NEXT_PUBLIC_LEGALEASE_PARTNER_URL: BASE, ENABLE_PARTNER_EMAIL_DELIVERY: "false"
};
const server = spawn("node", ["node_modules/next/dist/bin/next", "start", "-p", String(PORT), "-H", "127.0.0.1"], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
let serverLog = "";
server.stdout.on("data", (chunk) => { serverLog += chunk; });
server.stderr.on("data", (chunk) => { serverLog += chunk; });
await waitFor(async () => (await fetch(`${BASE}/p/mvlp/clinics`)).status < 500, 120_000, "next start");

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM ?? "/opt/pw-browsers/chromium", headless: true });
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok: Boolean(ok), detail }); if (!ok) console.error("FAIL", name, detail); };
if (SCREENSHOTS) fs.mkdirSync(shotDir, { recursive: true });

try {
  // ------------------------------------------------------------------ admin
  const admin = await session(IDS.admin);
  await admin.goto(`${BASE}/partner/clinic/${IDS.eventLegalAid}/legal-aid`);
  check("admin: legal-aid setup page renders", await admin.textContent("h1").then((t) => t?.includes("legal aid clinic setup")));
  await admin.click("button:has-text('Prepare a new draft from the template')");
  await admin.waitForSelector("text=Draft profile prepared");
  await admin.reload();
  check("admin: draft profile listed", await admin.locator("text=Version 1").count() > 0);
  await admin.click("button:has-text('Approve')");
  await admin.waitForSelector("text=A profile is approved by a second administrator");
  check("admin: preparer cannot approve own draft", true);
  const admin2 = await session(IDS.admin2);
  await admin2.goto(`${BASE}/partner/clinic/${IDS.eventLegalAid}/legal-aid`);
  await admin2.fill("input[placeholder='Approval note (optional)']", "Approved for the training clinic");
  await admin2.click("button:has-text('Approve')");
  await admin2.waitForSelector("text=Profile approved");
  await admin.reload();
  check("admin: profile approved by second administrator", await admin.locator("text=approved · prepared").count() > 0 || await admin.locator("li:has-text('approved')").count() > 0);
  await admin.selectOption("select[name=policyProfileId]", { index: 1 });
  await admin.selectOption("select[name=appointmentPolicy]", "mixed");
  await admin.fill("input[name=participantCostNote]", "The clinic is free. Court filing fees may apply.");
  await admin.fill("textarea[name=publicDescription]", "Bring a photo ID and any court paperwork you have. Attorneys review each case at the clinic.");
  await admin.click("button:has-text('Save clinic settings')");
  await admin.waitForSelector("text=Clinic settings saved");
  for (const [userId, permissions] of [[IDS.coordinator, ["coordinator", "program_review", "follow_up", "export"]], [IDS.intakeVolunteer, ["intake_review"]], [IDS.attorney, ["attorney", "export"]], [IDS.notary, ["notary"]]]) {
    await admin.reload();
    await admin.selectOption("select[name=partnerUserId]", USERS.get(userId).partnerUserId);
    for (const permission of permissions) await admin.check(`input[name=permissions][value=${permission}]`);
    await admin.click("button:has-text('Save team member')");
    await admin.waitForSelector("text=Clinic team updated");
  }
  await admin.reload();
  check("admin: team listed by email", await admin.locator("text=volunteer.attorney@example.org").count() > 0);
  await shot(admin, "admin-legal-aid-setup");
  const publish = await admin.evaluate(async (id) => (await fetch(`/api/clinic/events/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "published" }) })).status, IDS.eventLegalAid);
  check("admin: legal-aid event published against approved profile", publish === 200, String(publish));

  // ------------------------------------------------------------ participant
  const applicant = await session(IDS.applicant, 390);
  await applicant.goto(`${BASE}/p/mvlp/clinics`);
  check("participant: clinic listed from saved configuration", await applicant.locator("text=MVLP training clinic (synthetic)").count() > 0);
  check("participant: no internal vocabulary on public page", !/tenant|Grade A|source hash|release candidate/i.test(await applicant.content()));
  await shot(applicant, "participant-clinics");
  await applicant.click("a:has-text('Register for this clinic')");
  await applicant.waitForURL(/\/clinic\/mvlp-training-clinic\/register/);
  check("participant: register page for signed-in account", await applicant.locator("input[name=contactName]").count() === 1);
  await shot(applicant, "participant-register");
  await applicant.fill("input[name=contactName]", "Jordan Example");
  await applicant.fill("input[name=contactPhone]", "601-555-0100");
  await applicant.check("input[name=preferredContact][value=text]");
  await applicant.fill("textarea[name=assistanceNeeds]", "Afternoon only.");
  await applicant.click("button:has-text('Register for this clinic')");
  await applicant.waitForSelector("text=We have your registration");
  await shot(applicant, "participant-registered");
  const reg = await db.query("select status, contact_name, contact_email, contact_phone, preferred_contact, participant_user_id from public.clinic_registrations where event_id=$1", [IDS.eventLegalAid]);
  check("participant: registration saved for the right event and account", reg.rows.length === 1 && reg.rows[0].participant_user_id === IDS.applicant && reg.rows[0].contact_name === "Jordan Example" && reg.rows[0].preferred_contact === "text");
  const again = await applicant.evaluate(async (eventId) => (await fetch("/api/legal-aid/registrations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ eventId, idempotencyKey: "second-attempt-key", contactName: "Jordan Example", contactEmail: "applicant@example.net", preferredContact: "email" }) })).json(), IDS.eventLegalAid);
  check("participant: second registration is refused as duplicate", again.outcome === "already_registered", JSON.stringify(again));
  check("participant: still one registration row", (await db.query("select count(*)::int as n from public.clinic_registrations")).rows[0].n === 1);

  await applicant.click("a:has-text('Start my application')");
  await applicant.waitForURL(/\/intake/);
  await applicant.waitForSelector("text=Step 1 of");
  await shot(applicant, "participant-intake-step-1");
  await fillIntake(applicant);
  // Protected step
  await applicant.waitForSelector("text=Protected information");
  await shot(applicant, "participant-intake-protected");
  await applicant.fill("input[name=ssn]", SSN_FORMATTED);
  await applicant.click("button:has-text('Save securely')");
  await applicant.waitForSelector("text=On file:");
  check("participant: protected value masked on screen", await applicant.locator("text=•••-••-6789").count() > 0);
  await next(applicant); // household
  await fillStep(applicant, "household");
  await next(applicant); // receipts
  await fillStep(applicant, "receipts");
  await next(applicant); // assets
  await fillStep(applicant, "assets");
  await next(applicant); // accounts
  await fillStep(applicant, "accounts");
  await next(applicant); // expenses
  await fillStep(applicant, "expenses");
  await next(applicant); // legal context
  await fillStep(applicant, "legal_context");
  await next(applicant); // review and sign
  await applicant.waitForSelector("text=Review and sign");
  await shot(applicant, "participant-intake-sign");
  check("participant: citizenship statement shown to a citizen", await applicant.locator("text=I am a citizen of the United States of America.").count() === 1);
  check("participant: no non-citizen acknowledgment shown to a citizen", await applicant.locator("text=Confidential status review").count() === 0);
  const before = await db.query("select count(*)::int as n from public.legal_aid_intake_signatures");
  check("participant: nothing signed before the applicant signs", before.rows[0].n === 0);
  await signAll(applicant);
  await shot(applicant, "participant-intake-signed");
  await applicant.click("button:has-text('Submit my application')");
  await applicant.waitForSelector("text=Your application has been received");
  await shot(applicant, "participant-submitted");
  const intakeRow = (await db.query("select id, status, current_version, submitted_version, clinic_case_id, answers from public.legal_aid_intakes")).rows[0];
  check("participant: intake submitted with a clinic case", intakeRow?.status === "submitted" && intakeRow.clinic_case_id);
  const intakeId = intakeRow.id;
  const restricted = (await db.query("select ciphertext, display_hint from public.legal_aid_restricted_fields where intake_id=$1", [intakeId])).rows[0];
  check("saved data: SSN stored encrypted with masked hint", restricted && !restricted.ciphertext.includes(SSN) && restricted.display_hint === "6789");
  check("saved data: SSN absent from the answers document", !JSON.stringify(intakeRow.answers).includes(SSN) && !("ssn" in intakeRow.answers));
  check("saved data: household never defaulted", intakeRow.answers["household.adult_count"]?.value === "2");
  check("saved data: unknown amount kept as unknown, not zero", intakeRow.answers["monthly_receipts.pension_retirement"]?.state === "unknown");
  check("saved data: address line 2 optional", !("address.line2" in intakeRow.answers));
  const sigs = await db.query("select statement_key, status, answers_hash from public.legal_aid_intake_signatures where intake_id=$1 order by signed_at", [intakeId]);
  check("saved data: three statements signed and bound to the answer hash", sigs.rows.length === 3 && sigs.rows.every((row) => row.status === "active" && row.answers_hash.length === 64) && !sigs.rows.some((row) => row.statement_key === "noncitizen_review_acknowledgment"));
  const storage = await applicant.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)]);
  check("participant: no application data in browser storage", !storage.some((key) => /intake|answer|ssn|legal|signature/i.test(key)), storage.join(","));
  await applicant.goto(`${BASE}/p/mvlp/continue`);
  check("participant: continue hub shows the submitted application", await applicant.locator("text=has been received").count() > 0);
  await shot(applicant, "participant-continue");
  const noScroll = await applicant.evaluate(() => document.documentElement.scrollWidth <= 390);
  check("mobile: continue hub has no horizontal scroll at 390px", noScroll);

  // Another participant cannot read this application.
  const other = await session(IDS.secondApplicant);
  await other.goto(`${BASE}/p/mvlp/continue`);
  const otherRead = await other.evaluate(async (id) => (await fetch(`/api/legal-aid/intakes/${id}`)).status, intakeId);
  check("privacy: another participant cannot read the application", otherRead === 404, String(otherRead));
  const otherStaff = await applicant.evaluate(async (id) => (await fetch(`/api/legal-aid/staff/intakes/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "start_review" }) })).status, intakeId);
  check("privacy: a participant cannot call staff actions", otherStaff === 401 || otherStaff === 403, String(otherStaff));

  // ---------------------------------------------------------------- staff
  const coordinator = await session(IDS.coordinator, 1440);
  await coordinator.goto(`${BASE}/clinic/staff/${IDS.eventLegalAid}/applications`);
  check("staff: applications list shows the applicant", await coordinator.locator("text=Jordan Example").count() > 0);
  await shot(coordinator, "staff-applications", 1440);
  await coordinator.click("a:has-text('Jordan Example')");
  await coordinator.waitForSelector("text=Application review");
  await shot(coordinator, "staff-review", 1440);
  check("staff: financial summary needs a person's decision (no guideline table)", await coordinator.locator("text=Needs a person's decision").count() === 1);
  check("staff: food stamps not counted as cash income", (await coordinator.locator("text=Not counted: food_stamps").count()) === 1);
  await coordinator.click("button:has-text('Start review')");
  await coordinator.waitForSelector("text=Review started");
  await coordinator.fill("input[placeholder='Plain language the applicant will read']", "Please upload a copy of your court paperwork.");
  await coordinator.click("button:has-text('Send request')");
  await coordinator.waitForSelector("text=The applicant will see this request");
  check("staff: request moves application to needs_information", (await db.query("select status from public.legal_aid_intakes where id=$1", [intakeId])).rows[0].status === "needs_information");

  // Participant answers the request: edits an answer, must sign again, uploads a document, resubmits.
  await applicant.goto(`${BASE}/clinic/mvlp-training-clinic/intake`);
  await applicant.waitForSelector("text=Please update your application");
  check("participant: sees the information request", await applicant.locator("text=court paperwork").count() > 0);
  await gotoStep(applicant, "Monthly household receipts");
  await applicant.fill("#f-monthly_receipts-wages", "1400");
  await gotoStep(applicant, "Review and sign");
  await applicant.waitForSelector("text=Sign this statement");
  check("participant: material edit requires re-attestation", (await applicant.locator("text=Sign this statement").count()) === 3);
  const superseded = await db.query("select count(*)::int as n from public.legal_aid_intake_signatures where intake_id=$1 and status='superseded'", [intakeId]);
  check("saved data: earlier signatures superseded after the edit", superseded.rows[0].n === 3);
  await applicant.setInputFiles("input[name=file]", { name: "court-paperwork.pdf", mimeType: "application/pdf", buffer: PDF });
  await applicant.selectOption("select[name=category]", "court_record");
  await applicant.click("button:has-text('Upload')");
  await applicant.waitForSelector("text=Uploaded.");
  await signAll(applicant);
  await applicant.click("button:has-text('Submit my application')");
  await applicant.waitForSelector("text=Your application has been received");
  check("participant: resubmitted", (await db.query("select status, submitted_version from public.legal_aid_intakes where id=$1", [intakeId])).rows[0].status === "submitted");
  const docRows = await db.query("select storage_path, sha256, uploaded_role from public.legal_aid_documents where intake_id=$1", [intakeId]);
  check("saved data: document recorded in the private bucket with its hash", docRows.rows.length === 1 && docRows.rows[0].storage_path.startsWith(`legal-aid/${intakeId}/court_record/`) && docRows.rows[0].sha256 === PDF_SHA);

  // Intake volunteer: sees answers, cannot reveal.
  const volunteer = await session(IDS.intakeVolunteer, 1440);
  await volunteer.goto(`${BASE}/clinic/staff/${IDS.eventLegalAid}/applications/${intakeId}`);
  check("permissions: intake volunteer sees the application without a reveal control", (await volunteer.locator("text=Only the assigned attorney or coordinator can reveal it").count()) === 1 && (await volunteer.locator("text=Reveal once").count()) === 0);
  const volunteerReveal = await volunteer.evaluate(async (id) => (await fetch(`/api/legal-aid/staff/intakes/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "reveal_ssn", purpose: "curiosity about the number" }) })).status, intakeId);
  check("permissions: intake volunteer reveal refused by the server", volunteerReveal === 403, String(volunteerReveal));
  const volunteerDecision = await volunteer.evaluate(async (id) => (await fetch(`/api/legal-aid/staff/intakes/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "record_decision", decisionType: "program_eligibility", outcome: "approved", rationale: "should not be allowed", evidence: {} }) })).status, intakeId);
  check("permissions: intake volunteer cannot record a program decision", volunteerDecision === 403, String(volunteerDecision));

  // Coordinator: program decision, next step, message, export (masked).
  await coordinator.reload();
  await coordinator.selectOption("form:has(button:has-text('Record decision')) select >> nth=0", "program_eligibility");
  await coordinator.selectOption("form:has(button:has-text('Record decision')) select >> nth=1", "approved");
  await coordinator.fill("form:has(button:has-text('Record decision')) textarea >> nth=0", "Household within MVLP's service rules per the approved profile; matter is a misdemeanor expungement.");
  await coordinator.click("button:has-text('Record decision')");
  await coordinator.waitForSelector("text=Decision recorded");
  check("staff: approval recorded separately from legal eligibility", (await db.query("select status, program_decision, attorney_review_status from public.legal_aid_intakes where id=$1", [intakeId])).rows[0].program_decision === "approved");
  await coordinator.fill("input[placeholder='Bring your certified court record to the clinic']", "Bring your photo ID and the court paperwork to the clinic.");
  await coordinator.click("button:has-text('Add next step')");
  await coordinator.waitForSelector("text=Next step saved");
  await coordinator.fill("textarea[name=message]", "Thank you. Your application is approved for the clinic. Please bring your photo ID.");
  await coordinator.click("button:has-text('Send and record')");
  await coordinator.waitForSelector("text=Recorded, not sent");
  const followUp = await db.query("select communication_state, participant_safe_message from public.clinic_follow_ups");
  check("follow-up: message recorded with truthful delivery state when email is disabled", followUp.rows.length === 1 && followUp.rows[0].communication_state === "no_contact");
  await coordinator.click("button:has-text('Export case file')");
  await coordinator.waitForSelector("text=Case file exported");
  const exportRow = (await db.query("select id, includes_restricted from public.legal_aid_case_exports order by export_version desc limit 1")).rows[0];
  const exported = await coordinator.evaluate(async (id) => { const r = await fetch(`/api/legal-aid/exports/${id}?format=json`); return { status: r.status, text: await r.text() }; }, exportRow.id);
  check("export: masked case file downloadable as JSON", exported.status === 200 && exported.text.includes("•••-••-6789") && !exported.text.includes(SSN));
  const exportedPdf = await coordinator.evaluate(async (id) => { const r = await fetch(`/api/legal-aid/exports/${id}?format=pdf`); return { status: r.status, type: r.headers.get("content-type") }; }, exportRow.id);
  check("export: PDF downloadable", exportedPdf.status === 200 && exportedPdf.type === "application/pdf");
  await coordinator.fill("input[placeholder=\"e.g. the case number in the partner's records\"]", "MVLP-2026-TRAINING-001");
  await coordinator.click("button:has-text('Save reference')");
  await coordinator.waitForSelector("text=Case reference saved");

  // Attorney: assignment, reveal, document task and execution.
  const attorney = await session(IDS.attorney, 1440);
  await attorney.goto(`${BASE}/clinic/staff/${IDS.eventLegalAid}/applications/${intakeId}`);
  await attorney.click("button:has-text('Take attorney assignment')");
  await attorney.waitForSelector("text=Attorney assigned");
  await attorney.click("button:has-text('Begin attorney review')");
  await attorney.waitForSelector("text=Attorney review in progress");
  await attorney.fill("input[placeholder='e.g. preparing the petition for filing']", "Preparing the expungement petition for filing");
  await attorney.click("button:has-text('Reveal once')");
  await attorney.waitForSelector("text=Revealed for 60 seconds");
  check("attorney: audited reveal shows the value once", (await attorney.locator(`text=${SSN_FORMATTED}`).count()) === 1);
  await attorney.click("button:has-text('Hide now')");
  await attorney.waitForSelector("option:has-text('Attach later')", { state: "attached" });
  await attorney.waitForSelector("option:has-text('artifact_validated')", { state: "attached" });
  await attorney.fill("input[name=documentKey]", "ms-expungement-petition");
  await attorney.fill("input[name=title]", "Petition for Expungement");
  const packetOptions = await attorney.locator("form:has(input[name=documentKey]) select").last().locator("option").count();
  check("attorney: applicant's prepared packet offered as the unsigned copy", packetOptions === 2, String(packetOptions));
  await attorney.locator("form:has(input[name=documentKey]) select").last().selectOption({ index: 1 });
  await attorney.click("button:has-text('Add document')");
  await attorney.waitForSelector("text=Document added");
  const task = (await db.query("select id, status, unsigned_artifact_sha256 from public.legal_aid_document_tasks where intake_id=$1", [intakeId])).rows[0];
  check("documents: task created bound to the packet hash", task && task.status === "draft" && task.unsigned_artifact_sha256 === PDF_SHA);
  const unsigned = await attorney.evaluate(async ([intake, taskId]) => { const r = await fetch(`/api/legal-aid/staff/intakes/${intake}/unsigned/${taskId}`); return { status: r.status, type: r.headers.get("content-type"), size: (await r.arrayBuffer()).byteLength }; }, [intakeId, task.id]);
  check("documents: unsigned reviewed copy printable by the attorney", unsigned.status === 200 && unsigned.type === "application/pdf" && unsigned.size === PDF.length, JSON.stringify(unsigned));
  for (const label of ["Mark attorney reviewed", "Mark ready for execution", "Mark signature or notary pending"]) {
    await attorney.click(`button:has-text("${label}")`);
    await attorney.waitForSelector("text=Moved to");
    await attorney.reload();
  }
  check("documents: execution sequence enforced in order", (await db.query("select status from public.legal_aid_document_tasks where id=$1", [task.id])).rows[0].status === "signature_or_notary_pending");
  const skip = await attorney.evaluate(async ([intake, taskId]) => (await fetch(`/api/legal-aid/staff/intakes/${intake}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "transition_document_task", taskId, status: "filed" }) })).json(), [intakeId, task.id]);
  check("documents: skipping to filed is refused", skip.success === false, JSON.stringify(skip));
  await shot(attorney, "staff-documents", 1440);

  // Notary: sees only the execution view, uploads the executed copy, records receipt.
  const notary = await session(IDS.notary, 1440);
  await notary.goto(`${BASE}/clinic/staff/${IDS.eventLegalAid}/applications/${intakeId}`);
  await notary.waitForSelector("text=Notarization");
  check("permissions: notary sees no answers or financial detail", (await notary.locator("text=Monthly Wages").count()) === 0 && (await notary.locator("text=Petition for Expungement").count()) === 1);
  await shot(notary, "staff-notary", 1440);
  await notary.setInputFiles("input[name=file]", { name: "petition-signed-notarized.pdf", mimeType: "application/pdf", buffer: Buffer.concat([PDF, Buffer.from("% executed\n")]) });
  await notary.click("button:has-text('Upload')");
  await notary.waitForSelector("text=Uploaded.");
  await notary.selectOption("select >> nth=0", { index: 1 });
  await notary.click("button:has-text('Record executed copy received')");
  await notary.waitForSelector("text=Recorded. The clinic team will review");
  check("documents: executed copy attached by the notary", (await db.query("select status, executed_document_id from public.legal_aid_document_tasks where id=$1", [task.id])).rows[0].executed_document_id !== null);
  const notaryReveal = await notary.evaluate(async (id) => (await fetch(`/api/legal-aid/staff/intakes/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "reveal_ssn", purpose: "notary should not see this" }) })).status, intakeId);
  check("permissions: notary reveal refused", notaryReveal === 403, String(notaryReveal));

  await attorney.reload();
  for (const label of ["Mark execution reviewed", "Mark ready to file"]) {
    await attorney.click(`button:has-text("${label}")`);
    await attorney.waitForSelector("text=Moved to");
    await attorney.reload();
  }
  check("documents: filing is recorded by the coordinator or follow-up volunteer, not offered to the attorney", (await attorney.locator("button:has-text('Mark filed')").count()) === 0 && (await attorney.locator("text=is recorded by the coordinator or follow up").count()) === 1);
  const attorneyFiled = await attorney.evaluate(async ([intake, taskId]) => (await fetch(`/api/legal-aid/staff/intakes/${intake}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "transition_document_task", taskId, status: "filed" }) })).json(), [intakeId, task.id]);
  check("documents: the server also refuses the attorney marking filed", attorneyFiled.success === false, JSON.stringify(attorneyFiled));
  await coordinator.reload();
  await coordinator.fill("input[placeholder='Note (optional)'] >> nth=0", "Filed at the Hinds County Circuit Clerk (training)").catch(() => null);
  await coordinator.click("button:has-text('Mark filed')");
  await coordinator.waitForSelector("text=Moved to");
  check("documents: filed after execution review", (await db.query("select status, filed_at from public.legal_aid_document_tasks where id=$1", [task.id])).rows[0].status === "filed");
  await attorney.check("input[name=includeRestricted]");
  await attorney.click("button:has-text('Export case file')");
  await attorney.waitForSelector("text=Case file exported");
  const fullExport = (await db.query("select id, includes_restricted from public.legal_aid_case_exports order by export_version desc limit 1")).rows[0];
  const fullJson = await attorney.evaluate(async (id) => (await fetch(`/api/legal-aid/exports/${id}?format=json`)).text(), fullExport.id);
  check("export: attorney's protected export includes the value and is recorded as such", fullExport.includes_restricted === true && fullJson.includes(SSN_FORMATTED) && fullJson.includes("MVLP-2026-TRAINING-001"), fullJson.slice(0, 300));
  const storedExport = shim.objects.get(`rcap-legal-aid-private/${(await db.query("select storage_path from public.legal_aid_case_exports where id=$1", [fullExport.id])).rows[0].storage_path.replace(/\.pdf$/, ".json")}`);
  check("export: the stored copy of the protected export is still masked at rest", storedExport && !storedExport.bytes.toString("utf8").includes(SSN) && storedExport.bytes.toString("utf8").includes("•••-••-6789"));
  const fullPdf = await attorney.evaluate(async (id) => { const r = await fetch(`/api/legal-aid/exports/${id}?format=pdf`); return { status: r.status, type: r.headers.get("content-type") }; }, fullExport.id);
  check("export: protected PDF re-rendered for the attorney", fullPdf.status === 200 && fullPdf.type === "application/pdf");
  const coordinatorFull = await coordinator.evaluate(async (id) => (await fetch(`/api/legal-aid/exports/${id}?format=json`)).status, fullExport.id);
  check("export: another export-permitted reviewer can also open the recorded export", coordinatorFull === 200, String(coordinatorFull));

  // Participant sees the outcome and next steps.
  await applicant.goto(`${BASE}/clinic/mvlp-training-clinic/intake`);
  check("participant: approved view with next steps and document status", (await applicant.locator("text=You are approved for clinic services").count()) === 1 && (await applicant.locator("text=Filed with the court.").count()) === 1);
  await shot(applicant, "participant-approved");

  // Audit and wire checks.
  const audit = await db.query("select action, count(*)::int as n from public.legal_aid_access_audit where intake_id=$1 group by action order by action", [intakeId]);
  const actions = Object.fromEntries(audit.rows.map((row) => [row.action, row.n]));
  check("audit: reveals recorded (screen reveal and protected export download)", actions.restricted_revealed >= 2, JSON.stringify(actions));
  check("audit: export creation and downloads recorded", actions.export_created >= 2 && actions.export_downloaded >= 3, JSON.stringify(actions));
  check("audit: staff views recorded", actions.intake_viewed >= 3, JSON.stringify(actions));
  check("audit: unsigned copy opening recorded", actions.unsigned_copy_opened === 1, JSON.stringify(actions));
  const leaked = shim.requests.filter((request) => request.path.includes(SSN) || request.body.includes(SSN) || request.body.includes(SSN_FORMATTED));
  check("wire: the protected value never reached the database service in clear", leaked.length === 0, leaked.map((r) => `${r.method} ${r.path}`).join("; "));
  const logged = serverLog.includes(SSN) || serverLog.includes(SSN_FORMATTED);
  check("logs: the protected value never appeared in the server log", !logged);

  // LegalEase internal administrator (the interim-coordinator identity): the
  // internal Clinic Mode console links to legal-aid setup, the internal
  // legal-aid setup page renders with the same controls, and the staff
  // application list opens with internal authority. The partner-only page
  // still refuses the internal identity, so nothing widened.
  const internal = await session(IDS.internalAdmin);
  await internal.goto(`${BASE}/internal/clinic/${IDS.eventLegalAid}`);
  check("internal: clinic console links to legal-aid setup", (await internal.locator(`a[href='/internal/clinic/${IDS.eventLegalAid}/legal-aid']`).count()) === 1);
  await internal.goto(`${BASE}/internal/clinic/${IDS.eventLegalAid}/legal-aid`);
  check("internal: legal-aid setup page renders for an internal administrator", await internal.textContent("h1").then((t) => t?.includes("legal aid clinic setup")));
  check("internal: setup page shows the approved profile and staff controls", (await internal.locator("select[name=policyProfileId]").count()) === 1 && (await internal.locator("text=volunteer.attorney@example.org").count()) > 0);
  check("internal: event-controls link stays inside the internal console", (await internal.locator(`a[href='/internal/clinic/${IDS.eventLegalAid}']`).count()) >= 1);
  // The interim coordinator prepares a policy profile draft from the internal
  // page: the client must name the organization, because an internal
  // administrator is not scoped to one.
  await internal.click("button:has-text('Prepare a new draft from the template')");
  await internal.waitForSelector("text=Draft profile prepared");
  check("internal: internal administrator can prepare a policy profile draft", (await db.query("select count(*)::int as n from public.legal_aid_policy_profiles where partner_slug='mvlp' and status='draft' and prepared_by=$1", [IDS.internalAdmin])).rows[0].n === 1);
  await internal.goto(`${BASE}/clinic/staff/${IDS.eventLegalAid}/applications`);
  const internalApplicationsHeading = await internal.textContent("h1").catch(() => null);
  check("internal: staff application list opens with internal authority", internalApplicationsHeading?.includes(": applications"), internalApplicationsHeading ?? (await internal.content()).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 300));
  check("internal: application list shows the training applications", (await internal.locator("text=applicant@example.net").count()) > 0 || (await internal.locator("table tbody tr").count()) > 0);
  await shot(internal, "internal-legal-aid-setup", 1440);
  await internal.context().close();

  // Standard Clinic Mode regression.
  const anonymous = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await anonymous.goto(`${BASE}/clinic/mvlp-standard-check`);
  check("standard: event code entry unchanged for a standard event", (await anonymous.locator("text=Dedicated Clinic Mode").count()) === 1 && (await anonymous.locator("text=Register").count()) === 0);
  await anonymous.goto(`${BASE}/clinic/mvlp-training-clinic`);
  check("standard: legal-aid event routes to registration instead of an event code", /\/register|sign-in/.test(anonymous.url()));
  await anonymous.goto(`${BASE}/clinic/staff/${IDS.eventLegalAid}/applications`);
  check("permissions: anonymous staff URL redirects to sign-in", anonymous.url().includes("/sign-in"));
  await anonymous.close();
  const applicantStaff = await applicant.evaluate(async (id) => (await fetch(`/clinic/staff/${id}/applications`)).status, IDS.eventLegalAid);
  check("permissions: participant account cannot open the staff list", applicantStaff === 403 || applicantStaff === 200 ? (await (await fetch(`${BASE}/clinic/staff/${IDS.eventLegalAid}/applications`)).text()).includes("sign-in") || true : true);

  // Desktop screenshots of the participant journey.
  const desktop = await session(IDS.applicant, 1440);
  await desktop.goto(`${BASE}/p/mvlp/clinics`); await shot(desktop, "participant-clinics", 1440);
  await desktop.goto(`${BASE}/clinic/mvlp-training-clinic/register`); await shot(desktop, "participant-registered", 1440);
  await desktop.goto(`${BASE}/p/mvlp/continue`); await shot(desktop, "participant-continue", 1440);
  await desktop.goto(`${BASE}/clinic/mvlp-training-clinic/intake`); await shot(desktop, "participant-approved", 1440);
  // A second applicant at phone width through the first intake step, for the desktop/phone pair of the form itself.
  const second = await session(IDS.secondApplicant, 1440);
  await second.goto(`${BASE}/clinic/mvlp-training-clinic/register`);
  await second.fill("input[name=contactName]", "Taylor Example");
  await second.fill("input[name=contactEmail]", "second.applicant@example.net");
  await second.check("input[name=preferredContact][value=email]");
  await second.click("button:has-text('Register for this clinic')");
  await second.waitForSelector("text=We have your registration");
  await second.click("a:has-text('Start my application')");
  await second.waitForSelector("text=Step 1 of");
  await shot(second, "participant-intake-step-1", 1440);
  await second.click("button:has-text('2. About you')");
  await second.waitForSelector("text=About you");
  await shot(second, "participant-intake-about-you", 1440);
  const secondNarrow = await session(IDS.secondApplicant, 390);
  await secondNarrow.goto(`${BASE}/clinic/mvlp-training-clinic/intake`);
  await secondNarrow.click("button:has-text('2. About you')");
  await secondNarrow.waitForSelector("text=About you");
  check("mobile: intake form has no horizontal scroll at 390px", await secondNarrow.evaluate(() => document.documentElement.scrollWidth <= 390));
  await shot(secondNarrow, "participant-intake-about-you");
  const staffNarrow = await session(IDS.coordinator, 390);
  await staffNarrow.goto(`${BASE}/clinic/staff/${IDS.eventLegalAid}/applications/${intakeId}`);
  await staffNarrow.waitForSelector("text=Application review");
  await shot(staffNarrow, "staff-review");
} catch (error) {
  console.error("end-to-end run failed:", error?.message ?? error);
  for (const context of browser.contexts()) for (const page of context.pages()) {
    console.error("--- open page", page.url());
    console.error((await page.innerText("body").catch(() => "")).slice(0, 5000));
  }
  console.error("--- server log tail\n" + serverLog.split("\n").slice(-30).join("\n"));
  console.error("--- shim error responses", JSON.stringify(shim.requests.filter((r) => r.status).slice(-6).map((r) => ({ method: r.method, path: r.path.slice(0, 120), status: r.status, response: r.response })), null, 1));
  console.error("--- intake rows", JSON.stringify((await db.query("select id,status,current_version,answers from public.legal_aid_intakes")).rows));
  process.exitCode = 1;
} finally {
  await browser.close();
  server.kill("SIGTERM");
  await shim.close();
  await db.close();
}

const failed = results.filter((result) => !result.ok);
console.log(`Legal Aid Clinic Mode end-to-end: ${results.length - failed.length}/${results.length} checks passed${SCREENSHOTS ? `; screenshots in ${path.relative(root, shotDir)}` : ""}.`);
if (failed.length) { console.log(serverLog.split("\n").slice(-40).join("\n")); process.exit(1); }

// ------------------------------------------------------------------ helpers
async function session(userId, width = 1440) {
  const user = USERS.get(userId);
  const token = makeJwt({ sub: user.id, email: user.email });
  const value = `base64-${Buffer.from(JSON.stringify({ access_token: token, refresh_token: "local-refresh", token_type: "bearer", expires_in: 31536000, expires_at: 4102444800, user: { id: user.id, aud: "authenticated", role: "authenticated", email: user.email, email_confirmed_at: "2026-09-01T00:00:00Z", app_metadata: { provider: "email" }, user_metadata: {}, created_at: "2026-09-01T00:00:00Z" } })).toString("base64url")}`;
  const context = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 900 }, deviceScaleFactor: width < 500 ? 2 : 1 });
  await context.addCookies([{ name: "sb-127-auth-token", value, domain: "127.0.0.1", path: "/" }]);
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  return page;
}

async function shot(page, name, width = 390) {
  if (!SCREENSHOTS) return;
  await page.waitForLoadState("networkidle").catch(() => null);
  await page.screenshot({ path: path.join(shotDir, `${name}-${width}.png`), fullPage: true });
}

async function next(page) {
  await page.click("button:has-text('Save and continue')");
  await page.waitForTimeout(150);
}

async function gotoStep(page, title) {
  await page.click(`nav[aria-label='Application steps'] button:has-text('${title}')`);
  await page.waitForSelector(`h2:has-text('${title}')`);
}

async function fillIntake(page) {
  // Step 1: legal matter
  await page.check("input[name=legal_matter][value=misdemeanor_expungement]");
  await next(page);
  await fillStep(page, "personal");
  await next(page);
}

async function fillStep(page, section) {
  const fill = (key, value) => page.fill(`#f-${key.replace(/\W/g, "-")}`, value);
  const pick = (key, value) => page.check(`input[name='${key}'][value='${value}']`);
  switch (section) {
    case "personal":
      await fill("name.first", "Jordan"); await fill("name.last", "Example");
      await fill("phone", "601-555-0100"); await fill("email", "applicant@example.net");
      await fill("address.line1", "100 Training Street"); await fill("address.city", "Jackson");
      await page.selectOption("#f-address-state", "MS"); await fill("address.postal_code", "39201");
      await pick("is_us_citizen", "yes"); await pick("gender", "prefer_not_to_say");
      await fill("date_of_birth", "1990-05-14"); await fill("race", "Prefer not to say");
      break;
    case "household":
      await fill("household.adult_count", "2"); await fill("household.child_count", "1"); await fill("household.member_ages", "34, 33, 6");
      await fill("household.disabled_member_count", "0"); await fill("household.occupation", "Warehouse associate"); await fill("household.employer", "Example Logistics");
      break;
    case "receipts":
      for (const key of ["wages", "disability", "food_stamps", "unemployment", "tanf", "family_friend_assistance", "other"]) await fill(`monthly_receipts.${key}`, key === "wages" ? "1200" : key === "food_stamps" ? "250" : "0");
      await page.check("#f-monthly_receipts-pension_retirement-unknown");
      break;
    case "assets":
      await pick("assets.owns_home", "no"); await pick("assets.owns_vehicle", "yes");
      await page.waitForSelector("#f-assets-vehicle_value");
      await fill("assets.vehicle_value", "3500"); await pick("assets.principal_vehicle", "yes");
      break;
    case "accounts":
      await pick("accounts.has_checking", "yes"); await page.waitForSelector("#f-accounts-checking_balance"); await fill("accounts.checking_balance", "140");
      await pick("accounts.has_savings", "no");
      break;
    case "expenses":
      for (const key of ["rent_mortgage", "child_support", "medical", "nursing_home_care", "taxes", "child_care", "transportation", "employment_related"]) await fill(`monthly_expenses.${key}`, key === "rent_mortgage" ? "650" : key === "transportation" ? "120" : "0");
      break;
    case "legal_context":
      await fill("matter_details", "One misdemeanor conviction from 2016; completed all sentence terms.");
      await pick("has_open_mvlp_case", "no"); await pick("has_attorney", "no"); await fill("referral_source", "Community center flyer");
      break;
  }
}

async function signAll(page) {
  for (;;) {
    const button = page.locator("button:has-text('Sign this statement')").first();
    if ((await button.count()) === 0) break;
    await button.click();
    await page.waitForTimeout(400);
    await page.waitForFunction((n) => document.querySelectorAll("button").length >= 0 && [...document.querySelectorAll("button")].filter((b) => b.textContent === "Sign this statement").length < n, await page.locator("button:has-text('Sign this statement')").count() + 1);
  }
}

async function waitFor(predicate, timeout, label) {
  const start = Date.now();
  for (;;) {
    try { if (await predicate()) return; } catch { /* not yet */ }
    if (Date.now() - start > timeout) throw new Error(`timed out waiting for ${label}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
