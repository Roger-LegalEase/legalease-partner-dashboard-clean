# Expungement.ai and RCAP — Grade-A Product Contract

**This document is the authority.** Where it and an implementation disagree, this
document is the specification and the implementation is the defect. Where it and
any other document in this repository disagree — status reports, lane manifests,
build plans, promotion manifests — this document governs.

It defines the optimized target state. It is **not** evidence that any hosted
acceptance case has passed. The implementation still requires a repository-level
traceability and acceptance audit against it.

The governing rule:

> **Screening may be anonymous. A Briefcase may not be anonymous. A pending
> result becomes a matter only when it is securely and atomically claimed by the
> authenticated participant.**

That rule is not customer-facing language. It must be enforced in the vocabulary,
the database schema, the authentication handoff, the authorization policies, the
payment logic, the sponsorship logic, the analytics, Clinic Mode, and the
acceptance tests.

---

## 1. Five distinct product objects

The product must stop using "result", "matter" and "Briefcase" interchangeably.

| Object | Exists before authentication? | Owner | Purpose |
|---|---:|---|---|
| **Anonymous screening session** | Yes | None | Temporary state while the person answers free screening questions |
| **Pending result** | Yes, temporarily | None | Server-held, claimable snapshot of the screening result and route context |
| **Account** | Possibly unverified during signup | User after successful authentication | Identity and access boundary |
| **Matter** | No | Authenticated participant | Durable workflow for one record-clearance issue |
| **Briefcase** | No | Authenticated participant | Private workspace displaying that participant's matters, documents, tasks, and history |

A pending result is not a lightweight matter. It is a separate temporary object
with a separate lifecycle.

A matter can exist without a packet. Waiting-period guidance, automatic relief,
referral, missing-information, and unsupported outcomes can still become saved
matters after authentication. "Matter" means a participant-owned workflow, not
"a packet is available."

### Database-level invariants

These rules must be impossible to violate, even through a defective screen:

```text
matters.owner_user_id              NOT NULL
briefcases.user_id                 NOT NULL and UNIQUE
matters.source_pending_result_id   UNIQUE
artifacts.matter_id                NOT NULL
entitlements.matter_id             NOT NULL
payments.matter_id                 NOT NULL
```

There must be no `anonymous_owner`, placeholder clinic owner, partner-owned
participant matter, or staff-owned Briefcase.

The Briefcase should preferably be the authenticated presentation of a user's
matters, rather than a second copy of matter status. If a separate
`briefcase_items` table remains necessary, it must reference the canonical matter
and must not duplicate route, payment, verification, or packet state.

---

## 2. Critical corrections

### Correction 1 — do not call the pre-authentication object a "matter"

Replace every pre-authentication reference to *your matter*, *save this matter*,
*your Briefcase*, or *your saved case* with *your preliminary result*, *save my
result*, or *continue with this result*.

The exact CTA is:

> **Save my result and continue**

Only after the claim transaction succeeds may the product use "matter" and
"Briefcase".

### Correction 2 — reorder the detailed RCAP participant journey

```text
Partner or Clinic entry
→ optional assisted-intake consent
→ screening
→ preliminary result
→ participant creates an account or signs in
→ result is claimed
→ participant-owned matter and Briefcase
```

An RCAP participant may create an account before screening by choice, but the
product must not require that as the default entry experience.

### Correction 3 — account verification is an interrupted continuation, not a new visit

Signup, email verification, password reset, OAuth callback, magic-link callback,
and existing-account sign-in must all preserve the pending result.

The user must never return to the public homepage, restart the screening,
re-enter answers, land on an empty Briefcase, receive a generic "Welcome"
dashboard, or lose partner or event attribution.

Authentication is an interstitial step inside the screening journey, not a
separate funnel.

### Correction 4 — do not create a Briefcase merely because an auth record exists

An unverified account record may exist temporarily during signup, but it must not
yet receive a matter, a Briefcase, uploads, packet documents, payment authority,
or sponsorship authority.

The claim occurs only after the authentication provider confirms that the user
has successfully authenticated and, where required, verified the account.

### Correction 5 — separate payment history from packet-generation authority

A successful payment is a durable financial record. It is not permanent authority
to generate any future packet configuration.

A material answer change must:

1. preserve the payment record;
2. invalidate the current verification snapshot;
3. invalidate stale packet-generation authority;
4. run final verification again;
5. permit regeneration without a second payment when the same matter remains supported;
6. trigger support or refund handling if the matter can no longer produce the purchased packet.

This prevents both double charging and generation from stale legal facts.

