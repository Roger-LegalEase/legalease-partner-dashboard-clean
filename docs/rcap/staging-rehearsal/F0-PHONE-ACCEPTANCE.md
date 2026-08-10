# Roger's Physical-Phone Acceptance Checklist — prepared, not runnable yet

Stage 13 owner-acceptance package. Placeholders in angle brackets fill in only
after EXECUTE_STAGING Stages 1–8 are green. Automated mobile emulation is NOT
a substitute for this checklist and will never be represented as it.

## Package contents (to be completed at execution)

| Field | Value |
|---|---|
| Staging URL | `<staging-domain>` — supplied by the execution gate |
| Sanitized staging login | participant A1: `rcap-staging-a1@<staging-test-domain>` + credential delivered out-of-band (never in this repo) |
| Supported test journey | MS misdemeanor-conviction sponsored packet (partner: Staging Rehearsal Partner A) |
| Expected packet name | safe `.pdf` filename served by the download route (recorded from SF-E2E-01) |
| Expected page count | pinned from the SF-E2E-01 golden render |
| Expected visible participant values | petitioner "Test Participant", Hinds County, sanitized filing steps; NO real names, cases, or dates |
| Rollback contact | `<ROLLBACK_OWNER>` from the execution gate |

## The ten acceptance steps (five minutes, real phone)

1. Open `<staging-domain>` path on a real phone browser (not an emulator).
2. Authenticate as participant A1.
3. Complete the sanitized sponsored journey to the packet step.
4. Generate the packet.
5. Land in the Briefcase.
6. Tap Download.
7. Open the PDF and confirm it renders on the phone.
8. Confirm the expected visible content: "Test Participant", Hinds County,
   the filing-steps section, and the pinned page count.
9. Return to the Briefcase and download the same packet again.
10. Confirm with the operator that the second download consumed no additional
    packet credit (ledger row count unchanged; verified live during the call).

## Pass/fail form

| # | Step | Pass | Fail | Notes |
|---|---|---|---|---|
| 1 | Open staging path | ☐ | ☐ | |
| 2 | Authenticate | ☐ | ☐ | |
| 3 | Sponsored journey | ☐ | ☐ | |
| 4 | Generate packet | ☐ | ☐ | |
| 5 | Briefcase landing | ☐ | ☐ | |
| 6 | Download | ☐ | ☐ | |
| 7 | PDF opens | ☐ | ☐ | |
| 8 | Expected content | ☐ | ☐ | |
| 9 | Repeat download | ☐ | ☐ | |
| 10 | No duplicate consumption | ☐ | ☐ | |

Any Fail row stops acceptance; the rollback contact disables the staging
delivery lane per SF-RBK-01 and the failure enters the defect log.
