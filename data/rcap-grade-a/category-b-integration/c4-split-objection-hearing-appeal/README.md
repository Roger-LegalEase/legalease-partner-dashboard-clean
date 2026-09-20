# C4 objection, hearing, and appeal branch integration

This directory records the branch split for one Connecticut Clean Slate route. It retains the automatic Category B stage and crosswalks the participant-filed Category A branch to the existing JD-CR-202 route. It creates no route or packet family, proves no packet, approves no output, and opens no commercial path.

## Branch behavior

| Branch | What the participant files | Where it goes | Trigger | Deadline or timing |
| --- | --- | --- | --- | --- |
| Retained B stage | Nothing. The state performs eligible post-2000 Clean Slate erasure automatically. | State Clean Slate data process. | An eligible conviction entered on or after January 1, 2000 reaches the applicable automatic waiting point. | No participant filing deadline. The period is seven years for a qualifying misdemeanor or ten years for a qualifying Class D, Class E, or eligible unclassified felony, measured from the person's most recent conviction for any crime; the entire sentence, including all supervision, must also be complete. |
| Participant A branch | For a missed automatic erasure, an application to DESPP for review supported by an SPBI criminal-history record check; for the older cohort, JD-CR-202, Petition for Clean Slate Erasure. | DESPP/State Police handles missed-erasure review; JD-CR-202 goes to the Superior Court G.A. location where the participant was sentenced. | An eligible post-2000 conviction remains unerased after it should have been erased, or an otherwise eligible conviction predates January 1, 2000. | No fixed calendar deadline is stated in the committed record. Missed-erasure review is available after the record should have been erased, with hearing and decision timing under Conn. Gen. Stat. § 54-142t. For JD-CR-202, the period is seven years for a qualifying misdemeanor or ten years for a qualifying felony, measured from the person's most recent conviction for any crime; the entire sentence, including all supervision, must also be complete. |

The two destinations are steps or alternatives within the same reused participant remedy. The committed Connecticut profile identifies JD-CR-202 as the official form for the older cohort and as the basis for review when automatic erasure was missed; the SPBI report supplies the record evidence for the hearing request.

This branch delivers the reused JD-CR-202 filing plus DESPP review and hearing-request guidance. It stops before a contested agency hearing or judicial review, which requires professional handoff under the committed self-help boundary.

## Identity separation

| Dimension | Retained B stage | Participant A branch |
| --- | --- | --- |
| Selector | `eligible_post_2000_conviction_expected_to_erase_automatically` | `missed_automatic_erasure_review_or_pre_2000_clean_slate_petition` |
| Output strategy | `non_filing_guidance` | `official_pdf_fill` |
| Product outcome | `guidance_only` | `packet_ready_with_caution` |
| Commercial treatment | `permanently_excluded_automatic_stage` | `closed_pending_exact_grade_a_fulfillment` |

The B stage is never participant-fileable or sellable. The A branch is participant-fileable and carries a legacy runtime payment-capability flag, but that flag is not current commercial authority: checkout remains closed until an exact Grade-A fulfillment record authorizes the exact route and packet family.

## Reuse binding

The participant branch reuses:

`obligation:track-pathway:CT:ct-cleanslate-petition:petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202`

The binding is confirmed by four committed facts:

1. The integration delta matches the C4 route to that existing Category A route on CR-202 and records `ct-cleanslate-petition-set`.
2. The route-obligation census identifies the existing route as participant-initiated, `official_pdf_fill`, and dependent on `official-form:JD-CR-202`.
3. The reuse index marks `ct-cleanslate-petition-set` as `REUSE_AS_IS`, present in the captain tree, and not free to rebuild.
4. The compiled Connecticut profile connects JD-CR-202 and the SPBI-supported hearing process to both pre-2000 petitions and missed automatic erasures.

Accordingly, this lane records a crosswalk and does not create a duplicate Category A route.

## Packet-family and authority boundary

Packet family named, not created: `rcap-ct-official-pdf-fill`.

- Commercial routes opened: **0**
- Production touched: **NO**
- Packet proven: **NO**
- Output approved: **NO**

## Evidence records

- `data/rcap-grade-a/launch-control/CATEGORY_B_REVALIDATION_INTEGRATION_DELTA.json`
- `data/rcap-grade-a/launch-control/CATEGORY_B_STAGE_BRANCH_CROSSWALK.json`
- `data/rcap-grade-a/launch-control/category-b-revalidation/report.md`
- `data/rcap-grade-a/launch-control/EXISTING_WORK_REUSE_INDEX.json`
- `data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json`
- `src/lib/rcap-engine/compiled/profiles/CT-connecticut.json`
