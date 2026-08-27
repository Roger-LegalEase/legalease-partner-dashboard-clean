# STATUS G — Independent QA and Browser

- State: `PHASE_1_CORRECTED_WAITING_FOR_FROZEN_CANDIDATE_AND_PREVIEW`
- Branch: `sprint/20260825-qa`
- Base SHA: `07675789a80e732d2b835c1e8ba2092b39201b79`
- Phase 1 authority SHA: `714f4d51f93461855b24c8644b6ea6ddad6d15f2`
- P0 fix and artifact commit: `4635d074`
- Formal Fresh Review verdict: not started; lane A has not supplied an exact frozen candidate SHA.
- Hosted browser acceptance: not started; lane F has not supplied an exact Preview URL.

## Release-captain P0 corrections

1. Canonical validation now completes before ownership or packet derivation. Every disposition record must contain the complete expected schema. `flowKey`, jurisdiction, remedy, effective terminal, payment mode, and sponsorship mode must exactly match the canonical manifest. Required fixture data must include answers, `reproducesTerminal`, and `replayResultCode`. Unknown fields, missing fields, invalid ownership-driving enums, contradictory canonical fields, and missing fixtures fail generation.
2. Replay mismatches are explicit QA holds. A manifest fixture with `reproducesTerminal=false` is marked `HELD_REPLAY_MISMATCH` on the flow and both device variants. It is excluded from executable counts and makes `everyFlowHasExecutableDesktopAndMobile` false.
3. Runtime generation no longer requires the authority SHA to exist in a shared Git object store. Byte-exact source inputs are committed under `data/expungement-ai/qa/authority/714f4d51f93461855b24c8644b6ea6ddad6d15f2/`, with byte counts and SHA-256 values in `AUTHORITY_PROVENANCE.json`. The loader verifies provenance before parsing any authority input.

## Corrected Phase 1 evidence

- Real flows represented: 356/356.
- Required desktop/mobile variants represented: 712.
- Executable flows: 325.
- Executable device variants: 650.
- Replay-mismatch held flows: 31.
- Replay-mismatch held device variants: 62.
- Browser shards: 6, disjoint, complete union.
- Required fixture data present: true.
- Every flow has executable desktop/mobile variants: false.
- Colorado stress set: 5/5 flows executable, 10/10 variants executable.
- Mississippi stress set: 14/14 flows executable, 28/28 variants executable.
- Wisconsin stress set: 6/6 flows executable, 12/12 variants executable.

Canonical `READY_FOR_HOSTED_ACCEPTANCE` rows that remain QA-held for replay mismatch:

- `EXPAI-DC-ce1b907b71`
- `EXPAI-PA-4d793b6257`
- `EXPAI-PA-b248648fdc`

The complete 31-flow hold list is recorded in `data/expungement-ai/qa/fresh-review/BUILD_SUMMARY.json` and on each affected row in `CURRENT_MATRIX.json`.

Artifact digests:

- Matrix: `347797e192915afc3c0784342e4f4857f70fd6554486fa4dcf747683b2ea3e90`
- Browser shards: `75d453db7e7001da99c4cf323a66b5a1ef99a52cd3065fefe1faa8a4fc4b075f`
- Three-state stress set: `cff82437be3a22be5b3aab8cc050fc869a39b596e5829faa26d450e59bf9e588`

## Reproducibility and regression evidence

Primary verification:

```sh
node scripts/expungement-ai/qa/test-fresh-review-matrix.mjs
node scripts/expungement-ai/qa/build-fresh-review-matrix.mjs \
  --candidate-sha 714f4d51f93461855b24c8644b6ea6ddad6d15f2 \
  --check
```

Current result:

- 110 assertions pass.
- The four generated artifacts pass byte-for-byte `--check` verification.
- Mutation coverage proves contradictory canonical fields, missing fixtures, missing ownership fields, invalid ownership enums, duplicate IDs, incomplete joins, shard overlap, and shard omissions fail.
- A fresh/shallow-clone-equivalent test copies only the committed QA scripts and authority bundle into a temporary tree with no `.git`, regenerates all four artifacts byte-identically, then proves a one-byte authority mutation fails its SHA-256 gate.

## Remaining gates

- Phase 2 may start only when lane A identifies an exact frozen candidate SHA. The Phase 1 authority SHA above is correction input, not a Fresh Review verdict target.
- The 31 replay-mismatch fixtures must remain held until their owners supply reproducing fixtures; affected cases and necessary boundary neighbors may then be rerun once.
- Phase 3 may start only after lane F publishes the exact Preview deployment for the frozen candidate.
- `DEMO_CASES.json` remains gated on hosted CO/MS/WI browser evidence.

No product behavior, canonical generated ledgers, package or lock files, workflows, migrations, or another lane's worktree were modified.
