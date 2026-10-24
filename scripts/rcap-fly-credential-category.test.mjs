import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const workflow=fs.readFileSync(new URL('../.github/workflows/rcap-worker-image-acceptance.yml',import.meta.url),'utf8');
const block=workflow.split("          node --input-type=module <<'NODE'\n")[1];
assert(block,'expected inline category-only program');
const source=block.split('          NODE\n')[0].replace(/^          /gm,'');
test('manual workflow has no provider, checkout, artifact or permission step',()=>{
 assert.match(workflow,/on:\n  workflow_dispatch:\npermissions: \{\}/);
 assert.equal((workflow.match(/secrets\./g)||[]).length,1);
 assert.match(workflow,/FLY_API_TOKEN: \$\{\{ secrets\.FLY_API_TOKEN \}\}/);
 assert(!/uses:|environment:|push:|pull_request:|inputs:|fetch\(|curl|upload-artifact|GITHUB_OUTPUT|GITHUB_ENV/.test(workflow));
});
test('exact workflow program emits only the category with no credential data',()=>{
 for(const [token,expected] of [
   ['FlyV1 fm2_SYNTHETIC_PRIVATE_SENTINEL','Already-prefixed FlyV1'],
   ['fm2_SYNTHETIC_PRIVATE_SENTINEL','Bare fm2 token'],
   ['Bearer fo1_SYNTHETIC_PRIVATE_SENTINEL','Already-prefixed Bearer'],
   ['fo1_SYNTHETIC_PRIVATE_SENTINEL','Raw legacy token'],
   ['  FlyV1 fm2_SYNTHETIC_PRIVATE_SENTINEL  ','Already-prefixed FlyV1'],
   [undefined,'Unknown'],['','Unknown'],['   ','Unknown'],['invalid multiple words','Unknown'],
   ...[0,1,9,10,11,12,13,127].flatMap(code=>[
     [String.fromCharCode(code)+'FlyV1 fm2_SYNTHETIC_PRIVATE_SENTINEL','Unknown'],
     ['FlyV1'+String.fromCharCode(code)+'fm2_SYNTHETIC_PRIVATE_SENTINEL','Unknown'],
     ['fm2_SYNTHETIC_PRIVATE_SENTINEL'+String.fromCharCode(code),'Unknown']
   ]),
 ]){
   // OS environments cannot contain NUL; exercise that input inside the synthetic child.
   const nul=token?.includes('\0');
   const program=nul?source.replace('const token=process.env.FLY_API_TOKEN;','const token='+JSON.stringify(token)+';'):source;
   const result=spawnSync(process.execPath,['--input-type=module','-e',program],{encoding:'utf8',env:token===undefined||nul?{}:{FLY_API_TOKEN:token},timeout:5000});
   assert.equal(result.status,0);
   assert.equal(result.stderr,'');
   assert.equal(result.stdout,expected+'\n');
 }
});
