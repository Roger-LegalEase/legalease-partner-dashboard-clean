import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {test} from 'node:test';
import {spawnSync} from 'node:child_process';
import {guardPackagedRoot} from './rcap-runtime-authority-isolation.mjs';
import {sha256} from './rcap-runtime-authority-identity.mjs';
const root=process.cwd(), probe=path.join(root,'scripts/rcap-runtime-authority-probe.mjs');
function run(box) {const result=spawnSync(process.execPath,[probe,'--root',box,'--modes','successor,resolver,commercial,checkout'],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});return {...result,json:result.status===0?JSON.parse(result.stdout):null};}
test('normal packaged authority, missing-file refusal, exact restoration, sibling hold, symlink escape refusal',()=>{
  const source=run(root);assert.equal(source.status,0,source.stderr);assert.equal(source.json.results.checkout.creation,null);
  const box=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-isolation-test-'));
  try {
    for(const {path:rel} of source.json.reads){const target=path.join(box,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,rel),target);}
    const green=run(box);assert.equal(green.status,0,green.stderr);assert.deepEqual(green.json.results,source.json.results);
    const victim=source.json.results.successor.decisionPath, target=path.join(box,victim), bytes=fs.readFileSync(target);
    fs.unlinkSync(target);const missing=run(box);assert.equal(missing.status,0,missing.stderr);
    assert.equal(missing.json.results.successor.loaded,false);assert.ok(missing.json.results.checkout.creation);assert.equal(missing.json.results.resolver.unmigratedSibling,'legacy_retired');
    fs.writeFileSync(target,bytes);assert.equal(sha256(fs.readFileSync(target)),sha256(bytes));const restored=run(box);assert.equal(restored.status,0,restored.stderr);assert.deepEqual(restored.json.results,green.json.results);
    fs.unlinkSync(target);fs.symlinkSync(path.join(root,victim),target);const escaped=run(box);assert.notEqual(escaped.status,0);assert.match(escaped.stderr,/PACKAGED_ROOT_ESCAPE/);
    console.log('baseline GREEN; missing authority REFUSED; restoration GREEN; source symlink RED; sibling REFUSED');
  }finally{fs.rmSync(box,{recursive:true,force:true});}
});
test('realpath boundary covers enumerations, exists, file reads, absent children and swallowed errors',()=>{
  const box=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-boundary-test-'));const outside=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-outside-'));
  fs.writeFileSync(path.join(outside,'authority.json'),'{}');fs.symlinkSync(outside,path.join(box,'data'));
  try {
    for(const action of [()=>fs.readdirSync(path.join(box,'data')),()=>fs.existsSync(path.join(box,'data/authority.json')),()=>fs.readFileSync(path.join(box,'data/authority.json')),()=>fs.existsSync(path.join(box,'data/missing.json'))]) {
      const guard=guardPackagedRoot(box);guard.beginEvaluation();
      try {assert.throws(action,/PACKAGED_ROOT_ESCAPE/);assert.throws(()=>guard.assertClean(),/PACKAGED_ROOT_ESCAPE/);}finally{guard.restore();}
    }
  }finally{fs.rmSync(box,{recursive:true,force:true});fs.rmSync(outside,{recursive:true,force:true});}
});

test('execution content identity is deterministic and catches build-helper/source/probe movement', async()=>{
  const {execFileSync}=await import('node:child_process');const {executionIdentity}=await import('./rcap-runtime-authority-identity.mjs');
  const box=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-identity-test-'));
  const git=(...args)=>execFileSync('git',args,{cwd:box,stdio:'pipe'});
  try {
    git('init','-q');fs.mkdirSync(path.join(box,'scripts'));fs.mkdirSync(path.join(box,'src'));fs.mkdirSync(path.join(box,'data'));
    const names=['package.json','package-lock.json','next.config.ts','scripts/rcap-runtime-authority-consumers.mjs','scripts/rcap-runtime-authority-probe.mjs','scripts/verify-rcap-runtime-authority-tracing.mjs','src/authority.ts','data/authority.json'];
    for(const p of names)fs.writeFileSync(path.join(box,p),'{}\n');
    git('add','--',...names);git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','identity fixture');
    const before=executionIdentity(box);assert.deepEqual(executionIdentity(box),before);
    for(const p of names) {fs.appendFileSync(path.join(box,p),' ');assert.notEqual(executionIdentity(box).sourceIdentitySha256,before.sourceIdentitySha256,p);fs.writeFileSync(path.join(box,p),'{}\n');}
    assert.deepEqual(executionIdentity(box),before);
    const link=path.join(box,'data/synthetic-link.json');fs.symlinkSync('first-missing-target',link);
    const first=executionIdentity(box).sourceIdentitySha256;fs.unlinkSync(link);fs.symlinkSync('second-missing-target',link);
    assert.notEqual(executionIdentity(box).sourceIdentitySha256,first,'symlink bytes are bound without dereferencing');
    fs.unlinkSync(link);assert.deepEqual(executionIdentity(box),before);
  }finally{fs.rmSync(box,{recursive:true,force:true});}
});
