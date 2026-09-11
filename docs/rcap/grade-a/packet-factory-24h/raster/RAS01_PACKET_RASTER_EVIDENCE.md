# RAS01

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `69a04a04687c56c04da90bdb1e6648d0d794e39a`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (68)

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

### al-diversion-set

- canonical `data/rcap-all50/overlays/census-v1/al/al-diversion-set--official-pdf-fill/fixtures/canonical.pdf` — `bd0881fb24b1e781c329bde7f33d8aff34944e47582b7054a8ede3cf1c2a517d`
- boundary `data/rcap-all50/overlays/census-v1/al/al-diversion-set--official-pdf-fill/fixtures/boundary.pdf` — `5feb377515f1b37cf0b422bff4fd31b9aa0d6ff93e67303782eaeb5e62385c8f`
- expected pages 11 · requested scale 2.5
- built by (no builder lane recorded)

### al-misd-dwop-set

- canonical `data/rcap-all50/overlays/census-v1/al/al-misd-dwop-set--official-pdf-fill/fixtures/canonical.pdf` — `d29b3da197d38df0f347b41335261fd3564b1cb20c93491b384ccbc7ade01780`
- boundary `data/rcap-all50/overlays/census-v1/al/al-misd-dwop-set--official-pdf-fill/fixtures/boundary.pdf` — `d87dfb4612e487f3b0b23e1db743795208a06f7e70638fe575f74cf37e182b82`
- expected pages 11 · requested scale 2.5
- built by (no builder lane recorded)

### ar-arrest-seal-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-arrest-seal-set--official-pdf-fill/fixtures/order-canonical-filled.pdf` — `161971dca56b9292dac5a8bd9eda03e2deb910d0c1cfbecc98d017bbf17841bb` · 3 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-arrest-seal-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `78ef189e981b35fec69688cc6d3181df245b309e7405c954fcabd503e426bea5` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-arrest-seal-set--official-pdf-fill/fixtures/order-boundary-filled.pdf` — `d633848fda999d95f9fa7e82284b82613af94d36512b1aa8b0914d36a13be194` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-arrest-seal-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `fb32678b598155af6d1436eeb51098cb665fe2f1711bd826ec2b980b1c30a811` · 3 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ar/ar-arrest-seal-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/ar/ar-arrest-seal-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 12 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### ar-misdemeanor-dwi-seal-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-misdemeanor-dwi-seal-set--official-pdf-fill/fixtures/order-canonical-filled.pdf` — `0466f3b488b5af28d236c62555c3592f48755ebc1381e52e265b2d1755ce0f52` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-misdemeanor-dwi-seal-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `6bf0184ddc31364f316cb656745f364f8def8aa547428beb881c4c632e2f750d` · 4 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-misdemeanor-dwi-seal-set--official-pdf-fill/fixtures/order-boundary-filled.pdf` — `d4a69cd9f0cd0713ed8f6cf9410dc80240c8e181662b2f87b5fd1ba3dffd22c0` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-misdemeanor-dwi-seal-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `a6cef12f7344600b5f9e89aefee9785440de185d88340d051b090ec6011bdfb8` · 4 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ar/ar-misdemeanor-dwi-seal-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/ar/ar-misdemeanor-dwi-seal-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 12 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### az_certificate_second_chance-set

- canonical `data/rcap-all50/overlays/census-v1/az/az-certificate-second-chance-set--official-pdf-fill/fixtures/canonical.pdf` — `5fa7e6d4f0761fa26d932ca667878a4acb50bdf18b6854cd25a9a2cb3ab7a27a`
- boundary `data/rcap-all50/overlays/census-v1/az/az-certificate-second-chance-set--official-pdf-fill/fixtures/boundary.pdf` — `e8414477b71352df8e01ebfdce17bd1c66e07c9ca09af30fef062313deef2bfa`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### az_record_sealing_arrest_no_charges-set