### Correction 6 — do not describe the public screening as a "record check"

The system asks the participant questions; it does not query an authoritative
criminal-record source. Use:

> **Check your record-clearing options for free. No account required.**

or *"Take a free record-clearance screening."* Reserve "record search" and
"record check" for when the product actually retrieves records.

---

## 3. Corrected Expungement.ai flow

```text
PUBLIC EXPERIENCE
Public landing page
→ select jurisdiction
→ temporary anonymous screening session
→ state-specific screening questions
→ server evaluates preliminary result
→ preliminary result displayed
→ "Save my result and continue"

AUTHENTICATION HANDOFF
→ create account or sign in
→ verify account when required
→ server atomically claims pending result
→ create or reuse participant's Briefcase
→ create exactly one participant-owned matter
→ preserve screening answers, route context, locale, and attribution
→ redirect directly to /briefcase/matters/{exact_matter_id}

AUTHENTICATED MATTER EXPERIENCE
→ packet-information completion
→ Review and Edit
→ final server-side verification
→ verified packet-ready outcome
→ exact-matter $50 checkout
→ verified payment event
→ exact-matter entitlement
→ durable packet-render job
→ validated private packet
→ delivery to the participant's Briefcase
```

### Already-authenticated variation

A signed-in participant beginning a new screening still requires an intentional
save action before a matter is created:

```text
Preliminary result → "Save to my Briefcase and continue" → atomic claim → exact matter
```

Do not silently create matters for every abandoned or experimental screening
performed by a logged-in user.

---

## 4. Corrected RCAP and Clinic Mode flow

```text
RCAP ENTRY
Co-branded page, sponsored link, event link, QR, or access code
→ server validates partner, program, event, geography, and attribution
→ optional assisted-intake consent
→ temporary assisted or unassisted screening session
→ same state-specific screening engine
→ same preliminary legal result

PARTICIPANT OWNERSHIP
→ "Save my result and continue"
→ participant creates their own account or signs in
→ participant verifies the account when required
→ pending result is atomically claimed
→ matter belongs to participant
→ Briefcase belongs to participant
→ partner/event attribution is preserved
→ staff receives only the permitted, consented operational access

PACKET WORKFLOW
→ packet-information completion
→ same Review and Edit experience
→ same final verification threshold
→ server confirms sponsorship authority
→ no consumer checkout
→ matter-level sponsored entitlement
→ packet generation
→ packet delivered to participant's Briefcase
→ limited partner follow-up
→ assisted access expires
→ End Clinic Session / Reset Device
```

The legal result must remain identical across the consumer and sponsored
channels. Sponsorship changes who pays — not the route, verification threshold,
packet family, or legal outcome.

---

## 5. Before- and after-authentication permissions

| Capability | Before authentication | After successful claim |
|---|---:|---:|
| Complete preliminary screening | Yes | Yes |
| View preliminary result | Yes | Yes |
| Maintain temporary server-side result | Yes | Not needed after claim |
| Create persistent matter | No | Yes |
| Create or open Briefcase | No | Yes |
| Save durable packet progress | No | Yes |
| Upload documents permanently | No | Yes |
| Receive reminders | No, unless a separate informed consent mechanism exists | Yes, with preferences |
| Run final verification | No | Yes |
| Open checkout | No | Only when verified packet-ready |
| Receive sponsorship entitlement | No | Only after final verification |
| Generate personalized packet | No | Only with current entitlement |
| Download packet | No | Authenticated owner only |
| Grant staff assisted access | Temporary consent may begin | Yes, but only scoped and revocable |

Public screening collects only facts needed to identify a possible route. Exact
court details, case numbers, certified dispositions, uploads, service details,
and form-specific fields belong after authentication, in packet information.

---

## 6. Stage-by-stage consumer experience

### Stage 1 — Landing page

The first screen answers four questions immediately: what this does, whether it
is free to start, whether an account is needed, and when payment happens.

> **Find out what record-clearing options may be available to you.**
> Complete a free screening. No account is required to start.

> Your screening and private Briefcase are free. You pay $50 only when a specific
> matter has completed packet information, passed final verification, and is
> ready to generate.

Primary CTA: **Check my options**. Avoid competing CTAs — "Learn more", "Create
account", "Get started", "Start screening" — in the same visual hierarchy.

### Stage 2 — Free screening

One primary decision per screen during route discrimination; grouped sections are
acceptable later for exact packet information.

The screening provides a clear phase indicator ("Free screening", not a
misleading percentage), plain-language definitions in place, "Not sure" only
where uncertainty can be handled safely, visible Back and Continue controls,
server-backed temporary continuity after refresh, no account pressure before
value is delivered, and no repeated questions after a previous answer resolved
the fact.

