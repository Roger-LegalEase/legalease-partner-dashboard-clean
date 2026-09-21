# Captain classification — Target #4 is outcome B: a runtime divergence, not a source divergence

**Date:** 2026-09-21
**Classifies:** the `unpaid_render_returns_402` failure in `hosted_full` run
35558992309, against Roger's A/B question
**Status:** Captain classification. Creates no approval, opens no route,
authorizes no production action, mutates nothing.

## Outcome B, established

> **B** — frozen application source resolves `factory_v2` locally, but deployed
> Preview resolves `legacy_retired`.

Both halves are now evidenced.

**The frozen application's resolver *is* this tree's resolver.** Diffing
`884ad51d0ad50c520ec0ba2834eac03194ce88ac` against the Captain head:

| path | changed |
|---|---|
| `src/lib/rcap/documents` | **0** |
| `src/lib/rcap-engine` | **0** |
| `src/lib/expungement-ai` | **0** |
| `data/rcap-grade-a` | **0** |
| `data/record-clearing` | 4 — all of them my own legal-decision JSON files, which no resolver reads |

So evaluating the resolver on this tree *is* evaluating the frozen
application's resolver. No separate checkout was needed, and none was made.

**On that source, the exact three inputs resolve `factory_v2`.** The mapping
case builds with `state: MS`, `pathway:` the canonical MS non-conviction
pathway, `trackId: "ms-nonconv"`, and the same run recorded
`built.route.routeKind: "factory_v2"`,
`factoryV2.packetFamilyId: "ms-nonconv-set"`,
`registryTrackIds: ["ms-nonconv"]`. That case ran **in the hosted job itself**,
on the Actions runner.

**On the deployed Preview, the same identity resolved `legacy_retired`** — and
Roger's direct read of the acceptance database for item
`ca9f3b5e-1e2e-43ac-9551-d3f3d513ddcc` confirms the render's inputs were
correct at source: `artifact_refs_json.selectedTrackId`, the protected draft
snapshot and the protected final verification snapshot all carry `ms-nonconv`,
on the canonical pathway, `verified`, revision `1`.

Same code, same inputs, two answers. The difference is the execution
environment, not the source.

## The leading mechanism — named, not asserted

Route admission depends on three files read at **runtime** through
`process.cwd()`, which Next.js file tracing cannot follow because the path is
computed rather than statically imported:

| file | read at |
|---|---|
| `data/record-clearing/factory-v2-route-registry.json` | `factory-v2-registry.ts:643-648` — **guarded by `fs.existsSync(file)`** |
| `data/record-clearing/legal-design-packet-set-manifests.json` | `factory-v2-registry.ts:302, 383, 438` |
| `data/rcap-grade-a/maintenance/route-holds.json` | `packet-route-resolver.ts:299` |

`next.config.ts` carries **no** `outputFileTracingIncludes` — only
`experimental: { webpackMemoryOptimizations: true }`.

The `existsSync` guard is what makes this silent rather than loud: with the
registry file absent the loop never runs, `admitted` stays empty, **no**
factory-v2 route is admitted, and every `LEGACY_VERIFIED` jurisdiction falls
straight through the ADR-0004 fence at `packet-route-resolver.ts:733` to
`legacy_retired` — with a reason that reads like a deliberate policy decision.

What makes the hypothesis credible rather than speculative: the same file,
`packet-route-resolver.ts:19`, imports
`data/rcap-ledger/packet-correction-required.json` as a **static import**, which
Next.js does bundle. Same data tree, two mechanisms, only one traceable.

## The fact that cuts against it — stated, not buried

These runtime `fs` reads are not new. `fs.existsSync(file)` registry loading
landed **2026-08-19** (`0e6eaa868`) and `ROUTE_MIGRATIONS_PATH` **2026-09-04**
(`1061539c4`, `7580cc750`, `d798dc66b`) — both before earlier hosted MS
payment→render proofs succeeded on Preview deployments. If these files had
simply never been packaged, those proofs should have failed the same way.

So "never bundled" cannot be the whole story. Either those proofs ran on a
different application SHA and something regressed into `884ad51d0`, or the
files are present in the lambda and the cause is elsewhere. **I have not
resolved this and am not guessing at it.** It is the first thing the bundle
inspection should settle.

**A near-miss I am recording rather than repeating.** I tested whether the
packet-set manifest contains the MS route by substring-matching the composed
`"MS:<pathwayId>"` routeId and got `false`. That proves nothing: the manifest
may store jurisdiction and pathway as separate fields with the routeId composed
in code, and the mapping case demonstrably *does* resolve `ms-nonconv-set` from
it. No conclusion here rests on that test.

## Codex assignment — measurement at the runtime boundary only

The local half is done; do not redo it. The remaining question is what the
deployed function can actually read.

**Do:** inspect the frozen Preview build for `884ad51d0` —
`dpl_7fS5R3jKGRYeCCyuvafkoMfrkgpe` — and determine whether the serverless
function serving `/api/expungement-ai/packet/render` contains these three exact
paths relative to its `process.cwd()`:

- `data/record-clearing/factory-v2-route-registry.json`
- `data/record-clearing/legal-design-packet-set-manifests.json`
- `data/rcap-grade-a/maintenance/route-holds.json`

Then answer the discriminator above: if they are absent, establish whether an
earlier application SHA bundled them (which would make this a regression with a
date), and identify the smallest packaging fix — most likely an
`outputFileTracingIncludes` entry, not a code change. If they are present, say
so plainly and the mechanism above is wrong; report what the deployed resolver
actually sees instead.

**Do not:** change product code, route authority, ADR-0004, the selector
mappings, the registry or manifest data, or the verification snapshot;
re-introduce a harness-supplied `selectedTrackId`; relax
`unpaid_render_returns_402`; touch commercial authority or any acceptance
identity.

**Classify and stop. Hand back to Captain before any mutation.**

## Why this outranks the earlier targets

The first three targets were acceptance-harness defects. This is not. On the
evidence so far the application can hold a valid, verified, Grade-A route
identity — correct jurisdiction, canonical pathway, correct track, current
protected verification — and still render through the retired fallback at
runtime. If the mechanism above holds, it is a deployment-packaging defect on
the real participant path and it would affect production, which is built the
same way, not only this Preview. It is also silent by construction: the
`existsSync` guard turns a missing file into a policy-shaped refusal.

Identities unchanged: application `884ad51d0ad50c520ec0ba2834eac03194ce88ac`,
worker source `117b469c453a403fbd217f1c441a08c7c68f6b3a`, digest
`sha256:9faa24e8c6919c5801d5c38fd40d9476c4e54188fc7ab0087ba9eb711371b34f`,
Preview `dpl_7fS5R3jKGRYeCCyuvafkoMfrkgpe`, Supabase `hyflxnlhpmiqxvvcoiia`.
No rebuild, republish, new Preview, Stripe retarget or production action is
authorized.
