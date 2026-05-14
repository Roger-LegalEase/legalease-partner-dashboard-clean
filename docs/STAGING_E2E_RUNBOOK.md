# LegalEase RecordShield Staging E2E Runbook

Complete `docs/STAGING_INFRASTRUCTURE_HANDOFF.md` before treating this runbook as launch evidence. The strict smoke check and provider-dashboard steps must run against the real staging app, staging Postgres, Redis REST, Stripe test mode, Checkr sandbox/test mode, OpenAI staging secret, and staging admin/auth setup.

1. Deploy the staging build from the release branch.
2. Run Prisma migrations with `npm run db:deploy`.
3. Run `npm run validate`.
4. Run `npm run smoke:staging` locally if needed; soft warnings are acceptable only when the local database or app server is not running.
5. Run `SMOKE_STRICT=true npm run smoke:staging` in staging.
   - Strict mode must fail if Postgres, Redis, provider env vars, webhook secrets, app/admin/dashboard reachability, or auth/admin config are missing.
   - If local soft smoke passes with reachability warnings, that does not replace strict staging smoke.
6. Configure Stripe test products and prices for the $199 record check, Monitoring Lite monthly, Monitoring Lite annual, and Monitoring Plus monthly.
7. Configure the Stripe webhook endpoint for checkout, invoice, and subscription events.
8. Configure the Checkr sandbox/test webhook endpoint with `CHECKR_WEBHOOK_SECRET`.
9. Create a test customer user and an admin user.
10. Complete a $199 checkout in Stripe test mode.
11. Confirm the checkout webhook creates or updates the order and Record Check case.
12. Confirm the Checkr hosted invitation is created and visible as the next customer step.
13. Complete or simulate the Checkr report lifecycle in sandbox.
14. Confirm the customer dashboard status updates without exposing raw provider payloads.
15. Confirm AI summary generation succeeds or records a safe retryable failure.
16. Confirm the expungement-readiness result appears with conservative language.
17. Subscribe to Monitoring Lite monthly or annual.
18. Confirm the subscription webhook activates monitoring and Continuous Check enrollment when consent is present.
19. Cancel the subscription through the Stripe Customer Portal.
20. Confirm the webhook deactivates monitoring access and cancels Continuous Check.
21. Confirm the admin dashboard shows user, order, provider IDs, Stripe IDs, summary status, readiness, monitoring status, and audit timeline.
22. Run a data deletion/anonymization test for the staging customer.
23. Verify `ProviderEvent` payloads are redacted for Stripe and Checkr.
24. Verify no SSN, full DOB, driver license number, raw report payload, authorization token, or secret appears in logs.
25. Open `/admin` and verify aggregate counts for cases, invitations, reports, summaries, monitoring, anonymization, and recent audit events.
26. Open `/admin/cases` and verify filters for payment, invitation, report, summary, monitoring, manual review, and anonymization.
27. Open a case detail page and verify sections for customer, payment, provider, AI summary, expungement readiness, monitoring, provider events, audit timeline, and admin actions.
28. Flag and resolve manual review; confirm both actions create audit events and do not alter expungement-readiness output.
29. Retry a failed AI summary; confirm success or safe failure is shown and audited.
30. Confirm anonymized cases show `Anonymized customer` and hide customer email.
31. Open `/terms`, `/privacy`, `/beta-disclaimer`, `/support`, and `/data-deletion`; confirm each page is present and marked for counsel review.
32. Verify beta flags: `BETA_ACCESS_ENABLED`, `BETA_INVITE_ONLY`, purchase flags, `AI_SUMMARY_ENABLED`, admin retry, and deletion request controls.
33. Confirm invite-only mode blocks a non-approved user from checkout and allows an approved beta user.
34. Confirm disabled Record Check or monitoring purchase flags block checkout creation.
35. Confirm the admin dashboard shows beta flag status without exposing invite code values.
36. Review notification templates and confirm emails direct users to log in without report details.
37. Confirm landing, dashboard, and support copy position RecordShield as a personal self-check and avoid approval, denial, scoring, or suitability claims.
38. Complete `docs/STAGING_RELEASE_REHEARSAL.md`.
39. Complete `docs/BETA_GO_NO_GO.md`.
40. Confirm `docs/ROLLBACK_PLAN.md` can disable beta access, purchases, monitoring purchase, and AI summary without blocking admin/support/deletion workflows.

Manual acceptance notes:
- Do not enter real SSNs, full DOBs, or driver license numbers into LegalEase.
- Use Checkr hosted flow for candidate data collection.
- Treat Stripe and Checkr webhooks as the source of truth for access.
- Duplicate provider webhook deliveries should not create duplicate records, summaries, audit logs, or downstream jobs.
- Out-of-order Checkr events should not regress a completed report to an older state.
- Legal/compliance placeholders are not final attorney-approved documents; counsel must review before public launch.
