# RCAP All-50 ASAP Master Plan

## Objective

Build RCAP state coverage for all 50 states plus DC as fast as safely possible from `private/Nationwide Record Clearing/`. The sprint produces state inventories, state-pack drafts, official PDF overlay drafts, custom pleading drafts, guidance fallback packets, internal previews, sample packets, manifests, verifiers, and QA/attorney review artifacts.

This sprint does not build the new Expungement.ai UI.

## Source Of Truth

The Nationwide folder is the build source inventory:

`private/Nationwide Record Clearing/`

It contains the forms and resource packets for every state plus DC. Agents should ingest the folder, normalize state names, classify resources, and build from the available source materials. Existing coded state packs may be reused, but Nationwide controls when there is a conflict.

## Build-First Strategy

Build work proceeds without waiting for visual verification, counsel review, source freshness review, or Roger approval. Those reviews are post-build gates and are tracked separately from build status.

Build-first means:

- find or explicitly mark missing Nationwide resources
- ingest every state inventory
- create state build records for all 50 states plus DC
- draft overlay field maps where official PDFs exist
- render overlay samples when feasible
- draft custom pleadings where pleading is the right shape
- generate guidance packet fallback for every state
- create review artifacts for QA and attorney review
- expose internal preview inputs and manifests

Review-first remains required only before a state can be marked `approved_for_live` or `live`.

## Build Statuses

The all-state manifest uses these build statuses:

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

Review statuses are separate fields. A state can be `state_built` while QA, visual, counsel, or source freshness review is still pending.

## Loop Architecture

The buildout runs through named loops so future agents can resume without asking Roger for repeated permission.

### nationwide_folder_ingestion_loop

Scan `private/Nationwide Record Clearing/`, normalize state folders, classify files, count official PDFs/resource packets/reference files, and write a source inventory.

### all_state_build_loop

Create or update an all-50-plus-DC manifest. Every state receives a manifest entry even when resources are missing. Missing resources are explicit build data, not a reason to stop.

### official_pdf_overlay_factory_loop

For each state with official PDFs, classify PDF assets and draft overlay/AcroForm/hybrid work items. Build review outputs first; final visual placement review happens later.

### field_map_retry_loop

For unmapped or weakly mapped PDFs, retry with additional signals: AcroForm names, PDF widget boxes, nearby text extraction where available, existing coded state-pack field names, and manual placeholder targets. Each retry updates artifact metadata.

### custom_pleading_factory_loop

For pleading-suitable states/tracks, draft custom pleading packets from Nationwide references and coded state-pack data where available. Vocabulary and relief labels must remain state-specific.

### guidance_packet_loop

Every state gets a guidance fallback packet. If official PDF or pleading output is incomplete, guidance packets keep the state buildable and reviewable.

### packet_render_qa_loop

Render sample packets and run structural QA: required sections exist, state name and relief vocabulary are present, no known forbidden vocabulary appears, missing fields are explicit, and no live-route behavior changed.

### review_artifact_loop

Generate per-state review artifacts for legal QA, visual overlay QA, source inventory QA, and internal build review. Artifacts should be complete enough for attorney review after buildout.

### integration_preview_loop

Generate internal preview data and links/paths for state outputs. Internal preview support is allowed; public live routing remains gated.

### official_forms_watcher_loop

Track source files by path, size, mtime, and hash when available so future source changes can be detected and review artifacts regenerated.

## Standing Permission

Agents may create files, edit files, add scripts, add tests, update manifests, generate artifacts, generate sample packets, draft overlays, create field maps, create guidance packets, fix errors, run verifiers, and commit completed work in this worktree.

Do not ask Roger for ordinary build work. Diagnose, fix, rerun checks, and continue.

## Roger Approval Required

Ask Roger before production deployment, direct push to main, live Supabase migrations, Supabase RLS/auth/session logic changes, Stripe live-mode behavior changes, production env/secret changes, destructive or irreversible changes, major system deletion, editing another agent's active worktree, or changes that would break existing live legacy generators.

## Preserved Legacy Generators

The live legacy generators remain preserved:

- Mississippi
- Illinois
- District of Columbia
- Pennsylvania
- Texas-Harris

They can be read as flow/output references but should not be broken or retired during this sprint.

## Definition Of Built

A state is build-complete for this sprint when it has:

- manifest entry
- source inventory result
- build strategy assignment
- at least one generated output path or explicit missing-source fallback
- guidance packet fallback
- review artifact path
- build status at `state_built`
- review statuses tracked separately

`state_built` is not approval for live use.
