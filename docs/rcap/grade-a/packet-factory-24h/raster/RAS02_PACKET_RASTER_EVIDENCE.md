# RAS02

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `e673b058867e4ccd335314ef845a5a88362b89bb`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (62)

### agency-application-treatment:obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_investigation_and_finding_request

- canonical `data/rcap-all50/overlays/census-v1/co/agency-application-treatment:obligation:research-decision-route:co:co-mistaken-identity-expungement:participant-investigation-and-finding-request--official-pdf-fill/fixtures/canonical.pdf` — `53170a66c1217b01ecae9991c4977c61d2c49b329a913f3c13982639c6e49ef5`
- boundary `data/rcap-all50/overlays/census-v1/co/agency-application-treatment:obligation:research-decision-route:co:co-mistaken-identity-expungement:participant-investigation-and-finding-request--official-pdf-fill/fixtures/boundary.pdf` — `7877f06d224ed44b870d92ed9d2dbdaf4c9a471795f8799ce6bb4c414df7bb3d`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### agency-application-treatment:obligation:track-only:CT:ct-provisional-pardon

- canonical `data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-only:ct:ct-provisional-pardon--official-pdf-fill/fixtures/canonical.pdf` — `a6cfc975f75e75c58649e35419939fabb0bac1f3e082d8f266824b304623f1f7`
- boundary `data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-only:ct:ct-provisional-pardon--official-pdf-fill/fixtures/boundary.pdf` — `9acd406b28b1037db95ceb4f33ba69800f22e755dfa259318869d7079c5f147c`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### ak-mistaken-identity-set

- canonical `data/rcap-all50/overlays/census-v1/ak/ak-mistaken-identity-set--official-pdf-fill/fixtures/canonical.pdf` — `29f4ca66e3be60cb84dd9a720100722ae3ec4823f15f3712913b500470ef62c6`
- boundary `data/rcap-all50/overlays/census-v1/ak/ak-mistaken-identity-set--official-pdf-fill/fixtures/boundary.pdf` — `758301c28be02067aa54a0903e04051cffe57fbee363ece5e33618e7e428c623`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### al-felony-nonconviction-90-set

- canonical `data/rcap-all50/overlays/census-v1/al/al-felony-nonconviction-90-set--official-pdf-fill/fixtures/canonical.pdf` — `e7cd495ccdfc8ecb171a0ce59d4687c428c0c825618598311b354ecfe83332dd`
- boundary `data/rcap-all50/overlays/census-v1/al/al-felony-nonconviction-90-set--official-pdf-fill/fixtures/boundary.pdf` — `8c9374e14f5695ea7499bbf71ca7c09d0c82202392869ade7951f9de62f79784`
- expected pages 11 · requested scale 2.5
- built by (no builder lane recorded)

### ar-act531-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-act531-set--official-pdf-fill/fixtures/order-canonical-filled.pdf` — `89a1d973eb3d5bbd2b16dde45392d4e95fd17b207a8e9872c65cd7952e939897` · 3 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-act531-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `9a46ded37138089a56217629bb2ecbc51075f209bbeef308a6f9bb9cc464d7f8` · 4 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-act531-set--official-pdf-fill/fixtures/order-boundary-filled.pdf` — `559c9a1309182e61cb89b6dc98ce1410465b3cf2fa8c82cfc97aafe019c39ac0` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-act531-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `909ae1530fe07a57fb1a75d65d5ec4dcc0d3edcf5b1a7528509770cb9a717d9c` · 4 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ar/ar-act531-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/ar/ar-act531-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 14 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### ar-nonconviction-seal-set

- canonical `data/rcap-all50/overlays/census-v1/ar/ar-nonconviction-seal-set--official-pdf-fill/fixtures/canonical.pdf` — `28436bb896bcf2e8ca414f6a0635af19df9cf2b07317dbd5fe4a2614a7d591e5`
- boundary `data/rcap-all50/overlays/census-v1/ar/ar-nonconviction-seal-set--official-pdf-fill/fixtures/boundary.pdf` — `8737d13ab5c420759139c2f880bb4785013753d356729464350cfe6fe4f3d871`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### az_record_sealing_conviction-set

- **6 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/az/az-record-sealing-conviction-set--official-pdf-fill/fixtures/canonical/continuation.pdf` — `902f0c9f1ba94c9fc4cd0b9937514e0cd199ad0eb2d4c13c58eacb5fba5d2fdd` · 1 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/az/az-record-sealing-conviction-set--official-pdf-fill/fixtures/canonical/order.pdf` — `3275990b206abaf7971b6e8dd9055c9c1f57ed34b78de95c4a87ff473ffccc84` · 3 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/az/az-record-sealing-conviction-set--official-pdf-fill/fixtures/canonical/petition.pdf` — `c6d205156de0b6adc685bda52acb04145717a986d782fb20221eb085a0d46f8d` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/az/az-record-sealing-conviction-set--official-pdf-fill/fixtures/boundary/continuation.pdf` — `00e369e46260caf04f33d481ae9eb7c16bc41cfb87dc21798c7c57327b24e997` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/az/az-record-sealing-conviction-set--official-pdf-fill/fixtures/boundary/order.pdf` — `6ae17d4de83a538a95aef7ede533d60da4fb27f122326febc646e9d425bb43f9` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/az/az-record-sealing-conviction-set--official-pdf-fill/fixtures/boundary/petition.pdf` — `b318361adc98b4a315ce68856fe39a42f864a5e882e593f73a4b4528e787f715` · 5 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/az/az-record-sealing-conviction-set--official-pdf-fill/fixtures/canonical/petition.pdf` and `data/rcap-all50/overlays/census-v1/az/az-record-sealing-conviction-set--official-pdf-fill/fixtures/boundary/petition.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 18 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### ca-1203-42-set

