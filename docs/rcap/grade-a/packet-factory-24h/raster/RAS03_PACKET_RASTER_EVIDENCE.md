# RAS03

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `1a961ea72a9e2485a19652552c4f04821da7a885`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (37)

### agency-application-treatment:obligation:runtime-only:NM:dna-sample-profile-expungement

- canonical `data/rcap-all50/overlays/census-v1/nm/agency-application-treatment:obligation:runtime-only:nm:dna-sample-profile-expungement--official-pdf-fill/fixtures/canonical.pdf` — `1bdc17120f9716b3304c52f5ce56e392291f8bb3e42597b4568524ea8eba429f`
- boundary `data/rcap-all50/overlays/census-v1/nm/agency-application-treatment:obligation:runtime-only:nm:dna-sample-profile-expungement--official-pdf-fill/fixtures/boundary.pdf` — `0c1e91e1b74a31f60a56b96547a402811369b2a01ee3c4fc0cf8f6c753caf651`
- expected pages 2 · requested scale 2.5
- built by VF02

### ak-courtview-set

- canonical `data/rcap-all50/overlays/census-v1/ak/ak-courtview-set--official-pdf-fill/fixtures/tf810-canonical-filled.pdf` — `ac2111fa8215881775b35f198d5098aab766703ad55cf24a74a1e5aba843df83`
- boundary `data/rcap-all50/overlays/census-v1/ak/ak-courtview-set--official-pdf-fill/fixtures/tf810-boundary-filled.pdf` — `03b335a1c82762e2e3a98a9fe0e2d5dc8bd74896ade06b5c88100cd9afdd0e1e`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### ar-act531-set

- canonical `data/rcap-all50/overlays/census-v1/ar/ar-act531-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `9a46ded37138089a56217629bb2ecbc51075f209bbeef308a6f9bb9cc464d7f8`
- boundary `data/rcap-all50/overlays/census-v1/ar/ar-act531-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `909ae1530fe07a57fb1a75d65d5ec4dcc0d3edcf5b1a7528509770cb9a717d9c`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### ar-felony-seal-set

- canonical `data/rcap-all50/overlays/census-v1/ar/ar-felony-seal-set--official-pdf-fill/fixtures/canonical.pdf` — `483fe0c25c9b13fedc13befffab96ac19dd535a0dbe134601619b40200ac0d9a`
- boundary `data/rcap-all50/overlays/census-v1/ar/ar-felony-seal-set--official-pdf-fill/fixtures/boundary.pdf` — `daec3853fd6b99aa0c91cf330eb7ea2bd20f40efe453b0d83b2a8c0c3bc90ceb`
- expected pages 7 · requested scale 2.5
- built by VF07

### az_marijuana_expungement_superior_court-set

- canonical `data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-superior-court-set--official-pdf-fill/fixtures/aoc-crem3f-canonical-filled.pdf` — `06232e1f2a7888c27499f271395236d6eba1fbaddb1c1de4c47584d7905ffe5a`
- boundary `data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-superior-court-set--official-pdf-fill/fixtures/aoc-crem3f-boundary-filled.pdf` — `109e16a3e6c9a5e6f987632a7b491e99686112f096f3224df93552c4303f30b2`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### ca-1203-42-set

- canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-42-set--official-pdf-fill/fixtures/pc-1203-42-canonical/cr-180-filled.pdf` — `8e6b20a4115966d8d6c6fb79ca2fe072a1c7ea6e790df149bb54fc2a234f82a2`
- boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-42-set--official-pdf-fill/fixtures/pc-1203-42-boundary/cr-180-filled.pdf` — `fce33fd4f783f3a946bf0484e2f7acf5df379383e606f824d9f58b6cb5e020e5`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### ca-prop64-set

- canonical `data/rcap-all50/overlays/census-v1/ca/ca-prop64-set--official-pdf-fill/fixtures/hs-11361-8-completed-sentence-application-canonical/cr-400-filled.pdf` — `87f93a9b4273a1af89de31a7576ae0e4aae86e42361bfacfae042574695885d4`
- boundary `data/rcap-all50/overlays/census-v1/ca/ca-prop64-set--official-pdf-fill/fixtures/hs-11361-8-completed-sentence-application-boundary/cr-400-filled.pdf` — `53b07cf75b2fee362fcfa07a9f080d86dc04ae4adb705fe4039078508884ac4a`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_court_petition_after_90_days

