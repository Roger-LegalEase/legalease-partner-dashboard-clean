# Controlling product contract — Expungement.ai and RCAP

The governing target for the national build. Supplied by the owner 2026-08-27.
Nothing in the repository stated this in full before; the build is measured
against it, and where an implementation and this document disagree, this document
is the specification and the implementation is the defect.

Read as the target flow. It is **not** a claim that any stage has passed hosted
acceptance.

## The five objects

The product must stop using "result", "matter" and "Briefcase" interchangeably.
They are five objects with different lifecycles and different owners.

| Object | Exists before auth? | Owner | Purpose |
|---|---|---|---|
| Anonymous screening session | yes | none | temporary state while answering free screening |
| Pending result | yes, temporarily | none | server-held claimable snapshot of result and route context |
| Account | possibly unverified during signup | user after successful auth | identity and access boundary |
| Matter | **no** | authenticated participant | durable workflow for one record-clearance issue |
| Briefcase | **no** | authenticated participant | private workspace showing that participant's matters |

A pending result is not a lightweight matter; it is a separate temporary object.
A matter can exist **without** a packet — waiting-period, automatic-relief,
referral, missing-information and unsupported outcomes all become saved matters
after authentication. "Matter" means a participant-owned workflow, not "a packet
is available".

### Invariants that must be impossible to violate

```text
matters.owner_user_id             NOT NULL
briefcases.user_id                NOT NULL and UNIQUE
matters.source_pending_result_id  UNIQUE
artifacts.matter_id               NOT NULL
entitlements.matter_id            NOT NULL
payments.matter_id                NOT NULL
```

No `anonymous_owner`, no placeholder clinic owner, no partner-owned participant
matter, no staff-owned Briefcase. The Briefcase should be the authenticated
presentation of a user's matters rather than a second copy of matter status; if a
`briefcase_items` table remains, it references the canonical matter and does not
duplicate route, payment, verification or packet state.

## The invariant

Both products run the same state-specific screening, legal-route, packet,
verification and Briefcase infrastructure. They differ in **entry, funding,
attribution, assistance, follow-up and reporting** — never in legal result.

```text
same facts → same route → same final verification → same packet-or-no-packet decision
```

Then, and only then:

```text
Expungement.ai → participant pays $50 for that exact matter
RCAP           → partner sponsorship covers the verified matter
```

A sponsored pathway bypasses the consumer payment screen. It does **not** bypass
eligibility, packet completeness, final verification, privacy, official-form
authority, or packet-credit controls. RCAP creates no special eligibility,
shortens no waiting period, and turns no unsupported route into a packet route.

## Fact staging

Facts belong to exactly one stage:

```text
FREE_SCREENING → PACKET_INFORMATION → FINAL_VERIFICATION → POST_PAYMENT
```

Free screening may ask broad case outcome, broad offense category, whether the
matter is open, whether requirements were completed, approximate timing,
threshold questions, and pending-case or prior-relief facts when genuinely
route-determinative.

Free screening may **not** ask exact dates, exact court information, case
numbers, certified dispositions, document uploads, service details, or
form-specific fields.

**Question-scoping rule.** A question appears only if it is a shared route
discriminator, or at least one *currently viable* route needs it at screening
precision. Choosing a remedy prunes questions belonging only to rejected
remedies. "Optional" means a relevant answer may be skipped; it never licenses
displaying an irrelevant question.

## Expungement.ai — the twelve stages

1. **Public entry.** Free record check, no account required to begin. Disclosure:
   screening is free; a verified packet costs $50 for that specific matter.
2. **Preliminary result.** Never labelled "you qualify" or "you are eligible".
   The primary action is **"Save my result and continue"** — never "save this
   matter", "your matter", "your Briefcase" or "your saved case", because none of
   those objects exist yet. Checkout is never shown here. Computed by the legal engine, never inferred by the
   browser. Outcomes: possible packet path, more information needed, waiting
   period may not be met, automatic/no-filing, guidance-only, attorney
   review/referral, unsupported. Preliminary results cannot authorize payment or
   permanently select a packet.
