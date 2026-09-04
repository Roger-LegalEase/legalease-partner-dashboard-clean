# RAS03

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `5b94262e23fb7abdfe6a6a7c656a901ed8a60e92`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (49)

### agency-application-treatment:obligation:unattached-decision-route:AK:ak-correct-record

- canonical `data/rcap-all50/overlays/census-v1/ak/agency-application-treatment:obligation:unattached-decision-route:ak:ak-correct-record--official-pdf-fill/fixtures/canonical.pdf` — `298452333a1bc813ccb8924fbbb0bf977aba13c36eb26152350b8c977cd1e3e4`
- boundary `data/rcap-all50/overlays/census-v1/ak/agency-application-treatment:obligation:unattached-decision-route:ak:ak-correct-record--official-pdf-fill/fixtures/boundary.pdf` — `c709cc48b6019c276ca9cce7b66c5f20e737286d8947250b2b4fd0af5babb9ce`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### ak-tf805-set

- canonical `data/rcap-all50/overlays/census-v1/ak/ak-tf805-set--official-pdf-fill/fixtures/tf805-canonical-filled.pdf` — `bffda336fac95d0980e0a9130913c9189077e1fdc3f05b5a1d55065e5f5c9703`
- boundary `data/rcap-all50/overlays/census-v1/ak/ak-tf805-set--official-pdf-fill/fixtures/tf805-boundary-filled.pdf` — `5dd98fef218f8310a8e46e41a9ca83e53d5295507bac0c82fce77e44f96d0ff5`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### al-misd-conviction-set

- canonical `data/rcap-all50/overlays/census-v1/al/al-misd-conviction-set--official-pdf-fill/fixtures/canonical.pdf` — `cb5ce94c56297469ffc63931234fd48f81e37aa2415f2fe93039792125d2dc3c`
- boundary `data/rcap-all50/overlays/census-v1/al/al-misd-conviction-set--official-pdf-fill/fixtures/boundary.pdf` — `e6b6d470a9c3b65491db99d85f9ceca919d63653196bde0370831a67be75076c`
- expected pages 11 · requested scale 2.5
- built by FIX05

### ar-arrest-seal-set

- canonical `data/rcap-all50/overlays/census-v1/ar/ar-arrest-seal-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `78ef189e981b35fec69688cc6d3181df245b309e7405c954fcabd503e426bea5`
- boundary `data/rcap-all50/overlays/census-v1/ar/ar-arrest-seal-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `fb32678b598155af6d1436eeb51098cb665fe2f1711bd826ec2b980b1c30a811`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### ar-pardon-seal-set

- canonical `data/rcap-all50/overlays/census-v1/ar/ar-pardon-seal-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `3b1576d92c2008ba2548522fd16e8025b3e4cbff1f0f40343577ab29477af9ea`
- boundary `data/rcap-all50/overlays/census-v1/ar/ar-pardon-seal-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `35c2c5cbf9922bed57f1e8da627bdb2b0f554dbcacf5f6de29b5390d565a36c4`
- expected pages 4 · requested scale 2.5
- built by FIX04

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

- canonical `data/rcap-all50/overlays/census-v1/ny/composed-treatment:obligation:research-decision-route:ny:ny-160-55-violation:sentencing-court-transmission-correction-request--custom-pleading/fixtures/canonical.pdf` — `9a3e8f36ad9c4f83bdd11f4771d4bcb84dcecd6c5eeb407c3319ab0d0ef6fd5a`
- boundary `data/rcap-all50/overlays/census-v1/ny/composed-treatment:obligation:research-decision-route:ny:ny-160-55-violation:sentencing-court-transmission-correction-request--custom-pleading/fixtures/boundary.pdf` — `f623426b5f191878a1d01c0531e43df28edceb9c42b3f3bef2617ecbd3b1acf2`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:GA:youthful-first-offender-restriction-route

