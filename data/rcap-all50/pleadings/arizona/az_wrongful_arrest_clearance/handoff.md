# Handoff — az_wrongful_arrest_clearance (Lane C2)

## Authority

A.R.S. § 13-4051 (pinned registry authority list). No compiled-runtime pathway exists for this track (`missing_from_compiled_runtime` in the terminalization ledger); the pinned registry entry is the operative source.

## Mechanism

Participant-initiated petition in superior court for an order entering a notation of clearance on all court, police and agency records after a wrongful arrest, indictment or charge, plus an order restricting release of copies except on court order. A hearing is contemplated; the judge issues the order if the judge believes justice will be served.

## Route decision

Custom pleading rendered through the shared custom-pleading renderer (movant-first caption, notation-of-clearance relief vocabulary; sealing/expungement vocabulary QA-blocked). Registry packet set defines a single required primary-filing component:

- **Proposed order: absent.** No proposed-order component is recorded in the source; the judge issues the order after the contemplated hearing.
- **Certificate of service: absent.** The source review records no service requirement; clerk confirmation flagged instead of drafting an unsourced certificate.
- Fees, fee waiver, and notarization are each recorded as "not stated" in the source review; carried as confirm-with-clerk items, not asserted values.

## Blocked components

None. No mandatory official form exists for this track (registry: "No statewide form is required for LegalEase to generate a controlled pleading").

## Open counsel flags

1. **Product-scope decision (registry `counsel_classification_required` on output_strategy):** whether LegalEase enables the § 13-4051 petition as a self-help track or restricts it out of product scope. Build proceeds; launch is gated on this decision.
2. Verification/notarization form not stated in the source; declaration form used, statute citation left null.
3. County venue rule not stated (statute names "superior court" only); clerk confirmation flagged.
4. Caption format and party designations not prescribed by the source; movant-first alignment used and flagged.
5. Self-help stop conditions: contested hearing, denial challenge, immigration consequences.
