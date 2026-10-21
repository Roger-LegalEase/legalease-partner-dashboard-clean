# RAS02

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `1156bb1c07a1fe6122c84ce3a32fb61dfd194dca`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (85)

### agency-application-treatment:obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_investigation_and_finding_request

- canonical `data/rcap-all50/overlays/census-v1/co/agency-application-treatment:obligation:research-decision-route:co:co-mistaken-identity-expungement:participant-investigation-and-finding-request--official-pdf-fill/fixtures/canonical.pdf` — `53170a66c1217b01ecae9991c4977c61d2c49b329a913f3c13982639c6e49ef5`
- boundary `data/rcap-all50/overlays/census-v1/co/agency-application-treatment:obligation:research-decision-route:co:co-mistaken-identity-expungement:participant-investigation-and-finding-request--official-pdf-fill/fixtures/boundary.pdf` — `7877f06d224ed44b870d92ed9d2dbdaf4c9a471795f8799ce6bb4c414df7bb3d`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### agency-application-treatment:obligation:track-only:CT:ct-provisional-pardon

- canonical `data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-only:ct:ct-provisional-pardon--official-pdf-fill/fixtures/canonical.pdf` — `a5eaff9a716116431313aa330b3b05e6753b9016f897b7bad7046c6d0ec9a8a0`
- boundary `data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-only:ct:ct-provisional-pardon--official-pdf-fill/fixtures/boundary.pdf` — `346d468ef09939fd30b67d5c8a7fbeeddb63509f44a3da1f9b929a141e1f2a7e`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### ak-mistaken-identity-set

- canonical `data/rcap-all50/overlays/census-v1/ak/ak-mistaken-identity-set--official-pdf-fill/fixtures/canonical.pdf` — `29f4ca66e3be60cb84dd9a720100722ae3ec4823f15f3712913b500470ef62c6`
- boundary `data/rcap-all50/overlays/census-v1/ak/ak-mistaken-identity-set--official-pdf-fill/fixtures/boundary.pdf` — `758301c28be02067aa54a0903e04051cffe57fbee363ece5e33618e7e428c623`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### al-felony-dwop-set

- canonical `data/rcap-all50/overlays/census-v1/al/al-felony-dwop-set--official-pdf-fill/fixtures/canonical.pdf` — `77f6fb0c16f67919bf70dd313e9fe37440a13fb14a45ff468a20b9948d9fc2f2`
- boundary `data/rcap-all50/overlays/census-v1/al/al-felony-dwop-set--official-pdf-fill/fixtures/boundary.pdf` — `ee75749847d352ab3eaf51da70a08d6b22e86aa1a972cc32b22a88eabcefd95c`
- expected pages 11 · requested scale 2.5
- built by (no builder lane recorded)

### al-misd-nonconviction-90-set

- canonical `data/rcap-all50/overlays/census-v1/al/al-misd-nonconviction-90-set--official-pdf-fill/fixtures/canonical.pdf` — `a78e750dbfab51d1c78da841c09e02e2a095f12110879cf430a21de8d0a58d86`
- boundary `data/rcap-all50/overlays/census-v1/al/al-misd-nonconviction-90-set--official-pdf-fill/fixtures/boundary.pdf` — `92e03761acd5adb3c7b503c3373f14c36a4c09e038b6c107c940b6823059a06b`
- expected pages 11 · requested scale 2.5
- built by (no builder lane recorded)

### ar-act346-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-act346-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `75bffbd8493de56f1f39b7f67ff9dc93e50926fb284678209d11610eb2512f76` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-act346-set--official-pdf-fill/fixtures/order-canonical-filled.pdf` — `cb9d2019b25a9f492dcd6d483c642d2c9961d23ff6e3e8eb0db50a4c7a0c1a32` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-act346-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `59a301da89ce8b7535d84781e06a88c78f60946053d3b9d8ab4db0a1b99536c8` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-act346-set--official-pdf-fill/fixtures/order-boundary-filled.pdf` — `36d0464105a775214a93026296b38ee1822595cf4d807ed61066f09caf44e871` · 3 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ar/ar-act346-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/ar/ar-act346-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 16 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### ar-drug-court-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-drug-court-set--official-pdf-fill/fixtures/post-adjudication-canonical.pdf` — `503224a7b3d8b51a867beabbacd06b6fd40d81c4ae90f90cdce5d586b44a4aff` · 9 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-drug-court-set--official-pdf-fill/fixtures/pre-adjudication-canonical.pdf` — `87dafe5c83a0c958ee0e22a2b2fbad74156160d5e4c16ee56d83d4a6a5b91326` · 9 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-drug-court-set--official-pdf-fill/fixtures/post-adjudication-boundary.pdf` — `c10e941bfbc589d3d764db324c89c77a89816e065de452aaae232602a5e90f21` · 9 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-drug-court-set--official-pdf-fill/fixtures/pre-adjudication-boundary.pdf` — `1c73806e7c00c43bc81d949c1198d410a2a5b41ee96710afca56a8b06fedd1d7` · 9 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ar/ar-drug-court-set--official-pdf-fill/fixtures/pre-adjudication-canonical.pdf` and `data/rcap-all50/overlays/census-v1/ar/ar-drug-court-set--official-pdf-fill/fixtures/pre-adjudication-boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 36 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### ar-nonconviction-seal-set

- canonical `data/rcap-all50/overlays/census-v1/ar/ar-nonconviction-seal-set--official-pdf-fill/fixtures/canonical.pdf` — `4cf919a7c096f3e8afadb99826a3fc8bb866a5d79e8d49c6ec649cad1a769661`
- boundary `data/rcap-all50/overlays/census-v1/ar/ar-nonconviction-seal-set--official-pdf-fill/fixtures/boundary.pdf` — `7353903f1880212d28926ab41f11f7af157a056856d8585b4fe175dbe556fed6`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### az_marijuana_expungement_arrest_no_charges-set

- canonical `data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-arrest-no-charges-set--official-pdf-fill/fixtures/aoc-crem3f-canonical-filled.pdf` — `6dad189b1cdb575dfc7ef7e0647c077440cd4e331a7e2bf389a522773099c5d3`
- boundary `data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-arrest-no-charges-set--official-pdf-fill/fixtures/aoc-crem3f-boundary-filled.pdf` — `8f041f1d4fd898a176746d1dd5aed7b5967c20b51b14609b7529b6056f9646a5`
- expected pages 3 · requested scale 2.5
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

### ca-1203-4-set

