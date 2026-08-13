# RCAP Onboarding — Codespace Acceptance

Run date: 2026-08-13

Branch: `fix/rcap-onboarding-commercial-readiness`

Starting SHA: `5079b19f64ae6c20d3ee12b8d147469ae90d6474`

Acceptance partner: `Rythm Labs` (`rythm-labs-test`)

Environment: isolated GitHub Codespace, local Supabase CLI, and local Mailpit

This run supersedes the earlier external-hosting blocker. The complete Auth, Database,
Storage, email-capture, and browser lane ran inside the isolated Codespace. Vercel and a
hosted Supabase project were not used. Production was not accessed or changed.

## Environment record

| Item | Acceptance value |
| --- | --- |
| Portal | `http://127.0.0.1:3000` |
| Private forwarded portal | `https://obscure-guide-5vgg54p9vg7phrj9-3000.app.github.dev` |
| Supabase project reference | `local:legalease-rcap-acceptance` |
| Supabase API / database | loopback ports `54321` / `54322` |
| Mailpit | `http://127.0.0.1:54324` |
| Private forwarded Mailpit | `https://obscure-guide-5vgg54p9vg7phrj9-54324.app.github.dev` |
| Migration result | base migration plus 41 phase migrations; 42 applied, 0 failed |
| Database verification | 68 public tables, 123 RLS policies, 2 private Storage buckets |
| Feature flags | onboarding, prefill, and launch preparation enabled locally |
| Support destination | `partners@legalease.com` |

Migrations were applied in numeric phase and then letter-suffix order. No migration file
was created or changed. No production data was copied. The local email transport accepted
only `Roger@rythmlabs.com` and delivered it to Mailpit; it could not send externally.

Ports 3000 and 54324 are private Codespace forwards. They require access to this Codespace.

## Controlled data result

- Rythm Labs was seeded with the required spelling, slug, program name, service area,
  Lee Roman identity, and `Roger@rythmlabs.com` mailbox.
- `partner_records.onboarding_status` remains `in_progress`; the reviewed onboarding
  workspace reached `ready_to_launch`, never `live`.
- No launch date, address, contract, billing record, funding source, packet allocation,
  legal-services partner, or participant data was invented.
- The control tenant is `RCAP Control Partner`. Supporting `.test` identities were created
  through the local Supabase Admin API and received no email.
- No active access code was created or released. No participant program was activated.

## First-administrator result

The actual internal workflow created and reviewed the invitation for Lee Roman as
`partner_admin`, bound to `Roger@rythmlabs.com`, with a Preview-equivalent local callback,
72-hour expiration, revocation control, and single-use token. Exactly one invitation email
was delivered to Mailpit. Its setup link was accepted through the real Auth flow.

The final state contains one active Rythm Labs `partner_admin` membership, the invitation
is `accepted`, and replay creates no membership. Replay, expired, revoked, and wrong-email
states fail closed with the recovery text: “This invite link is no longer active. Please
request a new invitation.”

## A-1 through A-20

| Case | Result | Codespace acceptance evidence |
| --- | --- | --- |
| A-1 | PASS | One Mailpit message arrived and Lee Roman completed the real setup link |
| A-2 | PASS | Exactly one active Rythm Labs `partner_admin` membership |
| A-3 | PASS | Post-acceptance landing resolved to the Rythm Labs onboarding workspace |
| A-4 | PASS | Overview matched persisted completion, blocker, owner, next action, and status |
| A-5 | PASS | All eight sections completed through the partner workflow |
| A-6 | PASS | Debounced autosave persisted authoritative section state |
| A-7 | PASS | Save and Continue persisted and advanced to the next section |
| A-8 | PASS | Refresh, sign-out, sign-in, and return preserved work |
| A-9 | PASS | Prefill confirmed/modified/rejected states persisted without replacing reviewed values |
| A-10 | PASS | Private logo upload, preview, signed download, replacement, removal, and final upload |
| A-11 | PASS | Review submission persisted as `ready_for_review` |
| A-12 | PASS | Internal operator requested a field-specific change |
| A-13 | PASS | Lee Roman saw the request, replaced the value, responded, and resubmitted |
| A-14 | PASS | Internal operator resolved the request, approved all sections, and kept activation off |
| A-15 | PASS | Rythm Labs staff saw view-only controls and no administrator mutation action |
| A-16 | PASS | RLS, table privileges, Storage, and internal-route gates denied control-tenant access |
| A-17 | **FAIL** | Internal desktop/mobile preview is a private draft, but the shared public route returns HTTP 200; see S-1 |
| A-18 | PASS | Launch readiness remained `not_ready` and no screen claimed Rythm Labs was live |
| A-19 | PASS | Support action is named and opens `mailto:partners@legalease.com` |
| A-20 | PASS | Expired, revoked, replayed, and wrong-email states failed safely with recovery guidance |

A-17 is the single exact release failure. It is not worked around in the portal lane.

## Verification gates