- **6 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/az/az-record-sealing-arrest-no-charges-set--official-pdf-fill/fixtures/canonical/order.pdf` — `152fe92b232a9a96a5be8aceaffd79d6f6f281887e91fdb27fd43227ad8264a0` · 3 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/az/az-record-sealing-arrest-no-charges-set--official-pdf-fill/fixtures/canonical/packet-assembly.pdf` — `e9a10f6b4748a104579837d65700073c2d0b81f54ffde43f1e3de44191024bc8` · 8 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/az/az-record-sealing-arrest-no-charges-set--official-pdf-fill/fixtures/canonical/petition.pdf` — `0c0d3e2a3fc21194a90c487157cceaf7d96696a88db191e756728180bf5f9f2e` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/az/az-record-sealing-arrest-no-charges-set--official-pdf-fill/fixtures/boundary/order.pdf` — `9b030ea1d81736c83e0a7684e5fa8998ac556c3fe435bd283d94d29e3a9fcb88` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/az/az-record-sealing-arrest-no-charges-set--official-pdf-fill/fixtures/boundary/packet-assembly.pdf` — `0a199685a887524883eee342819f3b339d5c5b64d283ac202c509d408b13ef6f` · 8 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/az/az-record-sealing-arrest-no-charges-set--official-pdf-fill/fixtures/boundary/petition.pdf` — `86a413597d060d97bb1cb6241fd6d05f012e7ef3b4ed26d83330cc5678573069` · 5 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/az/az-record-sealing-arrest-no-charges-set--official-pdf-fill/fixtures/canonical/packet-assembly.pdf` and `data/rcap-all50/overlays/census-v1/az/az-record-sealing-arrest-no-charges-set--official-pdf-fill/fixtures/boundary/packet-assembly.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 32 across all documents · requested scale 2.5
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

### census-pending-family:UT:path-l-vacatur-human-trafficking-related-expungement

- canonical `data/rcap-all50/overlays/census-v1/ut/census-pending-family:ut:path-l-vacatur-human-trafficking-related-expungement--official-pdf-fill/fixtures/canonical.pdf` — `63f42d6f2871b84a6af1cd7a525d865e4ca4a2d7d75aff413c87f37295dc787d`
- boundary `data/rcap-all50/overlays/census-v1/ut/census-pending-family:ut:path-l-vacatur-human-trafficking-related-expungement--official-pdf-fill/fixtures/boundary.pdf` — `0d6e5a39e149c8508f570db3716a60e580fce26aa64da7de876ab1baa3e6a138`
- expected pages 12 · requested scale 2.5
- built by (no builder lane recorded)

### co_pardoned_conviction_seal-set

- canonical `data/rcap-all50/overlays/census-v1/co/co-pardoned-conviction-seal-set--official-pdf-fill/fixtures/canonical.pdf` — `d285a03f788cb5e5b3a8d1f17babd379b199cd24c34d2e98b52363cd2c436bf7`
- boundary `data/rcap-all50/overlays/census-v1/co/co-pardoned-conviction-seal-set--official-pdf-fill/fixtures/boundary.pdf` — `407db19ec374b58b0e429b40ac6de54877510b47fe16db77739400e4edbada4c`
- expected pages 4 · requested scale 2.5
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

### composed-treatment:obligation:runtime-only:PA:path-k-human-trafficking-vacatur-expungement

- canonical `data/rcap-all50/overlays/census-v1/pa/composed-treatment:obligation:runtime-only:pa:path-k-human-trafficking-vacatur-expungement--custom-pleading/fixtures/canonical.pdf` — `ed70579671b2b948b32fdd2854bbf4082b9f5013e591164dd0a77c0387710f4e`
- boundary `data/rcap-all50/overlays/census-v1/pa/composed-treatment:obligation:runtime-only:pa:path-k-human-trafficking-vacatur-expungement--custom-pleading/fixtures/boundary.pdf` — `7609ccbb635efa704dd57886a3e773b7eca7534691561fc11d288e19780232a8`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:sc_17_22_950_summary

