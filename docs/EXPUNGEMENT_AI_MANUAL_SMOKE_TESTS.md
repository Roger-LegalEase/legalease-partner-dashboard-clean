# Expungement.ai Manual Smoke Tests

Run these checks before a production launch decision. These checks do not replace automated verification.

## Contact and support

- Open `/expungement-ai/contact` and verify support email, mailing address, technical support link, Briefcase link, and new check link.
- Submit a contact request and verify a LegalEase OS support item is created.
- Open `/expungement-ai/support` and submit a support request without SSN, full DOB, or full address.
- Submit a technical support request and verify a LegalEase OS support item is created.
- Submit a support request containing a test SSN, full DOB, phone, email-in-body, and full street address, then verify the LegalEase OS item message is redacted and no secret values appear.
- Verify a partner user cannot access the consumer support item.
- Verify production does not return success if the LegalEase OS write fails.
- Confirm both pages say Expungement.ai cannot provide legal advice and cannot guarantee court outcomes.

## Stripe/payment support checks

- Confirm checkout loads from a packet-ready Briefcase result.
- Confirm the $50 amount is shown.
- Confirm payment confirmation returns to the packet-ready flow.
- Confirm receipt/payment metadata appears in Briefcase.
- Confirm failed or canceled payment does not generate a packet.
- Confirm guidance_only cannot access checkout.
