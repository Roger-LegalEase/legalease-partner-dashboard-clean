import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

test('C20 follows the actual guarded convergence runner and rejects lost checks', () => {
  const verifier=fs.readFileSync('scripts/grade-a-packet-factory-24h/verify-source-conveyor.mjs','utf8');
  const start=verifier.indexOf('  const convergencePath =');
  const end=verifier.indexOf('  for (const required of ["verify.mjs --mutations"',start);
  assert(start>0&&end>start);
  const code=verifier.slice(start,end);
  const workflow=fs.readFileSync('.github/workflows/rcap-source-conveyor-ready.yml','utf8');
  const runner=fs.readFileSync('scripts/rcap-corpus/check-generator-convergence.mjs','utf8');
  const manifest=JSON.parse(fs.readFileSync('data/rcap-grade-a/source-custody/generator-preflight-20261013/manifest.json'));
  function failures(readyText=workflow,body=runner,inventory=manifest) {
    const context={readyText,ROOT:process.cwd(),path,promptProblems:[],
      fs:{readFileSync(file){assert.equal(file,path.join(process.cwd(),'scripts/rcap-corpus/check-generator-convergence.mjs'));return body;}},
      read(file){assert.equal(file,'data/rcap-grade-a/source-custody/generator-preflight-20261013/manifest.json');return inventory;}};
    vm.runInNewContext(code,context);return context.promptProblems;
  }
  assert.equal(failures().length,0);
  const command='node scripts/rcap-corpus/check-generator-convergence.mjs';
  for(const replacement of ['# '+command,command+' || true',command+' --disabled']) {
    assert(failures(workflow.replace(command,replacement)).length>0,replacement);
  }
  for(const entry of manifest.entrypoints) {
    assert(failures(workflow,runner,{...manifest,entrypoints:manifest.entrypoints.filter(e=>e!==entry)}).length>0,entry);
  }
  for(const [before,after] of [["[entry,'--check']","[entry]"],['for (const entry of manifest.entrypoints)','for (const entry of [])'],['auditResults(out)','auditResultsElsewhere(out)'],["process.exitCode=result.status==='PASS'?0:1","process.exitCode=0"]]) {
    assert(runner.includes(before));assert(failures(workflow,runner.replace(before,after)).length>0,before);
  }
});
