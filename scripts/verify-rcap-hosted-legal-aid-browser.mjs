#!/usr/bin/env node
// Static contract for the hosted Legal Aid Clinic Mode browser phase: the
// dispatcher exposes it, the reusable workflow reuses the accepted Preview
// for the Legal Aid seed and browser proof, the anti-skip
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
check("reusable workflow documents the phase", hosted.includes("legal_aid_browser, sponsor_cap, deploy, replace_preview"));
check("phase schedules Legal Aid historical reuse without Clinic replay", /legal_aid_browser\)\s+DEPLOY=false;\s+MATRIX=false;\s+GATE=false;\s+RETARGET=false;\s+BROWSER=false;\s+CLINIC=false;\s+LEGAL_AID=true/.test(hosted));
check("every other phase explicitly clears the Legal Aid flag", (hosted.match(/LEGAL_AID=false/g) ?? []).length >= 10 && !/legal_aid_browser\)[^\n]*LEGAL_AID=false/.test(hosted));
check("contract emits the Legal Aid flag", hosted.includes('echo "legal_aid=$LEGAL_AID"'));
check("email secrets are declared optional", ["HOSTED_LEGAL_AID_RESEND_API_KEY", "HOSTED_LEGAL_AID_TEST_MAILBOX", "HOSTED_LEGAL_AID_EMAIL_FROM"].every((name) => new RegExp(`${name}:\\s*\\n\\s*required: false`).test(hosted)));

