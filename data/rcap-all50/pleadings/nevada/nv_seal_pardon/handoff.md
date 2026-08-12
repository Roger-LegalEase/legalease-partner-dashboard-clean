# NV:nv_seal_pardon — sealing after an unconditional pardon (NRS 179.273)

Job `T-C-NV-production-packet`, terminalization window `2026-08-12-w1`.
Disposition: **blocked_pleading** — no pleading drafted, no packet rendered.

## Authority

Pinned registry authority, verbatim from commit
`3b6f4c103d2f97249b45acc0ea3fb889ff8787e5`:

- NRS 179.273
- NRS 213
- NRS 179.285

## Mechanism

NRS 179.273 is titled "Sealing of records after unconditional pardon: Automatic
sealing; petition; no fee" in the chapter index published by the Nevada
Legislature. The controlling review describes it as providing **automatic
sealing** together with a **no-fee petition** route for the case where the
automatic sealing has not happened.

Because sealing is automatic in the first instance, the correct first move for a
participant is **verification, not a filing**.

The section text was not retrievable from the chapter-index page, and the
internal reference omits the section entirely — the review records this as one of
its five substantive gaps.

## Route decision

**Drafting is barred**, on two independent grounds.

First, the registry carries a build blocker on `affectedElement:
governing_mechanism`. How the automatic sealing is triggered and executed, how a
person verifies that it has occurred, and what the no-fee petition requires are
all unread. The petition body cannot be drafted without inventing its contents.

Second — and this would matter even if the text were available — the primary
remedy here is automatic. Generating a petition as the default output would push
a participant into a filing they may not need, to obtain relief the statute may
already have given them. That is the same harm pattern the Oklahoma track flags
about free routes: producing a filing for someone entitled to relief without one.

The right first output for this track is verification guidance, which is a
guidance-packet concern and not a controlled pleading.

### What is missing

The full text of NRS 179.273 from `https://www.leg.state.nv.us/NRS/NRS-179.html`.
Only the chapter-index heading is committed: "NRS 179.273 Sealing of records
after unconditional pardon: Automatic sealing; petition; no fee".

Routed to lane D/E for source retrieval, then counsel review.

## Open counsel flags

- **Verification before filing (blocking).** Sealing is automatic in the first
  instance; how a person verifies it is unread. Until that is known, no petition
  should be offered as the default route.
- **Fee — index title only.** The "no fee" characterisation comes from the
  chapter-index heading alone, because the section text is unread. Confirm before
  relying on it. No amount is stated anywhere.
- **Waiting period — none recorded.** Automatic sealing on an unconditional
  pardon, with a no-fee petition available where it has not occurred.
- **Verification statute — source silent.** None identified; the petition's
  required contents are unread.
- **Scope.** A conditional pardon, or any pardon short of an unconditional one,
  is not reached by the section. Anyone who does not yet hold a pardon is out of
  scope — applying for one is a Nevada Board of Pardons matter under NRS 213.
- Sealing does not restore firearm rights; only a pardon that does not restrict
  the right to bear arms does.
