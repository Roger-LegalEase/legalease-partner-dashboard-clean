// Regenerate a complete, reviewable metadata successor on an ephemeral CI
// checkout after a failed convergence check. The failed check stays failed.
// No packet builder, source download, approval or branch write is performed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const generatedJson = new Set([
  'MASTER_QUEUE', 'ACTIVE_ASSIGNMENTS', 'IMPORT_GRAPH', 'COLLISIONS', 'CHECKPOINT',
  'claim-ledger', 'CLAIM_LEDGER_REPAIR', 'SOURCE_CONVEYOR_ASSIGNMENTS',
  'SOURCE_ACQUISITION_MANIFEST', 'CONTINUOUS_INTEGRATION_STATE', 'WASHINGTON_REPAIR',
  'SOURCE_RELATIONSHIP_REGISTRY', 'ROGER_SOURCE_UNBLOCK_LIST', 'RASTER_WORKFLOW_BINDINGS'
].map(name=>`data/rcap-grade-a/packet-factory-24h/${name}.json`));
export function permittedMetadata(file) {
  return generatedJson.has(file)
    || /^docs\/rcap\/grade-a\/packet-factory-24h\/(?:washington-repair\/)?[A-Z]+[0-9]+\.md$/.test(file)
    || file==='docs/rcap/grade-a/packet-factory-24h/ROGER_SOURCE_UNBLOCK_LIST.md';
}
export function assertNoSymlinkAncestors(directory) {
  for(let current=path.resolve(directory);;current=path.dirname(current)) {
    try { assert(!fs.lstatSync(current).isSymbolicLink(),'Candidate directory contains a symlink'); }
    catch(error) { if(error.code!=='ENOENT')throw error; }
    if(current===path.dirname(current))break;
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
  assert.equal(process.env.GITHUB_ACTIONS,'true','Candidate writes are restricted to the existing ephemeral CI runner');
  assert.equal(path.resolve(process.env.GITHUB_WORKSPACE??''),root);
  const out=path.resolve(process.env.GENERATED_SUCCESSOR_DIR??'');
  assert(path.isAbsolute(process.env.GENERATED_SUCCESSOR_DIR??'')&&!out.startsWith(root+path.sep)&&out!==root);
  assertNoSymlinkAncestors(out);
  assert(!fs.existsSync(out),'Never overwrite captured evidence');
  const prior=JSON.parse(fs.readFileSync(path.join(process.env.GENERATOR_SOURCE_AUDIT_DIR,'convergence-results.json')));
  assert.equal(prior.status,'FAIL','A failed actual convergence check is required');
  assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}),'','Preserve any active edit');
  const sourceSha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  assert.equal(sourceSha,process.env.FACTORY_APPLICATION_SHA);
  fs.mkdirSync(out,{mode:0o700});
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'data/rcap-grade-a/source-custody/generator-preflight-20261013/manifest.json')));
  const env={...process.env,FACTORY_CANDIDATE_DIR:'',GENERATOR_SOURCE_AUDIT_DIR:path.join(out,'source-reads'),NODE_OPTIONS:[process.env.NODE_OPTIONS??'','--require '+JSON.stringify(path.join(root,'scripts/rcap-corpus/guard-generator-source-reads.cjs'))].join(' ')};
  const report={status:'INCOMPLETE',sourceSha,originalCheck:'FAIL',originalConvergence:prior,candidateOnly:true,commands:[],files:[]};
  try {
    for(const entry of manifest.entrypoints) {
      const result=spawnSync(process.execPath,[entry],{cwd:root,env,encoding:'utf8',timeout:300000,maxBuffer:2**26});
      fs.writeFileSync(path.join(out,path.basename(entry)+'.log'),(result.stdout??'')+(result.stderr??''),{flag:'wx'});
      report.commands.push({entry,exitCode:result.status,status:result.status===0&&!result.error?'PASS':'FAIL'});
      assert.equal(result.status,0,`Candidate generation failed: ${entry}`);
    }
    const changed=execFileSync('git',['diff','--name-only','-z','HEAD'],{cwd:root}).toString().split('\0').filter(Boolean);
    const added=execFileSync('git',['ls-files','--others','--exclude-standard','-z'],{cwd:root}).toString().split('\0').filter(Boolean);
    for(const file of [...new Set([...changed,...added])].sort()) {
      assert(permittedMetadata(file),`Unexpected generated path: ${file}`);
      const source=path.join(root,file);assert(fs.lstatSync(source).isFile(),`No deletion or symlink may be captured: ${file}`);
      const bytes=fs.readFileSync(source),target=path.join(out,'files',file);
      fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes,{flag:'wx'});
      report.files.push({path:file,byteLength:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
    }
    const result=spawnSync(process.execPath,['scripts/rcap-corpus/check-generator-convergence.mjs'],{cwd:root,env,encoding:'utf8',timeout:600000,maxBuffer:2**26});
    fs.writeFileSync(path.join(out,'successor-convergence.log'),(result.stdout??'')+(result.stderr??''),{flag:'wx'});
    report.candidateConvergence=result.status===0&&!result.error?'PASS':'FAIL';
    assert.equal(result.status,0,'Generated successor did not converge');
    report.status='READY_FOR_INDEPENDENT_METADATA_REVIEW';
  } finally {
    fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  }
}