- **30 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-early-discharge-canonical/cr-106-unchanged-official.pdf` — `f8a37a9a8c30a016b432bb39fd67407717c3dee7be74bc3e3d471127bf190c5a` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-early-discharge-canonical/cr-180-filled.pdf` — `9cc3b456c0b97e0555b53de0740d03368b98148480ae14d78b882ad9095b9ae3` · 3 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-early-discharge-canonical/cr-181-unchanged-official.pdf` — `f737503a89465d40206b11b1123e815e44a249d324bad16d313c337a695ce504` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-early-discharge-canonical/mc-025-unchanged-official.pdf` — `b0ca1509f2c3de152518079de7c1eb2771eaa1eb7da457c2e918498894f6f0af` · 1 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-early-discharge-canonical/mc-031-unchanged-official.pdf` — `defc9108f6baa4c2ca444c1571d737d841af78289bef337f874f51e595191075` · 1 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-fulfilled-probation-canonical/cr-106-unchanged-official.pdf` — `f8a37a9a8c30a016b432bb39fd67407717c3dee7be74bc3e3d471127bf190c5a` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-fulfilled-probation-canonical/cr-180-filled.pdf` — `9cc3b456c0b97e0555b53de0740d03368b98148480ae14d78b882ad9095b9ae3` · 3 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-fulfilled-probation-canonical/cr-181-unchanged-official.pdf` — `f737503a89465d40206b11b1123e815e44a249d324bad16d313c337a695ce504` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-fulfilled-probation-canonical/mc-025-unchanged-official.pdf` — `b0ca1509f2c3de152518079de7c1eb2771eaa1eb7da457c2e918498894f6f0af` · 1 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-fulfilled-probation-canonical/mc-031-unchanged-official.pdf` — `defc9108f6baa4c2ca444c1571d737d841af78289bef337f874f51e595191075` · 1 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-interests-of-justice-canonical/cr-106-unchanged-official.pdf` — `f8a37a9a8c30a016b432bb39fd67407717c3dee7be74bc3e3d471127bf190c5a` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-interests-of-justice-canonical/cr-180-filled.pdf` — `9cc3b456c0b97e0555b53de0740d03368b98148480ae14d78b882ad9095b9ae3` · 3 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-interests-of-justice-canonical/cr-181-unchanged-official.pdf` — `f737503a89465d40206b11b1123e815e44a249d324bad16d313c337a695ce504` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-interests-of-justice-canonical/mc-025-unchanged-official.pdf` — `b0ca1509f2c3de152518079de7c1eb2771eaa1eb7da457c2e918498894f6f0af` · 1 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-interests-of-justice-canonical/mc-031-unchanged-official.pdf` — `defc9108f6baa4c2ca444c1571d737d841af78289bef337f874f51e595191075` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-early-discharge-boundary/cr-106-unchanged-official.pdf` — `f8a37a9a8c30a016b432bb39fd67407717c3dee7be74bc3e3d471127bf190c5a` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-early-discharge-boundary/cr-180-filled.pdf` — `34b962b636a4481c256162bbc2507572b4fcafe7edec34d866b57007d2acc458` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-early-discharge-boundary/cr-181-unchanged-official.pdf` — `f737503a89465d40206b11b1123e815e44a249d324bad16d313c337a695ce504` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-early-discharge-boundary/mc-025-unchanged-official.pdf` — `b0ca1509f2c3de152518079de7c1eb2771eaa1eb7da457c2e918498894f6f0af` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-early-discharge-boundary/mc-031-unchanged-official.pdf` — `defc9108f6baa4c2ca444c1571d737d841af78289bef337f874f51e595191075` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-fulfilled-probation-boundary/cr-106-unchanged-official.pdf` — `f8a37a9a8c30a016b432bb39fd67407717c3dee7be74bc3e3d471127bf190c5a` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-fulfilled-probation-boundary/cr-180-filled.pdf` — `34b962b636a4481c256162bbc2507572b4fcafe7edec34d866b57007d2acc458` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-fulfilled-probation-boundary/cr-181-unchanged-official.pdf` — `f737503a89465d40206b11b1123e815e44a249d324bad16d313c337a695ce504` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-fulfilled-probation-boundary/mc-025-unchanged-official.pdf` — `b0ca1509f2c3de152518079de7c1eb2771eaa1eb7da457c2e918498894f6f0af` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-fulfilled-probation-boundary/mc-031-unchanged-official.pdf` — `defc9108f6baa4c2ca444c1571d737d841af78289bef337f874f51e595191075` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-interests-of-justice-boundary/cr-106-unchanged-official.pdf` — `f8a37a9a8c30a016b432bb39fd67407717c3dee7be74bc3e3d471127bf190c5a` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-interests-of-justice-boundary/cr-180-filled.pdf` — `34b962b636a4481c256162bbc2507572b4fcafe7edec34d866b57007d2acc458` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-interests-of-justice-boundary/cr-181-unchanged-official.pdf` — `f737503a89465d40206b11b1123e815e44a249d324bad16d313c337a695ce504` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-interests-of-justice-boundary/mc-025-unchanged-official.pdf` — `b0ca1509f2c3de152518079de7c1eb2771eaa1eb7da457c2e918498894f6f0af` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-interests-of-justice-boundary/mc-031-unchanged-official.pdf` — `defc9108f6baa4c2ca444c1571d737d841af78289bef337f874f51e595191075` · 1 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-fulfilled-probation-canonical/cr-180-filled.pdf` and `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-fulfilled-probation-boundary/cr-180-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 54 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### ca-1203-4a-set

- **8 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-4a-set--official-pdf-fill/fixtures/pc-1203-4a-canonical/cr-106-unchanged-official.pdf` — `f8a37a9a8c30a016b432bb39fd67407717c3dee7be74bc3e3d471127bf190c5a` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-4a-set--official-pdf-fill/fixtures/pc-1203-4a-canonical/cr-180-filled.pdf` — `c7dc7526816439ce0a709709613936dcbe6a9f580d1a7dacc6a62a52f17ebd45` · 3 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-4a-set--official-pdf-fill/fixtures/pc-1203-4a-canonical/cr-181-unchanged-official.pdf` — `f737503a89465d40206b11b1123e815e44a249d324bad16d313c337a695ce504` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-4a-set--official-pdf-fill/fixtures/pc-1203-4a-canonical/mc-031-unchanged-official.pdf` — `defc9108f6baa4c2ca444c1571d737d841af78289bef337f874f51e595191075` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-4a-set--official-pdf-fill/fixtures/pc-1203-4a-boundary/cr-106-unchanged-official.pdf` — `f8a37a9a8c30a016b432bb39fd67407717c3dee7be74bc3e3d471127bf190c5a` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-4a-set--official-pdf-fill/fixtures/pc-1203-4a-boundary/cr-180-filled.pdf` — `86c5ef49a270c453ddbaca4d00d750b8db317a5fd45178a8f2989778ad0e7f4e` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-4a-set--official-pdf-fill/fixtures/pc-1203-4a-boundary/cr-181-unchanged-official.pdf` — `f737503a89465d40206b11b1123e815e44a249d324bad16d313c337a695ce504` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-4a-set--official-pdf-fill/fixtures/pc-1203-4a-boundary/mc-031-unchanged-official.pdf` — `defc9108f6baa4c2ca444c1571d737d841af78289bef337f874f51e595191075` · 1 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ca/ca-1203-4a-set--official-pdf-fill/fixtures/pc-1203-4a-canonical/cr-180-filled.pdf` and `data/rcap-all50/overlays/census-v1/ca/ca-1203-4a-set--official-pdf-fill/fixtures/pc-1203-4a-boundary/cr-180-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 16 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### census-pending-family:ME:juvenile-sealing

- canonical `data/rcap-all50/overlays/census-v1/me/census-pending-family:me:juvenile-sealing--official-pdf-fill/fixtures/canonical.pdf` — `fa7bd28a1f28cfb38f3f1da3a98d97f2ba3e7827e1c813a43ee51560f225144d`
- boundary `data/rcap-all50/overlays/census-v1/me/census-pending-family:me:juvenile-sealing--official-pdf-fill/fixtures/boundary.pdf` — `69618b989b84945c1f0bf121430b589ecbec6368087cf620901c5a286c45aabb`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### co_motion_seal_conviction-set

- canonical `data/rcap-all50/overlays/census-v1/co/co-motion-seal-conviction-set--official-pdf-fill/fixtures/canonical.pdf` — `f8eaffc976b0b73ba6cf76b3332d9ff950d38a8089279a3a5b364db49153b4b9`
- boundary `data/rcap-all50/overlays/census-v1/co/co-motion-seal-conviction-set--official-pdf-fill/fixtures/boundary.pdf` — `8b553b296f054326c9c0441ba5c56adb6fd19b5b65751fa9b4ffa570e94afef6`
- expected pages 15 · requested scale 2.5
- built by (no builder lane recorded)

### co_pardoned_conviction_seal-set

