# Expungement.ai Consumer Adapter

This document describes the consumer-facing shell added on top of the existing RCAP all-51 engine. The shell is direct-to-consumer and separate from partner dashboard surfaces.

## Routes

Public routes:

- `/expungement-ai`
- `/expungement-ai/how-it-works`
- `/expungement-ai/pricing`

Consumer routes:

- `/expungement-ai/sign-in`
- `/expungement-ai/start`
- `/expungement-ai/check`
- `/expungement-ai/results`
- `/expungement-ai/pay`
- `/expungement-ai/packet-ready`
- `/briefcase`
- `/briefcase/matters`
- `/briefcase/documents`
- `/briefcase/reminders`
- `/briefcase/payments`
- `/briefcase/settings`

## Result Contract

The frontend renders the engine-backed consumer result object and does not decide eligibility.

```ts
type ExpungementAiEligibilityResult = {
  resultCode:
    | "packet_ready"
    | "packet_ready_with_caution"
    | "needs_more_info"
    | "not_yet"
    | "guidance_only"
    | "not_covered_yet"
    | "likely_not_eligible"
    | "needs_review"
    | "hard_stop";
  userLabel: string;
  state: string;
  pathwayLabel?: string;
  confidence: "high" | "medium" | "low" | "blocked";
  paymentAllowed: boolean;
  priceCents?: 5000;
  packetType?: "official_pdf_overlay" | "custom_pleading" | "legacy_packet" | "guidance_packet";
  reasons: string[];
  missingInfo?: string[];
  nextSteps: string[];
  emailCaptureRecommended: boolean;
  reminderRecommended?: boolean;
  disclaimer: string;
  briefcaseItemId?: string;
};
```

## Payment Rule

The $50 pay gate appears only when both conditions are true:

```ts
result.paymentAllowed === true
&& (result.resultCode === "packet_ready" || result.resultCode === "packet_ready_with_caution")
```

`guidance_only`, `needs_more_info`, `not_yet`, `needs_review`, `hard_stop`, and other non-packet outcomes must never show the pay gate.

## Briefcase Model

Every consumer has a Briefcase. The shell models these saved item types:

- eligibility checks
- results
- generated packets
- Wilma conversations

Briefcase sections include My Checks, My Packets, Filing Checklist, Reminders, Payment History, and Wilma Conversations.

`src/lib/expungement-ai/briefcase.ts` now exposes the consumer persistence foundation:

- `createBriefcaseItem`
- `listBriefcaseItems`
- `getBriefcaseItem`
- `updateBriefcaseItemStatus`

The production-ready path uses the request-scoped Supabase auth client and the `consumer_briefcase_items` table under owner-scoped RLS. The safe fallback path remains for local and not-yet-configured environments only.

The base Briefcase migration is staged in `supabase/phase-26-consumer-briefcase-items.sql`. Checkout metadata is staged in `supabase/phase-27-consumer-checkout-metadata.sql`. Neither migration has been applied by this branch.

### Filing checklist and Reminders

Each result matter that has next steps (packet-ready, guidance, needs-info, needs-review and not-yet results; never hard stops or likely-not-eligible results) shows an interactive filing checklist on its matter page:

- **From your result**: the engine's saved `nextSteps`, unchanged. Each step's id is a hash of its normalized text, so reordering keeps progress.
- **Get your packet ready / File it / Serve and follow up**: standard steps added only once a packet has been generated. Their wording is conditional ("if your court requires it"), and the packet's own filing instructions take priority.
- **Your own steps**: steps the consumer adds, capped at 30.

Consumers can check steps off and give any step a date. `/briefcase/reminders` (now in the Briefcase nav) lists every dated open step across matters, plus any `reminder_at` check-back date, grouped as overdue, next 7 days and later in the viewer's local time zone. It also shows each matter's checklist progress. Reminders appear in the Briefcase only; no reminder emails are sent.

Storage: only progress and custom steps are stored, under `artifact_refs_json.filingChecklist`, through the existing owner-scoped `mergeBriefcaseArtifactRefs` writer. No new table, column, migration, grant or RLS change is involved. `POST /api/expungement-ai/briefcase/[itemId]/checklist` accepts only JSON (`set_step`, `add_step`, `remove_step`). It resolves the matter for the request user and writes nested, step-keyed patches, so concurrent render, webhook or packet-information writes are never overwritten. It never reads or writes eligibility, payment, packet or delivery state.

Model: `src/lib/expungement-ai/filing-checklist.ts`. UI: `FilingChecklist.tsx` and `ReminderList.tsx`. Verifier: `npm run expungement:verify-filing-checklist`.

## Consumer Checkout Boundary

`src/lib/expungement-ai/payment-adapter.ts` now exposes isolated consumer checkout plumbing:

- `createConsumerPacketCheckout`
- `getConsumerCheckoutStatus`
- `recordConsumerPaymentConfirmation`

Checkout is allowed only when the owned Briefcase item has `paymentAllowed === true` and result code is `packet_ready` or `packet_ready_with_caution`. The price is fixed at 5000 cents. Non-packet outcomes never reach checkout.

When Stripe server configuration is absent, checkout returns an explicit `dry_run` session for local and review environments. Stripe invoice/partner billing code is not used or modified.

## Wilma Rule

Wilma renders as a global bubble on every Expungement.ai and Briefcase page. The frontend sends page context and renders the shell response. It does not determine eligibility, provide legal advice, predict outcomes, guarantee results, or state unverified legal facts.

## Still Needed Before Production Payment

- apply/review the consumer Briefcase and checkout metadata migrations through the production DB process
- production Stripe environment verification for the consumer checkout path
- real post-payment packet generation call
- receipt storage
- production Wilma safety harness

## Intentionally Unchanged

This shell intentionally does not change:

- partner dashboard
- partner auth/RLS
- partner billing
- Stripe live-mode
- deployment config
- legacy generators
