#!/usr/bin/env node
// Static contract for the hosted Legal Aid Clinic Mode browser phase: the
// dispatcher exposes it, the reusable workflow schedules exactly the Clinic
// Preview journey plus the Legal Aid seed and browser proof, the anti-skip
// gate requires each of them, and the scripts keep their boundaries (one
// exact Preview, in-memory bypass header only, synthetic identities only, no
// migration, no worker, no Production, no secret or protected value in
// evidence).

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), "utf8");

const dispatcher = read(".github/workflows/rcap-f1-ephemeral-staging.yml");
const hosted = read(".github/workflows/rcap-hosted-acceptance-staging.yml");
const seed = read("scripts/rcap-hosted-legal-aid-seed.mjs");
const browser = read("scripts/rcap-hosted-legal-aid-browser.mjs");
const fixture = read("scripts/rcap-legal-aid/hosted-fixture.mjs");
const deploy = read("scripts/rcap-hosted-acceptance-deploy.mjs");

const checks = [];
function check(name, condition) {
  assert.ok(condition, name);
  checks.push(name);
}

// --- dispatch and phase contract ------------------------------------------
check("dispatcher exposes one dedicated Legal Aid browser mode", dispatcher.includes("hosted_legal_aid_browser"));
check("dispatcher maps the mode to its dedicated reusable phase", /inputs\.mode == 'hosted_legal_aid_browser'\s*&&\s*'legal_aid_browser'/.test(dispatcher));
check("dispatcher passes the optional nonproduction email secrets through", ["HOSTED_LEGAL_AID_RESEND_API_KEY", "HOSTED_LEGAL_AID_TEST_MAILBOX", "HOSTED_LEGAL_AID_EMAIL_FROM"].every((name) => dispatcher.includes(`${name}: \${{ secrets.${name} }}`)));
check("reusable workflow documents the phase", hosted.includes("legal_aid_browser, deploy, replace_preview"));
check("phase schedules the Clinic Preview journey and the Legal Aid proof, nothing else", /legal_aid_browser\)\s+DEPLOY=true;\s+MATRIX=false;\s+GATE=false;\s+RETARGET=false;\s+BROWSER=false;\s+CLINIC=true;\s+LEGAL_AID=true/.test(hosted));
check("every other phase explicitly clears the Legal Aid flag", (hosted.match(/LEGAL_AID=false/g) ?? []).length >= 10 && !/legal_aid_browser\)[^\n]*LEGAL_AID=false/.test(hosted));
check("contract emits the Legal Aid flag", hosted.includes('echo "legal_aid=$LEGAL_AID"'));
check("email secrets are declared optional", ["HOSTED_LEGAL_AID_RESEND_API_KEY", "HOSTED_LEGAL_AID_TEST_MAILBOX", "HOSTED_LEGAL_AID_EMAIL_FROM"].every((name) => new RegExp(`${name}:\\s*\\n\\s*required: false`).test(hosted)));

// --- steps -----------------------------------------------------------------
check("Clinic Preview contract verifier also runs for this phase", /id: verify_clinic_preview\s*\n\s*if: inputs\.phase == 'clinic_preview' \|\| inputs\.phase == 'legal_aid_browser'/.test(hosted));
check("this verifier runs for the phase", /id: verify_legal_aid_browser\s*\n\s*if: inputs\.phase == 'legal_aid_browser'[\s\S]{0,200}verify-rcap-hosted-legal-aid-browser\.mjs/.test(hosted));
check("first-admin and Legal Aid schema suites run on the frozen dependencies", /id: legal_aid_suites\s*\n\s*if: steps\.contract\.outputs\.legal_aid == 'true' && steps\.gate_deps\.outcome == 'success'[\s\S]{0,120}verify-first-admin-provisioning\.mjs\s*\n\s*node scripts\/legal-aid\/verify-legal-aid-schema\.mjs/.test(hosted));
check("seed runs only after the Clinic audit and the suites passed", /id: legal_aid_seed\s*\n\s*if: steps\.contract\.outputs\.legal_aid == 'true' && steps\.clinic_audit\.outcome == 'success' && steps\.legal_aid_suites\.outcome == 'success'/.test(hosted));
check("seed receives the demo password and no Stripe secret", /id: legal_aid_seed[\s\S]{0,900}HOSTED_CLINIC_DEMO_PASSWORD: \$\{\{ secrets\.HOSTED_CLINIC_DEMO_PASSWORD \}\}[\s\S]{0,100}rcap-hosted-legal-aid-seed\.mjs/.test(hosted) && !/id: legal_aid_seed[\s\S]{0,1200}HOSTED_STRIPE/.test(hosted));
check("browser proof runs only after the seed passed", /id: legal_aid_browser\s*\n\s*if: steps\.contract\.outputs\.legal_aid == 'true' && steps\.legal_aid_seed\.outcome == 'success'/.test(hosted));
check("browser proof receives the in-memory bypass and no Stripe secret", /id: legal_aid_browser[\s\S]{0,1400}VERCEL_AUTOMATION_BYPASS_SECRET[\s\S]{0,900}rcap-hosted-legal-aid-browser\.mjs/.test(hosted) && !/id: legal_aid_browser[\s\S]{0,1600}HOSTED_STRIPE/.test(hosted));
check("deploy receives the email provider only in this phase", /HOSTED_LEGAL_AID_RESEND_API_KEY: \$\{\{ steps\.contract\.outputs\.legal_aid == 'true' && secrets\.HOSTED_LEGAL_AID_RESEND_API_KEY \|\| '' \}\}/.test(hosted));
check("anti-skip records the four Legal Aid outcomes", ["O_VERIFY_LEGAL_AID_BROWSER: ${{ steps.verify_legal_aid_browser.outcome }}", "O_LEGAL_AID_SUITES: ${{ steps.legal_aid_suites.outcome }}", "O_LEGAL_AID_SEED: ${{ steps.legal_aid_seed.outcome }}", "O_LEGAL_AID_BROWSER: ${{ steps.legal_aid_browser.outcome }}", "RUNS_LEGAL_AID: ${{ steps.contract.outputs.legal_aid }}"].every((line) => hosted.includes(line)));
check("anti-skip requires every Legal Aid boundary when the flag is set", /\[ "\$RUNS_LEGAL_AID" = "true" \][\s\S]{0,400}require "Legal Aid browser contract"[\s\S]{0,200}require "first-administrator and Legal Aid schema suites"[\s\S]{0,200}require "Legal Aid synthetic training cohort seed"[\s\S]{0,200}require "Legal Aid Clinic Mode browser proof"/.test(hosted));
check("Legal Aid requirements sit inside the Clinic branch, so the Clinic journey is required first", /require "Clinic server-side audit" "\$O_CLINIC_AUDIT"\s*\n\s*if \[ "\$RUNS_LEGAL_AID" = "true" \]/.test(hosted));

