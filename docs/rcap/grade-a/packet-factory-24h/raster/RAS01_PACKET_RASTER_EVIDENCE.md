# RAS01

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `8d6ebafee152296fd76865585555af1c12bd8b88`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (79)

### agency-application-treatment:obligation:research-decision-route:AL:al-uncharged-arrest:agency_record_challenge

- canonical `data/rcap-all50/overlays/census-v1/al/agency-application-treatment:obligation:research-decision-route:al:al-uncharged-arrest:agency-record-challenge--official-pdf-fill/fixtures/canonical.pdf` — `95fed142e8fab838496cc9bf531e2268a4d45c9e3c375f8dab1e70a7ec1303c5`
- boundary `data/rcap-all50/overlays/census-v1/al/agency-application-treatment:obligation:research-decision-route:al:al-uncharged-arrest:agency-record-challenge--official-pdf-fill/fixtures/boundary.pdf` — `c9a3b9b16e77d75105628785ea19e9168e3d0a2318a43efd8a253e4450e39ea7`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### agency-application-treatment:obligation:track-only:CT:ct-destruction-request

- canonical `data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-only:ct:ct-destruction-request--official-pdf-fill/fixtures/canonical.pdf` — `f4202551dba55116bcd9ead310b38700909ce453290aeca5d334a68b969b482c`
- boundary `data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-only:ct:ct-destruction-request--official-pdf-fill/fixtures/boundary.pdf` — `682aeb934e38e4bc5280da02cfcda775b2e88ac0d52db03bf33a9bb978dda28b`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### ak-courtview-set

- canonical `data/rcap-all50/overlays/census-v1/ak/ak-courtview-set--official-pdf-fill/fixtures/tf810-canonical-filled.pdf` — `ac2111fa8215881775b35f198d5098aab766703ad55cf24a74a1e5aba843df83`
- boundary `data/rcap-all50/overlays/census-v1/ak/ak-courtview-set--official-pdf-fill/fixtures/tf810-boundary-filled.pdf` — `03b335a1c82762e2e3a98a9fe0e2d5dc8bd74896ade06b5c88100cd9afdd0e1e`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### al-diversion-set

- canonical `data/rcap-all50/overlays/census-v1/al/al-diversion-set--official-pdf-fill/fixtures/canonical.pdf` — `6af87d8d5e0135bfda243977b9c8988d966ed5a2146a316dfcf7cfa4a8fe9772`
- boundary `data/rcap-all50/overlays/census-v1/al/al-diversion-set--official-pdf-fill/fixtures/boundary.pdf` — `3efe0cf5550cffcdd41100c5ff6beed33a46924af2680ef27122512cf28a2cbf`
- expected pages 11 · requested scale 2.5
- built by (no builder lane recorded)

### al-misd-dwop-set

- canonical `data/rcap-all50/overlays/census-v1/al/al-misd-dwop-set--official-pdf-fill/fixtures/canonical.pdf` — `9e1b87e29e468d436a9e15866fa1c5fdae9e1c3356e4801e06bfeb00e8c48e7b`
- boundary `data/rcap-all50/overlays/census-v1/al/al-misd-dwop-set--official-pdf-fill/fixtures/boundary.pdf` — `977f25c0ca80b4960b5887d35d59d1599f8c655e2a65549615fe6028368b974a`
- expected pages 11 · requested scale 2.5
- built by (no builder lane recorded)

### al-trafficking-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/al/al-trafficking-set--custom-pleading/fixtures/canonical--felony.pdf` — `00d7b59fe3fcfd0fb1e6569bbcbc89f7f85f2689d4e013483b74033118ba58d7` · 11 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/al/al-trafficking-set--custom-pleading/fixtures/canonical--misdemeanor.pdf` — `55424a42f6edf456e2b3039837716760f0072d5d9e889c918ec01a08bfea1cf9` · 11 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/al/al-trafficking-set--custom-pleading/fixtures/boundary--felony.pdf` — `34ce702982b5882c50b024e027b5c60d045406ba7588e77fd155cf461b7e1d5e` · 11 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/al/al-trafficking-set--custom-pleading/fixtures/boundary--misdemeanor.pdf` — `13b79d33cc416e6009518cc438fe59ffbf2db14e1302f841c07a85859fde4192` · 11 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/al/al-trafficking-set--custom-pleading/fixtures/canonical--misdemeanor.pdf` and `data/rcap-all50/overlays/census-v1/al/al-trafficking-set--custom-pleading/fixtures/boundary--misdemeanor.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 44 across all documents · requested scale 2.5
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

