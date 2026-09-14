# RAS03

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `5446a03c65a0c77b6c2e404310183090a260ad5e`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (86)

### agency-application-treatment:obligation:research-decision-route:NY:ny_160_55_violation:dcjs_correction_submission

- canonical `data/rcap-all50/overlays/census-v1/ny/agency-application-treatment:obligation:research-decision-route:ny:ny-160-55-violation:dcjs-correction-submission--official-pdf-fill/fixtures/canonical.pdf` — `8abff71f85f09f7c248daa088286855253f3b95172837efa2fcd69a0c51e57ec`
- boundary `data/rcap-all50/overlays/census-v1/ny/agency-application-treatment:obligation:research-decision-route:ny:ny-160-55-violation:dcjs-correction-submission--official-pdf-fill/fixtures/boundary.pdf` — `c48c6e8cea3616ada41949087580f4db52ea94a0613fa55942f4f62de5fe4878`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### agency-application-treatment:obligation:track-pathway:CT:ct-absolute-pardon:absolute-pardon-resulting-in-erasure

- canonical `data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-pathway:ct:ct-absolute-pardon:absolute-pardon-resulting-in-erasure--official-pdf-fill/fixtures/canonical.pdf` — `7875f369eccda528c4cab60c0ef70947344a46c20eb6c6c82983832fe4c56144`
- boundary `data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-pathway:ct:ct-absolute-pardon:absolute-pardon-resulting-in-erasure--official-pdf-fill/fixtures/boundary.pdf` — `fc609cc3c048a965f9ee339cb87e891be08720f2dc36b1ee41d117b4dd6af3b9`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### ak-tf800-set

- canonical `data/rcap-all50/overlays/census-v1/ak/ak-tf800-set--official-pdf-fill/fixtures/tf800-canonical-filled.pdf` — `5b7e549d02811574dcf73fdc2f2dc24ffcaf6da747e4db58fe2c63ceeaf1ba1b`
- boundary `data/rcap-all50/overlays/census-v1/ak/ak-tf800-set--official-pdf-fill/fixtures/tf800-boundary-filled.pdf` — `a7292a0db6c6a32be3f7d66d08c9959c95841fcd304e5d06f4e9fd51e96488b0`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### al-felony-nonconviction-90-set

- canonical `data/rcap-all50/overlays/census-v1/al/al-felony-nonconviction-90-set--official-pdf-fill/fixtures/canonical.pdf` — `40eccc47f8c05a9ce44f467e29e6239a27bfda884c66301b68b4e81b81342b8c`
- boundary `data/rcap-all50/overlays/census-v1/al/al-felony-nonconviction-90-set--official-pdf-fill/fixtures/boundary.pdf` — `0f867cd52916aec34559b7ec514e064167130c50dc7679d588462c22fc5b7e86`
- expected pages 11 · requested scale 2.5
- built by (no builder lane recorded)

### al-pardon-set

- canonical `data/rcap-all50/overlays/census-v1/al/al-pardon-set--official-pdf-fill/fixtures/canonical.pdf` — `27810fee926dd4148e378310d923a979a2976446cdb03bbaa11989d705fcdc4e`
- boundary `data/rcap-all50/overlays/census-v1/al/al-pardon-set--official-pdf-fill/fixtures/boundary.pdf` — `9a745cfbc52accfa6f22343ecfa60dd786c80cb4e990977c2480e4e174eadb53`
- expected pages 4 · requested scale 2.5
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

### ar-felony-seal-set

- canonical `data/rcap-all50/overlays/census-v1/ar/ar-felony-seal-set--official-pdf-fill/fixtures/canonical.pdf` — `5ba805c03c70078ae4cd5089e7dbebb66890709d7e1e77e769b49d01a73c7bf6`
- boundary `data/rcap-all50/overlays/census-v1/ar/ar-felony-seal-set--official-pdf-fill/fixtures/boundary.pdf` — `9d64a53d2c613b56eb526064abff364d72941de616bafe0fd8573c9735921a3c`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### ar-pardon-seal-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-pardon-seal-set--official-pdf-fill/fixtures/order-canonical-filled.pdf` — `1834e31bdf5b3dee8f5d1f3a36c383b12f217abc20c4d3ad7f518c5b92914a93` · 3 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-pardon-seal-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `3b1576d92c2008ba2548522fd16e8025b3e4cbff1f0f40343577ab29477af9ea` · 4 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-pardon-seal-set--official-pdf-fill/fixtures/order-boundary-filled.pdf` — `ca9e599d493603ee04244d90790f609c6a41e97a6f892be2603c0a1197573d17` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-pardon-seal-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `35c2c5cbf9922bed57f1e8da627bdb2b0f554dbcacf5f6de29b5390d565a36c4` · 4 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ar/ar-pardon-seal-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/ar/ar-pardon-seal-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 14 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### az_marijuana_expungement_limited_jurisdiction-set

- canonical `data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-limited-jurisdiction-set--official-pdf-fill/fixtures/canonical.pdf` — `d82d2df0f6e16c61cb8dfd3d405945a4b92fc885b4dd99ed07058d880023614f`
- boundary `data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-limited-jurisdiction-set--official-pdf-fill/fixtures/boundary.pdf` — `aa1bade440c1417966bd1579d6b5084f0961942b18fb8643e1835e3d4c1181c8`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### az_record_sealing_dismissal_not_guilty-set

