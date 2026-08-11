# Lane E — Consumption of C (official sources) and D (MD pardon pathway)

Base `7e1b2c4d` (canonical tip at consumption). D imported by cherry-pick
(`5531d4bd`, from `c569433d`): the MD pardoned-conviction pathway under
Crim. Proc. § 10-105(a)(8)/(c)(4), rule-11 repointed, verifier and fixtures
included, evaluator routing MD-scoped. C imported by file checkout
(`2c524c59`): the re-scoped PA/SC blocker records — still **null bytes** on
both subjects, blockers sharpened to 18 Pa.C.S. § 3019(d)–(g) and S.C. Code
§ 16-3-2020(F) byte transfer only.

## What E adjudicated

**Maryland.** Independently confirmed both lift conditions the captain's
blocked override prescribed for itself: the authored pathway carries
§ 10-105(a)(8) and § 10-105(c)(4) verbatim in its own rule clauses, and
rule-11 `candidatePathwayIds` routes pardon applicants to exactly that
pathway. The override in
`generate-rcap-crosswalk-resolution-adjudication.mjs` is now
**evidence-conditional**: `resolveMdPardonOverride()` re-checks the committed
MD profile on every generation and yields `exact_current_pathway`
(counterpart: the authored pathway) only while both conditions hold —
regression of either re-blocks. `md_pardon_expungement` resolves; unresolved
registry tracks reach **zero**.

**Generator fix (half-state).** A track-direction adjudication whose
counterpart pathway row was still unresolved used to append the mapping while
leaving the row unresolved — a pairing counted on both sides of the milestone
gate. The track-subject application now promotes such a row to
`direct_runtime_representation` (the same claim in the other direction), and
the canonical verifier gained the structural check
"no unresolved pathway carries a standing track mapping".

**Pennsylvania / South Carolina.** C's records remain null-byte reductions;
both subjects stay `still_blocked` with exact subsection-scoped missing
evidence, owner, and next action. No guess.

## Generated result

497 registry tracks and **325** compiled pathways (D's pathway enters the
universe), each exactly once; 282 pathways mapped, 4 scoped-out, 31 registry
gaps, unresolved **0 tracks / 2 pathways** — exactly the two official-source
subjects. Milestone 1 item 2 remains blocked on those two; false closure and
all 27 E4 consumption mutations red on the modified generator.

## Known wiring item (audit lane / captain)

`verify-rcap-e2-source-support-audit` recomputes against working-tree bytes,
and 108 of its rows cite `track-pathway-crosswalk.json`, which this lane
legitimately regenerated. Per the a29c22c5 ruling, the audit's committed
bytes are the audit lane's own evidence and were restored untouched, so its
determinism check reads red on any tree where the crosswalk has moved. The
fix belongs to the audit lane: pin its recomputation of volatile generated
artifacts to the corpus commit it audited (`path@commit`), as every other
verifier in this pipeline already does. Every other chain segment is green
under a real install.