- canonical `data/rcap-all50/overlays/census-v1/sc/composed-treatment:sc-17-22-950-summary--custom-pleading/fixtures/canonical.pdf` — `9742b771437d6bf34a3701e1a9838f35f49548f92e450011edf8622a31ce4c63`
- boundary `data/rcap-all50/overlays/census-v1/sc/composed-treatment:sc-17-22-950-summary--custom-pleading/fixtures/boundary.pdf` — `e5c37a603eff1af87cacc0f405aea4738aeb7f6ff65a7fb7d78527a7680f2cdb`
- expected pages 6 · requested scale 2.5
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

### de_pardon_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/de/de-pardon-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `7bce0bddd5eef1c0f23f264da8146805c52d4cc8dff16b8871ef78bfe1a97fe9`
- boundary `data/rcap-all50/overlays/census-v1/de/de-pardon-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `68f209017dc63ff37828c0bfb35e4f162a380a533ad821274b8beee0ad34dfb9`
- expected pages 3 · requested scale 2.5
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

### in_conviction_d6-set

- canonical `data/rcap-all50/overlays/census-v1/in/in-conviction-d6-set--custom-pleading/fixtures/canonical.pdf` — `9fc3c5e61d934f5be61ecbdf47e7e4a2dde73aa25b02cf831970d2110127bf75`
- boundary `data/rcap-all50/overlays/census-v1/in/in-conviction-d6-set--custom-pleading/fixtures/boundary.pdf` — `cdaf07e256d6fd0c0665877ccffd90eb9d92591bb2c36711dee935a55a7d7939`
- expected pages 10 · requested scale 2.5
- built by (no builder lane recorded)

### ky_criminal_record_segregation-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-criminal-record-segregation-set--custom-pleading/fixtures/canonical.pdf` — `688787fb65152b5bb91ee9677012709e808db28da9dccb7599f85a631ac97970`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-criminal-record-segregation-set--custom-pleading/fixtures/boundary.pdf` — `7e8e5f3eda4cc8cd5a5cc5a29d6c10e83eae825a3508a24e4d9ed7732a5cb470`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### ky_nonconviction_expungement-set

- **13 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `348e5677f471acea22dd6643fea1c820db8779f218b2563417682433a8884be2` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/selectable/acquittal-with-order.pdf` — `8b806d7edb05b79773c4cffb09e496ff16fe62805df4105c761d15d45c06c903` · 8 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/selectable/acquittal.pdf` — `47dc4c77498407c8d75fbed895191065a1e35b8b19f6d5283a83acfade1d2d8c` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/selectable/automatic-missed-exact-60-days.pdf` — `b3250b724ed748f48fe6126686d3dd0adbf594310ec09f12f06e1196a428b902` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/selectable/dismissed_with_prejudice-with-order.pdf` — `7608f5a1f6f2a82e13c2c8ab7e47fbf4fbd302a1d13fa0bf28388e521cd939b7` · 8 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/selectable/dismissed_with_prejudice.pdf` — `348e5677f471acea22dd6643fea1c820db8779f218b2563417682433a8884be2` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/selectable/felony_without_prejudice-with-order.pdf` — `61d4a78aa97cae751de0a07a232c1b77b6b3105fde28f52e94247b9d7471274e` · 8 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/selectable/felony_without_prejudice.pdf` — `52e2a1b5a160a8ded12da380ef7101b6bda8515431799f28c9d126a18ee3902a` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/selectable/misdemeanor_without_prejudice-with-order.pdf` — `700f772dd5d2feee0d76e001aab1cb7cabbcb574fb4bec96a29f936ffd388fcd` · 8 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/selectable/misdemeanor_without_prejudice.pdf` — `ba982c0b44e445ffe0897d0cd354aa2132d1b49a8ce17de624f11742388b74e1` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/selectable/no_indictment-with-order.pdf` — `ec9a5b1d2d706b209c5e5d4e96a7821c77ed960de8294b635a1056ca0eaba3af` · 8 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/selectable/no_indictment.pdf` — `996013880aa5fdf217212f8f0bf6cbd98c41b08a3561982c5f87ec5cc6849485` · 6 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `93f902bfe7108680379c49d5a4cf27273369b67a7794e989ee17c52a8ee20474` · 8 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/canonical.pdf` and `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 90 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### la-977-misdemeanor-conviction-set