Because routes branch dynamically, "Question 4 of 10" and "40% complete" become
inaccurate. Use a stage indicator:

```text
1. Free screening
2. Save your result
3. Complete details
4. Verify
5. Generate packet
```

**Data minimization.** Do not collect a full name, exact date of birth, Social
Security number, case number, court document, or sensitive upload merely to
calculate a preliminary route when those facts are not necessary.

Do not put screening answers in URLs, browser history, analytics properties,
session-replay tools, client error-report payloads, or support chat transcripts
by default.

### Stage 3 — Preliminary result

Five consistent sections: a **Preliminary result** certainty label; the outcome;
two or three plain-language reasons the result appeared, without internal rule
syntax; what still has to be verified; and one primary action.

Never display "You qualify" or "You are eligible" before final verification.

Primary action: **Save my result and continue**. Secondary: *Start a new
screening*. Checkout never appears here.

### Stage 4 — Authentication handoff

> **Save this result to your private Briefcase**
> Create a free account or sign in. We will bring you directly back to this result.

Ask only for what the account needs. Collect packet names, addresses, court facts
and identity details later. Detect an existing email and move into sign-in
without dropping the pending result. Support password managers and pasted
verification codes. Keep the pending result valid through password reset and when
the verification email opens on another device. Do not reveal criminal-record
details on the authentication screen.

WCAG 2.2 includes criteria on redundant entry and accessible authentication,
making those appropriate acceptance targets for this flow.

### Stage 5 — Claim confirmation and exact-matter landing

```text
Authentication completes → brief "Saving your result" state → exact matter opens → confirmation banner
```

> **Your matter has been saved to your Briefcase. Complete the remaining
> information so we can verify your case and prepare the correct packet.**

The user lands at `/briefcase/matters/{matter_id}` — never `/briefcase`,
`/dashboard`, `/welcome`, or `/account`.

The matter screen shows jurisdiction, preliminary pathway, current status, what
has been answered, what remains, next action, price only when contextually
appropriate, sponsorship status for RCAP, and last saved status.

### Stage 6 — Packet-information completion

Sections: About you · Your case · Court and case number · Outcome and dates ·
Sentence or program completion · Financial obligations · Other cases and prior
relief · Required documents · Filing details.

Each section shows one of: Not started · In progress · Complete · Needs attention.

**Autosave must be truthful**: `Saving…` / `Saved` / `Could not save. Try again.`
Never display "Saved" from a client-side state update before the server confirms
persistence.

Known screening facts prefill the packet workflow. Never make the participant
answer the same question again because the second screen uses different wording.

### Stage 7 — Review and Edit

A structured facts summary, not another questionnaire. Each row: plain-language
label, current answer, required or optional, missing or conflicting status, edit
action.

Edit opens the exact question, prefills the existing answer, saves, and returns
the participant to the same review position. A material edit recomputes route and
packet requirements and invalidates stale verification.

Translate internal states into customer states. Not *Held for Correction*, *Held
for Environment*, *Route mismatch*, *Form family unavailable*, *Verification
snapshot invalid* — instead: *We need one correction* · *We are updating this
packet* · *This matter needs review* · *We cannot prepare this packet yet* · *We
need additional information*. Internal status may remain available to authorized
operations staff.

### Stage 8 — Final verification

Server-authoritative and versioned. It binds:

```text
matter_id · owner_user_id · exact fact snapshot · route contract version
legal-rule version · waiting-period calculation · packet family
form-set version · form-set hash · verification timestamp · verification outcome
```

Only `VERIFIED_PACKET_READY` may enter consumer checkout or sponsored
entitlement.

Any change to the legal route, an eligibility fact, the timing anchor, a
completion date, pending cases, prior relief, packet family, form set,
participant identity used on forms, sponsorship applicability, or service and
notice requirements invalidates the snapshot.

### Stage 9 — Payment or sponsorship

**Expungement.ai.** The checkout record binds authenticated owner, matter,
verification snapshot, packet family, form-set hash, amount, currency, price
version, and return route.

The participant must never be able to write or modify payment status, amount,
currency, entitlement, sponsorship status, render authority, or packet-ready
status. Only a verified server-side payment event creates the payment record and
entitlement.

**RCAP.** Verified packet ready → validate sponsor eligibility → create sponsored
entitlement → generate packet. No Stripe button and no consumer price when valid
sponsorship applies.

