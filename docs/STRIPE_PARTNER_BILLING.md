# Stripe Partner Billing

LegalEase partner billing is custom-scoped after discovery. Public fixed-tier Stripe checkout is intentionally unsupported for partner engagements.

Stripe Invoices are the supported partner payment mechanism for this phase. Internal admins create scoped partner invoices after discovery, and the agreed amount is set server-side by an authenticated `internal_admin` only.

Partner users may view or pay a Stripe-hosted invoice, but they cannot set the amount, price ID, plan, tier, or billing scope. Payment state is updated only from verified Stripe webhook events.
