# RAS03

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `e9ce0c44b10f1109469af9c0784b936951396f28`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (46)

### agency-application-treatment:obligation:research-decision-route:NY:ny_160_55_violation:dcjs_correction_submission

- canonical `data/rcap-all50/overlays/census-v1/ny/agency-application-treatment:obligation:research-decision-route:ny:ny-160-55-violation:dcjs-correction-submission--official-pdf-fill/fixtures/canonical.pdf` — `8abff71f85f09f7c248daa088286855253f3b95172837efa2fcd69a0c51e57ec`
- boundary `data/rcap-all50/overlays/census-v1/ny/agency-application-treatment:obligation:research-decision-route:ny:ny-160-55-violation:dcjs-correction-submission--official-pdf-fill/fixtures/boundary.pdf` — `c48c6e8cea3616ada41949087580f4db52ea94a0613fa55942f4f62de5fe4878`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

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

### ar-nonconviction-seal-set

- canonical `data/rcap-all50/overlays/census-v1/ar/ar-nonconviction-seal-set--official-pdf-fill/fixtures/canonical.pdf` — `28436bb896bcf2e8ca414f6a0635af19df9cf2b07317dbd5fe4a2614a7d591e5`
- boundary `data/rcap-all50/overlays/census-v1/ar/ar-nonconviction-seal-set--official-pdf-fill/fixtures/boundary.pdf` — `8737d13ab5c420759139c2f880bb4785013753d356729464350cfe6fe4f3d871`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### ca-1203-4-set

- canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-fulfilled-probation-canonical/cr-180-filled.pdf` — `9cc3b456c0b97e0555b53de0740d03368b98148480ae14d78b882ad9095b9ae3`
- boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-fulfilled-probation-boundary/cr-180-filled.pdf` — `34b962b636a4481c256162bbc2507572b4fcafe7edec34d866b57007d2acc458`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### ca-1203-4a-set

- canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-4a-set--official-pdf-fill/fixtures/pc-1203-4a-canonical/cr-180-filled.pdf` — `c7dc7526816439ce0a709709613936dcbe6a9f580d1a7dacc6a62a52f17ebd45`
- boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-4a-set--official-pdf-fill/fixtures/pc-1203-4a-boundary/cr-180-filled.pdf` — `86c5ef49a270c453ddbaca4d00d750b8db317a5fd45178a8f2989778ad0e7f4e`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### co_motion_seal_nonconviction-set

- canonical `data/rcap-all50/overlays/census-v1/co/co-motion-seal-nonconviction-set--official-pdf-fill/fixtures/canonical.pdf` — `6c3d8f4482dc4de44cb817f486cc2ad982aaf79b3d6f79cc75696d22facb07d7`
- boundary `data/rcap-all50/overlays/census-v1/co/co-motion-seal-nonconviction-set--official-pdf-fill/fixtures/boundary.pdf` — `1fb4e7b9faeb8ee7f06837b94993c071629b47abb59138ceaa7efa1c2d43a6f4`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:research-decision-route:NY:ny_160_55_violation:sentencing_court_transmission_correction_request

- canonical `data/rcap-all50/overlays/census-v1/ny/composed-treatment:obligation:research-decision-route:ny:ny-160-55-violation:sentencing-court-transmission-correction-request--custom-pleading/fixtures/canonical.pdf` — `33b7a79fa4e548efce7fa838619cb75512cf83dce3345e291baa28277d84566f`
- boundary `data/rcap-all50/overlays/census-v1/ny/composed-treatment:obligation:research-decision-route:ny:ny-160-55-violation:sentencing-court-transmission-correction-request--custom-pleading/fixtures/boundary.pdf` — `852ac343783cda7d51a7f4c7850d5402d2663806c6a308138b51caf8737e3991`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:GA:youthful-first-offender-restriction-route

- canonical `data/rcap-all50/overlays/census-v1/ga/composed-treatment:obligation:runtime-only:ga:youthful-first-offender-restriction-route--custom-pleading/fixtures/canonical.pdf` — `61ebc64377ad224630a7a20ced780cc0f6437054614cbe1001d8aab2a0799b61`
- boundary `data/rcap-all50/overlays/census-v1/ga/composed-treatment:obligation:runtime-only:ga:youthful-first-offender-restriction-route--custom-pleading/fixtures/boundary.pdf` — `3c7ea1d4d7a4f492d64623e0b23bbf89b30a1de3651de68f84ba7c679e27a705`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:MS:uncharged-misdemeanor-immediate-dismissal-branch-99-15-59