- **6 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/az/az-record-sealing-dismissal-not-guilty-set--official-pdf-fill/fixtures/canonical/order.pdf` — `e81d36c2553f4cc41cf61d43c425e73b0d0afe96bfaa3128ad6f2431e2258812` · 3 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/az/az-record-sealing-dismissal-not-guilty-set--official-pdf-fill/fixtures/canonical/packet-assembly.pdf` — `bdfbd09935c302041aeb746dc1fc6bae6bda34760fe162eda0c941ebd904a66c` · 8 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/az/az-record-sealing-dismissal-not-guilty-set--official-pdf-fill/fixtures/canonical/petition.pdf` — `4d0bd271ed4f65b47cad3fdba11c784b7782ee166dc194b98fad081833987ab7` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/az/az-record-sealing-dismissal-not-guilty-set--official-pdf-fill/fixtures/boundary/order.pdf` — `7b5bf85609f6bd9d86d40194eb92eb47c267f38c723021e5a5b269be27b38a71` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/az/az-record-sealing-dismissal-not-guilty-set--official-pdf-fill/fixtures/boundary/packet-assembly.pdf` — `bbb9aed7a73833af3552862e7e410767ecd468a5b6bf2235237c3610bcd2675d` · 8 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/az/az-record-sealing-dismissal-not-guilty-set--official-pdf-fill/fixtures/boundary/petition.pdf` — `fb768246be8a28e298b8d8eaf24c0e823439963165a00e0672e55f0c0d8f63b7` · 5 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/az/az-record-sealing-dismissal-not-guilty-set--official-pdf-fill/fixtures/canonical/packet-assembly.pdf` and `data/rcap-all50/overlays/census-v1/az/az-record-sealing-dismissal-not-guilty-set--official-pdf-fill/fixtures/boundary/packet-assembly.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 32 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### ca-1203-41-set

- **8 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-41-set--official-pdf-fill/fixtures/pc-1203-41-canonical/cr-106-unchanged-official.pdf` — `f8a37a9a8c30a016b432bb39fd67407717c3dee7be74bc3e3d471127bf190c5a` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-41-set--official-pdf-fill/fixtures/pc-1203-41-canonical/cr-180-filled.pdf` — `2299cbac4ebfb481b1566983535b75ee7a54b5d7053c6001c18345433448f45c` · 3 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-41-set--official-pdf-fill/fixtures/pc-1203-41-canonical/cr-181-unchanged-official.pdf` — `f737503a89465d40206b11b1123e815e44a249d324bad16d313c337a695ce504` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-41-set--official-pdf-fill/fixtures/pc-1203-41-canonical/mc-031-unchanged-official.pdf` — `defc9108f6baa4c2ca444c1571d737d841af78289bef337f874f51e595191075` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-41-set--official-pdf-fill/fixtures/pc-1203-41-boundary/cr-106-unchanged-official.pdf` — `f8a37a9a8c30a016b432bb39fd67407717c3dee7be74bc3e3d471127bf190c5a` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-41-set--official-pdf-fill/fixtures/pc-1203-41-boundary/cr-180-filled.pdf` — `d6442ef54a6f32501082bc9bd8874092dac6a67126ee5630367aacb17b1cf8d1` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-41-set--official-pdf-fill/fixtures/pc-1203-41-boundary/cr-181-unchanged-official.pdf` — `f737503a89465d40206b11b1123e815e44a249d324bad16d313c337a695ce504` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-41-set--official-pdf-fill/fixtures/pc-1203-41-boundary/mc-031-unchanged-official.pdf` — `defc9108f6baa4c2ca444c1571d737d841af78289bef337f874f51e595191075` · 1 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ca/ca-1203-41-set--official-pdf-fill/fixtures/pc-1203-41-canonical/cr-180-filled.pdf` and `data/rcap-all50/overlays/census-v1/ca/ca-1203-41-set--official-pdf-fill/fixtures/pc-1203-41-boundary/cr-180-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 16 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### ca-17b-reduction-set

- **6 documents**, and the receipt must cover every one of them:
  - canonical-cr-106 `data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/fixtures/pc-17b-17d2-offense-by-offense-canonical/cr-106-filled.pdf` — `3a81dcc6fbec1509c87ede5152dd4e4b25d1426e95c0acf50a0daa9ff3e6c45f` · 2 page(s)
  - canonical-cr-180 `data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/fixtures/pc-17b-17d2-offense-by-offense-canonical/cr-180-filled.pdf` — `c17f59c284a927261b80bc821266ac9494e17781d5d6655b7333d13f4cb7ecc5` · 3 page(s)
  - canonical-cr-181 `data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/fixtures/pc-17b-17d2-offense-by-offense-canonical/cr-181-filled.pdf` — `53101d47a609da56113eaadccb8386b6159e6259ad09b2762467d2a137c106f6` · 2 page(s)
  - boundary-cr-106 `data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/fixtures/pc-17b-17d2-offense-by-offense-boundary/cr-106-filled.pdf` — `3955933b42f2d2256eacef6ae23dac4e1b8ebc06f921249b471b7cf744057ef0` · 2 page(s)
  - boundary-cr-180 `data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/fixtures/pc-17b-17d2-offense-by-offense-boundary/cr-180-filled.pdf` — `46fd6ec3d02cf616df1a47765f9cca063b5e7e349b15961c4a6c4c76441b33dc` · 3 page(s)
  - boundary-cr-181 `data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/fixtures/pc-17b-17d2-offense-by-offense-boundary/cr-181-filled.pdf` — `0ffbcbc547957274189b82b2d31d7a9e2f050e6acfc43a8cef97fa79d44e2a95` · 2 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/fixtures/pc-17b-17d2-offense-by-offense-canonical/cr-180-filled.pdf` and `data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/fixtures/pc-17b-17d2-offense-by-offense-boundary/cr-180-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 14 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### census-pending-family:ME:juvenile-sealing

