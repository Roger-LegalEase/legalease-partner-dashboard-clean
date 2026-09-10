# RAS02

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `0b4525a52cf4ab01c979f4fff437ac27f807109c`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (56)

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

- canonical `data/rcap-all50/overlays/census-v1/ar/ar-nonconviction-seal-set--official-pdf-fill/fixtures/canonical.pdf` — `4cf919a7c096f3e8afadb99826a3fc8bb866a5d79e8d49c6ec649cad1a769661`
- boundary `data/rcap-all50/overlays/census-v1/ar/ar-nonconviction-seal-set--official-pdf-fill/fixtures/boundary.pdf` — `7353903f1880212d28926ab41f11f7af157a056856d8585b4fe175dbe556fed6`
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

### co_petition_seal_arrest-set

- canonical `data/rcap-all50/overlays/census-v1/co/co-petition-seal-arrest-set--official-pdf-fill/fixtures/canonical.pdf` — `f15bde74dc5856e0f32dd5fc9dcbf0425c1c88c7a5140e58d50a8260bbb667b5`
- boundary `data/rcap-all50/overlays/census-v1/co/co-petition-seal-arrest-set--official-pdf-fill/fixtures/boundary.pdf` — `0183e844214ba22db3d13a72475d81c809d2a50e03f3653a2b0ea1d52541db50`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1018_discretionary_petition

- canonical `data/rcap-all50/overlays/census-v1/de/composed-treatment:obligation:runtime-contract-cohort:de:juvenile-expungement-under-10-del-c-1017-1019-1017a:section-1018-discretionary-petition--custom-pleading/fixtures/canonical.pdf` — `496f5fd95292a763931d1f1593dd825e1956b250ec229081034ba2e1ffda62b5`
- boundary `data/rcap-all50/overlays/census-v1/de/composed-treatment:obligation:runtime-contract-cohort:de:juvenile-expungement-under-10-del-c-1017-1019-1017a:section-1018-discretionary-petition--custom-pleading/fixtures/boundary.pdf` — `b154f8b9bb739dcfb24ebfdfcb9450215a85a25862e65b31954028109bfb3bbb`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:MS:nonadjudication-under-99-15-26

- canonical `data/rcap-all50/overlays/census-v1/ms/composed-treatment:obligation:runtime-only:ms:nonadjudication-under-99-15-26--custom-pleading/fixtures/canonical.pdf` — `b6c18f619f45fbd2cf9a80e805b7a8c6d428427cf88c77c2f05083c758e396b2`
- boundary `data/rcap-all50/overlays/census-v1/ms/composed-treatment:obligation:runtime-only:ms:nonadjudication-under-99-15-26--custom-pleading/fixtures/boundary.pdf` — `c31fa42374b4b6c83b8388d76e6ff556d6e62f7b2f2f2c617ec2bceba3e20e90`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:OK:juvenile-record-expungement

- canonical `data/rcap-all50/overlays/census-v1/ok/composed-treatment:obligation:runtime-only:ok:juvenile-record-expungement--custom-pleading/fixtures/canonical.pdf` — `b126807ef7de8f9c35945d926612bf6b116e99045b307bc9d7535307b9ef3179`
- boundary `data/rcap-all50/overlays/census-v1/ok/composed-treatment:obligation:runtime-only:ok:juvenile-record-expungement--custom-pleading/fixtures/boundary.pdf` — `7ec9bdeb42a3fb3657aed1d6d1e8eeb01a2ee98935d08f7541174b1a31008359`
- expected pages 5 · requested scale 2.5
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

### in_conviction_d6-set

- canonical `data/rcap-all50/overlays/census-v1/in/in-conviction-d6-set--custom-pleading/fixtures/canonical.pdf` — `9fc3c5e61d934f5be61ecbdf47e7e4a2dde73aa25b02cf831970d2110127bf75`
- boundary `data/rcap-all50/overlays/census-v1/in/in-conviction-d6-set--custom-pleading/fixtures/boundary.pdf` — `cdaf07e256d6fd0c0665877ccffd90eb9d92591bb2c36711dee935a55a7d7939`
- expected pages 10 · requested scale 2.5
- built by (no builder lane recorded)

### ky_felony_vacatur_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-felony-vacatur-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `581dee480d77d2f226b907b017c4209de89d4f4346f654256ed11ba24d32e54e`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-felony-vacatur-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `3847941126c39f4c5963e2fa06bbccbaf5936a39551118fc6df429ff21bca91b`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### la-976-arrest-no-conviction-set

