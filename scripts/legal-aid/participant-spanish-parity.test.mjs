// QA-UX-02: real participant pages/components, synthetic local data/navigation ports.
// Human H-A A3 and H-L acceptance are intentionally not asserted here.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { chromium } from 'playwright';
const BASE = '1aecc8af59e2ed8ea28382cc8d1612319428445a';
const root = process.cwd();
const source = p => fs.readFileSync(path.join(root, p), 'utf8');
const before = p => execFileSync('git', ['show', `${BASE}:${p}`], { encoding: 'utf8', maxBuffer: 20e6 });
const evaluate = text => { const exports = {}; new Function('exports', ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(exports); return exports; };
const runtimePath = 'src/lib/expungement-ai/localization.ts';
const runtime = evaluate(source(runtimePath)), oldRuntime = evaluate(before(runtimePath));
const schemaPath = 'src/lib/legal-aid/intake-schema.ts', schema = evaluate(source(schemaPath));
const pairs = Object.entries(runtime.EXPUNGEMENT_COPY).filter(([key]) => key.startsWith('legal_aid.participant.'));
const ownEnglish = new Set(pairs.map(([, p]) => p.en));
const own = (value, vars) => runtime.resolveLegalAidText('es', value, vars);
const norm = s => s.replace(/\s+/g, ' ').trim();
const surfaces = [
 'src/app/p/[partnerSlug]/clinics/page.tsx', 'src/app/p/[partnerSlug]/continue/page.tsx',
 'src/app/clinic/[eventSlug]/register/page.tsx', 'src/app/clinic/[eventSlug]/intake/page.tsx',
 ...['LegalAidShell','RegistrationForm','RegistrationActions','IntakeClient','SignaturePad'].map(n=>`src/components/legal-aid/${n}.tsx`),
 'src/components/expungement-ai/LocalizationProvider.tsx', runtimePath
];

test('closed corpus/recovery bytes and schema identity remain exact; controlled Spanish has no fallback', () => {
 assert.equal(source(schemaPath), before(schemaPath));
 for (const [key, pair] of Object.entries(oldRuntime.EXPUNGEMENT_COPY)) {
  assert.deepEqual(runtime.EXPUNGEMENT_COPY[key], pair, `closed key ${key}`);
  assert.equal(runtime.resolveRuntimeText('es',pair.en),oldRuntime.resolveRuntimeText('es',pair.en),`closed index ${key}`);
 }
 assert.ok(pairs.length > 300, 'nonempty bounded corpus');
 for (const message of ['Sign in to continue.','Verify your account to continue.','This account has been deleted.','Enter a valid email address.','Some required answers are missing or need a correction.']) assert.ok(ownEnglish.has(message), message);
 for (const [key, pair] of pairs) {
  assert.ok(pair.es, key);
  assert.equal(own(pair.en), pair.es, key);
  assert.equal(runtime.resolveLegalAidText('en', pair.en), pair.en, key);
  if (!['No','TANF'].includes(pair.en)) assert.notEqual(pair.es, pair.en, key);
  assert.doesNotMatch(pair.es, /\b(tú|tu|tus|vos|vosotros|contigo|puedes|debes|elige|ingresa)\b/i, `formal register ${key}`);
  assert.deepEqual([...pair.es.matchAll(/\{(\w+)\}/g)].map(x=>x[1]).sort(), [...pair.en.matchAll(/\{(\w+)\}/g)].map(x=>x[1]).sort());
 }
});

test('all rendered schema labels/help/options, nine section pairs and eleven validation messages resolve', () => {
 const required = [];
 for (const field of schema.INTAKE_FIELDS.filter(f=>f.product.requirement!=='derived')) {
  required.push(field.label); if(field.help)required.push(field.help);
  if(field.key!=='address.state')required.push(...(field.options??[]).map(o=>o.label));
 }
 const sections=schema.INTAKE_SECTIONS.filter(s=>s.key!=='clinic'); assert.equal(sections.length,9);
 for(const section of sections)required.push(section.title,section.intro);
 const errors=[...source(schemaPath).matchAll(/errors\[field.key\] = "([^"]+)"/g)].map(m=>m[1]);assert.equal(errors.length,11);required.push(...errors);
 for(const value of required)assert.ok(ownEnglish.has(value),`missing scoped key: ${value}`);
 for(const s of schema.INTAKE_STATEMENTS){
  assert.equal(s.version,'mvlp-v1'); assert.ok(ownEnglish.has(s.title));assert.ok(ownEnglish.has(s.text));
  assert.equal(runtime.resolveLegalAidText('en',s.text),s.text);assert.notEqual(own(s.text),s.text);
 }
 assert.equal(schema.INTAKE_STATEMENTS.length,4);
 // Signature transport/version evidence still comes from the unchanged schema and API.
 for(const p of ['src/lib/legal-aid/intake-service.ts','src/app/api/legal-aid/intakes/[intakeId]/actions/route.ts'])assert.equal(source(p),before(p));
 const payload=/JSON\.stringify\(\{ action: "sign", statementKey, signerName: name, signatureMethod: method, signatureData: method === "drawn" \? drawn : null \}\)/;
 assert.match(source('src/components/legal-aid/IntakeClient.tsx'),payload);
});

test('participant JSX has no remaining unlocalized fixed text or accessibility literals', () => {
 for (const p of surfaces.filter(p=>p.includes('/legal-aid/')||p.includes('/page.tsx'))) {
  const sf=ts.createSourceFile(p,source(p),99,true,ts.ScriptKind.TSX);
  function visit(n) {
   if(ts.isJsxText(n)&&/[A-Za-z]/.test(n.text)) assert.ok(['KB','clinic team'].includes(n.text.trim()),`${p}: unlocalized JSX ${n.text}`);
   if(ts.isJsxAttribute(n)&&['placeholder','aria-label'].includes(n.name.text)&&n.initializer&&ts.isStringLiteral(n.initializer)&&/[A-Za-z]/.test(n.initializer.text)) assert.fail(`${p}: unlocalized ${n.name.text}`);
   ts.forEachChild(n,visit);
  }
  visit(sf);
 }
});

const require = createRequire(import.meta.url);
const { webpack } = require('next/dist/compiled/webpack/webpack');
let temp, bundles, browser, server, origin;
const write=(name,text)=>{const p=path.join(temp,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,text);return p;};
async function build(baseline){
 const imports={};
 if(baseline)for(const p of surfaces) { const local=write('base/'+p,before(p));imports['@/'+p.slice(4).replace(/\.tsx?$/,'')+'$']=local; }
 const entry=write((baseline?'before':'after')+'.tsx',`
import React from 'react';import {createRoot} from 'react-dom/client';
import {LocalizationProvider} from '@/components/expungement-ai/LocalizationProvider';
import Clinics from '@/app/p/[partnerSlug]/clinics/page';import Continue from '@/app/p/[partnerSlug]/continue/page';
import Register from '@/app/clinic/[eventSlug]/register/page';import Intake from '@/app/clinic/[eventSlug]/intake/page';
import {LegalAidShell,LegalAidRecoveryMessage} from '@/components/legal-aid/LegalAidShell';
import {AnswerSummary,DocumentsBlock} from '@/components/legal-aid/IntakeClient';
import {getLegalAidBranding} from '@/lib/legal-aid/branding';
import {INTAKE_FIELDS,INTAKE_STATEMENTS} from '@/lib/legal-aid/intake-schema';
const q=new URLSearchParams(location.search), route=q.get('route')||'clinics', scenario=q.get('scenario')||'default';
const date='2026-09-28T16:05:00Z';
const event={id:'event',partnerSlug:'mvlp',publicSlug:'fixture',name:'Partner clinic name',geography:'Partner geography',locationName:'Partner venue',startsAt:date,timezone:'America/Chicago',publicDescription:'Partner-authored description',participantCostNote:null,registrationOpen:scenario!=='closed',seatsRemaining:scenario==='full'?0:scenario==='unlimited'?null:5,appointmentPolicy:scenario==='mixed'?'mixed':scenario==='walkin'?'walkin':'appointment'};
const registration={id:'registration',contactName:'Participant Name',contactEmail:'participant@example.test',contactPhone:'6015550100',preferredContact:scenario==='phone'?'phone':scenario==='text'?'text':scenario==='either'?'either':'email',status:['waitlisted','received','cancelled','declined'].includes(scenario)?scenario:'confirmed'};
const answers={};for(const f of INTAKE_FIELDS){if(f.product.requirement==='derived'||f.control==='restricted_ssn')continue;answers[f.key]={state:'answered',value:f.options?.[0]?.value??(f.control==='money'||f.control==='count'?'0':f.control==='date'?'2000-01-01':'Participant answer')};}
answers.is_us_citizen={state:'answered',value:scenario==='noncitizen'?'no':'yes'};answers['address.state']={state:'answered',value:'MS'};
const status=['submitted','staff_review','approved','declined_for_program','referred','withdrawn','needs_information'].includes(scenario)?scenario:'draft';
const view={id:'intake',eventId:'event',currentVersion:1,status,answers,ssnHint:'1234',submittedAt:date,openRequests:status==='needs_information'?[{id:'request',requestText:'Partner-authored information request'}]:[],signatures:scenario==='signed'?INTAKE_STATEMENTS.map(s=>({statementKey:s.key,status:'active',current:true,signerName:'Participant Name',signedAt:date,signatureMethod:'typed'})):[],documents:[{id:'document',category:'identification',originalFilename:'participant-file.pdf',sizeBytes:512,uploadedRole:'participant'}],nextSteps:[{id:'step',title:'Partner-authored next step',detail:'Partner-authored detail',status:'pending',dueAt:date}],documentTasks:['draft','attorney_reviewed','ready_for_execution','signature_or_notary_pending','executed_copy_received','execution_reviewed','ready_to_file','filed'].map(status=>({id:status,title:'Partner document title',status}))};
window.__fixture={event,registration,view,scenario};
const pages={clinics:Clinics,continue:Continue,register:Register,intake:Intake};
async function start(){const element=route==='staff'?<LegalAidShell branding={getLegalAidBranding('mvlp')} audience='staff'><AnswerSummary answers={answers}/><DocumentsBlock intakeId='intake' documents={view.documents} onChanged={async()=>{}}/></LegalAidShell>:route==='recovery'?<LegalAidShell branding={getLegalAidBranding('mvlp')}><LegalAidRecoveryMessage message='Complete device recovery before opening Legal Aid records.'/></LegalAidShell>:await pages[route]({params:Promise.resolve({partnerSlug:'mvlp',eventSlug:'fixture'})});createRoot(document.getElementById('root')).render(<LocalizationProvider>{element}</LocalizationProvider>);}
start().catch(e=>{throw e});`);
 const ports=write('ports.js',`
export const requireConsumerBriefcaseSession=async()=>({userId:'participant',userEmail:'participant@example.test'});
export const withLegalAidDeviceBoundary=async render=>render();
export const listOpenLegalAidEvents=async()=>{if(window.__fixture.scenario==='unavailable')throw new ClinicServiceError('unavailable','fixture');return window.__fixture.scenario==='empty'?[]:[window.__fixture.event]};
export const getLegalAidEventBySlug=async()=>window.__fixture.event;
export const getParticipantRegistration=async()=>['new','full','closed'].includes(window.__fixture.scenario)?null:window.__fixture.registration;
export const listParticipantRegistrations=async()=>window.__fixture.scenario==='empty'?[]:[{event:window.__fixture.event,registration:window.__fixture.registration}];
export const getParticipantIntake=async()=>window.__fixture.scenario==='new'?null:window.__fixture.view;
export const getParticipantContextForEvent=async()=>({registration:window.__fixture.registration,intake:window.__fixture.scenario==='new'?null:window.__fixture.view});
import {ClinicServiceError} from '@/lib/clinic-mode/errors';`);
 const navigation=write('navigation.js',`export const useRouter=()=>({refresh(){},push(){}});export const notFound=()=>{throw Error('not found')};export const redirect=()=>{throw Error('redirect')};`);
 const link=write('link.js',`import React from 'react';export default p=>React.createElement('a',p);`);
 const cache=write('cache.js','export const unstable_noStore=()=>{};');
 const loader=write('loader.cjs',`const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;`);
 const aliases={...imports,'@/lib/expungement-ai/auth':ports,'@/components/legal-aid/LegalAidDeviceBoundary':ports,'@/lib/legal-aid/registration-service':ports,'@/lib/legal-aid/intake-service':ports,'@':path.resolve('src'),'next/navigation':navigation,'next/link':link,'next/cache':cache};
 return new Promise((resolve,reject)=>webpack({mode:'production',target:'web',entry,output:{path:temp,filename:baseline?'baseline.js':'candidate.js'},optimization:{minimize:false},resolve:{extensions:['.tsx','.ts','.js','.json'],modules:[path.resolve('node_modules'),'node_modules'],alias:aliases},module:{rules:[{test:/\.tsx?$/,use:loader}]}},(e,s)=>e?reject(e):s.hasErrors()?reject(Error(s.toString({all:false,errors:true}))):resolve(fs.readFileSync(path.join(temp,baseline?'baseline.js':'candidate.js'),'utf8'))));
}

test.before(async()=>{
 temp=fs.mkdtempSync(path.join(os.tmpdir(),'qa-ux02-'));
 bundles={candidate:await build(process.env.QA_UX02_PROVE_BASELINE === '1'),baseline:await build(true)};
 server=http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://local');
  if(u.pathname.endsWith('.js')){res.setHeader('Content-Type','text/javascript; charset=utf-8');return res.end(bundles[u.pathname.slice(1,-3)]);}
  if(u.pathname.startsWith('/api/')){res.setHeader('Content-Type','application/json');res.statusCode=409;return res.end(JSON.stringify({error:'Enter a valid email address.'}));}
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div><script src="/'+(u.searchParams.get('baseline')?'baseline':'candidate')+'.js"></script></body></html>');
 });server.listen(0,'127.0.0.1');await once(server,'listening');origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM??chromium.executablePath()});
});
test.after(async()=>{await browser?.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}if(temp)fs.rmSync(temp,{recursive:true,force:true});});
async function pageFor(route,scenario='default',locale='en',baseline=false){
 const page=await browser.newPage();await page.addInitScript(l=>localStorage.setItem('exp_lang',l),locale);
 await page.goto(`${origin}/?route=${route}&scenario=${scenario}${baseline?'&baseline=1':''}`);
 await page.locator('main').waitFor();await page.waitForFunction(l=>document.documentElement.lang===l,locale);return page;
}
async function stepTo(page, index) {
 await page.locator('nav[aria-label] ol button').nth(index).click();
 // Review/sign waits for the existing reload request; compare settled screens.
 await page.waitForFunction(index => {
  const text=document.querySelector('nav[aria-label] .font-bold')?.textContent??'';
  return text.startsWith(`Step ${index+1} of 10:`)||text.startsWith(`Paso ${index+1} de 10:`);
 }, index);
}
async function snapshot(page){return page.evaluate(()=>{
 const root=document.querySelector('#root').cloneNode(true);root.querySelectorAll('[role=group][aria-label="Choose language"]').forEach(n=>n.remove());
 return {text:root.textContent.replace(/\s+/g,' ').trim(),controls:[...root.querySelectorAll('a,input,select,textarea,button,canvas')].map(n=>({tag:n.tagName,name:n.getAttribute('name'),href:n.getAttribute('href'),type:n.getAttribute('type'),placeholder:n.getAttribute('placeholder'),aria:n.getAttribute('aria-label'),required:n.hasAttribute('required'),disabled:n.hasAttribute('disabled'),value:n.value??null}))};
});}
const scenarios={clinics:['default','empty','unavailable','full','closed','unlimited','mixed','walkin'],continue:['empty','new','default','submitted','staff_review','approved','declined_for_program','referred','withdrawn','needs_information'],register:['new','confirmed','waitlisted','received','cancelled','declined','full','closed','phone','text','either'],intake:['new','default','noncitizen','signed','submitted','staff_review','approved','declined_for_program','referred','withdrawn','needs_information']};

