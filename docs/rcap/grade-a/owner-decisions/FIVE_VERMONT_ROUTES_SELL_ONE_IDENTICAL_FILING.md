# Five Vermont seal routes deliver one identical filing

**For Roger. Nothing here has been decided. No family has been promoted or
withdrawn on account of it.**

## The measurement

Five families deliver **byte-identical** canonical fixtures and byte-identical
boundary fixtures:

    vt_seal_18_to_21-set
    vt_seal_dui-set
    vt_seal_felony-set
    vt_seal_misdemeanor-set
    vt_seal_pardon-set

    canonical  81dd74a0ee1d178cefcb0f028dfba3e9bc7dbd7687bcf58193b0b9d62d767dee
    boundary   7ff3cc2272008865eba1d723e1d8dc4074b8163c7c6dbca82cf665003e32750e

VF25 read all five independently and returned `PASS_COMPLETE_INDEPENDENT` on
each: fifteen obligations PASS, nine counters measured at zero, no
`NOT_MEASURABLE_HERE`. It measured the digests itself rather than copying them.

`CLONED_FAMILY_PACKETS.json` already carries this group. Its digests there are
stale — it pins the boundary at `21fa17be…`/852,465 bytes against today's
`7ff3cc22…`/852,680 — and VF25 re-measured rather than trusting either. The
group is real; the pinned numbers are old.

## What distinguishes the five, and where that distinction reaches the participant

Only the **guide**. The five guides differ substantially — §7602(c) and a
three-year wait, (d) and seven years, (e) and ten, §7609 and thirty days, and
different exclusion lists. **Not one byte of that distinction reaches the
packet.** The filing the participant takes to the clerk is the same document in
all five routes.

## Why this is not the Alabama refusal, and why that matters

On 2026-09-10, run 34418960259, two Alabama families were refused admission on
clean RASTER_PASS receipts. That refusal rested on **two** findings, not one:

1. the two families delivered byte-identical petitions, and
2. **the petition ticked no eligibility ground on the CR-65 it filed**, on a
   form that has ground checkboxes to tick.

Limb 2 is what made limb 1 fatal there: the build had a ground to state, a place
to state it, and stated nothing, so the identity was a failure to write rather
than a property of the form.

VF25 tested limb 2 on Vermont directly rather than assuming it. Form 200-00130
carries **twelve selection widgets and none of them encodes the statutory
ground** — every one is a factual question about the participant's record
(convicted / not convicted / cited-never-charged / probation / restitution).
There is no route value any of the five failed to write, because the Judiciary's
form provides nowhere to write one. The identical filing is a property of the
form, not of this build.

So the Alabama test, applied honestly, **does not condemn these five**. Applied
dishonestly — clone alone, limb 1 without limb 2 — it would, and it would be the
wrong answer.

## The question that is actually open, and it is yours

It is a **commercial** question, not a packet-defect question:

> Should five separately-named, separately-priced routes exist when the document
> they deliver is one document?

The build discipline is clear that these are different questions.
`COMPLETE_PACKET_PROVEN` says a packet is proven correct. It is not a commercial
authorisation: authority comes from a Grade-A fulfilment record keyed to an
exact route and packet family, and a route sells only what a record proves it
delivers. Five proven families can coexist with one, two or five saleable
routes, and that is your call rather than the gate's.

## What I am doing in the meantime, and why

I dispatched the central raster for all five. Rendering gathers evidence; it
admits nothing. Alabama's refusal came **at admission**, on receipts that had
already arrived clean, which is the right place for a judgement like this.

If the receipts come back clean I intend to admit all five, on VF25's reading
and on the two-limb analysis above — recording this document as the reason, so
the admission is a decision and not a silence. **Tell me if you want it held**,
and I will hold the five at `BUILT_RASTER_PENDING` with their receipts committed
and unadmitted, which loses nothing and is fully reversible either way.

## Three things I did not do

- I did not convert the clone into a failed obligation. VF25 declined to, with a
  measurement, and I am not overriding a measurement with a policy instinct.
- I did not edit `CLONED_FAMILY_PACKETS.json`. Its digests are stale and that is
  recorded here rather than corrected on the way past.
- I did not touch pricing, route registration or any commercial record.