**Sponsorship reservation.** Create a non-consuming sponsorship reservation when
the participant claims a result under a valid event. The packet credit is still
consumed only upon first successful generation. This prevents a participant who
began during a valid event from being unexpectedly charged because the event
ended while they completed their information.

### Stage 10 — Generation and delivery

Visible states: *Payment or sponsorship confirmed* → *Preparing your packet* →
*Packet ready*.

Rendering is a durable server-side job; closing the browser must not cancel it.

The artifact is validated before delivery, stored privately, bound to one matter,
accessible only to the authorized owner, delivered through a short-lived
authorized download, and reusable for repeat downloads without a second payment
or credit.

On render failure: do not display "Packet ready"; do not charge again; do not
consume another credit; retry safely with the same idempotency key; preserve the
participant's work; route prolonged failures to support; apply the approved
refund or manual-fulfillment policy when delivery is impossible.

---

## 7. Secure pending-result claim architecture

### The record

```text
pending_result_id · anonymous_session_id · answer_snapshot · jurisdiction
preliminary outcome class · candidate route context · locale
partner/program/event attribution, when applicable
consent reference, when applicable
created_at · expires_at · claim_token_hash
status: pending | claimed | expired | revoked
```

It must **not** contain a Briefcase identifier, a participant owner, a permanent
upload, payment status, an entitlement, an artifact, or a final verification
snapshot.

### Lifecycle

Public anonymous session: short inactivity timeout. DTC pending result:
recommended initial claim window of 24 hours. Shared-device assisted session:
shorter inactivity timeout and an explicit session-end requirement. Unclaimed
records: automatically deleted or irreversibly de-identified after the approved
retention period. Claimed records: retained only as necessary for audit lineage,
with redundant sensitive payload removed where possible.

Customer-facing copy says "No account required" rather than promising perfect
anonymity while infrastructure logs and fraud controls still process technical
data.

### Claim token

Cryptographically random · opaque · single purpose · single use · short lived ·
stored hashed at rest · bound to the pending result · excluded from analytics and
application logs · stripped from the browser URL immediately after use ·
protected against replay · protected against open-redirect manipulation. Never
stored in `localStorage`.

OWASP distinguishes anonymous and authenticated sessions and warns that session
disclosure or fixation leads to account impersonation. The authentication
transition therefore requires session rotation and a deliberate binding step, not
reuse of an anonymous browser session as authenticated ownership.

### The atomic claim transaction

```text
BEGIN
1. Confirm authenticated and verified user.
2. Lock pending result.
3. Confirm token hash, purpose, status, and expiration.
4. Confirm pending result has not been claimed by another user.
5. Create or reuse that user's Briefcase.
6. Create matter using source_pending_result_id as an idempotency key.
7. Copy the screening snapshot and route context.
8. Preserve partner, event, campaign, locale, and consent context.
9. Mark pending result claimed.
10. Record append-only audit event.
COMMIT
Return exact matter_id. Redirect directly to exact matter.
```

**Idempotent retry.** Already claimed by the same user → return the existing
matter. Claimed by another user → deny without revealing who claimed it. Two
simultaneous clicks → one matter. Browser refresh during claim → the same matter.
Multiple authentication callbacks → the same matter. Expired pending result →
explain and start a new screening. Failed transaction → neither a partial matter
nor an orphaned Briefcase item.

---

## 8. Authentication standards

**Participants.** Verified email with password; verified email link; passkey
where supported; verified mobile as an approved accessibility option with
documented recovery and risk controls; password manager support; no security
questions based on personal history; risk-based reauthentication for sensitive
account changes.

Do not force routine MFA on every participant session unless risk analysis
requires it. Do require recent authentication for high-risk actions: changing
primary email or phone, resetting authentication after recovery, adding an
authorized representative, downloading documents after a suspicious login, and
changing ownership-related information.

**Staff, partner administrators, LegalEase administrators.** Individual accounts
only; mandatory MFA; passkey or WebAuthn/security-key option; no shared event
credentials; short privileged-session lifetime; reauthentication for role or
access changes; immediate revocation during offboarding.

NIST SP 800-63-4 explains that manually entered OTPs are not phishing-resistant
because they are not cryptographically bound to the authentication session. Staff
and administrative access must include a phishing-resistant option rather than
treating SMS or emailed codes as the strongest available control.

---

## 9. RCAP Clinic Mode architecture

### Preferred: two-device separation

```text
Staff device       → partner dashboard, queue, event operations
Participant device → participant screening, authentication, Briefcase, packet work
```

Staff pair an assisted session using a short-lived code or QR. The participant
authenticates directly on the participant device. This avoids mixing staff and
participant cookies, privileges, documents, browser history, and download
permissions.

