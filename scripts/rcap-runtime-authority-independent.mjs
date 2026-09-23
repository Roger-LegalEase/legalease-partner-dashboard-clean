// Denominator B: Next SWC erasure + Acorn JavaScript edges, independently
// enumerated entries, manual local resolver and graph traversal. Deliberately
// imports no config/discovery helper or consumer list from denominator A.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const swc = require('next/dist/build/swc');
const acorn = require('next/dist/compiled/acorn');
const targets = ['paid-consumer-successor','grade-a-registry','grade-a-admission','consumer-specification-binding','worker-static-authority'].map(n => `src/lib/rcap/fulfillment/${n}.ts`).concat(['src/lib/rcap/documents/factory-v2-registry.ts','src/lib/expungement-ai/packet-fulfillment-authority.ts']);
const extensions = ['.ts','.tsx','.js','.jsx','.mjs','.cjs','.mts','.cts','.json'];
function walk(dir) {return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
export async function independentConsumers(rootDir) {
  // Normalize once at the API boundary: URL-derived roots can end in separators.
  const root = path.resolve(rootDir);
  if(['pages','src/pages'].some(p=>fs.existsSync(path.join(root,p))))throw Error('Unsupported Pages Router graph');
  await swc.loadBindings();
  const config = JSON.parse(fs.readFileSync(path.join(root,'tsconfig.json'),'utf8'));
  if(config.compilerOptions.verbatimModuleSyntax||config.compilerOptions.preserveValueImports||config.compilerOptions.importsNotUsedAsValues)throw Error('Unsupported import-erasure compiler options');
  assert.deepEqual(config.compilerOptions.paths, {'@/*':['./src/*']}, 'Independent resolver requires explicit support for changed aliases');
  const app = path.join(root,'src/app'), files = walk(app), entries = [];
  for(const file of files) {
    const relative = path.relative(app,file).split(path.sep).join('/');
    if(relative.split('/').some(p=>p.startsWith('_'))) continue;
    if(!/\.(?:[cm]?[jt]sx?)$/.test(file)) continue;
    if(relative.split('/').some(p=>p.startsWith('@')||p.startsWith('(.'))) throw Error(`Unsupported parallel/intercepted app entry: ${relative}`);
    const stem=path.basename(file).replace(/\.[^.]+$/,'');
    if(['not-found','global-error'].includes(stem)&&path.dirname(file)===app) throw Error(`Custom root boundary unsupported: ${relative}`);
    if(!['page','route','robots','sitemap','manifest'].includes(stem)) {
      if(['icon','apple-icon','opengraph-image','twitter-image'].includes(stem)) throw Error(`Unsupported metadata entry: ${relative}`);
      continue;
    }
    let appPath=relative.replace(/\.[^.]+$/,'');
    const names={robots:'robots.txt/route',sitemap:'sitemap.xml/route',manifest:'manifest.webmanifest/route'};
    if(names[stem]) appPath=appPath.slice(0,-stem.length)+names[stem];
    const starts=[file];
    if(stem==='page') for(let d=path.dirname(file);;d=path.dirname(d)) {
      for(const name of ['layout','template','loading','error','not-found','global-error']) for(const ext of ['.ts','.tsx','.js','.jsx']) {
        const f=path.join(d,name+ext);if(files.includes(f))starts.push(f);
      }
      if(d===app)break;
    }
    entries.push({appPath, route:'/'+appPath.split('/').filter(p=>!p.startsWith('(')).slice(0,-1).join('/'),starts});
  }
  const edges=new Map();
  const queue=[...new Set(entries.flatMap(e=>e.starts))];
  for(let i=0;i<queue.length;i++) {
    const file=queue[i];if(edges.has(file))continue;
    const source=fs.readFileSync(file,'utf8');
    // SWC rejects invalid input and handles type-only/unused type erasure.
    if(/\bimport\s+\w+\s*=/.test(source)) throw Error(`Unsupported import-equals: ${file}`);
    const {code}=await swc.transform(source,{filename:file,jsc:{parser:{syntax:/\.[cm]?tsx?$/.test(file)?'typescript':'ecmascript',tsx:file.endsWith('.tsx'),jsx:file.endsWith('.jsx')},target:'es2022'},module:{type:'es6'}});
    const ast=acorn.parse(code,{ecmaVersion:'latest',sourceType:'module'}), specs=new Set();
    function visit(n,parent) {
      if(!n||typeof n!=='object')return;
      if(n.type==='ImportDeclaration'||n.type==='ExportNamedDeclaration'||n.type==='ExportAllDeclaration') if(n.source)specs.add(n.source.value);
      if(n.type==='ImportExpression') {if(n.source.type!=='Literal'||typeof n.source.value!=='string')throw Error(`Unresolved runtime import: ${file}`);specs.add(n.source.value);}
      if(n.type==='Identifier'&&n.name==='require') {
        if(parent?.type!=='CallExpression'||parent.callee!==n)throw Error(`Unsupported require reference: ${file}`);
        if(parent.arguments.length!==1||parent.arguments[0].type!=='Literal'||typeof parent.arguments[0].value!=='string')throw Error(`Unresolved runtime import: ${file}`);
        specs.add(parent.arguments[0].value);
      }
      for(const v of Object.values(n))if(Array.isArray(v))v.forEach(x=>visit(x,n));else if(v&&typeof v==='object')visit(v,n);
    }
    visit(ast,null);const deps=[];
    for(const spec of specs) {
      if(!spec.startsWith('.')&&!spec.startsWith('@/'))continue;
      const base=spec.startsWith('@/')?path.join(root,'src',spec.slice(2)):path.resolve(path.dirname(file),spec);
      const found=[base,...extensions.map(e=>base+e),...extensions.map(e=>path.join(base,'index'+e))].find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());
      if(!found)throw Error(`Unresolved local import ${spec} in ${file}`);
      if(!found.startsWith(root+path.sep))throw Error(`Import escapes source root: ${file}`);
      if(/\.[cm]?[jt]sx?$/.test(found)&&!found.endsWith('.d.ts'))deps.push(found);
    }
    edges.set(file,deps);queue.push(...deps.filter(f=>!edges.has(f)));
  }
  for(const e of entries) {
    const reached=new Set(),q=[...e.starts];
    while(q.length){const f=q.pop();if(reached.has(f))continue;reached.add(f);q.push(...(edges.get(f)||[]));}
    e.reachable=[...reached].map(f=>path.relative(root,f));
    e.consumer=targets.some(t=>reached.has(path.join(root,t)));
    delete e.starts;
  }
  const inheritedRoot = files.filter(f=>path.dirname(f)===app&&/^(layout|template|loading|error|not-found|global-error)\.[jt]sx?$/.test(path.basename(f)));
  const check=[...inheritedRoot], seen=new Set();
  while(check.length){const f=check.pop();if(seen.has(f))continue;seen.add(f);check.push(...(edges.get(f)||[]));}
  if(targets.some(t=>seen.has(path.join(root,t))))throw Error('Unsupported authority inheritance in framework-generated boundary');
  return {engine:'Next SWC + Acorn, independent resolver/enumerator',entries,consumers:entries.filter(e=>e.consumer),unresolvedImports:[]};
}
export function assertDenominators(a,b) {
  const identity=e=>e.appPath.replace(/^\//,'');
  assert.deepEqual(a.entries.map(identity).sort(),b.entries.map(identity).sort(),'Independent entry denominator mismatch');
  assert.deepEqual(a.consumers.map(identity).sort(),b.consumers.map(identity).sort(),'Independent consumer denominator mismatch');
  for(const c of a.consumers) {
    const peer=b.consumers.find(p=>identity(p)===identity(c));
    const local=[...c.reachable].filter(f=>/\.[cm]?[jt]sx?$/.test(f)).map(f=>f.slice(a.rootDir.length+1)).sort();
    assert.deepEqual(local,[...peer.reachable].sort(),`Independent runtime closure mismatch: ${c.appPath}`);
  }
}
