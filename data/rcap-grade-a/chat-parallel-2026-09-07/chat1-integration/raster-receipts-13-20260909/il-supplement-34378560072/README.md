# Illinois repaired-byte receipts: consume the existing run

Run **34378560072** completed successfully. This supplement recovers the three original RASTER_PASS verdicts for `il-exp-qualprob-set`, `il-seal-2yr-set`, and `il-seal-3yr-set`: six PDFs, 78 original page measurements. Each canonical/boundary PDF is 13 pages. The checked-out packet commit is **a77595707ec97a980306d184ac07b549884ce038**. Workflow-definition head **a3d4587b0fbbbfa887c78372afbfdb8824906333** is a different identity.

## Retrieval and consumption

`il-original-raster-receipts.tar.xz` is 7,200 bytes.

SHA-256: `6c0535f1cad7e6ce57efa94407ff0df2c4296efc69592f4eeab8249ce3ee05b4`

Git blob: `dc266bb326935a58b63b142313dd27120cf8314c`

Read this additive directory from the existing receipt PR, without replaying earlier consumed batches. Verify the small archive, extract into new scratch storage, and use the existing bundle-directory admission path. `TRANSPORT.json` and `PAGE_IMAGES_SHA256.json` retain the already-consumed format. `RUN_API_PROJECTION.json` and `JOBS_API_PROJECTION.json` are separately labeled API projections, not original artifact members. The matrix job is **102558149484**, canary **102557443108**; family job and artifact identities are in TRANSPORT.json.

All four original ZIP sizes/digests matched the API. ZIP integrity, safe unique member paths, all 78 actual PNG bodies, byte lengths, decoding, page sequence, and detected paper bounds were checked. Six original JSON member bytes are unchanged. The compact archive was reopened and every member compared. It contains no PNG bodies or replacement PDFs. Keep `imageBytesReadBy` truthful and the identity-path second-source viewport limitation explicit. Preserve five exercised negative controls and the one explicitly unexercised headless-shell rendering control.

Captain owns admission against current PDFs, complete inventory, ancestry and applicable independent returns. The transport is not a semantic review or terminal approval. No new render, queue write, claim change, importer change, main push or production action occurred here. Do not overwrite the newer full-set importer or run replay tests in the integration worktree.

## Four disputed output inventories: concrete repository findings

Examined at Captain **ad3b743eae0570770c9b343b62311ab71eb5c5ec**. These are bounded builder/report findings, not a live-delivery test, policy adoption or packet approval. Check newer changes before applying consequences.

### Pennsylvania: assembly components are not six declared packet variants

Directory: `data/rcap-all50/overlays/census-v1/pa/pa-pardon-expungement-set--official-pdf-fill/`.

`reports/rendered-artifacts.json` declares two assembled outputs in `artifacts`: canonical.pdf and boundary.pdf, five pages each. Each pageManifest is guidance pages 1-2, petition page 3, proposed-order pages 4-5. The `packets` array contains those two fixtures' composition, not six file paths.

`scripts/build-census-v1-pa_pardon_expungement-set.mjs` lines 1200-1300 writes `${fixtureName}--${source.formNumber}.pdf` for per-component byteProof, retains the SAME bytes in filledForms, copies those pages into the complete packet, and pushes ONLY `${fixtureName}.pdf` into artifacts. The separate files are assembly/measurement components in this builder, not extra selections.

`product-wiring.json` is DECLARED_NOT_INSTALLED and proposes the combined canonical.pdf, not the four standalone component paths. Its `binding.packetComponents` omits process_guidance despite the complete PDF/report including it: preserve that separate upstream relationship defect; a corrected file classification must not silently claim installed fulfillment.

The report's combined hashes bca67f48a63bc882b2a6c9017620c7379085d207a25a39e15b084f0d1f850d15 and aeefc64429488991c8dd5b7bbf04d74fc6b93a032d778857c6ead0dad4741dff match the retained original run 34357236801 verdict pins. This comparison is report-to-receipt, not a fresh hash of repository PDF bytes.

Engineering consequence: carry the two complete outputs and four retained component artifacts explicitly in the existing inventory schema. Confirm that no selected delivery path independently exposes component PDFs. Do not delete evidence, infer exposure from a directory glob, or relabel an exposed deliverable to evade coverage. Where the complete current deliverables and existing receipt still match, reuse that receipt rather than rendering their component pages again solely because scratch files exist. If a component actually ships separately, it remains a separate delivery requiring the applicable coverage. No live path was exercised in this examination.

### Alabama trafficking: four real complete selections

`al/al-trafficking-set--custom-pleading/reports/rendered-artifacts.json` (under the census-v1 overlay root) declares canonical/boundary for BOTH misdemeanor and felony: four complete 11-page PDFs, 44 pages. Each contains CR-65 and C-10. These are not four duplicates or an arbitrary choice of one canonical. Use all four declared `packets[].file` entries for enrollment; retain the existing unresolved scope/order questions separately. Report blob: a6f6811dd418535a9f909ddd11e0f23bbe4a3074.

### Nebraska pre-2017: six real complete selections

`ne/ne-seal-pre2017-set--official-pdf-fill/reports/rendered-artifacts.json` declares canonical/boundary for dismissed-prosecutor-motion, dismissed-problem-solving-court, and acquitted: six complete five-page PDFs, 30 pages. The report already supplies each file, hash, size and component list. Enroll this explicit six-file set; do not choose whichever canonical-looking filename appears first. Preserve the separately recorded primary/alternate-form procedural residual. Report blob: 5271b77218baced5ca790b55e5970eb2e24229b4.

### Oregon: route packets versus motion component

`or/rcap-or-official-pdf-fill--official-pdf-fill/reports/rendered-artifacts.json` distinguishes the full artifact `file` from `motionFile`. Its two routes, arrest-no-charges and dismissed-charge, have canonical/boundary complete packets: four nine-page outputs, 36 pages. The pageManifest includes five motion/declaration pages, two criminal-history-request pages and two instructions pages. Enroll the explicit full-packet entries, preserving both route selections. Treat a `motionFile` separately only according to its actual delivery role; it must not be mistaken for the complete packet, which has additional required components. The existing proposed-order gap is not resolved here. Report blob: bbcc14af48c7fc88ca804f28a37d6f92c0b4cc4e.

No shared declaration was edited by this trace. The immediate work is precise inventory/selection reconciliation, not a fresh question to Roger about whether every PDF in fixtures is a participant deliverable.