- canonical `data/rcap-all50/overlays/census-v1/co/co-pardoned-conviction-seal-set--official-pdf-fill/fixtures/canonical.pdf` — `d285a03f788cb5e5b3a8d1f17babd379b199cd24c34d2e98b52363cd2c436bf7`
- boundary `data/rcap-all50/overlays/census-v1/co/co-pardoned-conviction-seal-set--official-pdf-fill/fixtures/boundary.pdf` — `407db19ec374b58b0e429b40ac6de54877510b47fe16db77739400e4edbada4c`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:research-decision-route:NY:ny_160_55_violation:sentencing_court_transmission_correction_request

- canonical `data/rcap-all50/overlays/census-v1/ny/composed-treatment:obligation:research-decision-route:ny:ny-160-55-violation:sentencing-court-transmission-correction-request--custom-pleading/fixtures/canonical.pdf` — `182bf44db01688b8b645388aaf8dc2a323ff2ebd0d218efe7b037daa8b3847d2`
- boundary `data/rcap-all50/overlays/census-v1/ny/composed-treatment:obligation:research-decision-route:ny:ny-160-55-violation:sentencing-court-transmission-correction-request--custom-pleading/fixtures/boundary.pdf` — `af95b3d225a5fba45fb89d0f62272534c744bffbcde997d17d5835d698fdd0b8`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:GA:youthful-first-offender-restriction-route

- canonical `data/rcap-all50/overlays/census-v1/ga/composed-treatment:obligation:runtime-only:ga:youthful-first-offender-restriction-route--custom-pleading/fixtures/canonical.pdf` — `6762d8195273957a3d00660a8f7f5248ec854d5f077f29be4d9f28ccc0fe861d`
- boundary `data/rcap-all50/overlays/census-v1/ga/composed-treatment:obligation:runtime-only:ga:youthful-first-offender-restriction-route--custom-pleading/fixtures/boundary.pdf` — `7b3e906655184051310344f8e9d127ff6467c6b7cb7afe17adc503a54d0a0d65`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:MS:uncharged-misdemeanor-immediate-dismissal-branch-99-15-59

- canonical `data/rcap-all50/overlays/census-v1/ms/composed-treatment:obligation:runtime-only:ms:uncharged-misdemeanor-immediate-dismissal-branch-99-15-59--custom-pleading/fixtures/canonical.pdf` — `606e3c9d5e6b83da8422a9bb01138b5937db3e5726b64975674ffda137c448ac`
- boundary `data/rcap-all50/overlays/census-v1/ms/composed-treatment:obligation:runtime-only:ms:uncharged-misdemeanor-immediate-dismissal-branch-99-15-59--custom-pleading/fixtures/boundary.pdf` — `ed06c2dcd41ee0c4a8692ae32aee8e0afabd2ae0a5c8fd3f6e178434b42e8c8e`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:OK:juvenile-record-expungement

- canonical `data/rcap-all50/overlays/census-v1/ok/composed-treatment:obligation:runtime-only:ok:juvenile-record-expungement--custom-pleading/fixtures/canonical.pdf` — `1f58a28e664897023c59485baf859f22c8d82d24b444b53a3166a6b74c75cd22`
- boundary `data/rcap-all50/overlays/census-v1/ok/composed-treatment:obligation:runtime-only:ok:juvenile-record-expungement--custom-pleading/fixtures/boundary.pdf` — `cd24c14c4af5be4bdefb2c7454f4dd282cb06d009333ab2c416007593472c3a0`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708

- canonical `data/rcap-all50/overlays/census-v1/wy/composed-treatment:obligation:runtime-only:wy:human-trafficking-victim-vacatur-w-s-6-2-708--custom-pleading/fixtures/canonical.pdf` — `e659cde906f0918f7f752a76fb330d9fd2f6a3e6eae1606c8048dc50d080da7a`
- boundary `data/rcap-all50/overlays/census-v1/wy/composed-treatment:obligation:runtime-only:wy:human-trafficking-victim-vacatur-w-s-6-2-708--custom-pleading/fixtures/boundary.pdf` — `cab0c1fd8d4c254ea3c87331891e97696d6c1608e7e9062069aba41f750e86d1`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### ct-cleanslate-petition-set

- canonical `data/rcap-all50/overlays/census-v1/ct/ct-cleanslate-petition-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `28c4aef4146df8956dd3eb36402ee031f98fc9af61ddf1b986b774ffbf219b77`
- boundary `data/rcap-all50/overlays/census-v1/ct/ct-cleanslate-petition-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `d3e379c8dbc4c716cd80ec107edcc069b585cc4934b28adb1db40fe19c26c09c`
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

### de_discretionary_family_court-set

- canonical `data/rcap-all50/overlays/census-v1/de/de-discretionary-family-court-set--official-pdf-fill/fixtures/canonical.pdf` — `c8db59fab064a64922b0f861c2b7673ded353d74c65e25203e67094b53327cc8`
- boundary `data/rcap-all50/overlays/census-v1/de/de-discretionary-family-court-set--official-pdf-fill/fixtures/boundary.pdf` — `9a7de241d4ea134cf13c476171f73c05de7422485824f12f2e6d4273a49746e3`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### fl-10yr-bridge-set

- canonical `data/rcap-all50/overlays/census-v1/fl/fl-10yr-bridge-set--official-pdf-fill/fixtures/canonical.pdf` — `ff4268b1adca4883f44d059303aa59c0ceab618e1bbf6ed02fa464dd667b73df`
- boundary `data/rcap-all50/overlays/census-v1/fl/fl-10yr-bridge-set--official-pdf-fill/fixtures/boundary.pdf` — `708cbd61b79b514298315a49f5b3d1e2f997c4757542868d12e8bb9125b473b1`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### fl-juvenile-diversion-set

- canonical `data/rcap-all50/overlays/census-v1/fl/fl-juvenile-diversion-set--official-pdf-fill/fixtures/canonical.pdf` — `c63743cb40f515edd7b03a17ec97cb5f05cc770452b2d301953a534f04ace032`
- boundary `data/rcap-all50/overlays/census-v1/fl/fl-juvenile-diversion-set--official-pdf-fill/fixtures/boundary.pdf` — `2391d96cb8a1e51e14fdfdc3ba38c7c3b9f3da564a223392983158a8e18aab8f`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### ga-deaddocket-j3-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-deaddocket-j3-set--custom-pleading/fixtures/canonical.pdf` — `0860a52c8b3607370fee4757b2224ade00b514f13df43ee92589099c69a278fd`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-deaddocket-j3-set--custom-pleading/fixtures/boundary.pdf` — `65217c5b184350454e5dac9e0d0986162ac9edc600e1291c9638ea2572f95f96`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### ga-fugitive-j5-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-fugitive-j5-set--custom-pleading/fixtures/canonical.pdf` — `f5d5ed92060a864fd2f6c162e7941b2190862ac1329f36a25360e20192577759`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-fugitive-j5-set--custom-pleading/fixtures/boundary.pdf` — `b187407464de55069fc7185e9d721acef7c90f9f9830315d7ddad860d4533c8c`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### ga-nonconv-pre2013-set