### ar-misdemeanor-seal-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-misdemeanor-seal-set--official-pdf-fill/fixtures/order-canonical-filled.pdf` — `1dcb3519e63f783957254b9a45b55ab0bbbf693857b9947b95286adfaa824a17` · 3 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-misdemeanor-seal-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `e1063b2d1846c5372847ecacc7c597943d64f75abefc51dee647c4f9f5b01b41` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-misdemeanor-seal-set--official-pdf-fill/fixtures/order-boundary-filled.pdf` — `5e663e1986dcdba4fe888b51d3fc48b4a3a15ff6bc354db70221cf94e40e756b` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-misdemeanor-seal-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `ccfad986cb615a9679a5edabd15a55faba8118fdf3809926e3c95bf3b9313d23` · 5 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ar/ar-misdemeanor-seal-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/ar/ar-misdemeanor-seal-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 16 across all documents · requested scale 2.5
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

### co_motion_seal_nonconviction-set

- canonical `data/rcap-all50/overlays/census-v1/co/co-motion-seal-nonconviction-set--official-pdf-fill/fixtures/canonical.pdf` — `cbd731d4c78fac6cf5c01d2fb06774faf317bcff04cef4bb1e9c29bdbeedae02`
- boundary `data/rcap-all50/overlays/census-v1/co/co-motion-seal-nonconviction-set--official-pdf-fill/fixtures/boundary.pdf` — `7f6c83e22ae24418a09334e03db673aa474bde9442ff0992055a7886dc147496`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### co_petition_seal_arrest-set

- canonical `data/rcap-all50/overlays/census-v1/co/co-petition-seal-arrest-set--official-pdf-fill/fixtures/canonical.pdf` — `f15bde74dc5856e0f32dd5fc9dcbf0425c1c88c7a5140e58d50a8260bbb667b5`
- boundary `data/rcap-all50/overlays/census-v1/co/co-petition-seal-arrest-set--official-pdf-fill/fixtures/boundary.pdf` — `0183e844214ba22db3d13a72475d81c809d2a50e03f3653a2b0ea1d52541db50`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1017a_automatic_failure_correction

- canonical `data/rcap-all50/overlays/census-v1/de/composed-treatment:obligation:runtime-contract-cohort:de:juvenile-expungement-under-10-del-c-1017-1019-1017a:section-1017a-automatic-failure-correction--custom-pleading/fixtures/canonical.pdf` — `0e9809a8fba28867f03cada0daae2c2c882ff57f7a55f0a75c9151021a99b60e`
- boundary `data/rcap-all50/overlays/census-v1/de/composed-treatment:obligation:runtime-contract-cohort:de:juvenile-expungement-under-10-del-c-1017-1019-1017a:section-1017a-automatic-failure-correction--custom-pleading/fixtures/boundary.pdf` — `fd9884acbebe2e257e9e6b708c051f208490d4ad86468f73c3bac2339d132ac8`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:IL:criminal-identity-theft-mistaken-identity-relief

- canonical `data/rcap-all50/overlays/census-v1/il/composed-treatment:obligation:runtime-only:il:criminal-identity-theft-mistaken-identity-relief--custom-pleading/fixtures/canonical.pdf` — `433dc445780603b752a544532ca2965688aaeeba114482927f4d103ace1d49f3`
- boundary `data/rcap-all50/overlays/census-v1/il/composed-treatment:obligation:runtime-only:il:criminal-identity-theft-mistaken-identity-relief--custom-pleading/fixtures/boundary.pdf` — `09e11b80f75be41889ab70d9057b8d34de844e71c3c13f9715cd75e9084c313e`
- expected pages 3 · requested scale 2.5
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

### de_discretionary_superior_court-set

- canonical `data/rcap-all50/overlays/census-v1/de/de-discretionary-superior-court-set--official-pdf-fill/fixtures/canonical.pdf` — `05033793dcf746e364ff4fdd67506e60778752ce52f647cdd68fe8387882af06`
- boundary `data/rcap-all50/overlays/census-v1/de/de-discretionary-superior-court-set--official-pdf-fill/fixtures/boundary.pdf` — `254189a3489271b2b72cb9f9448ef0e0b01feb6bdadd072c5c1b12bcd94ab17d`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### fl-administrative-set

