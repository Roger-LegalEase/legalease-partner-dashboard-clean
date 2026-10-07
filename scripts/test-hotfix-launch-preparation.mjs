// Disposable loopback Auth/Postgres only. No invitation or delivery calls.
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { register } from "node:module";
import { request, chromium } from "playwright";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { artifactSourceFixture } from "./lib/rcap-onboarding-artifact-fixture.mjs";
register("./lib/ts-esm-loader.mjs", import.meta.url);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(url).hostname, "127.0.0.1", "Loopback only");
const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { provisionPartner } = await import("../src/lib/partners/partner-provisioning-service.ts");
const service = await import("../src/lib/partners/onboarding/service.ts");
const BASE = process.env.JOURNEY_BASE_URL ?? "http://127.0.0.1:3139";
assert.equal(new URL(BASE).hostname, "127.0.0.1", "Loopback app only");
const run = Date.now().toString(36), slugs = [], users = [], passwords = new Map(), requests = [];
async function session(user) {
  const cookies = new Map();
  const auth = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: { getAll: () => [...cookies].map(([name, value]) => ({ name, value })), setAll: items => items.forEach(c => cookies.set(c.name, c.value)) } });
  assert.equal((await auth.auth.signInWithPassword({ email: user.email, password: passwords.get(user.id) })).error, null);
  const api = await request.newContext({ baseURL: BASE, extraHTTPHeaders: { cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join("; "), origin: BASE } });
  requests.push(api);
  return { api, auth, cookies };
}
async function load(api) {
  const response = await api.get("/api/partners/onboarding/workspace");
  assert.equal(response.status(), 200);
  return (await response.json()).onboarding;
}
async function user(label) {
  const password = `Test-${randomBytes(16).toString("hex")}!9`;
  const result = await db.auth.admin.createUser({ email: `${label}-${run}@example.test`, password, email_confirm: true });
  assert.equal(result.error, null);
  users.push(result.data.user.id);
  passwords.set(result.data.user.id, password);
  return result.data.user;
}
async function save(api, sectionKey, data, mode = "draft_save") {
  const portal = await load(api);
  const section = portal.sections.find(s => s.key === sectionKey);
  const response = await api.post(`/api/partners/onboarding/sections/${sectionKey}`, { data: { expectedRevision: section.revision, expectedWorkspaceVersion: portal.workspace.aggregateVersion, requestId: crypto.randomUUID(), mode, data } });
  const result = await response.json();
  assert.equal(response.status(), 200, JSON.stringify(result));
  return result;
}