All 23 onboarding verifiers, launch readiness, invitation and membership lifecycle,
partner-role, tenant authorization, RLS, private Storage, browser journeys, responsive and
accessibility smoke checks, lint, route type generation, typecheck, `npm test`, the
credential-free production build, the credentialed local production build, and
`git diff --check` passed. The database group ran against the local Supabase PostgreSQL;
the authenticated browser harness ran against its Auth and Storage services. Because the
Codespace command runner terminates a single long-lived build process, the credentialed
Next build used its supported compile and generate phases after a separate successful
typecheck; both phases completed and produced the runnable production output.

## Visual parity

Verdict: the portal feels like the organizational side of Expungement.ai inside the
established partner-dashboard shell.

The browser comparison confirmed the same warm background, white surfaces, navy hierarchy,
teal progress and completion treatment, restrained orange status emphasis, neutral borders,
compact radii and shadows, plain-language helper text, and one-task-at-a-time form pacing.
The portal does not introduce a second app shell, hero treatment, gradients, glass effects,
ornamental icon clutter, or consumer checkout language.

## Responsive and accessibility

The authenticated portal passed at 390px, 768px, 1440px, and 200% zoom. Checks covered
keyboard navigation, visible focus, logical headings, accessible names, label association,
required-field communication, status announcements, touch targets, reduced motion,
horizontal overflow, and long organization, email, and blocker content.

One confirmed portal-only overflow defect was fixed by applying long-text wrapping to all
onboarding page roots and to the configured support-address link. The affected browser
journey and source verifier pass after the correction. No accessibility dependency
was added; the repository's existing Playwright tooling and a manual semantic/contrast smoke
test were used.

## Evidence index

The evidence directory is intentionally uncommitted:
`/tmp/rcap-hosted-acceptance/evidence/`. It contains exactly 12 sanitized screenshots.

| # | Screenshot | Functional case | Visual criterion | Responsive / accessibility criterion |
| --- | --- | --- | --- | --- |
| 1 | `01-expungement-reference-desktop.png` | visual baseline | consumer product family | 1440px reference |
| 2 | `02-expungement-reference-mobile.png` | visual baseline | mobile pacing and control language | 390px reference |
| 3 | `03-rythm-invitation-mailpit.png` | A-1, A-20 | clear invitation hierarchy | token obscured; recovery copy |
| 4 | `04-rythm-administrator-active.png` | A-2, A-3 | dashboard team language | role/status names |
| 5 | `05-onboarding-home-desktop.png` | A-3, A-4, A-18, A-19 | shell, progress, blocker, support | 1440px, heading order, names |
| 6 | `06-dense-onboarding-section-mobile.png` | A-5, A-7 | guided form rhythm | 390px, touch, no overflow |
| 7 | `07-private-logo-upload-preview.png` | A-10 | asset-card and field hierarchy | named upload/download controls |
| 8 | `08-submitted-state.png` | A-11 | review and save-state treatment | table headings and status announcement |
| 9 | `09-change-request-resubmission.png` | A-12–A-14 | blocker/correction treatment | clear status and field association |
| 10 | `10-staff-view-only.png` | A-15 | role clarity | no inaccessible disabled admin action |
| 11 | `11-co-branded-mobile-preview.png` | A-17 | product-family preview | 390px internal scroll preview |
| 12 | `12-cross-tenant-denial.png` | A-16 | fail-closed state | concise denial, no tenant disclosure |

No screenshot contains a full token, password, cookie, secret, service-role key, production
information, or participant data.

## Deferred shared-path patch specification

### S-1 — unpublished partners are rendered by the public co-branded route

- **Exact file:** `src/app/p/[partnerSlug]/page.tsx`
- **Exact symbol:** `CoBrandedPartnerPage`
- **Exact defect:** the route renders every existing `partner_records` row. It does not
  consult an authoritative publication/activation state and emits no partner-specific
  `robots: noindex` guard. `GET /p/rythm-labs-test` therefore returns HTTP 200 while the
  workspace is not live and the draft is explicitly unpublished.
- **User impact:** an internal acceptance partner can be reached by its guessed URL and may
  be indexed, contradicting unpublished, unindexed, and inactive status.
- **Minimal patch:** resolve an authoritative public-page eligibility state before rendering;
  return `notFound()` unless both publication and activation are approved; generate robots
  metadata from that same state. Preserve an explicit legacy-live path rather than treating
  record existence as publication.
- **Acceptance test:** an inactive/unpublished fixture returns 404 and no indexable page;
  a separately approved live fixture returns 200; sitemap/public navigation omit the former;
  the internal co-branded preview remains available.
- **Why shared change is required:** this is the shared participant-facing route and the
  current schema has no independent authoritative publication flag in `partner_records`.
- **Session A:** yes. It must wait for Session A or the later shared integration lane.

## Release bookkeeping

`SUPPORT_MAILBOX_MONITORING_PENDING: yes`

The `partners@legalease.com` action works. External SMTP delivery, monitored-inbox receipt,
named ownership, and reply confirmation are post-merge canary checks and are not blockers to
this isolated acceptance run.

`FINAL_MAIN_SYNC_PENDING_SESSION_A: yes`

PR #90 must remain draft and unmerged until the later main-sync assignment. Production,
Session A's branch, nationwide files, packet delivery, consumer payment, Briefcase, credits,
migrations, scope guards, package files, and `src/lib/partners/partner-onboarding.ts` were
untouched.