- **8 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-42-set--official-pdf-fill/fixtures/pc-1203-42-canonical/cr-106-unchanged-official.pdf` — `f8a37a9a8c30a016b432bb39fd67407717c3dee7be74bc3e3d471127bf190c5a` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-42-set--official-pdf-fill/fixtures/pc-1203-42-canonical/cr-180-filled.pdf` — `8e6b20a4115966d8d6c6fb79ca2fe072a1c7ea6e790df149bb54fc2a234f82a2` · 3 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-42-set--official-pdf-fill/fixtures/pc-1203-42-canonical/cr-181-unchanged-official.pdf` — `f737503a89465d40206b11b1123e815e44a249d324bad16d313c337a695ce504` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-42-set--official-pdf-fill/fixtures/pc-1203-42-canonical/mc-031-unchanged-official.pdf` — `defc9108f6baa4c2ca444c1571d737d841af78289bef337f874f51e595191075` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-42-set--official-pdf-fill/fixtures/pc-1203-42-boundary/cr-106-unchanged-official.pdf` — `f8a37a9a8c30a016b432bb39fd67407717c3dee7be74bc3e3d471127bf190c5a` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-42-set--official-pdf-fill/fixtures/pc-1203-42-boundary/cr-180-filled.pdf` — `fce33fd4f783f3a946bf0484e2f7acf5df379383e606f824d9f58b6cb5e020e5` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-42-set--official-pdf-fill/fixtures/pc-1203-42-boundary/cr-181-unchanged-official.pdf` — `f737503a89465d40206b11b1123e815e44a249d324bad16d313c337a695ce504` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-42-set--official-pdf-fill/fixtures/pc-1203-42-boundary/mc-031-unchanged-official.pdf` — `defc9108f6baa4c2ca444c1571d737d841af78289bef337f874f51e595191075` · 1 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ca/ca-1203-42-set--official-pdf-fill/fixtures/pc-1203-42-canonical/cr-180-filled.pdf` and `data/rcap-all50/overlays/census-v1/ca/ca-1203-42-set--official-pdf-fill/fixtures/pc-1203-42-boundary/cr-180-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 16 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### ca-prop64-set

- **12 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-prop64-set--official-pdf-fill/fixtures/hs-11361-8-completed-sentence-application-canonical/cr-400-filled.pdf` — `87f93a9b4273a1af89de31a7576ae0e4aae86e42361bfacfae042574695885d4` · 1 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-prop64-set--official-pdf-fill/fixtures/hs-11361-8-completed-sentence-application-canonical/cr-401-unchanged-official.pdf` — `394421959966e27833ddd481cc39b969abd788b4119b47a3670de2d2ddb05d01` · 1 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-prop64-set--official-pdf-fill/fixtures/hs-11361-8-completed-sentence-application-canonical/cr-403-unchanged-official.pdf` — `b0ecaeb4fc761feb6afe22b7c848e811a1028c8b4d1432e803c67112a347baff` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-prop64-set--official-pdf-fill/fixtures/hs-11361-8-currently-serving-petition-canonical/cr-400-filled.pdf` — `7369e11b1d4ffd7caf7d2a0b9ed981f738c109b94194652fafe0df6ad120cc84` · 1 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-prop64-set--official-pdf-fill/fixtures/hs-11361-8-currently-serving-petition-canonical/cr-401-unchanged-official.pdf` — `394421959966e27833ddd481cc39b969abd788b4119b47a3670de2d2ddb05d01` · 1 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-prop64-set--official-pdf-fill/fixtures/hs-11361-8-currently-serving-petition-canonical/cr-403-unchanged-official.pdf` — `b0ecaeb4fc761feb6afe22b7c848e811a1028c8b4d1432e803c67112a347baff` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-prop64-set--official-pdf-fill/fixtures/hs-11361-8-completed-sentence-application-boundary/cr-400-filled.pdf` — `53b07cf75b2fee362fcfa07a9f080d86dc04ae4adb705fe4039078508884ac4a` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-prop64-set--official-pdf-fill/fixtures/hs-11361-8-completed-sentence-application-boundary/cr-401-unchanged-official.pdf` — `394421959966e27833ddd481cc39b969abd788b4119b47a3670de2d2ddb05d01` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-prop64-set--official-pdf-fill/fixtures/hs-11361-8-completed-sentence-application-boundary/cr-403-unchanged-official.pdf` — `b0ecaeb4fc761feb6afe22b7c848e811a1028c8b4d1432e803c67112a347baff` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-prop64-set--official-pdf-fill/fixtures/hs-11361-8-currently-serving-petition-boundary/cr-400-filled.pdf` — `ac3f310b0bdfe8244965e31f1953a90df70e39e264ac9cdc81f384b9906b2290` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-prop64-set--official-pdf-fill/fixtures/hs-11361-8-currently-serving-petition-boundary/cr-401-unchanged-official.pdf` — `394421959966e27833ddd481cc39b969abd788b4119b47a3670de2d2ddb05d01` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-prop64-set--official-pdf-fill/fixtures/hs-11361-8-currently-serving-petition-boundary/cr-403-unchanged-official.pdf` — `b0ecaeb4fc761feb6afe22b7c848e811a1028c8b4d1432e803c67112a347baff` · 2 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ca/ca-prop64-set--official-pdf-fill/fixtures/hs-11361-8-completed-sentence-application-canonical/cr-400-filled.pdf` and `data/rcap-all50/overlays/census-v1/ca/ca-prop64-set--official-pdf-fill/fixtures/hs-11361-8-completed-sentence-application-boundary/cr-400-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 16 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### co_municipal_conviction_seal-set

