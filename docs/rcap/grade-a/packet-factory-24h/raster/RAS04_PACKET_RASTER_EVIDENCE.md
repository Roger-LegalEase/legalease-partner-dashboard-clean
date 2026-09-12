# RAS04

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `2bbc77426760798df1f8762f0338d8ecd2c1888f`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (78)

### agency-application-treatment:obligation:runtime-only:NM:dna-sample-profile-expungement

- canonical `data/rcap-all50/overlays/census-v1/nm/agency-application-treatment:obligation:runtime-only:nm:dna-sample-profile-expungement--official-pdf-fill/fixtures/canonical.pdf` — `1bdc17120f9716b3304c52f5ce56e392291f8bb3e42597b4568524ea8eba429f`
- boundary `data/rcap-all50/overlays/census-v1/nm/agency-application-treatment:obligation:runtime-only:nm:dna-sample-profile-expungement--official-pdf-fill/fixtures/boundary.pdf` — `0c1e91e1b74a31f60a56b96547a402811369b2a01ee3c4fc0cf8f6c753caf651`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### agency-application-treatment:obligation:unattached-decision-route:AK:ak-correct-record

- canonical `data/rcap-all50/overlays/census-v1/ak/agency-application-treatment:obligation:unattached-decision-route:ak:ak-correct-record--official-pdf-fill/fixtures/canonical.pdf` — `298452333a1bc813ccb8924fbbb0bf977aba13c36eb26152350b8c977cd1e3e4`
- boundary `data/rcap-all50/overlays/census-v1/ak/agency-application-treatment:obligation:unattached-decision-route:ak:ak-correct-record--official-pdf-fill/fixtures/boundary.pdf` — `c709cc48b6019c276ca9cce7b66c5f20e737286d8947250b2b4fd0af5babb9ce`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### ak-tf805-set

- canonical `data/rcap-all50/overlays/census-v1/ak/ak-tf805-set--official-pdf-fill/fixtures/tf805-canonical-filled.pdf` — `4f0eccc0580904955bb0542c81ae835128804c87304df33875ad6c98b19a9213`
- boundary `data/rcap-all50/overlays/census-v1/ak/ak-tf805-set--official-pdf-fill/fixtures/tf805-boundary-filled.pdf` — `4e2f307af01f2f1331374240c7e528b9278e98c5811f0f9c93f8fcb8d4564e36`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### al-misd-conviction-set

- canonical `data/rcap-all50/overlays/census-v1/al/al-misd-conviction-set--official-pdf-fill/fixtures/canonical.pdf` — `1087cc68caa11cbcac3d54440fe27446cebf844069299f1e507e302d5c521e30`
- boundary `data/rcap-all50/overlays/census-v1/al/al-misd-conviction-set--official-pdf-fill/fixtures/boundary.pdf` — `f4fa94de90f5906d4a8d581b2d5dc251d2156070fb457d31b23859ba8ddbe62e`
- expected pages 11 · requested scale 2.5
- built by (no builder lane recorded)

### al-pardoned-felony-set

- canonical `data/rcap-all50/overlays/census-v1/al/al-pardoned-felony-set--official-pdf-fill/fixtures/canonical.pdf` — `8601a417905d050ef455cb6344da98462f86d5978ac93a8f5938436f64a82982`
- boundary `data/rcap-all50/overlays/census-v1/al/al-pardoned-felony-set--official-pdf-fill/fixtures/boundary.pdf` — `e557b7577b05d76a72f397a01c0e9dce5d1de191bc67023fc2551af6aa31300e`
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

### la-976-arrest-no-conviction-set

- canonical `data/rcap-all50/overlays/census-v1/la/la-976-arrest-no-conviction-set--official-pdf-fill/fixtures/canonical.pdf` — `43883382166f27e4f890f3af7af3a0540db8af30a58b1205754539919c5f523c`
- boundary `data/rcap-all50/overlays/census-v1/la/la-976-arrest-no-conviction-set--official-pdf-fill/fixtures/boundary.pdf` — `2ea20aec7732ef4e890efe1d686b6bb76ad83483621b232ef94ed87442657f49`
- expected pages 25 · requested scale 2.5
- built by (no builder lane recorded)

### la-985-1-interim-expungement-set