- canonical `data/rcap-all50/overlays/census-v1/me/census-pending-family:me:juvenile-sealing--official-pdf-fill/fixtures/canonical.pdf` — `fa7bd28a1f28cfb38f3f1da3a98d97f2ba3e7827e1c813a43ee51560f225144d`
- boundary `data/rcap-all50/overlays/census-v1/me/census-pending-family:me:juvenile-sealing--official-pdf-fill/fixtures/boundary.pdf` — `69618b989b84945c1f0bf121430b589ecbec6368087cf620901c5a286c45aabb`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### co_motion_seal_conviction-set

- canonical `data/rcap-all50/overlays/census-v1/co/co-motion-seal-conviction-set--official-pdf-fill/fixtures/canonical.pdf` — `f8eaffc976b0b73ba6cf76b3332d9ff950d38a8089279a3a5b364db49153b4b9`
- boundary `data/rcap-all50/overlays/census-v1/co/co-motion-seal-conviction-set--official-pdf-fill/fixtures/boundary.pdf` — `8b553b296f054326c9c0441ba5c56adb6fd19b5b65751fa9b4ffa570e94afef6`
- expected pages 15 · requested scale 2.5
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

- canonical `data/rcap-all50/overlays/census-v1/wy/composed-treatment:obligation:runtime-only:wy:human-trafficking-victim-vacatur-w-s-6-2-708--custom-pleading/fixtures/canonical.pdf` — `e659cde906f0918f7f752a76fb330d9fd2f6a3e6eae1606c8048dc50d080da7a`
- boundary `data/rcap-all50/overlays/census-v1/wy/composed-treatment:obligation:runtime-only:wy:human-trafficking-victim-vacatur-w-s-6-2-708--custom-pleading/fixtures/boundary.pdf` — `cab0c1fd8d4c254ea3c87331891e97696d6c1608e7e9062069aba41f750e86d1`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### ct-cleanslate-petition-set

- canonical `data/rcap-all50/overlays/census-v1/ct/ct-cleanslate-petition-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `28c4aef4146df8956dd3eb36402ee031f98fc9af61ddf1b986b774ffbf219b77`
- boundary `data/rcap-all50/overlays/census-v1/ct/ct-cleanslate-petition-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `d3e379c8dbc4c716cd80ec107edcc069b585cc4934b28adb1db40fe19c26c09c`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### ct-pardon-erasure-set

- canonical `data/rcap-all50/overlays/census-v1/ct/ct-pardon-erasure-set--custom-pleading/fixtures/canonical.pdf` — `fb22c04456ff31e1526fcc6127330c67618fdd5378da60fd512b4be51b7c410b`
- boundary `data/rcap-all50/overlays/census-v1/ct/ct-pardon-erasure-set--custom-pleading/fixtures/boundary.pdf` — `dc26b69ffdb89472c0d674378196a1e04664caf06f6c724d43117d80f28838ef`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### dc_seal_conviction-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/dc/dc-seal-conviction-set--custom-pleading/fixtures/canonical-felony_8yr.pdf` — `57ad41269dcfe9d6933fbc12d629210ed0b15f89769fa82e693e5eb094a729dc` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/dc/dc-seal-conviction-set--custom-pleading/fixtures/canonical-misdemeanor_5yr.pdf` — `069a85420cd083de902918e7ee98bd475336a23273e6dea0dde23eb3fbb8f088` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/dc/dc-seal-conviction-set--custom-pleading/fixtures/boundary-felony_8yr.pdf` — `aab749d4247bf5bb25898d7500355f7b9e05cdeb3ade3abfa2df032d18b5aabe` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/dc/dc-seal-conviction-set--custom-pleading/fixtures/boundary-misdemeanor_5yr.pdf` — `3471ea08eb2b329dbc91501b180738f77b2e8b3265925ef92574385ea5931629` · 5 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/dc/dc-seal-conviction-set--custom-pleading/fixtures/canonical-misdemeanor_5yr.pdf` and `data/rcap-all50/overlays/census-v1/dc/dc-seal-conviction-set--custom-pleading/fixtures/boundary-misdemeanor_5yr.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 20 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### de_discretionary_family_court-set

