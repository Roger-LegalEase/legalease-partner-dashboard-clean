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

---

# Final wave — official sources consumed, Milestone 1 item 2 closed

Terminal C returned the operator-supplied official bytes on
`claude/rcap-final-official-sources-ingested` @ `0c3e6e21`: 18 Pa.C.S.
§ 3019(d)–(g) and S.C. Code § 16-3-2020(F) (with the 2024 Act No. 213
history and the Act 213 § 6 retroactivity note), each hash-receipted with
full operator provenance. E imported only C's six lane-owned paths, verified
every member hash against the receipts, and ran C's verifier at import.

## Adjudication read directly from the bytes

**Pennsylvania.** § 3019(d)–(g) is a motion-to-vacate mechanism for a
closed conviction set — §§ 3503, 5503, 5506, 5507, 5902, or simple
possession — committed as a direct result of being a trafficking victim:
written motion, Commonwealth consent, particularized evidence, an
official-documentation presumption, a mandatory grant standard, and vacatur
plus expungement of all related records on grant. The compiled path-k
pathway carries this mechanism at guidance depth (attorney escalation,
Lawrence hold) and asserts nothing the statute refutes; no PA registry track
carries § 3019 operatively. Classification:
`unregistered_relief_mechanism_registry_gap`, with the procedural-depth
deltas carried as the counsel-review requirement
`pa-3019-guidance-depth-fidelity`.

**South Carolina.** § 16-3-2020(F) as rewritten by 2024 Act No. 213 § 2
grants a motion-based expungement remedy for a trafficking victim's
conviction or delinquency adjudication (trafficking article, prostitution,
or other nonviolent misdemeanor / Class F felony per § 16-1-20(A)(6)–(9)),
preponderance standard, notice to the original prosecuting agency and to
victims, retroactive under Act 213 § 6. The compiled pathway carries the
mechanism in near-statutory language; the two notice requirements and the
express retroactivity note are absent and carried as the counsel-review
requirement `sc-16-3-2020-procedural-fidelity`. No SC registry track carries
§ 16-3-2020 operatively. Classification:
`unregistered_relief_mechanism_registry_gap`.

Neither classification created a registry track; the 497 denominator is
untouched. Both are encoded twice, fail-closed in both places: (1) gap
adjudications in `crosswalk-adjudications.json` whose new
`license.officialSource` block the canonical generator re-verifies on every
run (receipt subject, byte-hash recomputation, receipt span, required
operative spans, registry-absence of the operative authority); (2)
evidence-conditional E4 lifts (`resolveOfficialSourceGapOverride`) that
re-check the same conditions and fall back to the lane's original
`still_blocked` rows byte-identically on any failure. The crosswalk's E4
pass treats a gap lift as a cross-check only — it hard-fails if the
license-verified adjudication input does not independently carry the gap
classification.

## Source-support audit resolved from the final tree

The repository's canonical audit model is deterministic recomputation, so
the audit was regenerated (`--write`, 935 rows) against the final corpus and
the crosswalk regenerated after it; `contentHash` is unchanged by the second
pass (evidence pins live outside its preimage) and both ordinary verify
modes pass from this tree. The prior wave's wiring item is thereby closed
for this corpus. C's source files joined the crosswalk's hashed evidence
corpus.

## Generated result

497 registry tracks and 325 compiled pathways, each exactly once; 282
mapped, 4 scoped-out, **33 registry gaps** (the two new gaps are
registry-owner blockers, not denominator changes), unresolved **0 / 0**.
`milestone1Item2Closed: true` — generated, not hardcoded; no track was
marked launch-terminal. Mutation coverage: 27/27 E4 consumption classes red
(the four blocked-row discipline classes now inject a synthetic blocked row,
since the live table carries none), plus the new
`verify-rcap-official-source-mutations.mjs` — byte drift ×2, receipt-hash
drift, support-verdict withdrawal, subject removal, gap-adjudication
deletion under a standing lift, operative-authority registration, and
compiled-profile mechanism loss — 8/8 red.