test('all four actual routes preserve English copy/navigation/controls against the accepted baseline',async()=>{
 for(const [route,variants] of Object.entries(scenarios))for(const scenario of variants){
  const a=await pageFor(route,scenario,'en',true),b=await pageFor(route,scenario);
  try{assert.deepEqual(await snapshot(b),await snapshot(a),`${route}/${scenario}`);
   if(route==='intake'&&['default','noncitizen','signed','new','needs_information'].includes(scenario))for(let step=1;step<10;step++){
    await stepTo(a,step);await stepTo(b,step);
    assert.deepEqual(await snapshot(b),await snapshot(a),`${route}/${scenario}/step${step}`);
   }
  }finally{await a.close();await b.close();}
 }
});

async function assertSpanish(page,label){
 const nodes=await page.evaluate(()=>{const values=[];const w=document.createTreeWalker(document.querySelector('#root'),NodeFilter.SHOW_TEXT);while(w.nextNode())values.push(w.currentNode.textContent.trim());document.querySelectorAll('[placeholder],[aria-label]').forEach(n=>values.push(n.getAttribute('placeholder'),n.getAttribute('aria-label')));return values.filter(Boolean);});
 // Exact controlled strings, not a whole-page English-word detector. Proper
 // names, state labels, entered data and partner-authored text are excluded.
 for(const [,p] of pairs)if(p.es!==p.en&&!p.en.includes('{'))assert.ok(!nodes.includes(p.en),`${label}: English fallback ${p.en}`);
 assert.ok(nodes.includes('Mi solicitud'),label);
 assert.ok(nodes.includes('Mississippi Volunteer Lawyers Project'), 'organization name remains a name');
 const body=await page.locator('body').textContent();
 if(!label.includes('/empty')&&!label.includes('/unavailable')&&!label.includes('selector')) assert.ok(body.includes('Partner clinic name'), `${label}: partner event name preserved`);
}
test('Spanish routes, selector, conditional steps and errors use the controlled corpus',async()=>{
 for(const [route,variants] of Object.entries(scenarios))for(const scenario of variants){
  const page=await pageFor(route,scenario,'es');
  try{await assertSpanish(page,`${route}/${scenario}`);
   if(route==='intake'&&['default','noncitizen','signed','new','needs_information'].includes(scenario))for(let step=1;step<10;step++){
    await stepTo(page,step);await assertSpanish(page,`${route}/${scenario}/step${step}`);
   }
  }finally{await page.close();}
 }
 const page=await pageFor('register','new');try{
  await page.getByRole('button',{name:'Usar español',exact:true}).click();await page.waitForFunction(()=>document.documentElement.lang==='es');
  assert.equal(await page.evaluate(()=>localStorage.getItem('exp_lang')),'es');await assertSpanish(page,'selector');
  await page.locator('button[type=submit]').click();await page.getByRole('alert').waitFor();assert.equal(await page.getByRole('alert').innerText(),'Ingrese una dirección de correo electrónico válida.');
  await page.getByRole('button',{name:'Usar inglés',exact:true}).click();await page.waitForFunction(()=>document.documentElement.lang==='en');
  assert.equal(await page.getByRole('alert').innerText(),'Enter a valid email address.');
 }finally{await page.close();}
});

