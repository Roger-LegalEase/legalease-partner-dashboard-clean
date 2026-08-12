# Handoff — IL exp-ad-case-list

- Form: EXP-AD Case List (Request to Expunge and/or Seal Criminal Records — Case List)
- Component role: supporting (case list attachment to EXP-AD Request principal petition)
- Tracks served: il-exp-pardon, il-exp-precompletion, il-seal-edu, il-seal-nonconv
- Source binary: LegalEase Illinois/EXP-AD Case List Request to Expunge Seal Records.pdf (sha256: b72d30d274b061e0671933b8bd65abf7d2c37a6f1dd4ebfbf3968bc55b9bed0c)
- Census: 78 fields (basis: committed shadow-batch sample AcroForm structure).
- Populated (participant + deterministic): 4. Never-populated/manual: 74.
- Fixtures: canonical / boundary / negative committed under fixtures/.

## What F must visually approve
- Field-name-to-label fidelity of every binding against the true source binary.
- The manual_participant and unused calls (esp. unlabeled "undefined*"/"Check Box*" fields).
- Dropdown option matching for county fields; checkbox valueMaps.
- That no protected/court/prosecutor/signature/notary field receives content.

## Blocked and exact unblock
- Final render + contact sheet are blocked in this clone: private/Nationwide Record Clearing/ holds 0 tracked files.
- Exact unblock: The operator must supply private/Nationwide Record Clearing/LegalEase Illinois/EXP-AD Case List Request to Expunge Seal Records.pdf matching recorded sha256 b72d30d274b061e0671933b8bd65abf7d2c37a6f1dd4ebfbf3968bc55b9bed0c before final render; render and contact sheet cannot be produced from committed evidence alone.
