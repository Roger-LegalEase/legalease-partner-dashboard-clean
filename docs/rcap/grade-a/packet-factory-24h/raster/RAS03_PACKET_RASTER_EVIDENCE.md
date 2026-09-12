# RAS03

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `5e93d2aab1e64a3ad7f5651b83802703846b4e3c`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (74)

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

### ar-arrest-seal-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-arrest-seal-set--official-pdf-fill/fixtures/order-canonical-filled.pdf` — `161971dca56b9292dac5a8bd9eda03e2deb910d0c1cfbecc98d017bbf17841bb` · 3 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-arrest-seal-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `78ef189e981b35fec69688cc6d3181df245b309e7405c954fcabd503e426bea5` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-arrest-seal-set--official-pdf-fill/fixtures/order-boundary-filled.pdf` — `d633848fda999d95f9fa7e82284b82613af94d36512b1aa8b0914d36a13be194` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-arrest-seal-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `fb32678b598155af6d1436eeb51098cb665fe2f1711bd826ec2b980b1c30a811` · 3 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ar/ar-arrest-seal-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/ar/ar-arrest-seal-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 12 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### ar-misdemeanor-dwi-seal-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-misdemeanor-dwi-seal-set--official-pdf-fill/fixtures/order-canonical-filled.pdf` — `0466f3b488b5af28d236c62555c3592f48755ebc1381e52e265b2d1755ce0f52` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-misdemeanor-dwi-seal-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `6bf0184ddc31364f316cb656745f364f8def8aa547428beb881c4c632e2f750d` · 4 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-misdemeanor-dwi-seal-set--official-pdf-fill/fixtures/order-boundary-filled.pdf` — `d4a69cd9f0cd0713ed8f6cf9410dc80240c8e181662b2f87b5fd1ba3dffd22c0` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-misdemeanor-dwi-seal-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `a6cef12f7344600b5f9e89aefee9785440de185d88340d051b090ec6011bdfb8` · 4 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ar/ar-misdemeanor-dwi-seal-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/ar/ar-misdemeanor-dwi-seal-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 12 across all documents · requested scale 2.5
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

### composed-treatment:obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1017a_automatic_failure_correction

- canonical `data/rcap-all50/overlays/census-v1/de/composed-treatment:obligation:runtime-contract-cohort:de:juvenile-expungement-under-10-del-c-1017-1019-1017a:section-1017a-automatic-failure-correction--custom-pleading/fixtures/canonical.pdf` — `0e9809a8fba28867f03cada0daae2c2c882ff57f7a55f0a75c9151021a99b60e`
- boundary `data/rcap-all50/overlays/census-v1/de/composed-treatment:obligation:runtime-contract-cohort:de:juvenile-expungement-under-10-del-c-1017-1019-1017a:section-1017a-automatic-failure-correction--custom-pleading/fixtures/boundary.pdf` — `fd9884acbebe2e257e9e6b708c051f208490d4ad86468f73c3bac2339d132ac8`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:IL:criminal-identity-theft-mistaken-identity-relief

- canonical `data/rcap-all50/overlays/census-v1/il/composed-treatment:obligation:runtime-only:il:criminal-identity-theft-mistaken-identity-relief--custom-pleading/fixtures/canonical.pdf` — `433dc445780603b752a544532ca2965688aaeeba114482927f4d103ace1d49f3`
- boundary `data/rcap-all50/overlays/census-v1/il/composed-treatment:obligation:runtime-only:il:criminal-identity-theft-mistaken-identity-relief--custom-pleading/fixtures/boundary.pdf` — `09e11b80f75be41889ab70d9057b8d34de844e71c3c13f9715cd75e9084c313e`
- expected pages 3 · requested scale 2.5
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

### composed-treatment:sc_17_22_950_summary

- canonical `data/rcap-all50/overlays/census-v1/sc/composed-treatment:sc-17-22-950-summary--custom-pleading/fixtures/canonical.pdf` — `9742b771437d6bf34a3701e1a9838f35f49548f92e450011edf8622a31ce4c63`
- boundary `data/rcap-all50/overlays/census-v1/sc/composed-treatment:sc-17-22-950-summary--custom-pleading/fixtures/boundary.pdf` — `e5c37a603eff1af87cacc0f405aea4738aeb7f6ff65a7fb7d78527a7680f2cdb`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### ct-decriminalized-set