// Use the rendering engine's Intl data, including its default timezone when none is specified.
async function browserDate(page,locale,options){
 return page.evaluate(({locale,options,timestamp})=>new Intl.DateTimeFormat(locale,options).format(new Date(timestamp)),{
  locale:locale==='es'?'es-US':'en-US',options,timestamp:'2026-09-28T16:05:00Z',
 });
}
test('dates use en-US/es-US with unchanged timezone and staff shared components remain English',async()=>{
 for(const locale of ['en','es']){
  const page=await pageFor('clinics','default',locale);try{const expected=await browserDate(page,locale,{dateStyle:'full',timeStyle:'short',timeZone:'America/Chicago'});assert.ok((await page.locator('body').textContent()).includes(expected));}finally{await page.close();}
  for(const [route,scenario] of [['continue','approved'],['intake','submitted'],['intake','signed']]) {
   const dated=await pageFor(route,scenario,locale);try {
    if(scenario==='signed') await stepTo(dated,9);
    const options=scenario==='signed'?{dateStyle:'medium',timeStyle:'short'}:route==='intake'?{dateStyle:'long',timeStyle:'short'}:{dateStyle:'medium'};
    const expected=await browserDate(dated,locale,options);
    assert.ok((await dated.locator('body').textContent()).includes(expected),`${route}/${scenario}/${locale}`);
    if(scenario==='submitted') assert.ok((await dated.locator('body').textContent()).includes(await browserDate(dated,locale,{dateStyle:'medium'})));
   } finally {await dated.close();}
  }
  const recovery=await pageFor('recovery','default',locale);try{assert.ok((await recovery.locator('body').textContent()).includes(oldRuntime.t(locale,'legal_aid.device_reset_required')));}finally{await recovery.close();}
 }
 const a=await pageFor('staff','default','en',true),b=await pageFor('staff','default','es');try{assert.deepEqual(await snapshot(b),await snapshot(a));}finally{await a.close();await b.close();}
});
