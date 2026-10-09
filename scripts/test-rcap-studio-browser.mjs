import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
const origin='https://127.0.0.1:3140',out='/workspaces/training-modules-09-10/output/rcap-journey-20261009';
const {slug}=JSON.parse(fs.readFileSync('/tmp/rcap-journey-program.json'));
const results=[];
for(const [engine,type] of Object.entries({chromium,webkit}))for(const mobile of [false,true])for(const locale of ['en','es']){
 const label=`${engine}-${mobile?'mobile':'desktop'}-${locale}`,browser=await type.launch();
 const options={viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,locale:locale==='es'?'es-US':'en-US'};
 const context=await browser.newContext({ignoreHTTPSErrors:true,...options,storageState:'/tmp/rcap-journey-admin-session.json'});
 const page=await context.newPage();page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(origin+'/internal/partners/onboarding/'+slug);await page.waitForLoadState('networkidle');
  for(const [name,id] of [['Configure program','prefill-heading'],['Preview','launch-prep-panel-co_branded_page'],['Review','launch-prep-panel-artifacts'],['Launch','launch-prep-panel-launch_readiness']]){
   await page.getByRole('navigation',{name:'Launch Studio tasks'}).getByRole('link',{name,exact:true}).click();await page.locator('#'+id).waitFor({state:'visible'});
   await page.waitForFunction(id=>{const top=document.getElementById(id)?.getBoundingClientRect().top;return top>=0&&top<innerHeight},id);
   await page.waitForLoadState("networkidle");await page.reload();await page.locator('#'+id).waitFor({state:'visible'});
  }
  await page.getByRole('button',{name:'Check practice package',exact:true}).click();await page.getByText(/Practice package ready\.|Simulated launch verified\./).waitFor();if(await page.getByRole('checkbox',{name:/I reviewed this fictional program/}).count()){await page.getByRole('checkbox',{name:/I reviewed this fictional program/}).check();await page.getByRole('button',{name:'Simulate launch',exact:true}).click();}await page.getByText(/Simulated launch verified\./).waitFor();await page.screenshot({path:`${out}/${label}-rcap-verified.png`,fullPage:true});
  await page.getByRole('link',{name:'Review',exact:true}).click();await page.getByText('Current review package approved.',{exact:true}).waitFor();assert.equal(await page.getByRole('checkbox',{name:/I reviewed the current/}).count(),0);
  const partner=await browser.newContext({ignoreHTTPSErrors:true,...options,storageState:'/tmp/rcap-journey-partner-session.json'});await partner.addInitScript(locale=>localStorage.setItem('exp_lang',locale),locale);const p=await partner.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(origin+'/partner/onboarding');await p.waitForLoadState('networkidle');await p.waitForTimeout(1000);
  await p.getByRole('link',{name:locale==='es'?'Configurar programa':'Program setup',exact:true}).click();await p.getByText(locale==='es'?'Revisión de LegalEase en curso':'LegalEase review in progress',{exact:true}).waitFor();await p.waitForLoadState("networkidle");await p.waitForTimeout(1000);await p.reload();await p.waitForLoadState('networkidle');await p.getByText(locale==='es'?'Revisión de LegalEase en curso':'LegalEase review in progress',{exact:true}).waitFor();await p.screenshot({path:`${out}/${label}-partner-submitted.png`,fullPage:true});
  assert.deepEqual(errors,[]);results.push({label,passed:true,checks:['top-navigation-first-click','hash-refresh','verified-simulated-launch','unchanged-package-approval-preserved','partner-submission-preserved']});console.log('PASS',label);
 }catch(e){console.log('FAIL',label,e.message);results.push({label,passed:false,error:e.message});await page.screenshot({path:`${out}/${label}-rcap-failed.png`,fullPage:true});}finally{await browser.close();fs.writeFileSync(out+'/rcap-browser-acceptance.json',JSON.stringify(results,null,2));}
}
if(results.some(r=>!r.passed))process.exitCode=1;