- canonical `data/rcap-all50/overlays/census-v1/de/de-discretionary-family-court-set--official-pdf-fill/fixtures/canonical.pdf` — `c8db59fab064a64922b0f861c2b7673ded353d74c65e25203e67094b53327cc8`
- boundary `data/rcap-all50/overlays/census-v1/de/de-discretionary-family-court-set--official-pdf-fill/fixtures/boundary.pdf` — `9a7de241d4ea134cf13c476171f73c05de7422485824f12f2e6d4273a49746e3`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### fl-10yr-bridge-set

- canonical `data/rcap-all50/overlays/census-v1/fl/fl-10yr-bridge-set--official-pdf-fill/fixtures/canonical.pdf` — `ff4268b1adca4883f44d059303aa59c0ceab618e1bbf6ed02fa464dd667b73df`
- boundary `data/rcap-all50/overlays/census-v1/fl/fl-10yr-bridge-set--official-pdf-fill/fixtures/boundary.pdf` — `708cbd61b79b514298315a49f5b3d1e2f997c4757542868d12e8bb9125b473b1`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### fl-juvenile-diversion-set

- canonical `data/rcap-all50/overlays/census-v1/fl/fl-juvenile-diversion-set--official-pdf-fill/fixtures/canonical.pdf` — `c63743cb40f515edd7b03a17ec97cb5f05cc770452b2d301953a534f04ace032`
- boundary `data/rcap-all50/overlays/census-v1/fl/fl-juvenile-diversion-set--official-pdf-fill/fixtures/boundary.pdf` — `2391d96cb8a1e51e14fdfdc3ba38c7c3b9f3da564a223392983158a8e18aab8f`
- expected pages 5 · requested scale 2.5
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

### ia-12347-set

- canonical `data/rcap-all50/overlays/census-v1/ia/ia-12347-set--official-pdf-fill/fixtures/canonical.pdf` — `830d67c3d423b615ed01efbc9c32cdb6a5ca0f89917fc8c13201070bb5fa9b91`
- boundary `data/rcap-all50/overlays/census-v1/ia/ia-12347-set--official-pdf-fill/fixtures/boundary.pdf` — `a8685beb36fe2ed04c07663d20e3c62512f3b3642665555f2e663536233c3e9c`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### ia-dci77-set

- canonical `data/rcap-all50/overlays/census-v1/ia/ia-dci77-set--official-pdf-fill/fixtures/canonical.pdf` — `7e09751a8e233f1fd27bf111726d30d14669376dbdf8922f0138f6ac9c5a3bc7`
- boundary `data/rcap-all50/overlays/census-v1/ia/ia-dci77-set--official-pdf-fill/fixtures/boundary.pdf` — `91befce7c030b0151450f7a3b27df5fb84232f58a72889c4bb7793fe28aee7b1`
- expected pages 3 · requested scale 2.5
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

### il-prostitution-j-vacate-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-prostitution-j-vacate-set--custom-pleading/fixtures/canonical.pdf` — `d4cb765983ed2ed180a74feb1a70b7b5cc43134419b2c497746d8fd188bd2657`
- boundary `data/rcap-all50/overlays/census-v1/il/il-prostitution-j-vacate-set--custom-pleading/fixtures/boundary.pdf` — `ea728bba06d2112537e99846f12d78a1c3d7f49eb8ae0f101a94291920bbf25e`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### il-seal-nonconv-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-seal-nonconv-set--official-pdf-fill/fixtures/canonical.pdf` — `333ffbeb03e846be21f52caa2088d9230b9b6d6094f90f764385218d46815d39`
- boundary `data/rcap-all50/overlays/census-v1/il/il-seal-nonconv-set--official-pdf-fill/fixtures/boundary.pdf` — `1df2b84a4cc3a6f2c4dc2e1724525e586997349940987ff396b932f3f78816c1`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### in_conviction_misd-set

- canonical `data/rcap-all50/overlays/census-v1/in/in-conviction-misd-set--custom-pleading/fixtures/canonical.pdf` — `52b987aada3f19e11734cb5cfdc840b4592912a74840825b61a40342ed41a3a4`
- boundary `data/rcap-all50/overlays/census-v1/in/in-conviction-misd-set--custom-pleading/fixtures/boundary.pdf` — `8e0012c088591ab2478ac89ae7642e83c19d434b9750f151287002a910772390`
- expected pages 10 · requested scale 2.5
- built by (no builder lane recorded)

### ks-21-6614-diversion-set

- canonical `data/rcap-all50/overlays/census-v1/ks/ks-21-6614-diversion-set--official-pdf-fill/fixtures/canonical.pdf` — `4985daae9ca05a4ebd82ac15c05b4bd0f61f2883279de41dea763cfc49f0ecc9`
- boundary `data/rcap-all50/overlays/census-v1/ks/ks-21-6614-diversion-set--official-pdf-fill/fixtures/boundary.pdf` — `e703bb7cfda795a9adf05f363bfd7a897d646aa6fc8544f5f522914def8f8f2c`
- expected pages 20 · requested scale 2.5
- built by (no builder lane recorded)

### ks-22-4908-registration-relief-set