- canonical `data/rcap-all50/overlays/census-v1/fl/fl-administrative-set--official-pdf-fill/fixtures/canonical.pdf` — `232aa2581086d5c9cf371fc439ee15883ca63829522bc2d6101b12f2a494f6e0`
- boundary `data/rcap-all50/overlays/census-v1/fl/fl-administrative-set--official-pdf-fill/fixtures/boundary.pdf` — `c09404577e4eff32ea6aab244b479c15307bb7ec6917144c68aa78948cafc09e`
- expected pages 2 · requested scale 2.5
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

### ia-12347-set

- canonical `data/rcap-all50/overlays/census-v1/ia/ia-12347-set--official-pdf-fill/fixtures/canonical.pdf` — `830d67c3d423b615ed01efbc9c32cdb6a5ca0f89917fc8c13201070bb5fa9b91`
- boundary `data/rcap-all50/overlays/census-v1/ia/ia-12347-set--official-pdf-fill/fixtures/boundary.pdf` — `a8685beb36fe2ed04c07663d20e3c62512f3b3642665555f2e663536233c3e9c`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### id_clean_slate_shield-set

- canonical `data/rcap-all50/overlays/census-v1/id/id-clean-slate-shield-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `fd888d5f7773d9a2c645dc38fc594d2c95f43e263ba9f35ca81b17ad8f24aa80`
- boundary `data/rcap-all50/overlays/census-v1/id/id-clean-slate-shield-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `ccfdf3fb1bf9e0ba3cd5b0e31bc44b7dd2ddd71da9b7984fb17e8d0ffa8afedf`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### il-cannabis-vacate-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-cannabis-vacate-set--official-pdf-fill/fixtures/canonical.pdf` — `130ccba7073cedaec918191053c2d7340da973e952ebff0cd482585197598fab`
- boundary `data/rcap-all50/overlays/census-v1/il/il-cannabis-vacate-set--official-pdf-fill/fixtures/boundary.pdf` — `8d0f9ac0877f52d86975d152f9c6587e82194644edc65190de1e55317d31a946`
- expected pages 11 · requested scale 2.5
- built by (no builder lane recorded)

### il-exp-qualprob-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-exp-qualprob-set--official-pdf-fill/fixtures/canonical.pdf` — `fb7c7dbd4bb01d187fadd69e6857a57be57d840d44049a23ecc9692a54927008`
- boundary `data/rcap-all50/overlays/census-v1/il/il-exp-qualprob-set--official-pdf-fill/fixtures/boundary.pdf` — `e8f82821fe6368795fe7f6cafcf774b1a10014661a5b1228284b05c3fa0139ec`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### il-seal-3yr-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-seal-3yr-set--official-pdf-fill/fixtures/canonical.pdf` — `a41c124a35be3eedc5442be0a9fdb900c3f36a026416ac4ca7675f8a36bfb433`
- boundary `data/rcap-all50/overlays/census-v1/il/il-seal-3yr-set--official-pdf-fill/fixtures/boundary.pdf` — `c8ca89313c78de63db38d91eaa00164e034e6a319070dbf591d38a537c01e9fb`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### in_conviction_d6-set

- canonical `data/rcap-all50/overlays/census-v1/in/in-conviction-d6-set--custom-pleading/fixtures/canonical.pdf` — `9fc3c5e61d934f5be61ecbdf47e7e4a2dde73aa25b02cf831970d2110127bf75`
- boundary `data/rcap-all50/overlays/census-v1/in/in-conviction-d6-set--custom-pleading/fixtures/boundary.pdf` — `cdaf07e256d6fd0c0665877ccffd90eb9d92591bb2c36711dee935a55a7d7939`
- expected pages 10 · requested scale 2.5
- built by (no builder lane recorded)

### in_section1_petition-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/in/in-section1-petition-set--official-pdf-fill/fixtures/inserts-canonical-filled.pdf` — `173ef045668f2c0cd23db61f7e5541649cb992584db0ba0c6b74f100ab0a760b` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/in/in-section1-petition-set--official-pdf-fill/fixtures/packet-canonical-filled.pdf` — `aa068fe4f207ed436f00cd5f48249f03a40c029511b172f9f9bd98788c17548d` · 15 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/in/in-section1-petition-set--official-pdf-fill/fixtures/inserts-boundary-filled.pdf` — `647da714faab917acc8bc5ad108703a13481809fba4b1a0a2ae6798c7d1b00bc` · 12 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/in/in-section1-petition-set--official-pdf-fill/fixtures/packet-boundary-filled.pdf` — `1868a512b603aceac5ba3536b34a1162b3fb42d522140afaef1a4f53f15360d7` · 15 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/in/in-section1-petition-set--official-pdf-fill/fixtures/packet-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/in/in-section1-petition-set--official-pdf-fill/fixtures/packet-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 46 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### ks-21-6614-specialty-court-set