### One-device fallback

Staff starts an assisted Clinic session; staff identity and event are recorded;
the staff interface is locked; the participant takes control of the screen;
credentials are entered privately; the participant session uses an isolated
cookie and authorization context; staff assistance operates through a scoped
consent grant, not impersonation; session completion triggers server-side
revocation and browser reset; staff returns to the Clinic shell without
recovering participant content.

Use separate origins or carefully isolated host-only cookies for staff and
participant contexts. Do not rely on one broad domain cookie that makes it
impossible to clear the participant without confusing the staff session.

### Assisted-intake consent

Records participant · staff member · partner · event · matter or pending session
· scope of assistance · permitted actions · consent text version · language ·
timestamp · expiration · revocation timestamp. Consent does not grant indefinite
access.

The participant remains the answer source, account owner, matter owner, Briefcase
owner, and packet owner.

Staff must not create credentials for the participant, know or retain the
participant's password, use the staff member's email for the participant,
silently edit after the session, download participant files by default, or retain
access simply because the participant attended an event. A consented staff member
may type what the participant says; that is not ownership or ongoing access.

### Shared-device reset

Reset Device is a security control, not a cosmetic button. It must:

1. revoke the participant session server-side;
2. expire the assisted-consent grant;
3. invalidate any temporary download URLs;
4. terminate the Clinic participant session;
5. clear cookies and browser storage;
6. clear upload previews and in-memory state;
7. prevent browser Back/Forward cache restoration;
8. disable private-route service-worker caching;
9. return to a clean event entry screen;
10. record a reset-completed audit event.

Private pages use no-store caching. A reset also attempts browser storage
clearing through a dedicated response, but server-side revocation remains the
authoritative protection.

The acceptance test is not "the Reset button was clicked." It is:

> The next participant can recover none of the prior participant's identity,
> answers, result, documents, matter, Briefcase, packet, or status.

---

## 10. Security and SOC 2 Type II readiness

Use OWASP ASVS 5.0.0 as the application-security verification catalog rather than
relying only on automated scans. Target WCAG 2.2 AA for participant, Clinic and
administrative interfaces. Map the system to the AICPA Trust Services Criteria —
Security, Availability, Processing Integrity, Confidentiality, Privacy.

A secure screen design alone does not establish SOC 2 Type II readiness. Controls
need owners, policies, evidence, monitoring, review, and consistent operation.

| Domain | Required controls | Evidence to retain |
|---|---|---|
| Identity | Verified participant ownership; mandatory staff MFA; secure recovery; session rotation | Auth configuration, access reviews, MFA reports, recovery audit events |
| Authorization | Owner checks on every matter and artifact; RLS or equivalent; cross-tenant denial; scoped staff consent | Automated authorization tests, denied-access logs, role matrix |
| Anonymous-to-auth claim | Single-use claim token; atomic transaction; exact redirect; replay prevention | Claim audit events, idempotency tests, failure metrics |
| Data protection | Encryption in transit and at rest; no public packet buckets; secret management | Storage configuration, key management evidence, scans |
| Uploads | Authentication required; type and size controls; malware scanning; private access; metadata handling | Scanner results, rejected-upload logs, storage-policy tests |
| Payments | Server-created checkout; verified webhook; exact matter and amount; idempotency | Webhook verification tests, payment-to-matter reconciliation |
| Sponsorship | Server-validated sponsor authority; no client-set sponsor status; exactly-once credit use | Credit ledger, reconciliation report, duplicate prevention tests |
| Processing integrity | Versioned route contract; immutable verification snapshot; form-set hash; artifact validation | Snapshot records, form approvals, render manifests, regression tests |
| Availability | Autosave; durable jobs; retry queues; monitoring; backups; restore tests | Job metrics, incident alerts, backup and restore evidence |
| Confidentiality | Private downloads; minimum necessary staff views; no sensitive telemetry | Signed-URL tests, access logs, telemetry schema review |
| Privacy | Data minimization; consent; retention; deletion; communications preferences | Retention jobs, privacy notices, deletion evidence, consent versions |
| Change management | Peer review; protected branches; migration review; security tests; rollback | Pull requests, approvals, deployment logs, change tickets |
| Incident response | Detection, triage, containment, notification decision process | Alert history, tabletop exercises, incident records |
| Accessibility | WCAG 2.2 AA, keyboard flow, focus management, accessible authentication | Automated scans plus manual keyboard and screen-reader evidence |

---

## 11. Sensitive telemetry rules

