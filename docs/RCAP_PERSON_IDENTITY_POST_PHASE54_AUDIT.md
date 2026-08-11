# `rcap_persons` after Phase 54 — independent post-hardening audit

Lane: person-identity post-Phase-54 audit (audit-owned; owns no product code)
Base: `d6310fd20a4d38ecaa1afdcf92773510c6fffa59` on
`origin/claude/rcap-final-sprint-integration`
Sequence applied: 26 → 27 → 28 → 30 → 49 → 50 → 51 → 52 → 53 → 54
Before-state evidence: `origin/claude/rcap-person-identity-audit` @ `83c0446`
(reference only; its failing fixture is not treated as an acceptance result)
Fixture: `scripts/verify-rcap-person-identity-post-phase54.mjs`
Evidence: `data/rcap-render/person-identity-post-phase54.json`

Verdict: **every finding from the pre-fix audit is closed.** 14/14 role cases,
13/13 tenant cases, 6/6 mutations. The legitimate service-role resolver and the
sponsored workflow are intact.

## Direct privilege proof

Read from the live catalog after applying the real sequence — not inferred from
application filtering:

| Property | Value |
|---|---|
| `relrowsecurity` | `t` |
| owner | `postgres` |
| `relacl` | `postgres=arwdDxt/postgres,service_role=arwdDxt/postgres` |
| policies | `rcap_persons_service_role_all for ALL to service_role` |
| `anon` S/I/U/D | `f / f / f / f` |
| `authenticated` S/I/U/D | `f / f / f / f` |
| `service_role` S/I/U/D | `t / t / t / t` |

The ACL carries exactly two grantees. There is no `anon` entry, no
`authenticated` entry, and no PUBLIC entry — checked directly with
`aclexplode(relacl) where grantee = 0`, which returns 0 rows (R1). That last
check matters because Phase 54 revokes from `anon` and `authenticated` *by
name*: a grant to the PUBLIC pseudo-role would have survived those statements.
None exists.

Two Phase 54 functions do carry PUBLIC execute, and both are inert:
`rcap_consumer_person_namespace()` returns the constant
`expungement-ai-consumer`, which is already published in the application source;
`rcap_guard_reserved_partner_slug()` returns `trigger` and raises
`trigger functions can only be called as triggers` when invoked directly.

## Role cases R1–R14

All fourteen pass. Each denial was executed, and every one returned
`permission denied for table rcap_persons`:

| | anon | authenticated |
|---|---|---|
| SELECT | R2 denied | R6 denied |
| INSERT | R3 denied | R7 denied |
| UPDATE | R4 denied | R8 denied |
| DELETE | R5 denied | R9 denied |

The pre-fix audit read back `we-must-vote -> email:participant@example.org` as
`anon`. That read is now refused.

- **R10** — `service_role` still inserts and resolves a consumer person.
- **R11** — resolution is idempotent: the duplicate is refused by the
  `(partner_slug, match_key)` unique index and the same row resolves.
- **R12** — user A's derived key never selects user B's row, in either direction.
- **R13** — a browser role cannot squat the reserved namespace.
- **R14** — `partner_records` refuses the reserved slug on **both** INSERT and
  UPDATE, so a partner cannot claim it by renaming either.

## Tenant and product cases T1–T12

All thirteen pass (T11 splits into a database half and a module half).

- **T1 / T2** — a partner admin is an `authenticated` session, so the partner-shaped read and write against consumer rows are both refused.
- **T3 / T4** — consumer packets carry the reserved slug (`resolveConsumerPacketId`), and partner reporting filters on the partner's own slug, so the partner's distinct-people count stays at 1 and no packet attributed to the partner resolves to a consumer person.
- **T5 / T7** — entitlement and cap consumption key on `partner_records.id`. Nothing resolves through the reserved namespace, and no consuming ledger event is keyed to a consumer person.
- **T6 / T8** — Phase 53 refuses a job carrying both a partner and a consumer binding (`must not carry consumer binding fields`), and no job in the schema holds both.
- **T9 / T10** — executed against the shipped module: one Briefcase item yields one stable matter, distinct items yield distinct matters.
- **T11** — the reserved-namespace shape constraint is two-way: `email:` keys are refused in the reserved namespace and `consumer:` keys are refused in a partner namespace, so attribution is unambiguous in both directions.
- **T12** — sponsored resolution is untouched: a partner person still inserts and still dedupes on `(partner_slug, match_key)`.

T9/T10 transpile `consumer-identity.ts` with the repository's own TypeScript and
import it, stripping only the two Next-specific imports, so the derivations
under test are the shipped ones. They report `SKIP` out loud if no compiler is
reachable rather than passing silently.

## Mutations — and one thing worth the captain's attention

Six mutations, all behaving. But the first two do not behave the way the brief
assumed, and the reason is a genuine strength rather than a gap.

Phase 54 applies **two independent defences**: it revokes the browser-role
grants *and* enables RLS with no policy for those roles. Measured separately:

| State | `authenticated` reading `rcap_persons` |
|---|---|
| Phase 54 intact | `permission denied` |
| RLS disabled only | `permission denied` — the revoke still holds |
| SELECT re-granted only | no error, **0 rows** — RLS still holds |
| both undone | **1 row** — reopened |

So neither single-control removal reopens the table. X1 and X2 assert that
continued protection; **X3**, which undoes both, is the mutation that genuinely
turns it red. This is exactly what the migration's own comment claims —
"adding a policy AND a grant would both be required to reopen this by accident"
— now proven rather than asserted.

The remaining four are straightforwardly red:

- **X4** — dropping the reserved-slug trigger lets `partner_records` accept the namespace.
- **X5** — dropping the partner filter from the reporting query moves the distinct-people count from 1 to 2, pulling the consumer person in.
- **X6** — with the guard removed, the namespace can become a partner and an entitlement then resolves through it.

The captain's own `test-rcap-phase54-mutations.mjs` was run unmodified and is
green: 5/5 red, migration restored.

## Residual, unchanged, and not a Phase 54 defect

Partner match keys remain `email:<address>` / `name:<full name>` at rest
(`deriveRcapPersonMatchKey`). Phase 54 removes every browser path to them, which
closes the disclosure. It does not digest them the way the consumer path does.
That would need a backfill and a change to `resolveRcapPersonId`'s lookup, so it
stays a separate decision for Roger rather than something to read into this
result.

## Reproducing

```
node scripts/verify-rcap-person-identity-post-phase54.mjs           # verify
node scripts/verify-rcap-person-identity-post-phase54.mjs --write   # refresh evidence
RCAP_TSC=<path to tsc> node scripts/verify-rcap-person-identity-post-phase54.mjs
```

Ordinary runs are non-mutating and compare the committed evidence against a
fresh run.
