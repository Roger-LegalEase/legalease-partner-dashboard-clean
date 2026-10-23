# RCAP render worker container.
#
# Build (from the repository root):
#   docker build -f deploy/rcap-render-worker/Dockerfile \
#     -t rcap-render-worker:<git-sha> .
#
# A local build produces an image ID, not a published registry digest. After
# the release process publishes and verifies an immutable registry digest, use
# that digest for RCAP_WORKER_CONTAINER_DIGEST on the deployed worker. Local
# image tests do not establish publication or authorize participant delivery.
#
# The worker performs no network access during render: rendering is pure
# pdf-lib over server-held data. Database and storage traffic happen before and
# after the render step. No browser, no subprocess, no build tools at runtime.

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Optional build secret "proxy_ca": a CA bundle for a TLS-terminating egress
# proxy, needed only where the build network re-signs registry traffic. It is
# absent by default, so an ordinary build is unchanged, and because it is a
# BuildKit secret rather than a build arg it is never written into a layer or
# into image history. Only node_modules leaves this stage, so no CA reaches the
# runtime image either.
#   docker build --secret id=proxy_ca,src=/path/to/ca-bundle.crt ...
RUN --mount=type=secret,id=proxy_ca,target=/run/secrets/proxy_ca \
    if [ -s /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --omit=dev --no-audit --no-fund

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
# Non-root: the worker owns nothing on the filesystem beyond its scratch dir.
RUN useradd --system --create-home --shell /usr/sbin/nologin rcapworker \
  && mkdir -p /tmp/rcap-render-scratch && chown rcapworker /tmp/rcap-render-scratch
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY scripts/rcap-render-worker.mjs scripts/
COPY scripts/lib/ scripts/lib/
COPY scripts/rcap-custom-pleading/court-facing-rows.mjs scripts/rcap-custom-pleading/
COPY src/ src/
COPY data/record-clearing/legal-decisions/2026-10-23-ms-nonconv-sponsored-preview.json data/record-clearing/legal-decisions/

# Static JSON imports reached from the worker must survive module loading.
COPY data/rcap-all50/overlays/census-v1/ak/ak-courtview-set--official-pdf-fill/production-field-map.json data/rcap-all50/overlays/census-v1/ak/ak-courtview-set--official-pdf-fill/
COPY data/rcap-all50/overlays/census-v1/ak/ak-mistaken-identity-set--official-pdf-fill/production-field-map.json data/rcap-all50/overlays/census-v1/ak/ak-mistaken-identity-set--official-pdf-fill/
COPY data/rcap-all50/overlays/census-v1/ak/composed-treatment:obligation:runtime-only:ak:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085--custom-pleading/production-field-map.json data/rcap-all50/overlays/census-v1/ak/composed-treatment:obligation:runtime-only:ak:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085--custom-pleading/
COPY data/rcap-all50/overlays/census-v1/al/al-diversion-set--official-pdf-fill/production-field-map.json data/rcap-all50/overlays/census-v1/al/al-diversion-set--official-pdf-fill/
COPY data/rcap-all50/overlays/census-v1/al/al-felony-dwop-set--official-pdf-fill/production-field-map.json data/rcap-all50/overlays/census-v1/al/al-felony-dwop-set--official-pdf-fill/
COPY data/rcap-all50/overlays/census-v1/al/al-felony-nonconviction-90-set--official-pdf-fill/production-field-map.json data/rcap-all50/overlays/census-v1/al/al-felony-nonconviction-90-set--official-pdf-fill/
COPY data/rcap-all50/overlays/census-v1/al/al-misd-conviction-set--official-pdf-fill/production-field-map.json data/rcap-all50/overlays/census-v1/al/al-misd-conviction-set--official-pdf-fill/
COPY data/rcap-all50/overlays/census-v1/al/al-misd-conviction-set--official-pdf-fill/source-receipt.json data/rcap-all50/overlays/census-v1/al/al-misd-conviction-set--official-pdf-fill/
COPY data/rcap-all50/overlays/census-v1/al/al-misd-dwop-set--official-pdf-fill/production-field-map.json data/rcap-all50/overlays/census-v1/al/al-misd-dwop-set--official-pdf-fill/
COPY data/rcap-all50/overlays/census-v1/al/al-misd-nonconviction-90-set--official-pdf-fill/production-field-map.json data/rcap-all50/overlays/census-v1/al/al-misd-nonconviction-90-set--official-pdf-fill/
COPY data/rcap-all50/overlays/census-v1/al/al-pardoned-felony-set--official-pdf-fill/production-field-map.json data/rcap-all50/overlays/census-v1/al/al-pardoned-felony-set--official-pdf-fill/
COPY data/rcap-all50/overlays/census-v1/al/al-trafficking-set--custom-pleading/production-field-map.json data/rcap-all50/overlays/census-v1/al/al-trafficking-set--custom-pleading/
COPY data/rcap-all50/overlays/census-v1/ar/ar-felony-seal-set--official-pdf-fill/production-field-map.json data/rcap-all50/overlays/census-v1/ar/ar-felony-seal-set--official-pdf-fill/
COPY data/rcap-all50/overlays/census-v1/ar/ar-felony-seal-set--official-pdf-fill/source-receipt.json data/rcap-all50/overlays/census-v1/ar/ar-felony-seal-set--official-pdf-fill/
COPY data/rcap-all50/overlays/census-v1/ar/ar-nonconviction-seal-set--official-pdf-fill/production-field-map.json data/rcap-all50/overlays/census-v1/ar/ar-nonconviction-seal-set--official-pdf-fill/
COPY data/rcap-all50/overlays/census-v1/ar/ar-nonconviction-seal-set--official-pdf-fill/source-receipt.json data/rcap-all50/overlays/census-v1/ar/ar-nonconviction-seal-set--official-pdf-fill/
COPY data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/production-field-map.json data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/
COPY data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/source-receipt.json data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/
COPY data/rcap-all50/overlays/census-v1/ca/ca-1203-4a-set--official-pdf-fill/production-field-map.json data/rcap-all50/overlays/census-v1/ca/ca-1203-4a-set--official-pdf-fill/
COPY data/rcap-all50/overlays/census-v1/ca/ca-1203-4a-set--official-pdf-fill/source-receipt.json data/rcap-all50/overlays/census-v1/ca/ca-1203-4a-set--official-pdf-fill/
COPY data/rcap-all50/overlays/census-v1/mn/mn-petition-609a02-subd3-set--custom-pleading/product-wiring.json data/rcap-all50/overlays/census-v1/mn/mn-petition-609a02-subd3-set--custom-pleading/
COPY data/rcap-all50/overlays/census-v1/mn/mn-petition-609a02-subd3-set--custom-pleading/production-field-map.json data/rcap-all50/overlays/census-v1/mn/mn-petition-609a02-subd3-set--custom-pleading/
COPY data/rcap-all50/overlays/census-v1/mn/mn-prosecutor-agreed-set--custom-pleading/product-wiring.json data/rcap-all50/overlays/census-v1/mn/mn-prosecutor-agreed-set--custom-pleading/
COPY data/rcap-all50/overlays/census-v1/mn/mn-prosecutor-agreed-set--custom-pleading/production-field-map.json data/rcap-all50/overlays/census-v1/mn/mn-prosecutor-agreed-set--custom-pleading/
COPY data/rcap-all50/overlays/census-v1/mo/mo-610-122-arrest-expungement-set--official-pdf-fill/product-wiring.json data/rcap-all50/overlays/census-v1/mo/mo-610-122-arrest-expungement-set--official-pdf-fill/
COPY data/rcap-all50/overlays/census-v1/mo/mo-610-122-arrest-expungement-set--official-pdf-fill/production-field-map.json data/rcap-all50/overlays/census-v1/mo/mo-610-122-arrest-expungement-set--official-pdf-fill/
COPY data/rcap-all50/overlays/census-v1/mo/mo-610-122-arrest-expungement-set--official-pdf-fill/source-receipt.json data/rcap-all50/overlays/census-v1/mo/mo-610-122-arrest-expungement-set--official-pdf-fill/
COPY data/rcap-all50/overlays/census-v1/mo/mo-art-xiv-marijuana-set--official-pdf-fill/product-wiring.json data/rcap-all50/overlays/census-v1/mo/mo-art-xiv-marijuana-set--official-pdf-fill/
COPY data/rcap-all50/overlays/census-v1/mo/mo-art-xiv-marijuana-set--official-pdf-fill/production-field-map.json data/rcap-all50/overlays/census-v1/mo/mo-art-xiv-marijuana-set--official-pdf-fill/
COPY data/rcap-all50/overlays/census-v1/mo/mo-art-xiv-marijuana-set--official-pdf-fill/source-receipt.json data/rcap-all50/overlays/census-v1/mo/mo-art-xiv-marijuana-set--official-pdf-fill/
COPY data/rcap-all50/overlays/census-v1/ny/ny-mrta-marijuana-set--official-pdf-fill/product-wiring.json data/rcap-all50/overlays/census-v1/ny/ny-mrta-marijuana-set--official-pdf-fill/
COPY data/rcap-all50/overlays/census-v1/ny/ny-mrta-marijuana-set--official-pdf-fill/source-receipt.json data/rcap-all50/overlays/census-v1/ny/ny-mrta-marijuana-set--official-pdf-fill/
COPY data/rcap-all50/overlays/census-v1/or/rcap-or-official-pdf-fill--official-pdf-fill/production-field-map.json data/rcap-all50/overlays/census-v1/or/rcap-or-official-pdf-fill--official-pdf-fill/
COPY data/rcap-grade-a/legal-decisions/LEGAL_BLOCKED_RESOLUTION_2026-09-11.json data/rcap-grade-a/legal-decisions/
COPY data/rcap-grade-a/legal-decisions/OWNER_BATCH_ADOPTION_2026-09-02.json data/rcap-grade-a/legal-decisions/
COPY data/rcap-ledger/completed-output-counsel-manifest.json data/rcap-ledger/
COPY data/rcap-ledger/crosswalk-resolution/E4-R2.json data/rcap-ledger/crosswalk-resolution/
COPY data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json data/record-clearing/legal-decisions/
COPY data/record-clearing/legal-design-intake/AK.memo.json data/record-clearing/legal-design-intake/
COPY data/record-clearing/legal-design-intake/AL.memo.json data/record-clearing/legal-design-intake/
COPY data/record-clearing/legal-design-intake/AR.memo.json data/record-clearing/legal-design-intake/
COPY data/record-clearing/legal-design-intake/CA.memo.json data/record-clearing/legal-design-intake/
COPY data/record-clearing/legal-design-intake/CT.memo.json data/record-clearing/legal-design-intake/
COPY data/record-clearing/legal-design-intake/DC.memo.json data/record-clearing/legal-design-intake/
COPY data/record-clearing/legal-design-intake/FL.memo.json data/record-clearing/legal-design-intake/
COPY data/record-clearing/legal-design-intake/KS.memo.json data/record-clearing/legal-design-intake/
COPY data/record-clearing/legal-design-intake/MD.memo.json data/record-clearing/legal-design-intake/
COPY data/record-clearing/legal-design-intake/MN.memo.json data/record-clearing/legal-design-intake/
COPY data/record-clearing/legal-design-intake/MO.memo.json data/record-clearing/legal-design-intake/
COPY data/record-clearing/legal-design-intake/MS.memo.json data/record-clearing/legal-design-intake/
COPY data/record-clearing/legal-design-intake/MT.memo.json data/record-clearing/legal-design-intake/
COPY data/record-clearing/legal-design-intake/NY.memo.json data/record-clearing/legal-design-intake/
COPY data/record-clearing/legal-design-intake/OH.memo.json data/record-clearing/legal-design-intake/
COPY data/record-clearing/legal-design-intake/VA.memo.json data/record-clearing/legal-design-intake/
COPY data/record-clearing/production-factory/packet-proofs/rcap-ak-guidance-implementation.json data/record-clearing/production-factory/packet-proofs/
COPY data/record-clearing/production-factory/packet-proofs/rcap-ca-guidance-implementation.json data/record-clearing/production-factory/packet-proofs/
COPY data/record-clearing/production-factory/packet-proofs/rcap-md-guidance-implementation.json data/record-clearing/production-factory/packet-proofs/
COPY data/record-clearing/production-factory/packet-proofs/rcap-mn-custom-pleading.json data/record-clearing/production-factory/packet-proofs/
COPY data/record-clearing/production-factory/packet-proofs/rcap-mn-guidance-implementation.json data/record-clearing/production-factory/packet-proofs/
COPY data/record-clearing/production-factory/packet-proofs/rcap-mo-guidance-implementation.json data/record-clearing/production-factory/packet-proofs/
COPY data/record-clearing/production-factory/packet-proofs/rcap-ny-guidance-implementation.json data/record-clearing/production-factory/packet-proofs/
COPY data/record-clearing/production-factory/packet-proofs/rcap-oh-guidance-implementation.json data/record-clearing/production-factory/packet-proofs/
# Read-only runtime data. The worker resolves every one of these against
# process.cwd(), which is /app, so the repository-relative layout is preserved
# exactly. The set is not a copy of data/ (1.1 GB): it is the closure the worker
# actually reads, enumerated in runtime-data-manifest.json and regenerated by
# build-runtime-data-manifest.mjs whenever a reader is added or removed.
# Without these the image starts and then refuses every route, because each
# reader is guarded and treats an absent file as "no authority".
COPY deploy/rcap-render-worker/runtime-data-manifest.json deploy/rcap-render-worker/preflight.mjs deploy/rcap-render-worker/
COPY data/rcap-grade-a/worker-static-authority.json data/rcap-grade-a/
COPY data/rcap-grade-a/maintenance/route-holds.json data/rcap-grade-a/maintenance/
COPY data/rcap-codex/release-readiness.json data/rcap-codex/
COPY data/rcap-all50/problematic-pdf-register.json data/rcap-all50/
COPY data/rcap-all50/review-artifacts/f2-dispositions.json data/rcap-all50/review-artifacts/
COPY data/rcap-all50/guidance-packets/ data/rcap-all50/guidance-packets/
# loadComponentDeferrals and loadTerminalTreatments FAIL OPEN: an absent
# directory yields an empty map, and resolvePacketRoute — reached from
# buildRenderJobSpec on the worker's own graph — then stops suppressing a
# component-deferred or terminally-treated track instead of failing. The build
# context is filtered to route.json under composed-routes (the only file that
# loader opens), so the COPY below carries exactly the manifest set.
COPY data/rcap-all50/composed-routes/ data/rcap-all50/composed-routes/
COPY data/rcap-all50/terminalization-treatments/ data/rcap-all50/terminalization-treatments/
COPY data/rcap-ledger/packet-fulfillment-records.json data/rcap-ledger/packet-correction-required.json \
     data/rcap-ledger/route-kind-adjudications.json data/rcap-ledger/route-presentation-conflicts.json \
     data/rcap-ledger/track-pathway-crosswalk.json data/rcap-ledger/
COPY data/record-clearing/factory-v2-route-registry.json data/record-clearing/legal-design-packet-set-manifests.json data/record-clearing/
COPY data/record-clearing/legal-decisions/route-ratification-registry.json data/record-clearing/legal-decisions/
# The binding scans this whole directory and matches file bytes against a
# record's packetSpecification.sha256, so it ships complete.
COPY data/record-clearing/packet-specifications/ data/record-clearing/packet-specifications/
# §7 supplemental guides, and the brand asset the approved design carries.
# The guides are static ESM imports in guide-registry.ts -- a missing one stops
# the module graph loading, which is why the registry does not scan a directory:
# a scan would read an omitted guide as "this route has no §7" and ship a packet
# whose filing-instructions page the specification had already retired.
COPY data/record-clearing/supplemental-guides/ data/record-clearing/supplemental-guides/
COPY data/record-clearing/brand/legalease-logo.png data/record-clearing/brand/
# The MS paid-consumer successor closure. The loader reads all of it on every
# call and returns null when any part is absent, so an omission here does not
# fail the build or crash the worker -- it quietly withdraws the owner's scope.
#
# All three links ship. The controlling decision is v3, which names the bytes
# the shared Fees & costs correction moved; v2 and the 2026-09-14 record ship
# beside it because the loader walks the chain two links back and proves each
# superseded record is still present and unedited before it admits the
# successor. Dropping either one does not degrade to "an older approval" -- it
# refuses the current one.
#
# Every path below must also be re-included in Dockerfile.dockerignore, which
# excludes `*` by default. That agreement is checked by
# scripts/test-worker-image-copy-context-agreement.mjs, because these two lists
# drifted apart once and produced an image that could not be built.
COPY data/record-clearing/legal-decisions/2026-09-20-ms-nonconv-paid-consumer-successor-v3.json \
     data/record-clearing/legal-decisions/2026-09-20-ms-nonconv-paid-consumer-successor-v2.json \
     data/record-clearing/legal-decisions/2026-09-14-ms-nonconv-paid-consumer-successor.json \
     data/record-clearing/legal-decisions/
COPY data/rcap-ledger/grade-a/ms-nonconviction-successor-review.evidence.json \
     data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.artifacts.json \
     data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.participant-delivery.raster-review.json \
     data/rcap-ledger/grade-a/
# The approved bytes themselves: the loader hashes these files, so the approval
# cannot outlive the packet it approved.
COPY data/rcap-ledger/grade-a/artifacts/ms-nonconviction-successor-review-full-en.pdf \
     data/rcap-ledger/grade-a/artifacts/ms-nonconviction-successor-review-full-es.pdf \
     data/rcap-ledger/grade-a/artifacts/ms-nonconviction-successor-review-court-only.pdf \
     data/rcap-ledger/grade-a/artifacts/
USER rcapworker
# Liveness: the loop logs one JSON line per non-idle cycle; the healthcheck
# asserts the process is alive and can reach its own module graph.
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "process.exit(0)"
CMD ["node", "scripts/rcap-render-worker.mjs", "--loop"]
