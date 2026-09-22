#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { register } from 'node:module';
import { supersedeFromSpecification } from './lib/specification-supersession.mjs';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { fulfillmentRecordSha256, buildRegistry, validateHistoryChain } = await import('../src/lib/rcap/fulfillment/grade-a-registry.ts');
const { evaluateFulfillmentAuthority, admitCommercialAction, COMMERCIAL_ADMISSION_POINTS } = await import('../src/lib/rcap/fulfillment/grade-a-authority.ts');
const BASE = '1ad2c1c994ab0d5540285b691b51587981f3f2e3';
const REGISTRY = 'data/rcap-grade-a/fulfillment-authority-registry.json';
const OBSERVATION = 'data/rcap-grade-a/fulfillment-observation-snapshot.json';
const PROJECTION = 'data/rcap-grade-a/fulfillment-authority-projection.json';
const STATIC = 'data/rcap-grade-a/worker-static-authority.json';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const baseline = p => JSON.parse(execFileSync('git', ['show', `${BASE}:${p}`], { maxBuffer: 32 * 1024 * 1024 }));
const spec = read('data/record-clearing/packet-specifications/OR-set-aside-without-conviction.v1.json');
const replacement = read(spec.supersededBy.by);
const route = spec.routeKey;
for (const file of [
  'data/record-clearing/packet-specifications/OR-set-aside-without-conviction.v1.json',
  spec.supersededBy.by,
  'src/lib/legal-authority/routes/single-routes.json',
  'data/record-clearing/legal-decisions/route-ratification-registry.json',
  'data/record-clearing/factory-v2-route-registry.json'
]) assert.deepEqual(read(file), baseline(file), `${file} must remain unchanged`);
const before = baseline(REGISTRY);
const original = before.records.find(r => r.routeId === route);
const expected = supersedeFromSpecification(original, spec, fulfillmentRecordSha256, 'scripts/generate-rcap-grade-a-fulfillment-authority.mjs');
function assertRetirement(record) {
  assert.ok(record, 'historical route must remain');
  assert.equal(record.supersededBy, expected.supersededBy);
  assert.match(record.supersededBy, /^terminal-retirement:sha256:[0-9a-f]{64}$/);
  assert.deepEqual(record.terminalRetirement, expected.terminalRetirement);
  assert.equal(record.terminalRetirement.successorGradeAAuthority, 'none');
  assert.equal(record.supersededAt, spec.supersededBy.on);
  assert.equal(record.version, original.version + 1);
  assert.deepEqual(record.history.slice(0, -1), original.history);
  assert.equal(record.history.at(-1).changeKind, 'superseded');
  assert.ok(record.history.at(-1).changedAt >= original.history.at(-1).changedAt, 'recording date must not backdate the appended transition');
  assert.deepEqual(validateHistoryChain(record), []);
  const restored = { ...record, version: original.version, supersededBy: null, supersededAt: null, history: original.history };
  delete restored.terminalRetirement;
  assert.deepEqual(restored, original, 'historical evidence must be untouched');
  const decision = evaluateFulfillmentAuthority(record, null, route);
  assert.equal(decision.state, 'SUPERSEDED');
  assert.equal(decision.authorized, false);
  assert.deepEqual(decision.missingProof, []);
}
assertRetirement(expected);
assert.deepEqual(supersedeFromSpecification(expected, spec, fulfillmentRecordSha256, 'unused'), expected, 'transition must be idempotent');
let mutations = 0;
function kill(label, operation) {
  assert.throws(operation, { name: 'AssertionError' }, `${label} escaped`);
  mutations++;
  console.log(`mutation killed: ${label}`);
}
kill('ignore specification supersession', () => assertRetirement(original));
for (const [label, mutate] of [
  ['borrow specification namespace', r => { r.supersededBy = spec.supersededBy.by; }],
  ['omit terminal retirement', r => { delete r.terminalRetirement; }],
  ['terminal retirement names successor authority', r => { r.terminalRetirement.successorGradeAAuthority = 'invented-record'; }],
  ['clear supersededBy', r => { r.supersededBy = null; }],
  ['clear supersededAt', r => { r.supersededAt = null; }],
  ['omit superseded event', r => { r.history.pop(); }],
  ['break history hash chain', r => { r.history.at(-1).supersedesRecordSha256 = '0'.repeat(64); }]
]) kill(label, () => { const r = structuredClone(expected); mutate(r); assertRetirement(r); });
kill('delete historical route', () => assertRetirement(undefined));
assert.throws(() => supersedeFromSpecification(original, { ...spec, supersededBy: { ...spec.supersededBy, on: null } }, fulfillmentRecordSha256, 'test'), /Invalid specification supersession/);
if (process.argv.includes('--unit')) {
  console.log(`Native supersession tests passed; ${mutations} mutations killed.`);
  process.exit(0);
}
const acceptancePath = 'scripts/verify-or-retired-route-commercial-posture.mjs';
assert.equal(fs.readFileSync(acceptancePath, 'utf8'), execFileSync('git', ['show', `${BASE}:${acceptancePath}`], { encoding: 'utf8' }));
for (const mutate of [r => { delete r.terminalRetirement; }, r => { r.terminalRetirement.retirementId = 'terminal-retirement:sha256:' + '0'.repeat(64); }]) {
  const record = structuredClone(expected);
  mutate(record);
  record.history.at(-1).recordSha256 = fulfillmentRecordSha256(record);
  const registry = buildRegistry({ ...before, records: [record] });
  assert.equal(registry.current.size, 0);
  assert.ok(registry.problems.some(p => /terminal retirement must bind/.test(p.problem)));
}
const after = read(REGISTRY);
assertRetirement(after.records.find(r => r.routeId === route));
const unrelated = d => ({ ...d, records: d.records.filter(r => r.routeId !== route) });
assert.deepEqual(unrelated(after), unrelated(before), 'all unrelated registry records and metadata must remain identical');
const loaded = buildRegistry(after);
assert.deepEqual(loaded.problems, []);
assert.equal(loaded.current.has(route), false);
const oldObs = baseline(OBSERVATION), newObs = read(OBSERVATION);
const wantedObs = structuredClone(oldObs); delete wantedObs.routes[route];
assert.deepEqual(newObs, wantedObs);
const oldStatic = baseline(STATIC), newStatic = read(STATIC);
assert.deepEqual(newStatic, { ...oldStatic, entries: oldStatic.entries.filter(e => e.record.routeId !== route) });
const oldProjection = baseline(PROJECTION), projection = read(PROJECTION);
assert.deepEqual(projection.routes.filter(r => r.routeId !== route), oldProjection.routes.filter(r => r.routeId !== route));
assert.deepEqual(projection.counters, { ...oldProjection.counters, incomplete: oldProjection.counters.incomplete - 1, superseded: oldProjection.counters.superseded + 1 });
function assertProjected(registry, projected) {
  const record = registry.records.find(r => r.routeId === route);
  assertRetirement(record);
  const decision = evaluateFulfillmentAuthority(record, null, route);
  const row = projected.routes.find(r => r.routeId === route);
  for (const key of ['state', 'commercialStatus', 'missingProof']) assert.deepEqual(row[key], decision[key]);
}
assertProjected(after, projection);
kill('manually patch projection but leave authority current', () => assertProjected(before, projection));
const factory = read('data/record-clearing/factory-v2-route-registry.json');
const factoryRow = factory.routes.find(r => r.pathwayKey === route);
function assertFactory(row) { assert.equal(row.factoryV2Resolves, false); assert.equal(row.buildInputs.routeNotRetired, false); }
assertFactory(factoryRow);
kill('re-admit factory build', () => assertFactory({ ...factoryRow, factoryV2Resolves: true }));
function assertSuccessors(registry) {
  for (const s of replacement.configurations) assert.equal(registry.records.some(r => r.routeId === s.routeKey), false);
  assert.equal(replacement.commerciallyEligible, 0);
  assert.equal(replacement.completePacketProven, 0);
}
assertSuccessors(after);
for (const s of replacement.configurations) kill(`create successor authority: ${s.specificationId}`, () => assertSuccessors({ ...after, records: [...after.records, { ...original, routeId: s.routeKey }] }));
const routes = fs.readdirSync('src/lib/rcap-engine/compiled/profiles').filter(f => f.endsWith('.json')).flatMap(f => {
  const p = read(`src/lib/rcap-engine/compiled/profiles/${f}`);
  assert.deepEqual(p, baseline(`src/lib/rcap-engine/compiled/profiles/${f}`), 'compiled legal/evaluator inputs unchanged');
  return p.pathways.map(pathway => `${p.jurisdiction.code}:${pathway.id}`);
});
routes.push(...replacement.configurations.map(s => s.routeKey));
const oldLoaded = buildRegistry(before);
let admissions = 0;
for (const routeId of new Set(routes)) {
  const oldRecord = oldLoaded.current.get(routeId), record = loaded.current.get(routeId);
  for (const admissionPoint of COMMERCIAL_ADMISSION_POINTS) {
    const request = { routeId, jurisdiction: routeId.split(':')[0], packetFamilyId: oldRecord?.packetFamilyId ?? null };
    const prior = admitCommercialAction({ admissionPoint, request, record: oldRecord, observation: oldObs.routes[routeId] });
    const now = admitCommercialAction({ admissionPoint, request, record, observation: newObs.routes[routeId] });
    assert.equal(now.admitted, prior.admitted, `${routeId} ${admissionPoint} changed`);
    if (routeId !== route) assert.deepEqual(now, prior);
    else assert.equal(now.admitted, false);
    admissions++;
  }
}
const { packetFulfillmentAuthority } = await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
const { factoryV2RouteFor } = await import('../src/lib/rcap/documents/factory-v2-registry.ts');
const { buildRenderJobSpec } = await import('../src/lib/rcap/render/job-contract.ts');
function assertSurfaceClosed(decision) { assert.equal(decision.allowed, false); }
for (const key of [route, ...replacement.configurations.map(s => s.routeKey)]) {
  const pathway = key.slice(3);
  assert.notEqual(factoryV2RouteFor('OR', pathway)?.factoryV2Resolves, true);
  assert.equal(buildRenderJobSpec({ packetId: 'task60-proof', state: 'OR', pathway, trackId: null, packetFields: {} }).spec, null);
  for (const surface of ['checkout creation', 'consumer payment authority', 'sponsored entitlement', 'packet generation', 'packet credit consumption', 'participant delivery']) {
    const decision = packetFulfillmentAuthority('OR', pathway, surface);
    assertSurfaceClosed(decision);
    if (key === route && ['checkout creation', 'consumer payment authority'].includes(surface)) {
      kill(`open ${surface}`, () => assertSurfaceClosed({ ...decision, allowed: true }));
    }
  }
}
console.log(`Preserved ${new Set(routes).size} route identities / ${admissions} admission decisions; ${mutations} mutations killed.`);

