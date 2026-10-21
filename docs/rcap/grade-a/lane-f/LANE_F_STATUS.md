# Lane F — status

**Branch:** `claude/grade-a-v5-lane-f` · **Base:** `61ee6cc359bc19d32c6c071194e62a553446ca08`
**Controlling branch:** `claude/legalease-sprint-captain-utucnw`

Lane F wires the commercial admission points. It created no commercial rule.
Everything below asks `admitCommercial` and nothing else decides.

## The ten points

Each is governed exactly once. `scripts/verify-rcap-lane-f-commercial-admission.mjs`
imports `COMMERCIAL_ADMISSION_POINTS` and fails unless that stays true, so this
table is a report and not the invariant.

| Point | Governed at | Placed before |
| --- | --- | --- |
| `consumer_checkout` | `payment-adapter.ts` `createConsumerPacketCheckout` | any Stripe Checkout Session is created |
| `sponsored_entitlement` | `rcap-slot-lifecycle.ts` `resolvePartnerPacketCapDecision` | the sponsorship reservation is honoured, and before the cap is read |
| `packet_credit_admission` | `rcap-slot-lifecycle.ts` `finalizeSponsoredPacketGeneration` | the RPC that consumes the credit |
| `generation_admission` | `packet-generation.ts` `assertPacketGenerationAllowed` | a render is enqueued — all four call sites inherit it |
| `provider_dispatch` | `consumer-render-request.ts` `requestConsumerPacketRenderInternal` | `enqueueVerifiedConsumerRender` — the shared internal function, so the webhook path is not a second door |
| `artifact_commercial_attachment` | `packet-generation.ts` `attachPacketToBriefcaseItem` | the artifact is marked deliverable |
| `briefcase_ready` | `packet-generation.ts` `getConsumerPacketStatus` | the participant is told to expect a download |
| `private_download` | `packet-generation.ts` `gradeAPacketDownload` | bytes are rendered or leave |
| `repeat_download` | `packet-generation.ts` `gradeAPacketDownload` | the second delivery |
| `launch_graph_commercial_status` | `commercial-admission.ts` `launchGraphCommercialStatus` | `operationallySellable` is written — pending captain patch request #1 |

## Every route is denied

`commerciallyEligible` is `0` and all eight registry records evaluate
`INCOMPLETE`, so every point refuses today. That is the specified fail-closed
position. No override, bypass or second rule was added, and the way a route
opens is a record that proves it.

## Design notes worth keeping

**The wiring module decides nothing.** `commercial-admission.ts` forwards to
`admitCommercial` and turns one denial into one typed refusal — an HTTP status
and a sentence. `contextDenials` name matter ids, owner ids and verification
state, so they stay on the server; a refusal body carries a denial code and one
sentence, and the acceptance verifier asserts that.

**The packet family is resolved independently.** `resolvePacketFamilyId` reads
the packet *specification*, never the fulfillment record. Taking it from the
record would make the record's own binding check agree with itself and quietly
retire a real check.

**`briefcase_ready` returns rather than throws.** Every other point refuses an
action someone asked for; this one only decides what is shown. A refused route
presents as saved-and-pending instead of erroring a Briefcase page.

**`provider_dispatch` is the one point admitted on a spent entitlement.** A
failed render must retry under the same idempotency key without consuming a
second credit, so a retry re-dispatches and never re-admits generation.

**Artifact validation moved before attachment.** The Grade-A artifact carries the
SHA-256 and page count of its rendered bytes; delivery re-renders and compares.
That is what makes a substituted object undeliverable, and it works only because
the renderer is deterministic — the document dates are bound to the verification
rather than the clock.

## Open items

- Captain patch requests 1–5 in `CAPTAIN_PATCH_REQUEST.md`. Request 5 is the one
  that matters most: `/api/rcap/packets/[jobId]/download` is not Grade-A gated,
  because `RenderJobRow` cannot yet supply a final-verification context.
- Wiring these call sites closes every commercial door today, including sponsored
  Mississippi finalization. Consistent with ADR-0004; whether it ships in this
  state is the captain's call.
