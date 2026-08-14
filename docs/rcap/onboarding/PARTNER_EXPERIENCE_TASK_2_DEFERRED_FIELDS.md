# Task 2 deferred shared-field enhancements

Task 2 keeps the existing section model, persistence RPC, RLS, and migration
history unchanged. The current safe partner contract supports a truthful
section-level correction experience, but it cannot support a custom partner
response or an authoritative field-level target.

## Structured change-request target

- Exact prohibited file: `supabase/phase-43-rcap-partner-onboarding-phase1.sql`
- Exact symbols: `public.partner_onboarding_change_requests` and
  `public.partner_onboarding_change_requests_safe`
- Exact defect: a request stores `section_id` and
  `partner_safe_instructions`, but no field key, field path, collection row
  identifier, or structured target is stored or exposed by the partner-safe
  view.
- User impact: a partner can open the affected section and a truthful requested
  update task, but the portal cannot claim that one field is authoritative or
  focus that field from the request.
- Proposed minimal patch: add a new forward-only migration with a nullable
  `target jsonb` value validated against this payload. Do not edit the historical
  phase-43 migration.

```json
{
  "kind": "field",
  "section_key": "program_goals",
  "field_key": "target_population",
  "field_path": "target_population",
  "stable_row_id": null
}
```

  The migration should validate that `section_key` matches the request's
  section and that `field_key` belongs to that canonical section. The safe view
  should expose only this validated target. `service.ts` symbol
  `mapPartnerChangeRequest` can then map it to `targetFieldKey`; the existing
  guided contract will deep-link, focus, and identify the owning substep.
- Required acceptance test: create one structured request for
  `program_goals.target_population`; a Rythm Labs administrator opens the
  Implementation Center link and lands on
  `?step=target-population#field-target-population`; the requested field has a
  visible text treatment and associated request details; a section-level
  request still opens `?step=requested-update`; a request targeting a field in
  another section is rejected; another tenant cannot read the target or the
  request.
- Why this waits for Session A: the change requires a migration, safe-view
  contract, RLS-sensitive service contract, and shared authorization tests,
  all explicitly owned by Session A during Task 2.

## Focused partner response

- Exact prohibited file: `supabase/phase-43-rcap-partner-onboarding-phase1.sql`
- Exact symbol: `public.rcap_service_save_onboarding_section`
- Exact defect: when a corrected section is submitted, the RPC writes the fixed
  string `Updated section submitted for review.` to `partner_response`. The
  current RPC has no partner-response parameter.
- User impact: the portal can preserve and display the authoritative response
  history, but it cannot truthfully offer a focused free-text response input.
  The partner must correct the saved section and use the existing resubmission
  response.
- Proposed minimal patch: add a new versioned RPC or a backward-compatible
  nullable `p_partner_response` parameter, validate and normalize a plain-text
  response with a documented length limit, and store it only when the active
  request and section belong to the caller's partner. Extend
  `src/lib/partners/onboarding/service.ts` symbols `SaveSectionInput` and
  `savePartnerOnboardingSection`, plus the existing section POST route, to pass
  the value through the same authoritative save operation. Do not add a second
  response endpoint or persistence path.
- Required acceptance test: the administrator corrects the requested section,
  enters a response, and resubmits once; the same idempotency request produces
  one stored response; blank and over-limit responses fail with field-specific
  copy; staff cannot respond; a different tenant cannot update or read the
  request; the resolved response remains in history and is no longer a current
  blocker.
- Why this waits for Session A: the required RPC signature, RLS-sensitive write,
  migration registration, and shared tenant-authorization checks are prohibited
  Task 2 paths.

Until these changes are authorized, the portal deliberately says that the
request applies to this part of the section, does not infer a field from prose,
and explains that successful corrected-section submission records the current
authoritative response.
