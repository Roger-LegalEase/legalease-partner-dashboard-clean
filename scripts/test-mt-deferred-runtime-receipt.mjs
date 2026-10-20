import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {PDFDocument} from 'pdf-lib';
import {OUTPUT,SOURCE,SOURCE_SHA} from './build-census-v1-mt_deferred_dismissal-set.mjs';

const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const receipt=JSON.parse(fs.readFileSync(OUTPUT+'/source-receipt.json'));
const proof=JSON.parse(fs.readFileSync(OUTPUT+'/reports/doj-representation-prerequisite.json')).proof;
const runtime=receipt.documents[0].derivedPrint.conversion.runtime;
assert.equal(path.isAbsolute(runtime.path),false,'conversion runtime receipt must survive a checkout or restart');
assert.equal(runtime.path,OUTPUT+'/source-derived/conversion-runtime-receipt.json');
const bytes=fs.readFileSync(runtime.path);
assert.equal(sha(bytes),runtime.sha256,'retain the originally measured runtime bytes');
assert.deepEqual(JSON.parse(bytes),runtime.record);
assert.deepEqual(proof.runtime,runtime);

const {bindRuntimeReceipt,deriveDocx}=await import('./build-census-v1-mt_deferred_dismissal-set.mjs');
assert.deepEqual(bindRuntimeReceipt(bytes),runtime,'fresh conversions retain exact input bytes at a durable output path');
assert.throws(()=>bindRuntimeReceipt(Buffer.from('{invalid')),'malformed runtime records remain refused');
const source=fs.readFileSync(path.join(process.env.MASTER_LIBRARY_SOURCE_DIR,SOURCE));
assert.equal(sha(source),SOURCE_SHA);
const derived=await deriveDocx(path.join(process.env.MASTER_LIBRARY_SOURCE_DIR,SOURCE),source,PDFDocument);
assert.equal(sha(derived.bytes),receipt.documents[0].derivedPrint.sha256,'cached official derivative is unchanged');
assert.deepEqual(derived.runtimeBytes,bytes,'cached builds retain the same runtime bytes');
assert.deepEqual(derived.proof.runtime,runtime);
// Probe drift in an isolated copy; the retained candidate and its evidence stay read-only.
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'mt-runtime-receipt-test-'));
try{
 fs.mkdirSync(path.join(scratch,'scripts'),{recursive:true});
 const host=path.join(scratch,'scripts/build-census-v1-mt_deferred_dismissal-set.mjs');
 fs.copyFileSync(new URL('./build-census-v1-mt_deferred_dismissal-set.mjs',import.meta.url),host);
 for(const name of ['source-derived/doj-unfilled.pdf','reports/doj-representation-prerequisite.json']){
  const target=path.join(scratch,OUTPUT,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(OUTPUT+'/'+name,target);
 }
 const isolated=await import(pathToFileURL(host).href);
 await assert.rejects(()=>isolated.deriveDocx('',source,PDFDocument),/ENOENT/,'missing retained runtime is refused');
 fs.writeFileSync(path.join(scratch,runtime.path),JSON.stringify({...runtime.record,runtimeVersion:'changed'}));
 await assert.rejects(()=>isolated.deriveDocx('',source,PDFDocument),/Cached conversion runtime receipt drift/,'different runtime is refused');
}finally{fs.rmSync(scratch,{recursive:true,force:true});}
console.log(JSON.stringify({status:'PASS',runtimePath:runtime.path,runtimeSha256:runtime.sha256,derivedSha256:sha(derived.bytes),runtimeBytes:bytes.length,sourceSha256:sha(source),rebuiltPackets:false}));
