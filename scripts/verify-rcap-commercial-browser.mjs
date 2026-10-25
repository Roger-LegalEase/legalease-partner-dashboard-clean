import {captureOriginalResponseOnce,openScreeningWithProfile,runScreeningFromOriginalProfile,saveScreeningAndClaim} from './rcap-clinic-screening-profile.mjs';
import {CLINIC_FRESH_ATTEMPT,assertClinicAttemptAuthority} from './rcap-clinic-fresh-attempt.mjs';
import {createOriginalResponseObserver,matchesOriginalResponse,originalResponse,originalResponseOperation,requireOriginalResponse} from './rcap-clinic-original-response.mjs';
import {createClinicRequestGuard} from './rcap-clinic-setup-request-guard.mjs';
import {ownedMatterReadonlyDecision} from './rcap-clinic-owned-matter-readonly.mjs';
import {publicReactResourcePolicy} from './rcap-clinic-live-screening-progress.mjs';
import {readOwnedMatterDatabase} from './rcap-clinic-owned-matter-prerequisites.mjs';
import {readCurrentClinicGate} from './rcap-clinic-live-prerequisites.mjs';
import {readNormalClinicSurfaces,assertNormalClinicSurfaces} from './rcap-clinic-normal-readiness.mjs';
import {previewRequestHeaders,readResumeCaptchaPolicy} from './rcap-clinic-resume-network-policy.mjs';
import {inspectShippedCaptcha} from './rcap-clinic-resume-captcha.mjs';
import {CLINIC_CODE_ADMIN,clinicAdminCodeRequestAllowed,issueClinicSetupCode,requireClinicAdminControls,captureClinicAdminFailure} from './rcap-clinic-setup-admin-code.mjs';
import { CLINIC_SETUP, assertClinicSetupInput, clinicSetupRequestAllowed, clinicSetupSafeError, captureClinicEntryResponse, assertClinicEntryAccepted, clinicSetupSafePathname } from './rcap-clinic-setup-only-boundary.mjs';
import crypto from "node:crypto";
import {downstreamClosureSql,assertDownstreamClosure} from "./rcap-clinic-downstream-closure.mjs";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import vm from "node:vm";
import ts from "typescript";
import { spawnSync } from "node:child_process";
import { register } from "node:module";
import { MISSISSIPPI_SYNTHETIC_ROUTE } from "./rcap-ms-nonconviction-synthetic-facts.mjs";
import { answerBuilderStep } from "./rcap-packet-builder-filler.mjs";
import { chromium } from "playwright";
import { hostedVercelScopedUrl, resolveHostedVercelIdentity } from "./rcap-hosted-acceptance-vercel-identity.mjs";
import { currentClinicWorkerContext, clinicWorkerDockerArgs } from "./rcap-clinic-worker-context.mjs";

// Hosted browser proof for the sponsored RCAP lane only. It crosses the
// durable sponsored-generation boundary after explicit final verification.
// Clinic mode permits one target-first immutable worker cycle; no Stripe or Checkout.
//
// Required fixture/runtime contract:
// - an active `we-must-vote` partner_record (paid or demo_paid, qualified,
//   provisioned or active, target_state MS, access_mode open);
// - a `partner_entitlement` row for that slug;
// - a confirmed, enabled synthetic Supabase user matching the email/password;
// - one guidance-only consumer_briefcase_items row owned by that exact user,
//   with payment_allowed=false, payment_status=not_applicable, and a
//   source_session_id bound to a we-must-vote `flow_mode=rcap`,
//   `partner_benefit_active=true` screening session; pass its id as
//   RCAP_BROWSER_GUIDANCE_ITEM_ID;
// - acceptance Supabase public + service runtime configuration, with CAPTCHA
//   disabled or otherwise satisfied by the hosted test environment.
//
// Invocation (values are intentionally read from the environment and never
// printed): RCAP_BROWSER_BASE_URL, RCAP_BROWSER_EMAIL,
// RCAP_BROWSER_PASSWORD, RCAP_BROWSER_GUIDANCE_ITEM_ID, and
// RCAP_BROWSER_ALLOW_MUTATION=1. RCAP_BROWSER_CHROMIUM and
// RCAP_BROWSER_EVIDENCE_DIR are optional.

const baseUrl = requiredUrl("RCAP_BROWSER_BASE_URL");
const email = required("RCAP_BROWSER_EMAIL");
const password = required("RCAP_BROWSER_PASSWORD");
const guidanceItemId = process.env.RCAP_BROWSER_GUIDANCE_ITEM_ID?.trim()
  ? requiredUuid("RCAP_BROWSER_GUIDANCE_ITEM_ID")
  : null;
const partnerSlug = process.env.RCAP_BROWSER_PARTNER_SLUG?.trim() || "we-must-vote";
const clinicEventId = process.env.RCAP_BROWSER_CLINIC_EVENT_ID?.trim() || "";
const clinicEventSlug = process.env.RCAP_BROWSER_CLINIC_EVENT_SLUG?.trim() || "";
const clinicEventName = process.env.RCAP_BROWSER_CLINIC_EVENT_NAME?.trim() || "";
let clinicAccessCode = process.env.RCAP_BROWSER_CLINIC_ACCESS_CODE?.trim() || "";
const bypassSecret = process.env.RCAP_BROWSER_VERCEL_BYPASS_SECRET?.trim() || "";
const clinicMode = Boolean(clinicEventSlug);
const existingClinicMatterId = process.env.RCAP_BROWSER_EXISTING_CLINIC_MATTER_ID?.trim() || "";
const existingClinicContinuation = Boolean(existingClinicMatterId);
const EXISTING_CLINIC_MATTER = Object.freeze({
  id: '6765fcb9-586d-4abe-bc60-9f77f6a11e16', owner: CLINIC_SETUP.owner,
  session: '56f6cbfa-3dd2-44b1-95bf-84c800396519',
  matter: 'e6450851-89e2-4d77-9ff2-938ec0edaa39',
  partner: 'bc1ed720-681e-4da5-9964-acb2affd5b12'
});
if (existingClinicContinuation) assertExistingClinicContinuationInput(process.env);
const clinicSetupOnly = process.env.RCAP_BROWSER_CLINIC_SETUP_ONLY === "1";
const issueClinicCode = clinicSetupOnly && process.env.RCAP_BROWSER_ISSUE_CLINIC_CODE === "1";
if (clinicSetupOnly) {assertClinicSetupInput(process.env);assertClinicAttemptAuthority(process.env);}
const responseConfig={...(existingClinicContinuation?{existingClinicMatterId}:{}),origin:baseUrl,authOrigin:`https://${CLINIC_SETUP.project}.supabase.co`,clinicSlug:clinicEventSlug};
const result = { attemptId:clinicSetupOnly?CLINIC_FRESH_ATTEMPT.id:null,responseStages:[],responseObservations:[],stage:'readonly_prerequisites',stageResults:[],guardEvents:[],normalReadOnlyViews:[],schemaVersion: "rcap-sponsored-browser-result/v1", clinicMode, partnerSlug };
const evidenceDir = path.resolve(
  process.env.RCAP_BROWSER_EVIDENCE_DIR?.trim() ||
    path.join(process.cwd(), "hosted-acceptance-evidence", "rcap-commercial-flow")
);

if (process.env.RCAP_BROWSER_ALLOW_MUTATION !== "1") {
  fail("RCAP_BROWSER_ALLOW_MUTATION=1 is required because this proof claims one sponsored screening result into the synthetic user's Briefcase.");
}
if (clinicMode && !existingClinicContinuation && (!validUuid(clinicEventId) || !clinicEventName || (!issueClinicCode && clinicAccessCode.length < 8))) {
  fail("Clinic mode requires an exact event id, slug, name, and 8+ character access code.");
}
fs.mkdirSync(evidenceDir, { recursive: true });
const clinicGate=clinicSetupOnly?readCurrentClinicGate(required('RCAP_BROWSER_CLINIC_PREREQUISITES_FILE')):null;
const environmentClassification=clinicGate?clinicGate.preview:await verifyExactHostedPreview(baseUrl,bypassSecret);
result.environmentClassification = environmentClassification;
if (existingClinicContinuation) {
  assert.equal(environmentClassification.previewVerified, true, 'Existing matter requires an actual verified Preview');
  assert.equal(environmentClassification.routeState, 'staging_scoped');
  result.continuation = { matterId: existingClinicMatterId, createsIntake: false, runsWorker: false };
}

const failures = [];
// The Mississippi non-conviction packet re-checks these route facts before
// final verification (mississippiNonConvictionPacketSafety): a first-option
// or placeholder answer makes the review unsafe and hides the verify action
// (run 35120640545). These are the demo fixture's safe answers.
// Prompts the builder renders as free text although the profile validates them
// as dates (the packet specification carries no question type for them).
const browserErrors = [];
const generationRequests = [];
const stripeRequests = [];
const packetDownloadRequests = [];
let screeningSessionId = null;
let participantUserId = null;
const existingClinicResourcePolicies = [];
let existingClinicRevision = null;
let browser;
let activePage;
const requestFailures=[];

