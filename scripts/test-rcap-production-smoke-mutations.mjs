#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Execute the production helper against the actual application route, using
// the existing isolated auth/DB fixture. No network, DB, or signing service.
async function resetProtocolRegression() {
  const { runCleanDeviceReset } = await import(process.env.RCAP_SMOKE_RESET_TEST_MODULE ?? './rcap-production-smoke-reset.mjs');
  const { fixture } = await import('./security/clinic-reset-route-fixture.mjs');
  const { NextRequest } = await import('next/server.js');
  let count = 0;
  const check = async (name, fn) => { await fn(); count++; console.log(`ok   reset protocol: ${name}`); };
  function harness({ alter, stripRecovery = false, fallback = false, throwSecret = false } = {}) {
    const f = fixture(); f.jar.clear();
    const actions = [], issued = [], logs = [], requestNames = [];
    const authSentinel = 'disposable-auth-must-not-escape';
    async function request(pathname, options) {
      assert.equal(pathname, '/api/clinic/session/reset');
      assert.equal(options.method, 'POST'); assert.equal(options.redirect, 'manual');
      assert.deepEqual(Object.keys(options.body).sort(), ['action', 'reason']);
      assert.equal(options.body.reason, 'staff_reset');
      const action = options.body.action;
      assert.equal(action, ['prepare', 'close', 'complete'][actions.length]); actions.push(action);
      if (action === 'prepare') assert.equal(options.cookie, undefined);
      if (action === 'close') assert.ok(options.cookie?.includes('clinic_reset_recovery='), 'close must carry issued recovery');
      f.jar.clear();
      for (const part of (options.cookie ?? '').split(';').filter(Boolean)) {
        const at = part.indexOf('='), name = part.slice(0, at).trim(), value = part.slice(at + 1);
        assert.ok(['clinic_reset_recovery', 'clinic_reset_pending'].includes(name), 'only reset authority is sent');
        if (name === 'clinic_reset_recovery') assert.ok(issued.includes(value), 'only authentic response receipt is reused');
        if (!(stripRecovery && name === 'clinic_reset_recovery')) f.jar.set(name, value);
      }
      requestNames.push([...f.jar.keys()]);
      if (throwSecret && action === 'close') throw Error(issued[0] + authSentinel);
      const response = await f.POST(new NextRequest('http://localhost' + pathname, {
        method: 'POST', headers: { 'content-type': 'application/json', cookie: [...f.jar].map(([k,v]) => `${k}=${v}`).join('; ') },
        body: JSON.stringify(options.body)
      }));
      const body = await response.json();
      const data = { status: response.status, body, cookies: response.headers.getSetCookie(), clear: response.headers.get('clear-site-data') };
      for (const cookie of response.cookies.getAll()) if (cookie.name === 'clinic_reset_recovery' && cookie.value) issued.push(cookie.value);
      if (alter) alter(data, action);
      return { status: data.status, json: async () => data.body, headers: {
        ...(fallback ? {} : { getSetCookie: () => data.cookies }),
        get: name => name === 'clear-site-data' ? data.clear : name === 'set-cookie' ? data.cookies.join(', ') : null
      } };
    }
    return { f, actions, issued, logs, requestNames, authSentinel, async run() {
      const originals = Object.fromEntries(['log','error','warn','info','debug'].map(k => [k, console[k]]));
      let result;
      try {
        for (const key of Object.keys(originals)) console[key] = (...args) => logs.push(args.join(' '));
        result = await runCleanDeviceReset(request);
      } finally { Object.assign(console, originals); }
      const serialized = JSON.stringify(result);
      assert.ok(Object.values(result).every(value => typeof value === 'boolean' || typeof value === 'number'), 'evidence contains only booleans/statuses');
      assert.ok(issued.every(value => !serialized.includes(value)), 'no recovery value in evidence');
      assert.ok(!serialized.includes(authSentinel), 'no auth value in evidence');
      assert.equal(logs.length, 0, 'helper emits no logs, including secret-bearing failures');
      return result;
    } };
  }
  await check('old arbitrary-cookie default close is HTTP 409, never cleanup success', async () => {
    const f = fixture(); f.jar.clear();
    const response = await f.POST(new NextRequest('http://localhost/api/clinic/session/reset', {
      method: 'POST', headers: { cookie: 'clinic_session=synthetic-canary; clinic_device=synthetic-canary; clinic_event=synthetic-canary' },
      body: JSON.stringify({ reason: 'staff_reset' })
    }));
    assert.equal(response.status, 409); assert.equal((await response.json()).success, false);
    assert.equal(response.headers.has('clear-site-data'), false);
    assert.equal(response.cookies.has('clinic_session'), false); assert.equal(f.state.calls, 0);
  });
  await check('real anonymous prepare → close → complete succeeds with opaque issued receipt', async () => {
    const h = harness(), result = await h.run(); assert.equal(result.passed, true);
    for (const key of ['resetPrepared','resetPrepareStateIsNoSession','resetRecoveryCookieIssued','resetCloseSuccess','resetRevocationConfirmed','resetSignOutConfirmed','resetClearSiteDataStorage','resetClinicCookiesCleared','resetCompleteSuccess','resetCleanEntryPathSafe','resetRecoveryRetired']) assert.equal(result[key], true, key);
    assert.deepEqual(h.actions, ['prepare','close','complete']); assert.ok(h.requestNames[1].includes('clinic_reset_pending')); assert.equal(h.f.state.calls, 0); assert.equal(h.f.state.queries.length, 0);
  });
  await check('close without prepare receipt is refused by the actual route', async () => {
    const h = harness({stripRecovery:true}), result = await h.run();
    assert.equal(result.resetCloseStatus, 409); assert.equal(result.passed, false); assert.deepEqual(h.actions, ['prepare','close']);
  });
  for (const [name, alter, last] of [
    ['prepare HTTP 409', (d,a) => {if(a==='prepare')d.status=409;}, 'prepare'],
    ['prepare prepared false', (d,a) => {if(a==='prepare')d.body.prepared=false;}, 'prepare'],
    ['prepare state not no_session', (d,a) => {if(a==='prepare')d.body.state='closed';}, 'prepare'],
    ['prepare recovery absent', (d,a) => {if(a==='prepare')d.cookies=d.cookies.filter(c=>!c.startsWith('clinic_reset_recovery='));}, 'prepare'],
    ['prepare recovery expired', (d,a) => {if(a==='prepare')d.cookies=d.cookies.map(c=>c.startsWith('clinic_reset_recovery=')?c+'; Max-Age=0':c);}, 'prepare'],
    ['close HTTP 409', (d,a) => {if(a==='close')d.status=409;}, 'close'],
    ...['success','revocationConfirmed','signOutConfirmed'].map(key=>['close '+key+' false', (d,a)=>{if(a==='close')d.body[key]=false;}, 'close']),
    ['missing Clear-Site-Data', (d,a)=>{if(a==='close')d.clear=null;}, 'close'],
    ['wrong Clear-Site-Data token', (d,a)=>{if(a==='close')d.clear='"not-storage"';}, 'close'],
    ...['clinic_session','clinic_device','clinic_event'].flatMap(key=>[
      [key+' deletion absent',(d,a)=>{if(a==='close')d.cookies=d.cookies.filter(c=>!c.startsWith(key+'='));},'close'],
      [key+' present without deletion',(d,a)=>{if(a==='close')d.cookies=d.cookies.map(c=>c.startsWith(key+'=')?key+'=; Path=/':c);},'close']
    ]),
    ['complete HTTP 409',(d,a)=>{if(a==='complete')d.status=409;},'complete'],
    ['complete success false',(d,a)=>{if(a==='complete')d.body.success=false;},'complete'],
    ...['https://attacker.invalid','//attacker.invalid','/clinic/attacker','/clinic?next=https://attacker.invalid','/clinic/../admin',undefined].map(value=>['unsafe/unassociated cleanEntryPath '+String(value),(d,a)=>{if(a==='complete')d.body.cleanEntryPath=value;},'complete']),
    ...['clinic_reset_recovery','clinic_reset_pending'].map(key=>[key+' retirement absent',(d,a)=>{if(a==='complete')d.cookies=d.cookies.filter(c=>!c.startsWith(key+'='));},'complete'])
  ]) await check(name+' refuses',async()=>{
    const h=harness({alter}),result=await h.run();assert.equal(result.passed,false);assert.equal(h.actions.at(-1),last);
  });
  await check('real route signout failure refuses before complete',async()=>{
    const h=harness();h.f.state.signoutError=true;const result=await h.run();assert.equal(result.passed,false);assert.equal(result.resetSignOutConfirmed,false);assert.deepEqual(h.actions,['prepare','close']);
  });
  await check('combined-header fallback preserves Expires commas and opaque receipt',async()=>{
    assert.equal((await harness({fallback:true}).run()).passed,true);
  });
  await check('Max-Age=0 deletions work without Expires',async()=>{
    const h=harness({alter:(d,a)=>{if(a!=='prepare')d.cookies=d.cookies.map(c=>/Expires=Thu, 01 Jan 1970/i.test(c)?c.replace(/; Expires=[^;]*/i,'')+'; Max-Age=0':c);}});
    assert.equal((await h.run()).passed,true);
  });
  await check('positive Max-Age overrides past Expires (not a deletion)',async()=>{
    const h=harness({alter:(d,a)=>{if(a==='close')d.cookies=d.cookies.map(c=>c.startsWith('clinic_session=')?c+'; Max-Age=60':c);}});
    assert.equal((await h.run()).passed,false);
  });
  await check('close response updates pending cookie jar before complete',async()=>{
    const h=harness({alter:(d,a)=>{if(a==='close')d.cookies.push('clinic_reset_pending=; Max-Age=0');}});
    assert.equal((await h.run()).passed,true);assert.ok(!h.requestNames[2].includes('clinic_reset_pending'));
  });
  await check('nondeleted Clinic cookie after deletion cannot certify cleanup',async()=>{
    const h=harness({alter:(d,a)=>{if(a==='close')d.cookies.push('clinic_session=still-present; Max-Age=60');}});
    assert.equal((await h.run()).passed,false);assert.deepEqual(h.actions,['prepare','close']);
  });
  await check('auth response cookie never joins reset requests or evidence',async()=>{
    const h=harness({alter:(d,a)=>{if(a==='prepare')d.cookies.push('sb-test=disposable-auth-must-not-escape; Path=/');}});
    assert.equal((await h.run()).passed,true);
  });
  await check('exception containing recovery/auth values is reduced to safe failure',async()=>{
    const result=await harness({throwSecret:true}).run();assert.equal(result.passed,false);assert.equal(result.resetProtocolError,true);
  });
  console.log(`smoke reset behavioral regression passed: ${count}/${count}`);
}
await resetProtocolRegression();
if (process.argv.includes('--reset-protocol-only')) process.exit(0);

