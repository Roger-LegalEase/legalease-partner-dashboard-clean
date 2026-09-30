import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync, spawnSync} from 'node:child_process';

const base='c015c7dbf44596d1f77f405697af9a75c03e045a';
const browserPath='scripts/rcap-hosted-legal-aid-browser.mjs';
const source=fs.readFileSync(browserPath,'utf8');
const before=execFileSync('git',['show',`${base}:${browserPath}`],{encoding:'utf8'});
const section=s=>s.slice(s.indexOf('    // 2. Applicant A:'),s.indexOf('    const personA ='));
const staticFiles=[
 '.github/workflows/rcap-f1-ephemeral-staging.yml','.github/workflows/rcap-hosted-acceptance-staging.yml',
 'scripts/rcap-hosted-legal-aid-seed.mjs',browserPath,'scripts/rcap-legal-aid/hosted-fixture.mjs',
 'scripts/rcap-hosted-acceptance-deploy.mjs','scripts/verify-rcap-hosted-legal-aid-browser.mjs'
];
function verify(text){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'legal-aid-captcha-contract-'));
 try{
  for(const file of staticFiles){const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(file,target);}
  fs.writeFileSync(path.join(root,browserPath),text);
  const log=path.join(root,'verifier.log'),fd=fs.openSync(log,'w');
  let result;
  try{result=spawnSync(process.execPath,['scripts/verify-rcap-hosted-legal-aid-browser.mjs'],{cwd:root,encoding:'utf8',stdio:['ignore',fd,fd],env:{PATH:process.env.PATH}});}
  finally{fs.closeSync(fd);}
  assert.ifError(result.error);
  const output=fs.readFileSync(log,'utf8');return {...result,stdout:output,stderr:output};
 }finally{fs.rmSync(root,{recursive:true,force:true});}
}
test('actual Captain reproduces the CAPTCHA watcher defect; corrected verifier rejects it',()=>{
 assert.match(section(before),/a\.waitForResponse/);
 const result=verify(before);
 assert.notEqual(result.status,0);
 assert.match(result.stderr,/browser exercises sign-in/);
});
test('corrected harness satisfies the full hosted browser verifier',()=>{
 const result=verify(source);assert.equal(result.status,0,result.stdout+result.stderr);
 assert.match(result.stdout,/60\/60/);
});
for(const [label,from,to] of [
 ['password-grant watcher','const registrationUrl =','a.waitForResponse(response => response.url().includes("/auth/v1/token"));\n    const registrationUrl ='],
 ['CAPTCHA evidence','record("registration_sign_in_is_captcha_protected",','record("removed_captcha_case",'],
 ['visible CAPTCHA assertion',`&& await anonymousApplicant.locator('[aria-label="Security check"]').isVisible()`,'&& true'],
 ['anonymous redirect','await anonymousApplicant.waitForURL(/sign-in/);',''],
 ['Applicant A identity','user: who.APPLICANT_A','user: who.APPLICANT_B'],
 ['invented Applicant A','who.APPLICANT_A = await sessionFor(F.packetApplicantEmail, keys);','who.APPLICANT_A = { id: RESUME.owner, session: {} };'],
 ['invented password-grant response','const session = await signedIn.json().catch(() => null);','const session = { user: { id: RESUME.owner }, access_token: "fake" };'],
 ['SSR cookie removal','if (user) await context.addCookies(authCookies(user.session));',''],
 ['cookie broadening','domain: EXPECTED_HOSTNAME','domain: ".vercel.app"'],
 ['wrong registration URL','&& a.url() === registrationUrl','&& true'],
 ['session identity mismatch','who.APPLICANT_A.session.user.id === who.APPLICANT_A.id','true'],
 ['downstream case removal','record("duplicate_registration_refused",','record("removed_duplicate_case",'],
]){
 test(`static regression refuses ${label}`,()=>{
  assert.ok(source.includes(from));const result=verify(source.replace(from,to));assert.notEqual(result.status,0,result.stdout);
 });
}
test('all downstream journey code and existing session helpers are byte-preserved',()=>{
 const downstream='    const personA =';
 assert.equal(source.slice(source.indexOf(downstream)),before.slice(before.indexOf(downstream)));
 assert.equal(source.slice(0,source.indexOf('    // 2. Applicant A:')),before.slice(0,before.indexOf('    // 2. Applicant A:')));
});
function runtime({captcha=true,owner='exact-owner',sessionOwner=owner,redirect=false}={}){
 const calls=[],cases={};
 const PREVIEW='https://accepted-preview.example.test';
 const F={partnerSlug:'mvlp',eventSlug:'training',eventName:'Training clinic'};
 const session={access_token:'server-response-fixture-only',refresh_token:'server-refresh-fixture-only',user:{id:sessionOwner}};
 const who={APPLICANT_A:{id:owner,email:'applicant@rcap-acceptance.test',session}};
 const contexts=[];
 const browser={newContext:async()=>{
  const c={cookies:[],route:async(pattern)=>calls.push(['route',pattern]),addCookies:async(cookies)=>{c.cookies=cookies;calls.push(['cookies',cookies]);}};
  let url='';
  c.newPage=async()=>({
   setDefaultTimeout:()=>{},
   goto:async(target)=>{url=redirect&&target.endsWith('/register')?PREVIEW+'/sign-in':target;},
   url:()=>url,
   locator:selector=>({
    count:async()=>1,
    waitFor:async()=>{if(!captcha)throw Error('security check absent');},
    isVisible:async()=>captcha,
   }),
   content:async()=>F.eventName,
   click:async()=>{url=PREVIEW+'/sign-in';},
   waitForURL:async()=>assert.equal(new URL(url).pathname,'/sign-in'),
   waitForSelector:async()=>{},
  });
  contexts.push(c);return c;
 }};
 const cookieHelper=source.slice(source.indexOf('const SSR_COOKIE_CHUNK_SIZE'),source.indexOf('async function vercelJson'));
 const contextHelper=source.slice(source.indexOf('async function newContext('),source.indexOf('// A same-origin request'));
 const sandbox={Buffer,URL,PREVIEW,F,who,RESUME:{owner:'exact-owner'},EXPECTED_HOSTNAME:new URL(PREVIEW).hostname,
  PROJECT_REF:'hyflxnlhpmiqxvvcoiia',BYPASS:'local-fixture',browser,
  screenshot:async()=>{},record:(id,passed)=>{cases[id]={passed};assert.equal(passed,true,id);}};
 vm.createContext(sandbox);
 const code=cookieHelper+'\n'+contextHelper+'\nconst open = async options => (await newContext(browser,options)).page;\n(async()=>{'+section(source)+'})()';
 return {run:()=>vm.runInContext(code,sandbox),calls,cases,contexts,session,PREVIEW};
}
test('actual Applicant A block uses isolated SSR cookie context and reaches exact registration without password watcher',async()=>{
 const r=runtime();await r.run();assert.equal(r.contexts.length,2);
 assert.equal(r.contexts[0].cookies.length,0,'anonymous page receives no auth cookie');
 const cookies=r.contexts[1].cookies;assert.ok(cookies.length>0);
 const encoded=cookies.map(c=>c.value).join('');
 assert.deepEqual(JSON.parse(Buffer.from(encoded.slice('base64-'.length),'base64').toString()),r.session);
 for(const cookie of cookies){assert.equal(cookie.domain,new URL(r.PREVIEW).hostname);assert.equal(cookie.secure,true);assert.equal(cookie.path,'/');}
 assert.equal(r.cases.registration_sign_in_is_captcha_protected.passed,true);
 assert.equal(r.cases.synthetic_applicant_session_returns_to_registration.passed,true);
});
for(const [label,options]of [
 ['absent CAPTCHA',{captcha:false}],['wrong owner',{owner:'other'}],
 ['invented session identity',{sessionOwner:'other'}],['sign-in redirect',{redirect:true}],
])test(`actual Applicant A block refuses ${label}`,async()=>{await assert.rejects(runtime(options).run());});

test('existing sessionFor uses anon password grant and returns the server-issued identity without minting',async()=>{
 const code=source.slice(source.indexOf('async function sessionFor('),source.indexOf('const SSR_COOKIE_CHUNK_SIZE'));
 const calls=[],session={access_token:'local-server-response-fixture',user:{id:'server-user'}};
 const run=vm.runInNewContext(code+'\nsessionFor',{SUPABASE_URL:'https://hyflxnlhpmiqxvvcoiia.supabase.co',DEMO_PASSWORD:'local-password-fixture',
  BrowserGateFailure:Error,fetch:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>session};}});
 const actual=await run('applicant@rcap-acceptance.test',{anon:'anon-key-fixture',service:'forbidden-service-key'});
 assert.equal(actual.session,session);assert.equal(actual.id,session.user.id);
 assert.equal(calls.length,1);assert.equal(calls[0].url,'https://hyflxnlhpmiqxvvcoiia.supabase.co/auth/v1/token?grant_type=password');
 assert.equal(calls[0].options.method,'POST');assert.equal(calls[0].options.headers.Authorization,'Bearer anon-key-fixture');
 assert.deepEqual(JSON.parse(calls[0].options.body),{email:'applicant@rcap-acceptance.test',password:'local-password-fixture'});
});
