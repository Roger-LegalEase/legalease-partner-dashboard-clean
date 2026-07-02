# RCAP Partner Portal User Flow

Source PDF: `docs/product-flows/source-pdfs/Co-Branded Partner Portal User Flow.pdf`

This document is the source-of-truth Markdown version of the co-branded RCAP partner portal user flow. It protects the intended sequence for partner-covered users at `legaleasepartner.com`.

## Product Boundary

- `legalease.com` is the umbrella company landing page.
- `expungement.ai` is the consumer-facing DTC expungement engine.
- `legaleasepartner.com` is the partner / RCAP enterprise-facing expungement engine.
- Expungement.ai and LegalEase Partner share the same underlying RCAP / Expungement.ai engine plumbing, but partner-covered users bypass consumer payment.

## Flow

1. Partner landing page entry

   The partner user enters through a co-branded landing page, such as **We Must Vote x LegalEase**.

   CTA: **Check for free**

   The page should make clear that free screening is provided through the partnership with the partner. There should be **No payment language** on the partner landing page.

2. Start free qualification questionnaire

   The partner user starts the same free screening flow used on Expungement.ai.

   Questions should determine state where the case happened, county or court where relevant, arrest / charge / conviction status, case outcome, waiting-period issues, sentence / probation / fines completion, and route-specific eligibility factors.

   No account is required during screening.

3. Qualification result

   If the system identifies a possible path, result copy should say: **A path may be available.**

   Partner version copy:

   > Based on what you told us, there may be a record-clearing path available. Through our partnership with [Partner Name], you can continue to your Briefcase and prepare your packet at no cost to you.

   Primary CTA: **Continue to my Briefcase**

   No CTA should say pay, purchase, or generate for $50.

4. Create account

   After clicking **Continue to my Briefcase**, the user creates an account. Account creation should collect first name, last name, email, and password.

   Screening answers should be saved and attached to the user account so the user does not restart.

   Account creation must preserve partner attribution, including partner name, partner slug, campaign or source where available, state or jurisdiction, screening result, and packet route.

5. Verify email

   The user verifies their email.

   After verification, the system should recognize the covered partner source and send the user to Briefcase, not Stripe.

   Copy may say:

   > Email verified. Your Briefcase is ready.

   CTA: **Go to my Briefcase**

6. Skip Stripe Payment Gate

   This is the key commercial difference from DTC.

   For partner-covered users: no Stripe payment page, no $50 fee, and no payment prompt.

   System rule: if user source is a covered partner portal, **Skip Stripe Payment Gate**, bypass payment, and unlock Briefcase access after email verification.

   The user should not see consumer pricing unless they later start a separate non-partner case outside partner coverage.

7. Briefcase

   The partner user lands in Briefcase with partner-aware language:

   > Your record-clearing packet is covered through [Partner Name].

   Briefcase should show the possible path and the next step:

   > We found a possible path in [State]. We need a few more state-specific details before your packet can be generated.

   Primary CTA: **Finish my packet information**

8. State-Specific Packet Builder

   Briefcase loads the correct **State-Specific Packet Builder** based on case state, route, and packet type.

   The builder should ask only for information needed for that state packet, such as county, court, case number, charge or offense, disposition, arresting agency, sentence completion facts, waiting-period facts, and route-specific details.

   The user should be able to answer:

   - I know this
   - I do not know
   - I need help finding this

   Do not block packet generation just because the user still needs outside paperwork. Any required third-party forms, court records, certificates, fees, or supporting documents should be listed in the next-step packet.

9. Generate packet

   Once required packet-builder fields are complete, the user can click: **Generate my packet**.

   The system generates prepared documents where available, a state-specific filing checklist, instructions for what to do next, required outside document guidance, expected fees where known, filing location guidance, and plain-English disclaimers.

10. Briefcase packet ready

   After generation, Briefcase status changes to **Packet ready**.

   Primary CTA: **Download my packet**

   Secondary CTA: **View filing checklist**

   Partner-aware copy:

   > This packet was prepared through LegalEase's partnership with [Partner Name].

11. Check another case

   The menu should include **Check another case** so the user can screen another arrest, charge, conviction, or case.

   If the new case is still within the partner-covered program, no payment should be required. If the new case falls outside partner coverage, the user can still screen for free, but the system may route them to the normal $50 consumer packet flow.

12. Case outcome follow-up

   After packet generation, Briefcase should motivate the user to return and update case status:

   > Tell us what happened with your case.

   CTA: **Update my case status**

   Possible statuses include not filed yet, filed packet, court accepted filing, court asked for more information, record cleared, request denied, and needs help understanding what happened.

## Guardrails

- Partner user enters through a co-branded landing page.
- CTA is **Check for free**.
- No payment language on partner landing.
- No account required during screening.
- Possible-path result copy must say partner covers access.
- Partner CTA is **Continue to my Briefcase**.
- No CTA should say pay, purchase, or generate for $50.
- Account creation preserves partner attribution.
- After verification, partner user goes to Briefcase, not Stripe.
- Partner-covered users bypass Stripe because partner has already paid.
- Partner Briefcase uses partner-aware language.
- Partner users get state-specific packet builder, packet generation, filing checklist, and outcome follow-up.

## Clean Partner Flow

Partner landing page -> **Check for free** -> qualification questionnaire -> **A path may be available** -> **Continue to my Briefcase** -> **Create account** -> **Verify email** -> **Skip Stripe Payment Gate** / bypass payment -> Briefcase -> **State-Specific Packet Builder** -> **Generate my packet** -> **Download my packet** + filing checklist -> outcome follow-up.
