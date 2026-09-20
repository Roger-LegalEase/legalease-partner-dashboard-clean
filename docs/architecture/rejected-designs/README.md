# Rejected designs

Nothing in this directory is executable. These files are kept only so the
reasoning that rejected them stays readable next to the decision that replaced
them.

Supabase applies migrations from `supabase/migrations/` alone. Files here carry a
`.rejected` suffix and are not valid migration filenames, so no tool can pick
them up by accident.

| File | Status | Rejected by |
|---|---|---|
| `20260828000000_pin05_participant_pii_column_privileges.sql.rejected` | `NOT_APPLIED / TRANSITIONAL / NOT_ACCEPTED` | `../adr/ADR-0001-participant-ownership-and-the-claim-boundary.md` |
| `20260828001000_pin05_participant_ownership.sql.rejected` | `NOT_APPLIED / TRANSITIONAL / NOT_ACCEPTED` | `../adr/ADR-0001-participant-ownership-and-the-claim-boundary.md` |

Neither was applied to any environment. The first is inert — a column-level
`REVOKE` beneath a table-level `GRANT SELECT` changes no effective privilege in
PostgreSQL. The second treats the symptom: it gives an owner to an object that
should not be durable before a claim.

## Their verifiers were removed, deliberately

`scripts/verify-pin05-participant-pii-privileges.mjs` and
`scripts/verify-pin05-participant-ownership.mjs` were deleted along with their
npm scripts. Both read the migration text and asserted on it, and both passed
against `20260828000000` — which is inert. A verifier that reads SQL and reports
that a control exists is how an inert control looks like a working one.

What replaced them measures behaviour instead:
`scripts/verify-shared-claim-boundary-db.mjs` applies the real migration to a
throwaway PostgreSQL 16 cluster and asks the database what a role can actually
do, using `has_table_privilege`, `has_column_privilege`, `pg_policies` and real
DML. `scripts/verify-shared-claim-boundary-app.mjs` covers the application half.
