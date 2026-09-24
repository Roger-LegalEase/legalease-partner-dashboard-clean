import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { migrationCertification, requireMigrationCertification, acceptanceLedgerExecution } from './rcap-migration-certification.mjs';
import { CONTRACT_PATH } from './rcap-packet-database-contract.mjs';

const contract=JSON.parse(fs.readFileSync(CONTRACT_PATH,'utf8'));
test('duplicate HTTP/SQL errors, matching ledger hashes and plausible objects never certify a phase',()=>{
  for(const error of ['42710','42P07','42701','42P06','already exists'])assert.equal(migrationCertification({duplicate:error,ledgerMatch:true,signaturePresent:true}).certified,false);
  assert.equal(acceptanceLedgerExecution({sha256:'a',applied_by:'adopted_existing_objects'},'a'),false);
  assert.equal(acceptanceLedgerExecution({sha256:'a',applied_by:'hosted_acceptance_pipeline'},'a'),true);
});
test('complete exact catalog permits adoption even after a duplicate response',()=>{
  assert.equal(migrationCertification({expected:contract.current,actual:contract.current,duplicate:true,executed:false}).certified,true);
});
test('every postcondition is required for adoption even when execution reports success',()=>{
  for(const key of Object.keys(contract.current)) {
    const partial=structuredClone(contract.current);delete partial[key];
    const verdict=migrationCertification({expected:contract.current,actual:partial,executed:true});
    assert.equal(verdict.certified,false,key);assert.ok(verdict.failures.some(f=>f.name===key));
  }
});
test('no empty expected manifest can certify historical adoption',()=>{
  for(const expected of [null,undefined,{}])assert.throws(()=>requireMigrationCertification({expected,actual:{},signaturePresent:true}),/migration_not_certified/);
});

// Exercise the real Production control's functions and lexical state without
// running its network entrypoint. No copied certification predicate.
function productionControls() {
  const filename=path.resolve('scripts/rcap-production-forward-chain-migrate.mjs');
  let source=fs.readFileSync(filename,'utf8');
  source=source.slice(0,source.indexOf('\ntry {\n  if (PHASE !=='));
  source=source.replace(/^import .*;\n/gm,'').replace(/^export /gm,'').replaceAll('import.meta.url',JSON.stringify(pathToFileURL(filename).href));
  const requests=[];
  const context={requireMigrationCertification,createHash,path,fileURLToPath,process:{env:{}},console,
    fs:{...fs,mkdirSync(){}},fetch:async(url,opts)=>{
      requests.push({url,opts});return {ok:false,status:409,async text(){return JSON.stringify({message:'duplicate object 42710'});}};
    }};
  vm.runInNewContext(source+'\nglobalThis.controls={summarizeReadback,recordLedgerRow,managementQuery,MIGRATIONS,LEDGER_BASELINE_VERSIONS,PHASE_PREREQUISITES,UNLEDGERED_PRIOR_STEPS,certifiedExecutions,evidence};',context);
  return {c:context.controls,requests};
}
test('Production all-signatures inventory plus ledger is not a full migration certificate',()=>{
  const {c}=productionControls(),r={ledger_present:true,ledger_has_name_column:true,ledger_versions:[...c.LEDGER_BASELINE_VERSIONS,...c.MIGRATIONS.map(m=>m.version)]};
  for(const m of c.MIGRATIONS)r[`sig_${m.version}`]=true;
  for(const p of c.PHASE_PREREQUISITES)r[`prereq_${p.name}`]=true;
  for(const p of c.UNLEDGERED_PRIOR_STEPS)r[`prior_${p.version}`]=true;
  const result=c.summarizeReadback(r);assert.equal(result.signaturesComplete,true);assert.equal(result.complete,false);
});
test('Production refuses the ledger write before any request for a partially existing migration',async()=>{
  const {c,requests}=productionControls();
  await assert.rejects(c.recordLedgerRow(c.MIGRATIONS[0],true),/migration_not_certified/);
  assert.equal(requests.length,0);assert.equal(c.evidence.ledgerRowsRecorded.length,0);
});
test('Production duplicate-object response cannot become a successful exact execution',async()=>{
  const {c}=productionControls();
  await assert.rejects(c.managementQuery('create table first_statement_exists(id integer); create table missing_second(id integer)','partial'),/HTTP 409/);
  assert.equal(c.certifiedExecutions.size,0);
});
test('Production apply paths require certification before preexisting-schema adoption',()=>{
  for(const file of ['scripts/rcap-production-clinic-migrate.mjs','scripts/rcap-production-legal-aid-migrate.mjs']) {
    const source=fs.readFileSync(file,'utf8');
    assert.ok(source.includes('requireMigrationCertification();'),file);
    assert.ok(!source.includes('preexisting_complete_structural_readback'),file);
    assert.ok(source.includes('requireMigrationCertification({ executed:evidence.migrationApplied }).certified'),file);
  }
});
test('acceptance verifies Phase 50 before writes and skips baseline replay on existing environments',()=>{
  const source=fs.readFileSync('scripts/rcap-hosted-acceptance-migrate.mjs','utf8');
  assert.ok(source.indexOf('if (!phase50Proof.certified)')<source.indexOf('// --- 1b. Stamp'));
  assert.ok(source.includes('for (const name of existingSequence ? [] : ordered)'));
  assert.ok(!source.includes('r.ok || duplicate'));assert.ok(!source.includes('ALREADY_PRESENT'));
  assert.ok(source.includes('migrationCertification({ expected:contract.current, actual })'));
});
test('workflow requires the read-only catalog gate before any payment and keeps blank promo blank',()=>{
  const source=fs.readFileSync('.github/workflows/rcap-hosted-acceptance-staging.yml','utf8');
  assert.ok(source.indexOf('run: node scripts/verify-rcap-packet-database.mjs')<source.indexOf('run: node scripts/rcap-hosted-acceptance-payment.mjs'));
  assert.match(source,/HOSTED_STRIPE_PROMOTION_CODE: \$\{\{ inputs\.promotion_code \}\}/);
});