- canonical `data/rcap-all50/overlays/census-v1/la/la-977-misdemeanor-conviction-set--custom-pleading/fixtures/canonical.pdf` — `fd2d1324bab0740bf0c05ac3680baaba851524fd8e5997062ea27b48b90c3446`
- boundary `data/rcap-all50/overlays/census-v1/la/la-977-misdemeanor-conviction-set--custom-pleading/fixtures/boundary.pdf` — `35e8a1e90c10289940347d2471b2872f3582eb59a547ea9e48e14f9f0c363efe`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### la-985-expungement-by-redaction-set

- canonical `data/rcap-all50/overlays/census-v1/la/la-985-expungement-by-redaction-set--custom-pleading/fixtures/canonical.pdf` — `b1d880af0c6539383329e73491b0bb6d293f3fba4ea3509d32abcd894926ef8c`
- boundary `data/rcap-all50/overlays/census-v1/la/la-985-expungement-by-redaction-set--custom-pleading/fixtures/boundary.pdf` — `378c0dab12934eaf89e71f37ecf5489e53a7e3f6fe015ce387a63b85e9c87fc1`
- expected pages 17 · requested scale 2.5
- built by (no builder lane recorded)

### ma-expunge-mj-set

- canonical `data/rcap-all50/overlays/census-v1/ma/ma-expunge-mj-set--official-pdf-fill/fixtures/canonical.pdf` — `ceab4012296b4e132466a11ebc5239fd72ae553fd5a5554f7ddfc110fcb8f565`
- boundary `data/rcap-all50/overlays/census-v1/ma/ma-expunge-mj-set--official-pdf-fill/fixtures/boundary.pdf` — `ceab4012296b4e132466a11ebc5239fd72ae553fd5a5554f7ddfc110fcb8f565`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### ma-seal-decrim-set

- canonical `data/rcap-all50/overlays/census-v1/ma/ma-seal-decrim-set--official-pdf-fill/fixtures/canonical.pdf` — `3ac87f6e248672399d482881f012b779101229664ef9bed10e1f6914edfda5f4`
- boundary `data/rcap-all50/overlays/census-v1/ma/ma-seal-decrim-set--official-pdf-fill/fixtures/boundary.pdf` — `b2476975802790d46694f369ecf48b484451f328607938ebf4f366b5d4c4f08f`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### md_cannabis_petition-set

