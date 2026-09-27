import {createHmac} from 'node:crypto';
import nodeTest from 'node:test';
const test = (name, run) => nodeTest(name, { timeout: 25000 }, run);
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { once } from 'node:events';
import { spawn, execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import ts from 'typescript';
import { NextResponse, NextRequest } from 'next/server.js';
import { fixture } from './clinic-reset-route-fixture.mjs';
const proxyModule={exports:{}};
new Function('require','module','exports',ts.transpileModule(fs.readFileSync('src/proxy.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>name==='next/server'?{NextResponse}: {isRcapPartnerOnboardingEnabled:()=>false,shouldUseStaticWeMustVoteLanding:()=>false,shouldUseStaticMvlpLanding:()=>false},proxyModule,proxyModule.exports);
const compiled = process.env.CLINIC_PRODUCT_FIXTURE;
const before = process.env.CLINIC_BEFORE_FIXTURE;
assert.ok(compiled && before, 'exact compiled before and after fixtures required');
assert.deepEqual(fs.readFileSync(path.join(before,'src/components/expungement-ai/ConsumerSignInForm.tsx')),execFileSync('git',['show','0f23a0ca4d6eac7d50a0466d8f2664f9e63a25c7:src/components/expungement-ai/ConsumerSignInForm.tsx']));
for (const file of ['src/components/expungement-ai/ConsumerSignInForm.tsx', 'src/components/clinic-mode/ClinicPrivacyBoundary.tsx', 'src/lib/clinic-mode/device-reset.mjs']) assert.deepEqual(fs.readFileSync(path.join(compiled, file)), fs.readFileSync(file));
const defer = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
async function site({ baseline = false, scripts = 'ready', fault = null, required = false } = {}) {
  const root = baseline ? before : required ? process.env.CLINIC_REQUIRED_FIXTURE : compiled, f = fixture(), gate = defer(), scriptArrived = defer(), closeArrived = defer(), committed = defer(), responseGate = defer();
  const portProbe=http.createServer();portProbe.listen(0,'127.0.0.1');await once(portProbe,'listening');const nextPort=portProbe.address().port;await new Promise(r=>portProbe.close(r));
  const next=spawn(process.execPath,[path.resolve('node_modules/next/dist/bin/next'),'start','-H','127.0.0.1','-p',String(nextPort)],{cwd:root,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{let log='';next.stdout.on('data',d=>{log+=d;if(log.includes('Ready'))resolve()});next.once('exit',code=>reject(Error('fixture Next failed '+code)));next.once('error',reject)});
  let released = scripts === 'ready', closeGate = null;
  const requests = [];
  const server = http.createServer(async (req, res) => {
    try {
      const u = new URL(req.url, origin);
      requests.push({ path: u.pathname, method: req.method, query: [...u.searchParams.keys()] });
      if ((req.headers.cookie??'').includes('clinic_reset_pending=1') && !u.pathname.startsWith('/_next/')) {
        const gate=await proxyModule.exports.proxy(new NextRequest(u,{headers:req.headers}));
        if(gate.status!==200){res.writeHead(gate.status,Object.fromEntries(gate.headers));return res.end(await gate.text());}
      }
      if (u.pathname.startsWith('/_next/')) {
        const file = path.join(root, '.next', u.pathname.slice(7));
        res.setHeader('Content-Type', u.pathname.endsWith('.js') ? 'application/javascript' : 'text/css');
        return res.end(fs.readFileSync(file));
      }
      if (u.pathname === '/api/clinic/session/reset') {
        let body = ''; for await (const chunk of req) body += chunk;
        const action = JSON.parse(body).action;
        if (action === 'prepare' && fault === 'before-prepare') return req.socket.destroy();
        f.jar.clear(); for (const entry of (req.headers.cookie ?? '').split(';')) { const at = entry.indexOf('='); if (at > 0) f.jar.set(entry.slice(0, at).trim(), entry.slice(at + 1)); }
        if (action === 'close') { closeArrived.resolve(); if (closeGate) await closeGate.promise; }
        const response = await f.POST(new NextRequest(u, { method: 'POST', headers: req.headers, body }));
        if (action === 'prepare' && fault === 'lost-prepare') return req.socket.destroy();
        if (fault === 'hold-response' && action === 'close') { committed.resolve(); await responseGate.promise; fault = null; }
        if (fault === 'lost-close' && action === 'close') { return req.socket.destroy(); }
        res.statusCode = response.status;
        for (const [key, value] of response.headers) if (key !== 'set-cookie') res.setHeader(key, value);
        res.setHeader('Set-Cookie', response.headers.getSetCookie());
        return res.end(await response.text());
      }
      if (u.pathname === '/api/auth/sign-in-fallback') { assert.equal(req.method, 'POST'); res.statusCode = 400; return res.end('Secure sign-in requires JavaScript'); }
      if(u.pathname==='/clinic'||u.pathname.startsWith('/clinic/')){
        const response=await fetch(`http://127.0.0.1:${nextPort}`+u.pathname+u.search,{redirect:'manual',headers:{cookie:req.headers.cookie??''}});
        res.statusCode=response.status;for(const [k,v]of response.headers)if(!['content-encoding','content-length','transfer-encoding','set-cookie'].includes(k))res.setHeader(k,v);res.setHeader('set-cookie',response.headers.getSetCookie());return res.end(Buffer.from(await response.arrayBuffer()));
      }
      let route = u.pathname;

      const file = path.join(root, '.next/server/app', `${route === '/' ? 'index' : route.slice(1)}.html`);
      res.setHeader('Content-Type', 'text/html');
      res.end(fs.existsSync(file) ? fs.readFileSync(file) : '<h1>Destination</h1>');
    } catch (error) { res.statusCode = 500; res.end(String(error)); }
  });
  let origin;
  server.listen(0, '127.0.0.1'); await once(server, 'listening'); origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  context.setDefaultTimeout(10000);
  await context.route('https://challenges.cloudflare.com/**', route => route.abort());
  await context.route('**/_next/**/*.js', async route => {
    if (!released) { scriptArrived.resolve(); if (scripts === 'failed') return route.abort(); await gate.promise; }
    await route.continue().catch(() => {});
  });
  return { origin, context, browser, f, requests, scriptArrived: scriptArrived.promise, closeArrived: closeArrived.promise, committed: committed.promise, releaseResponse: () => responseGate.resolve(),
    recoverNetwork() { fault = null; }, holdClose() { closeGate = defer(); }, releaseClose() { closeGate?.resolve(); },
    release() { released = true; gate.resolve(); },
    async participant() { f.issueAtStart(); await context.addCookies([...f.jar].map(([name, value]) => ({ name, value, url: origin, httpOnly: !name.startsWith('sb-'), expires: name==='clinic_session'||name==='clinic_device' ? Math.floor(Date.now()/1000)+1800 : undefined }))); const p = await context.newPage(); await p.goto(origin + '/privacy'); await p.getByText('Private participant A matter').waitFor(); return p; },
    async close() { responseGate.resolve(); gate.resolve(); closeGate?.resolve(); await browser.close(); server.closeAllConnections(); await new Promise(r => server.close(r)); next.kill('SIGTERM'); await once(next,'exit'); }
  };
}
async function ready(page, origin, query = 'mode=signin&next=%2Fbriefcase') {
  await page.goto(origin + '/expungement-ai/sign-in?' + query, { waitUntil: 'domcontentloaded' });
  await page.locator('form[data-handler-ready=true]').waitFor();
}
async function credentials(page) { await page.locator('input[name=email]').fill('synthetic@example.invalid'); await page.locator('input[name=password]').fill('synthetic-password'); }

test('BEFORE real compiled form: disabled JavaScript leaks credentials into native GET', async () => {
  const s = await site({ baseline: true }); const c = await s.browser.newContext({ javaScriptEnabled: false });
  try { const p = await c.newPage(); await p.goto(s.origin + '/expungement-ai/sign-in'); await credentials(p); const r = p.waitForRequest(r => new URL(r.url()).searchParams.has('password')); await p.getByRole('button', { name: 'Sign in', exact: true }).click(); assert.equal((await r).method(), 'GET'); }
  finally { await s.close(); }
});

test('AFTER: JavaScript disabled leaves credential inputs and submit disabled, native fallback POST', async () => {
  const s = await site(); const c = await s.browser.newContext({ javaScriptEnabled: false });
  try { const p = await c.newPage(); await p.goto(s.origin + '/expungement-ai/sign-in'); assert.equal(await p.locator('input[name=password]').isDisabled(), true); assert.equal(await p.locator('button[type=submit]').isDisabled(), true); assert.equal(await p.locator('form').getAttribute('method'), 'post'); assert.equal(await p.locator('form').getAttribute('data-handler-ready'), 'false'); assert.ok(s.requests.every(r => !r.query.includes('password'))); }
  finally { await s.close(); }
});

for (const mode of ['delayed', 'failed']) test(`AFTER: ${mode} hydration cannot submit; replacement document starts locked`, async () => {
  const s = await site({ scripts: mode });
  try { const p = await s.context.newPage(); await p.goto(s.origin + '/expungement-ai/sign-in', { waitUntil: 'domcontentloaded' }); await s.scriptArrived; assert.equal(await p.locator('input[name=password]').isDisabled(), true); assert.equal(await p.locator('button[type=submit]').isDisabled(), true);
    await p.goto(s.origin + '/expungement-ai/sign-in?replacement=1', { waitUntil: 'commit' }); await p.locator('form').waitFor(); assert.equal(await p.locator('button[type=submit]').isDisabled(), true);
    if (mode === 'delayed') { s.release(); await p.locator('form[data-handler-ready=true]').waitFor(); assert.equal(await p.locator('button[type=submit]').isEnabled(), true); }
    assert.ok(s.requests.every(r => !r.query.includes('password')));
  } finally { await s.close(); }
});

test('handler loss uses POST even if native submit is forced', async () => {
  const s = await site(); try { const p = await s.context.newPage(); await ready(p, s.origin); await credentials(p); const sent = p.waitForRequest(r => r.url().endsWith('/api/auth/sign-in-fallback')); await p.evaluate(() => HTMLFormElement.prototype.submit.call(document.querySelector('form'))); const request = await sent; assert.equal(request.method(), 'POST'); assert.equal(new URL(request.url()).search, ''); } finally { await s.close(); }
});

for (const mode of ['signin', 'create']) test(`${mode}: real handler submits exactly once and preserves successful save/resume destination`, async () => {
  const s = await site(), gate = defer(), arrived = defer(); let count = 0;
  try {
    await s.context.route('https://hyflxnlhpmiqxvvcoiia.supabase.co/**', async route => {
      count++; arrived.resolve(); await gate.promise;
      const user = { id: '11111111-1111-4111-8111-111111111111', email: 'synthetic@example.invalid' };
      const token = [Buffer.from('{}').toString('base64url'), Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000) + 3600 })).toString('base64url'), 'synthetic'].join('.');
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: token, refresh_token: 'synthetic-refresh', expires_in: 3600, token_type: 'bearer', user }) });
    });
    const p = await s.context.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message)); await ready(p, s.origin, `mode=${mode}&next=%2Fbriefcase%3Fresume%3D1`); await credentials(p);
    await p.evaluate(() => { const form = document.querySelector('form'); form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    await arrived.promise; assert.equal(count, 1); gate.resolve(); await p.waitForURL(u => u.pathname === '/briefcase' && u.searchParams.get('resume') === '1'); assert.equal(count, 1); assert.deepEqual(errors, []);
  } finally { gate.resolve(); await s.close(); }
});

