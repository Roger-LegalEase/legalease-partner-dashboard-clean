# RAS02

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `b3642b5a45483de3b08625f34c19bd0733f2fd2b`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (82)

### agency-application-treatment:obligation:research-decision-route:NY:ny_160_55_violation:dcjs_correction_submission

- canonical `data/rcap-all50/overlays/census-v1/ny/agency-application-treatment:obligation:research-decision-route:ny:ny-160-55-violation:dcjs-correction-submission--official-pdf-fill/fixtures/canonical.pdf` — `8abff71f85f09f7c248daa088286855253f3b95172837efa2fcd69a0c51e57ec`
- boundary `data/rcap-all50/overlays/census-v1/ny/agency-application-treatment:obligation:research-decision-route:ny:ny-160-55-violation:dcjs-correction-submission--official-pdf-fill/fixtures/boundary.pdf` — `c48c6e8cea3616ada41949087580f4db52ea94a0613fa55942f4f62de5fe4878`
- expected pages 4 · requested scale 2.5
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

### census-pending-family:UT:path-l-vacatur-human-trafficking-related-expungement

- canonical `data/rcap-all50/overlays/census-v1/ut/census-pending-family:ut:path-l-vacatur-human-trafficking-related-expungement--official-pdf-fill/fixtures/canonical.pdf` — `c73a6d87cb5b68f054d50a141b47583e60a14fc144eff09b2eb6d67fb0da21ba`
- boundary `data/rcap-all50/overlays/census-v1/ut/census-pending-family:ut:path-l-vacatur-human-trafficking-related-expungement--official-pdf-fill/fixtures/boundary.pdf` — `47c7eb02473f98699455fd889f736ce3d50e5106ecef86103f5e4232aa72bd22`
- expected pages 12 · requested scale 2.5
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

### composed-treatment:obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1018_discretionary_petition

- canonical `data/rcap-all50/overlays/census-v1/de/composed-treatment:obligation:runtime-contract-cohort:de:juvenile-expungement-under-10-del-c-1017-1019-1017a:section-1018-discretionary-petition--custom-pleading/fixtures/canonical.pdf` — `496f5fd95292a763931d1f1593dd825e1956b250ec229081034ba2e1ffda62b5`
- boundary `data/rcap-all50/overlays/census-v1/de/composed-treatment:obligation:runtime-contract-cohort:de:juvenile-expungement-under-10-del-c-1017-1019-1017a:section-1018-discretionary-petition--custom-pleading/fixtures/boundary.pdf` — `b154f8b9bb739dcfb24ebfdfcb9450215a85a25862e65b31954028109bfb3bbb`
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

### composed-treatment:obligation:runtime-only:SD:juvenile-trafficking-expungement

- canonical `data/rcap-all50/overlays/census-v1/sd/composed-treatment:obligation:runtime-only:sd:juvenile-trafficking-expungement--custom-pleading/fixtures/canonical.pdf` — `d292e9b4f2d0c9b11dd90ca0f662c24544d53a1e10cd7dc5ee241cd720c05655`
- boundary `data/rcap-all50/overlays/census-v1/sd/composed-treatment:obligation:runtime-only:sd:juvenile-trafficking-expungement--custom-pleading/fixtures/boundary.pdf` — `4a4cd512bf4a30df9fb527c9aafeb3836c30a852c34648e91be7bb2a9ab4e401`
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

- canonical `data/rcap-all50/overlays/census-v1/dc/dc-correct-misattributed-arrest-set--custom-pleading/fixtures/canonical.pdf` — `31beb81d0a97122b9517b17d58d04527aba2bae88ecd157e05b9755a4dd35a27`
- boundary `data/rcap-all50/overlays/census-v1/dc/dc-correct-misattributed-arrest-set--custom-pleading/fixtures/boundary.pdf` — `f1086e078bce597b9629f86afc4e0f683d4d1c41ff704d3aee5d94caeccb0d72`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### dc_seal_nonconviction-set

