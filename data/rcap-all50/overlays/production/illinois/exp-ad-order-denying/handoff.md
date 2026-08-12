# Handoff — IL exp-ad-order-denying

- Form: EXP-AD Order Denying (Order Denying Request to Expunge and/or Seal Criminal Records)
- Component role: court order component (completed by the court; caption and petitioner notice block only are prepared by the filer)
- Tracks served: il-exp-pardon, il-exp-precompletion, il-seal-edu, il-seal-nonconv
- Source binary: LegalEase Illinois/EXP-AD Order Denying.pdf (sha256: 2d3039fa873801bc58bf425a2c73f489951bb82de33b11af031e8bf62df3ffa8)
- Census: 28 fields (basis: committed shadow-batch sample AcroForm structure).
- Populated (participant + deterministic): 7. Never-populated/manual: 21.
- Fixtures: canonical / boundary / negative committed under fixtures/.

## What F must visually approve
- Field-name-to-label fidelity of every binding against the true source binary.
- The manual_participant and unused calls (esp. unlabeled "undefined*"/"Check Box*" fields).
- Dropdown option matching for county fields; checkbox valueMaps.
- That no protected/court/prosecutor/signature/notary field receives content.

## Blocked and exact unblock
- Final render + contact sheet are blocked in this clone: private/Nationwide Record Clearing/ holds 0 tracked files.
- Exact unblock: The operator must supply private/Nationwide Record Clearing/LegalEase Illinois/EXP-AD Order Denying.pdf matching recorded sha256 2d3039fa873801bc58bf425a2c73f489951bb82de33b11af031e8bf62df3ffa8 before final render; render and contact sheet cannot be produced from committed evidence alone.
