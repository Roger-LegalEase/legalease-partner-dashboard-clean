# RAS03

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `21c7eebd23a23ff671b530940ea93bb941cc4094`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (51)

### agency-application-treatment:obligation:research-decision-route:NY:ny_160_55_violation:dcjs_correction_submission

- canonical `data/rcap-all50/overlays/census-v1/ny/agency-application-treatment:obligation:research-decision-route:ny:ny-160-55-violation:dcjs-correction-submission--official-pdf-fill/fixtures/canonical.pdf` — `8abff71f85f09f7c248daa088286855253f3b95172837efa2fcd69a0c51e57ec`
- boundary `data/rcap-all50/overlays/census-v1/ny/agency-application-treatment:obligation:research-decision-route:ny:ny-160-55-violation:dcjs-correction-submission--official-pdf-fill/fixtures/boundary.pdf` — `c48c6e8cea3616ada41949087580f4db52ea94a0613fa55942f4f62de5fe4878`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### agency-application-treatment:obligation:track-pathway:CT:ct-absolute-pardon:absolute-pardon-resulting-in-erasure

- canonical `data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-pathway:ct:ct-absolute-pardon:absolute-pardon-resulting-in-erasure--official-pdf-fill/fixtures/canonical.pdf` — `26cfafce62253c6788aa135761fc7f8bc72888b3daf15c225172ff28505a765e`
- boundary `data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-pathway:ct:ct-absolute-pardon:absolute-pardon-resulting-in-erasure--official-pdf-fill/fixtures/boundary.pdf` — `e078c042fdf813b611b633effa9408edd62bcf3b14545222c55592f525fc195f`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### ak-tf800-set

- canonical `data/rcap-all50/overlays/census-v1/ak/ak-tf800-set--official-pdf-fill/fixtures/tf800-canonical-filled.pdf` — `5b7e549d02811574dcf73fdc2f2dc24ffcaf6da747e4db58fe2c63ceeaf1ba1b`
- boundary `data/rcap-all50/overlays/census-v1/ak/ak-tf800-set--official-pdf-fill/fixtures/tf800-boundary-filled.pdf` — `a7292a0db6c6a32be3f7d66d08c9959c95841fcd304e5d06f4e9fd51e96488b0`
- expected pages 3 · requested scale 2.5
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

### composed-treatment:obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1017a_automatic_failure_correction

- canonical `data/rcap-all50/overlays/census-v1/de/composed-treatment:obligation:runtime-contract-cohort:de:juvenile-expungement-under-10-del-c-1017-1019-1017a:section-1017a-automatic-failure-correction--custom-pleading/fixtures/canonical.pdf` — `0e9809a8fba28867f03cada0daae2c2c882ff57f7a55f0a75c9151021a99b60e`
- boundary `data/rcap-all50/overlays/census-v1/de/composed-treatment:obligation:runtime-contract-cohort:de:juvenile-expungement-under-10-del-c-1017-1019-1017a:section-1017a-automatic-failure-correction--custom-pleading/fixtures/boundary.pdf` — `fd9884acbebe2e257e9e6b708c051f208490d4ad86468f73c3bac2339d132ac8`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:MS:intervention-court-dismissal-only-nonconviction-expungement-99-19-71-4

- canonical `data/rcap-all50/overlays/census-v1/ms/composed-treatment:obligation:runtime-only:ms:intervention-court-dismissal-only-nonconviction-expungement-99-19-71-4--custom-pleading/fixtures/canonical.pdf` — `112fb452f4d57f904972db5da930a0753bad25056c1c3d1fd3f16b2ac539f85d`
- boundary `data/rcap-all50/overlays/census-v1/ms/composed-treatment:obligation:runtime-only:ms:intervention-court-dismissal-only-nonconviction-expungement-99-19-71-4--custom-pleading/fixtures/boundary.pdf` — `9b6cfca69239cc5a94eb9c77e82b15cf5e0512e543fa617e44459d8a6271cc9d`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:NV:trafficking-victim-vacatur-and-sealing-under-nrs-179-247

- canonical `data/rcap-all50/overlays/census-v1/nv/composed-treatment:obligation:runtime-only:nv:trafficking-victim-vacatur-and-sealing-under-nrs-179-247--custom-pleading/fixtures/canonical.pdf` — `ace550b2facfe49073b96b693f687da88ef69294a1654be2b253424913eb4364`
- boundary `data/rcap-all50/overlays/census-v1/nv/composed-treatment:obligation:runtime-only:nv:trafficking-victim-vacatur-and-sealing-under-nrs-179-247--custom-pleading/fixtures/boundary.pdf` — `cbae759020043282ceb3213a052dae9271c263a87e81a3a7e6cd5404c5b7cae0`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:sc_17_22_950_summary

