import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {CLINIC_SETUP} from './rcap-clinic-setup-only-boundary.mjs';
import {TOOLBAR_LOADER,TURNSTILE_LOADER} from './rcap-clinic-resume-network-policy.mjs';
import {createClinicRequestGuard} from './rcap-clinic-setup-request-guard.mjs';
test('real browser in-memory fixtures: both contexts suppress exact optional scripts and complete a permitted read without network',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.RCAP_BROWSER_CHROMIUM??'/usr/bin/google-chrome'});
 try {
  for(const actor of ['admin','participant']) {
   const context=await browser.newContext();const events=[],failures=[],forwards=[];
   const captchaPolicy={project:CLINIC_SETUP.project,serverCaptchaRequired:false,frontend:{applicationSha:CLINIC_SETUP.app,
    deploymentId:CLINIC_SETUP.deploymentId,clientCaptchaRequired:false,widgetSiteKeyConfigured:true}};
   const guard=createClinicRequestGuard({actor,captchaPolicy,env:{},stage:()=> 'fixture_read',events,requestFailures:failures});
   const endpoint=`/api/clinic/events/${CLINIC_SETUP.event}`;
   await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    assert.equal(url.origin,CLINIC_SETUP.origin,'fixture must not forward any network request');
    return route.fulfill({status:200,contentType:url.pathname===endpoint?'application/json':'text/html',body:url.pathname===endpoint?'{}':
     `<!doctype html><h1>In-memory fixture only</h1><script>setTimeout(()=>{for(const address of ${JSON.stringify([TOOLBAR_LOADER,TURNSTILE_LOADER])}){const node=document.createElement('script');node.src=address;document.head.append(node);}setTimeout(async()=>{const r=await fetch('${endpoint}');window.fixtureRead=r.status===200;},80);},20);</script>`});
   });
   await context.route('**/*',route=>guard.route({request:()=>route.request(),abort:reason=>route.abort(reason),fallback:()=>route.fallback(),
    continue:async()=>{forwards.push('external_forward_forbidden');await route.abort();}}));
   const page=await context.newPage();page.on('requestfailed',guard.requestFailed);page.on('console',guard.consoleError);page.on('pageerror',guard.pageError);
   const next=actor==='admin'?`/partner/clinic/${CLINIC_SETUP.event}`:`/clinic/${CLINIC_SETUP.slug}`;
   await page.goto(CLINIC_SETUP.origin+'/expungement-ai/sign-in?mode=signin&next='+encodeURIComponent(next));
   await page.waitForFunction(()=>window.fixtureRead===true);
   guard.assertNoCritical();assert.equal(forwards.length,0);assert.equal(failures.length,2);
   assert.ok(failures.every(f=>f.outcome==='optional_request_failed'));await context.close();
  }
 } finally {await browser.close();}
});