- canonical `data/rcap-all50/overlays/census-v1/ks/ks-22-4908-registration-relief-set--official-pdf-fill/fixtures/canonical.pdf` — `f01d4442af4303e698482462ac09ecd8b0aeb88c8c8c164e01e4113c820953c3`
- boundary `data/rcap-all50/overlays/census-v1/ks/ks-22-4908-registration-relief-set--official-pdf-fill/fixtures/boundary.pdf` — `2aa9a8e548a946b17742dc6ed0e88b53782aab33279c2aa354a421838bc9bc22`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### ky_felony_vacatur_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-felony-vacatur-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `581dee480d77d2f226b907b017c4209de89d4f4346f654256ed11ba24d32e54e`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-felony-vacatur-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `3847941126c39f4c5963e2fa06bbccbaf5936a39551118fc6df429ff21bca91b`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### ky_void_seal_controlled_substance-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-void-seal-controlled-substance-set--custom-pleading/fixtures/canonical.pdf` — `e7419541f263c4fdc41bbcea0d45d4dd748a35830e722c02f88afd412c646037`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-void-seal-controlled-substance-set--custom-pleading/fixtures/boundary.pdf` — `0b864b30e140fd8b53adc948f6b294c093095e133b489dab27a745dd632db12f`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### la-977d-marijuana-first-offense-set

- canonical `data/rcap-all50/overlays/census-v1/la/la-977d-marijuana-first-offense-set--custom-pleading/fixtures/canonical.pdf` — `b8a25f5af5f330544bab69beced7973988e697a0e2bd69dceb6bc14747112ede`
- boundary `data/rcap-all50/overlays/census-v1/la/la-977d-marijuana-first-offense-set--custom-pleading/fixtures/boundary.pdf` — `2d475ea417604dc304a62ead55a411ab033744584ec06260f697a8cd88cb2aad`
- expected pages 20 · requested scale 2.5
- built by (no builder lane recorded)

### la-987-set-aside-and-dismiss-set

- canonical `data/rcap-all50/overlays/census-v1/la/la-987-set-aside-and-dismiss-set--official-pdf-fill/fixtures/canonical.pdf` — `60a02dedae1ee57114c73a613257388f5ce7a87b5bd19308025f9e49b5047382`
- boundary `data/rcap-all50/overlays/census-v1/la/la-987-set-aside-and-dismiss-set--official-pdf-fill/fixtures/boundary.pdf` — `71534f30ea3c53985dd9fd01b5a7194e0e186794a05e4df343eefa5c56aa456c`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### ma-expunge-time-set

- canonical `data/rcap-all50/overlays/census-v1/ma/ma-expunge-time-set--official-pdf-fill/fixtures/canonical.pdf` — `45e2589a73f35fd2cda9eff1de20a75807d6f66404d7d0ad3c26a052174f3985`
- boundary `data/rcap-all50/overlays/census-v1/ma/ma-expunge-time-set--official-pdf-fill/fixtures/boundary.pdf` — `a995e56b6f78cbda7932996029c708e57c39a2251db833dc91eb648534797964`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### md_10105_early-set

- canonical `data/rcap-all50/overlays/census-v1/md/md-10105-early-set--official-pdf-fill/fixtures/canonical.pdf` — `178791922c9fc310c73f85fd5487aabba0989516dc204d1f77eff5d367f6946f`
- boundary `data/rcap-all50/overlays/census-v1/md/md-10105-early-set--official-pdf-fill/fixtures/boundary.pdf` — `bde04b9077717fea1a9540e77201b80c2e913f18f960ca688b0b3f61a7c06b1d`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### md_pardon_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/md/md-pardon-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `96b99e1fcf5cc7e3ce940a18595d219d17134903e11aa460b8622880303f6559`
- boundary `data/rcap-all50/overlays/census-v1/md/md-pardon-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `f8e335bc8e2f3c3cb78f3708d8147c837ec7eeb33d353f10d493bae1b4b57b68`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### me-seal-gen-set

- canonical `data/rcap-all50/overlays/census-v1/me/me-seal-gen-set--official-pdf-fill/fixtures/canonical.pdf` — `10e5a82b626d98851b525f380000e9435aa49c303f7f334d771f002dd89ade78`
- boundary `data/rcap-all50/overlays/census-v1/me/me-seal-gen-set--official-pdf-fill/fixtures/boundary.pdf` — `43593b8922759124491186b0a8460ff1b21633ed85eccba1fa11a7c88c0730cc`
- expected pages 1 · requested scale 2.5
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

### mn_petition_609a02_subd3-set

- canonical `data/rcap-all50/overlays/census-v1/mn/mn-petition-609a02-subd3-set--custom-pleading/fixtures/canonical.pdf` — `52680b1fcec81eee5538ea4cb23f1d37d8519384baff73bd754f38fa1bc0df71`
- boundary `data/rcap-all50/overlays/census-v1/mn/mn-petition-609a02-subd3-set--custom-pleading/fixtures/boundary.pdf` — `46bc49d539edbb8dd18470188c14299f81f0ab6c541d23a1c4a6de7146fd19a9`
- expected pages 25 · requested scale 2.5
- built by (no builder lane recorded)

### mo-610-122-arrest-expungement-set

- **3 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/mo/mo-610-122-arrest-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `93f2c3c8b55bf4691bef4028b8cb2a3ac8dff0d3416c73abaa3c776a18234271` · 12 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mo/mo-610-122-arrest-expungement-set--official-pdf-fill/fixtures/selectable/petition-only.pdf` — `625c2b639bf0aa53279f8f478db64423bb7e2af533f7ce669324a6a38458618e` · 11 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/mo/mo-610-122-arrest-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `b9f6e51aba7ad64b3de67c40ee39d09f6493b58b42224a584c98e50a14e351d2` · 13 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/mo/mo-610-122-arrest-expungement-set--official-pdf-fill/fixtures/canonical.pdf` and `data/rcap-all50/overlays/census-v1/mo/mo-610-122-arrest-expungement-set--official-pdf-fill/fixtures/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 36 across all documents · requested scale 2.5
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

