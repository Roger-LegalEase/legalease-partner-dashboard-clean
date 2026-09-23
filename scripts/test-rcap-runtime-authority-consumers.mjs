import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  DEFAULT_ROOT_DIR,
  RUNTIME_AUTHORITY_MODULES,
  createRuntimeAuthorityTracingIncludes,
  discoverRuntimeAuthorityConsumers,
  tracingIncludeKey,
  tracingKeyMatches,
} from './rcap-runtime-authority-consumers.mjs';

test('every current authority consumer matches exactly its route, with no other entry admitted', () => {
  const { entries, consumers } = discoverRuntimeAuthorityConsumers();
  assert.ok(consumers.length > 0, 'non-vacuous current authority population');
  assert.ok(entries.length > consumers.length, 'real non-consumers exercise the exclusion');
  let comparisons = 0;
  for (const consumer of consumers) {
    for (const entry of entries) {
      assert.equal(tracingKeyMatches(consumer.tracingKey, entry.appPath), consumer.route === entry.route,
        `${consumer.tracingKey} against ${entry.appPath}`);
      comparisons++;
    }
  }
  console.log(`Consumer scope: ${consumers.length}/${consumers.length}; omitted 0; unintended 0; ${comparisons} comparisons`);
  const probeModes = new Map();
  for (const consumer of consumers) {
    const key = consumer.probeModules.join(',') || 'shared authority only';
    probeModes.set(key, (probeModes.get(key) ?? 0) + 1);
  }
  console.log(`Reachable probe modes: ${JSON.stringify(Object.fromEntries(probeModes))}`);
});

test('Next contains matching cannot widen exact keys through prefixes, dynamic segments or route groups', () => {
  for (const appPath of [
    'api/foo/route', '(group)/api/foo/route', 'briefcase/[itemId]/page',
    'p/[...slug]/page', 'p/[[...slug]]/page',
  ]) {
    const key = tracingIncludeKey(appPath);
    assert.equal(tracingKeyMatches(key, appPath), true);
    assert.equal(tracingKeyMatches(key, appPath.replace(/\/(?:route|page)$/, '/extra/page')), false);
    assert.equal(tracingKeyMatches(key, appPath.replace(/\/(?:route|page)$/, 'suffix/page')), false);
  }
  assert.equal(tracingKeyMatches(tracingIncludeKey('briefcase/[itemId]/page'), 'briefcase/i/page'), false,
    'brackets are literal Next template segments, not a glob character class');
});