test('magic link and forgot-password preserve claim, locale and continuation', async () => {
  const s = await site(); let authBody, authUrl;
  try { await s.context.route('https://hyflxnlhpmiqxvvcoiia.supabase.co/**', async route => { authBody = route.request().postDataJSON(); authUrl = route.request().url(); await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); });
    const p = await s.context.newPage(); await ready(p, s.origin, 'mode=signin&claim=' + 'a'.repeat(40) + '&next=%2Fbriefcase&locale=es'); await p.locator('input[name=email]').fill('synthetic@example.invalid');
    const href = await p.locator('a[href*="forgot-password"]').getAttribute('href'); assert.ok(href.includes('claim=' + 'a'.repeat(40))); assert.ok(href.includes('locale=es'));
    await p.getByRole('button', { name: 'Email me a secure sign-in link' }).click(); await p.getByText('Check your email for a secure sign-in link.', { exact: false }).waitFor();
    assert.equal(authBody.create_user, false); assert.ok(authUrl.includes('/otp')); assert.ok(decodeURIComponent(authUrl).includes('claim=' + 'a'.repeat(40)));
  } finally { await s.close(); }
});

for (const fault of [null, 'rpcError', 'lookupError', 'lost-close']) test(`real privacy boundary: ${fault ?? 'clean reset'} masks immediately and recovers without exposing previous participant`, async () => {
  const s = await site({ fault });
  try {
    const p = await s.participant(); await p.evaluate(() => { localStorage.setItem('participant', 'A'); sessionStorage.setItem('matter', 'A'); });
    if (fault === 'rpcError' || fault === 'lookupError') s.f.state[fault] = true;
    s.holdClose(); await p.getByRole('button', { name: 'End clinic session / Reset device' }).click(); await Promise.race([fault === 'lookupError' ? p.getByText('Reset is incomplete.', {exact:false}).waitFor() : s.closeArrived, p.getByText('Reset is incomplete.', { exact: false }).waitFor().then(async()=>{throw new Error('closure not reached: '+JSON.stringify(s.requests)+' cookies '+JSON.stringify((await s.context.cookies()).map(c=>c.name)));})]);
    assert.equal(await p.getByText('Private participant A matter').count(), 0); s.releaseClose();
    if (fault) {
      await p.getByText('Reset is incomplete.', { exact: false }).waitFor(); assert.equal(new URL(p.url()).pathname, '/clinic/reset'); assert.equal(await p.getByText('Private participant A matter').count(), 0);
      await p.reload(); await p.getByRole('button', { name: 'Retry device reset' }).waitFor(); assert.equal(await p.getByText('Private participant A matter').count(), 0);
      s.f.state.rpcError = false; s.f.state.lookupError = false; s.recoverNetwork(); await p.getByRole('button', { name: 'Retry device reset' }).click();
    }
    await p.waitForURL(u => u.pathname === '/clinic/test-clinic'); await p.getByRole('heading',{name:'Disposable Clinic event'}).waitFor(); assert.equal(s.f.state.session.status, 'reset'); assert.equal(s.f.state.audits, 1); assert.equal(await p.evaluate(() => localStorage.getItem('participant') === null && sessionStorage.getItem('matter') === null), true);
  } finally { await s.close(); }
});

