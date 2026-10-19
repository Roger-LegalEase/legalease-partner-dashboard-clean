# RAS01

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `9146920428ffc964b6f733e9c70ba76abd93ef5d`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (85)

### agency-application-treatment:obligation:research-decision-route:AL:al-uncharged-arrest:agency_record_challenge

- canonical `data/rcap-all50/overlays/census-v1/al/agency-application-treatment:obligation:research-decision-route:al:al-uncharged-arrest:agency-record-challenge--official-pdf-fill/fixtures/canonical.pdf` — `95fed142e8fab838496cc9bf531e2268a4d45c9e3c375f8dab1e70a7ec1303c5`
- boundary `data/rcap-all50/overlays/census-v1/al/agency-application-treatment:obligation:research-decision-route:al:al-uncharged-arrest:agency-record-challenge--official-pdf-fill/fixtures/boundary.pdf` — `c9a3b9b16e77d75105628785ea19e9168e3d0a2318a43efd8a253e4450e39ea7`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### agency-application-treatment:obligation:track-only:CT:ct-destruction-request

- canonical `data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-only:ct:ct-destruction-request--official-pdf-fill/fixtures/canonical.pdf` — `f4202551dba55116bcd9ead310b38700909ce453290aeca5d334a68b969b482c`
- boundary `data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-only:ct:ct-destruction-request--official-pdf-fill/fixtures/boundary.pdf` — `682aeb934e38e4bc5280da02cfcda775b2e88ac0d52db03bf33a9bb978dda28b`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### ak-courtview-set

- canonical `data/rcap-all50/overlays/census-v1/ak/ak-courtview-set--official-pdf-fill/fixtures/tf810-canonical-filled.pdf` — `a72b97a7b86f00104ee7aab5f67ec8334b1aa9ad6b57232e42f3617d09d17b4f`
- boundary `data/rcap-all50/overlays/census-v1/ak/ak-courtview-set--official-pdf-fill/fixtures/tf810-boundary-filled.pdf` — `6eafd49dba8dd15c1e87707aae7fd9f12295ef17da0234a81fcca9055adbb469`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### al-diversion-set

- canonical `data/rcap-all50/overlays/census-v1/al/al-diversion-set--official-pdf-fill/fixtures/canonical.pdf` — `6af87d8d5e0135bfda243977b9c8988d966ed5a2146a316dfcf7cfa4a8fe9772`
- boundary `data/rcap-all50/overlays/census-v1/al/al-diversion-set--official-pdf-fill/fixtures/boundary.pdf` — `3efe0cf5550cffcdd41100c5ff6beed33a46924af2680ef27122512cf28a2cbf`
- expected pages 11 · requested scale 2.5
- built by (no builder lane recorded)

### al-misd-dwop-set

- canonical `data/rcap-all50/overlays/census-v1/al/al-misd-dwop-set--official-pdf-fill/fixtures/canonical.pdf` — `9e1b87e29e468d436a9e15866fa1c5fdae9e1c3356e4801e06bfeb00e8c48e7b`
- boundary `data/rcap-all50/overlays/census-v1/al/al-misd-dwop-set--official-pdf-fill/fixtures/boundary.pdf` — `977f25c0ca80b4960b5887d35d59d1599f8c655e2a65549615fe6028368b974a`
- expected pages 11 · requested scale 2.5
- built by (no builder lane recorded)