- canonical `data/rcap-all50/overlays/census-v1/co/co-municipal-conviction-seal-set--official-pdf-fill/fixtures/canonical.pdf` — `676d922f062ce75605d4aa1bd57cf16d6fe917ef408cfc82c49ae4863d3cb022`
- boundary `data/rcap-all50/overlays/census-v1/co/co-municipal-conviction-seal-set--official-pdf-fill/fixtures/boundary.pdf` — `1c483f89703a4547c4a4ae1689ff3efa1b0be92c1aca12b17454138994a9e2b5`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:research-decision-route:NY:ny_160_55_violation:sentencing_court_transmission_correction_request

- canonical `data/rcap-all50/overlays/census-v1/ny/composed-treatment:obligation:research-decision-route:ny:ny-160-55-violation:sentencing-court-transmission-correction-request--custom-pleading/fixtures/canonical.pdf` — `de86d7e42feb083f9b96ab9a76d4d819a754b30dbac739909ad1dea39c9850e9`
- boundary `data/rcap-all50/overlays/census-v1/ny/composed-treatment:obligation:research-decision-route:ny:ny-160-55-violation:sentencing-court-transmission-correction-request--custom-pleading/fixtures/boundary.pdf` — `6bc300bff357cda42ba34c9717f58c9bc364874aeca8f663ea3c68fd064a8e93`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:GA:youthful-first-offender-restriction-route

- canonical `data/rcap-all50/overlays/census-v1/ga/composed-treatment:obligation:runtime-only:ga:youthful-first-offender-restriction-route--custom-pleading/fixtures/canonical.pdf` — `61ebc64377ad224630a7a20ced780cc0f6437054614cbe1001d8aab2a0799b61`
- boundary `data/rcap-all50/overlays/census-v1/ga/composed-treatment:obligation:runtime-only:ga:youthful-first-offender-restriction-route--custom-pleading/fixtures/boundary.pdf` — `3c7ea1d4d7a4f492d64623e0b23bbf89b30a1de3651de68f84ba7c679e27a705`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59

- canonical `data/rcap-all50/overlays/census-v1/ms/composed-treatment:obligation:runtime-only:ms:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59--custom-pleading/fixtures/canonical.pdf` — `90c4f8a029287843bc3de09f327c6dc27b99438d15d083fe5abd58efd7deb485`
- boundary `data/rcap-all50/overlays/census-v1/ms/composed-treatment:obligation:runtime-only:ms:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59--custom-pleading/fixtures/boundary.pdf` — `a6bcbd2ab9f34da7a08c1a5b1d5f4391bca586f08a20dbd7488959baf89b8b22`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:SD:juvenile-trafficking-expungement

- canonical `data/rcap-all50/overlays/census-v1/sd/composed-treatment:obligation:runtime-only:sd:juvenile-trafficking-expungement--custom-pleading/fixtures/canonical.pdf` — `d292e9b4f2d0c9b11dd90ca0f662c24544d53a1e10cd7dc5ee241cd720c05655`
- boundary `data/rcap-all50/overlays/census-v1/sd/composed-treatment:obligation:runtime-only:sd:juvenile-trafficking-expungement--custom-pleading/fixtures/boundary.pdf` — `4a4cd512bf4a30df9fb527c9aafeb3836c30a852c34648e91be7bb2a9ab4e401`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### ct-cleanslate-petition-set

- canonical `data/rcap-all50/overlays/census-v1/ct/ct-cleanslate-petition-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `d44ace77326e51a697450d18a033eadccf308b32d5d426ce5c73ffc989546e06`
- boundary `data/rcap-all50/overlays/census-v1/ct/ct-cleanslate-petition-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `e190d7304260be94e84e46fb18710ee85e1f5a5314e7a7a5a5dd5eeb33b3d052`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### ct-pardon-erasure-set

- canonical `data/rcap-all50/overlays/census-v1/ct/ct-pardon-erasure-set--custom-pleading/fixtures/canonical.pdf` — `fb22c04456ff31e1526fcc6127330c67618fdd5378da60fd512b4be51b7c410b`
- boundary `data/rcap-all50/overlays/census-v1/ct/ct-pardon-erasure-set--custom-pleading/fixtures/boundary.pdf` — `dc26b69ffdb89472c0d674378196a1e04664caf06f6c724d43117d80f28838ef`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### dc_seal_conviction-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/dc/dc-seal-conviction-set--custom-pleading/fixtures/canonical-felony_8yr.pdf` — `57ad41269dcfe9d6933fbc12d629210ed0b15f89769fa82e693e5eb094a729dc` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/dc/dc-seal-conviction-set--custom-pleading/fixtures/canonical-misdemeanor_5yr.pdf` — `069a85420cd083de902918e7ee98bd475336a23273e6dea0dde23eb3fbb8f088` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/dc/dc-seal-conviction-set--custom-pleading/fixtures/boundary-felony_8yr.pdf` — `aab749d4247bf5bb25898d7500355f7b9e05cdeb3ade3abfa2df032d18b5aabe` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/dc/dc-seal-conviction-set--custom-pleading/fixtures/boundary-misdemeanor_5yr.pdf` — `3471ea08eb2b329dbc91501b180738f77b2e8b3265925ef92574385ea5931629` · 5 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/dc/dc-seal-conviction-set--custom-pleading/fixtures/canonical-misdemeanor_5yr.pdf` and `data/rcap-all50/overlays/census-v1/dc/dc-seal-conviction-set--custom-pleading/fixtures/boundary-misdemeanor_5yr.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 20 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### de_discretionary_superior_court-set

- canonical `data/rcap-all50/overlays/census-v1/de/de-discretionary-superior-court-set--official-pdf-fill/fixtures/canonical.pdf` — `b4a52fd021617f602e56a23b9f140828ac704283539c2e9a714fa37ca42629dc`
- boundary `data/rcap-all50/overlays/census-v1/de/de-discretionary-superior-court-set--official-pdf-fill/fixtures/boundary.pdf` — `7ecd449c87303093e2f8f60d2c78cfb0ee84224c5112fa16c6c9507886576179`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### fl-trafficking-set