test('browser cleanup survivor keeps real UI locked, no clean-entry navigation, retry succeeds', async () => {
  const s = await site(); try {
    const p = await s.participant(); await p.evaluate(() => { localStorage.setItem('participant', 'A'); window.originalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage'); Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('cleanup refused'); } }); });
    await p.getByRole('button', { name: 'End clinic session / Reset device' }).click(); await p.getByText('Reset is incomplete.', { exact: false }).waitFor();
    assert.equal(new URL(p.url()).pathname, '/clinic/reset'); assert.equal(await p.getByText('Private participant A matter').count(), 0); assert.equal(s.f.state.audits, 1);
    await p.evaluate(() => { Object.defineProperty(window, 'localStorage', window.originalStorage); }); await p.getByRole('button', { name: 'Retry device reset' }).click(); await p.waitForURL(u => u.pathname === '/clinic/test-clinic'); await p.getByRole('heading',{name:'Disposable Clinic event'}).waitFor(); assert.equal(s.f.state.audits, 1);
  } finally { await s.close(); }
});


test('required CAPTCHA blocks absent token and passes supplied token to real auth handler', async () => {
  assert.ok(process.env.CLINIC_REQUIRED_FIXTURE);
  const s = await site({ required: true }); let auth = 0, payload;
  try {
    await s.context.unroute('https://challenges.cloudflare.com/**');
    await s.context.route('https://challenges.cloudflare.com/**', route => route.fulfill({ contentType: 'application/javascript', body: "window.turnstile={render:(element,options)=>{window.testCaptcha=options;return 'test-widget'},remove:()=>{}};" }));
    await s.context.route('https://hyflxnlhpmiqxvvcoiia.supabase.co/**', async route => { auth++; payload = route.request().postDataJSON(); await route.fulfill({status:400,contentType:'application/json',body:'{"error":"invalid_grant"}'}); });
    const p = await s.context.newPage(); await ready(p,s.origin); await credentials(p); await p.locator('button[type=submit]').click(); await p.getByText('Please complete the security check and try again.').waitFor(); assert.equal(auth,0);
    await p.waitForFunction(()=>Boolean(window.testCaptcha)); await p.evaluate(()=>window.testCaptcha.callback('synthetic-captcha-token')); await p.locator('button[type=submit]').click(); await p.getByText('We could not sign you in.',{exact:false}).waitFor(); assert.equal(auth,1); assert.equal(payload.gotrue_meta_security.captcha_token,'synthetic-captcha-token');
  } finally { await s.close(); }
});

test('EN/ES labels and keyboard-accessible password visibility survive hydration', async () => {
  const s=await site(); try { await s.context.addInitScript(()=>localStorage.setItem('exp_lang','es')); const p=await s.context.newPage(); await ready(p,s.origin); await p.waitForFunction(()=>document.documentElement.lang==='es'); assert.equal(await p.locator('input[name=password]').getAttribute('type'),'password'); const toggle=p.locator('input[name=password]').locator('..').locator('button'); assert.ok((await toggle.getAttribute('aria-label')).length>0); await toggle.focus(); await p.keyboard.press('Enter'); assert.equal(await p.locator('input[name=password]').getAttribute('type'),'text'); assert.notEqual(await p.locator('button[type=submit]').innerText(),'Sign in'); } finally { await s.close(); }
});

test('tab closes after canonical closure but before browser cleanup: new tab resumes durable proof', async () => {
  const s=await site({fault:'hold-response'}); try { const p=await s.participant(); await p.getByRole('button',{name:'End clinic session / Reset device'}).click(); await s.committed; assert.equal(s.f.state.audits,1); await p.close(); s.releaseResponse(); const next=await s.context.newPage(); await next.goto(s.origin+'/clinic/reset'); await next.getByRole('button',{name:'Retry device reset'}).click(); await next.getByRole('heading',{name:'Disposable Clinic event'}).waitFor(); assert.equal(s.f.state.audits,1); assert.equal(await next.getByText('Private participant A matter').count(),0); } finally { await s.close(); }
});

test('reset in one tab immediately masks the other participant tab',async()=>{
 const s=await site();try{const first=await s.participant();const second=await s.context.newPage();await second.goto(s.origin+'/privacy');await second.getByText('Private participant A matter').waitFor();s.holdClose();await first.getByRole('button',{name:'End clinic session / Reset device'}).click();await s.closeArrived;await second.locator('[data-clinic-locked=true]').waitFor();assert.equal(await second.getByText('Private participant A matter').count(),0);s.releaseClose();await first.getByRole('heading',{name:'Disposable Clinic event'}).waitFor();assert.equal(await second.getByText('Private participant A matter').count(),0);}finally{await s.close();}
});

test('successful authentication claims the pending result once and opens its exact matter',async()=>{
 const s=await site();let claims=0;try{
  const destination='/briefcase/matters/11111111-1111-4111-8111-111111111111';
  await s.context.route('**/api/expungement-ai/screening/pending/claim',async route=>{claims++;assert.equal(route.request().postDataJSON().claimToken,'a'.repeat(40));await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({redirectTo:destination})});});
  await s.context.route('https://hyflxnlhpmiqxvvcoiia.supabase.co/**',async route=>{const user={id:'11111111-1111-4111-8111-111111111111',email:'synthetic@example.invalid'};const token=[Buffer.from('{}').toString('base64url'),Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test'].join('.');await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:token,refresh_token:'test',expires_in:3600,token_type:'bearer',user})});});
  const p=await s.context.newPage();await ready(p,s.origin,'mode=signin&claim='+'a'.repeat(40));await credentials(p);await p.locator('button[type=submit]').click();await p.waitForURL(u=>u.pathname===destination);assert.equal(claims,1);assert.equal(new URL(p.url()).search,'');
 }finally{await s.close();}
});

for(const fault of ['before-prepare','lost-prepare','authError','lookupError'])test('preparation fault preserves readable auth and eventually completes: '+fault,async()=>{
 const s=await site({fault});try{
  const p=await s.participant();if(['authError','lookupError'].includes(fault))s.f.state[fault]=true;
  assert.ok((await p.evaluate(()=>document.cookie)).includes('sb-test=auth-a'));
  await p.getByRole('button',{name:'End clinic session / Reset device'}).click();await p.getByText('Reset is incomplete.',{exact:false}).waitFor();
  assert.ok((await s.context.cookies()).some(c=>c.name==='sb-test'&&!c.httpOnly));assert.equal(s.f.state.audits,0);
  const cookies=await s.context.cookies(),requests=s.requests.length;
  await p.evaluate(()=>{window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('focus'));});
  await p.reload();await p.getByRole('button',{name:'Retry device reset'}).waitFor();
  const current=await s.context.cookies();for(const name of ['clinic_reset_pending','clinic_reset_recovery'])assert.equal(current.find(c=>c.name===name)?.expires,cookies.find(c=>c.name===name)?.expires);
  assert.equal(s.requests.slice(requests).filter(r=>r.path==='/api/clinic/session/reset').length,0);
  s.f.state.authError=false;s.f.state.lookupError=false;s.recoverNetwork();await p.getByRole('button',{name:'Retry device reset'}).click();await p.waitForURL(u=>u.pathname==='/clinic/test-clinic');await p.getByRole('heading',{name:'Disposable Clinic event'}).waitFor();assert.equal(s.f.state.audits,1);
 }finally{await s.close();}
});
test('actual cookie accessibility and expired Clinic cookies: retained start proof completes reset',async()=>{
 const s=await site();try{const p=await s.participant();const c=await s.context.cookies();assert.ok(c.find(x=>x.name==='clinic_session').httpOnly);assert.ok(!c.find(x=>x.name==='sb-test').httpOnly);
 await s.context.addCookies(c.filter(x=>['clinic_session','clinic_device'].includes(x.name)).map(x=>({...x,expires:1})));assert.ok(!(await s.context.cookies()).some(x=>x.name==='clinic_session'));
 await p.getByRole('button',{name:'End clinic session / Reset device'}).click();await p.waitForURL(u=>u.pathname==='/clinic/test-clinic');assert.equal(s.f.state.audits,1);
 }finally{await s.close();}
});

for(const scenario of ['already-closed','expired-active','invalid-key-active'])test('browser expiry recovery eventually completes with appropriate authority: '+scenario,async()=>{
 const s=await site();try{
  const p=await s.participant();
  if(scenario==='already-closed'){const response=await s.context.request.post(s.origin+'/api/clinic/session/reset',{data:{action:'close'}});assert.equal(response.status(),200);assert.equal(s.f.state.audits,1);}
  const cookies=await s.context.cookies(),receipt=cookies.find(c=>c.name==='clinic_reset_recovery');const payload=JSON.parse(Buffer.from(receipt.value.split('.')[0],'base64url'));payload.expires=Date.now()-1000;
  const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');receipt.value=encoded+'.'+createHmac('sha256','disposable-reset-signing-key').update('clinic-reset-v1:'+encoded).digest('base64url');
  if(scenario==='invalid-key-active')s.f.state.signingKey='rotated-disposable-key';
  await s.context.addCookies([receipt,...cookies.filter(c=>c.name.startsWith('sb-')||['clinic_session','clinic_device'].includes(c.name)).map(c=>({...c,expires:1})),{name:'clinic_reset_pending',value:'1',url:s.origin}]);
  await p.goto(s.origin+'/clinic/reset');await p.getByRole('button',{name:'Retry device reset'}).click();
  if(scenario!=='already-closed'){
   await p.getByText('Reset needs the original participant',{exact:false}).waitFor();assert.equal(s.f.state.audits,0);
   await s.context.route('https://hyflxnlhpmiqxvvcoiia.supabase.co/**',async route=>{const user={id:s.f.state.owner,email:'synthetic@example.invalid'},token=[Buffer.from('{}').toString('base64url'),Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'test'].join('.');await route.fulfill({status:200,json:{access_token:token,refresh_token:'new-auth',expires_in:3600,token_type:'bearer',user}});});
   await p.getByRole('link',{name:'Original participant: sign in to finish reset'}).click();await p.locator('form[data-handler-ready=true]').waitFor();await credentials(p);await p.locator('button[type=submit]').click();await p.waitForURL(u=>u.pathname==='/clinic/reset');await p.getByRole('button',{name:'Retry device reset'}).click();
  }
  await p.waitForURL(u=>u.pathname==='/clinic/test-clinic');await p.getByRole('heading',{name:'Disposable Clinic event'}).waitFor();assert.equal(s.f.state.audits,1);
 }finally{await s.close();}
});
for(const event of [null,{id:'event-a',public_slug:'//evil.invalid',status:'published'}])test('reload recovery with missing/invalid event context uses actual safe product entry: '+JSON.stringify(event),async()=>{
 const s=await site();try{const p=await s.participant();s.f.state.rpcError=true;await p.getByRole('button',{name:'End clinic session / Reset device'}).click();await p.getByText('Reset is incomplete.',{exact:false}).waitFor();await p.reload();s.f.state.rpcError=false;s.f.state.event=event;
 await p.getByRole('button',{name:'Retry device reset'}).click();await p.waitForURL(u=>u.pathname==='/clinic');await p.getByRole('heading',{name:'Open your Clinic event'}).waitFor();assert.equal(s.f.state.audits,1);
 await p.getByLabel('Event address name provided by staff').fill('test-clinic');await p.getByRole('button',{name:'Open event',exact:true}).click();await p.waitForURL(u=>u.pathname==='/clinic/test-clinic');await p.getByRole('heading',{name:'Disposable Clinic event'}).waitFor();
 }finally{await s.close();}
});
