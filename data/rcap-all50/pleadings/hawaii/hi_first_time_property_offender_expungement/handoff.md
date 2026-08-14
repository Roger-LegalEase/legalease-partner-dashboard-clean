# Handoff — hi_first_time_property_offender_expungement (Lane C2)

## Authority

HRS § 706-622.9 (pinned registry authority); Haw. R. Penal P. 47(a)/(d), 49(a)/(c), 54(a) carried in the registry rules text. Track is `missing_from_compiled_runtime`; the pinned registry entry is the operative source (the HI state pack holds generic build metadata only).

## Mechanism

Two stages, both settled by the source. Stage one: written motion in the participant's existing penal case, in the court that sentenced or convicted them, seeking an order expunging the record of conviction; Rule 47(a) fixes the motion vehicle; Rule 47(d) unsworn declaration replaces notarization; Rule 49 service on the prosecuting attorney with proof of service. Stage two: HCJDC 159(b) application to the Hawaii Criminal Justice Data Center with a copy of the signed order.

## Route decision

Stage-one motion rendered through the shared custom-pleading renderer (STATE OF HAWAII v. Defendant caption; proposed order and certificate of service included per the registry components; court name and case number as confirm brackets because venue follows the offence and identifiers are read from the participant's own record). Grant is mandatory-once-findings-made; the substance-abuse fallback is discretionary; copy never describes the relief as automatic.

## Blocked components

- **stage_two_hcjdc_application — BLOCKED (lane D/E dependency).** Registry component 3 is official form **HCJDC-159B** (Expungement Application, Hawaii Criminal Justice Data Center), outputStrategy `official_pdf_fill`; no officialSourceUrl recorded in the pin. Lane C2 does not draft official-form replicas. Participant instructions deliver the do-not-submit-until-order guidance and the order-reference manual-completion items; the stage-one motion, proposed order, declaration and certificate of service are independently valid and delivered.

## Open counsel flags

1. Clerk cost practice for a motion in an existing penal case is a recorded release-level open question (no fee is prescribed; the Judiciary publishes none).
2. Which subsection applies turns on the sentencing date, read by the participant from their own court record.
3. Self-help stops: any prior/subsequent felony anywhere; contested nonviolence finding under (4)(d); discretionary fallback in play; prosecutor opposition/contested hearing; immigration.
4. Registry: "Nothing here makes the Hawaii implementation ready" — build output for review only; runtime wiring frozen.