async function runJourney() {
  const launchOptions = { headless: true };
  const executablePath = process.env.RCAP_BROWSER_CHROMIUM?.trim();
  if (executablePath) launchOptions.executablePath = executablePath;
  browser = await chromium.launch(launchOptions);
  if (issueClinicCode) {
    const admin=await browser.newContext(); await attachBypass(admin);
    const adminPage=await admin.newPage();
    const adminPath=`/partner/clinic/${CLINIC_SETUP.event}`;
    result.adminDiagnostics={httpStatus:null,currentPathname:null,inlineError:null,requestFailures:[],roleEvidence:'unknown'};
    const adminGuard=createClinicRequestGuard({actor:'admin',captchaPolicy:clinicGate.captchaPolicy,env:process.env,stage:()=>result.stage,events:result.guardEvents,requestFailures:result.adminDiagnostics.requestFailures,stageResults:result.stageResults});
    await admin.route('**/*',adminGuard.route);
    adminPage.on('response',adminGuard.response);adminPage.on('requestfailed',adminGuard.requestFailed);adminPage.on('console',adminGuard.consoleError);adminPage.on('pageerror',adminGuard.pageError);
    adminPage.on('response',response=>{
      if (response.request().method()==='GET'&&response.request().isNavigationRequest()&&new URL(response.url()).pathname===adminPath)
        result.adminDiagnostics.httpStatus=response.status();
    });
    const call=async (pathname,body)=>{
      adminGuard.assertNoCritical();
      const response=await adminPage.evaluate(async ({pathname,body})=>{
        const response=await fetch(pathname,{method:body?'POST':'GET',credentials:'same-origin',
          ...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});
        return {status:response.status,json:await response.json().catch(()=>null)};
      },{pathname,body});
      adminGuard.assertNoCritical();
      if (!body) {
        const event=response.json?.workspace?.event;
        if (response.status===200&&response.json?.success===true&&event?.id===CLINIC_SETUP.event&&event.partnerSlug==='mvl-demo')
          result.adminDiagnostics.roleEvidence='scoped_partner_admin_controls_and_authenticated_exact_event_api';
        else result.adminDiagnostics.inlineError=`Authenticated event access was not verified (HTTP ${response.status})`;
      }
      return response;
    };
    try {
      const codePath=`/api/clinic/events/${CLINIC_SETUP.event}/access-codes`;
      const rawCode=await issueClinicSetupCode({
        normalLogin:async()=>{
          result.stage='admin_normal_signin';
          await adminPage.goto(new URL(`/expungement-ai/sign-in?mode=signin&next=${encodeURIComponent(adminPath)}`,baseUrl).href);
          const auth=await signIn(adminPage,CLINIC_CODE_ADMIN.email,password);
          assert.equal(auth?.user?.id,CLINIC_CODE_ADMIN.id,'normal test-admin identity mismatch');
          result.stage='admin_exact_event_controls';
          await adminPage.waitForURL(url=>url.pathname===adminPath);
          assert.equal(result.adminDiagnostics.httpStatus,200,'Scoped Clinic event page did not load successfully');
          await requireClinicAdminControls(adminPage);
          result.adminDiagnostics.currentPathname=clinicSetupSafePathname(adminPage.url(),process.env);
          result.adminDiagnostics.roleEvidence='scoped_partner_admin_event_controls';
          return {id:auth.user.id,partnerAdminVisible:true};
        },
        readWorkspace:()=>{result.stage='admin_workspace_read';return call(`/api/clinic/events/${CLINIC_SETUP.event}`);},now:()=>Date.now(),
        readCapacity:()=>call(`/api/clinic/events/${CLINIC_SETUP.event}/reporting`),
        beforeCode:async()=>{
          result.stage='normal_readonly_admission';
          result.normalReadOnlyViews=await readNormalClinicSurfaces(adminPage);
          adminGuard.assertNoCritical();assertNormalClinicSurfaces(result.normalReadOnlyViews);
        },
        createCode:body=>{readCurrentClinicGate(required('RCAP_BROWSER_CLINIC_PREREQUISITES_FILE'));result.stage='admin_one_code_issuance';return call(codePath,body);},
        saveAttempt:value=>fs.writeFileSync(path.join(evidenceDir,'clinic-code-attempt.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx'}),
        saveResult:value=>fs.writeFileSync(path.join(evidenceDir,'clinic-code-result.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx'}),
        saveVerified:value=>fs.writeFileSync(path.join(evidenceDir,'clinic-code-verified.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx'})
      });
      clinicAccessCode=rawCode; process.env.RCAP_BROWSER_CLINIC_ACCESS_CODE=rawCode;
    } catch(error) {
      await captureClinicAdminFailure(adminPage,result.adminDiagnostics,process.env);
      throw error;
    } finally {await admin.close();}
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme: "light"
  });
  await attachBypass(context);
  const participantGuard=clinicSetupOnly||existingClinicContinuation?createClinicRequestGuard({actor:'participant',captchaPolicy:clinicGate?.captchaPolicy,env:process.env,
    stage:()=>result.stage,events:result.guardEvents,requestFailures,stageResults:result.stageResults,
    isOwnedMatterSpeculativePrefetch:request=>existingClinicContinuation&&existingClinicContinuationRequestDecision(request,responseConfig)==='optional_owned_matter_prefetch'}):null;
  if(participantGuard&&clinicSetupOnly)await context.route('**/*',participantGuard.route);
  if (existingClinicContinuation) await context.route('**/*', async route => {
    const request = route.request(), decision = existingClinicContinuationRequestDecision(request, responseConfig);
    if (decision === 'readonly_telemetry_suppressed') {
      participantGuard.recordReadonlyBoundary(request, {outcome:decision,ruleId:decision});
      return route.fulfill({status:204,body:''});
    }
    if (decision === 'optional_owned_matter_prefetch') return participantGuard.route(route);
    if (decision !== 'allowed') {
      participantGuard.recordReadonlyBoundary(request, {outcome:'readonly_blocked',ruleId:decision});
      browserErrors.push('existing_matter_request_refused');
      return route.abort('blockedbyclient');
    }
    if (request.method() === 'GET' && request.resourceType() === 'document' && new URL(request.url()).origin === baseUrl) {
      let response;
      try { response = await route.fetch({headers:bypassSecret?previewRequestHeaders(bypassSecret,request.headers()):request.headers(),maxRedirects:0,maxRetries:0}); }
      catch { browserErrors.push('existing_matter_document_transport_failed'); return route.abort('failed'); }
      if (response.status() !== 200) {
        participantGuard.recordReadonlyBoundary(request, {outcome:'readonly_blocked',ruleId:response.status()>=300&&response.status()<400?'readonly_redirect_blocked':'readonly_http_refusal_blocked'});
        browserErrors.push('existing_matter_document_http_refusal'); return route.abort('blockedbyclient');
      }
      let body;
      try {
        body = await response.body();
        existingClinicResourcePolicies.push(publicReactResourcePolicy(body.toString('utf8')));
        return await route.fulfill({response,body});
      } catch {
        browserErrors.push('existing_matter_document_body_unavailable');
        await route.abort('failed').catch(()=>{});
      }
    }
    return route.fallback();
  });
  const page = await context.newPage();
  let screeningProfileCapture = null;
  if (clinicSetupOnly) activePage=page;
  if(participantGuard) {
    page.on('response',participantGuard.response);page.on('pageerror',participantGuard.pageError);page.on('console',participantGuard.consoleError);page.on('requestfailed',participantGuard.requestFailed);
  } else {
  page.on("pageerror", (error) => browserErrors.push(`pageerror at ${safeRequestPath(page.url())}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`console at ${safeRequestPath(page.url())}: ${message.text()}`);
  });
  page.on("requestfailed", (request) => {
    const detail = request.failure()?.errorText ?? "request failed";
    if (clinicSetupOnly) requestFailures.push({method:request.method(),pathname:clinicSetupSafePathname(request.url(),process.env),
      error:detail.match(/(?:net::)?ERR_[A-Z_]+/)?.[0] ?? 'request failed'});
    if (!/ERR_ABORTED/i.test(detail)) {
      browserErrors.push(`requestfailed: ${request.method()} ${safeRequestPath(request.url())} (${detail})`);
    }
  });
  }
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (/^\/api\/rcap\/packets\/[^/]+\/download$/.test(requestUrl.pathname)) packetDownloadRequests.push(requestUrl.pathname);
    if (/stripe\.com$/i.test(requestUrl.hostname) || /\/checkout(?:\/|$)|\/stripe(?:\/|$)/i.test(requestUrl.pathname)) {
      stripeRequests.push({ method: request.method(), origin: requestUrl.origin, path: requestUrl.pathname });
    }
    if (request.method() === "POST" && requestUrl.pathname === "/api/expungement-ai/packet/generate") {
      generationRequests.push({ method: request.method(), path: requestUrl.pathname });
    }
    if (request.method() === "POST" && requestUrl.pathname === "/api/expungement-ai/screening/pending") {
      const body = request.postDataJSON?.();
      if (validUuid(body?.anonymousSessionId)) screeningSessionId = body.anonymousSessionId;
    }
  });

  let packetItemId;
  if (existingClinicContinuation) {
    packetItemId = await openExistingClinicMatter(page, context);
  } else {
  // 1. Enter either the bounded Clinic event or the canonical partner page.
  // Both paths create the sponsored screening session server-side; Clinic mode
  // additionally proves the event-code and participant-owned assistance chain.
  if (clinicMode) {
    const clinicEntry = new URL(`/clinic/${encodeURIComponent(clinicEventSlug)}`, baseUrl).href;
    if(clinicSetupOnly) {
      result.stage='participant_normal_signin';
      await page.goto(new URL(`/expungement-ai/sign-in?mode=signin&next=${encodeURIComponent(`/clinic/${clinicEventSlug}`)}`,baseUrl).href);
      const auth=await signIn(page,email,password);assert.equal(auth?.user?.id,CLINIC_SETUP.owner);
      participantUserId=auth.user.id;
      await page.waitForURL(url=>url.pathname===`/clinic/${clinicEventSlug}`);
      participantGuard.assertNoCritical();
    }
    result.stage='participant_entry';
    const landingResponse = await page.goto(clinicEntry, { waitUntil: "networkidle" });
    check(landingResponse?.ok(), `Clinic entry returned ${landingResponse?.status() ?? "no response"}.`);
    await expectText(page, clinicEventName);
    await page.getByLabel("Event access code").fill(clinicAccessCode);
    const entryResponse=clinicSetupOnly ? page.waitForResponse(response=>matchesOriginalResponse(response,'entry',responseConfig),{timeout:15000}).catch(()=>null) : null;
    participantGuard?.assertNoCritical();result.stage='participant_code_redemption';
    await page.getByRole("button", { name: "Continue to participant consent", exact: true }).click();
    if (clinicSetupOnly) {
      const observation=await captureClinicEntryResponse(await entryResponse);
      result.entryDiagnostics={httpStatus:observation.httpStatus,responseOutcome:observation.outcome,bodyState:observation.bodyState};
      assertClinicEntryAccepted(observation);
    }
    await page.waitForURL((url) => url.pathname === `/clinic/${clinicEventSlug}/assist` || url.pathname === "/expungement-ai/sign-in");
    if (new URL(page.url()).pathname === "/expungement-ai/sign-in") {
      assert.equal(clinicSetupOnly,false,'Existing participant session unavailable; no automatic reauthentication or code retry');
      await page.goto(new URL(`/expungement-ai/sign-in?mode=signin&next=${encodeURIComponent(`/clinic/${clinicEventSlug}/assist`)}`, baseUrl).href);
      participantGuard?.assertNoCritical();result.stage='participant_normal_signin';
      const signedIn = await signIn(page, email, password);
      participantUserId = signedIn?.user?.id ?? signedIn?.id ?? null;
    }
    await page.waitForURL((url) => url.pathname === `/clinic/${clinicEventSlug}/assist`);
    if (clinicSetupOnly) {
      assert.equal(participantUserId, CLINIC_SETUP.owner, 'existing Clinic account must own this new journey');
      assert.equal(await page.locator('input[name="consent"]').isChecked(),false,'fresh consent must start unchecked');
      await page.locator('select[name="eventStaffId"]').selectOption(CLINIC_SETUP.staff);
    } else await page.locator('select[name="eventStaffId"]').selectOption({ index: 1 });
    await page.locator('input[name="consent"]').check();
    const assistanceResponse = clinicSetupOnly ? page.waitForResponse(response=>matchesOriginalResponse(response,'assistance',responseConfig)) : null;
    participantGuard?.assertNoCritical();result.stage='participant_fresh_consent';
    screeningProfileCapture = await openScreeningWithProfile(page, responseConfig,
      () => page.getByRole("button", { name: "Start screening with assistance", exact: true }).click());
    if (clinicSetupOnly) {
      const response=await assistanceResponse;requireOriginalResponse(response,'assistance');
      result.freshConsent={startedUnchecked:true,submittedFromNormalUI:true,status:response.status(),staffId:CLINIC_SETUP.staff,ownerId:participantUserId};
    }
    await page.waitForURL((url) => url.pathname === `/clinic/${clinicEventSlug}/screening/ms`);
    await expectText(page, "Shared-device privacy is active");
    result.clinicEntry = clinicEntry;
  } else {
  // The canonical partner entry must remain on the acceptance origin. On
  // production the protected static launch remains unchanged; preview hosts
  // deliberately render the dynamic page whose CTA is relative.
  const partnerEntry = new URL(`/p/${encodeURIComponent(partnerSlug)}`, baseUrl).href;
  const landingResponse = await page.goto(partnerEntry, { waitUntil: "networkidle" });
  check(landingResponse?.ok(), `Partner entry returned ${landingResponse?.status() ?? "no response"}.`);
  await expectText(page, "We Must Vote");
  const entryCta = page.getByRole("link", { name: /Start Mississippi Record Review|Start My Free Screening/i }).first();
  check(await entryCta.isVisible(), "Partner entry CTA is not visible.");
  const entryHref = await entryCta.getAttribute("href");
  check(entryHref === `/intake/${partnerSlug}`, `Partner entry CTA must be same-origin /intake/${partnerSlug}; got ${entryHref ?? "missing href"}.`);
  await entryCta.click();
  await page.waitForURL((url) => url.origin === new URL(baseUrl).origin && url.pathname === `/intake/${partnerSlug}`);

  // 2. Fresh-context account round trip. The auth response must leave the
  // browser and succeed, then the server-rendered intake must see the session.
  const signInLink = page.getByRole("link", { name: "Sign in to continue", exact: true });
  check(await signInLink.isVisible(), "Signed-out partner intake did not show Sign in to continue.");
  await signInLink.click();
  await page.waitForURL((url) => url.pathname === "/expungement-ai/sign-in" && url.searchParams.get("mode") === "signin");
  const signedIn = await signIn(page, email, password);
  participantUserId = signedIn?.user?.id ?? signedIn?.id ?? null;
  await page.waitForURL((url) => url.origin === new URL(baseUrl).origin && url.pathname === `/intake/${partnerSlug}`);

  const authCookies = (await context.cookies(baseUrl)).filter((cookie) => /^sb-.*-auth-token/.test(cookie.name));
  check(authCookies.length > 0, "Supabase session cookie was not written on the acceptance origin.");
  const startButton = page.getByRole("button", { name: /Start your record-clearing screening/i });
  check(await startButton.isVisible(), "Authenticated intake did not render the sponsored screening start control.");

  // 3. Start one sponsored screening and answer the deterministic Mississippi
  // non-conviction fixture. The engine remains authoritative for the result.
  screeningProfileCapture = await openScreeningWithProfile(page, responseConfig, () => startButton.click());
  await page.waitForURL((url) => url.pathname === "/expungement-ai/screening/ms" && validUuid(url.searchParams.get("session")));
  }

  const authCookies = (await context.cookies(baseUrl)).filter((cookie) => /^sb-.*-auth-token/.test(cookie.name));
  check(authCookies.length > 0, "Supabase session cookie was not written on the acceptance origin.");

  result.stage='participant_screening';
  const screeningCompletion=clinicSetupOnly?captureOriginalResponseOnce(page,'completion',responseConfig,{timeout:45000}):null;
  const screeningSequence=await runScreeningFromOriginalProfile(page,screeningProfileCapture,
    {observations:result.responseObservations,stages:result.responseStages});
  result.mississippiQuestionOrder=screeningSequence.answeredQuestionIds;
  result.mississippiOmittedOptionalQuestions=screeningSequence.omittedQuestionIds;
  result.mississippiEvaluationStatuses=screeningSequence.evaluationStatuses;
  await page.locator('[data-partner-context="saved"]').filter({
    hasText: /^Your partner program information is saved\. Packet coverage is confirmed before preparation\.$/
  }).waitFor({ state: "visible" });
  assertNoCommercialCopy(await page.locator("main").innerText(), "partner result");
  await screenshotPair(page, "01-partner-covered-result");

  // 3. Persist and claim the server-re-evaluated pending result. Capture the
  // exact item id from the claim response instead of guessing from Briefcase.
  if(clinicSetupOnly) {
    result.screeningCompletion={...(await screeningCompletion.read())};
    assert.equal(result.screeningCompletion?.httpStatus,200,'screening completion must respond before pending-result creation');
    assert.equal(result.screeningCompletion.accepted,true,'screening completion response contract refused');
    // The deployed completion API is best-effort; HTTP success does not prove the session-completion write.
    result.screeningCompletion.persistenceVerified=false;
    participantGuard.assertNoCritical();
  }
  participantGuard?.assertNoCritical();result.stage='participant_claim';
  const {claimed} = await saveScreeningAndClaim(page,responseConfig);
  await page.waitForURL((url) => url.origin === new URL(baseUrl).origin && validUuid(exactBriefcaseItemId(url.pathname)));
  packetItemId = exactBriefcaseItemId(new URL(page.url()).pathname);
  check(validUuid(packetItemId), "Partner pending-result claim did not land on an exact Briefcase item.");
  if (!validUuid(packetItemId)) throw new Error(failures.join("\n"));
  if (validUuid(claimed?.itemId)) check(claimed.itemId === packetItemId, "Partner claim response and exact matter URL disagree.");
  if (exactBriefcaseItemId(claimed?.redirectTo)) check(exactBriefcaseItemId(claimed.redirectTo) === packetItemId, "Partner claim redirect and exact matter URL disagree.");

  if(clinicSetupOnly)await page.locator(`[data-briefcase-matter-id="${packetItemId}"]`).waitFor({state:"visible"});
  await page.getByText("MS", { exact: true }).first().waitFor({ state: "visible" });
  await expectText(page, "Non-conviction expungement for dismissal, no disposition, or acquittal");
  check(!(await page.getByText("We couldn't find that matter", { exact: true }).isVisible().catch(() => false)), "Saved partner matter was not visible to the authenticated user.");
  assertNoCommercialCopy(await page.locator("main").innerText(), "partner-covered Briefcase matter");
  await screenshotPair(page, "02-partner-covered-briefcase-matter");

  if (clinicSetupOnly) {
    result.savedMatterObservation={matterId:packetItemId,screeningSessionId,participantUserId,
      claimAccepted:claimed?.accepted===true,claimMatterId:claimed?.matterId,
      currentPathname:new URL(page.url()).pathname,renderedMatterVerified:true,databasePersistenceVerified:false};
    participantGuard.assertNoCritical();result.stage='setup_complete';
    assert.equal(new URL(page.url()).pathname,`/briefcase/matters/${packetItemId}`,'Clinic must land on the canonical matter page');
    assert.equal(claimed?.matterId,packetItemId,'actual claim must name the new saved matter');
    assert.notEqual(screeningSessionId,null,'Pending result must identify the new Clinic screening');
    for(const previous of CLINIC_FRESH_ATTEMPT.previousAttempts)assert.notEqual(screeningSessionId,previous.screeningSessionId,'Do not reuse the previous Clinic screening');
    assert.notEqual(packetItemId,'6e7a0013-f372-438d-9454-6ba6451b290c','do not replay the historical Clinic case');
    assert.notEqual(packetItemId,'d13233f6-d9c7-41e1-9bb5-8a454d747503','do not relabel the DTC case');
    assert.equal(participantUserId,CLINIC_SETUP.owner);
    assert.equal(generationRequests.length,0); assert.equal(stripeRequests.length,0); assert.equal(packetDownloadRequests.length,0);
    assert.deepEqual(failures,[]); assert.deepEqual(browserErrors,[]);
    result.passed=true; result.scope='clinic_setup_only';
    result.stopReason='new_owned_screening_claimed_before_packet_builder_funding_render_worker';
    result.itemId=packetItemId; result.participantUserId=participantUserId; result.screeningSessionId=screeningSessionId;
    result.fullHostedJourneyCompleted=false;
    fs.writeFileSync(path.join(evidenceDir,'clinic-setup-only-result.json'),JSON.stringify(result,null,2)+'\n');
    return;
  }

  }

  // 4. Complete the sponsored packet-information builder. Saving the final
  // fact must reach review without starting generation.
  // The Briefcase labels a Mississippi clinic packet "Continue my Mississippi
  // clinic packet"; other partner-covered matters keep "Complete packet information".
  if (!existingClinicContinuation) {
  const builderLink = page.getByRole("link", { name: /^(?:Complete packet information|Continue my Mississippi clinic packet)$/ });
  check(await builderLink.isVisible(), "Partner-covered Mississippi matter did not expose the packet-information link.");
  const builderHref = await builderLink.getAttribute("href");
  const builderUrl = builderHref ? new URL(builderHref, baseUrl) : null;
  check(builderUrl?.origin === new URL(baseUrl).origin, "Packet-information CTA must stay on the current acceptance origin.");
  await builderLink.click();
  await page.waitForURL((url) => url.origin === new URL(baseUrl).origin && url.pathname.includes(`/briefcase/${packetItemId}/`) && url.pathname.endsWith("/packet-information"));
  }
  await expectText(page, "Complete packet information");
  assertNoCommercialCopy(await page.locator("main").innerText(), "partner packet-information builder");
  await screenshotPair(page, "03-partner-covered-packet-builder");

  for (let step = 0; step < 80 && new URL(page.url()).pathname.endsWith("/packet-information"); step += 1) {
    await answerCurrentBuilderQuestion(page);
    const saveResponsePromise = packetInformationResponse(page, packetItemId);
    const finalButton = page.getByRole("button", { name: "Review packet facts", exact: true });
    let saveResponse;
    if (await finalButton.isVisible().catch(() => false)) {
      if (existingClinicContinuation) [saveResponse] = await Promise.all([
        saveResponsePromise, page.waitForURL(url=>url.pathname===`/briefcase/${packetItemId}/review`,{timeout:20_000}), finalButton.click()
      ]);
      else await finalButton.click();
    } else {
      await page.getByRole("button", { name: "Save and continue", exact: true }).click();
    }
    saveResponse ??= await saveResponsePromise;
    check(saveResponse.ok(), `Partner packet-information save returned ${saveResponse.status()}.`);
    if (existingClinicContinuation) {
      const saved = requireOriginalResponse(saveResponse, 'packet_information');
      assert.equal(saved.itemId, EXISTING_CLINIC_MATTER.id);
      result.packetRevision = saved.revision; existingClinicRevision = saved.revision;
    }
    if (!saveResponse.ok()) break;
  }
  await page.waitForURL((url) => url.pathname === `/briefcase/${packetItemId}/review`, { timeout: 20_000 });
  // The review page has an outer "We can’t review this matter yet" branch
  // whose heading also matches a partial "Review and confirm" text wait (runs
  // 35120640545 and 35122300936). Require the actual verification panel and
  // report the page's own branch diagnostics when it is absent.
  const verificationPanel = page.locator("[data-packet-verification-state]");
  const unavailableBranch = page.locator("[data-review-branch='unavailable']");
  await Promise.race([
    verificationPanel.waitFor({ state: "visible", timeout: 20_000 }).catch(() => null),
    unavailableBranch.waitFor({ state: "visible", timeout: 20_000 }).catch(() => null)
  ]);
  if (!(await verificationPanel.count())) {
    const branch = await unavailableBranch.evaluate((node) => Object.fromEntries(
      Array.from(node.attributes).filter((attribute) => attribute.name.startsWith("data-")).map((attribute) => [attribute.name, attribute.value])
    )).catch(() => null);
    const crumbs = await page.locator("nav").first().innerText().catch(() => "");
    await screenshotPair(page, "04-partner-review-unavailable");
    throw new Error(`The review page rendered its unavailable branch instead of the verification panel: ${JSON.stringify(branch)}; breadcrumb ${JSON.stringify(crumbs.replace(/\s+/g, " ").trim())}`);
  }
  await expectText(page, "Review and confirm");
  assertNoCommercialCopy(await page.locator("main").innerText(), "partner final verification");
  check((await page.getByRole("button", { name: "Generate my packet", exact: true }).count()) === 0, "Sponsored generation was available before explicit verification.");
  check(generationRequests.length === 0, "Sponsored generation was requested before explicit verification.");
  await screenshotPair(page, "04-partner-facts-before-verification");

  // 5. Verification uses the shared packet-information boundary. Only its
  // ready response may reveal the sponsored generation action.
  // The verify action renders only when the saved facts are complete and
  // route-safe; report the review panel instead of an unhandled timeout
  // (run 35120640545 crashed while the click waited on a missing button).
  const verifyButton = page.getByRole("button", { name: "Verify and prepare clinic packet", exact: true });
  try {
    await verifyButton.waitFor({ state: "visible", timeout: 15_000 });
  } catch {
    const panel = await page.locator("[data-packet-verification-state]").innerText().catch(() => "(no verification panel)");
    const reviewResult = await page.locator("main").innerText().then((text) => text.match(/Result[\s\S]{0,160}/)?.[0] ?? "").catch(() => "");
    throw new Error(`Verify action unavailable on the review page. Panel: ${JSON.stringify(panel)}. ${reviewResult}`);
  }
  const verificationResponsePromise = packetInformationResponse(page, packetItemId);
  const generationResponsePromise = page.waitForResponse(
    (response) => matchesOriginalResponse(response,"generation",responseConfig),
    { timeout: 30_000 }
  );
  await verifyButton.click();
  const [verificationResponse,generationResponse] = await Promise.all([verificationResponsePromise,generationResponsePromise]);
  check(verificationResponse.ok(), `Partner final verification returned ${verificationResponse.status()}.`);
  if (existingClinicContinuation) {
    const verified = requireOriginalResponse(verificationResponse, 'packet_information');
    assert.equal(verified.readyToGenerate, true);
    assert.equal(verified.itemId, EXISTING_CLINIC_MATTER.id);
    result.packetRevision = verified.revision; existingClinicRevision = verified.revision;
  }

  const generationResponseBody = requireOriginalResponse(generationResponse,"generation");
  if (existingClinicContinuation) {
    assert.equal(generationResponseBody.httpStatus, 200);
    assert.equal(generationResponseBody.packetStatus, 'generating');
    assert.equal(generationResponseBody.briefcaseItemId, EXISTING_CLINIC_MATTER.id);
  }
  check(generationRequests.length === 1, `Expected one sponsored generation request after verification; saw ${generationRequests.length}.`);
  // The durable job must finish before the Briefcase can expose its artifact.
  // Reuse the payment harness's exact claim-order and worker-cycle contract.
  let clinicProof = null;
  if (existingClinicContinuation) {
    assert.equal(failures.length, 0, failures.join("\n"));
    await page.waitForURL(url=>url.origin===new URL(baseUrl).origin&&url.pathname===`/briefcase/${packetItemId}`,{waitUntil:'domcontentloaded',timeout:20_000});
    await page.waitForLoadState('networkidle',{timeout:10_000});
    const rows = await clinicTargetJobs(async query=>({json:await readExistingClinicReadonlyRows(query,'protectedJobRead')}),packetItemId);
    const target = existingClinicGeneratedJob(rows, generationResponseBody);
    result.generatedJob = { id: target.id, matterId: target.matter_id,
      briefcaseItemId: packetItemId, ownerId: participantUserId, screeningSessionId,
      verificationHash: target.sponsored_verification_hash, status: target.status };
    participantGuard.assertNoCritical();
    assert.equal(browserErrors.length, 0);
    result.stage = 'existing_matter_waiting_for_exclusive_worker';
    result.stopReason = 'Actual generation and protected target binding observed; F exclusive worker procedure is required before any worker or first delivery.';
    result.scope='existing_owned_matter_packet_to_queued_job';
    result.status='ENQUEUED_WORKER_HANDOFF_REQUIRED'; result.enqueued=true;
    result.fullHostedJourneyCompleted = false; result.workerInvoked = false; result.passed = true;
    result.generationResponseBody = generationResponseBody;
    writeClinicReceipt('existing-matter-generation-bound', result.generatedJob);
    fs.writeFileSync(path.join(evidenceDir, 'sponsored-browser-result.json'), JSON.stringify(result, null, 2)+'\n');
    process.exitCode = 0;
    return;
  } else if (clinicMode) {
    assert.equal(failures.length, 0, failures.join("\n"));
    const ports = await clinicDeliveryPorts({ packetItemId, participantUserId, screeningSessionId });
    clinicProof = await runClinicTargetCycle(ports, {
      packetItemId, participantUserId, screeningSessionId, clinicEventId,
      generatedItemId: generationResponseBody?.briefcaseItemId
    });
    result.naturalDelivery = clinicProof.evidence;
    clinicProof.ports = ports;
  }
  await page.waitForURL((url) => url.pathname === `/briefcase/${packetItemId}`, { timeout: 20_000 });
  // Refresh only the existing matter view; this is not another generation or download.
  if (clinicMode) {
    await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.locator('[data-packet-ready="true"]').waitFor({ state: "visible", timeout: 30_000 });
    await page.locator(`a[href="/api/rcap/packets/${clinicProof.target.id}/download"]`).waitFor({ state: "visible", timeout: 15_000 });
  }
  assertNoCommercialCopy(await page.locator("main").innerText(), "generated partner packet action");
  await screenshotPair(page, "05-partner-packet-generated");

  const download = page.getByRole("link", { name: /Download Mississippi non-conviction expungement packet/i });
  await download.waitFor({ state: "visible" });
  const downloadHref = await download.getAttribute("href");
  check(Boolean(downloadHref), "Generated packet has no private download link.");
  if (!downloadHref) throw new Error(failures.join("\n"));
  const downloadUrl = new URL(downloadHref, baseUrl);
  assert.equal(downloadUrl.origin, new URL(baseUrl).origin, "download must stay on the verified Preview");
  const downloadOnce = async () => {
    const response = await context.request.get(downloadUrl.href, { headers: bypassHeaders() });
    return { status: response.status(), contentType: response.headers()["content-type"] ?? "", bytes: await response.body() };
  };
  let firstBytes, firstHash, secondHash;
  if (clinicProof) {
    assert.equal(packetDownloadRequests.filter(p => p === downloadUrl.pathname).length, 0, "private packet requested before explicit owner download");
    const delivery = await proveClinicFirstDelivery({
      ...clinicProof.ports, downloadOnce,
      generationCount: () => generationRequests.length
    }, clinicProof.target, clinicProof.evidence);
    firstBytes = delivery.firstBytes;
    firstHash = delivery.firstHash;
    secondHash = delivery.secondHash;
  } else {
    const firstDownload = await downloadOnce();
    firstBytes = firstDownload.bytes;
    firstHash = pdfSha(firstBytes);
    check(firstDownload.status === 200 && /^application\/pdf/i.test(firstDownload.contentType), `First private packet download returned ${firstDownload.status}.`);
    const secondDownload = await downloadOnce();
    secondHash = pdfSha(secondDownload.bytes);
    check(secondDownload.status === 200 && firstHash === secondHash, `Repeat packet download returned ${secondDownload.status} with stable bytes=${firstHash === secondHash}.`);
  }
  result.packetItemId = packetItemId;
  result.screeningSessionId = screeningSessionId;
  result.generationResponseBody = generationResponseBody;
  result.downloadPath = new URL(downloadHref, baseUrl).pathname;
  result.artifactSha256 = firstHash;
  result.artifactBytes = firstBytes.length;
  result.repeatDownloadSha256 = secondHash;

  if (clinicMode && !existingClinicContinuation) {
    const negativeEmail = required("RCAP_BROWSER_NEGATIVE_EMAIL");
    const negativePassword = required("RCAP_BROWSER_NEGATIVE_PASSWORD");
    const negativeContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await attachBypass(negativeContext);
    const negativePage = await negativeContext.newPage();
    await negativePage.goto(new URL("/expungement-ai/sign-in?mode=signin&next=%2Fbriefcase", baseUrl).href);
    await signIn(negativePage, negativeEmail, negativePassword);
    await negativePage.waitForURL((url) => url.pathname === "/briefcase");
    const denied = await negativeContext.request.get(new URL(downloadHref, baseUrl).href, { headers: bypassHeaders() });
    check(denied.status() === 404, `Participant B private artifact denial returned ${denied.status()} instead of indistinguishable 404.`);
    if (clinicProof) clinicProof.evidence.strangerStatus = denied.status();
    await negativeContext.close();
    const anonymousContext = await browser.newContext();
    await attachBypass(anonymousContext);
    const anonymous = await anonymousContext.request.get(downloadUrl.href, { headers: bypassHeaders() });
    assert.ok([401, 404].includes(anonymous.status()), `Anonymous artifact denial returned ${anonymous.status()}`);
    if (clinicProof) clinicProof.evidence.anonymousStatus = anonymous.status();
    await anonymousContext.close();

    const staffEmail = required("RCAP_BROWSER_STAFF_EMAIL");
    const staffPassword = required("RCAP_BROWSER_STAFF_PASSWORD");
    const staffContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await attachBypass(staffContext);
    const staffPage = await staffContext.newPage();
    await staffPage.goto(new URL(`/expungement-ai/sign-in?mode=signin&next=${encodeURIComponent(`/clinic/staff/${clinicEventId}/queue`)}`, baseUrl).href);
    await signIn(staffPage, staffEmail, staffPassword);
    await staffPage.waitForURL((url) => url.pathname === `/clinic/staff/${clinicEventId}/queue`);
    await expectText(staffPage, clinicEventName);
    const participantSuffix = typeof participantUserId === "string" ? participantUserId.slice(-8) : "";
    check(participantSuffix.length === 8, "Participant A auth identity was not captured for the event-scoped staff proof.");
    const participantStatus = staffPage.getByLabel(`Packet status for participant ending ${participantSuffix}`);
    await participantStatus.waitFor({ state: "visible" });
    const staffCaseIsPacketReady = await participantStatus.inputValue() === "packet_ready";
    check(staffCaseIsPacketReady, "Event staff did not see Participant A's newly prepared packet case.");
    await expectText(staffPage, "Packet prepared");
    result.staffView = `/clinic/staff/${clinicEventId}/queue`;
    result.staffParticipantReference = `…${participantSuffix}`;
    await staffContext.close();

    await page.evaluate(async () => {
      localStorage.setItem("rcap-reset-proof", "participant-a");
      sessionStorage.setItem("rcap-reset-proof", "participant-a");
      await new Promise((resolve, reject) => {
        const request = indexedDB.open("rcap-reset-proof", 1);
        request.onsuccess = () => { request.result.close(); resolve(null); };
        request.onerror = () => reject(request.error);
      });
      await caches.open("rcap-reset-proof");
    });
    const resetResponsePromise = page.waitForResponse(
      (response) => {const operation=originalResponseOperation(response.request(),responseConfig);return operation==='reset_complete'||operation?.startsWith('reset_')&&originalResponse(response,operation).accepted===false;}
    );
    await page.getByRole("button", { name: "End clinic session / Reset device", exact: true }).click();
    const resetResponse = await resetResponsePromise;
    requireOriginalResponse(resetResponse,"reset_complete");
    await page.waitForURL((url) => url.pathname === `/clinic/${clinicEventSlug}`);
    const participantCookies = (await context.cookies()).filter((cookie) => cookie.name.startsWith("clinic_") || cookie.name.startsWith("sb-"));
    check(participantCookies.length === 0, `Clinic reset retained ${participantCookies.length} participant cookie(s).`);
    const storageState = await page.evaluate(async () => ({
      localStorage: localStorage.length,
      sessionStorage: sessionStorage.length,
      indexedDB: typeof indexedDB.databases === "function" ? (await indexedDB.databases()).length : -1,
      cacheStorage: (await caches.keys()).length,
      serviceWorkers: (await navigator.serviceWorker.getRegistrations()).length
    }));
    check(Object.values(storageState).every((count) => count === 0), `Clinic reset retained browser storage: ${JSON.stringify(storageState)}.`);
    const revokedDownload = await context.request.get(new URL(downloadHref, baseUrl).href, { headers: bypassHeaders() });
    check([401, 404].includes(revokedDownload.status()), `Clinic reset left Participant A's private download usable (${revokedDownload.status()}).`);
    const cleanEntryPath = `/clinic/${clinicEventSlug}`;
    await page.evaluate((path) => {
      history.replaceState({ resetProof: "back" }, "", path);
      history.pushState({ resetProof: "forward" }, "", path);
    }, cleanEntryPath);
    await page.goBack({ waitUntil: "domcontentloaded" });
    check((await page.evaluate(() => history.state?.resetProof)) === "back", "Browser Back did not traverse the clean reset history entry.");
    check(new URL(page.url()).pathname === cleanEntryPath, `Browser Back restored participant state at ${new URL(page.url()).pathname}.`);
    await page.goForward({ waitUntil: "domcontentloaded" });
    check((await page.evaluate(() => history.state?.resetProof)) === "forward", "Browser Forward did not traverse the clean reset history entry.");
    check(new URL(page.url()).pathname === cleanEntryPath, `Browser Forward restored participant state at ${new URL(page.url()).pathname}.`);
    const historyTraversal = [];
    for (const direction of ["back", "back", "back", "forward", "forward", "forward"]) {
      if (direction === "back") await page.goBack({ waitUntil: "domcontentloaded" });
      else await page.goForward({ waitUntil: "domcontentloaded" });
      const observedPath = new URL(page.url()).pathname;
      const participantContentVisible = (await page.locator("body").innerText()).includes(packetItemId);
      historyTraversal.push({ direction, observedPath, participantContentVisible });
      check(observedPath === cleanEntryPath && !participantContentVisible,
        `Browser ${direction} traversal restored participant state at ${observedPath}.`);
    }

    await page.goto(new URL(`/expungement-ai/sign-in?mode=signin&next=${encodeURIComponent(`/briefcase/${packetItemId}`)}`, baseUrl).href);
    await signIn(page, negativeEmail, negativePassword);
    await page.waitForURL((url) => url.pathname === `/briefcase/${packetItemId}` || url.pathname === "/briefcase");
    const sameDeviceDenied = await context.request.get(new URL(downloadHref, baseUrl).href, { headers: bypassHeaders() });
    const sameDeviceParticipantBDenial = sameDeviceDenied.status() === 404;
    check(sameDeviceParticipantBDenial, `Participant B on the reset device received ${sameDeviceDenied.status()} instead of indistinguishable 404 for Participant A's artifact.`);
    result.participantBDenied = denied.status() === 404;
    result.staffViewPassed = participantSuffix.length === 8 && staffCaseIsPacketReady;
    result.deviceResetPassed = resetBody?.signOutConfirmed === true
      && participantCookies.length === 0
      && Object.values(storageState).every((count) => count === 0)
      && [401, 404].includes(revokedDownload.status())
      && sameDeviceParticipantBDenial;
    result.deviceReset = { storageState, revokedDownloadStatus: revokedDownload.status(), historyTraversal, sameDeviceParticipantBDenial };
  }

  // 6. The legacy sponsored harness also keeps its guidance-only negative
  // guidance value has no disabled packet stepper or consumer payment copy.
  if (guidanceItemId && !existingClinicContinuation) {
  await page.goto(new URL(`/briefcase/${guidanceItemId}`, baseUrl).href, { waitUntil: "networkidle" });
  await expectText(page, "Next steps saved");
  await expectText(page, "Next steps");
  check(!(await page.getByText("We couldn't find that matter", { exact: true }).isVisible().catch(() => false)), "Seeded guidance-only matter is not owned by the signed-in synthetic user.");
  check((await page.locator("main").getByText("Payment", { exact: true }).count()) === 0, "Guidance-only matter renders a Payment step.");
  check((await page.getByRole("link", { name: /checkout|pay \$50|continue to payment/i }).count()) === 0, "Guidance-only matter renders a payment action.");
  assertNoCommercialCopy(await page.locator("main").innerText(), "guidance-only matter");
  await screenshotPair(page, "06-guidance-only-matter");
  }

  if (browserErrors.length > 0) {
    failures.push(...browserErrors);
  }
  check(stripeRequests.length === 0, `Clinic journey observed ${stripeRequests.length} Stripe or Checkout request(s).`);
  if (result.naturalDelivery) {
    result.naturalDelivery.stripeRequests = stripeRequests.length;
    result.naturalDelivery.checkoutRequests = stripeRequests.filter(r => /checkout/i.test(r.path)).length;
    result.naturalDelivery.productionMutation = false;
  }

  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }
  if (result.naturalDelivery) writeClinicReceipt("complete", result.naturalDelivery);

  console.log("RCAP commercial browser proof passed.");
  console.log(`Partner start: ${new URL(`/p/${partnerSlug}`, baseUrl).href}`);
  console.log(`Packet-covered item: ${packetItemId}`);
  if (guidanceItemId) console.log(`Guidance item: ${guidanceItemId}`);
  console.log(`Evidence directory: ${evidenceDir}`);
  result.passed = true;
  result.productionTouched = environmentClassification.previewVerified ? false : null;
  result.stripeTouched = environmentClassification.stripeConfigured === false && stripeRequests.length === 0 ? false : null;
  result.stripeEvidence = { deploymentConfigured: environmentClassification.stripeConfigured, browserRequests: stripeRequests };
  fs.writeFileSync(path.join(evidenceDir, "sponsored-browser-result.json"), `${JSON.stringify(result, null, 2)}\n`);
}

