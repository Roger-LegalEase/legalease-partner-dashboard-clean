# Captain measurement — the packaging hypothesis for Target #4 is falsified

**Date:** 2026-09-21
**Measures:** Codex `a3272f733`, integrated at Captain `100e27734`
**Status:** Captain measurement. Nothing mutated beyond the integration, no
approval, no route opened, no production action, no freeze performed.

## What was measured

The trace verifier could not run here: this worktree's `node_modules` is a
symlink to `/home/user/legalease-partner-dashboard-clean/node_modules`, and
Turbopack refuses it — *"Symlink [project]/node_modules is invalid, it points
out of the filesystem root"*. That is environment drift in this worktree, **not
a defect in the commit**; the same build succeeds on the Actions runner.

So the build was run with the webpack builder, which tolerates the symlink, and
the **real** `route.js.nft.json` for `/api/expungement-ai/packet/render` was
read directly. 563 traced files.

## The result

| input | in the render trace |
|---|---|
| `data/record-clearing/factory-v2-route-registry.json` | **yes** |
| `data/record-clearing/legal-design-packet-set-manifests.json` | **yes** |
| `data/rcap-grade-a/maintenance/route-holds.json` | **yes** |
| `data/rcap-codex/release-readiness.json` | **yes** |
| `data/rcap-all50/problematic-pdf-register.json` | **yes** |
| `data/rcap-grade-a/fulfillment-observation-snapshot.json` | **yes** |
| `data/rcap-render/worker-publication-evidence.json` | **yes** |
| `data/rcap-grade-a/fulfillment-authority-registry.json` | **yes** |
| `data/rcap-grade-a/worker-static-authority.json` | **yes** |
| `data/rcap-ledger/track-pathway-crosswalk.json` | **yes** |
| `src/lib/rcap-engine/compiled/profiles/*.json` | **51 of 51** |

**None of these is in `outputFileTracingIncludes`.** The include added by
`a3272f733` lists eleven successor files and nothing else. Every input above is
traced *naturally* — Next resolves `path.join(process.cwd(), <string const>)`
statically, which is why the pattern works at all.

My earlier concern that the eight paths from the Captain denominator were
unaddressed is answered: they did not need addressing. They were already there.

## Why this falsifies the hypothesis

`src/lib/rcap/documents` is **byte-identical** between
`884ad51d0ad50c520ec0ba2834eac03194ce88ac` and this tree, and none of these
files is reached through `outputFileTracingIncludes`. Nothing that governs their
tracing differs between the frozen application and the build measured here.

Therefore the factory registry, the packet-set manifest, the route holds and all
51 compiled profiles **were already present in the `884ad51d0` Preview's render
function**. Their absence cannot explain `legacy_retired`.

The mechanism I named in `CAPTAIN_C1_TARGET_4_CLASSIFIED_2026-09-21.md` — that
computed-path reads escape tracing and leave the registry empty — is wrong, and
is withdrawn. The `existsSync` guard remains silent by construction, and that
observation stands on its own, but it is not what happened here.

Roger's own rule anticipated this: *"If this new Preview still returns
`legacy_retired` after the trace proves all 13 inputs are packaged, then the
packaging hypothesis is falsified."* The trace proves it now, without spending
the freeze, Preview and retarget cycle to learn the same thing.

## What `a3272f733` is, and is not

It **is** sound and worth keeping. The eleven successor files — packet
specification, supplemental guide, Grade-A ledger evidence and the three review
PDFs — are a real downstream closure for fulfillment and delivery, and the
verifier is a good permanent control: it builds for real, reads the real trace,
rejects all 13 single-file deletions, and rejects wildcard and sibling-route
scope. Its expectations are declared independently of the config, so deleting an
include cannot delete its own expectation.

It **is not** a fix for Target #4. It does not touch the inputs the resolver
needs to admit the MS `factory_v2` route, because those were never missing.

## Controls after integration

| control | result |
|---|---|
| focused C1 tests | **83/83** |
| hosted-full matrix mutations | **14/14 applied + caught** |
| packet-contract mutations | **18/18 caught** |
| canonical worker inputs | `reuse-accepted-digest`, `rebuildRequired: false`, `changedPaths: []` |
| Checkout gate verifier | **135/136** — see below |

The single failure is the control working correctly:
`verify-rcap-hosted-checkout-gate.mjs:320` compares the branch against
`RELEASE_CONTROL_BASE_SHA` over a list that includes `next.config.ts`, and
reports *"checkout-gate branch changes frozen application inputs"*. That is
precisely the condition that makes the integrated commit a new application
candidate. It clears when the new candidate is frozen and the pin advances. No
check was weakened and none should be.

Worker stays accepted and unchanged: `117b469c453a403fbd217f1c441a08c7c68f6b3a`,
`sha256:9faa24e8c6919c5801d5c38fd40d9476c4e54188fc7ab0087ba9eb711371b34f`.

## Where the search goes now

Back to runtime behaviour, with the space much narrower. The data is present in
the bundle, and `process.cwd()`-relative reads demonstrably work in the deployed
function — the `884ad51d0` Preview resolved compiled profiles through exactly
that pattern when it ran screening and the claim.

The next measurement worth taking is from inside the deployed function: what
`getFactoryV2Routes()` actually contains there, and whether
`fs.existsSync(path.join(process.cwd(), REGISTRY_PATH))` is true at runtime.
That needs a diagnostic surface rather than more inference, and it is Codex's
lane.

Identities unchanged; no freeze performed, no Preview built, no webhook
retargeted. Production remains unauthorized.