- canonical `data/rcap-all50/overlays/census-v1/ct/ct-decriminalized-set--custom-pleading/fixtures/canonical.pdf` — `9b6667f6ecbe38c2657b100a663727c227b6ce8f4e3244544041239b764218b2`
- boundary `data/rcap-all50/overlays/census-v1/ct/ct-decriminalized-set--custom-pleading/fixtures/boundary.pdf` — `b5134f47d6b55ea57179437561767b8c38c65e8be8d10281224549c2df442d83`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### ct-under18-misdemeanor-set

- canonical `data/rcap-all50/overlays/census-v1/ct/ct-under18-misdemeanor-set--custom-pleading/fixtures/canonical.pdf` — `590845d99eebe8690b046e6e165e2774307f008eb81def64b009603b70b556ae`
- boundary `data/rcap-all50/overlays/census-v1/ct/ct-under18-misdemeanor-set--custom-pleading/fixtures/boundary.pdf` — `3a951c8005870a9f49b4f426d2602fb4400430ff40c85af54b87adf5a7bb5888`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### dc_seal_fugitive-set

- canonical `data/rcap-all50/overlays/census-v1/dc/dc-seal-fugitive-set--custom-pleading/fixtures/canonical.pdf` — `315401332562ec19d602679d75a2a5e1789c2fb60163ec967c7791e0db65ee3a`
- boundary `data/rcap-all50/overlays/census-v1/dc/dc-seal-fugitive-set--custom-pleading/fixtures/boundary.pdf` — `291e6c0f544490fb66158b9fd15e769badc92564033d657529a62ece429513da`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### de_pardon_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/de/de-pardon-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `7bce0bddd5eef1c0f23f264da8146805c52d4cc8dff16b8871ef78bfe1a97fe9`
- boundary `data/rcap-all50/overlays/census-v1/de/de-pardon-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `68f209017dc63ff37828c0bfb35e4f162a380a533ad821274b8beee0ad34dfb9`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### fl-self-defense-set

- canonical `data/rcap-all50/overlays/census-v1/fl/fl-self-defense-set--official-pdf-fill/fixtures/canonical.pdf` — `a217288839ba7e3ed5b54ade1098e342dd07f6f72e915119b010933d151f853b`
- boundary `data/rcap-all50/overlays/census-v1/fl/fl-self-defense-set--official-pdf-fill/fixtures/boundary.pdf` — `627dfa777177431cb5cb8c8f9939a62b184e8628f0b007cb74059b84afe317ba`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### ga-fo-active-pre2026-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-fo-active-pre2026-set--custom-pleading/fixtures/canonical.pdf` — `e3ecc96b782b313a09977491d76d96c065a2c2082ef3375d025d1f9071b9e862`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-fo-active-pre2026-set--custom-pleading/fixtures/boundary.pdf` — `95eafa84a182bb34d9274f9d62b26d4eb78665df47dea34b8deb0a367f6a93d6`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### ga-misd-j4-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-misd-j4-set--custom-pleading/fixtures/canonical.pdf` — `b0bdee422f27e0071aa80c690e0cca34c2db05011401408d891e1be2dbc45890`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-misd-j4-set--custom-pleading/fixtures/boundary.pdf` — `682fb675da02adc43528a0d6d841bd7c3a428287b36e940788558589586a5470`
- expected pages 9 · requested scale 2.5
- built by (no builder lane recorded)

### ga-seal-m-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-seal-m-set--custom-pleading/fixtures/canonical.pdf` — `9b57311c3b69ac540a711dd174de9bec6d5b1b1fd7870dde4cbb592e2edf4796`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-seal-m-set--custom-pleading/fixtures/boundary.pdf` — `09abd2c2eacdc14fe2840688202ccf62d8506dd19f801e926cb2614c5b420182`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### hi_nonconviction_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/hi/hi-nonconviction-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `f15b906a649280d5bab03a81078d7f283a38eb3a81519773c15a2881f71b4d43`
- boundary `data/rcap-all50/overlays/census-v1/hi/hi-nonconviction-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `696e190fa18b54f8e7694eaed727dc7f8b10d7515a847d9fec904b9a3b3879a1`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### id_clean_slate_shield-set