- canonical `data/rcap-all50/overlays/census-v1/co/composed-treatment:obligation:research-decision-route:co:co-mistaken-identity-expungement:participant-court-petition-after-90-days--custom-pleading/fixtures/canonical.pdf` — `e6d926f76168b6ca6d5dbc2b7a13e6037be2b53203bb8eea6c93cc843e8e0e8d`
- boundary `data/rcap-all50/overlays/census-v1/co/composed-treatment:obligation:research-decision-route:co:co-mistaken-identity-expungement:participant-court-petition-after-90-days--custom-pleading/fixtures/boundary.pdf` — `d00acb23ed43217b68d466265ca30050baca432adb85e1d35f25452adbd0d7ea`
- expected pages 5 · requested scale 2.5
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

### composed-treatment:sd_sis_sealing

- canonical `data/rcap-all50/overlays/census-v1/sd/composed-treatment:sd-sis-sealing--custom-pleading/fixtures/canonical.pdf` — `d74ec3c175844dbe6a4e842ee0ad816be1b72445e88aa6755d582f00d4a8ab32`
- boundary `data/rcap-all50/overlays/census-v1/sd/composed-treatment:sd-sis-sealing--custom-pleading/fixtures/boundary.pdf` — `0d845a2cc829dc75140b01bda7ae31ab1e5b8ab79b8b9d5f32cca607897f53f3`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### ct-nolle-auto-set

- canonical `data/rcap-all50/overlays/census-v1/ct/ct-nolle-auto-set--custom-pleading/fixtures/canonical.pdf` — `f3a0880531d17990d8123555ace7b1dcf94831f4535805d956dbfbc65481e424`
- boundary `data/rcap-all50/overlays/census-v1/ct/ct-nolle-auto-set--custom-pleading/fixtures/boundary.pdf` — `fffa30b7f09d165dcddd0421af8ab44e6d805f96ca7d93cdf10486daaafba1dc`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### dc_innocence_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/dc/dc-innocence-expungement-set--custom-pleading/fixtures/canonical.pdf` — `d887a3cba40f27765809ba436a4ed4c223f5927282f3f4f43eee178e5b2a1076`
- boundary `data/rcap-all50/overlays/census-v1/dc/dc-innocence-expungement-set--custom-pleading/fixtures/boundary.pdf` — `84ebf215a5e1e3b25fbc15cfdac155b375650f553c41046ceeeb5dcc0bc6203d`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### dc_yra_set_aside-set

- canonical `data/rcap-all50/overlays/census-v1/dc/dc-yra-set-aside-set--custom-pleading/fixtures/canonical.pdf` — `d2cf9e833a383310087bc1f5c975d8157777333744202861336b8450277340ca`
- boundary `data/rcap-all50/overlays/census-v1/dc/dc-yra-set-aside-set--custom-pleading/fixtures/boundary.pdf` — `1d798f375d664ebe85e8c2c76a9a59459a9bc0a4d1d74fe454cab15efe582d63`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### fl-early-juvenile-set

- canonical `data/rcap-all50/overlays/census-v1/fl/fl-early-juvenile-set--official-pdf-fill/fixtures/canonical.pdf` — `ec718a25b1cff95cc2814a08914613e6b1b89211c020004370a16b11aa550fb7`
- boundary `data/rcap-all50/overlays/census-v1/fl/fl-early-juvenile-set--official-pdf-fill/fixtures/boundary.pdf` — `3d58ac3dc66a8e6f284c11488a1fe8274569117e4690ddc1d0b9285f201e840f`
- expected pages 5 · requested scale 2.5
- built by VF02

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

### hi_dag_danc_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/hi/hi-dag-danc-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `4e65c4e11d7962a8c8132a6ad85f714638ea9750d497a63e4da916ce801aff96`
- boundary `data/rcap-all50/overlays/census-v1/hi/hi-dag-danc-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `bb4149d07409828754d0477a12cdef68c283ff271b85645137f09c73c6e8118b`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### id_isp_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/id/id-isp-expungement-set--official-pdf-fill/fixtures/application-canonical-filled.pdf` — `c68600571515ebf2132b7879ceea6f61ea18c30e0edecb9ee8405c36ec723da6`
- boundary `data/rcap-all50/overlays/census-v1/id/id-isp-expungement-set--official-pdf-fill/fixtures/application-boundary-filled.pdf` — `48d435eaf962cf4020b4858038c7e5d45175a63534b31664d2afc002c8db57d9`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### ky_criminal_record_segregation-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-criminal-record-segregation-set--custom-pleading/fixtures/canonical.pdf` — `688787fb65152b5bb91ee9677012709e808db28da9dccb7599f85a631ac97970`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-criminal-record-segregation-set--custom-pleading/fixtures/boundary.pdf` — `7e8e5f3eda4cc8cd5a5cc5a29d6c10e83eae825a3508a24e4d9ed7732a5cb470`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### ky_void_seal_marijuana_synthetic_salvia-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-void-seal-marijuana-synthetic-salvia-set--custom-pleading/fixtures/canonical.pdf` — `695ecde15ad70d6155cd548f9a22b73b499e8fcded9734c7163af2e6845276ae`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-void-seal-marijuana-synthetic-salvia-set--custom-pleading/fixtures/boundary.pdf` — `1c5f49b9b7b83407afc3f0419ed32387743aff25a2dd68d921bd2cadc303d427`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### me-nonconv-set