- canonical `data/rcap-all50/overlays/census-v1/ga/composed-treatment:obligation:runtime-only:ga:youthful-first-offender-restriction-route--custom-pleading/fixtures/canonical.pdf` — `b35a0f04979f25912049b4d2d39f27c0b23223b497f30b78b4f0afa7c9eca5de`
- boundary `data/rcap-all50/overlays/census-v1/ga/composed-treatment:obligation:runtime-only:ga:youthful-first-offender-restriction-route--custom-pleading/fixtures/boundary.pdf` — `e3352f6da6302d0074372e3a9d3bab0adbe64b4e42096470cb3ade5ad2f45539`
- expected pages 4 · requested scale 2.5
- built by FIX06

### composed-treatment:obligation:runtime-only:MS:uncharged-misdemeanor-immediate-dismissal-branch-99-15-59

- canonical `data/rcap-all50/overlays/census-v1/ms/composed-treatment:obligation:runtime-only:ms:uncharged-misdemeanor-immediate-dismissal-branch-99-15-59--custom-pleading/fixtures/canonical.pdf` — `606e3c9d5e6b83da8422a9bb01138b5937db3e5726b64975674ffda137c448ac`
- boundary `data/rcap-all50/overlays/census-v1/ms/composed-treatment:obligation:runtime-only:ms:uncharged-misdemeanor-immediate-dismissal-branch-99-15-59--custom-pleading/fixtures/boundary.pdf` — `ed06c2dcd41ee0c4a8692ae32aee8e0afabd2ae0a5c8fd3f6e178434b42e8c8e`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:OK:juvenile-record-expungement

- canonical `data/rcap-all50/overlays/census-v1/ok/composed-treatment:obligation:runtime-only:ok:juvenile-record-expungement--custom-pleading/fixtures/canonical.pdf` — `b126807ef7de8f9c35945d926612bf6b116e99045b307bc9d7535307b9ef3179`
- boundary `data/rcap-all50/overlays/census-v1/ok/composed-treatment:obligation:runtime-only:ok:juvenile-record-expungement--custom-pleading/fixtures/boundary.pdf` — `7ec9bdeb42a3fb3657aed1d6d1e8eeb01a2ee98935d08f7541174b1a31008359`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708

- canonical `data/rcap-all50/overlays/census-v1/wy/composed-treatment:obligation:runtime-only:wy:human-trafficking-victim-vacatur-w-s-6-2-708--custom-pleading/fixtures/canonical.pdf` — `6d6e3190303b0aec3a12c009f2e1f3fea579e70a9739c7916536f9119a6b9ecf`
- boundary `data/rcap-all50/overlays/census-v1/wy/composed-treatment:obligation:runtime-only:wy:human-trafficking-victim-vacatur-w-s-6-2-708--custom-pleading/fixtures/boundary.pdf` — `61dc959c94e8669b1b7844c1adca0353e66719a822cd97a3af26b8a612538241`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### ct-cleanslate-petition-set

- canonical `data/rcap-all50/overlays/census-v1/ct/ct-cleanslate-petition-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `d44ace77326e51a697450d18a033eadccf308b32d5d426ce5c73ffc989546e06`
- boundary `data/rcap-all50/overlays/census-v1/ct/ct-cleanslate-petition-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `e190d7304260be94e84e46fb18710ee85e1f5a5314e7a7a5a5dd5eeb33b3d052`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### ct-pardon-erasure-set

- canonical `data/rcap-all50/overlays/census-v1/ct/ct-pardon-erasure-set--custom-pleading/fixtures/canonical.pdf` — `fb22c04456ff31e1526fcc6127330c67618fdd5378da60fd512b4be51b7c410b`
- boundary `data/rcap-all50/overlays/census-v1/ct/ct-pardon-erasure-set--custom-pleading/fixtures/boundary.pdf` — `dc26b69ffdb89472c0d674378196a1e04664caf06f6c724d43117d80f28838ef`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### dc_seal_conviction-set