- **18 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/canonical.pdf` — `f23b8e7f426430906318accf3fb77872d698633595f689e6c68e4ff37be6b014` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/diagnostic/court-record-status-unknown.pdf` — `2e4b157880333a7ccc068f697c6b7072e815001323dc3d9d6dbb39794337252a` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/diagnostic/missing-completion.pdf` — `95973dbc63de656308b3316a4fddd50533cba9b3c2c3445fd7a9475c4c941ccf` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/diagnostic/missing-contact.pdf` — `e9b60540ec98c2aa84302ae55060b35c3b5e77edbda1449d1b1e260823d5511a` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/diagnostic/unknown-other-offenses.pdf` — `d3ec60fad8d31046634c75bc4029acccc1bd2521af8357520b0fac81f76deafb` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/diagnostic/waiver-missing-financial.pdf` — `dcc93cc8f92d78befb573b286e4143981116c457ab00a7633257f0c6bf08b60a` · 11 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/selectable/adult-transfer-waiver.pdf` — `1451df58551922ba05ad860d71d463c1ecf82420a8390454d8257d1e01bd13de` · 10 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/selectable/citation.pdf` — `9e612162b736fb51c706f056c1010b0827b1aca35a2e9746187d4c663395ef4e` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/selectable/no_longer_crime-paid.pdf` — `f23b8e7f426430906318accf3fb77872d698633595f689e6c68e4ff37be6b014` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/selectable/no_longer_crime-waiver.pdf` — `46cc42b5a7cc1440eb3b6d116585dd692a9e6cde9f23a77c3bd4be226549a5f9` · 10 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/selectable/possession-paid.pdf` — `43a47550a6b36d7b40e9dc052d237015f83ab58765cb07cd99ff3348d755601b` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/selectable/possession-separate-from-ineligible-unit.pdf` — `91d466fa7a8d3f36eb84642e5cdabac2d37d20dc2d929d32c71d92a049e80940` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/selectable/possession-waiver.pdf` — `eed350b0330b821a4f56b202addb440dd4e0dfe2c560eaad316defc9b7d22098` · 10 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/selectable/pwid-new-conviction-now-eligible.pdf` — `bace88ac613f6bb2f880f9aceae42a8cf2f03fe4842935bd0544d36131656896` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/selectable/pwid-paid.pdf` — `bace88ac613f6bb2f880f9aceae42a8cf2f03fe4842935bd0544d36131656896` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/selectable/pwid-waiver.pdf` — `dc68c9b81a6e5902b20efba2f40ca617224111ee748d2414abc3f2aaae1620a0` · 10 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/selectable/pwid-with-minor-traffic.pdf` — `72f07db610106ed219f4c195557e3851d08911865d75f54e33bb7ea255ad9443` · 6 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/boundary.pdf` — `1451df58551922ba05ad860d71d463c1ecf82420a8390454d8257d1e01bd13de` · 10 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/canonical.pdf` and `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 133 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### me-screening-set

- canonical `data/rcap-all50/overlays/census-v1/me/me-screening-set--custom-pleading/fixtures/canonical.pdf` — `18921d618fb4a51d970ea9c5d40d427d364f42f87727c9824c21442f747fcef5`
- boundary `data/rcap-all50/overlays/census-v1/me/me-screening-set--custom-pleading/fixtures/boundary.pdf` — `421d3ab97ca8ba4c2cb7dfa678a3d88fb0f1bc0f9e92486ee7e4dfafb3c8da56`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### mi_setaside_application-set

- **8 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/canonical.pdf` — `50743b57033e7ca6cf498bcc63902fbd29c15a0c2fd03dd39a7cfc756251bf5c` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/extended-history.pdf` — `f64e2a043bfd055b1e54de1d5c6947aa75b6b24144370aba5da286c1516cf6e3` · 7 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/local-ordinance.pdf` — `059e1198182dbbd8cb5d19a65f3912b12d6cee7551d961259024def698e16a71` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/mixed-ordinary-categories.pdf` — `d321419699f611eb774717b28f28f3090c1f92413c3e5d9cbdfaeef5c5e097ee` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/multiple-felonies.pdf` — `8caf55b0d211c6333fe6facaa1418b4a64a1537b6d10586dcbf70163fab8bfdf` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/serious-misdemeanor.pdf` — `4d46d8c3cef8a24a194ca3e03d292d7761aea2e6278dcc107eca313a1ca17cd0` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/single-felony.pdf` — `87a93436fec5cd2b604252337b1ae70a54d65516f3faac6196edacff4f8807bc` · 4 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/boundary.pdf` — `f3829e41b5a9458279fe6f07cfba744be113701f6b1393f5f40b94f11c536e49` · 5 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/canonical.pdf` and `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 36 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### mn_petition_15218-set

- canonical `data/rcap-all50/overlays/census-v1/mn/mn-petition-15218-set--official-pdf-fill/fixtures/canonical.pdf` — `cbdea2b8edd3e7151fc376273ac59832c2dbbb0486ad04b7cb08073fce5b3346`
- boundary `data/rcap-all50/overlays/census-v1/mn/mn-petition-15218-set--official-pdf-fill/fixtures/boundary.pdf` — `9ef91d9772ab7307e8877fc52e4db7878b1c4c2a2bf0106d8d63ce10fa7deeda`
- expected pages 17 · requested scale 2.5
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