- canonical `data/rcap-all50/overlays/census-v1/me/me-nonconv-set--custom-pleading/fixtures/canonical.pdf` — `d9ea11c3b618cf92863f653ef964f32bf893ef91a602269d1950cbda68c5b007`
- boundary `data/rcap-all50/overlays/census-v1/me/me-nonconv-set--custom-pleading/fixtures/boundary.pdf` — `4f7c2fad8a0c2a2dbd0681b5c48bea156401b82cd87746659cd8077b9df4d665`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### mn_prosecutor_agreed-set

- canonical `data/rcap-all50/overlays/census-v1/mn/mn-prosecutor-agreed-set--custom-pleading/fixtures/canonical.pdf` — `24994ff7f637bf66617c748c9096351e241af0c39ecfb0c39245dc363ec6464a`
- boundary `data/rcap-all50/overlays/census-v1/mn/mn-prosecutor-agreed-set--custom-pleading/fixtures/boundary.pdf` — `7144fd5bf4c61cac0159ddb9a519d4a0e53ae931f8c1dbb150c069b7d570820c`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### ms-misd-addl-set

- canonical `data/rcap-all50/overlays/census-v1/ms/ms-misd-addl-set--custom-pleading/fixtures/canonical.pdf` — `7878f2c0d297bf272eb166820505996ba32976a174b8019140ee83728bf3cd3c`
- boundary `data/rcap-all50/overlays/census-v1/ms/ms-misd-addl-set--custom-pleading/fixtures/boundary.pdf` — `96c13766362702101176e205e7cea1bd39a9305fe175f703ece4e5241680a3c5`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### nd-nonconviction-close-petition-set

- canonical `data/rcap-all50/overlays/census-v1/nd/nd-nonconviction-close-petition-set--official-pdf-fill/fixtures/packet-canonical-filled.pdf` — `2211ad2f8597d79a79151bc5850b222a664ba1ab935abb2d916c43612dddea58`
- boundary `data/rcap-all50/overlays/census-v1/nd/nd-nonconviction-close-petition-set--official-pdf-fill/fixtures/packet-boundary-filled.pdf` — `7f178d4a93edc84c72ea8123715f51da16b7bc1c91d709f575451101052ae747`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### nj_clean_slate-set

- canonical `data/rcap-all50/overlays/census-v1/nj/nj-clean-slate-set--official-pdf-fill/fixtures/cn-10557-canonical.pdf` — `343407a30f38beffccde4c51b8060065bd6eed27356a999d8e321e01a1baca33`
- boundary `data/rcap-all50/overlays/census-v1/nj/nj-clean-slate-set--official-pdf-fill/fixtures/cn-10557-boundary.pdf` — `6256ba7f621c25a8f8a501c0a9af0191c151074fc8d3b2bb6ff2ef36354788ea`
- expected pages 43 · requested scale 2.5
- built by (no builder lane recorded)

### nv_repository_removal-set

- canonical `data/rcap-all50/overlays/census-v1/nv/nv-repository-removal-set--custom-pleading/fixtures/canonical.pdf` — `4fa967de12c8220baa4808970311abc1ba399b9760304925558ec0def9beefeb`
- boundary `data/rcap-all50/overlays/census-v1/nv/nv-repository-removal-set--custom-pleading/fixtures/boundary.pdf` — `fc65671f4c17927097e1037cee4e7e4a93d1676ca3c21c0e0206db6487138ab0`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### or_conviction_setaside-set

- canonical `data/rcap-all50/overlays/census-v1/or/or-conviction-setaside-set--official-pdf-fill/fixtures/canonical.pdf` — `a2d72e3f54c58a7590a681a93b015a82660056790077dd508b97d6d3e50c5b0b`
- boundary `data/rcap-all50/overlays/census-v1/or/or-conviction-setaside-set--official-pdf-fill/fixtures/boundary.pdf` — `2375b62449222756817f4338188fef6475f0f6323c237ba3f63a47c99396b360`
- expected pages 9 · requested scale 2.5
- built by (no builder lane recorded)