- canonical `data/rcap-all50/overlays/census-v1/dc/dc-seal-nonconviction-set--custom-pleading/fixtures/canonical.pdf` — `3a4096596d848b88b439868f527ae4108a2c201a13ba61aabb187a04916fa0a8`
- boundary `data/rcap-all50/overlays/census-v1/dc/dc-seal-nonconviction-set--custom-pleading/fixtures/boundary.pdf` — `968bddea6c675c7fc08aa25f1400f3bdac75713152bffa96591f80c0aac40c36`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### de_mandatory_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/de/de-mandatory-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `fe6116767ab21cd12f5448c6cb389072f32e4650e3a3b7f8d8bb82168e124f00`
- boundary `data/rcap-all50/overlays/census-v1/de/de-mandatory-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `45f57fe5ba073034ce2f3e3411c1b87410123ae51a56f235fbbb4e1d8656d3bb`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### fl-expunction-set

- canonical `data/rcap-all50/overlays/census-v1/fl/fl-expunction-set--official-pdf-fill/fixtures/canonical.pdf` — `d4ae558c7bab2beba6c529a6cfdaa13cd480cc98f422f1e0545ab85b127ab436`
- boundary `data/rcap-all50/overlays/census-v1/fl/fl-expunction-set--official-pdf-fill/fixtures/boundary.pdf` — `efbeff7d0b1dc8d65122b2f7a8c08fd973f669f4922e1745b51853b08ffdeb0d`
- expected pages 10 · requested scale 2.5
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

### ia-12346-set

- **6 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ia/ia-12346-set--official-pdf-fill/fixtures/canonical.pdf` — `9a058658022ea3ae36eac169faa4315d9d90514bbe46960ab50d46ab4a508197` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ia/ia-12346-set--official-pdf-fill/fixtures/later-conviction.pdf` — `aa4567bb6dbb9f8e94552b33cba3c5dc5a5d3524e623955032d97b48121e3728` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ia/ia-12346-set--official-pdf-fill/fixtures/local-ordinance.pdf` — `9dde2189fe457e7777db5504f920659cfbd6753cd13b7aee2438267864ba4021` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ia/ia-12346-set--official-pdf-fill/fixtures/missing-contact.pdf` — `9de9271521a0c36c37c6505c86ec1818348acb7687f4bdc033227e52cdc1038a` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ia/ia-12346-set--official-pdf-fill/fixtures/permitted-traffic.pdf` — `747ac8d67d5091068b44ec8759917fe28d1d5e01d3057feed659b3cae3aa5192` · 4 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ia/ia-12346-set--official-pdf-fill/fixtures/boundary.pdf` — `92795d893671fde33bd6d05c89c0474f6ee1f7f9d95a97c4f81d91c2ef328afe` · 4 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ia/ia-12346-set--official-pdf-fill/fixtures/canonical.pdf` and `data/rcap-all50/overlays/census-v1/ia/ia-12346-set--official-pdf-fill/fixtures/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 24 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### ia-901c3-set

- **8 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ia/ia-901c3-set--official-pdf-fill/fixtures/canonical.pdf` — `88bac4b89ec8b794bb27b1505813a793879e18232842f75004463b5ff146a72f` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ia/ia-901c3-set--official-pdf-fill/fixtures/additional-aliases.pdf` — `4b23f143b8083db032c013387ee4604a67e6a62b4975732ca47d0a18a1a04c6c` · 7 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ia/ia-901c3-set--official-pdf-fill/fixtures/exact-eight-years.pdf` — `163ea3289b2f1093db54be226d1c8e245bb853f30742fbb07a72a5669a29191d` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ia/ia-901c3-set--official-pdf-fill/fixtures/history-requested.pdf` — `225b0bcbd7b42ba52b26399704b76f7327ba07d4f3d055cd780e1bdb64dc8a06` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ia/ia-901c3-set--official-pdf-fill/fixtures/history-stale.pdf` — `774df6ce3778f2b9bdf059e56a6e1f3af1945fdafdb47f9ad025ef95bc5e7780` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ia/ia-901c3-set--official-pdf-fill/fixtures/missing-identifiers.pdf` — `d80a5f92f5605712e29d945f0fdd54ef1f6b1eb942c3e3fa6fe551a78e6dc44f` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ia/ia-901c3-set--official-pdf-fill/fixtures/release-missing.pdf` — `557b8c32de00217b807cf3c215a7da322866211379f33ff3c0eca320bb9e3a39` · 6 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ia/ia-901c3-set--official-pdf-fill/fixtures/boundary.pdf` — `b6f8ab5d7d6d4f258aeadf773c2f9b106b0d6f7f4a9ec7a059cc56d591c7e59f` · 6 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ia/ia-901c3-set--official-pdf-fill/fixtures/canonical.pdf` and `data/rcap-all50/overlays/census-v1/ia/ia-901c3-set--official-pdf-fill/fixtures/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 49 across all documents · requested scale 2.5
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

### il-prb-cert-set

- **8 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/il/il-prb-cert-set--official-pdf-fill/fixtures/canonical.pdf` — `e4a8bcff0157b944eea6af8d9f9c32ced0fb26143789e15fe32a2a8fa9073e7a` · 11 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/il/il-prb-cert-set--official-pdf-fill/fixtures/court-canonical.pdf` — `567884e37b55fbf0bf45e92341a8233c3a228e7baecaf380181aea68e9d9e7f6` · 10 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/il/il-prb-cert-set--official-pdf-fill/fixtures/court-military-canonical.pdf` — `9c83eb23471e3863c01196e40877c00c970b18fd34cfd7792ebe17c8c5ec85a4` · 10 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/il/il-prb-cert-set--official-pdf-fill/fixtures/military-canonical.pdf` — `a2e9cc56453556e534e14180d5b3f571a6ae19416c5c3b7733a75c687b97eb92` · 11 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/il/il-prb-cert-set--official-pdf-fill/fixtures/boundary.pdf` — `317b7f60fd3c90ee380ca7e72a474ce1dd70357c3961eea8c806ef3662c49211` · 11 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/il/il-prb-cert-set--official-pdf-fill/fixtures/court-boundary.pdf` — `ebcc4b27a351a7871d4f8b027bb0d70b5fc2b70e9ab9678f4e04edfd4b1cbcaf` · 10 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/il/il-prb-cert-set--official-pdf-fill/fixtures/court-military-boundary.pdf` — `ab2d5cf1164459a00b412f08d0752e3ccefc064614c743394f4aa585eba27466` · 10 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/il/il-prb-cert-set--official-pdf-fill/fixtures/military-boundary.pdf` — `85c1070313c31d9ad186d863816facda21efeb9fff1493aed7dbf7e0eeb4456d` · 11 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/il/il-prb-cert-set--official-pdf-fill/fixtures/canonical.pdf` and `data/rcap-all50/overlays/census-v1/il/il-prb-cert-set--official-pdf-fill/fixtures/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 84 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### il-seal-edu-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-seal-edu-set--official-pdf-fill/fixtures/canonical.pdf` — `27b895defb18c09f85c66c17a3cf8636a2b1b4e91d25203659f160bd0cf21072`
- boundary `data/rcap-all50/overlays/census-v1/il/il-seal-edu-set--official-pdf-fill/fixtures/boundary.pdf` — `6470dd271861c33ccf42e8eac7c0ad2e63e2d0824751d1c4ce532cc3c7c9679d`
- expected pages 17 · requested scale 2.5
- built by (no builder lane recorded)

