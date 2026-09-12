# RAS04

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `089c072562956350d2b7e6667847f3dd0e7afb3f`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (77)

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

### de_mandatory_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/de/de-mandatory-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `fe6116767ab21cd12f5448c6cb389072f32e4650e3a3b7f8d8bb82168e124f00`
- boundary `data/rcap-all50/overlays/census-v1/de/de-mandatory-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `45f57fe5ba073034ce2f3e3411c1b87410123ae51a56f235fbbb4e1d8656d3bb`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### fl-early-juvenile-set

- canonical `data/rcap-all50/overlays/census-v1/fl/fl-early-juvenile-set--official-pdf-fill/fixtures/canonical.pdf` — `f98816f1cd07d2e95918d416cc3776b6b54733523da0832b6943e12aa25b6f00`
- boundary `data/rcap-all50/overlays/census-v1/fl/fl-early-juvenile-set--official-pdf-fill/fixtures/boundary.pdf` — `3ce5201d21b2e97d6142cd73ccbf21dfc27584672d66a9a10b30a97c01e56fc0`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### ga-felony-j1-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-felony-j1-set--custom-pleading/fixtures/canonical.pdf` — `87acee6328e42485183be789b94914bccd92fe6728807bd4c976f3dc74cdb856`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-felony-j1-set--custom-pleading/fixtures/boundary.pdf` — `c637ec1cd28c48db48adc796c67e5ba2401f001815e3cf09c2500e7d0914aec4`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### ga-jail-k2-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-jail-k2-set--custom-pleading/fixtures/canonical.pdf` — `154780fcc5f3280fea71781bb16f80c1176db5c56c0b522b9a889f288b5dc91d`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-jail-k2-set--custom-pleading/fixtures/boundary.pdf` — `ff4dbf5329d071c7bfd07dde7be1e786b156a3b5da4753d7f43df199e1d425b2`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### ga-pardon-j7-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-pardon-j7-set--custom-pleading/fixtures/canonical.pdf` — `6a1c18a1587a4d7c8e686545c1a8c2b35bdb1347c8e5dd720115045b26ebc9fa`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-pardon-j7-set--custom-pleading/fixtures/boundary.pdf` — `48a85fc1d7793b1d76c30cf100da6a273b5b325ad5c162822bf6c5c747a6240d`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### hi_dag_danc_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/hi/hi-dag-danc-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `4e65c4e11d7962a8c8132a6ad85f714638ea9750d497a63e4da916ce801aff96`
- boundary `data/rcap-all50/overlays/census-v1/hi/hi-dag-danc-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `bb4149d07409828754d0477a12cdef68c283ff271b85645137f09c73c6e8118b`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### ia-901c2-set

- **5 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ia/ia-901c2-set--official-pdf-fill/fixtures/canonical.pdf` — `18a2255cd780d62955b030ad9996d5b8fe46d71c5bb00f4517d3ff7a116d251b` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ia/ia-901c2-set--official-pdf-fill/fixtures/exact-day-180.pdf` — `6dabf84f3285ca8747551c4b264882fdfd6c689a40b1cf51ae77dbf94fc88e27` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ia/ia-901c2-set--official-pdf-fill/fixtures/good-cause-waiver.pdf` — `fbcf0b2dd84a53d17a59cffc4698eea50efeb13cfbf7543a1cf5c55c53879ef7` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ia/ia-901c2-set--official-pdf-fill/fixtures/missing-contact.pdf` — `9b5a75a2c3d8ce37d204ac43fe507fcc2decb6de949494fd67053b625938f372` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ia/ia-901c2-set--official-pdf-fill/fixtures/boundary.pdf` — `5d01a98e4134ad7b58f9f13b8ec55049202f93a8baaf0cd941e5e45715601128` · 5 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ia/ia-901c2-set--official-pdf-fill/fixtures/canonical.pdf` and `data/rcap-all50/overlays/census-v1/ia/ia-901c2-set--official-pdf-fill/fixtures/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 26 across all documents · requested scale 2.5
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

### il-seal-2yr-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-seal-2yr-set--official-pdf-fill/fixtures/canonical.pdf` — `090c596e0116f172a925b5e34d8bf9c18019478509a918eac0aaa3abc0904166`
- boundary `data/rcap-all50/overlays/census-v1/il/il-seal-2yr-set--official-pdf-fill/fixtures/boundary.pdf` — `cb8874f3a42f1e7b0cb2042d05f76cd68aa0279b1aefdce4d10a034b52f74b0e`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### in_arrest_no_charges-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/in/in-arrest-no-charges-set--official-pdf-fill/fixtures/inserts-canonical-filled.pdf` — `c14d36b058777390d92f0dc6ffb7520afc32bbbb6cfc425ab566c04407585ed6` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/in/in-arrest-no-charges-set--official-pdf-fill/fixtures/packet-canonical-filled.pdf` — `6cf2c07ac890fe4f5a0296d14d93cfcbe628d79f045b300446e0a9ab24df095c` · 15 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/in/in-arrest-no-charges-set--official-pdf-fill/fixtures/inserts-boundary-filled.pdf` — `5fcf460a92c6cbf55b9d7f90e20777c2858ef8588a8cbc64215e1d1062b3ccbf` · 12 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/in/in-arrest-no-charges-set--official-pdf-fill/fixtures/packet-boundary-filled.pdf` — `50f93587e3ca531627e6118d33bdcad80b6215e829dc21f1d0a59fc0d86b3e67` · 15 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/in/in-arrest-no-charges-set--official-pdf-fill/fixtures/packet-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/in/in-arrest-no-charges-set--official-pdf-fill/fixtures/packet-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 46 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### in_infraction_nondisclosure-set

