// Bounded H-A review controls. Local browser, real components and localization;
// only network/auth/navigation ports are synthetic. No hosted requests.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
import {chromium} from 'playwright';
const require=createRequire(import.meta.url);
const {webpack}=require('next/dist/compiled/webpack/webpack');
const file='src/lib/expungement-ai/localization.ts';
const load=s=>import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText).toString('base64'));
const current=await load(fs.readFileSync(file,'utf8'));
const baseline=await load(execFileSync('git',['show','97f3b24c8b9462cf5f100a2c83358360d7252ec2:'+file],{encoding:'utf8'}));
const added=['signin.pending_claim_error','signin.javascript_required','signin.secure_link_sent','signin.retrying','signin.retry_save','signin.sending_secure_link','signin.email_secure_link','signin.opening_google','signin.continue_google','signin.passwordless.error','signin.captcha_failure','clinic.assistance.staff_error','clinic.assistance.capacity_error','legal_aid.device_reset_required','clinic.verification.prepare_error'];
const edited=['result.nv.176a_subsection_1_automatic','clinic.admission.stale','clinic.error.10','clinic.error.4','clinic.participant.18','clinic.participant.23','clinic.participant.30','clinic.recovery.1','clinic.recovery.3','clinic.recovery.5','clinic.recovery.7','clinic.recovery.8','clinic.recovery.11','clinic.recovery.12','signin.switch_to_create'];
// Fixed product-review authority, not HEAD: later copy additions must remain unregistered.
const legalAidAuthority=await load(execFileSync('git',['show','4576e4e2636e02110daef6ba10e2c8587dfa608f:'+file],{encoding:'utf8'}));
const legalAidKeys=[
 'legal_aid.places_open','legal_aid.participant.auth_required',
 'legal_aid.participant.account_unverified','legal_aid.participant.account_deleted',
 ...Array.from({length:353},(_,i)=>`legal_aid.participant.${i}`),
];
function assertCopyAuthority(catalog){
 const changed=Object.keys(catalog).filter(k=>JSON.stringify(catalog[k])!==JSON.stringify(baseline.EXPUNGEMENT_COPY[k]));
 assert.deepEqual(changed.sort(),[...added,...edited,...legalAidKeys].sort());
 for(const k of legalAidKeys)assert.deepEqual(catalog[k],legalAidAuthority.EXPUNGEMENT_COPY[k],k);
 for(const k of Object.keys(baseline.EXPUNGEMENT_COPY))if(!edited.includes(k))assert.deepEqual(catalog[k],baseline.EXPUNGEMENT_COPY[k],k);
}
test('only the bounded catalog entries change; all 15 fallback paths resolve Spanish; only approved Nevada paragraph changes',()=>{
 assertCopyAuthority(current.EXPUNGEMENT_COPY);
 for(const k of legalAidKeys){
  const v=current.EXPUNGEMENT_COPY[k];
  assert.equal(current.t('es',k,v.en),v.es);
  assert.equal(current.t('en',k),v.en);
  if(k!=='legal_aid.places_open')assert.equal(current.resolveLegalAidText('es',v.en),v.es);
 }
 // Negative fixtures exercise the same guard without changing source files.
 const fallback=structuredClone(current.EXPUNGEMENT_COPY);
 fallback['legal_aid.participant.auth_required'].es=fallback['legal_aid.participant.auth_required'].en;
 assert.throws(()=>assertCopyAuthority(fallback),{code:'ERR_ASSERTION'});
 for(const key of ['legal_aid.participant.353','unregistered.spanish_copy']){
  assert.throws(()=>assertCopyAuthority({...current.EXPUNGEMENT_COPY,[key]:{en:'Unapproved copy',es:'Texto no aprobado'}}),{code:'ERR_ASSERTION'});
 }
 const inherited=structuredClone(current.EXPUNGEMENT_COPY);
 const inheritedKey=Object.keys(baseline.EXPUNGEMENT_COPY).find(k=>!edited.includes(k)&&inherited[k].en!==inherited[k].es);
 inherited[inheritedKey].es=inherited[inheritedKey].en;
 assert.throws(()=>assertCopyAuthority(inherited),{code:'ERR_ASSERTION'});
 for(const k of [...added,...edited]){const v=current.EXPUNGEMENT_COPY[k];assert.ok(v.es);assert.notEqual(v.es,v.en);assert.equal(current.t('es',k,v.en),v.es);assert.equal(current.resolveRuntimeText('es',v.en),v.es);assert.equal(current.t('en',k),v.en);}
 for(const k of Object.keys(baseline.EXPUNGEMENT_COPY))if(!edited.includes(k))assert.deepEqual(current.EXPUNGEMENT_COPY[k],baseline.EXPUNGEMENT_COPY[k],k);
 assert.equal(current.EXPUNGEMENT_COPY['clinic.admission.stale'].es,baseline.EXPUNGEMENT_COPY['clinic.admission.stale'].es);
 assert.equal(current.EXPUNGEMENT_COPY['signin.passwordless.error'].en,'We could not sign you in. Check your email and try again.');
});
// Exact H-L EN/ES approved by Lawrence Blackmon, 2026-09-28.
test('Nevada automatic-sealing paragraph matches H-L approval exactly in both languages',()=>{
 const approved={"en": "Nevada seals this kind of case automatically. This applies after you are discharged from probation or your case is dismissed after the treatment program. Under NRS 176A.245, 176A.265, or 176A.295, the justice court, municipal court, or district court that handled your case must order the records sealed without a hearing unless the Nevada Division of Parole and Probation petitions the court, for good cause, not to seal the records and requests a hearing. You do not file a petition, you do not need a packet, and there is nothing to pay. If the record still shows the case, contact the court that supervised the program. That court holds the sealing order and is the only body that can act. You can also contact Nevada Legal Services.", "es": "Nevada sella automáticamente este tipo de caso. Esto se aplica después de que se haya dado por terminada su libertad condicional o de que su caso haya sido desestimado después del programa de tratamiento. Conforme a las NRS 176A.245, 176A.265 o 176A.295, el tribunal de justicia, el tribunal municipal o el tribunal de distrito que atendió su caso debe ordenar que se sellen los antecedentes sin audiencia, salvo que la Nevada Division of Parole and Probation solicite al tribunal, por causa justificada, que no los selle y pida una audiencia. Usted no presenta una petición, no necesita un paquete y no hay nada que pagar. Si el antecedente todavía muestra el caso, comuníquese con el tribunal que supervisó el programa. Ese tribunal tiene la orden de sellado y es el único que puede actuar. También puede comunicarse con Nevada Legal Services."};
 assert.deepEqual(current.EXPUNGEMENT_COPY['result.nv.176a_subsection_1_automatic'],approved);
});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ha-spanish-browser-'));
const write=(n,s)=>{const p=path.join(temp,n);fs.writeFileSync(p,s);return p;};
const entry=write('entry.tsx',`
import React from 'react';import {createRoot} from 'react-dom/client';
import {LocalizationProvider,LocalizedText} from '@/components/expungement-ai/LocalizationProvider';
import {ConsumerSignInForm} from '@/components/expungement-ai/ConsumerSignInForm';
import {ClinicAssistanceClient} from '@/components/clinic-mode/ClinicAssistanceClient';
import {ClinicPrivacyBoundary} from '@/components/clinic-mode/ClinicPrivacyBoundary';
import {SponsorCapacityNotice} from '@/components/expungement-ai/SponsorCapacityNotice';
import {PacketVerificationAction} from '@/components/expungement-ai/PacketVerificationAction';
import {RegistrationForm} from '@/components/legal-aid/RegistrationForm';
const q=new URLSearchParams(location.search),s=q.get('screen');
createRoot(document.getElementById('root')).render(<LocalizationProvider>
{s==='signin'?<ConsumerSignInForm/>:s==='clinic'?<ClinicAssistanceClient event={{publicSlug:'synthetic',jurisdiction:'MS'}} staff={[{id:'staff',label:'Approved staff 1'}]}/>:(s==='privacy'||s==='privacy-idle')?<ClinicPrivacyBoundary recovery={s==='privacy'} cleanEntryPath='/clinic/synthetic'><div>PRIVATE PARTICIPANT DATA</div></ClinicPrivacyBoundary>:s==='sponsor'?<SponsorCapacityNotice paid={q.get('paid')==='1'}/>:s==='legal'?<RegistrationForm eventId='synthetic' partnerName='Synthetic' defaultEmail={null}/>:s==='verify'?<PacketVerificationAction itemId='synthetic' verificationAnswers={{}} initiallyVerified={false} canVerify mode='sponsored' commercialActions={{fulfillmentAvailable:true,generationAllowed:true,checkoutAllowed:false}}/>:<LocalizedText k='signin.javascript_required' fallback='Enable JavaScript to sign in securely.'/>}
</LocalizationProvider>);`);
const auth=write('auth.js',`const call=async()=>{const r=await fetch('/auth-fixture');const b=await r.json();if(b.throw)throw Error('synthetic');return b};export const createBrowserSupabaseClient=()=>({auth:{signInWithOtp:call,signInWithOAuth:call,signInWithPassword:call,signUp:call,getSession:call}});`);
const router=write('router.js',`export const useRouter=()=>({refresh(){},push(){}});`);
const link=write('link.js',`import React from 'react';export default p=>React.createElement('a',p);`);
const analytics=write('analytics.js','export const trackFunnelEvent=()=>{};');
const loader=write('loader.cjs',`const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;`);
const bundle=await new Promise((resolve,reject)=>webpack({mode:'production',target:'web',entry,output:{path:temp,filename:'bundle.js'},optimization:{minimize:false},resolve:{extensions:['.tsx','.ts','.js'],modules:[path.resolve('node_modules'),'node_modules'],alias:{'@/lib/supabase/browser':auth,'@/lib/analytics/client':analytics,'@':path.resolve('src'),'next/navigation':router,'next/link':link}},module:{rules:[{test:/\.tsx?$/,use:loader}]},plugins:[new webpack.DefinePlugin({'process.env.NEXT_PUBLIC_AUTH_CAPTCHA_REQUIRED':JSON.stringify('false'),'process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY':JSON.stringify('')})]},(e,s)=>e?reject(e):s.hasErrors()?reject(Error(s.toString({all:false,errors:true}))):resolve(fs.readFileSync(path.join(temp,'bundle.js'),'utf8'))));
fs.rmSync(temp,{recursive:true,force:true});
async function site(locale='es'){
 const state={auth:{error:{message:'synthetic refusal'}},error:'Approved staff for this event are required.',hold:null};const requests=[];
 const server=http.createServer(async(req,res)=>{requests.push(req.url);res.setHeader('content-type','application/json');
 if(req.url==='/bundle.js'){res.setHeader('content-type','text/javascript');return res.end(bundle);}
 if(req.url==='/auth-fixture'){if(state.hold)await state.hold;return res.end(JSON.stringify(state.auth));}
 if(req.url==='/api/clinic/session/reset'){res.statusCode=409;return res.end('{"state":"handoff_identity_required"}');}
 if(req.url.includes('/packet-information'))return res.end('{"readyToGenerate":true,"commercialActions":{"fulfillmentAvailable":true,"generationAllowed":true,"checkoutAllowed":false}}');
 if(req.url==='/api/expungement-ai/packet/generate'){res.statusCode=500;return res.end('{}');}
 if(req.url.startsWith('/api/')){if(state.hold)await state.hold;res.statusCode=403;return res.end(JSON.stringify({error:state.error}));}
 res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><div id="root"></div><script src="/bundle.js"></script>');
 });server.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true});const page=await browser.newPage();page.setDefaultTimeout(5000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 await page.addInitScript(l=>localStorage.setItem('exp_lang',l),locale);
 return {page,state,requests,go:async(screen,extra='')=>{await page.goto(base+'/?screen='+screen+extra);await page.waitForFunction(l=>document.documentElement.lang===l,locale);},close:async()=>{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));assert.deepEqual(errors,[]);}};
}
const copy=(key,locale='es')=>current.EXPUNGEMENT_COPY[key][locale];
async function visible(p,value){await p.getByText(value,{exact:true}).waitFor();}
for(const locale of ['es','en'])test(`real sign-in ${locale}: passwordless errors, loading, success, CAPTCHA and pending claim`,async()=>{
 const s=await site(locale),p=s.page;try{
 await s.go('signin','&mode=signin');await p.locator('[name=email]').fill('synthetic@example.invalid');
 await p.getByRole('button',{name:copy('signin.email_secure_link',locale),exact:true}).click();await visible(p,copy('signin.passwordless.error',locale));
 s.state.auth={throw:true};await p.getByRole('button',{name:copy('signin.continue_google',locale),exact:true}).click();await visible(p,copy('signin.passwordless.error',locale));
 s.state.auth={error:null};let release;s.state.hold=new Promise(r=>release=r);
 await p.getByRole('button',{name:copy('signin.email_secure_link',locale),exact:true}).click();await visible(p,copy('signin.sending_secure_link',locale));release();s.state.hold=null;await visible(p,copy('signin.secure_link_sent',locale));
 s.state.auth={error:{message:'captcha synthetic'}};await p.getByRole('button',{name:copy('signin.email_secure_link',locale),exact:true}).click();await visible(p,copy('signin.captcha_failure',locale));
 s.state.auth={error:{message:'synthetic'}};s.state.hold=new Promise(r=>release=r);await p.getByRole('button',{name:copy('signin.continue_google',locale),exact:true}).click();await visible(p,copy('signin.opening_google',locale));release();s.state.hold=null;await visible(p,copy('signin.passwordless.error',locale));
 await s.go('signin','&mode=signin&claimRetry=1&claim=ssssssssssssssssssssssssssssssssssssssss');await p.getByText(copy('signin.pending_claim_error',locale),{exact:false}).waitFor();
 s.state.hold=new Promise(r=>release=r);await p.getByRole('button',{name:copy('signin.retry_save',locale),exact:true}).click();await p.locator('[data-pending-claim-retry]').waitFor({state:'hidden'});release();s.state.hold=null;
 await s.go('javascript');await visible(p,copy('signin.javascript_required',locale));
 }finally{await s.close();}
});
test('real Spanish Clinic consent: staff/capacity/account errors; no navigation or entitlement on refusal',async()=>{
 const s=await site(),p=s.page;try{await s.go('clinic');await p.locator('[name=eventStaffId]').selectOption('staff');await p.locator('[name=consent]').check();
 for(const key of ['clinic.assistance.staff_error','clinic.assistance.capacity_error','clinic.error.10','clinic.error.4']){s.state.error=copy(key,'en');await p.getByRole('button',{name:copy('clinic.participant.23')}).click();await visible(p,copy(key));}
 assert.equal(s.requests.some(r=>r.includes('checkout')||r.includes('packet/generate')),false);
 }finally{await s.close();}
});
test('real Spanish privacy recovery retains locked state when original access cannot be verified',async()=>{
 const s=await site(),p=s.page;try{await s.go('privacy');await visible(p,copy('clinic.recovery.1'));await p.getByRole('button',{name:copy('clinic.recovery.8')}).click();await visible(p,copy('clinic.recovery.5'));assert.equal(await p.getByText('PRIVATE PARTICIPANT DATA').count(),0);assert.ok((await p.context().cookies()).some(c=>c.name==='clinic_reset_pending'&&c.value==='1'));}finally{await s.close();}
});
test('real Spanish sponsor notices retain $50/payment and same-matter meanings, formal address',async()=>{
 const s=await site(),p=s.page;try{for(const paid of [false,true]){await s.go('sponsor',paid?'&paid=1':'');const text=await p.getByRole('status').innerText();assert.match(text,/Su solicitud|Sus respuestas/);assert.doesNotMatch(text,/\b(Tu|Tus|Puedes|necesitas)\b/);if(!paid){assert.match(text,/\$50/);assert.match(text,/hasta que se confirme el pago/);}}}finally{await s.close();}
});
test('real Spanish Legal Aid registration renders device-recovery refusal',async()=>{
 const s=await site(),p=s.page;try{s.state.error=copy('legal_aid.device_reset_required','en');await s.go('legal');await p.getByRole('button',{name:current.resolveLegalAidText('es','Register for this clinic'),exact:true}).click();await visible(p,copy('legal_aid.device_reset_required'));}finally{await s.close();}
});
test('real Spanish verification preserves verified facts and renders preparation failure',async()=>{
 const s=await site(),p=s.page;try{await s.go('verify');await p.getByRole('button').click();await visible(p,copy('clinic.verification.prepare_error'));assert.equal(s.requests.filter(r=>r.includes('packet-information')).length,1);assert.equal(s.requests.some(r=>r.includes('checkout')),false);}finally{await s.close();}
});

test('real Spanish idle privacy banner states the exact 15-minute automatic ending',async()=>{
 const s=await site(),p=s.page;try{await s.go('privacy-idle');await visible(p,copy('clinic.recovery.7'));await visible(p,'PRIVATE PARTICIPANT DATA');}finally{await s.close();}
});
