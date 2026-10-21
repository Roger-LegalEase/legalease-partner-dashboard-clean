# Expungement.ai DTC User Flow

Source PDF: `docs/product-flows/source-pdfs/Expungement.ai User Flow.pdf`

This Markdown document is the source of truth for the Expungement.ai direct-to-consumer flow. The approved commercial contract below supersedes the older payment-before-builder sequence in the source PDF.

## Product boundary

- `legalease.com` is the umbrella company landing page.
- `expungement.ai` is the consumer-facing direct-to-consumer record-clearing product.
- `legaleasepartner.com` is the partner and RCAP experience.
- Both experiences use the same profile-driven eligibility and packet engine, but their entitlement sources and commercial handoffs remain separate.

## Approved commercial contract

### Free Briefcase

The Briefcase is free, persistent, secure, and available before payment. It can hold multiple independent matters, including packet matters, guidance matters, waiting-period matters, and more-information-needed matters.

The Briefcase is not the purchased product. It is the durable home for the user's matters and may later hold products such as RecordShield without changing the Expungement.ai packet entitlement.

### Paid product

The paid product is one personalized court-filing packet set for one record-clearing matter for $50.

Payment unlocks only the exact matter named by the Checkout Session and server-authoritative entitlement. It does not unlock every packet in the account. A separate matter requires a separate payment unless a partner entitlement covers that matter.

### Partner-covered RCAP matters

RCAP-sponsored matters use the same Briefcase where appropriate but never use participant Stripe checkout or consumer $50 copy. Partner sponsorship or packet allocation is the entitlement source. Sponsored entitlement must never enter the consumer payment writer.

## Direct-to-consumer flow

1. **Start a free screening**

   A visitor can begin without an account. Landing and result disclosure:

   > Start with a free screening. If a self-help packet is available for your matter, it costs $50 to generate.

2. **Complete the profile-driven screening**

   The engine asks the state and route-specific questions needed to produce a preliminary result. The frontend never infers eligibility, pathway, packet type, or `paymentAllowed`.

3. **Review the preliminary result**

   The result identifies the exact state, pathway or remedy, plain-language reasons, cautions and boundaries, whether a packet path may be available, and the $50 packet price when applicable. It always explains that Expungement.ai is self-help software and does not guarantee court or agency approval.

   A packet-ready result uses the primary action **Save my result and continue**. Guidance, waiting-period, and more-information-needed results use a next-step action that saves the same result without presenting payment.

4. **Create an account or sign in**

   The pending screening result survives the auth handoff. After authentication, the exact result is claimed once by that user and saved to the user's free Briefcase. The user lands on that exact matter, not an empty or generic Briefcase.

5. **Open the free Briefcase matter**

   A packet-ready matter shows the state, authoritative pathway, status **Packet path available**, and:

   > Your Briefcase is free. Complete your packet information and pay only when you're ready to generate your packet.

   Price disclosure:

   > $50 one time when you are ready to generate this packet

   Primary action: **Complete packet information**.

6. **Complete packet information before payment**

   The state-specific builder is available while the matter is unpaid. Authoritative and safe screening facts prefill the builder. The user can save, leave, and resume. Unknown facts remain visibly missing and may be marked as unknown or needing help.

   Before payment, the user may receive the screening result, saved matter, guidance, high-level packet contents, questionnaire, accuracy review, and filing-preparation checklist. The user may not receive a personalized filing PDF, final personalized pleading, delivery-eligible render job, or reusable cross-matter entitlement.

7. **Review for accuracy**

   The final review identifies the exact matter and pathway, expected packet components, missing information, filing limitations, and the one-time price:

   > $50 one time for this matter.

   Final action: **Pay $50 and generate my packet.** Checkout is not created before this action.

8. **Create a matter-bound Checkout Session**

   Stripe Checkout is fixed at 5000 cents in USD and binds the authenticated user, Briefcase item, person, matter, product `expungement_packet`, and return URLs. Repeated clicks reuse the active Session for that exact matter instead of creating duplicates. Beginning Checkout does not mark the matter paid or authorize rendering.

9. **Confirm payment and generate**

   Only a verified Stripe event may record the server-authoritative payment and matter-level entitlement. The durable sequence is:

   `signed Stripe event -> exact matter payment record -> exact matter entitlement -> durable render job -> validated private artifact -> Briefcase Packet ready -> authenticated download`

   The Briefcase progresses through **Payment confirmed**, **Preparing packet**, and **Packet ready**.

10. **Download, reopen, and follow up**

    The owner can download and reopen the private packet without another charge. A retry, render failure, reasonable correction to the same matter, refresh, or repeat download does not create another payment. A new matter remains unpaid until it receives its own entitlement.

## Human-facing matter states

- Matter saved
- Guidance saved
- More information needed
- Waiting period not met
- Packet path available
- Packet details in progress
- Ready to generate
- Payment confirmed
- Preparing packet
- Packet ready
- Filed
- Waiting on the court
- Decision received

Internal route, render, payment, and job vocabulary must not be shown to consumers. Guidance-only matters show their state-specific next steps as the completed product value; they do not show a disabled packet stepper.

## Matter-level entitlement rules

- The authenticated user, Briefcase item, person, matter, product, Checkout Session, payment event or receipt, 5000-cent amount, and USD currency are bound server-side.
- Payment for one matter cannot authorize a second matter.
- Browser-controlled identity or payment fields are never authoritative.
- The same matter can be downloaded, retried, or reasonably corrected without another charge.
- A failed render does not create a second payment.
- A separate new matter requires a separate payment.
- No account-level paid flag exists.
- Sponsored RCAP authority never calls the consumer payment writer.

## Guardrails

- No account wall before the free screening.
- No payment before the state-specific packet builder and final accuracy review.
- Result copy says **A path may be available**, never "you qualify."
- Do not promise expungement, clearance, filing, court approval, or legal representation.
- Do not describe the Briefcase as paid, unlocked by payment, or unlimited packet access.
- Do not duplicate the screening after authentication.
- Do not block the builder solely because outside documents are still needed; explain those requirements in guidance.
- Checkout and generation remain unavailable for guidance-only, waiting-period, more-information-needed, and other non-packet outcomes.
- The permanent **Check another case** action creates a distinct matter and does not inherit another matter's payment.

## Clean final flow

**Start free screening** -> profile-driven screening -> preliminary result -> **Save my result and continue** -> create account or sign in -> exact free Briefcase matter -> **Complete packet information** -> save and resume -> accuracy review -> **Pay $50 and generate my packet** -> verified matter-level payment -> durable packet generation -> **Packet ready** -> authenticated download and filing checklist -> outcome follow-up.
# Participant language

This flow follows the shared participant-language rule in [Product Flow Source of Truth](./README.md): external copy explains the result, next steps, costs, and packet progress without exposing implementation details.