Disable or heavily restrict session replay, heatmaps, DOM capture, and full-text
error capture on: screening · preliminary results · authentication · Briefcase ·
matter pages · packet information · uploads · review · checkout · packet download
· Clinic participant sessions.

Analytics may record operational events:

```text
screening_started · screening_completed · preliminary_result_displayed
claim_started · authentication_completed · claim_succeeded · matter_opened
packet_information_completed · verification_completed · checkout_started
payment_confirmed · render_succeeded · packet_downloaded · clinic_reset_completed
```

Do not attach answer values, names, emails, case numbers, offense text, uploaded
filenames, packet contents, claim tokens, or signed download URLs. Even outcome
classes and route identifiers are sensitive product data: pseudonymize where
possible, restrict access, retain only as needed.

---

## 12. Blind spots requiring explicit behavior

| Scenario | Required behavior |
|---|---|
| Email already has an account | Move to sign-in while preserving the pending result |
| Verification email opens on another device | Claim there and redirect to the exact matter; the original device must not expose it |
| User cancels authentication | Pending result remains available until expiration |
| Pending result expires | Explain clearly and restart screening without suggesting a matter was lost |
| Token replayed by the same owner | Return the existing matter |
| Token replayed by a different user | Deny generically and log a security event |
| CTA clicked in two tabs | Create exactly one matter |
| User already signed in | Claim directly after the CTA, without unnecessary authentication |
| Signs up but never verifies | No matter, Briefcase, upload, entitlement, or persistent packet progress |
| Password reset during claim | Preserve continuation and return to the exact pending result |
| Partner event ends during completion | Apply the sponsor-reservation policy; never silently surprise the participant with checkout |
| Sponsorship exhausted | Transparent sponsor-unavailable state; consumer payment only when contractually permitted and expressly chosen |
| Material answer change after verification | Invalidate verification and packet authority; preserve financial history |
| Payment succeeds but browser closes | Webhook completes entitlement and rendering independently |
| Payment succeeds but render fails | Retry without another charge; provide support or refund path |
| Official form changes after verification | Invalidate or migrate form-set authority under controlled rules |
| Staff consent revoked | End staff access immediately without affecting participant ownership |
| Participant lacks email | Approved participant-owned alternative such as verified mobile; never staff contact information |
| Juvenile or authorized representative | Distinct representative/delegate model with documented authority; no informal ownership transfer |
| Reminder sent | Neutral language and an authenticated deep link; no criminal details in subject lines or notifications |
| Browser Back after Clinic reset | Prior private content remains inaccessible |
| Network connection fails | Preserve acknowledged server saves, show truthful status, retry safely |
| User deletes matter or account | Follow the approved retention, legal-hold, financial-record, and deletion policy |

---

## 13. Redundancies to remove

**One legal engine.** No separate eligibility logic for Expungement.ai, RCAP,
Clinic Mode, sponsored access, or staff-assisted access. The same facts reach the
same governed result.

**One answer model.** Screening and packet information may differ in precision
but resolve into one canonical fact model. No drifting copies such as
`screening_completion_date`, `packet_completion_date`,
`review_completion_date`, `form_completion_date`. One governed fact with versions
and provenance.

**One matter state model.** No independent status values in matter, Briefcase
item, packet builder, payment page, partner dashboard, and render job. Each
interface derives its display status from the canonical matter, verification,
entitlement, and render states.

**One entitlement ledger.** Not mutable booleans — `is_paid`, `has_access`,
`packet_unlocked`, `sponsored`, `can_render`, `download_enabled` — but durable
records: payment · sponsorship grant · entitlement · render job · artifact.

**One authentication continuation service.** Signup, sign-in, magic link, OAuth,
password reset, and account verification all consume the same approved
continuation contract.

**One Review and Edit component.** Consumer and RCAP participants use the same
review experience. Clinic assistance adds attribution and consent, not a second
packet builder.

---

## 14. Customer-facing copy system

**Landing.** *Check your record-clearing options for free. No account is required
to start. Your screening and Briefcase are free. You pay only when a specific
matter is verified and ready to generate.*

**Preliminary result.** Label: *Preliminary result*. Body: *Based on your
answers, you may have a path forward. We still need exact case information before
we can verify the correct process or prepare a packet.* CTA: **Save my result and
continue**. Support: *Create a free account or sign in. We will save these
answers securely and bring you directly to the next step.*

**After successful claim.** *Your matter has been saved to your Briefcase.
Complete the remaining information so we can verify your case and prepare the
correct packet.*

**Free Briefcase.** *Your Briefcase is free. Complete your packet information
first. Pay only when this matter is verified and ready to generate.*

