// Synthetic future approval exists only in a disposable clone, with no provider
// credentials and no network operations. The real worktree remains held.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
const source=process.cwd(),sha=process.argv[2];assert.match(sha??'',/^[a-f0-9]{40}$/);const root=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-forward-reachability-'));
try{
 execFileSync('git',['clone','--quiet','--shared','--no-checkout',source,root],{stdio:'pipe'});execFileSync('git',['checkout','--quiet','--detach',sha],{cwd:root,stdio:'pipe'});fs.symlinkSync(fs.realpathSync('node_modules'),path.join(root,'node_modules'));

 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/(TOKEN|SECRET|PASSWORD|KEY|CREDENTIAL)/i.test(k)));const output=execFileSync(process.execPath,[path.join(source,'scripts/grade-a-launch-control/forward-production-reachability-fixture.mjs'),sha],{cwd:root,env,encoding:'utf8',maxBuffer:4*1024*1024});process.stdout.write(output);
}finally{fs.rmSync(root,{recursive:true,force:true});}