const files = [
  ".github/workflows/rcap-production-canary.yml",
  ".github/workflows/rcap-f1-ephemeral-staging.yml",
  "scripts/rcap-production-canary-smoke.mjs",
  "scripts/rcap-production-smoke-reset.mjs",
  "scripts/verify-rcap-production-smoke.mjs"
];
const mutations = [
  ["separate phase authorization", "requireProductionMigrationRelease(ROOT_DIR, process.env);", "/* authorization removed */"],
  ["staged deployment", "const STAGED_DEPLOYMENT_ID = RELEASE_CANDIDATE.productionAuthorization?.stagedDeploymentId;", "dpl_wrongstaged"],
  ["rollback deployment", "const ROLLBACK_DEPLOYMENT_ID = RELEASE_CANDIDATE.productionAuthorization?.rollbackDeploymentId;", "dpl_wrongrollback"],
  ["Production project", "wwtwtsmywnckfkdaqqeg", "hyflxnlhpmiqxvvcoiia"],
  ["staged identity", "exact_staged_application_worker_identity", "staged_identity_removed"],
  ["rollback readiness", "rollback_target_is_ready_and_still_active", "rollback_readiness_removed"],
  ["runtime project", "runtime_supabase_origin_is_canonical", "runtime_project_removed"],
  ["health", "staged_health_is_200", "health_removed"],
  ["Clinic readback", "production_clinic_schema_direct_readback", "clinic_readback_removed"],
  ["save/claim readback", "save_claim_schema_read_back_exact", "save_claim_schema_ignored"],
  ["Colorado commerce boundary", "colorado_juvenile_guidance_has_no_commerce", "commerce_boundary_removed"],
  ["Clinic isolation", "clinic_negative_control_isolated", "isolation_removed"],
  ["Clinic helper wiring", "reset.passed,", "true,"],
  ["Clinic staged redirect policy", 'redirect: options.redirect ?? "follow"', 'redirect: "follow"'],
  ["Clinic reset", "clinic_reset_boundary_passed", "reset_removed"],
  ["transaction rollback", "transactional_synthetic_fixture_rolled_back", "rollback_removed"],
  ["real participants", "realParticipantRecordsCreated: false", "realParticipantRecordsCreated: true"],
  ["real charges", "realChargesCreated: false", "realChargesCreated: true"]
];

