import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import ts from "typescript";
import React from "react";
import * as crypto from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";

const read = (p) => fs.readFileSync(p, "utf8");
const flowPath = "src/components/expungement-ai/screening/ScreeningFlow.tsx";
const flow = read(flowPath);
const source = ts.createSourceFile(flowPath, flow, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handler;
const bindingNames = new Set(["coarseAnswers", "hasPrivateWorkingCopy", "originalReviewMessage"]);
const bindings = [];
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === "handlePacketAction") handler = node.getText(source);
  if (ts.isVariableDeclaration(node) && bindingNames.has(node.name.getText(source))) bindings.push(`const ${node.name.getText(source)} = ${node.initializer.getText(source)};`);
  ts.forEachChild(node, visit);
}
visit(source);
assert(handler, "actual production Save handler exists");
function moduleAt(p, dependencies = {}, globals = {}, cache = new Map()) {
  if (cache.has(p)) return cache.get(p);
  if (p.endsWith(".json")) return {default: JSON.parse(read(p))};
  const exports = {};
  cache.set(p, exports);
  vm.runInNewContext(ts.transpileModule(read(p), {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX}}).outputText,
    {exports, URL, URLSearchParams, ...globals, require(name) {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      const base = name.startsWith("@/") ? `src/${name.slice(2)}` : name.startsWith(".") ? path.join(path.dirname(p), name) : null;
      const target = base && [base, `${base}.ts`, `${base}.tsx`, `${base}.mjs`].find(x => fs.existsSync(x));
      assert(target, `unexpected dependency ${name}`);
      return moduleAt(target, dependencies, globals, cache);
    }});
  return exports;
}
const redirect = moduleAt("src/lib/auth/redirect.ts");
const matterPath = moduleAt("src/lib/expungement-ai/claim/matter-path.ts");
const toAnswers = moduleAt("src/components/expungement-ai/screening/answers.ts");
const savedPath = "/briefcase/matters/10000000-0000-4000-8000-000000000001";

function exercise(options = {}) {
  const calls = [], pushes = [], errors = [], busy = [], matters = new Set();
  let pendingFailure = options.pendingFailure, lostClaim = options.lostClaim;
  let release;
  const pause = options.pause ? new Promise(resolve => { release = resolve; }) : null;
  const fetch = async (url, request) => {
    const body = JSON.parse(request.body);
    calls.push({url, body});
    if (url.endsWith("/pending")) {
      if (body.legacyReviewRequested) return Response.json({error: "verified_resume_review_required"}, {status: 409});
      if (pause) await pause;
      if (pendingFailure) { pendingFailure = false; return Response.json({ok: false}, {status: 503}); }
      return Response.json({claimToken: `synthetic_claim_token_${calls.length}_012345678901234567890`});
    }
    assert(url.endsWith("/pending/claim"));
    assert.deepEqual(Object.keys(body), ["claimToken"], "browser never supplies owner/route/payment/matter authority");
    if (options.status) return Response.json({ok: false}, {status: options.status});
    matters.add(body.claimToken); // Synthetic atomic-claim port, not SQL qualification.
    if (lostClaim) { lostClaim = false; throw new Error("synthetic lost durable-claim response"); }
    return Response.json({redirectTo: savedPath});
  };
  const handoff = moduleAt("src/lib/expungement-ai/claim/claim-handoff.ts", {
    "@/lib/auth/redirect": redirect,
    "@/lib/expungement-ai/claim/matter-path": matterPath
  }, {fetch});
  const context = {
    evaluation: {resultCode: "needs_more_info", paymentAllowed: false},
    profile: {jurisdiction: {code: "FL"}, profileVersion: "synthetic-current"},
    matterIdRef: {current: "synthetic-screening-correlation"},
    answers: {pathway_id: "synthetic-path", completed_sentence: null},
    evaluatedAnswers: null,
    sessionId: undefined, effectiveInitialSessionId: undefined, acquisitionReceipt: undefined, locale: "en",
    savingResultRef: {current: false}, pendingClaimRef: {current: null},
    protectedOnlyIds: {current: new Set(options.privateFact ? ["synthetic_private"] : [])},
    setSavingResult: x => busy.push(x), setPacketActionError: x => errors.push(x),
    SAVE_RESULT_ERROR: "synthetic-save-error", toScreeningAnswers: toAnswers.toScreeningAnswers,
    submitClaim: handoff.submitClaim, claimHandoffPath: handoff.claimHandoffPath,
    router: {push: x => pushes.push(x)}, fetch
  };
  if (options.privateFact) context.answers.synthetic_private = "synthetic-private-value";
  vm.createContext(context);
  vm.runInContext(ts.transpileModule(bindings.join("\n"), {compilerOptions: {target: ts.ScriptTarget.ES2022}}).outputText, context);
  vm.runInContext(ts.transpileModule(handler, {compilerOptions: {target: ts.ScriptTarget.ES2022}}).outputText, context);
  return {run: () => context.handlePacketAction(), context, calls, pushes, errors, busy, matters, release};
}
const pendingCalls = t => t.calls.filter(c => c.url.endsWith("/pending"));
const claimCalls = t => t.calls.filter(c => c.url.endsWith("/claim"));

