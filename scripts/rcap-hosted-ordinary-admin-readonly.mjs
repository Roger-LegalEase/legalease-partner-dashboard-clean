import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';

export const ORIGIN='https://legalease-rcap-managed-c0052e13d980-roger947s-projects.vercel.app';
const AUTH='https://hyflxnlhpmiqxvvcoiia.supabase.co';
const UID='6574d21e-5e0a-4567-b14e-01447c162f37';
const TARGET='/internal/partners/onboarding/legalease-ordinary-qa-20261024';
const API='/api/internal/partners/onboarding/phase1/legalease-ordinary-qa-20261024';
// Exact original reviewed credential source, literal data only. Never import its account bootstrap.
export function readPinnedAdminCredentials(repo=process.cwd()){
 const p='scripts/rcap-hosted-acceptance-auth-config.mjs';
 const s=execFileSync('git',['show',`d3d8ff707d4d21ab508405494e6ee27056582a1a:${p}`],{cwd:repo,encoding:'utf8',stdio:['ignore','pipe','ignore']});
 assert.equal(createHash('sha256').update(s).digest('hex'),'cdf9d28192cc54de72e6c9ccef5f389c678b7472a60c6408ad54b0735e5d695c');
 const ts=createRequire(`${repo}/package.json`)('typescript');const ast=ts.createSourceFile(p,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const objs=ast.statements.filter(ts.isVariableStatement).flatMap(n=>[...n.declarationList.declarations]).filter(n=>ts.isIdentifier(n.name)&&n.name.text==='INTERNAL_ADMIN'&&n.initializer&&ts.isObjectLiteralExpression(n.initializer));assert.equal(objs.length,1);
 const get=name=>{const fields=objs[0].initializer.properties.filter(n=>ts.isPropertyAssignment(n)&&n.name.getText(ast)===name&&ts.isStringLiteral(n.initializer));assert.equal(fields.length,1);return fields[0].initializer.text;};
 const email=get('email');assert.equal(email,'acceptance-internal-admin@rcap-acceptance.test');return {email,password:get('password')};
}
export function requestAllowed(url,method,authPosts){
 let u;try{u=new URL(url);}catch{return false;}
 if(u.protocol!=='https:'||u.username||u.password||u.hash||![ORIGIN,AUTH].includes(u.origin))return false;
 if(method==='OPTIONS')return u.origin===AUTH&&((u.pathname==='/auth/v1/token'&&u.search==='?grant_type=password'&&authPosts===0)||(u.pathname==='/auth/v1/user'&&u.search===''));
 if(method==='POST')return u.origin===AUTH&&u.pathname==='/auth/v1/token'&&authPosts===0&&u.search==='?grant_type=password';
 if(!['GET','HEAD'].includes(method))return false;
 if(u.origin===AUTH)return u.pathname==='/auth/v1/user'&&u.search==='';
 const seen=new Set();
 for(const [key,value] of u.searchParams){
  if(seen.has(key))return false;seen.add(key);
  if(key==='mode'){if(value!=='signin')return false;}
  else if(key==='next'){if(!['/briefcase',TARGET].includes(value))return false;}
  else if(key==='_rsc'||key==='v'){if(!/^[A-Za-z0-9_-]{1,128}$/.test(value))return false;}
  else return false;
 }
 return true;
}
export function summarizeReadback(kind,status,body){
 const c=body?.configuration,o=body?.operations;
 const result={kind,status,jsonObject:Boolean(body&&typeof body==='object'&&!Array.isArray(body)),ok:body?.ok===true};
 if(kind==='configuration')Object.assign(result,{configurationPresent:Boolean(c&&typeof c==='object'),expectedPartner:c?.partnerSlug==='legalease-ordinary-qa-20261024',managed:c?.operatingModel==='legalease_managed',version:Number.isSafeInteger(c?.version)&&c.version>=0?c.version:null,policyCurrent:c?.policyVersion==='rcap2.2',sponsoredPackets:c?.data?.program_goals?.service_mode==='sponsored_packets',online:c?.data?.program_goals?.participation_mode==='online',openAccess:c?.data?.access_sponsorship_capacity?.participant_access_model==='open'});
 if(kind==='program')Object.assign(result,{operationsPresent:Boolean(o&&typeof o==='object'),expectedPartner:o?.identity?.partnerSlug==='legalease-ordinary-qa-20261024',canStart:o?.canStart===true,live:o?.view?.decision?.live===true,sponsoredPacketCapability:o?.view?.capabilities?.issue_sponsored_packet===true,screenings:Number.isSafeInteger(o?.view?.commercial?.screenings)?o.view.commercial.screenings:null,packets:Number.isSafeInteger(o?.view?.commercial?.packets)?o.view.commercial.packets:null,materialCount:Array.isArray(o?.view?.materials)?o.view.materials.length:null});
 return result;
}
// Root creates context with existing approved Preview protection headers, admits native target,
// and supplies persistent private checkpoint writer. This function does not open a worker window.
export async function observeOrdinaryAdmin({context,admit,checkpoint,bypass,credentialReader=readPinnedAdminCredentials}){
 assert.equal(typeof admit,'function');assert.equal(typeof checkpoint,'function');await admit({applicationSha:'c0052e13d9801d24080275aab02c70c6ea213fa3',origin:ORIGIN,operation:'normal-admin-readonly'});
 assert.ok(typeof bypass==='string'&&bypass.trim()&&!/[\r\n]/.test(bypass));
 let authPosts=0,blocked=0;
 const guard=async route=>{const r=route.request();if(!requestAllowed(r.url(),r.method(),authPosts)){blocked++;await route.abort();return;}if(r.method()==='POST')authPosts++;const headers={...r.headers()};delete headers['x-vercel-protection-bypass'];if(new URL(r.url()).origin===ORIGIN){headers['x-vercel-protection-bypass']=bypass;headers['x-vercel-skip-toolbar']='1';}await route.continue({headers});};
 await context.route('**/*',guard);
 // Preserve original accepted native-fallback protection: never serialize password into navigation.
 await context.addInitScript(()=>window.addEventListener('submit',event=>{const f=event.target;if(location.pathname==='/expungement-ai/sign-in'&&f instanceof HTMLFormElement&&f.querySelector('input[name="password"]')&&!event.defaultPrevented)event.preventDefault();}));
 const page=await context.newPage();let credentials,phase='release_get',observedHttpStatus=null,exactExistingAdmin=null;const httpStatuses={};
 const mark=(name,status=null)=>{phase=name;observedHttpStatus=status;if(status!==null)httpStatuses[name]=status;};
 try{
  const releaseResponse=await page.goto(ORIGIN+'/api/rcap/release',{waitUntil:'domcontentloaded'});mark('release_get',releaseResponse.status());assert.equal(releaseResponse.status(),200);mark('release_source_assertions',releaseResponse.status());const release=await releaseResponse.json();assert.equal(release.application,'RCAP 2.0');assert.equal(release.policyVersion,'rcap2.2');assert.equal(release.buildSha,'c0052e13d9801d24080275aab02c70c6ea213fa3');assert.equal(release.runtimeSha,'c0052e13d9801d24080275aab02c70c6ea213fa3');assert.equal(release.sourceBound,true);
  mark('sign_in_page');const signInPage=await page.goto(`${ORIGIN}/expungement-ai/sign-in?mode=signin&next=%2Fbriefcase`,{waitUntil:'domcontentloaded'});mark('sign_in_page',signInPage?.status()??null);
  mark('credential_input');
  credentials=credentialReader();await page.locator('input[name="email"]').fill(credentials.email);await page.locator('input[name="password"]').fill(credentials.password);credentials=null;
  mark('sign_in_submit');const token=page.waitForResponse(r=>r.url().startsWith(`${AUTH}/auth/v1/token?`)&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();const response=await token;mark('auth_grant',response.status());assert.equal(response.status(),200);const authBody=await response.json();exactExistingAdmin=authBody.user?.id===UID;assert.equal(exactExistingAdmin,true);
  mark('briefcase_redirect');await page.waitForURL(u=>u.origin===ORIGIN&&u.pathname==='/briefcase');
  mark('onboarding_get');const nav=await page.goto(ORIGIN+TARGET,{waitUntil:'domcontentloaded'});mark('onboarding_get',nav?.status()??null);assert.equal(new URL(page.url()).origin,ORIGIN);
  const typed=[];
  for(const [kind,url] of [['configuration',API+'/configuration'],['program',API+'/program']]){
   mark(kind+'_get');const observed=await page.evaluate(async path=>{const r=await fetch(path,{cache:'no-store',redirect:'manual'});let body=null;try{body=await r.json();}catch{}return {status:r.status,body};},url);
   mark(kind+'_get',observed.status);typed.push(summarizeReadback(kind,observed.status,observed.body));
  }
  await checkpoint({stage:'ordinary_admin_readonly',navigationStatus:nav?.status(),exactExistingAdmin:true,phase,observedHttpStatus,httpStatuses,ownHostReleaseSourceBound:true,observations:typed,blocked,authPosts,customerWrites:0});
  return {observations:typed,blocked,authPosts};
 }catch(error){await checkpoint({stage:'ordinary_admin_readonly_failed',errorClass:error?.name??'Error',phase,observedHttpStatus,httpStatuses,exactExistingAdmin,authPosts,blocked,customerWrites:0});throw new Error('Ordinary admin read-only observation failed; reconcile private checkpoint before retry.');}
 finally{credentials=null;await context.close();} // Guard remains installed until the authenticated context is closed.
}