- canonical `data/rcap-all50/overlays/census-v1/sc/composed-treatment:sc-17-22-950-summary--custom-pleading/fixtures/canonical.pdf` — `9742b771437d6bf34a3701e1a9838f35f49548f92e450011edf8622a31ce4c63`
- boundary `data/rcap-all50/overlays/census-v1/sc/composed-treatment:sc-17-22-950-summary--custom-pleading/fixtures/boundary.pdf` — `e5c37a603eff1af87cacc0f405aea4738aeb7f6ff65a7fb7d78527a7680f2cdb`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### ct-missed-erasure-set

- canonical `data/rcap-all50/overlays/census-v1/ct/ct-missed-erasure-set--official-pdf-fill/fixtures/canonical.pdf` — `0872021341ca0755e2df874ebea40d601e3ffacbb4be6f5436b642548ffdcb82`
- boundary `data/rcap-all50/overlays/census-v1/ct/ct-missed-erasure-set--official-pdf-fill/fixtures/boundary.pdf` — `9fb5c03662f710c73094e29bd1428e70cc1de7790644a3b7b8fdada0062b4b5b`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### dc_correct_misattributed_arrest-set

- canonical `data/rcap-all50/overlays/census-v1/dc/dc-correct-misattributed-arrest-set--custom-pleading/fixtures/canonical.pdf` — `d4e4125cb51ec2248468dc093da2d40f66ae1dafc380ed7c2d6f84ec8fc4ce7f`
- boundary `data/rcap-all50/overlays/census-v1/dc/dc-correct-misattributed-arrest-set--custom-pleading/fixtures/boundary.pdf` — `4a5cea51f550c553758c09e1ad96f21d0c0f751bdf77ee2da6adb7a2f9dc4225`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### dc_seal_nonconviction-set

- canonical `data/rcap-all50/overlays/census-v1/dc/dc-seal-nonconviction-set--custom-pleading/fixtures/canonical.pdf` — `3a4096596d848b88b439868f527ae4108a2c201a13ba61aabb187a04916fa0a8`
- boundary `data/rcap-all50/overlays/census-v1/dc/dc-seal-nonconviction-set--custom-pleading/fixtures/boundary.pdf` — `968bddea6c675c7fc08aa25f1400f3bdac75713152bffa96591f80c0aac40c36`
- expected pages 5 · requested scale 2.5
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

### la-985-expungement-by-redaction-set

- canonical `data/rcap-all50/overlays/census-v1/la/la-985-expungement-by-redaction-set--custom-pleading/fixtures/canonical.pdf` — `b1d880af0c6539383329e73491b0bb6d293f3fba4ea3509d32abcd894926ef8c`
- boundary `data/rcap-all50/overlays/census-v1/la/la-985-expungement-by-redaction-set--custom-pleading/fixtures/boundary.pdf` — `378c0dab12934eaf89e71f37ecf5489e53a7e3f6fe015ce387a63b85e9c87fc1`
- expected pages 17 · requested scale 2.5
- built by (no builder lane recorded)

### ma-seal-decrim-set

- canonical `data/rcap-all50/overlays/census-v1/ma/ma-seal-decrim-set--official-pdf-fill/fixtures/canonical.pdf` — `3ac87f6e248672399d482881f012b779101229664ef9bed10e1f6914edfda5f4`
- boundary `data/rcap-all50/overlays/census-v1/ma/ma-seal-decrim-set--official-pdf-fill/fixtures/boundary.pdf` — `b2476975802790d46694f369ecf48b484451f328607938ebf4f366b5d4c4f08f`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### me-screening-set

- canonical `data/rcap-all50/overlays/census-v1/me/me-screening-set--custom-pleading/fixtures/canonical.pdf` — `18921d618fb4a51d970ea9c5d40d427d364f42f87727c9824c21442f747fcef5`
- boundary `data/rcap-all50/overlays/census-v1/me/me-screening-set--custom-pleading/fixtures/boundary.pdf` — `421d3ab97ca8ba4c2cb7dfa678a3d88fb0f1bc0f9e92486ee7e4dfafb3c8da56`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### mi_setaside_first_owi-set

- **6 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-first-owi-set--official-pdf-fill/fixtures/canonical.pdf` — `0eaf0fb4a17803aed4f2858871a19d561f2f8c1cf87309ba28f3cba510daeff7` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-first-owi-set--official-pdf-fill/fixtures/prior-application-pending-handoff.pdf` — `33f22dd2da62aa9156c9eb2131608407eef8c22414ff681ce31723077c3ffabb` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-first-owi-set--official-pdf-fill/fixtures/prior-denial-earlier-order-date-handoff.pdf` — `831ef62d76c3125a399966b1569ac0cb507734b2ddbdc784f7d0e7633a76b01b` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-first-owi-set--official-pdf-fill/fixtures/prior-denial-interval-elapsed-handoff.pdf` — `dc84a4629aac4965afb75d0bc5cc14561845ba011dd875fcb3192fedac2f032c` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-first-owi-set--official-pdf-fill/fixtures/prior-denial-within-three-years-handoff.pdf` — `831ef62d76c3125a399966b1569ac0cb507734b2ddbdc784f7d0e7633a76b01b` · 4 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/mi/mi-setaside-first-owi-set--official-pdf-fill/fixtures/boundary.pdf` — `017a440ba23c13a3d4c7af53e7998f54e03b92213a024d369764529ed73934fd` · 4 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/mi/mi-setaside-first-owi-set--official-pdf-fill/fixtures/canonical.pdf` and `data/rcap-all50/overlays/census-v1/mi/mi-setaside-first-owi-set--official-pdf-fill/fixtures/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 24 across all documents · requested scale 2.5
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

