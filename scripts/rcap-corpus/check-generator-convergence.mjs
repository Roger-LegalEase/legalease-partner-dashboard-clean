#!/usr/bin/env node
// Run every existing convergence check, then enforce all child read receipts.
// No generator writes, mutations, rendering, source changes or swallowed errors.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function auditResults(directory) {
  const paths = fs.existsSync(directory) ? fs.readdirSync(directory).filter(n=>/^source-reads-\d+\.json$/.test(n)) : [];
  const receipts = paths.map(name=>JSON.parse(fs.readFileSync(path.join(directory,name),'utf8')));
  return {status:receipts.length && receipts.every(r=>r.status==='PASS' && r.refused.length===0) ? 'PASS':'REFUSED',
    processCount:receipts.length, refused:receipts.filter(r=>r.status!=='PASS' || r.refused.length)};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const manifest = JSON.parse(fs.readFileSync(path.join(root,'data/rcap-grade-a/source-custody/generator-preflight-20261013/manifest.json')));
  const out = process.env.GENERATOR_SOURCE_AUDIT_DIR;
  if (!out || path.resolve(out).startsWith(root+path.sep) || path.resolve(out)===root) throw Error('An audit directory outside the checkout is required');
  fs.mkdirSync(out,{recursive:true});
  const results=[];
  for (const entry of manifest.entrypoints) {
    const nodeOptions=[process.env.NODE_OPTIONS??'', '--require '+JSON.stringify(path.join(root,'scripts/rcap-corpus/guard-generator-source-reads.cjs'))].join(' ').trim();
    const r=spawnSync(process.execPath,[entry,'--check'],
      {cwd:root,env:{...process.env,NODE_OPTIONS:nodeOptions},encoding:'utf8',maxBuffer:2**26,timeout:300000});
    const name=path.basename(entry,'.mjs');
    fs.writeFileSync(path.join(out,name+'.log'),(r.stdout??'')+(r.stderr??''));
    const status=r.status===0 && !r.error?'PASS':'FAIL';
    results.push({entry,status,exitCode:r.status,error:r.error?.code??null});
    console.log(`${entry}: ${status}`);
    if(status!=='PASS')console.log(((r.stdout??'')+(r.stderr??'')).split('\n').slice(-45).join('\n'));
  }
  const audit=auditResults(out);
  const result={status:results.every(r=>r.status==='PASS') && audit.status==='PASS'?'PASS':'FAIL',results,audit};
  fs.writeFileSync(path.join(out,'convergence-results.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
  process.exitCode=result.status==='PASS'?0:1;
}
