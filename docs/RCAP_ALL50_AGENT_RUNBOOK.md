# RCAP All-50 Agent Runbook

## Scope

Work only on RCAP state coverage, official PDF overlays, custom pleadings, guidance packets, review artifacts, verifiers, manifests, and internal preview support.

Do not work on the new Expungement.ai UI.

## Default Workflow

1. Start from the repo docs and manifest, not chat memory.
2. Run or update `npm run rcap:ingest-nationwide`.
3. Run or update `npm run rcap:build-all50`.
4. Generate review artifacts with `npm run rcap:generate-review-artifacts`.
5. Verify with `npm run rcap:verify-all50-build`.
6. Run lint, typecheck, relevant tests, and focused RCAP verifiers.
7. Commit scoped work intentionally. Never use `git add .`.

## Nationwide Ingestion Rules

Use `private/Nationwide Record Clearing/` as the source inventory. Normalize state names and common folder misspellings. Every state plus DC must have an entry. If a resource is missing, mark it explicitly and keep building.

Do not block ingestion on visual review, counsel review, source freshness review, or Roger approval.

## State Build Rules

Each state should receive:

- source inventory
- build status
- review status fields
- loop history
- strategy candidates
- output artifact paths
- missing resource notes where needed

Build status can advance to `state_built` before visual/counsel/source review. Review statuses carry those pending states separately.

## Official PDF Overlay Factory

For states with official PDFs:

- classify PDFs where possible
- draft field-map candidates
- render overlay samples where feasible
- record failures as retry items
- generate visual review artifacts

Visual approval is not required to create draft maps, samples, manifests, or review packets. Visual approval is required only before `approved_for_live` or `live`.

## Field-Map Retry Loop

Retry field mapping using conservative signals:

- AcroForm field names
- widget rectangles
- known state-pack required fields
- form title and form number
- nearby text where available
- manual placeholder targets when no safe match exists

Each retry should preserve uncertainty instead of inventing semantic certainty.

## Custom Pleading Factory

For pleading states/tracks, draft packets from Nationwide references and coded state-pack materials. Use state-specific relief vocabulary. Keep missing data explicit. Do not represent drafts as attorney-approved.

## Guidance Packet Fallback

Every state gets guidance output. If overlay or pleading output is incomplete, guidance keeps the state usable for internal review and QA planning.

Guidance packets should include:

- relief vocabulary
- source inventory summary
- likely filing path or agency path where known
- missing-data list
- safe disclaimers
- review checklist

## Packet Render QA Loop

Run structural QA on generated packets:

- state name present
- relief vocabulary present
- missing fields are not fabricated
- disclaimers present
- output path recorded
- legacy generator preservation verified
- Expungement.ai UI untouched

## Review Artifact Loop

Generate post-build review packets for:

- attorney/counsel review
- visual overlay review
- source inventory review
- build QA
- internal preview QA

Review artifacts should be generated early and regenerated often.

## Internal Preview Loop

Internal previews are allowed. Do not expose unapproved new-engine output to live users. Live routing requires separate approval and live-gate verification.

## Worktree Separation

Stay in this worktree. Do not edit another agent's active worktree. Avoid concurrent edits to the same manifest/scripts. If another agent has active unmerged changes in a shared file, coordinate through the user or commit boundaries.

## Approval Gates

Ask Roger only for production deployment, direct push to main, live Supabase migrations, Supabase RLS/auth/session changes, Stripe live-mode behavior, production env/secrets, destructive changes, another active worktree, or legacy-generator-breaking changes.