try { await runJourney(); } catch (error) {
  if(error.screeningDiagnostics)result.screeningDiagnostics=error.screeningDiagnostics;
  if (clinicSetupOnly) {
    result.entryDiagnostics ??= {httpStatus:null};
    result.entryDiagnostics.currentPathname=activePage ? clinicSetupSafePathname(activePage.url(),process.env) : null;
    const inline=await activePage?.locator('#eventCodeError').filter({hasText:/\S/}).innerText({timeout:1000}).catch(()=>null);
    result.entryDiagnostics.inlineError=inline?clinicSetupSafeError({message:inline},process.env).slice(0,1000):null;
    result.entryDiagnostics.requestFailures=requestFailures;
  }
  result.passed = false;
  result.failure = clinicSetupOnly || existingClinicContinuation ? clinicSetupSafeError(error,process.env) : error instanceof Error ? error.message : String(error);
  result.productionTouched = environmentClassification.previewVerified ? false : null;
  result.stripeTouched = environmentClassification.stripeConfigured === false && stripeRequests.length === 0 ? false : null;
  result.stripeEvidence = { deploymentConfigured: environmentClassification.stripeConfigured, browserRequests: stripeRequests };
  fs.writeFileSync(path.join(evidenceDir, "sponsored-browser-result.json"), `${JSON.stringify(result, null, 2)}\n`);
  console.error("RCAP commercial browser proof failed.");
  console.error(clinicSetupOnly || existingClinicContinuation ? clinicSetupSafeError(error,process.env) : error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
} finally {
  await browser?.close();
}

/**
 * Answer whatever the builder is showing, through the shared filler.
 *
 * This was a third copy of the filling logic, keyed on one `<h1>` per screen
 * and one control beneath it. The builder now renders one packet-information
 * section per screen, several questions under one heading, so that shape no
 * longer describes the page. The shared filler answers every unanswered
 * control on the screen by field identity, and it holds the one answer map, so
 * the copies cannot drift apart again.
 *
 * A prefilled value is the participant's own screening answer projected into
 * the packet (run 35122300936 overwrote case_outcome and failed the public
 * validator). The shared filler never overwrites one.
 */
function assertExistingClinicContinuationInput(env) {
  for (const [key, value] of Object.entries({
    RCAP_BROWSER_EXISTING_CLINIC_MATTER_ID: EXISTING_CLINIC_MATTER.id,
    RCAP_BROWSER_EMAIL: CLINIC_SETUP.email, RCAP_BROWSER_APPLICATION_SHA: CLINIC_SETUP.app,
    RCAP_BROWSER_ACCEPTANCE_PROJECT_REF: CLINIC_SETUP.project,
    RCAP_BROWSER_WORKER_SOURCE_SHA: '16908485a94f475448657cea90583a4d352da9a3',
    RCAP_BROWSER_WORKER_DIGEST: 'sha256:4f8c71c3630e6c110427d111518be149f3c74d46c856633fc5536a8065bc17af',
    RCAP_BROWSER_PARTNER_SLUG: 'mvl-demo', RCAP_BROWSER_CLINIC_EVENT_ID: CLINIC_SETUP.event,
    RCAP_BROWSER_CLINIC_EVENT_SLUG: CLINIC_SETUP.slug,
    RCAP_BROWSER_CLINIC_EVENT_NAME: 'Mississippi Volunteer Lawyers Clinic Mode Demo',
    RCAP_BROWSER_ALLOW_MUTATION: '1'
  })) assert.equal(env[key], value, `Existing Clinic continuation refuses ${key} mismatch`);
  for (const key of ['RCAP_BROWSER_CLINIC_SETUP_ONLY', 'RCAP_BROWSER_ISSUE_CLINIC_CODE']) assert.notEqual(env[key], '1');
  assert.ok(!env.RCAP_BROWSER_CLINIC_ACCESS_CODE?.trim(), 'Existing matter must not redeem an event code');
  assert.ok(!env.RCAP_BROWSER_GUIDANCE_ITEM_ID?.trim(), 'Existing continuation cannot visit another fixture');
  const origin = new URL(env.RCAP_BROWSER_BASE_URL);
  assert.equal(origin.protocol, 'https:'); assert.ok(origin.hostname.endsWith('.vercel.app'));
  assert.ok(!origin.username && !origin.password && !origin.search && !origin.hash && origin.pathname === '/');
  assert.notEqual(origin.origin, CLINIC_SETUP.origin, 'Ordinary disabled Preview cannot fulfill this matter');
  assert.match(env.RCAP_BROWSER_PREVIEW_CREATION_RUN_ID ?? '',/^\d+$/);
  assert.notEqual(env.RCAP_BROWSER_PREVIEW_CREATION_RUN_ID,'40057159400','Ordinary Preview creation cannot authorize the separate Clinic target');
  assert.ok(env.RCAP_BROWSER_PREVIEW_CREATION_EVIDENCE_DIR?.trim());
  const scope = `${CLINIC_SETUP.owner},255998e1-eb69-4239-b151-0f8b8935a539`;
  assert.equal(env.RCAP_BROWSER_EXPECTED_SCOPE_SHA256, crypto.createHash('sha256').update(scope).digest('hex'));
}

function assertExistingClinicPreviewCreation() {
  const runId=required('RCAP_BROWSER_PREVIEW_CREATION_RUN_ID');
  assert.match(runId,/^\d+$/);assert.notEqual(runId,'40057159400');
  const dir=required('RCAP_BROWSER_PREVIEW_CREATION_EVIDENCE_DIR');
  const deployment=JSON.parse(fs.readFileSync(path.join(dir,'deploy.json'),'utf8'));
  const preflight=JSON.parse(fs.readFileSync(path.join(dir,'preflight.json'),'utf8'));
  assert.equal(preflight.schemaVersion,'rcap-hosted-acceptance-preflight/v1');assert.equal(preflight.passed,true);
  assert.equal(preflight.acceptanceProjectRef,CLINIC_SETUP.project);
  assert.equal(deployment.schemaVersion,'rcap-hosted-acceptance-deploy/v1');assert.equal(deployment.passed,true);
  assert.equal(deployment.acceptanceProjectRef,CLINIC_SETUP.project);
  assert.equal(deployment.neverPassedProdFlag,true);assert.equal(deployment.neverWroteProjectLevelEnv,true);
  assert.deepEqual(deployment.failedCases,[]);
  for(const name of ['deployed_to_preview_not_production','deployment_carries_the_final_application_sha','deployment_carries_the_accepted_worker_binding','bound_to_the_acceptance_supabase_project_only','production_aliases_unchanged','production_environment_variables_unchanged','clinic_scope_and_purpose_exact'])assert.ok(deployment.requiredCases.includes(name));
  const target=deployment.deployment, live=environmentClassification;
  assert.equal(target.id,live.deploymentId);assert.equal(target.immutableHostname,live.hostname);
  assert.ok(live.projectId);assert.equal(target.projectId,live.projectId);
  assert.equal(target.gitSourceSha,CLINIC_SETUP.app);assert.equal(target.readyState,'READY');
  assert.ok([null,'preview'].includes(target.target));
  for(const [key,value] of Object.entries({rcapApplicationSha:CLINIC_SETUP.app,rcapWorkerSourceSha:live.workerSourceSha,
    rcapWorkerDigest:live.workerDigest,rcapAcceptanceProjectRef:CLINIC_SETUP.project,rcapPreviewPurpose:'mississippi_clinic',
    rcapClinicDemoMode:'mississippi_preview',rcapRouteState:'staging_scoped',rcapStagingScopeSha256:live.stagingScopeSha256,rcapStripeConfigured:'false'}))assert.equal(target.metadata[key],value);
  return {runId,deploymentId:target.id,hostname:target.immutableHostname,source:'native rcap-hosted-clinic_deploy artifact downloaded from the supplied creation run; compared with live Preview identity'};
}

async function readExistingClinicReadonlyRows(query,diagnosticKey) {
  assert.match(query.trim(),/^(select|with)\s/i);
  result[diagnosticKey] = {httpStatus:null,sqlstate:null};
  let response, rows;
  try {
    response=await fetch(`https://api.supabase.com/v1/projects/${CLINIC_SETUP.project}/database/query`,{
      method:'POST',headers:{Authorization:`Bearer ${required('SUPABASE_ACCESS_TOKEN')}`,'Content-Type':'application/json'},
      body:JSON.stringify({query:`begin transaction read only;\n${query}\ncommit;`}),redirect:'error',signal:AbortSignal.timeout(30000)
    });
    result[diagnosticKey].httpStatus=response.status;rows=await response.json();
  } catch {throw new Error('Existing packet read failed; safe HTTP/SQLSTATE diagnostics retained');}
  if(rows&&!Array.isArray(rows)&&typeof rows==='object')result[diagnosticKey].sqlstate=[rows.code,rows.sqlstate]
    .find(value=>typeof value==='string'&&/^[0-9A-Z]{5}$/.test(value))??null;
  assert.ok([200,201].includes(response.status),'Existing packet read HTTP refusal');
  assert.ok(Array.isArray(rows),'Existing packet read contract unavailable');
  return rows;
}

async function readExistingClinicFrontendCaptcha() {
  assert.equal(environmentClassification.previewVerified,true);
  assert.equal(environmentClassification.hostname,new URL(baseUrl).hostname);
  const read = async url => {
    assert.equal(new URL(url).origin,baseUrl);
    const response=await fetch(url,{method:'GET',headers:bypassHeaders(),redirect:'error',signal:AbortSignal.timeout(30000)});
    assert.equal(response.status,200,'Current staged sign-in source unavailable');
    const body=await response.text();assert.ok(body.length<10_000_000);return body;
  };
  const html=await read(new URL(`/expungement-ai/sign-in?mode=signin&next=${encodeURIComponent(`/briefcase/${EXISTING_CLINIC_MATTER.id}/packet-information`)}`,baseUrl).href);
  const urls=[...new Set([...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)].map(match=>match[1].replaceAll('&amp;','&'))
    .filter(value=>value.startsWith('/_next/static/')&&new URL(value,baseUrl).pathname.endsWith('.js')))];
  assert.ok(urls.length>0&&urls.length<=100,'Current staged sign-in chunks unavailable');
  const chunks=[];for(const url of urls)chunks.push({body:await read(new URL(url,baseUrl).href)});
  return {...inspectShippedCaptcha(chunks),deploymentId:environmentClassification.deploymentId,applicationSha:CLINIC_SETUP.app};
}