### in_conviction_felony-set

- canonical `data/rcap-all50/overlays/census-v1/in/in-conviction-felony-set--custom-pleading/fixtures/canonical.pdf` — `a45a328ccb5a609ac69fd97216686b6d919c123bcff0e4822a82991d066cb072`
- boundary `data/rcap-all50/overlays/census-v1/in/in-conviction-felony-set--custom-pleading/fixtures/boundary.pdf` — `5ad46014f9ee63d779ae512de3ef9f05be0758a1d86c076e5b625e3a4a8972fc`
- expected pages 10 · requested scale 2.5
- built by (no builder lane recorded)

### ks-21-6614-conviction-set

- canonical `data/rcap-all50/overlays/census-v1/ks/ks-21-6614-conviction-set--official-pdf-fill/fixtures/canonical.pdf` — `e546bdfa7a3783ce450f1b1ef6b961946387b14fc3a2f90dcacc5731b0b84adb`
- boundary `data/rcap-all50/overlays/census-v1/ks/ks-21-6614-conviction-set--official-pdf-fill/fixtures/boundary.pdf` — `3bc6c62ba0d183cda4ef05e9dfb17f87e1d70a68a157b81dc03c8811a4851324`
- expected pages 20 · requested scale 2.5
- built by (no builder lane recorded)

### ky_criminal_record_segregation-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-criminal-record-segregation-set--custom-pleading/fixtures/canonical.pdf` — `688787fb65152b5bb91ee9677012709e808db28da9dccb7599f85a631ac97970`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-criminal-record-segregation-set--custom-pleading/fixtures/boundary.pdf` — `7e8e5f3eda4cc8cd5a5cc5a29d6c10e83eae825a3508a24e4d9ed7732a5cb470`
- expected pages 5 · requested scale 2.5
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

### mo-610-140-arrest-set

- canonical `data/rcap-all50/overlays/census-v1/mo/mo-610-140-arrest-set--official-pdf-fill/canonical.packet.pdf` — `f07fd49e8770119addd24e852e443b354e90ca5a8b029cad6145226377585b3b`
- boundary `data/rcap-all50/overlays/census-v1/mo/mo-610-140-arrest-set--official-pdf-fill/boundary.packet.pdf` — `233c9a0ba97f120c9c2dfdec828506c7d185ae1f795dbc11e68d0bdf1917a5eb`
- expected pages 13 · requested scale 2.5
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

