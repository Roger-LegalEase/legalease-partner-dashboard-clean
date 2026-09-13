# RAS01

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `1c58063c769dca92c05bd6dfdc385f55b3d7dde4`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (83)

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

- canonical `data/rcap-all50/overlays/census-v1/ak/ak-courtview-set--official-pdf-fill/fixtures/tf810-canonical-filled.pdf` — `ac2111fa8215881775b35f198d5098aab766703ad55cf24a74a1e5aba843df83`
- boundary `data/rcap-all50/overlays/census-v1/ak/ak-courtview-set--official-pdf-fill/fixtures/tf810-boundary-filled.pdf` — `03b335a1c82762e2e3a98a9fe0e2d5dc8bd74896ade06b5c88100cd9afdd0e1e`
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

### co_decriminalized_conduct_seal-set

- canonical `data/rcap-all50/overlays/census-v1/co/co-decriminalized-conduct-seal-set--official-pdf-fill/fixtures/canonical.pdf` — `d002c853e5a21a0314ea9a359d975744c49699b473e2288224aa0dc57a882350`
- boundary `data/rcap-all50/overlays/census-v1/co/co-decriminalized-conduct-seal-set--official-pdf-fill/fixtures/boundary.pdf` — `48bfd2a6832b5df00c0c20e2e20892a8b624dc93e8da4390863e6d1cf9342514`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### co_municipal_conviction_seal-set

- canonical `data/rcap-all50/overlays/census-v1/co/co-municipal-conviction-seal-set--official-pdf-fill/fixtures/canonical.pdf` — `676d922f062ce75605d4aa1bd57cf16d6fe917ef408cfc82c49ae4863d3cb022`
- boundary `data/rcap-all50/overlays/census-v1/co/co-municipal-conviction-seal-set--official-pdf-fill/fixtures/boundary.pdf` — `1c483f89703a4547c4a4ae1689ff3efa1b0be92c1aca12b17454138994a9e2b5`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_court_petition_after_90_days

- canonical `data/rcap-all50/overlays/census-v1/co/composed-treatment:obligation:research-decision-route:co:co-mistaken-identity-expungement:participant-court-petition-after-90-days--custom-pleading/fixtures/canonical.pdf` — `34f8c54501970c7567897d9dfe1e6d17497971f675ba6e7101da28e8efc85739`
- boundary `data/rcap-all50/overlays/census-v1/co/composed-treatment:obligation:research-decision-route:co:co-mistaken-identity-expungement:participant-court-petition-after-90-days--custom-pleading/fixtures/boundary.pdf` — `c5f17a31df94a9860720e5e659ede20cd5327482021880cc0d366c90ec04c9d4`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:AK:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085

- canonical `data/rcap-all50/overlays/census-v1/ak/composed-treatment:obligation:runtime-only:ak:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085--custom-pleading/fixtures/canonical.pdf` — `2a7e3fa6eb3b583fdbddc5a365b6c2678e7a37ad0f8ebdd6b78a230eb39d98ad`
- boundary `data/rcap-all50/overlays/census-v1/ak/composed-treatment:obligation:runtime-only:ak:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085--custom-pleading/fixtures/boundary.pdf` — `d1ddb77c651df332ffa5c1fcb1593d1d1b7dfa913c39b42484b31830347389b7`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:MS:nonadjudication-under-99-15-26

- canonical `data/rcap-all50/overlays/census-v1/ms/composed-treatment:obligation:runtime-only:ms:nonadjudication-under-99-15-26--custom-pleading/fixtures/canonical.pdf` — `b6c18f619f45fbd2cf9a80e805b7a8c6d428427cf88c77c2f05083c758e396b2`
- boundary `data/rcap-all50/overlays/census-v1/ms/composed-treatment:obligation:runtime-only:ms:nonadjudication-under-99-15-26--custom-pleading/fixtures/boundary.pdf` — `c31fa42374b4b6c83b8388d76e6ff556d6e62f7b2f2f2c617ec2bceba3e20e90`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:OK:human-trafficking-survivor-relief

- canonical `data/rcap-all50/overlays/census-v1/ok/composed-treatment:obligation:runtime-only:ok:human-trafficking-survivor-relief--custom-pleading/fixtures/canonical.pdf` — `67be3cdb44bd2de086b4cd429c961348f547893e172faf67a5286db6e6c5ff09`
- boundary `data/rcap-all50/overlays/census-v1/ok/composed-treatment:obligation:runtime-only:ok:human-trafficking-survivor-relief--custom-pleading/fixtures/boundary.pdf` — `ca9b3234b184f78ea057a3e512ddf36fc0f0e3d022863952bc7e2cbdfd469797`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:WV:sex-trafficking-victim-vacatur-and-expungement

- canonical `data/rcap-all50/overlays/census-v1/wv/composed-treatment:obligation:runtime-only:wv:sex-trafficking-victim-vacatur-and-expungement--custom-pleading/fixtures/canonical.pdf` — `7a4c4974e0dea9803b384343fd3979cd2c7843e7d50d2447cd3dd3f7a01b7e26`
- boundary `data/rcap-all50/overlays/census-v1/wv/composed-treatment:obligation:runtime-only:wv:sex-trafficking-victim-vacatur-and-expungement--custom-pleading/fixtures/boundary.pdf` — `d9e5a17599e4a26d6478969ea549c9e8651f83b8df80123d026f7782e23055f0`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### ct-cannabis-petition-set