- canonical `data/rcap-all50/overlays/census-v1/la/la-985-1-interim-expungement-set--custom-pleading/fixtures/canonical.pdf` — `f0300841fa1df4f6447c1eb243b47650a689e82fa95faaae7ce3b49d33069f08`
- boundary `data/rcap-all50/overlays/census-v1/la/la-985-1-interim-expungement-set--custom-pleading/fixtures/boundary.pdf` — `5cefe25a1f6a384fdf485738c842ed08e95dc62adfb512de1d4f144be957fc1c`
- expected pages 19 · requested scale 2.5
- built by (no builder lane recorded)

### ma-expunge-k-set

- canonical `data/rcap-all50/overlays/census-v1/ma/ma-expunge-k-set--official-pdf-fill/fixtures/canonical.pdf` — `084ed28b9eb12587b3b78dd8afe61c15883d3daa9b43f60607e2d8a4fde564ea`
- boundary `data/rcap-all50/overlays/census-v1/ma/ma-expunge-k-set--official-pdf-fill/fixtures/boundary.pdf` — `6a6b0903e0255ccc05370dd14865465081a3ebb17a7f6dd223d3140ba619e832`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### ma-seal-court-set

- canonical `data/rcap-all50/overlays/census-v1/ma/ma-seal-court-set--official-pdf-fill/fixtures/canonical.pdf` — `afee77f5a337468a5f6997455b764ac6fd79d9d1d6251d8a596dd6f564b5cff1`
- boundary `data/rcap-all50/overlays/census-v1/ma/ma-seal-court-set--official-pdf-fill/fixtures/boundary.pdf` — `a02b59dd46e11a1b6d167b4cf04d35383eb74b6695038c491674d85d55907327`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### md_10110_conviction-set

