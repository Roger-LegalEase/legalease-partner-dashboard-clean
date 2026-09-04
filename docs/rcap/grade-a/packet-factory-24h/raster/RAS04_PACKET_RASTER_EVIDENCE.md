# RAS04

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `0c2408592c05a59f053c348b3c5e0b2d21d99b1c`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (37)

### agency-application-treatment:obligation:track-only:CT:ct-destruction-request

- canonical `data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-only:ct:ct-destruction-request--official-pdf-fill/fixtures/canonical.pdf` — `f7104a55fed4eaa9e5055778f0970fb0a6f6806af31b9e81ff8f110c1bcfd221`
- boundary `data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-only:ct:ct-destruction-request--official-pdf-fill/fixtures/boundary.pdf` — `a26db59d0e573f3bba2b38e7e45fb91fe9f08e56ef40472159a9813ae44990c1`
- expected pages 2 · requested scale 2.5
- built by VF03

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

### ga-deaddocket-j3-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-deaddocket-j3-set--custom-pleading/fixtures/canonical.pdf` — `0860a52c8b3607370fee4757b2224ade00b514f13df43ee92589099c69a278fd`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-deaddocket-j3-set--custom-pleading/fixtures/boundary.pdf` — `65217c5b184350454e5dac9e0d0986162ac9edc600e1291c9638ea2572f95f96`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### ga-fugitive-j5-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-fugitive-j5-set--custom-pleading/fixtures/canonical.pdf` — `98b8c3f6db936186d9429707af2ef62c34a53d5c8d0ae1acb7d2c00ddfcc8d02`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-fugitive-j5-set--custom-pleading/fixtures/boundary.pdf` — `9480dd333b55a8adcd3cc6f6bfd2294de83ff187151182cce2a2910eaab738c7`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### ga-pardon-j7-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-pardon-j7-set--custom-pleading/fixtures/canonical.pdf` — `6a1c18a1587a4d7c8e686545c1a8c2b35bdb1347c8e5dd720115045b26ebc9fa`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-pardon-j7-set--custom-pleading/fixtures/boundary.pdf` — `48a85fc1d7793b1d76c30cf100da6a273b5b325ad5c162822bf6c5c747a6240d`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### ia-7251-set

- canonical `data/rcap-all50/overlays/census-v1/ia/ia-7251-set--official-pdf-fill/fixtures/canonical.pdf` — `00092fc77a11cfb8be6f6d4a49d85d8cb17c3263bb765a4c3a43df4d599e1097`
- boundary `data/rcap-all50/overlays/census-v1/ia/ia-7251-set--official-pdf-fill/fixtures/boundary.pdf` — `197519714a8e299244e2641b8c5fe2dab4a4ce67ec54da5ba13db842d1063bfe`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### il-exp-supervision-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-exp-supervision-set--official-pdf-fill/fixtures/canonical.pdf` — `330731d947e74856c6748be80041c3222d522f7ea421c2cacd5b02fd2beeb5fb`
- boundary `data/rcap-all50/overlays/census-v1/il/il-exp-supervision-set--official-pdf-fill/fixtures/boundary.pdf` — `df3754d4f3f15da219bba84363aa45fb2ad923416948dbe5fe02e1e709eb3cc2`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### ky_expungement_certification-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-expungement-certification-set--official-pdf-fill/fixtures/canonical.pdf` — `d57289137b84e372f3de9edefaf070b41e0b61c11b268c229a2119a2a74d15e2`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-expungement-certification-set--official-pdf-fill/fixtures/boundary.pdf` — `964a9b4b17a293235f9b75ec4e2a8581227850f590fa2338d84bcbec07e3f338`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### ma-expunge-mj-set

- canonical `data/rcap-all50/overlays/census-v1/ma/ma-expunge-mj-set--official-pdf-fill/fixtures/canonical.pdf` — `ceab4012296b4e132466a11ebc5239fd72ae553fd5a5554f7ddfc110fcb8f565`
- boundary `data/rcap-all50/overlays/census-v1/ma/ma-expunge-mj-set--official-pdf-fill/fixtures/boundary.pdf` — `ceab4012296b4e132466a11ebc5239fd72ae553fd5a5554f7ddfc110fcb8f565`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### me-screening-set

- canonical `data/rcap-all50/overlays/census-v1/me/me-screening-set--custom-pleading/fixtures/canonical.pdf` — `18921d618fb4a51d970ea9c5d40d427d364f42f87727c9824c21442f747fcef5`
- boundary `data/rcap-all50/overlays/census-v1/me/me-screening-set--custom-pleading/fixtures/boundary.pdf` — `421d3ab97ca8ba4c2cb7dfa678a3d88fb0f1bc0f9e92486ee7e4dfafb3c8da56`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### ms-diversion-set