- canonical `data/rcap-all50/overlays/census-v1/ct/ct-cannabis-petition-set--custom-pleading/fixtures/canonical.pdf` — `73f32cf14f330bb162ad0792eecd8b6351e51905d31c6d9c40b0e9bd933a97a3`
- boundary `data/rcap-all50/overlays/census-v1/ct/ct-cannabis-petition-set--custom-pleading/fixtures/boundary.pdf` — `017fe825b8c4d19d7c2ae85d21415454e2d6527754e501b51f33a31a235cce81`
- expected pages 4 · requested scale 2.5
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

### de_pardon_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/de/de-pardon-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `7bce0bddd5eef1c0f23f264da8146805c52d4cc8dff16b8871ef78bfe1a97fe9`
- boundary `data/rcap-all50/overlays/census-v1/de/de-pardon-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `68f209017dc63ff37828c0bfb35e4f162a380a533ad821274b8beee0ad34dfb9`
- expected pages 3 · requested scale 2.5
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

### mo-610-140-conviction-set

- canonical `data/rcap-all50/overlays/census-v1/mo/mo-610-140-conviction-set--official-pdf-fill/canonical.packet.pdf` — `63fbcb28a5f03b4a6aedc4ffedbdf820964e80f1f43e5fe39de7496895682cde`
- boundary `data/rcap-all50/overlays/census-v1/mo/mo-610-140-conviction-set--official-pdf-fill/boundary.packet.pdf` — `81794ac34c1f2620ba21e3ff5ce30c16c854ab0a425f65daad843e9d7c9719dc`
- expected pages 12 · requested scale 2.5
- built by (no builder lane recorded)

### ms-fel-set

- canonical `data/rcap-all50/overlays/census-v1/ms/ms-fel-set--custom-pleading/fixtures/canonical.pdf` — `584c7bb5c7de383b2d33df792f245c661ced217a0fde8e202b743f180c52a696`
- boundary `data/rcap-all50/overlays/census-v1/ms/ms-fel-set--custom-pleading/fixtures/boundary.pdf` — `ae89bac9fcf797e06359c1dc79d6d04143f92b172b9541ab98b0d68360a9df1e`
- expected pages 10 · requested scale 2.5
- built by (no builder lane recorded)

### ms-nonconv-set

- canonical `data/rcap-all50/overlays/census-v1/ms/ms-nonconv-set--custom-pleading/fixtures/canonical.pdf` — `732e7f47cff8659b30712c3fc0e886c9ac141052955d1aefbb7f3008aa63f845`
- boundary `data/rcap-all50/overlays/census-v1/ms/ms-nonconv-set--custom-pleading/fixtures/boundary.pdf` — `87e4bf90460e42f74dc220b31c23e90ce16206c43a2ee5d6cc78fd71ac583d58`
- expected pages 11 · requested scale 2.5
- built by (no builder lane recorded)

### nc_146_acquittal_petition-set

- canonical `data/rcap-all50/overlays/census-v1/nc/nc-146-acquittal-petition-set--official-pdf-fill/fixtures/canonical.pdf` — `135dc7b9c0f104788512f1e313a6d88b4497c88a70fc6b18b92abe45bceecf17`
- boundary `data/rcap-all50/overlays/census-v1/nc/nc-146-acquittal-petition-set--official-pdf-fill/fixtures/boundary.pdf` — `5597a2818dc8914554b24418cba87d418676dc1ddfe2111967df1a6c4f30a3da`
- expected pages 3 · requested scale 2.5
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

### ut_pet_traffic-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-traffic-set--official-pdf-fill/fixtures/canonical.pdf` — `b5fcdd1601c823f3ebc6b18f74f5b639789220ec9e8363202c6e1492f9d90909`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-traffic-set--official-pdf-fill/fixtures/boundary.pdf` — `ef8b488fe1f78f87a47419ddf2123ad9909b88612931a8c031ade0299a8d6e03`
- expected pages 9 · requested scale 2.5
- built by (no builder lane recorded)

### va_seal_ancillary_matter_only-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-seal-ancillary-matter-only-set--official-pdf-fill/fixtures/canonical.pdf` — `60962eef718b1048f55d7392818354057fa41636640ae20bc5ec34da49d9367e`
- boundary `data/rcap-all50/overlays/census-v1/va/va-seal-ancillary-matter-only-set--official-pdf-fill/fixtures/boundary.pdf` — `bbf887ccdc75f2cab73d6afb98e9bcc6607ceee248b551b4872c742a0c3f4992`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### vt_exp_decriminalized-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-exp-decriminalized-set--official-pdf-fill/fixtures/canonical.pdf` — `a037678f261d665110b15b66fd3a2d02ee5d555097f0d8c1b780d5b36473c97b`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-exp-decriminalized-set--official-pdf-fill/fixtures/boundary.pdf` — `80a016982254099af7ab558616ba8d96169e61244c5796d2fbaf6bcebefecd6a`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### vt_seal_felony-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-felony-set--official-pdf-fill/fixtures/canonical.pdf` — `81dd74a0ee1d178cefcb0f028dfba3e9bc7dbd7687bcf58193b0b9d62d767dee`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-felony-set--official-pdf-fill/fixtures/boundary.pdf` — `7ff3cc2272008865eba1d723e1d8dc4074b8163c7c6dbca82cf665003e32750e`
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
FAMILIES ASSIGNED: 83
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
