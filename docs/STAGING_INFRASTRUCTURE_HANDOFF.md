# Staging Infrastructure Handoff

Task 16A requires access to external consoles that were not available in the local Codex workspace. Do not mark any item as passed until evidence is captured from the real staging environment.

## 1. Deployment Platform

Recommended default if no platform already exists:
- Platform: Vercel
- Environment: staging
- Branch: `staging` or protected `main`
- Build command: `npm run build`
- Install command: `npm ci`
- Deploy command: platform deploy from selected branch
- Rollback: Vercel deployment rollback to previous successful staging deployment
- Env var location: Vercel project settings -> Environment Variables -> Staging

Evidence to capture:
| Field | Value |
|---|---|
| Platform | pending |
| Staging app URL | pending |
| Staging admin URL | pending |
| Staging branch | pending |
| Build command | pending |
| Deploy command | pending |
| Rollback path | pending |
| Env var location | pending |

## 2. Staging Postgres

Recommended providers: Neon, Supabase, Railway Postgres, Render Postgres, or platform-managed PostgreSQL.

Required actions:
1. Provision staging Postgres.
2. Configure `DATABASE_URL` in staging secrets.
3. Run `npx prisma generate`.
4. Run `npx prisma migrate deploy`.
5. Verify connectivity with strict smoke or a database console query.
6. Verify Prisma migration table and application tables exist.
7. Create or approve staging admin/beta users through the configured auth path.

Evidence:
| Field | Value |
|---|---|
| Provider | pending |
| Database name/environment | pending |
| `DATABASE_URL` configured | pending |
| Migration command result | pending |
| Connectivity verification | pending |
| Tables verified | pending |
| Admin/beta user setup | pending |

## 3. Staging Redis REST

Recommended provider: Upstash Redis REST.

Required env vars:
- `RATE_LIMIT_REDIS_REST_URL`
- `RATE_LIMIT_REDIS_REST_TOKEN`

Required checks:
- Strict smoke fails when Redis env vars are absent.
- Strict smoke passes Redis check when Redis env vars are present.
- `RATE_LIMIT_ALLOW_MEMORY_FALLBACK` is not enabled in staging.
- Invalid webhook attempts are rate-limited.
- Valid signed webhook retries are not blocked by public route limiting.

Evidence:
| Field | Value |
|---|---|
| Provider | pending |
| Redis REST env configured | pending |
| Memory fallback disabled | pending |
| Invalid webhook throttling verified | pending |
| Valid webhook retries verified | pending |

## 4. Stripe Test Mode

Use Stripe test mode only.

Products/prices:
- Record Check + Expungement Readiness: `$199` one-time
- Monitoring Lite Monthly: `$14.99/month`
- Monitoring Lite Annual: `$149/year`
- Monitoring Plus Monthly: `$29.99/month`

