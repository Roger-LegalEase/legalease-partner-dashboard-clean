import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

export function applicationBinding(directory) {
  const files=[...new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z','src'],
    {cwd:directory,encoding:'utf8'}).split('\0').filter(Boolean))].sort();
  const hashes=files.map(file=>[file,createHash('sha256').update(fs.readFileSync(path.join(directory,file))).digest('hex')]);
  return {files,sha256:createHash('sha256').update(JSON.stringify(hashes)).digest('hex')};
}
export function assertApplicationBindingsEqual(runner,served) {
  assert.deepEqual(runner.files,served.files,'Runner and served application source file sets differ');
  assert.equal(runner.sha256,served.sha256,'Runner and served application source bytes differ');
}
