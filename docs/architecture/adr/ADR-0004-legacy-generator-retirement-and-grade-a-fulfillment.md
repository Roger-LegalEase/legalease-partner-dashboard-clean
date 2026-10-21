# ADR-0004 — Legacy generators are assets, not commercial authority

**Status:** Accepted.
**Date:** 2026-08-28
**Authority:** Roger Roman, explicit owner instruction. Recorded verbatim in
`data/record-clearing/legal-decisions/2026-08-28-legacy-generator-retirement.json`.
**Supersedes, in part:** AGENTS.md "Legacy Generators Preserved".

## What was decided

The legacy packet generators for Illinois, the District of Columbia,
Pennsylvania, Mississippi and Texas-Harris are not approved commercial
fulfillment paths. Their direct-consumer price is not restored, no
state-specific exception may be created, and no reading of the preservation rule
in AGENTS.md preserves their commercial authority.

They remain as historical evidence, implementation references, sources of
reusable legal, form, map, fixture and copy assets, and comparison evidence
during migration. They authorize nothing.

## Why the previous reading could not survive

The preservation rule said "do not break them", and that was read as covering
the price. What the price actually bought was measured rather than assumed.

`buildConsumerPacketArtifact` was the only builder the direct-consumer paid path
called, and it took no branch on jurisdiction, pathway, packet family or plan
mode. Every paid packet in every state was `provider: rcap_source_engine`,
`contentType: text/plain`, filename ending `-packet.txt`, containing the route's
own metadata and the packet plan's readiness conditions under a heading reading
FILING CHECKLIST. Fifty-four routes could take money or a sponsored credit;
twenty-six had checkout open; none delivered a filing.

The legacy petition generators are a different path. They render from a stored
`RcapDocumentPacket` at `/documents/[partnerSlug]/[packetId]`, and the paid
consumer flow never reached them. So the price was never the legacy generator's
price. Preserving it preserved a charge for a summary.

Two further facts settled it. Mississippi's legacy petition — the most complete
of the five — carries `MississippiProposedOrderPlaceholder`, a placeholder where
a proposed order belongs. And its document types cover three Mississippi
pathways, so a route outside those three had no document at all while still
being classified sellable by jurisdiction.

## The distinction this ADR draws

**Preservation means assets and history. It does not mean runtime or commercial
authority.**

Those are different claims and were being made with one sentence:

| Preserved | Not preserved |
|---|---|
| State packs, official sources, field maps, packet text, filing instructions, fixtures, copy | Checkout, sponsored entitlement, packet-credit consumption, render jobs, participant delivery |
| Already-generated artifacts, through protected owner-authorized access | Commercially deliverable status |
| The document components, as implementation references and migration comparisons | Any inference of sellability from jurisdiction membership |

Nothing is deleted because its runtime is retired. A legacy module is removed
only after every reusable asset is catalogued, every supported route is migrated
or explicitly retired, no active call site remains, and no saved artifact
depends on it for historical access.

## Grade-A fulfillment

Commercial authority comes from one server-authoritative fulfillment record
keyed to an exact route and packet family, and from nothing else. Six surfaces
consult it — checkout creation, consumer payment authority, sponsored
entitlement, packet generation, packet-credit consumption, participant delivery —
and the absence of a record is a refusal rather than a gap.

Five things that look like evidence and are not, each refused by name in the
code:

| Looks like evidence | What it actually says |
|---|---|
| Evaluator result code | The participant is eligible. Not that a packet exists. |
| Packet plan | Which facts a packet would need. Not that anything renders one. |
| Packet family name | A legal statement about what the route produces. Not that it was built. |
| Legacy-jurisdiction status | That a STATE can render. Nothing about one route inside it. |
| `paymentAllowed` from a profile | A stored opinion, where a present fact is required. |

`text/plain` is not an approved personalized packet format, and adding it would
make the defect indistinguishable from a fix.

## Consequences

Commercial availability is now route-specific and packet-family-specific. A
state is never reopened because one of its routes passes, and the commercial
denominator is derived from fulfillment evidence rather than from state
coverage.

This is the fourth headline in this workstream to have been mislabelled — after
`legal_review_pending` at 221, `renderer_unavailable` at 68, and the 40 no-track
rows — and it is the first where the mislabelling was in a rule rather than a
generator. The rule said "preserved" and the thing being preserved had not been
looked at. The pattern generalises past blocker names: **a protective rule is
also a hypothesis, and the thing it protects has to be opened before the
protection can be trusted.**