try {
 const operator=await user("launch-operator");
 assert.equal((await db.from("partner_users").insert({auth_user_id:operator.id,partner_slug:null,role:"internal_admin",status:"active"})).error,null);
 const slug=`launch-${run}`;slugs.push(slug);
 await provisionPartner({operatorUserId:operator.id,values:{organizationName:"Launch Test",legalOrganizationName:"Launch Test LLC",partnerSlug:slug,programName:"Isolated launch preparation",programPurpose:"Local private draft verification.",administratorName:"Synthetic Administrator",administratorEmail:`unissued-${run}@example.test`,clearanceReason:"Isolated launch verification.",idempotencyKey:crypto.randomUUID()}});
 const partner=await user("launch-partner");assert.equal((await db.from("partner_users").insert({auth_user_id:partner.id,partner_slug:slug,role:"partner_admin",status:"active"})).error,null);
 const internal=await session(operator), partnerSession=await session(partner);
 const endpoint=`/api/internal/partners/onboarding/phase1/${slug}`;
 async function snapshot(){const r=await internal.api.get(endpoint);assert.equal(r.status(),200);return(await r.json()).snapshot;}
 async function act(action,payload){const s=await snapshot();const r=await internal.api.post(endpoint,{data:{workspaceId:s.workspace.id,expectedWorkspaceVersion:s.workspace.aggregateVersion,requestId:crypto.randomUUID(),action,payload}});assert.equal(r.status(),200);return await r.json();}
 await act("commercial_gate",{outcome:"cleared_by_authorized_internal_override",overrideReason:"Authorized isolated fixture."});
 const enabled=process.argv.includes("--enabled");
 const browser=await chromium.launch();
 try {
  const context=await browser.newContext();await context.addCookies([...partnerSession.cookies].map(([name,value])=>({name,value,domain:"127.0.0.1",path:"/"})));
  const page=await context.newPage();
  await page.goto(`${BASE}/partner/onboarding/brand_public_page?step=private-preview-approval`);
  const fresh=await page.locator("main").first().innerText();
  if(enabled){assert.match(fresh,/Needed before review/i);assert.doesNotMatch(fresh,/Private preview is not available yet/);console.log("PASS fresh private preview loads with explicit missing source facts");}
  else {assert.match(fresh,/launch preparation is not enabled/);console.log("PASS feature-disabled private preview explains actual cause");}
  const original=artifactSourceFixture();const ids=new Map([...original.data.organization_contacts.contacts,...original.data.staff_dashboard_plan.planned_users,...original.data.support_referrals_reporting.report_recipients].map(r=>[r.stable_row_id,crypto.randomUUID()]));
  const fixture=JSON.parse(JSON.stringify(original,(key,v)=>typeof v==="string"&&ids.has(v)?ids.get(v):v));
  for(const key of ["partner_privacy_url","accessibility_url","impact_reporting_url"])fixture.data.brand_public_page[key]="";
  for(const row of fixture.data.staff_dashboard_plan.planned_users)for(const key of ["training_status","training_completed_at","invitation_status","membership_status"])delete row[key];
  for(const [key,data] of Object.entries(fixture.data))await save(partnerSession.api,key,data);
  const w=(await snapshot()).workspace;
  execFileSync("docker",["exec","-i","legalease-hotfix-local-db-1","psql","-U","postgres","-p","55432","-d","rcap","-v","ON_ERROR_STOP=1","-q"],{input:`update partner_onboarding_sections set status='submitted',revision=revision+1 where workspace_id='${w.id}'; update partner_onboarding set status='ready_for_review',aggregate_version=aggregate_version+1 where id='${w.id}';`,stdio:["pipe","ignore","pipe"]});
  for(const section of (await snapshot()).sections)await act("approve_section",{sectionKey:section.key,reason:"Synthetic verified launch-prep fixture."});
  await act("ready_for_launch",{reason:"Synthetic eight-section reviewed fixture."});
  const internalContext=await browser.newContext();const internalPage=await internalContext.newPage();await internalContext.addCookies([...internal.cookies].map(([name,value])=>({name,value,domain:"127.0.0.1",path:"/"})));
  await internalPage.goto(`${BASE}/internal/partners/onboarding/${slug}`);
  assert.match(await internalPage.locator("main").first().innerText(),/Phase 1 complete/);
  if(!enabled){assert.equal(await internalPage.locator("#launch-prep-heading").count(),0);assert.equal(await internalPage.locator('a[href="#launch-prep-heading"]').count(),0);assert.equal((await internal.api.get(`${endpoint}/artifacts`)).status(),404);console.log("PASS completed Phase 1, flag-off truthful unavailable state and no dead continuation");}
  else {
   assert.equal(await internalPage.locator("#launch-prep-heading").count(),1);assert.equal(await internalPage.locator('a[href="#launch-prep-heading"]').count(),1);console.log("PASS actual launch panel with matching continuation anchor");
   for(const type of ["implementation_brief","operations_escalation_plan","dashboard_user_reporting_matrix","staff_quick_start_guide","co_branded_page_configuration","partner_launch_kit"]){
    const r=await internal.api.post(`${endpoint}/artifacts`,{data:{requestId:crypto.randomUUID(),action:"generate",payload:{artifactType:type}}});assert.equal(r.status(),200,JSON.stringify(await r.json()));const b=await r.json();const entry=b.board.entries.find(e=>e.artifactType===type);assert.equal(entry.currentVersion.generationStatus,"succeeded");assert.ok(entry.currentVersion.document);
    const draftDownload=await internal.api.get(`${endpoint}/artifacts/download?versionId=${b.result.versionId}`);assert.equal(draftDownload.status(),409);
    const approval=await internal.api.post(`${endpoint}/artifacts`,{data:{requestId:crypto.randomUUID(),action:"approve",payload:{artifactVersionId:b.result.versionId,comments:"Synthetic content review; named source gaps remain visible and readiness is not approved."}}});assert.equal(approval.status(),200);
    const download=await internal.api.get(`${endpoint}/artifacts/download?versionId=${b.result.versionId}`);assert.equal(download.status(),200);assert.match(download.headers()["content-type"],/application\/pdf/);assert.ok((await download.body()).length>0);
    console.log(`PASS generate/open private ${type}`);
   }
   const ready=await internal.api.get(`${endpoint}/launch-readiness`);assert.equal(ready.status(),200);const readiness=(await ready.json()).readiness;assert.ok(readiness);assert.equal(readiness.ready,false);assert.ok(readiness.blockingFailures>0);assert.ok(readiness.primaryNextAction);console.log("PASS readiness retains unresolved checks without forcing pass");
   assert.equal((await partnerSession.api.post(`${endpoint}/artifacts`,{data:{}})).status(),403);
   const anonymous=await request.newContext({baseURL:BASE,extraHTTPHeaders:{origin:BASE}});requests.push(anonymous);assert.equal((await anonymous.post(`${endpoint}/artifacts`,{data:{}})).status(),401);assert.equal((await anonymous.get(`/p/${slug}`)).status(),404);console.log("PASS private/internal action boundaries and public page remains inactive");
   const partnerContext=await browser.newContext();await partnerContext.addCookies([...partnerSession.cookies].map(([name,value])=>({name,value,domain:"127.0.0.1",path:"/"})));
   const partnerPage=await partnerContext.newPage();await partnerPage.goto(`${BASE}/partner/onboarding/brand_public_page?step=private-preview-approval`);assert.doesNotMatch(await partnerPage.locator("main").first().innerText(),/could not be loaded|Private preview is not available yet/);console.log("PASS populated private preview loads with blank optional links and independently of artifact approval");
   const permissionSQL=sql=>execFileSync("docker",["exec","-i","legalease-hotfix-local-db-1","psql","-U","postgres","-p","55432","-d","rcap","-v","ON_ERROR_STOP=1","-q"],{input:sql,stdio:["pipe","ignore","pipe"]});
   try {
    permissionSQL("revoke select on partner_onboarding_artifact_versions from service_role, authenticated;");
    await internalPage.reload();
    const failedInternal=await internalPage.locator("main").first().innerText();assert.match(failedInternal,/Phase 1 complete/);assert.match(failedInternal,/Launch preparation could not be loaded/);assert.doesNotMatch(failedInternal,/Phase 1 onboarding workspace could not be loaded/);assert.equal(await internalPage.locator('a[href="#launch-prep-heading"]').count(),0);
    await partnerPage.reload();assert.match(await partnerPage.locator("main").first().innerText(),/private preview could not be loaded/);console.log("PASS real optional-read failure preserves Phase 1, removes dead continuation and identifies preview read failure");
   } finally {permissionSQL("grant select on partner_onboarding_artifact_versions to service_role, authenticated;");}
   await internalPage.reload();assert.equal(await internalPage.locator("#launch-prep-heading").count(),1);await partnerPage.reload();assert.doesNotMatch(await partnerPage.locator("main").first().innerText(),/private preview could not be loaded/);console.log("PASS local read permission restored and both panels recover");

  }
 } finally {await browser.close();}
 console.log("Local launch-preparation acceptance passed");
} finally {for(const api of requests)await api.dispose();}
