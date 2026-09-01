# Handoff — CA `ca-diversion-seal` (composed route)

Job: `T-C-CA-complete-composed-route` · Treatment: `complete_composed_route`
Jurisdiction: California (CA) · Registry pin: `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5`
Profile: `src/lib/rcap-engine/compiled/profiles/CA-california.json`
(sha256 `d2a35fc698c32b62b98905d081693028d1553eab5de9f45f4f66ebc7d52e1755`)
State pack: `src/lib/rcap/state-packs/california/all50-build-metadata.ts`

## Authority

Primary: **Cal. Penal Code § 851.90** — sealing after drug diversion or deferred
entry of judgment. **§ 851.92** supplies the post-order mechanics. The registry
also lists **§§ 851.87, 1000.4, 1001.9**, whose full text has not been read, and
identifies the qualifying programmes as superior court drug diversion under
**§ 1000.5** and deferred entry of judgment under **§§ 1000 / 1000.8**. Route
effective from 2018-01-01 (SB 393 (2017)). Reviewed as of 2026-07-30.

## Mechanism

Where the person was diverted under a § 1000.5 drug diversion programme, or
admitted to a § 1000 / § 1000.8 deferred entry of judgment programme, and
successfully completed it, the judge **may** order the arrest records sealed as
described in § 851.92 — on written or oral motion of any party, or on the court's
own motion, with notice to all parties. Relief is discretionary.

Venue: the superior court that handled the diversion or DEJ. Local practice and
local forms govern. **There is no statewide Judicial Council form.**

## Route decision

Composed, sequential, three units. See `route.json`.

| Unit | Legal unit | Required output | Component | State |
| --- | --- | --- | --- | --- |
| `ca-diversion-seal-stage-1` | Explain the route and identify the local form | `participant_instruction` | `ca-diversion-seal-process-guidance-1` | **Built** — `process-guidance.md` + 4 fixtures |
| `ca-diversion-seal-stage-2` | County petition and order set | `official_form_dependency` | `ca-diversion-seal-primary-filing-2` | **Blocked** — `dependency.json` only |
| `ca-diversion-seal-stage-3-fee-waiver` | Fee waiver request | `official_form_dependency` | `ca-diversion-seal-fee-waiver-3` | **Blocked** — `dependency.json` only |

**No pleading document is drafted for this track, deliberately.** The operative
filing is a county-published petition and order. Drafting a substitute would
invent a court form, a caption, a venue, and filing mechanics that no source
states, and the registry retains county form coverage as a true blocker. Units 2
and 3 therefore carry `dependency.json` and nothing else.

Unit 3 (FW-001) is additive to the registry's own `units[]`, which contains only
stages 1 and 2. It is included because `rules.feeWaiver` and
`packetSet.participantActionRequired[7]` name FW-001 as a conditional filing that
neither of the other two units carries. `omissionProof` in `route.json` records
this so the enumeration reads as a superset, never a subset.

## Filing separation

**Court documents** — the county's own § 851.90 petition and proposed order
(participant-obtained); FW-001 if a fee applies and the participant cannot pay;
possibly the proof of programme completion, if local practice requires it lodged
(unconfirmed, cf-10).

**Participant-only** — `components/ca-diversion-seal-process-guidance-1/process-guidance.md`
and `participant-instructions.md`. Neither is filed.

**No cover sheet** is drafted. Neither the registry entry nor the state pack
records a cover sheet requirement for this route.

## Open counsel flags

11 flags, all in `route.json → counselFlags`. The load-bearing ones:

- **cf-01** — full text of §§ 851.87, 1000.4, 1001.9 unread; the eligibility
  branch cannot be fully specified and any exclusions those sections carry are
  unstated. Registry build blocker.
- **cf-02** — whether a statewide form exists that was missed. Registry build
  blocker; the whole route design rests on the answer being "no".
- **cf-03** — no approved county petition and order set for any county, including
  the two geography keys (`san-diego`, `kern`); no local-form survey has been
  done. Registry build blocker; this is what blocks unit 2.
- **cf-04 / cf-05 / cf-06 / cf-07** — fee, notarization, service manner, and
  court name/address/department are all **null** in source. Every one is carried
  as an explicit "ask the clerk" in the participant output rather than filled.
  This mirrors the ND config's treatment of its missing verification statute.
- **cf-08** — discretionary relief; prosecutor position never prefilled;
  opposition or a contested hearing triggers handoff.
- **cf-09** — none of the three official sources carries a SHA-256, and two are a
  secondary code publisher; staleness is undetectable.
- **cf-11** — vocabulary: arrest sealing only, never dismissal / set-aside /
  expungement; county coverage must never read as statewide coverage.

## F-review pointers

`implementationQueue: F_source_problem`. `legalDesignStatus:
legal_design_approved_with_limitations`. `legalStatus: legal_review_pending`.
`runtimeDisabledReason`: "Imported from a legal-design memo. Output review,
visual review and technical proof are all outstanding."

Open blocker kinds on the registry entry: `output_review_gate`,
`visual_review_gate`, `technical_proof_gate`, `legal_design_blocker` (×4),
`source_gate`.

F-review should take these in order:

1. **Source problem first (cf-01, cf-02, cf-09).** Read §§ 851.87, 1000.4, 1001.9
   from an official source, record SHA-256s, and settle whether a statewide form
   exists. Until cf-02 resolves, unit 2's entire premise is unverified.
2. **Form acquisition (cf-03).** Lane D collects and approves SDSC CRM-307 and
   the Kern local petition; lane E surveys the remaining target counties. Unit 2
   stays excluded for every participant until at least one county set is
   approved.
3. **Clerk-answerable facts (cf-04 through cf-07, cf-10).** These are per-county
   and can only close alongside form acquisition.
4. **Output review (cf-11).** Vocabulary sweep of `process-guidance.md` and
   `participant-instructions.md` against the arrest-sealing scope restriction.
   `fixtures/negative.json` is the intended failing case for that sweep.

Nothing here is approved for live use.

## Dependency-deferral correction candidate

Candidate status: `candidate_ready_for_independent_review`

Both assigned dependency components now carry
`candidateDisposition: exact_supported_deferral` with bilingual participant
treatment, packet-absence disclosure, named clerk/self-help destinations,
Briefcase preservation/outstanding/return instructions, payment suppression,
and zero credit consumption:

- `components/ca-diversion-seal-primary-filing-2/deferral-treatment.json` and
  `fixtures/canonical.json` — county petition and proposed order; destination
  supported by the pinned route's handling-superior-court venue and clerk/self-help
  acquisition instructions.
- `components/ca-diversion-seal-fee-waiver-3/deferral-treatment.json` and
  `fixtures/canonical.json` — FW-001; destination supported by the dependency's
  express instruction to ask the handling county superior court clerk.

Each treatment pins its unchanged `dependency.json` hash and assignment hash
`1b2bb69e97ea78f9b1b84666b830b41be749736c03b53114d5359aa46626e623`.
The unresolved county form set, filing details, fee posture, and current FW-001
remain explicit; this candidate status records only the correction evidence.
