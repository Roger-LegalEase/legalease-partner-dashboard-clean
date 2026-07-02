# Expungement.ai DTC User Flow

Source PDF: `docs/product-flows/source-pdfs/Expungement.ai User Flow.pdf`

This document is the source-of-truth Markdown version of the Expungement.ai direct-to-consumer user flow. It protects the intended sequence for the consumer product at `expungement.ai`.

## Product Boundary

- `legalease.com` is the umbrella company landing page.
- `expungement.ai` is the consumer-facing DTC expungement engine.
- `legaleasepartner.com` is the partner / RCAP enterprise-facing expungement engine.
- Expungement.ai and LegalEase Partner share the same underlying RCAP / Expungement.ai engine plumbing, but their commercial handoffs differ.

## Flow

1. Entry point

   The user starts with the CTA: **Check for free**.

   This begins the free qualification screening. There is no account wall before this step.

2. Free qualification questionnaire

   The user answers basic screening questions about state or jurisdiction, case type, arrest / charge / conviction status, sentence completion, probation, fines, timing or waiting-period issues, and disqualifying factors.

   **No account required yet.** The free screening must not require signup.

3. Qualification result

   If the system identifies a possible paid path, result copy should say: **A path may be available.**

   Supporting copy should remain careful and should not say "you qualify." Preferred copy:

   > Based on what you told us, there may be a record-clearing path available. Expungement.ai can help you generate a packet and next-step instructions.

   Primary CTA: **Generate my packet — $50**

   Secondary CTA: **Save and come back later**

4. Create account

   After clicking **Generate my packet — $50**, the user creates an account. Account creation should collect first name, last name, email, and password.

   Screening answers must be saved to the account or session so the user does not restart after signup.

5. Verify email

   After signup, the user verifies their email.

   After verification, the user should be redirected to the Stripe payment gate. Copy may say:

   > Email verified. You're ready to generate your packet.

   CTA: **Continue to payment**

6. Stripe payment

   The DTC user pays the $50 packet generation fee through the Stripe payment gate.

   After successful Stripe payment, the user lands in Briefcase.

7. Briefcase

   Briefcase should greet the user personally and show personalized status:

   > Your packet is almost ready. We need a few more details before we can generate your documents and next-step instructions.

   Primary CTA: **Finish my packet information**

   Briefcase should show progress across free screening, account creation, payment, packet information, packet generation, and filing next steps.

8. State-Specific Packet Builder

   Briefcase must load the correct **State-Specific Packet Builder** based on state, county or court, type of record, case outcome, specific expungement or sealing route, and packet type.

   The builder should ask only for information needed for that state route and packet type. Universal information may include full legal name, other names used, date of birth, mailing address, phone, email, case state, county, court, case number, arrest date, charge or offense name, case outcome, and date the case ended.

   State-specific questions should be driven by the state profile and route. For example, Mississippi, Illinois, DC, and Pennsylvania may need different court, agency, disposition, waiting-period, sentence-completion, docket, or route-specific facts.

   The user should be able to answer:

   - I know this
   - I do not know
   - I need help finding this

   Do not block packet generation just because the user still needs outside documents. If a state requires a criminal history report, certified disposition, fingerprint card, agency certificate, official third-party form, or other outside paperwork, the packet should include next-step guidance explaining what to obtain before filing.

9. Generate packet

   Once required internal packet-builder fields are complete, the user can click: **Generate my packet**.

   The system generates prepared documents where available, filing instructions, a next-step checklist, required outside document guidance, expected fees where known, court or agency filing guidance, and plain-English warnings and disclaimers.

10. Download packet and checklist

   After generation, Briefcase status changes to **Packet ready**.

   Primary CTA: **Download my packet**

   Secondary CTA: **View filing checklist**

11. Briefcase menu and follow-up

   Briefcase should include a permanent **Check another case** menu item. The user may run another free screening for a different arrest, charge, conviction, or jurisdiction.

   After packet generation, Briefcase should include outcome follow-up:

   > Tell us what happened with your case.

   CTA: **Update my case status**

## Guardrails

- No account wall before the free check.
- No payment before a possible path result.
- Result copy says **A path may be available**, not "you qualify."
- No duplicate screening after signup.
- DTC requires Stripe before packet generation.
- After successful Stripe payment, the user lands in Briefcase.
- Briefcase must load the state-specific packet builder based on state + route + packet type.
- Do not block packet generation only because outside paperwork is still needed.

## Clean Final Flow

**Check for free** -> qualification questionnaire -> **A path may be available** -> **Generate my packet — $50** -> **Create account** -> **Verify email** -> **Stripe payment** -> **Briefcase** -> **State-Specific Packet Builder** -> **Generate my packet** -> **Download my packet** + filing checklist -> outcome follow-up.
