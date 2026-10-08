// Drive the actual endpoint through uncertain database and storage outcomes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, {createRequire} from 'node:module';
import ts from 'typescript';
import {PDFDocument} from 'pdf-lib';
const require=createRequire(import.meta.url),root=process.cwd(),cache=new Map();let mode,uploads,deletes,committedPath;
const id={workspace:'11111111-2222-4333-8444-555555555555',partner:'11111111-1111-4111-8111-111111111111',admin:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',request:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'};
const client={from:table=>{const q={select:()=>q,eq:()=>q,single:async()=>({data:table==='partner_onboarding_agreements'?{status:'executed',signed_receipt_id:id.request}:{id:id.workspace,partner_record_id:id.partner,aggregate_version:1,status:'setup_in_progress'},error:null}),maybeSingle:async()=>({data:null,error:null})};return q;},rpc:async(_name,input)=>{if(mode==='network-after-commit'){committedPath=input.p_object_path;throw Error('connection interrupted after commit');}if(mode==='sql-rejected')return {error:{code:'40001'}};if(mode==='unknown-response')return {error:{code:'PGRST000'}};committedPath=input.p_object_path;return {data:[{duplicate:mode==='duplicate',workspace_version:2}],error:null};}};
const mocks={
 '@/lib/partners/onboarding/auth-context':{requireInternalOnboardingContext:async slug=>({role:'internal_admin',partnerSlug:slug,authUserId:id.admin})},
 '@/lib/partners/onboarding/feature':{isRcapLaunchStudioEnabled:()=>true},
 '@/lib/partners/onboarding/service':{getInternalOnboardingSnapshot:async()=>{if(mode==='snapshot-after-commit')throw Error('reread unavailable');return {workspace:{aggregateVersion:2}};}},
 '@/lib/supabase/server':{getSupabaseAdminClient:()=>client},
 '@/lib/partners/onboarding/storage':{buildOnboardingObjectPath:x=>`partners/${x.partnerId}/onboarding/${x.workspaceId}/${x.category}/${x.objectId}.${x.extension}`,uploadPrivateOnboardingAsset:async p=>uploads.push(p),deletePrivateOnboardingAsset:async p=>deletes.push(p)}
};
function load(file){if(cache.has(file))return cache.get(file).exports;const m=new Module(file);cache.set(file,m);m.filename=file;m.paths=Module._nodeModulePaths(path.dirname(file));m.require=specifier=>{if(Object.hasOwn(mocks,specifier))return mocks[specifier];if(specifier==='server-only')return {};if(specifier.startsWith('@/'))return load(path.join(root,'src',specifier.slice(2))+'.ts');if(specifier.startsWith('./'))return load(path.resolve(path.dirname(file),specifier)+'.ts');return require(specifier);};m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);return m.exports;}
const {POST}=load(path.join(root,'src/app/api/internal/partners/onboarding/phase1/[partnerSlug]/signed-agreement/route.ts'));
const pdf=await PDFDocument.create();pdf.addPage().drawText('SYNTHETIC EXECUTED DOCUMENT');const bytes=await pdf.save();
async function invoke(kind,overrides={}){mode=kind;uploads=[];deletes=[];committedPath=null;const form=new FormData();for(const [key,value] of Object.entries({requestId:id.request,expectedWorkspaceVersion:'1',agreementType:'order_form',effectiveDate:'2026-10-01',reviewReason:'Actual synthetic executed evidence inspected',confirmed:'true',...overrides}))form.set(key,value);form.set('file',new File([bytes],'signed.pdf',{type:'application/pdf'}));const request=new Request('http://127.0.0.1:3100/agreement',{method:'POST',headers:{host:'127.0.0.1:3100',origin:'http://127.0.0.1:3100'},body:form});request.nextUrl=new URL(request.url);return POST(request,{params:Promise.resolve({partnerSlug:'fixture'})});}
for(const kind of ['network-after-commit','unknown-response','snapshot-after-commit']){const response=await invoke(kind);assert(response.status>=400);assert.equal(uploads.length,1);assert.equal(deletes.length,0,'uncertain commit must retain private evidence');}
assert.equal((await invoke('sql-rejected')).status,409);assert.deepEqual(deletes,uploads,'positively rejected unique object is cleaned up');
assert.equal((await invoke('duplicate')).status,200);assert.deepEqual(deletes,uploads,'unused object belonging only to this replay is cleaned up');
assert.equal((await invoke('success')).status,200);assert.equal(deletes.length,0);assert.equal(committedPath,uploads[0]);
assert.equal((await invoke('success',{effectiveDate:'2026-02-31'})).status,400);assert.equal(uploads.length,0);
assert.equal((await invoke('success',{confirmed:'false'})).status,400);assert.equal(uploads.length,0);
console.log('PASS 8 actual-endpoint uncertain-commit, duplicate cleanup, date and evidence-security checks');
