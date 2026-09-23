/** Derive Next server authority consumers; never maintain a second route list. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { normalizeAppPath } = require('next/dist/shared/lib/router/utils/app-paths');
const { normalizeMetadataRoute } = require('next/dist/lib/metadata/get-metadata-route');
const picomatch = require('next/dist/compiled/picomatch');
export const DEFAULT_ROOT_DIR = fileURLToPath(new URL('../', import.meta.url));
const SOURCE_EXTENSION = /\.(?:[cm]?[jt]sx?)$/;
const ENTRY_NAMES = new Set(['page', 'route']);
const METADATA_NAMES = new Set(['robots', 'sitemap', 'manifest', 'icon', 'apple-icon', 'opengraph-image', 'twitter-image']);
const INHERITED_NAMES = ['layout', 'template', 'loading', 'error', 'not-found', 'global-error'];

export const RUNTIME_AUTHORITY_MODULES = Object.freeze([
  'src/lib/rcap/fulfillment/paid-consumer-successor.ts',
  'src/lib/rcap/documents/factory-v2-registry.ts',
  'src/lib/expungement-ai/packet-fulfillment-authority.ts',
  'src/lib/rcap/fulfillment/grade-a-admission.ts',
  'src/lib/rcap/fulfillment/grade-a-registry.ts',
  'src/lib/rcap/fulfillment/consumer-specification-binding.ts',
  'src/lib/rcap/fulfillment/worker-static-authority.ts',
]);

/** Select behavioral probes only when the entry can reach their real module. */
export const RUNTIME_AUTHORITY_PROBE_MODULES = Object.freeze([
  'src/lib/rcap/documents/packet-route-resolver.ts',
  'src/lib/expungement-ai/payment-adapter.ts',
  'src/lib/rcap/fulfillment/worker-static-authority.ts',
]);

/** Structural runtime custody categories, without jurisdiction or route selectors. */
export const RUNTIME_AUTHORITY_FILES = Object.freeze([
  'data/record-clearing/legal-decisions/**',
  'data/record-clearing/packet-specifications/**',
  'data/record-clearing/supplemental-guides/**',
  'data/rcap-ledger/grade-a/*.json',
  'data/rcap-ledger/grade-a/artifacts/**',

]);

const slash = (value) => value.split(path.sep).join('/');
const relative = (root, value) => slash(path.relative(root, value));
function filesBelow(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(file) : entry.isFile() ? [file] : [];
  }).sort();
}

/** Next 16's collector matches normalized *entry names*, including /app. */
export function tracingMatchPath(appPath) {
  return normalizeAppPath(`app/${appPath.replace(/^\//, '')}`);
}

export function tracingIncludeKey(appPath) {
  const literal = tracingMatchPath(appPath).replace(/[\\*?\[\]{}()!+@]/g, '\\$&');
  // Next passes contains:true to picomatch. A bare route is therefore a prefix,
  // not an exact match. This negative extglob excludes every nonempty suffix
  // (with or without slashes), while preserving literal dynamic segment names.
  return `(?<![\\s\\S])${literal}!(*?|/**)`;
}

export function tracingKeyMatches(key, appPath) {
  return picomatch(key, { dot: true, contains: true })(tracingMatchPath(appPath));
}

