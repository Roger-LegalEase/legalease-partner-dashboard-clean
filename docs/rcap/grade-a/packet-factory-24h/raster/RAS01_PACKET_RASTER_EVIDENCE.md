# RAS01

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `0bab0ce4c0b33643248678f3644184c7dd6b6e73`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (55)

### agency-application-treatment:obligation:research-decision-route:AL:al-uncharged-arrest:agency_record_challenge

- canonical `data/rcap-all50/overlays/census-v1/al/agency-application-treatment:obligation:research-decision-route:al:al-uncharged-arrest:agency-record-challenge--official-pdf-fill/fixtures/canonical.pdf` — `95fed142e8fab838496cc9bf531e2268a4d45c9e3c375f8dab1e70a7ec1303c5`
- boundary `data/rcap-all50/overlays/census-v1/al/agency-application-treatment:obligation:research-decision-route:al:al-uncharged-arrest:agency-record-challenge--official-pdf-fill/fixtures/boundary.pdf` — `c9a3b9b16e77d75105628785ea19e9168e3d0a2318a43efd8a253e4450e39ea7`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### agency-application-treatment:obligation:track-only:CT:ct-destruction-request

- canonical `data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-only:ct:ct-destruction-request--official-pdf-fill/fixtures/canonical.pdf` — `5ecda8851a55db44ff78338c5ff75d2a618e48010986697d5568876d922cf948`
- boundary `data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-only:ct:ct-destruction-request--official-pdf-fill/fixtures/boundary.pdf` — `d05de02906fe2632b75d1a91acb2d2cd84a073c1d918e11aed57556d2742872c`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### ak-courtview-set

- canonical `data/rcap-all50/overlays/census-v1/ak/ak-courtview-set--official-pdf-fill/fixtures/tf810-canonical-filled.pdf` — `ac2111fa8215881775b35f198d5098aab766703ad55cf24a74a1e5aba843df83`
- boundary `data/rcap-all50/overlays/census-v1/ak/ak-courtview-set--official-pdf-fill/fixtures/tf810-boundary-filled.pdf` — `03b335a1c82762e2e3a98a9fe0e2d5dc8bd74896ade06b5c88100cd9afdd0e1e`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### al-misd-nonconviction-90-set

- canonical `data/rcap-all50/overlays/census-v1/al/al-misd-nonconviction-90-set--official-pdf-fill/fixtures/canonical.pdf` — `a78e750dbfab51d1c78da841c09e02e2a095f12110879cf430a21de8d0a58d86`
- boundary `data/rcap-all50/overlays/census-v1/al/al-misd-nonconviction-90-set--official-pdf-fill/fixtures/boundary.pdf` — `92e03761acd5adb3c7b503c3373f14c36a4c09e038b6c107c940b6823059a06b`
- expected pages 11 · requested scale 2.5
- built by (no builder lane recorded)

### ar-cs-possession-seal-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-cs-possession-seal-set--official-pdf-fill/fixtures/order-canonical-filled.pdf` — `1a65c2d88b0250a2ef61ced0dcb5205560db3f7da557a4a816cda978f503ca4d` · 3 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-cs-possession-seal-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `64e754057aaf8a177a8ab2e07a8f400962a391689683497df31bf760b92c433a` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-cs-possession-seal-set--official-pdf-fill/fixtures/order-boundary-filled.pdf` — `e54509e57b1ccb586a989c391159cd9c5d6ecdd1049f99e7fa70f654b42fc70e` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-cs-possession-seal-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `1423a809982f86fab3e26d72e7a9e4345667139715de75715c734877c460072c` · 5 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ar/ar-cs-possession-seal-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/ar/ar-cs-possession-seal-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 16 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### az_marijuana_expungement_limited_jurisdiction-set

- canonical `data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-limited-jurisdiction-set--official-pdf-fill/fixtures/canonical.pdf` — `d82d2df0f6e16c61cb8dfd3d405945a4b92fc885b4dd99ed07058d880023614f`
- boundary `data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-limited-jurisdiction-set--official-pdf-fill/fixtures/boundary.pdf` — `aa1bade440c1417966bd1579d6b5084f0961942b18fb8643e1835e3d4c1181c8`
- expected pages 3 · requested scale 2.5
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