- canonical `data/rcap-all50/overlays/census-v1/fl/fl-trafficking-set--custom-pleading/fixtures/canonical.pdf` — `1678ea42fefc15aaf059a218eb04f70bbcc82285908975079040ca48a34292da`
- boundary `data/rcap-all50/overlays/census-v1/fl/fl-trafficking-set--custom-pleading/fixtures/boundary.pdf` — `306dcaa66ed9204479ecac711f98318c8050d1c19eb247000a045d4a98a54f3d`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### ga-fo-discharged-pre2026-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-fo-discharged-pre2026-set--custom-pleading/fixtures/canonical.pdf` — `3ba5a61a33555e0a0663c3aad11cd62d6a24e3c2e8a72e955f4898bc39f2d62d`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-fo-discharged-pre2026-set--custom-pleading/fixtures/boundary.pdf` — `f5e381285ebc4e0c6250efcaa32c40f069bd805f29176a2c5714f48be3046029`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### ga-nonconv-post2013-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-post2013-set--custom-pleading/fixtures/canonical.pdf` — `711f92ee779f58b4b8430037aa42388adc879def5730c910f120210119e3d7d3`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-post2013-set--custom-pleading/fixtures/boundary.pdf` — `9f05f64ebf633a63bb86f8b89da39c27c1f3634a0444290bace45aab088ccf2d`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### ga-vacated-j2-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-vacated-j2-set--custom-pleading/fixtures/canonical.pdf` — `6c2ce97c8086b9f64684f20680feb603b903de1a7888ce1ab4b5a29686b4181c`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-vacated-j2-set--custom-pleading/fixtures/boundary.pdf` — `490dcbf4d162cc3c91fbf6a76147661285c3934e361ae70011e798e232cd0be5`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### ia-7251-set

- canonical `data/rcap-all50/overlays/census-v1/ia/ia-7251-set--official-pdf-fill/fixtures/canonical.pdf` — `00092fc77a11cfb8be6f6d4a49d85d8cb17c3263bb765a4c3a43df4d599e1097`
- boundary `data/rcap-all50/overlays/census-v1/ia/ia-7251-set--official-pdf-fill/fixtures/boundary.pdf` — `197519714a8e299244e2641b8c5fe2dab4a4ce67ec54da5ba13db842d1063bfe`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### id_isp_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/id/id-isp-expungement-set--official-pdf-fill/fixtures/application-canonical-filled.pdf` — `c68600571515ebf2132b7879ceea6f61ea18c30e0edecb9ee8405c36ec723da6`
- boundary `data/rcap-all50/overlays/census-v1/id/id-isp-expungement-set--official-pdf-fill/fixtures/application-boundary-filled.pdf` — `48d435eaf962cf4020b4858038c7e5d45175a63534b31664d2afc002c8db57d9`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### il-exp-pardon-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-exp-pardon-set--official-pdf-fill/fixtures/canonical.pdf` — `5a8b9cf44d7634ef2f3c9d8e86592f307822396859fbab3cc4ba88ee7b31b80b`
- boundary `data/rcap-all50/overlays/census-v1/il/il-exp-pardon-set--official-pdf-fill/fixtures/boundary.pdf` — `19cd7648aaa875abf81a918eeaf0fea52174d5e29a20e6e0d537c3ca87fd3441`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### il-prostitution-j-vacate-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-prostitution-j-vacate-set--custom-pleading/fixtures/canonical.pdf` — `d4cb765983ed2ed180a74feb1a70b7b5cc43134419b2c497746d8fd188bd2657`
- boundary `data/rcap-all50/overlays/census-v1/il/il-prostitution-j-vacate-set--custom-pleading/fixtures/boundary.pdf` — `ea728bba06d2112537e99846f12d78a1c3d7f49eb8ae0f101a94291920bbf25e`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### il-seal-nonconv-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-seal-nonconv-set--official-pdf-fill/fixtures/canonical.pdf` — `333ffbeb03e846be21f52caa2088d9230b9b6d6094f90f764385218d46815d39`
- boundary `data/rcap-all50/overlays/census-v1/il/il-seal-nonconv-set--official-pdf-fill/fixtures/boundary.pdf` — `1df2b84a4cc3a6f2c4dc2e1724525e586997349940987ff396b932f3f78816c1`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### in_conviction_misd-set

- canonical `data/rcap-all50/overlays/census-v1/in/in-conviction-misd-set--custom-pleading/fixtures/canonical.pdf` — `b8dab03eb354af295a890cdf3f6319189013a70b78a2e861ed6a3073acae1de6`
- boundary `data/rcap-all50/overlays/census-v1/in/in-conviction-misd-set--custom-pleading/fixtures/boundary.pdf` — `55a851e6a344bf742a73444686a98bfbff957ed291305cb3cfdecaa6c6b3ea02`
- expected pages 10 · requested scale 2.5
- built by (no builder lane recorded)

### ky_felony_vacatur_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-felony-vacatur-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `581dee480d77d2f226b907b017c4209de89d4f4346f654256ed11ba24d32e54e`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-felony-vacatur-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `3847941126c39f4c5963e2fa06bbccbaf5936a39551118fc6df429ff21bca91b`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### ky_void_seal_marijuana_synthetic_salvia-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-void-seal-marijuana-synthetic-salvia-set--custom-pleading/fixtures/canonical.pdf` — `695ecde15ad70d6155cd548f9a22b73b499e8fcded9734c7163af2e6845276ae`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-void-seal-marijuana-synthetic-salvia-set--custom-pleading/fixtures/boundary.pdf` — `1c5f49b9b7b83407afc3f0419ed32387743aff25a2dd68d921bd2cadc303d427`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### la-985-1-interim-expungement-set

