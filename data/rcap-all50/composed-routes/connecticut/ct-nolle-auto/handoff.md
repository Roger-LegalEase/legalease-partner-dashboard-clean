# Handoff — ct-nolle-auto (CT, lane C1, composed route)

Job `T-C-CT-complete-composed-route` · treatment `complete_composed_route` · registry pin `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5`

## Authority

| Citation | What it supplies |
| --- | --- |
| C.G.S. § 54-142a(c) | Erasure thirteen months after a nolle; police, court and state's attorney records. Also the pre-1 April 1972 provision. |
| C.G.S. § 54-142a(c)(2) | Charge continued at the prosecutor's request for thirteen months without prosecution or other disposition shall be nolled on the arrested person's motion. |
| C.G.S. § 54-142a(g)(2) | Legal effect of erasure. |
| C.G.S. § 54-142a(k) | No court fee in any court for a petition under § 54-142a. |

## Mechanism

Where a charge has been nolled, records shall be erased once thirteen months have elapsed since the nolle. Separately, where a charge was continued at the prosecutor's request and thirteen months have passed with no prosecution or other disposition, the charge shall be nolled on motion of the arrested person, and erasure then follows the nolle rules. The second is an affirmative motion the participant can make; it is the one part of this track that is not passive.

(Verbatim from `route.json` `mechanism`, itself the registry `mechanism` excerpt for this track.)

## Route decision

Alternative composed route, three units, **one deliverable**:

1. **Automatic erasure after a nolle** — participant instruction (`process-guidance.md`). No filing exists on this branch.
2. **§ 54-142a(c)(2) motion to nolle a continued charge** — `pleading_document`, blocked. Not declined: the registry records it as potentially a custom pleading and expressly *not* inherently guidance-only. It opens once caption, venue, service and clerk practice are approved.
3. **Pre-1 April 1972 petition** — `pleading_document`, blocked. This one appears in the registry only as a packet instruction, in no `units[]` entry and no packetSet component. It is carried as a synthesized unit so a real filing possibility is not silently dropped; everything about it beyond its existence is unstated, including which older courts the statute lists.

## Open counsel flags (12)

Two build blockers (the motion vehicle; the pre-1972 petition being wholly unspecified); branch selection belongs to the participant; service, notice and notarization unstated; the § 54-142a(k) fee bar and the caution not to carry it to § 54-142d; the thirteen-month clock is never computed; never assume auto-erasure happened; terminology; immigration stop; `legal_review_pending`; source-freshness gate.

## F-review pointers

- **F / coverage gap:** the pre-1 April 1972 provision is recorded as a single normalizer-inferred sentence (`normalizerInferred: true`, sourceHeading "TRACK CT-2 / Mechanism"). The statutory list of older courts is nowhere in the evidence. If this branch is real product surface, § 54-142a(c) needs to be read in full.
- **F / source gap:** the compiled CT profile does not mention § 54-142a(c)(2), a motion to nolle, or pre-1972 nolles anywhere. Its nolle content is a single clause inside a pathway summary — "nolled (erased 13 months after the nolle if not re-filed)". Both blocked units rest on the pinned registry alone.
- **F / source freshness:** § 54-142a and the Clean Slate portal both carry `sha256: null`.
- **F / routing:** the profile's Clean Slate rollout caution ("only resumed at scale in late 2025; never assume a record was auto-erased — verify") is the strongest reason this track's guidance component leads with *check whether it happened* rather than *it will happen*. Worth preserving through any copy rewrite.
- **F / adjacency:** a participant whose record was not erased after thirteen months belongs on `ct-missed-erasure`, whose own submission unit is blocked on DESPP's form and manner. The two blockers compound: this route's exit path leads to another route's blocked unit.

## Mandatory official-form handoffs

None. Neither blocked unit is waiting on an official form — no form exists for either. Both are waiting on legal-design resolution of the filing vehicle.

## Evidence

- `src/lib/rcap/state-packs/connecticut/all50-build-metadata.ts`, `src/lib/rcap/state-packs/connecticut/index.ts`
- `src/lib/rcap-engine/compiled/profiles/CT-connecticut.json` (sha256 `47a86bd5edec245949664a3302aecd1d077bafe11dad2876d866158c7437cdb7`)
- Pinned registry entry `tracks[trackId=ct-nolle-auto]`
