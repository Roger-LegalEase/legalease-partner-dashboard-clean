# RCAP All-50 Build Status

This file is the human-readable status companion to generated artifacts under `data/rcap-all50/`.

## Current Sprint Direction

Build all 50 states plus DC from the Nationwide source inventory. Do not block ordinary build work on visual review, counsel review, source freshness review, or Roger approval. Generate review artifacts so QA and attorney review can happen after buildout.

## Generated Files

Expected generated files:

- `data/rcap-all50/nationwide-source-inventory.json`
- `data/rcap-all50/all-state-build-manifest.json`
- `data/rcap-all50/review-artifacts/index.md`
- `data/rcap-all50/review-artifacts/states/*.md`

## Build Loops

- `nationwide_folder_ingestion_loop`
- `all_state_build_loop`
- `official_pdf_overlay_factory_loop`
- `field_map_retry_loop`
- `custom_pleading_factory_loop`
- `guidance_packet_loop`
- `packet_render_qa_loop`
- `review_artifact_loop`
- `integration_preview_loop`
- `official_forms_watcher_loop`

## Build Statuses

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

## Initial Implementation Status

The first implementation phase adds:

- Nationwide ingestion script
- all-state manifest builder
- review artifact generator
- all-50 verifier
- package scripts for the loop

After running the scripts, this file should be read with the generated manifest for exact per-state status.
