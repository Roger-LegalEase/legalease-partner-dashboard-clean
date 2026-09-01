# CB08 full-chain failures

## Result

The authoritative `npm test` chain exits 1 after eight seconds at its first command, `scripts/verify-tracked-mutation-safety.mjs`. The result reproduced once from a clean worktree and left no mutation files dirty.

## Failure classification

| ID | Classification | Finding |
| --- | --- | --- |
| CB08-F001 | `ENVIRONMENT_BLOCKED` | The tracked-mutation verifier reports 2 of 42 checks failed because `test-rcap-phase52-mutations.mjs` cannot make any of its 12 mutations red. The nested Phase 52 verifier prints `SKIPPED` and exits zero when ephemeral PostgreSQL is unavailable, which the mutation harness necessarily observes as green. |

There are no failures classified `PRE_EXISTING`, `INTRODUCED_ON_CURRENT_HEAD`, `HISTORICAL_SNAPSHOT_DRIFT`, or `NONDETERMINISTIC`. The implicated scripts, migration, and payment adapter have no diff between shift base `c6d7ffe7cfdf45629f873e1a0e58ae4b174d45c6` and the pre-task head `110c028aaeccad30d5d673d46110d5fc3859db4e`.

## Minimal repair proposal

Make `scripts/test-rcap-phase52-mutations.mjs` check ephemeral PostgreSQL availability before it registers or applies a mutation. An unavailable database must be reported as an explicit environment block, not interpreted as 12 verifier-green mutations. With PostgreSQL available, preserve the existing requirement that all 12 mutations turn the verifier red and that the restored migration passes.

CB08 did not apply this proposal: this assignment owns triage artifacts only and prohibits broad fixes.

## Safety

No packet/source artifact, Claude lane output, claim ledger, active assignment, commercial route, or production system was modified. No `PASS_COMPLETE` claim is made.
