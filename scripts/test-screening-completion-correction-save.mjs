// Regression derived from the independently authored local handler probe.
// Admission/storage are explicitly stubbed; this is not authenticated DB acceptance.
import assert from 'node:assert/strict';import os from 'node:os';import path from 'node:path';import fs from 'node:fs';import crypto from 'node:crypto';import {register,createRequire} from 'node:module';
const R=process.cwd(),K=fs.mkdtempSync(path.join(os.tmpdir(),'legalease-progress-test-'));process.chdir(R);register('file://'+R+'/scripts/lib/ts-esm-loader.mjs');const require=createRequire(R+'/package.json'),ts=require('typescript');
const file=R+'/src/app/api/expungement-ai/screening/progress/route.ts',source=fs.readFileSync(file,'utf8'),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const fake=`const RCAP_DRAFT_COOKIE='independent-fake-cookie';const authorizedRcapDraft=async()=>globalThis.__independentDraft;const sealRcapDraft=()=> 'FAKE_TEST_COOKIE_NOT_A_TOKEN';const rcapDraftCookieOptions={};`;
const replaced=source.replace(/import \{ RCAP_DRAFT_COOKIE[^\n]+rcap-screening-draft";/,fake);if(replaced===source)throw Error('stub not installed');
const compiled=ts.transpileModule(replaced,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;const fp=K+'/INDEPENDENT-PROGRESS-ISOLATED-HANDLER-v1.mjs';fs.writeFileSync(fp,compiled,{flag:'wx'});
const {PUT}=await import(fp),{NextRequest}=await import(R+'/scripts/lib/next-server-esm-bridge.mjs'),{getProfileByJurisdiction}=await import(R+'/src/lib/rcap-engine/profile-registry.ts'),{projectPublicProfile}=await import(R+'/src/lib/rcap-engine/public-profile-projection.ts'),{selectScreeningQuestionIds}=await import(R+'/src/lib/rcap-engine/screening-question-selection.ts'),{MS_NONCONVICTION_SCREENING_ANSWERS:base}=await import(R+'/scripts/lib/rcap-ms-nonconviction-fixture.mjs');
const p=getProfileByJurisdiction('MS'),pub=projectPublicProfile(p),rows=[];
const idsFor=a=>selectScreeningQuestionIds(p,pub,a);
const known={...base,financial_obligations:'Yes',sentence_completion_date:'Yes',court_requirements_completed:'not_sure'};const ids=idsFor(known),clean=Object.fromEntries(Object.entries(known).filter(([k])=>ids.includes(k)));const current=ids[0];
async function probe(name,{stored={},submitted={},question=current,version='correct',authorized=true,cas=true,origin='http://localhost',pv=p.profileVersion}={},expected){let writes=0,eq=[];const row={answers:stored,current_question_id:current,session_id:'fake-session',jurisdiction:'MS',updated_at:'2026-10-13T00:00:00.000Z'};let update;const chain={eq:(...a)=>{eq.push(a);return chain},select:()=>chain,maybeSingle:async()=>({error:null,data:cas?{answers:update.answers,current_question_id:update.current_question_id}:null})};globalThis.__independentDraft=authorized?{row,db:{from:t=>{if(t!=='screening_sessions')throw Error(t);return {update:v=>{writes++;update=v;return chain}}}}}:null;const body={sessionId:'fake-session',profileVersion:pv,answers:submitted,currentQuestionId:question,version:version==='correct'?sha(JSON.stringify([row.answers,row.current_question_id])):version};const req=new NextRequest('http://localhost/api/expungement-ai/screening/progress',{method:'PUT',headers:{origin,host:'localhost','content-type':'application/json'},body:JSON.stringify(body)});const response=await PUT(req),result=await response.json();rows.push({name,expected,status:response.status,pass:response.status===expected,writes,eq,result,submitted,stored});}
for(const id of ['financial_obligations','sentence_completion_date']){
 await probe(id+' existing uncertain corrected Yes',{stored:{...clean,[id]:'I am not sure'},submitted:{...clean,[id]:'Yes'}},200);
 await probe(id+' existing Yes retained',{stored:{...clean,[id]:'Yes'},submitted:{...clean,[id]:'Yes'}},200);
 await probe(id+' hidden new Yes denied',{stored:clean,submitted:{...clean,[id]:'Yes'}},400);
 await probe(id+' current hidden question denied',{stored:{...clean,[id]:'I am not sure'},submitted:{...clean,[id]:'Yes'},question:id},400);
 await probe(id+' stale version denied',{stored:{...clean,[id]:'I am not sure'},submitted:{...clean,[id]:'Yes'},version:'stale'},409);
 await probe(id+' concurrent storage change denied',{stored:{...clean,[id]:'I am not sure'},submitted:{...clean,[id]:'Yes'},cas:false},409);
 await probe(id+' exact retry stale version read',{stored:{...clean,[id]:'Yes'},submitted:{...clean,[id]:'Yes'},version:'stale'},200);
}
await probe('arbitrary hidden stored field denied',{stored:{...clean,legacy_unrecognized:'Yes'},submitted:{...clean,legacy_unrecognized:'Yes'}},400);
await probe('date-type identifier cannot use status exception',{stored:{...clean,filing_date:'2026-10-13'},submitted:{...clean,filing_date:'2026-10-13'}},400);
await probe('no authorization',{stored:clean,submitted:clean,authorized:false},403);
await probe('wrong origin',{stored:clean,submitted:clean,origin:'http://evil.invalid'},403);
await probe('wrong profile version',{stored:clean,submitted:clean,pv:'wrong'},409);
await probe('wrong current question',{stored:clean,submitted:clean,question:'invented'},400);
await probe('invalid scalar hidden field',{stored:{...clean,legacy_unrecognized:'Yes'},submitted:{...clean,legacy_unrecognized:999}},400);
const result={scope:'Actual current PUT handler, only admission/storage/cookie boundary replaced with fake. No DB/auth/browser acceptance. Actual serialization, public projection, selector, same-origin guard, CAS control flow executed.',sourceSha256:sha(source),sourceUnchanged:sha(fs.readFileSync(file))===sha(source),checks:rows.length,passed:rows.filter(r=>r.pass).length,failed:rows.filter(r=>!r.pass),rows};fs.rmSync(K,{recursive:true});console.log(JSON.stringify({checks:result.checks,passed:result.passed,failed:result.failed,sourceUnchanged:result.sourceUnchanged},null,2));assert.equal(result.failed.length,0);assert.equal(result.sourceUnchanged,true);