3. **Account.** Created *after* the result is displayed, via "Save my result and
   continue". The governing rule is:

   > **Screening may be anonymous. A Briefcase may not be anonymous.**

   Before an account exists the participant may have an anonymous screening
   session, a temporary result, a secure pending-result token, a preliminary
   explanation, and a prompt to save. They may **not** have a persistent
   Briefcase, a durable saved matter, access to packet documents, permanent
   uploads, a payment entitlement, or a downloadable packet. The pending result
   may live briefly on the server so it survives signup; that is not yet a
   participant-owned Briefcase item.

   On authentication the system binds the pending result to that user, creates a
   persistent matter, adds it to the Briefcase, redirects to **that exact
   matter**, preserves every screening answer and the route context, and enables
   save, resume, completion, verification, payment and download. The participant
   is never dropped on an empty Briefcase home.

   Customer-facing language — before signup: *"Your preliminary result is ready.
   Create a free account to save your result and continue."* After signup: *"Your
   matter has been saved to your Briefcase. Complete the remaining information so
   we can verify your case and prepare the correct packet."*
4. **Free Briefcase.** Free to hold, and free to keep — payment is per matter, at
   the point that matter is verified and ready to generate. One matter, one $50
   charge, never an account-wide unlock.
5. **Packet-information completion.** Exact facts, collected while unpaid. Screening
   answers prefill. Save, leave, resume on another device, mark unknown, see what
   is missing, edit. No final filing PDF and no delivery-authorized render job
   before payment.
6. **Review and Edit.** Every verification-relevant fact shown in plain language with
   an exact Edit target and return destination. Edit opens the exact question
   prefilled and returns to Review with the route recomputed. A material change
   invalidates the verification snapshot.
7. **Final verification.** Recomputes the route from exact packet facts and never
   trusts the preliminary route. Determines exact route, eligibility, waiting
   period and clock anchor, exclusions, pending cases, prior relief,
   automatic-versus-participant-filed, effective-date branches, contradictions,
   service outcome, packet family, exact form set, and writes a versioned snapshot.
8. **Commercial gate.** Checkout requires packet information complete, a current
   successful verification, current route, current packet family, current form-set
   hash, authenticated owner, no hold, and generation allowed. Automatic, not-yet,
   needs-information, conflicting, review, referral, guidance and unsupported
   outcomes must never open checkout.
9. **Checkout.** Created only on deliberate final action, bound server-side to user,
   Briefcase item, person, matter, product, amount, currency and return path.
   Starting checkout neither marks the matter paid nor authorizes rendering.
   Duplicate clicks reuse the active session.
10. **Payment and generation.** Only a verified Stripe event may create payment and
    entitlement: signed event → matter payment → matter entitlement → durable render
    job → validated private artifact → Briefcase "Packet ready" → owner download.
11. **Briefcase delivery.** Private and matter-bound. Repeat download is free; a
    correction, retry, render failure or refresh never creates a second payment. A
    separate matter needs its own payment or sponsorship.
12. **Outcome tracking.** Filed, waiting on the court, hearing scheduled, decision
    received, cleared, referred. Generating a packet is not filing; filing is not
    relief.

**Where self-help stops:** prosecutor opposition, contested hearing,
individualized strategy, disputed facts, immigration-sensitive advice,
representation, attorney appearance. The saved result, packet work, documents and
history transfer to the configured handoff.

## RCAP — what changes

Entry is co-branded: partner page, sponsored link, access code, campaign or
referral link (Mode A), or an event link, QR, event code or preregistration page
(Mode B). Partner, campaign, UTM, code, program and event attribution persists
from entry through screening, matter, result, follow-up and reporting.

The anonymity rule applies identically here. Screening may begin before an
account exists and a shared device may hold a temporary assisted session, but no
persistent participant packet or Briefcase is delivered until the matter is bound
to the participant's own authenticated account. Clinic staff never own the
participant's Briefcase.

