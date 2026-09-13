# RAS02

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `6867ee44777ce3c9e88afda8b4bad8c3d8e8e31a`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (79)

### agency-application-treatment:obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_investigation_and_finding_request

- canonical `data/rcap-all50/overlays/census-v1/co/agency-application-treatment:obligation:research-decision-route:co:co-mistaken-identity-expungement:participant-investigation-and-finding-request--official-pdf-fill/fixtures/canonical.pdf` — `53170a66c1217b01ecae9991c4977c61d2c49b329a913f3c13982639c6e49ef5`
- boundary `data/rcap-all50/overlays/census-v1/co/agency-application-treatment:obligation:research-decision-route:co:co-mistaken-identity-expungement:participant-investigation-and-finding-request--official-pdf-fill/fixtures/boundary.pdf` — `7877f06d224ed44b870d92ed9d2dbdaf4c9a471795f8799ce6bb4c414df7bb3d`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### agency-application-treatment:obligation:track-only:CT:ct-provisional-pardon

- canonical `data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-only:ct:ct-provisional-pardon--official-pdf-fill/fixtures/canonical.pdf` — `7be19142413dc94c9605f021f0efc291a17f9753eff726b575de485b228c1a49`
- boundary `data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-only:ct:ct-provisional-pardon--official-pdf-fill/fixtures/boundary.pdf` — `2f90e5f0d5a16b4cd38c921cb347d679b66179b0c3bbc3776dbe23bad590ecdb`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### ak-mistaken-identity-set

- canonical `data/rcap-all50/overlays/census-v1/ak/ak-mistaken-identity-set--official-pdf-fill/fixtures/canonical.pdf` — `29f4ca66e3be60cb84dd9a720100722ae3ec4823f15f3712913b500470ef62c6`
- boundary `data/rcap-all50/overlays/census-v1/ak/ak-mistaken-identity-set--official-pdf-fill/fixtures/boundary.pdf` — `758301c28be02067aa54a0903e04051cffe57fbee363ece5e33618e7e428c623`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### al-felony-dwop-set

- canonical `data/rcap-all50/overlays/census-v1/al/al-felony-dwop-set--official-pdf-fill/fixtures/canonical.pdf` — `77f6fb0c16f67919bf70dd313e9fe37440a13fb14a45ff468a20b9948d9fc2f2`
- boundary `data/rcap-all50/overlays/census-v1/al/al-felony-dwop-set--official-pdf-fill/fixtures/boundary.pdf` — `ee75749847d352ab3eaf51da70a08d6b22e86aa1a972cc32b22a88eabcefd95c`
- expected pages 11 · requested scale 2.5
- built by (no builder lane recorded)

### al-misd-nonconviction-90-set

- canonical `data/rcap-all50/overlays/census-v1/al/al-misd-nonconviction-90-set--official-pdf-fill/fixtures/canonical.pdf` — `a78e750dbfab51d1c78da841c09e02e2a095f12110879cf430a21de8d0a58d86`
- boundary `data/rcap-all50/overlays/census-v1/al/al-misd-nonconviction-90-set--official-pdf-fill/fixtures/boundary.pdf` — `92e03761acd5adb3c7b503c3373f14c36a4c09e038b6c107c940b6823059a06b`
- expected pages 11 · requested scale 2.5
- built by (no builder lane recorded)