### mt_misdemeanor_expungement-set

- **3 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/mt/mt-misdemeanor-expungement-set--custom-pleading/fixtures/canonical.pdf` — `82a512f6eaa9f650fe4b69f6534f85be640fde3d968fcd70319658a90ed71289` · 9 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/mt/mt-misdemeanor-expungement-set--custom-pleading/fixtures/boundary.pdf` — `1e323f110fdd900db1b22416c35956a51c2107d43408b0d83790e5ce475c9607` · 11 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/mt/mt-misdemeanor-expungement-set--custom-pleading/fixtures/military.pdf` — `94fb4b6ed7ab60269bea2e21ff2a06a0d6e364c5345f0114dfbf218e264c20af` · 9 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/mt/mt-misdemeanor-expungement-set--custom-pleading/fixtures/canonical.pdf` and `data/rcap-all50/overlays/census-v1/mt/mt-misdemeanor-expungement-set--custom-pleading/fixtures/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 29 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### nc_145_5_misdemeanor-set

- canonical `data/rcap-all50/overlays/census-v1/nc/nc-145-5-misdemeanor-set--official-pdf-fill/fixtures/canonical.pdf` — `10d06d346fffa0b9c534922a1450880c6d26efdc15dc0b52035c081c72ebbdf9`
- boundary `data/rcap-all50/overlays/census-v1/nc/nc-145-5-misdemeanor-set--official-pdf-fill/fixtures/boundary.pdf` — `e31a578a70709a2c03426163ed724bc316a935551a338e4f2ceef7e1b3fd561a`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### nc_auto_146_a4_agency_followup-set

- canonical `data/rcap-all50/overlays/census-v1/nc/nc-auto-146-a4-agency-followup-set--custom-pleading/fixtures/canonical.pdf` — `9de6848223a63c1c2fe1e354115ff3e9e3e373c27f9b59a4b928f60ab5ee1e29`
- boundary `data/rcap-all50/overlays/census-v1/nc/nc-auto-146-a4-agency-followup-set--custom-pleading/fixtures/boundary.pdf` — `17f0bc40514810c63de1884aeccc481977996f4be220e250dda3ad571ffd2a84`
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

### ne-trafficking-setaside-and-seal-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ne/ne-trafficking-setaside-and-seal-set--official-pdf-fill/fixtures/canonical.pdf` — `45300a2bcea7795b6d66e8698ef4416fdaa17011c30cf591ef718adbf240809e` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ne/ne-trafficking-setaside-and-seal-set--official-pdf-fill/fixtures/canonical-post-order.pdf` — `59df3014a280ea1f9af5acce006b17e0bba0c5eb97e03672331c9fa039cbc62a` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ne/ne-trafficking-setaside-and-seal-set--official-pdf-fill/fixtures/boundary.pdf` — `31090c3ebd6b16367d23c07a8734690bf5575275a6e2ea3e99a4a8943191bbb8` · 4 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ne/ne-trafficking-setaside-and-seal-set--official-pdf-fill/fixtures/boundary-post-order.pdf` — `054f14d23fbb1a2aaa3e51b96147567daa1baf14d19ef363ea1d7c59e6a8666d` · 5 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ne/ne-trafficking-setaside-and-seal-set--official-pdf-fill/fixtures/canonical.pdf` and `data/rcap-all50/overlays/census-v1/ne/ne-trafficking-setaside-and-seal-set--official-pdf-fill/fixtures/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 18 across all documents · requested scale 2.5
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

### rcap-nd-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/nd/rcap-nd-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `2fd78d8919dedfbdc062f180ade3769ed019c10e76bc1bc615f3f090e4e49522`
- boundary `data/rcap-all50/overlays/census-v1/nd/rcap-nd-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `52464ec12db3294f7d66003f4398d87c6753c4b4ef46db4ca5be9d0e5f381e8d`
- expected pages 35 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-or-official-pdf-fill