- canonical `data/rcap-all50/overlays/census-v1/la/la-985-1-interim-expungement-set--custom-pleading/fixtures/canonical.pdf` — `34cb3e8ea4b3f96a8b20106117dd2293b62e540e009e82526ab67c16f6bacbf5`
- boundary `data/rcap-all50/overlays/census-v1/la/la-985-1-interim-expungement-set--custom-pleading/fixtures/boundary.pdf` — `a8552e8addb999d1279b7fcb13396653d7ec0621ec3201b82105e56e1550084c`
- expected pages 18 · requested scale 2.5
- built by (no builder lane recorded)

### ma-expunge-time-set

- canonical `data/rcap-all50/overlays/census-v1/ma/ma-expunge-time-set--official-pdf-fill/fixtures/canonical.pdf` — `45e2589a73f35fd2cda9eff1de20a75807d6f66404d7d0ad3c26a052174f3985`
- boundary `data/rcap-all50/overlays/census-v1/ma/ma-expunge-time-set--official-pdf-fill/fixtures/boundary.pdf` — `a995e56b6f78cbda7932996029c708e57c39a2251db833dc91eb648534797964`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### md_10105_early-set

- canonical `data/rcap-all50/overlays/census-v1/md/md-10105-early-set--official-pdf-fill/fixtures/canonical.pdf` — `4258591d9ca8a8b14b167102ec868649888375701067468eae74da5528fee938`
- boundary `data/rcap-all50/overlays/census-v1/md/md-10105-early-set--official-pdf-fill/fixtures/boundary.pdf` — `20e877b099b7c2742c75e873944f5f62a610cfbd1ae84acdd9875e0ee6e93522`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### me-nonconv-set

- canonical `data/rcap-all50/overlays/census-v1/me/me-nonconv-set--custom-pleading/fixtures/canonical.pdf` — `d9ea11c3b618cf92863f653ef964f32bf893ef91a602269d1950cbda68c5b007`
- boundary `data/rcap-all50/overlays/census-v1/me/me-nonconv-set--custom-pleading/fixtures/boundary.pdf` — `4f7c2fad8a0c2a2dbd0681b5c48bea156401b82cd87746659cd8077b9df4d665`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### me-seal-survivor-set

- canonical `data/rcap-all50/overlays/census-v1/me/me-seal-survivor-set--official-pdf-fill/fixtures/canonical.pdf` — `0ee66d971f1937ca7f57595ee5e8993357be605c3497b1cb21b06d5b73400c07`
- boundary `data/rcap-all50/overlays/census-v1/me/me-seal-survivor-set--official-pdf-fill/fixtures/boundary.pdf` — `84d03dd83fa56368c2de6b3cd48fff764e18f88d3a0724a2321a6588d7e44f62`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### mi_setaside_trafficking-set

- canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-trafficking-set--official-pdf-fill/fixtures/canonical.pdf` — `acb9bf49ab83059266162eb046e4e55be6f44d9f0647e7099325bedae31e28ee`
- boundary `data/rcap-all50/overlays/census-v1/mi/mi-setaside-trafficking-set--official-pdf-fill/fixtures/boundary.pdf` — `90bd30df3077f8dc819f4c227c7cc254d1773fc0db9fc51ecf42febe950b58a2`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### mo-610-145-mistaken-identity-set

- **13 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/mo/mo-610-145-mistaken-identity-set--official-pdf-fill/automatic-on-notice.packet.pdf` — `3f016cc71868e7c99a8a2a6f50de10b3124858f8cc7946ca4666f4bfe7c25b67` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mo/mo-610-145-mistaken-identity-set--official-pdf-fill/canonical.existing-case.clerk-requires-sheet.no-order.packet.pdf` — `d5916e4444a1b6cd5974446db840f0b9ba5caef35e174ab911e9389e657c50ed` · 10 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mo/mo-610-145-mistaken-identity-set--official-pdf-fill/canonical.existing-case.clerk-requires-sheet.with-order.packet.pdf` — `91111ebd1d6050490f68527e5c80dad69fbe54ad1d8a2ecdf07a4bf5ca304114` · 11 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mo/mo-610-145-mistaken-identity-set--official-pdf-fill/canonical.existing-case.no-order.packet.pdf` — `bcde7ce09a7d79c2e3062a8b36efb7fcfca8b032cc30a2366e2b5f699a34bded` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mo/mo-610-145-mistaken-identity-set--official-pdf-fill/canonical.existing-case.with-order.packet.pdf` — `ccc7c93d3a655806360284c6ff7a93fadfd0d04aebed62d8d7edec9659fbe5a9` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mo/mo-610-145-mistaken-identity-set--official-pdf-fill/canonical.new-case.no-order.packet.pdf` — `032f212e1c778016a89091bcef901169ccb065d97e5e9d934bc3ced99986a916` · 10 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mo/mo-610-145-mistaken-identity-set--official-pdf-fill/canonical.new-case.with-order.packet.pdf` — `be87dec7f9c7b083dee0cc9386a8e48c1d39d9fadd9e9296d831c2fba5102007` · 11 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/mo/mo-610-145-mistaken-identity-set--official-pdf-fill/boundary.existing-case.clerk-requires-sheet.no-order.packet.pdf` — `75938e3d13f69df72ce6b60ff34d12bb20e4aa25d49c14faf7a57d22c6036355` · 10 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/mo/mo-610-145-mistaken-identity-set--official-pdf-fill/boundary.existing-case.clerk-requires-sheet.with-order.packet.pdf` — `aadb492780a61d459bbe79d2a4e380a3eb73825280a92b631e6ac94e5f7f95df` · 11 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/mo/mo-610-145-mistaken-identity-set--official-pdf-fill/boundary.existing-case.no-order.packet.pdf` — `2b57d5a25a6fb904ccaf5bf12eaec2ceb7df0ff8e106df00584f4f6e65edfcf1` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/mo/mo-610-145-mistaken-identity-set--official-pdf-fill/boundary.existing-case.with-order.packet.pdf` — `58a174250f55fea1f8467b09f050f0cb87724054f701b00bb19758e5ea630dc6` · 6 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/mo/mo-610-145-mistaken-identity-set--official-pdf-fill/boundary.new-case.no-order.packet.pdf` — `ed917823af5a7b4a90461508dda638fd78001a3c7e60e862c0ce37aa76a72602` · 10 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/mo/mo-610-145-mistaken-identity-set--official-pdf-fill/boundary.new-case.with-order.packet.pdf` — `40a7bbb0727ab48477f61157a31d4b68f927753778e4e1595917e4dc987cbbe4` · 11 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/mo/mo-610-145-mistaken-identity-set--official-pdf-fill/canonical.new-case.with-order.packet.pdf` and `data/rcap-all50/overlays/census-v1/mo/mo-610-145-mistaken-identity-set--official-pdf-fill/boundary.new-case.with-order.packet.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 108 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### ms-misd-1st-set