### ar-act346-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-act346-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `75bffbd8493de56f1f39b7f67ff9dc93e50926fb284678209d11610eb2512f76` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-act346-set--official-pdf-fill/fixtures/order-canonical-filled.pdf` — `cb9d2019b25a9f492dcd6d483c642d2c9961d23ff6e3e8eb0db50a4c7a0c1a32` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-act346-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `59a301da89ce8b7535d84781e06a88c78f60946053d3b9d8ab4db0a1b99536c8` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-act346-set--official-pdf-fill/fixtures/order-boundary-filled.pdf` — `36d0464105a775214a93026296b38ee1822595cf4d807ed61066f09caf44e871` · 3 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ar/ar-act346-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/ar/ar-act346-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 16 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### ar-drug-court-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-drug-court-set--official-pdf-fill/fixtures/post-adjudication-canonical.pdf` — `503224a7b3d8b51a867beabbacd06b6fd40d81c4ae90f90cdce5d586b44a4aff` · 9 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-drug-court-set--official-pdf-fill/fixtures/pre-adjudication-canonical.pdf` — `87dafe5c83a0c958ee0e22a2b2fbad74156160d5e4c16ee56d83d4a6a5b91326` · 9 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-drug-court-set--official-pdf-fill/fixtures/post-adjudication-boundary.pdf` — `c10e941bfbc589d3d764db324c89c77a89816e065de452aaae232602a5e90f21` · 9 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-drug-court-set--official-pdf-fill/fixtures/pre-adjudication-boundary.pdf` — `1c73806e7c00c43bc81d949c1198d410a2a5b41ee96710afca56a8b06fedd1d7` · 9 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ar/ar-drug-court-set--official-pdf-fill/fixtures/pre-adjudication-canonical.pdf` and `data/rcap-all50/overlays/census-v1/ar/ar-drug-court-set--official-pdf-fill/fixtures/pre-adjudication-boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 36 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### ar-nonconviction-seal-set

- canonical `data/rcap-all50/overlays/census-v1/ar/ar-nonconviction-seal-set--official-pdf-fill/fixtures/canonical.pdf` — `4cf919a7c096f3e8afadb99826a3fc8bb866a5d79e8d49c6ec649cad1a769661`
- boundary `data/rcap-all50/overlays/census-v1/ar/ar-nonconviction-seal-set--official-pdf-fill/fixtures/boundary.pdf` — `7353903f1880212d28926ab41f11f7af157a056856d8585b4fe175dbe556fed6`
- expected pages 7 · requested scale 2.5
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

### co_multiple_conviction_seal-set

- canonical `data/rcap-all50/overlays/census-v1/co/co-multiple-conviction-seal-set--official-pdf-fill/fixtures/canonical.pdf` — `dd8a44b1868186a98703443d84c9215caf5807b6b37d632f7fa10b1d6dc9bd5d`
- boundary `data/rcap-all50/overlays/census-v1/co/co-multiple-conviction-seal-set--official-pdf-fill/fixtures/boundary.pdf` — `c1c6377deca4dce8d9bb3abee5e78629b449ae1f86a75b719df4ebcf13f31d8f`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:nd-nonconviction-auto-close-verify

- canonical `data/rcap-all50/overlays/census-v1/nd/composed-treatment:nd-nonconviction-auto-close-verify--custom-pleading/fixtures/canonical.pdf` — `042abebbea6753740dab0b232722e76f715490cea12c634196fa6a337ad742a2`
- boundary `data/rcap-all50/overlays/census-v1/nd/composed-treatment:nd-nonconviction-auto-close-verify--custom-pleading/fixtures/boundary.pdf` — `db085007df35154ef81207938a75181b8a8e3c5cc2d874789aac92c4c9b0546d`
- expected pages 7 · requested scale 2.5
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

- canonical `data/rcap-all50/overlays/census-v1/dc/dc-correct-misattributed-arrest-set--custom-pleading/fixtures/canonical.pdf` — `d4e4125cb51ec2248468dc093da2d40f66ae1dafc380ed7c2d6f84ec8fc4ce7f`
- boundary `data/rcap-all50/overlays/census-v1/dc/dc-correct-misattributed-arrest-set--custom-pleading/fixtures/boundary.pdf` — `4a5cea51f550c553758c09e1ad96f21d0c0f751bdf77ee2da6adb7a2f9dc4225`
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

### fl-early-juvenile-set

- canonical `data/rcap-all50/overlays/census-v1/fl/fl-early-juvenile-set--official-pdf-fill/fixtures/canonical.pdf` — `f98816f1cd07d2e95918d416cc3776b6b54733523da0832b6943e12aa25b6f00`
- boundary `data/rcap-all50/overlays/census-v1/fl/fl-early-juvenile-set--official-pdf-fill/fixtures/boundary.pdf` — `3ce5201d21b2e97d6142cd73ccbf21dfc27584672d66a9a10b30a97c01e56fc0`
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

### ia-7251-set

