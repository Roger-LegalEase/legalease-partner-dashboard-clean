import { comparePacketCatalog } from './rcap-packet-database-contract.mjs';

// Shared by acceptance and Production. Neither an error string, an object
// signature nor a ledger row is an execution or complete-postcondition proof.
export function migrationCertification({ expected, actual, executed = false } = {}) {
  if (expected && typeof expected === 'object' && Object.keys(expected).length > 0) {
    const failures = comparePacketCatalog(expected,actual);
    return { certified:failures.length===0, authority:'exact_postconditions', failures };
  }
  if (executed === true) return { certified:true, authority:'successful_exact_execution_this_run', failures:[] };
  return { certified:false, authority:'unproven', failures:[{
    name:'complete_migration_postconditions', actual:'no complete catalog authority', expected:'exact source-derived postconditions or successful exact execution this run'
  }] };
}

export function requireMigrationCertification(input) {
  const result=migrationCertification(input);
  if(!result.certified) throw new Error(`migration_not_certified: ${JSON.stringify(result.failures)}`);
  return result;
}

// The historical acceptance ledger distinguishes a successful execution from
// the old duplicate-error adoption. Only the former can serve as an execution
// receipt; Phase 50 additionally always needs its complete catalog readback.
export function acceptanceLedgerExecution(row,hash) {
  return row?.sha256===hash && row?.applied_by==='hosted_acceptance_pipeline';
}