- canonical `data/rcap-all50/overlays/census-v1/ms/composed-treatment:obligation:runtime-only:ms:uncharged-misdemeanor-immediate-dismissal-branch-99-15-59--custom-pleading/fixtures/canonical.pdf` — `606e3c9d5e6b83da8422a9bb01138b5937db3e5726b64975674ffda137c448ac`
- boundary `data/rcap-all50/overlays/census-v1/ms/composed-treatment:obligation:runtime-only:ms:uncharged-misdemeanor-immediate-dismissal-branch-99-15-59--custom-pleading/fixtures/boundary.pdf` — `ed06c2dcd41ee0c4a8692ae32aee8e0afabd2ae0a5c8fd3f6e178434b42e8c8e`
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

### id_set_aside_dismissal-set

- canonical `data/rcap-all50/overlays/census-v1/id/id-set-aside-dismissal-set--custom-pleading/fixtures/canonical.pdf` — `7773edfbbad30e588ee71061cd226d6c8385e5b35d3d8fa40d43497507dbddbc`
- boundary `data/rcap-all50/overlays/census-v1/id/id-set-aside-dismissal-set--custom-pleading/fixtures/boundary.pdf` — `69627731b56805a3b8a37b24c7cfc9b72a9b99d87a09cf85e44e05e0c9cbbf5f`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### in_arrest_no_charges-set

- canonical `data/rcap-all50/overlays/census-v1/in/in-arrest-no-charges-set--official-pdf-fill/fixtures/packet-canonical-filled.pdf` — `2f14e1a7c0e0bf6f162b0385e310a2ce12b9872e13b4bb6b85e21ff139bb9112`
- boundary `data/rcap-all50/overlays/census-v1/in/in-arrest-no-charges-set--official-pdf-fill/fixtures/packet-boundary-filled.pdf` — `a7b34ccf21175518b5deb609818af3b04feda9c3280d0aaa3862b24714d9df3d`
- expected pages 15 · requested scale 2.5
- built by (no builder lane recorded)

### in_section1_petition-set

- canonical `data/rcap-all50/overlays/census-v1/in/in-section1-petition-set--official-pdf-fill/fixtures/packet-canonical-filled.pdf` — `f3cfeb3257e31a90b8f29f5bc264e9da1ad0e390f53e1d3c5950b20b4cbc0241`
- boundary `data/rcap-all50/overlays/census-v1/in/in-section1-petition-set--official-pdf-fill/fixtures/packet-boundary-filled.pdf` — `a7b34ccf21175518b5deb609818af3b04feda9c3280d0aaa3862b24714d9df3d`
- expected pages 15 · requested scale 2.5
- built by VF02

### ky_void_seal_controlled_substance-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-void-seal-controlled-substance-set--custom-pleading/fixtures/canonical.pdf` — `e7419541f263c4fdc41bbcea0d45d4dd748a35830e722c02f88afd412c646037`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-void-seal-controlled-substance-set--custom-pleading/fixtures/boundary.pdf` — `0b864b30e140fd8b53adc948f6b294c093095e133b489dab27a745dd632db12f`
- expected pages 4 · requested scale 2.5
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

### nd-nonconviction-close-petition-set

- canonical `data/rcap-all50/overlays/census-v1/nd/nd-nonconviction-close-petition-set--official-pdf-fill/fixtures/packet-canonical-filled.pdf` — `2211ad2f8597d79a79151bc5850b222a664ba1ab935abb2d916c43612dddea58`
- boundary `data/rcap-all50/overlays/census-v1/nd/nd-nonconviction-close-petition-set--official-pdf-fill/fixtures/packet-boundary-filled.pdf` — `7f178d4a93edc84c72ea8123715f51da16b7bc1c91d709f575451101052ae747`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### nh_petition_vacated-set