**Assisted intake** is optional and consented: explicit, timestamped, staff
identity recorded. The participant remains the answer source and the owner of the
account, matter, Briefcase and packet. Assistance grants no permanent access.
Staff use "Not sure" rather than guessing legal or court facts.

**The commercial handoff** is the central difference:

```text
verified packet ready → server confirms valid partner/event sponsorship
                      → no consumer checkout
                      → sponsored packet entitlement
```

The participant sees sponsorship copy — never a $50 price, a Stripe button, or
consumer payment language.

### Packet-credit accounting

One screening does not equal one credit.

```text
screening started                    0
incomplete matter                    0
needs information                    0
guidance-only outcome                0
automatic / no-filing outcome        0
attorney review or referral          0   unless separately contracted
failed packet generation             0
retry after failure                  0
successful FIRST sponsored packet    1   exactly
repeat download                      0
```

### Shared-device session end

`End Clinic Session / Reset Device` is a mandatory privacy gate. It must clear or
invalidate the participant session, Clinic session, cookies, cached participant
pages, localStorage, sessionStorage, IndexedDB where applicable, upload previews,
packet and download references, and browser Back/Forward restoration. The next
participant must see nothing of the previous one.

The protected **server** Clinic session is the privacy authority. A missing or
forged client event hint cannot remove the boundary; a forged session cannot
mount Clinic privacy; a valid session stays protected when the hint is absent or
wrong. Reset uses the request-bound authentication context.

## Corrections that govern wording and sequence

**Pre-authentication vocabulary.** Every pre-auth reference is to *your
preliminary result*, never *your matter* or *your Briefcase*. Those words become
correct only after the claim transaction succeeds.

**RCAP sequence.** Partner or Clinic entry → optional assisted-intake consent →
screening → preliminary result → participant creates or signs into their own
account → claim → participant-owned matter and Briefcase. An RCAP participant may
choose to create an account before screening, but the product must not require it
as the default entry experience.

**Authentication is an interstitial, not a new visit.** Signup, email
verification, password reset, OAuth callback, magic-link callback and
existing-account sign-in all preserve the pending result. The participant never
returns to the homepage, restarts screening, re-enters answers, lands on an empty
Briefcase, gets a generic welcome dashboard, or loses partner/event attribution.

**An auth record is not an account.** An unverified account may exist during
signup but receives no matter, Briefcase, upload, packet document, payment
authority or sponsorship authority. The claim happens only after the provider
confirms successful authentication and, where required, verification.

**Payment history is not generation authority.** A material answer change
preserves the payment record, invalidates the verification snapshot and stale
generation authority, re-runs final verification, permits regeneration without a
second payment while the matter remains supported, and triggers support or refund
handling when it no longer is. This prevents both double charging and generation
from stale legal facts.

**Do not call it a record check.** The system asks questions; it does not query an
authoritative criminal-record source. Say *"Check your record-clearing options for
free"* or *"Take a free record-clearance screening"*. Reserve "record search" and
"record check" for when records are actually retrieved.

**Already-authenticated participants still act deliberately.** A signed-in
participant starting a new screening gets "Save to my Briefcase and continue" —
the product does not silently create matters for abandoned or experimental
screenings.

## The claim transaction

The claim token is cryptographically random, opaque, single-purpose, single-use,
short-lived, hashed at rest, bound to the pending result, excluded from analytics
and logs, stripped from the URL immediately after use, and protected against
replay and open-redirect manipulation. It is never stored in `localStorage`.

The claim is one server-side transaction: confirm the authenticated and verified
user; lock the pending result; confirm token hash, purpose, status and expiry;
confirm it is not claimed by another user; create or reuse the Briefcase; create
the matter using `source_pending_result_id` as an idempotency key; copy the
screening snapshot and route context; preserve partner, event, campaign, locale
and consent context; mark the pending result claimed; write an append-only audit
event. Commit, return the exact `matter_id`, redirect to it.

Retry behaviour: same user re-claiming returns the existing matter; a different
user is denied generically without revealing who claimed it; two simultaneous
clicks create one matter; refresh during claim returns the same matter; multiple
auth callbacks return the same matter; an expired pending result explains itself
and starts a new screening; a failed transaction leaves neither a partial matter
nor an orphaned Briefcase item.