- canonical `data/rcap-all50/overlays/census-v1/ms/ms-misd-1st-set--custom-pleading/fixtures/canonical.pdf` — `96ae8c01ec97fe34edd03ded7d05e6eae45f56117073dad4366472b1afbfafd0`
- boundary `data/rcap-all50/overlays/census-v1/ms/ms-misd-1st-set--custom-pleading/fixtures/boundary.pdf` — `2303197372173345c588ccafa3db9a9e67d637ebf2b9cba656ff376fc739f563`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### nc_145_5_felony-set

- canonical `data/rcap-all50/overlays/census-v1/nc/nc-145-5-felony-set--official-pdf-fill/fixtures/canonical.pdf` — `c66b5e4246a39b0cc1d5fcbebcde8000080ac1cabcc1dec89815809eb71bacbb`
- boundary `data/rcap-all50/overlays/census-v1/nc/nc-145-5-felony-set--official-pdf-fill/fixtures/boundary.pdf` — `e0bd1765da62d1708f1ce334fbbe603ceaeaaf69dd1d7f3c262e234769e3223d`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### nd-deferred-imposition-records-set

- canonical `data/rcap-all50/overlays/census-v1/nd/nd-deferred-imposition-records-set--custom-pleading/fixtures/canonical.pdf` — `8d6c31287e83b99aa8a78568bab7aff0b8eb50efdf59f65c0de5ded7a20c9bf1`
- boundary `data/rcap-all50/overlays/census-v1/nd/nd-deferred-imposition-records-set--custom-pleading/fixtures/boundary.pdf` — `c972e9582608a156bd8ab7b1792d66c829edb8c93a50c1be28f5fcf526134a29`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### ne-expunge-le-error-set

- canonical `data/rcap-all50/overlays/census-v1/ne/ne-expunge-le-error-set--custom-pleading/fixtures/canonical.pdf` — `b3ad99b4a1ae52c251751a357bb0dc4745dd1ceb6281ed03861cb9a0988a9be8`
- boundary `data/rcap-all50/overlays/census-v1/ne/ne-expunge-le-error-set--custom-pleading/fixtures/boundary.pdf` — `df7386e9e32ad77e32fcbfebc123a0a0d5a31e24a46ad9a02050216a227c8f69`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### ne-setaside-custodial-set

- canonical `data/rcap-all50/overlays/census-v1/ne/ne-setaside-custodial-set--official-pdf-fill/fixtures/canonical.pdf` — `dd1cde67dd6ccef07c3f923b63c99ba4ff589296fa47375fb6a7e0bfb0a29cbb`
- boundary `data/rcap-all50/overlays/census-v1/ne/ne-setaside-custodial-set--official-pdf-fill/fixtures/boundary.pdf` — `07a9b4ab7f1165cb3bae77e2e2f9f5ff21c86f00a3bb6bb5051a5868067298b2`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### nj_clean_slate-set

- canonical `data/rcap-all50/overlays/census-v1/nj/nj-clean-slate-set--official-pdf-fill/fixtures/cn-10557-canonical.pdf` — `b71de1df389a55cea2c10ad6e6c7ba9f482b0ffa9c63e7dcee961b9437bf0598`
- boundary `data/rcap-all50/overlays/census-v1/nj/nj-clean-slate-set--official-pdf-fill/fixtures/cn-10557-boundary.pdf` — `cb536e9766aa55da7a128b0d878231d036794850d136b4332143277d38869464`
- expected pages 43 · requested scale 2.5
- built by (no builder lane recorded)

### ny_mrta_marijuana-set