- canonical `data/rcap-all50/overlays/census-v1/dc/dc-seal-conviction-set--custom-pleading/fixtures/canonical-misdemeanor_5yr.pdf` — `069a85420cd083de902918e7ee98bd475336a23273e6dea0dde23eb3fbb8f088`
- boundary `data/rcap-all50/overlays/census-v1/dc/dc-seal-conviction-set--custom-pleading/fixtures/boundary-misdemeanor_5yr.pdf` — `3471ea08eb2b329dbc91501b180738f77b2e8b3265925ef92574385ea5931629`
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

### ga-seal-m-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-seal-m-set--custom-pleading/fixtures/canonical.pdf` — `9b57311c3b69ac540a711dd174de9bec6d5b1b1fd7870dde4cbb592e2edf4796`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-seal-m-set--custom-pleading/fixtures/boundary.pdf` — `09abd2c2eacdc14fe2840688202ccf62d8506dd19f801e926cb2614c5b420182`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### id_clean_slate_shield-set

- canonical `data/rcap-all50/overlays/census-v1/id/id-clean-slate-shield-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `fd888d5f7773d9a2c645dc38fc594d2c95f43e263ba9f35ca81b17ad8f24aa80`
- boundary `data/rcap-all50/overlays/census-v1/id/id-clean-slate-shield-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `ccfdf3fb1bf9e0ba3cd5b0e31bc44b7dd2ddd71da9b7984fb17e8d0ffa8afedf`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### il-cannabis-vacate-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-cannabis-vacate-set--official-pdf-fill/fixtures/canonical.pdf` — `193f946a37e357f34e4453c30efaa00913026e972b7f02c1da2c620ac86544de`
- boundary `data/rcap-all50/overlays/census-v1/il/il-cannabis-vacate-set--official-pdf-fill/fixtures/boundary.pdf` — `3782c17a6e8a069cb6d666cf92c885d646558e7235333929db1fa212edf41055`
- expected pages 11 · requested scale 2.5
- built by FIX08

### il-exp-qualprob-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-exp-qualprob-set--official-pdf-fill/fixtures/canonical.pdf` — `24ae04d570ecd6e796f30b580b68d22e8870e1ea2a321204c266fc55941e6fe3`
- boundary `data/rcap-all50/overlays/census-v1/il/il-exp-qualprob-set--official-pdf-fill/fixtures/boundary.pdf` — `21731bad31dd1cb7340d13bbdfae9d5ec3d3b914948ad25b16d1240fbf93f62e`
- expected pages 13 · requested scale 2.5
- built by FIX08

### il-seal-3yr-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-seal-3yr-set--official-pdf-fill/fixtures/canonical.pdf` — `2d81bc640de80d14353af9eb19506287c5666fd289659ab07053ddae5561727b`
- boundary `data/rcap-all50/overlays/census-v1/il/il-seal-3yr-set--official-pdf-fill/fixtures/boundary.pdf` — `8ff2e2249f0fe8336bd6c5288e68f214206b51dfe75a14abacbb6c6bd35d832f`
- expected pages 13 · requested scale 2.5
- built by FIX01

### in_infraction_nondisclosure-set

- canonical `data/rcap-all50/overlays/census-v1/in/in-infraction-nondisclosure-set--custom-pleading/fixtures/canonical.pdf` — `f4a0abb08d6f636e8ab5271376fc6034ce0857421b2ed156d77ae6c820c6c2e7`
- boundary `data/rcap-all50/overlays/census-v1/in/in-infraction-nondisclosure-set--custom-pleading/fixtures/boundary.pdf` — `bcd0160894c9eb7a445e2a9961fe82abc2dfca54ba804531febc78a04c04e9cf`
- expected pages 4 · requested scale 2.5
- built by VF01

