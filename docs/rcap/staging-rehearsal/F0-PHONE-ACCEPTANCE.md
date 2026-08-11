# Roger's Physical-Phone Acceptance Checklist — prepared, not runnable yet

Stage 13 owner-acceptance package, covering BOTH delivery journeys. Fill the
angle-bracket placeholders only after EXECUTE_STAGING Stages 1–8 are green.
Automated mobile emulation is NOT a substitute and will never be represented
as Roger's physical-phone acceptance.

## Package contents (completed at execution)

| Field | Value |
|---|---|
| Staging URL | `<staging-domain>` from the execution gate |
| Sponsored login | participant A1: `rcap-staging-a1@<staging-test-domain>`, credential out-of-band |
| Consumer login | consumer C1: `rcap-staging-c1@<staging-test-domain>`, credential out-of-band |
| Test journeys | (A) MS misdemeanor-conviction sponsored packet under Staging Rehearsal Partner A; (B) MS misdemeanor-conviction paid consumer packet, $50 test payment already captured on MTR-C1-4 |
| Expected packet name | safe `.pdf` filename recorded from SF-E2E-01 / SF-PAY-04 |
| Expected page count | pinned from the golden renders |
| Expected visible values | petitioner "Test Participant" (A) / "Test ConsumerOne" (B), Hinds County, sanitized filing steps; NO real names, cases, or dates |
| Rollback contact | `<ROLLBACK_OWNER>` from the execution gate |

## Journey A — sponsored packet (ten steps, ~5 minutes)

1. Open `<staging-domain>` on a real phone browser.
2. Authenticate as participant A1.
3. Complete the sanitized sponsored journey to the packet step.
4. Generate the packet.
5. Land in the Briefcase.
6. Tap Download.
7. Open the PDF on the phone.
8. Confirm expected content: "Test Participant", Hinds County, filing steps, pinned page count.
9. Return and download again.
10. Confirm with the operator: no additional partner credit consumed (ledger unchanged, live check).

## Journey B — paid consumer packet (ten steps, ~5 minutes)

1. Still on the phone, sign out of A1 and authenticate as consumer C1.
2. Open the consumer journey for the prepared paid matter (MTR-C1-4, $50 payment already captured).
3. Confirm the journey shows paid status — no second payment prompt.
4. Generate / open the packet.
5. Land in the Briefcase.
6. Tap Download.
7. Open the PDF on the phone.
8. Confirm expected content: "Test ConsumerOne", Hinds County, filing steps, pinned page count.
9. Return and download again.
10. Confirm with the operator: no second payment charged AND no partner credit consumed (ledger and payment rows unchanged, live check).

## Pass/fail form

| # | Step | A: Pass | A: Fail | B: Pass | B: Fail | Notes |
|---|---|---|---|---|---|---|
| 1 | Open / authenticate | ☐ | ☐ | ☐ | ☐ | |
| 2 | Journey entry | ☐ | ☐ | ☐ | ☐ | |
| 3 | Journey completes / paid status | ☐ | ☐ | ☐ | ☐ | |
| 4 | Generate packet | ☐ | ☐ | ☐ | ☐ | |
| 5 | Briefcase landing | ☐ | ☐ | ☐ | ☐ | |
| 6 | Download | ☐ | ☐ | ☐ | ☐ | |
| 7 | PDF opens | ☐ | ☐ | ☐ | ☐ | |
| 8 | Expected content | ☐ | ☐ | ☐ | ☐ | |
| 9 | Repeat download | ☐ | ☐ | ☐ | ☐ | |
| 10 | No duplicate consumption / charge | ☐ | ☐ | ☐ | ☐ | |

Any Fail stops acceptance; the rollback contact disables the staging delivery
lane per SF-RBK-01 and the failure enters the defect log.