if (process.argv.includes("--transient-only")) {
  const token = "synthetic_claim_transient_retry_01234567890123456789";
  const rows = [];
  function browser() {
    let url = new URL(`https://example.invalid/expungement-ai/sign-in?next=%2Fbriefcase&claim=${token}`);
    return {
      window: {location: {get href() {return url.href;}, get search() {return url.search;}, assign() {}}, history: {state: {}, replaceState(_state,_title,next) {url=new URL(next,url);}}},
      retained: () => url.searchParams.get("claim") === token
    };
  }
  function helper(b, replies) {
    const requests=[];
    const claim=moduleAt("src/lib/expungement-ai/claim/claim-handoff.ts", {
      "@/lib/auth/redirect": redirect,
      "@/lib/expungement-ai/claim/matter-path": matterPath
    }, {window:b.window, fetch:async(_url,request)=>{
      const body=JSON.parse(request.body);assert.deepEqual(Object.keys(body),["claimToken"]);requests.push(body.claimToken);
      const reply=replies.shift();if(reply instanceof Error)throw reply;
      if(reply.badJson)return new Response("not JSON",{status:reply.status});
      return Response.json(reply.body??{}, {status:reply.status});
    }});
    return {claim,requests};
  }
  const cases = [
    {name:"429 rate-limit",status:429,retain:true},
    {name:"200 missing redirect",status:200,retain:true},
    {name:"200 unreadable body",status:200,badJson:true,retain:true},
    {name:"200 external redirect",status:200,body:{redirectTo:"https://outside.invalid/briefcase"},retain:true},
    {name:"200 non-matter redirect",status:200,body:{redirectTo:"/briefcase"},retain:true},
    {name:"200 non-string redirect",status:200,body:{redirectTo:123},retain:true},
    {name:"401 auth handoff",status:401,retain:true},
    {name:"403 verification required",status:403,body:{error:"account_not_verified"},retain:true},
    {name:"409 could not verify",status:409,body:{error:"result_could_not_be_verified"},retain:true},
    {name:"503 unavailable",status:503,retain:true},
    {name:"network failure",network:true,retain:true},
    ...[400,404,410,422].map(status=>({name:`${status} terminal link`,status,retain:false})),
    {name:"200 validated exact matter",status:200,body:{ok:true,redirectTo:savedPath},retain:false,ok:true}
  ];
  for (const c of process.argv.includes("--retention-guard-only") ? cases.slice(0,1) : cases) {
    const b=browser(), {claim}=helper(b,[c.network?new Error("synthetic network failure"):c]);
    const result=await claim.submitClaim(token);
    assert.equal(result.ok,c.ok===true,c.name);
    assert.equal(b.retained(),c.retain,`CLAIM-TRANSIENT-TOKEN-RETENTION: ${c.name}`);
    if(result.ok)assert.equal(result.redirectTo,savedPath);
    rows.push({name:c.name,status:result.ok?200:result.status,ok:result.ok,retained:b.retained()});
  }
  if(process.argv.includes("--retention-guard-only")) {
    console.log("PASS named transient-token retention guard");process.exit(0);
  }
  console.log(`PASS ${rows.length} actual exported submitClaim URL-retention/refusal/owned-redirect cases`);

  function actualFunctions(p,names,globals) {
    const ast=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),parts=[];
    function visit(n){if(ts.isFunctionDeclaration(n)&&names.includes(n.name?.text))parts.push(n.getText(ast));ts.forEachChild(n,visit);}
    visit(ast);assert.equal(parts.length,names.length);
    const context={URL,URLSearchParams,...globals};vm.createContext(context);
    vm.runInContext(ts.transpileModule(parts.join("\n"),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);return context;
  }
  // Callers use the real helper and reread the real in-memory URL, not a modeled status predicate.
  for (const failure of cases.filter(c=>!c.ok)) {
    const b=browser(), {claim,requests}=helper(b,[failure.network?new Error("synthetic network"):failure,{status:200,body:{redirectTo:savedPath}}]);
    const states={},navigations=[];
    b.window.location.assign = p=>navigations.push(p);
    const form=actualFunctions("src/components/expungement-ai/ConsumerSignInForm.tsx", ["finishPendingClaim","claimPendingResult","readAuthRequestContext","safeClaimToken"], {
      window:b.window,...redirect,...claim,translate:(_key,fallback)=>fallback,pendingClaimError:"Synthetic pending claim failed",
      setIsSubmitting:v=>{states.busy=v;},setErrorMessage:v=>{states.error=v;},setPendingClaimFailed:v=>{states.retry=v;}
    });
    await form.finishPendingClaim();assert.equal(navigations.length,0);
    assert.equal(states.retry,failure.retain,failure.name);
    assert.equal(states.busy,false);
    if(failure.retain){await form.finishPendingClaim();assert.equal(navigations[0],savedPath);assert.equal(requests.length,2);assert.equal(requests[0],requests[1]);assert.equal(b.retained(),false);}
    else assert(states.error.includes("no longer available"));
  }
  console.log("PASS actual ConsumerSignIn retry rereads retained token; terminal links refuse without a retry/authority grant");
  for (const failure of cases.filter(c=>!c.ok&&c.status!==401)) {
    const b=browser(), {claim,requests}=helper(b,[failure.network?new Error("synthetic network"):failure,{status:200,body:{redirectTo:savedPath}}]);
    const states={},navigations=[];
    const intent=actualFunctions("src/components/expungement-ai/BriefcaseSaveIntent.tsx",["finishClaim"], {
      ...claim,router:{replace:p=>navigations.push(p)},setSaving:v=>{states.busy=v;},setRetryToken:v=>{states.token=v;},setFailed:v=>{states.failed=v;}
    });
    await intent.finishClaim(claim.readClaimTokenFromUrl());assert.equal(navigations.length,0);assert.equal(states.failed,true);
    assert.equal(states.token,failure.retain?token:"",failure.name);
    if(failure.retain){await intent.finishClaim(states.token);assert.equal(navigations[0],savedPath);assert.equal(requests[0],requests[1]);}
  }
  console.log("PASS actual Briefcase continuation retains all unconfirmed failures and retries the same capability");
  console.log("PASS new transient correction only; prior source groups/51 fixtures and live actors untouched");
  process.exit(0);
}