### ky_felony_vacatur_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-felony-vacatur-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `581dee480d77d2f226b907b017c4209de89d4f4346f654256ed11ba24d32e54e`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-felony-vacatur-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `3847941126c39f4c5963e2fa06bbccbaf5936a39551118fc6df429ff21bca91b`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### ma-expunge-time-set

- canonical `data/rcap-all50/overlays/census-v1/ma/ma-expunge-time-set--official-pdf-fill/fixtures/canonical.pdf` — `45e2589a73f35fd2cda9eff1de20a75807d6f66404d7d0ad3c26a052174f3985`
- boundary `data/rcap-all50/overlays/census-v1/ma/ma-expunge-time-set--official-pdf-fill/fixtures/boundary.pdf` — `a995e56b6f78cbda7932996029c708e57c39a2251db833dc91eb648534797964`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### me-seal-prost-set

- canonical `data/rcap-all50/overlays/census-v1/me/me-seal-prost-set--official-pdf-fill/fixtures/cr289-canonical-filled.pdf` — `ce2e6bde63ac9524927ace30a128938174ff79db091ec8db26a4ad3d307daaf7`
- boundary `data/rcap-all50/overlays/census-v1/me/me-seal-prost-set--official-pdf-fill/fixtures/cr289-boundary-filled.pdf` — `c56d43ba1b2341526fa7b7c17115b77435a1e030f70e2dfc93c76815f9cc2695`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### ms-fel-set

- canonical `data/rcap-all50/overlays/census-v1/ms/ms-fel-set--custom-pleading/fixtures/canonical.pdf` — `1a7f256027a1b0ae765ba1eb60af3fe526262538178e9224c50075220d5f0c6a`
- boundary `data/rcap-all50/overlays/census-v1/ms/ms-fel-set--custom-pleading/fixtures/boundary.pdf` — `343c2fd83679b7a62ff83bca3f04981553b73c259e01c4e48e535331132ade22`
- expected pages 10 · requested scale 2.5
- built by (no builder lane recorded)

### ms-nonconv-set

- canonical `data/rcap-all50/overlays/census-v1/ms/ms-nonconv-set--custom-pleading/fixtures/canonical.pdf` — `4ae768075a7f5aa534813a2303b24260e2b08308c0f3c7f18a4cc21531812ecf`
- boundary `data/rcap-all50/overlays/census-v1/ms/ms-nonconv-set--custom-pleading/fixtures/boundary.pdf` — `c52fc25286a857e49767228c88647f6b8f9364cff08dd4354fd8750294dffa13`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### ne-expunge-le-error-set

- canonical `data/rcap-all50/overlays/census-v1/ne/ne-expunge-le-error-set--custom-pleading/fixtures/canonical.pdf` — `b3ad99b4a1ae52c251751a357bb0dc4745dd1ceb6281ed03861cb9a0988a9be8`
- boundary `data/rcap-all50/overlays/census-v1/ne/ne-expunge-le-error-set--custom-pleading/fixtures/boundary.pdf` — `df7386e9e32ad77e32fcbfebc123a0a0d5a31e24a46ad9a02050216a227c8f69`
- expected pages 4 · requested scale 2.5
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

### official-form-treatment:obligation:research-decision-route:AL:al-olr

- canonical `data/rcap-all50/overlays/census-v1/al/official-form-treatment:obligation:research-decision-route:al:al-olr--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `9414ff9d97234b9d98f6362c198acec77d7921c789a273f990a927bb487e8449`
- boundary `data/rcap-all50/overlays/census-v1/al/official-form-treatment:obligation:research-decision-route:al:al-olr--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `6b04f5d39f52f7cdea4c5771b7df24c43a2f266b67c986514d9e490d5afdc6bc`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### pa_790_nonconviction-set

