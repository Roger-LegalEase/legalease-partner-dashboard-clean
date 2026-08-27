# AGENTS.md - RCAP All-50 ASAP Build Discipline

## Plan hierarchy

**Enterprise plan of record:** `docs/LegalEase-Master-Build-Plan-v4.md`. It carries
all still-controlling v3 content and adds the Company Controls and SOC 2
Operating System as a parallel cross-company workstream. v3 is preserved
unchanged at `docs/LegalEase-Master-Build-Plan-v3.md`.

**Active state-build plan of record for this sprint:**

- `docs/RCAP_ALL50_ASAP_MASTER_PLAN.md`
- `docs/RCAP_ALL50_AGENT_RUNBOOK.md`
- `docs/RCAP_ALL50_QA_ATTORNEY_HANDOFF.md`
- `docs/RCAP_ALL50_BUILD_STATUS.md`

**Company controls:** `docs/security/soc2/`. Ordinary state-build agents should
not modify company-control documents unless the task assigns them. Company
controls never replace legal, visual, source-fidelity or packet-verification
gates, and completing one authorizes no route promotion.

Historical architecture reference: `docs/LegalEase-Master-Build-Plan-v2.md/LegalEase-Master-Build-Plan-v2-4.md`.

## Controlling Product Contract

`docs/PRODUCT_CONTRACT.md` is the authority for product behaviour. Where it and
an implementation disagree, the implementation is the defect. Where it and any
other document here disagree — status reports, lane manifests, build plans,
promotion manifests — the contract governs.

Its governing rule:

> Screening may be anonymous. A Briefcase may not be anonymous. A pending result
> becomes a matter only when it is securely and atomically claimed by the
> authenticated participant.

The screening design it is measured against, for all 50 states and DC, is
`docs/screening/FREE_CHECK_ALL_51_JURISDICTIONS.md`.

## Core Directive

Build RCAP coverage for all 50 states plus DC from `private/Nationwide Record Clearing/`. The Nationwide folder is the source inventory for forms, resource packets, legal vocabulary, eligibility notes, required fields, official PDFs/HTML/statutes, Wilma references, and filing instructions.

For ordinary build work, do not wait for visual verification, counsel review, source freshness review, or Roger approval. QA and attorney review happen after the buildout using generated review artifacts. Build statuses and review statuses are tracked separately.

Do not work on the new Expungement.ai UI in this sprint. Focus only on RCAP state coverage, official PDF overlays, custom pleadings, guidance packets, manifests, verifiers, internal previews, and review artifacts.

## Standing Permission

Agents may create files, edit files, add scripts, add tests, update manifests, generate artifacts, generate sample packets, draft overlays, create field maps, create guidance packets, fix errors, run verifiers, and commit completed work in this worktree.

Do not ask Roger for permission for ordinary build work. If something fails, diagnose it, fix it, rerun checks, and continue.

## Roger Approval Required

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

## Legacy Generators Preserved

Existing live legacy generators must remain preserved:

- Mississippi
- Illinois
- District of Columbia
- Pennsylvania
- Texas-Harris

Legacy generators are flow/output references and live fallbacks. Do not break them. Do not change live RCAP routes unless a task explicitly authorizes that exact route change.

## Source Hierarchy

`private/Nationwide Record Clearing/` is the sprint source inventory and should be ingested first for every state plus DC. `src/lib/rcap/state-packs/<state>/` is coded research for states that already have state packs and may be used as build input. If a coded state pack conflicts with Nationwide, Nationwide wins and the discrepancy becomes a state-pack fidelity issue.

Official PDFs / HTML / statutes inside Nationwide are used to create or refresh state packs, overlay drafts, pleading drafts, and guidance packets. If a state lacks a verified official form path during the buildout, produce a guidance packet fallback and mark the review status for post-build QA.

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