- canonical `data/rcap-all50/overlays/census-v1/ny/ny-mrta-marijuana-set--official-pdf-fill/fixtures/mrta-destruction-request-canonical.pdf` — `37d456b6c2b79c3801bb9c07030072d5b0487a95f711a92a3fd8ef14e99b05ff`
- boundary `data/rcap-all50/overlays/census-v1/ny/ny-mrta-marijuana-set--official-pdf-fill/fixtures/mrta-destruction-request-boundary.pdf` — `5f61e8f23675070c7691b16c6522745f5fa033083725f1eefb9caccc32cb3457`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### pa_9122_1_limited_access-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/pa/pa-9122-1-limited-access-set--official-pdf-fill/fixtures/rule-791-order-canonical.pdf` — `573f9f81adb7887973d1a365b1e0b032f38f0e7312118d74e41413ea4b09918c` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/pa/pa-9122-1-limited-access-set--official-pdf-fill/fixtures/rule-791-petition-canonical.pdf` — `8996b09209eb45a12c7985155e579dc4ae2bbc6368ffdc7fba67506f137e163c` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/pa/pa-9122-1-limited-access-set--official-pdf-fill/fixtures/rule-791-order-boundary.pdf` — `bd2954aed8fe55d1041f2ce274894d5be3f5d055e2add76a2f7a6492355a4cc9` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/pa/pa-9122-1-limited-access-set--official-pdf-fill/fixtures/rule-791-petition-boundary.pdf` — `db4067c897f6d36e5e2a1085de6a3c4e9f2e94eb8df312dc531166bb082acff3` · 1 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/pa/pa-9122-1-limited-access-set--official-pdf-fill/fixtures/rule-791-petition-canonical.pdf` and `data/rcap-all50/overlays/census-v1/pa/pa-9122-1-limited-access-set--official-pdf-fill/fixtures/rule-791-petition-boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 6 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### rcap-in-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/in/rcap-in-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `9f45fa05888e1c8a3b5e51bf0a406bab9e3a5561aa0c41eaa25075cb0d783131`
- boundary `data/rcap-all50/overlays/census-v1/in/rcap-in-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `46a8741e935498111a9940106342391e82722310f1684aff4663deb897cd07f8`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-nv-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/nv/rcap-nv-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `1d72131dcf8adefe7142cb2241aa97811b4c90892342d1422d3441b649e293bf`
- boundary `data/rcap-all50/overlays/census-v1/nv/rcap-nv-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `5274a3d33329f447612a9736ac31442a760dc24b4aa2acdc01d7061175578596`
- expected pages 44 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-tn-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/tn/rcap-tn-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `8648c793f39cd71a5b330f9cb9e2696fd955acb26f1f6851c78c601f11cb5f17`
- boundary `data/rcap-all50/overlays/census-v1/tn/rcap-tn-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `5f826ee4221be5cb88f114f4d49d4d7c4794c3cbc42798d6f684a2c0f27ac902`
- expected pages 75 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-wv-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/wv/rcap-wv-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `51c4941b11cd25af2810119b919fdb45320718440afc7567fa427cba2d4e28a5`
- boundary `data/rcap-all50/overlays/census-v1/wv/rcap-wv-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `4e79ef98ff350e36a285cc1cf1db3f16fa40c7e3a373cca85f00af36c460964f`
- expected pages 12 · requested scale 2.5
- built by (no builder lane recorded)

### ri_marijuana-set

- canonical `data/rcap-all50/overlays/census-v1/ri/ri-marijuana-set--custom-pleading/fixtures/canonical.pdf` — `79bcf52eb9014313303adc20c37ec9d20d127de1dd28e5b738f2c823f0eba8f0`
- boundary `data/rcap-all50/overlays/census-v1/ri/ri-marijuana-set--custom-pleading/fixtures/boundary.pdf` — `fc9c6c8ae3934798ba7dd5eff9bf58629da65a390ba9cf0318032f8b37945312`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### tx_nd_conviction_no_supervision-set

- canonical `data/rcap-all50/overlays/census-v1/tx/tx-nd-conviction-no-supervision-set--official-pdf-fill/fixtures/canonical.pdf` — `dd3c259471713851aa1bf607e3e75fcb6bc1ede719dd934212a0039dcd6f0dd6`
- boundary `data/rcap-all50/overlays/census-v1/tx/tx-nd-conviction-no-supervision-set--official-pdf-fill/fixtures/boundary.pdf` — `cc799883f128b0d113bbb448decf7b4fdd8f07640c777d0db9e340d32f4bb988`
- expected pages 24 · requested scale 2.5
- built by (no builder lane recorded)

### tx_nd_probation_misdemeanor-set

- canonical `data/rcap-all50/overlays/census-v1/tx/tx-nd-probation-misdemeanor-set--official-pdf-fill/fixtures/canonical.pdf` — `4cbe29eccdb297c6b578da29f7b32d8a5ed64c9d5647c51457fb7398a4543051`
- boundary `data/rcap-all50/overlays/census-v1/tx/tx-nd-probation-misdemeanor-set--official-pdf-fill/fixtures/boundary.pdf` — `9b905898752d33843a13b1750632040edadaa65f7da8125ddf8c7330eda9bd07`
- expected pages 24 · requested scale 2.5
- built by (no builder lane recorded)

### ut_pet_conviction-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-conviction-set--official-pdf-fill/fixtures/canonical.pdf` — `ad594f0a40750195b67e36916f3628df5b96d337e4955c9063b415747d6e36d6`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-conviction-set--official-pdf-fill/fixtures/boundary.pdf` — `b3ba83a65754f96fe58083de62a3ce879654d6362170e11bae2f043e4c39a765`
- expected pages 19 · requested scale 2.5
- built by (no builder lane recorded)

### ut_pet_no_charges-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-no-charges-set--official-pdf-fill/fixtures/canonical.pdf` — `4c24a15e43cf80ea7a40105617adf4ebb83aef46a39000b8bcffdedfc1090523`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-no-charges-set--official-pdf-fill/fixtures/boundary.pdf` — `d9548fb7c6cab115e89137d4600b8aefb3f269dc341d97fe2d1441a213ae93df`
- expected pages 19 · requested scale 2.5
- built by (no builder lane recorded)