## Role boundaries

A partner administrator may view only their own partner, open approved events,
manage delegated staff, monitor capacity and follow-up, view approved aggregate
reports, and pause or close an event when authorized.

A partner administrator may **not** change state eligibility rules, waiting
periods, packet families, official-form approval or credit-consumption rules;
reach another tenant; or grant themselves LegalEase internal-admin privileges.

Clinic Mode is enabled through provisioning and partner/event controls — never by
inserting database rows, changing RLS, or editing environment variables. Staff
accounts are named; shared credentials are prohibited.

## Release-blocking gates

The flow is not production-ready until every one of these passes:

anonymous users cannot create matters, Briefcases, uploads, payments,
entitlements, render jobs or artifacts; signup, sign-in, verification, OAuth and
password reset all preserve the result; a successful claim always lands on the
exact matter; refreshes, double clicks, callback retries and multiple tabs create
one matter; every matter has exactly one participant owner; user B cannot reach
user A's matter, packet, metadata or download; partner staff cannot reach another
partner's participants or event data; staff access requires current consent,
assignment, tenant membership and approved purpose; participant clients cannot
write payment, sponsorship, verification, route, packet-family, form-set,
entitlement, render or artifact authority; material edits invalidate the
verification snapshot and checkout or render authority; only verified payment
events create entitlements and duplicates are idempotent; no credit is used
before successful first generation; packet files are never publicly addressable
and every download rechecks authorization; no participant data survives a Clinic
reset including Back/Forward behaviour; no PII, answers, documents, tokens or
signed URLs appear in analytics or ordinary logs; expired result, failed auth,
network interruption, render failure and account recovery all have resumable
paths; the complete flow passes WCAG 2.2 AA automated and manual testing.

## The rule, verbatim

> **Screening may be anonymous. A Briefcase may not be anonymous. A pending
> result becomes a matter only when it is securely and atomically claimed by the
> authenticated participant.**

An implementation fails this contract when it creates a durable matter before
successful participant authentication, creates or displays an anonymous
Briefcase, calls a pending result a saved matter, drops the participant on a
generic dashboard after authentication, loses screening answers during signup or
recovery, lets staff own or inherit participant materials, lets the client
authorize payment, sponsorship, verification or rendering, generates a packet
from stale verification, exposes packet files through public or reusable URLs, or
retains participant data after a Clinic reset.

## Measured against the code, 2026-08-27

**The anonymity boundary is already built, and correctly.** Exactly one code path
creates a Briefcase item — `POST /api/expungement-ai/screening/pending/claim` —
and it returns `401 auth_required` without a session, then refuses a pending row
whose `claimed_user_id` belongs to someone else. The pre-auth result lives in a
separate table, `consumer_pending_screening_results`, carrying
`pending_token_hash`, `claimed_at`, `claimed_user_id`, `expires_at` defaulting to
24 hours, and `payment_allowed` defaulting to false. Row-level security is
enabled on it with a single service-role policy and no anonymous or authenticated
grant. That is the contract's shape: a temporary, tokenised, expiring,
non-entitling pending result that is not a Briefcase.

Every artifact-bearing route is session-gated and owner-scoped through
`requireConsumerBriefcaseSession()` — packet download, generate, status, and
checkout all resolve against `auth.userId` rather than a client-supplied
identifier. Checkout additionally refuses partner-sponsored items with a 403,
keeping the two funding paths apart at the route boundary.

`CONSUMER_PACKET_PRICE_CENTS = 5000` is real
(`src/lib/expungement-ai/consumer-payment-authority.ts:26`) and sponsorship
branch points exist across eight modules under `src/lib/expungement-ai/`.

One open question, not a defect: the four stage names above appear in **zero**
files. The separation may be implemented under other identifiers or enforced only
by verifiers rather than at runtime, and a verifier asserting that free screening
excludes exact dates is not the same as the runtime refusing to ask for them. A
contract audit is running to establish which.