for (const [name, from, to] of mutations) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-production-smoke-mutation-"));
  try {
    for (const file of files) {
      const destination = path.join(root, file);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(file, destination);
    }
    let mutated = false;
    for (const file of files) {
      const target = path.join(root, file);
      const source = fs.readFileSync(target, "utf8");
      if (source.includes(from)) {
        fs.writeFileSync(target, source.replaceAll(from, to));
        mutated = true;
      }
    }
    assert.equal(mutated, true, `${name}: mutation target absent`);
    const result = spawnSync(process.execPath, ["scripts/verify-rcap-production-smoke.mjs"], {
      cwd: process.cwd(),
      env: { ...process.env, RCAP_PRODUCTION_SMOKE_VERIFY_ROOT: root },
      encoding: "utf8"
    });
    assert.notEqual(result.status, 0, `${name}: verifier accepted mutation`);
    console.log(`ok   ${name} mutation is rejected`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
console.log(`test-rcap-production-smoke-mutations passed: ${mutations.length}/${mutations.length}`);

// Mutation credit requires the actual behavioral suite to reject weakened
// helper predicates, not merely the loss of a marker in source text.
const helperMutations = [
  ['prepare authority', '|| !evidence.resetRecoveryCookieIssued', ''],
  ['prepare state', '|| !evidence.resetPrepareStateIsNoSession', ''],
  ['close success', '|| !evidence.resetCloseSuccess', ''],
  ['revocation', '|| !evidence.resetRevocationConfirmed', ''],
  ['signout', '|| !evidence.resetSignOutConfirmed', ''],
  ['storage cleanup', '|| !evidence.resetClearSiteDataStorage', ''],
  ...['clinic_session','clinic_device','clinic_event'].map(name => [name + ' deletion', "'" + name + "'", '']),
  ['completion success', '&& evidence.resetCompleteSuccess', ''],
  ['trusted entry', '&& evidence.resetCleanEntryPathSafe', ''],
  ['authority retirement', '&& evidence.resetRecoveryRetired', '']
];
const helperSource = fs.readFileSync('scripts/rcap-production-smoke-reset.mjs', 'utf8');
for (const [name, from, to] of helperMutations) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rcap-smoke-reset-mutation-'));
  try {
    assert.ok(helperSource.includes(from), name + ': target exists');
    // For cookie mutants remove the requirement from the actual CLINIC list.
    const mutated = name.endsWith(' deletion')
      ? helperSource.replace(from, '').replace('[, ', '[').replace(', ,', ',').replace(", ]", ']')
      : helperSource.replace(from, to);
    const target = path.join(root, 'reset.mjs'); fs.writeFileSync(target, mutated);
    const result = spawnSync(process.execPath, ['scripts/test-rcap-production-smoke-mutations.mjs', '--reset-protocol-only'], {
      encoding: 'utf8', env: { ...process.env, RCAP_SMOKE_RESET_TEST_MODULE: target }
    });
    assert.notEqual(result.status, 0, name + ': behavioral suite accepted weakened helper');
    assert.ok(result.stderr.includes('AssertionError'), name + ': must fail behavior, not tooling/import');
    assert.ok(result.stdout.includes('real anonymous prepare → close → complete succeeds'), name + ': legitimate sequence must still pass');
    console.log(`ok   ${name} behavioral mutation is rejected`);
  } finally { fs.rmSync(root, {recursive:true, force:true}); }
}
console.log(`smoke reset behavioral mutations passed: ${helperMutations.length}/${helperMutations.length}`);
