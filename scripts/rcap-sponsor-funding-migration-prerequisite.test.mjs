import {createHash} from 'node:crypto';
import test from 'node:test';import assert from 'node:assert/strict';
import {PREREQUISITES,FUNCTION_GUARDS,verifyMigrationPrerequisites,prerequisiteSql} from './rcap-sponsor-funding-migration-prerequisite.mjs';
const fixture=()=>({versions:[...PREREQUISITES],functions:Object.fromEntries(FUNCTION_GUARDS.map(([sig,body])=>[sig,body]))});
const reviewed={sourceSha:'a'.repeat(40),functionHashes:Object.fromEntries(FUNCTION_GUARDS.map(([sig,body])=>[sig,createHash('sha256').update(body).digest('hex')]))};
test('exact prerequisite order; zero allocation is not a denial',()=>{const e=fixture();e.publishedZeroAllocation=3;assert.equal(verifyMigrationPrerequisites(e,reviewed).status,'PASS');});
for(const version of PREREQUISITES)test(`missing ${version} refuses`,()=>{const e=fixture();e.versions=e.versions.filter(v=>v!==version);assert.throws(()=>verifyMigrationPrerequisites(e,reviewed));});
for(const [sig] of FUNCTION_GUARDS)test(`unrecognized body ${sig} refuses`,()=>{const e=fixture();e.functions[sig]='changed';assert.throws(()=>verifyMigrationPrerequisites(e,reviewed));});
test('wrong ordering refuses',()=>{const e=fixture();e.versions.reverse();assert.throws(()=>verifyMigrationPrerequisites(e,reviewed));});
test('replaying already transitioned function refuses',()=>{const e=fixture();e.functions[FUNCTION_GUARDS[0][0]]+=' allocate_clinic_packet_funding(';assert.throws(()=>verifyMigrationPrerequisites(e,reviewed));});
test('query is read-only and never applies migration',()=>{const q=prerequisiteSql();assert.match(q,/begin transaction read only/);assert.ok(!/create|alter|drop|insert|update|delete/i.test(q.replaceAll(FUNCTION_GUARDS[1][1],'')));});

test('even a body retaining the migration needle must match the reviewed full body',()=>{const e=fixture();e.functions[FUNCTION_GUARDS[0][0]]+=' changed behavior';assert.throws(()=>verifyMigrationPrerequisites(e,reviewed));});
test('missing reviewed body receipt refuses',()=>assert.throws(()=>verifyMigrationPrerequisites(fixture())));
