import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { randomUUID } from "node:crypto";
import * as nodeCrypto from "node:crypto";
import ts from "typescript";
const REPO="src/lib/rcap/documents/source-repository.ts";
let auth={isAuthenticated:true,isVerified:true,userId:"ownerA"},mode="supabase",blocked=new Set(),effects=[];
const rows=new Map(),jobs=new Map(),inputs=new Map(),briefcases=new Map(),events=[];
const tables=new Map();const CASE="11111111-1111-4111-8111-111111111111",SESSION="22222222-2222-4222-8222-222222222222";
let bindingRows=[],consentVersions=[],uiPayload=null;
function seed(id,user,partner="partnerA") { rows.set(id,{id,user_id:user,partner_slug:partner,state:"MS",document_type:"mississippi_non_conviction_petition",pathway:"non_conviction",status:"ready_for_review",relief_outcome:"not_recorded",person_id:`person-${user}`,briefcase_id:`brief-${user}`,created_at:"2026-11-10T00:00:00Z",participant_erased_at:null,participant_access_ended_at:null,generated_plain_text:`PUBLIC_SYNTHETIC_${user}`,filing_instructions:[],county_court_instructions:[],missing_fields:[],safety_disclaimer:"PUBLIC synthetic, not a filing"}); }
seed("packetA","ownerA");seed("packetB","ownerB","partnerB");
const snapshot=()=>JSON.stringify({rows:[...rows],inputs:[...inputs],briefcases:[...briefcases],events});
const db={rpc:async(name,args)=>{
 if(name==="participant_account_is_blocked")return {data:blocked.has(args.p_user_id),error:null};
 if(name==="clinic_start_assisted_session_for_entry"){consentVersions.push(args.p_consent_version);return {data:SESSION,error:null};}
 if(name==="persist_source_document_packet"){effects.push({kind:"write",table:"atomic_rpc",args});const old=rows.get(args.p_packet.id);if(old?.participant_erased_at||old?.participant_access_ended_at)return {data:false,error:null};rows.set(args.p_packet.id,{...old,...args.p_packet});return {data:true,error:null};}
 throw new Error(`unexpected RPC ${name}`);
},from(table){
 const filters=[],q={operation:"read",value:null};
 for(const method of ["select","order","limit"])q[method]=()=>q;
 q.in=(key,values)=>{filters.push(row=>values.includes(row[key]));return q;};q.contains=(key,values)=>{filters.push(row=>Array.isArray(values)?values.every(v=>row[key]?.includes(v)):Object.entries(values).every(([k,v])=>row[key]?.[k]===v));return q;};
 q.eq=(key,value)=>{filters.push(row=>row[key]===value);return q;};q.is=(key,value)=>{filters.push(row=>(row[key]??null)===value);return q;};q.gt=(key,value)=>{filters.push(row=>row[key]>value);return q;};
 for(const method of ["update","insert","upsert"])q[method]=value=>{q.operation=method;q.value=value;return q;};
 q.execute=(single=false)=>{
  const source=table==="rcap_document_packets"?rows:table==="packet_render_jobs"?jobs:table==="rcap_record_events"?new Map(bindingRows.map((x,i)=>[i,x])):new Map((tables.get(table)??[]).map((x,i)=>[i,x]));
  const found=[...source.values()].filter(row=>filters.every(f=>f(row)));
  if(q.operation==="read") {effects.push({kind:"read",table,materialized:found.length});return {data:single?(found[0]??null):found,error:null};}
  effects.push({kind:"write",table});
  if(table==="rcap_document_packets") {
   if(q.operation==="update"){if(!found.length)return {data:null,error:null};source.set(found[0].id,{...found[0],...q.value});return {data:{id:found[0].id},error:null};}
   if(source.has(q.value.id))return {data:null,error:{message:"duplicate"}};source.set(q.value.id,{...q.value,participant_erased_at:null,participant_access_ended_at:null});return {data:{id:q.value.id},error:null};
  }
  if(table==="rcap_document_packet_inputs")inputs.set(q.value.document_packet_id,q.value);
  if(table==="rcap_briefcase_items")briefcases.set(q.value.document_packet_id,q.value);
  if(table==="rcap_record_events")events.push(q.value);
  return {data:q.value,error:null};
 };
 q.maybeSingle=async()=>q.execute(true);q.single=q.maybeSingle;q.then=(resolve,reject)=>Promise.resolve(q.execute()).then(resolve,reject);return q;
}};
const modules=new Map();
function load(p){
 if(modules.has(p))return modules.get(p);const exports={};modules.set(p,exports);
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(p,"utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{
  exports,crypto:{randomUUID},console,Date,Buffer,URL,Response,process:{env:{NODE_ENV:"test",SUPABASE_SERVICE_ROLE_KEY:"PUBLIC_SYNTHETIC_NOT_A_REAL_KEY"}},
  window:{location:{replace(){}}},FormData:class{constructor(data){this.data=data;}get(k){return this.data[k]??null;}},fetch:async(url,options)=>{uiPayload=JSON.parse(options.body);return {ok:true,json:async()=>({screeningUrl:"/PUBLIC_SYNTHETIC"})};},
  require(name){
   if(name==="server-only")return {};
   if(name==="node:crypto")return nodeCrypto;
   if(name==="react")return {useRef:value=>({current:value}),useState:value=>[value,()=>{}]};
   if(name==="next/link"||name==="lucide-react"||name==="@/components/ui/Badge"||name==="@/components/ui/Card")return {};
   if(name.startsWith("./")&&name.endsWith("InformationForm"))return {};
   if(name==="@/lib/security/rcap-captcha")return {verifyRcapCaptchaToken:async()=>({ok:true})};
   if(name==="@/lib/rcap-intake/repository")throw new Error("UNQUALIFIED_INTAKE_READ");
   if(name==="@/lib/expungement-ai/briefcase")return {getBriefcaseItem:async(user,id)=>{effects.push({kind:"owned-matter-read",user,id});return (tables.get("consumer_briefcase_items")??[]).find(x=>x.user_id===user&&x.id===id)??null;},partnerSlugForPacketItem:async()=>"partnerA"};
   if(name==="react/jsx-runtime")return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
   if(name==="@/components/expungement-ai/SponsorCapacityNotice")return {};
   if(name==="@/components/expungement-ai/LocalizationProvider")return {useLocalization:()=>({locale:"en",text:x=>x})};
   if(name==="@/lib/partners/onboarding/program-defaults")return {PROGRAM_JURISDICTIONS:{MS:"Mississippi"}};
   if(name==="@/app/api/clinic/error-response")return {clinicErrorResponse:()=>({status:400})};
   if(name==="@/lib/partners/onboarding/program-packet-funding")return {getProgramPacketFunding:async()=>"consumer"};
   if(name==="@/lib/partners/onboarding/practice-receipt")return {canUseClinicPractice:async()=>false};
   if(name==="@/lib/expungement-ai/screening-session-persistence")return {};
   if(name==="@/lib/expungement-ai/screening-resume-service")return {};
   if(name==="@/lib/expungement-ai/claim/clinic-acquisition")return {};
   if(name==="@/lib/expungement-ai/rcap-partner-intake")return {claimRcapPartnerScreeningSession:async()=>({ok:true,sessionId:"screeningA"})};
   if(name==="@/lib/supabase/auth-server")return {getServerAuthState:async()=>auth};
   if(name==="@/lib/clinic-mode/participant-service")return {getClinicEntryContext:async()=>({eventId:"eventA",partnerSlug:"partnerA",eventSlug:"event-a",jurisdiction:"MS",entryRedemptionHash:"PUBLIC_HASH"}),listApprovedClinicStaff:async()=>[{id:"33333333-3333-4333-8333-333333333333"}]};
   if(name==="@/lib/clinic-mode/reset-recovery")return {RECOVERY_COOKIE:"PUBLIC_RECOVERY",COMPLETED_COOKIE:"PUBLIC_COMPLETED",hash:x=>x,mintRecovery:()=>({}),encodeRecovery:()=>"PUBLIC_SYNTHETIC",recoveryOptions:()=>({})};
   if(name==="next/server")return {NextResponse:{json:(body,options={})=>({body,status:options.status??200,headers:options.headers??{},cookies:{set(){}}})}};
   if(name==="@/lib/rcap/briefcase/auth")return {getRcapBriefcaseAuthState:async()=>auth};
   if(name==="@/lib/supabase/server")return {getSupabaseAdminClient:()=>db,isSupabaseConfigured:()=>true};
   if(name==="@/lib/partners/partner-repository")return {getPartnerRepositoryMode:async()=>mode,getPartnerRecordBySlug:async()=>({partnerSlug:"partnerA",targetState:"MS",partnerId:"partnerA"})};
   if(name==="@/lib/rcap/person-identity")return {resolveRcapPersonId:async()=>({}),deriveRcapPersonMatchKey:()=>null,getRcapPersonOutcomeSummary:async()=>({})};
   if(name==="@/lib/rcap/documents/filing-next-steps")return {buildFilingNextStepsPacket:()=>({afterFiling:[],courtContactOrLocationGuidance:[],safetyDisclaimer:"PUBLIC synthetic"})};
   if(name==="@/lib/rcap/documents/packet-document-renderer")return {renderRcapPacketPdf:async(packet)=>{effects.push({kind:"render",packet:packet.id});return Buffer.from("%PDF-PUBLIC_SYNTHETIC");},rcapPacketPdfFilename:()=>"synthetic.pdf"};
   if(name==="@/lib/rcap/documents/packet-route-resolver")return {resolvePacketRoute:()=>({routeKind:"PUBLIC_SYNTHETIC"}),packetRouteCanRender:()=>true};
   if(name==="@/lib/expungement-ai/packet-generation")return {attachMississippiLegacyPacketArtifact:async()=>{effects.push({kind:"attach"});},requireMississippiLegacyPacketBinding:async()=>({})};
   assert(name.startsWith("@/"),`unexpected import ${name}`);return load(`src/${name.slice(2)}.ts`);
  }
 });return exports;
}
const repo=load(REPO);
const routes=[
 ["src/app/api/rcap/documents/[packetId]/route.ts","GET"],
 ["src/app/api/rcap/documents/[packetId]/pdf/[pdfType]/route.ts","GET"],
 ["src/app/api/rcap/documents/[packetId]/save/route.ts","POST"],
 ["src/app/api/rcap/documents/[packetId]/generate/route.ts","POST"]
].map(([path,method])=>({handler:load(path)[method],method,path}));
const request=()=>new Request("https://example.invalid/api/rcap/documents/PUBLIC_SYNTHETIC",{method:"POST",headers:{"content-type":"application/json",origin:"https://example.invalid",host:"example.invalid","x-forwarded-proto":"https"},body:JSON.stringify({charge:"PUBLIC updated synthetic charge",state:"DC"})});
const call=route=>route.handler(request(),{params:Promise.resolve({packetId:"packetA",pdfType:"full"})});
const scope=async()=>{const resolved=await repo.resolveSourceDocumentAccess();assert.equal(resolved.ok,true);return resolved.access;};