- canonical `data/rcap-all50/overlays/census-v1/ne/ne-setaside-custodial-set--official-pdf-fill/fixtures/canonical.pdf` — `b02c3b62d14579e010deef29863fee2a85e28ed1abebc6acaa0514fdc1c0b7f4`
- boundary `data/rcap-all50/overlays/census-v1/ne/ne-setaside-custodial-set--official-pdf-fill/fixtures/boundary.pdf` — `c5dee7b4076a9c346954dcae4008c50783e86c45b90abdff9a2458306a5ae92c`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### nh_petition_nonconviction_pre2019-set

- canonical `data/rcap-all50/overlays/census-v1/nh/nh-petition-nonconviction-pre2019-set--official-pdf-fill/fixtures/canonical.pdf` — `adcd250e96f50e380bc9d15529130865be9d1a2c0336c139978c81acea70f0c6`
- boundary `data/rcap-all50/overlays/census-v1/nh/nh-petition-nonconviction-pre2019-set--official-pdf-fill/fixtures/boundary.pdf` — `b9cf9a1724750739ce93945ee01ed2939c97de2446dc95051c6628ef5f34af6f`
- expected pages 9 · requested scale 2.5
- built by (no builder lane recorded)

### nj_ordinance-set

- canonical `data/rcap-all50/overlays/census-v1/nj/nj-ordinance-set--official-pdf-fill/fixtures/cn-10557-canonical.pdf` — `03f6169d042fc1d5ed30df008dfc966ef3d03b382731f5956d0e8786ca8a234f`
- boundary `data/rcap-all50/overlays/census-v1/nj/nj-ordinance-set--official-pdf-fill/fixtures/cn-10557-boundary.pdf` — `23a571af72985717963001120ba60116ae43054aaa1c2fddbeece944dac24494`
- expected pages 43 · requested scale 2.5
- built by (no builder lane recorded)

### ny_mrta_marijuana-set

- canonical `data/rcap-all50/overlays/census-v1/ny/ny-mrta-marijuana-set--official-pdf-fill/fixtures/mrta-destruction-request-canonical.pdf` — `37d456b6c2b79c3801bb9c07030072d5b0487a95f711a92a3fd8ef14e99b05ff`
- boundary `data/rcap-all50/overlays/census-v1/ny/ny-mrta-marijuana-set--official-pdf-fill/fixtures/mrta-destruction-request-boundary.pdf` — `5f61e8f23675070c7691b16c6522745f5fa033083725f1eefb9caccc32cb3457`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### pa_490_nonconviction-set

- **6 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/pa/pa-490-nonconviction-set--official-pdf-fill/fixtures/certificate-of-service-canonical.pdf` — `2fa87df1916ae4d9feb88a3fecb9a60d82d99ec7eadccf7cec7af9b55ddd4b17` · 1 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/pa/pa-490-nonconviction-set--official-pdf-fill/fixtures/rule-490-order-canonical.pdf` — `3d4cc7861b3aed7517d4f2a50adba4b4dbac95d9f644d682f58d07897d1e1a25` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/pa/pa-490-nonconviction-set--official-pdf-fill/fixtures/rule-490-petition-canonical.pdf` — `c2d6a4b36adb93a94a5fd495b231f448a31bffec726cf93a41646cc20799643c` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/pa/pa-490-nonconviction-set--official-pdf-fill/fixtures/certificate-of-service-boundary.pdf` — `cb9ce703674ca360c2bb6f95ff3f3f5b31de1260b752268f3b0c17a7200e80e2` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/pa/pa-490-nonconviction-set--official-pdf-fill/fixtures/rule-490-order-boundary.pdf` — `aa5520a16b9dcf7258bfe9a97a58cf6b11300a05eb1be59fecd224eb7f86adee` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/pa/pa-490-nonconviction-set--official-pdf-fill/fixtures/rule-490-petition-boundary.pdf` — `c2fbfa66a1705b32baafa2b23da9356f2a4ef7851440e6672ae77ad343b774aa` · 1 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/pa/pa-490-nonconviction-set--official-pdf-fill/fixtures/rule-490-petition-canonical.pdf` and `data/rcap-all50/overlays/census-v1/pa/pa-490-nonconviction-set--official-pdf-fill/fixtures/rule-490-petition-boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 8 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### pa_summary_conviction-set

