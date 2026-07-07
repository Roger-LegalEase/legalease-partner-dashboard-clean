# RCAP Partner Portal User Flow

Source PDF: `docs/product-flows/source-pdfs/Co-Branded Partner Portal User Flow.pdf`

This document is the source-of-truth Markdown version of the co-branded RCAP partner portal user flow. It protects the intended sequence for partner-covered users at `legaleasepartner.com`.

This flow reflects the **account-first** partner model: partner users create a free Briefcase (or sign in) **before** the screening, and the screening runs inside their account. This differs from the Expungement.ai direct-to-consumer flow, where there is no account wall before the free check.

## Product Boundary

- `legalease.com` is the umbrella company landing page.
- `expungement.ai` is the consumer-facing DTC expungement engine.
- `legaleasepartner.com` is the partner / RCAP enterprise-facing expungement engine.
- Expungement.ai and LegalEase Partner share the same underlying RCAP / Expungement.ai engine plumbing, but partner-covered users bypass consumer payment.

## Flow

1. Partner co-branded landing page

   The partner user enters through a co-branded landing page, such as **We Must Vote × LegalEase**.

   Primary CTA: **Start your record-clearing screening**.

   The page explains that the user creates a free Briefcase to save their answers and receive partner-supported access. There is **No payment language** on the partner landing page — no price, no purchase, no "$50".

2. Create account or sign in (before screening)

   Partner users create their free Briefcase **before** starting the questionnaire. **Create account** collects first name, last name, email, and password, with phone number optional and consent to receive program updates and support communications.

   Existing users can sign in to continue.

   Account creation preserves **partner attribution** in the background, including partner name, partner slug, campaign or source (UTM parameters) where available, state or jurisdiction, county where supplied, and any event or source identifiers.

   Creating an account through a partner portal **does not count against the partner cap**.

3. Verify email

   The user verifies their email. After verification, the system recognizes the covered partner source and returns the user to the partner screening inside their Briefcase — not to Stripe.

   If live-event friction is being reduced, the user may begin the questionnaire immediately after signup, but verification is still required before packet generation or support follow-up where the code requires it.

4. Partner screening inside the Briefcase

   The partner screening runs inside the user's account and is more support-oriented and accuracy-oriented than the DTC check. It gathers state, county, court if known, arrest / charge / conviction status, case outcome, sentence / probation completion, fines / fees / restitution status, waiting-period facts, open cases or pending charges, and whether the user needs help finding case information.

   **Screenings do not count against the partner cap.**

5. Accuracy review before the result

   Before showing the result, the partner flow shows an accuracy-review step:

   > Let's make sure we have this right.

   It shows a concise summary of the user's answers.

   Primary CTA: **Yes, this looks right.**
   Secondary CTA: **Edit my answers.**

6. Qualification result and result lanes

   Result copy says **A path may be available** where relevant, and never uses "qualify", "eligible", "approved", or outcome promises. The court or agency makes the final decision.

   The result routes into one of four lanes:

   - **Lane A — a packet path may be available.** CTA: **Continue to packet builder**.
   - **Lane B — more information needed.** CTA: **Continue to my Briefcase**.
   - **Lane C — guidance-only / no packet path right now.** CTA: **View my next steps**.
   - **Lane D — not eligible right now / waiting period not met.** CTA: **View my Briefcase**.

   No result CTA says pay, purchase, or generate for a fee.

7. Skip Stripe Payment Gate

   This is the key commercial difference from DTC. For partner-covered users there is no Stripe payment page, no fee, and no payment prompt. System rule: if the user source is a covered partner portal, **Skip Stripe Payment Gate**, bypass payment, and unlock Briefcase access.

   The user does not see consumer pricing unless they later start a separate non-partner case outside partner coverage.

8. Briefcase saved no matter what

   The user keeps their Briefcase regardless of the result, and their screening is saved. For non-eligible or no-path users, the Briefcase shows a clear status such as: no packet path found right now, more information needed, waiting period not met, court records needed, case type not supported, or guidance-only next steps available.

   Briefcase CTA options for these users include **View my next steps**, **Check another case**, request partner support where enabled, and update my information. These users **do not count against the partner cap**.