- canonical `data/rcap-all50/overlays/census-v1/ks/ks-21-6614-specialty-court-set--official-pdf-fill/fixtures/canonical.pdf` — `8f060388b2fa7efdd7ab062bb30b3055da0af631e91e47d815135c53d62d8de2`
- boundary `data/rcap-all50/overlays/census-v1/ks/ks-21-6614-specialty-court-set--official-pdf-fill/fixtures/boundary.pdf` — `4d028f3ac6df1166b82d4f7c747b3fa97cc62b41e5d8ae73e6f20948c262f955`
- expected pages 20 · requested scale 2.5
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

### nh_marijuana_annulment-set

- canonical `data/rcap-all50/overlays/census-v1/nh/nh-marijuana-annulment-set--official-pdf-fill/fixtures/canonical.pdf` — `23390b7f9cc6013681dfe40910233737a0410c2bb11454f6c551b4fd1abbbed8`
- boundary `data/rcap-all50/overlays/census-v1/nh/nh-marijuana-annulment-set--official-pdf-fill/fixtures/boundary.pdf` — `661ff0044bc4442c7c760fb39b4f5b6c83415b7dd42fc9f61dddcc8d00fd3f1e`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### nj_clean_slate-set

- canonical `data/rcap-all50/overlays/census-v1/nj/nj-clean-slate-set--official-pdf-fill/fixtures/cn-10557-canonical.pdf` — `03f6169d042fc1d5ed30df008dfc966ef3d03b382731f5956d0e8786ca8a234f`
- boundary `data/rcap-all50/overlays/census-v1/nj/nj-clean-slate-set--official-pdf-fill/fixtures/cn-10557-boundary.pdf` — `23a571af72985717963001120ba60116ae43054aaa1c2fddbeece944dac24494`
- expected pages 43 · requested scale 2.5
- built by (no builder lane recorded)

### nm_conviction-set

- canonical `data/rcap-all50/overlays/census-v1/nm/nm-conviction-set--official-pdf-fill/fixtures/canonical.pdf` — `b943cf5b16d95882e1a096504438d792fdbdddcc82acab09e58076421978658a`
- boundary `data/rcap-all50/overlays/census-v1/nm/nm-conviction-set--official-pdf-fill/fixtures/boundary.pdf` — `4d1b288fd4cd9f5857f7603554a82f3b030345c013ad559c9afc328eae8e577f`
- expected pages 24 · requested scale 2.5
- built by (no builder lane recorded)

### nv_seal_probation_family-set

- canonical `data/rcap-all50/overlays/census-v1/nv/nv-seal-probation-family-set--custom-pleading/fixtures/canonical.pdf` — `3b02d62f748c5f3ec5150742f3e225d0418ca4ddb7203ef5bc7fce9552b2de9a`
- boundary `data/rcap-all50/overlays/census-v1/nv/nv-seal-probation-family-set--custom-pleading/fixtures/boundary.pdf` — `6530f51d5855d955aacc8c1bfbff5094756d7f271e920b846a1ed2676c805dd2`
- expected pages 9 · requested scale 2.5
- built by (no builder lane recorded)

### official-form-treatment:obligation:research-decision-route:CA:ca-1203-4b