### al-trafficking-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/al/al-trafficking-set--custom-pleading/fixtures/canonical--felony.pdf` — `00d7b59fe3fcfd0fb1e6569bbcbc89f7f85f2689d4e013483b74033118ba58d7` · 11 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/al/al-trafficking-set--custom-pleading/fixtures/canonical--misdemeanor.pdf` — `55424a42f6edf456e2b3039837716760f0072d5d9e889c918ec01a08bfea1cf9` · 11 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/al/al-trafficking-set--custom-pleading/fixtures/boundary--felony.pdf` — `34ce702982b5882c50b024e027b5c60d045406ba7588e77fd155cf461b7e1d5e` · 11 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/al/al-trafficking-set--custom-pleading/fixtures/boundary--misdemeanor.pdf` — `13b79d33cc416e6009518cc438fe59ffbf2db14e1302f841c07a85859fde4192` · 11 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/al/al-trafficking-set--custom-pleading/fixtures/canonical--misdemeanor.pdf` and `data/rcap-all50/overlays/census-v1/al/al-trafficking-set--custom-pleading/fixtures/boundary--misdemeanor.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 44 across all documents · requested scale 2.5
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

### az_certificate_second_chance-set

- canonical `data/rcap-all50/overlays/census-v1/az/az-certificate-second-chance-set--official-pdf-fill/fixtures/canonical.pdf` — `5fa7e6d4f0761fa26d932ca667878a4acb50bdf18b6854cd25a9a2cb3ab7a27a`
- boundary `data/rcap-all50/overlays/census-v1/az/az-certificate-second-chance-set--official-pdf-fill/fixtures/boundary.pdf` — `e8414477b71352df8e01ebfdce17bd1c66e07c9ca09af30fef062313deef2bfa`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### az_record_sealing_arrest_no_charges-set

- **6 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/az/az-record-sealing-arrest-no-charges-set--official-pdf-fill/fixtures/canonical/order.pdf` — `152fe92b232a9a96a5be8aceaffd79d6f6f281887e91fdb27fd43227ad8264a0` · 3 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/az/az-record-sealing-arrest-no-charges-set--official-pdf-fill/fixtures/canonical/packet-assembly.pdf` — `e9a10f6b4748a104579837d65700073c2d0b81f54ffde43f1e3de44191024bc8` · 8 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/az/az-record-sealing-arrest-no-charges-set--official-pdf-fill/fixtures/canonical/petition.pdf` — `0c0d3e2a3fc21194a90c487157cceaf7d96696a88db191e756728180bf5f9f2e` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/az/az-record-sealing-arrest-no-charges-set--official-pdf-fill/fixtures/boundary/order.pdf` — `9b030ea1d81736c83e0a7684e5fa8998ac556c3fe435bd283d94d29e3a9fcb88` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/az/az-record-sealing-arrest-no-charges-set--official-pdf-fill/fixtures/boundary/packet-assembly.pdf` — `0a199685a887524883eee342819f3b339d5c5b64d283ac202c509d408b13ef6f` · 8 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/az/az-record-sealing-arrest-no-charges-set--official-pdf-fill/fixtures/boundary/petition.pdf` — `86a413597d060d97bb1cb6241fd6d05f012e7ef3b4ed26d83330cc5678573069` · 5 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/az/az-record-sealing-arrest-no-charges-set--official-pdf-fill/fixtures/canonical/packet-assembly.pdf` and `data/rcap-all50/overlays/census-v1/az/az-record-sealing-arrest-no-charges-set--official-pdf-fill/fixtures/boundary/packet-assembly.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 32 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### az_wrongful_arrest_clearance-set

- canonical `data/rcap-all50/overlays/census-v1/az/az-wrongful-arrest-clearance-set--custom-pleading/fixtures/canonical.pdf` — `cd20be1831add85c2dd2ab0d4e8090c43c427e3ff47c1d9200dd5963e94da569`
- boundary `data/rcap-all50/overlays/census-v1/az/az-wrongful-arrest-clearance-set--custom-pleading/fixtures/boundary.pdf` — `2d57e14bab951b4f5eb443d6bfb633f8cf0c08a4cd27ca553c16f21269e633f8`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### ca-1203-43-set