const FUTURE=fs.readFileSync(REPO,"utf8").includes('persist_source_document_packet');
const helper=load("src/lib/rcap/documents/source-document-access.ts");
const realScope=async(context)=>{const result=await helper.resolveSourceDocumentAccess(context);assert.equal(result.ok,true,JSON.stringify(result));return result.access;};
function consentFixture(){
 tables.set("partner_users",[{id:"staff-member",auth_user_id:"staffA",partner_slug:"partnerA",role:"partner_staff",status:"active"},{id:"staff-other",auth_user_id:"staffB",partner_slug:"partnerB",role:"partner_admin",status:"active"}]);
 tables.set("clinic_cases",[{id:CASE,event_id:"eventA",participant_user_id:"ownerA",assisted_session_id:SESSION,screening_session_id:"screeningA",matter_id:"matterA"}]);
 tables.set("clinic_assisted_sessions",[{id:SESSION,event_id:"eventA",event_staff_id:"33333333-3333-4333-8333-333333333333",participant_user_id:"ownerA",screening_session_id:"screeningA",consent_version:"clinic-assistance-documents-v2",consented_at:"2026-11-10T00:00:00Z",status:"active",expires_at:"2999-01-01T00:00:00Z",ended_at:null}]);
 tables.set("clinic_event_staff",[{id:"33333333-3333-4333-8333-333333333333",event_id:"eventA",partner_user_id:"staff-member",status:"approved",revoked_at:null,permissions:["assist"]}]);
 tables.set("clinic_events",[{id:"eventA",partner_slug:"partnerA",status:"published"}]);
 tables.set("consumer_briefcase_items",[{id:"matterA",user_id:"ownerA",source_session_id:"screeningA"},{id:"matterA-other",user_id:"ownerA",source_session_id:"screening-other"}]);
 tables.set("rcap_people",[{id:"person-ownerA",partner_slug:"partnerA"},{id:"person-ownerB",partner_slug:"partnerB"}]);
 bindingRows=[{record_type:"document_packet",record_id:"packetA",event_type:"created",partner_slug:"partnerA",metadata:{source:"rcap_document_packet_repository",consumer_auth_user_id:"ownerA",consumer_briefcase_item_id:"matterA"}}];
}
consentFixture();
if(process.argv.includes("--grant-fault-only")){
 auth={isAuthenticated:true,isVerified:true,userId:"staffA"};tables.get("clinic_assisted_sessions")[0].consent_version="clinic-assistance-v1";
 const result=await helper.resolveSourceDocumentAccess({clinicCaseId:CASE});assert.equal(result.ok,false,"DOCUMENT-CONSENT-VERSION: old assistance is not document consent");process.exit(0);
}
if(process.argv.includes("--public-create-only")){
 consentFixture();auth={isAuthenticated:true,isVerified:true,userId:"ownerA"};const create=load("src/app/api/rcap/documents/mississippi/create/route.ts").POST;
 const req=target=>new Request("https://example.invalid/api/rcap/documents/mississippi/create",{method:"POST",headers:{"content-type":"application/json",origin:"https://example.invalid",host:"example.invalid","x-forwarded-proto":"https"},body:JSON.stringify({partnerSlug:"partnerA",consumerBriefcaseItemId:target})});
 const before=snapshot();assert.equal((await create(req("foreign-owner-matter"))).status,403);assert.equal(snapshot(),before);
 const result=await create(req("matterA"));assert.equal(result.status,200);assert.equal(result.body.packet.userId,"ownerA");const event=events.at(-1);assert.equal(event.metadata.consumer_auth_user_id,"ownerA");assert.equal(event.metadata.consumer_briefcase_item_id,"matterA");assert.equal(event.partner_slug,"partnerA");
 auth={isAuthenticated:false};effects=[];assert.equal((await create(req("matterA"))).status,401);assert.equal(effects.length,0);
 console.log("PASS actual public create API derives owner and records immutable owned-matter/partner binding; foreign target and anonymous refuse before writes");process.exit(0);
}
if(process.argv.includes("--form-entry-only")){
 consentFixture();const page=load("src/app/documents/[partnerSlug]/form/page.tsx").default;
 const run=search=>page({params:Promise.resolve({partnerSlug:"partnerA"}),searchParams:Promise.resolve(search)});
 for(const actor of [{isAuthenticated:false},{isAuthenticated:true,isVerified:true,userId:"ownerB"}]){auth=actor;effects=[];const denied=await run({briefcaseItemId:"matterA"});assert.notEqual(denied.type,"main");assert(!effects.some(x=>["write","render","attach"].includes(x.kind)));}
 auth={isAuthenticated:true,isVerified:true,userId:"ownerA"};effects=[];await run({session:"unowned-intake"});assert.equal(effects.length,0,"legacy locator refuses before intake or matter lookup");
 const result=await run({briefcaseItemId:"matterA"});assert.equal(result.type,"main","actual owned participant form remains reachable");assert(effects.some(x=>x.kind==="owned-matter-read"&&x.user==="ownerA"&&x.id==="matterA"));
 console.log("PASS actual form entry: unqualified intake is never loaded; anonymous/wrong-owner refuse and existing owned Briefcase branch remains available");process.exit(0);
}
// These are actual production helper/repository/handler calls; only Auth/DB/render edges are synthetic ports.
auth={isAuthenticated:true,isVerified:true,userId:"ownerA"};let access=await realScope();assert(await repo.getRcapDocumentPacket("packetA",access));
auth={isAuthenticated:true,isVerified:true,userId:"ownerB"};effects=[];assert.equal(await repo.getRcapDocumentPacket("packetA",await realScope()),null);assert(!effects.some(x=>x.table==="rcap_document_packets"&&x.materialized));
auth={isAuthenticated:false};assert.equal((await helper.resolveSourceDocumentAccess()).ok,false);
console.log("PASS fresh owner positive and other owner/anonymous refusal on actual repository");
auth={isAuthenticated:true,isVerified:true,userId:"staffA"};access=await realScope({clinicCaseId:CASE});assert.equal(access.userId,"ownerA");assert(await repo.getRcapDocumentPacket("packetA",access));
for(const route of routes){effects=[];const req=new Request(`https://example.invalid/api/rcap/documents/packetA?clinicCaseId=${CASE}`,{method:"POST",headers:{"content-type":"application/json",origin:"https://example.invalid",host:"example.invalid","x-forwarded-proto":"https"},body:"{}"});assert.equal((await route.handler(req,{params:Promise.resolve({packetId:"packetA",pdfType:"full"})})).status,200,route.path);}
console.log("PASS optional v2 exact staff/case/event/tenant/session/matter scope reaches all four actual handlers including scoped save/generate");
for(const [table,key,value] of [["clinic_assisted_sessions","consent_version","clinic-assistance-v1"],["clinic_assisted_sessions","expires_at","2000-01-01T00:00:00Z"],["clinic_assisted_sessions","status","ended"],["clinic_assisted_sessions","ended_at","2026-11-10T00:00:00Z"],["clinic_event_staff","revoked_at","2026-11-10T00:00:00Z"],["clinic_event_staff","permissions",[]],["clinic_events","partner_slug","partnerB"],["clinic_cases","matter_id","matterA-other"],["clinic_cases","screening_session_id","foreign"]]){
 consentFixture();tables.get(table)[0][key]=value;effects=[];const before=snapshot();const denied=await helper.resolveSourceDocumentAccess({clinicCaseId:CASE});assert.equal(denied.ok,false,`${table}.${key}`);assert.equal(snapshot(),before);assert(!effects.some(x=>["write","render","attach"].includes(x.kind)));assert(!effects.some(x=>x.table==="rcap_document_packets"));
}
consentFixture();auth={isAuthenticated:true,isVerified:true,userId:"staffB"};assert.equal((await helper.resolveSourceDocumentAccess({clinicCaseId:CASE})).ok,false);
auth={isAuthenticated:true,isVerified:true,userId:"staffA"};access=await realScope({clinicCaseId:CASE});tables.get("clinic_assisted_sessions")[0].status="ended";effects=[];assert.equal(await repo.getRcapDocumentPacket("packetA",access),null);assert(!effects.some(x=>x.table==="rcap_document_packets"));
console.log("PASS no-consent, old-version, expiry, withdrawal, wrong staff/tenant, revoked permissions, matter/screening mismatch and reused grant refuse before packet read or write");
consentFixture();auth={isAuthenticated:true,isVerified:true,userId:"staffA"};access=await realScope({clinicCaseId:CASE});bindingRows[0].metadata.consumer_briefcase_item_id="matterA-other";effects=[];assert.equal(await repo.getRcapDocumentPacket("packetA",access),null);assert(!effects.some(x=>x.table==="rcap_document_packets"));
consentFixture();blocked.add("ownerA");assert.equal((await helper.resolveSourceDocumentAccess({clinicCaseId:CASE})).ok,false);blocked.clear();
for(const field of ["participant_erased_at","participant_access_ended_at"]){rows.get("packetA")[field]="2026-11-10T00:00:00Z";effects=[];assert.equal(await repo.getRcapDocumentPacket("packetA",await realScope({clinicCaseId:CASE})),null);assert(!effects.some(x=>x.table==="rcap_document_packets"&&x.materialized));rows.get("packetA")[field]=null;}
console.log("PASS immutable created-event exact-matter join, participant tombstone and both source erasure states deny protected body access");
consentFixture();auth={isAuthenticated:true,isVerified:true,userId:"ownerA"};const before=snapshot();assert.equal((await repo.createMississippiDocumentPacket({partnerSlug:"partnerA",userId:"ownerB"})).ok,false);assert.equal(snapshot(),before);
const created=await repo.createMississippiDocumentPacket({partnerSlug:"partnerA"});assert.equal(created.ok,true,JSON.stringify(created));assert.equal(created.packet.userId,"ownerA");assert.equal(rows.get(created.packet.id).user_id,"ownerA");
auth={isAuthenticated:false};assert.equal((await repo.createMississippiDocumentPacket({partnerSlug:"partnerA"})).ok,false);
console.log("PASS actual creator derives durable owner from server session; body owner/anonymous cannot create an ownerless/foreign row");
consentFixture();const claim={id:"JOB",packetId:"packetA",routeId:"ROUTE",inputHash:"HASH",fencingToken:"FENCE"};jobs.set(claim.id,{id:claim.id,packet_id:claim.packetId,route_id:claim.routeId,input_hash:claim.inputHash,fencing_token:claim.fencingToken,status:"rendering",claim_expires_at:"2999-01-01T00:00:00Z",consumer_auth_user_id:null,consumer_briefcase_item_id:null,sponsored_consumer_auth_user_id:"ownerA",sponsored_consumer_briefcase_item_id:"matterA"});
assert(await repo.getRcapDocumentPacketForRenderClaim(claim));
for(const [key,value] of [["sponsored_consumer_auth_user_id",null],["sponsored_consumer_briefcase_item_id","matterA-other"],["consumer_auth_user_id","ownerB"],["fencing_token","stale"]]){const prior={...jobs.get(claim.id)};jobs.get(claim.id)[key]=value;assert.equal(await repo.getRcapDocumentPacketForRenderClaim(claim),null,key);jobs.set(claim.id,prior);}
console.log("PASS actual fenced worker supports null generic consumer with qualified sponsored owner/matter; unbound/conflicting/stale/cross-matter jobs refuse");
if(FUTURE){
 auth={isAuthenticated:true,isVerified:true,userId:"ownerA"};const route=routes.find(x=>x.path.endsWith("/generate/route.ts"));
 async function attached(target){const req=request();const r2=new Request(req.url,{method:"POST",headers:req.headers,body:JSON.stringify({consumerBriefcaseItemId:target})});return route.handler(r2,{params:Promise.resolve({packetId:"packetA"})});}
 effects=[];const before=snapshot();assert.equal((await attached("matterA-other")).status,409);assert.equal(snapshot(),before);assert(!effects.some(x=>["write","attach","render"].includes(x.kind)));
 assert.equal((await attached("matterA")).status,200);assert(effects.some(x=>x.kind==="attach"));
 console.log("PASS actual future generation binds stored exact matter before mutation and preserves current protected attachment boundary");
}
if(FUTURE){
 consentFixture();auth={isAuthenticated:true,isVerified:true,userId:"ownerA"};
 const component=load("src/components/clinic-mode/ClinicAssistanceClient.tsx").ClinicAssistanceClient;
 for(const chosen of [false,true]){
  const form=component({event:{publicSlug:"event-a",jurisdiction:"MS"},staff:[{id:"33333333-3333-4333-8333-333333333333",label:"Selected Staff"}]});
  await form.props.onSubmit({preventDefault(){},currentTarget:{eventStaffId:"33333333-3333-4333-8333-333333333333",consent:"yes",documentConsent:chosen?"yes":null}});
  assert.equal(uiPayload.documentConsent,chosen,"actual optional checkbox reaches the POST body without a default grant");
  const req=request();const r2=new Request("https://example.invalid/api/clinic/assistance/start",{method:"POST",headers:req.headers,body:JSON.stringify(uiPayload)});r2.cookies={get:()=>undefined};
  const response=await load("src/app/api/clinic/assistance/start/route.ts").POST(r2);assert.equal(response.status,200,JSON.stringify(response));
  assert.equal(consentVersions.at(-1),chosen?"clinic-assistance-documents-v2":"clinic-assistance-v1");
 }
 console.log("PASS actual optional consent form->actual start POST records v2 only on new explicit choice; old assistance remains v1");
}
console.log("LIMIT synthetic Auth/DB/RPC/render ports, no actual SQL/RLS/Auth/partner consent records or provider/case claims");