- **10 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ca/official-form-treatment:obligation:research-decision-route:ca:ca-1203-4b--official-pdf-fill/fixtures/pc-1203-4b-hand-crew-or-firehouse-canonical/cr-106-filled.pdf` — `d9f6d3072273760b8350dc16e57db447ff47b041b3ce89dc6dc398708bfc371e` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/official-form-treatment:obligation:research-decision-route:ca:ca-1203-4b--official-pdf-fill/fixtures/pc-1203-4b-hand-crew-or-firehouse-canonical/cr-430-filled.pdf` — `85c2ff9a1483afd69d70ad1fff68eab8e10dc189444a0a7d53462cda21c42ecc` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/official-form-treatment:obligation:research-decision-route:ca:ca-1203-4b--official-pdf-fill/fixtures/pc-1203-4b-hand-crew-or-firehouse-canonical/cr-430-info-unchanged-official.pdf` — `6bee01e04b1f8ceb05776e07b90b92a4e9048777c41c78760e381348d4d287c0` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/official-form-treatment:obligation:research-decision-route:ca:ca-1203-4b--official-pdf-fill/fixtures/pc-1203-4b-hand-crew-or-firehouse-canonical/cr-431-filled.pdf` — `4f971a62c36187df6ee4333774d4d988fd25bdef436b4f32afebe4452c236b17` · 1 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/official-form-treatment:obligation:research-decision-route:ca:ca-1203-4b--official-pdf-fill/fixtures/pc-1203-4b-hand-crew-or-firehouse-canonical/cr-432-filled.pdf` — `cc447d279e80b44fb742c68bc1d984a5030ffcbf37ff3fb58778ac49e1c53c6d` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/official-form-treatment:obligation:research-decision-route:ca:ca-1203-4b--official-pdf-fill/fixtures/pc-1203-4b-hand-crew-or-firehouse-boundary/cr-106-filled.pdf` — `26b899db93e199310f97cf3f937dec52e8c2fff15647a46e6e682600d1071997` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/official-form-treatment:obligation:research-decision-route:ca:ca-1203-4b--official-pdf-fill/fixtures/pc-1203-4b-hand-crew-or-firehouse-boundary/cr-430-filled.pdf` — `271d3950b1d452b5ff4b9ee1e1cfc2388c0054cc9dcc706abc9bcb3c9d21a0c3` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/official-form-treatment:obligation:research-decision-route:ca:ca-1203-4b--official-pdf-fill/fixtures/pc-1203-4b-hand-crew-or-firehouse-boundary/cr-430-info-unchanged-official.pdf` — `6bee01e04b1f8ceb05776e07b90b92a4e9048777c41c78760e381348d4d287c0` · 4 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/official-form-treatment:obligation:research-decision-route:ca:ca-1203-4b--official-pdf-fill/fixtures/pc-1203-4b-hand-crew-or-firehouse-boundary/cr-431-filled.pdf` — `f2ec42a0ca5f234823ef9c0d316427c30cc3e611952db605d692acb16eb5f2d6` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/official-form-treatment:obligation:research-decision-route:ca:ca-1203-4b--official-pdf-fill/fixtures/pc-1203-4b-hand-crew-or-firehouse-boundary/cr-432-filled.pdf` — `588d7528c31919915f1f323383f0f5ca9e03c710da5a03657167fbe8c9b831c4` · 2 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ca/official-form-treatment:obligation:research-decision-route:ca:ca-1203-4b--official-pdf-fill/fixtures/pc-1203-4b-hand-crew-or-firehouse-canonical/cr-430-filled.pdf` and `data/rcap-all50/overlays/census-v1/ca/official-form-treatment:obligation:research-decision-route:ca:ca-1203-4b--official-pdf-fill/fixtures/pc-1203-4b-hand-crew-or-firehouse-boundary/cr-430-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 22 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### pa_6308_underage-set

- **6 documents**, and the receipt must cover every one of them:
  - canonical-PA-RCRIM-P-490-PETITION `data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/rule-490-petition-canonical.pdf` — `0bc45b2c0ac23fac1d5f64fbb340cf29cb93af01e29da5d6e1f0923121469a5d` · 1 page(s)
  - canonical-PA-RCRIM-P-490-ORDER `data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/rule-490-order-canonical.pdf` — `39625c0e8b743019c6c080e33f5cff5485bd3559ab64b7d8ab896660b381aae6` · 2 page(s)
  - boundary-PA-RCRIM-P-790-PETITION `data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/rule-790-petition-boundary.pdf` — `a88f0a3cbab962faf0cd06e1a916d8ebf40b34fdfe43041574979b64b0134cb9` · 1 page(s)
  - boundary-PA-RCRIM-P-790-ORDER `data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/rule-790-order-boundary.pdf` — `5dcb402f6af5df9930d7283e62d15407f9734862b46063674f0c4c65302ef957` · 2 page(s)
  - canonical-pa_6308_underage-certificate-of-service-3 `data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/certificate-of-service-canonical.pdf` — `25ef4ba175037ab521617567dd1a1bd7293e96f1a4ee47fd25604f6d999bbfad` · 1 page(s)
  - boundary-pa_6308_underage-certificate-of-service-3 `data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/certificate-of-service-boundary.pdf` — `256d896fba6bf63c61838c7a736d4eeb8c3a62c074df559dd98ddf671c2692f8` · 1 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/rule-490-petition-canonical.pdf` and `data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/rule-790-petition-boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 8 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### pa_pardon_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/pa/pa-pardon-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `772b55cb8d62821f1349e42b0242ad7edbca88a666a04cbe6473ab410cf5f69a`
