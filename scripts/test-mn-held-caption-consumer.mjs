import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readFile as readSource } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const H = await import('../src/lib/expungement-ai/mn-two-county-source-facts.ts');
const C = await import('../src/lib/expungement-ai/record-fact-clarification.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { mnHeldCaptionPreparationFor } = await import('../src/lib/rcap/render/mn-held-caption-consumer.ts');
const { NextRequest, NextResponse } = await import('next/server');
const profile = getProfileByJurisdiction('MN'), route = H.MN_PETITION_ROUTE;
const witness = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses.find(w => w.jurisdiction === 'MN' && w.pathwayId === route);
const answers = { ...witness.finalAnswers, case_outcome: 'Misdemeanor conviction' };
const saved = { court: 'Hennepin District Court', charge: 'Synthetic retained target charge', mn_deciding_case_county: 'Hennepin', mn_sentence_discharge_date: '2020-01-01', mn_new_conviction_since_discharge: 'no' };
const merged = { ...answers, ...saved };
const origin = H.mnTargetOriginQuestion(profile, route, null);
const confirmation = C.recordFactConfirmationFor(`MN:${route}`, H.MN_TARGET_ORIGIN_ID, merged, origin);
assert(confirmation);
const authoritative = evaluate({ jurisdiction: 'MN', profileVersion: profile.profileVersion, matterId: 'synthetic-mn-owned-caption', answers });
assert.equal(authoritative.evaluation.pathwayId, route);
const seed = P.protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: answers, packetAnswers: saved, dependencies: { recordFactConfirmations: { jurisdiction_scope: confirmation } }, capturedAt: '2026-10-23T00:00:00Z' });
assert(seed);
const original = { status: 'unverified', revision: 1, draftHash: seed.hash, draftSnapshot: seed.snapshot };
assert(mnHeldCaptionPreparationFor(original), 'real current protected model must reach the guarded adapter');
let stored = structuredClone(original), user = 'synthetic-owner', authenticated = true, sourceFault = null;
const item = { id: 'synthetic-mn-owned-caption', jurisdiction: 'MN', artifactRefs: {} };
globalThis.__mnCaptionRoute = {
  readFile: async file => { if (sourceFault === 'missing') throw new Error('synthetic missing source'); const bytes = await readSource(file); return sourceFault === 'changed' ? Buffer.concat([bytes, Buffer.from('changed')]) : bytes; },
  requireConsumerBriefcaseApiSession: async () => authenticated ? { ok: true, userId: user } : { ok: false, response: NextResponse.json({ error: 'not_authenticated' }, { status: 401 }) },
  getBriefcaseItem: async (owner, id) => owner === 'synthetic-owner' && id === item.id ? item : null,
  readProtectedPacketVerification: async input => { assert.deepEqual(input, { consumerAuthUserId: 'synthetic-owner', briefcaseItemId: item.id }); return stored ? { ok: true, value: stored } : { ok: false, reason: 'missing' }; }
};
const file = path.resolve('src/app/briefcase/[packetId]/mn-caption-preview/[documentId]/route.ts');
let source = fs.readFileSync(file, 'utf8');
assert(source.includes('import { readFile } from "node:fs/promises";'));
source = source.replace('import { readFile } from "node:fs/promises";', 'const readFile=(...args:any[])=>(globalThis as any).__mnCaptionRoute.readFile(...args);');
for (const [name, module] of [['getBriefcaseItem', 'briefcase'], ['readProtectedPacketVerification', 'verification-cas'], ['requireConsumerBriefcaseApiSession', 'privacy/api-session']]) {
  const line = `import { ${name} } from "@/lib/expungement-ai/${module}";`;
  assert(source.includes(line));
  source = source.replace(line, `const ${name}=(...args:any[])=>(globalThis as any).__mnCaptionRoute.${name}(...args);`);
}
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
register('data:text/javascript,' + encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'), { data: { url: pathToFileURL(file).href, source: compiled } });
const { GET } = await import(pathToFileURL(file).href);
const request = (documentId = 'EXP102', query = '') => GET(new NextRequest('http://localhost/briefcase/' + item.id + '/mn-caption-preview/' + documentId + query), { params: Promise.resolve({ packetId: item.id, documentId }) });
const checks = [];
const check = async (name, fn) => { await fn(); checks.push(name); };
const out = process.env.RCAP_MN_CONSUMER_OUTPUT;
if (out) { assert(!fs.existsSync(out)); fs.mkdirSync(out, { recursive: true }); }
for (const documentId of ['EXP102', 'EXP104', 'EXP105', 'FEE102']) await check(documentId + ': actual owned route returns exact held caption bytes privately', async () => {
  const result = await request(documentId, documentId === 'FEE102' ? '?feeWaiver=requested' : '');
  assert.equal(result.status, 200); assert.equal(result.headers.get('x-legalease-output-status'), 'held_preview');
  assert.match(result.headers.get('cache-control'), /private, no-store/); assert.equal(result.headers.get('x-content-type-options'), 'nosniff');
  const bytes = Buffer.from(await result.arrayBuffer()); assert(bytes.subarray(0, 4).equals(Buffer.from('%PDF')));
  if (out) fs.writeFileSync(path.join(out, documentId + '-owned-held.pdf'), bytes, { flag: 'wx' });
});
for (const [id, query] of [['UNKNOWN', ''], ['__proto__', ''], ['FEE102', ''], ['FEE102', '?feeWaiver=false']]) await check('unrequested component refuses ' + id + query, async () => assert.equal((await request(id, query)).status, 404));
for (const [name, mutate, rehash = true] of [
  ['county unknown', v => { v.draftSnapshot.packetAnswers.mn_deciding_case_county = { unknown: true }; }],
  ['origin unknown', v => { v.draftSnapshot.screeningAnswers.jurisdiction_scope = { unknown: true }; }],
  ['origin unconfirmed', v => { v.draftSnapshot.dependencies.recordFactConfirmations = {}; }],
  ['stale origin identity', v => { v.draftSnapshot.packetAnswers.charge = 'Another target charge'; }],
  ['stale protected hash', v => { v.draftHash = '0'.repeat(64); }, false],
  ['stale profile source', v => { v.draftSnapshot.profileSourceFingerprint = '0'.repeat(64); }],
  ['wrong pathway', v => { v.draftSnapshot.pathwayId = H.MN_PROSECUTOR_ROUTE; }],
  ['missing current stage fact', v => { delete v.draftSnapshot.packetAnswers.mn_sentence_discharge_date; }]
]) await check(name + ': actual route refuses without promoting a hold', async () => {
  stored = structuredClone(original); mutate(stored); if (rehash) stored.draftHash = P.protectedPacketDraftHash(stored.draftSnapshot);
  assert.equal((await request()).status, 404);
});
stored = structuredClone(original);
for (const fault of ['missing', 'changed']) await check(fault + ' exact source refuses in actual route', async () => {
  sourceFault = fault; assert.equal((await request()).status, 404); sourceFault = null;
});
stored = null; await check('missing protected record refuses', async () => assert.equal((await request()).status, 404));
stored = structuredClone(original); user = 'other-owner'; await check('other owner cannot read or render', async () => assert.equal((await request()).status, 404));
user = 'synthetic-owner'; authenticated = false; await check('session guard precedes owner read', async () => assert.equal((await request()).status, 401));
authenticated = true;
await check('preparation leaves protected authority/review/record unchanged', async () => {
  assert.deepEqual(stored, original); const model = P.protectedPacketInformationModelFor(stored);
  assert.equal(model.reviewSafety.safe, false); assert.equal(model.mnSourceStageCandidate.authority, false);
  assert.equal(model.mnSourceStageCandidate.qualificationCheckboxExportAllowed, false); assert.notEqual(model.stage, 'ready_to_generate');
});
// Existing actual-page SSR seam; production model, presentation and localization remain real.
const compile = (file, source) => register('data:text/javascript,' + encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'), { data: { url: pathToFileURL(file).href, source: ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText } });
const localePath = path.resolve('src/components/expungement-ai/LocalizationProvider.tsx');
compile(localePath, fs.readFileSync(localePath, 'utf8') + '\nexport {LocalizationContext};');
const { default: React } = await import('react'), { renderToStaticMarkup } = await import('react-dom/server');
const { LocalizationContext } = await import(pathToFileURL(localePath).href);
const { AppRouterContext } = await import(pathToFileURL(fs.realpathSync('node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js')).href);
const { t, resolveRuntimeText } = await import('../src/lib/expungement-ai/localization.ts');
const { decorateBriefcaseItemForPresentationWithDependencies: decorate } = await import('../src/lib/expungement-ai/briefcase-presentation-authority.ts');
globalThis.__mnCaptionRoute.requireConsumerBriefcaseSession = async () => ({ userId: user });
globalThis.__mnCaptionRoute.decorateBriefcaseItemForPresentation = () => decorate({ consumerAuthUserId: user, item }, {
  readProtectedArtifact: async () => ({ ok: true, value: null }), readProtectedVerification: async () => ({ ok: true, value: stored }),
  readTrustedPendingSource: async () => ({ ok: false, reason: 'protected_pending_source_missing' }), evaluateAuthoritative: evaluate,
  readPaymentAuthority: async () => ({ valid: false, reason: 'unpaid' }),
  readCommercialActions: async () => ({ fulfillmentAvailable: false, checkoutAllowed: false, generationAllowed: false })
});
const pagePath = path.resolve('src/app/briefcase/[packetId]/page.tsx'); let pageSource = fs.readFileSync(pagePath, 'utf8');
pageSource = pageSource.replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";', 'const BriefcaseShell=({children}:any)=>children;');
pageSource = pageSource.replace(/import \{\s*decorateBriefcaseItemForPresentation,\s*type BriefcasePresentationArtifact,\s*type BriefcasePresentationItem\s*\} from "@\/lib\/expungement-ai\/briefcase-presentation-authority";/, 'const decorateBriefcaseItemForPresentation=(...args:any[])=>(globalThis as any).__mnCaptionRoute.decorateBriefcaseItemForPresentation(...args);');
for (const [name, module] of [['requireConsumerBriefcaseSession', 'auth'], ['getBriefcaseItem', 'briefcase'], ['readProtectedPacketVerification', 'verification-cas']]) {
  const line = `import { ${name} } from "@/lib/expungement-ai/${module}";`; assert(pageSource.includes(line));
  pageSource = pageSource.replace(line, `const ${name}=(...args:any[])=>(globalThis as any).__mnCaptionRoute.${name}(...args);`);
}
compile(pagePath, pageSource); const Page = (await import(pathToFileURL(pagePath).href)).default;
const renderPage = async locale => renderToStaticMarkup(React.createElement(AppRouterContext.Provider, { value: { push() {}, replace() {}, refresh() {} } }, React.createElement(LocalizationContext.Provider, { value: { locale, setLocale() {}, t: (key, fallback, vars) => t(locale, key, fallback, vars), text: (text, opts) => resolveRuntimeText(locale, text, opts) } }, await Page({ params: Promise.resolve({ packetId: item.id }) }))));
for (const locale of ['en', 'es']) await check(locale + ': actual owned saved matter exposes only held-caption links', async () => {
  const html = await renderPage(locale); assert(html.includes('data-mn-held-caption-preview="true"'));
  for (const id of ['EXP102', 'EXP104', 'EXP105']) assert(html.includes('/mn-caption-preview/' + id));
  assert(html.includes('/mn-caption-preview/FEE102?feeWaiver=requested')); assert(!html.includes('mode="paid_durable"'));
  if (out) fs.writeFileSync(path.join(out, 'owned-page.' + locale + '.html'), html, { flag: 'wx' });
});
await check('other owner saved matter has no caption links or private county', async () => {
  user = 'other-owner'; const html = await renderPage('en'); assert(!html.includes('data-mn-held-caption-preview=')); assert(!html.includes('Hennepin')); user = 'synthetic-owner';
});
await check('unknown county saved matter has no preview link', async () => {
  stored = structuredClone(original); stored.draftSnapshot.packetAnswers.mn_deciding_case_county = { unknown: true }; stored.draftHash = P.protectedPacketDraftHash(stored.draftSnapshot);
  assert(!(await renderPage('es')).includes('data-mn-held-caption-preview=')); stored = structuredClone(original);
});
delete globalThis.__mnCaptionRoute;
console.log(JSON.stringify({ status: 'PASS', checks: checks.length, names: checks, snapshotSha256: crypto.createHash('sha256').update(JSON.stringify(original)).digest('hex'), scope: 'Actual local route/current protected model with injected owner-read/session seams; no hosted DB or authority mutation.' }));
