# Captain note — the trace denominator, and one fact that narrows the packaging hypothesis

**Date:** 2026-09-21
**Status:** Captain note. Nothing integrated, nothing mutated, no approval, no
route opened, no production action.

## The packaging commit has not landed

`origin/codex/mission-lock-engineering` is still at `c01851ac0`, which Captain
already carries by cherry-pick. There is no trace verifier and no packaging
commit on the branch, so the seven-step sequence cannot start at step 1. This
note is the work that does not depend on it.

## Independent denominator — 13, corroborated

Swept every `process.cwd()`-relative runtime read in `src/` rather than taking
the count on trust. The distinct single-file JSON inputs on the render and
admission closure:

| # | path | read from |
|---|---|---|
| 1 | `data/rcap-grade-a/maintenance/route-holds.json` | `packet-route-resolver.ts:299` |
| 2 | `data/rcap-codex/release-readiness.json` | `packet-route-resolver.ts:348` |
| 3 | `data/rcap-all50/problematic-pdf-register.json` | `packet-route-resolver.ts:376` |
| 4 | `data/record-clearing/factory-v2-route-registry.json` | `factory-v2-registry.ts:643` |
| 5 | `data/record-clearing/legal-design-packet-set-manifests.json` | `factory-v2-registry.ts:302, 383, 438` |
| 6 | `data/rcap-grade-a/fulfillment-observation-snapshot.json` | `grade-a-admission.ts:65` |
| 7 | `data/rcap-render/worker-publication-evidence.json` | `grade-a-admission.ts:76` |
| 8 | `data/rcap-grade-a/fulfillment-authority-registry.json` | `grade-a-registry.ts:180` |
| 9 | `data/record-clearing/legal-decisions/2026-09-20-ms-nonconv-paid-consumer-successor-v3.json` | `paid-consumer-successor.ts:5` |
| 10 | `data/record-clearing/legal-decisions/2026-09-20-ms-nonconv-paid-consumer-successor-v2.json` | `paid-consumer-successor.ts:12` |
| 11 | `data/record-clearing/legal-decisions/2026-09-14-ms-nonconv-paid-consumer-successor.json` | `paid-consumer-successor.ts:20` |
| 12 | `data/rcap-grade-a/worker-static-authority.json` | `worker-static-authority.ts:13` |
| 13 | `data/rcap-ledger/track-pathway-crosswalk.json` | `guidance-packet-registry.ts:662` |

Thirteen, arrived at independently. The count agrees.

**Directory-backed inputs are not in that thirteen, and are easy to miss.** They
are not single files and a `data/**`-shaped fix would not necessarily cover
them:

- `src/lib/rcap-engine/compiled/profiles` — `profile-registry.ts:7`, **under
  `src/`, not `data/`**
- `data/rcap-all50/composed-routes` — `guidance-packet-registry.ts:204, 272`
- the `PACKET_DIR` and `TERMINAL_TREATMENT_DIR` roots — same file, lines 50,
  762, 1239
- the directory `consumer-specification-binding.ts:33` walks with `readdirSync`

A trace that covers thirteen files and no directories would report success and
still leave the closure incomplete. Whatever lands should be checked against
this list, not against its own.

## The fact that narrows the hypothesis

`profile-registry.ts:7` resolves
`path.join(process.cwd(), "src/lib/rcap-engine/compiled")` and reads
`profiles/` with `fs.readdirSync` — a computed, cwd-relative, untraceable
directory read **with no `existsSync` guard**, so a missing directory throws
rather than degrading.

In run 35558992309 the deployed Preview successfully ran screening, claimed the
matter on the canonical MS pathway, saved packet information and established a
verified protected record. All of that requires `getProfileByJurisdiction` to
resolve. **So cwd-relative runtime reads do work in the deployed function, at
least for `src/lib/rcap-engine/compiled/`.**

That does not falsify the packaging hypothesis, but it materially narrows it.
"Next.js cannot trace computed paths, therefore none of these files are
bundled" is **too broad** and is contradicted by the Preview's own behaviour.
The real question is per-path presence, not whether computed-path reads work at
all.

Two consequences, both practical:

1. The bundle inspection must report **per path**, including the directories
   above. A blanket answer will not distinguish the cases.
2. The falsification branch is live and cheap to reach. If the thirteen are
   present in the lambda, the packaging story is wrong and the divergence is
   runtime behaviour — exactly the branch Roger named.

## A design observation, recorded not acted on

`factory-v2-registry.ts:643-648` guards its registry read with
`fs.existsSync(file)`. A missing canonical input therefore yields an **empty**
route registry, no factory-v2 admission, and an ADR-0004 `legacy_retired`
refusal whose wording is indistinguishable from a deliberate retirement
decision. `profile-registry.ts` has no such guard and would fail loudly.

A missing canonical input should be loud. That asymmetry is outside the current
bounded target and nothing here changes it; it belongs in the record so it is
not rediscovered later from the same confusion.

## Accepted

The exact deployment where the regression first appeared is historically useful
and is **not** a C1 blocker. The launch-critical question is whether the
repaired candidate packages the complete present-day closure and restores the
real participant journey. The discriminator task I previously assigned on that
point is withdrawn.

Identities unchanged: application `884ad51d0ad50c520ec0ba2834eac03194ce88ac`,
worker source `117b469c453a403fbd217f1c441a08c7c68f6b3a`, digest
`sha256:9faa24e8c6919c5801d5c38fd40d9476c4e54188fc7ab0087ba9eb711371b34f`,
Supabase `hyflxnlhpmiqxvvcoiia`. Per Roger's sequence the Preview will **not**
be reused once the packaging commit lands, because `next.config.ts` changes make
the integrated commit a new application candidate.