- canonical `data/rcap-all50/overlays/census-v1/nh/nh-petition-vacated-set--official-pdf-fill/fixtures/canonical.pdf` — `baca3acfdda3d752ab52c95b636a1015d6eeabcc0027c94f553e79b2b06bd3ae`
- boundary `data/rcap-all50/overlays/census-v1/nh/nh-petition-vacated-set--official-pdf-fill/fixtures/boundary.pdf` — `b983b71779da56befbda8f9679aa3f3d69b0e6b19b7424d05880d09bf343781f`
- expected pages 9 · requested scale 2.5
- built by VF03

### nj_indictable_conviction-set

- canonical `data/rcap-all50/overlays/census-v1/nj/nj-indictable-conviction-set--official-pdf-fill/fixtures/cn-10557-canonical.pdf` — `343407a30f38beffccde4c51b8060065bd6eed27356a999d8e321e01a1baca33`
- boundary `data/rcap-all50/overlays/census-v1/nj/nj-indictable-conviction-set--official-pdf-fill/fixtures/cn-10557-boundary.pdf` — `6256ba7f621c25a8f8a501c0a9af0191c151074fc8d3b2bb6ff2ef36354788ea`
- expected pages 43 · requested scale 2.5
- built by (no builder lane recorded)

### nm_release_without_conviction-set

- canonical `data/rcap-all50/overlays/census-v1/nm/nm-release-without-conviction-set--official-pdf-fill/fixtures/canonical.pdf` — `318378ba712915646513d90bfe083011a44927f47b1e2f5a76583e8283a84b66`
- boundary `data/rcap-all50/overlays/census-v1/nm/nm-release-without-conviction-set--official-pdf-fill/fixtures/boundary.pdf` — `ae38969cccd6defd1d87ecb308f9338bc5557f811bfa42914c31f0bbfac177a4`
- expected pages 21 · requested scale 2.5
- built by VF01

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

### rcap-ms-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/ms/rcap-ms-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `fc9ad883f98d6203f58ab96aa66376e77241ae12197535ce8415a46bb7647d2c`
- boundary `data/rcap-all50/overlays/census-v1/ms/rcap-ms-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `28ee12ccd0e86322e355df6bd6b066dc0ffa58e8f155afcdfbf69f65c89470d4`
- expected pages 25 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-sc-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/sc/rcap-sc-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `be6c8dd75e58feaff3d5049c3c4986b99fd39286bfd150855f2cd54eb9551f9b`
- boundary `data/rcap-all50/overlays/census-v1/sc/rcap-sc-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `b808c99ade96a876097f1086585818b63824cd79b20f0407cc8169fe6ce1f6a5`
- expected pages 64 · requested scale 2.5
- built by (no builder lane recorded)

### ri_deferred_sentence-set

- canonical `data/rcap-all50/overlays/census-v1/ri/ri-deferred-sentence-set--official-pdf-fill/fixtures/canonical.pdf` — `757582d8721aa4ed71a6e94e95418328effc80877121367d5f054290af28242a`
- boundary `data/rcap-all50/overlays/census-v1/ri/ri-deferred-sentence-set--official-pdf-fill/fixtures/boundary.pdf` — `e2ba9a57686a32f9cc1d9be2c55872aa59d8043002658482f3c12f2166787dd6`
- expected pages 14 · requested scale 2.5
- built by VF03

### ri_multiple_misdemeanors-set

- canonical `data/rcap-all50/overlays/census-v1/ri/ri-multiple-misdemeanors-set--official-pdf-fill/fixtures/canonical.pdf` — `be2b21a030d40a9729cd0029aeae04f5e657962001ef51cd306bed11469590b1`
- boundary `data/rcap-all50/overlays/census-v1/ri/ri-multiple-misdemeanors-set--official-pdf-fill/fixtures/boundary.pdf` — `ca248b8836b0c0caef73081d96e15fbcf30237ad7988a75be9eb0f00e0781a48`
- expected pages 13 · requested scale 2.5
- built by VF06

### tx_nd_dwi_deferred-set