### co_decriminalized_conduct_seal-set

- canonical `data/rcap-all50/overlays/census-v1/co/co-decriminalized-conduct-seal-set--official-pdf-fill/fixtures/canonical.pdf` — `d002c853e5a21a0314ea9a359d975744c49699b473e2288224aa0dc57a882350`
- boundary `data/rcap-all50/overlays/census-v1/co/co-decriminalized-conduct-seal-set--official-pdf-fill/fixtures/boundary.pdf` — `48bfd2a6832b5df00c0c20e2e20892a8b624dc93e8da4390863e6d1cf9342514`
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

### ct-decriminalized-set

- canonical `data/rcap-all50/overlays/census-v1/ct/ct-decriminalized-set--custom-pleading/fixtures/canonical.pdf` — `9b6667f6ecbe38c2657b100a663727c227b6ce8f4e3244544041239b764218b2`
- boundary `data/rcap-all50/overlays/census-v1/ct/ct-decriminalized-set--custom-pleading/fixtures/boundary.pdf` — `b5134f47d6b55ea57179437561767b8c38c65e8be8d10281224549c2df442d83`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### ct-under18-misdemeanor-set

- canonical `data/rcap-all50/overlays/census-v1/ct/ct-under18-misdemeanor-set--custom-pleading/fixtures/canonical.pdf` — `590845d99eebe8690b046e6e165e2774307f008eb81def64b009603b70b556ae`
- boundary `data/rcap-all50/overlays/census-v1/ct/ct-under18-misdemeanor-set--custom-pleading/fixtures/boundary.pdf` — `3a951c8005870a9f49b4f426d2602fb4400430ff40c85af54b87adf5a7bb5888`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### dc_seal_fugitive-set

- canonical `data/rcap-all50/overlays/census-v1/dc/dc-seal-fugitive-set--custom-pleading/fixtures/canonical.pdf` — `315401332562ec19d602679d75a2a5e1789c2fb60163ec967c7791e0db65ee3a`
- boundary `data/rcap-all50/overlays/census-v1/dc/dc-seal-fugitive-set--custom-pleading/fixtures/boundary.pdf` — `291e6c0f544490fb66158b9fd15e769badc92564033d657529a62ece429513da`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### fl-self-defense-set

- canonical `data/rcap-all50/overlays/census-v1/fl/fl-self-defense-set--official-pdf-fill/fixtures/canonical.pdf` — `a217288839ba7e3ed5b54ade1098e342dd07f6f72e915119b010933d151f853b`
- boundary `data/rcap-all50/overlays/census-v1/fl/fl-self-defense-set--official-pdf-fill/fixtures/boundary.pdf` — `627dfa777177431cb5cb8c8f9939a62b184e8628f0b007cb74059b84afe317ba`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### ga-fo-active-pre2026-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-fo-active-pre2026-set--custom-pleading/fixtures/canonical.pdf` — `e3ecc96b782b313a09977491d76d96c065a2c2082ef3375d025d1f9071b9e862`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-fo-active-pre2026-set--custom-pleading/fixtures/boundary.pdf` — `95eafa84a182bb34d9274f9d62b26d4eb78665df47dea34b8deb0a367f6a93d6`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### ga-misd-j4-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-misd-j4-set--custom-pleading/fixtures/canonical.pdf` — `b0bdee422f27e0071aa80c690e0cca34c2db05011401408d891e1be2dbc45890`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-misd-j4-set--custom-pleading/fixtures/boundary.pdf` — `682fb675da02adc43528a0d6d841bd7c3a428287b36e940788558589586a5470`
- expected pages 9 · requested scale 2.5
- built by (no builder lane recorded)