- **25 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill/fixtures/canonical.pdf` — `5456086653a6f033d2708d534e89593d1065ed6b0e58950664cdcd8418d0b571` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill/fixtures/diagnostic/missing-completion.pdf` — `a11158d9f084dbfa0a44a98034892687566ecbf5043125eac2132072354acb4d` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill/fixtures/diagnostic/waiver-missing-financial.pdf` — `628f2eae5d856cb650db88cb7529db4c7f4186b8745f801f0db4752764f785b7` · 10 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill/fixtures/selectable/adult-transfer.pdf` — `cecfa14f61357c2a8bb9cadd9c0a97f9f552ab0e38a9c16d778b25b27f87ac48` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill/fixtures/selectable/assault_battery-paid.pdf` — `7751d0937b63b19d2889a215bb47490a29c1d1414e6dda35109ff4a32d5101ac` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill/fixtures/selectable/assault_battery-waiver.pdf` — `736df87366e1ed234a4d349b5eea67a467b3d571283d3935253dffb2b9b23cb4` · 9 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill/fixtures/selectable/burglary_theft-paid.pdf` — `c9eb9ded6e052fe4462c16071a124708e650e7aa8aa83950df60af96039a47e0` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill/fixtures/selectable/burglary_theft-waiver.pdf` — `37a502d6d4957c6d2a4e13f3b0929d7ff6b1aa534de95a7e9d545680e00bd197` · 9 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill/fixtures/selectable/circuit-appellate.pdf` — `5550c9d1819fd1d278e880611f767d22b238f488bf1ddfb7ef91653b2f2a0e92` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill/fixtures/selectable/citation.pdf` — `5cad97e427922241dd7a1970926788761402c446be8f4cd00fc07ccb66c62af7` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill/fixtures/selectable/domestic-paid.pdf` — `c5539768fb698953e781df6f07dc6df90712c5cc52cb7fcbde820c9d4debeba6` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill/fixtures/selectable/domestic-waiver.pdf` — `4413e0b1fde0cdbad66583a4e12ebcad9457225e85329945716f5a3c991c4808` · 9 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill/fixtures/selectable/felony-paid.pdf` — `36c7009c427bf1b7a00ed98259ba55ef74ca7db7e1e4212bf9216b7932ed366b` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill/fixtures/selectable/felony-waiver.pdf` — `90e59092b537d90e8917ac7718ff90340410afc706752ed4e2801c0585bbf5ef` · 9 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill/fixtures/selectable/misdemeanor-paid.pdf` — `5456086653a6f033d2708d534e89593d1065ed6b0e58950664cdcd8418d0b571` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill/fixtures/selectable/misdemeanor-waiver.pdf` — `3aaf79a491d4706077d1d4a411d18dbca9f6059eb5a3acdad08ccf38400cd2d6` · 9 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill/fixtures/selectable/no_longer_crime-paid.pdf` — `993480e5346ea1928a4b0229d6d9d8326e1af8747e2054483535c3df6f93850b` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill/fixtures/selectable/no_longer_crime-waiver.pdf` — `ecc4a7896fc7bb01fc76fd36cc05fedfbda35cb4f9e9b3ee0c2675674356cb12` · 9 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill/fixtures/selectable/nuisance-paid.pdf` — `e2595fe40a773adb90b2cb739a677441d8c13e3118529a21118b15b25fdf3ff7` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill/fixtures/selectable/nuisance-waiver.pdf` — `58749aa919cde32a295317dde88e7183a2d23ba5fc162259bb0b421a7b917d10` · 9 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill/fixtures/selectable/repealed_sexual-paid.pdf` — `282346f3622365b9a19e42debdfc32103f3005b8c296b60b7b63dc53c87f973b` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill/fixtures/selectable/repealed_sexual-waiver.pdf` — `e2638875226b4c949f8bc6e33a16f9758882a5fef3ff552dc0a5d2425b2e3c50` · 9 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill/fixtures/selectable/restitution-inability.pdf` — `81dd3b4432e84a4cf5821ed5e3cce1c48fda812beefe376844de611408859e3d` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill/fixtures/selectable/waiver-zero-explicit.pdf` — `db7ba14441f6172da5e56dde489acb161dfc1c63f670bfc180417e07e49da7c8` · 9 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill/fixtures/boundary.pdf` — `cda8eebad0799ed6924cb10846b1723a734f3929594eec0fc2d440c659f82297` · 9 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill/fixtures/canonical.pdf` and `data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill/fixtures/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 170 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### me-nonconv-set

- canonical `data/rcap-all50/overlays/census-v1/me/me-nonconv-set--custom-pleading/fixtures/canonical.pdf` — `d9ea11c3b618cf92863f653ef964f32bf893ef91a602269d1950cbda68c5b007`
- boundary `data/rcap-all50/overlays/census-v1/me/me-nonconv-set--custom-pleading/fixtures/boundary.pdf` — `4f7c2fad8a0c2a2dbd0681b5c48bea156401b82cd87746659cd8077b9df4d665`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### me-seal-survivor-set

- canonical `data/rcap-all50/overlays/census-v1/me/me-seal-survivor-set--official-pdf-fill/fixtures/canonical.pdf` — `55efeb2534e0b8ddb14514805fa299c0004970cb238d0e89c89b3f050635ceae`
- boundary `data/rcap-all50/overlays/census-v1/me/me-seal-survivor-set--official-pdf-fill/fixtures/boundary.pdf` — `220b2877b2232589fad019b48edcea55834c774ca8372889b9337dfc54e54747`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### mi_setaside_trafficking-set

- canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-trafficking-set--official-pdf-fill/fixtures/canonical.pdf` — `acb9bf49ab83059266162eb046e4e55be6f44d9f0647e7099325bedae31e28ee`
- boundary `data/rcap-all50/overlays/census-v1/mi/mi-setaside-trafficking-set--official-pdf-fill/fixtures/boundary.pdf` — `90bd30df3077f8dc819f4c227c7cc254d1773fc0db9fc51ecf42febe950b58a2`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### mn_prosecutor_agreed-set

- canonical `data/rcap-all50/overlays/census-v1/mn/mn-prosecutor-agreed-set--custom-pleading/fixtures/canonical.pdf` — `24994ff7f637bf66617c748c9096351e241af0c39ecfb0c39245dc363ec6464a`
- boundary `data/rcap-all50/overlays/census-v1/mn/mn-prosecutor-agreed-set--custom-pleading/fixtures/boundary.pdf` — `7144fd5bf4c61cac0159ddb9a519d4a0e53ae931f8c1dbb150c069b7d570820c`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### mo-art-xiv-marijuana-set

- canonical `data/rcap-all50/overlays/census-v1/mo/mo-art-xiv-marijuana-set--official-pdf-fill/fixtures/canonical.pdf` — `44ffa83102e981e65144007f272ae480c2d4251a23ca2c6b30144f7d28a12397`
- boundary `data/rcap-all50/overlays/census-v1/mo/mo-art-xiv-marijuana-set--official-pdf-fill/fixtures/boundary.pdf` — `9db6f9ab18a5a9a6468095e855d3aba65dfa651083ac60c45cc393e874e28dc3`
- expected pages 10 · requested scale 2.5
- built by (no builder lane recorded)

