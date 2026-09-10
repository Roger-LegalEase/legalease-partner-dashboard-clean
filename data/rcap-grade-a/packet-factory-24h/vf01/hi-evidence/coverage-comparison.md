# Hawaii route-artifact raster coverage comparison

- Base: `2c9a243e98937958ccdc05d4fb2b33d06d172116`; family: `rcap-hi-custom-pleading`.
- The family assembly is explicitly **not participant-deliverable**. It has two 20-page PDFs and an existing hash-matched `RASTER_PASS` (workflow `34476556218`) whose receipt covers those assembly bytes.
- The participant deliverable is ten separate route files: five routes × canonical/boundary, four pages each. Every route file was hashed against `reports/rendered-artifacts.json`; all 10 matched and all are marked `rasterPending: true`.
- The superseded admitted receipt (workflow `34407406641`) binds older assembly hashes and is excluded. The central route-artifact queue has 23 rows and zero Hawaii rows; committed route-receipt inventory has zero Hawaii receipts.

The supported predicate in `generate-route-artifact-raster-queue.mjs` requires route files’ own paths, hashes, page counts, and a route-specific receipt. Because `familyAssemblyIsRouteArtifact` is false/null, the family receipt cannot be inherited. `rcap-raster-batch.mjs` then requires a focused manifest row in `RASTER_PENDING`.

Captain’s manifest-owner command (not run here):

```sh
node scripts/grade-a-packet-factory-24h/generate-route-artifact-raster-queue.mjs --family rcap-hi-custom-pleading
```

Dispatch `family_batch` with these five route keys:

- `rcap-hi-custom-pleading::route::hi-first-time-drug-offender`
- `rcap-hi-custom-pleading::route::hi-marijuana-three-grams`
- `rcap-hi-custom-pleading::route::hi-pre-2004-drug-offender`
- `rcap-hi-custom-pleading::route::hi-first-time-property-offender`
- `rcap-hi-custom-pleading::route::hi-under-21-dui`

Use `raster_manifest_path=data/rcap-grade-a/route-artifact-acceptance/ROUTE_ARTIFACT_RASTER_QUEUE.json`, immutable candidate `commit_sha`, and `requested_scale=2.5`. Actual GitHub job IDs are unknown until dispatch.

No approval, demotion, terminal claim, or content-identity inference is made. STOPPED.