function runtimeImports(file, source) {
  const input = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  function rejectUnsupported(node) {
    if (ts.isImportEqualsDeclaration(node) && !node.isTypeOnly) throw new Error(`Unsupported runtime import-equals in ${file}`);
    if (ts.isIdentifier(node) && node.text === 'require') {
      if (!(ts.isCallExpression(node.parent) && node.parent.expression === node)) throw new Error(`Unsupported require reference in ${file}`);
    }
    ts.forEachChild(node, rejectUnsupported);
  }
  rejectUnsupported(input);
  // Use the installed TypeScript emitter to discard both explicit type-only
  // imports and ordinary imports used only as types. A regex cannot do this.
  const compiled = ts.transpileModule(source, {
    fileName: file,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      isolatedModules: true,
    },
    reportDiagnostics: true,
  });
  if (compiled.diagnostics?.some(d => d.category === ts.DiagnosticCategory.Error)) throw new Error(`Unresolved syntax in ${file}`);
  const emitted = compiled.outputText;
  const ast = ts.createSourceFile(file, emitted, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const imports = new Set();
  const unresolvedDynamicImports = [];
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
      && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      imports.add(node.moduleSpecifier.text);
    }
    if (ts.isCallExpression(node)
      && (node.expression.kind === ts.SyntaxKind.ImportKeyword
        || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
      const argument = node.arguments[0];
      if (argument && ts.isStringLiteralLike(argument)) imports.add(argument.text);
      else unresolvedDynamicImports.push(node.getText(ast));
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return { imports: [...imports], unresolvedDynamicImports };
}

/**
 * Module reachability is conservative within a runtime module (not an export
 * tree-shaker). Client components are SSR code too, so their runtime imports
 * remain traversable. Type-only and compiler-erased imports are excluded.
 * Layout/template/loading/error inputs are inherited by pages, never handlers.
 */
export function discoverRuntimeAuthorityConsumers({ root = DEFAULT_ROOT_DIR, rootDir } = {}) {
  root = path.resolve(rootDir ?? root);
  const appRoot = path.join(root, 'src/app');
  if (['pages','src/pages'].some(p=>fs.existsSync(path.join(root,p)))) throw new Error('Unsupported Pages Router graph; emitted-entry support required');
  const configPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) throw new Error('Runtime authority discovery requires tsconfig.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  if (parsed.errors.length) throw new Error(parsed.errors.map((error) => ts.flattenDiagnosticMessageText(error.messageText, '\n')).join('\n'));
  if (parsed.options.verbatimModuleSyntax || parsed.options.preserveValueImports || parsed.options.importsNotUsedAsValues) throw new Error('Unsupported import-erasure compiler options; both denominators must be updated explicitly');
  const allFiles = filesBelow(appRoot);
  const sourceFiles = allFiles.filter((file) => SOURCE_EXTENSION.test(file) && !file.endsWith('.d.ts'));
  const sourceSet = new Set(sourceFiles);
  const authorityRoots = new Set(RUNTIME_AUTHORITY_MODULES.map((file) => path.join(root, file)));
  const probeRoots = new Set(RUNTIME_AUTHORITY_PROBE_MODULES.map((file) => path.join(root, file)));
  for (const file of authorityRoots) if (!fs.existsSync(file)) throw new Error(`Authority source missing: ${relative(root, file)}`);
  const moduleCache = new Map();
  const resolverCache = ts.createModuleResolutionCache(root, (value) => value, parsed.options);

  function edges(file) {
    if (moduleCache.has(file)) return moduleCache.get(file);
    const result = runtimeImports(file, fs.readFileSync(file, 'utf8'));
    if (result.unresolvedDynamicImports.length) {
      throw new Error(`Unresolved runtime import in ${relative(root, file)}: ${result.unresolvedDynamicImports.join(', ')}`);
    }
    const imports = [];
    for (const specifier of result.imports) {
      const resolved = ts.resolveModuleName(specifier, file, parsed.options, ts.sys, resolverCache).resolvedModule;
      if (!resolved) {
        // Styles, images and runtime externals cannot import our source modules.
        // A missing local executable import must not silently erase a consumer.
        const local = specifier.startsWith('.') || Object.keys(parsed.options.paths ?? {}).some((alias) => specifier.startsWith(alias.replace(/\*.*$/, '')));
        if (local && !/\.(?:css|scss|sass|svg|png|jpe?g|gif|webp|ico|woff2?|pdf)$/.test(specifier)) {
          throw new Error(`Unresolved local import ${specifier} in ${relative(root, file)}`);
        }
        continue;
      }
      const target = path.resolve(resolved.resolvedFileName);
      if (!resolved.isExternalLibraryImport && target.startsWith(`${root}${path.sep}`)
        && SOURCE_EXTENSION.test(target) && !target.endsWith('.d.ts')) imports.push(target);
    }
    moduleCache.set(file, imports);
    return imports;
  }

  function closure(starts) {
    const parents = new Map(starts.map((file) => [file, null]));
    const queue = [...starts];
    const matches = [];
    const probeModules = [];
    for (let index = 0; index < queue.length; index++) {
      const file = queue[index];
      if (probeRoots.has(file)) probeModules.push(relative(root, file));
      if (authorityRoots.has(file)) {
        const chain = [];
        for (let cursor = file; cursor !== null; cursor = parents.get(cursor)) chain.unshift(relative(root, cursor));
        matches.push({ authority: relative(root, file), chain });
      }
      for (const imported of edges(file)) {
        if (!parents.has(imported)) { parents.set(imported, file); queue.push(imported); }
      }
    }
    return {
      reachable: new Set(queue),
      authorityPaths: matches.sort((a, b) => a.authority.localeCompare(b.authority)),
      probeModules: probeModules.sort(),
    };
  }

  const entries = [];
  for (const file of sourceFiles) {
    const local = relative(appRoot, file);
    if (local.split('/').some((segment) => segment.startsWith('_'))) continue;
    if (local.split('/').some(segment => segment.startsWith('@') || segment.startsWith('(.'))) throw new Error(`Unsupported parallel/intercepted app entry: ${local}`);
    const name = path.basename(file).replace(SOURCE_EXTENSION, '');
    const metadata = METADATA_NAMES.has(name);
    if (!ENTRY_NAMES.has(name) && !metadata) {
      if (['not-found', 'global-error'].includes(name) && !local.includes('/')) throw new Error(`Custom root boundary requires emitted-graph support: ${local}`);
      continue;
    }
    if (metadata && !['robots','sitemap','manifest'].includes(name)) throw new Error(`Unsupported metadata entry: ${local}`);
    let appPath = local.replace(SOURCE_EXTENSION, '');
    if (metadata) {
      appPath = normalizeMetadataRoute(`/${appPath}`).replace(/^\//, '');
      // Static sitemap generation uses /sitemap.xml; dynamic image/sitemap
      // variants are reconciled against the emitted manifest by the verifier.
      if (name === 'sitemap') appPath = appPath.replace(/sitemap\/route$/, 'sitemap.xml/route');
    }
    const inheritedEntries = [];
    if (name === 'page') {
      for (let directory = path.dirname(file); ; directory = path.dirname(directory)) {
        for (const inherited of INHERITED_NAMES) {
          for (const extension of ['tsx', 'ts', 'jsx', 'js']) {
            const candidate = path.join(directory, `${inherited}.${extension}`);
            if (sourceSet.has(candidate)) inheritedEntries.push(candidate);
          }
        }
        if (directory === appRoot) break;
      }
    }
    const { authorityPaths, probeModules, reachable } = closure([file, ...inheritedEntries]);
    entries.push({
      entry: relative(root, file), file: relative(root, file), kind: name === "route" || metadata ? "route" : "page", appPath,
      route: normalizeAppPath(`/${appPath}`),
      tracingMatchPath: tracingMatchPath(appPath),
      tracingKey: tracingIncludeKey(appPath),
      trace: `.next/server/app/${appPath}.js.nft.json`,
      inheritedEntries: inheritedEntries.map((entry) => relative(root, entry)),
      authorityPaths,
      probeModules, reachable,
    });
  }
  const rootBoundaries = sourceFiles.filter(f => path.dirname(f) === appRoot && INHERITED_NAMES.includes(path.basename(f).replace(SOURCE_EXTENSION, '')));
  if (closure(rootBoundaries).authorityPaths.length) throw new Error('Unsupported authority inheritance in framework-generated boundary; emitted-graph support required');
  entries.sort((a, b) => a.entry.localeCompare(b.entry));
  const consumers = entries.filter((entry) => entry.authorityPaths.length > 0);
  if (!consumers.length) throw new Error('Runtime authority discovery found no consumers');
  return { rootDir: root, consumers, entries, unresolvedImports: [], authorityRoots: [...RUNTIME_AUTHORITY_MODULES], moduleCount: moduleCache.size };
}

export function createRuntimeAuthorityTracingIncludes(options = {}) {
  const { consumers, entries } = discoverRuntimeAuthorityConsumers(options);
  const includes = Object.fromEntries(consumers.map((entry) => [entry.tracingKey, [...RUNTIME_AUTHORITY_FILES]]));
  for (const entry of entries) {
    const matches = Object.keys(includes).some((key) => tracingKeyMatches(key, entry.appPath));
    if (matches !== (entry.authorityPaths.length > 0)) {
      throw new Error(`Runtime authority tracing scope mismatch: ${entry.entry}`);
    }
  }
  return includes;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--tracing-includes')) {
    throw new Error('usage: node scripts/rcap-runtime-authority-consumers.mjs [--tracing-includes]');
  }
  console.log(JSON.stringify(process.argv[2] === '--tracing-includes'
    ? createRuntimeAuthorityTracingIncludes() : discoverRuntimeAuthorityConsumers(), null, 2));
}

export const RUNTIME_AUTHORITY_INCLUDES = RUNTIME_AUTHORITY_FILES.map(p => p.replace(/^\.\//, ''));
export function tracingIncludesFor(consumers) {
  return Object.fromEntries(consumers.map(c => [c.tracingKey, [...RUNTIME_AUTHORITY_INCLUDES]]));
}
export function emittedAppRoutes({ rootDir = DEFAULT_ROOT_DIR } = {}) {
  const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, '.next/server/app-paths-manifest.json'), 'utf8'));
  return Object.entries(manifest).map(([appPath, bundle]) => ({appPath, bundle, route: normalizeAppPath(appPath)}));
}
export function measureKeyCoverage({keys, consumerRoutes, allRoutes}) {
  const matchers = keys.map(k => picomatch(k, {dot:true, contains:true}));
  const wanted = new Set(consumerRoutes), matched = [], omitted = [], unintended = [];
  for (const route of allRoutes) {
    const hit = matchers.some(m => m('/app' + route));
    if (wanted.has(route)) (hit ? matched : omitted).push(route);
    else if (hit) unintended.push({route});
  }
  return {matched, omitted, unintended, missingFromRoutes: consumerRoutes.filter(r => !allRoutes.includes(r))};
}
export function expandRuntimeAuthorityIncludes({rootDir = DEFAULT_ROOT_DIR} = {}) {
  const matcher = picomatch(RUNTIME_AUTHORITY_INCLUDES, {dot:true});
  const files = filesBelow(path.join(rootDir, 'data')).filter(f => matcher(relative(rootDir,f))).map(f => ({file:relative(rootDir,f),bytes:fs.statSync(f).size}));
  return {files, count:files.length, bytes:files.reduce((n,f) => n+f.bytes,0)};
}
