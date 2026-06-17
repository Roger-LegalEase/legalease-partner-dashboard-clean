# Illinois — RCAP All-50 Review Manifest

This is a build-first QA / attorney handoff artifact. It is NOT counsel approval,
visual approval, or live-routing approval. Review statuses are tracked separately
from build status.

## Jurisdiction

- Code: IL
- Name: Illinois
- Slug: illinois
- State-pack directory: src/lib/rcap/state-packs/illinois/

## Build status

- buildStatus: state_built
- Status history: not_started → nationwide_resources_found → resource_packet_ingested → official_forms_ingested → overlay_field_maps_drafted → overlay_samples_rendered → state_pack_built → pleading_packet_rendered → guidance_packet_rendered → state_built

## Review statuses (tracked separately from buildStatus)

- QA: pending
- Visual: pending
- Counsel: pending
- Source freshness: pending

## Legacy generator status

- Illinois has a preserved legacy live generator. The all-50 review artifacts are additive and must not alter legacy routing or output.

## Products / pathways covered

Products:
- record_clearing_guidance_packet
- official_pdf_overlay_draft
- custom_pleading_or_state_pack_draft

Pathways:
- record_clearing_review: Illinois record-clearing review → guidance_packet
- official_form_overlay: Illinois official form overlay draft → official_pdf_overlay_draft
- custom_pleading: Illinois custom pleading draft → custom_pleading_or_state_pack_draft

## Official forms found

- Official PDFs in inventory: 18
  - CXP Additional Cannabis Convictions.pdf (396270 bytes)
  - CXP Additional Notice of Court Date.pdf (283605 bytes)
  - CXP Getting Started Motion to Vacate and Expunge.pdf (150220 bytes)
  - CXP Instructions.pdf (869078 bytes)
  - CXP Motion to Vacate and Expunge.pdf (227699 bytes)
  - CXP Notice of Court Date for Motion.pdf (370872 bytes)
  - CXP Order Granting or Denying Motion.pdf (332731 bytes)
  - EXP Certificate of Service Circuit Clerk.pdf (769636 bytes)
  - EXP-AD Additional Cases Expungement.pdf (821758 bytes)
  - EXP-AD Additional Cases Sealing.pdf (817586 bytes)
  - EXP-AD Case List Request to Expunge Seal Records.pdf (744328 bytes)
  - EXP-AD Order Denying.pdf (782948 bytes)
  - Getting_Started_Juv_Exp.pdf (82025 bytes)
  - Illinois-Expungement-Sealing-Agent-Reference.pdf (35550 bytes)
  - Instructions_Juv_Exp.pdf (601508 bytes)
  - Notice_Juv_Exp.pdf (875865 bytes)
  - Order_Juv_Exp.pdf (831896 bytes)
  - Request_Juv_Exp.pdf (876666 bytes)

## Guidance fallback status

- Supported: yes
- Status: built
- Label: Illinois record-clearing guidance fallback

## Custom pleading support status

- Supported: yes
- Status: draft_config_allowed

## Overlay status

- pending_overlay_samples (draft_ready)

## Missing / pending items

- Official PDF overlay samples pending render.
- Overlay field maps pending verification.
- Visual alignment review pending.
- QA review pending.
- Counsel review pending.
- Source freshness review pending.

## Recommended QA focus

- Confirm required user inputs map to the selected pathway.
- Confirm filing destination guidance is non-fabricated and source-backed.
- Confirm filing steps are coherent and complete.
- Confirm fees/copies/service notes are either present or explicitly marked unavailable.
- Confirm guidance fallback renders for internal review.

## Recommended attorney-review focus

- Confirm eligibility pathways are legally accurate for Illinois.
- Confirm official form names and filing venue.
- Confirm no unsupported legal conclusion is asserted.
- Confirm disclaimer language is adequate.
- Decide whether Illinois can advance from state_built to approved_for_live.
