import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { familySources } from './verify-packet-build-environment.mjs';
const family='ut_pet_remove_link-set';
const custody='data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json';
const wave='data/rcap-grade-a/source-wave-integration/SOURCE_RECOVERY_WAVE1_2026-09-11.json';
const residual='data/rcap-grade-a/source-wave-integration/KNOWN_RESIDUAL_SOURCE_RECOVERY_2026-09-11.json';
const adoption='data/rcap-grade-a/source-wave-integration/UT_REMOVE_LINK_NEXT_BLOCKER_2026-09-11.json';
const read=p=>JSON.parse(fs.readFileSync(p));
const current=familySources(family);
assert.equal(current.sources.length,5);
function fixture(t) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ut-custody-bridge-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 for(const p of [custody,wave,residual,adoption,'SOURCE_BLOCKED_RECOVERY_WAVE1_2026-09-11.json','data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json',...current.sources.map(x=>x.path)]) {
  fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.copyFileSync(p,path.join(root,p));
 }
 return root;
}
function mutate(root,p,fn){const f=path.join(root,p),v=read(f);fn(v);fs.writeFileSync(f,JSON.stringify(v));}
function refused(root){const result=familySources(family,root);assert.ok(result.unresolvable.length>0,JSON.stringify(result));}
test('complete adopted five-source binding; other custody families unchanged',()=>{
 assert.deepEqual(current.unresolvable,[]);
 assert.deepEqual(current.sources.map(x=>x.sourceId).sort(),['1110GE','1111GE','1501CR','1501CR-C','1502CR'].map(x=>'official-form:'+x).sort());
 const before=read('data/rcap-grade-a/packet-factory-24h/pf01/ut-custody-bridge-20260913/before-family-bindings.json');
 for(const [id,result] of Object.entries(before)) if(id!==family) assert.deepEqual(familySources(id),result,id);
});
for (const source of current.sources) {
 const notice=source.sourceId.includes('111');
 const p=notice?residual:wave;
 const get=v=>v.sources.find(x=>x.heldCorpusPath===source.path);
 for(const [field,value] of [['sha256','0'.repeat(64)],['byteLength',1],['heldCorpusPath','../escape.pdf']]) test(`${source.sourceId}: reject receipt ${field}`,t=>{const root=fixture(t);mutate(root,p,v=>{get(v)[field]=value;});refused(root);});
 test(`${source.sourceId}: reject changed saved body`,t=>{const root=fixture(t);const f=path.join(root,source.path);const bytes=fs.readFileSync(f);bytes[0]^=1;fs.writeFileSync(f,bytes);refused(root);});
 test(`${source.sourceId}: reject conflicting custody binding`,t=>{const root=fixture(t);mutate(root,custody,v=>{v.rows.find(x=>x.worklistGroupId===family).documentSources.push({sourceId:source.sourceId,resolved:true,heldAs:{path:source.path,sha256:'0'.repeat(64),byteLength:source.byteLength}});});refused(root);});
}
for (const [name,fn] of [
 ['duplicate receipt',v=>v.sources.push(structuredClone(v.sources.find(x=>x.sourceId==='1110GE')))],
 ['wrong printed identity',v=>v.sources.find(x=>x.sourceId==='1111GE').printedFormNumber='1111GE'],
 ['wrong listing identity',v=>v.sources.find(x=>x.sourceId==='1111GE').officialListing.formIdOnListing='1110GE'],
 ['wrong family binding',v=>v.sources.find(x=>x.sourceId==='1110GE').familyIds=['wrong']],
 ['missing notice',v=>{v.sources=v.sources.filter(x=>x.sourceId!=='1111GE');}]
]) test(`residual: reject ${name}`,t=>{const root=fixture(t);mutate(root,residual,fn);refused(root);});
for(const [name,fn] of [
 ['reversed branch',v=>{v.bindingProductRule.judge=['1501CR','1502CR','1111GE'];}],
 ['unconfirmed selector',v=>{v.bindingProductRule.factSource=['self-reported'];}],
 ['missing STOP',v=>{v.bindingProductRule.otherwise.generateFilingPacket=true;}],
 ['unresolved owner',v=>{v.ownerAnswer='UNRESOLVED';}],
 ['stale branch evidence',v=>{v.recordedBranchSemantics.judge=['1501CR','1111GE'];}],
 ['different recovery record',v=>{v.sourceRecoveryRecord='other.json';}]
]) test(`adoption: reject ${name}`,t=>{const root=fixture(t);mutate(root,adoption,fn);refused(root);});
test('missing adoption is refused even with preloaded exact custody',t=>{const root=fixture(t);mutate(root,custody,v=>{v.rows.find(x=>x.worklistGroupId===family).documentSources=current.sources.map(x=>({sourceId:x.sourceId,resolved:true,heldAs:{path:x.path,sha256:x.sha256,byteLength:x.byteLength}}));});fs.unlinkSync(path.join(root,adoption));refused(root);});
test('symlinked notice body is refused',t=>{const root=fixture(t);const f=path.join(root,current.sources[3].path);fs.unlinkSync(f);fs.symlinkSync(path.resolve(current.sources[3].path),f);refused(root);});
test('combined historical obligation cannot smuggle a resolved sixth body',t=>{const root=fixture(t);mutate(root,custody,v=>{const s=v.rows.find(x=>x.worklistGroupId===family).documentSources.find(x=>x.sourceId.includes(' or '));s.resolved=true;s.heldAs={path:current.sources[0].path,sha256:current.sources[0].sha256};});refused(root);});
test('missing custody cannot fall through to incomplete indexed sources',t=>{const root=fixture(t);mutate(root,custody,v=>{v.rows=v.rows.filter(x=>x.worklistGroupId!==family);});refused(root);});
