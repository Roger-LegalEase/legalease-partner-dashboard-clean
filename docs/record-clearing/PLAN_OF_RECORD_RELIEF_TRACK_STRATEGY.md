# Plan of Record — Relief-Track Output Strategy

**Version** 1.0.0
**Status** Approved. Authoritative product decision.
**Adopted** 2026-07-30
**Supersedes** state-level and PDF-level readiness models
**Machine-readable form** `data/record-clearing/relief-track-registry.json`

This document is the plan of record for how LegalEase decides what a participant
receives in each jurisdiction. It is not a proposal and is not reopened per
jurisdiction or per renderer. Changes require a new version of this document.

---

## 1. The three output strategies

Every relief track resolves to exactly one:

| Strategy | The participant receives |
|---|---|
| `custom_pleading` | A jurisdiction-specific pleading generated from an approved template populated with their facts |
| `official_pdf_fill` | A completed official form, preserving the official source document |
| `process_guidance` | An actionable guidance artifact for an administrative, automatic, prosecutor-controlled or portal-based route |

There is no fourth strategy and no default.

## 2. The unit of readiness is the relief track

**Not the state, and not the PDF.** A jurisdiction may have one track that is
packet-ready and another still awaiting legal research. State coverage is
*calculated from* its track records; it is never declared independently, and no
separate all-state launch declaration may contradict the track registry.

## 3. The four approvals

A track becomes `packet_ready` only when **all four** hold:

1. **Source approval** — the governing artifact is identified, current, and its
   hash verified.
2. **Technical approval** — real HTTP generation, storage, download and PDF-open
   have passed.
3. **Visual approval** — the rendered output has been inspected.
4. **Legal approval** — mechanism, applicability and sufficiency reviewed.

**No model or engineer may self-approve legal sufficiency.**

If any approval expires or is invalidated by a source change, the track leaves
`packet_ready` automatically. This is enforced, not procedural: a changed source
hash invalidates source approval, which withdraws readiness.

## 4. Resolution contract

A participant resolves by **jurisdiction + relief mechanism + record type +
disposition + court level + geography**.

Resolution returns the output strategy, the exact artifact or template, required
inputs, geographic restrictions, readiness status, and a customer-facing
description of the deliverable.

**Resolution fails closed.** No fallback jurisdiction, remedy, geography, form
or template is permitted, under any name.

## 5. Evidence hierarchy

Higher-ranked sources control on conflict.

| | Source | Weight |
|---|---|---|
| A | Current official court, legislature, prosecutor, agency or administrative sources | Controls |
| B | Current approved legal research and counsel review | Controls |
| C | Record-Clearing Master Build Plan classification | Starting presumption |
| D | Source-form corpus | Evidence that a document exists — nothing more |
| E | Code and field-map drafts | Implementation artifacts only |

**A PDF's presence, field count, AcroForm structure or inventory entry does not
establish that it is the governing artifact.** Legal strategy is never inferred
from PDF structure.

## 6. Locked strategy assignments

Starting presumptions at state level, from source C. **They must be decomposed
into individual relief tracks before use as runtime logic**, and a track-specific
requirement or current authority overrides them.

**`custom_pleading` — primary:** CA, DC, IN, KS, ND, OK, PA, TX, VA, WY

**`custom_pleading` — with local-form guardrails:** AZ, MS, NV, OH, WA

**`official_pdf_fill` — official-form-led:** AL, AK, AR, CO, CT, DE, FL, HI, ID,
IA, IL, KY, LA, ME, MD, MA, MI, MN, NE, NH, NJ, NM, NC, RI, SD, UT, VT, WV, WI

**Per relief track:** GA, MO, MT, OR, SC, TN

**Mechanism-routed:** NY — routed by statutory mechanism, never by state alone.

### Consequences that follow directly

These are asserted in `scripts/rcap-build-record-clearing-registries.mjs` so they
cannot drift from this document:

- **Oklahoma** is pleading-led, so a missing official filing PDF is **not** a blocker.
- **Pennsylvania** is pleading-led, so its XFA file is **not** the governing renderer.
- **Mississippi** is pleading-led with local guardrails. The Fourth Circuit
  petitions are **never** rewritten into statewide forms.
- **Louisiana** is official-form-led, so its absent official source **is** a real blocker.
- **Illinois** is official-form-led.

## 7. Geographic honesty

Local, county, district, circuit, court-specific, prosecutor-controlled and
agency-specific processes are scoped as such. **No local form may be served
statewide.**

Fixed local legal language is never rewritten to make a form appear statewide
without a separately recorded legal approval for that exact transformation.

## 8. Process guidance is a real outcome

`process_guidance` is a legitimate nationwide outcome where the governing route
is administrative, automatic, prosecutor-controlled or portal-based. Fabricating
a court petition for such a route is prohibited.

**It may never be represented or counted as a generated court filing packet.**

## 9. Three independent dimensions

Never merged into one status, because they vary independently:

| Dimension | Values |
|---|---|
| **Legal output strategy** | `custom_pleading`, `official_pdf_fill`, `process_guidance` |
| **Technical document class** | `clean_acroform`, `dirty_acroform`, `flat_pdf`, `scanned_pdf`, `encrypted_pdf`, `xfa`, `no_pdf_required`, `source_missing` |
| **Geographic scope** | `statewide`, `county`, `circuit`, `district`, `court_specific`, `agency_specific` |

A clean AcroForm may be local-only. A flat scan may be the mandatory statewide
form. A custom-pleading track may require no source PDF at all.

## 10. Readiness lifecycle

`research_pending` → `source_missing` → `source_verified` →
`strategy_pending_review` → `strategy_verified` → `template_in_build` →
`mapping_in_review` → `technical_qa_passed` → `legal_review_pending` →
`packet_ready` | `guidance_ready`

Terminal-blocking: `stale_blocked`, `temporarily_disabled`.

## 11. Payment and customer promise

Before paid or sponsored fulfillment the runtime must identify which outcome the
participant will receive: prepared court documents, completed official forms, or
guided administrative process.

**Paid packet generation is blocked for any track that is not `packet_ready` or
`guidance_ready` for the deliverable being represented.** Nationwide screening
and initial guidance remain available regardless.

## 12. What may not be claimed

Packet readiness is never claimed from state-pack presence, source inventory,
ZIP entry count, folder presence, field-map draft presence, field detection,
declared approval, or green bookkeeping verifiers.

Reporting always separates: **operational**, **guidance-ready**, **awaiting
mapping**, and **awaiting legal approval**.