### ms-misd-addl-set

- canonical `data/rcap-all50/overlays/census-v1/ms/ms-misd-addl-set--custom-pleading/fixtures/canonical.pdf` — `3c7588be6f1734cab76c30035cb9eb404dc6e0d78eeb9e3971415ed2cedf1399`
- boundary `data/rcap-all50/overlays/census-v1/ms/ms-misd-addl-set--custom-pleading/fixtures/boundary.pdf` — `e2b8cebcb089a20777cfb31bcd5b70340729690bf5232894e7e8adf81fcada36`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### nc_145_5_misdemeanor-set

- canonical `data/rcap-all50/overlays/census-v1/nc/nc-145-5-misdemeanor-set--official-pdf-fill/fixtures/canonical.pdf` — `10d06d346fffa0b9c534922a1450880c6d26efdc15dc0b52035c081c72ebbdf9`
- boundary `data/rcap-all50/overlays/census-v1/nc/nc-145-5-misdemeanor-set--official-pdf-fill/fixtures/boundary.pdf` — `e31a578a70709a2c03426163ed724bc316a935551a338e4f2ceef7e1b3fd561a`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### nd-nonconviction-close-petition-set

- canonical `data/rcap-all50/overlays/census-v1/nd/nd-nonconviction-close-petition-set--official-pdf-fill/fixtures/packet-canonical-filled.pdf` — `63b92427c2e60f8c1132a0e80effcc1c17adac1958ca1bdb28c22658c102add6`
- boundary `data/rcap-all50/overlays/census-v1/nd/nd-nonconviction-close-petition-set--official-pdf-fill/fixtures/packet-boundary-filled.pdf` — `31cbf55ac9671f1440732987b2d41c3cad80bcb8c43474e4b09e328b922ee401`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### ne-seal-enforcement-set

- canonical `data/rcap-all50/overlays/census-v1/ne/ne-seal-enforcement-set--custom-pleading/fixtures/canonical.pdf` — `611825ac4bd05fb2a1332f7a5c575bbab767c40c605c9320237d511dfc8ef9f2`
- boundary `data/rcap-all50/overlays/census-v1/ne/ne-seal-enforcement-set--custom-pleading/fixtures/boundary.pdf` — `ffe65671c6035dede3a79b1c7a99e87640af699de99520a58eb33743cd8462a7`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### ne-setaside-noncustodial-set

- canonical `data/rcap-all50/overlays/census-v1/ne/ne-setaside-noncustodial-set--official-pdf-fill/fixtures/canonical.pdf` — `8b8b5cc8fbac51a5c6c010382f1a845c4f113f4607fbba7fc2d7780d3f4f894e`
- boundary `data/rcap-all50/overlays/census-v1/ne/ne-setaside-noncustodial-set--official-pdf-fill/fixtures/boundary.pdf` — `4fa284b1d8a65aa926c3426c87f5137bca1b9cae339344e6bb8c2e1dfc960ce7`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### nh_petition_nonconviction_pre2019-set

- canonical `data/rcap-all50/overlays/census-v1/nh/nh-petition-nonconviction-pre2019-set--official-pdf-fill/fixtures/canonical.pdf` — `adcd250e96f50e380bc9d15529130865be9d1a2c0336c139978c81acea70f0c6`
- boundary `data/rcap-all50/overlays/census-v1/nh/nh-petition-nonconviction-pre2019-set--official-pdf-fill/fixtures/boundary.pdf` — `b9cf9a1724750739ce93945ee01ed2939c97de2446dc95051c6628ef5f34af6f`
- expected pages 9 · requested scale 2.5
- built by (no builder lane recorded)

### nj_disorderly_persons-set

- canonical `data/rcap-all50/overlays/census-v1/nj/nj-disorderly-persons-set--official-pdf-fill/fixtures/cn-10557-canonical.pdf` — `d3442178a8f90381ba8c1badb2a6266c2cd1db3a3b1a650995bcdc09b31e72d0`
- boundary `data/rcap-all50/overlays/census-v1/nj/nj-disorderly-persons-set--official-pdf-fill/fixtures/cn-10557-boundary.pdf` — `2336f7dcb006e94b1b856bca4c133cf452c2646f2fbf5b96d13bd04ae31cf78e`
- expected pages 43 · requested scale 2.5
- built by (no builder lane recorded)

