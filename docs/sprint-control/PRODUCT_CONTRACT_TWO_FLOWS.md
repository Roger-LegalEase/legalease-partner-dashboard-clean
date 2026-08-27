# Controlling product contract — Expungement.ai and RCAP

The governing target for the national build. Supplied by the owner 2026-08-27.
Nothing in the repository stated this in full before; the build is measured
against it, and where an implementation and this document disagree, this document
is the specification and the implementation is the defect.

Read as the target flow. It is **not** a claim that any stage has passed hosted
acceptance.

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
2. **Preliminary result.** Computed by the legal engine, never inferred by the
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
