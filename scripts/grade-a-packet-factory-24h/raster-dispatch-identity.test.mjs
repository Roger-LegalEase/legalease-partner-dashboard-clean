import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {selectRasterDispatchIdentity, RASTER_QUEUE_PATH} from './raster-dispatch-identity.mjs';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'raster-dispatch-identity-'));
after(() => fs.rmSync(temporary, {recursive:true, force:true}));
const git = args => execFileSync('git', args, {cwd:temporary, encoding:'utf8', stdio:['ignore','pipe','ignore']}).trim();
git(['init','-b','main']); git(['config','user.name','Dispatch Test']); git(['config','user.email','dispatch@example.invalid']);
git(['commit','--allow-empty','-m','ancestor']); const ancestor=git(['rev-parse','HEAD']);
git(['commit','--allow-empty','-m','current']); const current=git(['rev-parse','HEAD']);
git(['checkout','--orphan','unrelated']);git(['commit','--allow-empty','-m','unrelated']);const unrelated=git(['rev-parse','HEAD']);git(['checkout','main']);
const historical='9'.repeat(40), digest='a'.repeat(64);
const queue = pin => ({schemaVersion:'rcap-raster-queue/v1',packetCommitSha:pin,
 rows:[{familyId:'fixture-family',packetCommitSha:pin,canonicalPdfSha256:digest,
   rasterReceipt:{packetCommitSha:historical,renderedCommitSha:historical,generatedAt:'2026-09-01T00:00:00.000Z'},
   supersededReceipts:[{packetCommitSha:'8'.repeat(40)}]}],
 historicalRasterRows:[{familyId:'historical-family',packetCommitSha:'7'.repeat(40),rasterReceipt:{packetCommitSha:'6'.repeat(40)}}]});
const text = q => JSON.stringify(q,null,2)+'\n';
function convergence(committed, generated, {relative=RASTER_QUEUE_PATH, scoped=true}={}) {
 const file=path.join(temporary,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof committed==='string'?committed:text(committed));
 const script=`import {makeEmitter} from ${JSON.stringify(pathToFileURL(path.join(repo,'scripts/lib/generator-emit.mjs')).href)};
 import {selectRasterDispatchIdentity} from ${JSON.stringify(pathToFileURL(path.join(repo,'scripts/grade-a-packet-factory-24h/raster-dispatch-identity.mjs')).href)};
 const emitter=makeEmitter({root:process.argv[1],check:true,label:'test',${scoped?'selectDispatchIdentity:selectRasterDispatchIdentity':''}});
 emitter.emit(process.argv[2],process.argv[3]);emitter.finish();`;
 return spawnSync(process.execPath,['--input-type=module','-e',script,temporary,relative,typeof generated==='string'?generated:text(generated)],{encoding:'utf8'});
}
test('current root and active row pins converge while historical unavailable pins remain intact',()=>{
 const q=queue(ancestor),selected=selectRasterDispatchIdentity(RASTER_QUEUE_PATH,text(q));
 assert.deepEqual(selected.pins,[ancestor,ancestor]);
 const normalized=JSON.parse(selected.normalizedContent);
 assert.deepEqual(normalized.rows[0].rasterReceipt,q.rows[0].rasterReceipt);
 assert.deepEqual(normalized.historicalRasterRows,q.historicalRasterRows);
 assert.deepEqual(normalized.rows[0].supersededReceipts,q.rows[0].supersededReceipts);
 const result=convergence(q,queue(current));assert.equal(result.status,0,result.stderr);
});
for(const [name,mutate] of [
 ['missing root pin',q=>delete q.packetCommitSha],
 ['missing active pin',q=>delete q.rows[0].packetCommitSha],
 ['different active pin',q=>q.rows[0].packetCommitSha=current],
 ['malformed active pin',q=>q.rows[0].packetCommitSha='invalid'],
 ['wrong schema',q=>q.schemaVersion='unknown'],
 ['nonarray rows',q=>q.rows={}],
 ['duplicate family',q=>q.rows.push({...q.rows[0]})],
 ['nonarray history',q=>q.historicalRasterRows={}]
]) test(`refuses ${name}`,()=>{const q=queue(ancestor);mutate(q);const r=convergence(q,queue(current));assert.notEqual(r.status,0);assert.match(r.stderr,/dispatch identity refused/);});
test('missing current commit is refused',()=>{const r=convergence(queue('0'.repeat(40)),queue(current));assert.notEqual(r.status,0);assert.match(r.stderr,/not a commit this checkout carries/);});
test('nonancestor current commit is refused',()=>{const r=convergence(queue(unrelated),queue(current));assert.notEqual(r.status,0);assert.match(r.stderr,/not an ancestor of HEAD/);});
for(const [name,mutate] of [
 ['receipt historical pin',q=>q.rows[0].rasterReceipt.packetCommitSha='5'.repeat(40)],
 ['superseded receipt pin',q=>q.rows[0].supersededReceipts[0].packetCommitSha='5'.repeat(40)],
 ['historical row pin',q=>q.historicalRasterRows[0].packetCommitSha='5'.repeat(40)],
 ['historical timestamp',q=>q.rows[0].rasterReceipt.generatedAt='2026-09-02T00:00:00.000Z'],
 ['SHA256 PDF identity',q=>q.rows[0].canonicalPdfSha256='b'.repeat(64)]
]) test(`detects changed ${name}`,()=>{const q=queue(current);mutate(q);const r=convergence(queue(ancestor),q);assert.notEqual(r.status,0);assert.match(r.stderr,/committed .* != generated/);});
test('duplicate dispatch keys cannot hide a second pin',()=>{
 const q=text(queue(ancestor)).replace('"schemaVersion":',`"packetCommitSha":"${current}","schemaVersion":`);
 const r=convergence(q,queue(current));assert.notEqual(r.status,0);assert.match(r.stderr,/Duplicate raster JSON object key/);
});
test('escaped duplicate dispatch keys cannot hide a second pin',()=>{
 const q=text(queue(ancestor)).replace('"schemaVersion":',`"packetCommit\u0053ha":"${current}","schemaVersion":`);
 const r=convergence(q,queue(current));assert.notEqual(r.status,0);assert.match(r.stderr,/Duplicate raster JSON object key/);
});
test('normalization preserves whitespace and escaped string data exactly',()=>{
 const q=queue(ancestor);q.note='packetCommitSha: \\"'+historical+'\\"';const source=JSON.stringify(q,null,'\t')+'\n\n';
 const selected=selectRasterDispatchIdentity(RASTER_QUEUE_PATH,source);
 assert.equal(selected.normalizedContent,source.replaceAll('"'+ancestor+'"','"<dispatch-pin>"'));
});
test('invalid generated schema is also refused',()=>{const q=queue(current);delete q.rows;const r=convergence(queue(ancestor),q);assert.notEqual(r.status,0);assert.match(r.stderr,/generated dispatch identity refused/);});
test('other files and generic generators retain their original pin validation',()=>{
 assert.equal(selectRasterDispatchIdentity('different.json','not json'),null);
 for(const options of [{relative:'different.json'},{scoped:false}]) {
  const r=convergence(queue(ancestor),queue(current),options);assert.notEqual(r.status,0);assert.match(r.stderr,/distinct dispatch pins/);
 }
});