async function requireExistingClinicPacketExecution() {
  assert.equal(environmentClassification.previewVerified, true);
  assert.equal(environmentClassification.routeState, 'staging_scoped');
  assert.equal(environmentClassification.clinicDemoMode, 'mississippi_preview');
  assert.equal(environmentClassification.stripeConfigured, false);
  result.previewCreation = assertExistingClinicPreviewCreation();
  const frontend = await readExistingClinicFrontendCaptcha();
  result.packetCaptcha = await readResumeCaptchaPolicy({project:CLINIC_SETUP.project,
    token:required('SUPABASE_ACCESS_TOKEN'),frontend});
  const owned = await readOwnedMatterDatabase();
  result.existingMatterPrerequisites = owned;
  assert.equal(owned.checks.length, 14); assert.ok(owned.checks.every(check => check.ok === true));
  const query = `select jsonb_build_object(
 'inspector_readonly',current_user='postgres' and session_user='postgres' and current_setting('transaction_read_only')='on',
 'rpc_source_and_grants',exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.oid=to_regprocedure('public.rcap_consumer_packet_authorized(uuid,uuid)')
   and p.provolatile='s' and p.prosecdef and p.proconfig=array['search_path=""']::text[]
   and encode(sha256(convert_to(p.prosrc,'UTF8')),'hex')='277fe688f6a8d11f0463934f7f52a83c38387e19d1f9783c469fbdcb2cd48560'
   and has_function_privilege('service_role',p.oid,'EXECUTE')
   and not has_function_privilege('anon',p.oid,'EXECUTE') and not has_function_privilege('authenticated',p.oid,'EXECUTE')),
 'registered_specification',exists(select 1 from public.sponsored_packet_render_routes r
   where r.route_key='MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal'
   and r.packet_specification_sha256='23426df251aa31bfd5215edbfe547d5f56c2349ed4c4bb5e7b407bc25405e126'
   and r.packet_family_id='ms-nonconv-set' and r.partner_slug='mvl-demo' and r.active
   and r.packet_specification_id='ms-nonconviction-expungement-99-19-71-4' and r.packet_specification_version='2.0.0'
   and (r.registry_track_id is null or r.registry_track_id='ms-nonconv')
   and r.artifact_provider='rcap_grade_a_composer_v1' and r.artifact_source='grade_a_packet_specification' and r.artifact_content_type='application/pdf'),
 'protected_sponsor_identity',exists(select 1 from public.sponsored_packet_render_authority(
   'MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal',
   '${EXISTING_CLINIC_MATTER.session}','${EXISTING_CLINIC_MATTER.id}','${EXISTING_CLINIC_MATTER.owner}') a
   where a.valid and a.partner_id='${EXISTING_CLINIC_MATTER.partner}' and a.clinic_event_id='${CLINIC_SETUP.event}'
   and a.clinic_case_id='31b63a9d-7016-4b71-af1e-8b3426f142cc'),
 'current_funded_scope',public.rcap_program_packet_scope_authorized('mvl-demo','MS'),
 'existing_active_entitlement',exists(select 1 from public.partner_packet_entitlement e
   where e.id='77000000-0000-4000-8000-000000000058' and e.partner_id='${EXISTING_CLINIC_MATTER.partner}'
   and e.entitlement_scope='sponsored_packets' and e.effective_at<=now() and (e.expires_at is null or e.expires_at>now()) and e.packet_cap=2),
 'no_existing_target_job',not exists(select 1 from public.packet_render_jobs j
   where j.briefcase_item_id='${EXISTING_CLINIC_MATTER.id}' or j.sponsored_consumer_briefcase_item_id='${EXISTING_CLINIC_MATTER.id}')
) as existing_packet_prerequisites;`;
  const rows = await readExistingClinicReadonlyRows(query,'packetPrerequisites');
  assert.ok(rows.length === 1);
  const checks = rows[0].existing_packet_prerequisites;
  const expected = ['inspector_readonly','rpc_source_and_grants','registered_specification','protected_sponsor_identity','current_funded_scope','existing_active_entitlement','no_existing_target_job'];
  assert.deepEqual(Object.keys(checks ?? {}).sort(), expected.sort());
  assert.ok(expected.every(key => checks[key] === true), 'Actual existing packet dependencies are not ready');
  result.packetPrerequisites = { ...result.packetPrerequisites, checks };
}