- canonical `data/rcap-all50/overlays/census-v1/ia/ia-7251-set--official-pdf-fill/fixtures/canonical.pdf` — `00092fc77a11cfb8be6f6d4a49d85d8cb17c3263bb765a4c3a43df4d599e1097`
- boundary `data/rcap-all50/overlays/census-v1/ia/ia-7251-set--official-pdf-fill/fixtures/boundary.pdf` — `197519714a8e299244e2641b8c5fe2dab4a4ce67ec54da5ba13db842d1063bfe`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### id_felony_reduction-set

- canonical `data/rcap-all50/overlays/census-v1/id/id-felony-reduction-set--custom-pleading/fixtures/canonical.pdf` — `d246f76059f94a3f78286381d3ff6289cae01f5593b11c3625a50d223e33afd1`
- boundary `data/rcap-all50/overlays/census-v1/id/id-felony-reduction-set--custom-pleading/fixtures/boundary.pdf` — `8c5d84ecc8a8946d5ad51ad38326119f208ae4791775c7aff448af9ef7fabc48`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### il-exp-nonconv-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-exp-nonconv-set--official-pdf-fill/fixtures/canonical.pdf` — `66f6e94e2d12f903bc6049f8c2a2e589c906d62d16941b73013d42269f749a86`
- boundary `data/rcap-all50/overlays/census-v1/il/il-exp-nonconv-set--official-pdf-fill/fixtures/boundary.pdf` — `db3bb03c17bb2a10ad017cc38ddb19bd2920db52fb02636d19410e98c64022fa`
- expected pages 14 · requested scale 2.5
- built by (no builder lane recorded)

### il-exp-supervision-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-exp-supervision-set--official-pdf-fill/fixtures/canonical.pdf` — `330731d947e74856c6748be80041c3222d522f7ea421c2cacd5b02fd2beeb5fb`
- boundary `data/rcap-all50/overlays/census-v1/il/il-exp-supervision-set--official-pdf-fill/fixtures/boundary.pdf` — `df3754d4f3f15da219bba84363aa45fb2ad923416948dbe5fe02e1e709eb3cc2`
- expected pages 13 · requested scale 2.5
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

### ky_nonconviction_expungement-set

- **13 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `348e5677f471acea22dd6643fea1c820db8779f218b2563417682433a8884be2` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/selectable/acquittal-with-order.pdf` — `8b806d7edb05b79773c4cffb09e496ff16fe62805df4105c761d15d45c06c903` · 8 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/selectable/acquittal.pdf` — `47dc4c77498407c8d75fbed895191065a1e35b8b19f6d5283a83acfade1d2d8c` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/selectable/automatic-missed-exact-60-days.pdf` — `b3250b724ed748f48fe6126686d3dd0adbf594310ec09f12f06e1196a428b902` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/selectable/dismissed_with_prejudice-with-order.pdf` — `7608f5a1f6f2a82e13c2c8ab7e47fbf4fbd302a1d13fa0bf28388e521cd939b7` · 8 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/selectable/dismissed_with_prejudice.pdf` — `348e5677f471acea22dd6643fea1c820db8779f218b2563417682433a8884be2` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/selectable/felony_without_prejudice-with-order.pdf` — `61d4a78aa97cae751de0a07a232c1b77b6b3105fde28f52e94247b9d7471274e` · 8 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/selectable/felony_without_prejudice.pdf` — `52e2a1b5a160a8ded12da380ef7101b6bda8515431799f28c9d126a18ee3902a` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/selectable/misdemeanor_without_prejudice-with-order.pdf` — `700f772dd5d2feee0d76e001aab1cb7cabbcb574fb4bec96a29f936ffd388fcd` · 8 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/selectable/misdemeanor_without_prejudice.pdf` — `ba982c0b44e445ffe0897d0cd354aa2132d1b49a8ce17de624f11742388b74e1` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/selectable/no_indictment-with-order.pdf` — `ec9a5b1d2d706b209c5e5d4e96a7821c77ed960de8294b635a1056ca0eaba3af` · 8 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/selectable/no_indictment.pdf` — `996013880aa5fdf217212f8f0bf6cbd98c41b08a3561982c5f87ec5cc6849485` · 6 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `93f902bfe7108680379c49d5a4cf27273369b67a7794e989ee17c52a8ee20474` · 8 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/canonical.pdf` and `data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill/fixtures/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 90 across all documents · requested scale 2.5
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
FAMILIES ASSIGNED: 79
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
