import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {authorizePacketDownload}=await import('../src/lib/rcap/render/packet-delivery.ts');
const id='b7252f57-c042-4d3e-805e-fd783380f246';
const missing='00000000-0000-4000-8000-000000000000';
async function proof(authorize){
 const counts={ownership:0,storage:0,verification:0,events:0,eligibility:0};
 const job={id,briefcaseItemId:'owner-item',get status(){counts.eligibility++;throw Error('denial inspected eligibility');}};
 const ports={getJob:async key=>key===id?job:null,userOwnsBriefcaseItem:async(user,item)=>{counts.ownership++;assert.equal(user,'stranger');assert.equal(item,'owner-item');return false;},storage:{read:async()=>{counts.storage++;throw Error('private storage reached');}},getCurrentVerification:async()=>{counts.verification++;throw Error('verification reached');},recordEvent:async()=>{counts.events++;throw Error('delivery event reached');}};
 const response=async(jobId,userId='stranger')=>{const d=await authorize(ports,{jobId,userId});assert.equal(d.ok,false);const r=Response.json({error:d.message,code:d.code},{status:d.status});return {status:r.status,contentType:r.headers.get('content-type'),body:await r.json()};};
 const absent=await response(missing);assert.deepEqual(absent,{status:404,contentType:'application/json',body:{error:'This packet does not exist.',code:'not_found'}});
 assert.deepEqual(await response(id),absent);assert.equal(counts.ownership,1,'ownership check must execute');
 assert.deepEqual(await response('malformed'),absent);
 job.briefcaseItemId=null;assert.deepEqual(await response(id),absent);assert.equal(counts.ownership,1,'unbound job refuses immediately');
 const anon=await response(id,null);assert.equal(anon.status,401);assert.equal(anon.body.code,'unauthenticated');
 assert.deepEqual(counts,{ownership:1,storage:0,verification:0,events:0,eligibility:0});
}
test('real authorization: missing, malformed, unbound and cross-owner are indistinguishable before storage/verification/events',async()=>proof(authorizePacketDownload));
test('restoring either ownership 403/unauthorized branch makes the executable contract fail',async()=>{
 const source=fs.readFileSync('src/lib/rcap/render/packet-delivery.ts','utf8');const ast=ts.createSourceFile('delivery.ts',source,ts.ScriptTarget.Latest,true);const declaration=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='authorizePacketDownload').getText(ast);
 for(const branch of ['if (!job.briefcaseItemId) {','if (!owns) {']){
  const start=declaration.indexOf(branch),end=declaration.indexOf('\n  }',start);assert.ok(start>0);const segment=declaration.slice(start,end);const changed=segment.replace('status: 404, code: "not_found", message: "This packet does not exist."','status: 403, code: "unauthorized", message: "This packet is not available for download."');assert.notEqual(changed,segment);
  const mutant=declaration.slice(0,start)+changed+declaration.slice(end);const js=ts.transpileModule(mutant.replace('export async','async'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;const authorize=new Function(js+'\nreturn authorizePacketDownload;')();await assert.rejects(proof(authorize),{code:'ERR_ASSERTION'});
 }
});

const routeSource=fs.readFileSync('src/app/api/rcap/packets/[jobId]/download/route.ts','utf8');
async function provePrivateRouteDenials(source) {
 const ast=ts.createSourceFile('route.ts',source,ts.ScriptTarget.Latest,true);
 const functions=ast.statements.filter(ts.isFunctionDeclaration).map(node=>node.getText(ast).replace(/^export /,'')).join('\n');
 const js=ts.transpileModule(functions,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 for(const scenario of [{authenticated:false,storage:true,status:401},{authenticated:true,storage:true,status:404},{authenticated:false,storage:false,status:503}]) {
  const dependencies={
   NextResponse:{json:Response.json},
   getRcapBriefcaseAuthState:async()=>({isAuthenticated:scenario.authenticated,userId:scenario.authenticated?'stranger':null}),
   getPacketArtifactStorage:()=>scenario.storage?{}:null,
   getRenderJob:async()=>null,
   authorizePacketDownload,
   streamAuthorizedPacket:()=>{throw Error('A denied request must not stream bytes');},
   recordDeliveryEvent:()=>{throw Error('A denied request must not record delivery');}
  };
  const GET=new Function(...Object.keys(dependencies),js+'\nreturn GET;')(...Object.values(dependencies));
  const response=await GET(new Request('http://isolated.test/api/rcap/packets/'+missing+'/download'),{params:Promise.resolve({jobId:missing})});
  assert.equal(response.status,scenario.status);
  assert.equal(response.headers.get('cache-control'),'private, no-store, max-age=0','Every protected download denial must prohibit caching');
  assert.equal(response.headers.get('pragma'),'no-cache');
  assert.equal(response.headers.get('content-type'),'application/json');
  assert(!/storagePath|packet-artifacts\//.test(await response.text()));
 }
}
test('actual download handler makes unauthenticated, unavailable and missing-object denials private',()=>provePrivateRouteDenials(routeSource));
test('restoring the original missing-cache-header route fails for the cache requirement',async()=>{
 const old=routeSource.replaceAll(', headers: privateDownloadHeaders()','');
 assert.notEqual(old,routeSource);
 await assert.rejects(provePrivateRouteDenials(old),error=>error.code==='ERR_ASSERTION'&&error.message.includes('prohibit caching'));
});

// GA-43 / AT-GA-43 / CT09 / CT12: synthetic bound jobs exercise the shipped
// route/core functions. Service I/O and commercial admission are doubles;
// these checks do not assert hosted authority, real job creation or delivery.
const corePath='src/lib/rcap/render/packet-delivery.ts';
const jobRoutePath='src/app/api/rcap/packets/[jobId]/download/route.ts';
const grantRoutePath='src/app/api/expungement-ai/packet/artifacts/[itemId]/route.ts';
const legacyRoutePath='src/app/api/expungement-ai/packet/download/route.ts';
const {isDeliverable,sha256}=await import('../src/lib/rcap/render/job-contract.ts');
function functionsFromSource(file,dependencies,overrides={}) {
 const source=overrides[file]??fs.readFileSync(file,'utf8');
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
 const declarations=ast.statements.filter(ts.isFunctionDeclaration);
 const code=declarations.map(n=>n.getText(ast).replace(/^export /,'')).join('\n');
 const js=ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 return new Function(...Object.keys(dependencies),js+'\nreturn {'+declarations.map(n=>n.name.text).join(',')+'};')(...Object.values(dependencies));
}
function boundDelivery(overrides={}) {
 const bytes=Buffer.from('%PDF-1.7\nsynthetic owner packet\n%%EOF\n');
 const hash=sha256(bytes),routeId='MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal';
 const state={user:'owner',currentHash:'current',verificationMissing:false,finalized:true,admissionDenied:false,throwAt:null,
  bytes,reads:0,events:[],receipts:[],admissions:0,
  job:{id,briefcaseItemId:'owner-item',consumerBriefcaseItemId:'owner-item',consumerAuthUserId:'owner',partnerId:null,
   routeId,matterId:'matter-owner-item',status:'artifact_validated',deliveryEligibility:'eligible',accountingResult:'consumed',
   outputSha256:hash,outputStoragePath:`packet-artifacts/${id}/${hash}.pdf`,consumerVerificationHash:'current'}};
 const fail=place=>{if(state.throwAt===place)throw Error('private-internal: packet-artifacts/secret-token');};
 const current=()=>state.verificationMissing?null:{snapshot:{jurisdiction:'MS',pathwayId:routeId.split(':')[1]},hash:state.currentHash,ownerUserId:'owner',matterId:'matter-owner-item',alreadyDownloaded:false};
 const ports={getJob:async()=>{fail('job');return state.job;},userOwnsBriefcaseItem:async(user,item)=>user==='owner'&&item==='owner-item',
  getCurrentVerification:async()=>current(),sponsoredDeliveryReady:async()=>state.finalized,
  storage:{read:async()=>{state.reads++;fail('storage');return state.bytes;}},
  recordEvent:async event=>{fail('receipt');state.events.push(event.eventType);return 'synthetic-receipt';}};
 const core=functionsFromSource(corePath,{isDeliverable,sha256,
  governPacketDownloadAdmission:()=>{state.admissions++;if(state.admissionDenied)throw Error('held authority');},
  sponsoredRenderDeliveryReady:async()=>state.finalized},overrides);
 const deps={NextResponse:Response,after:p=>state.receipts.push(p),...core,
  getRcapBriefcaseAuthState:async()=>{fail('auth');return {isAuthenticated:true,userId:state.user};},
  requireConsumerBriefcaseApiSession:async()=>{fail('auth');return {ok:true,userId:state.user};},
  authorizeConsumerArtifactDownload:async()=>{fail('grant');return state.user==='owner'?{renderJobId:id,storagePath:state.job.outputStoragePath,expectedSha256:hash,fileName:'packet.pdf',grantId:'grant'}:null;},
  getPacketArtifactStorage:()=>{fail('storage-config');return ports.storage;},getRenderJob:ports.getJob,recordDeliveryEvent:ports.recordEvent,
  getBriefcaseItem:async(user,item)=>{fail('item');return user==='owner'&&item==='owner-item'?{id:item}:null;},
  requireCurrentPacketVerification:async()=>{if(state.verificationMissing)throw Error('private verification is stale');return current();},
  consumerMatterIdForItem:item=>'matter-'+item,resolveConsumerDeliveryAccess:()=>({allowed:false})};
 const jobGET=functionsFromSource(jobRoutePath,deps,overrides).GET;
 const grantGET=functionsFromSource(grantRoutePath,deps,overrides).GET;
 return {state,ports,core,bytes,
  sponsor(){state.job.partnerId='synthetic-partner';state.job.sponsoredBinding={routeKey:routeId,briefcaseItemId:'owner-item',verificationHash:'current',authUserId:'owner'};},
  async hit(kind='job'){
   const request=new Request('http://isolated.test/download?grant=synthetic');request.nextUrl=new URL(request.url);
   const response=await (kind==='job'?jobGET(request,{params:Promise.resolve({jobId:id})}):grantGET(request,{params:Promise.resolve({itemId:'owner-item'})}));
   const body=Buffer.from(await response.arrayBuffer());await Promise.all(state.receipts);return {response,body};
  }};
}
function privateResponse(response) {
 const cache=response.headers.get('cache-control')??'';
 assert.match(cache,/(^|,)\s*private\s*(,|$)/,'response must be private');
 assert.match(cache,/(^|,)\s*no-store\s*(,|$)/,'response must prohibit caching');
}
async function deliveryBoundaries(overrides={}) {
 for(const kind of ['job','grant']) {
  const h=boundDelivery(overrides);const {response,body}=await h.hit(kind);
  assert.equal(response.status,200,kind+' owner positive');privateResponse(response);assert.deepEqual(body,h.bytes);
  assert.equal(response.headers.get('content-type'),'application/pdf');assert.equal(h.state.admissions,1);
  assert.deepEqual(h.state.events,['delivery_authorized','transmission_started','transmission_completed']);
 }
 for(const kind of ['job','grant']) {
  const h=boundDelivery(overrides);h.state.user='stranger';const {response,body}=await h.hit(kind);
  assert.equal(h.state.reads,0,'known bound job must deny stranger before storage');
  assert.equal(response.status,404,'known bound job is private to its owner');privateResponse(response);
  assert(!body.toString().includes('packet-artifacts/'));assert.deepEqual(h.state.events,[]);
 }
 for(const [label,setup,code]of[
  ['stale verification',h=>{h.state.currentHash='newer';},'verification_binding_mismatch'],
  ['missing verification',h=>{h.state.verificationMissing=true;},'verification_not_current'],
  ['accounting blocked',h=>{h.state.job.deliveryEligibility='accounting_blocked';},'not_deliverable'],
  ['corrupt bytes',h=>{h.state.bytes=Buffer.from('%PDF-1.7\nchanged');},'artifact_corrupt'],
  ['sponsorship unpublished',h=>{h.sponsor();h.state.finalized=false;},'sponsorship_not_finalized']
 ]) {
  const h=boundDelivery(overrides);setup(h);const result=await h.core.authorizePacketDownload(h.ports,{jobId:id,userId:'owner'});
  assert.equal(result.ok,false,label);assert.equal(result.status,409,label);assert.equal(result.code,code,label);
  if(code==='not_deliverable')assert.equal(h.state.reads,0);
 }
 // A sponsored binding exists: a fabricated fallback in the route's catch
 // would otherwise turn a failed live-verification read into a download.
 const revoked=boundDelivery(overrides);revoked.sponsor();revoked.state.verificationMissing=true;
 const {response,body}=await revoked.hit();assert.equal(response.status,409);assert.equal(JSON.parse(body).code,'verification_not_current');privateResponse(response);
 const held=boundDelivery(overrides);held.state.admissionDenied=true;
 const denial=await held.hit();assert.equal(denial.response.status,403);assert.equal(JSON.parse(denial.body).code,'commercial_admission_denied');privateResponse(denial.response);
}
test('bound non-IL owner delivery, stranger denial, current verification, integrity and finalization',()=>deliveryBoundaries());

// Exact reviewer M4–M12 counterexamples, applied only to in-memory source.
const deliveryMutants=[
 ['M4',jobRoutePath,[['userOwnsBriefcaseItem: async (userId, briefcaseItemId) => Boolean(await getBriefcaseItem(userId, briefcaseItemId)),','userOwnsBriefcaseItem: async () => true,']]],
 ['M5',jobRoutePath,[['userOwnsBriefcaseItem: async (userId, briefcaseItemId) => Boolean(await getBriefcaseItem(userId, briefcaseItemId)),','userOwnsBriefcaseItem: async () => true,'],['getBriefcaseItem(auth.userId, itemId)','getBriefcaseItem(job.consumerAuthUserId ?? auth.userId, itemId)'],['requireCurrentPacketVerification(auth.userId, item)','requireCurrentPacketVerification(job.consumerAuthUserId ?? auth.userId, item)']]],
 ['M6',corePath,[['if (!jobVerificationHash || jobVerificationHash !== current.hash) {','if (!jobVerificationHash) {']]],
 ['M7',jobRoutePath,[[fs.readFileSync(jobRoutePath,'utf8').match(/} catch \{\s+return null;/)[0],'} catch {\n            const binding = job.sponsoredBinding;\n            return binding ? { snapshot: { jurisdiction: job.routeId.split(":")[0], pathwayId: job.routeId.split(":")[1] }, hash: binding.verificationHash, ownerUserId: auth.userId, matterId: consumerMatterIdForItem(item.id), alreadyDownloaded: false } : null;']]],
 ['M8',corePath,[['if (!isDeliverable(job)) {','if (false && !isDeliverable(job)) {']]],
 ['M9',corePath,[['if (sha256(bytes) !== job.outputSha256) {','if (false && sha256(bytes) !== job.outputSha256) {']]],
 ['M10',corePath,[['if (job.partnerId && !await (ports.sponsoredDeliveryReady ?? sponsoredRenderDeliveryReady)(job, input.userId)) {','if (false) {']]],
 ['M11',corePath,[['"cache-control": "no-store, private"','"cache-control": "private, max-age=3600"']]],
 ['M12',grantRoutePath,[['{ status: 404, headers: privateHeaders() }','{ status: 404 }']]]
];
for(const [name,file,edits]of deliveryMutants)test('reviewer '+name+' is caught by the bound-delivery assertions',async()=>{
 let source=fs.readFileSync(file,'utf8');
 for(const [from,to]of edits){assert.equal(source.split(from).length,2,name+' unique mutation target');source=source.replace(from,to);}
 await assert.rejects(deliveryBoundaries({[file]:source}),error=>error.code==='ERR_ASSERTION');
});

test('both modern download handlers sanitize exceptions before response streaming',async()=>{
 for(const kind of ['job','grant'])for(const place of ['auth','storage-config','job','item','storage','receipt',...(kind==='grant'?['grant']:[])]){
  const h=boundDelivery();h.state.throwAt=place;const {response,body}=await h.hit(kind);
  assert.equal(response.status,500,kind+' '+place);privateResponse(response);
  assert.deepEqual(JSON.parse(body),{error:'Packet downloads are not available right now.'});
  assert.equal(response.headers.get('pragma'),'no-cache');
 }
});

test('every legacy download response is private, for PDF/text and typed refusals',async()=>{
 const errorStatuses={ConsumerPacketArtifactAuthorityUnavailableError:503,ConsumerPacketNotFoundError:404,ConsumerPacketPaymentRequiredError:402,ConsumerPacketNotAllowedError:403,ConsumerPacketNotReadyError:409};
 const errors=Object.fromEntries(Object.keys(errorStatuses).map(name=>[name,class extends Error{}]));
 for(const [kind,status]of [['pdf',200],['text',200],['missing-id',400],['unexpected',500],...Object.entries(errorStatuses)]){
  const dependencies={NextResponse:Response,...errors,requireConsumerBriefcaseSession:async()=>({userId:'owner'}),getConsumerPacketDownload:async()=>{
   if(errors[kind])throw new errors[kind]();if(kind==='unexpected')throw Error('private-internal: secret');return {body:kind==='text'?'preserved legacy summary':Buffer.from('%PDF-1.7\nlegacy'),contentType:kind==='text'?'text/plain':'application/pdf',fileName:'legacy.pdf'};
  }};
  const GET=functionsFromSource(legacyRoutePath,dependencies).GET;
  const request=new Request('http://isolated.test/download'+(kind==='missing-id'?'':'?briefcaseItemId=owner-item'));request.nextUrl=new URL(request.url);
  const response=await GET(request);assert.equal(response.status,status,kind);privateResponse(response);assert.equal(response.headers.get('pragma'),'no-cache');
  if(status===500)assert.deepEqual(await response.json(),{error:'Packet downloads are not available right now.'});
  if(status===200){assert.equal(response.headers.get('content-type'),kind==='text'?'text/plain; charset=utf-8':'application/pdf');assert.equal(await response.text(),kind==='text'?'preserved legacy summary':'%PDF-1.7\nlegacy');}
 }
});