function existingClinicContinuationRequestDecision(request, config) {
  let url;
  try { url = new URL(request.url()); } catch { return 'readonly_invalid_url_blocked'; }
  if (url.username || url.password || url.hash) return 'readonly_invalid_url_blocked';
  const method = request.method();
  const normalize = address => {
    const value = new URL(address);
    if (value.origin === config.origin) return CLINIC_SETUP.origin+value.pathname+value.search+value.hash;
    if (value.origin === config.authOrigin) return `https://${CLINIC_SETUP.project}.supabase.co`+value.pathname+value.search+value.hash;
    return value.href;
  };
  const normalized = {url:()=>normalize(request.url()),method:()=>method,resourceType:()=>request.resourceType(),
    isNavigationRequest:()=>request.isNavigationRequest?.(),
    headers:()=>{const headers=request.headers();return headers.referer?{...headers,referer:normalize(headers.referer)}:headers;},
    frame:()=>({url:()=>normalize(request.frame().url())})};
  const shared = ownedMatterReadonlyDecision(normalized, existingClinicResourcePolicies);
  if (shared === 'readonly_invalid_url_blocked') return shared;
  if (url.origin === config.authOrigin) return method==='POST'&&shared==='allowed'&&!['fetch','xhr'].includes(request.resourceType())?'readonly_mutation_blocked':shared;
  if (url.origin !== config.origin) return shared;
  if (shared === 'readonly_telemetry_suppressed' || shared === 'optional_owned_matter_prefetch') return shared;
  const packetPath = `/briefcase/${EXISTING_CLINIC_MATTER.id}/packet-information`;
  if (url.pathname === '/expungement-ai/sign-in') return ['GET','HEAD'].includes(method)
    && url.searchParams.size===2 && url.searchParams.getAll('mode').length===1 && url.searchParams.get('mode')==='signin'
    && url.searchParams.getAll('next').length===1 && url.searchParams.get('next')===packetPath ? 'allowed':'readonly_read_path_blocked';
  const packetApi = `/api/expungement-ai/briefcase/${EXISTING_CLINIC_MATTER.id}/packet-information`;
  if ([packetPath,`/briefcase/${EXISTING_CLINIC_MATTER.id}/review`].includes(url.pathname)) {
    if (method==='GET'&&request.resourceType()==='document'&&!url.search) return 'allowed';
    return method==='GET'&&['fetch','xhr'].includes(request.resourceType())&&url.searchParams.size===1
      &&url.searchParams.getAll('_rsc').length===1&&/^[A-Za-z0-9_-]{1,200}$/.test(url.searchParams.get('_rsc')??'')?'allowed':'readonly_read_path_blocked';
  }
  if (url.pathname===packetApi) {
    if (method==='GET') return !url.search&&['fetch','xhr'].includes(request.resourceType())?'allowed':'readonly_read_path_blocked';
    if (method==='POST'&&!url.search&&['fetch','xhr'].includes(request.resourceType())) {
      try {const body=request.postDataJSON();return Number.isSafeInteger(body?.expectedRevision)&&body.expectedRevision>=0&&body.expectedRevision===existingClinicRevision?'allowed':'readonly_mutation_blocked';}
      catch {return 'readonly_mutation_blocked';}
    }
    return 'readonly_mutation_blocked';
  }
  if (url.pathname==='/api/expungement-ai/packet/status') return method==='GET'&&['fetch','xhr'].includes(request.resourceType())&&url.searchParams.size===1
    &&url.searchParams.getAll('briefcaseItemId').length===1&&url.searchParams.get('briefcaseItemId')===EXISTING_CLINIC_MATTER.id?'allowed':'readonly_read_path_blocked';
  if (url.pathname==='/api/expungement-ai/packet/generate' && method==='POST' && ['fetch','xhr'].includes(request.resourceType()) && !url.search) {
    try {return request.postDataJSON()?.briefcaseItemId===EXISTING_CLINIC_MATTER.id?'allowed':'readonly_mutation_blocked';}
    catch {return 'readonly_mutation_blocked';}
  }
  return shared;
}