- **15 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/canonical.pdf` — `c1ba21c6400010377cace19b85ecf100866e07a57c2facc6b5c554b48fcf18e1` · 7 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/basis-01.pdf` — `67b8e50bc14acfc82059b5a6bdab1f7dd7b423aa266a5988b5b95a62d8aab367` · 7 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/basis-02.pdf` — `7c61def202587c133fb3cf98e13205e4f1e722da22bd754f19cb908077f8607c` · 7 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/basis-03.pdf` — `dbcf5dac28c454e99df2108157c6aeb52f25f8d9978eef9b3b11028db531d800` · 7 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/basis-04.pdf` — `c1ba21c6400010377cace19b85ecf100866e07a57c2facc6b5c554b48fcf18e1` · 7 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/basis-05.pdf` — `43024310d0eb3f8f697aa9b9f71c29a4cec4b11cac37ad6f945ab81f79ff1856` · 7 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/basis-06.pdf` — `e08d7e6e17022d409703b20369c3358784cb2867f12ea14b0271b47bc8e19990` · 7 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/basis-07.pdf` — `ed070e1a32055d5c115fe06a91fdf589aac8fff6fa36736c0e341b84da0a6c7d` · 7 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/basis-08.pdf` — `646d51a152aafb18f279899fddee1aecececbcc41b83aedbe7ed2c71b2d19e29` · 7 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/basis-09.pdf` — `ad157e636e23a08e62e7ac41d75da766ad96ea35fc3dd9e5b355311acaf6a3a0` · 7 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/basis-10.pdf` — `8dc14acf89cd956ea7ea51da0bc9b1044ec944174ac292fc962b9945fb1f65c8` · 7 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/disposition-document-available.pdf` — `bae68f944039b4dd95ce5b9a872f2fce99914b6d8f6292c50c71c74f6fd1e0c3` · 8 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/fbi-record-only.pdf` — `bae68f944039b4dd95ce5b9a872f2fce99914b6d8f6292c50c71c74f6fd1e0c3` · 8 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/boundary.pdf` — `62aa209bccaad83f188ac941760ce89fdc9fceeb9f3c0a96d7ea0ee50335a2a2` · 8 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/missing-participant-facts.pdf` — `8969ba951de1adb9fde9ed7b703032c59e8a205f7687fe52a1362f24b6206a47` · 7 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/canonical.pdf` and `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 108 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### hi_712_1200_deferred_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/hi/hi-712-1200-deferred-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `78e674c8aaabc6adb66a4c4a40bc8232a1cb86c650bb0c5d21c6646226c01313`
- boundary `data/rcap-all50/overlays/census-v1/hi/hi-712-1200-deferred-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `d975f877ae1cf99d2e2a2b686557a0c832c13dab597bf975c3ebf8ad69cfa793`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### ia-12347-set

- canonical `data/rcap-all50/overlays/census-v1/ia/ia-12347-set--official-pdf-fill/fixtures/canonical.pdf` — `830d67c3d423b615ed01efbc9c32cdb6a5ca0f89917fc8c13201070bb5fa9b91`
- boundary `data/rcap-all50/overlays/census-v1/ia/ia-12347-set--official-pdf-fill/fixtures/boundary.pdf` — `a8685beb36fe2ed04c07663d20e3c62512f3b3642665555f2e663536233c3e9c`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### ia-dci77-set

- canonical `data/rcap-all50/overlays/census-v1/ia/ia-dci77-set--official-pdf-fill/fixtures/canonical.pdf` — `7e09751a8e233f1fd27bf111726d30d14669376dbdf8922f0138f6ac9c5a3bc7`
- boundary `data/rcap-all50/overlays/census-v1/ia/ia-dci77-set--official-pdf-fill/fixtures/boundary.pdf` — `91befce7c030b0151450f7a3b27df5fb84232f58a72889c4bb7793fe28aee7b1`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### id_set_aside_dismissal-set

- canonical `data/rcap-all50/overlays/census-v1/id/id-set-aside-dismissal-set--custom-pleading/fixtures/canonical.pdf` — `7773edfbbad30e588ee71061cd226d6c8385e5b35d3d8fa40d43497507dbddbc`
- boundary `data/rcap-all50/overlays/census-v1/id/id-set-aside-dismissal-set--custom-pleading/fixtures/boundary.pdf` — `69627731b56805a3b8a37b24c7cfc9b72a9b99d87a09cf85e44e05e0c9cbbf5f`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### il-exp-precompletion-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-exp-precompletion-set--official-pdf-fill/fixtures/canonical.pdf` — `3bb1f3557a51a8da3c479fabf3dfaf525ef93386b6bc3e2f625716a06cce278f`
- boundary `data/rcap-all50/overlays/census-v1/il/il-exp-precompletion-set--official-pdf-fill/fixtures/boundary.pdf` — `0fbf5f3c21ed176afa3151e15e8c0ad32dfc913b04bba1550d0f83443041f631`
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

- canonical `data/rcap-all50/overlays/census-v1/in/in-conviction-misd-set--custom-pleading/fixtures/canonical.pdf` — `52b987aada3f19e11734cb5cfdc840b4592912a74840825b61a40342ed41a3a4`
- boundary `data/rcap-all50/overlays/census-v1/in/in-conviction-misd-set--custom-pleading/fixtures/boundary.pdf` — `8e0012c088591ab2478ac89ae7642e83c19d434b9750f151287002a910772390`
- expected pages 10 · requested scale 2.5
- built by (no builder lane recorded)

### ks-21-6614-diversion-set

- canonical `data/rcap-all50/overlays/census-v1/ks/ks-21-6614-diversion-set--official-pdf-fill/fixtures/canonical.pdf` — `4985daae9ca05a4ebd82ac15c05b4bd0f61f2883279de41dea763cfc49f0ecc9`
- boundary `data/rcap-all50/overlays/census-v1/ks/ks-21-6614-diversion-set--official-pdf-fill/fixtures/boundary.pdf` — `e703bb7cfda795a9adf05f363bfd7a897d646aa6fc8544f5f522914def8f8f2c`
- expected pages 20 · requested scale 2.5
- built by (no builder lane recorded)

### ky_criminal_record_segregation-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-criminal-record-segregation-set--custom-pleading/fixtures/canonical.pdf` — `688787fb65152b5bb91ee9677012709e808db28da9dccb7599f85a631ac97970`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-criminal-record-segregation-set--custom-pleading/fixtures/boundary.pdf` — `7e8e5f3eda4cc8cd5a5cc5a29d6c10e83eae825a3508a24e4d9ed7732a5cb470`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### ky_misdemeanor_expungement-set

- **6 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-misdemeanor-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `dcfda55784b8bdcedba2946ff360810a5c0ec4fd738d9c4dd9da28fc1ffbbeb3` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-misdemeanor-expungement-set--official-pdf-fill/fixtures/selectable/ordinary-traffic.pdf` — `017958fab9cf8e57fdff640fbd51530338fe82d5cdb8bdbb91fe2e4034df9425` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-misdemeanor-expungement-set--official-pdf-fill/fixtures/selectable/ordinary-violation.pdf` — `dbd41f2b8b6652faf67d65be5b36c8ce6a396a73b423df5fd89d9d1bc72950f2` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-misdemeanor-expungement-set--official-pdf-fill/fixtures/selectable/void-218a275-8.pdf` — `172562e6b3bbc982e9562b8bfb39f77df3077898fdd697e12266a09785661bf3` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-misdemeanor-expungement-set--official-pdf-fill/fixtures/selectable/void-218a276-8.pdf` — `a1d7ef34b529a7c9f2c579f8b1019ac85b4be2d41cf171577c2e7fd6ae478f4e` · 4 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ky/ky-misdemeanor-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `72502d59382b0a058b94b78474065b99377f87a2e25c8af9735754bd64d6f461` · 7 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ky/ky-misdemeanor-expungement-set--official-pdf-fill/fixtures/canonical.pdf` and `data/rcap-all50/overlays/census-v1/ky/ky-misdemeanor-expungement-set--official-pdf-fill/fixtures/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 27 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### ky_void_seal_marijuana_synthetic_salvia-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-void-seal-marijuana-synthetic-salvia-set--custom-pleading/fixtures/canonical.pdf` — `695ecde15ad70d6155cd548f9a22b73b499e8fcded9734c7163af2e6845276ae`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-void-seal-marijuana-synthetic-salvia-set--custom-pleading/fixtures/boundary.pdf` — `1c5f49b9b7b83407afc3f0419ed32387743aff25a2dd68d921bd2cadc303d427`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### la-978-felony-conviction-set

