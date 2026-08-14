# Handoff — hi_marijuana_three_grams_expungement (Lane C2)

## Authority

HRS § 706-622.5(5) (pinned registry authority); Haw. R. Penal P. 47(a)/(d), 49(a)/(c), 54(a) carried in the registry rules text. Track is `missing_from_compiled_runtime`; the pinned registry entry is the operative source (the HI state pack holds generic build metadata only).

## Mechanism

Two stages, both settled by the source. Stage one: written motion in the participant's existing penal case seeking an expungement order — mandatory ("the court shall grant an expungement order") with quantity (three grams or less) as the only proviso. Stage two: HCJDC 159(b) application to the Hawaii Criminal Justice Data Center with a copy of the signed order.

## Route decision

Stage-one motion rendered through the shared custom-pleading renderer (STATE OF HAWAII v. Defendant caption; proposed order and certificate of service included per the registry components; court name and case number as confirm brackets because venue follows the offence and identifiers are read from the participant's own record).

## Blocked components

- **stage_two_hcjdc_application — BLOCKED (lane D/E dependency).** Registry component 3 is official form **HCJDC-159B** (Expungement Application, Hawaii Criminal Justice Data Center), outputStrategy `official_pdf_fill`; no officialSourceUrl recorded in the pin. Lane C2 does not draft official-form replicas. Participant instructions deliver the registry's do-not-submit-until-order packet instruction and the order-reference manual-completion items; the stage-one motion, proposed order, declaration and certificate of service are independently valid and delivered.

## Open counsel flags

1. Clerk cost practice for a motion in an existing penal case is a recorded release-level open question.
2. Self-help stops: quantity dispute; any other charge from the same facts and circumstances (defeats the route); prior HRS 706-622.5 / 706-622.8 expungement; prosecutor opposition/contested hearing; immigration.
3. Registry: "Nothing here makes the Hawaii implementation ready" — build output for review only; runtime wiring frozen.
