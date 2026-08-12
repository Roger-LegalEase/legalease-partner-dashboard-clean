# Handoff — IL exp-ad-request

- Form: EXP-AD Request (Request to Expunge and/or Seal Criminal Records)
- Component role: principal petition (all four IL tracks)
- Tracks served: il-exp-pardon, il-exp-precompletion, il-seal-edu, il-seal-nonconv
- Source binary: EXP-AD Request.pdf (sha256: sha256_unrecorded_in_repo)
- Status: FAIL CLOSED (fail_closed_absent_source).
- Reason: The principal petition binary "EXP-AD Request.pdf" is referenced by the registry crosswalk (officialFormRefs: "EXP-AD Request", "EXP-AD Request.pdf") but is not present in any committed evidence: not in overlay-factory-manifest (409 records), not in the compiled IL profile formInventory/allSourceFiles, no field-map draft, no shadow-batch sample.

## What F must visually approve
- Nothing yet — no field package exists to review for this family.

## Blocked and exact unblock
- Final render + contact sheet are blocked in this clone: private/Nationwide Record Clearing/ holds 0 tracked files.
- Exact unblock: The operator must add the official source binary for "EXP-AD Request (Request to Expunge and/or Seal Criminal Records)" under private/Nationwide Record Clearing/ (jurisdiction folder), record its sha256 in committed evidence, and re-run the overlay factory so a manifest record, field-map draft, and shadow sample exist — then this family can be built.