async function openExistingClinicMatter(page, context) {
  await requireExistingClinicPacketExecution();
  const destination = `/briefcase/${EXISTING_CLINIC_MATTER.id}/packet-information`;
  result.stage = 'existing_owner_signin';
  await page.goto(new URL(`/expungement-ai/sign-in?mode=signin&next=${encodeURIComponent(destination)}`, baseUrl).href);
  const auth = await signIn(page, email, password);
  assert.equal(auth?.user?.id, EXISTING_CLINIC_MATTER.owner, 'Existing matter requires its actual owner');
  participantUserId = auth.user.id; screeningSessionId = EXISTING_CLINIC_MATTER.session;
  await page.waitForURL(url => url.origin === new URL(baseUrl).origin && url.pathname === destination);
  assert.ok((await context.cookies(baseUrl)).some(cookie => /^sb-.*-auth-token/.test(cookie.name)), 'Owner session cookie is required');
  const recovery = await context.request.get(new URL(`/api/expungement-ai/briefcase/${EXISTING_CLINIC_MATTER.id}/packet-information`, baseUrl).href, { headers: bypassHeaders() });
  result.packetOwnerRead = {httpStatus:recovery.status(),sqlstate:null};
  assert.equal(recovery.status(), 200, 'Current protected owner draft must be readable before packet writes');
  const draft = await recovery.json();
  assert.equal(draft.ok, true);
  assert.equal(draft.reviewPath, `/briefcase/${EXISTING_CLINIC_MATTER.id}/review`);
  assert.ok(Number.isSafeInteger(draft.revision) && draft.revision >= 0);
  assert.notEqual(draft.nextAction, 'open_matter', 'Current draft must remain on the packet route');
  existingClinicRevision = draft.revision; result.packetRevision = draft.revision;
  result.stage = 'existing_packet_information';
  return EXISTING_CLINIC_MATTER.id;
}

function existingClinicGeneratedJob(rows, generation) {
  assert.equal(generation.httpStatus, 200); assert.equal(generation.packetStatus, 'generating');
  assert.equal(generation.briefcaseItemId, EXISTING_CLINIC_MATTER.id);
  assert.equal(rows.length, 1, 'Existing matter must bind exactly one genuine protected job');
  const target = rows[0];
  for (const [field, expected] of Object.entries({
    briefcase_item_id: EXISTING_CLINIC_MATTER.id, sponsored_consumer_briefcase_item_id: EXISTING_CLINIC_MATTER.id,
    sponsored_consumer_auth_user_id: EXISTING_CLINIC_MATTER.owner, sponsored_session_id: EXISTING_CLINIC_MATTER.session,
    sponsored_clinic_event_id: CLINIC_SETUP.event, matter_id: EXISTING_CLINIC_MATTER.matter, partner_id: EXISTING_CLINIC_MATTER.partner,
    route_id: 'MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal',
    sponsored_route_key: 'MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal',
    renderer_kind: 'packet_document_v1', status: 'queued', attempt_count: 0
  })) assert.equal(target[field], expected, `Existing protected job mismatch: ${field}`);
  assert.ok(validUuid(target.id));
  assert.match(target.sponsored_verification_hash ?? '', /^[a-f0-9]{64}$/);
  assert.equal(target.sponsored_verification_hash, target.current_verification_hash);
  return target;
}

async function answerCurrentBuilderQuestion(page) {
  await answerBuilderStep(page, { routeKey: MISSISSIPPI_SYNTHETIC_ROUTE });
}

function packetInformationResponse(page, itemId) {
  return page.waitForResponse(
    (response) => response.request().method() === "POST"
      && new URL(response.url()).pathname === `/api/expungement-ai/briefcase/${itemId}/packet-information`,
    { timeout: 20_000 }
  );
}


async function expectText(page, text) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: "visible" });
}

async function signIn(page, accountEmail, accountPassword) {
  await page.locator('input[name="email"]').fill(accountEmail);
  await page.locator('input[name="password"]').fill(accountPassword);
  const authResponsePromise = page.waitForResponse(
    (response) => matchesOriginalResponse(response,"signin",responseConfig),
    { timeout: 20_000 }
  );
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const authResponse = await authResponsePromise;
  return {user:{id:requireOriginalResponse(authResponse,"signin").userId}};
}

async function attachBypass(context) {
  if (bypassSecret) await context.route(`${baseUrl}/**`, async (route) => {
    await route.continue({ headers: { ...route.request().headers(), ...bypassHeaders() } });
  });
  await context.route("**/*",createOriginalResponseObserver(responseConfig,{bypass:bypassSecret,
    onStage:value=>{if(result.responseStages.length<800)result.responseStages.push(value);},
    onObservation:value=>{if(result.responseObservations.length<200)result.responseObservations.push(value);}}));
}

function bypassHeaders() {
  return bypassSecret ? (clinicSetupOnly?previewRequestHeaders(bypassSecret):{ "x-vercel-protection-bypass": bypassSecret }) : {};
}

async function screenshotPair(page, stem) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: path.join(evidenceDir, `${stem}-desktop.png`), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(evidenceDir, `${stem}-mobile.png`), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
}

