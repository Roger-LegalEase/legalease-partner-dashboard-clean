#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const [manifestFile,commit]=process.argv.slice(2);
assert.ok(manifestFile && /^[0-9a-f]{40}$/.test(commit??''),'Usage: verify-raster-dispatch-bytes.mjs manifest.json full-commit-sha');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifestBytes=fs.readFileSync(manifestFile);
assert.equal(digest(manifestBytes),digest(execFileSync('git',['show',`${commit}:${manifestFile}`],{maxBuffer:128*1024*1024})),'Working manifest differs from the committed manifest');
const manifest=JSON.parse(manifestBytes);assert.ok(manifest.rows?.length>0);
const proof=[];
for(const row of manifest.rows){
 assert.ok(row.documents?.length>0,`${row.familyId}: no documents`);
 assert.equal(digest(JSON.stringify(row.documents.map(d=>[d.role,d.path,d.sha256]))),row.documentsDigest,`${row.familyId}: document-set digest mismatch`);
 for(const document of row.documents){
  const current=digest(fs.readFileSync(document.path));
  const committed=digest(execFileSync('git',['show',`${commit}:${document.path}`],{maxBuffer:128*1024*1024}));
  assert.equal(current,document.sha256,`${row.familyId}/${document.name}: manifest differs from current bytes`);
  assert.equal(committed,document.sha256,`${row.familyId}/${document.name}: manifest differs from committed bytes`);
  proof.push({familyId:row.familyId,document:document.name,path:document.path,currentSha256:current,committedSha256:committed});
 }
 for(const role of ['canonical','boundary']){
  const path=row[`${role}PdfPath`],sha=row[`${role}PdfSha256`];if(!path&&!sha)continue;
  assert.equal(digest(fs.readFileSync(path)),sha,`${row.familyId}: ${role} row binding differs from current bytes`);
  assert.equal(digest(execFileSync('git',['show',`${commit}:${path}`],{maxBuffer:128*1024*1024})),sha,`${row.familyId}: ${role} row binding differs from committed bytes`);
 }
}
console.log(JSON.stringify({packetCommit:commit,manifestFile,documentsVerified:proof.length,proof},null,2));