Env vars:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_RECORD_CHECK`
- `STRIPE_PRICE_MONITORING_LITE_MONTHLY`
- `STRIPE_PRICE_MONITORING_LITE_ANNUAL`
- `STRIPE_PRICE_MONITORING_PLUS_MONTHLY`

Webhook endpoint:
- `${APP_BASE_URL}/api/stripe/webhook`

Required events:
- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Evidence:
| Check | Status | Evidence |
|---|---|---|
| Price IDs match env vars | pending | Stripe dashboard |
| Test checkout works | pending | Stripe test session |
| Webhook reaches app | pending | ProviderEvent/admin timeline |
| ProviderEvent redacted | pending | Admin provider event viewer |
| Case shell created/reused | pending | Admin case timeline |
| Duplicate webhook idempotent | pending | Replay evidence |

## 5. Checkr Sandbox/Test Mode

Use Checkr sandbox/test mode only.

Env vars:
- `CHECKR_API_KEY`
- `CHECKR_WEBHOOK_SECRET`
- `CHECKR_BASE_URL`
- `CHECKR_PACKAGE_SLUG`
- `CHECKR_NODE_CUSTOM_ID` if used
- `CHECKR_WORK_LOCATION_COUNTRY`
- `CHECKR_WORK_LOCATION_STATE`
- `CHECKR_WORK_LOCATION_CITY`

Webhook endpoint:
- `${APP_BASE_URL}/api/checkr/webhook`

Evidence:
| Check | Status | Evidence |
|---|---|---|
| Hosted invitation can be created | pending | Admin provider IDs |
| Provider IDs stored | pending | Case detail |
| Report lifecycle simulated/received | pending | ProviderEvent rows |
| Duplicate events idempotent | pending | Replay evidence |
| Out-of-order events do not regress status | pending | Case status timeline |
| ProviderEvent redacted | pending | Admin provider viewer |

## 6. OpenAI

Env var:
- `OPENAI_API_KEY`

Evidence:
| Check | Status | Evidence |
|---|---|---|
| Summary generation works with safe test case | pending | Admin case detail |
| Summary failure retry works | pending | Admin action audit |
| `AI_SUMMARY_ENABLED=false` creates safe manual-review state | pending | Flag test |

## 7. Admin / Auth

Required checks:
- Admin can log in.
- Non-admin is denied.
- Admin dashboard loads.
- Case list/detail load.
- Audit timeline loads.
- Redacted provider event viewer loads.
- Manual review flag works.
- Anonymization workflow works.

Evidence:
| Check | Status | Evidence |
|---|---|---|
| Admin login | pending | Staging URL |
| Non-admin denied | pending | Staging URL |
| Dashboard/case views | pending | Screenshots or notes |
| Provider viewer redacted | pending | Admin case detail |
| Manual review action | pending | Audit event |
| Anonymization action | pending | Audit event + DB verification |

## 8. First Beta Flags

Set these in staging:
```env
BETA_ACCESS_ENABLED=true
BETA_INVITE_ONLY=true
BETA_MAX_USERS=5
RECORD_CHECK_PURCHASE_ENABLED=true
MONITORING_PURCHASE_ENABLED=false
AI_SUMMARY_ENABLED=true
ADMIN_RETRY_ENABLED=true
DATA_DELETION_REQUEST_ENABLED=true
```

Evidence:
| Check | Status | Evidence |
|---|---|---|
| Non-approved user cannot purchase | pending | Checkout response |
| Approved beta user can start checkout | pending | Checkout session |
| Monitoring purchase disabled | pending | Checkout response/UI |
| Beta max users visible in smoke/admin | pending | Smoke/admin output |

## 9. Strict Smoke

Run from staging runtime or CI with staging secrets:
```bash
SMOKE_STRICT=true npm run smoke:staging
```

Evidence:
| Field | Value |
|---|---|
| Environment | pending |
| Timestamp | pending |
| Result | pending |
| Failures | pending |
| Fixes applied | pending |
| Final output location | pending |

## 10. Manual Staging E2E

Required flow:
1. Approved beta user starts `$199` checkout.
2. Stripe test checkout completes.
3. Checkout webhook creates/reuses case shell.
4. Checkr invitation is created.
5. User sees candidate-action-required/pending status.
6. Checkr report lifecycle updates status.
7. AI summary generates.
8. Expungement-readiness result appears.
9. Admin sees full timeline.
10. Provider events are redacted.
11. Monitoring purchase remains disabled.
12. Anonymization workflow works.
13. Rollback flags disable purchase flow.

Evidence:
| Flow | Status | Evidence |
|---|---|---|
| Core checkout to case shell | pending | Admin case ID |
| Checkr invitation | pending | Provider invitation ID |
| Report lifecycle | pending | ProviderEvent IDs |
| AI summary/readiness | pending | Summary status |
| Admin timeline | pending | Admin case detail |
| Redaction | pending | Provider event viewer |
| Monitoring disabled | pending | Checkout/UI proof |
| Anonymization | pending | Audit event |
| Rollback flags | pending | Blocked checkout response |
