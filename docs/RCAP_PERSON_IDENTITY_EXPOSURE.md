# `rcap_persons` — independent person-identity audit

Lane: person-identity adversarial audit (audit-owned; owns no product code)
Audited commit: `7e1b2c4dc1e433c07f9d0819c8125e228da4b236`
Fixture: `scripts/verify-rcap-person-identity-exposure.mjs`
Evidence: `data/rcap-render/person-identity-exposure.json`

Verdict: **6 of 17 cases pass. `public.rcap_persons` is readable and writable by
any anonymous caller, and it stores participant email addresses and names in
near-plaintext.** This is a pre-existing Phase 30 condition, not something the
consumer-identity wiring introduced — but that wiring places consumer rows in
the same table, so the exposure now spans both populations.

## The core finding

`supabase/phase-30-rcap-person-identity.sql` creates the table with **no RLS, no
policy, and no grant or revoke** — verified across the whole migration set:

```
git grep -n "rcap_persons" <tip> -- supabase/ | grep -iE "row level security|create policy|grant|revoke"
  → no matches
```

On Supabase, default privileges then hand `anon` and `authenticated` everything.
Measured on a cluster configured that way:

| | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `anon` | true | true | true | true |
| `authenticated` | true | true | true | true |

`relrowsecurity = f`, `policies = 0`.

### What that discloses

`deriveRcapPersonMatchKey` (`src/lib/rcap/person-identity.ts:25-30`) builds the
stored key as `email:<normalized address>` or, failing that,
`name:<normalized full name>`. So the column is participant contact identity in
near-plaintext, alongside the partner slug that says which programme they came
through.

Executed as `anon`, the audit read back:

```
we-must-vote -> email:participant@example.org | fulton-county -> name:jordan lee
```

These are people seeking criminal-record relief. The association between a named
individual and a record-clearing programme is close to the most sensitive fact
this system holds, and it is available to anyone holding the publishable key.

### What that allows

Each of these was executed, not inferred:

- **P5** — `anon` inserted a person into a real partner's keyspace
  (`we-must-vote`), returning a live row id.
- **P6** — `anon` rewrote an existing participant's `match_key`.
- **P10** — `anon` deleted a participant row. Because Phase 30 attaches
  `person_id ... on delete set null` to `rcap_document_packets`, and reporting
  counts distinct non-null `person_id` per partner
  (`getRcapPersonOutcomeSummary`, `person-identity.ts:58-99`), the partner's
  reported distinct-people count went **1 → 0** with no trace on the packets
  themselves.
- **P13** — `anon` inserted into the reserved `expungement-ai-consumer`
  namespace, so the consumer keyspace can be squatted even though the resolver
  guards the slug against `partner_records`.
- **P9** — one `authenticated` caller read across **3** distinct partner
  namespaces. There is no tenant boundary here at all.

Partner match keys are also *guessable*, not just readable: they are a pure
function of an email address. An attacker can pre-create
`(partner_slug, 'email:victim@example.org')` and `resolveRcapPersonId`'s upsert
on `(partner_slug, match_key)` will then adopt the attacker's row as that
participant's identity.

## What holds

- **P11 / surface 6** — packet entitlement is unaffected. Accounting derives
  from `packet_credit_ledger`, which no browser role can write (proven
  separately in the payment audit), and forged person rows cannot reach it.
- **P12 / surface 7** — `resolveConsumerPersonId` checks `partner_records` for
  the reserved slug and fails closed if a real partner ever claims it.
- **P14 / surface 8** — the consumer match key is deterministic per auth user
  (`consumer:<sha256>`), so the same user resolves to one person.
- **P15 / surface 9** — distinct users never share a key.
- **P16 / surface 10** — the matter is derived from the Briefcase item and is
  stable per item and distinct across items, so the browser's `matterId` cannot
  influence it.
- **P17** — the reserved namespace is a fixed exported constant.

Surfaces 8–10 execute the shipped functions: the pure exports of
`consumer-identity.ts` are transpiled with the repository's own TypeScript and
imported, with only the two Next-specific imports stripped. The function bodies
under test are the product's.

The consumer-side mitigation is real and correctly scoped — digesting the
consumer key means a reader of the table cannot tell which account a consumer row
belongs to. The module's own comment already says it is "a mitigation, not a
substitute for table-level RLS on `rcap_persons`, which is Roger's to
authorize." This audit is the evidence for that authorization, and it also shows
the mitigation does not extend to the partner rows sitting beside them, which
remain plaintext.

## Exact patch

Not applied here — `supabase/` is outside this lane. Validated on the audit
cluster before being written down:

```sql
-- phase-5x: rcap_persons is server-only identity, not browser-reachable data.
alter table public.rcap_persons enable row level security;

revoke all on table public.rcap_persons from public, anon, authenticated;
grant select, insert, update, delete on table public.rcap_persons to service_role;
```

Measured after applying it:

| | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `anon` | false | false | false | false |
| `authenticated` | false | false | false | false |
| `service_role` | true | true | true | true |

`anon` SELECT and DELETE both return `permission denied for table rcap_persons`,
and the resolver's own path — a `service_role` insert into the reserved
namespace — still works, reading back all rows. Both product callers
(`resolveConsumerPersonId`, `resolveRcapPersonId`) already use
`getSupabaseAdminClient()`, so no application change is required.

RLS is enabled as defence in depth: with the grants withdrawn it is not what
stops the attacker today, but it means a future default-privilege grant cannot
silently reopen the table.

### Worth deciding separately

Withdrawing the grants stops the disclosure. It does not change the fact that
partner match keys are plaintext email addresses at rest. Digesting them the way
the consumer path already does would need a backfill and would change
`resolveRcapPersonId`'s lookup, so it is a larger change than this patch and is
Roger's call rather than something to fold in here.

## Reproducing

```
node scripts/verify-rcap-person-identity-exposure.mjs           # verify
node scripts/verify-rcap-person-identity-exposure.mjs --write   # refresh evidence
RCAP_TSC=<path to tsc> node scripts/verify-rcap-person-identity-exposure.mjs
```

Surfaces 8–10 report `SKIP` out loud if no TypeScript compiler is reachable,
rather than passing silently. The fixture exits non-zero while the eleven
findings stand.