- canonical `data/rcap-all50/overlays/census-v1/la/la-976-arrest-no-conviction-set--official-pdf-fill/fixtures/canonical.pdf` — `43883382166f27e4f890f3af7af3a0540db8af30a58b1205754539919c5f523c`
- boundary `data/rcap-all50/overlays/census-v1/la/la-976-arrest-no-conviction-set--official-pdf-fill/fixtures/boundary.pdf` — `2ea20aec7732ef4e890efe1d686b6bb76ad83483621b232ef94ed87442657f49`
- expected pages 25 · requested scale 2.5
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

### mn_petition_juvenile_as_adult-set

- canonical `data/rcap-all50/overlays/census-v1/mn/mn-petition-juvenile-as-adult-set--official-pdf-fill/fixtures/canonical.pdf` — `ccd5f00fd86da007606780b15cb45462e80187731404f07694ec015775bfefa3`
- boundary `data/rcap-all50/overlays/census-v1/mn/mn-petition-juvenile-as-adult-set--official-pdf-fill/fixtures/boundary.pdf` — `c5f2e418ad4471ffb42d73f96d01daa4ce7821e9c9f10ce511883f2a4a080cc5`
- expected pages 17 · requested scale 2.5
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

### nc_146_acquittal_petition-set

- canonical `data/rcap-all50/overlays/census-v1/nc/nc-146-acquittal-petition-set--official-pdf-fill/fixtures/canonical.pdf` — `135dc7b9c0f104788512f1e313a6d88b4497c88a70fc6b18b92abe45bceecf17`
- boundary `data/rcap-all50/overlays/census-v1/nc/nc-146-acquittal-petition-set--official-pdf-fill/fixtures/boundary.pdf` — `5597a2818dc8914554b24418cba87d418676dc1ddfe2111967df1a6c4f30a3da`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### nd-regular-pardon-set

- canonical `data/rcap-all50/overlays/census-v1/nd/nd-regular-pardon-set--official-pdf-fill/fixtures/canonical.pdf` — `c0a8d543dc45047ff0ddf20558239ffe10ba3a3e8af3ef034922a7be5cbcd7c7`
- boundary `data/rcap-all50/overlays/census-v1/nd/nd-regular-pardon-set--official-pdf-fill/fixtures/boundary.pdf` — `8cce6850a548e96559cb59f31128463e7277b0e4d487d26682388532bb735507`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### ne-seal-pardoned-set

- canonical `data/rcap-all50/overlays/census-v1/ne/ne-seal-pardoned-set--official-pdf-fill/fixtures/canonical.pdf` — `06f5fae3ff55d3d23302157f847153ade429a221a879beb865639b55f7666979`
- boundary `data/rcap-all50/overlays/census-v1/ne/ne-seal-pardoned-set--official-pdf-fill/fixtures/boundary.pdf` — `a6b1d085e19c376e5a9c3bb9decfa7f4ee116e8e53aad6e7318e51d71f8f9b4f`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### nj_arrest_no_conviction-set

- canonical `data/rcap-all50/overlays/census-v1/nj/nj-arrest-no-conviction-set--official-pdf-fill/fixtures/cn-10557-canonical.pdf` — `922b89598d0b7b57d0fd40623d404a7d9cf24ba507a9eba82472815d9b74ee7d`
- boundary `data/rcap-all50/overlays/census-v1/nj/nj-arrest-no-conviction-set--official-pdf-fill/fixtures/cn-10557-boundary.pdf` — `23a571af72985717963001120ba60116ae43054aaa1c2fddbeece944dac24494`
- expected pages 43 · requested scale 2.5
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

### rcap-ga-guidance-implementation

- canonical `data/rcap-all50/overlays/census-v1/ga/rcap-ga-guidance-implementation--custom-pleading/fixtures/canonical.pdf` — `ecfb488b8adf6cdadbbe1489d4a7fb9a982a18d7e9bebe90b0c019b80a756914`
- boundary `data/rcap-all50/overlays/census-v1/ga/rcap-ga-guidance-implementation--custom-pleading/fixtures/boundary.pdf` — `6866fd683dad67e2a3b4be8db3773e424411850487748f2692ecaf9253d12e24`
- expected pages 4 · requested scale 2.5
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

### wa_crop_certificate_of_restoration-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-crop-certificate-of-restoration-set--custom-pleading/fixtures/canonical.pdf` — `44d858039dfd15ea013f3d3d431cc74d277d3b8a59d2a12f7edde490808678c9`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-crop-certificate-of-restoration-set--custom-pleading/fixtures/boundary.pdf` — `9eecfba4d9b8ba5d5ed0feba913e46ffd18a98f708038616a624701130ab8288`
- expected pages 7 · requested scale 2.5
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
FAMILIES ASSIGNED: 56
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