- **6 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-43-set--official-pdf-fill/fixtures/pc-1203-43-canonical/cr-106-unchanged-official.pdf` — `f8a37a9a8c30a016b432bb39fd67407717c3dee7be74bc3e3d471127bf190c5a` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-43-set--official-pdf-fill/fixtures/pc-1203-43-canonical/cr-180-filled.pdf` — `d2ee7689a134dd808796a840adc358badda96c90f2586601cb4867332768703e` · 3 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-43-set--official-pdf-fill/fixtures/pc-1203-43-canonical/cr-181-unchanged-official.pdf` — `f737503a89465d40206b11b1123e815e44a249d324bad16d313c337a695ce504` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-43-set--official-pdf-fill/fixtures/pc-1203-43-boundary/cr-106-unchanged-official.pdf` — `f8a37a9a8c30a016b432bb39fd67407717c3dee7be74bc3e3d471127bf190c5a` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-43-set--official-pdf-fill/fixtures/pc-1203-43-boundary/cr-180-filled.pdf` — `c0b2eeec2627a2566828f988f527fb325615ce567fbd7092a9122f749f0dee67` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-43-set--official-pdf-fill/fixtures/pc-1203-43-boundary/cr-181-unchanged-official.pdf` — `f737503a89465d40206b11b1123e815e44a249d324bad16d313c337a695ce504` · 2 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ca/ca-1203-43-set--official-pdf-fill/fixtures/pc-1203-43-canonical/cr-180-filled.pdf` and `data/rcap-all50/overlays/census-v1/ca/ca-1203-43-set--official-pdf-fill/fixtures/pc-1203-43-boundary/cr-180-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 14 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### ca-diversion-seal-set

- canonical `data/rcap-all50/overlays/census-v1/ca/ca-diversion-seal-set--official-pdf-fill/fixtures/canonical.pdf` — `ab9dd5490b40b6f8d5c4a6c222ed4da4cc7bb15b8ad84c421ff6742f3f2164db`
- boundary `data/rcap-all50/overlays/census-v1/ca/ca-diversion-seal-set--official-pdf-fill/fixtures/boundary.pdf` — `341341f895acb5eebbc692cebb4b2ab52d0e3ce33211c5170aef8de1d33584e0`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### census-pending-family:UT:path-m-juvenile-expungement

- canonical `data/rcap-all50/overlays/census-v1/ut/census-pending-family:ut:path-m-juvenile-expungement--official-pdf-fill/fixtures/canonical.pdf` — `faebbde6fdbfdb90078e0a6d090813b74bef373a2ee277f29284e5119a726a85`
- boundary `data/rcap-all50/overlays/census-v1/ut/census-pending-family:ut:path-m-juvenile-expungement--official-pdf-fill/fixtures/boundary.pdf` — `6231956bf23bfe282da1ca303455678920b4ba92902bd512939f78183f97fa07`
- expected pages 2 · requested scale 2.5
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

### ks-22-2410-arrest-set

- canonical `data/rcap-all50/overlays/census-v1/ks/ks-22-2410-arrest-set--official-pdf-fill/fixtures/canonical.pdf` — `07bcda32a0700091871c819f4f03d17c9babf8b6627bc691ffc48871968e12a8`
- boundary `data/rcap-all50/overlays/census-v1/ks/ks-22-2410-arrest-set--official-pdf-fill/fixtures/boundary.pdf` — `7ca350c37451fd8aa12ea101ced3ee5ea8c0538c0192d42264aa301b09e9f559`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### ky_felony_expungement_after_pardon-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-felony-expungement-after-pardon-set--official-pdf-fill/fixtures/canonical.pdf` — `5c757ed8c07c7ed75a2e55b0d1d6fd8c524c31b5c15c5325201a58305ceb501a`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-felony-expungement-after-pardon-set--official-pdf-fill/fixtures/boundary.pdf` — `585a3a90aba6f8617d0589e8ba990e02004c45fb71f226c9aeb72da6d53eff5f`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### ky_protective_order_record_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-protective-order-record-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `dd797c6d4783f58979d964d0d483a9270261a1832177fe9b0a0150e2ef04d63e`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-protective-order-record-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `b219565f8e930db532f7613a3302e8433b4a933c32c679aab3eb1edb7df6a97d`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### la-977-misdemeanor-conviction-set

