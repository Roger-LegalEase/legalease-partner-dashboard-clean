import assert from 'node:assert/strict';

export const APP_SHA = 'a6a14f4f0359fbe0eb9de0bbb09b3a7937e3224a';
export const PARTNER_SLUG = 'legalease-ordinary-qa-20261024';
const root = `/api/internal/partners/onboarding/phase1/${PARTNER_SLUG}`;
const authority = 'User-authorized internal RCAP acceptance allocation: one screening and one sponsored packet; no external charge.';

export function assertOrdinaryConfiguration(configuration) {
  assert.equal(configuration?.partnerSlug, PARTNER_SLUG);
  assert.match(configuration.workspaceId, /^[0-9a-f-]{36}$/i);
  assert.ok(Number.isInteger(configuration.version) && configuration.version >= 0);
  assert.equal(configuration.policyVersion, 'rcap2.2');
  assert.equal(configuration.operatingModel, 'legalease_managed');
  const d = configuration.data;
  assert.equal(d.program_goals.operating_model, 'legalease_managed');
  assert.equal(d.program_goals.service_mode, 'sponsored_packets');
  assert.equal(d.program_goals.participation_mode, 'online');
  assert.equal(d.program_goals.external_agreement_applicability, 'not_applicable');
  assert.ok(d.program_goals.operator_authority_reference?.length >= 10);
  assert.deepEqual(d.geography_audience_language_accessibility.jurisdictions, ['MS']);
  assert.equal(d.geography_audience_language_accessibility.enable_spanish, false);
  assert.equal(d.access_sponsorship_capacity.participant_access_model, 'open');
}

