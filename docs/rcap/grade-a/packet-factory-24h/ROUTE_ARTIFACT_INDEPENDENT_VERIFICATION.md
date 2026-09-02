# Route-artifact independent verification — what is owed, and what may not be inherited

**Lane that produced the evidence:** `fable/routeaccept` (route-artifact acceptance).
**Lane that must read it:** any independent verifier. **Not this one.**

This lane built the acceptance evidence for the 26 route-scoped artifacts on
`rcap-ks-custom-pleading` and `rcap-tn-custom-pleading`. It may not verify it.
A builder reading its own measurements and calling them verified is the failure
the two-lane structure exists to prevent, so every row in
`data/rcap-grade-a/route-artifact-acceptance/ROUTE_ARTIFACT_ACCEPTANCE.json`
carries `independentVerification.pending: true` and stays that way until someone
else measures it.

## The three things a verifier must not inherit

**1. The family's raster receipt does not cover a route artifact.**
`data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json` carries `RASTER_PASS`
for both families. Both bind to the family ASSEMBLY's SHA-256 —
`6a4ce684…`/`682a6a4b…` for Kansas, `4bfc8238…`/`be3ec3ee…` for Tennessee. A
route artifact is a different file with a different hash, and
`scripts/rcap-raster-batch.mjs` refuses on exactly that mismatch by design. The
route rasters in `raster-receipts/` are separate runs over the route artifacts'
own pinned bytes; check that each receipt's pin equals the artifact on disk
rather than trusting either.

**2. The family's PASS_COMPLETE does not cover a route artifact.**
`verify-packet-completeness.mjs` measures the union of a family's components.
On Tennessee that union spans eleven routes, and the family assembly it
describes is not a participant deliverable — the family's own
`reports/rendered-artifacts.json` says so
(`familyAssemblyIsAParticipantDeliverable: false`). What a participant receives
is one route's artifact. `verify-route-artifact-completeness.mjs` measures that
instead, against the route's own components taken from the field map's
`componentRoutes`.

**3. The page-equivalence proof is not a rendered measurement.**
An earlier lane proved every route-artifact page content-identical to the page
that route occupied in the family assembly, by hashing content streams and
MediaBoxes. That remains true and is not re-done here. It is still not evidence
that the route artifact renders: a page can be identical and the file it sits in
unrenderable.

## Measure these fifteen, route-scoped

The standard fifteen from the VF prompts, with the scope changed from family to
route artifact:

1. ROUTE IDENTITY — the artifact is built for the route the record names
2. SOURCE IDENTITY — every source binds by exact SHA-256, recomputed
3. COMPONENT SET — every component the ROUTE names is present, and no component of another route is
4. KNOWN PREFILLS — every known required fact is written and readable from THIS artifact's bytes
5. REQUIRED_BEFORE_FILING — every declared item is named in `participant-instructions.md`
6. ROUTE OPTIONS — every route-determined election is selected
7. REPEATING ROWS — no row carries written cells beside required cells left blank
8. PROTECTED FIELDS — no signature, signature date, certificate of mailing, court-only or prosecutor-only field carries ink
9. ARTIFACTS — the route artifact's bytes hash to what `reports/rendered-artifacts.json` names
10. PAGE ORDER — the rendered page order matches the route artifact's own `pageManifest`
11. CLIPPING AND OVERLAP — no ink outside a measured write box
12. FILING DESTINATION — the instructions name the court or agency THIS route names
13. FEE AND WAIVER — the fee and any waiver route are stated for THIS route
14. SERVICE — who must be served, and how, for THIS route
15. SELF-HELP STOP — the packet states where self-help ends

Obligations 12 to 15 are route-scoped in the source material: the family's
`participant-instructions.md` carries a per-route filing-destination, cost and
service table, and each route's own filing-instructions component states where
that route stops. Read the row for the route under verification, not the table.

## Recompute rather than read

- the artifact's SHA-256 on disk, against the `routeArtifacts` row AND the raster receipt's pin — three numbers that must be one number;
- the page count, from a parser, never a byte scan;
- the nine counters over that route's field-map rows;
- the two from-scratch rebuilds, rather than reading the determinism record's classification.

## What this lane did NOT establish

- **Central-runner raster.** The route rasters were produced in the build
  container by `scripts/rcap-raster-batch.mjs`, after `rcap-raster-canary.mjs`
  returned `CANARY_PASSED` and `RCAP_RASTER_NEGATIVE_CONTROLS_HELD` in the same
  container. That is the same tool and the same measurements the GitHub-hosted
  workflow runs, but it is not a run of
  `.github/workflows/rcap-packet-raster-acceptance-batch.yml`, so there is no
  workflow run id, no job id and no uploaded receipt artifact. If the Captain
  requires a runner receipt, the workflow takes `raster_manifest_path` as an
  input and can be dispatched against
  `data/rcap-grade-a/route-artifact-acceptance/ROUTE_ARTIFACT_RASTER_QUEUE.json`
  at this branch's commit without touching `RASTER_QUEUE.json`.
- **The rendered PNGs.** They are not committed; this container is at capacity.
  The per-page measurements are in each receipt, and the pinned SHA-256 is what
  makes a re-render reproducible.
- **Any promotion.** No build status moved, no commercial route opened, no
  queue owned by the Captain was written.
