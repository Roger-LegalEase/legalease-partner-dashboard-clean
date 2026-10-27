import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const workflow=fs.readFileSync(new URL('../../.github/workflows/rcap-production-canary.yml',import.meta.url),'utf8');
const digest='sha256:c574d7ca3864dfcae9de3cb4fc77c8c324ace050310333093042f961e6f0b5f1',source='84a75b6e65dc69e6c371afac44f1284e0debf722';
test('actual worker-pull shell consumes existing RCAP identity variables and refuses a different digest',()=>{
 const step=workflow.split('      - name: Pull and identify the accepted worker by immutable digest\n')[1].split('      - name:')[0];
 const script=step.split('        run: |\n')[1].split('\n').map(s=>s.replace(/^          /,'')).join('\n').replaceAll('${{ secrets.GITHUB_TOKEN }}','offline-token').replaceAll('${{ github.actor }}','offline-actor');
 const docker=`docker(){ case "$1" in login|pull) return 0;; inspect) if [[ "$*" == *RepoDigests* ]]; then echo 'ghcr.io/roger-legalease/rcap-render-worker@${digest}'; else echo '${source}'; fi;; *) return 1;; esac; };\n`;
 const env={...process.env,IMAGE_REPOSITORY:'ghcr.io/roger-legalease/rcap-render-worker',RCAP_WORKER_DIGEST:digest,RCAP_WORKER_SOURCE_SHA:source};delete env.WORKER_DIGEST;delete env.WORKER_SOURCE_SHA;
 assert.match(execFileSync('/bin/bash',['-c',docker+script],{env,encoding:'utf8'}),/OCI revision matches/);
 assert.throws(()=>execFileSync('/bin/bash',['-c',docker+script],{env:{...env,RCAP_WORKER_DIGEST:'sha256:'+'0'.repeat(64)},stdio:'pipe'}));
});
test('qualified first-preflight history is bounded and includes every required immutable source',()=>{
 assert.match(workflow,/fetch-depth:.*inputs.phase == 'preflight'.*257 \|\| 0/);assert.match(workflow,/git fetch --no-tags --depth=257 origin captain-release/);
 const refs=workflow.match(/for required in (.+); do/)[1].split(' ');
 for(const ref of refs){execFileSync('git',['cat-file','-e',ref+'^{commit}']);assert(Number(execFileSync('git',['rev-list','--ancestry-path','--count',ref+'..HEAD'],{encoding:'utf8'}))<257);}
 assert.equal(refs.length,5);
});