**Consumer packet-ready.** *Your matter is verified and ready to generate. Review
the packet details below, then pay $50 once for this matter.* CTA: **Pay $50 and
generate my packet**.

**RCAP sponsored.** *Your packet is sponsored by [Partner]. You will not be
charged for this matter.* CTA: **Generate my sponsored packet**.

**Expired temporary result.** *This temporary result has expired. For your
privacy, unsaved screening results are kept only briefly. Start a new free
screening to continue.*

**Rendering issue.** *We have your information and payment. Your packet is not
ready yet. We are retrying the packet preparation. You will not be charged
again.*

---

## 15. Release-blocking acceptance gates

| Area | Release requirement |
|---|---|
| Anonymous boundary | Anonymous users cannot create matters, Briefcases, uploads, payments, entitlements, render jobs, or artifacts |
| Claim continuity | Signup, sign-in, verification, OAuth, and password reset preserve the result |
| Exact redirect | Successful claim always lands on the exact matter |
| Idempotency | Refreshes, double clicks, callback retries, and multiple tabs create one matter |
| Ownership | Every matter has exactly one participant owner or an explicitly modeled ownership arrangement |
| Cross-user security | User B cannot access User A's matter, packet, metadata, or download |
| Cross-tenant security | Partner staff cannot access another partner's participants or event data |
| Staff consent | Staff access requires current consent, assignment, tenant membership, and approved purpose |
| Participant authority | Participant clients cannot write payment, sponsorship, verification, route, packet-family, form-set, entitlement, render, or artifact authority |
| Stale verification | Material edits invalidate the verification snapshot and checkout or render authority |
| Payment integrity | Only verified payment events create exact-matter entitlements; duplicate events are idempotent |
| Sponsorship integrity | No credit is used before successful first generation; retries and downloads use zero additional credits |
| Private delivery | Packet files are never publicly addressable and every download rechecks authorization |
| Clinic reset | No participant data survives reset, including browser Back/Forward behavior |
| Telemetry | No PII, answers, documents, tokens, or signed URLs appear in analytics or ordinary logs |
| Recovery | Expired result, failed auth, network interruption, render failure, and account recovery have resumable paths |
| Accessibility | Complete flow passes WCAG 2.2 AA automated and manual testing |
| Mobile | Screening, authentication, review, payment, uploads, and packet retrieval work on supported mobile widths |
| Processing integrity | Route, form set, payment, sponsorship, render, and artifact are bound to the same matter and current verification |
| Auditability | Claims, consent, staff access, verification, payment, sponsorship, generation, downloads, and resets create redacted audit evidence |

### Operational targets

```text
Authenticated claim success                     ≥ 99.9%
Generic-dashboard redirect after claim           0
Duplicate matters from one pending result        0
Cross-user or cross-tenant exposure              0
Payment-to-matter mismatch                       0
Sponsorship-credit duplication                   0
Packet marked ready without valid artifact       0
Sensitive values captured by telemetry           0
Clinic reset leakage                             0
Wrong form set from stale verification           0
```

---

## 16. Funnel metrics

```text
Screening started → screening completed → preliminary result viewed
→ Save my result selected → authentication started → authentication completed
→ pending result claimed → exact matter opened → packet information started
→ packet information completed → final verification completed → verified packet ready
→ payment or sponsorship confirmed → packet generated → packet downloaded
```

Do not combine these into broad events such as "conversion" or "completed."

**Conversion metrics.** Preliminary result to claim start; claim start to
authenticated claim; authenticated claim to packet-information start;
packet-information start to completion; verification failure reasons;
verified-ready to payment completion; payment or sponsorship to successful
packet; time from claim to packet; return and resume rate; support intervention
rate.

**Integrity metrics.** Failed claim transactions; duplicate claim attempts;
account callback misroutes; stale-verification attempts; denied cross-tenant
requests; participant attempts to write protected fields; payment webhook
mismatches; sponsorship-credit reconciliation differences; render retry rate;
reset failures.

Legal or security invariants are never A/B tested. Copy hierarchy, layout,
account-method presentation, reminder timing, and help placement may be.

---

## 17. Implementation sequence

**Phase 1 — Freeze the vocabulary and invariants.** One controlling specification
for `anonymous_session`, `pending_result`, `authenticated_account`, `matter`,
`Briefcase`, `verification_snapshot`, `entitlement`, `artifact`,
`assisted_session`, `consent_grant`. Remove pre-authentication "matter" and
"Briefcase" wording. Add schema constraints preventing anonymous ownership.