- canonical `data/rcap-all50/overlays/census-v1/pa/pa-790-nonconviction-set--official-pdf-fill/fixtures/rule-790-petition-canonical.pdf` — `fbdd5610da403add33e1d65db44f7d2fea1bec6c8d758f53dfd7223ecb048594`
- boundary `data/rcap-all50/overlays/census-v1/pa/pa-790-nonconviction-set--official-pdf-fill/fixtures/rule-790-petition-boundary.pdf` — `20eb93f44c0adbfdd63091caf129099346f0f75cd96b84818dd18b083ba3c253`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### pa_summary_conviction-set

- canonical `data/rcap-all50/overlays/census-v1/pa/pa-summary-conviction-set--official-pdf-fill/fixtures/rule-490-petition-canonical.pdf` — `1048b6276acfea471f1aee7839c4a638124c5ac10627c1e335ef7cecbf2074e0`
- boundary `data/rcap-all50/overlays/census-v1/pa/pa-summary-conviction-set--official-pdf-fill/fixtures/rule-490-petition-boundary.pdf` — `c15e8eb4bd78c65b2fac2bc130659cba2a19921fe81c449b7f64654bebeea808`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-nd-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/nd/rcap-nd-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `4425d89d2dec6b10ac70706420c99af7ea6573b6875d7e1d4222b32463cb9e02`
- boundary `data/rcap-all50/overlays/census-v1/nd/rcap-nd-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `449aedcda75058911af1c04520de2be08d10b35a94e40688891bf54a416c870e`
- expected pages 35 · requested scale 2.5
- built by FIX07

### rcap-sc-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/sc/rcap-sc-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `be6c8dd75e58feaff3d5049c3c4986b99fd39286bfd150855f2cd54eb9551f9b`
- boundary `data/rcap-all50/overlays/census-v1/sc/rcap-sc-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `b808c99ade96a876097f1086585818b63824cd79b20f0407cc8169fe6ce1f6a5`
- expected pages 64 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-wi-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/wi/rcap-wi-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `fa75790c3ef35af41d142cade19bf6def68149e3767e9b14eb73b1bd45414dc9`
- boundary `data/rcap-all50/overlays/census-v1/wi/rcap-wi-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `84297a24847a4a9555b92a8ac138d101fffd03331e71be7229efb72e50f1b5d8`
- expected pages 6 · requested scale 2.5
- built by FIX04

### sc_17_22_950_summary-set

- canonical `data/rcap-all50/overlays/census-v1/sc/sc-17-22-950-summary-set--official-pdf-fill/fixtures/canonical.pdf` — `f373d91a18f015ebc7f3c7a9e7d71c1e47a469e830977555c937f4241cc8c5a1`
- boundary `data/rcap-all50/overlays/census-v1/sc/sc-17-22-950-summary-set--official-pdf-fill/fixtures/boundary.pdf` — `42e3e5e2b24e0f2b8064fef187ab2331c5914710c43899d2abd99c0a7bbfeaf9`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### tx_nd_dwi_deferred-set

- canonical `data/rcap-all50/overlays/census-v1/tx/tx-nd-dwi-deferred-set--official-pdf-fill/fixtures/canonical.pdf` — `a991f3b4e6a27ebf11bd52ef3370f7e0e4d2b63282ea57585932a172ed0d98e6`
- boundary `data/rcap-all50/overlays/census-v1/tx/tx-nd-dwi-deferred-set--official-pdf-fill/fixtures/boundary.pdf` — `6892d5d7e21334cc8a4f30507e40db5f5ec8759b7043701ab04cf5ead4c909cd`
- expected pages 24 · requested scale 2.5
- built by FIX05

### ut_pet_conviction-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-conviction-set--official-pdf-fill/fixtures/canonical.pdf` — `ad594f0a40750195b67e36916f3628df5b96d337e4955c9063b415747d6e36d6`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-conviction-set--official-pdf-fill/fixtures/boundary.pdf` — `b3ba83a65754f96fe58083de62a3ce879654d6362170e11bae2f043e4c39a765`
- expected pages 19 · requested scale 2.5
- built by (no builder lane recorded)

### ut_pet_no_charges-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-no-charges-set--official-pdf-fill/fixtures/canonical.pdf` — `1ee8fad3cd777f6f476b159be35dea893a47477d91ca70e3518e53bcbfffe143`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-no-charges-set--official-pdf-fill/fixtures/boundary.pdf` — `3686f4f02146dc1e0e5ea105d219e1f9497dcb514a4345fce76f029f7f1c6485`
- expected pages 19 · requested scale 2.5
- built by FIX04

### va_exp_nonconviction-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-exp-nonconviction-set--official-pdf-fill/fixtures/canonical.pdf` — `bb6747c8e639fc5310e718e9165352bd1a9204a92e82b5a10703c75590b65f6c`
- boundary `data/rcap-all50/overlays/census-v1/va/va-exp-nonconviction-set--official-pdf-fill/fixtures/boundary.pdf` — `dddcc00729d7adcb5803ae64f8cbaa33fa32e050a0afb13e0f12001dd83db885`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### va_seal_petition_misdemeanor-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-seal-petition-misdemeanor-set--official-pdf-fill/fixtures/canonical.pdf` — `8c6b3c46f9fc874c55aa27764768693b419443970c102487adb8446fc2678c30`
- boundary `data/rcap-all50/overlays/census-v1/va/va-seal-petition-misdemeanor-set--official-pdf-fill/fixtures/boundary.pdf` — `b8a85562ada431804a4da6b9e6943096934ae812507e57a39fa103fce2892989`
- expected pages 9 · requested scale 2.5
- built by FIX05

