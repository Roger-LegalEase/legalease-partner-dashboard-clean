// Operator-run LOCAL browser check. Does not start/deploy an application or use
// real Auth. All auth, claim and destination responses are synthetic/mocked.
import assert from 'node:assert/strict';
import ts from 'typescript';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=process.cwd();
const require=createRequire(path.join(root,'package.json'));
const {chromium}=require('playwright');
const output=path.resolve('successor-closure-evidence');
const origin=process.env.RCAP_STAGED_ORIGIN;
assert(origin?.startsWith('https://'));
const bypass=process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
assert(bypass);

const email='synthetic@example.invalid';
const matter='/briefcase/matters/11111111-1111-4111-8111-111111111111';
const claim='synthetic_claim_capability_00000000000000';
const source=fs.readFileSync(path.join(root,'src/components/expungement-ai/ConsumerSignInForm.tsx'),'utf8');
assert.ok(source.includes('signupNextStepsContext'),'patched worktree source required');
const frozenProxy=execFileSync('git',['show',process.env.RCAP_APPLICATION_SHA+':src/proxy.ts'],{encoding:'utf8'});
const ast=ts.createSourceFile('proxy.ts',frozenProxy,ts.ScriptTarget.Latest,true);
const names=new Set(['productPathForHost','expungementAiPath','legalEasePath','legalEasePartnerPath']);
const functions=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.has(n.name?.text)).map(n=>n.getText(ast)).join('\n');
assert.equal(names.size,ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.has(n.name?.text)).length);
const routing=vm.runInNewContext(ts.transpile(functions)+';productPathForHost');
const routingCases=[['expungement.ai','/','/expungement-ai'],['legalease.com','/','/static/legalease/index.html'],['legaleasepartner.com','/','/partners']];
for(const [host,requested,target] of routingCases){
 assert.equal(routing(host,requested),target);
 const response=await fetch(new URL(target,origin),{method:'GET',headers:{'x-vercel-protection-bypass':bypass},redirect:'manual'});
 assert(response.ok,`staged target for ${host}`);
}
fs.writeFileSync(path.join(output,'shared-host-routing.json'),JSON.stringify({passed:true,source:process.env.RCAP_APPLICATION_SHA,kind:'exact frozen host mapping plus direct staged target GETs; public aliases untouched',cases:routingCases},null,2));
const browser=await chromium.launch({headless:true});
const results=[];
try {
 for(const locale of ['en','es']) for(const width of [375,1440]) {
  const context=await browser.newContext({viewport:{width,height:1000},colorScheme:'light',extraHTTPHeaders:{'x-vercel-protection-bypass':bypass}});
  await context.addInitScript(locale=>localStorage.setItem('exp_lang',locale),locale);
  let signups=0,signins=0,claims=0,unexpectedAuth=0,fail=false,delay=0;
  const errors=[];
  context.on('page',p=>p.on('pageerror',error=>{let message=error.message;for(const [key,value]of Object.entries(process.env))if(/TOKEN|SECRET|PASSWORD|KEY/.test(key)&&value&&value.length>5)message=message.split(value).join('[redacted]');message=message.replace(/https?:\/\/[^\s)]+/g,url=>{try{const u=new URL(url);return u.origin+u.pathname;}catch{return '[url]';}}).replace(/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+/g,'[token]');errors.push({name:error.name,message});fs.writeFileSync(path.join(output,'browser-errors.json'),JSON.stringify({locale,width,errors},null,2));}));
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.pathname.startsWith('/auth/v1/')){
    if(url.pathname==='/auth/v1/signup'){
     signups++;if(delay)await new Promise(r=>setTimeout(r,delay));
     return route.fulfill({status:fail?400:200,contentType:'application/json',body:JSON.stringify(fail
      ? {code:'synthetic_failure',msg:'Synthetic refusal'}
      : {user:{id:'11111111-1111-4111-8111-111111111111',email,aud:'authenticated',identities:[]},session:null})});
    }
    if(url.pathname==='/auth/v1/token'&&url.searchParams.get('grant_type')==='password'){
     signins++;
     const user={id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',email,email_confirmed_at:'2026-01-01T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{}};
     const part=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
     const exp=Math.floor(Date.now()/1000)+3600;
     const token=`${part({alg:'HS256',typ:'JWT'})}.${part({sub:user.id,exp,aud:'authenticated',role:'authenticated'})}.synthetic`;
     return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:token,refresh_token:'synthetic-only',token_type:'bearer',expires_in:3600,expires_at:exp,user})});
    }
    unexpectedAuth++;return route.abort();
   }
   if(url.origin!==origin)return route.abort(); // no production/external traffic
   if(url.pathname==='/api/expungement-ai/screening/pending/claim'){
    claims++;const body=req.postDataJSON();assert.equal(body.claimToken,claim);
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({redirectTo:matter})});
   }
   if(url.pathname===matter&&req.isNavigationRequest())return route.fulfill({contentType:'text/html',body:'<h1>LOCAL mocked exact matter destination</h1>'});
   if(url.pathname.startsWith('/api/'))return route.fulfill({status:401,contentType:'application/json',body:'{}'});
   if(req.method()!=='GET')return route.abort();
   return route.continue();
  });
  const page=await context.newPage();
  const create=locale==='en'?'Create account and continue':'Crear cuenta y continuar';
  const signIn=locale==='en'?'Sign in':'Iniciar sesión';
  const reset=locale==='en'?'Reset password':'Restablecer contraseña';
  const edit=locale==='en'?'Edit email':'Editar correo electrónico';
  const guidance=locale==='en'?'If this email needs verification':'Si este correo necesita verificación';
  async function enter(){
   const q=new URLSearchParams({mode:'create',next:matter,claim,locale});
   await page.goto(`${origin}/expungement-ai/sign-in?${q}`);
   await page.locator('form[data-handler-ready=true]').waitFor();
   await page.locator('input[name=email]').fill(email);
   await page.locator('input[name=password]').fill('synthetic-noncredential');
  }
  await enter();fail=true;
  await page.getByRole('button',{name:create,exact:true}).click();
  await page.getByText(locale==='en'?'We could not create your account.':'No pudimos crear su cuenta.',{exact:false}).waitFor();
  assert.equal(await page.getByRole('status').filter({hasText:guidance}).count(),0);
  fail=false;delay=200;
  await page.getByRole('button',{name:create,exact:true}).evaluate(button=>{button.click();button.click();});
  const status=page.getByRole('status').filter({hasText:guidance});await status.waitFor();
  assert.equal(signups,2);assert.equal(signins,0);assert.equal(claims,0);assert.equal(unexpectedAuth,0);
  await status.getByRole('button',{name:signIn,exact:true}).waitFor();
  await status.getByRole('link',{name:reset,exact:true}).waitFor();
  await status.getByRole('button',{name:edit,exact:true}).waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
  // Screenshot contains no address bar, credentials or claim-bearing links.
  // Password input is inside hidden form; add only an environment label.
  await page.evaluate(()=>{const label=document.createElement('p');label.textContent='STAGED CANDIDATE — MOCKED AUTH — NOT EMAIL DELIVERY';label.style='position:fixed;bottom:0;background:white;color:black;padding:6px;z-index:9999';document.body.append(label);});
  await page.screenshot({path:path.join(output,`staged-mocked-${locale}-${width}.png`),fullPage:true});
  await status.getByRole('button',{name:edit,exact:true}).click();
  assert.equal(await page.locator('input[name=email]').inputValue(),email);
  assert.equal(await page.getByRole('status').filter({hasText:guidance}).count(),0);
  await page.locator('input[name=email]').fill('corrected@example.invalid');
  await page.getByRole('button',{name:create,exact:true}).click();await status.waitFor();
  const href=await status.getByRole('link',{name:reset,exact:true}).getAttribute('href');
  const params=new URL(href,origin).searchParams;
  assert.equal(params.get('next'),matter);assert.equal(params.get('claim'),claim);assert.equal(params.get('locale'),locale);
  assert.equal(params.get('product'),'expungement');assert.equal(params.has('email'),false);assert.equal(params.has('password'),false);
  await status.getByRole('link',{name:reset,exact:true}).click();
  await page.waitForURL(u=>u.pathname==='/auth/forgot-password');
  await enter();await page.getByRole('button',{name:create,exact:true}).click();await status.waitFor();
  await status.getByRole('button',{name:signIn,exact:true}).click();
  assert.equal(await page.locator('input[name=email]').inputValue(),email);
  const current=new URL(page.url()).searchParams;assert.equal(current.get('claim'),claim);assert.equal(current.get('next'),matter);
  await page.locator('form').getByRole('button',{name:signIn,exact:true}).click();
  await page.waitForURL(u=>u.pathname===matter);
  assert.equal(signins,1);assert.equal(claims,1);assert.equal(unexpectedAuth,0);assert.deepEqual(errors,[]);
  results.push({locale,width,status:'PASS',auth:'MOCKED: NO LIVE AUTH',claim:'MOCKED: NO LIVE CLAIM',emailDelivery:'NOT TESTED'});
  await context.close();
 }
 fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify(results,null,2)+'\n');
 console.log('STAGED mocked browser verification passed: EN/ES at 375px and 1440px. No real email delivery tested.');
} finally {await browser.close();}
