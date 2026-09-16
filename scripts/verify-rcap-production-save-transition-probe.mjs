#!/usr/bin/env node
// Static verifier (no network) for scripts/rcap-production-save-transition-probe.mjs.
// It reads the probe's source and checks the guarantees the probe must keep
// before a hosted run is allowed to exercise the live public site.

import fs from "node:fs";
import path from "node:path";

const checks = [];
const check = (passed, message) => checks.push({ passed, message });
const root = path.resolve(process.env.RCAP_PRODUCTION_VERIFY_ROOT ?? ".");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const probe = read("scripts/rcap-production-save-transition-probe.mjs");
const lines = probe.split("\n");
const consoleLines = lines.filter((line) => /console\.(?:log|error|warn|info|debug)\(/.test(line));
const maskLines = consoleLines.filter((line) => line.includes("::add-mask::"));

// --- identity and scope ---------------------------------------------------------
check(probe.includes('const PRODUCTION_PROJECT_REF = "wwtwtsmywnckfkdaqqeg"'), "canonical Production project is pinned explicitly");
check(probe.includes("PROJECT_REF_INPUT !== PRODUCTION_PROJECT_REF"), "RCAP_PRODUCTION_PROJECT_REF must equal the pinned project");
check(probe.includes("`${PRODUCTION_PROJECT_REF}.supabase.co`"), "Supabase URL is bound to the pinned project host");
check(!/hyflxnlhpmiqxvvcoiia/.test(probe), "the acceptance project is never named");
check(probe.includes('const PROBE_ACCOUNT_EMAIL = "rcap-production-probe@rcap-acceptance.test"'), "the one authorized account is the reserved synthetic probe identity");
check(probe.includes('const PHASE_REPRODUCE = "save_transition_reproduce"') && probe.includes('const PHASE_VERIFY = "save_transition_verify"'), "both phases are named exactly");
check(probe.includes('process.env.RCAP_PUBLIC_ORIGIN?.trim() || "https://expungement.ai"'), "public origin defaults to https://expungement.ai");
check(probe.includes('if (new URL(ORIGIN).protocol !== "https:") fail('), "public origin must be HTTPS");
check(probe.includes('process.env.RCAP_PROBE_BROWSERS ?? "chromium,webkit"'), "browsers default to chromium,webkit");
check(probe.includes('if (!BROWSERS.includes("chromium")'), "chromium is required");
check(probe.includes('section.status = "not_available"') && probe.includes('if (name === "chromium") throw new Error(`chromium could not launch'), "a webkit launch failure is recorded as not_available while a chromium launch failure fails");
check(probe.includes("process.env.RCAP_BROWSER_CHROMIUM") && probe.includes("options.executablePath = CHROMIUM_EXECUTABLE"), "chromium honours RCAP_BROWSER_CHROMIUM");
check(probe.includes("webkit.launch({ headless: true })"), "webkit launches through Playwright's own webkit build");
check(probe.includes('import { chromium, webkit } from "playwright"'), "Playwright engines come from the playwright package");

// --- exact endpoints and copy -----------------------------------------------------
check(probe.includes('const SCREENING_PATH = "/expungement-ai/screening/ms"'), "public Mississippi screening route is exact");
check(probe.includes('const EVALUATE_PATH = "/api/expungement-ai/evaluate"'), "authoritative evaluate endpoint is exact");
check(probe.includes('const PENDING_PATH = "/api/expungement-ai/screening/pending"'), "pending endpoint is exact");
check(probe.includes('const CLAIM_PATH = "/api/expungement-ai/screening/pending/claim"'), "claim endpoint is exact");
check(probe.includes('const SIGN_IN_PATH = "/expungement-ai/sign-in"'), "sign-in handoff path is exact");
check(probe.includes('const MATTERS_PATH = "/briefcase/matters"'), "matters list path is exact");
check(probe.includes("safePathname(response.url()) === pathname") && probe.includes('response.request().method() === "POST"'), "responses are matched on exact POST pathnames");
check(probe.includes("const pendingResponsePromise = page.waitForResponse(responseFor(PENDING_PATH)") && probe.includes("const claimResponsePromise = page.waitForResponse(responseFor(CLAIM_PATH)"), "pending and claim waits exist");
check(/const pendingResponsePromise = page\.waitForResponse\(responseFor\(PENDING_PATH\)[\s\S]{0,400}await saveButton\.click\(\)/.test(probe), "pending and claim waits are registered before the Save click");
check(probe.includes('const SAVE_RESULT_ERROR = "We could not save this matter right now. Please try again."'), "the incident's visible error copy is exact");
check(probe.includes("/^(?:Save my result and continue|Save to my Briefcase and continue)$/"), "the Save button is matched by its exact signed-out label, accepting the partner label");
check(probe.includes("/path may be available|You may be able to prepare an expungement packet/i"), "the Clinic journey's result-heading regex is reused");
check(probe.includes('"Non-conviction expungement for dismissal, no disposition, or acquittal"'), "the non-conviction pathway option is exact");
check(probe.includes('"The case was dropped or thrown out"') && probe.includes('"Misdemeanor"') && probe.includes('"State or local"'), "the dropped-misdemeanor state-case answers are exact");
check(probe.includes('"More than 10 years ago"') && probe.includes('"Have you completed everything the court ordered in this case?", "Yes"'), "the Mississippi follow-up map is reused");
check(probe.includes("function screeningHeading(") && probe.includes("async function visibleScreeningPrompt(") && probe.includes("async function answerChoice(") && probe.includes("function exactBriefcaseItemId("), "the Clinic journey helpers are reused");
check(probe.includes('error: "pending_storage_failed"') && probe.includes("status: 503"), "the expected incident signature (503 pending_storage_failed) is recorded");
check(probe.includes("20260828100000_shared_pending_result_and_atomic_claim"), "the missing migration is named in evidence");
check(probe.includes('header(pendingResponse, "x-vercel-id")') && probe.includes('header(pendingResponse, "x-request-id")'), "x-vercel-id and x-request-id are recorded for the pending response");
check(probe.includes('location.searchParams.get("mode") === "create"') && probe.includes('claimParamPresent: claimParam.length >= 32'), "handoff records mode=create and claim-param presence as booleans");
check(probe.includes("/Already have an account\\? Sign in/i") && probe.includes("'[data-auth-mode=\"signin\"]'"), "the handoff page is switched to sign-in through its real controls");
check(probe.includes('page.getByRole("button", { name: "Sign in", exact: true })') && probe.includes("grant_type=password"), "sign-in submits the real form and waits for the password grant");
check(
  probe.includes('section[data-briefcase-matter-id="${matterId}"]') && probe.includes('matterSection.getByText("MS", { exact: true })') && probe.includes("matterSection.getByText(NON_CONVICTION_PATHWAY_LABEL"),
  "the exact matter section must render the MS jurisdiction badge and the non-conviction pathway label"
);
check(probe.includes("await page.reload(") && probe.includes("first_matter_renders_and_survives_reload"), "the first matter is re-rendered after reload");
check(probe.includes("signed_in_save_claims_straight_into_a_new_matter") && probe.includes("secondMatterId !== firstMatterId"), "the signed-in claim must land on a distinct new matter");
check(probe.includes("replayed_claim_token_cannot_mint_a_third_matter") && probe.includes("afterReplay.count === afterSecond.count"), "duplicate protection counts matter links before and after the replayed claim");
check(probe.includes("await page.goto(signedOut.handoffUrl"), "the replay re-visits the exact captured handoff URL");

// --- account provisioning ----------------------------------------------------------
check(probe.includes("/api-keys?reveal=true"), "service key is read through the Management API");
check(maskLines.length === 1 && maskLines[0].includes("::add-mask::${serviceKey}"), "the service key is masked exactly once and nothing else is masked");
check(probe.includes('if (process.env.GITHUB_ACTIONS === "true") console.log(`::add-mask::'), "the mask line is only emitted under GitHub Actions");
check(probe.includes('authAdmin("/auth/v1/admin/users", serviceKey') && probe.includes("email_confirm: true"), "the account is created confirmed through the Auth admin API");
check(probe.includes("create.status === 422") && probe.includes("/database/query") && probe.includes('method: "PUT"'), "an existing account is looked up and its password rotated on 422");
check(probe.includes('crypto.randomBytes(32).toString("base64url")'), "the password is 32 random bytes per run");
check(probe.includes("secrets.add(password)") && probe.includes("secrets.add(serviceKey)") && probe.includes("secrets.add(SUPABASE_ACCESS_TOKEN)"), "password, service key and access token are registered for redaction");
check(probe.includes("passwordPersisted: false"), "evidence records that the password is not persisted");

// --- what must never happen --------------------------------------------------------
check(!/stripe|checkout|packet\/generate|packet[-_ ]?generat/i.test(probe), "probe never references a payment surface or packet generation");
check(!/\$50|pay \$|continue to payment|getByRole\("(?:link|button)", \{ name: \/[^\n]*pay/i.test(probe), "probe never clicks a payment control or names consumer pricing");
check(probe.includes("section.externalRequestHosts = [...external].sort()") && probe.includes("section.originPostPaths = [...posts].sort()"), "every third-party host and origin POST path is recorded per browser");
check(consoleLines.every((line) => !/claimToken|password|serviceKey|handoffUrl|SUPABASE_ACCESS_TOKEN/.test(line.replace("::add-mask::${serviceKey}", ""))), "no console line prints a claim token, password, handoff URL or key");
check(!/\$\{(?:claimToken|password|credentials\.password|handoffUrl|signedOut\.handoffUrl)\}/.test(probe), "no template literal interpolates a claim token, password or handoff URL");
check(!/\bclaimToken\b(?!\s*===|\s*\.length|\?\.claimToken)/.test(probe.replace(/pendingJson\?\.claimToken/g, "")), "the claim token is only ever inspected for presence");
check(probe.includes("tokenIssued: typeof pendingJson?.claimToken === \"string\"") || probe.includes("const tokenIssued = typeof pendingJson?.claimToken === \"string\""), "the token's presence is reduced to a boolean");
check(probe.includes("claimTokenPersisted: false") && probe.includes("handoffUrlPersisted: false") && probe.includes("secretsPersisted: false"), "evidence fixes token, handoff URL and secret persistence to false");
check(probe.includes("function redact(") && probe.includes("/([?&]claim=)[^&\\s\"'#]+/g") && probe.includes("fs.writeFileSync(EVIDENCE_FILE, `${redact(JSON.stringify(evidence, null, 2))}\\n`)"), "the evidence file and every observed string pass through redaction");
check(probe.includes("function safePath(") && probe.includes("function safePathname(") && !probe.includes("page.url()}"), "recorded locations drop the query string");
check(!probe.includes("localStorage.setItem") && !probe.includes("sessionStorage.setItem"), "the probe never seeds browser storage");
check(!/method:\s*"(?:DELETE|PATCH)"/.test(probe), "the probe issues no DELETE or PATCH");
check(!probe.includes("/config/auth"), "the probe never changes Auth configuration");
check(!probe.includes("api.vercel.com") && !probe.includes("VERCEL_TOKEN") && !/\/projects\/[^\n]*\/env\b/.test(probe), "the probe never touches the Vercel API or environment variables");

// --- evidence and verdict shape ------------------------------------------------------
check(probe.includes('process.env.RCAP_PRODUCTION_EVIDENCE_DIR ?? "production-canary-evidence"'), "evidence lives under production-canary-evidence/");
check(probe.includes("`production-save-transition-${PHASE}.json`"), "evidence file is named per phase");
check(probe.includes("transitionHealthy") && probe.includes("section.transitionHealthy = false") && probe.includes("evidence.transitionHealthy = "), "transitionHealthy is recorded per browser and overall");
check(probe.includes("chromium_save_click_observation_captured") && probe.includes("if (!passed) throw new Error("), "the reproduce phase passes on captured observation and fails loudly otherwise");
check(probe.includes("async function withPageContext(") && probe.includes("headings ${JSON.stringify(headings)}") && probe.includes("pending ${section.pending?.status"), "failures carry page headings and the last pending/claim statuses");
check(probe.includes("SUMMARY ${summarize(section)}"), "a one-line summary is printed per browser");
check(probe.includes('"rcap-production-save-transition-probe/v1"'), "evidence schema is versioned");
check(probe.includes("fullPage: true") && probe.includes("01-result-after-save-click"), "desktop screenshots of the result page after the click are saved");

const failed = checks.filter((entry) => !entry.passed);
for (const entry of checks) console.log(`${entry.passed ? "ok  " : "FAIL"} ${entry.message}`);
if (failed.length) {
  console.error(`verify-rcap-production-save-transition-probe failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`verify-rcap-production-save-transition-probe passed: ${checks.length}/${checks.length}`);