### nh_petition_nonconviction_pre2019-set

- canonical `data/rcap-all50/overlays/census-v1/nh/nh-petition-nonconviction-pre2019-set--official-pdf-fill/fixtures/canonical.pdf` — `adcd250e96f50e380bc9d15529130865be9d1a2c0336c139978c81acea70f0c6`
- boundary `data/rcap-all50/overlays/census-v1/nh/nh-petition-nonconviction-pre2019-set--official-pdf-fill/fixtures/boundary.pdf` — `b9cf9a1724750739ce93945ee01ed2939c97de2446dc95051c6628ef5f34af6f`
- expected pages 9 · requested scale 2.5
- built by (no builder lane recorded)

### nv_seal_probation_family-set

- canonical `data/rcap-all50/overlays/census-v1/nv/nv-seal-probation-family-set--custom-pleading/fixtures/canonical.pdf` — `3b02d62f748c5f3ec5150742f3e225d0418ca4ddb7203ef5bc7fce9552b2de9a`
- boundary `data/rcap-all50/overlays/census-v1/nv/nv-seal-probation-family-set--custom-pleading/fixtures/boundary.pdf` — `6530f51d5855d955aacc8c1bfbff5094756d7f271e920b846a1ed2676c805dd2`
- expected pages 9 · requested scale 2.5
- built by (no builder lane recorded)

### or_conviction_setaside-set

- canonical `data/rcap-all50/overlays/census-v1/or/or-conviction-setaside-set--official-pdf-fill/fixtures/canonical.pdf` — `a2d72e3f54c58a7590a681a93b015a82660056790077dd508b97d6d3e50c5b0b`
- boundary `data/rcap-all50/overlays/census-v1/or/or-conviction-setaside-set--official-pdf-fill/fixtures/boundary.pdf` — `2375b62449222756817f4338188fef6475f0f6323c237ba3f63a47c99396b360`
- expected pages 9 · requested scale 2.5
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

### rcap-nd-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/nd/rcap-nd-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `2fd78d8919dedfbdc062f180ade3769ed019c10e76bc1bc615f3f090e4e49522`
- boundary `data/rcap-all50/overlays/census-v1/nd/rcap-nd-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `52464ec12db3294f7d66003f4398d87c6753c4b4ef46db4ca5be9d0e5f381e8d`
- expected pages 35 · requested scale 2.5
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

### ri_marijuana-set

- canonical `data/rcap-all50/overlays/census-v1/ri/ri-marijuana-set--custom-pleading/fixtures/canonical.pdf` — `79bcf52eb9014313303adc20c37ec9d20d127de1dd28e5b738f2c823f0eba8f0`
- boundary `data/rcap-all50/overlays/census-v1/ri/ri-marijuana-set--custom-pleading/fixtures/boundary.pdf` — `fc9c6c8ae3934798ba7dd5eff9bf58629da65a390ba9cf0318032f8b37945312`
- expected pages 6 · requested scale 2.5
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

### wa_vac_cannabis-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/fixtures/crrlj-09-0800-canonical-filled.pdf` — `1b595c985753ae1d9583eb628ddac64117ea786ef72cca84df6329e99b781166` · 1 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/fixtures/crrlj-09-0870-canonical-filled.pdf` — `54d2fe73309c3927ff4675c3779540aef223d57130a00edc9b943e1e20ef18d1` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/fixtures/crrlj-09-0800-boundary-filled.pdf` — `54e9c1592824d9c3f429c9acc0346b7c7899a5ecfd6e17bb4cfd816163412783` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/fixtures/crrlj-09-0870-boundary-filled.pdf` — `4cc25535df49f52dcf0ff5e4ad520dc95fcf24b68682f76e299c39f9a595ca2e` · 2 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/fixtures/crrlj-09-0800-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/fixtures/crrlj-09-0800-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 6 across all documents · requested scale 2.5
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

### wv_conv_nonviolent_felony-set

- canonical `data/rcap-all50/overlays/census-v1/wv/wv-conv-nonviolent-felony-set--official-pdf-fill/fixtures/canonical.pdf` — `c3c5edd72b617541bbceaa7ac1c791b0d2f251dde9365a1c8a1c16995dd5edd9`
- boundary `data/rcap-all50/overlays/census-v1/wv/wv-conv-nonviolent-felony-set--official-pdf-fill/fixtures/boundary.pdf` — `0eb1fbdd0c559bde89cd3d4e595044bb7d17b949d53e9ee8f2a64e1fc5647573`
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

- `data/rcap-grade-a/codex-cloud/ras03-raster-evidence/**` — and nothing else.

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
LANE: RAS03
FAMILIES ASSIGNED: 51
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