if (process.argv.includes("--retry-guard-only")) {
  const t = exercise({lostClaim: true}); await t.run(); await t.run();
  assert.equal(pendingCalls(t).length, 1, "SAVE-RETRY-SAME-TOKEN: lost claim response retries one pending result");
  assert.equal(t.matters.size, 1);
  console.log("PASS named retry guard");
  process.exit(0);
}

if (!process.argv.includes("--server-only") && !process.argv.includes("--auth-only")) {
{
  const t = exercise({pause: true}); const first = t.run(); const second = t.run();
  assert.equal(pendingCalls(t).length, 1); t.release(); await Promise.all([first, second]);
  assert.equal(claimCalls(t).length, 1); assert.equal(t.pushes[0], savedPath);
  assert.equal(t.context.savingResultRef.current, false);
  console.log("PASS concurrent Save clicks share one pending/claim; busy state releases");
}
{
  const t = exercise({lostClaim: true}); await t.run();
  assert.equal(t.errors.at(-1), "synthetic-save-error"); await t.run();
  assert.equal(pendingCalls(t).length, 1, "SAVE-RETRY-SAME-TOKEN");
  assert.equal(claimCalls(t).length, 2); assert.equal(t.matters.size, 1); assert.equal(t.pushes[0], savedPath);
  assert.deepEqual(t.busy, [true, false, true, false]);
  console.log("PASS lost durable claim response retries same token and exact matter");
}
{
  const t = exercise({pendingFailure: true}); await t.run(); await t.run();
  assert.equal(pendingCalls(t).length, 2); assert.equal(claimCalls(t).length, 1);
  t.context.answers.completed_sentence = "Yes"; await t.run();
  assert.equal(pendingCalls(t).length, 3);
  console.log("PASS pending outage retries; changed authoritative inputs create a fresh result");
}
{
  const t = exercise({status: 401}); await t.run(); await t.run();
  assert.equal(pendingCalls(t).length, 1);
  assert(t.pushes.every(p => p.startsWith("/expungement-ai/sign-in?mode=create&claim=")));
  assert(!t.pushes.some(p => p.includes("pending=")));
  assert(!flow.includes("localStorage.setItem(\"claim") && !flow.includes("sessionStorage.setItem(\"claim"));
  console.log("PASS signed-out result uses token auth handoff, never pending ID or answer authority");
}

// Render the actual result component; presentation dependencies cannot decide Save availability.
const jsx = await import("react/jsx-runtime");
const noIcon = () => null;
const result = moduleAt("src/components/expungement-ai/screening/ScreeningResult.tsx", {
  "react/jsx-runtime": jsx,
  "lucide-react": new Proxy({}, {get: () => noIcon}),
  "@/components/expungement-ai/LocalizationProvider": {useLocalization: () => ({locale: "en", t: (_k, fallback) => fallback, text: text => text})},
  "@/lib/expungement-ai/frontend/contracts": moduleAt("src/lib/expungement-ai/frontend/contracts.ts"),
  "@/lib/expungement-ai/missing-fields": {safeUserFacingEngineText: x => x, friendlyMissingFieldLabel: x => x},
  "@/lib/expungement-ai/localization": {routeLabelKeyForState: () => "synthetic-route"},
  "@/lib/expungement-ai/reviewed-result-copy": {msTimingDisplayContext: () => undefined, reviewedResultRouteLabel: () => undefined}
});
for (const resultCode of ["needs_more_info", "needs_review"]) {
  const props = {evaluation: {resultCode, userLabel: "Synthetic preliminary result", paymentAllowed: false, nextSteps: [], missingQuestionIds: [], reasons: [], cautions: []}, stateName: "Florida", questionPromptById: {}, onEditAnswers() {}, onPacketAction() {}};
  const markup = renderToStaticMarkup(React.createElement(result.ScreeningResult, props));
  assert(/Save (?:my result|this matter) and continue/.test(markup), resultCode);
  assert(!markup.includes("$50"));
  const busy = renderToStaticMarkup(React.createElement(result.ScreeningResult, {...props, savingResult: true}));
  assert(busy.includes("disabled=\"\"") && busy.includes("aria-busy=\"true\""));
}
console.log("PASS actual preliminary result Save remains visible, payment-free and busy-disabled");
console.log("PASS source-only Save boundary; no deployed jurisdiction, Auth, SQL or Briefcase acceptance claimed");

}