### nm_identity_theft-set

- canonical `data/rcap-all50/overlays/census-v1/nm/nm-identity-theft-set--official-pdf-fill/fixtures/canonical.pdf` — `a280669cf6f10b161e65c6ac4243b4d535b36c6677841c2c23fe03ad797621df`
- boundary `data/rcap-all50/overlays/census-v1/nm/nm-identity-theft-set--official-pdf-fill/fixtures/boundary.pdf` — `b58c170f4aa18c1abe259c5391b9ca156071b898879cdabcd6958b57a50d3b56`
- expected pages 15 · requested scale 2.5
- built by (no builder lane recorded)

### ny_160_59_petition-set

- **6 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ny/ny-160-59-petition-set--official-pdf-fill/fixtures/application-canonical.pdf` — `d5c8fbc835385d9eb2bbc6d45cc8886a89330f170fa4d4b5fcabcb49d8af7021` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ny/ny-160-59-petition-set--official-pdf-fill/fixtures/cod-request-canonical.pdf` — `316a241c14f6aac3b145bb87408d927c7161fc02d5d2c696e71b0f7fa3c5231a` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ny/ny-160-59-petition-set--official-pdf-fill/fixtures/pro-se-packet-canonical.pdf` — `f15d406fec2df9ebfa64db772c3c99f0c2101ae49bfa4be4293a25d50826b01f` · 12 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ny/ny-160-59-petition-set--official-pdf-fill/fixtures/application-boundary.pdf` — `cda7142cd49f0dd4ed89f32e29227d7d440981371678411f82b3bb3f3ff84b6d` · 6 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ny/ny-160-59-petition-set--official-pdf-fill/fixtures/cod-request-boundary.pdf` — `2b2c073033e0b20b3dd3448fd87a314f9d04dc533cfd99730e30a0ee6afba274` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ny/ny-160-59-petition-set--official-pdf-fill/fixtures/pro-se-packet-boundary.pdf` — `6b59f8b7c5b90e79c8a2684fda032f3b71efa275fa0ceaf965d85020b4fe63f4` · 12 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ny/ny-160-59-petition-set--official-pdf-fill/fixtures/application-canonical.pdf` and `data/rcap-all50/overlays/census-v1/ny/ny-160-59-petition-set--official-pdf-fill/fixtures/application-boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 40 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### oh_marijuana_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/oh/oh-marijuana-expungement-set--custom-pleading/tracks/oh_marijuana_expungement/rendered/canonical/canonical.pdf` — `0e8b4d917ea9e370164e47a445eb17e8dbaf2f4b8d3700164b28750b115d9409`
- boundary `data/rcap-all50/overlays/census-v1/oh/oh-marijuana-expungement-set--custom-pleading/tracks/oh_marijuana_expungement/rendered/boundary/boundary.pdf` — `7bb4156324366da3ab667862ad8e8afdee5939c6f25d37cea19820623f22ad76`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### pa_790_nonconviction-set

- **8 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/pa/pa-790-nonconviction-set--official-pdf-fill/fixtures/certificate-of-service-canonical.pdf` — `e2caf3829fb616babd002b862d6278c0ee0709ea73e1b406417049d20534a567` · 1 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/pa/pa-790-nonconviction-set--official-pdf-fill/fixtures/ifp-ccp-canonical.pdf` — `95a9b7a3dda88efbe07503fdc65b97f5687846dbd21cf84aef7b844429f5443b` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/pa/pa-790-nonconviction-set--official-pdf-fill/fixtures/rule-790-order-canonical.pdf` — `14fa38d851f55e56045dd3f9742a42ac6717b9fca43fb7a2dfc761a1b00c0ece` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/pa/pa-790-nonconviction-set--official-pdf-fill/fixtures/rule-790-petition-canonical.pdf` — `c297f8dd00174742a00693fdbba12d3e720261926dfd4bbc1e1b31c1922f2470` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/pa/pa-790-nonconviction-set--official-pdf-fill/fixtures/certificate-of-service-boundary.pdf` — `5ff081caa15623b828fb7d6ea00c9cfca5e40db6fd80fc8b2bfb1159dae04ae2` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/pa/pa-790-nonconviction-set--official-pdf-fill/fixtures/ifp-ccp-boundary.pdf` — `f337425b4ff076d8acef9e519c0e9d8c0425b29b3a0aa911ee37176a294fc54a` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/pa/pa-790-nonconviction-set--official-pdf-fill/fixtures/rule-790-order-boundary.pdf` — `83761180e489e5e03454a2b15bde69beaadc238b01290c783b5caaefc660125b` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/pa/pa-790-nonconviction-set--official-pdf-fill/fixtures/rule-790-petition-boundary.pdf` — `d9b5a76cf574430ed1d4d286a4fedaa355c3c20bb438fe916609ffa86d40e7cc` · 1 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/pa/pa-790-nonconviction-set--official-pdf-fill/fixtures/rule-790-petition-canonical.pdf` and `data/rcap-all50/overlays/census-v1/pa/pa-790-nonconviction-set--official-pdf-fill/fixtures/rule-790-petition-boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 12 across all documents · requested scale 2.5
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

