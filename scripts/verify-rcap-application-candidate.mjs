/** Execute runtime authority from a sealed candidate archive, never tools data. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
export function verifyApplicationCandidate(root,candidate){
  assert.match(candidate.applicationSha,/^[a-f0-9]{40}$/);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-candidate-authority-'));
  try{
    const archive=path.join(dir,'candidate.tar');const checkout=path.join(dir,'tree');fs.mkdirSync(checkout);
    execFileSync('git',['archive','--format=tar',`--output=${archive}`,candidate.applicationSha],{cwd:root});
    execFileSync('tar',['-xf',archive,'-C',checkout]);
    // Only installed dependencies are shared. All repository code, loaders and
    // data (including evidence) come from this candidate's committed archive.
    fs.symlinkSync(path.resolve(root,'node_modules'),path.join(checkout,'node_modules'),'dir');
    const publication=JSON.parse(fs.readFileSync(path.join(checkout,'data/rcap-render/worker-publication-evidence.json')));
    assert.equal(publication.sourceSha,candidate.workerSourceSha,'candidate publication source');
    assert.equal(publication.immutableRegistryDigest,candidate.workerDigest,'candidate publication digest');
    assert.equal(publication.workflowConclusion,'success','candidate publication conclusion');
    const script=`import {register} from 'node:module';
      register('./scripts/lib/ts-esm-loader.mjs',new URL('./', 'file://'+process.cwd()+'/'));
      const {fulfillmentAuthorityFor}=await import('./src/lib/rcap/fulfillment/grade-a-admission.ts');
      const result=fulfillmentAuthorityFor('MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal');
      console.log(JSON.stringify({state:result.state,authorized:result.authorized,commercialStatus:result.commercialStatus}));`;
    const result=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',script],{cwd:checkout,encoding:'utf8',env:{PATH:process.env.PATH},maxBuffer:1024*1024}));
    assert.equal(result.state,'COMPLETE_PACKET_PROVEN','candidate-local MS authority');
    assert.equal(result.authorized,true,'candidate-local commercial admission');
    assert.equal(result.commercialStatus,'commercially_eligible');
    return {applicationSha:candidate.applicationSha,...result,publication:{source:publication.sourceSha,digest:publication.immutableRegistryDigest,conclusion:publication.workflowConclusion}};
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const candidate=JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'));
  if(process.argv.includes('--application'))candidate.applicationSha=process.argv[process.argv.indexOf('--application')+1];
  console.log(JSON.stringify(verifyApplicationCandidate(process.cwd(),candidate),null,2));
}