- canonical `data/rcap-all50/overlays/census-v1/la/la-977-misdemeanor-conviction-set--custom-pleading/fixtures/canonical.pdf` — `fd2d1324bab0740bf0c05ac3680baaba851524fd8e5997062ea27b48b90c3446`
- boundary `data/rcap-all50/overlays/census-v1/la/la-977-misdemeanor-conviction-set--custom-pleading/fixtures/boundary.pdf` — `35e8a1e90c10289940347d2471b2872f3582eb59a547ea9e48e14f9f0c363efe`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### la-985-expungement-by-redaction-set

- canonical `data/rcap-all50/overlays/census-v1/la/la-985-expungement-by-redaction-set--custom-pleading/fixtures/canonical.pdf` — `b1d880af0c6539383329e73491b0bb6d293f3fba4ea3509d32abcd894926ef8c`
- boundary `data/rcap-all50/overlays/census-v1/la/la-985-expungement-by-redaction-set--custom-pleading/fixtures/boundary.pdf` — `378c0dab12934eaf89e71f37ecf5489e53a7e3f6fe015ce387a63b85e9c87fc1`
- expected pages 17 · requested scale 2.5
- built by (no builder lane recorded)

### ma-expunge-mj-set

- canonical `data/rcap-all50/overlays/census-v1/ma/ma-expunge-mj-set--official-pdf-fill/fixtures/canonical.pdf` — `ceab4012296b4e132466a11ebc5239fd72ae553fd5a5554f7ddfc110fcb8f565`
- boundary `data/rcap-all50/overlays/census-v1/ma/ma-expunge-mj-set--official-pdf-fill/fixtures/boundary.pdf` — `ceab4012296b4e132466a11ebc5239fd72ae553fd5a5554f7ddfc110fcb8f565`
- expected pages 2 · requested scale 2.5
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

### mi_setaside_application-set

- **8 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/canonical.pdf` — `50743b57033e7ca6cf498bcc63902fbd29c15a0c2fd03dd39a7cfc756251bf5c` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/extended-history.pdf` — `f64e2a043bfd055b1e54de1d5c6947aa75b6b24144370aba5da286c1516cf6e3` · 7 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/local-ordinance.pdf` — `059e1198182dbbd8cb5d19a65f3912b12d6cee7551d961259024def698e16a71` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/mixed-ordinary-categories.pdf` — `d321419699f611eb774717b28f28f3090c1f92413c3e5d9cbdfaeef5c5e097ee` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/multiple-felonies.pdf` — `8caf55b0d211c6333fe6facaa1418b4a64a1537b6d10586dcbf70163fab8bfdf` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/serious-misdemeanor.pdf` — `4d46d8c3cef8a24a194ca3e03d292d7761aea2e6278dcc107eca313a1ca17cd0` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/single-felony.pdf` — `87a93436fec5cd2b604252337b1ae70a54d65516f3faac6196edacff4f8807bc` · 4 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/boundary.pdf` — `f3829e41b5a9458279fe6f07cfba744be113701f6b1393f5f40b94f11c536e49` · 5 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/canonical.pdf` and `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 36 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### mn_petition_15218-set

- canonical `data/rcap-all50/overlays/census-v1/mn/mn-petition-15218-set--official-pdf-fill/fixtures/canonical.pdf` — `cbdea2b8edd3e7151fc376273ac59832c2dbbb0486ad04b7cb08073fce5b3346`
- boundary `data/rcap-all50/overlays/census-v1/mn/mn-petition-15218-set--official-pdf-fill/fixtures/boundary.pdf` — `9ef91d9772ab7307e8877fc52e4db7878b1c4c2a2bf0106d8d63ce10fa7deeda`
- expected pages 17 · requested scale 2.5
- built by (no builder lane recorded)

