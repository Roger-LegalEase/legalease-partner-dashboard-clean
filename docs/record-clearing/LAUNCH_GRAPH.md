# The canonical launch graph

One row per intended-paid pathway, carrying the whole chain: compiled pathway → registry track →
packet family and packet set → owner-approved legal status → packet specification → source assets →
technical status → PDF status → renderer → public witness → payment result → artifact result →
DTC result → RCAP result.

**One denominator.** All 271 rows come from the `paid_packet_intended` set in
`data/rcap-ledger/sellable-pathway-closure.json`. Every consumed ledger is required to describe
exactly that set; one that adds or drops a pathway fails this generator rather than being
reconciled quietly, so there is nothing here for a second denominator to disagree with.

## Counters

| | |
|---|---:|
| INTENDED PAID | 271 |
| CORRECT-PATHWAY PUBLIC WITNESSES | 271 |
| WRONG-PATHWAY WITNESSES | 0 |
| NON-CONVERGING WITNESSES | 0 |
| EXACT TRACK + PACKET SET | 224 |
| REGISTRY GAP + PATHWAY PACKET SET | 47 |
| OWNER-APPROVED LEGAL | 97 |
| FACTORY_V2 RESOLVED | 172 |
| PAYMENT ALLOWED | 31 |
| DETERMINISTICALLY RENDERED (complete packet) | 41 |
| — composed text proven deterministic | 172 |
| — official forms named but not held here | 131 |
| OPERATIONALLY SELLABLE | 0 |

Operationally sellable means all nine of: correct public witness; authoritative intended pathway;
paymentAllowed=true; complete packet specification; owner-approved existing legal design; current
technical approval; renderer selected; deterministic artifact proven; no problematic-PDF hold.

## What is missing, and on how many routes

| Unmet gate | Routes |
|---|---:|
| `paymentAllowed` | 240 |
| `deterministicArtifactProven` | 230 |
| `technicalApprovalCurrent` | 199 |
| `ownerApprovedLegalDesign` | 174 |
| `rendererSelected` | 68 |
| `packetSpecificationComplete` | 47 |
| `noProblematicPdfHold` | 19 |

## The registry-gap routes

47 intended-paid pathways have no registry track. None is dropped. Where the compiled profile
carries a pathway-level packet record, it is used as the packet set: **47** of them do.
The missing registry track is a registry-ownership action recorded against the route, not a reason
to make the pathway unavailable — and it is never a licence to invent a track-to-family relationship.

## The artifact probe

Each admitted route's packet text is composed twice through the shared deterministic
composed-pleading renderer, from its packet specification and its committed witness answers, and the
two renders must hash identically. Official-form *filling* is not exercised here: those source PDFs
live under `private/Nationwide Record Clearing/`, which this worktree does not carry, so a route
whose named official forms are not held is recorded as such and is not counted as rendered.

Regenerate with `npm run rcap:generate-launch-graph`; `--check` proves it is current.