test('runtime import discovery follows new consumers and inherited layouts but refuses incomplete graphs', async () => {
  const {independentConsumers,assertDenominators}=await import('./rcap-runtime-authority-independent.mjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rcap-consumer-discovery-'));
  const write = (file, source) => {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, source);
  };
  try {
    write('tsconfig.json', JSON.stringify({
      compilerOptions: {
        target: 'es2022', module: 'esnext', moduleResolution: 'bundler', jsx: 'react-jsx',
        paths: { '@/*': ['./src/*'] }, allowJs: true,
      },
      include: ['src/**/*'],
    }));
    for (const authority of RUNTIME_AUTHORITY_MODULES) {
      write(authority, 'export const authority = true; export type Authority = boolean;');
    }
    write('src/app/layout.tsx', 'export default function Layout({children}) { return children; }');
    write('src/app/direct/route.ts', 'export {authority as GET} from "@/lib/rcap/fulfillment/paid-consumer-successor";');
    write('src/app/indirect/route.ts', 'export async function GET(){ return import("../../reexport"); }');
    write('src/reexport.ts', 'export * from "@/lib/rcap/fulfillment/paid-consumer-successor";');
    write('src/app/typed/page.tsx', 'import type {Authority} from "@/lib/rcap/fulfillment/paid-consumer-successor"; const value:Authority=true; export default()=>value;');
    write('src/app/inline-type/page.tsx', 'import {type Authority} from "@/lib/rcap/fulfillment/paid-consumer-successor"; const value:Authority=true; export default()=>value;');
    write('src/app/inferred-type/page.tsx', 'import {Authority} from "@/lib/rcap/fulfillment/paid-consumer-successor"; const value:Authority=true; export default()=>value;');
    write('src/app/(group)/layout.tsx', 'import {authority} from "@/lib/rcap/fulfillment/grade-a-admission"; export default()=>authority;');
    write('src/app/(group)/inherited/[id]/page.tsx', 'export default()=>null;');
    write('src/app/(group)/inherited/route.ts', 'export function GET(){return true;}');
    write('src/app/_private/page.tsx', 'export {authority as default} from "@/lib/rcap/fulfillment/paid-consumer-successor";');

    const baseline = discoverRuntimeAuthorityConsumers({ root });
    assertDenominators(baseline, await independentConsumers(root));
    assert.deepEqual(baseline.consumers.map((entry) => entry.route).sort(), ['/direct', '/indirect', '/inherited/[id]']);
    assert.equal(baseline.entries.some((entry) => entry.route === '/_private'), false);
    assert.equal(Object.keys(createRuntimeAuthorityTracingIncludes({ root })).length, 3);
    assert.deepEqual(baseline.consumers.flatMap((entry) => entry.probeModules), [],
      'authority membership alone cannot invent resolver or checkout consumers');

    write('src/lib/expungement-ai/payment-adapter.ts', 'export {authority} from "@/lib/rcap/fulfillment/grade-a-registry";');
    write('src/new-layer.ts', 'export {authority} from "@/lib/expungement-ai/payment-adapter";');
    write('src/app/new-consumer/route.ts', 'export {authority as GET} from "@/new-layer";');
    const extended = discoverRuntimeAuthorityConsumers({ root });
    assert.equal(extended.consumers.length, 4);
    assert.equal(extended.consumers.some((entry) => entry.route === '/new-consumer'), true,
      'adding a consumer and intermediate module needs no route-list amendment');
    assert.deepEqual(extended.consumers.find((entry) => entry.route === '/new-consumer').probeModules,
      ['src/lib/expungement-ai/payment-adapter.ts']);
    assert.deepEqual(extended.consumers.filter((entry) => entry.route !== '/new-consumer').flatMap((entry) => entry.probeModules), [],
      'a reachable checkout adapter does not broaden other consumers');

    write('src/app/missing/route.ts', 'export {GET} from "./does-not-exist";');
    assert.throws(() => discoverRuntimeAuthorityConsumers({ root }), /Unresolved local import/);
    fs.rmSync(path.join(root, 'src/app/missing'), { recursive: true });
    write('src/app/dynamic/route.ts', 'export const GET=async(name)=>import(name);');
    assert.throws(() => discoverRuntimeAuthorityConsumers({ root }), /Unresolved runtime import/);
    await assert.rejects(independentConsumers(root), /Unresolved runtime import/);
    fs.rmSync(path.join(root, 'src/app/dynamic'), { recursive: true });
    write('src/app/unsupported/route.ts', 'const loader = require; export const GET=()=>loader("@/lib/rcap/fulfillment/paid-consumer-successor");');
    assert.throws(() => discoverRuntimeAuthorityConsumers({root}), /Unsupported require reference/);
    await assert.rejects(independentConsumers(root), /Unsupported require reference/);
    fs.rmSync(path.join(root, 'src/app/unsupported'), {recursive:true});
    write('src/app/layout.tsx', 'import {authority} from "@/lib/rcap/fulfillment/paid-consumer-successor";export default()=>authority;');
    assert.throws(()=>discoverRuntimeAuthorityConsumers({root}),/framework-generated boundary/);
    await assert.rejects(independentConsumers(root),/framework-generated boundary/);
    write('src/app/layout.tsx', 'export default function Layout({children}) { return children; }');
    assert.equal(discoverRuntimeAuthorityConsumers({ root }).consumers.length, 4,
      'restored positive fixture proves neither refusal borrowed an already-red baseline');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('independent SWC/Acorn denominator rejects a shared-config subset and includes erased-import mutations', async () => {
  const {independentConsumers,assertDenominators}=await import('./rcap-runtime-authority-independent.mjs');
  // Exercise the same URL-derived root argument as the heavy verifier.
  const a=discoverRuntimeAuthorityConsumers(), b=await independentConsumers(DEFAULT_ROOT_DIR);
  assertDenominators(a,b);
  assert.throws(()=>assertDenominators({...a,consumers:a.consumers.filter(c=>c.route!=='/api/expungement-ai/checkout/status')},b),/Independent consumer denominator mismatch/);
  console.log(`Independent denominators: ${a.entries.length}/${b.entries.length} entries; ${a.consumers.length}/${b.consumers.length} consumers; unresolved 0`);
});

test('independent discovery gives identical closures for canonical and trailing-separator root spellings', async () => {
  const {independentConsumers}=await import('./rcap-runtime-authority-independent.mjs');
  const root=path.resolve(DEFAULT_ROOT_DIR);
  const expected=await independentConsumers(root);
  assert.ok(expected.entries.length>0 && expected.consumers.length>0, 'non-vacuous repository graph');
  for(const suffix of [path.sep,path.sep.repeat(3)]) {
    const actual=await independentConsumers(root+suffix);
    assert.deepEqual(actual,expected,'same entries, consumers, complete closures and unresolved imports');
  }
  console.log(`Root spellings: 3/3 identical; ${expected.entries.length} entries; ${expected.consumers.length} consumers; unresolved ${expected.unresolvedImports.length}`);
});

test('independent discovery still refuses a real outside-root import for every root spelling', async () => {
  const {independentConsumers}=await import('./rcap-runtime-authority-independent.mjs');
  const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-root-containment-'));
  const root=path.join(fixture,'repo'), outside=path.join(fixture,'repo-sibling','authority.ts');
  const entry=path.join(root,'src/app/route.ts');
  const authority=path.join(root,RUNTIME_AUTHORITY_MODULES[0]);
  const write=(file,source)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,source);};
  const variants=[root,root+path.sep,root+path.sep.repeat(3)];
  try {
    write(path.join(root,'tsconfig.json'),JSON.stringify({compilerOptions:{paths:{'@/*':['./src/*']}}}));
    write(authority,'export const authority=true;');
    write(entry,'export {authority as GET} from "@/lib/rcap/fulfillment/paid-consumer-successor";');
    const green=await independentConsumers(root);
    assert.equal(green.entries.length,1);assert.equal(green.consumers.length,1);
    for(const variant of variants)assert.deepEqual(await independentConsumers(variant),green);
    write(outside,'export const authority=true;');
    const spec=path.relative(path.dirname(entry),outside).split(path.sep).join('/');
    write(entry,`export {authority as GET} from ${JSON.stringify(spec)};`);
    for(const variant of variants)await assert.rejects(independentConsumers(variant),/Import escapes source root/);
    console.log('Real outside-root import: 3/3 refused after proven-green baselines (similarly prefixed sibling)');
  } finally {
    fs.rmSync(fixture,{recursive:true,force:true});
  }
});

test('installed Next/picomatch rejects left prefixes as well as all right suffixes', () => {
  for(const route of ['api/foo/route','briefcase/[id]/page','p/[...slug]/page','p/[[...slug]]/page','(group)/api/foo/route']) {
    const key=tracingIncludeKey(route), normalized=route.replace('(group)/','');
    for(const other of ['other/'+route,'other/app/'+route,normalized.replace(/\/(route|page)$/,'x/page'),normalized.replace(/\/(route|page)$/,'/child/page'),normalized.replace('foo','foobar'),normalized.replace('foo','sibling')]) {
      if(other===normalized)continue;
      assert.equal(tracingKeyMatches(key,other),false,`${key} admitted ${other}`);
    }
    assert.equal(tracingKeyMatches(key,normalized),true);
  }
});
