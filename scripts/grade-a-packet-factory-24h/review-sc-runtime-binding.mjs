// Independent bounded replay of the ten previously accepted SC guidance routes.
// --baseline substitutes only the four exact historical consumer blobs. It does
// not reset the worktree or reinterpret the preserved legal/source acceptance.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const baselineCommit = '20d26d6a3bd74521f7f400ca27d98f307fb8d7b6';
const originalPath = 'data/rcap-grade-a/packet-factory-24h/vfscguidance1/sc-guidance-native-binding-20260914.json';
const original = JSON.parse(fs.readFileSync(originalPath));
const baseline = process.argv.includes('--baseline');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const bindings = [], sources = {};
for (const expected of original.consumerBindings) {
  const historical = execFileSync('git', ['show', `${baselineCommit}:${expected.path}`]);
  assert.equal(digest(historical), expected.sha256);
  assert.equal(historical.length, expected.byteLength);
  const bytes = baseline ? historical : fs.readFileSync(expected.path);
  bindings.push({ path: expected.path, sha256: digest(bytes), byteLength: bytes.length });
  if (baseline) sources[pathToFileURL(path.join(root, expected.path)).href] = historical.toString();
}
const loader = pathToFileURL(path.join(root, 'scripts/lib/ts-esm-loader.mjs')).href;
const ts = pathToFileURL(path.join(root, 'node_modules/typescript/lib/typescript.js')).href;
const hook = `import * as ordinary from ${JSON.stringify(loader)};
import ts from ${JSON.stringify(ts)};
let sources; export function initialize(data){sources=data;}
export const resolve=ordinary.resolve;
export async function load(url,context,next){
if(Object.hasOwn(sources,url))return {format:'module',shortCircuit:true,source:ts.transpileModule(sources[url],{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText};
return ordinary.load(url,context,next);}`;
register(`data:text/javascript,${encodeURIComponent(hook)}`, { data: sources });
const G = await import('../../src/lib/rcap/documents/guidance-packet-registry.ts');
const R = await import('../../src/lib/rcap/documents/packet-route-resolver.ts');
const J = await import('../../src/lib/rcap/render/job-contract.ts');
const P = await import('../../src/lib/expungement-ai/payment-adapter.ts');
const C = await import('../../src/lib/rcap/render/commercial-admission.ts');
const prefix = 'data/rcap-grade-a/packet-factory-24h/pf01/sc-guidance-repair-20260914/';
const saved = JSON.parse(fs.readFileSync(prefix + 'guidance.json')).treatments;
const bundles = JSON.parse(fs.readFileSync(prefix + 'saved-native-bundles.json'));
const checks = [], rows = [];
function check(id, actual) { checks.push({ id, pass: Boolean(actual) }); }
function equal(a,b) { try { assert.deepEqual(a,b); return true; } catch { return false; } }
function denial(fn) { try { fn(); return null; } catch (error) { return { name: error.name, message: error.message }; } }
assert.equal(original.rows.length, 10);
assert.equal(saved.length, 10);
assert.equal(bundles.length, 20);
for (const accepted of original.rows) {
  const trackId = accepted.trackId;
  const record = G.terminalTreatmentForTrack(trackId);
  const route = R.resolvePacketRoute({ state:'SC', trackId });
  const localized = ['en','es'].map(locale => G.terminalTreatmentBundle(trackId, locale));
  const savedGuidanceExact = equal(record?.raw, saved.find(r => r.trackId === trackId));
  const bothLocaleBundlesExact = localized.every(bundle => equal(bundle, bundles.find(b => b.trackId === trackId && b.locale === bundle?.locale)));
  const input = { state:'SC', trackId, packetFields:{} };
  const renderSpecRefused = J.buildRenderJobSpec(input).spec === null && !R.packetRouteCanRender(route);
  const claimedWorkerRenderRefused = baseline ? null : J.buildRenderJobSpec(input, 'claimed_worker').spec === null
    && !R.packetRouteCanRender(R.resolveClaimedPacketRenderRoute(input));
  const payment = P.createConsumerPaymentPlaceholder({ state:'SC', selectedTrackId:trackId, resultCode:'eligible', paymentAllowed:true }, 'synthetic-sc-pathway');
  const checkout = denial(() => P.assertCheckoutAllowed({ jurisdiction:'SC', pathwayId:'synthetic-sc-pathway', selectedTrackId:trackId, deferralComponentIds:[], packetType:'custom_pleading', resultCode:'eligible', paymentAllowed:true }));
  const delivery = denial(() => P.assertPacketRouteCanDeliver({ jurisdiction:'SC', pathwayId:'synthetic-sc-pathway', selectedTrackId:trackId }));
  const commercialDenials = {};
  for (const point of ['consumer_checkout','sponsored_entitlement','packet_credit_admission','generation_admission','provider_dispatch']) {
    commercialDenials[point] = denial(() => C.governCommercialAdmission(point, { routeId:`SC:${trackId}`, jurisdiction:'SC', packetFamilyId:'rcap-sc-custom-pleading' }));
  }
  const row = { trackId, savedGuidanceExact, bothLocaleBundlesExact, route,
    renderSpecRefused, claimedWorkerRenderRefused, paymentPlaceholderDisabled:payment.enabled === false && payment.amountCents === undefined,
    checkoutRefused:checkout?.name === 'ConsumerCheckoutNotAllowedError', deliveryRefused:!!delivery,
    creditRefused:localized.every(b => b.packetCreditConsumption === 'none' && b.partnerCreditConsumption === 'none'),
    checkout, delivery, commercialDenials };
  check(`${trackId}/saved-guidance`, savedGuidanceExact);
  check(`${trackId}/both-accepted-locales`, bothLocaleBundlesExact);
  check(`${trackId}/accepted-application-route`, equal(route,accepted.route));
  check(`${trackId}/guidance-only`, record?.treatment === 'complete_guidance' && localized.every(b => b.treatment === 'complete_guidance'));
  check(`${trackId}/all-runtime-suppressions`, route.rendererKind === 'none' && route.sellable === false && route.creditConsumable === false && localized.every(b => b.paymentAllowed === false && b.checkoutSuppressed === true));
  for (const key of ['renderSpecRefused','paymentPlaceholderDisabled','checkoutRefused','deliveryRefused','creditRefused']) check(`${trackId}/${key}`,row[key]);
  if (!baseline) check(`${trackId}/claimed-worker-render-denied`,claimedWorkerRenderRefused);
  for (const [point,error] of Object.entries(commercialDenials)) check(`${trackId}/${point}-commercial-denied`,error?.name === 'CommercialAdmissionDeniedError');
  rows.push(row);
}
const output = { schemaVersion:'rcap-sc-runtime-independent-replay/v1', mode:baseline?'exact-four-consumer-baseline':'current', baselineCommit,
  status:checks.every(c => c.pass)?'PASS':'FAIL', recordCount:rows.length, localeBundleCount:20,
  consumerBindings:bindings, checks:checks.length, failed:checks.filter(c => !c.pass), rows,
  assertions:checks, commercialRoutesOpened:0,
  limits:'Pure runtime gates and preserved EN/ES projection replay; no live provider, database, authenticated UI, new legal or human language approval.' };
console.log(JSON.stringify(output,null,2));
if(output.failed.length) process.exitCode=1;
