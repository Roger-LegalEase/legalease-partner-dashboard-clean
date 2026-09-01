# LegalEase launch sequence

**Status:** controlling execution order.
**Authority:** `docs/PRODUCT_CONTRACT.md` — where this document and the contract
disagree, the contract governs.
**Referenced by:** `docs/LegalEase-Master-Build-Plan-v4.md`.

This is the order, and what closes each step. It does not restate the contract;
it says which work happens when, and why that order and not another.

## Three tracks, one critical path

**Track A — the participant platform.** The critical path. Everything a
participant touches depends on reliable ownership transfer, so the claim
boundary comes before the experiences built on it.

**Track B — state coverage.** Runs in parallel and blocks nothing in Track A. It
decides how many states can sell a packet, not whether the product works.

**Track C — company controls and SOC 2.** A clock, not a queue. The observation
period cannot start until controls actually operate and then runs for months
regardless of engineering speed. It is the long pole for the SOC 2 *claim* and
must not be allowed to reorder Track A.

---

## Track A

| # | Phase | Closed by |
|---|---|---|
| 1 | Vocabulary and invariants | ✅ Done. `PRODUCT_CONTRACT.md`, ADR-0001, and the containment commit. |
| 2 | **Pending result and atomic claim service** | Anonymous boundary · claim continuity · exact redirect · idempotency · cross-user security |
| 3 | Canonical matter and Briefcase normalization | Ownership · no duplicated status authority |
| 4 | Consumer journey on the exact matter | Stale verification · participant authority |
| 5 | Payment, sponsorship, entitlement, render, delivery hardening | Payment integrity · sponsorship integrity · private delivery |
| 6 | RCAP as an operating layer, not a participant-data fork | Cross-tenant security · staff consent · Clinic reset |
| 6A | Participant data rights and deletion | The §12A deletion gates |
| 7 | Assurance controls | Telemetry · auditability · accessibility · mobile |
| 8 | Controlled hosted acceptance | All 21 release gates in §15, at once, on a hosted environment |

### Why this order

**Phase 2 is first because RCAP had no pending-result object at all.** The claim
boundary was absent, not mis-policied — see ADR-0001. Phases 3 through 6 each
assume ownership transfer already works; building them first means building them
twice.

**Phase 6A sits before Phase 7, not last.** The contract's reasoning is the best
argument in the document: writing a complete deletion job is the most reliable
way to find the redundancies in §13, because you cannot delete a participant
without enumerating every place their data lives. A deletion job that is hard to
write is evidence the data model has drifted. It also cannot be written against a
schema that is still moving, which is why it waits for Phase 1 and not longer.

**Phase 8 is one event, not a rolling sign-off.** A gate that passed three phases
ago on different code is not evidence.

---

## Track B — state coverage

The delta is smaller than the headline. Seventeen states are already built and
sitting on unmerged `feat/record-clearing-*` branches: seventeen to port,
twenty-four to build.

The problem to fix here is not volume, it is the contradiction: fifty-one
jurisdictions are marked `live` in one layer while exactly one of 167 families
has `generationAllowed=true`. Coverage is not a launch gate for Expungement.ai
DTC. It gates how many states can actually produce a packet.

Sequence per state, unchanged from `RCAP_ALL50_ASAP_MASTER_PLAN.md`: ingest the
Nationwide source, build the state pack, draft the overlay field maps, render
samples, render pleadings or a guidance packet, then `state_built`. Review
statuses stay independent of build statuses.

---

## Track C — company controls

Sixty-eight controls and twenty-six external actions are registered in
`docs/security/soc2/`. The order inside the track is fixed by the evidence
calendar, not by this document. Two things matter for sequencing against Track A:

- PIN-05 stays `BLOCKED` until Phases 2 and 3 land, because it *is* that work.
  See ADR-0001 and ADR-0002.
- No control completion authorizes a route promotion, and no company-control
  document replaces a legal, visual, source-fidelity or packet-verification gate.

---

## What "launch ready" means

Three conditions, none of them a date:

1. **All 21 release-blocking gates in §15 pass in controlled acceptance**, on a
   hosted environment, measured against running code rather than static
   verifiers.
2. **The operational targets in §15 hold:** zero duplicate matters from one
   pending result, zero cross-user or cross-tenant exposure, zero
   generic-dashboard redirects after claim, ≥99.9% claim success.
3. **At least one state generates a real packet end to end through the new
   path.** Today that is Mississippi through the preserved legacy generator.

## One standing risk

`npm test` is red at `main`. Twenty of its 175 commands fail on code unrelated to
the current phase, and they failed before this workstream started. A red suite
cannot tell you when you have broken something, which is the whole reason to have
one. That set should be driven to zero before Phase 4, while it is still small
enough to attribute.

Current measured state, recorded so the number is falsifiable:

| Date | Commands | Pre-existing failures | Introduced by this workstream |
|---|---|---|---|
| 2026-08-28 | 175 | 20 | 0 |
