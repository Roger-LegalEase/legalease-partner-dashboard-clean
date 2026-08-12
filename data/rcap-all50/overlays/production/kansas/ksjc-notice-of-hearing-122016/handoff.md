# Handoff — KS ksjc-notice-of-hearing-122016

- Form: Kansas Judicial Council, Notice of Hearing on Petition for Expungement of Conviction or Diversion, KSJC 12/2016
- Component role: supporting (notice of hearing; caption and petitioner block prepared by the filer, hearing setting assigned by the court)
- Tracks served: ks-21-6614-diversion
- Source binary: LegalEase Kansas/Notice of Hearing on Petition for Expungement of Conviction or Diversion 122016.pdf (sha256: a960c857ec505a3013e725526718580ad2047aa9b3dd85191a70b8375cc83ffd)
- Census: 29 fields (basis: committed shadow-batch sample AcroForm structure).
- Populated (participant + deterministic): 9. Never-populated/manual: 20.
- Fixtures: canonical / boundary / negative committed under fixtures/.

## What F must visually approve
- Field-name-to-label fidelity of every binding against the true source binary.
- The manual_participant and unused calls (esp. unlabeled "undefined*"/"Check Box*" fields).
- Dropdown option matching for county fields; checkbox valueMaps.
- That no protected/court/prosecutor/signature/notary field receives content.

## Blocked and exact unblock
- Final render + contact sheet are blocked in this clone: private/Nationwide Record Clearing/ holds 0 tracked files.
- Exact unblock: The operator must supply private/Nationwide Record Clearing/LegalEase Kansas/Notice of Hearing on Petition for Expungement of Conviction or Diversion 122016.pdf matching recorded sha256 a960c857ec505a3013e725526718580ad2047aa9b3dd85191a70b8375cc83ffd before final render; render and contact sheet cannot be produced from committed evidence alone.
