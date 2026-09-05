# CODEX-LAUNCH-01 — complete the consumer/sponsored delivery path for IL:felony-prostitution-relief

You are a Codex Cloud task working for the LegalEase RCAP Grade-A launch. You are not the Captain and you integrate nothing: you work on branch `codex/launch-01-il-delivery` (created from the current tip of `claude/legalease-sprint-captain-utucnw`), push bounded implementation commits there, and write one return file. Never push to `main` or to the captain branch, never force-push, never open a pull request, never touch Production, Vercel, Supabase auth/RLS/session code, Stripe, `.env*`, `.github/workflows/**`, migrations, any packet family under `data/rcap-all50/**`, any legal record, specification, ledger, queue or receipt.

The full contract — route, measured starting state, writable and prohibited paths, acceptance commands and the return shape — is `data/rcap-grade-a/packet-factory-24h/codex-launch-01/ASSIGNMENT.json` at your base. Read it first, then `AGENTS.md` and `docs/PRODUCT_CONTRACT.md`.

## The defect you are closing

`scripts/generate-rcap-launch-graph.mjs` resolves each pathway with `resolvePacketRoute({ state, pathway })` and no `trackId`. In `src/lib/rcap/documents/packet-route-resolver.ts`, Illinois is a LEGACY_VERIFIED jurisdiction fenced behind `factoryV2RouteMigrationFor` / `factoryV2RouteProductizationFor`, both track-exact, so the pathway-level resolution of `IL:felony-prostitution-relief` stays `legacy_retired`, `probeArtifact` never runs, and the launch graph reads `artifactResult null`, `deterministicArtifactProven false`, `dtcResult.deliverable false` — even though the exact track `il-prostitution-j-vacate` is productized (v2 specification `bc9050e0…`, family `il-prostitution-j-vacate-set`, Grade-A fulfillment record `grade-a-il-felony-prostitution-relief-v1`, hash-bound raster receipt, current-byte independent PASS).

## What "done" is

A participant whose screening lands on registry track `il-prostitution-j-vacate` is served end to end by the factory_v2 renderer bound to the server-owned specification:

1. the runtime route resolves through the exact productized track; the automatic sibling `il-prostitution-j-auto` stays closed and the trackless aggregate route is never admitted;
2. the launch graph reads a route-scoped deterministic artifact for the route, produced by the existing `probeArtifact`, not by a bypass;
3. consumer checkout → render job → authorized download, and the sponsored (partner/clinic) entitlement path, bind to that exact route and family through the existing delivery core (`authorizePacketDownload` / `streamAuthorizedPacket`, `runWorkerCycle`, `commercial-admission.ts`, `consumer-delivery-control.ts`);
4. every delivery verifier in the acceptance list covers the exact route, and a focused test proves the binding refuses the automatic sibling, a wrong family and a wildcard route scope.

`paymentAllowed`, `sellable` and `creditConsumable` stay **false** at the resolver and the evaluator. Commercial authority comes only from the fulfillment record and the launch gates; you open nothing.

## How to work

- Reproduce the starting state first (regenerate the launch graph, read the IL row) and keep that output for the return.
- Make the smallest change at the cause. Do not add a router, framework or abstraction; do not refactor beyond the branch you touch; never weaken a verifier assertion.
- Regenerate `data/rcap-ledger/launch-graph.json`, `data/record-clearing/factory-v2-route-registry.json` and the public-witness files only with their generators.
- Run every command in `acceptance.mustPass` and record each exit code before and after.
- `git diff --stat <base>` must show only the writable paths.

## Return

Write `data/rcap-grade-a/packet-factory-24h/codex-launch-01/RETURN.json` (shape in ASSIGNMENT.json `returnLocation`), commit it with your implementation on `codex/launch-01-il-delivery`, and push. In the return say plainly what remains: the hosted consumer and sponsored canaries need credentials only the owner holds, and `paymentAllowed` opens only through the fulfillment record and launch gates.