// --- deploy: nonproduction email provider only ------------------------------
check("deploy sets the email provider only when all three values exist", deploy.includes("if (!apiKey || !from || !mailbox) return null;") && deploy.includes('ENABLE_PARTNER_EMAIL_DELIVERY: "true"') && deploy.includes('PARTNER_EMAIL_PROVIDER: "resend"'));
check("deploy refuses a non-Resend key shape", deploy.includes('if (!apiKey.startsWith("re_")) throw new Error'));
check("deploy evidence records configuration without values", deploy.includes("valuesRecorded: false"));

// --- shared fixture -----------------------------------------------------------
check("seed, browser and this verifier share one fixture", seed.includes('from "./rcap-legal-aid/hosted-fixture.mjs"') && browser.includes('from "./rcap-legal-aid/hosted-fixture.mjs"'));
check("fixture names only reserved .test identities", [...fixture.matchAll(/email: "([^"]+)"/g)].every((match) => match[1].endsWith("@rcap-acceptance.test")) && fixture.includes('packetApplicantEmail: "mvl-demo-participant-a@rcap-acceptance.test"'));
check("fixture is the acceptance copy of MVLP on a fixed synthetic event", fixture.includes('partnerSlug: "mvlp"') && fixture.includes('eventId: "78000000-0000-4000-8000-000000000001"') && fixture.includes("capacity: 2"));
check("fixture assigns no attorney, notary or decision role to the interim coordinator", !/INTERNAL_ADMIN:\s*\[/.test(fixture) && /COORDINATOR: \["coordinator"/.test(fixture) && /ATTORNEY: \["attorney"/.test(fixture) && /NOTARY: \["notary"\]/.test(fixture));

// --- seed boundaries -------------------------------------------------------------
check("seed pins the acceptance project and exact Preview", seed.includes('const EXPECTED_PROJECT_REF = "hyflxnlhpmiqxvvcoiia"') && seed.includes('rcapClinicDemoMode === "mississippi_preview"') && seed.includes("aliasDeploymentId === DEPLOYMENT_ID"));
check("seed creates only reserved .test identities", seed.includes('if (!email.endsWith("@rcap-acceptance.test")) throw new Error'));
check("seed never records passwords", seed.includes("passwordsRecorded: false") && !/password:\s*DEMO_PASSWORD[^,]*evidence/.test(seed));
check("seed deletes only rows keyed to the fixture", [...seed.matchAll(/delete from public\.(\w+) where ([^;]+);/g)].every((match) => /event_id='\$\{F\.eventId\}'|partner_slug='\$\{F\.(partnerSlug|handoffPartnerSlug)\}'|auth_user_id in \(\$\{noMembership/.test(match[2])));
check("seed never touches Production", !seed.includes("wwtwtsmywnckfkdaqqeg") && seed.includes("productionTouched: false"));
check("seed requires the sponsored packet participant to exist", seed.includes("run the Clinic seed and journey first"));

// --- browser boundaries -----------------------------------------------------------
check("browser pins the acceptance project and exact Preview", browser.includes('const EXPECTED_PROJECT_REF = "hyflxnlhpmiqxvvcoiia"') && browser.includes("rcapReturnOrigin === PREVIEW") && browser.includes("productionAliases.length === 0"));
check("bypass travels only as an in-memory header on the exact origin", browser.includes('"x-vercel-protection-bypass": BYPASS') && !/[?&]x-vercel-protection-bypass|_vercel_jwt|vercel-protection-bypass.*cookie/i.test(browser));
check("browser deploys nothing, migrates nothing, runs no worker", !/node:child_process|spawn(?:Sync)?\(|docker |vercel deploy|--prod/.test(browser) && browser.includes("migrationApplied: false") && browser.includes("workerRun: false"));
check("browser reads the Legal Aid schema back without applying it", browser.includes("legal_aid_schema_read_back_without_migrating") && !/create table|alter table|create or replace function/i.test(browser));
check("browser binds itself to the seed evidence of the same Preview", browser.includes("legal_aid_seed_evidence_bound_to_this_preview"));
check("the packet must be the hosted sponsored artifact, never a preloaded file", browser.includes("hosted_generated_mississippi_packet_exists_for_applicant_a") && browser.includes("sponsored_consumer_auth_user_id='${who.APPLICANT_A.id}'") && browser.includes("unsigned_copy_is_the_hosted_generated_packet_bytes") && browser.includes("unsigned.sha === packet.output_sha256"));
check("no_contact is never reported as delivery", browser.includes("This is not proof of delivery") && browser.includes("follow_up_email_actually_delivered_to_the_test_mailbox") && browser.includes("api.resend.com/emails/"));
check("email delivery proof requires the provider event to name the authorized mailbox", browser.includes("(providerEvent?.to ?? []).includes(TEST_MAILBOX)"));
check("browser exercises sign-in, registration, duplicate, capacity and waitlist", ["participant_signs_in_and_returns_to_registration", "duplicate_registration_refused", "capacity_reached_puts_applicant_c_on_the_waitlist", "intake_saved_and_resumed_after_refresh"].every((id) => browser.includes(id)));
check("browser exercises the three training records", ["trainingRecords.A", "trainingRecords.B", "trainingRecords.C", "applicant_b_returned_for_missing_document", "non_citizen_sees_confidential_review_acknowledgment"].every((id) => browser.includes(id)));
check("browser exercises protected entry, authorized reveal and denied reveal", ["protected_value_encrypted_at_rest_with_masked_hint", "attorney_audited_reveal_shows_the_value_once", "intake_volunteer_cannot_reveal_or_decide", "notary_uploads_executed_copy_to_private_storage_and_cannot_reveal"].every((id) => browser.includes(id)));
check("browser exercises staff assignment, decisions and cross-tenant denial", ["interim_coordinator_assigns_clinic_team", "program_decision_recorded_separately_from_legal_eligibility", "other_organizations_administrator_denied_cross_tenant"].every((id) => browser.includes(id)));
check("browser exercises private uploads, downloads and exports", ["executed_copy_object_exists_in_the_private_bucket", "masked_case_file_export_downloads_as_json_and_pdf", "protected_export_includes_value_for_the_attorney_and_is_stored_privately"].every((id) => browser.includes(id)));
check("browser exercises the shared-device reset", browser.includes("shared_device_sign_out_leaves_nothing_behind") && browser.includes("goBack()"));
check("browser exercises provisioning, the first-admin invitation and the handoff", ["internal_administrator_provisions_a_partner_through_the_app", "first_admin_invitation_created_with_secure_setup_link", "first_admin_invitation_accepted_membership_active", "last_administrator_cannot_be_removed", "replacement_administrator_access_verified_before_handoff", "outgoing_administrator_access_ended_and_audited", "handoff_preserves_history"].every((id) => browser.includes(id)));
check("browser exercises the We Must Vote and Standard Clinic regressions", browser.includes("we_must_vote_landing_unchanged") && browser.includes("standard_clinic_mode_event_code_entry_unchanged"));
check("the interim coordinator's identity is the internal administrator, never a second identity", browser.includes("who.INTERNAL_ADMIN") && !browser.includes("role: 'partner_admin', partner_slug is null"));
check("evidence carries no secret, password or protected value", browser.includes("secretsRecorded: false") && browser.includes("protectedValueRecorded: false") && browser.includes('.split(SSN).join("***PROTECTED***")') && browser.includes("DEMO_PASSWORD, RESEND_API_KEY].filter(Boolean)"));
check("identities appear in evidence hashed only", browser.includes("hashed ids only") && browser.includes("const shortId = (value) => crypto.createHash"));
check("browser never names Production", !browser.includes("wwtwtsmywnckfkdaqqeg") && browser.includes("productionTouched: false"));
check("stored answers are checked for the protected value", browser.includes("protected_value_absent_from_every_stored_answer_document"));

console.log(`RCAP hosted Legal Aid browser verifier passed: ${checks.length}/${checks.length}`);