- canonical `data/rcap-all50/overlays/census-v1/la/la-978-felony-conviction-set--custom-pleading/fixtures/canonical.pdf` — `f5d6c4ec066846ac9488d45b5603bba6fb6b912bf7413dc5f75bee882d19b8f9`
- boundary `data/rcap-all50/overlays/census-v1/la/la-978-felony-conviction-set--custom-pleading/fixtures/boundary.pdf` — `bff90eb1821357e76d240278f264beac71557c6652e5ef8f8d317291053ac997`
- expected pages 14 · requested scale 2.5
- built by (no builder lane recorded)

### ma-bmc-multi-set

- canonical `data/rcap-all50/overlays/census-v1/ma/ma-bmc-multi-set--custom-pleading/fixtures/canonical.pdf` — `e8a629a4b7b581c341b717c3fd656abcb5b03bc1b02cbde00d65da2e97b24c4b`
- boundary `data/rcap-all50/overlays/census-v1/ma/ma-bmc-multi-set--custom-pleading/fixtures/boundary.pdf` — `47a65b128319816c120a3b8f8f29dadfc23dbf9fe7775585141296ecfb3cc7e0`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### ma-seal-admin-set

- canonical `data/rcap-all50/overlays/census-v1/ma/ma-seal-admin-set--official-pdf-fill/fixtures/canonical.pdf` — `f01868bbe1716bbe6576d39431a0b77ef7310a4a2d10c025f040edbe72c58987`
- boundary `data/rcap-all50/overlays/census-v1/ma/ma-seal-admin-set--official-pdf-fill/fixtures/boundary.pdf` — `fbaf27c950c8dc336c28a4d59bf1a35ac82309d338e86623b1ae2756f80767d5`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### md_10105_favorable-set

- **15 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/canonical.pdf` — `1b0c72fd95847a8097339061546246649b4a2465b7915c8dd54df0ebfd2d9101` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/selectable/acquittal.pdf` — `265cb0e30e0ccdb380adc6544a5a4020b26a6fd435c121e57c1a82ca16bd706f` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/selectable/adult-transfer-circuit.pdf` — `234def7bb17e49b9fd95ca68c0b845551c36c6746685c9338d2e3227f81a9bdb` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/selectable/citation.pdf` — `6b7ac19e82eee90dec3c8771c7a98dfa537c6563127e4aa528d1a2da67239f11` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/selectable/compromise.pdf` — `99063fc20998f7d354187866de5240269663dd8b23b0cd52dfced9e1b626b359` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/selectable/juvenile-transfer.pdf` — `258517f1417835928fb78e569e23ac9711619a5982687dd8806e57ccbd4b2b44` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/selectable/ncr.pdf` — `7f13298c966280c47787b3241bd3b70b725d414c90f3876e58bb9ddf60d0175b` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/selectable/nolle-treatment.pdf` — `c0054c715d34e0a67e4a8ab13668d18131c356f5d13fcb49ebe4595827fa11ef` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/selectable/nolle.pdf` — `69a9b65c732de03a7785c865c46b435d5749e17343c44d74ca6ef0462ee66d76` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/selectable/pbj-dui.pdf` — `f54a572f874d813937954266b7f02dbfb63ec6d56a070fd2c61599ed9fb93c0b` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/selectable/pbj-no-longer-crime.pdf` — `b8ec3343cc678b294ad4945c4fc802f2c3dfe7a06c211a63f9913ed3bf21c513` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/selectable/pbj.pdf` — `41fc4ac0a3431f02ee6677b4abfe9ba2cd061ad69bf6383b3a2f208c1a6587db` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/selectable/stet-treatment.pdf` — `8c3a34ea502404dc54028a59f85be8e90176118fa75e6e121117ebf84a04d841` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/selectable/stet.pdf` — `5fcda92a3e7828753fb47c8d90861f71821eaff13e59bf7a6c74f262b390c125` · 4 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/boundary.pdf` — `44c3c53433c133e0beb0cf05f771969ae53714526177aeb60806e2dac41f45be` · 4 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/canonical.pdf` and `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 60 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### md_second_chance_shielding-set

- canonical `data/rcap-all50/overlays/census-v1/md/md-second-chance-shielding-set--official-pdf-fill/fixtures/canonical.pdf` — `7265c7307fab7193a5dff3c5e2edb035ecad340122d2c587b476ef91752e777f`
- boundary `data/rcap-all50/overlays/census-v1/md/md-second-chance-shielding-set--official-pdf-fill/fixtures/boundary.pdf` — `00e402d6699ec3f872e0cdc205e182bf36a2dd919d6091b32b5f38cfbd36cf5d`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### me-seal-prost-set

- canonical `data/rcap-all50/overlays/census-v1/me/me-seal-prost-set--official-pdf-fill/fixtures/cr289-canonical-filled.pdf` — `4e44539864adc68ea7f7080693315ee08708f00659f7391c21aeda934010abf3`
- boundary `data/rcap-all50/overlays/census-v1/me/me-seal-prost-set--official-pdf-fill/fixtures/cr289-boundary-filled.pdf` — `9a9a65a2a145b07982f573fe820e0aa088fc28ac1cc58136e9652217289cf70c`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### mi_setaside_marihuana-set

- canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-marihuana-set--official-pdf-fill/fixtures/canonical.pdf` — `d026a1bffa91702245c6938ab4438a29a83ae93f109dd9677d8253aca81e463f`
- boundary `data/rcap-all50/overlays/census-v1/mi/mi-setaside-marihuana-set--official-pdf-fill/fixtures/boundary.pdf` — `5180ce722fb75f08b366c3c7b7d9a0e43d4a36076593aeb704b14adc8b3f4f82`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### mn_petition_juvenile_as_adult-set

- canonical `data/rcap-all50/overlays/census-v1/mn/mn-petition-juvenile-as-adult-set--official-pdf-fill/fixtures/canonical.pdf` — `ccd5f00fd86da007606780b15cb45462e80187731404f07694ec015775bfefa3`
- boundary `data/rcap-all50/overlays/census-v1/mn/mn-petition-juvenile-as-adult-set--official-pdf-fill/fixtures/boundary.pdf` — `c5f2e418ad4471ffb42d73f96d01daa4ce7821e9c9f10ce511883f2a4a080cc5`
- expected pages 17 · requested scale 2.5
- built by (no builder lane recorded)

### mo-610-140-arrest-set

- canonical `data/rcap-all50/overlays/census-v1/mo/mo-610-140-arrest-set--official-pdf-fill/canonical.packet.pdf` — `f07fd49e8770119addd24e852e443b354e90ca5a8b029cad6145226377585b3b`
- boundary `data/rcap-all50/overlays/census-v1/mo/mo-610-140-arrest-set--official-pdf-fill/boundary.packet.pdf` — `233c9a0ba97f120c9c2dfdec828506c7d185ae1f795dbc11e68d0bdf1917a5eb`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### ms-diversion-set

- canonical `data/rcap-all50/overlays/census-v1/ms/ms-diversion-set--custom-pleading/fixtures/canonical.pdf` — `4d4923f05553c92b885056e5ba6e97cb631e04df3f55e0c45366351b6e8f7bcb`
- boundary `data/rcap-all50/overlays/census-v1/ms/ms-diversion-set--custom-pleading/fixtures/boundary.pdf` — `7d39bd412a5db6dd80c54c2d3f6dcc06b4927221eb8aa54e753ba05b01cc7938`
- expected pages 9 · requested scale 2.5
- built by (no builder lane recorded)

