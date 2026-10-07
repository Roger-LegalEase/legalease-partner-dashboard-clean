// Disposable loopback Auth/Postgres only. No invitation or delivery calls.
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { register } from "node:module";
import { request, chromium, webkit } from "playwright";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { artifactSourceFixture } from "./lib/rcap-onboarding-artifact-fixture.mjs";
register("./lib/ts-esm-loader.mjs", import.meta.url);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(url).hostname, "127.0.0.1", "Loopback only");
const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { provisionPartner } = await import("../src/lib/partners/partner-provisioning-service.ts");
const service = await import("../src/lib/partners/onboarding/service.ts");
const browserType = process.env.JOURNEY_BROWSER === "webkit" ? webkit : chromium;
const sql = input => execFileSync("docker", ["exec", "-i", "legalease-hotfix-local-db-1", "psql", "-U", "postgres", "-p", "55432", "-d", "rcap", "-v", "ON_ERROR_STOP=1", "-Atq"], { input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
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
 const operator=await user("review-operator");
 assert.equal((await db.from("partner_users").insert({auth_user_id:operator.id,partner_slug:null,role:"internal_admin",status:"active"})).error,null);
 const slug=`review-${run}`;slugs.push(slug);
 await provisionPartner({operatorUserId:operator.id,values:{organizationName:"Review Test",legalOrganizationName:"Review Test LLC",partnerSlug:slug,programName:"Isolated review",programPurpose:"Disposable review verification.",administratorName:"Synthetic Administrator",administratorEmail:`unissued-${run}@example.test`,clearanceReason:"Local review verification.",idempotencyKey:crypto.randomUUID()}});
 const w=await db.from("partner_onboarding").select("id").eq("partner_slug",slug).single();assert.equal(w.error,null);const wid=w.data.id;
 // Explicit synthetic submitted fixture. Review actions below use authenticated real API/RPC.
 assert.match(wid,/^[a-f0-9-]{36}$/);
 execFileSync("docker",["exec","-i","legalease-hotfix-local-db-1","psql","-U","postgres","-p","55432","-d","rcap","-v","ON_ERROR_STOP=1","-q"],{input:`update partner_onboarding_sections set status='submitted',revision=revision+1 where workspace_id='${wid}'; update partner_onboarding set status='ready_for_review',aggregate_version=aggregate_version+1 where id='${wid}';`,stdio:["pipe","ignore","pipe"]});
 const {api,cookies,auth:firstAuth}=await session(operator);const endpoint=`/api/internal/partners/onboarding/phase1/${slug}`;
 async function snapshot(){const r=await api.get(endpoint);assert.equal(r.status(),200);return(await r.json()).snapshot;}
 async function act(action,payload,options={}){const s=await snapshot();const body={workspaceId:wid,expectedWorkspaceVersion:s.workspace.aggregateVersion,requestId:crypto.randomUUID(),action,payload,...options};const r=await api.post(endpoint,{data:body});return {status:r.status(),data:await r.json(),body};}
 const browser=await browserType.launch();
 try {
  const context=await browser.newContext();
  await context.addCookies([...cookies].map(([name,value])=>({name,value,domain:"127.0.0.1",path:"/"})));
  const page=await context.newPage();page.setDefaultTimeout(15000);let writes=0;
  page.on("request",r=>{if(r.method()==="POST"&&r.url().includes(endpoint))writes++;});
  await page.goto(`${BASE}/internal/partners/onboarding/${slug}`);await page.waitForLoadState("networkidle");
  await page.locator("[data-operation-card='request_changes'] textarea").fill("Do not persist this cancelled instruction.");
  await page.locator("[data-action='request_changes']").click();
  await page.locator("[data-correction-confirmation] button:has-text('Cancel')").click();
  assert.equal(writes,0);
  const cancelled=await db.from("partner_onboarding_change_requests").select("id").eq("workspace_id",wid);assert.equal(cancelled.error,null);assert.equal(cancelled.data.length,0);
  console.log("PASS real application correction cancellation makes no API/database write");
 } finally {await browser.close();}
 let result=await act("commercial_gate",{outcome:"cleared_by_paid_invoice",evidenceReference:"forged-local-evidence"});assert.equal(result.status,409);assert.match(result.data.error,/payment status is not paid/);console.log("PASS authoritative paid-invoice denial");
 result=await act("commercial_gate",{outcome:"cleared_by_authorized_internal_override",overrideReason:"Isolated authorized fixture."});assert.equal(result.status,200);
 const before=await snapshot();
 result=await act("request_changes",{sectionKey:"program_goals",instructions:"Synthetic correction history."});assert.equal(result.status,200);assert.equal(result.data.snapshot.workspace.status,"waiting_on_partner");
 let history=await db.from("partner_onboarding_change_requests").select("id,status,partner_safe_instructions,requested_by,requested_at").eq("workspace_id",wid);assert.equal(history.error,null);assert.equal(history.data.length,1);assert.equal(history.data[0].status,"open");const record=history.data[0];console.log("PASS correction creation and handback persisted");
 result=await act("approve_section",{sectionKey:"program_goals",reason:"Reviewed corrected intent."});assert.equal(result.status,200);assert.equal(result.data.snapshot.workspace.status,"ready_for_review");
 history=await db.from("partner_onboarding_change_requests").select("id,status,partner_safe_instructions,requested_by,requested_at").eq("workspace_id",wid);assert.equal(history.data.length,1);assert.equal(history.data[0].id,record.id);assert.equal(history.data[0].status,"resolved");assert.equal(history.data[0].partner_safe_instructions,record.partner_safe_instructions);assert.equal(history.data[0].requested_by,record.requested_by);console.log("PASS needs-changes approval resolves open correction preserving history");

 // Two separately authenticated sessions read the same version. No mocked API/RPC.
 const second=await session(operator);
 assert.notEqual((await second.auth.auth.getSession()).data.session.access_token,(await firstAuth.auth.getSession()).data.session.access_token,"Distinct authorized sessions");
 const versionA=(await snapshot()).workspace.aggregateVersion;
 const versionBResponse=await second.api.get(endpoint);assert.equal(versionBResponse.status(),200);
 const versionB=(await versionBResponse.json()).snapshot.workspace.aggregateVersion;
 assert.equal(versionA,versionB);
 async function businessState(){
  const state={};
  for(const table of ["partner_onboarding", "partner_onboarding_sections", "partner_onboarding_change_requests", "partner_onboarding_activity", "partner_onboarding_integration_events", "partner_onboarding_idempotency"]){
   const r=await db.from(table).select("*").eq(table==="partner_onboarding"?"id":"workspace_id",wid);
   assert.equal(r.error,null);state[table]=r.data.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  return state;
 }
 const raceBrowser=await browserType.launch();
 try {
  const context=await raceBrowser.newContext();
  await context.addCookies([...second.cookies].map(([name,value])=>({name,value,domain:"127.0.0.1",path:"/"})));
  const page=await context.newPage();page.setDefaultTimeout(15000);await page.goto(`${BASE}/internal/partners/onboarding/${slug}`);await page.waitForLoadState("networkidle");
  const card=page.locator("[data-operation-card='section_review']");
  await card.locator("select").first().selectOption("organization_contacts");
  await card.locator("textarea").fill("Session B reviewed the old snapshot.");
  // A commits only after B's real page has rendered the shared version.
  const a=await act("approve_section",{sectionKey:"organization_contacts",reason:"Session A verified decision."});
  assert.equal(a.status,200);assert.equal(a.data.result.workspaceVersion,versionA+1);
  const committed=await businessState();
  const responsePromise=page.waitForResponse(r=>r.url().includes(endpoint)&&r.request().method()==="POST");
  await card.locator("[data-action='approve_section']").click();
  const rejected=await responsePromise;const rejectedBody=rejected.request().postDataJSON();
  assert.equal(rejectedBody.expectedWorkspaceVersion,versionB);assert.notEqual(rejectedBody.requestId,a.body.requestId);
  assert.equal(rejected.status(),409);assert.deepEqual(await rejected.json(),{success:false,code:"revision_conflict",error:"Newer saved information exists."});
  assert.deepEqual(await businessState(),committed,"Rejected new stale request must leave business state, version, history, audit, outbox and idempotency unchanged");
  await card.getByRole("button",{name:"Reload current workspace"}).waitFor();
  assert.match(await card.innerText(),/Nothing from this attempt was saved/);
  assert.doesNotMatch(await card.innerText(),/Persisted status:|Not confirmed/);
  assert.equal(await card.locator("textarea").inputValue(),"Session B reviewed the old snapshot.");
  // Confirm the exact database response now survives the REST boundary.
  const rpc=await db.rpc("rcap_service_review_onboarding",{p_partner_slug:slug,p_actor_user_id:operator.id,p_workspace_id:wid,p_expected_workspace_version:versionB,p_request_id:crypto.randomUUID(),p_payload_hash:"a".repeat(64),p_operation:{action:"approve_section",sectionKey:"organization_contacts",reason:"Direct conflict trace."}});
  assert.equal(rpc.error?.code,"PT409");assert.equal(rpc.error?.message,"Onboarding workspace revision conflict");
  assert.deepEqual(await businessState(),committed);
  console.log("PASS two authorized sessions: RPC PT409 -> safe HTTP 409 -> actionable real-browser conflict; rejected state/audit/outbox unchanged");
  // Explicit reload/review, then a fresh operation succeeds exactly once.
  await Promise.all([page.waitForNavigation({waitUntil:"domcontentloaded"}),card.getByRole("button",{name:"Reload current workspace"}).click()]);
  await page.waitForLoadState("networkidle");
  await card.locator("select").first().selectOption("geography_audience_language_accessibility");
  await card.locator("textarea").fill("Session B explicitly reloaded and reviewed.");
  const freshPromise=page.waitForResponse(r=>r.url().includes(endpoint)&&r.request().method()==="POST");
  await card.locator("[data-action='approve_section']").click();
  const fresh=await freshPromise;const freshBody=fresh.request().postDataJSON();const freshData=await fresh.json();
  assert.equal(fresh.status(),200);assert.equal(freshBody.expectedWorkspaceVersion,versionA+1);
  assert.notEqual(freshBody.requestId,rejectedBody.requestId);assert.equal(freshData.result.workspaceVersion,versionA+2);
  const afterFresh=await businessState();
  for(const completedBody of [a.body,freshBody]){
   const replay=await second.api.post(endpoint,{data:completedBody});assert.equal(replay.status(),200);assert.equal((await replay.json()).result.duplicate,true);
   assert.deepEqual(await businessState(),afterFresh);
  }
  console.log("PASS explicit reload fresh save once; completed old-version requests remain idempotent without writes");
 } finally {await raceBrowser.close();}
 // Genuine RPC failure must stay a service failure, never become a conflict.
 // Inject only into the disposable function, restoring exact definition in finally.
 const signature="public.rcap_service_review_onboarding(text,uuid,uuid,bigint,uuid,text,jsonb)";
 const definition=sql(`select pg_get_functiondef('${signature}'::regprocedure);`);
 const statement="raise exception using errcode = 'PT409', message = 'Onboarding workspace revision conflict';";
 assert.equal(definition.split(statement).length,2);
 try {
  sql(definition.replace(statement,"raise exception using errcode = 'XX000', message = 'Synthetic non-conflict dependency failure';"));
  const fault=await act("approve_section",{sectionKey:"organization_contacts",reason:"Synthetic failure."},{expectedWorkspaceVersion:1});
  assert.equal(fault.status,503);assert.deepEqual(fault.data,{success:false,code:"persistence_failed",error:"The onboarding change could not be saved."});
 } finally {sql(definition);}
 const anonymous=await request.newContext({baseURL:BASE,extraHTTPHeaders:{origin:BASE}});requests.push(anonymous);
 const unauthorizedBody={workspaceId:wid,expectedWorkspaceVersion:1,requestId:crypto.randomUUID(),action:"approve_section",payload:{sectionKey:"organization_contacts",reason:"Not authorized."}};
 const anonymousResult=await anonymous.post(endpoint,{data:unauthorizedBody});assert.equal(anonymousResult.status(),401);
 const outsider=await session(await user("review-outsider"));
 const denied=await outsider.api.post(endpoint,{data:unauthorizedBody});assert.equal(denied.status(),403);
 for(const response of [anonymousResult,denied]){const body=await response.json();assert.equal(body.success,false);assert.equal(body.snapshot,undefined);assert.equal(body.workspaceVersion,undefined);assert.equal(body.code,response.status()===401?"unauthenticated":"forbidden");assert.ok(!JSON.stringify(body).includes(wid));}
 console.log("PASS genuine RPC failure remains 503; anonymous 401 / unauthorized 403 disclose no workspace state");

 for(const section of (await snapshot()).sections.filter(s=>s.status!=="approved")){
  result=await act("approve_section",{sectionKey:section.key,reason:"Local verified decision."});assert.equal(result.status,200);
  const repeated=await api.post(endpoint,{data:result.body});assert.equal(repeated.status(),200);const duplicate=await repeated.json();assert.equal(duplicate.result.duplicate,true);assert.equal(duplicate.snapshot.workspace.aggregateVersion,result.data.snapshot.workspace.aggregateVersion);
  const changed=await api.post(endpoint,{data:{...result.body,payload:{...result.body.payload,reason:"Different payload"}}});assert.equal(changed.status(),409);
 }
 let final=await snapshot();assert.equal(final.sections.filter(s=>s.status==="approved").length,8);console.log("PASS eight approvals, idempotent duplicate replay and changed-payload denial");
 result=await act("ready_for_launch",{reason:"Local reviewed readiness."});assert.equal(result.status,200);assert.equal(result.data.snapshot.workspace.status,"ready_to_launch");console.log("PASS ready-to-launch transition persisted");

 console.log("Real local review API/database checks passed; cancellation is covered by browser zero-request assertion.");
} finally {for(const api of requests)await api.dispose();}