- boundary `data/rcap-all50/overlays/census-v1/pa/pa-pardon-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `614c6faeb0988b74333bfaae744b4c0c82388187800c7f16f6fb4a462a82a23b`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-in-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/in/rcap-in-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `d8423b0d608e3fd0f26457073b2622eb2fc62bec95cc6264e07f09593138748e`
- boundary `data/rcap-all50/overlays/census-v1/in/rcap-in-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `e953492c5bab14c786b503a9a5fd8e594640f6f7b01b567a559fcb45b2b9761b`
- expected pages 15 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-nv-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/nv/rcap-nv-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `1d72131dcf8adefe7142cb2241aa97811b4c90892342d1422d3441b649e293bf`
- boundary `data/rcap-all50/overlays/census-v1/nv/rcap-nv-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `5274a3d33329f447612a9736ac31442a760dc24b4aa2acdc01d7061175578596`
- expected pages 44 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-sc-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/sc/rcap-sc-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `be6c8dd75e58feaff3d5049c3c4986b99fd39286bfd150855f2cd54eb9551f9b`
- boundary `data/rcap-all50/overlays/census-v1/sc/rcap-sc-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `b808c99ade96a876097f1086585818b63824cd79b20f0407cc8169fe6ce1f6a5`
- expected pages 64 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-wi-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/wi/rcap-wi-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `fa75790c3ef35af41d142cade19bf6def68149e3767e9b14eb73b1bd45414dc9`
- boundary `data/rcap-all50/overlays/census-v1/wi/rcap-wi-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `84297a24847a4a9555b92a8ac138d101fffd03331e71be7229efb72e50f1b5d8`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### ri_first_offender_felony-set

- canonical `data/rcap-all50/overlays/census-v1/ri/ri-first-offender-felony-set--official-pdf-fill/fixtures/canonical.pdf` — `367459ad94553cb6a924ac739362d6605ea56ca3667755d53b4a3daa8c098048`
- boundary `data/rcap-all50/overlays/census-v1/ri/ri-first-offender-felony-set--official-pdf-fill/fixtures/boundary.pdf` — `31e5ed43099b7885ef89ab629de296330f69448d049abd7dc10badb265bfac3e`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### ri_nonconviction_sealing-set

- canonical `data/rcap-all50/overlays/census-v1/ri/ri-nonconviction-sealing-set--official-pdf-fill/fixtures/dc-33-canonical.pdf` — `1aa3581fc9297cc60ad555e6abad34d5c8f5c8028be255abf1ec4cfc96734c3b`
- boundary `data/rcap-all50/overlays/census-v1/ri/ri-nonconviction-sealing-set--official-pdf-fill/fixtures/dc-33-boundary.pdf` — `9853b49eeb385ac8719132831e5dc245c985249fb82e86ff72bf1671a15d7594`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### tx_nd_automatic_misdemeanor_deferred-set

- canonical `data/rcap-all50/overlays/census-v1/tx/tx-nd-automatic-misdemeanor-deferred-set--official-pdf-fill/fixtures/canonical.pdf` — `d4336f778833e40df39570f5b2bb5b4b9979d9db87470b193e6e8de3dba30e5b`
- boundary `data/rcap-all50/overlays/census-v1/tx/tx-nd-automatic-misdemeanor-deferred-set--official-pdf-fill/fixtures/boundary.pdf` — `3d645fdf1509d80ff7bf6d988a8ae95165c5ffbc1a005a3b91871202d98fe41d`
- expected pages 22 · requested scale 2.5
- built by (no builder lane recorded)

### tx_nd_dwi_probation-set

- canonical `data/rcap-all50/overlays/census-v1/tx/tx-nd-dwi-probation-set--official-pdf-fill/fixtures/canonical.pdf` — `3250216674afdfb521a983a83d5ca573434d8126ad3b192ed27c37502a615574`
- boundary `data/rcap-all50/overlays/census-v1/tx/tx-nd-dwi-probation-set--official-pdf-fill/fixtures/boundary.pdf` — `4e96001018de68a0a2e02f12ed2e2ccf00b32c09b3a8e7d12374d9a269696fea`
- expected pages 24 · requested scale 2.5
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
FAMILIES ASSIGNED: 79
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