### ms-nonadj-set

- canonical `data/rcap-all50/overlays/census-v1/ms/ms-nonadj-set--custom-pleading/fixtures/canonical.pdf` — `481680f62dddb4be3c2bfe4f0c658311913cfde419270336aaf705c89955f0ee`
- boundary `data/rcap-all50/overlays/census-v1/ms/ms-nonadj-set--custom-pleading/fixtures/boundary.pdf` — `7006c8e94b040e0b98d6b9df8c169faea1c34afe7ae51093488982393e4d3d22`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### mt_mmrta_completed-set

- **5 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/mt/mt-mmrta-completed-set--official-pdf-fill/fixtures/canonical.pdf` — `62af7aac1df1f960878468b179bb9588a30efa404ffc03dbb92d30d1293a5083` · 8 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/mt/mt-mmrta-completed-set--official-pdf-fill/fixtures/boundary.pdf` — `5c12e9b294427331e555c800a0a7b2bb10e1eb2bbb91f49ea991cf839c52b0b9` · 8 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/mt/mt-mmrta-completed-set--official-pdf-fill/fixtures/city-redesignation.pdf` — `cc819e12abbfa521cfdf0994d42d135bd7498a41bdca9971da32b493942a0c5d` · 8 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/mt/mt-mmrta-completed-set--official-pdf-fill/fixtures/expungement-order.pdf` — `f6cb17fa7e28f57d00e8cb37491d289d1df75b166e9846993fe952a0e4a475da` · 10 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/mt/mt-mmrta-completed-set--official-pdf-fill/fixtures/boundary-separate-conviction.pdf` — `1c50ba986038c52f67abfb1455bdcf0ffd73462330f1643f0d1366d94e6c88d4` · 8 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/mt/mt-mmrta-completed-set--official-pdf-fill/fixtures/canonical.pdf` and `data/rcap-all50/overlays/census-v1/mt/mt-mmrta-completed-set--official-pdf-fill/fixtures/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 42 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### nc_145_8a_youthful-set

- canonical `data/rcap-all50/overlays/census-v1/nc/nc-145-8a-youthful-set--official-pdf-fill/fixtures/canonical.pdf` — `8cfb486a1735c77f1df72234ec934a8c799194e2a7afdcc0bf750da48d8d3b67`
- boundary `data/rcap-all50/overlays/census-v1/nc/nc-145-8a-youthful-set--official-pdf-fill/fixtures/boundary.pdf` — `f6c284c2bcab233c4f1721d917a9f7b2996e03a11763f4bc158ea81acba4f19e`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### nd-deferred-imposition-records-set

- canonical `data/rcap-all50/overlays/census-v1/nd/nd-deferred-imposition-records-set--custom-pleading/fixtures/canonical.pdf` — `acb65ea57cee08f26a4503a5648ec1bb542c56e49dee4c88dc04c9416ad14bf8`
- boundary `data/rcap-all50/overlays/census-v1/nd/nd-deferred-imposition-records-set--custom-pleading/fixtures/boundary.pdf` — `17254b3a88eff883620f5864fcadf7b644e28b67f5de3ad527dd02dc6f953c7a`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### nd-summary-marijuana-pardon-set

- canonical `data/rcap-all50/overlays/census-v1/nd/nd-summary-marijuana-pardon-set--official-pdf-fill/fixtures/canonical.pdf` — `b305228a5f6acb2ac116795aff1d16d61816c2354a2c35f4de2914016949a847`
- boundary `data/rcap-all50/overlays/census-v1/nd/nd-summary-marijuana-pardon-set--official-pdf-fill/fixtures/boundary.pdf` — `c98c75b4fa712dd7bf5a61367d0ffb47a9d9ecd11f9f62679b43283521466bb8`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### ne-seal-pre2017-set

- **6 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ne/ne-seal-pre2017-set--official-pdf-fill/fixtures/canonical--acquitted.pdf` — `99fa983e5b037b19d64e853eb0aa6ef530c06911140f1d39b93c5e8800f57cc3` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ne/ne-seal-pre2017-set--official-pdf-fill/fixtures/canonical--dismissed-problem-solving-court.pdf` — `8276f744a698a9f409ad8e5355cd0b904ba0ef395022656d4708360941025cc3` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ne/ne-seal-pre2017-set--official-pdf-fill/fixtures/canonical--dismissed-prosecutor-motion.pdf` — `b1d925196b99ecd3699cc9100edaf1ee171a70195ecec84575ba6435aab5465a` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ne/ne-seal-pre2017-set--official-pdf-fill/fixtures/boundary--acquitted.pdf` — `6927025913e151db1ee30de011784109d70aefbaf6bb85a5a51f130679760910` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ne/ne-seal-pre2017-set--official-pdf-fill/fixtures/boundary--dismissed-problem-solving-court.pdf` — `5304c510290377d00333290c4d0948de13f44e40d5dd9b749fe57f44a98bd892` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ne/ne-seal-pre2017-set--official-pdf-fill/fixtures/boundary--dismissed-prosecutor-motion.pdf` — `f3f282bcc1d89bdb9ab829665c29abffe939db712a764925c70bfec92307c7ca` · 5 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ne/ne-seal-pre2017-set--official-pdf-fill/fixtures/canonical--dismissed-prosecutor-motion.pdf` and `data/rcap-all50/overlays/census-v1/ne/ne-seal-pre2017-set--official-pdf-fill/fixtures/boundary--dismissed-prosecutor-motion.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 30 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### nh_conviction_standard-set

- canonical `data/rcap-all50/overlays/census-v1/nh/nh-conviction-standard-set--official-pdf-fill/fixtures/canonical.pdf` — `bd2a4c278778d4b61cdee81110ecccfe2ba93a3f794e04f8a929ffdafcadebe3`
- boundary `data/rcap-all50/overlays/census-v1/nh/nh-conviction-standard-set--official-pdf-fill/fixtures/boundary.pdf` — `78908658fd0dc118ea0112c03bcec2bd0b6f7ab3a4c6b878bdaa8a1d6d91383f`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### nh_petition_vacated-set

- canonical `data/rcap-all50/overlays/census-v1/nh/nh-petition-vacated-set--official-pdf-fill/fixtures/canonical.pdf` — `277c0be84797512220ff62a0af7eaf6290a5f388f3a35223938284a53448c8d4`
- boundary `data/rcap-all50/overlays/census-v1/nh/nh-petition-vacated-set--official-pdf-fill/fixtures/boundary.pdf` — `219ea0df35f85495f4d14a69d4da30cbc9305a669d9a5be1b329ea5a97339c7c`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### nj_indictable_conviction-set

- canonical `data/rcap-all50/overlays/census-v1/nj/nj-indictable-conviction-set--official-pdf-fill/fixtures/cn-10557-canonical.pdf` — `e067d90c9ce9c7f95439d4bec7b533b8c3964c790f2b9008be86838b4ecf8283`
- boundary `data/rcap-all50/overlays/census-v1/nj/nj-indictable-conviction-set--official-pdf-fill/fixtures/cn-10557-boundary.pdf` — `e159d8846305d52946314ba5e980fb5f844aa84adf9bffb825424af22586ad44`
- expected pages 43 · requested scale 2.5
- built by (no builder lane recorded)

### nm_release_without_conviction-set

- canonical `data/rcap-all50/overlays/census-v1/nm/nm-release-without-conviction-set--official-pdf-fill/fixtures/canonical.pdf` — `1a6b59ac0a327692222cac1a67072061441b2cccb843c5ba8ae85478462fba65`
- boundary `data/rcap-all50/overlays/census-v1/nm/nm-release-without-conviction-set--official-pdf-fill/fixtures/boundary.pdf` — `6ccdce6e3bfb85e996c9d4d640f7b8ca5b178ebb074d54e5b3eac50d46ba770c`
- expected pages 19 · requested scale 2.5
- built by (no builder lane recorded)

### official-form-treatment:obligation:research-decision-route:AL:al-olr

- canonical `data/rcap-all50/overlays/census-v1/al/official-form-treatment:obligation:research-decision-route:al:al-olr--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `9414ff9d97234b9d98f6362c198acec77d7921c789a273f990a927bb487e8449`
- boundary `data/rcap-all50/overlays/census-v1/al/official-form-treatment:obligation:research-decision-route:al:al-olr--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `6b04f5d39f52f7cdea4c5771b7df24c43a2f266b67c986514d9e490d5afdc6bc`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### or_conviction_setaside-set

- canonical `data/rcap-all50/overlays/census-v1/or/or-conviction-setaside-set--official-pdf-fill/fixtures/canonical.pdf` — `a2d72e3f54c58a7590a681a93b015a82660056790077dd508b97d6d3e50c5b0b`
- boundary `data/rcap-all50/overlays/census-v1/or/or-conviction-setaside-set--official-pdf-fill/fixtures/boundary.pdf` — `2375b62449222756817f4338188fef6475f0f6323c237ba3f63a47c99396b360`
- expected pages 9 · requested scale 2.5
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

### rcap-ga-guidance-implementation

- canonical `data/rcap-all50/overlays/census-v1/ga/rcap-ga-guidance-implementation--custom-pleading/fixtures/canonical.pdf` — `4483d38b301e8e1dc018ac65e7737cd39df5a8c082603c60b0ba293f9d17f6d0`
- boundary `data/rcap-all50/overlays/census-v1/ga/rcap-ga-guidance-implementation--custom-pleading/fixtures/boundary.pdf` — `7d9c01ba8bb734b99237b923a07b1cc7a64a6771651c626a78203f8f474199e3`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-mo-custom-pleading

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/mo/rcap-mo-custom-pleading--custom-pleading/fixtures/intoxication-canonical.pdf` — `b96dc246487c78d566eb7fdc0f4bb806e477d07708ae8be9dee9efdf1654e86a` · 8 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mo/rcap-mo-custom-pleading--custom-pleading/fixtures/mip-canonical.pdf` — `da002da0ba3492f0ef6e46184fbbd73b6a5f86c482c65016c75c5e31979e8ce6` · 7 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/mo/rcap-mo-custom-pleading--custom-pleading/fixtures/intoxication-boundary.pdf` — `a108e7b28cb24111bb259bb1c35f7a42f75d8345e07ffd83af344fa8b392a971` · 15 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/mo/rcap-mo-custom-pleading--custom-pleading/fixtures/mip-boundary.pdf` — `5f2905b4744e26b0d16938bdc473fa56a19bb327fd51641a68b82fb63f982e11` · 14 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/mo/rcap-mo-custom-pleading--custom-pleading/fixtures/mip-canonical.pdf` and `data/rcap-all50/overlays/census-v1/mo/rcap-mo-custom-pleading--custom-pleading/fixtures/mip-boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 44 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### rcap-oh-custom-pleading-clean-tracks

- **8 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/continuation/oh_2953_32_expungement/canonical/packet.pdf` — `921aaee56fda2cb21a6425751da4f980b3ec7792d73ee934b0a71f3d2d6696f8` · 11 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/continuation/oh_2953_32_sealing/canonical/packet.pdf` — `39cbc8b4af44f6c5d0dec7fcdea80dff6a603114f6476624d372a0b8fea3aceb` · 11 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/continuation/oh_2953_33_nonconviction/canonical/packet.pdf` — `917c814b45b351f9d95dc617f60a1ad11b2daae5d295ff1aaaccebee6d63b4f9` · 10 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/continuation/oh_2953_35_firearm/canonical/packet.pdf` — `a8e1d589ec21ab1179256ff1d52cfea0666b35998804918b0562db30e8c7d2ce` · 10 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/continuation/oh_2953_32_expungement/boundary/packet.pdf` — `167d86f5dc9002b11ee1a02bcf1c9c6f94e2d24b55d2ec5baa86b72be8605d6a` · 11 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/continuation/oh_2953_32_sealing/boundary/packet.pdf` — `cdaa42a2edd816435c00a228a0cb99fca0c98bf700d02a4294c53a0177622f61` · 11 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/continuation/oh_2953_33_nonconviction/boundary/packet.pdf` — `84bb8746d1618133f5b1ea06b425a2b42686480ec923365ecede70d266b99f33` · 10 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/continuation/oh_2953_35_firearm/boundary/packet.pdf` — `963b58477d4e4a639c2ba27ee179c77c35fe589bef6de9c0895482e91be4b625` · 10 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/continuation/oh_2953_33_nonconviction/canonical/packet.pdf` and `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/continuation/oh_2953_33_nonconviction/boundary/packet.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 84 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### rcap-tx-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/tx/rcap-tx-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `0528011ffe6651bbafcab07dbae1f86396ad5d21f4afcf233fdeec8482fe093e`
- boundary `data/rcap-all50/overlays/census-v1/tx/rcap-tx-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `1f2345d0e9bb8dada10abe52b563bf88868d8954153d3cca4e7df97224c9894d`
- expected pages 16 · requested scale 2.5
- built by (no builder lane recorded)

