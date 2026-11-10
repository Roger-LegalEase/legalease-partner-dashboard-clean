import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {randomUUID} from 'node:crypto';import ts from 'typescript';
const role=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const ids=JSON.parse(fs.readFileSync(process.argv[3],'utf8')).ids;
const pg=['-X','-At','-v','ON_ERROR_STOP=1','-h',role.socket,'-p',String(role.port),'-U','postgres','-d',role.database];
assert.equal(role.database,'p1_legacy_atomic_20261110');assert(role.socket.startsWith('/tmp/p1-legacy-atomic-'));
const quote=v=>"'"+String(v).replaceAll("'","''")+"'";const ident=v=>{v=v.trim();assert(/^[a-z_]+$/.test(v));return '"'+v+'"';};
const sql=s=>execFileSync('/usr/lib/postgresql/16/bin/psql',[...pg,'-c',s],{encoding:'utf8',maxBuffer:2*1024*1024}).trim();
const call=(name,args)=>{const pairs=Object.entries(args).map(([k,v])=>ident(k)+'=>'+(v===null?'null':typeof v==='object'?quote(JSON.stringify(v))+'::jsonb':quote(v)));const out=sql('set role service_role;select coalesce(to_jsonb(public.'+ident(name)+'('+pairs.join(',')+')),'+quote('null')+'::jsonb);');return JSON.parse(out.split('\n').at(-1));};
let auth={isAuthenticated:true,isVerified:true,userId:ids.ownerA},beforeRead=null,beforeWrite=null,renderHook=null,renderCalls=0,privateReads=0;
const db={rpc:async(name,args)=>{try{if(name==='read_authorized_source_document_packet'){privateReads++;if(beforeRead){const hook=beforeRead;beforeRead=null;hook();}}if(name==='persist_authorized_source_document_packet'&&beforeWrite){const hook=beforeWrite;beforeWrite=null;hook();}return {data:call(name,args),error:null};}catch(error){return {data:null,error:{message:String(error)}};}},from(table){
 let columns='*',where=[],limit='';const query={select:value=>{columns=value;return query;},eq:(k,v)=>{where.push(ident(k)+'='+quote(v));return query;},is:(k,v)=>{assert.equal(v,null);where.push(ident(k)+' is null');return query;},gt:(k,v)=>{where.push(ident(k)+'>'+quote(v));return query;},in:(k,v)=>{where.push(ident(k)+' in ('+v.map(quote).join(',')+')');return query;},contains:(k,v)=>{where.push(ident(k)+' @> array['+v.map(quote).join(',')+']::text[]');return query;},limit:n=>{assert(Number.isInteger(n));limit=' limit '+n;return query;}};
 const run=()=>{const cols=columns==='*'?'*':columns.split(',').map(ident).join(',');return JSON.parse(sql('set role service_role;select coalesce(jsonb_agg(to_jsonb(t)),\'[]\'::jsonb) from (select '+cols+' from public.'+ident(table)+(where.length?' where '+where.join(' and '):'')+limit+') t;').split('\n').at(-1));};query.maybeSingle=async()=>({data:run()[0]??null,error:null});query.then=(resolve,reject)=>Promise.resolve().then(()=>({data:run(),error:null})).then(resolve,reject);return query;
}};
const modules=new Map();function load(path){if(modules.has(path))return modules.get(path);const exports={};modules.set(path,exports);vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports,console,Date,Buffer,URL,Response,Headers,crypto:{randomUUID},process:{env:{NODE_ENV:'test'}},require(name){
 if(name==='server-only')return {};
 if(name==='next/server')return {NextResponse:{json:(body,opts={})=>({body,status:opts.status??200})}};
 if(name==='@/lib/supabase/server')return {getSupabaseAdminClient:()=>db,isSupabaseConfigured:()=>true};
 if(name==='@/lib/rcap/briefcase/auth')return {getRcapBriefcaseAuthState:async()=>auth};
 if(name==='@/lib/partners/partner-repository')return {getPartnerRepositoryMode:async()=>'supabase'};
 if(name==='@/lib/rcap/person-identity')return {deriveRcapPersonMatchKey:()=>null};
 if(name==='@/lib/rcap/documents/packet-document-renderer')return {renderRcapPacketPdf:async()=>{renderCalls++;if(renderHook)renderHook();return Buffer.from('%PDF-PUBLIC_SYNTHETIC');},rcapPacketPdfFilename:()=> 'PUBLIC.pdf'};
 if(name==='@/lib/rcap/documents/packet-route-resolver')return {resolvePacketRoute:()=>({}),packetRouteCanRender:()=>true};
 assert(name.startsWith('@/'),name);return load('src/'+name.slice(2)+'.ts');
}});return exports;}
const repo=load('src/lib/rcap/documents/source-repository.ts');const helper=load('src/lib/rcap/documents/source-document-access.ts');
const scope=async caseId=>{const result=await helper.resolveSourceDocumentAccess({clinicCaseId:caseId});assert.equal(result.ok,true,JSON.stringify(result));return result.access;};
const freeze=()=>sql('select public.freeze_participant_account('+quote(ids.ownerA)+',\'PUBLIC_SYNTHETIC\',null);');
const resetBarrier=()=>sql('delete from public.participant_account_tombstones;update public.clinic_assisted_sessions set status=\'active\',ended_at=null;');
if (!process.argv.includes('--worker-only') && !process.argv.includes('--create-only')) {
let owner=await scope();if(!process.argv.includes('--after-owner-read')){assert((await repo.getRcapDocumentPacket(ids.packetA,owner))?.userId===ids.ownerA);console.log('PASS actual Source owner lookup through actual isolated authorized SQL reader');
beforeRead=freeze;assert.equal(await repo.getRcapDocumentPacket(ids.packetA,owner),null);assert(privateReads>0);resetBarrier();console.log('PASS actual Source final DB reader refuses freeze committed after its last JS precheck');}
owner=await scope();beforeWrite=freeze;const denied=await repo.saveMississippiDocumentPacketInputs(ids.packetA,{charge:'PUBLIC_DENIED'},owner);assert.equal(denied.ok,false);resetBarrier();console.log('PASS actual Source final atomic SQL writer refuses freeze after JS precheck');
auth={isAuthenticated:true,isVerified:true,userId:ids.staffA};let staff=await scope(ids.caseA);assert((await repo.getRcapDocumentPacket(ids.packetA,staff))?.userId===ids.ownerA);
beforeRead=()=>sql('update public.clinic_assisted_sessions set status=\'ended\',ended_at=now();');assert.equal(await repo.getRcapDocumentPacket(ids.packetA,staff),null);resetBarrier();console.log('PASS actual Source consented staff positive and withdrawal after JS precheck refuses at DB');
auth={isAuthenticated:true,isVerified:true,userId:ids.ownerA};renderHook=freeze;const pdf=load('src/app/api/rcap/documents/[packetId]/pdf/[pdfType]/route.ts');const response=await pdf.GET(new Request('https://example.invalid/PUBLIC'),{params:Promise.resolve({packetId:ids.packetA,pdfType:'full'})});assert.equal(renderCalls,1);assert.equal(response.status,409);resetBarrier();console.log('PASS actual PDF handler with synthetic renderer refuses a freeze during rendering before serving bytes');
auth={isAuthenticated:false};assert.equal(await repo.getRcapDocumentPacket(ids.packetA,owner),null);console.log('PASS logged-out actual server scope refuses before database body access');
console.log('LIMIT real isolated PG16 + actual Source functions; Auth/renderer ports synthetic, not live browser/provider/PG17 acceptance');

}

