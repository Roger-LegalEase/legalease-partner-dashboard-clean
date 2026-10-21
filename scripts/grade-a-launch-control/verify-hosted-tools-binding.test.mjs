import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {verifyReleaseCandidateBinding} from './verify-release-candidate-binding.mjs';

test('exact hosted tooling binds; identity, unknown files and post-binding edits refuse', () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'hosted-tools-binding-'));
  try {
    execFileSync('git',['clone','--quiet','--shared',process.cwd(),root],{stdio:'pipe'});
    const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:'pipe'}).trim();
    const candidate=JSON.parse(fs.readFileSync(path.join(root,'data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json')));
    const toolsSha=git('rev-parse','HEAD');
    const orchestrationFiles=git('diff','--name-only',candidate.applicationSha,toolsSha).split('\n').filter(p=>p.startsWith('scripts/')||p.startsWith('.github/'));
    const binding={applicationSha:candidate.applicationSha,workerSourceSha:candidate.workerSourceSha,workerDigest:candidate.workerDigest,workerInputFingerprint:candidate.workerInputFingerprint,toolsSha,orchestrationFiles};
    const receipt=path.join(root,'data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json');
    const write=b=>fs.writeFileSync(receipt,JSON.stringify(b));
    write(binding);assert.equal(verifyReleaseCandidateBinding(root,candidate).current,true);
    for(const [key,value] of [['toolsSha','0'.repeat(40)],['applicationSha','0'.repeat(40)],['workerDigest','sha256:'+'0'.repeat(64)],['workerInputFingerprint','sha256:'+'0'.repeat(64)],['orchestrationFiles',[]]]) {
      write({...binding,[key]:value});assert.equal(verifyReleaseCandidateBinding(root,candidate).current,false,key);
    }
    write(binding);
    for(const rel of ['scripts/rcap-vercel-identity-recheck.mjs','src/unapproved-hosted-test.js','public/unapproved-hosted-test.txt']) {
      const file=path.join(root,rel);const prior=fs.existsSync(file)?fs.readFileSync(file):null;
      fs.mkdirSync(path.dirname(file),{recursive:true});fs.appendFileSync(file,'\n// unauthorized drift\n');
      assert.equal(verifyReleaseCandidateBinding(root,candidate).current,false,rel);
      if(prior)fs.writeFileSync(file,prior);else fs.unlinkSync(file);
    }
    assert.equal(verifyReleaseCandidateBinding(root,candidate).current,true);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
