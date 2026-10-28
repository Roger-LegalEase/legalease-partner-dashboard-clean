import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const workflow=fs.readFileSync(new URL('../.github/workflows/rcap-production-canary.yml',import.meta.url),'utf8');
function shell(name){const step=workflow.split('      - name: '+name+'\n')[1].split('      - name:')[0];return step.split('        run: |\n')[1].split('\n').map(s=>s.replace(/^          /,'')).join('\n');}
const behavior=shell('Verify the Production migration behavior'),forward=shell('Verify the exact Production forward-chain migration contract');
for(const qualified of [true,false])test('actual workflow selects one applicable suite and keeps the legacy path '+qualified,()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'qualified-workflow-selection-'));try{
  const record=path.join(dir,'data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json');fs.mkdirSync(path.dirname(record),{recursive:true});fs.writeFileSync(record,JSON.stringify(qualified?{qualifiedWorkerDatabase:{selectorFixtureOnly:true}}:{}));
  const capture=path.join(dir,'calls.txt'),stub='node(){ if [ "$1" = -e ]; then "$SELECTOR_NODE" "$@"; else printf "%s|%s\\n" "${QUALIFIED_DB_CONTROLLER_TEST-}" "$*" >> "$SELECTOR_CAPTURE"; fi; };\n';
  execFileSync('/bin/bash',['-c','set -euo pipefail\n'+stub+behavior+'\n'+forward],{cwd:dir,env:{...process.env,SELECTOR_NODE:process.execPath,SELECTOR_CAPTURE:capture}});
  const calls=fs.readFileSync(capture,'utf8').trim().split('\n');assert.equal(calls.filter(s=>s.includes('verify-rcap-production-forward-chain-migrate.mjs')).length,1);
  if(qualified){assert.equal(calls.length,2);assert(calls[0].startsWith('1|--test '));assert.equal(calls.filter(s=>s.includes('scripts/qualified-production-database.test.mjs')).length,1);assert(calls[0].includes('qualified-production-database-binding.test.mjs'));assert(calls.every(s=>!s.includes('scripts/rcap-production-migration-contract.test.mjs')&&!s.includes('scripts/test-rcap-production-forward-chain-migrate-mutations.mjs')));}
  else{assert.equal(calls.length,3);assert(calls[0].includes('--test scripts/rcap-production-migration-contract.test.mjs'));assert(calls[2].includes('scripts/test-rcap-production-forward-chain-migrate-mutations.mjs'));}
 }finally{fs.rmSync(dir,{recursive:true});}
});