### ri_first_offender_misdemeanor-set

- canonical `data/rcap-all50/overlays/census-v1/ri/ri-first-offender-misdemeanor-set--official-pdf-fill/fixtures/canonical.pdf` — `f810a12d5177386100389ed7f9d712327fcd8d0eed97c3e33c961416900b40a1`
- boundary `data/rcap-all50/overlays/census-v1/ri/ri-first-offender-misdemeanor-set--official-pdf-fill/fixtures/boundary.pdf` — `a0b99d006e508676ae4e6e8d6e704c7dade9df6f1f682acf3c9738ca525c5d3c`
- expected pages 15 · requested scale 2.5
- built by (no builder lane recorded)

### sc_17_22_950_summary-set

- canonical `data/rcap-all50/overlays/census-v1/sc/sc-17-22-950-summary-set--official-pdf-fill/fixtures/canonical.pdf` — `f373d91a18f015ebc7f3c7a9e7d71c1e47a469e830977555c937f4241cc8c5a1`
- boundary `data/rcap-all50/overlays/census-v1/sc/sc-17-22-950-summary-set--official-pdf-fill/fixtures/boundary.pdf` — `42e3e5e2b24e0f2b8064fef187ab2331c5914710c43899d2abd99c0a7bbfeaf9`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### tx_nd_conviction_no_supervision-set

- canonical `data/rcap-all50/overlays/census-v1/tx/tx-nd-conviction-no-supervision-set--official-pdf-fill/fixtures/canonical.pdf` — `2667c62703594861e2bf7c46b92076c2fe4a6b4b20abcadd940f05fc1e3d6eaf`
- boundary `data/rcap-all50/overlays/census-v1/tx/tx-nd-conviction-no-supervision-set--official-pdf-fill/fixtures/boundary.pdf` — `e55f77eaffa7fb922471d011da70f419941639c23b237e77d5261c569955c3f1`
- expected pages 24 · requested scale 2.5
- built by (no builder lane recorded)

### tx_nd_probation_misdemeanor-set

- canonical `data/rcap-all50/overlays/census-v1/tx/tx-nd-probation-misdemeanor-set--official-pdf-fill/fixtures/canonical.pdf` — `006453102ab2082f27d5b52c2309c4c24267051deabf117fa29876494b591c4b`
- boundary `data/rcap-all50/overlays/census-v1/tx/tx-nd-probation-misdemeanor-set--official-pdf-fill/fixtures/boundary.pdf` — `8c20f877c3ba04ddf88b98d04572cfa6a56732e095155b86c08c1c606d819fc5`
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

### va_exp_identity_used_by_another-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-exp-identity-used-by-another-set--custom-pleading/fixtures/canonical.pdf` — `e01f67987b25265e945bf774750a5af8a10f2360cad8790ca6bbbd116fc099b4`
- boundary `data/rcap-all50/overlays/census-v1/va/va-exp-identity-used-by-another-set--custom-pleading/fixtures/boundary.pdf` — `eb054b41c4548fd97bd5ab8fcf368b4cdc9d3ac3d43e98b6e6c271b362376f66`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### va_seal_petition_felony-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-seal-petition-felony-set--official-pdf-fill/fixtures/canonical.pdf` — `e99ca2b8ab006ac0c2dbaee9c049489be542e7bab1632f3a7f7a89f17a8f48ff`
- boundary `data/rcap-all50/overlays/census-v1/va/va-seal-petition-felony-set--official-pdf-fill/fixtures/boundary.pdf` — `d66a8f19d3a332d1a47cd8b831f3b0719f5eec87f2b1320ac1763648adacf580`
- expected pages 11 · requested scale 2.5
- built by (no builder lane recorded)

