import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadTsWithMocks} from './test-expungement-checkout-guards.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function fixture(t,files){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'legalease-ts-loader-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  for(const [name,source] of Object.entries(files))fs.writeFileSync(path.join(dir,name),source);
  return name=>path.relative(root,path.join(dir,name));
}

test('real cyclic imports reuse the in-progress module and its later exports',t=>{
  const file=fixture(t,{
    'first.ts':`import {readFirst} from './second'; export const value='first-ready'; export function read(){return readFirst();}`,
    'second.ts':`import * as first from './first'; export function readFirst(){return first.value;}`
  });
  assert.equal(loadTsWithMocks(file('first.ts'),{}).read(),'first-ready');
});

test('cached real dependency exposes replaced module.exports',t=>{
  const file=fixture(t,{
    'parent.ts':`import a=require('./dependency'); import b=require('./dependency'); export const same=a===b; export const value=b.value;`,
    'dependency.ts':`module.exports={value:'replacement'};`
  });
  const result=loadTsWithMocks(file('parent.ts'),{});
  assert.equal(result.same,true);assert.equal(result.value,'replacement');
});

test('failed compilation removes the unfinished dependency before retry',t=>{
  const file=fixture(t,{
    'parent.ts':`import {value} from './dependency'; export const result=value;`,
    'dependency.ts':`import {read} from 'loader-test-boundary'; export const value=read();`
  });
  let attempts=0;
  const mocks={'loader-test-boundary':{read(){attempts++;if(attempts===1)throw Error('intentional dependency failure');return 'recovered';}}};
  assert.throws(()=>loadTsWithMocks(file('parent.ts'),mocks),/intentional dependency failure/);
  assert.equal(loadTsWithMocks(file('parent.ts'),mocks).result,'recovered');
  assert.equal(attempts,2);
});

test('module under test stays fresh for each explicit mock and source variant',t=>{
  const file=fixture(t,{'subject.ts':`import {value} from 'loader-test-boundary'; export const result=value;`});
  assert.equal(loadTsWithMocks(file('subject.ts'),{'loader-test-boundary':{value:'first'}}).result,'first');
  assert.equal(loadTsWithMocks(file('subject.ts'),{'loader-test-boundary':{value:'second'}}).result,'second');
  assert.equal(loadTsWithMocks(file('subject.ts'),{},`export const result='source override';`).result,'source override');
});
