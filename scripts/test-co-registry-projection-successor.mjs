import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const record='data/rcap-ledger/registry-crosswalk-projection-co-2025-successor.json';
const registry='data/record-clearing/legal-design-track-registry.json';
const projection='data/rcap-ledger/registry-crosswalk-projection.json';
const source='reference/co-jdf-2025-07-01/JDF612.pdf';
const paths=[record,registry,projection,source];
const original=new Map(paths.map(p=>[p,fs.readFileSync(root+p)]));
// Mutations live outside the tested checkout; Git is used only to read pinned blobs.
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'co-projection-successor-'));
const gitDir=execFileSync('git',['rev-parse','--absolute-git-dir'],{cwd:root,encoding:'utf8'}).trim();
for(const file of [...paths,'scripts/extract-rcap-registry-projection.mjs']){
  fs.mkdirSync(path.dirname(path.join(scratch,file)),{recursive:true});
  fs.copyFileSync(root+file,path.join(scratch,file));
}
const check=()=>spawnSync(process.execPath,['scripts/extract-rcap-registry-projection.mjs','--check'],{
  cwd:scratch,encoding:'utf8',env:{...process.env,GIT_DIR:gitDir,GIT_WORK_TREE:scratch},
});
try {
const clean=check();assert.equal(clean.status,0,clean.stderr);
let mutants=0;
function reject(file,mutate,expected){
  try{
    fs.writeFileSync(path.join(scratch,file),mutate(original.get(file)));
    const result=check();assert.notEqual(result.status,0);assert.match(result.stderr,expected);mutants++;
  }finally{fs.writeFileSync(path.join(scratch,file),original.get(file));}
}
const json=(bytes,mutate)=>{const data=JSON.parse(bytes);mutate(data);return JSON.stringify(data,null,2)+'\n';};
reject(record,b=>json(b,d=>{d.importRoot.projectedTrackSha256='0'.repeat(64);}),/CO imported projection changed/);
reject(record,b=>json(b,d=>{d.sourceCorrection.registrySha256='0'.repeat(64);}),/CO successor correction identity changed/);
reject(registry,b=>json(b,d=>{d.tracks.find(t=>t.trackId==='co_motion_seal_conviction').mechanism+=' unsupported';}),/CO track no longer matches its measured correction/);
reject(source,b=>Buffer.concat([b,Buffer.from('\n')]),/CO official source identity changed/);
reject(projection,b=>json(b,d=>{d.tracks.find(t=>t.jurisdiction!=='CO').mechanismExcerpt='unsupported';}),/Registry projection is stale/);
for(const [file,bytes]of original)assert.deepEqual(fs.readFileSync(root+file),bytes,`${file} restored byte-exact`);
const restored=check();assert.equal(restored.status,0,restored.stderr);
console.log(JSON.stringify({status:'PASS',mutants,restoredInputs:paths.length,importRootPreserved:true}));

} finally {fs.rmSync(scratch,{recursive:true,force:true});}