### ga-seal-m-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-seal-m-set--custom-pleading/fixtures/canonical.pdf` — `9b57311c3b69ac540a711dd174de9bec6d5b1b1fd7870dde4cbb592e2edf4796`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-seal-m-set--custom-pleading/fixtures/boundary.pdf` — `09abd2c2eacdc14fe2840688202ccf62d8506dd19f801e926cb2614c5b420182`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### hi_nonconviction_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/hi/hi-nonconviction-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `f15b906a649280d5bab03a81078d7f283a38eb3a81519773c15a2881f71b4d43`
- boundary `data/rcap-all50/overlays/census-v1/hi/hi-nonconviction-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `696e190fa18b54f8e7694eaed727dc7f8b10d7515a847d9fec904b9a3b3879a1`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### id_felony_reduction-set

- canonical `data/rcap-all50/overlays/census-v1/id/id-felony-reduction-set--custom-pleading/fixtures/canonical.pdf` — `d246f76059f94a3f78286381d3ff6289cae01f5593b11c3625a50d223e33afd1`
- boundary `data/rcap-all50/overlays/census-v1/id/id-felony-reduction-set--custom-pleading/fixtures/boundary.pdf` — `8c5d84ecc8a8946d5ad51ad38326119f208ae4791775c7aff448af9ef7fabc48`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### il-exp-nonconv-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-exp-nonconv-set--official-pdf-fill/fixtures/canonical.pdf` — `66f6e94e2d12f903bc6049f8c2a2e589c906d62d16941b73013d42269f749a86`
- boundary `data/rcap-all50/overlays/census-v1/il/il-exp-nonconv-set--official-pdf-fill/fixtures/boundary.pdf` — `db3bb03c17bb2a10ad017cc38ddb19bd2920db52fb02636d19410e98c64022fa`
- expected pages 14 · requested scale 2.5
- built by (no builder lane recorded)

### il-exp-supervision-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-exp-supervision-set--official-pdf-fill/fixtures/canonical.pdf` — `330731d947e74856c6748be80041c3222d522f7ea421c2cacd5b02fd2beeb5fb`
- boundary `data/rcap-all50/overlays/census-v1/il/il-exp-supervision-set--official-pdf-fill/fixtures/boundary.pdf` — `df3754d4f3f15da219bba84363aa45fb2ad923416948dbe5fe02e1e709eb3cc2`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### il-seal-nonconv-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-seal-nonconv-set--official-pdf-fill/fixtures/canonical.pdf` — `333ffbeb03e846be21f52caa2088d9230b9b6d6094f90f764385218d46815d39`
- boundary `data/rcap-all50/overlays/census-v1/il/il-seal-nonconv-set--official-pdf-fill/fixtures/boundary.pdf` — `1df2b84a4cc3a6f2c4dc2e1724525e586997349940987ff396b932f3f78816c1`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### ky_criminal_record_segregation-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-criminal-record-segregation-set--custom-pleading/fixtures/canonical.pdf` — `688787fb65152b5bb91ee9677012709e808db28da9dccb7599f85a631ac97970`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-criminal-record-segregation-set--custom-pleading/fixtures/boundary.pdf` — `7e8e5f3eda4cc8cd5a5cc5a29d6c10e83eae825a3508a24e4d9ed7732a5cb470`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### ky_void_seal_controlled_substance-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-void-seal-controlled-substance-set--custom-pleading/fixtures/canonical.pdf` — `e7419541f263c4fdc41bbcea0d45d4dd748a35830e722c02f88afd412c646037`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-void-seal-controlled-substance-set--custom-pleading/fixtures/boundary.pdf` — `0b864b30e140fd8b53adc948f6b294c093095e133b489dab27a745dd632db12f`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### la-985-1-interim-expungement-set

- canonical `data/rcap-all50/overlays/census-v1/la/la-985-1-interim-expungement-set--custom-pleading/fixtures/canonical.pdf` — `bc8ac10385277dd5f8fb8d39c7e50a3d87084812efed77b796a5562ae5e3211c`
- boundary `data/rcap-all50/overlays/census-v1/la/la-985-1-interim-expungement-set--custom-pleading/fixtures/boundary.pdf` — `c1180002d64c1959cd4e428af473fe311c6ad313893176b9e5e7fdf84bb10c9e`
- expected pages 19 · requested scale 2.5
- built by (no builder lane recorded)

### ma-seal-admin-set