### mo-575-120-identity-theft-correction-set

- canonical `data/rcap-all50/overlays/census-v1/mo/mo-575-120-identity-theft-correction-set--official-pdf-fill/fixtures/canonical.pdf` — `973805ea6f5d9e94cbb96800bdd7af7beb6e5dfa1edea88f69870349b4bb6f58`
- boundary `data/rcap-all50/overlays/census-v1/mo/mo-575-120-identity-theft-correction-set--official-pdf-fill/fixtures/boundary.pdf` — `06ff8c3a114cc89b3b3d569036543d890e0d026d5abed2e9bee586290d39172f`
- expected pages 10 · requested scale 2.5
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

### nd-summary-marijuana-pardon-set

- canonical `data/rcap-all50/overlays/census-v1/nd/nd-summary-marijuana-pardon-set--official-pdf-fill/fixtures/canonical.pdf` — `b305228a5f6acb2ac116795aff1d16d61816c2354a2c35f4de2914016949a847`
- boundary `data/rcap-all50/overlays/census-v1/nd/nd-summary-marijuana-pardon-set--official-pdf-fill/fixtures/boundary.pdf` — `c98c75b4fa712dd7bf5a61367d0ffb47a9d9ecd11f9f62679b43283521466bb8`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### ne-seal-pre2017-set

- **6 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ne/ne-seal-pre2017-set--official-pdf-fill/fixtures/canonical--acquitted.pdf` — `99fa983e5b037b19d64e853eb0aa6ef530c06911140f1d39b93c5e8800f57cc3` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ne/ne-seal-pre2017-set--official-pdf-fill/fixtures/canonical--dismissed-problem-solving-court.pdf` — `8276f744a698a9f409ad8e5355cd0b904ba0ef395022656d4708360941025cc3` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ne/ne-seal-pre2017-set--official-pdf-fill/fixtures/canonical--dismissed-prosecutor-motion.pdf` — `b1d925196b99ecd3699cc9100edaf1ee171a70195ecec84575ba6435aab5465a` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ne/ne-seal-pre2017-set--official-pdf-fill/fixtures/boundary--acquitted.pdf` — `6927025913e151db1ee30de011784109d70aefbaf6bb85a5a51f130679760910` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ne/ne-seal-pre2017-set--official-pdf-fill/fixtures/boundary--dismissed-problem-solving-court.pdf` — `5304c510290377d00333290c4d0948de13f44e40d5dd9b749fe57f44a98bd892` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ne/ne-seal-pre2017-set--official-pdf-fill/fixtures/boundary--dismissed-prosecutor-motion.pdf` — `f3f282bcc1d89bdb9ab829665c29abffe939db712a764925c70bfec92307c7ca` · 5 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ne/ne-seal-pre2017-set--official-pdf-fill/fixtures/canonical--dismissed-prosecutor-motion.pdf` and `data/rcap-all50/overlays/census-v1/ne/ne-seal-pre2017-set--official-pdf-fill/fixtures/boundary--dismissed-prosecutor-motion.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 30 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### nh_conviction_standard-set

- canonical `data/rcap-all50/overlays/census-v1/nh/nh-conviction-standard-set--official-pdf-fill/fixtures/canonical.pdf` — `bd2a4c278778d4b61cdee81110ecccfe2ba93a3f794e04f8a929ffdafcadebe3`
- boundary `data/rcap-all50/overlays/census-v1/nh/nh-conviction-standard-set--official-pdf-fill/fixtures/boundary.pdf` — `78908658fd0dc118ea0112c03bcec2bd0b6f7ab3a4c6b878bdaa8a1d6d91383f`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### nh_petition_vacated-set

