# Official PDF Field Mapping Playbook

This playbook defines the repeatable docs and review process for states that require mandatory official court PDF output. It is intentionally limited to mapping and review discipline. Mapping work must not touch live routes, code paths, migrations, billing, auth, admin, Stripe, Supabase RLS, feature flags, or package files.

## Scope

Use this process when a state workflow must eventually produce an official court PDF, but the field placement has not yet completed visual review and lifecycle promotion.

The mapping phase may produce draft coordinates and review artifacts locally, but committed work should be limited to source-controlled mapping documentation or draft mapping files that remain gated behind `visual_review_required`. Do not commit raw PDFs, temporary review PDFs, screenshots, generated overlays, or other local review artifacts.

## Required Process

1. Inspect PDF quality.

   Confirm whether the official PDF has usable embedded fields, damaged or misleading AcroForm metadata, scanned pages, inconsistent page boxes, unusual rotation, stale source material, or visual features that make automated placement risky. Record any quality concerns in the mapping notes.

2. Choose a mapping mode.

   Select one of these modes before drafting the map:

   - `acroform`: Use only when embedded fields are clean, stable, complete, and visually verified against the official form.
   - `overlay`: Use when coordinates should be placed directly on the rendered official PDF because embedded fields are absent, incomplete, or unsafe.
   - `hybrid`: Use when embedded field metadata can help identify intent, but final placement must be reviewed as an overlay against the rendered form.
   - `manual_review`: Use when the form quality, ambiguity, or legal sensitivity makes automated mapping unsafe without human review before further implementation.

3. Create the draft field map.

   Build a draft map from official source material and rendered-page inspection. Keep field names descriptive, jurisdiction-specific where needed, and traceable to the official form labels. Treat all coordinates as provisional until visual review is complete.

4. Generate a review PDF.

   Produce a local review PDF or equivalent rendered overlay that makes every mapped field visible enough for inspection. This artifact is for review only. Do not commit it.

5. Keep status `visual_review_required`.

   Draft mapping status must remain `visual_review_required` while placement has not been visually approved. This is true even if the map was produced from AcroForm fields or appears correct in a local render.

6. Commit draft mapping without visual approval only when gated.

   Draft coordinate commits are acceptable before visual approval only if the lifecycle/status remains `visual_review_required` and the change cannot be used as verified replacement output.

7. Batch visual review later.

   Visual review may be batched across states or forms. The review should compare generated output against the official PDF page by page, with special attention to captions, checkboxes, signature blocks, dates, party names, court names, and any fields near dense form text.

8. Promote only after required confirmations.

   Move a mapping to `replacement_candidate` only after all of the following are complete:

   - Visual review confirms field placement.
   - Source freshness is confirmed against current official court materials.
   - Counsel confirmation is recorded for the workflow and form use.

9. Never mark `verified_replacement` during mapping.

   Mapping work alone cannot establish `verified_replacement`. That lifecycle state is reserved for later verified replacement work after the required review, freshness, counsel, and release criteria are satisfied.

## Hard Rules

- Never touch live routes during mapping.
- Never route new-engine output live unless lifecycle is already verified through the required replacement process.
- Never brand court forms, add product marks, or alter official court form presentation except for user-provided field values.
- Never commit raw official PDFs.
- Never commit temporary review PDFs, generated overlay artifacts, screenshots, or scratch files.
- Never treat dirty AcroForm output as proof of correctness.
- Never use mapping work to bypass source freshness or counsel confirmation.

## Nebraska Lesson Learned

Nebraska showed that dirty AcroForms can exist but still be unsafe to rely on. Embedded fields may look useful while carrying bad names, misleading positions, incomplete coverage, or layout assumptions that do not survive rendered review.

For Nebraska-style forms, overlay review inside `hybrid` mode may be safer than trusting AcroForm data directly. AcroForm metadata can help identify likely field intent, but rendered overlay placement should remain the review source of truth.

Top captions are the easiest place to misplace fields because small vertical offsets can make a party name, court caption, county, or case heading look attached to the wrong label. Review those regions at high zoom and compare against the official form text.

Draft coordinate commits are acceptable while status remains `visual_review_required`. The safety boundary is the lifecycle gate: coordinates may be preserved for later review, but they must not be promoted or treated as replacement output before visual approval, source freshness, and counsel confirmation.