### vt_seal_dui-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-dui-set--official-pdf-fill/fixtures/canonical.pdf` — `81525fd23e9489ce1225aaf953e28c0e68ad64c376dccf9143a5c14920bde942`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-dui-set--official-pdf-fill/fixtures/boundary.pdf` — `8f0058c992eaf6fec640b7519935f3e0d4c119348f90d7042dd1ee6b53501404`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### vt_seal_pardon-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-pardon-set--official-pdf-fill/fixtures/canonical.pdf` — `81525fd23e9489ce1225aaf953e28c0e68ad64c376dccf9143a5c14920bde942`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-pardon-set--official-pdf-fill/fixtures/boundary.pdf` — `8f0058c992eaf6fec640b7519935f3e0d4c119348f90d7042dd1ee6b53501404`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_felony-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-felony-set--official-pdf-fill/fixtures/cr-08-0900-canonical-filled.pdf` — `5cf52336e302beedc601c9bb7ad947955b5a123a187fcad32d4635ebaf593010`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-felony-set--official-pdf-fill/fixtures/cr-08-0900-boundary-filled.pdf` — `1569728067f189c0b6da9bbf4d06ff1305fb8ce3adbb59a586f0cdac0a19ae3b`
- expected pages 3 · requested scale 2.5
- built by FIX08

### wa_vac_survivor_misdemeanor-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-misdemeanor-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` — `846360e75578ce6233dba77b03b25545a529b50cd553ad31f88d3008b429a6ad`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-misdemeanor-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` — `75fac347051d6b710015ef5bbcc10b43df0a1de59078195ede75a744f4c42b77`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### wv_conv_multiple_misdemeanors-set

- canonical `data/rcap-all50/overlays/census-v1/wv/wv-conv-multiple-misdemeanors-set--official-pdf-fill/fixtures/canonical.pdf` — `31a49f2d2216fd2c7a1327aa7f95f3214b8a760e9d46c05517d764d7bd60f90d`
- boundary `data/rcap-all50/overlays/census-v1/wv/wv-conv-multiple-misdemeanors-set--official-pdf-fill/fixtures/boundary.pdf` — `2a0b701a523d3f7c71f6327c6bd4384cbf438689d0be42d30b869f218f6e1dbe`
- expected pages 4 · requested scale 2.5
- built by FIX01

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
FAMILIES ASSIGNED: 49
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
