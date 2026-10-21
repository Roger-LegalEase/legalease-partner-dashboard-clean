import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{createHash}from'node:crypto';
import{assertPinnedJson,corpusPreservationDelta,historicalDispatchCoverage,historicalRevocationValid,independentlyRestored}from'./historical-check-bindings.mjs';
const base=[{path:'data/a.pdf',sha256:'a'.repeat(64)},{path:'data/b.pdf',sha256:'b'.repeat(64)}];
test('identical baseline preserves bytes without governance approval',()=>{const r=corpusPreservationDelta(base,structuredClone(base));assert.equal(r.passed,true);assert.equal(r.governanceApproved,false);});
for(const[name,rows]of[['newsourcepathsamecount',[base[0],{...base[1],path:'data/new.pdf'}]],['changedsourcehash',[base[0],{...base[1],sha256:'c'.repeat(64)}]],['removedexisting',[base[0]]],['duplicate',[base[0],base[0]]]])test(`corpus refuses ${name}`,()=>assert.equal(corpusPreservationDelta(base,rows).passed,false));
test('pinned historical bytes accepted and changedbytes refused',()=>{const b=Buffer.from('{"audited":48}'),h=createHash('sha256').update(b).digest('hex');assert.deepEqual(assertPinnedJson(b,h),{audited:48});assert.throws(()=>assertPinnedJson(Buffer.from('{"audited":49}'),h));});
test('historical dispatch exactset accepted',()=>assert.equal(historicalDispatchCoverage(['a','b'],['b','a']),true));
for(const[name,assigned]of[['omitted',['a']],['duplicate',['a','a']],['unrelated',['a','c']]])test(`historical dispatch refuses ${name}`,()=>assert.equal(historicalDispatchCoverage(['a','b'],assigned),false));
const master=JSON.parse(fs.readFileSync('data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json'));
function currentFixture(id){const family=structuredClone(master.families.find(f=>f.familyId===id));const r=JSON.parse(fs.readFileSync(family.selectedIndependentVerdict.evidencePath));const row=structuredClone(r.rows.find(r=>(r.familyId??r.itemId)===id));const rr=row.rasterReceipt;return{family,row,raster:{proven:true,status:'PROVEN_ON_CURRENT_BYTES',row:{canonicalPdfSha256:rr.boundCanonicalSha256??rr.canonicalPdfSha256,boundaryPdfSha256:rr.boundBoundarySha256??rr.boundaryPdfSha256}}};}
for(const id of ['az_marijuana_expungement_superior_court-set','ca-17b-reduction-set'])test(`current selectedindependent return ${id} admissible`,()=>assert.equal(independentlyRestored(currentFixture(id)),true));
for(const[name,mutate]of[
 ['mechanicalpasswithoutnativeproof',x=>delete x.family.selectedIndependentVerdict],
 ['wrongreviewer',x=>x.row.lane='author'],['wrongfamily',x=>x.row.itemId=x.row.familyId='other'],
 ['missingobligation',x=>delete x.row.proofObligations.SERVICE],['unmeasuredobligation',x=>x.row.proofObligations.ARTIFACTS.measured=false],
 ['nonzerocounter',x=>x.row.nineCounters.visualDefects=1],['nullcounter',x=>x.row.nineCounters.visualDefects=null],
 ['modifiedoverlay',x=>x.row.overlayDirectoriesModified=['data/a']],['currentrasterfailed',x=>x.raster.proven=false],
 ['changedcanonical',x=>x.raster.row.canonicalPdfSha256='f'.repeat(64)],['changedboundary',x=>x.raster.row.boundaryPdfSha256='f'.repeat(64)],
 ['reviewbasechanged',x=>x.row.verifiedAtBase='a'.repeat(40)],['productiontouched',x=>x.row.productionTouched=true]
])test(`restoration refuses ${name}`,()=>{const x=currentFixture('az_marijuana_expungement_superior_court-set');mutate(x);assert.equal(independentlyRestored(x),false);});

function revokedFixture(){const plan={passRevocation:{families:['a','b','c','d'],newClassification:'PASS_REVOKED_PENDING_COMPLETENESS_RECHECK',lawrenceReviewPackagesPrepared:0}};return{plan,prior:structuredClone(plan),matrix:{results:plan.passRevocation.families.map(familyId=>({familyId,result:'FAIL_MISSING_REQUIRED_FACTS'}))}};}
test('immutable revocation remains effective historically',()=>{const x=revokedFixture();assert.equal(historicalRevocationValid(x.plan,x.prior,x.matrix),true);});
for(const[name,mutate]of[['unapprovedreviewpackages',x=>x.plan.passRevocation.lawrenceReviewPackagesPrepared=4],['revocationreclassified',x=>x.plan.passRevocation.newClassification='PASS'],['revokedfamilyreplaced',x=>x.plan.passRevocation.families[0]='e'],['historicalpasssubstituted',x=>x.matrix.results[0].result='PASS_COMPLETE']])test(`historical revocation refuses ${name}`,()=>{const x=revokedFixture();mutate(x);assert.equal(historicalRevocationValid(x.plan,x.prior,x.matrix),false);});
