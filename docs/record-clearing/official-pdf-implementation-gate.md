# Official PDF Implementation Gate

Status date: 2026-06-17

This is a docs-only, non-promotional summary of the official-PDF implementation gate. The
gate evaluates visually-approved field-map drafts and classifies what each draft would still
need before it could ever become a **future** shadow renderer candidate.

The gate is read-only. It does not change `lifecycle`, `rendererReady`, or
`visual_review_required` on any draft; it does not mark anything `replacement_candidate` or
`verified_replacement`; it does not create renderer configs; and it does not wire any renderer
or live route. Every evaluated draft remains shadow-only and `visual_review_required`.

## What runs

- Evaluator: `src/lib/record-clearing/official-pdf-implementation-gate.ts` (not exported from
  the public record-clearing index).
- Report: `npm run rcap:render-official-pdf-implementation-gate` →
  `tmp/official-pdf-implementation-gate/official-pdf-implementation-gate-report.json` (ignored).
- Verifier: `npm run rcap:verify-official-pdf-implementation-gate` (fails if any draft is
  accidentally promoted, if California stops being blocked, or if any live wiring appears).

The evaluator reuses the shadow batch (`official-pdf-shadow-batch.ts`) as the single source of
truth for sample-render success, so the gate reflects exactly what the shadow renderer produced.

## Per-draft gate checks

Each approved draft is checked for:

1. Visual approval metadata exists and gating fields are intact.
2. Source draft JSON is readable.
3. Sample shadow render succeeded (produced output with rendered values).
4. Required fields are present in the map.
5. `lifecycle` is `none`.
6. `rendererReady` is `false`.
7. `visual_review_required` is `true`.
8. Source identity is confirmable (a source PDF hash is recorded).
9. Field mappings are resolved (not raw `manual_review_required` candidates / `needs_review`).
10. No live route import or public selector wiring exists for the gate/batch.

## Classification

Each draft is assigned one **primary** status from the priority cascade below; every other
failing gate is recorded as a secondary finding so the report stays honest about all remaining
work. The cascade orders gates from most fundamental to least:

`not_ready_for_renderer_candidate` → `blocked_pdf_render` → `needs_shadow_render_fix` →
`needs_source_confirmation` → `needs_manual_overlay_refinement` → `implementation_gate_pass`.

| Status | Meaning |
| --- | --- |
| `implementation_gate_pass` | All gate checks pass; remains shadow-only pending a separate explicit implementation task. |
| `needs_shadow_render_fix` | Renders, but the sample render filled fewer values than the map declares. |
| `needs_source_confirmation` | Official source/currentness cannot be confirmed (no source PDF hash, hash mismatch, or source not found). |
| `needs_manual_overlay_refinement` | Renders against a confirmed source, but fields are still raw candidates needing manual mapping. |
| `blocked_pdf_render` | Sample shadow render fails (e.g. encrypted/XFA `PDFDict` failure). |
| `not_ready_for_renderer_candidate` | Approval/lifecycle metadata not intact, or live wiring detected. |

## Current results (26 approved drafts)

| Status | Count |
| --- | ---: |
| `implementation_gate_pass` | 2 |
| `needs_shadow_render_fix` | 0 |
| `needs_source_confirmation` | 22 |
| `needs_manual_overlay_refinement` | 0 |
| `blocked_pdf_render` | 2 |
| `not_ready_for_renderer_candidate` | 0 |

### Top implementation-gate-pass candidates

- **Wisconsin CR-266** — manual overlay; clean shadow render (11/11 fields); source hash
  recorded; all intake keys mapped.
- **Wisconsin CR-267** — manual overlay; clean shadow render (15/15 fields); source hash
  recorded; all intake keys mapped.

Both remain `visual_review_required`, `lifecycle: "none"`, `rendererReady: false`. An
implementation-gate pass is **not** promotion — Wisconsin still needs official-source/currentness
confirmation, counsel confirmation, and a separate explicit implementation task before any
renderer use.

### Blocked items and why

- **California CR-180** and **California CR-181** — `blocked_pdf_render`. The encrypted XFA PDFs
  fail the sample render with `Expected instance of PDFDict, but got instance of undefined`.
  They remain blocked unless that PDFDict issue is fixed.

### Needs source confirmation (22)

- **19 Colorado JDF drafts** and **3 North Carolina AOC-CR drafts** render cleanly, but they are
  auto-extracted candidate packets with **no recorded source PDF hash** and 100%
  `manual_review_required` candidates. Primary gap is source confirmation; the recorded
  secondary finding is manual overlay refinement (field mappings are not yet resolved).

## Non-promotion statement

This document and the gate are planning/evaluation only. They do not promote any jurisdiction or
form, do not mark anything renderer-ready, `replacement_candidate`, or `verified_replacement`,
do not alter lifecycle fields, and do not wire any renderer or live route. Every draft remains
blocked behind visual, source, implementation, counsel, and live-route gates.
