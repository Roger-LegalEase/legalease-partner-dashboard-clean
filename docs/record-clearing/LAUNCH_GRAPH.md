# The canonical launch graph

One row per intended-paid pathway, carrying the whole chain: compiled pathway → registry track →
packet family and packet set → owner-approved legal status → packet specification → source assets →
technical status → PDF status → renderer → public witness → payment result → artifact result →
DTC result → RCAP result.

**One denominator.** All 262 rows come from the `paid_packet_intended` set in
`data/rcap-ledger/sellable-pathway-closure.json`. Every consumed ledger is required to describe
exactly that set; one that adds or drops a pathway fails this generator rather than being
reconciled quietly, so there is nothing here for a second denominator to disagree with.

## Counters

| | |
|---|---:|
| INTENDED PAID | 262 |
| CORRECT-PATHWAY PUBLIC WITNESSES | 262 |
| WRONG-PATHWAY WITNESSES | 0 |
| NON-CONVERGING WITNESSES | 0 |
| EXACT TRACK + PACKET SET | 222 |
| REGISTRY GAP + PATHWAY PACKET SET | 40 |
| OWNER-APPROVED LEGAL | 95 |
| FACTORY_V2 RESOLVED | 166 |
| PAYMENT ALLOWED | 28 |
| DETERMINISTICALLY RENDERED (complete packet) | 42 |
| — composed text proven deterministic | 166 |
| — official forms named but not held here | 124 |
| OPERATIONALLY SELLABLE | 0 |

Operationally sellable means all nine of: correct public witness; authoritative intended pathway;
paymentAllowed=true; complete packet specification; owner-approved existing legal design; current
technical approval; renderer selected; deterministic artifact proven; no problematic-PDF hold.

## Availability

The resolver's derived availability word, per route, aggregated here. Reporting, not rollout:
the two ready states are reachable only through a current Grade-A fulfillment record at the
admission schema version, and flipping the consumer path live remains a single nationwide
owner-authorized action through the consumer-delivery control under the all-51 launch rule.

| Availability | Routes |
|---|---:|
| `PACKET_READY` | 0 |
| `CUSTOM_PLEADING_READY` | 0 |
| `GUIDANCE_READY` | 0 |
| `HANDOFF_READY` | 5 |
| `MAINTENANCE_HOLD` | 21 |
| `LEGAL_HOLD` | 8 |
| `UNFINISHED` | 228 |

Per-state counts are carried in `availability.byState` of the JSON ledger.

## What is missing, and on how many routes

| Unmet gate | Routes |
|---|---:|
| `paymentAllowed` | 234 |
| `deterministicArtifactProven` | 220 |
| `technicalApprovalCurrent` | 192 |
| `ownerApprovedLegalDesign` | 167 |
| `rendererSelected` | 70 |
| `packetSpecificationComplete` | 40 |
| `noProblematicPdfHold` | 19 |

## The registry-gap routes

40 intended-paid pathways have no registry track. None is dropped. Where the compiled profile
carries a pathway-level packet record, it is used as the packet set: **40** of them do.
The missing registry track is a registry-ownership action recorded against the route, not a reason
to make the pathway unavailable — and it is never a licence to invent a track-to-family relationship.

## The artifact probe

Each admitted route's packet text is composed twice through the shared deterministic
composed-pleading renderer, from its packet specification and its committed witness answers, and the
two renders must hash identically. Official-form *filling* is not exercised here: those source PDFs
live under `private/Nationwide Record Clearing/`, which this worktree does not carry, so a route
whose named official forms are not held is recorded as such and is not counted as rendered.

Regenerate with `npm run rcap:generate-launch-graph`; `--check` proves it is current.
