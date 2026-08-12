# Handoff — IA `ia-9079` (composed route)

Job: `T-C-IA-complete-composed-route` · Treatment: `complete_composed_route`
Jurisdiction: Iowa (IA) · Registry pin: `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5`
Registry entry: `tracks[126]`
Profile: `src/lib/rcap-engine/compiled/profiles/IA-iowa.json`
(sha256 `1af0ae279f51dffbd7e620bf0fecdd38cdb98633343f82a8b4970f6e5a7042bc`,
profileVersion `2026-06-19-source-conversion-1`)
State pack: `src/lib/rcap/state-packs/iowa/all50-build-metadata.ts`

Track: *Expungement of a Deferred Judgment Record on Discharge from Probation*
("Clearing a deferred judgment after probation").

## Authority

Primary: **Iowa Code § 907.9(4)** — on discharge from probation where judgment was
deferred under **§ 907.3**, the court's criminal record with reference to the
deferred judgment is expunged, together with dismissed counts in the same charging
instrument and other related dismissed charges from the same transaction or
occurrence or a common scheme or plan. **§ 907.4(2)** is recorded as the provision
under which the deferred judgment itself stays on the state court administrator's
deferred judgment docket. **§ 22.7** supplies the required framing of what the
relief does: the record becomes confidential and exempt from public access, not
accessible except by court order.

**§ 901C.3** is *not* authority here — it is the downstream route for a revoked
deferred judgment (which becomes a conviction) and the section the deferred
judgment docket feeds through the two-deferred-judgment limitation.

Effective from 2012-07-01. Reviewed as of 2026-07-30. Statewide; no geography keys.

## Mechanism

The record is not expunged until the restitution, civil penalties, court costs,
fees and other financial obligations **in the case containing the deferred
judgment** are paid. That precondition is the operative fact of the whole route.

This mechanism **sits outside Iowa R. Crim. P. 2.80 through 2.86 and has no Rule
2.86 form**. The five Rule 2.86 forms in the IA state pack inventory (§ 901C.2,
§ 901C.3, § 123.46, § 123.47, § 725.1) are all for other routes.

Venue: Iowa District Court for the county of the case. No court name, clerk
address, or department is sourced and none is printed.

## Route decision

Composed, **alternative** composition, two units — mutually exclusive branches
selected by one screening answer (`dischargeBeforeJuly2013`). Exactly one applies
to any participant. See `route.json`.

| Unit | Legal unit | Required output | Component | State |
| --- | --- | --- | --- | --- |
| `ia-9079-post-2013-verification` | Verify the automatic expungement happened; diagnose it if it did not | `participant_instruction` | `ia-9079-process-guidance-1` | **Built** — `process-guidance.md` + 4 fixtures |
| `ia-9079-pre-2013-application` | Application for a discharge predating July 1, 2013 | `pleading_document` | `ia-9079-pre-2013-application-2` | **Blocked** — `dependency.json` only |

**No pleading document is drafted for this track, deliberately, on either branch.**

- On the post-2013 branch there is *no filing at all*. The registry states: "For a
  post-July-2013 discharge there is no participant filing; the expungement is
  expected to occur on discharge." Drafting a pleading would invent a proceeding.
- On the pre-2013 branch an application is required but the vehicle is legally
  unresolved — no form, no rule, thin statutory mechanics. The registry's own
  words: "A custom pleading would be speculative." That unit stays
  `available: false` until counsel identifies the vehicle.

Unit 2's `requiredOutput` is `pleading_document`, **not** `official_form_dependency`.
That distinction matters for lane routing: there is no official form to acquire,
so this is a lane-**E** legal-design gap, not a lane-D form-acquisition gap. **This
track produces no mandatory official-form handoff.**

`units[]` is a one-to-one image of `registry tracks[126].units[0..1]`. Nothing was
added and nothing dropped; `omissionProof` in `route.json` records why the seven
`packetSet.participantActionRequired` entries are participant acts against unit 1
rather than separate units, and why no `agency_request_letter` unit was created
for the clerk balance inquiry (the source describes contacting the clerk, and
records no written request document).

## Filing separation

**Court documents — none.** No petition, no application, no proposed order, no
certificate of service, no verification. `filingSeparation.courtDocuments` is
empty by design.

**No proposed order, twice over.** Registry `packetInstructions[1]`: "Do not add a
proposed order to any Iowa Rule 2.86 packet. No proposed order is filed." This
track is outside Rules 2.80–2.86 entirely and has no filing on the available
branch, so a fortiori none here.

**No service.** "No service on the diagnostic branch. There is no petition to
serve."

**No signature.** "No participant signature on the diagnostic branch."

**No cover sheet.** Nothing to cover.

