import fs from 'node:fs';
import {createHash} from 'node:crypto';
import test from 'node:test';import assert from 'node:assert/strict';
import {ACCEPTANCE_RECEIPTS,PREREQUISITES,FUNCTION_GUARDS,verifyMigrationPrerequisites,prerequisiteSql} from './rcap-sponsor-funding-migration-prerequisite.mjs';
const fixture=()=>({versions:[...PREREQUISITES],catalogueRows:PREREQUISITES.map(version=>({version})),functions:Object.fromEntries(FUNCTION_GUARDS.map(([sig,body])=>[sig,body]))});
const reviewed={sourceSha:'a'.repeat(40),functionHashes:Object.fromEntries(FUNCTION_GUARDS.map(([sig,body])=>[sig,createHash('sha256').update(body).digest('hex')]))};
test('exact prerequisite order; zero allocation is not a denial',()=>{const e=fixture();e.publishedZeroAllocation=3;assert.equal(verifyMigrationPrerequisites(e,reviewed).status,'PASS');});
for(const version of PREREQUISITES)test(`missing ${version} refuses`,()=>{const e=fixture();e.versions=e.versions.filter(v=>v!==version);assert.throws(()=>verifyMigrationPrerequisites(e,reviewed));});
for(const [sig] of FUNCTION_GUARDS)test(`unrecognized body ${sig} refuses`,()=>{const e=fixture();e.functions[sig]='changed';assert.throws(()=>verifyMigrationPrerequisites(e,reviewed));});
test('wrong ordering refuses',()=>{const e=fixture();e.versions.reverse();assert.throws(()=>verifyMigrationPrerequisites(e,reviewed));});
test('replaying already transitioned function refuses',()=>{const e=fixture();e.functions[FUNCTION_GUARDS[0][0]]+=' allocate_clinic_packet_funding(';assert.throws(()=>verifyMigrationPrerequisites(e,reviewed));});
test('query is read-only and never applies migration',()=>{const q=prerequisiteSql();assert.match(q,/begin transaction read only/);assert.ok(!/create|alter|drop|insert|update|delete/i.test(q.replaceAll(FUNCTION_GUARDS[1][1],'')));});

test('even a body retaining the migration needle must match the reviewed full body',()=>{const e=fixture();e.functions[FUNCTION_GUARDS[0][0]]+=' changed behavior';assert.throws(()=>verifyMigrationPrerequisites(e,reviewed));});
test('missing reviewed body receipt refuses',()=>assert.throws(()=>verifyMigrationPrerequisites(fixture())));

const alternate=()=>({...fixture(),projectRef:'hyflxnlhpmiqxvvcoiia',versions:[],catalogueRows:[],acceptanceReceipts:structuredClone(ACCEPTANCE_RECEIPTS)});
test('complete reviewed alternate chain reports actual history without canonical catalogue claims',()=>{
 const input=alternate(),before=structuredClone(input),result=verifyMigrationPrerequisites(input,reviewed);
 assert.equal(result.proofForm,'reviewed_alternate_receipts');assert.deepEqual(result.observedCatalogueVersions,[]);
 assert.deepEqual(result.prerequisiteProofs.map(p=>p.canonicalPrerequisite),PREREQUISITES);
 assert(result.prerequisiteProofs.every(p=>p.canonicalCatalogueRowPresent===false));assert.deepEqual(input,before);
});
test('canonical proof reports each actual catalogue version',()=>{
 const result=verifyMigrationPrerequisites(fixture(),reviewed);assert.equal(result.proofForm,'canonical_catalogue');
 assert.deepEqual(result.prerequisiteProofs.map(p=>p.catalogueVersion),PREREQUISITES);assert(result.prerequisiteProofs.every(p=>p.canonicalCatalogueRowPresent));
});
for(const [label,mutate]of [
 ['forged receipt ledger',e=>e.acceptanceReceipts[0].ledger='schema_migrations'],
 ['wrong Clinic source',e=>e.acceptanceReceipts[0].applicationSha='0'.repeat(40)],
 ['wrong Clinic position',e=>e.acceptanceReceipts[0].position=12],
 ['wrong source path',e=>e.acceptanceReceipts[0].identity='supabase/migrations/invented.sql'],
 ['wrong stored body hash',e=>e.acceptanceReceipts[1].sha256='0'.repeat(64)],
 ['wrong remote timestamp',e=>e.acceptanceReceipts[1].identity=PREREQUISITES[1]],
 ['wrong migration name',e=>e.acceptanceReceipts[2].name='invented'],
 ['partial receipts',e=>e.acceptanceReceipts.pop()],
 ['duplicate receipts',e=>e.acceptanceReceipts.push(e.acceptanceReceipts[0])],
 ['reordered history',e=>e.acceptanceReceipts.reverse()],
 ['mixed partial catalogue',e=>{e.versions=[PREREQUISITES[0]];e.catalogueRows=[{version:PREREQUISITES[0]}];}],
 ['canonical claim with absent rows',e=>e.versions=[...PREREQUISITES]],
 ['claimed canonical proof of alternate rows',e=>e.proofForm='canonical_catalogue'],
 ['unobserved catalogue',e=>delete e.catalogueRows],
 ['wrong Acceptance project',e=>e.projectRef='production'],
 ['unknown extra receipt claim',e=>e.acceptanceReceipts[0].canonicalApplied=true],
 ['function hash mismatch retaining guard',e=>e.functions[FUNCTION_GUARDS[0][0]]+=' changed'],
 ['already transitioned body',e=>e.functions[FUNCTION_GUARDS[0][0]]+=' allocate_clinic_packet_funding(']
])test(`alternate refuses ${label}`,()=>{const e=alternate();mutate(e);assert.throws(()=>verifyMigrationPrerequisites(e,reviewed));});
test('alternate refuses missing independent reviewed-body receipt',()=>assert.throws(()=>verifyMigrationPrerequisites(alternate())));
for(const [sig]of FUNCTION_GUARDS)test(`alternate refuses unrecognized body ${sig}`,()=>{const e=alternate();e.functions[sig]='unknown';assert.throws(()=>verifyMigrationPrerequisites(e,reviewed));});
for(const receipt of ACCEPTANCE_RECEIPTS)test(`immutable prerequisite SQL matches ${receipt.canonicalVersion}`,()=>{
 const names=fs.readdirSync('supabase/migrations').filter(n=>n.startsWith(receipt.canonicalVersion+'_'));assert.equal(names.length,1);
 assert.equal(createHash('sha256').update(fs.readFileSync('supabase/migrations/'+names[0])).digest('hex'),receipt.sha256);
});