- canonical `data/rcap-all50/overlays/census-v1/id/id-clean-slate-shield-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `fd888d5f7773d9a2c645dc38fc594d2c95f43e263ba9f35ca81b17ad8f24aa80`
- boundary `data/rcap-all50/overlays/census-v1/id/id-clean-slate-shield-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `ccfdf3fb1bf9e0ba3cd5b0e31bc44b7dd2ddd71da9b7984fb17e8d0ffa8afedf`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### il-cannabis-vacate-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-cannabis-vacate-set--official-pdf-fill/fixtures/canonical.pdf` — `130ccba7073cedaec918191053c2d7340da973e952ebff0cd482585197598fab`
- boundary `data/rcap-all50/overlays/census-v1/il/il-cannabis-vacate-set--official-pdf-fill/fixtures/boundary.pdf` — `8d0f9ac0877f52d86975d152f9c6587e82194644edc65190de1e55317d31a946`
- expected pages 11 · requested scale 2.5
- built by (no builder lane recorded)

### il-exp-qualprob-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-exp-qualprob-set--official-pdf-fill/fixtures/canonical.pdf` — `fb7c7dbd4bb01d187fadd69e6857a57be57d840d44049a23ecc9692a54927008`
- boundary `data/rcap-all50/overlays/census-v1/il/il-exp-qualprob-set--official-pdf-fill/fixtures/boundary.pdf` — `e8f82821fe6368795fe7f6cafcf774b1a10014661a5b1228284b05c3fa0139ec`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### il-seal-3yr-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-seal-3yr-set--official-pdf-fill/fixtures/canonical.pdf` — `a41c124a35be3eedc5442be0a9fdb900c3f36a026416ac4ca7675f8a36bfb433`
- boundary `data/rcap-all50/overlays/census-v1/il/il-seal-3yr-set--official-pdf-fill/fixtures/boundary.pdf` — `c8ca89313c78de63db38d91eaa00164e034e6a319070dbf591d38a537c01e9fb`
- expected pages 13 · requested scale 2.5
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

### nc_145_5_felony-set

- canonical `data/rcap-all50/overlays/census-v1/nc/nc-145-5-felony-set--official-pdf-fill/fixtures/canonical.pdf` — `c66b5e4246a39b0cc1d5fcbebcde8000080ac1cabcc1dec89815809eb71bacbb`
- boundary `data/rcap-all50/overlays/census-v1/nc/nc-145-5-felony-set--official-pdf-fill/fixtures/boundary.pdf` — `e0bd1765da62d1708f1ce334fbbe603ceaeaaf69dd1d7f3c262e234769e3223d`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### nd-deferred-imposition-records-set

- canonical `data/rcap-all50/overlays/census-v1/nd/nd-deferred-imposition-records-set--custom-pleading/fixtures/canonical.pdf` — `8d6c31287e83b99aa8a78568bab7aff0b8eb50efdf59f65c0de5ded7a20c9bf1`
- boundary `data/rcap-all50/overlays/census-v1/nd/nd-deferred-imposition-records-set--custom-pleading/fixtures/boundary.pdf` — `c972e9582608a156bd8ab7b1792d66c829edb8c93a50c1be28f5fcf526134a29`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### ne-expunge-le-error-set

- canonical `data/rcap-all50/overlays/census-v1/ne/ne-expunge-le-error-set--custom-pleading/fixtures/canonical.pdf` — `b3ad99b4a1ae52c251751a357bb0dc4745dd1ceb6281ed03861cb9a0988a9be8`
- boundary `data/rcap-all50/overlays/census-v1/ne/ne-expunge-le-error-set--custom-pleading/fixtures/boundary.pdf` — `df7386e9e32ad77e32fcbfebc123a0a0d5a31e24a46ad9a02050216a227c8f69`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### ne-setaside-custodial-set

