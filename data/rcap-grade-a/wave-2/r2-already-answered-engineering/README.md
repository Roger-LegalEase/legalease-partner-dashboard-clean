# R2_ALREADY_ANSWERED_ENGINEERING

Wave 2 · Claude Remote · residual lane · replaces `C8_ALREADY_ANSWERED_ENGINEERING`.

Thirty-seven legal-review rows whose question a controlling record in this
repository already answers. C8 audited all thirty-seven citations, found one
genuine conflict, read its row-level stop condition as a lane-level one and
implemented nothing. This lane implements thirty-six and stops the one.

## Files

| File | What it is |
| --- | --- |
| `rows.json` | The required return. One row per assigned routeKey, `COMPLETED` or `STOPPED`, each naming its decision record, the participant A branches it settled, where the effect lands and the exact change. |
| `route-treatment-bindings.json` | The engineering effect. One governed branch-configuration set per route, derived from its controlling record and expressed in the runtime's own `RouteOutcomeMode` vocabulary. |
| `stopped.json` | The one stopped row, with both sides of the conflict and what the controlling record requires instead. |
| `decomposition-table.json` | The join between counsel's output-treatment prose and `RouteOutcomeMode`, as a reviewable table rather than a regular expression. |
| `generate-r2.mjs` | Regenerates all three from the records in the tree. |
| `verify-r2.mjs` | Thirteen refusals, sharing no code with the generator. |

```sh
node data/rcap-grade-a/wave-2/r2-already-answered-engineering/generate-r2.mjs
node data/rcap-grade-a/wave-2/r2-already-answered-engineering/verify-r2.mjs
```

## What a binding actually decides

Each controlling record states an output treatment in prose — for Connecticut,
`AUTOMATIC STATUS/CORRECTION GUIDANCE OR COURT PETITION PACKET`. That sentence
is two service branches, and the record's own note says the two "must never
share a checkout path". The runtime has no way to express that while the route
carries one `outcomeMode`.

A binding turns the sentence into branch configurations the runtime can hold:
each with a stable branch id, its own `RouteOutcomeMode`, its own `RouteStage`,
its own disposition-predicate slot, and the record's effective-date note carried
across as a binding constraint. Fifty-five branches across thirty-six routes.

## Why every branch carries `packetFamily: null`

Binding a packet family is a packet-factory act with its own approval. This lane
implements the outcome-mode decision and nothing else, so every branch is
emitted with a null packet family. Under `routePaymentAuthority` in
`src/lib/legal-authority/index.ts` that closes payment on all fifty-five, which
is why this lane opens no commercial route. `verify-r2.mjs` R2-9 re-derives that
from the runtime's own constants rather than trusting the field.

## What this found

Sixteen assigned routes resolve to a live route contract. Not one of them can
express the treatment its record requires:

- **12** declare a single `outcomeMode` where the record states disjoint
  branches, so one of the record's dispositions is unreachable as written.
- **3** declare the mode the record derives but only one configuration, where
  the record requires two or more that may not collapse into one.
- **1** is owed two conjunctive branches and declares a single mode.

A seventeenth route has no contract carrying its key at all, so its record has
nowhere to resolve.

Each is named per route in `route-treatment-bindings.json` under
`targets[].drift`. This is the lane's substantive finding: the gap is not
missing citations, it is contracts that cannot hold the answers they already
have.

## The stopped row

`obligation:track-pathway:OR:or_acquittal:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c`
— ROW stop, lane continued.

The retriage cites `LD-OR-01`, which maps the route to one
`COURT SET-ASIDE PACKET`. Two newer counsel records,
`LWD-2026-08-29-OR-SUBSECTION` and `LWD-2026-08-29-OR-PACKET-SCOPE`, name that
exact route legally overbroad: paragraph (1)(c) reaches only matters where no
accusatory instrument was filed, and acquittals and ordinary dismissals are
governed by (1)(d). The record wins and the retriage is the defect.

It stops rather than binds because the record requires three disposition-bound
treatments with distinct route identities, and this lane holds one route key,
not three. Route identity is not in its owned paths, and emitting a single
binding would re-record the treatment the counsel record retires. `stopped.json`
carries the three required treatments, their form options and the required-fact
contract, read from the counsel record.

## Two observations, not defects

`NATIONAL-2026-08-28-LA-IMM-03` and `NATIONAL-2026-08-28-LA-IMM-04` read as
Louisiana ids but their own `jurisdiction` and `routeKeys` govern North Dakota
and South Carolina, and both match their rows exactly. The record content
controls; the id string is misleading. Carried in `rows.json` under
`observations`.

## Scope

Owned paths confined every write to this directory, so no runtime file was
edited. Each row names the runtime file and field its binding governs under
`target[]`, which is what integration applies.

Completing this assignment opens no commercial route, proves no packet and
approves no output.
