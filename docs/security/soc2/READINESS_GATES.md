# Readiness gates

Objective entry and exit criteria for each company-control gate. A gate is passed
only on evidence. No gate may be inferred from progress on another.

## CCG-A — Control Census Complete

**Entry.** A repository-wide census has been attempted.

**Exit.** Every control has a unique ID · exactly one accountable owner · a
`current_status` · an `evidence_maturity`. Every current claim has evidence or is
explicitly labelled unverified. No duplicate control source of truth exists.
System boundary, in-scope products and services, initial data-flow map, and
initial vendor and asset census exist. External-action register seeded.
Secureframe mapping backlog recorded.

**Blocks.** Claiming control completeness. Beginning observation-readiness review.

**Does not block.** Non-production product development. Shadow legal builds.
Documentation drafting.

## CCG-B — Production Protection Minimum

**Entry.** CCG-A passed.

**Exit.** Privileged MFA evidenced on every sensitive system · complete
privileged-access inventory · one completed access review with inappropriate
access removed · a protected production change path that code cannot bypass ·
required status checks · secret and key inventory · backup status confirmed ·
critical logging and alerts configured with named responders · an incident
contact path.

**Blocks.** Uncontrolled production releases. New production systems without
owners. Any claim that the production environment is audit-ready.

## CCG-C — Operational Control Cycle Complete

**Entry.** CCG-B passed.

**Exit.** At least one properly evidenced execution of each applicable recurring
control: access review · vendor review · risk review · training · policy
acknowledgment · alert review · vulnerability review · backup or restore exercise
· incident tabletop. Each with a date, an operator, an approver and stored
evidence.

**Blocks.** Observation-period start.

## CCG-D — Privacy and Data Lifecycle Ready

**Entry.** Data inventory exists.

**Exit.** Data inventory · approved classification · approved retention schedule
· privacy-request intake · identity verification · deletion and exception
workflow · processor deletion propagation · completion evidence for at least one
end-to-end request.

**Blocks.** Claiming a Grade-A privacy lifecycle. Declaring privacy controls
ready.

**Note.** `docs/PRODUCT_CONTRACT.md` §12A records that no participant export or
deletion capability exists on any branch. A controlled manual process may serve
as an interim control if it includes intake, identity verification, scope,
retention review, execution, processor propagation, review and completion
evidence — but the gate is not passed by the policy alone.

## CCG-E — Observation Readiness

**Entry.** CCG-B, CCG-C and CCG-D passed.

**Exit.** All of: P0 technical actions complete · policies approved · control
owners assigned · privileged MFA evidenced · an access review completed ·
critical vendors reviewed · risk register approved · training and acknowledgments
complete · incident tabletop complete · restore test complete · privacy-request
process operational · vulnerability and patch workflow operating · logging and
alert review operating · recurring Secureframe evidence tasks active · material
exceptions have treatment plans · current product security boundaries have hosted
evidence · compliance language approved.

Then, and only then, in this order:

1. **Faith Walls** attests that required evidence is present and organised.
2. **Lawrence Blackmon** provides legal, privacy and compliance approval.
3. **Roger Roman** makes the final observation-period go/no-go decision.

No unresolved P0 exception without an approved treatment plan. Secureframe
mapping complete.

**Blocks.** Starting the Type II observation period. Any customer statement
implying the observation period has begun.

**None of these three approvals may be inferred or fabricated.**

## CCG-F — Audit Completion

This is an external auditor outcome, not an internal determination.

Only after the report is actually issued may company language be updated, and
then only to reflect the report's exact scope, period, criteria and opinion.

**No internal plan status substitutes for this gate.**
