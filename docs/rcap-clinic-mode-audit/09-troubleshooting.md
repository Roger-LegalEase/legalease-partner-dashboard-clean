# Troubleshooting

## I cannot find Clinic Mode or Events

That is expected. **NOT CURRENTLY IMPLEMENTED** — [CLINIC-P1-001](./gap-register.md#clinic-p1-001). There is no hidden menu or Clinic Mode flag.

## The QR opens the ordinary partner page

That is the current general launch-kit behavior, not event attribution. See [CLINIC-P1-007](./gap-register.md#clinic-p1-007).

## A staff member cannot open Access codes

The page intentionally requires `partner_admin`. The APIs incorrectly permit `partner_staff` mutation; do not use that defect. See [CLINIC-P1-006](./gap-register.md#clinic-p1-006).

## Access codes returns a server error locally

Authenticated partner routes require Supabase public URL and anon-key configuration. This audit's local run intentionally had no credentials and recorded HTTP 500. See [CLINIC-P2-002](./gap-register.md#clinic-p2-002).

## I need to reset a shared device

Stop. **NOT CURRENTLY IMPLEMENTED** — [CLINIC-P0-001](./gap-register.md#clinic-p0-001). Manual cookie/history clearing is not an accepted product control and has not passed the ten-participant test.

## The packet looks sponsored but the credit did not change

Stop packet operations and preserve non-sensitive request IDs/log evidence. See [CLINIC-P0-004](./gap-register.md#clinic-p0-004). Do not retry repeatedly or alter entitlements manually.

## I need a clinic report or participant follow-up list

**NOT CURRENTLY IMPLEMENTED** — [CLINIC-P1-005](./gap-register.md#clinic-p1-005) and **NOT CURRENTLY IMPLEMENTED** — [CLINIC-P1-004](./gap-register.md#clinic-p1-004). Do not call the unauthenticated report endpoints; [CLINIC-P0-003](./gap-register.md#clinic-p0-003) must be fixed first.
