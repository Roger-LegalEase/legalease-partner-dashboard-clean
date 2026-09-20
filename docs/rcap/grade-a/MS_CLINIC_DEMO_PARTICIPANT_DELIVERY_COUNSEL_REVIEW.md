# Mississippi Clinic Mode participant-delivery counsel review

Status: **APPROVED — both exact participant-delivery hashes**

Reviewer: Lawrence Blackmon

Decision date (UTC): 2026-09-03

Decision: **APPROVE**

Qualifications: None

Authentication kind: `owner_attestation`

Authenticated approval reference:

> Owner attestation by Roger Roman that Lawrence Blackmon reviewed the actual
> final participant-delivery canonical and boundary PDFs identified by exact
> SHA-256 in the current Mississippi Volunteer Lawyers counsel-review package
> and approved both artifacts for the bounded sponsored Clinic Mode Preview
> without qualifications.

Route: `MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal`

Packet family: `ms-nonconv-set`

## Exact review artifacts

| Variant | Exact PDF | SHA-256 | Bytes | Pages |
| --- | --- | --- | ---: | ---: |
| Participant A canonical | [ms-nonconviction-clinic-demo-participant-a-canonical.pdf](../../../data/rcap-ledger/grade-a/artifacts/ms-nonconviction-clinic-demo-participant-a-canonical.pdf) | `413f6226500a5dc13cbad2ce7ec664a55dcdb48d80cd8bef9fa746f369c6553f` | 33,774 | 12 |
| Participant B boundary | [ms-nonconviction-clinic-demo-participant-b-boundary.pdf](../../../data/rcap-ledger/grade-a/artifacts/ms-nonconviction-clinic-demo-participant-b-boundary.pdf) | `9f766f22524dcac9edfc340e1a77efda8e7cc821cce8672bc8daf9e853c738e1` | 37,430 | 13 |

Specification SHA-256:
`3a1bed79e3760feb84563a638893942ab557683f6bbe7fb0fddec7e74723257f`

Renderer identity: `rcap_grade_a_document_v1@2.0.0`

Worker-input source SHA:
`b680a4e4dd92e7422bc7030aa2189026929782a1`

The artifacts were generated through the same specification, composer,
renderer, and fact path used by the hosted participant journey. Two consecutive
builds produced identical bytes. All 25 pages opened and were rastered and
reviewed. The raster receipt and page hashes are in
[ms-nonconviction-clinic-demo.participant-delivery.raster-review.json](../../../data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.participant-delivery.raster-review.json).
The review found no clipping, overlap, placeholder text, invented fact, or
wrong-field write. Participant signature and notarization blanks remain blank;
judge, clerk, notary, and service-completion fields are not prefilled.

## Difference from the previously approved internal-review PDFs

The prior exact-hash approval remains historical and covers only:

- canonical `294e871e192719fa2c542947f8177be1621ea8ce13429f2186df63d8daff9c40`
  (33,848 bytes, 12 pages); and
- boundary `fe639ff544055e1440d069417d9e8c9fc5a7b366499c51111bd6d3377f7615b4`
  (37,542 bytes, 13 pages).

The new PDFs change the generation purpose from `internal_review` to
`participant_delivery`, bind new protected verification hashes, and supply the
delivery-only facts that the composer guard requires. Those facts include a
court-approved MCIC identifier channel and dated court/clerk confirmation, a
confirmed prosecuting-authority service address, Exhibit A attached, Exhibit B
inserted, and docket-exact synthetic arrest, release, caption, charge, case, and
disposition data. The canonical file is 74 bytes smaller than its historical
review counterpart; the boundary file is 112 bytes smaller. The page counts and
five-document packet structure are unchanged, but both byte hashes are new.

## Exact approval scope

Delivery scope:
`sponsored_preview_only_two_synthetic_staging_participants_after_all_technical_gates_pass`

An approval may authorize only both exact hashes in the table above for this
one Mississippi route and packet family, used for sponsored delivery in the
bounded `mvl-demo` Vercel Preview to the two synthetic staging-scoped
participants, and only after every remaining technical acceptance gate passes.

It does not authorize consumer-paid delivery, Production delivery, live Stripe,
a live sponsor allocation, real participant data, another route or packet
family, modified packet bytes, or a changed specification. Any packet-byte or
specification-digest change invalidates the approval and requires a new review.

## Exact statement for Roger to send Lawrence

> Lawrence, please review the two attached participant-delivery Preview PDFs
> for route MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal
> and packet family ms-nonconv-set. The canonical PDF is SHA-256
> 413f6226500a5dc13cbad2ce7ec664a55dcdb48d80cd8bef9fa746f369c6553f,
> 33,774 bytes, 12 pages. The boundary PDF is SHA-256
> 9f766f22524dcac9edfc340e1a77efda8e7cc821cce8672bc8daf9e853c738e1,
> 37,430 bytes, 13 pages. The specification SHA-256 is
> 3a1bed79e3760feb84563a638893942ab557683f6bbe7fb0fddec7e74723257f,
> the renderer is rcap_grade_a_document_v1@2.0.0, and the worker-input source
> SHA is b680a4e4dd92e7422bc7030aa2189026929782a1. Please reply “APPROVE BOTH
> EXACT HASHES” or “REJECT” and list any qualifications. Approval would apply
> only to sponsored delivery in the bounded mvl-demo Vercel Preview to the two
> synthetic staging-scoped participants after every technical acceptance gate
> passes. It would not authorize consumer-paid or Production delivery, live
> Stripe, a live sponsor allocation, real participants, another route or packet
> family, or changed bytes. Any packet-byte or specification-digest change
> requires a new review.

This record represents Roger Roman's owner attestation only. It does not
represent a handwritten signature, electronic-signature provider, email,
document ID, or direct Lawrence authentication evidence.

Both exact participant-delivery hashes in this package are approved. The prior
internal-review approval was not reused. Sponsored Preview delivery remains
held until every technical predicate passes; consumer-paid and Production
delivery remain closed.
