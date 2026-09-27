import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { NextRequest, NextResponse } from 'next/server.js';
const require=createRequire(import.meta.url);
const recovery={exports:{}};new Function('require','module','exports','process',ts.transpileModule(fs.readFileSync('src/lib/clinic-mode/reset-recovery.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(require,recovery,recovery.exports,{env:{SUPABASE_SERVICE_ROLE_KEY:'disposable-key'}});
test('actual next-participant start refuses incomplete reset and retires old recovery after successful handover',async()=>{
 let starts=0;
 const source=ts.transpileModule(fs.readFileSync('src/app/api/clinic/assistance/start/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const m={exports:{}};
 new Function('require','module','exports',source)(name=>{
  if(name.endsWith('/reset-recovery'))return recovery.exports;
  if(name==='next/server')return {NextRequest,NextResponse};
  if(name.endsWith('participant-service'))return {getClinicEntryContext:async()=>({partnerSlug:'test',eventId:'event',eventSlug:'test',jurisdiction:'MS'}),listApprovedClinicStaff:async()=>[{id:'11111111-1111-4111-8111-111111111111'}]};
  if(name.endsWith('rcap-partner-intake'))return {claimRcapPartnerScreeningSession:async()=>({ok:true,sessionId:'screening'})};
  if(name.endsWith('auth-server'))return {getServerAuthState:async()=>({isAuthenticated:true,userId:'participant-b'})};
  if(name==='@/lib/supabase/server')return {getSupabaseAdminClient:()=>({rpc:async(name)=>{if(name==='clinic_entry_sponsor_capacity')return {data:true,error:null};if(name==='clinic_start_assisted_session')starts++;return {data:'22222222-2222-4222-8222-222222222222',error:null};}})};
  return require(name);
 },m,m.exports);
 const call=cookie=>m.exports.POST(new NextRequest('http://localhost/api/clinic/assistance/start',{method:'POST',headers:{cookie},body:JSON.stringify({eventSlug:'test',eventStaffId:'11111111-1111-4111-8111-111111111111',jurisdiction:'MS',consent:true})}));
 assert.equal((await call('clinic_reset_pending=1; clinic_reset_recovery=old')).status,409);assert.equal(starts,0);
 const response=await call('clinic_reset_recovery=old');assert.equal(response.status,200);assert.equal(starts,1);assert.notEqual(response.cookies.get('clinic_reset_recovery').value,'old');assert.ok(response.cookies.get('clinic_reset_recovery').expires);assert.ok(response.cookies.get('clinic_session').value);assert.ok(response.cookies.get('clinic_device').value);
});

test('actual proxy sends interrupted participant documents to recovery without retaining their URL',async()=>{
 const source=ts.transpileModule(fs.readFileSync('src/proxy.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const m={exports:{}};new Function('require','module','exports',source)(name=>name==='next/server'?{NextResponse}: {},m,m.exports);
 const response=await m.exports.proxy(new NextRequest('https://expungement.ai/briefcase/matters/private?claim=private',{headers:{cookie:'clinic_reset_pending=1',host:'expungement.ai'}}));
 assert.equal(response.status,303);assert.equal(response.headers.get('location'),'https://expungement.ai/clinic/reset');
});
