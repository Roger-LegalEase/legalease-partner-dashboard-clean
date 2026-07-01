# Hawaii Administrative Expungement Application Packet (HCJDC 159(b))

Legal signoff 2026-07-01. Baseline commit `d42c015`. This is a **paid administrative application packet**,
**not a court petition**. Source: `private/Nationwide Record Clearing/LegalEase Hawaii/` (HCJDC 159(b),
rev. 06/03/2026; HRS § 831-3.2; §§ 706-622.5/.8/.9, 291E-64(e)).

## Product label & language

Use only: **"Hawaii administrative expungement application packet"**, "administrative application",
"HCJDC application packet", "self-help application packet", "application to the Hawaii Criminal Justice
Data Center". **Never** say court petition, court filing, court packet, or court-ready petition.

## What we sell (the $50)

The $50 is the **LegalEase / Expungement.ai self-help packet generation fee only**. It assembles the
HCJDC 159(b) application. It is **not** the agency fee. The HCJDC requires a **U.S.-issued money order
or cashier's check payable to "State of Hawaii"** — that agency cost, plus certified records, postage,
photo-ID copies, and any other government cost, is **separate and paid directly by the user to the
agency**, and is not included in the $50.

## Two tracks (one form, HCJDC 159(b))

| Track | Route id | Authority | Gate |
| --- | --- | --- | --- |
| Non-conviction arrest | `HI:nonconviction-arrest-expungement` | HRS § 831-3.2 | Arrest/charge with **no conviction** (arrest-no-charge / dismissed / acquitted). |
| First-time drug/property conviction | `HI:first-time-drug-conviction` | §§ 706-622.5/.8/.9 | Applicant **already holds a Court Order Granting Expungement** to attach (`hi_court_order_confirmed = Yes`). |
| DUI-under-21 conviction | `HI:dui-under-21-conviction` | § 291E-64(e) | Same court-order-attached gate. |

The **deferred-acceptance** routes (`HI:deferred-acceptance-one-year`,
`HI:deferred-prostitution-three-year`) are **held as `legal_action_required`**: the sellable user-filed
step (an HRS ch. 853 court deferred-acceptance discharge motion vs. the later HCJDC application) is
ambiguous in the source. See `LEGAL_ACTION_REQUIRED.md`.

## Engine enforcement (src/lib/rcap-engine/evaluator.ts)

- Payment path admits these via `routeIsAdministrativeApplicationPacket` (the ONLY non-court-petition
  routes permitted to pay), still gated by `routeIsRatifiedDeployable` + deterministic rule match +
  `isPacketPlanFulfillmentReady`. `isCourtFiledPetitionRoute` returns **false** for them (they are not
  court routes).
- `hiAdminApplicationSafetyGate`:
  - Non-conviction route requires a non-conviction outcome; a conviction fails closed
    (`hi_831_3_2_nonconviction_required_not_eligible`, no payment).
  - Conviction routes require `hi_court_order_confirmed`; **No** → `likely_not_eligible` (guidance, no
    payment, `hi_court_order_not_confirmed_not_eligible`); missing/unsure → `needs_review` /
    `needs_more_info` (no payment).
- Public intake question `hi_court_order_confirmed` is added in `public-profile-projection.ts` (a public
  collected fact, never an internal `source_question_*`).
- Timing is **event-based** (no numeric wait) via `specialRouteTiming`.

## Packet outputs

- completed HCJDC 159(b) application packet
- instruction sheet
- ID checklist (valid government-issued photo ID copy)
- **separate agency fee / money order / cashier's check checklist** ("State of Hawaii", personal checks
  not accepted)
- mailing instructions (Hawaii Criminal Justice Data Center, Attn: Expungement, 465 South King Street,
  Room 102, Honolulu, HI 96813; include a self-addressed stamped envelope)
- court-order attachment checklist (conviction track only)
- disclosure that court/agency fees are separate and not included in the $50 packet generation fee

## Verifier

`scripts/verify-rcap-hawaii-admin-application.mjs` (`npm run rcap:verify-hawaii-admin-application`)
proves: non-conviction qualifying → payment opens; conviction with confirmed court order → payment
opens; conviction without court order → no payment; unsure court order → no payment; result copy is an
administrative application (not a court petition); the $50 is a self-help packet generation fee (not a
court/agency fee). The routes are also covered by the 71/71 both-direction check in
`scripts/verify-rcap-no-generic-fallbacks.mjs`.
