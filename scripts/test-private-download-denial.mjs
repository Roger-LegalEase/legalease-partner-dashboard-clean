import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {authorizePacketDownload}=await import('../src/lib/rcap/render/packet-delivery.ts');
const id='b7252f57-c042-4d3e-805e-fd783380f246';
const missing='00000000-0000-4000-8000-000000000000';
async function proof(authorize){
 const counts={ownership:0,storage:0,verification:0,events:0,eligibility:0};
 const job={id,briefcaseItemId:'owner-item',get status(){counts.eligibility++;throw Error('denial inspected eligibility');}};
 const ports={getJob:async key=>key===id?job:null,userOwnsBriefcaseItem:async(user,item)=>{counts.ownership++;assert.equal(user,'stranger');assert.equal(item,'owner-item');return false;},storage:{read:async()=>{counts.storage++;throw Error('private storage reached');}},getCurrentVerification:async()=>{counts.verification++;throw Error('verification reached');},recordEvent:async()=>{counts.events++;throw Error('delivery event reached');}};
 const response=async(jobId,userId='stranger')=>{const d=await authorize(ports,{jobId,userId});assert.equal(d.ok,false);const r=Response.json({error:d.message,code:d.code},{status:d.status});return {status:r.status,contentType:r.headers.get('content-type'),body:await r.json()};};
 const absent=await response(missing);assert.deepEqual(absent,{status:404,contentType:'application/json',body:{error:'This packet does not exist.',code:'not_found'}});
 assert.deepEqual(await response(id),absent);assert.equal(counts.ownership,1,'ownership check must execute');
 assert.deepEqual(await response('malformed'),absent);
 job.briefcaseItemId=null;assert.deepEqual(await response(id),absent);assert.equal(counts.ownership,1,'unbound job refuses immediately');
 const anon=await response(id,null);assert.equal(anon.status,401);assert.equal(anon.body.code,'unauthenticated');
 assert.deepEqual(counts,{ownership:1,storage:0,verification:0,events:0,eligibility:0});
}
test('real authorization: missing, malformed, unbound and cross-owner are indistinguishable before storage/verification/events',async()=>proof(authorizePacketDownload));
test('restoring either ownership 403/unauthorized branch makes the executable contract fail',async()=>{
 const source=fs.readFileSync('src/lib/rcap/render/packet-delivery.ts','utf8');const ast=ts.createSourceFile('delivery.ts',source,ts.ScriptTarget.Latest,true);const declaration=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='authorizePacketDownload').getText(ast);
 for(const branch of ['if (!job.briefcaseItemId) {','if (!owns) {']){
  const start=declaration.indexOf(branch),end=declaration.indexOf('\n  }',start);assert.ok(start>0);const segment=declaration.slice(start,end);const changed=segment.replace('status: 404, code: "not_found", message: "This packet does not exist."','status: 403, code: "unauthorized", message: "This packet is not available for download."');assert.notEqual(changed,segment);
  const mutant=declaration.slice(0,start)+changed+declaration.slice(end);const js=ts.transpileModule(mutant.replace('export async','async'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;const authorize=new Function(js+'\nreturn authorizePacketDownload;')();await assert.rejects(proof(authorize),{code:'ERR_ASSERTION'});
 }
});