- canonical `data/rcap-all50/overlays/census-v1/ma/ma-seal-admin-set--official-pdf-fill/fixtures/canonical.pdf` — `f01868bbe1716bbe6576d39431a0b77ef7310a4a2d10c025f040edbe72c58987`
- boundary `data/rcap-all50/overlays/census-v1/ma/ma-seal-admin-set--official-pdf-fill/fixtures/boundary.pdf` — `fbaf27c950c8dc336c28a4d59bf1a35ac82309d338e86623b1ae2756f80767d5`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### md_pardon_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/md/md-pardon-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `96b99e1fcf5cc7e3ce940a18595d219d17134903e11aa460b8622880303f6559`
- boundary `data/rcap-all50/overlays/census-v1/md/md-pardon-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `f8e335bc8e2f3c3cb78f3708d8147c837ec7eeb33d353f10d493bae1b4b57b68`
- expected pages 4 · requested scale 2.5
- built by VF02

### me-seal-gen-set

- canonical `data/rcap-all50/overlays/census-v1/me/me-seal-gen-set--official-pdf-fill/fixtures/canonical.pdf` — `10e5a82b626d98851b525f380000e9435aa49c303f7f334d771f002dd89ade78`
- boundary `data/rcap-all50/overlays/census-v1/me/me-seal-gen-set--official-pdf-fill/fixtures/boundary.pdf` — `43593b8922759124491186b0a8460ff1b21633ed85eccba1fa11a7c88c0730cc`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### mi_setaside_marihuana-set

- canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-marihuana-set--official-pdf-fill/fixtures/canonical.pdf` — `d026a1bffa91702245c6938ab4438a29a83ae93f109dd9677d8253aca81e463f`
- boundary `data/rcap-all50/overlays/census-v1/mi/mi-setaside-marihuana-set--official-pdf-fill/fixtures/boundary.pdf` — `5180ce722fb75f08b366c3c7b7d9a0e43d4a36076593aeb704b14adc8b3f4f82`
- expected pages 2 · requested scale 2.5
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

### nh_conviction_standard-set

- canonical `data/rcap-all50/overlays/census-v1/nh/nh-conviction-standard-set--official-pdf-fill/fixtures/canonical.pdf` — `bd2a4c278778d4b61cdee81110ecccfe2ba93a3f794e04f8a929ffdafcadebe3`
- boundary `data/rcap-all50/overlays/census-v1/nh/nh-conviction-standard-set--official-pdf-fill/fixtures/boundary.pdf` — `78908658fd0dc118ea0112c03bcec2bd0b6f7ab3a4c6b878bdaa8a1d6d91383f`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### nv_repository_removal-set

- canonical `data/rcap-all50/overlays/census-v1/nv/nv-repository-removal-set--custom-pleading/fixtures/canonical.pdf` — `4fa967de12c8220baa4808970311abc1ba399b9760304925558ec0def9beefeb`
- boundary `data/rcap-all50/overlays/census-v1/nv/nv-repository-removal-set--custom-pleading/fixtures/boundary.pdf` — `fc65671f4c17927097e1037cee4e7e4a93d1676ca3c21c0e0206db6487138ab0`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### official-form-treatment:obligation:research-decision-route:AL:al-olr

- canonical `data/rcap-all50/overlays/census-v1/al/official-form-treatment:obligation:research-decision-route:al:al-olr--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `9414ff9d97234b9d98f6362c198acec77d7921c789a273f990a927bb487e8449`
- boundary `data/rcap-all50/overlays/census-v1/al/official-form-treatment:obligation:research-decision-route:al:al-olr--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `6b04f5d39f52f7cdea4c5771b7df24c43a2f266b67c986514d9e490d5afdc6bc`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### pa_age70_deceased-set