### va_seal_ancillary_matter_only-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-seal-ancillary-matter-only-set--official-pdf-fill/fixtures/canonical.pdf` — `60962eef718b1048f55d7392818354057fa41636640ae20bc5ec34da49d9367e`
- boundary `data/rcap-all50/overlays/census-v1/va/va-seal-ancillary-matter-only-set--official-pdf-fill/fixtures/boundary.pdf` — `bbf887ccdc75f2cab73d6afb98e9bcc6607ceee248b551b4872c742a0c3f4992`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### vt_exp_decriminalized-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-exp-decriminalized-set--official-pdf-fill/fixtures/canonical.pdf` — `4d9b64e07b2b3ed66e291ee11ddba00a37bfe413ed931ed459b271df46ca9da0`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-exp-decriminalized-set--official-pdf-fill/fixtures/boundary.pdf` — `d56f5a0fce5ba30c9c22a87aa5261c2545781e6cd8464b9b7816fb53f711fa4d`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### vt_seal_felony-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-felony-set--official-pdf-fill/fixtures/canonical.pdf` — `c360eac4b8698a0f9b11180a98e7515030dc9406746ebe0de48a61c09bb68843`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-felony-set--official-pdf-fill/fixtures/boundary.pdf` — `21fa17be618b32306ef2b22de7c2807b439815d0db0ae58becc648b2083c132a`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### vt_seal_under_25-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-under-25-set--custom-pleading/fixtures/canonical.pdf` — `cd71dce93a3404558c3d2fc33e55a3838867868781c801c7487ebad8ea049a07`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-under-25-set--custom-pleading/fixtures/boundary.pdf` — `ddf00f9ef8f86bb54495dd12a379d7edfc906a03c6e94a37a3b1e8a8df832492`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_felony-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-felony-set--official-pdf-fill/fixtures/canonical.pdf` — `585a7acff41609d13baeea797fd6477fc78bd6acb5c5888a05e640cb3f618c56`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-felony-set--official-pdf-fill/fixtures/boundary.pdf` — `bcc6e5e71d3afbae64f4f5dd41e32c20bc7f8f14e38c5bba59c26a49d801bce8`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_survivor_misdemeanor-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-misdemeanor-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` — `846360e75578ce6233dba77b03b25545a529b50cd553ad31f88d3008b429a6ad` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-misdemeanor-set--official-pdf-fill/fixtures/crrlj-09-0200-canonical-filled.pdf` — `3abc2475b78da8cff2445a99a78fa7aa18641d4c27f17d0c5eea3d6f07e40ce7` · 6 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-misdemeanor-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` — `75fac347051d6b710015ef5bbcc10b43df0a1de59078195ede75a744f4c42b77` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-misdemeanor-set--official-pdf-fill/fixtures/crrlj-09-0200-boundary-filled.pdf` — `4d844aece78a8ae1c1e97407edd305f45dbdaa2c509f8e55ef51fef03bcb3a55` · 6 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-misdemeanor-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-misdemeanor-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 22 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### wv_acc_treatment_job_readiness-set

- canonical `data/rcap-all50/overlays/census-v1/wv/wv-acc-treatment-job-readiness-set--custom-pleading/fixtures/canonical.pdf` — `a0fc30d9338c4bc1bd47cd645beb9f74cf8d7a40810ceeaa9f376f1f491da9c3`
- boundary `data/rcap-all50/overlays/census-v1/wv/wv-acc-treatment-job-readiness-set--custom-pleading/fixtures/boundary.pdf` — `458f5f5b818d57f2380b22517469c575280244eda95af1f7504ef067ef8bc096`
- expected pages 14 · requested scale 2.5
- built by (no builder lane recorded)

### wy_fel_1502-set

- canonical `data/rcap-all50/overlays/census-v1/wy/wy-fel-1502-set--custom-pleading/fixtures/canonical.pdf` — `3dcdbc4ec3d9f08b6c6302b84f254663aa9302a4f712d7451000e2ecda302e30`
- boundary `data/rcap-all50/overlays/census-v1/wy/wy-fel-1502-set--custom-pleading/fixtures/boundary.pdf` — `703e8d3202e8ecc45aefc000346d65db8bec60ae2b9f1e8ce34796e97400f800`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

## What you check, per family

1. The receipt names this run and this artifact, and the workflow run id is the one you were given.
2. **The hashes bind.** The receipt's canonical and boundary SHA-256 must equal the values above, exactly. A receipt that describes different bytes describes a different packet, and no amount of clean-looking rasters makes it this family's evidence.
3. Every expected page has a PNG.
4. No page is blank.
5. Dimensions match the requested PDF-point scale.
6. No clipped write, no overlapping participant text, no placeholder text, no protected-field ink.

All six, or the family is `RASTER_FAIL`. If the workflow could not render at all — no browser, a launch failure — that is `RASTER_BLOCKED_ENVIRONMENT` and **never** `RASTER_FAIL`: an environment that cannot look at the packet has said nothing about the packet.

## What you may write

- `data/rcap-grade-a/codex-cloud/ras02-raster-evidence/**` — and nothing else.

## What you may not touch

- any packet PDF, overlay directory, build script or field map — you modify **no** packet bytes;
- `data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json` — Captain writes the queue; you report and Captain records;
- another RAS lane's evidence directory;
- anything in `private/`, any commercial route, any Production resource.

## One family's failure does not stop another

Write a row for every family you were assigned, `RASTER_PASS`, `RASTER_FAIL` or `RASTER_BLOCKED_ENVIRONMENT`, with the measurement behind it. A lane that returns fewer rows than it was assigned families has lost work silently.

## How you return

The diff is the return.

```text
LANE: RAS02
FAMILIES ASSIGNED: 62
RASTER_PASS:
RASTER_FAIL:
RASTER_BLOCKED_ENVIRONMENT:
HASH MISMATCHES:
PACKET PDFS MODIFIED: 0
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
```

## What finishing does not do

A RASTER_PASS is one gate. It does not make a family PASS_COMPLETE, it does not promote anything, and it opens no commercial route.
