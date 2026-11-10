# AGENTS.md - RCAP All-50 ASAP Build Discipline

## Current Grade A execution — Roger, 2026-11-10

The existing product scope is all 50 states plus D.C., all 346 existing families,
and applicable consumer, RCAP-sponsored and Clinic-assisted experiences. The
sprint's UI exclusion and build-only definition of completion are superseded.
Use the existing Product Contract, Mission Lock, owner amendments and
`data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json`; do not replace their
population or create another nationwide inventory.

Keep four outcomes distinct in the existing records: source acceptance;
coherent integration; deployment with observed application/generation-service,
worker, asset and database/configuration identities; and actual customer
verification of the required packet, ownership, funding and return workflow.
A component handoff ends that assignment, not Root's customer-outcome
responsibility. Root integrates; V2 owns shared registration/assembly; S1/S2 own
their existing family partitions; V1 executes coordinated customer/target checks;
P2 supplies the applicable independent review.

Before repeating accepted work, record its exact implementation/evidence, the
changed input, demonstrated failure or uncovered requirement, and the smallest
affected correction/check. Otherwise reuse it. Missing registration, a receipt or
runtime asset binding does not justify rebuilding an accepted family. Group
shared connections once; preserve approved guidance, handoff and held treatments.
A required substantive packet cannot fall back to a generic PDF or checklist.

Use current target-specific authorization and later owner amendments, including
approved domain/sequence exceptions. Do not restore superseded generic gates or
request the same permission again. A scoped authorized repair may be released
while other product work remains open; it does not establish Grade A completion.
Before publication verify the destination, exact intended changed content and
history through the established reviewed path. Keep private engineering history,
review artifacts, sources and credentials private; preserve the 9278 disposition.
Results use exclusive, unique run paths; keep failures and corrections separately,
and never direct controller output over an operation's result or author's final.


Plan of record for this sprint:

- `docs/RCAP_ALL50_ASAP_MASTER_PLAN.md`
- `docs/RCAP_ALL50_AGENT_RUNBOOK.md`
- `docs/RCAP_ALL50_QA_ATTORNEY_HANDOFF.md`
- `docs/RCAP_ALL50_BUILD_STATUS.md`

Historical architecture reference: `docs/LegalEase-Master-Build-Plan-v2.md/LegalEase-Master-Build-Plan-v2-4.md`.

## Core Directive

Build RCAP coverage for all 50 states plus DC from `private/Nationwide Record Clearing/`. The Nationwide folder is the source inventory for forms, resource packets, legal vocabulary, eligibility notes, required fields, official PDFs/HTML/statutes, Wilma references, and filing instructions.

For ordinary build work, do not wait for visual verification, counsel review, source freshness review, or Roger approval. QA and attorney review happen after the buildout using generated review artifacts. Build statuses and review statuses are tracked separately.

Required Expungement.ai and partner UI, authentication, persistence, packet delivery and recovery work are in scope. The historical construction loops remain implementation references, not a substitute for the released customer product.

## Standing Permission

Agents may create files, edit files, add scripts, add tests, update manifests, generate artifacts, generate sample packets, draft overlays, create field maps, create guidance packets, fix errors, run verifiers, and commit completed work in this worktree.

Do not ask Roger for permission for ordinary build work. If something fails, diagnose it, fix it, rerun checks, and continue.

## Roger Approval Required

The list below identifies actions requiring authority when no applicable existing
grant covers the exact target/effect. Reuse recorded authorization and later owner
amendments; do not turn the list into a repeated approval ceremony.

Ask Roger before any action that would:

- deploy to production
- push directly to main
- run live Supabase migrations
- modify Supabase RLS/auth/session logic
- change Stripe live-mode behavior
- touch production environment variables or secrets
- delete major existing systems
- modify another agent's active worktree
- break existing live legacy generators
- make a destructive or irreversible change

Never use `git add .`, `git add -A`, or `git add --all`.

## Legacy Generators: preserve assets and history, not authority

The existing retirement decision
`data/record-clearing/legal-decisions/2026-08-28-legacy-generator-retirement.json`
and ADR-0004 govern Mississippi, Illinois, DC, Pennsylvania and Texas-Harris.
Preserve accepted assets, field maps, instructions, historical artifacts and
owner-authorized access. Retired runtime code grants no sale, sponsored credit,
commercial render job or delivery authority. Use the adopted exact Grade-A
route/family record. Security restoration does not revive retired commercial
authority or qualify a generic legacy PDF as the required substantive packet.

## Source Hierarchy

`private/Nationwide Record Clearing/` is the sprint source inventory and should be ingested first for every state plus DC. `src/lib/rcap/state-packs/<state>/` is coded research for states that already have state packs and may be used as build input. If a coded state pack conflicts with Nationwide, Nationwide wins and the discrepancy becomes a state-pack fidelity issue.

Official PDFs / HTML / statutes inside Nationwide are used to create or refresh state packs, overlay drafts, pleading drafts, and guidance packets. For an unfinished draft, guidance may support internal review. It cannot replace a required customer packet. Preserve adopted guidance-only or held treatments and recover existing qualified sources before acquiring replacements.

## Build-First Review Model

Visual review, counsel review, and source freshness review are not blockers for:

- source inventory ingestion
- state pack drafting
- official PDF field-map drafting
- overlay sample rendering
- custom pleading drafting
- guidance packet drafting
- review artifact generation
- internal preview support
- build status promotion through `state_built`

They remain blockers for `approved_for_live` and `live`.

## Worktree Separation

Agents must stay inside this worktree unless explicitly instructed otherwise. Do not edit another agent's active worktree. Parallel agents may work on separate states or separate loops, but avoid conflicting edits to shared manifests and scripts; merge through intentional commits.

## Current Build Status Vocabulary

Build statuses:

- `not_started`
- `nationwide_resources_found`
- `resource_packet_ingested`
- `official_forms_ingested`
- `state_pack_built`
- `overlay_field_maps_drafted`
- `overlay_samples_rendered`
- `pleading_packet_rendered`
- `guidance_packet_rendered`
- `state_built`
- `qa_review_pending`
- `visual_review_pending`
- `counsel_review_pending`
- `approved_for_live`
- `live`

Review statuses are tracked independently from build status.
