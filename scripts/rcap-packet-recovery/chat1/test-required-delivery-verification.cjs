// The real delivery decision/stream code, transpiled without invoking external
// services. Database/storage/authority responses below are explicitly synthetic.
// This is a boundary regression, not live authorization or KY fulfillment approval.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const ts=require('typescript');
const root=path.resolve(__dirname,'../../..');
const alternateSource=process.argv.find(x=>x.startsWith('--delivery-source='));
const deliveryPath=alternateSource?path.resolve(alternateSource.slice('--delivery-source='.length)):path.join(root,'src/lib/rcap/render/packet-delivery.ts');
const contractPath=path.join(root,'src/lib/rcap/render/job-contract.ts');
const code=fs.readFileSync(deliveryPath,'utf8'),contract=fs.readFileSync(contractPath,'utf8');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const bytes=fs.readFileSync(path.join(root,'data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/canonical.pdf'));
assert.equal(sha(bytes),'348e5677f471acea22dd6643fea1c820db8779f218b2563417682433a8884be2');
function declarations(text,names){const sf=ts.createSourceFile('contract.ts',text,ts.ScriptTarget.ES2022,true);return sf.statements.filter(s=>ts.isFunctionDeclaration(s)?names.has(s.name?.text):ts.isVariableStatement(s)&&s.declarationList.declarations.some(d=>ts.isIdentifier(d.name)&&names.has(d.name.text))).map(s=>s.getText(sf)).join('\n');}
const methods=declarations(contract,new Set(['DELIVERY_AUTHORIZED_ACCOUNTING_RESULTS','isDeliverable','sha256']));
const methodJs=ts.transpileModule(methods,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const realContract={exports:{}};vm.runInNewContext(methodJs,{exports:realContract.exports,createHash:crypto.createHash,Buffer});
assert.equal(typeof realContract.exports.isDeliverable,'function');assert.equal(typeof realContract.exports.sha256,'function');
function load(source,authority){
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const exports={};let admissionCalls=0;
 const dependencies={
  'server-only':{},
  '@/lib/rcap/render/job-contract':realContract.exports,
  '@/lib/rcap/render/commercial-admission':{governPacketDownloadAdmission:(request)=>{admissionCalls++;if(!authority.allowed)throw Error('Synthetic authority denies delivery');authority.requests.push(request);}},
  '@/lib/rcap/grade-a/packet-specification':{packetSpecificationForTrack:()=>null,specificationContentSha256:()=>null},
  '@/lib/rcap/render/consumer-delivery-control':{resolveConsumerDeliveryAccess:()=>({allowed:false})},
  '@/lib/rcap/render/personalized-packet':{currentPersonalizedVerification:async()=>{throw Error('No live database');}},
  '@/lib/expungement-ai/consumer-identity':{consumerMatterIdForItem:()=>null},
  '@/lib/rcap/render/sponsored-packet':{sponsoredRenderDeliveryReady:async()=>false},
  '@/lib/rcap/fulfillment/grade-a-registry':{getCurrentFulfillmentRecord:()=>null},
 };
 vm.runInNewContext(js,{exports,require:id=>{assert.ok(id in dependencies,'Unexpected external dependency '+id);return dependencies[id];},Buffer,Response,ReadableStream,Uint8Array,Error});
 return {...exports,admissionCalls:()=>admissionCalls};
}
const id='11111111-1111-4111-8111-111111111111';
const owner='synthetic-owner';
const baseJob={id,routeId:'KY:nonconviction-431076',briefcaseItemId:'synthetic-item',consumerBriefcaseItemId:'synthetic-item',consumerVerificationHash:'synthetic-verification-hash',matterId:'synthetic-matter',partnerId:null,status:'artifact_validated',deliveryEligibility:'eligible',accountingResult:'consumed',outputStoragePath:`synthetic/${id}/${sha(bytes)}.pdf`,outputSha256:sha(bytes)};
function fixture(options={}){
 let storageReads=0;const events=[];
 const job={...baseJob,...options.job};
 const ports={getJob:async()=>options.notFound?null:job,userOwnsBriefcaseItem:async()=>!options.wrongOwner,
 storage:{read:async()=>{storageReads++;return options.missingObject?null:options.corrupt?Buffer.concat([bytes,Buffer.from('x')]):bytes;}},
 recordEvent:async e=>{events.push(e);return null;}};
 if(options.reader){ports.getCurrentVerification=async()=>options.missingVerification?null:{snapshot:{jurisdiction:'KY',pathwayId:'nonconviction-431076'},hash:'synthetic-verification-hash',ownerUserId:options.verificationOwner||owner,matterId:'synthetic-matter',alreadyDownloaded:false};}
 return {ports,reads:()=>storageReads,events};
}
(async()=>{
 const results=[];
 async function run(name,options,expected,authorityAllowed=false){const authority={allowed:authorityAllowed,requests:[]};const service=load(code,authority);const f=fixture(options);const answer=await service.authorizePacketDownload(f.ports,{jobId:options.badJobId?'invalid':id,userId:options.anonymous?null:owner});assert.equal(answer.ok,expected===true,name);if(expected!==true)assert.equal(answer.code,expected,name);results.push({name,status:'PASS',code:answer.ok?'synthetic-authorized':answer.code,storageReads:f.reads(),admissionCalls:service.admissionCalls()});return {service,f,answer,authority};}
 const original=process.argv.includes('--before');
 if(original){const r=await run('original non-Illinois decision skips missing verification reader',{},true);assert.equal(r.service.admissionCalls(),0);console.log(JSON.stringify({status:'REPRODUCED',deliveryCoreSha256:sha(code),actualCore:true,syntheticDatabaseAndAuthority:true,completeKyPdfHash:sha(bytes),checks:results},null,2));return;}
 const missing=await run('missing current-reader port denied',{},'verification_not_current');assert.equal(missing.f.reads(),0);
 await run('anonymous denied',{anonymous:true},'unauthenticated');
 await run('invalid job id denied',{badJobId:true},'not_found');
 await run('unknown job denied',{notFound:true},'not_found');
 await run('cross-owner denied',{wrongOwner:true},'unauthorized');
 await run('not-yet-deliverable denied',{job:{status:'rendering'}},'not_deliverable');
 await run('delivered job still needs current verification',{job:{status:'delivered'}},'verification_not_current');
 await run('reader present but no current verification denied',{reader:true,missingVerification:true},'verification_not_current');
 await run('verification owner mismatch denied',{reader:true,verificationOwner:'another-synthetic-owner'},'unauthorized');
 await run('missing current object denied',{reader:true,missingObject:true},'artifact_unavailable');
 await run('changed output rejected',{reader:true,corrupt:true},'artifact_corrupt');
 const held=await run('current reader cannot bypass closed route authority',{reader:true},'commercial_admission_denied');assert.equal(held.service.admissionCalls(),1);
 await run('current verification cannot authorize stale job facts',{reader:true,job:{consumerVerificationHash:'old-snapshot'}},'verification_binding_mismatch',true);
 await run('missing job verification binding denied',{reader:true,job:{consumerVerificationHash:null}},'verification_binding_mismatch',true);
 await run('another route cannot authorize this artifact',{reader:true,job:{routeId:'KY:other-route'}},'route_binding_mismatch',true);
 await run('another matter cannot authorize this artifact',{reader:true,job:{matterId:'another-matter'}},'route_binding_mismatch',true);
 await run('sponsored current verification matches its own binding',{reader:true,job:{partnerId:'synthetic-partner',consumerBriefcaseItemId:null,sponsoredBinding:{verificationHash:'synthetic-verification-hash'}}},true,true);
 await run('sponsored stale verification denied',{reader:true,job:{partnerId:'synthetic-partner',sponsoredBinding:{verificationHash:'old-snapshot'}}},'verification_binding_mismatch',true);
 const allowed=await run('reader plus explicitly synthetic authority exercises unchanged positive path',{reader:true},true,true);assert.equal(allowed.service.admissionCalls(),1);assert.equal(sha(allowed.answer.bytes),sha(bytes));
 const response=await allowed.service.streamAuthorizedPacket(allowed.f.ports,allowed.answer,{userId:owner,chunkSize:8192});const received=Buffer.from(await response.arrayBuffer());assert.equal(sha(received),sha(bytes));assert.equal(response.headers.get('cache-control'),'no-store, private');
 assert.deepEqual(allowed.f.events.map(e=>e.eventType),['delivery_authorized','transmission_started','transmission_completed']);
 results.push({name:'actual stream delivers exact bytes under synthetic allowed authority',status:'PASS',byteLength:received.length,sha256:sha(received)});

 // Invoke each real HTTP GET handler with synthetic session/database ports.
 // This verifies that callers install the reader and do not merely rely on
 // a direct-unit-test port absent from the application route.
 const httpCases=[];
 const handlerHashes={};
 async function http(kind,options={},expectedStatus=200){
  const authority={allowed:options.authorityDenied!==true,requests:[]};
  const service=load(code,authority);const f=fixture({...options,reader:false});
  let verificationReads=0;let itemReads=0;
  const rel=kind==='rcap'?'src/app/api/rcap/packets/[jobId]/download/route.ts':'src/app/api/expungement-ai/packet/artifacts/[itemId]/route.ts';
  const text=fs.readFileSync(path.join(root,rel),'utf8');handlerHashes[rel]=sha(text);
  const module={};
  const dependencies={
   'next/server':{NextResponse:Response},
   '@/lib/rcap/briefcase/auth':{getRcapBriefcaseAuthState:async()=>({userId:options.anonymous?null:owner,isAuthenticated:!options.anonymous})},
   '@/lib/expungement-ai/privacy/api-session':{requireConsumerBriefcaseApiSession:async()=>options.anonymous?{ok:false,response:Response.json({error:'synthetic-session-denied'},{status:401})}:{ok:true,userId:owner}},
   '@/lib/expungement-ai/private-delivery':{authorizeConsumerArtifactDownload:async()=>options.invalidGrant?null:{renderJobId:id,storagePath:baseJob.outputStoragePath,expectedSha256:baseJob.outputSha256,fileName:'synthetic.pdf',grantId:'synthetic-grant'}},
   '@/lib/expungement-ai/briefcase':{getBriefcaseItem:async(user,item)=>{itemReads++;return user===owner && item==='synthetic-item' && !options.wrongOwner?{id:item}:null;}},
   '@/lib/expungement-ai/packet-information':{requireCurrentPacketVerification:async(user,item)=>{verificationReads++;assert.equal(user,owner);assert.equal(item.id,'synthetic-item');if(options.missingVerification)throw Error('synthetic stale verification');return {snapshot:{jurisdiction:'KY',pathwayId:'nonconviction-431076'},hash:'synthetic-verification-hash'};}},
   '@/lib/expungement-ai/consumer-identity':{consumerMatterIdForItem:item=>item==='synthetic-item'?'synthetic-matter':'not-current-matter'},
   '@/lib/rcap/render/consumer-delivery-control':{resolveConsumerDeliveryAccess:()=>({allowed:false})},
   '@/lib/rcap/render/artifact-storage':{getPacketArtifactStorage:()=>f.ports.storage},
   '@/lib/rcap/render/job-queue':{getRenderJob:f.ports.getJob,recordDeliveryEvent:f.ports.recordEvent},
   '@/lib/rcap/render/packet-delivery':service,
  };
  const compiled=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
  assert.equal((compiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,'HTTP source syntax');
  vm.runInNewContext(compiled.outputText,{exports:module,require:name=>{assert.ok(name in dependencies,name);return dependencies[name];},Response,Request,Buffer,Promise});
  const request=new Request('https://example.invalid/download?grant=synthetic-grant');request.nextUrl=new URL(request.url);
  const response=await module.GET(request,{params:Promise.resolve(kind==='rcap'?{jobId:id}:{itemId:'synthetic-item'})});
  assert.equal(response.status,expectedStatus,`${kind} ${JSON.stringify(options)}`);
  const body=Buffer.from(await response.arrayBuffer());
  if(expectedStatus===200){assert.equal(sha(body),sha(bytes));assert.equal(verificationReads,1);assert.equal(service.admissionCalls(),1);assert.ok(response.headers.get('cache-control').includes('no-store'));assert.deepEqual(f.events.map(e=>e.eventType),['delivery_authorized','transmission_started','transmission_completed']);}
  else {assert.notEqual(sha(body),sha(bytes));assert.ok(!f.events.some(e=>e.eventType==='transmission_completed'));}
  httpCases.push({handler:kind,case:options.name||JSON.stringify(options),status:'PASS',httpStatus:response.status,verificationReads,itemReads,admissionCalls:service.admissionCalls(),exactPacketBytesSent:expectedStatus===200});
 }
 for(const kind of ['rcap','consumer']){
  await http(kind,{name:'exact current verified artifact'});
  await http(kind,{name:'repeat remains verified',job:{status:'delivered'}});
  await http(kind,{name:'missing current verification',missingVerification:true},kind==='rcap'?409:404);
  await http(kind,{name:'wrong owner',wrongOwner:true},kind==='rcap'?403:404);
  await http(kind,{name:'anonymous session',anonymous:true},401);
  await http(kind,{name:'stale artifact fact snapshot',job:{consumerVerificationHash:'old-hash'}},kind==='rcap'?409:404);
  await http(kind,{name:'wrong current route',job:{routeId:'KY:another-route'}},kind==='rcap'?403:404);
  await http(kind,{name:'wrong current matter',job:{matterId:'another-matter'}},kind==='rcap'?403:404);
  await http(kind,{name:'closed commercial authority',authorityDenied:true},kind==='rcap'?403:404);
  await http(kind,{name:'corrupt stored artifact',corrupt:true},kind==='rcap'?409:404);
 }
 await http('consumer',{name:'invalid grant',invalidGrant:true},404);
 await http('rcap',{name:'sponsored owner current verification',job:{partnerId:'synthetic-partner',consumerBriefcaseItemId:null,sponsoredBinding:{verificationHash:'synthetic-verification-hash'}}});

 const mutationControls=[];
 const mutations=[
  {name:'reader omission guard removed',options:{},before:/  if \(!ports\.getCurrentVerification && !exactIllinoisRoute\) \{\n    return \{ ok: false, status: 409, code: "verification_not_current"[^\n]*\n  \}\n/,after:''},
  {name:'snapshot equality guard removed',options:{reader:true,job:{consumerVerificationHash:'old-hash'}},before:/    if \(!jobVerificationHash \|\| jobVerificationHash !== current\.hash\) \{\n    [\s\S]*?\n    \}\n/,after:''},
  {name:'route and matter equality guard removed',options:{reader:true,job:{routeId:'KY:other-route'}},before:/    if \(job\.routeId !== `\$\{current\.snapshot\.jurisdiction\}:\$\{current\.snapshot\.pathwayId\}`\n      \|\| job\.matterId !== current\.matterId\) \{\n[\s\S]*?\n    \}\n/,after:''},
  {name:'shared admission call skipped',options:{reader:true},before:'governPacketDownloadAdmission({',after:'((_request) => {})({'},
 ];
 for(const mutation of mutations){
  const mutated=code.replace(mutation.before,mutation.after);assert.notEqual(mutated,code,mutation.name+' anchor absent');
  const service=load(mutated,{allowed:mutation.name!=='shared admission call skipped',requests:[]});const f=fixture(mutation.options);
  const answer=await service.authorizePacketDownload(f.ports,{jobId:id,userId:owner});
  assert.equal(answer.ok,true,mutation.name+' must recreate the rejected behavior, not crash');
  mutationControls.push({name:mutation.name,caughtByRequiredDenial:true,unmodifiedPacket:true});
 }
 const report={status:'PASS',executedDeliveryAndStreamCases:results.length,httpHandlerCases:httpCases.length,httpCases,handlerHashes,mutationControls,checks:results,packetPdfModified:false,deliveryCoreSha256:sha(code),jobContractSha256:sha(contract),databasePort:'synthetic',storagePort:'in-memory exact retained KY PDF',commercialAuthorityPort:'explicit synthetic test response',liveDatabase:false,realEntitlementCreated:false,productionTouched:false,installedFamilyFulfillment:false,fullRuntimeDependencyIntegration:false};
 const output=process.argv.find(x=>x.startsWith('--out='));if(output)fs.writeFileSync(path.resolve(output.slice(6)),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