// Exercise the real generator's nonmutating boundary with injected reads in a
// child process. No generated repository file is edited by these mutations.
const { mkdtempSync, writeFileSync, rmSync } = fs;
const { tmpdir } = await import('node:os');
const { join } = await import('node:path');
const { spawnSync } = await import('node:child_process');
const temporary = mkdtempSync(join(tmpdir(), 'task60-generator-'));
try {
  const baselineRegistryPath = join(temporary, 'registry.json');
  const baselineObservationPath = join(temporary, 'observation.json');
  writeFileSync(baselineRegistryPath, JSON.stringify(before));
  writeFileSync(baselineObservationPath, JSON.stringify(oldObs));
  const baselineReads = `
    import fs from 'node:fs';
    import cp from 'node:child_process';
    import { syncBuiltinESMExports, register } from 'node:module';
    const execute = cp.execFileSync;
    cp.execFileSync = function(command, args, options) {
      if (command === 'git' && args?.includes('HEAD:${REGISTRY}')) return fs.readFileSync(${JSON.stringify(baselineRegistryPath)});
      if (command === 'git' && args?.includes('HEAD:${OBSERVATION}')) return fs.readFileSync(${JSON.stringify(baselineObservationPath)});
      return execute.call(this, command, args, options);
    };
    syncBuiltinESMExports();
  `;
  const runGenerator = (name, preload) => {
    const file = join(temporary, `${name}.mjs`);
    writeFileSync(file, preload);
    const bytes = [REGISTRY, OBSERVATION, PROJECTION, STATIC].map(path => fs.readFileSync(path));
    const result = spawnSync(process.execPath, ['--import', file, 'scripts/generate-rcap-grade-a-fulfillment-authority.mjs', '--check', '--scope', route], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, env: { ...process.env, RCAP_AUTHORITY_SCOPED_CHECK_ROUTE: route } });
    [REGISTRY, OBSERVATION, PROJECTION, STATIC].forEach((path, index) => assert.deepEqual(fs.readFileSync(path), bytes[index], '--check must be nonmutating'));
    return result;
  };
  const control = runGenerator('control', baselineReads);
  assert.equal(control.status, 0, control.stdout + control.stderr);
  const loader = `export async function resolve(specifier, context, next) {
    if (specifier.endsWith('/specification-supersession.mjs')) return {url:'data:text/javascript,export function supersedeFromSpecification(record) { return record; }', shortCircuit:true};
    return next(specifier, context);
  }`;
  const ignored = runGenerator('ignore-specification', baselineReads + `register(${JSON.stringify('data:text/javascript,' + encodeURIComponent(loader))}, import.meta.url);`);
  assert.equal(ignored.status, 1, ignored.stdout + ignored.stderr);
  assert.match(ignored.stderr, /#60 requires the existing authored specification supersession/);
  console.log('mutation killed: actual generator ignores specification supersession');
  const patched = runGenerator('patched-projection', baselineReads + `
    const read = fs.readFileSync;
    fs.readFileSync = function(file, ...args) {
      const value = read.call(this, file, ...args);
      if (String(file).endsWith('/${PROJECTION}')) {
        const document = JSON.parse(String(value));
        document.routes.find(row => row.routeId === ${JSON.stringify(route)}).state = 'COMPLETE_PACKET_PROVEN';
        const text = JSON.stringify(document, null, 2) + '\\n';
        return typeof value === 'string' ? text : Buffer.from(text);
      }
      return value;
    };
    syncBuiltinESMExports();
  `);
  assert.equal(patched.status, 1, patched.stdout + patched.stderr);
  assert.match(patched.stderr, /Regeneration required/);
  assert.ok(patched.stderr.includes(PROJECTION), patched.stderr);
  console.log('mutation killed: actual generator rejects manually patched projection');
  const mutantPath = 'scripts/.task60-nontarget-generator.mjs';
  try {
    const source = fs.readFileSync('scripts/generate-rcap-grade-a-fulfillment-authority.mjs', 'utf8');
    const marker = 'if (OR_RETIREMENT_ONLY) {\n  assert.deepEqual(records.filter';
    assert.ok(source.includes(marker));
    writeFileSync(mutantPath, source.replace(marker, `records.find(record => record.routeId !== OR_RETIREMENT_ROUTE).serviceDisposition = 'not_supported';\n${marker}`));
    const mutant = spawnSync(process.execPath, [mutantPath, '--check', '--scope', route], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, env: { ...process.env, RCAP_AUTHORITY_SCOPED_CHECK_ROUTE: route } });
    assert.equal(mutant.status, 1, mutant.stdout + mutant.stderr);
    assert.match(mutant.stderr, /#60 refuses any non-target record change/);
    console.log('mutation killed: bounded generator changes a non-target record');
  } finally { rmSync(mutantPath, { force: true }); }
  console.log(`All ${mutations + 3} mutations killed; real generator check passed before mutation.`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
