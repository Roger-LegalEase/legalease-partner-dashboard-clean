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
// the old duplicate-error adoption. This establishes only historical execution;
// it never replaces the current release's required runtime postconditions.
export function acceptanceLedgerExecution(row,hash) {
  return row?.sha256===hash && row?.applied_by==='hosted_acceptance_pipeline';
}

// This is the executable acceptance sequence used by the hosted entrypoint.
// The callback reads the complete source-derived release contract, including
// later legitimate owners. A historical phase is never replayed over a known
// existing database merely because its execution receipt is missing.
export async function runAcceptanceMigrationSequence({
  sequence, rows, priorRows, preserveExistingState, query, readSql,
  certifyCurrent, persistEvidence
}) {
  if (typeof persistEvidence !== 'function') throw new Error('Migration evidence writer is required');
  const ledger = new Map(priorRows.map(row => [Number(row.phase), row]));
  const result = { satisfied:0, applied:0, failure:null, passed:false };
  const quote = value => `'${String(value).replaceAll("'", "''")}'`;

  for (const entry of sequence) {
    const row = rows.find(candidate => candidate.phase === entry.phase);
    if (!row?.onDisk) throw new Error(`Missing authorized hash for phase ${entry.phase}`);
    row.applied = false;
    row.satisfied = false;
    row.databaseApplied = false;
    row.receiptRecorded = false;
    row.evidenceRecorded = false;
    row.historicalExecution = acceptanceLedgerExecution(ledger.get(entry.phase), row.onDisk);
    let wroteDatabase = false;

    try {
      row.postconditions = await certifyCurrent();
      if (!row.postconditions.certified) {
        if (preserveExistingState || ledger.has(entry.phase)) {
          row.disposition = 'current_postconditions_failed_no_replay';
          throw new Error('Current release postconditions failed; historical receipts cannot certify current state. An authorized forward correction is required.');
        }

        // A new empty environment may execute an authorized source. Success is
        // still provisional until current postconditions and both receipts pass.
        const execution = await query(readSql(entry.path));
        wroteDatabase = execution.ok === true;
        row.databaseApplied = wroteDatabase;
        row.executionStatus = execution.status;
        row.postconditions = await certifyCurrent();
        if (!execution.ok) {
          row.disposition = 'execution_failed_state_requires_readback';
          throw new Error(`Migration execution failed: ${String(execution.json?.message ?? execution.text).slice(0,300)}`);
        }
        if (!row.postconditions.certified) {
          row.disposition = 'applied_but_uncertified';
          throw new Error('SQL applied but current release postconditions failed; no success receipt was recorded.');
        }

        const receipt = await query(`
          insert into public.rcap_acceptance_migration_ledger (phase, sha256, authorization_id, applied_by)
          values (${Number(entry.phase)}, ${quote(row.onDisk)}, ${quote(entry.authorizationId)}, 'hosted_acceptance_pipeline')
          on conflict (phase) do nothing
          returning phase, sha256, authorization_id, applied_by
        `);
        const recorded = receipt.ok && Array.isArray(receipt.json) && receipt.json.length === 1 ? receipt.json[0] : null;
        if (!recorded || Number(recorded.phase) !== Number(entry.phase)
            || recorded.authorization_id !== entry.authorizationId
            || !acceptanceLedgerExecution(recorded, row.onDisk)) {
          row.disposition = 'applied_but_unrecorded';
          throw new Error(`SQL applied but its execution receipt failed (${receipt.status ?? 'unknown'}); no historical receipt was overwritten.`);
        }
        row.receiptRecorded = true;
      }

      const completed = {
        ...row, applied:wroteDatabase, satisfied:true, evidenceRecorded:true,
        disposition:wroteDatabase ? 'applied_and_recorded' : 'complete_current_postconditions_verified_no_write'
      };
      // Persist a candidate result before advancing counters. If this fails,
      // the database effect and any remote receipt remain recorded separately.
      await persistEvidence({
        ...result, satisfied:result.satisfied+1, applied:result.applied+Number(wroteDatabase),
        rows:rows.map(candidate => candidate === row ? completed : candidate)
      });
      Object.assign(row, completed);
      result.satisfied += 1;
      result.applied += Number(wroteDatabase);
    } catch (error) {
      if (!row.disposition) row.disposition = wroteDatabase ? 'applied_but_unrecorded' : 'verified_but_unrecorded';
      row.error = String(error?.message ?? error).slice(0,700);
      row.recovery = {
        action:'verify_complete_current_postconditions_before_any_further_operation',
        replayHistoricalSql:false,
        databaseChangeRolledBack:false,
        requiresForwardCorrection:row.postconditions?.certified !== true
      };
      result.failure = `phase ${entry.phase}: ${row.disposition}: ${row.error}`;
      break;
    }
  }
  result.passed = result.failure === null && result.satisfied === sequence.length;
  return result;
}
