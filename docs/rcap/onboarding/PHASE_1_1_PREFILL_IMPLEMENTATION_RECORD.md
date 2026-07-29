# RCAP Partner Onboarding Phase 1.1 prefill implementation record

## Baseline and authoritative sources

- Base: PR #80 merge `720bf107108fdac1f160af719427e810d11e4494`.
- Existing workspace: `partner_onboarding`, with immutable `partner_record_id`, aggregate CAS, eight versioned sections, normalized contact/user/recipient rows, activity, integration outbox, and idempotency records.
- Safe import sources: `partner_records` organization/program/contact/geography fields; active `partner_users` membership email/role data; Phase 42 partner-page configuration and bounded agreement/order-form contact metadata; selected package and `partner_entitlement` only as authoritative read-only context. Commercial values, allocations, credits, payment state, agreement acceptance, and internal notes never become editable suggestions.
- Manual meeting, email, kickoff, proposal, and other inputs are accepted only as a chosen canonical field, a validated structured value, and a short internal source label. Raw notes, messages, transcripts, recordings, documents, and automatic model extraction are not stored or processed.

## Canonical field and value rules

`ONBOARDING_SCHEMA_REGISTRY` remains the only field registry. Prefill targets must be top-level, partner-editable, active registry fields and must pass the existing section Zod normalization and validation. Phase 1.1 adds only an explicit denial policy for authorization, e-signature-equivalent, commercial, allocation, payment, legal-boundary, internal-only, and LegalEase-controlled fields. It adds no second field schema and accepts no JSON patch.

## Data model and migration

Migration: `supabase/phase-44-rcap-onboarding-prefill.sql`.

- `partner_onboarding_prefill_batches`: one tenant/workspace-scoped review batch with the required lifecycle, actor stamps, timestamps, and batch CAS version.
- `partner_onboarding_prefill_values`: one canonical section/field suggestion with structured proposed value, internal provenance, confidence, captured base hash/revision, apply evidence, and independent partner-review state.
- Both tables use foreign keys, read-path indexes, RLS, explicit grants, and server-only mutation RPCs. A column-bounded partner-safe view exposes only applied field/status metadata; it excludes proposed values and all internal provenance.
- Existing activity and integration-event constraints gain only bounded prefill event types. No delivery is added.

## UI and workflow

- Internal location: a Prefill panel on the existing `/internal/partners/onboarding/[partnerSlug]` Phase 1 detail page, with import, typed structured suggestion creation, review, apply preview, explicit apply confirmation, conflicts, and partner-review counts.
- Partner changes: the existing home, section editor, and final review gain a calm prefill banner/status, subtle field markers, `Confirm and continue`, staff view-only treatment, and pending-review submission blocking. No new portal or permanent section status enum is added.
- Apply rule: internal session identity and immutable workspace relationship are revalidated; workspace and section CAS, approved status, editable state, active canonical field, base hash/revision, and pending partner-review protection are checked. Only selected conflict-free values are written atomically. Confirmed/modified/rejected values cannot be silently overwritten; a new reviewed suggestion or the existing change-request workflow is required.
- Confirmation rule: apply leaves `partner_review_status=pending`. A partner administrator completing the existing section atomically classifies each applied value as confirmed, modified, or rejected, records one section-level activity event, and emits one PII-free local outbox event. Staff cannot confirm.
- Derivation rule: commercial block, open change request, pending prefill, incomplete section, required asset/procurement, ready-for-review, LegalEase review, launch, and history states retain deterministic priority. Final submission is unavailable while applied prefill is pending.

## Expected change surface

- `.env.example`
- this record and the additive Phase 44 migration
- onboarding feature, types, derivation, service/prefill service, and focused prefill modules
- one explicit internal prefill API route
- existing internal detail, partner home, section, and review surfaces plus one colocated internal panel
- explicit RCAP/final-approval allowlists
- focused domain, service, database/RLS/security, and UI verifiers and package scripts

## Out of scope

- Command Center integration or event delivery
- AI/model extraction, providers, secrets, or external calls
- invitations, email, publishing, access-code release, payment changes, entitlement changes, activation, pause, launch, or deployment
- remote migration application or any production/staging database access
- Phase 2 document generation