- canonical `data/rcap-all50/overlays/census-v1/in/in-infraction-nondisclosure-set--custom-pleading/fixtures/canonical.pdf` — `d12f6d818c4a2edc151f1e328a56d2eec773963577483ff9bdabededb9e8f463`
- boundary `data/rcap-all50/overlays/census-v1/in/in-infraction-nondisclosure-set--custom-pleading/fixtures/boundary.pdf` — `1dbdadb255eed11ffea3011738d3a9f53ef7f979ed4b4c5b534b9b100532b3b2`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### ks-21-6614-prostitution-coercion-set

- canonical `data/rcap-all50/overlays/census-v1/ks/ks-21-6614-prostitution-coercion-set--official-pdf-fill/fixtures/canonical.pdf` — `94ecee6cfbd2875b4f89d361a7b900e89b56e6ba96eff6b04b3292d81e7e8528`
- boundary `data/rcap-all50/overlays/census-v1/ks/ks-21-6614-prostitution-coercion-set--official-pdf-fill/fixtures/boundary.pdf` — `5c2cb0b4cb5dc953308d8d437250b30aa7891e5699b09a5077191f230f028db0`
- expected pages 20 · requested scale 2.5
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

### tx_nd_veterans_court-set

- canonical `data/rcap-all50/overlays/census-v1/tx/tx-nd-veterans-court-set--official-pdf-fill/fixtures/canonical.pdf` — `047dae56acaed025072318a85121c2d83d4650388be2948c9728105a8ae4ae00`
- boundary `data/rcap-all50/overlays/census-v1/tx/tx-nd-veterans-court-set--official-pdf-fill/fixtures/boundary.pdf` — `b2d4d2954dbafb37157136afac5f5a8477f8b49b9aee00926f9368924153abcb`
- expected pages 25 · requested scale 2.5
- built by (no builder lane recorded)

### ut_pet_dismissed_with_prejudice-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-dismissed-with-prejudice-set--official-pdf-fill/fixtures/canonical.pdf` — `53f275aeee3fe0caf9e83b0bdf2d30e4152f523215a3631ae7b0f9ebbdb2401a`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-dismissed-with-prejudice-set--official-pdf-fill/fixtures/boundary.pdf` — `f37d2e7eda71cfe2a444e09b2e169f50d54b514b116a8b0bdf32049954179a3f`
- expected pages 19 · requested scale 2.5
- built by (no builder lane recorded)

### ut_pet_special_certificate-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-special-certificate-set--official-pdf-fill/fixtures/canonical.pdf` — `c6a058ff36f009423b82f53f9269815023d1d1624c2e42a8cdc57b7463b28f58`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-special-certificate-set--official-pdf-fill/fixtures/boundary.pdf` — `3b1425d7636cbebdb055d4a8f863251fb0970d8e0b35b3354278630d16d601ba`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### va_exp_nonconviction-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-exp-nonconviction-set--official-pdf-fill/fixtures/canonical.pdf` — `f593a8dec288bc29cbe8ad67d236c2beb986538fc6b12faa97bfaa7178dcb9e6`
- boundary `data/rcap-all50/overlays/census-v1/va/va-exp-nonconviction-set--official-pdf-fill/fixtures/boundary.pdf` — `9348f1069237ddba5adaf20a6a5b272c55196e3b1365f52ef74c792101c137e1`
- expected pages 9 · requested scale 2.5
- built by (no builder lane recorded)

### va_seal_petition_misdemeanor-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-seal-petition-misdemeanor-set--official-pdf-fill/fixtures/canonical.pdf` — `32b06f4cd0794b9757e5cf52ced0b55a292cebc109ee4801457d7624aa24ef16`
- boundary `data/rcap-all50/overlays/census-v1/va/va-seal-petition-misdemeanor-set--official-pdf-fill/fixtures/boundary.pdf` — `1237dfee564cd3c0b4fd469266b570bcf454de0b2e3c001a96a3ce5dfa468c31`
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

### wa_vac_substance_use_disorder-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-substance-use-disorder-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` — `846360e75578ce6233dba77b03b25545a529b50cd553ad31f88d3008b429a6ad` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-substance-use-disorder-set--official-pdf-fill/fixtures/crrlj-09-0200-canonical-filled.pdf` — `3abc2475b78da8cff2445a99a78fa7aa18641d4c27f17d0c5eea3d6f07e40ce7` · 6 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-substance-use-disorder-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` — `75fac347051d6b710015ef5bbcc10b43df0a1de59078195ede75a744f4c42b77` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-substance-use-disorder-set--official-pdf-fill/fixtures/crrlj-09-0200-boundary-filled.pdf` — `4d844aece78a8ae1c1e97407edd305f45dbdaa2c509f8e55ef51fef03bcb3a55` · 6 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/wa/wa-vac-substance-use-disorder-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/wa/wa-vac-substance-use-disorder-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 22 across all documents · requested scale 2.5
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
FAMILIES ASSIGNED: 77
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
