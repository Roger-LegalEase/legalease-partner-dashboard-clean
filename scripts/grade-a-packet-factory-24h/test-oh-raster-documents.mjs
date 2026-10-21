import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {ohRasterDocuments,OH_RASTER_FAMILY,OH_RASTER_DIRECTORY,OH_RASTER_TRACKS} from './oh-raster-documents.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const fixtures=path.join(root,OH_RASTER_DIRECTORY);
const report=JSON.parse(fs.readFileSync(path.join(fixtures,'reports/rendered-artifacts.json')));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const call=(r=report)=>ohRasterDocuments({report:r,fixtures,root});
const before=report.packets.map(p=>hash(fs.readFileSync(path.join(fixtures,p.file))));

test('enrolls every current whole packet, with exact hashes, bytes, roles and 84 pages',()=>{
 const selected=call();assert.equal(selected.length,8);assert.equal(selected.reduce((n,d)=>n+d.declaredPageCount,0),84);
 assert.equal(selected.filter(d=>d.role==='canonical').length,4);assert.equal(selected.filter(d=>d.role==='boundary').length,4);
 for(const d of selected){assert.equal(d.selectionKind,'native_complete_fixture');assert.equal(d.filingReady,false);assert.equal(d.byteLength,fs.statSync(path.join(fixtures,d.name)).size);assert.equal(d.sha256,hash(fs.readFileSync(path.join(fixtures,d.name))));assert.ok(d.name.startsWith('continuation/'));assert.ok(d.name.endsWith('/packet.pdf'));}
 assert.deepEqual(report.packets.map(p=>hash(fs.readFileSync(path.join(fixtures,p.file)))),before,'read-only enrollment must preserve every PDF');
});

test('unrelated family is not claimed',()=>assert.equal(call({familyId:'unrelated'}),null));

const mutations=[
 ['missing packet',r=>r.packets.pop()],
 ['duplicate packet',r=>r.packets.push(structuredClone(r.packets[0]))],
 ['missing artifact',r=>r.artifacts.pop()],
 ['duplicate artifact',r=>r.artifacts.push(structuredClone(r.artifacts[0]))],
 ['changed fixture identity',r=>r.packets[0].fixture='oh_2953_32_sealing-post-order'],
 ['wrong role',r=>r.packets[0].fixtureRole=r.packets[0].fixtureRole==='canonical'?'boundary':'canonical'],
 ['source component substituted for whole packet',r=>r.packets[0].file=r.packets[0].file.replace('packet.pdf','application.pdf')],
 ['path traversal',r=>r.packets[0].file='../outside.pdf'],
 ['absolute path',r=>r.packets[0].file='/tmp/outside.pdf'],
 ['changed digest',r=>{r.packets[0].sha256='0'.repeat(64);r.artifacts.find(a=>a.fixture===r.packets[0].fixture).sha256='0'.repeat(64);}],
 ['packet/artifact mismatch',r=>r.artifacts[0].sha256='0'.repeat(64)],
 ['wrong declared bytes',r=>r.packets[0].byteLength=1],
 ['wrong declared pages',r=>{r.packets[0].pageCount++;r.artifacts.find(a=>a.fixture===r.packets[0].fixture).pageCount++;}],
 ['missing page count',r=>r.packets[0].pageCount=null],
];
for(const [name,mutate]of mutations)test(`rejects ${name}`,()=>{const changed=structuredClone(report);mutate(changed);assert.throws(()=>call(changed));});

function isolated(run){const temp=fs.mkdtempSync(path.join(os.tmpdir(),'oh-raster-enrollment-'));const home=path.join(temp,OH_RASTER_DIRECTORY);fs.mkdirSync(home,{recursive:true});for(const p of report.packets){const target=path.join(home,p.file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(fixtures,p.file),target);fs.copyFileSync(path.join(fixtures,path.dirname(p.file),'fixture.json'),path.join(path.dirname(target),'fixture.json'));}try{run({root:temp,fixtures:home,report:structuredClone(report)});}finally{fs.rmSync(temp,{recursive:true,force:true});}}

test('rejects missing saved stage',()=>isolated(args=>{fs.rmSync(path.join(args.fixtures,'continuation',OH_RASTER_TRACKS[0],'canonical'),{recursive:true});assert.throws(()=>ohRasterDocuments(args));}));
test('rejects undeclared extra saved stage',()=>isolated(args=>{fs.mkdirSync(path.join(args.fixtures,'continuation',OH_RASTER_TRACKS[0],'post-order'));assert.throws(()=>ohRasterDocuments(args));}));
test('rejects unexpected PDF within a saved stage',()=>isolated(args=>{fs.copyFileSync(path.join(args.fixtures,args.report.packets[0].file),path.join(args.fixtures,path.dirname(args.report.packets[0].file),'packet-copy.pdf'));assert.throws(()=>ohRasterDocuments(args));}));
test('rejects changed on-disk fixture identity',()=>isolated(args=>{const p=path.join(args.fixtures,path.dirname(args.report.packets[0].file),'fixture.json');const f=JSON.parse(fs.readFileSync(p));f.fixture='post-order';fs.writeFileSync(p,JSON.stringify(f));assert.throws(()=>ohRasterDocuments(args));}));
test('rejects changed packet bytes',()=>isolated(args=>{fs.appendFileSync(path.join(args.fixtures,args.report.packets[0].file),'\nchanged');assert.throws(()=>ohRasterDocuments(args),/digest drift/);}));
test('rejects symlink packet even when its target bytes match',()=>isolated(args=>{const p=path.join(args.fixtures,args.report.packets[0].file),target=path.join(args.root,'outside.pdf');fs.renameSync(p,target);fs.symlinkSync(target,p);assert.throws(()=>ohRasterDocuments(args),/symlink/);}));
test('rejects symlink stage directory',()=>isolated(args=>{const p=path.join(args.fixtures,path.dirname(args.report.packets[0].file)),target=path.join(args.root,'outside-stage');fs.renameSync(p,target);fs.symlinkSync(target,p,'dir');assert.throws(()=>ohRasterDocuments(args),/symlink/);}));
test('rejects fixture root outside the exact family path',()=>assert.throws(()=>ohRasterDocuments({report,root,fixtures:path.dirname(fixtures)})));
