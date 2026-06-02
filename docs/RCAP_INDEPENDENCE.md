# RCAP Independence

The LegalEase Record-Clearing Access Program is a partner-facing platform that lives at:

```text
https://www.legaleasepartner.com
```

RCAP is separate from the consumer-facing Expungement.ai product. RCAP partner pages, partner payments, partner onboarding, dashboards, safe email delivery, and future partner intake routes should operate inside the LegalEase Partner Journey OS.

## Why RCAP Is Separate

RCAP is built for organizations that sponsor or coordinate record-clearing access programs. It manages partner setup, partner-specific landing pages, launch assets, operational dashboards, weekly reports, and final impact reporting.

Expungement.ai is a direct-to-consumer product. It may remain listed as a record-clearing service module, but it should not control RCAP intake or become the default destination for RCAP partner pages.

## Partner Page Routing

Public partner pages should route users to RCAP-native intake paths by default:

```text
/intake/[partnerSlug]
```

The future RCAP Wilma eligibility chat will live behind that route. Until it is built, the route shows a safe placeholder that does not collect sensitive user data and does not promise eligibility or outcomes.

## Future Document Generator Route

Future RCAP document workflow support should live at:

```text
/documents/[partnerSlug]
```

This route is placeholder-ready only. It should not generate documents or collect sensitive case facts until the full workflow, review process, and legal-risk controls are designed.

## What Not To Couple To Expungement.ai

Do not make RCAP partner CTAs default to the consumer-facing Expungement.ai funnel.

Do not require Expungement.ai account creation for RCAP partner onboarding, partner dashboards, launch kits, weekly reports, or final impact reports.

Do not treat consumer Expungement.ai intake as the source of truth for RCAP partner state.

## How Expungement.ai May Remain A Module

Expungement.ai may remain listed as a record-clearing service/module in the Partner Journey OS because it is part of the LegalEase record-clearing service stack.

That module label does not mean RCAP users are routed into the consumer funnel by default. RCAP intake should remain partner-native and domain-native at `www.legaleasepartner.com`.