### pa_summary_conviction-set

- canonical `data/rcap-all50/overlays/census-v1/pa/pa-summary-conviction-set--official-pdf-fill/fixtures/rule-490-petition-canonical.pdf` — `1048b6276acfea471f1aee7839c4a638124c5ac10627c1e335ef7cecbf2074e0`
- boundary `data/rcap-all50/overlays/census-v1/pa/pa-summary-conviction-set--official-pdf-fill/fixtures/rule-490-petition-boundary.pdf` — `c15e8eb4bd78c65b2fac2bc130659cba2a19921fe81c449b7f64654bebeea808`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-tn-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/tn/rcap-tn-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `8648c793f39cd71a5b330f9cb9e2696fd955acb26f1f6851c78c601f11cb5f17`
- boundary `data/rcap-all50/overlays/census-v1/tn/rcap-tn-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `5f826ee4221be5cb88f114f4d49d4d7c4794c3cbc42798d6f684a2c0f27ac902`
- expected pages 75 · requested scale 2.5
- built by VF04

### ut_pet_conviction-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-conviction-set--official-pdf-fill/fixtures/canonical.pdf` — `ad594f0a40750195b67e36916f3628df5b96d337e4955c9063b415747d6e36d6`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-conviction-set--official-pdf-fill/fixtures/boundary.pdf` — `b3ba83a65754f96fe58083de62a3ce879654d6362170e11bae2f043e4c39a765`
- expected pages 19 · requested scale 2.5
- built by (no builder lane recorded)

### va_exp_nonconviction-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-exp-nonconviction-set--official-pdf-fill/fixtures/canonical.pdf` — `bb6747c8e639fc5310e718e9165352bd1a9204a92e82b5a10703c75590b65f6c`
- boundary `data/rcap-all50/overlays/census-v1/va/va-exp-nonconviction-set--official-pdf-fill/fixtures/boundary.pdf` — `dddcc00729d7adcb5803ae64f8cbaa33fa32e050a0afb13e0f12001dd83db885`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### vt_exp_deferred_sentence-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-exp-deferred-sentence-set--custom-pleading/fixtures/canonical.pdf` — `b4e5975feb1e5727502cf876d0265157e65b94b56769a3cf5a1ae9abd284f96d`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-exp-deferred-sentence-set--custom-pleading/fixtures/boundary.pdf` — `f8c1e0b0e58e3fd7f39f821ddf5dc7427c9f4b56202f881b97fae5a0f1b01f04`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### vt_seal_misdemeanor-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-misdemeanor-set--official-pdf-fill/fixtures/canonical.pdf` — `c37d27bad040121f3e677e81911745c6ea41f12fa1b8d7e986b74b9585d98a87`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-misdemeanor-set--official-pdf-fill/fixtures/boundary.pdf` — `f98d432c416ce087ee267333638df32c56cc4c68a7e6395f50d91465067bb269`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_cannabis-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/fixtures/crrlj-09-0800-canonical-filled.pdf` — `1b595c985753ae1d9583eb628ddac64117ea786ef72cca84df6329e99b781166`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/fixtures/crrlj-09-0800-boundary-filled.pdf` — `54e9c1592824d9c3f429c9acc0346b7c7899a5ecfd6e17bb4cfd816163412783`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_survivor_felony-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-felony-set--official-pdf-fill/fixtures/cr-08-0900-canonical-filled.pdf` — `3c40568209578ca04893ce46b64539a44af355dc11bd75b7daee75d215eda37f`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-felony-set--official-pdf-fill/fixtures/cr-08-0900-boundary-filled.pdf` — `2da76cc75f1ccd72cc12fdefef71edb90f477199877714e3263d9b46a4fccc8d`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### wi_nc_doj_fingerprint_removal-set

- canonical `data/rcap-all50/overlays/census-v1/wi/wi-nc-doj-fingerprint-removal-set--official-pdf-fill/fixtures/canonical.pdf` — `5b475b11c17c35f8edc37bada78716e8b14471b1951966604b7a678412fc6cc6`
- boundary `data/rcap-all50/overlays/census-v1/wi/wi-nc-doj-fingerprint-removal-set--official-pdf-fill/fixtures/boundary.pdf` — `3fd596ff112fd2f6ef55ca9a14c2fe0702eb107af9f715554b45503e3d7861f3`
- expected pages 2 · requested scale 2.5
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
FAMILIES ASSIGNED: 37
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
