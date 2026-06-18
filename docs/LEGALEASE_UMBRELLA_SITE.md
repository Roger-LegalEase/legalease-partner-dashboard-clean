# LegalEase Umbrella Site

## Route Map

- `/legalease` renders the umbrella company landing page.
- `/legalease/waitlist` renders the roadmap and product waitlist form. It accepts `?product=record-shield`, `startapart`, `claimcoach`, `fresh-start-network`, `rcap`, or `expungement-ai`.
- `/legalease/contact` renders topic-tagged contact routing. It accepts `?topic=support`, `partnership`, `press`, or `other`.
- `/legalease/terms` renders the LegalEase Terms and Conditions content from the handoff in a readable legal-document layout.
- `/legalease/disclaimer` renders the LegalEase Website Disclaimer content from the handoff in the same legal-document layout.
- Privacy links route to the existing approved `/privacy` page because the handoff explicitly noted that a LegalEase umbrella privacy policy was missing.

## Product Positioning

LegalEase is the umbrella company and infrastructure layer for self-help law. Expungement.ai is the dominant live proof point, not the whole company identity.

The catalog hierarchy is:

- Dominant proof point: Expungement.ai, CTA to `/expungement-ai`.
- Available now: RCAP, CTA to `/partners`; Record Shield, CTA to `/legalease/waitlist?product=record-shield`.
- Roadmap waitlist: StartApart, ClaimCoach, and The Fresh Start Network, all CTA to `/legalease/waitlist` with product preselected.

## Form Routing Behavior

`/legalease/waitlist` posts to `/api/legalease/waitlist`.

`/legalease/contact` posts to `/api/legalease/contact`.

Both API routes validate JSON, cap payload size, redact PII-like message content, and call `submitLegalEaseCorrespondence`. The operational target is the LegalEase OS table `legalease_os_support_items`.

The current production table constraint only allows `source = 'expungement_ai'` and `type = 'support_request'`. This change adds an isolated pending migration artifact, `docs/sql/phase-32-legalease-umbrella-correspondence.sql`, to allow `source = 'legalease_umbrella_site'` and `type = 'waitlist_request'`. The migration artifact was created but not applied.

Production does not silently claim success if persistence is unavailable. If Supabase is not configured or the table rejects the insert, the API returns `503`. Non-production dry-run is available only by explicitly setting `LEGALEASE_FORMS_DRY_RUN=true`; successful dry-run responses include `dryRun: true`.

## Wilma Scripted Preview

The umbrella-site Wilma bubble is a scripted persona preview only. It never calls the live Wilma model, never generates legal answers, and never provides eligibility verdicts.

The canned router sends:

- Eligibility and record-clearing questions to `/expungement-ai/check` or `/expungement-ai`.
- Support and contact questions to `/legalease/contact`.
- Immigration, federal matters, active cases, deadlines, emergency issues, court strategy, and similar hard-stop topics to human help through `/legalease/contact`.

## Privacy And Signoff Checklist

Pre-launch manual items remain:

- Privacy/legal signoff for a LegalEase umbrella privacy policy. Until approved content exists, the site links to existing `/privacy`.
- Counsel signoff on Terms, Disclaimer, UPL language, and self-help positioning.
- Lawrence founder quote approval.
- Ricky W. testimonial authenticity and permission review.
- Public hosted OG image URL replacement. The app currently uses the local `/legalease/brand/og-card.png` placeholder.
- Verified LegalEase social profile URLs before adding footer social links.

## Deploy Note

All legacy relative HTML links from the handoff were converted to app routes. No deployment was performed.