- canonical `data/rcap-all50/overlays/census-v1/nh/nh-petition-vacated-set--official-pdf-fill/fixtures/canonical.pdf` — `277c0be84797512220ff62a0af7eaf6290a5f388f3a35223938284a53448c8d4`
- boundary `data/rcap-all50/overlays/census-v1/nh/nh-petition-vacated-set--official-pdf-fill/fixtures/boundary.pdf` — `219ea0df35f85495f4d14a69d4da30cbc9305a669d9a5be1b329ea5a97339c7c`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### nj_indictable_conviction-set

- canonical `data/rcap-all50/overlays/census-v1/nj/nj-indictable-conviction-set--official-pdf-fill/fixtures/cn-10557-canonical.pdf` — `e067d90c9ce9c7f95439d4bec7b533b8c3964c790f2b9008be86838b4ecf8283`
- boundary `data/rcap-all50/overlays/census-v1/nj/nj-indictable-conviction-set--official-pdf-fill/fixtures/cn-10557-boundary.pdf` — `e159d8846305d52946314ba5e980fb5f844aa84adf9bffb825424af22586ad44`
- expected pages 43 · requested scale 2.5
- built by (no builder lane recorded)

### nm_release_without_conviction-set

- canonical `data/rcap-all50/overlays/census-v1/nm/nm-release-without-conviction-set--official-pdf-fill/fixtures/canonical.pdf` — `1a6b59ac0a327692222cac1a67072061441b2cccb843c5ba8ae85478462fba65`
- boundary `data/rcap-all50/overlays/census-v1/nm/nm-release-without-conviction-set--official-pdf-fill/fixtures/boundary.pdf` — `6ccdce6e3bfb85e996c9d4d640f7b8ca5b178ebb074d54e5b3eac50d46ba770c`
- expected pages 19 · requested scale 2.5
- built by (no builder lane recorded)

### official-form-treatment:obligation:research-decision-route:AL:al-olr

- canonical `data/rcap-all50/overlays/census-v1/al/official-form-treatment:obligation:research-decision-route:al:al-olr--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `9414ff9d97234b9d98f6362c198acec77d7921c789a273f990a927bb487e8449`
- boundary `data/rcap-all50/overlays/census-v1/al/official-form-treatment:obligation:research-decision-route:al:al-olr--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `6b04f5d39f52f7cdea4c5771b7df24c43a2f266b67c986514d9e490d5afdc6bc`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### or_conviction_setaside-set

- canonical `data/rcap-all50/overlays/census-v1/or/or-conviction-setaside-set--official-pdf-fill/fixtures/canonical.pdf` — `a2d72e3f54c58a7590a681a93b015a82660056790077dd508b97d6d3e50c5b0b`
- boundary `data/rcap-all50/overlays/census-v1/or/or-conviction-setaside-set--official-pdf-fill/fixtures/boundary.pdf` — `2375b62449222756817f4338188fef6475f0f6323c237ba3f63a47c99396b360`
- expected pages 9 · requested scale 2.5
- built by (no builder lane recorded)

### pa_9122_1_limited_access-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/pa/pa-9122-1-limited-access-set--official-pdf-fill/fixtures/rule-791-order-canonical.pdf` — `573f9f81adb7887973d1a365b1e0b032f38f0e7312118d74e41413ea4b09918c` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/pa/pa-9122-1-limited-access-set--official-pdf-fill/fixtures/rule-791-petition-canonical.pdf` — `8996b09209eb45a12c7985155e579dc4ae2bbc6368ffdc7fba67506f137e163c` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/pa/pa-9122-1-limited-access-set--official-pdf-fill/fixtures/rule-791-order-boundary.pdf` — `bd2954aed8fe55d1041f2ce274894d5be3f5d055e2add76a2f7a6492355a4cc9` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/pa/pa-9122-1-limited-access-set--official-pdf-fill/fixtures/rule-791-petition-boundary.pdf` — `db4067c897f6d36e5e2a1085de6a3c4e9f2e94eb8df312dc531166bb082acff3` · 1 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/pa/pa-9122-1-limited-access-set--official-pdf-fill/fixtures/rule-791-petition-canonical.pdf` and `data/rcap-all50/overlays/census-v1/pa/pa-9122-1-limited-access-set--official-pdf-fill/fixtures/rule-791-petition-boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 6 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### rcap-ga-guidance-implementation