function assertNoCommercialCopy(text, surface) {
  for (const pattern of [/\$50/i, /stripe/i, /checkout/i, /pay \$?50/i, /continue to payment/i, /before payment/i, /payment confirmed/i]) {
    check(!pattern.test(text), `${surface} leaked consumer commercial copy (${pattern}).`);
  }
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) fail(`${name} is required.`);
  return value;
}

function requiredUrl(name) {
  const value = required(name);
  try {
    return new URL(value).origin;
  } catch {
    fail(`${name} must be an absolute URL.`);
  }
}

function requiredUuid(name) {
  const value = required(name);
  if (!validUuid(value)) fail(`${name} must be a UUID.`);
  return value;
}

function validUuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function exactBriefcaseItemId(value) {
  if (typeof value !== "string") return null;
  // The atomic claim lands on /briefcase/matters/<id> (matter-path.ts); the
  // packet-information, review and generated-packet pages stay on /briefcase/<id>.
  const match = value.match(/^\/briefcase\/(?:matters\/)?([0-9a-f-]{36})(?:[?#]|$)/i);
  return validUuid(match?.[1]) ? match[1] : null;
}

async function verifyExactHostedPreview(origin, bypass) {
  const url = new URL(origin);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" && host !== "127.0.0.1" && host !== "localhost") {
    fail("RCAP_BROWSER_BASE_URL must use HTTPS outside localhost.");
  }
  if (host === "127.0.0.1" || host === "localhost" || host.endsWith(".trycloudflare.com") || host.endsWith(".github.dev") || host.endsWith(".test")) {
    return { previewVerified: false, localAcceptanceOrigin: true, stripeConfigured: null };
  }
  if (!host.endsWith(".vercel.app") || !bypass) {
    fail("Hosted browser mutation requires an exact protected Vercel Preview identity.");
  }

  const token = required("RCAP_BROWSER_VERCEL_TOKEN");
  const deploymentId = required("RCAP_BROWSER_PREVIEW_DEPLOYMENT_ID");
  const applicationSha = required("RCAP_BROWSER_APPLICATION_SHA");
  const workerSourceSha = required("RCAP_BROWSER_WORKER_SOURCE_SHA");
  const workerDigest = required("RCAP_BROWSER_WORKER_DIGEST");
  const projectRef = required("RCAP_BROWSER_ACCEPTANCE_PROJECT_REF");
  const expectedScopeSha256 = clinicMode && !clinicSetupOnly ? required("RCAP_BROWSER_EXPECTED_SCOPE_SHA256") : null;
  if (!/^dpl_[A-Za-z0-9]+$/.test(deploymentId) || !/^[0-9a-f]{40}$/.test(applicationSha)
    || !/^[0-9a-f]{40}$/.test(workerSourceSha) || !/^sha256:[0-9a-f]{64}$/.test(workerDigest)) {
    fail("Hosted browser mutation requires an exact deployment id, application SHA, worker source and immutable digest.");
  }
  if (clinicMode && projectRef !== "hyflxnlhpmiqxvvcoiia") {
    fail("Clinic browser mutation is restricted to the pinned acceptance Supabase project.");
  }

  const identity = await resolveHostedVercelIdentity({ token });
  const api = async (route) => {
    const response = await fetch(hostedVercelScopedUrl(route, identity), { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) fail(`Vercel identity check failed for ${route} with HTTP ${response.status}.`);
    return response.json();
  };
  const deployment = await api(`/v13/deployments/${encodeURIComponent(deploymentId)}`);
  const meta = deployment.meta ?? {};
  const alias = await api(`/v13/deployments/${encodeURIComponent(host)}`);
  const aliases = await api(`/v2/deployments/${encodeURIComponent(deploymentId)}/aliases`);
  const productionAliases = (aliases.aliases ?? []).filter((entry) => entry.target === "production" || entry.deployment?.target === "production");
  const exact = (deployment.id ?? deployment.uid) === deploymentId
    && (alias.id ?? alias.uid) === deploymentId
    && (deployment.readyState ?? deployment.status) === "READY"
    && (deployment.target === null || deployment.target === "preview")
    && deployment.projectId === identity.projectId
    && deployment.gitSource?.sha === applicationSha
    && (!existingClinicContinuation || deployment.url === host)
    && (!existingClinicContinuation || meta.rcapPreviewPurpose === 'mississippi_clinic')
    && meta.rcapWorkerSourceSha === workerSourceSha
    && meta.rcapWorkerDigest === workerDigest
    && meta.rcapApplicationSha === applicationSha
    && meta.rcapAcceptanceProjectRef === projectRef
    && (clinicSetupOnly ? deploymentId===CLINIC_SETUP.deploymentId && origin===CLINIC_SETUP.origin
      && meta.rcapRouteState==="disabled" && meta.rcapClinicDemoMode==="none"
      && meta.rcapStagingScopeSha256===crypto.createHash('sha256').update('').digest('hex')
      && meta.rcapStripeConfigured==="false"
      : meta.rcapRouteState === "staging_scoped"
        && (!clinicMode || meta.rcapClinicDemoMode === "mississippi_preview")
        && (!clinicMode || meta.rcapStagingScopeSha256 === expectedScopeSha256)
        && (!clinicMode || meta.rcapStripeConfigured === "false"))
    && productionAliases.length === 0;
  if (!exact) fail("Hosted browser mutation refused: Vercel did not confirm the exact READY nonproduction Clinic Preview, scope hash, no-Stripe posture, and acceptance project metadata.");
  return {
    previewVerified: true,
    deploymentId,
    hostname: host,
    ...(existingClinicContinuation?{projectId:identity.projectId}:{}),
    applicationSha,
    workerSourceSha,
    workerDigest,
    acceptanceProjectRef: projectRef,
    routeState: meta.rcapRouteState,
    clinicDemoMode: meta.rcapClinicDemoMode,
    stagingScopeSha256: meta.rcapStagingScopeSha256,
    stripeConfigured: meta.rcapStripeConfigured === "true",
    productionAliasCount: productionAliases.length
  };
}

function safeRequestPath(value) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "unparseable request URL";
  }
}


function check(condition, message) {
  if (!condition) failures.push(message);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

// These two controllers are also executed with fault-injected ports by the
// existing Clinic contract verifier. Every write is either the ONE canonical
// worker cycle or an actual browser request. Database probes are SELECT only.
function pdfSha(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

async function runClinicTargetCycle(ports, fixture) {
  const rows = await ports.targetJobs();
  assert.equal(rows.length, 1, "Clinic fixture must enqueue exactly one target job");
  const target = rows[0];
  assert.equal(fixture.generatedItemId, fixture.packetItemId, "generation response must name the fresh fixture item");
  assert.equal(target.sponsored_consumer_briefcase_item_id, fixture.packetItemId);
  assert.equal(target.briefcase_item_id, fixture.packetItemId);
  assert.equal(target.sponsored_consumer_auth_user_id, fixture.participantUserId);
  assert.equal(target.sponsored_session_id, fixture.screeningSessionId);
  assert.equal(target.sponsored_clinic_event_id, fixture.clinicEventId);
  assert.equal(target.route_id, "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal");
  assert.equal(target.sponsored_route_key, target.route_id);
  assert.equal(target.sponsored_verification_hash, target.current_verification_hash);
  assert.match(target.sponsored_verification_hash ?? "", /^[a-f0-9]{64}$/);
  assert.ok(target.matter_id && target.partner_id);
  assert.equal(target.renderer_kind, "packet_document_v1", "accepted worker must support the target renderer");
  assert.equal(target.status, "queued");
  assert.equal(target.attempt_count, 0, "fresh fixture cannot reuse a processed job");
  const accountingBefore = await ports.accounting();
  const claimOrder = await ports.readClaimOrder(target.id, target.renderer_kind);
  assert.equal(claimOrder.readOutcome, "read");
  assert.equal(claimOrder.targetIsClaimable, true);
  assert.equal(claimOrder.predictedFirstClaim, target.id, "historical predecessor blocks this proof");
  assert.equal(claimOrder.targetClaimRank, 1);
  assert.equal(claimOrder.claimablePredecessors, 0);
  const housekeeping = await ports.requireNoHistoricalHousekeeping(target.id);
  const downstreamClosure = await ports.requireDownstreamClosure(target, fixture, claimOrder, housekeeping);
  const evidence = {
    participantId: fixture.participantUserId, briefcaseItemId: fixture.packetItemId,
    screeningSessionId: fixture.screeningSessionId, targetRenderJobId: target.id,
    verificationHash: target.sponsored_verification_hash, matterId: target.matter_id,
    route: target.route_id, rendererKind: target.renderer_kind,
    workerDigest: ports.workerDigest, preview: ports.preview,
    claimOrder, downstreamClosure, targetBefore: target, accountingBeforeWorker: accountingBefore,
    completionObservedBeforeRepeatDownload: false, receiptRepairPerformed: false
  };
  await ports.receipt("before-worker", evidence);
  const cycle = await ports.runOneCycle(target.id);
  await ports.receipt("worker-result", { ...evidence, cycle });
  assert.equal(cycle.exitCode, 0, `worker failed: ${JSON.stringify(cycle.cycleResult)}`);
  assert.equal(cycle.cycleResult?.jobId, target.id, "worker stdout must identify the target");
  assert.equal(cycle.cycleResult?.outcome, "finalized", `target failure: ${JSON.stringify(cycle.cycleResult)}`);
  assert.deepEqual(Array.from(cycle.rowsThatMoved ?? []).sort(), [target.id], "worker must not mutate historical jobs");
  const finalRows = await ports.targetJobs();
  assert.equal(finalRows.length, 1);
  const finalized = finalRows[0];
  for (const key of ["id", "matter_id", "route_id", "sponsored_verification_hash", "sponsored_consumer_auth_user_id", "sponsored_consumer_briefcase_item_id", "sponsored_session_id", "sponsored_clinic_event_id"]) {
    assert.equal(finalized[key], target[key], `worker changed ${key}`);
  }
  assert.equal(finalized.status, "artifact_validated", "first download must begin before delivered");
  assert.equal(finalized.delivery_eligibility, "eligible");
  assert.equal(finalized.container_digest, ports.workerDigest);
  assert.match(finalized.output_sha256 ?? "", /^[a-f0-9]{64}$/);
  assert.ok(finalized.output_storage_path?.includes(target.id));
  assert.ok(finalized.output_storage_path?.includes(finalized.output_sha256));
  assert.ok(Number(finalized.output_byte_count) > 0);
  evidence.workerCycle = cycle;
  evidence.finalizedSha256 = finalized.output_sha256;
  evidence.finalizedBytes = Number(finalized.output_byte_count);
  evidence.storagePath = finalized.output_storage_path;
  evidence.accountingAfterWorker = await ports.accounting();
  await ports.receipt("artifact-ready", evidence);
  return { target: finalized, evidence };
}

async function proveClinicFirstDelivery(ports, target, evidence) {
  const before = await ports.deliveryState(target.id);
  assert.equal(before.job.id, target.id);
  assert.equal(before.job.status, "artifact_validated");
  assert.equal(before.job.delivered_at, null);
  assert.deepEqual(before.events, [], "fresh target must have no prior delivery requests");
  evidence.preDownload = before;
  evidence.sponsorshipBeforeDownload = await ports.accounting();
  await ports.receipt("before-first-owner", evidence);
  const first = await ports.downloadOnce();
  const firstBytes = first.bytes;
  const firstHash = pdfSha(firstBytes);
  Object.assign(evidence, { ownerHttpStatus: first.status, ownerByteCount: firstBytes.length,
    ownerSha256: firstHash, firstResponseConsumedAt: new Date().toISOString() });
  await ports.receipt("first-owner-response", evidence);
  assert.equal(first.status, 200);
  assert.match(first.contentType, /^application\/pdf/i);
  assert.ok(firstBytes.length > 0);
  assert.equal(firstBytes.subarray(0, 5).toString("latin1"), "%PDF-");
  assert.equal(firstBytes.length, Number(target.output_byte_count));
  assert.equal(firstHash, target.output_sha256, "first owner bytes must match finalized artifact");
  let state;
  // Same bounded read-only completion wait already used by post-payment proof.
  for (let attempt = 0; attempt < 20; attempt += 1) {
    state = await ports.deliveryState(target.id);
    if (state.events.some(e => ["transmission_failed", "transmission_aborted"].includes(e.event_type))) break;
    if (state.job.status === "delivered" && state.events.some(e => e.event_type === "transmission_completed")) break;
    await ports.sleep(500);
  }
  evidence.firstRequestReadback = state;
  await ports.receipt("first-owner-readback", evidence);
  assert.equal(state.job.id, target.id);
  assert.equal(state.job.status, "delivered", "first request must complete naturally before repeat");
  assert.ok(Number.isFinite(Date.parse(state.job.delivered_at)));
  assert.equal(state.job.output_sha256, target.output_sha256);
  assert.equal(state.job.output_storage_path, target.output_storage_path);
  assert.deepEqual(state.events.map(e => e.event_type), ["delivery_authorized", "transmission_started", "transmission_completed"]);
  const eventTimes = state.events.map(e => Date.parse(e.created_at));
  assert.ok(eventTimes.every(Number.isFinite));
  assert.ok(eventTimes.every((time, i) => i === 0 || time >= eventTimes[i - 1]));
  const actualJob = await ports.getRenderJob(target.id);
  assert.equal(actualJob?.id, target.id);
  assert.equal(actualJob.status, "delivered");
  assert.equal(actualJob.outputSha256, target.output_sha256);
  assert.equal(actualJob.outputStoragePath, target.output_storage_path);
  Object.assign(evidence, { deliveryEvents: state.events, delivered_at: state.job.delivered_at,
    getRenderJob: actualJob, completionObservedBeforeRepeatDownload: true });
  await ports.receipt("completion-before-repeat", evidence);
  // This is deliberately unreachable on any missing/failed first receipt.
  const second = await ports.downloadOnce();
  const secondHash = pdfSha(second.bytes);
  assert.equal(second.status, 200);
  assert.equal(secondHash, firstHash, "repeat owner bytes must remain identical");
  evidence.repeatDownloadSha256 = secondHash;
  evidence.sponsorshipAfterRepeat = await ports.accounting();
  assert.deepEqual(evidence.sponsorshipAfterRepeat, evidence.sponsorshipBeforeDownload, "repeat must not consume sponsorship again");
  assert.equal(ports.generationCount(), 1, "repeat must not generate another packet");
  await ports.receipt("repeat-owner-response", evidence);
  return { firstBytes, firstHash, secondHash };
}

function writeClinicReceipt(name, value) {
  fs.writeFileSync(path.join(evidenceDir, `natural-delivery-${name}.json`), `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
}

async function clinicTargetJobs(sql,packetItemId) {
  return (await sql(`
    select j.id,j.route_id,j.renderer_kind,j.status,j.attempt_count,j.max_attempts,j.matter_id,j.partner_id,
      j.briefcase_item_id,j.sponsored_route_key,j.sponsored_session_id,j.sponsored_clinic_event_id,
      j.sponsored_consumer_briefcase_item_id,j.sponsored_consumer_auth_user_id,j.sponsored_verification_hash,
      j.output_sha256,j.output_storage_path,j.output_byte_count,j.container_digest,j.delivery_eligibility,
      v.verification_hash as current_verification_hash
    from public.packet_render_jobs j left join public.consumer_packet_verifications v
      on v.briefcase_item_id=j.sponsored_consumer_briefcase_item_id and v.consumer_auth_user_id=j.sponsored_consumer_auth_user_id and v.status='verified'
    where j.briefcase_item_id='${packetItemId}' or j.sponsored_consumer_briefcase_item_id='${packetItemId}'
    order by j.created_at,j.id
  `)).json;
}

async function clinicDeliveryPorts({ packetItemId, participantUserId, screeningSessionId }) {
  assert.equal(environmentClassification.previewVerified, true);
  // The provider-verified object is the release identity; supplied inputs must
  // still match it before any credential read or worker operation.
  for (const [field, name] of Object.entries({
    deploymentId: "RCAP_BROWSER_PREVIEW_DEPLOYMENT_ID",
    applicationSha: "RCAP_BROWSER_APPLICATION_SHA",
    workerSourceSha: "RCAP_BROWSER_WORKER_SOURCE_SHA",
    workerDigest: "RCAP_BROWSER_WORKER_DIGEST",
    acceptanceProjectRef: "RCAP_BROWSER_ACCEPTANCE_PROJECT_REF"
  })) assert.equal(environmentClassification[field], required(name));
  assert.equal(environmentClassification.hostname, new URL(baseUrl).hostname.toLowerCase());
  assert.equal(environmentClassification.clinicDemoMode, "mississippi_preview");
  assert.equal(environmentClassification.routeState, "staging_scoped");
  assert.equal(environmentClassification.stripeConfigured, false);
  for (const id of [packetItemId, participantUserId, screeningSessionId, clinicEventId]) assert.ok(validUuid(id));
  const project = environmentClassification.acceptanceProjectRef;
  assert.equal(project, "hyflxnlhpmiqxvvcoiia");
  const workerSource = environmentClassification.workerSourceSha;
  const workerDigest = environmentClassification.workerDigest;
  const image = `ghcr.io/roger-legalease/rcap-render-worker@${workerDigest}`;
  const workerRuntime = currentClinicWorkerContext({ preview: environmentClassification,
    participantUserId, partnerSlug, eventId: clinicEventId, eventName: clinicEventName });
  writeClinicReceipt("worker-runtime-context", workerRuntime);
  const managementToken = required("SUPABASE_ACCESS_TOKEN");
  const supabaseUrl = `https://${project}.supabase.co`;
  const keyResponse = await fetch(`https://api.supabase.com/v1/projects/${project}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${managementToken}` } });
  assert.ok(keyResponse.ok, "acceptance service credential read failed");
  const service = (await keyResponse.json()).find(k => k.name === "service_role")?.api_key;
  assert.ok(service);
  const claims = JSON.parse(Buffer.from(service.split(".")[1], "base64url"));
  assert.equal(claims.ref, project); assert.equal(claims.role, "service_role");
  const sql = async query => {
    assert.match(query.trim(), /^(select|with)\s/i, "Clinic harness database calls must be read-only");
    const response = await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`, {
      method: "POST", headers: { Authorization: `Bearer ${managementToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ query })
    });
    const json = await response.json();
    assert.ok(response.ok && Array.isArray(json), `Clinic readback failed: HTTP ${response.status}`);
    return { ok: true, status: response.status, json };
  };
  const targetJobs = () => clinicTargetJobs(sql,packetItemId);
  const accounting = async () => (await sql(`select jsonb_build_object(
    'entitlement',(select to_jsonb(e) from public.partner_entitlement e where e.partner_slug='${partnerSlug.replaceAll("'", "''")}'),
    'generationEvents',(select coalesce(jsonb_agg(to_jsonb(a) order by a.occurred_at,a.id),'[]'::jsonb) from public.rcap_screening_analytics_events a where a.session_id='${screeningSessionId}' and a.event_type='packet_generated'),
    'jobs',(select coalesce(jsonb_agg(j.id order by j.id),'[]'::jsonb) from public.packet_render_jobs j where j.sponsored_consumer_briefcase_item_id='${packetItemId}')
  ) as accounting`)).json[0].accounting;
  const paymentSource = fs.readFileSync("scripts/rcap-hosted-acceptance-payment.mjs", "utf8");
  const ast = ts.createSourceFile("payment.mjs", paymentSource, ts.ScriptTarget.Latest, true);
  const names = ["TERMINAL_SUCCESS", "WORKER_CLAIM_SECONDS", "CLAIM_STATE_FIELDS", "jobRowOrNull", "readJob", "claimablePredicate", "readClaimOrder", "claimStateSnapshot", "rowsThatChanged", "parseCycleResult", "classifyCycle", "cycleBoundary", "claimedTupleFor", "runOneCycle"];
  const declarations = names.map(name => {
    const matches = [];
    const visit = node => {
      if (ts.isFunctionDeclaration(node) && node.name?.text === name) matches.push(node.getText(ast));
      if (ts.isVariableStatement(node) && node.declarationList.declarations.some(d => d.name.getText(ast) === name)) matches.push(node.getText(ast));
      ts.forEachChild(node, visit);
    };
    visit(ast); assert.equal(matches.length, 1, `one canonical declaration required: ${name}`);
    return matches[0];
  }).join("\n");
  const diagnostics = { cycles: [] };
  const redact = value => [service, managementToken, bypassSecret].reduce((text, secret) => secret ? text.split(secret).join("[REDACTED]") : text, String(value ?? ""))
    .replace(/eyJ[A-Za-z0-9_.-]{20,}/g, "[REDACTED]")
    .replace(/sk_(test|live)_[A-Za-z0-9]{10,}/g, "[REDACTED]")
    .replace(/whsec_[A-Za-z0-9]{10,}/g, "[REDACTED]");
  const context = vm.createContext({ crypto, fs, path, Buffer, console, Date, sql,
    sqlText: value => String(value).replaceAll("'", "''"), redact, redactSecrets: redact,
    diagnostics, itemId: packetItemId, targetJobId: null, EVIDENCE_DIR: evidenceDir,
    containerName: `rcap-clinic-${packetItemId}`, service, SUPABASE_URL: supabaseUrl,
    WORKER_PARTNER_DATA_FLAG: "true", WORKER_DIGEST_REF: image,
    spawnSync(command, args, options) {
      assert.equal(command, "docker"); assert.ok(args.includes(image)); assert.equal(args.at(-1), "--once");
      // Same invocation and credential, transported via environment rather than argv.
      const scopedArgs = clinicWorkerDockerArgs(args, image, workerRuntime);
      return spawnSync(command, scopedArgs.map(arg => arg.startsWith("SUPABASE_SERVICE_ROLE_KEY=") ? "SUPABASE_SERVICE_ROLE_KEY" : arg), {
        ...options, env: { ...process.env, SUPABASE_SERVICE_ROLE_KEY: service }
      });
    }
  });
  vm.runInContext(declarations, context);
  process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
  process.env.SUPABASE_SERVICE_ROLE_KEY = service;
  register("./lib/ts-esm-loader.mjs", import.meta.url);
  const { getRenderJob } = await import("../src/lib/rcap/render/job-queue.ts");
  const { currentPersonalizedVerification } = await import("../src/lib/rcap/render/personalized-packet.ts");
  return {
    workerDigest, preview: environmentClassification, targetJobs, accounting, getRenderJob,
    receipt: writeClinicReceipt, sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
    readClaimOrder: (id, kind) => context.readClaimOrder(id, kind),
    async requireNoHistoricalHousekeeping(targetId) {
      const rows = (await sql(`select id from public.packet_render_jobs where id<>'${targetId}' and (
        (status='queued' and attempt_count>=max_attempts)
        or (status in ('claimed','rendering','validating') and claim_expires_at<now())
        or (status='failed' and failure_disposition='retryable'))`)).json;
      assert.equal(rows.length, 0, "historical housekeeping would occur; do not run the worker");
      return rows;
    },
    async requireDownstreamClosure(target, fixture, claimOrder, housekeeping) {
      const preview = await verifyExactHostedPreview(baseUrl, bypassSecret);
      assert.deepEqual(preview, environmentClassification, "Preview identity changed before worker");
      const currentVerification = await currentPersonalizedVerification(fixture.participantUserId, fixture.packetItemId);
      assert.equal(currentVerification.hash, target.sponsored_verification_hash, "protected verification is no longer current");
      const snapshot = (await sql(downstreamClosureSql(target.id))).json[0]?.closure;
      const readback = assertDownstreamClosure(snapshot, {target, fixture, preview, runtime:workerRuntime,
        supabaseUrl, claimOrder, housekeeping});
      await writeClinicReceipt("downstream-closure", readback);
      return readback;
    },
    async runOneCycle(id) {
      assert.equal(diagnostics.cycles.length, 0, "exactly one Clinic worker cycle");
      context.targetJobId = id;
      await context.runOneCycle(1, id, { targetCycles: 0, backlogCycles: 0, noJobCycles: 0, unprovenCycles: 0, backlogJobsClaimed: [] });
      assert.equal(diagnostics.cycles.length, 1);
      return JSON.parse(JSON.stringify(diagnostics.cycles[0]));
    },
    async deliveryState(id) {
      assert.ok(validUuid(id));
      const rows = (await sql(`select jsonb_build_object(
        'job',(select jsonb_build_object('id',id,'status',status,'delivered_at',delivered_at,'output_sha256',output_sha256,'output_storage_path',output_storage_path) from public.packet_render_jobs where id='${id}'),
        'events',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'event_type',event_type,'created_at',created_at) order by created_at,id),'[]'::jsonb) from public.packet_delivery_events where render_job_id='${id}')
      ) as state`)).json;
      assert.equal(rows.length, 1); return rows[0].state;
    }
  };
}