- canonical `data/rcap-all50/overlays/census-v1/pa/pa-age70-deceased-set--official-pdf-fill/fixtures/canonical.pdf` — `f4f4b3ba5263fff23c409e8b8ffda95c2ee3e1cf6fea623af5ddb09ed181639e`
- boundary `data/rcap-all50/overlays/census-v1/pa/pa-age70-deceased-set--official-pdf-fill/fixtures/boundary.pdf` — `03aefe90a39c91ac577858abeadf09c215e261f3fcb12fbe97ae8f1c7c1c2ac1`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-ks-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/ks/rcap-ks-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `0da4dbab6b7be1f15ebb4ca2e5fa7810f6c8e34f366dc87b4131c311a4d0ec74`
- boundary `data/rcap-all50/overlays/census-v1/ks/rcap-ks-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `e12e30be68deb94e934bb3ab3080b1cc0d0c048810781f8491710c5740cd55c7`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-oh-custom-pleading-clean-tracks

- **8 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/tracks/oh_2953_32_expungement/rendered/canonical/canonical.pdf` — `c07ffa2bc32bee08f8bb81280042c5477560e770dcf8efdea1ad52b0c19d45b9` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/tracks/oh_2953_32_sealing/rendered/canonical/canonical.pdf` — `fbf1c284b7bf9e76d782279de376e0a5eef8cbe619887033f27fe628ff1065cb` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/tracks/oh_2953_33_nonconviction/rendered/canonical/canonical.pdf` — `706adfcd0ba6a26778374545a4d9c2b1e5d1138cb1a15a4acf2b293716e11406` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/tracks/oh_2953_35_firearm/rendered/canonical/canonical.pdf` — `375eb1262bfce63677f756b1ab22d90b2f9c459e2fcc98aaaeacf899d8970214` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/tracks/oh_2953_32_expungement/rendered/boundary/boundary.pdf` — `52fcfb3e632223b8ffc238175f232fef31e0bd3d740b4024aba39f659688adf1` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/tracks/oh_2953_32_sealing/rendered/boundary/boundary.pdf` — `43acb3e1195fb1887e7fce984bb60c86dfdd1ba2e5ea563b7ad618435fee1e2e` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/tracks/oh_2953_33_nonconviction/rendered/boundary/boundary.pdf` — `4e8955cd1461d3e091230d5d9831ae4c952b95a214626bd425bc509effd79028` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/tracks/oh_2953_35_firearm/rendered/boundary/boundary.pdf` — `51aaec6a1f3900aa40ea9b2d6bf3c955d0a819c9ffc9ddb12691d790f4c8351c` · 2 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/tracks/oh_2953_32_sealing/rendered/canonical/canonical.pdf` and `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/tracks/oh_2953_32_sealing/rendered/boundary/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 16 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### rcap-tx-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/tx/rcap-tx-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `0528011ffe6651bbafcab07dbae1f86396ad5d21f4afcf233fdeec8482fe093e`
- boundary `data/rcap-all50/overlays/census-v1/tx/rcap-tx-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `1f2345d0e9bb8dada10abe52b563bf88868d8954153d3cca4e7df97224c9894d`
- expected pages 16 · requested scale 2.5
- built by (no builder lane recorded)

### ri_deferred_sentence-set

- canonical `data/rcap-all50/overlays/census-v1/ri/ri-deferred-sentence-set--official-pdf-fill/fixtures/canonical.pdf` — `0960782f51292843e37f6b7bec43844c3e128b3ef1cc1f1c1cb08cbb1eccc063`
- boundary `data/rcap-all50/overlays/census-v1/ri/ri-deferred-sentence-set--official-pdf-fill/fixtures/boundary.pdf` — `b56a0747459a835eb6f8e396c12d9d11ae69b19cf5aa341cd5a9a21edfd58e3a`
- expected pages 14 · requested scale 2.5
- built by (no builder lane recorded)

### sc_17_22_950_summary-set

- canonical `data/rcap-all50/overlays/census-v1/sc/sc-17-22-950-summary-set--official-pdf-fill/fixtures/canonical.pdf` — `f373d91a18f015ebc7f3c7a9e7d71c1e47a469e830977555c937f4241cc8c5a1`
- boundary `data/rcap-all50/overlays/census-v1/sc/sc-17-22-950-summary-set--official-pdf-fill/fixtures/boundary.pdf` — `42e3e5e2b24e0f2b8064fef187ab2331c5914710c43899d2abd99c0a7bbfeaf9`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### ut_pet_dismissed_without_prejudice-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-dismissed-without-prejudice-set--official-pdf-fill/fixtures/canonical.pdf` — `53f275aeee3fe0caf9e83b0bdf2d30e4152f523215a3631ae7b0f9ebbdb2401a`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-dismissed-without-prejudice-set--official-pdf-fill/fixtures/boundary.pdf` — `f37d2e7eda71cfe2a444e09b2e169f50d54b514b116a8b0bdf32049954179a3f`
- expected pages 19 · requested scale 2.5
- built by (no builder lane recorded)