- **6 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/pa/pa-summary-conviction-set--official-pdf-fill/fixtures/rule-490-order-canonical.pdf` — `a7b5f3714155b59e9a0ede4925823fedf0efaa43e1d70783d1b5b2190c07a6dd` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/pa/pa-summary-conviction-set--official-pdf-fill/fixtures/rule-490-petition-canonical.pdf` — `1048b6276acfea471f1aee7839c4a638124c5ac10627c1e335ef7cecbf2074e0` · 1 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/pa/pa-summary-conviction-set--official-pdf-fill/fixtures/rule-790-petition-canonical.pdf` — `fbdd5610da403add33e1d65db44f7d2fea1bec6c8d758f53dfd7223ecb048594` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/pa/pa-summary-conviction-set--official-pdf-fill/fixtures/rule-490-order-boundary.pdf` — `568b9cdaff62ec1c7c646fb8edfe0958c582a9114cc11d4c864b11243e6c488f` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/pa/pa-summary-conviction-set--official-pdf-fill/fixtures/rule-490-petition-boundary.pdf` — `c15e8eb4bd78c65b2fac2bc130659cba2a19921fe81c449b7f64654bebeea808` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/pa/pa-summary-conviction-set--official-pdf-fill/fixtures/rule-790-petition-boundary.pdf` — `20eb93f44c0adbfdd63091caf129099346f0f75cd96b84818dd18b083ba3c253` · 1 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/pa/pa-summary-conviction-set--official-pdf-fill/fixtures/rule-490-petition-canonical.pdf` and `data/rcap-all50/overlays/census-v1/pa/pa-summary-conviction-set--official-pdf-fill/fixtures/rule-490-petition-boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 8 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### rcap-ms-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/ms/rcap-ms-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `fc9ad883f98d6203f58ab96aa66376e77241ae12197535ce8415a46bb7647d2c`
- boundary `data/rcap-all50/overlays/census-v1/ms/rcap-ms-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `28ee12ccd0e86322e355df6bd6b066dc0ffa58e8f155afcdfbf69f65c89470d4`
- expected pages 25 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-ok-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/ok/rcap-ok-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `cf302fc33576f54acc1429516974642daefff7b0f854347498f81bb02344cb25`
- boundary `data/rcap-all50/overlays/census-v1/ok/rcap-ok-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `c7340a2555e44e011df445066cb91bee6be961959b74e97459a52c2613f068cf`
- expected pages 80 · requested scale 2.5
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

### ut_pet_acquittal-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-acquittal-set--official-pdf-fill/fixtures/canonical.pdf` — `b66141455c34b548b8ce48bd3c94d73298b588f8cef604a757d154362971c6a5`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-acquittal-set--official-pdf-fill/fixtures/boundary.pdf` — `9a3c27215e66dedbfac637d63417a8459f5600e534aee825f940900aef6f02d4`
- expected pages 19 · requested scale 2.5
- built by (no builder lane recorded)

### ut_pet_limitations-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-limitations-set--official-pdf-fill/fixtures/canonical.pdf` — `c949b633fc0f4a1e3f93eea1f61ba23274a45e3a95200741ef8be40b2920dac9`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-limitations-set--official-pdf-fill/fixtures/boundary.pdf` — `d609fb3de01fb5e5b736e1d63753088bee559767f1dabf9f5aa8127a6c4f8909`
- expected pages 19 · requested scale 2.5
- built by (no builder lane recorded)

