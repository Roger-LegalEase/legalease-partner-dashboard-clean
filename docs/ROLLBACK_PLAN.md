# Rollback Plan

Use feature flags first. Do not delete records as part of rollback.

## Immediate Rollback Flags
```env
BETA_ACCESS_ENABLED=false
RECORD_CHECK_PURCHASE_ENABLED=false
MONITORING_PURCHASE_ENABLED=false
AI_SUMMARY_ENABLED=false
```

Keep these enabled where possible:
```env
ADMIN_RETRY_ENABLED=true
DATA_DELETION_REQUEST_ENABLED=true
```

## Disable Purchases
1. Set `RECORD_CHECK_PURCHASE_ENABLED=false`.
2. Redeploy or refresh env according to hosting platform.
3. Confirm `/api/checkout/record-check` returns a blocked response.
4. Confirm no new `ProductOrder` or `ShieldCase` rows are created after the cutoff.

## Disable Monitoring Purchase
1. Set `MONITORING_PURCHASE_ENABLED=false`.
2. Confirm monitoring checkout route blocks new sessions.
3. Leave existing subscription cancellation handling active.

## Disable AI Summary
1. Set `AI_SUMMARY_ENABLED=false`.
2. Confirm summaries enter safe manual-review pending state.
3. Keep admin case viewing available.

## Close Beta Access
1. Set `BETA_ACCESS_ENABLED=false`.
2. Keep support, admin, and deletion/anonymization workflows available.
3. Update support macros to explain the beta is paused.

## Pause Checkr Invitation Creation
1. Set `RECORD_CHECK_PURCHASE_ENABLED=false` to stop new paid cases.
2. If paid users exist without invitations, reconcile manually before creating or retrying invitations.
3. Do not create duplicate Checkr invitations.

## Paid Users During Rollback
- Preserve payment, audit, and ProviderEvent records.
- Reconcile every paid checkout against ProductOrder, ShieldCase, and ProviderInvitation.
- Communicate with affected users using privacy-safe language.
- If service cannot be delivered, coordinate refund through Stripe test/live dashboard as appropriate.

## Refund Path
1. Confirm payment and order status.
2. Confirm whether provider costs were incurred.
3. Process refund in Stripe dashboard or approved refund workflow.
4. Record support note and audit event.

## Verify No New Cases
- Check Stripe checkout route is blocked.
- Check recent `ProductOrder` and `ShieldCase` creation timestamps.
- Check audit events for checkout and invitation creation after rollback time.
- Check ProviderEvent rows for unexpected new paid events.

## Restore Service
1. Confirm root cause fixed.
2. Run `npm run validate`.
3. Run `SMOKE_STRICT=true npm run smoke:staging`.
4. Re-enable flags one at a time.
5. Start with `BETA_ACCESS_ENABLED=true` and `RECORD_CHECK_PURCHASE_ENABLED=true`.
6. Keep `MONITORING_PURCHASE_ENABLED=false` until cohort 2.