- canonical `data/rcap-all50/overlays/census-v1/ne/ne-setaside-custodial-set--official-pdf-fill/fixtures/canonical.pdf` — `b02c3b62d14579e010deef29863fee2a85e28ed1abebc6acaa0514fdc1c0b7f4`
- boundary `data/rcap-all50/overlays/census-v1/ne/ne-setaside-custodial-set--official-pdf-fill/fixtures/boundary.pdf` — `c5dee7b4076a9c346954dcae4008c50783e86c45b90abdff9a2458306a5ae92c`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### nh_petition_nonconviction_pre2019-set

- canonical `data/rcap-all50/overlays/census-v1/nh/nh-petition-nonconviction-pre2019-set--official-pdf-fill/fixtures/canonical.pdf` — `adcd250e96f50e380bc9d15529130865be9d1a2c0336c139978c81acea70f0c6`
- boundary `data/rcap-all50/overlays/census-v1/nh/nh-petition-nonconviction-pre2019-set--official-pdf-fill/fixtures/boundary.pdf` — `b9cf9a1724750739ce93945ee01ed2939c97de2446dc95051c6628ef5f34af6f`
- expected pages 9 · requested scale 2.5
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

### ny_mrta_marijuana-set

- canonical `data/rcap-all50/overlays/census-v1/ny/ny-mrta-marijuana-set--official-pdf-fill/fixtures/mrta-destruction-request-canonical.pdf` — `37d456b6c2b79c3801bb9c07030072d5b0487a95f711a92a3fd8ef14e99b05ff`
- boundary `data/rcap-all50/overlays/census-v1/ny/ny-mrta-marijuana-set--official-pdf-fill/fixtures/mrta-destruction-request-boundary.pdf` — `5f61e8f23675070c7691b16c6522745f5fa033083725f1eefb9caccc32cb3457`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### or_conviction_setaside-set

- canonical `data/rcap-all50/overlays/census-v1/or/or-conviction-setaside-set--official-pdf-fill/fixtures/canonical.pdf` — `a2d72e3f54c58a7590a681a93b015a82660056790077dd508b97d6d3e50c5b0b`
- boundary `data/rcap-all50/overlays/census-v1/or/or-conviction-setaside-set--official-pdf-fill/fixtures/boundary.pdf` — `2375b62449222756817f4338188fef6475f0f6323c237ba3f63a47c99396b360`
- expected pages 9 · requested scale 2.5
- built by (no builder lane recorded)

### pa_age70_deceased-set

- canonical `data/rcap-all50/overlays/census-v1/pa/pa-age70-deceased-set--official-pdf-fill/fixtures/canonical.pdf` — `f4f4b3ba5263fff23c409e8b8ffda95c2ee3e1cf6fea623af5ddb09ed181639e`
- boundary `data/rcap-all50/overlays/census-v1/pa/pa-age70-deceased-set--official-pdf-fill/fixtures/boundary.pdf` — `03aefe90a39c91ac577858abeadf09c215e261f3fcb12fbe97ae8f1c7c1c2ac1`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-hi-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/hi/rcap-hi-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `fee2da64179ff2d2d9dcaa084febbbb33c86e91264a83d8602ba6f2bc94a7136`
- boundary `data/rcap-all50/overlays/census-v1/hi/rcap-hi-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `66fb5be12513ca388c083a89e19a19434aaf06891d5adaa8f1620703e13afb28`
- expected pages 20 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-nv-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/nv/rcap-nv-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `1d72131dcf8adefe7142cb2241aa97811b4c90892342d1422d3441b649e293bf`
- boundary `data/rcap-all50/overlays/census-v1/nv/rcap-nv-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `5274a3d33329f447612a9736ac31442a760dc24b4aa2acdc01d7061175578596`
- expected pages 44 · requested scale 2.5
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

### wv_conv_single_misdemeanor-set

- canonical `data/rcap-all50/overlays/census-v1/wv/wv-conv-single-misdemeanor-set--official-pdf-fill/fixtures/canonical.pdf` — `37764d50ba8f761661e2576cb76ff6a95aaf06bfbc2f00236ecc6c9c03e90ffa`
- boundary `data/rcap-all50/overlays/census-v1/wv/wv-conv-single-misdemeanor-set--official-pdf-fill/fixtures/boundary.pdf` — `c51fde179db7a9bf1ae3b44b93ba7c48695edf49a3459245bb7bb826462c397e`
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
FAMILIES ASSIGNED: 74
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