### va_exp_absolute_pardon-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-exp-absolute-pardon-set--custom-pleading/fixtures/canonical.pdf` — `b56af08c1b796b78a26ebac56a3580299e5e06022976941ba0b7fd68cf810188`
- boundary `data/rcap-all50/overlays/census-v1/va/va-exp-absolute-pardon-set--custom-pleading/fixtures/boundary.pdf` — `f7691bc33addbaef446ccccb09c551e673bd5369410c363044794a429fea29eb`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### va_seal_enumerated_seven_year-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-seal-enumerated-seven-year-set--official-pdf-fill/fixtures/canonical.pdf` — `3527d8b4f621e798537b4c276da302e6cd78e2c8903fbdd87c30f81c44571615`
- boundary `data/rcap-all50/overlays/census-v1/va/va-seal-enumerated-seven-year-set--official-pdf-fill/fixtures/boundary.pdf` — `44ee4594b5fed61454390047a269af54c10d046da39305c979511709ae9b6e37`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### vt_exp_deferred_sentence-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-exp-deferred-sentence-set--custom-pleading/fixtures/canonical.pdf` — `b4e5975feb1e5727502cf876d0265157e65b94b56769a3cf5a1ae9abd284f96d`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-exp-deferred-sentence-set--custom-pleading/fixtures/boundary.pdf` — `f8c1e0b0e58e3fd7f39f821ddf5dc7427c9f4b56202f881b97fae5a0f1b01f04`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### vt_seal_misdemeanor-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-misdemeanor-set--official-pdf-fill/fixtures/canonical.pdf` — `81dd74a0ee1d178cefcb0f028dfba3e9bc7dbd7687bcf58193b0b9d62d767dee`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-misdemeanor-set--official-pdf-fill/fixtures/boundary.pdf` — `7ff3cc2272008865eba1d723e1d8dc4074b8163c7c6dbca82cf665003e32750e`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### wa_crop_certificate_of_restoration-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-crop-certificate-of-restoration-set--custom-pleading/fixtures/canonical.pdf` — `44d858039dfd15ea013f3d3d431cc74d277d3b8a59d2a12f7edde490808678c9`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-crop-certificate-of-restoration-set--custom-pleading/fixtures/boundary.pdf` — `9eecfba4d9b8ba5d5ed0feba913e46ffd18a98f708038616a624701130ab8288`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_homicide_victim_prostitution-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` — `846360e75578ce6233dba77b03b25545a529b50cd553ad31f88d3008b429a6ad` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill/fixtures/crrlj-09-0200-canonical-filled.pdf` — `3abc2475b78da8cff2445a99a78fa7aa18641d4c27f17d0c5eea3d6f07e40ce7` · 6 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` — `75fac347051d6b710015ef5bbcc10b43df0a1de59078195ede75a744f4c42b77` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill/fixtures/crrlj-09-0200-boundary-filled.pdf` — `4d844aece78a8ae1c1e97407edd305f45dbdaa2c509f8e55ef51fef03bcb3a55` · 6 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 22 across all documents · requested scale 2.5
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

### wi_nc_doj_fingerprint_removal-set

- canonical `data/rcap-all50/overlays/census-v1/wi/wi-nc-doj-fingerprint-removal-set--official-pdf-fill/fixtures/canonical.pdf` — `5b475b11c17c35f8edc37bada78716e8b14471b1951966604b7a678412fc6cc6`
- boundary `data/rcap-all50/overlays/census-v1/wi/wi-nc-doj-fingerprint-removal-set--official-pdf-fill/fixtures/boundary.pdf` — `3fd596ff112fd2f6ef55ca9a14c2fe0702eb107af9f715554b45503e3d7861f3`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### wv_dui_deferral_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/wv/wv-dui-deferral-expungement-set--custom-pleading/fixtures/canonical.pdf` — `d3fd553816fc4666a47cd1e3a8ff49f0d867c2a9884cd978bb5c27326b81793e`
- boundary `data/rcap-all50/overlays/census-v1/wv/wv-dui-deferral-expungement-set--custom-pleading/fixtures/boundary.pdf` — `776a7006a0a441823981cfb65ec01c79843aff271e59e365d372827f3c9ff782`
- expected pages 11 · requested scale 2.5
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
FAMILIES ASSIGNED: 68
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