### ri_decriminalized-set

- canonical `data/rcap-all50/overlays/census-v1/ri/ri-decriminalized-set--official-pdf-fill/fixtures/canonical.pdf` — `8f816dce34a9d64e1c195e3ceed97871b048ec28ada230b424c8afc4105930c7`
- boundary `data/rcap-all50/overlays/census-v1/ri/ri-decriminalized-set--official-pdf-fill/fixtures/boundary.pdf` — `25954bf32f14108df69ec87ee92a62d88adcd2d416e9c6ecaf9fcde1b6f39961`
- expected pages 10 · requested scale 2.5
- built by (no builder lane recorded)

### ri_marijuana-set

- canonical `data/rcap-all50/overlays/census-v1/ri/ri-marijuana-set--custom-pleading/fixtures/canonical.pdf` — `79bcf52eb9014313303adc20c37ec9d20d127de1dd28e5b738f2c823f0eba8f0`
- boundary `data/rcap-all50/overlays/census-v1/ri/ri-marijuana-set--custom-pleading/fixtures/boundary.pdf` — `fc9c6c8ae3934798ba7dd5eff9bf58629da65a390ba9cf0318032f8b37945312`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### sd_arrest_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/sd/sd-arrest-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `953e537114738ce8ef5ca7f4144e2bb831e117823e4e8833af22f3b8c82b4d65`
- boundary `data/rcap-all50/overlays/census-v1/sd/sd-arrest-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `6467f08bb716a8d9976394b3ce7112add1fb4fdbc761b1cdcaec78a40084e3c8`
- expected pages 14 · requested scale 2.5
- built by (no builder lane recorded)

### tx_nd_deferred_other-set

- canonical `data/rcap-all50/overlays/census-v1/tx/tx-nd-deferred-other-set--official-pdf-fill/fixtures/canonical.pdf` — `68075bdcbe9fd71b3219523b99781018d2a3bfd604ab21c96da77997c25b580c`
- boundary `data/rcap-all50/overlays/census-v1/tx/tx-nd-deferred-other-set--official-pdf-fill/fixtures/boundary.pdf` — `d15f204776604cbc82302dd792cd9a2986f557c4ef3624acc48e27a67d33d15f`
- expected pages 26 · requested scale 2.5
- built by (no builder lane recorded)

### tx_nd_probation_misdemeanor-set

- canonical `data/rcap-all50/overlays/census-v1/tx/tx-nd-probation-misdemeanor-set--official-pdf-fill/fixtures/canonical.pdf` — `006453102ab2082f27d5b52c2309c4c24267051deabf117fa29876494b591c4b`
- boundary `data/rcap-all50/overlays/census-v1/tx/tx-nd-probation-misdemeanor-set--official-pdf-fill/fixtures/boundary.pdf` — `8c20f877c3ba04ddf88b98d04572cfa6a56732e095155b86c08c1c606d819fc5`
- expected pages 24 · requested scale 2.5
- built by (no builder lane recorded)

### ut_pet_cannabis-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-cannabis-set--official-pdf-fill/fixtures/canonical.pdf` — `f4910777945ca9d74da2b5a1f84d9a37581696dc47bc95546ee21ca9c628f207`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-cannabis-set--official-pdf-fill/fixtures/boundary.pdf` — `e37c533a78f72029c9f078fb1115146c77c809326ebab8ff7ffc1e4aabda8d6c`
- expected pages 12 · requested scale 2.5
- built by (no builder lane recorded)

### ut_pet_limitations-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-limitations-set--official-pdf-fill/fixtures/canonical.pdf` — `c949b633fc0f4a1e3f93eea1f61ba23274a45e3a95200741ef8be40b2920dac9`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-limitations-set--official-pdf-fill/fixtures/boundary.pdf` — `d609fb3de01fb5e5b736e1d63753088bee559767f1dabf9f5aa8127a6c4f8909`
- expected pages 19 · requested scale 2.5
- built by (no builder lane recorded)

### ut_pet_traffic-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-traffic-set--official-pdf-fill/fixtures/canonical.pdf` — `b5fcdd1601c823f3ebc6b18f74f5b639789220ec9e8363202c6e1492f9d90909`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-traffic-set--official-pdf-fill/fixtures/boundary.pdf` — `ef8b488fe1f78f87a47419ddf2123ad9909b88612931a8c031ade0299a8d6e03`
- expected pages 9 · requested scale 2.5
- built by (no builder lane recorded)

### va_seal_ancillary_matter_only-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-seal-ancillary-matter-only-set--official-pdf-fill/fixtures/canonical.pdf` — `60962eef718b1048f55d7392818354057fa41636640ae20bc5ec34da49d9367e`
- boundary `data/rcap-all50/overlays/census-v1/va/va-seal-ancillary-matter-only-set--official-pdf-fill/fixtures/boundary.pdf` — `bbf887ccdc75f2cab73d6afb98e9bcc6607ceee248b551b4872c742a0c3f4992`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### vt_exp_decriminalized-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-exp-decriminalized-set--official-pdf-fill/fixtures/canonical.pdf` — `a037678f261d665110b15b66fd3a2d02ee5d555097f0d8c1b780d5b36473c97b`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-exp-decriminalized-set--official-pdf-fill/fixtures/boundary.pdf` — `80a016982254099af7ab558616ba8d96169e61244c5796d2fbaf6bcebefecd6a`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### vt_seal_felony-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-felony-set--official-pdf-fill/fixtures/canonical.pdf` — `81dd74a0ee1d178cefcb0f028dfba3e9bc7dbd7687bcf58193b0b9d62d767dee`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-felony-set--official-pdf-fill/fixtures/boundary.pdf` — `7ff3cc2272008865eba1d723e1d8dc4074b8163c7c6dbca82cf665003e32750e`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### vt_seal_under_25-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-under-25-set--custom-pleading/fixtures/canonical.pdf` — `cd71dce93a3404558c3d2fc33e55a3838867868781c801c7487ebad8ea049a07`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-under-25-set--custom-pleading/fixtures/boundary.pdf` — `ddf00f9ef8f86bb54495dd12a379d7edfc906a03c6e94a37a3b1e8a8df832492`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_domestic_violence-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-domestic-violence-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` — `42e4e3447e6f49cc925cf52485e0861261e5de714c91c672d5d71014d624d48e` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-domestic-violence-set--official-pdf-fill/fixtures/crrlj-09-0200-canonical-filled.pdf` — `3abc2475b78da8cff2445a99a78fa7aa18641d4c27f17d0c5eea3d6f07e40ce7` · 6 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-domestic-violence-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` — `fd2d21f7ca98376dd4c6ce63af548002b808b04ab388bc477f093370df5ea445` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-domestic-violence-set--official-pdf-fill/fixtures/crrlj-09-0200-boundary-filled.pdf` — `4d844aece78a8ae1c1e97407edd305f45dbdaa2c509f8e55ef51fef03bcb3a55` · 6 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/wa/wa-vac-domestic-violence-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/wa/wa-vac-domestic-violence-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 22 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_substance_use_disorder-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-substance-use-disorder-set--custom-pleading/fixtures/canonical.pdf` — `3a5320390dffce5629a9ec14ac215801ced89ac14ff7193bdb18bfce738c6aab`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-substance-use-disorder-set--custom-pleading/fixtures/boundary.pdf` — `ffe4a3fbf4f5ff9545dd6991d3b617dc9d69c0e25e01b632af3c08238e7f02b3`
- expected pages 9 · requested scale 2.5
- built by (no builder lane recorded)