**Participant-only** — `components/ia-9079-process-guidance-1/process-guidance.md`
and `participant-instructions.md`. Neither is filed.

## Vocabulary — hard constraint

Registry `packetInstructions[0]`: **never** say erased, destroyed, or removed from
your record. Say the court record becomes **confidential** and comes off public
access under **Iowa Code § 22.7**. State plainly that **Iowa has no felony
expungement**. The compiled profile independently sets
`terminology.avoidUniversalExpungementLabel = true` and `copyGuardrails[0]`
forbids relabelling every remedy as expungement.

Both participant documents carry one *negated* use of "felony expungement" (the
required "Iowa has no felony expungement" line) and one negated use of the erasure
triple ("It is not erased, it is not destroyed…"). A bare term scan will hit them.
`route.json → trackIdentity.reliefVocabulary.negatedUseSites` lists them; confirm
each hit is negated before treating it as a vocabulary failure.
`fixtures/negative.json` is the intended failing case for that sweep — it uses the
erasure vocabulary affirmatively and drops the § 22.7 framing.

## Screening priority

Registry `packetInstructions[2]`: screen for a deferred judgment **before** the
§ 901C.2 and § 901C.3 routes. It is free, needs no form, and often only needs a
balance paid. This is a routing instruction for the engine, not a document.

## Open counsel flags

11 flags, all in `route.json → counselFlags`. The load-bearing ones:

- **cf-01 (release blocker)** — whether a post-July-1-2013 discharge is genuinely
  self-executing is unresolved. The statute contains **no self-executing date**;
  the July 1, 2013 line is practice guidance from Iowa Legal Aid. The entire
  premise of unit 1 rests on it. Nothing in any output asserts that a record was
  in fact expunged.
- **cf-02 (build blocker)** — the pre-July-1-2013 vehicle. No form, no rule. This
  is what blocks unit 2 and it cannot be closed by acquiring a form.
- **cf-03 (source gate)** — none of the four official sources carries a SHA-256;
  staleness of the § 907.9 / § 907.4 / § 907.3 text is undetectable.
- **cf-04 / cf-05** — fee posture is stated only for the diagnostic branch; court
  and clerk name and address are **null**. Both are carried as explicit "look it
  up / ask the clerk" lines rather than filled. This mirrors the ND config's
  treatment of its missing verification statute: null plus a flag, never a guess.
- **cf-06** — no notice mechanism (Iowa does not notify anyone), and
  `postGenerationHandoffs` is **empty**, so there is no recorded escalation path
  when the clerk declines to act.
- **cf-09** — the deferred judgment docket carve-out must be stated; describing
  the outcome as a clean slate would be wrong.
- **cf-10** — revoked deferred judgment is out of scope and routes to § 901C.3,
  but no handoff is recorded.
- **cf-11** — the scope of "financial obligations in the case containing the
  deferred judgment" is unstated, and disputes about what is owed and in which
  case are a self-help boundary.

## F-review pointers

`implementationQueue: D_composed_or_process_guidance`.
`legalDesignStatus: legal_design_approved_with_limitations`.
`legalStatus: legal_review_pending`. `counselConfirmationRequired: false`.
`runtimeDisabledReason`: "Imported from a legal-design memo. Output review, visual
review and technical proof are all outstanding."

Open blocker kinds on the registry entry: `output_review_gate`,
`visual_review_gate`, `technical_proof_gate`, `legal_design_blocker`,
`release_blocker`, `source_gate`.

Take these in order:

1. **cf-01 first.** It is the release blocker and it gates the whole track. If the
   post-2013 branch is *not* self-executing, unit 1 stops being a diagnostic and
   becomes a filing route — which would change the required output, and would
   collide with cf-02 because the vehicle is exactly what is unresolved.
2. **cf-03 alongside it.** Read § 907.9(4), § 907.4(2) and § 907.3 from an
   official source, record SHA-256s, and confirm currency against the
   August 30, 2024 Chapter 2 amendment order already in the source list.
3. **cf-02 (lane E).** Identify the pre-2013 vehicle: document, authorising rule
   or statute, caption, court, allegations, verification, service, filing
   location. Only then does any drafting lane act on unit 2. Until then unit 2
   stays `available: false` and `dependency.json` is the whole component.
4. **cf-11, cf-06, cf-10 (handoff gaps).** Scope of the payment precondition;
   escalation when the clerk declines; handoff from a revoked deferred judgment to
   the § 901C.3 route. `postGenerationHandoffs` is empty for all three.
5. **Output review (cf-07, cf-08, cf-09).** Vocabulary sweep against the Iowa copy
   rule, confirmation that no proposed order / certificate of service /
   verification block has crept in, and the deferred judgment docket wording.
   `fixtures/negative.json` is the intended failing case.

Nothing here is approved for live use.