- **8 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/or/rcap-or-official-pdf-fill--official-pdf-fill/fixtures/canonical--arrest-no-charges.pdf` — `1c03ae6c71b90010c7e96ff63cf72d8d0b31f9b031d7f86612c5b853fa116046` · 7 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/or/rcap-or-official-pdf-fill--official-pdf-fill/fixtures/canonical--arrest-no-charges--criminal-history-request.pdf` — `1dd17a194ca51d4a73b21740b074eaa60f14649266a587cef24328c328d85ae0` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/or/rcap-or-official-pdf-fill--official-pdf-fill/fixtures/boundary--arrest-no-charges.pdf` — `2d78d560ddaca770ffe129bda74d8bb134e5d3c2e8a54b5c94099e2529a04470` · 7 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/or/rcap-or-official-pdf-fill--official-pdf-fill/fixtures/boundary--arrest-no-charges--criminal-history-request.pdf` — `228e03086aa60b182128e4119939723d1c5bde9f8cfd9d5977f8792685eb84aa` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/or/rcap-or-official-pdf-fill--official-pdf-fill/fixtures/canonical--dismissed-charge.pdf` — `f030f97551f13286829de5da4cbc92206dd09dfa0f0fa75806906f6d5d83d655` · 7 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/or/rcap-or-official-pdf-fill--official-pdf-fill/fixtures/canonical--dismissed-charge--criminal-history-request.pdf` — `1dd17a194ca51d4a73b21740b074eaa60f14649266a587cef24328c328d85ae0` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/or/rcap-or-official-pdf-fill--official-pdf-fill/fixtures/boundary--dismissed-charge.pdf` — `54f05131f7b7168c3808bdf9ad037e211b383dce6913ee8983129941256f2a7a` · 7 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/or/rcap-or-official-pdf-fill--official-pdf-fill/fixtures/boundary--dismissed-charge--criminal-history-request.pdf` — `228e03086aa60b182128e4119939723d1c5bde9f8cfd9d5977f8792685eb84aa` · 2 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/or/rcap-or-official-pdf-fill--official-pdf-fill/fixtures/canonical--arrest-no-charges.pdf` and `data/rcap-all50/overlays/census-v1/or/rcap-or-official-pdf-fill--official-pdf-fill/fixtures/boundary--arrest-no-charges.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 36 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### rcap-wa-custom-pleading-clean-tracks

- canonical `data/rcap-all50/overlays/census-v1/wa/rcap-wa-custom-pleading-clean-tracks--custom-pleading/fixtures/canonical.pdf` — `78910c462040fbed6980384c0eb342b44eb8ec80d09eceb3ef97783ae119b050`
- boundary `data/rcap-all50/overlays/census-v1/wa/rcap-wa-custom-pleading-clean-tracks--custom-pleading/fixtures/boundary.pdf` — `587838be98adfff4f4f0e4e91d56aab08897551380ee1411b9e528e1b3bad471`
- expected pages 17 · requested scale 2.5
- built by (no builder lane recorded)

### ri_deferred_sentence-set

- canonical `data/rcap-all50/overlays/census-v1/ri/ri-deferred-sentence-set--official-pdf-fill/fixtures/canonical.pdf` — `0960782f51292843e37f6b7bec43844c3e128b3ef1cc1f1c1cb08cbb1eccc063`
- boundary `data/rcap-all50/overlays/census-v1/ri/ri-deferred-sentence-set--official-pdf-fill/fixtures/boundary.pdf` — `b56a0747459a835eb6f8e396c12d9d11ae69b19cf5aa341cd5a9a21edfd58e3a`
- expected pages 14 · requested scale 2.5
- built by (no builder lane recorded)

### ri_multiple_misdemeanors-set

- canonical `data/rcap-all50/overlays/census-v1/ri/ri-multiple-misdemeanors-set--official-pdf-fill/fixtures/canonical.pdf` — `4b77e151246ef516a546a3d4d562f1edba76cd9f6a5b4fac4f5ab67231a24c4a`
- boundary `data/rcap-all50/overlays/census-v1/ri/ri-multiple-misdemeanors-set--official-pdf-fill/fixtures/boundary.pdf` — `637ca130cf69d3a547e7e3f20155e1558e9748c5ff23213bedbe45be7bb452db`
- expected pages 15 · requested scale 2.5
- built by (no builder lane recorded)

### tx_exp_acquittal-set

- canonical `data/rcap-all50/overlays/census-v1/tx/tx-exp-acquittal-set--custom-pleading/fixtures/canonical.pdf` — `09eddcb41ed0765ff7ef87f70e053a73164fb570335754a3aff49e592ceb8c51`
- boundary `data/rcap-all50/overlays/census-v1/tx/tx-exp-acquittal-set--custom-pleading/fixtures/boundary.pdf` — `a12cf30307b9db3b5903045db383cda710670adfd012d353bcff58df00ab801d`
- expected pages 23 · requested scale 2.5
- built by (no builder lane recorded)

### tx_nd_dwi_conviction-set

- canonical `data/rcap-all50/overlays/census-v1/tx/tx-nd-dwi-conviction-set--official-pdf-fill/fixtures/canonical.pdf` — `5670c283390b7f3fe5bd5397438e69929958e7285bff0e3817cf8041899f67df`
- boundary `data/rcap-all50/overlays/census-v1/tx/tx-nd-dwi-conviction-set--official-pdf-fill/fixtures/boundary.pdf` — `ea63c40573d81fcbb07ea550c904904a92cc727c62e032f030ac36a8fab18515`
- expected pages 24 · requested scale 2.5
- built by (no builder lane recorded)

### tx_nd_veterans_court-set

