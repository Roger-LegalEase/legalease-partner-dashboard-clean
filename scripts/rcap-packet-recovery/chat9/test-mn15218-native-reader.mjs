#!/usr/bin/env node
// Actual unchanged shared-reader calls in scratch. Metadata controls are NOT PDF tests.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { auditFamily } from '../../rcap-packet-completeness/verify-packet-completeness.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const i = process.argv.indexOf('--reports');
assert(i >= 0 && process.argv[i+1], '--reports must name the actual generated native-report directory');
const reports = path.resolve(process.argv[i+1]);
const familyId = 'mn_petition_15218-set';
const family = path.join(root, 'data/rcap-all50/overlays/census-v1/mn/mn-petition-15218-set--official-pdf-fill');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const snapshot = dir => Object.fromEntries(fs.readdirSync(dir, {recursive:true}).sort().filter(f => fs.statSync(path.join(dir,f)).isFile()).map(f => [f,sha(fs.readFileSync(path.join(dir,f)))]));
assert.equal(sha(fs.readFileSync(path.join(root,'scripts/rcap-packet-completeness/verify-packet-completeness.mjs'))),'a842efe27ccc4f527b6a7f4c63832d64d6ef6795ffb72ef8f527ed0a23c2af19','reconcile actual shared reader SHA before using these expectations');
const original = snapshot(family);
const actual = JSON.parse(fs.readFileSync(path.join(reports,'byte-derived-actual-writes.json'),'utf8'));
const rendered = fs.readFileSync(path.join(reports,'byte-derived-rendered-artifacts.json'),'utf8');
assert.equal(actual.familyId,familyId); assert.equal(actual.derivedFromArtifactBytes,true);
const temp = fs.mkdtempSync(path.join(os.tmpdir(),'chat9-native-reader-')); const f = path.join(temp,'family');
const results=[];
try {
  fs.cpSync(family,f,{recursive:true});
  fs.writeFileSync(path.join(f,'reports/rendered-artifacts.json'),rendered);
  for (const [name, mutate, expected] of [
    ['native report with real byte measurements', a=>a, 'PASS_COMPLETE'],
    ['report-only zero-visible-glyph control', a=>{a.artifacts[0].addedGlyphsReadFromOutputBytes=0;return a;}, 'FAIL_VISIBLE_APPEARANCE'],
    ['report-only refused-ink control', a=>{a.artifacts[0].refusedFieldsWithInk=['synthetic protected control'];return a;}, 'FAIL_PROTECTED_WRITE'],
    ['report-only outside-write-box control', a=>{a.artifacts[0].nonWhitespaceGlyphsOutsideMeasuredWriteBoxes=1;return a;}, 'FAIL_VISIBLE_APPEARANCE'],
  ]) {
    fs.writeFileSync(path.join(f,'reports/actual-writes.json'),JSON.stringify(mutate(structuredClone(actual))));
    const r = auditFamily(path.relative(root,f),familyId);
    assert.equal(r.result,expected,name);
    assert.equal(r.totals.rowsInspected,0,'shared reader gained row support; inspect new behavior before updating the expectation');
    results.push({case:name,result:r.result,counters:r.counters,rowsInspected:r.totals.rowsInspected});
  }
} finally { fs.rmSync(temp,{recursive:true,force:true}); }
assert.deepEqual(snapshot(family),original);
console.log(JSON.stringify({authorOnly:true,readerCalls:results.length,metadataNegativeControls:3,originalFamilyFilesUnchanged:Object.keys(original).length,sharedRowCoverageGapStillPresent:true,results},null,2));