// --- steps -----------------------------------------------------------------
check("Clinic Preview verifier does not require Legal Aid replay", !/id: verify_clinic_preview\s*\n[^\n]*legal_aid_browser/.test(hosted));
check("this verifier runs for the phase", /id: verify_legal_aid_browser\s*\n\s*if: inputs\.phase == 'legal_aid_browser'[\s\S]{0,200}verify-rcap-hosted-legal-aid-browser\.mjs/.test(hosted));
check("first-admin and Legal Aid schema suites run on the frozen dependencies", /id: legal_aid_suites\s*\n\s*if: steps\.contract\.outputs\.legal_aid == 'true' && steps\.gate_deps\.outcome == 'success'[\s\S]{0,120}verify-first-admin-provisioning\.mjs\s*\n\s*node scripts\/legal-aid\/verify-legal-aid-schema\.mjs/.test(hosted));
check("seed runs only after the read-only prerequisite and suites", /id: legal_aid_seed\s*\n\s*if: steps\.contract\.outputs\.legal_aid == 'true' && steps\.legal_aid_prerequisite\.outcome == 'success' && steps\.legal_aid_suites\.outcome == 'success'/.test(hosted));
check("seed receives the demo password and no Stripe secret", /id: legal_aid_seed[\s\S]{0,900}HOSTED_CLINIC_DEMO_PASSWORD: \$\{\{ secrets\.HOSTED_CLINIC_DEMO_PASSWORD \}\}[\s\S]{0,100}rcap-hosted-legal-aid-seed\.mjs/.test(hosted) && !/id: legal_aid_seed[\s\S]{0,1200}HOSTED_STRIPE/.test(hosted));
check("browser proof runs only after the seed passed", /id: legal_aid_browser\s*\n\s*if: steps\.contract\.outputs\.legal_aid == 'true' && steps\.legal_aid_seed\.outcome == 'success'/.test(hosted));
check("browser proof receives the in-memory bypass and no Stripe secret", /id: legal_aid_browser[\s\S]{0,1400}VERCEL_AUTOMATION_BYPASS_SECRET[\s\S]{0,900}rcap-hosted-legal-aid-browser\.mjs/.test(hosted) && !/id: legal_aid_browser[\s\S]{0,1600}HOSTED_STRIPE/.test(hosted));
check("deploy receives the email provider only in this phase", /HOSTED_LEGAL_AID_RESEND_API_KEY: \$\{\{ steps\.contract\.outputs\.legal_aid == 'true' && secrets\.HOSTED_LEGAL_AID_RESEND_API_KEY \|\| '' \}\}/.test(hosted));
check("anti-skip records the four Legal Aid outcomes", ["O_VERIFY_LEGAL_AID_BROWSER: ${{ steps.verify_legal_aid_browser.outcome }}", "O_LEGAL_AID_SUITES: ${{ steps.legal_aid_suites.outcome }}", "O_LEGAL_AID_SEED: ${{ steps.legal_aid_seed.outcome }}", "O_LEGAL_AID_BROWSER: ${{ steps.legal_aid_browser.outcome }}", "RUNS_LEGAL_AID: ${{ steps.contract.outputs.legal_aid }}"].every((line) => hosted.includes(line)));
check("anti-skip requires Legal Aid and preservation boundaries", ["O_LEGAL_AID_PREREQUISITE", "O_LEGAL_AID_PRESERVATION", "O_LEGAL_AID_RELATIONSHIPS"].every(value => hosted.includes(`require `) && hosted.includes(`"$${value}"`)));
check("Legal Aid has its own anti-skip branch before Clinic", hosted.indexOf('elif [ "$RUNS_LEGAL_AID" = "true" ]') < hosted.indexOf('elif [ "$RUNS_CLINIC" = "true" ]'));

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
check("seed pins the acceptance project and exact Preview", seed.includes('const EXPECTED_PROJECT_REF = "hyflxnlhpmiqxvvcoiia"') && seed.includes('rcapClinicDemoMode === "none"') && seed.includes("aliasDeploymentId === DEPLOYMENT_ID"));
check("seed creates only reserved .test identities", seed.includes('if (!email.endsWith("@rcap-acceptance.test")) throw new Error'));
check("seed never records passwords", seed.includes("passwordsRecorded: false") && !/password:\s*DEMO_PASSWORD[^,]*evidence/.test(seed));
check("seed deletes only rows keyed to the fixture", [...seed.matchAll(/delete from public\.(\w+) where ([^;]+);/g)].every((match) => /event_id='\$\{F\.eventId\}'|partner_slug='\$\{F\.(partnerSlug|handoffPartnerSlug)\}'|auth_user_id in \(\$\{noMembership/.test(match[2])));
check("seed never touches Production", !seed.includes("wwtwtsmywnckfkdaqqeg") && seed.includes("productionTouched: false"));
check("seed requires the existing participant; prerequisite owns historical authority", seed.includes("packetApplicantId") && hosted.includes("steps.legal_aid_prerequisite.outcome == 'success'"));

check("seed and browser require the exact accepted Preview release binding", [seed,browser].every(source => source.includes("requireLegalAidAcceptedPreview(") && source.includes("assertLegalAidAcceptedPreview(acceptedPreview, deployment.json)")));
check("Legal Aid does not request historical Clinic Preview purpose", !hosted.split("HOSTED_CLINIC_DEMO_MODE:").slice(1).some(line => line.split("\n")[0].includes("outputs.legal_aid")));

// --- browser boundaries -----------------------------------------------------------
check("browser pins the acceptance project and exact Preview", browser.includes('const EXPECTED_PROJECT_REF = "hyflxnlhpmiqxvvcoiia"') && browser.includes("rcapReturnOrigin === PREVIEW") && browser.includes("productionAliases.length === 0"));
check("bypass travels only as an in-memory header on the exact origin", browser.includes('"x-vercel-protection-bypass": BYPASS') && !/[?&]x-vercel-protection-bypass|_vercel_jwt|vercel-protection-bypass.*cookie/i.test(browser));
check("browser deploys nothing, migrates nothing, runs no worker", !/node:child_process|spawn(?:Sync)?\(|docker |vercel deploy|--prod/.test(browser) && browser.includes("migrationApplied: false") && browser.includes("workerRun: false"));
check("browser reads the Legal Aid schema back without applying it", browser.includes("legal_aid_schema_read_back_without_migrating") && !/create table|alter table|create or replace function/i.test(browser));
check("browser binds itself to the seed evidence of the same Preview", browser.includes("legal_aid_seed_evidence_bound_to_this_preview"));
check("browser pins the historical packet, owner, hash and renderer", ["RESUME.job", "RESUME.owner", "RESUME.hash", "RESUME.priorDigest"].every(value => browser.includes(value)) && !browser.includes("order by j.created_at desc limit 1"));
check("no_contact is never reported as delivery", browser.includes("This is not proof of delivery") && browser.includes("follow_up_email_actually_delivered_to_the_test_mailbox") && browser.includes("api.resend.com/emails/"));
check("email delivery proof requires the provider event to name the authorized mailbox", browser.includes("(providerEvent?.to ?? []).includes(TEST_MAILBOX)"));
check("browser exercises sign-in, registration, duplicate, capacity and waitlist", ["registration_sign_in_is_captcha_protected", "synthetic_applicant_session_returns_to_registration", "duplicate_registration_refused", "capacity_reached_puts_applicant_c_on_the_waitlist", "intake_saved_and_resumed_after_refresh"].every((id) => browser.includes(id)));
// Applicant A must never wait for an impossible automated human CAPTCHA grant.
const applicant = browser.slice(browser.indexOf("// 2. Applicant A:"), browser.indexOf("const personA ="));
check("Applicant A never submits credentials or waits for a browser password grant", !/waitForResponse|input\[name=["']?(?:email|password)|getByRole/.test(applicant));
check("anonymous registration proves visible CAPTCHA protection", [
  'const anonymousApplicant = await open({ viewport: { width: 390, height: 844 } });',
  "await anonymousApplicant.click(\"a:has-text('Register for this clinic')\");",
  'await anonymousApplicant.waitForURL(/sign-in/);',
  "await anonymousApplicant.locator('[aria-label=\"Security check\"]').waitFor({ state: \"visible\" });",
  'new URL(anonymousApplicant.url()).pathname === "/sign-in"',
  "&& await anonymousApplicant.locator('[aria-label=\"Security check\"]').isVisible()",
  'record("registration_sign_in_is_captcha_protected",'
].every(value => applicant.includes(value)));
check("Applicant A reuses the exact authenticated context and verifies registration", [
  'const a = await open({ viewport: { width: 390, height: 844 }, user: who.APPLICANT_A });',
  'const registrationUrl = `${PREVIEW}/clinic/${F.eventSlug}/register`;',
  'await a.goto(registrationUrl);',
  'await a.waitForSelector("input[name=contactName]");',
  'who.APPLICANT_A.id === RESUME.owner',
  'who.APPLICANT_A.session.user.id === who.APPLICANT_A.id',
  '&& a.url() === registrationUrl',
  'record("synthetic_applicant_session_returns_to_registration",'
].every(value => applicant.includes(value)));
check("Applicant A has one genuine Acceptance password-grant identity", (browser.match(/who\.APPLICANT_A\s*=/g) ?? []).length === 1
  && browser.includes('who.APPLICANT_A = await sessionFor(F.packetApplicantEmail, keys);')
  && browser.includes('const session = await signedIn.json().catch(() => null);')
  && browser.includes('return { id: session.user.id, email, session };')
  && browser.includes('fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`')
  && browser.includes('body: JSON.stringify({ email, password: DEMO_PASSWORD })'));
check("authenticated context retains original SSR session and exact Preview cookie scope",
  browser.includes('if (user) await context.addCookies(authCookies(user.session));')
  && browser.includes('Buffer.from(JSON.stringify(session), "utf8").toString("base64")')
  && browser.includes('domain: EXPECTED_HOSTNAME, path: "/", secure: true, httpOnly: true, sameSite: "Strict"')
  && browser.includes('const c = await newContext(browser, options);')
  && !/jwt\.sign|SignJWT|setExtraHTTPHeaders|Bearer.*user\.session/.test(browser));
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