**Phase 2 — Build the continuation and claim service.** Pending-result creation;
secure claim token; expiration; account verification continuation; atomic claim
transaction; same-user idempotency; different-user replay denial; exact-matter
redirect; claim audit events. *This is the highest-priority engineering work
because every later experience depends on reliable ownership transfer.*

**Phase 3 — Normalize the Briefcase architecture.** Make the matter the canonical
unit. Remove duplicated status authority. Ensure guidance, waiting, referral,
automatic, unsupported, and packet routes can all be authenticated matters
without implying a packet exists.

**Phase 4 — Rebuild the consumer journey around the exact matter.** Public
screening; preliminary result; embedded authentication handoff; exact-matter
landing; packet sections; autosave; Review and Edit; final verification; free
Briefcase messaging.

**Phase 5 — Harden payment, entitlement, rendering, delivery.** Exact-matter
checkout; server-only payment authority; verified webhook; immutable financial
record; current verification requirement; durable render job; private artifact
delivery; safe retry and refund handling.

**Phase 6 — Implement RCAP as an operating layer, not a fork.** Validated
partner/event attribution; participant-owned authentication; consent grants;
staff assignment; sponsorship reservation and entitlement; limited queue
visibility; separate staff and participant sessions; Reset Device; cross-tenant
denial. Do not duplicate the legal engine or packet builder.

**Phase 7 — Add assurance controls.** ASVS-based security verification; WCAG 2.2
AA testing; threat model; RLS and authorization matrix; telemetry review;
retention jobs; access reviews; backup and restore testing; incident alerts;
evidence collection for the SOC 2 observation period.

**Phase 8 — Run controlled acceptance.** New account; existing account; password
reset; same-device verification; different-device verification; expired result;
replayed result; simultaneous claim; already authenticated; DTC payment; RCAP
sponsorship; exhausted sponsorship; material answer change; render failure;
repeat download; cross-user denial; cross-tenant denial; consent revocation;
shared-device reset; mobile and accessibility testing.

---

## Final governing rule

An implementation **fails this contract** when it:

```text
Creates a durable matter before successful participant authentication
Creates or displays an anonymous Briefcase
Calls a pending result a saved matter
Drops the participant on a generic dashboard after authentication
Loses screening answers during signup or account recovery
Lets staff own or inherit participant materials
Lets the client authorize payment, sponsorship, verification, or rendering
Generates a packet from stale verification
Exposes packet files through public or reusable URLs
Retains participant data after a Clinic reset
```

This rule appears verbatim in the PRD, the architecture decision record, the test
plan, and the release checklist:

> **Screening may be anonymous. A Briefcase may not be anonymous. A pending
> result becomes a matter only when it is securely and atomically claimed by the
> authenticated participant.**

---

## References

1. [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
2. [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
3. [NIST SP 800-63B](https://pages.nist.gov/800-63-4/sp800-63b.html)
4. [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
5. [AICPA Trust Services Criteria](https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022)
6. [AICPA SOC 2 subject matter guidance](https://www.aicpa-cima.com/resources/article/addressing-additional-subject-matter-and-criteria-in-soc-2-r-engagement)

---

## Appendix — measured against the code, 2026-08-27

Findings from reading the implementation, recorded here so the contract and the
evidence stay together. These are observations, not exceptions to the contract.

**The anonymity boundary is already built, and correctly.** Exactly one code path
creates a Briefcase item — `POST /api/expungement-ai/screening/pending/claim` —
returning `401 auth_required` without a session and refusing a pending row whose
`claimed_user_id` belongs to someone else. The pre-auth result lives in
`consumer_pending_screening_results`, carrying `pending_token_hash`,
`claimed_at`, `claimed_user_id`, `expires_at` defaulting to 24 hours, and
`payment_allowed` defaulting to false. RLS is enabled with a single service-role
policy and no anonymous or authenticated grant.

**Artifact routes are session-gated and owner-scoped.** Packet download,
generate, status and checkout all resolve through
`requireConsumerBriefcaseSession()` against `auth.userId`, never a client-supplied
identifier. Checkout refuses partner-sponsored items with a 403, keeping the two
funding paths apart at the route boundary.

**`CONSUMER_PACKET_PRICE_CENTS = 5000`** at
`src/lib/expungement-ai/consumer-payment-authority.ts:26`. Sponsorship branch
points exist across eight modules under `src/lib/expungement-ai/`.

**Open.** The four fact-stage names appear in zero files; the separation may be
implemented under other identifiers or enforced only by verifiers rather than at
runtime. A verifier asserting that free screening excludes exact dates is not the
same as the runtime refusing to ask for them.
