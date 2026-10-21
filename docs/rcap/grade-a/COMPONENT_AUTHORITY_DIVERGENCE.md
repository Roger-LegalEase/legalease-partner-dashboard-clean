# The census and the packet-set manifest disagree about components, for 207 families

**Status:** measured 2026-09-09, not changed. It needs a decision, not a patch.

## How it surfaced

`pa_pardon_expungement-set` fails COMPONENT_SET on one thing: the delivered
`product-wiring.json` `binding.packetComponents` names two of the three
components the packet-set manifest declares, omitting
`component:pa_pardon_expungement-process-guidance-1` — which for the automatic
route is the whole of the deliverable, and which the manifest marks required.

FIX101 corrected it at the builder, by reading the manifest. The central
regeneration at `48f4637c4` reverted it, and VF01 measured it still reverted at
`683e8e31a`. The builder can never hold that fix, because the derivation is what
overwrites it.

## Where the value actually comes from

`generate.mjs:1976`:

```js
const components = [...new Set(routes.flatMap(
  (r) => (r.requiredSourceIds ?? []).filter((s) => s.startsWith("component:"))))].sort();
```

So a family's components are whatever `component:` ids appear in the
route-obligation census's `requiredSourceIds`, alphabetically sorted. The
packet-set manifest — which exists to declare what a packet set contains, in
order, with each component's role and requirement — is not consulted.

## Neither obvious fix is safe

**Correcting the census for this family** works and was tried: adding the
guidance id to both `pa_pardon` routes did put all three components into the
delivered binding. But the census is pinned by whole-file SHA-256 in receipts
across the estate, so the edit lapsed 22 families. Refreshing those pins on
exact-anchor proof rewrote their `source-receipt.json` files — and four of those
receipts are pinned BY GIT BLOB in independent review records
(`de-current-review-reconciliation.json` pins
`sourceReceiptGitBlobSha: ba5a7452…`, and three Connecticut families the same
way). Editing a reviewer's pinned input to point at bytes the reviewer never
read would falsify review evidence. So this route costs four reviewed
admissions, and it was reverted.

**Making the manifest the authority** is the architecturally right answer and is
far too large to take unilaterally. Measured across the estate: 293 families have
a manifest entry, **86 agree with the census today, and 207 would gain at least
one component** — many of them currently COMPLETE_PACKET_PROVEN. Examples:
`ga-misd-j4-set` would gain seven, `ga-felony-j1-set` five,
`co_petition_seal_arrest-set` three. A family that starts declaring components
its delivered packet does not contain fails COMPONENT_SET. This is a
reclassification of most of the estate, not a repair.

## What is actually needed

A decision on which record is the authority for a packet set's components, and
then one coordinated change:

- if the MANIFEST is the authority, `generate.mjs:1976` reads it, and the 207
  divergent families are worked through deliberately — each either gains the
  component in its delivered packet or has its manifest entry corrected;
- if the CENSUS is the authority, the manifests are reconciled to it and the
  gap stops being invisible;
- either way the two records should be checked against each other by a verifier,
  because 207 silent disagreements is how `pa_pardon_expungement-set` lost a
  required component without anyone noticing.

Until then `pa_pardon_expungement-set` stays FAIL_REPAIR_REQUIRED on
COMPONENT_SET, with its other fourteen obligations passing and its nine counters
measured zero by VF01.

## What was NOT done

No census edit is in the tree. No generator change to the component derivation.
No manifest edited. No family reclassified. VF01's verdict stands as measured.