if (!process.argv.includes("--auth-only")) {
// Actual handlers and save policy, with explicit synthetic Auth/evaluator/SQL ports.
// This checks the application contract, not SQL concurrency or a deployed owner.
const policy = moduleAt("src/lib/expungement-ai/save-result-policy.ts");
let auth = {isAuthenticated: true, isVerified: true, userId: "10000000-0000-4000-8000-000000000002"};
let evaluationCode = "needs_more_info", outcome = "claimed", rpcError = null;
const inserts = [], rpcCalls = [];
const row = {pending_id:"10000000-0000-4000-8000-000000000003", product:"expungement_ai_dtc", jurisdiction:"FL", profile_version:"synthetic-current", screening_correlation_id:"synthetic-correlation", anonymous_session_id:null, screening_answers:{case_outcome:"I am not sure"}};
const db = {
  from(table) {
    assert.equal(table,"consumer_pending_screening_results");
    return {
      async insert(value) { inserts.push(value); assert(!Object.hasOwn(value,"matter_id") && !Object.hasOwn(value,"source_session_id")); assert(/^[a-f0-9]{64}$/.test(value.claim_token_hash)); return {error:null}; },
      select() {return this;}, eq(column, value) {assert.equal(column,"claim_token_hash");assert(/^[a-f0-9]{64}$/.test(value));return this;},
      async maybeSingle() {return {data:row,error:null};}
    };
  },
  async rpc(name,args) { assert.equal(name,"claim_pending_screening_result");rpcCalls.push(args);return {data:{outcome,matter_id:outcome==="claimed"||outcome==="idempotent_replay"?savedPath.split("/").at(-1):null},error:rpcError}; }
};
const dependencies = {
  "server-only": {}, "node:crypto": crypto,
  "next/server": {NextResponse:{json:(body,options)=>Response.json(body,options)}},
  "@/lib/supabase/server": {getSupabaseAdminClient:()=>db},
  "@/lib/rcap-engine/evaluator": {InvalidAnswerError:class extends Error {},ProfileVersionMismatchError:class extends Error {},UnsupportedJurisdictionError:class extends Error {}},
  "@/lib/rcap/briefcase/auth": {getRcapBriefcaseAuthState:async()=>auth},
  "@/lib/expungement-ai/authoritative-screening-result": {evaluateAuthoritativeScreeningResult(input) {
    assert.equal(input.jurisdiction,"FL");assert.equal(input.profileVersion,"synthetic-current");
    return {evaluation:{jurisdiction:"FL", profileVersion:input.profileVersion, matterId:input.matterId, resultCode:evaluationCode, paymentAllowed:false, userLabel:"Synthetic preliminary result", nextSteps:["Check the missing record detail"]},pathwayLabel:null,packetType:undefined,selectedTrackId:null};
  }},
  "@/lib/expungement-ai/briefcase": {isRcapPartnerScreeningSession:async()=>{throw Error("DTC must not borrow partner authority");},clampAuthoritativeMatterInput:input=>input},
  "@/lib/expungement-ai/rcap-screening-analytics": {recordScreeningEligibilityResult:async()=>{throw Error("DTC emits no partner result event");}},
  "@/lib/observability/logger": {getSafeRequestId:()=>"synthetic-request",logSecurityError() {}}
};
const pendingRoute = moduleAt("src/app/api/expungement-ai/screening/pending/route.ts",dependencies,{Response,TextEncoder});
const claimRoute = moduleAt("src/app/api/expungement-ai/screening/pending/claim/route.ts",dependencies,{Response,TextEncoder});
const token = "synthetic_claim_token_01234567890123456789";
const request = body => new Request("https://example.invalid/api/expungement-ai/screening/pending",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
for (const code of ["needs_more_info","needs_review"]) {
  evaluationCode=code;
  const response=await pendingRoute.POST(request({jurisdiction:"FL",profileVersion:row.profile_version,screeningCorrelationId:row.screening_correlation_id,answers:row.screening_answers,product:"rcap_partner",paymentAllowed:true}));
  assert.equal(response.status,200);const payload=await response.json();assert.equal(typeof payload.claimToken,"string");assert(!Object.hasOwn(payload,"pendingId"));
  assert.equal(inserts.at(-1).product,"expungement_ai_dtc");assert.equal(inserts.at(-1).result_code,code);assert.equal(inserts.at(-1).payment_allowed,false);
  const claim=await claimRoute.POST(request({claimToken:token,userId:"forged-owner",paymentAllowed:true}));
  assert.equal(claim.status,200);assert.equal((await claim.json()).redirectTo,savedPath);
  const args=rpcCalls.at(-1);assert.equal(args.p_user_id,auth.userId);assert.equal(args.p_claim_token,token);
  assert.equal(args.p_matter.result_code,code);assert.equal(args.p_matter.status,policy.statusForResultCode(code));
  assert.equal(args.p_matter.packet_status,"not_started");assert.equal(args.p_matter.payment_status,"not_applicable");assert.equal(args.p_matter.amount_cents,null);
  assert.deepEqual(JSON.parse(JSON.stringify(args.p_matter.artifact_refs_json.commercialFlow.screening.answers)),row.screening_answers);
}
console.log("PASS actual pending/claim handlers preserve preliminary answers/status, server owner and closed payment through atomic RPC");
for (const state of [{isAuthenticated:false},{isAuthenticated:true,isVerified:false,userId:auth.userId}]) {
  const before=rpcCalls.length;const original=auth;auth=state;
  const response=await claimRoute.POST(request({claimToken:token}));assert.equal(response.status,state.isAuthenticated?403:401);assert.equal(rpcCalls.length,before);auth=original;
}
for (const denied of ["denied_other_user","denied_expired","denied_revoked"]) {
  outcome=denied;const response=await claimRoute.POST(request({claimToken:token}));assert.equal(response.status,404);assert.deepEqual(await response.json(),{ok:false,error:"claim_rejected"});
}
outcome="idempotent_replay";assert.equal((await claimRoute.POST(request({claimToken:token}))).status,200);
rpcError={message:"synthetic unavailable"};const unavailable=await claimRoute.POST(request({claimToken:token}));assert.equal(unavailable.status,503);assert(!Object.hasOwn(await unavailable.json(),"redirectTo"));
console.log("PASS actual claim handler refuses unauthenticated/unverified/other-owner/expired/revoked and never reports failed RPC saved");

}

if (process.argv.includes("--auth-only")) {
  function functionsAt(p,names,globals) {
    const ast=ts.createSourceFile(p,read(p),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),selected=[];
    function visit(node) { if(ts.isFunctionDeclaration(node)&&names.includes(node.name?.text))selected.push(node.getText(ast));ts.forEachChild(node,visit); }
    visit(ast);assert.equal(selected.length,names.length);
    const context={URL,URLSearchParams,...globals};vm.createContext(context);
    vm.runInContext(ts.transpileModule(selected.join("\n"),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);return context;
  }
  const token="synthetic_claim_token_01234567890123456789";
  let location=new URL(`https://expungement.ai/expungement-ai/sign-in?mode=create&claim=${token}&next=%2Fbriefcase`);
  const browser={get location(){return location;},history:{replaceState(_a,_b,next){location=new URL(next,location);}}};
  const handoff=moduleAt("src/lib/expungement-ai/claim/claim-handoff.ts",{"@/lib/auth/redirect":redirect,"@/lib/expungement-ai/claim/matter-path":matterPath});
  const globals={window:browser,document:{title:"Synthetic"},...redirect,...handoff,absoluteExpungementAiUrl:p=>`https://expungement.ai${p}`};
  const form=functionsAt("src/components/expungement-ai/ConsumerSignInForm.tsx",["readAuthRequestContext","safeClaimToken","expungementAuthRedirectTo","isExpungementHost","forgotPasswordPath"],globals);
  assert.equal(form.readAuthRequestContext().claimToken,token);
  const email=new URL(form.expungementAuthRedirectTo("/briefcase",token));assert.equal(email.searchParams.get("claim"),token);assert(!email.searchParams.has("pending"));
  const forgot=new URL(form.forgotPasswordPath(),location);assert.equal(forgot.searchParams.get("claim"),token);
  location=forgot;
  const reset=functionsAt("src/app/auth/forgot-password/page.tsx",["passwordResetRedirectTo","signInReturnPath"],{...globals,passwordResetRedirectUrl:()=>"https://expungement.ai/auth/set-password"});
  assert.equal(new URL(reset.passwordResetRedirectTo()).searchParams.get("claim"),token);
  assert(new URL(reset.signInReturnPath(),location).searchParams.get("claim")===token);
  location=new URL(email);location.hash="#access_token=synthetic-never-persisted";
  const after=functionsAt("src/app/auth/set-password/page.tsx",["scrubAuthUrl","claimExpungementPending"],{...globals,submitClaim:async()=>({ok:false,status:503})});
  after.scrubAuthUrl("/briefcase");assert.equal(location.searchParams.get("claim"),token);assert.equal(location.hash,"");
  const retry=new URL(await after.claimExpungementPending("/briefcase"),location);assert.equal(retry.searchParams.get("claim"),token);assert.equal(retry.searchParams.get("claimRetry"),"1");
  console.log("PASS actual sign-in/signup-email/password-reset continuation preserves token and retry, never empty-Briefcase success");

  for (const response of [{ok:true,redirectTo:savedPath},{ok:false,status:503},{ok:false,status:404},{ok:false,status:401}]) {
    const states={};const navigations=[];
    const intent=functionsAt("src/components/expungement-ai/BriefcaseSaveIntent.tsx",["finishClaim"],{submitClaim:async()=>response,claimHandoffPath:handoff.claimHandoffPath,isTerminalClaimFailure:handoff.isTerminalClaimFailure,router:{replace:p=>navigations.push(p)},setSaving:v=>{states.saving=v;},setRetryToken:v=>{states.token=v;},setFailed:v=>{states.failed=v;}});
    await intent.finishClaim(token);
    if(response.ok) assert.equal(navigations[0],savedPath);
    else if(response.status===401)assert(new URL(navigations[0],location).searchParams.get("claim")===token);
    else {assert.equal(states.failed,true);assert.equal(states.token,response.status===503?token:"");}
  }
  console.log("PASS actual Briefcase claim continuation shows temporary retry, refuses terminal link and uses exact owned destination");

  let user={id:"synthetic-owner",email:"synthetic@example.invalid",user_metadata:{email_verified:true}},requests=0;
  const server=moduleAt("src/lib/supabase/auth-server.ts",{
    "server-only":{},"next/headers":{cookies:async()=>({getAll:()=>[],set(){}})},
    "@supabase/ssr":{createServerClient:()=>({auth:{getUser:async()=>{requests++;return {data:{user},error:null};}}})},
    "@/lib/supabase/config":{getSupabasePublicConfig:()=>({url:"https://example.invalid",anonKey:"synthetic"})}
  });
  assert.equal((await server.getServerAuthState()).isVerified,false);
  user={...user,email_confirmed_at:"2026-11-10T00:00:00Z"};assert.equal((await server.getServerAuthState()).isVerified,true);
  user=null;assert.equal((await server.getServerAuthState()).isAuthenticated,false);assert.equal(requests,3);
  console.log("PASS actual server verification uses fresh getUser confirmation, never editable metadata or a client owner");
}