9. Briefcase for packet-path users

   For a possible packet path, the Briefcase uses partner-aware language:

   > Your record-clearing packet is covered through [Partner Name]. Complete the state-specific packet builder so we can prepare your documents.

   Primary CTA: **Finish my packet information**.

10. State-Specific Packet Builder

    The Briefcase loads the correct **State-Specific Packet Builder** based on case state, route, and packet type. It asks only for information needed for that state packet, such as county, court, case number, charge or offense, disposition, arresting agency, sentence-completion facts, waiting-period facts, and route-specific details.

    The user can answer **I know this**, **I do not know**, or **I need help finding this**.

    Packet generation is not blocked solely because the user still needs outside paperwork. Any required third-party forms, court records, certificates, fees, or supporting documents are listed in the next-step packet.

11. Generate packet

    Once the required packet-builder fields are complete, the user can click **Generate my packet**. The system generates prepared documents where available, a state-specific filing checklist, next-step instructions, required outside-document guidance, expected fees where known, filing-location guidance, and plain-English disclaimers.

    **Packet generated counts against the partner cap** — exactly once per generated packet. Retries, refreshes, and re-downloads must not double-count. An additional packet generated for another eligible case counts once per generated packet.

12. Briefcase packet ready

    After generation, Briefcase status changes to **Packet ready**.

    Primary CTA: **Download my packet**.
    Secondary CTA: **View filing checklist**.

    Partner-aware copy: this packet was prepared through LegalEase's partnership with [Partner Name].

13. Filing support and case outcome follow-up

    The menu includes **Check another case** so the user can screen another arrest, charge, conviction, or case. If the new case is within partner coverage, no payment is required. After packet generation, the Briefcase invites the user to return and update case status:

    > Tell us what happened with your case.

    CTA: **Update my case status**.

## Partner cap rules

- Partner portal account creation does not count against the partner cap.
- Screenings do not count against the partner cap.
- Ineligible users do not count against the partner cap.
- Guidance-only users do not count against the partner cap.
- More-information-needed users do not count against the partner cap.
- Possible-path users do not count against the partner cap.
- Packet builder started does not count against the partner cap.
- **Packet generated counts against the partner cap** (once per generated packet).
- An additional packet for another eligible case counts once per generated packet.

> Note: The packet-cap count is recorded by the `record_rcap_partner_packet_generation` Supabase function, which is defined in `supabase/phase-39-rcap-partner-packet-cap.sql`. The application records usage best-effort on packet generation; strict cap enforcement and reporting require that migration to be applied in the production database.

## Guardrails

- Partner user enters through a co-branded landing page with account-first entry.
- No payment language on partner landing.
- Partner users create an account or sign in before screening.
- Account creation preserves partner attribution (partner slug, jurisdiction, county, UTM/source).
- Screening runs inside the Briefcase; an accuracy-review step precedes the result.
- Possible-path result copy must say partner covers access; result CTAs use the four lane labels above.
- No CTA says pay, purchase, or generate for a fee.
- After verification, the partner user goes to Briefcase, not Stripe.
- Partner-covered users bypass Stripe because the partner has already paid.
- Partner users get the state-specific packet builder, packet generation, filing checklist, and outcome follow-up.
- Account creation, screenings, and non-packet outcomes do not count against the cap; only a generated packet counts.

## Clean Partner Flow

Partner landing page → **Start your record-clearing screening** → **Create account** or sign in → **Verify email** → screening inside Briefcase → accuracy review (**Let's make sure we have this right**) → result lanes (**Continue to packet builder** / **Continue to my Briefcase** / **View my next steps** / **View my Briefcase**) → Briefcase saved no matter what → if no path, guidance/support only and no cap usage → if packet path, **State-Specific Packet Builder** → **Generate my packet** → **Skip Stripe Payment Gate** / bypass payment → **Download my packet** + filing checklist → packet generated counts against the partner cap → outcome follow-up.
