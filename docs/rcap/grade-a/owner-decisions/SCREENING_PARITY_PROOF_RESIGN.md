# Owner decision: re-sign the screening-parity proof pin

**One decision. It is yours, and I have not made it.**

## What is broken

`npm test` stops at step 15 of 253 and has stopped on every push for days. The refusal, verbatim:

```
Error: screening parity approval is malformed: public-profile-lifecycle-validation-2026-08-26
proof scripts/verify-screening-verification-finetune.mjs hashes to
cdafceeb98c2e1df10f42a576f723c76d2c9ba2410a8587964d83cfcf7cf1bbd, not
903b1b6e61605b7e732e1754086c4496968cd95e96648ca8dbbb48bb93954642
```

## Why

Commit `b680a4e4dd92e7422bc7030aa2189026929782a1`, *Repair sponsored Mississippi Preview finalization*, Roger Roman, 2026-09-03, edited the pinned proof without re-signing its pin.

Measured, not inferred:

- the parent commit's copy of the proof hashes to `903b1b6e6160…` — exactly the pinned value, so the pin was current until this commit
- the change is **40 lines added, 0 lines removed**
- the proof itself **passes** at the current bytes: `node scripts/verify-screening-verification-finetune.mjs` exits 0, printing `screening-verification-finetune: OK`

## What the 40 lines are

Synthetic answer fixtures added to `completePacketAnswers` for a Mississippi acceptance route — arrest date and location, arresting agency, court name and type, charge classification and citation, exhibit statuses, a synthetic SSN, contact details, prosecuting authority and service address, and the personal-impact statement. No assertion was changed, weakened or deleted. No evaluator, question, date rule or legal behaviour is touched.

## Why this is a revision and not a new authorization

The mechanism draws exactly that line itself, in `validateProofRevisions`:

```
if (revision.linesRemoved > 0) {
  reject(`${where} removes ${revision.linesRemoved} line(s) from the proof;
          weakening a proof needs a new authorization, not a revision`);
}
```

This change removes nothing, adds 40, and is dated after the authorization it revises. It satisfies the revision rule as written.

## The exact diff, if you authorize it

**Two constants have to move together.** The hash is pinned in a data record *and* hardcoded in the module that validates it; changing one alone leaves the suite red with a different message.

1. `data/expungement-ai/screening-parity-approved-deltas.json`, entry `public-profile-lifecycle-validation-2026-08-26`:

```diff
-  "proofSha256": "903b1b6e61605b7e732e1754086c4496968cd95e96648ca8dbbb48bb93954642",
+  "proofSha256": "cdafceeb98c2e1df10f42a576f723c76d2c9ba2410a8587964d83cfcf7cf1bbd",
```

2. `scripts/lib/screening-parity-deltas.mjs:172`:

```diff
-const RUNTIME_REAUTHORIZATION_PROOF_SHA256 = "903b1b6e61605b7e732e1754086c4496968cd95e96648ca8dbbb48bb93954642";
+const RUNTIME_REAUTHORIZATION_PROOF_SHA256 = "cdafceeb98c2e1df10f42a576f723c76d2c9ba2410a8587964d83cfcf7cf1bbd";
```

3. Append to that entry's `proofRevisions` array — the keys are fixed and all seven are required:

```json
{
  "commit": "b680a4e4dd92e7422bc7030aa2189026929782a1",
  "date": "2026-09-03",
  "author": "Roger Roman",
  "linesAdded": 40,
  "linesRemoved": 0,
  "sha256": "cdafceeb98c2e1df10f42a576f723c76d2c9ba2410a8587964d83cfcf7cf1bbd",
  "reason": "<yours>"
}
```

## Affected behaviour

Re-signing changes no runtime behaviour whatsoever. It records that the authorized proof now has 40 more lines of synthetic fixture data than when it was signed. The authorization's own `scope` (`post_projection_question_lifecycle_validation_only`), `environment` (`repository_non_production_only`) and its nine `doesNotAuthorize` entries — legal behaviour, date behaviour, question changes, evaluator changes, migration, deployment, staging, production, launch — are untouched and still deny everything they denied before.

## What it unblocks

`npm test` runs past step 15 for the first time in days. Nothing about a packet, a route, a family or a commercial path changes.

## Why I did not do it myself

Editing the pin is granting the approval. The mechanism exists so that the person who authorized a proof is the person who re-signs it after it moves, and a session that can silently re-pin its own gate does not have a gate. Both constants and the revision entry are written above so this is one confirmation, not an investigation.