- canonical `data/rcap-all50/overlays/census-v1/ga/rcap-ga-guidance-implementation--custom-pleading/fixtures/canonical.pdf` — `a20096ba7ee519ce80e24c7085bfa92e4be974997b2e09cb3e967f0fd2175406`
- boundary `data/rcap-all50/overlays/census-v1/ga/rcap-ga-guidance-implementation--custom-pleading/fixtures/boundary.pdf` — `d239a09c3f370c130f80b4df8ab8d52d747aaf482f83a821a0840077cb9a3167`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-mo-custom-pleading

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/mo/rcap-mo-custom-pleading--custom-pleading/fixtures/intoxication-canonical.pdf` — `b96dc246487c78d566eb7fdc0f4bb806e477d07708ae8be9dee9efdf1654e86a` · 8 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mo/rcap-mo-custom-pleading--custom-pleading/fixtures/mip-canonical.pdf` — `da002da0ba3492f0ef6e46184fbbd73b6a5f86c482c65016c75c5e31979e8ce6` · 7 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/mo/rcap-mo-custom-pleading--custom-pleading/fixtures/intoxication-boundary.pdf` — `a108e7b28cb24111bb259bb1c35f7a42f75d8345e07ffd83af344fa8b392a971` · 15 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/mo/rcap-mo-custom-pleading--custom-pleading/fixtures/mip-boundary.pdf` — `5f2905b4744e26b0d16938bdc473fa56a19bb327fd51641a68b82fb63f982e11` · 14 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/mo/rcap-mo-custom-pleading--custom-pleading/fixtures/mip-canonical.pdf` and `data/rcap-all50/overlays/census-v1/mo/rcap-mo-custom-pleading--custom-pleading/fixtures/mip-boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 44 across all documents · requested scale 2.5
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

### tx_nd_dwi_probation-set

- canonical `data/rcap-all50/overlays/census-v1/tx/tx-nd-dwi-probation-set--official-pdf-fill/fixtures/canonical.pdf` — `3250216674afdfb521a983a83d5ca573434d8126ad3b192ed27c37502a615574`
- boundary `data/rcap-all50/overlays/census-v1/tx/tx-nd-dwi-probation-set--official-pdf-fill/fixtures/boundary.pdf` — `4e96001018de68a0a2e02f12ed2e2ccf00b32c09b3a8e7d12374d9a269696fea`
- expected pages 24 · requested scale 2.5
- built by (no builder lane recorded)

### ut_pet_acquittal-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-acquittal-set--official-pdf-fill/fixtures/canonical.pdf` — `b66141455c34b548b8ce48bd3c94d73298b588f8cef604a757d154362971c6a5`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-acquittal-set--official-pdf-fill/fixtures/boundary.pdf` — `9a3c27215e66dedbfac637d63417a8459f5600e534aee825f940900aef6f02d4`
- expected pages 19 · requested scale 2.5
- built by (no builder lane recorded)

### ut_pet_dismissed_without_prejudice-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-dismissed-without-prejudice-set--official-pdf-fill/fixtures/canonical.pdf` — `53f275aeee3fe0caf9e83b0bdf2d30e4152f523215a3631ae7b0f9ebbdb2401a`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-dismissed-without-prejudice-set--official-pdf-fill/fixtures/boundary.pdf` — `f37d2e7eda71cfe2a444e09b2e169f50d54b514b116a8b0bdf32049954179a3f`
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

- `data/rcap-grade-a/codex-cloud/ras01-raster-evidence/**` — and nothing else.

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
LANE: RAS01
FAMILIES ASSIGNED: 85
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
