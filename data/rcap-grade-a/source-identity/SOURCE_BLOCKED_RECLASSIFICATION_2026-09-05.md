# SOURCE_BLOCKED reclassification, 2026-09-05

Measurement lane. Base `6351836b1f53cb143cc6afb08a4bf0bc28dde7b1`. Full findings in
`SOURCE_BLOCKED_RECLASSIFICATION_2026-09-05.json`.

`SOURCE_BLOCKED` is defined in the queue vocabulary as *"a required source is not
held; the conveyor can resolve it."* Measured against that definition it is correct
for three of the eleven families, misleading for one, incomplete for one, and wrong
for six.

## Method and denominator

All 501 mounted files were indexed by SHA-256; 501 distinct digests. Before any
verdict was drawn the index was checked against a positive control — DC-33 at
`342337451d…` resolves to exactly one mounted file — so a zero elsewhere is a real
zero. Every source was resolved by content hash and no declared path was trusted.
The seven held Utah special-certificate sources prove why: they are declared at
paths under an unmounted `rcap-d-source-packs` custody and resolve inside the
Master Library. Path resolution would have called all seven missing.

## The weak test, confirmed

Six families passed the "every declared digest is mounted" test. All six declare
required sources carrying **no digest at all**, and that is precisely where each is
blocked — the four RI DC-33/Superior-55 families on an undigested `-ORDER`, and
`ut_pet_special_certificate-set` on undigested `1001EX` and `1021EX`. Both earlier
captain notes are confirmed, not refuted.

## Rhode Island: not a byte problem

All five RI families hold every byte they need. DC-33 (`342337451d…`, 4pp, 78
fields) and Superior-55 (`e5805c5482…`, 4pp, 75 fields) are mounted acroforms whose
page 1 is instructions, page 2 the motion, pages 3–4 the affidavit. The affidavit
Parts map one-to-one onto the families, so `DC-33-AFFIDAVIT` is a region of the
parent, not a separate instrument.

The order is **not** clerk-supplied, correcting the earlier note. DC-33 instruction 7
says *"Bring the Order for Expungement or Sealing of Record to the hearing"*, and the
held RI legal review says the participant prepares and brings a proposed order for
the judge to sign. Rhode Island publishes no order template; the corpus records
`Missing/source-gap entries: 0` for RI. The order is an instrument that does not
exist as an official form, so there is nothing to fetch.

Two standing determinations keep these families blocked on the ground that
*"the record contains no Judiciary or clerk confirmation that a self-composed order
is accepted"* — but they cite only the form URL. The RI legal review held in the same
corpus lists *"the completed court form and proposed order"* under **What LegalEase
can prepare**.

## Two ledger defects found

1. **Circular acquisition (RI).** The ledger records `DC-33-ORDER` as
   `acquired_bytes` at `342337451d…` — byte-identical to `DC-33` itself; likewise
   `Superior-55-ORDER` at the Superior-55 digest. The same entries' own treatment
   text forbids exactly this: the order *"must never be satisfied by re-binding the
   motion-and-affidavit packet under an order identity."*
2. **False hash-bound claim (WA).** A determination states JU 10.0320 is "already
   hash-bound" and that the corpus "holds JU 10.0320 only". Its digest
   `bbe5a288…` matches none of the 501 mounted files. A recorded hash is not held bytes.

## Washington is not a packet at all

`RCW 13.50.260(1)-(2)` relief is court-initiated: the court sets the administrative
sealing hearing at disposition and enters the order on its own findings. The
participant files nothing. The three JU forms belong to the motion path under
subsection (3), a different route. This family needs a guidance treatment, not an
acquisition.

## Disposition

| Family | Verdict |
|---|---|
| 5 RI families | wrong — `PRODUCT_PATH_PENDING`; one owner decision from buildable |
| WA juvenile sealing | wrong — guidance treatment |
| `ut_pet_special_certificate-set` | misleading — bytes finished, in owner-only Drive; Roger must install |
| UT path-l trafficking vacatur | incomplete — conceals an untraced legal vehicle; counsel first |
| `az_set_aside-set`, ME juvenile sealing, UT path-m | correct — genuine acquisitions |

No family was claimed, built or promoted. No queue, manifest, fixture, field map or
generated graph was modified.
