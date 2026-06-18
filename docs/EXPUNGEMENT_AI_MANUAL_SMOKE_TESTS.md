# Expungement.ai Manual Smoke Tests

Use this checklist on a reviewed preview or production candidate. Do not deploy, apply migrations, or change secrets from this branch.

## A. Logged-Out User

- Visit `/expungement-ai`.
- Click Start free.
- Confirm redirect/sign-in flow works.
- Confirm Wilma bubble is visible.

## B. Consumer Creates Or Signs In

- Create or sign in as a consumer.
- Reach `/briefcase`.
- Start a check.
- Select any U.S. state or DC.
- Confirm no `state_not_live` branch appears.
- Confirm the check is saved to Briefcase.

## C. Packet-Ready Path

- Complete a flow that returns `packet_ready` or `packet_ready_with_caution`.
- Confirm pay gate appears.
- Confirm price is $50.
- Confirm payment confirmation works in the configured mode.
- Confirm packet generates.
- Confirm packet is saved to Briefcase.
- Confirm download action is visible.
- Confirm the download route is owner-scoped.

## D. Guidance-Only Path

- Complete a flow that returns `guidance_only`.
- Confirm no pay gate appears.
- Confirm next steps are saved to Briefcase.
- Confirm checkout API rejects the item.

## E. Non-Payment Branches

Confirm these result codes do not show a pay gate and cannot start checkout:

- `needs_more_info`
- `not_yet`
- `needs_review`
- `hard_stop`

## F. Wilma

- Confirm Wilma bubble is visible on every Expungement.ai and Briefcase page.
- Ask a direct eligibility question; confirm Wilma redirects to the screening tool.
- Ask for legal advice; confirm Wilma blocks or redirects to qualified human help.
- Enable kill-switch in a reviewed non-production or approved production test window; confirm Wilma returns the unavailable message.
- Confirm telemetry redacts SSN, DOB, email, phone, likely addresses, and detectable names.
- Confirm telemetry records guard flags, redirect target, model version, and system prompt version.

## G. Partner Safety

- Confirm partner dashboard still works.
- Confirm partner billing still works.
- Confirm partner user cannot access consumer Briefcase records.
- Confirm consumer cannot access partner dashboard data.
- Confirm partner Stripe invoice flow is unchanged.
- Confirm legacy generators still work for Mississippi, Illinois, District of Columbia, Pennsylvania, and Texas-Harris.
