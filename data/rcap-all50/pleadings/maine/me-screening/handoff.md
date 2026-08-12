# Handoff — me-screening (Lane C2)

## Authority

10 M.R.S. §§ 1500-AA through 1500-EE (chapter 239), enacted by PL 2025, c. 513, § 1, effective 29 July 2026; FCRA (15 U.S.C. § 1681 et seq.) referenced as safe harbour only. Track is `missing_from_compiled_runtime`; the pinned registry entry is the operative source.

## Mechanism

Participant-signed dispute letter to a business screening service's published dispute address under § 1500-CC: investigation without charge, comparison against the State Bureau of Identification official record, mandatory correction of mismatches, and **prompt deletion where the record is sealed or pardoned**. Thirty-day results notice (§ 1500-CC(4)). No court, no filing, no service of process.

## Route decision — correspondence form (lane-wide precedent)

The pinned registry directs that this artifact "is correspondence to a private company, not a court pleading, and the packet must describe it that way," while also rejecting guidance-only treatment. The frozen custom-pleading renderer emits only court-pleading sections (caption, jurisdiction/venue, WHEREFORE relief, proposed order), so rendering this track through it would misdescribe the document against the registry's explicit instruction. Resolution: the lane C2 harness composes correspondence-form documents deterministically from config data (`documentForm: "correspondence"`), with the same QA gates (runPleadingQa, placeholder scan, protected-field scan) and pdf-lib output. Applied to me-screening, ga-jail-k2, nc_auto_146_a4_agency_followup, tn_illegal_voting, tn_post_pardon, tn_recovery_court.

## Deliberate omissions (per registry)

- **No § 1500-EE(3) damages demand** ($1,000/actual damages/costs/fees): the registry directs the packet neither pleads, demands, threatens nor calculates it. Not present anywhere in the packet.
- No caption, no verification/notarization, no certificate of service, no proposed order — each recorded absent-with-reason in the component inventory.
- Vendor dispute address is participant-obtained; left as an obtain-instruction bracket when unknown, never guessed.

## Blocked components

None. (The sealing order / pardon / SBI record are participant-obtained enclosures, not generated components.)

## Open counsel flags

1. Post-relief-step positioning: offer only attached to sealing/pardon tracks, not standalone.
2. Effective date 29 July 2026 — confirm posture at send time.
3. § 1500-AA "business screening service" definition edge cases are participant questions that may need attorney review.
4. Handoff triggers: vendor non-response >30 days, disputed frivolousness determination, damages interest, parallel FCRA claim, accuracy-only disputes on never-sealed records.
