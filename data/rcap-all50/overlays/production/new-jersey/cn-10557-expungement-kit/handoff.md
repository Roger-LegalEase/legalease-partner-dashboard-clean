# Handoff — NJ cn-10557-expungement-kit

- Form: New Jersey Courts, How to Expunge Your Criminal and/or Juvenile Record kit, CN 10557
- Component role: principal petition kit (petition, verification, proposed orders, notices, cover letters in one binary)
- Tracks served: nj_indictable_conviction, nj_ordinance
- Source binary: LegalEase New Jersey/10557_expunge_kit.pdf (sha256: c1dd37b5e27bd76ea2330b07f51847c420d359db8f10c0576682e6558d09c5f7)
- Census: 179 fields (basis: committed shadow-batch sample AcroForm structure).
- Populated (participant + deterministic): 18. Never-populated/manual: 161.
- Fixtures: canonical / boundary / negative committed under fixtures/.

## What F must visually approve
- Field-name-to-label fidelity of every binding against the true source binary.
- The manual_participant and unused calls (esp. unlabeled "undefined*"/"Check Box*" fields).
- Dropdown option matching for county fields; checkbox valueMaps.
- That no protected/court/prosecutor/signature/notary field receives content.

## Blocked and exact unblock
- Final render + contact sheet are blocked in this clone: private/Nationwide Record Clearing/ holds 0 tracked files.
- Exact unblock: The operator must supply private/Nationwide Record Clearing/LegalEase New Jersey/10557_expunge_kit.pdf matching recorded sha256 c1dd37b5e27bd76ea2330b07f51847c420d359db8f10c0576682e6558d09c5f7 before final render; render and contact sheet cannot be produced from committed evidence alone.