export function materialReceipt(operations) {
  assert.equal(operations?.identity?.partnerSlug, PARTNER_SLUG);
  assert.equal(operations.view.version, operations.identity.version);
  const materials = operations.view.materials;
  assert.equal(materials.length, 2);
  assert.deepEqual(materials.map(m => m.type).sort(), ['co_branded_page_configuration', 'implementation_brief']);
  for (const m of materials) {
    assert.match(m.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    assert.ok(Number.isInteger(m.version) && m.version > 0);
    assert.match(m.hash, /^[0-9a-f]{64}$/i);
    assert.equal(m.issues?.length ?? 0, 0);
  }
  assert.ok(operations.view.reviewToken);
  return materials.map(({ type, id, version, hash }) => ({ type, id, version, hash })).sort((a,b) => a.type.localeCompare(b.type));
}

// The controller owns target/source/DB admission and genuine normal sign-in.
// This module has no CLI, credentials, SQL, deployment, or automatic mutation retries.
export async function runOrdinaryAdmin({ page, participantPage, origin, admit, checkpoint, provisionBody }) {
  assert.equal(typeof admit, 'function');
  assert.equal(typeof checkpoint, 'function');
  assert.equal(new URL(origin).origin, origin);
  assert.equal(provisionBody?.partnerSlug, PARTNER_SLUG);
  assert.equal(provisionBody.operatingModel, 'legalease_managed');
  assert.ok(provisionBody.idempotencyKey);
  assert.deepEqual(provisionBody.jurisdictions, ['MS']);
  assert.equal(provisionBody.enableSpanish, false);
  assert.equal(provisionBody.administratorEmail, '');
  assert.equal(provisionBody.administratorName, '');
  await admit({ applicationSha: APP_SHA, origin, partnerSlug: PARTNER_SLUG });
  assert.equal(new URL(page.url()).origin, origin);
  const api = async path => {
    const reply = await page.evaluate(async path => {
      const r = await fetch(path, { cache: 'no-store' });
      return { status: r.status, body: await r.json() };
    }, path);
    assert.equal(reply.status, 200, `Readback failed: ${path}`);
    return reply.body;
  };
  const mutate = async (path, button, stage) => {
    await checkpoint({ stage: `${stage}_pending`, partnerSlug: PARTNER_SLUG });
    const request = page.waitForRequest(r => new URL(r.url()).pathname === path && r.method() === 'POST');
    const response = page.waitForResponse(r => new URL(r.url()).pathname === path && r.request().method() === 'POST');
    await button.click();
    const body = (await request).postDataJSON();
    await checkpoint({ stage: `${stage}_submitted`, requestId: body.requestId, expectedVersion: body.expectedVersion ?? body.workspaceVersion ?? body.version });
    assert.equal((await response).status(), 200, `${stage} failed or uncertain: reconcile this exact request before another mutation`);
  };
  await checkpoint({ stage: 'provision_pending', requestId: provisionBody.idempotencyKey });
  const provision = await page.evaluate(async body => {
    const r = await fetch('/api/internal/partners/provisioning', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(body) });
    const b = await r.json();
    return { status: r.status, ok: b.ok, result: b.result };
  }, provisionBody);
  assert.equal(provision.status, 200);
  assert.equal(provision.ok, true);
  assert.equal(provision.result.partnerSlug, PARTNER_SLUG);
  // A resumed provisioning attempt needs operator reconciliation, never fresh allocation.
  assert.equal(provision.result.created, true, 'Existing program requires reconciliation before continuing');
  await checkpoint({ stage: 'provision_created', partnerSlug: PARTNER_SLUG });
  await page.goto(`${origin}/internal/partners/onboarding/${PARTNER_SLUG}`);
  await page.locator('#configure-program').waitFor();
  await page.locator('#program-field-service_mode select').selectOption('sponsored_packets');
  await page.locator('#program-field-participation_mode select').selectOption('online');
  await page.locator('#program-field-participant_access_model select').selectOption('open');
  await page.locator('#program-field-operator_authority_reference').evaluate(el => {
    for (let p = el.parentElement; p; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true;
  });
  await page.locator('#program-field-operator_authority_reference textarea, #program-field-operator_authority_reference input').fill(authority);
  await mutate(`${root}/configuration`, page.getByRole('button', { name: 'Save program', exact: true }), 'configuration_save');
  const configured = (await api(`${root}/configuration`)).configuration;
  assertOrdinaryConfiguration(configured);
  await checkpoint({ stage: 'configuration_saved', workspaceId: configured.workspaceId, version: configured.version });
  await page.reload();
  const resumed = (await api(`${root}/configuration`)).configuration;
  assert.deepEqual(resumed, configured, 'Reload must retain the saved configuration');
  await page.locator('#program-capacity').waitFor();
  await page.locator('input[name="screeningsAllowed"]').fill('1');
  await page.locator('input[name="packetCap"]').fill('1');
  await page.locator('input[name="authorityReference"]').fill(authority);
  await mutate(`${root}/launch-capacity`, page.getByRole('button', { name: 'Save sponsored allocation', exact: true }), 'allocation');
  await page.reload();
  const prepare = page.getByRole('button', { name: /^(Generate Materials|Update Materials)$/ });
  if (await prepare.count()) {
    await mutate(`${root}/program`, prepare, 'materials_prepare');
    await page.reload();
  }
  const before = (await api(`${root}/program`)).operations;
  const materials = materialReceipt(before);
  assert.equal(before.canStart, true);
  assert.equal(before.view.commercial.screenings, 1);
  assert.equal(before.view.commercial.packets, 1);
  for (const m of materials) {
    const article = page.locator(`[data-material-id="${m.id}"]`);
    assert.equal(await article.getAttribute('data-material-version'), String(m.version));
    assert.equal(await article.getAttribute('data-material-hash'), m.hash);
    assert.ok((await article.innerText()).trim().length > 0);
  }
  await checkpoint({ stage: 'current_materials_reviewed', workspaceId: configured.workspaceId, version: before.identity.version, materials });
  await admit({ applicationSha: APP_SHA, origin, partnerSlug: PARTNER_SLUG });
  await page.getByRole('checkbox', { name: 'Confirm operating scope and current materials', exact: true }).check();
  await mutate(`${root}/program`, page.getByRole('button', { name: 'Start Program', exact: true }), 'start');
  await page.reload();
  const after = (await api(`${root}/program`)).operations;
  assert.equal(after.view.decision.live, true);
  assert.deepEqual(materialReceipt(after), materials);
  assert.equal(after.view.capabilities.issue_sponsored_packet, true);
  await checkpoint({ stage: 'program_live', workspaceId: configured.workspaceId, materials });
  const landing = await participantPage.goto(`${origin}/p/${PARTNER_SLUG}`);
  assert.equal(landing.status(), 200);
  const cta = participantPage.locator(`a[href="/intake/${PARTNER_SLUG}"]`);
  assert.equal(await cta.count(), 1);
  await cta.click();
  await participantPage.waitForURL(url => url.origin === origin && url.pathname === `/intake/${PARTNER_SLUG}`);
  await checkpoint({ stage: 'ordinary_participant_intake_reached', participantIntake: `/intake/${PARTNER_SLUG}`, journeyComplete: false });
  return { partnerSlug: PARTNER_SLUG, workspaceId: configured.workspaceId, materials, journeyComplete: false };
}