### mt_mmrta_serving-set

- **5 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/mt/mt-mmrta-serving-set--official-pdf-fill/fixtures/canonical.pdf` — `cb494781b090118086848e04e9e714c87c997c6cebd908927bc05c604a2a2b3f` · 9 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/mt/mt-mmrta-serving-set--official-pdf-fill/fixtures/boundary.pdf` — `61531f34ec8955a708a32d94c2dd9e811fb8e2f626dbdd909aed6ae0cd5ede42` · 9 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/mt/mt-mmrta-serving-set--official-pdf-fill/fixtures/city-resentencing.pdf` — `da83a413eec95a297946ea744c5203ac3e38c33b9ca6ae7de839278f7c765dd7` · 9 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/mt/mt-mmrta-serving-set--official-pdf-fill/fixtures/expungement-order.pdf` — `5f7cd616d19305ea041762f04ba63059725ed7365dba3e2d6433d8473d3699fa` · 11 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/mt/mt-mmrta-serving-set--official-pdf-fill/fixtures/boundary-separate-conviction.pdf` — `ba604c33455973c6d19e25ea0d4a3285b0a354cf26b4c73f9bab6712be5627cd` · 9 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/mt/mt-mmrta-serving-set--official-pdf-fill/fixtures/canonical.pdf` and `data/rcap-all50/overlays/census-v1/mt/mt-mmrta-serving-set--official-pdf-fill/fixtures/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 47 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### nc_146_acquittal_petition-set

- canonical `data/rcap-all50/overlays/census-v1/nc/nc-146-acquittal-petition-set--official-pdf-fill/fixtures/canonical.pdf` — `135dc7b9c0f104788512f1e313a6d88b4497c88a70fc6b18b92abe45bceecf17`
- boundary `data/rcap-all50/overlays/census-v1/nc/nc-146-acquittal-petition-set--official-pdf-fill/fixtures/boundary.pdf` — `5597a2818dc8914554b24418cba87d418676dc1ddfe2111967df1a6c4f30a3da`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### nd-prohibit-remote-public-access-set

- canonical `data/rcap-all50/overlays/census-v1/nd/nd-prohibit-remote-public-access-set--official-pdf-fill/fixtures/canonical.pdf` — `17a5d0c6c61879acb826e73b7966650c0a7eaad1e96de02575fe49062298633b`
- boundary `data/rcap-all50/overlays/census-v1/nd/nd-prohibit-remote-public-access-set--official-pdf-fill/fixtures/boundary.pdf` — `6047963ba3003fedf901eec00d50166f0124f132410a949cb7a832e1b10e36b5`
- expected pages 32 · requested scale 2.5
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

### rcap-ks-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/ks/rcap-ks-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `0da4dbab6b7be1f15ebb4ca2e5fa7810f6c8e34f366dc87b4131c311a4d0ec74`
- boundary `data/rcap-all50/overlays/census-v1/ks/rcap-ks-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `e12e30be68deb94e934bb3ab3080b1cc0d0c048810781f8491710c5740cd55c7`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-oh-custom-pleading-clean-tracks

- **8 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/continuation/oh_2953_32_expungement/canonical/packet.pdf` — `921aaee56fda2cb21a6425751da4f980b3ec7792d73ee934b0a71f3d2d6696f8` · 11 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/continuation/oh_2953_32_sealing/canonical/packet.pdf` — `39cbc8b4af44f6c5d0dec7fcdea80dff6a603114f6476624d372a0b8fea3aceb` · 11 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/continuation/oh_2953_33_nonconviction/canonical/packet.pdf` — `917c814b45b351f9d95dc617f60a1ad11b2daae5d295ff1aaaccebee6d63b4f9` · 10 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/continuation/oh_2953_35_firearm/canonical/packet.pdf` — `a8e1d589ec21ab1179256ff1d52cfea0666b35998804918b0562db30e8c7d2ce` · 10 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/continuation/oh_2953_32_expungement/boundary/packet.pdf` — `167d86f5dc9002b11ee1a02bcf1c9c6f94e2d24b55d2ec5baa86b72be8605d6a` · 11 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/continuation/oh_2953_32_sealing/boundary/packet.pdf` — `cdaa42a2edd816435c00a228a0cb99fca0c98bf700d02a4294c53a0177622f61` · 11 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/continuation/oh_2953_33_nonconviction/boundary/packet.pdf` — `84bb8746d1618133f5b1ea06b425a2b42686480ec923365ecede70d266b99f33` · 10 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/continuation/oh_2953_35_firearm/boundary/packet.pdf` — `963b58477d4e4a639c2ba27ee179c77c35fe589bef6de9c0895482e91be4b625` · 10 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/continuation/oh_2953_33_nonconviction/canonical/packet.pdf` and `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/continuation/oh_2953_33_nonconviction/boundary/packet.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 84 across all documents · requested scale 2.5
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