- canonical `data/rcap-all50/overlays/census-v1/tx/tx-nd-veterans-court-set--official-pdf-fill/fixtures/canonical.pdf` — `047dae56acaed025072318a85121c2d83d4650388be2948c9728105a8ae4ae00`
- boundary `data/rcap-all50/overlays/census-v1/tx/tx-nd-veterans-court-set--official-pdf-fill/fixtures/boundary.pdf` — `b2d4d2954dbafb37157136afac5f5a8477f8b49b9aee00926f9368924153abcb`
- expected pages 25 · requested scale 2.5
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

### wa_blake_vacatur_and_lfo_refund-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-blake-vacatur-and-lfo-refund-set--official-pdf-fill/fixtures/canonical.pdf` — `fe9a48f9c54bc2ec6d86209e60062523e7a6b3eec55d1cf062604e8750582650` · 13 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-blake-vacatur-and-lfo-refund-set--official-pdf-fill/fixtures/superior-full.pdf` — `0daa1d6c48928bf7a401fa5fbda91466e38f0dc1bc708f5109ab3e19b4120426` · 15 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-blake-vacatur-and-lfo-refund-set--official-pdf-fill/fixtures/boundary.pdf` — `16eb1be7d6e83c3e3f14596066ae735d26e90e86098371c98fedf7942e8d8452` · 17 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-blake-vacatur-and-lfo-refund-set--official-pdf-fill/fixtures/municipal-partial.pdf` — `600cb1ea8a42e471869fb58d0a3aacfdfd8098663fb37b9c780dfa31e54c1b8f` · 16 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/wa/wa-blake-vacatur-and-lfo-refund-set--official-pdf-fill/fixtures/canonical.pdf` and `data/rcap-all50/overlays/census-v1/wa/wa-blake-vacatur-and-lfo-refund-set--official-pdf-fill/fixtures/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 61 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_felony-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-felony-set--official-pdf-fill/fixtures/canonical.pdf` — `585a7acff41609d13baeea797fd6477fc78bd6acb5c5888a05e640cb3f618c56`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-felony-set--official-pdf-fill/fixtures/boundary.pdf` — `bcc6e5e71d3afbae64f4f5dd41e32c20bc7f8f14e38c5bba59c26a49d801bce8`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_survivor_felony-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-felony-set--official-pdf-fill/fixtures/cr-08-0900-canonical-filled.pdf` — `3c40568209578ca04893ce46b64539a44af355dc11bd75b7daee75d215eda37f` · 3 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-felony-set--official-pdf-fill/fixtures/cr-08-0920-canonical-filled.pdf` — `1c715d2be4cfa5398a82fad6999570e1502a607a3f939061f01710f443d5e6eb` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-felony-set--official-pdf-fill/fixtures/cr-08-0900-boundary-filled.pdf` — `2da76cc75f1ccd72cc12fdefef71edb90f477199877714e3263d9b46a4fccc8d` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-felony-set--official-pdf-fill/fixtures/cr-08-0920-boundary-filled.pdf` — `e5014e2e979599132c6232fae1b94fe8dd271eef6a63c113e42a886377840721` · 3 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-felony-set--official-pdf-fill/fixtures/cr-08-0900-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-felony-set--official-pdf-fill/fixtures/cr-08-0900-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 12 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### wi_nc_doj_challenge-set

- canonical `data/rcap-all50/overlays/census-v1/wi/wi-nc-doj-challenge-set--official-pdf-fill/fixtures/canonical.pdf` — `edb7338200e12436a22390b6857b54bb0b44d074abc745b5c02c158f85457b4f`
- boundary `data/rcap-all50/overlays/census-v1/wi/wi-nc-doj-challenge-set--official-pdf-fill/fixtures/boundary.pdf` — `365d25ebf98bc23dba12805e97f985d6f39fc2403cec591b9646a6be8f35596e`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### wv_conv_nonviolent_felony-set

- canonical `data/rcap-all50/overlays/census-v1/wv/wv-conv-nonviolent-felony-set--official-pdf-fill/fixtures/canonical.pdf` — `c3c5edd72b617541bbceaa7ac1c791b0d2f251dde9365a1c8a1c16995dd5edd9`
- boundary `data/rcap-all50/overlays/census-v1/wv/wv-conv-nonviolent-felony-set--official-pdf-fill/fixtures/boundary.pdf` — `0eb1fbdd0c559bde89cd3d4e595044bb7d17b949d53e9ee8f2a64e1fc5647573`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### wv_nc_diversion_deferred-set

- canonical `data/rcap-all50/overlays/census-v1/wv/wv-nc-diversion-deferred-set--official-pdf-fill/fixtures/canonical.pdf` — `bf993e6a3aad738b1519eb3a3b4440c5bfaecfc67f8e488919c8f4e8d9192438`
- boundary `data/rcap-all50/overlays/census-v1/wv/wv-nc-diversion-deferred-set--official-pdf-fill/fixtures/boundary.pdf` — `11ad1b8683d33e2b12214e13cc34788286081a5f8c8448228cb80a12d4f64abe`
- expected pages 12 · requested scale 2.5
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
FAMILIES ASSIGNED: 86
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