- canonical `data/rcap-all50/overlays/census-v1/ms/ms-diversion-set--custom-pleading/fixtures/canonical.pdf` — `4d4923f05553c92b885056e5ba6e97cb631e04df3f55e0c45366351b6e8f7bcb`
- boundary `data/rcap-all50/overlays/census-v1/ms/ms-diversion-set--custom-pleading/fixtures/boundary.pdf` — `7d39bd412a5db6dd80c54c2d3f6dcc06b4927221eb8aa54e753ba05b01cc7938`
- expected pages 9 · requested scale 2.5
- built by (no builder lane recorded)

### ms-nonadj-set

- canonical `data/rcap-all50/overlays/census-v1/ms/ms-nonadj-set--custom-pleading/fixtures/canonical.pdf` — `b3488303e6e8ab6e344bb4ef96c9533c5adc1db5d04a2a66707d11f3e2d72527`
- boundary `data/rcap-all50/overlays/census-v1/ms/ms-nonadj-set--custom-pleading/fixtures/boundary.pdf` — `3c016942a2891e2b300a33247ec119ee2efce7e129c3ae0991d773152fba47de`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### ne-expunge-le-error-set

- canonical `data/rcap-all50/overlays/census-v1/ne/ne-expunge-le-error-set--custom-pleading/fixtures/canonical.pdf` — `b3ad99b4a1ae52c251751a357bb0dc4745dd1ceb6281ed03861cb9a0988a9be8`
- boundary `data/rcap-all50/overlays/census-v1/ne/ne-expunge-le-error-set--custom-pleading/fixtures/boundary.pdf` — `df7386e9e32ad77e32fcbfebc123a0a0d5a31e24a46ad9a02050216a227c8f69`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### nj_disorderly_persons-set

- canonical `data/rcap-all50/overlays/census-v1/nj/nj-disorderly-persons-set--official-pdf-fill/fixtures/cn-10557-canonical.pdf` — `c22cfd2d61ecd5f1b9f6b1eab65a5ad94b61aa6d3c7090950e54708a22b9630e`
- boundary `data/rcap-all50/overlays/census-v1/nj/nj-disorderly-persons-set--official-pdf-fill/fixtures/cn-10557-boundary.pdf` — `5415f4f4992e3229962bcf4b69e1d1b0a4388117c454723a95e4107a6a8f4693`
- expected pages 43 · requested scale 2.5
- built by (no builder lane recorded)

### nv_seal_probation_family-set

- canonical `data/rcap-all50/overlays/census-v1/nv/nv-seal-probation-family-set--custom-pleading/fixtures/canonical.pdf` — `533cf8ec8ac3447f89374639d0d8fbf33b5c453c1248bf33b263da56d99b88a7`
- boundary `data/rcap-all50/overlays/census-v1/nv/nv-seal-probation-family-set--custom-pleading/fixtures/boundary.pdf` — `d8ca462e258723fed6ecc268ec332a2d4bcc1d4c5f2c83cc025f7bcd8a35e1ca`
- expected pages 10 · requested scale 2.5
- built by VF02

### pa_490_nonconviction-set

- canonical `data/rcap-all50/overlays/census-v1/pa/pa-490-nonconviction-set--official-pdf-fill/fixtures/rule-490-petition-canonical.pdf` — `1048b6276acfea471f1aee7839c4a638124c5ac10627c1e335ef7cecbf2074e0`
- boundary `data/rcap-all50/overlays/census-v1/pa/pa-490-nonconviction-set--official-pdf-fill/fixtures/rule-490-petition-boundary.pdf` — `c15e8eb4bd78c65b2fac2bc130659cba2a19921fe81c449b7f64654bebeea808`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-ga-guidance-implementation

- canonical `data/rcap-all50/overlays/census-v1/ga/rcap-ga-guidance-implementation--custom-pleading/fixtures/canonical.pdf` — `ecfb488b8adf6cdadbbe1489d4a7fb9a982a18d7e9bebe90b0c019b80a756914`
- boundary `data/rcap-all50/overlays/census-v1/ga/rcap-ga-guidance-implementation--custom-pleading/fixtures/boundary.pdf` — `6866fd683dad67e2a3b4be8db3773e424411850487748f2692ecaf9253d12e24`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-wv-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/wv/rcap-wv-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `b7ada7da2dde97c38d45f15e691b0a2bbb1f2d8b9e52b47a3d17edebb829e8e4`
- boundary `data/rcap-all50/overlays/census-v1/wv/rcap-wv-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `4a1df2802934d5dc8c9579132e3f26417740c3823fc70a9fb2a25bc7768302ca`
- expected pages 11 · requested scale 2.5
- built by VF05

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