### tx_nd_dwi_deferred-set

- canonical `data/rcap-all50/overlays/census-v1/tx/tx-nd-dwi-deferred-set--official-pdf-fill/fixtures/canonical.pdf` — `008ba7d0539d4180433d3b7e7873cd9332b4ca393bff216c2aa1da94225d601e`
- boundary `data/rcap-all50/overlays/census-v1/tx/tx-nd-dwi-deferred-set--official-pdf-fill/fixtures/boundary.pdf` — `9d900a0808e972c75bb5b0f1192c0c76c45cf8694f56f9046ad6ae6b067076b8`
- expected pages 24 · requested scale 2.5
- built by (no builder lane recorded)

### tx_nd_veterans_reemployment-set

- canonical `data/rcap-all50/overlays/census-v1/tx/tx-nd-veterans-reemployment-set--official-pdf-fill/fixtures/canonical.pdf` — `83d84d23b5a92855b7a13522302a4fbb5f5ca351f5469384d3affe1332ddb13f`
- boundary `data/rcap-all50/overlays/census-v1/tx/tx-nd-veterans-reemployment-set--official-pdf-fill/fixtures/boundary.pdf` — `16806113112a90ed8fa5c0758293a3f9fe35ccf7fddb394098fa8546f7a656a6`
- expected pages 22 · requested scale 2.5
- built by (no builder lane recorded)

### ut_pet_dismissed_with_prejudice-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-dismissed-with-prejudice-set--official-pdf-fill/fixtures/canonical.pdf` — `53f275aeee3fe0caf9e83b0bdf2d30e4152f523215a3631ae7b0f9ebbdb2401a`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-dismissed-with-prejudice-set--official-pdf-fill/fixtures/boundary.pdf` — `f37d2e7eda71cfe2a444e09b2e169f50d54b514b116a8b0bdf32049954179a3f`
- expected pages 19 · requested scale 2.5
- built by (no builder lane recorded)

### ut_pet_remove_link-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-remove-link-set--official-pdf-fill/fixtures/canonical.pdf` — `fd705afae7e177db7824e1ce48256e2a025c916b496c046cef70a61ff9e9e687` · 13 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-remove-link-set--official-pdf-fill/fixtures/commissioner-canonical.pdf` — `8243a5588b1f2986453d669b006dbe60341b48ef25b431c213c7d0483a0fe0ed` · 14 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-remove-link-set--official-pdf-fill/fixtures/boundary.pdf` — `8ef10345cf84bcbc895ede81b2b03a276a30c8fe78ce7f0a0d3e517e25286cce` · 13 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-remove-link-set--official-pdf-fill/fixtures/commissioner-boundary.pdf` — `14fab1bdf21a42e27374eefae64803fda0bf01cd9ab378055d8cd8a16fb8337e` · 14 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ut/ut-pet-remove-link-set--official-pdf-fill/fixtures/canonical.pdf` and `data/rcap-all50/overlays/census-v1/ut/ut-pet-remove-link-set--official-pdf-fill/fixtures/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 54 across all documents · requested scale 2.5
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

### wa_crop_certificate_of_restoration-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-crop-certificate-of-restoration-set--custom-pleading/fixtures/canonical.pdf` — `44d858039dfd15ea013f3d3d431cc74d277d3b8a59d2a12f7edde490808678c9`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-crop-certificate-of-restoration-set--custom-pleading/fixtures/boundary.pdf` — `9eecfba4d9b8ba5d5ed0feba913e46ffd18a98f708038616a624701130ab8288`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_homicide_victim_prostitution-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill/fixtures/canonical.pdf` — `89e365937729d7d03b84227fed09dc323ffe0742e4de8829a7a30b4e97597afe`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill/fixtures/boundary.pdf` — `beaba6025b3bcf3e06666da72efff8654283d9aa2796fce0a2c93123c07b1aaf`
- expected pages 11 · requested scale 2.5
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
FAMILIES ASSIGNED: 82
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