if (process.argv.includes('--worker-only')) {
 const file='scripts/rcap-render-worker.mjs',source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);let selected;
 function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='renderClaimPacket')selected=n;else if(ts.isMethodDeclaration(n)&&n.name?.getText(ast)==='render')selected=n;ts.forEachChild(n,visit);}visit(ast);assert(selected);
 let body=selected.body.getText(ast);const dynamic='const { getRcapDocumentPacketForRenderClaim } = await import("../src/lib/rcap/documents/source-repository.ts");';body=body.replace(dynamic,'');
 const render=vm.runInNewContext('(async function(claim) '+body+')',{getRcapDocumentPacketForRenderClaim:repo.getRcapDocumentPacketForRenderClaim,renderRcapPacketPdf:async()=>{renderCalls++;if(renderHook)renderHook();return Buffer.from('PUBLIC_SYNTHETIC_WORKER_BYTES');},isPersonalizedDeliveryRoute:()=>false,renderPersonalizedClaim:()=>{throw Error('not this boundary');},Error});
 const claim={id:ids.jobA,packetId:ids.packetA,routeId:'PUBLIC_ROUTE',inputHash:'PUBLIC_HASH',fencingToken:ids.fenceA};resetBarrier();renderHook=null;
 assert.equal((await render(claim)).toString(),'PUBLIC_SYNTHETIC_WORKER_BYTES');console.log('PASS actual generic worker Source function + real sponsored-owner-null-consumer SQL positive');
 const prior=renderCalls;await assert.rejects(render({...claim,fencingToken:ids.ownerB}),/not found/);assert.equal(renderCalls,prior);console.log('PASS actual worker stale fence refuses before synthetic render');
 renderHook=freeze;await assert.rejects(render(claim),/Source access changed during render/);resetBarrier();console.log('PASS actual worker final database recheck refuses freeze during synthetic render before returning bytes');
}

if (process.argv.includes('--create-only')) {
 resetBarrier();auth={isAuthenticated:true,isVerified:true,userId:ids.ownerA};
 const input={partnerSlug:'PUBLIC_partnerA',petitionerFirstName:'PUBLIC_SYNTHETIC',petitionerLastName:'DO_NOT_FILE'};
 const created=await repo.createMississippiDocumentPacket(input,{consumerAuthUserId:ids.ownerA,consumerBriefcaseItemId:ids.matterA});assert.equal(created.ok,true,JSON.stringify(created));assert.equal(created.persisted,true);assert.equal(created.packet.userId,ids.ownerA);
 const actual=JSON.parse(sql('select to_jsonb(p) from public.rcap_document_packets p where id='+quote(created.packet.id)));assert.equal(actual.user_id,ids.ownerA);
 assert(await repo.getRcapDocumentPacket(created.packet.id,await scope()));console.log('PASS actual protected creation derives server owner then atomically stores packet/input/current immutable matter event and reloads');
 const before=sql('select count(*) from public.rcap_document_packets');assert.equal((await repo.createMississippiDocumentPacket({...input,userId:ids.ownerB})).ok,false);assert.equal((await repo.createMississippiDocumentPacket(input,{consumerAuthUserId:ids.ownerB,consumerBriefcaseItemId:ids.matterB})).ok,false);assert.equal(sql('select count(*) from public.rcap_document_packets'),before);console.log('PASS actual creator refuses forged owner and foreign matter without new packet');
 auth={isAuthenticated:true,isVerified:true,userId:ids.ownerB};assert.equal(await repo.getRcapDocumentPacket(created.packet.id,await scope()),null);console.log('PASS newly durable packet remains inaccessible to the other owner');
}
