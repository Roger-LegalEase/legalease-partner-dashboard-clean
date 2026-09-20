import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {verifyReleaseCandidateBinding} from './verify-release-candidate-binding.mjs';

test('exact clean candidate accepts; tracked and untracked packaged changes refuse', () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-release-binding-'));
  const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  const write=(p,s)=>{fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),s);};
  const files={'package.json':'{}','package-lock.json':'{}','tsconfig.json':'{}','src/main.mjs':'export default 1;','scripts/rcap-render-worker.mjs':'export default 1;','scripts/lib/runtime.mjs':'export default 1;','data/runtime/input.json':'{}','deploy/rcap-render-worker/Dockerfile':'FROM node:22\nCOPY scripts/lib/ scripts/lib/\nCOPY src/ src/\nCOPY data/runtime/ data/runtime/\n',
    // The build-context allowlist decides what those COPY lines can actually
    // see, so it is a fixed worker input like the Dockerfile beside it. The
    // fixture has to carry one: when it became a canonical input and this
    // synthetic repository did not gain it, the clean candidate stopped being
    // accepted here for a reason that says nothing about the real repository.
    'deploy/rcap-render-worker/Dockerfile.dockerignore':'*\n!scripts/lib/**\n!src/**\n!data/runtime/**\n',
    // The §7 supplemental guides and the brand asset are canonical worker
    // inputs too, and a tree missing a canonical input is reported as
    // rebuild-required rather than clean. A fixture that omits them cannot
    // demonstrate the clean-candidate case it exists to demonstrate.
    'data/record-clearing/supplemental-guides/synthetic.json':'{}',
    'data/record-clearing/brand/legalease-logo.png':'synthetic-brand-bytes'};
  git('init','--quiet');git('config','user.name','Synthetic Test');git('config','user.email','synthetic@example.test');
  for(const [p,s]of Object.entries(files))write(p,s);
  git('add','--',...Object.keys(files));git('commit','--quiet','-m','synthetic worker source');const source=git('rev-parse','HEAD');
  const digest='sha256:'+'a'.repeat(64);const publication='data/rcap-render/worker-publication-evidence.json';
  write(publication,JSON.stringify({sourceSha:source,immutableRegistryDigest:digest,workflowConclusion:'success'}));
  git('add','--',publication);git('commit','--quiet','-m','synthetic candidate');
  const candidate={applicationSha:git('rev-parse','HEAD'),workerDigest:digest};
  assert.equal(verifyReleaseCandidateBinding(root,candidate).current,true);
  for(const p of ['scripts/lib/untracked.mjs','data/runtime/untracked.json','public/untracked.js']){
    write(p,'new input');const r=verifyReleaseCandidateBinding(root,candidate);assert.equal(r.current,false);assert(r.reasons.some(s=>s.includes(p)));fs.unlinkSync(path.join(root,p));
  }
  write('src/main.mjs','export default 2;');assert.equal(verifyReleaseCandidateBinding(root,candidate).current,false);
  write('src/main.mjs',files['src/main.mjs']);assert.equal(verifyReleaseCandidateBinding(root,candidate).current,true);
  assert.equal(verifyReleaseCandidateBinding(root,{...candidate,workerDigest:'sha256:'+'b'.repeat(64)}).current,false);
  assert.equal(verifyReleaseCandidateBinding(root,null).status,'NOT_FROZEN');
  assert.equal(verifyReleaseCandidateBinding(root,{applicationSha:'invalid'}).status,'INVALID');
});