### vt_seal_18_to_21-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-18-to-21-set--official-pdf-fill/fixtures/canonical.pdf` — `81dd74a0ee1d178cefcb0f028dfba3e9bc7dbd7687bcf58193b0b9d62d767dee`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-18-to-21-set--official-pdf-fill/fixtures/boundary.pdf` — `7ff3cc2272008865eba1d723e1d8dc4074b8163c7c6dbca82cf665003e32750e`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### vt_seal_nonconviction-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-nonconviction-set--official-pdf-fill/fixtures/canonical.pdf` — `951d18666bcfd19d917c88a1604214696f1340cb49d8a55a75a3646688005967`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-nonconviction-set--official-pdf-fill/fixtures/boundary.pdf` — `c97b47dfbde20fdfe935a56d37280dd9e8a4c9ba03611cd609b3b6deaadb6fb5`
- expected pages 9 · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_cannabis-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/fixtures/crrlj-09-0800-canonical-filled.pdf` — `1b595c985753ae1d9583eb628ddac64117ea786ef72cca84df6329e99b781166` · 1 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/fixtures/crrlj-09-0870-canonical-filled.pdf` — `54d2fe73309c3927ff4675c3779540aef223d57130a00edc9b943e1e20ef18d1` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/fixtures/crrlj-09-0800-boundary-filled.pdf` — `54e9c1592824d9c3f429c9acc0346b7c7899a5ecfd6e17bb4cfd816163412783` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/fixtures/crrlj-09-0870-boundary-filled.pdf` — `4cc25535df49f52dcf0ff5e4ad520dc95fcf24b68682f76e299c39f9a595ca2e` · 2 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/fixtures/crrlj-09-0800-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/fixtures/crrlj-09-0800-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 6 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_misdemeanor_ordinary-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-misdemeanor-ordinary-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` — `846360e75578ce6233dba77b03b25545a529b50cd553ad31f88d3008b429a6ad` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-misdemeanor-ordinary-set--official-pdf-fill/fixtures/crrlj-09-0200-canonical-filled.pdf` — `3abc2475b78da8cff2445a99a78fa7aa18641d4c27f17d0c5eea3d6f07e40ce7` · 6 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-misdemeanor-ordinary-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` — `75fac347051d6b710015ef5bbcc10b43df0a1de59078195ede75a744f4c42b77` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-misdemeanor-ordinary-set--official-pdf-fill/fixtures/crrlj-09-0200-boundary-filled.pdf` — `4d844aece78a8ae1c1e97407edd305f45dbdaa2c509f8e55ef51fef03bcb3a55` · 6 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/wa/wa-vac-misdemeanor-ordinary-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/wa/wa-vac-misdemeanor-ordinary-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 22 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_treaty_fishing-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-treaty-fishing-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` — `846360e75578ce6233dba77b03b25545a529b50cd553ad31f88d3008b429a6ad` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-treaty-fishing-set--official-pdf-fill/fixtures/crrlj-09-0200-canonical-filled.pdf` — `3abc2475b78da8cff2445a99a78fa7aa18641d4c27f17d0c5eea3d6f07e40ce7` · 6 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-treaty-fishing-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` — `75fac347051d6b710015ef5bbcc10b43df0a1de59078195ede75a744f4c42b77` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-treaty-fishing-set--official-pdf-fill/fixtures/crrlj-09-0200-boundary-filled.pdf` — `4d844aece78a8ae1c1e97407edd305f45dbdaa2c509f8e55ef51fef03bcb3a55` · 6 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/wa/wa-vac-treaty-fishing-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/wa/wa-vac-treaty-fishing-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 22 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### wv_acc_treatment_job_readiness-set

- canonical `data/rcap-all50/overlays/census-v1/wv/wv-acc-treatment-job-readiness-set--custom-pleading/fixtures/canonical.pdf` — `b9451b7caa24cb6cfa92684eac520e015975d812fb3725eb1c28b42525f8b3be`
- boundary `data/rcap-all50/overlays/census-v1/wv/wv-acc-treatment-job-readiness-set--custom-pleading/fixtures/boundary.pdf` — `723891ee5773664c4f50b0c70f41ef9e0233661b425398c499839a7145f2c328`
- expected pages 14 · requested scale 2.5
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

- `data/rcap-grade-a/codex-cloud/ras04-raster-evidence/**` — and nothing else.

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
LANE: RAS04
FAMILIES ASSIGNED: 78
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