### wi_exp_cr266-set

- canonical `data/rcap-all50/overlays/census-v1/wi/wi-exp-cr266-set--official-pdf-fill/fixtures/canonical.pdf` — `06148923f8a22f900e67e706de1c67205fd5bf62faa9f4c29332f4d69758845f`
- boundary `data/rcap-all50/overlays/census-v1/wi/wi-exp-cr266-set--official-pdf-fill/fixtures/boundary.pdf` — `fe4d30fa6fe3dca9e181babe74b8b376b64ecb9586085c218878cb67af50dc66`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### wv_conv_multiple_misdemeanors-set

- canonical `data/rcap-all50/overlays/census-v1/wv/wv-conv-multiple-misdemeanors-set--official-pdf-fill/fixtures/canonical.pdf` — `31a49f2d2216fd2c7a1327aa7f95f3214b8a760e9d46c05517d764d7bd60f90d`
- boundary `data/rcap-all50/overlays/census-v1/wv/wv-conv-multiple-misdemeanors-set--official-pdf-fill/fixtures/boundary.pdf` — `2a0b701a523d3f7c71f6327c6bd4384cbf438689d0be42d30b869f218f6e1dbe`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### wv_nc_acquittal_dismissal-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/wv/wv-nc-acquittal-dismissal-set--official-pdf-fill/fixtures/acquittal-canonical.pdf` — `247de4231f6d6aa0c654ef60a6e6e5725d71fff254a1c39f3ee356d44287ba70` · 3 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/wv/wv-nc-acquittal-dismissal-set--official-pdf-fill/fixtures/dismissal-canonical.pdf` — `bbfcd767b02230300e2164a40cc2d81967c87fb9b7ddf4f0677622e1319fe878` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wv/wv-nc-acquittal-dismissal-set--official-pdf-fill/fixtures/acquittal-boundary.pdf` — `e6bf76a7a50c6e38af1b00f70d8ff0178b4c01390d1bba4323cd472833bc1086` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wv/wv-nc-acquittal-dismissal-set--official-pdf-fill/fixtures/dismissal-boundary.pdf` — `bbfcd767b02230300e2164a40cc2d81967c87fb9b7ddf4f0677622e1319fe878` · 3 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/wv/wv-nc-acquittal-dismissal-set--official-pdf-fill/fixtures/dismissal-canonical.pdf` and `data/rcap-all50/overlays/census-v1/wv/wv-nc-acquittal-dismissal-set--official-pdf-fill/fixtures/dismissal-boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 12 across all documents · requested scale 2.5
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
FAMILIES ASSIGNED: 85
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
