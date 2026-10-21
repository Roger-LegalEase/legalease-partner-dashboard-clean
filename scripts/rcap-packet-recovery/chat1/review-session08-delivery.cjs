// Independent delivery delta checks. Source mutations exist only in VM memory.
(async () => {
const { default: fs } = await import('node:fs');
const { default: path } = await import('node:path');
const { default: vm } = await import('node:vm');
const { default: assert } = await import('node:assert/strict');
const { default: crypto } = await import('node:crypto');
const { default: ts } = await import('typescript');
const { createRequire } = await import('node:module');
const requireDependency = createRequire(__filename);
const ROOT = path.resolve(__dirname, '../../..');
const outputArgument = process.argv.find(value => value.startsWith('--out='));
const OUT = outputArgument ? outputArgument.slice('--out='.length) : 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session08/independent-delivery-engineering.json';
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const read = p => fs.readFileSync(path.join(ROOT, p));
const corePath = 'src/lib/rcap/render/packet-delivery.ts';
const core = read(corePath).toString();
const bytes = read('data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/canonical.pdf');
assert.equal(hash(bytes), '348e5677f471acea22dd6643fea1c820db8779f218b2563417682433a8884be2');
const contract = read('src/lib/rcap/render/job-contract.ts').toString();
const source = ts.createSourceFile('contract.ts', contract, ts.ScriptTarget.ES2022, true);
const wanted = new Set(['DELIVERY_AUTHORIZED_ACCOUNTING_RESULTS', 'isDeliverable', 'sha256']);
const selected = source.statements.filter(s => ts.isFunctionDeclaration(s) ? wanted.has(s.name?.text) : ts.isVariableStatement(s) && s.declarationList.declarations.some(d => wanted.has(d.name?.text))).map(s => s.getText(source)).join('\n');
function compile(text, dependencies = {}, globals = {}) {
  const exports = {};
  const result = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
  vm.runInNewContext(result.outputText, { exports, require: name => {
    assert(Object.hasOwn(dependencies, name), 'Unexpected dependency ' + name); return dependencies[name];
  }, Buffer, Response, Request, ReadableStream, Uint8Array, URL, Promise, Error, ...globals });
  return exports;
}
const actualContract = compile(selected, {}, { createHash: crypto.createHash });
const id = '22222222-2222-4222-8222-222222222222';
const owner = 'independent-synthetic-owner';
const base = { id, routeId: 'KY:nonconviction-431076', briefcaseItemId: 'item-one', consumerBriefcaseItemId: 'item-one', consumerVerificationHash: 'current-hash', matterId: 'matter:item-one', partnerId: null, status: 'artifact_validated', deliveryEligibility: 'eligible', accountingResult: 'consumed', outputStoragePath: `synthetic/${id}/${hash(bytes)}.pdf`, outputSha256: hash(bytes) };
const moduleHashes = {};
function loadActual(rel, cache = new Map()) {
  const absolute = path.join(ROOT, rel);
  if (cache.has(absolute)) return cache.get(absolute);
  const text = fs.readFileSync(absolute, 'utf8'); moduleHashes[rel] = hash(text);
  const loadedModule = { exports: {} }; cache.set(absolute, loadedModule.exports);
  const transformed = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const resolver = name => {
    if (name === 'server-only') return {};
    if (name.startsWith('@/')) return loadActual('src/' + name.slice(2) + '.ts', cache);
    if (name.startsWith('.')) {
      const p = path.resolve(path.dirname(absolute), name);
      return loadActual(path.relative(ROOT, fs.existsSync(p) ? p : p + '.ts'), cache);
    }
    return requireDependency(name);
  };
  vm.runInNewContext(transformed, { exports: loadedModule.exports, module: loadedModule, require: resolver, process, Buffer, console, URL, Date, __dirname: path.dirname(absolute), __filename: absolute });
  return loadedModule.exports;
}
function setup(options = {}) {
  const job = { ...base, ...options.job };
  const events = [], admissions = [], itemReads = [];
  let storageReads = 0, verificationReads = 0;
  const service = compile(core, {
    'server-only': {}, '@/lib/rcap/render/job-contract': actualContract,
    '@/lib/rcap/render/commercial-admission': { governPacketDownloadAdmission: request => {
      admissions.push(request); if (options.denyAuthority) throw Error('Explicit synthetic authority denial');
    } },
    '@/lib/rcap/grade-a/packet-specification': { packetSpecificationForTrack: () => null, specificationContentSha256: () => null },
    '@/lib/rcap/render/consumer-delivery-control': { resolveConsumerDeliveryAccess: () => ({ allowed: false }) },
    '@/lib/rcap/render/personalized-packet': { currentPersonalizedVerification: async () => { throw Error('No live database'); } },
    '@/lib/expungement-ai/consumer-identity': { consumerMatterIdForItem: item => 'matter:' + item },
    '@/lib/rcap/render/sponsored-packet': { sponsoredRenderDeliveryReady: async () => false },
    '@/lib/rcap/fulfillment/grade-a-registry': { getCurrentFulfillmentRecord: () => null }
  });
  const current = async item => { verificationReads++; return options.missingVerification ? null : { snapshot: { jurisdiction: 'KY', pathwayId: 'nonconviction-431076' }, hash: 'current-hash', ownerUserId: owner, matterId: 'matter:' + item, alreadyDownloaded: job.status === 'delivered' }; };
  const ports = { getJob: async () => job, userOwnsBriefcaseItem: async user => user === owner && !options.wrongOwner,
    storage: { read: async () => { storageReads++; return options.object === undefined ? bytes : options.object; } },
    recordEvent: async e => { events.push(e); return null; }, ...(options.omitReader ? {} : { getCurrentVerification: current }) };
  return { job, events, admissions, itemReads, service, ports, current, counts: () => ({ storageReads, verificationReads }) };
}
const checks = [];
async function check(name, fn) { try { const measured = await fn(); checks.push({ name, passed: true, ...measured }); } catch (e) { checks.push({ name, passed: false, error: e.message }); } }
async function coreRefusal(name, options, expected) {
  await check(name, async () => {
    const f = setup(options); const decision = await f.service.authorizePacketDownload(f.ports, { jobId: id, userId: owner });
    assert.equal(decision.ok, false); assert.equal(decision.code, expected); assert.equal(f.admissions.length, 0);
    assert(!f.events.some(e => e.eventType === 'delivery_authorized'));
    return { code: decision.code, ...f.counts() };
  });
}
async function handler(kind, options, expectedStatus) {
  const f = setup(options);
  const rel = kind === 'consumer' ? 'src/app/api/expungement-ai/packet/artifacts/[itemId]/route.ts' : 'src/app/api/rcap/packets/[jobId]/download/route.ts';
  const text = read(rel).toString(); moduleHashes[rel] = hash(text);
  const grant = { renderJobId: id, storagePath: f.job.outputStoragePath, expectedSha256: f.job.outputSha256, fileName: 'test\r\nX-Injected: value.pdf', grantId: 'synthetic-grant', ...options.grant };
  const dependencies = {
    'next/server': { NextResponse: Response },
    '@/lib/rcap/briefcase/auth': { getRcapBriefcaseAuthState: async () => ({ isAuthenticated: true, userId: owner }) },
    '@/lib/expungement-ai/privacy/api-session': { requireConsumerBriefcaseApiSession: async () => ({ ok: true, userId: owner }) },
    '@/lib/expungement-ai/private-delivery': { authorizeConsumerArtifactDownload: async () => grant },
    '@/lib/expungement-ai/briefcase': { getBriefcaseItem: async (user, item) => { f.itemReads.push({ user, item }); return user === owner ? { id: item } : null; } },
    '@/lib/expungement-ai/packet-information': { requireCurrentPacketVerification: async (_, item) => {
      if (options.throwVerification) throw Error('Synthetic verification failure'); return f.current(item.id);
    } },
    '@/lib/expungement-ai/consumer-identity': { consumerMatterIdForItem: item => 'matter:' + item },
    '@/lib/rcap/render/consumer-delivery-control': { resolveConsumerDeliveryAccess: () => ({ allowed: false }) },
    '@/lib/rcap/render/artifact-storage': { getPacketArtifactStorage: () => f.ports.storage },
    '@/lib/rcap/render/job-queue': { getRenderJob: f.ports.getJob, recordDeliveryEvent: f.ports.recordEvent },
    '@/lib/rcap/render/packet-delivery': f.service
  };
  const route = compile(text, dependencies);
  const request = new Request('https://example.invalid/download?grant=synthetic-grant'); request.nextUrl = new URL(request.url);
  const response = await route.GET(request, { params: Promise.resolve(kind === 'consumer' ? { itemId: 'item-one' } : { jobId: id }) });
  assert.equal(response.status, expectedStatus);
  const output = Buffer.from(await response.arrayBuffer());
  if (expectedStatus === 200) {
    assert.equal(hash(output), hash(bytes)); assert.equal(f.admissions.length, 1);
    assert(response.headers.get('cache-control').includes('no-store'));
    if (kind === 'consumer') { assert(!/[\r\n]/.test(response.headers.get('content-disposition'))); assert.equal(response.headers.get('x-injected'), null); }
  } else { assert.notEqual(hash(output), hash(bytes)); assert(!f.events.some(e => e.eventType === 'delivery_authorized')); }
  return { httpStatus: response.status, ...f.counts(), admissions: f.admissions.length, transmittedPacket: expectedStatus === 200 };
}
  await coreRefusal('Missing output hash refuses before storage', { job: { outputSha256: null } }, 'artifact_missing');
  await coreRefusal('Storage path must contain the exact job identity', { job: { outputStoragePath: `synthetic/wrong-job/${hash(bytes)}.pdf` } }, 'artifact_identity_mismatch');
  await coreRefusal('Storage path must contain the actual artifact hash', { job: { outputStoragePath: `synthetic/${id}/wrong-hash.pdf` } }, 'artifact_identity_mismatch');
  const nonPdf = Buffer.from('plain text with an accurately updated hash');
  await coreRefusal('Matching digest cannot turn a non-PDF object into a packet', { object: nonPdf, job: { outputSha256: hash(nonPdf), outputStoragePath: `synthetic/${id}/${hash(nonPdf)}.pdf` } }, 'artifact_corrupt');
  await coreRefusal('Sponsored job cannot borrow its consumer verification binding', { job: { partnerId: 'synthetic-partner', sponsoredBinding: null } }, 'verification_binding_mismatch');
  await coreRefusal('Accounting-blocked artifact cannot reach commercial admission', { job: { accountingResult: 'blocked_cap' } }, 'not_deliverable');
  await coreRefusal('Existing Illinois fallback stays denied without server access', { omitReader: true, job: { routeId: 'IL:felony-prostitution-relief' } }, 'verification_not_current');
  await check('Canceled response records abort and never completion', async () => {
    const f = setup(); const decision = await f.service.authorizePacketDownload(f.ports, { jobId: id, userId: owner }); assert.equal(decision.ok, true);
    const response = await f.service.streamAuthorizedPacket(f.ports, decision, { userId: owner, chunkSize: 1 });
    const reader = response.body.getReader(); await reader.read(); await reader.cancel(); await Promise.resolve();
    assert(f.events.some(e => e.eventType === 'transmission_aborted')); assert(!f.events.some(e => e.eventType === 'transmission_completed'));
    return { eventTypes: f.events.map(e => e.eventType) };
  });
  await check('Consumer handler denies a grant for another stored object', () => handler('consumer', { grant: { storagePath: 'other-private-object' } }, 404));
  await check('Consumer handler denies a grant for another artifact hash', () => handler('consumer', { grant: { expectedSha256: '0'.repeat(64) } }, 404));
  await check('Consumer handler denies a different owned matter behind the same grant', () => handler('consumer', { job: { briefcaseItemId: 'item-two', consumerBriefcaseItemId: 'item-two', matterId: 'matter:item-two' } }, 404));
  await check('Consumer handler sanitizes the download filename on positive delivery', () => handler('consumer', {}, 200));
  await check('Consumer verification exceptions fail closed', () => handler('consumer', { throwVerification: true }, 404));
  await check('RCAP verification exceptions fail closed', () => handler('rcap', { throwVerification: true }, 409));
  await check('Sponsored stale binding is refused by the actual RCAP handler', () => handler('rcap', { job: { partnerId: 'synthetic-partner', sponsoredBinding: { verificationHash: 'old-hash' }, consumerBriefcaseItemId: null } }, 409));
  await check('Actual installed authority denies Kentucky without an installed record', () => {
    const admission = loadActual('src/lib/rcap/fulfillment/grade-a-admission.ts');
    const registry = loadActual('src/lib/rcap/fulfillment/grade-a-registry.ts');
    const authority = loadActual('src/lib/rcap/fulfillment/grade-a-authority.ts');
    assert.equal(registry.getCurrentFulfillmentRecord(base.routeId), null);
    const decision = admission.fulfillmentAuthorityFor(base.routeId); assert.equal(decision.authorized, false);
    const points = authority.COMMERCIAL_ADMISSION_POINTS;
    assert(Array.isArray(points) && points.length > 0);
    const decisions = points.map(point => admission.admitCommercial(point, { routeId: base.routeId, jurisdiction: 'KY', packetFamilyId: 'ky_nonconviction_expungement-set' }, null));
    assert(decisions.every(d => d.admitted === false));
    return { actualRegistry: true, syntheticAuthorityResponse: false, state: decision.state, admissionPoints: decisions.map(d => ({ point: d.admissionPoint, denialCode: d.denialCode })) };
  });
  moduleHashes[corePath] = hash(core); moduleHashes['src/lib/rcap/render/job-contract.ts'] = hash(contract);
  const report = { schemaVersion: 'rcap-independent-delivery-engineering-delta/v1', reviewer: outputArgument ? 'Captain regression rerun of retained independent controls' : 'release_scope independent engineering sub-agent', recordedAt: new Date().toISOString(),
    verdict: checks.every(c => c.passed) ? 'PASS_BOUNDED_ENGINEERING_DELTA' : 'FAIL', passed: checks.filter(c => c.passed).length, failed: checks.filter(c => !c.passed).length,
    checks, sourceSha256: moduleHashes, completeKyPdfSha256: hash(bytes),
    boundary: { realCoreAndHandlersExecuted: true, sessionDatabaseStoragePorts: 'synthetic', positiveAuthorityPort: 'explicit synthetic response', installedRegistryDenialExecuted: checks.some(c => c.actualRegistry && c.passed), actualEntitlementCreated: false, rendererExecuted: false, installedKentuckyFulfillment: false, hostedProductionAcceptance: false },
    retainedFilesMutated: false, productionTouched: false };
  fs.writeFileSync(path.join(ROOT, OUT), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ verdict: report.verdict, passed: report.passed, failed: report.failed, report: OUT, failures: checks.filter(c => !c.passed) }));
  if (report.failed) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
