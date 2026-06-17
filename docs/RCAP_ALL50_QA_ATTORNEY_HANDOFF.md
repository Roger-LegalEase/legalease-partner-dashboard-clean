# RCAP All-50 QA And Attorney Handoff

## Purpose

This document defines the post-build handoff for QA, visual review, and attorney review. These reviews do not block ordinary all-50 build work. They gate approval for live use.

## Build Artifacts To Review

Each state plus DC should have:

- source inventory entry
- build manifest entry
- guidance packet fallback
- overlay or pleading draft when available
- sample packet or explicit missing-source fallback
- review artifact
- review status fields

## Review Statuses

Review statuses are tracked separately from build status:

- `qa_review`: pending, in_review, passed, failed, not_applicable
- `visual_review`: pending, in_review, passed, failed, not_applicable
- `counsel_review`: pending, in_review, passed, failed, not_applicable
- `source_freshness_review`: pending, in_review, passed, failed, not_applicable

A state may be `state_built` while all review statuses remain pending.

## QA Review Checklist

QA should confirm:

- state identity is correct
- source inventory reflects Nationwide folder content
- missing resources are explicit
- packet output renders or fallback is present
- required warnings/disclaimers exist
- state-specific relief vocabulary is used
- legacy generators still pass their verifiers
- no Expungement.ai UI files were changed
- build status and review status fields are separated

## Visual Review Checklist

For official PDF overlays:

- every drafted field appears on the intended form
- labels and boxes are not crossed
- text fits within expected field areas
- multi-page forms render on the correct page
- checkbox/radio fields are visually correct
- no hidden AcroForm/XFA issue invalidates output
- sample output is attached to the review artifact

Visual review may fail a field map without invalidating the buildout. The state remains build-complete with visual review pending or failed until a retry passes.

## Attorney Review Checklist

Attorney/counsel review should confirm:

- legal vocabulary is correct for the state
- relief pathways are not overpromised
- eligibility language is conservative
- statutory/rule references are correct where used
- filing instructions do not invent local practice
- automatic relief is described as possible or scheduled, not completed
- guidance does not constitute legal advice
- packets are suitable for the intended review/live status

## Live Approval

A state cannot be marked `approved_for_live` or `live` until the required QA, visual, counsel, source freshness, and integration gates pass for that state's output type.

`state_built` is an internal build milestone only.

## Handoff Package

The generated handoff should include:

- manifest excerpt
- source inventory summary
- generated output paths
- overlay sample paths where applicable
- guidance packet paths
- unresolved risks
- review checklist
- reviewer notes area
