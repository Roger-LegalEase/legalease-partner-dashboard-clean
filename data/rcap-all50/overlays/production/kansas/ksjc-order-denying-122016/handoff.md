# Handoff — KS ksjc-order-denying-122016

- Form: Kansas Judicial Council, Order Denying Expungement of Conviction or Diversion, KSJC 12/2016
- Component role: court order component (completed by the court; caption only prepared by the filer)
- Tracks served: ks-21-6614-diversion
- Source binary: LegalEase Kansas/Order Denying Expungement of Conviction or Diversion 122016.pdf (sha256: b29254fb58433d496041c185fc69ec864ba1beff1e5e9722738c3b1ebedfe2ba)
- Census: 51 fields (basis: committed shadow-batch sample AcroForm structure).
- Populated (participant + deterministic): 3. Never-populated/manual: 48.
- Fixtures: canonical / boundary / negative committed under fixtures/.

## What F must visually approve
- Field-name-to-label fidelity of every binding against the true source binary.
- The manual_participant and unused calls (esp. unlabeled "undefined*"/"Check Box*" fields).
- Dropdown option matching for county fields; checkbox valueMaps.
- That no protected/court/prosecutor/signature/notary field receives content.

## Blocked and exact unblock
- Final render + contact sheet are blocked in this clone: private/Nationwide Record Clearing/ holds 0 tracked files.
- Exact unblock: The operator must supply private/Nationwide Record Clearing/LegalEase Kansas/Order Denying Expungement of Conviction or Diversion 122016.pdf matching recorded sha256 b29254fb58433d496041c185fc69ec864ba1beff1e5e9722738c3b1ebedfe2ba before final render; render and contact sheet cannot be produced from committed evidence alone.
