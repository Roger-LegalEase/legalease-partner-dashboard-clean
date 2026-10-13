import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {permittedMetadata,assertNoSymlinkAncestors} from './capture-generated-successor.mjs';
test('candidate artifact accepts only generator metadata and dispatch documents',()=>{
  for(const file of ['data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json','data/rcap-grade-a/packet-factory-24h/claim-ledger.json','docs/rcap/grade-a/packet-factory-24h/VF01.md','docs/rcap/grade-a/packet-factory-24h/washington-repair/WAR01.md'])assert(permittedMetadata(file));
  for(const file of ['data/rcap-grade-a/packet-factory-24h/C13_INDEPENDENT_REVIEW.json','data/rcap-grade-a/packet-factory-24h/NE_WV_GOVERNANCE_R2_INDEPENDENT_REVIEW.json','private/source.pdf','src/application.ts','data/rcap-grade-a/packet-factory-24h/vf01/review.json','data/rcap-grade-a/packet-factory-24h/../../approval.json','docs/rcap/grade-a/packet-factory-24h/source.pdf','.env.local'])assert(!permittedMetadata(file));
});

test('capture rejects symlink ancestors before any writes',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'successor-boundary-'));
  try { fs.symlinkSync(dir,path.join(dir,'link'));assert.throws(()=>assertNoSymlinkAncestors(path.join(dir,'link','output')),/symlink/);assertNoSymlinkAncestors(path.join(dir,'new')); }
  finally { fs.rmSync(dir,{recursive:true}); }
});