### va_exp_absolute_pardon-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-exp-absolute-pardon-set--custom-pleading/fixtures/canonical.pdf` — `b56af08c1b796b78a26ebac56a3580299e5e06022976941ba0b7fd68cf810188`
- boundary `data/rcap-all50/overlays/census-v1/va/va-exp-absolute-pardon-set--custom-pleading/fixtures/boundary.pdf` — `f7691bc33addbaef446ccccb09c551e673bd5369410c363044794a429fea29eb`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### va_seal_petition_felony-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-seal-petition-felony-set--official-pdf-fill/fixtures/canonical.pdf` — `e99ca2b8ab006ac0c2dbaee9c049489be542e7bab1632f3a7f7a89f17a8f48ff`
- boundary `data/rcap-all50/overlays/census-v1/va/va-seal-petition-felony-set--official-pdf-fill/fixtures/boundary.pdf` — `d66a8f19d3a332d1a47cd8b831f3b0719f5eec87f2b1320ac1763648adacf580`
- expected pages 11 · requested scale 2.5
- built by (no builder lane recorded)

### vt_seal_dui-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-dui-set--official-pdf-fill/fixtures/canonical.pdf` — `81dd74a0ee1d178cefcb0f028dfba3e9bc7dbd7687bcf58193b0b9d62d767dee`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-dui-set--official-pdf-fill/fixtures/boundary.pdf` — `7ff3cc2272008865eba1d723e1d8dc4074b8163c7c6dbca82cf665003e32750e`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### vt_seal_pardon-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-pardon-set--official-pdf-fill/fixtures/canonical.pdf` — `81dd74a0ee1d178cefcb0f028dfba3e9bc7dbd7687bcf58193b0b9d62d767dee`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-pardon-set--official-pdf-fill/fixtures/boundary.pdf` — `7ff3cc2272008865eba1d723e1d8dc4074b8163c7c6dbca82cf665003e32750e`
- expected pages 6 · requested scale 2.5
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

### wa_vac_survivor_felony-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-felony-set--official-pdf-fill/fixtures/cr-08-0900-canonical-filled.pdf` — `3c40568209578ca04893ce46b64539a44af355dc11bd75b7daee75d215eda37f` · 3 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-felony-set--official-pdf-fill/fixtures/cr-08-0920-canonical-filled.pdf` — `1c715d2be4cfa5398a82fad6999570e1502a607a3f939061f01710f443d5e6eb` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-felony-set--official-pdf-fill/fixtures/cr-08-0900-boundary-filled.pdf` — `2da76cc75f1ccd72cc12fdefef71edb90f477199877714e3263d9b46a4fccc8d` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-felony-set--official-pdf-fill/fixtures/cr-08-0920-boundary-filled.pdf` — `e5014e2e979599132c6232fae1b94fe8dd271eef6a63c113e42a886377840721` · 3 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-felony-set--official-pdf-fill/fixtures/cr-08-0900-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-felony-set--official-pdf-fill/fixtures/cr-08-0900-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 12 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### wi_nc_doj_challenge-set

- canonical `data/rcap-all50/overlays/census-v1/wi/wi-nc-doj-challenge-set--official-pdf-fill/fixtures/canonical.pdf` — `edb7338200e12436a22390b6857b54bb0b44d074abc745b5c02c158f85457b4f`
- boundary `data/rcap-all50/overlays/census-v1/wi/wi-nc-doj-challenge-set--official-pdf-fill/fixtures/boundary.pdf` — `365d25ebf98bc23dba12805e97f985d6f39fc2403cec591b9646a6be8f35596e`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### wv_conv_single_misdemeanor-set

- canonical `data/rcap-all50/overlays/census-v1/wv/wv-conv-single-misdemeanor-set--official-pdf-fill/fixtures/canonical.pdf` — `37764d50ba8f761661e2576cb76ff6a95aaf06bfbc2f00236ecc6c9c03e90ffa`
- boundary `data/rcap-all50/overlays/census-v1/wv/wv-conv-single-misdemeanor-set--official-pdf-fill/fixtures/boundary.pdf` — `c51fde179db7a9bf1ae3b44b93ba7c48695edf49a3459245bb7bb826462c397e`
- expected pages 4 · requested scale 2.5
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

- `data/rcap-grade-a/codex-cloud/ras01-raster-evidence/**` — and nothing else.

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
LANE: RAS01
FAMILIES ASSIGNED: 55
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