- canonical `data/rcap-all50/overlays/census-v1/tx/tx-nd-dwi-deferred-set--official-pdf-fill/fixtures/canonical.pdf` — `7cb3e892bf15353ad55ac1b70b922fdc3c83e173017c0640512700f16bdbed2b`
- boundary `data/rcap-all50/overlays/census-v1/tx/tx-nd-dwi-deferred-set--official-pdf-fill/fixtures/boundary.pdf` — `2ccf4e37ad72ce87502b3c6a9eb6c891c99ce2a6dbfaad9568d1117b35a560c7`
- expected pages 24 · requested scale 2.5
- built by VF02

### ut_pet_acquittal-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-acquittal-set--official-pdf-fill/fixtures/canonical.pdf` — `b66141455c34b548b8ce48bd3c94d73298b588f8cef604a757d154362971c6a5`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-acquittal-set--official-pdf-fill/fixtures/boundary.pdf` — `9a3c27215e66dedbfac637d63417a8459f5600e534aee825f940900aef6f02d4`
- expected pages 19 · requested scale 2.5
- built by (no builder lane recorded)

### va_exp_absolute_pardon-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-exp-absolute-pardon-set--custom-pleading/fixtures/canonical.pdf` — `b56af08c1b796b78a26ebac56a3580299e5e06022976941ba0b7fd68cf810188`
- boundary `data/rcap-all50/overlays/census-v1/va/va-exp-absolute-pardon-set--custom-pleading/fixtures/boundary.pdf` — `f7691bc33addbaef446ccccb09c551e673bd5369410c363044794a429fea29eb`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### va_seal_enumerated_seven_year-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-seal-enumerated-seven-year-set--official-pdf-fill/fixtures/canonical.pdf` — `859656e4ae155c94ad78cef9a1f017b6411bde531a86f15cd01c749c2d452ee6`
- boundary `data/rcap-all50/overlays/census-v1/va/va-seal-enumerated-seven-year-set--official-pdf-fill/fixtures/boundary.pdf` — `7e68919e56c3e4b789e376fdd7e4fad8cdfc27b0191ca7e5be388118c9686669`
- expected pages 10 · requested scale 2.5
- built by (no builder lane recorded)

### vt_seal_dui-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-dui-set--official-pdf-fill/fixtures/canonical.pdf` — `81525fd23e9489ce1225aaf953e28c0e68ad64c376dccf9143a5c14920bde942`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-dui-set--official-pdf-fill/fixtures/boundary.pdf` — `8f0058c992eaf6fec640b7519935f3e0d4c119348f90d7042dd1ee6b53501404`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### vt_seal_under_25-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-under-25-set--custom-pleading/fixtures/canonical.pdf` — `cd71dce93a3404558c3d2fc33e55a3838867868781c801c7487ebad8ea049a07`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-under-25-set--custom-pleading/fixtures/boundary.pdf` — `ddf00f9ef8f86bb54495dd12a379d7edfc906a03c6e94a37a3b1e8a8df832492`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_felony-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-felony-set--official-pdf-fill/fixtures/canonical.pdf` — `585a7acff41609d13baeea797fd6477fc78bd6acb5c5888a05e640cb3f618c56`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-felony-set--official-pdf-fill/fixtures/boundary.pdf` — `bcc6e5e71d3afbae64f4f5dd41e32c20bc7f8f14e38c5bba59c26a49d801bce8`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_survivor_misdemeanor-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-misdemeanor-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` — `846360e75578ce6233dba77b03b25545a529b50cd553ad31f88d3008b429a6ad`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-misdemeanor-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` — `75fac347051d6b710015ef5bbcc10b43df0a1de59078195ede75a744f4c42b77`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### wv_conv_multiple_misdemeanors-set

- canonical `data/rcap-all50/overlays/census-v1/wv/wv-conv-multiple-misdemeanors-set--official-pdf-fill/fixtures/canonical.pdf` — `31a49f2d2216fd2c7a1327aa7f95f3214b8a760e9d46c05517d764d7bd60f90d`
- boundary `data/rcap-all50/overlays/census-v1/wv/wv-conv-multiple-misdemeanors-set--official-pdf-fill/fixtures/boundary.pdf` — `2a0b701a523d3f7c71f6327c6bd4384cbf438689d0be42d30b869f218f6e1dbe`
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
FAMILIES ASSIGNED: 46
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
