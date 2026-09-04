# RAS04

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `f11fe46961ad4c4925c914874c96ef396b0ac398`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (49)

### ak-courtview-set

- canonical `data/rcap-all50/overlays/census-v1/ak/ak-courtview-set--official-pdf-fill/fixtures/tf810-canonical-filled.pdf` — `ac2111fa8215881775b35f198d5098aab766703ad55cf24a74a1e5aba843df83`
- boundary `data/rcap-all50/overlays/census-v1/ak/ak-courtview-set--official-pdf-fill/fixtures/tf810-boundary-filled.pdf` — `03b335a1c82762e2e3a98a9fe0e2d5dc8bd74896ade06b5c88100cd9afdd0e1e`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### al-diversion-set

- canonical `data/rcap-all50/overlays/census-v1/al/al-diversion-set--official-pdf-fill/fixtures/canonical.pdf` — `e48735ac0ce95d253521ae40b35af659177130ddb3ffdf798496a190b8304b9b`
- boundary `data/rcap-all50/overlays/census-v1/al/al-diversion-set--official-pdf-fill/fixtures/boundary.pdf` — `fd953692393c7184c3ee44b45be2abadf36afafccf920663c0d6f8a450c9ccb3`
- expected pages 11 · requested scale 2.5
- built by FIX02

### al-misd-dwop-set

- canonical `data/rcap-all50/overlays/census-v1/al/al-misd-dwop-set--official-pdf-fill/fixtures/canonical.pdf` — `413a9995ba8cc968543bb28f7cb1155d70c4b72d9973f85e582ec815cd257987`
- boundary `data/rcap-all50/overlays/census-v1/al/al-misd-dwop-set--official-pdf-fill/fixtures/boundary.pdf` — `9652926c43a5fcc237a46d363b922970316d6adfee7696ece6aa7d9f388f3c75`
- expected pages 11 · requested scale 2.5
- built by FIX06

### ar-cs-possession-seal-set

- canonical `data/rcap-all50/overlays/census-v1/ar/ar-cs-possession-seal-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `b2b487cc7dd10b3ce9e7f5b41a115859bb3d1ac6be6932ea1f6503219d6c530e`
- boundary `data/rcap-all50/overlays/census-v1/ar/ar-cs-possession-seal-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `046fbedea2db1dc1afa4895b13f279e7fabf626a1e0172e705a676fc769bc6f8`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### az_marijuana_expungement_arrest_no_charges-set

- canonical `data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-arrest-no-charges-set--official-pdf-fill/fixtures/aoc-crem3f-canonical-filled.pdf` — `6dad189b1cdb575dfc7ef7e0647c077440cd4e331a7e2bf389a522773099c5d3`
- boundary `data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-arrest-no-charges-set--official-pdf-fill/fixtures/aoc-crem3f-boundary-filled.pdf` — `8f041f1d4fd898a176746d1dd5aed7b5967c20b51b14609b7529b6056f9646a5`
- expected pages 3 · requested scale 2.5
- built by FIX04

### ca-1203-41-set

- canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-41-set--official-pdf-fill/fixtures/pc-1203-41-canonical/cr-180-filled.pdf` — `2299cbac4ebfb481b1566983535b75ee7a54b5d7053c6001c18345433448f45c`
- boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-41-set--official-pdf-fill/fixtures/pc-1203-41-boundary/cr-180-filled.pdf` — `d6442ef54a6f32501082bc9bd8874092dac6a67126ee5630367aacb17b1cf8d1`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### ca-17b-reduction-set

- canonical `data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/fixtures/pc-17b-felony-to-misdemeanor-canonical/cr-180-filled.pdf` — `bfea87d6fca45c64ba6a54aea353e731c7b3bdc75c56736fec7ec9b49014db36`
- boundary `data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/fixtures/pc-17b-felony-to-misdemeanor-boundary/cr-180-filled.pdf` — `1901cba4ac7afd2b458dad315a2eaf08851a6e69fea555a0e1edfd7ccd356d9c`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### co_multiple_conviction_seal-set

- canonical `data/rcap-all50/overlays/census-v1/co/co-multiple-conviction-seal-set--official-pdf-fill/fixtures/canonical.pdf` — `3cb52dc501311af75b69ef7c8e339849b0fbb2d632bd16e0f6b3a4483e89a0cd`
- boundary `data/rcap-all50/overlays/census-v1/co/co-multiple-conviction-seal-set--official-pdf-fill/fixtures/boundary.pdf` — `204a36fd7f6f27ba2dd630afd90c7065e5521419c8c379ef095ead0883101d44`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1017a_automatic_failure_correction

- canonical `data/rcap-all50/overlays/census-v1/de/composed-treatment:obligation:runtime-contract-cohort:de:juvenile-expungement-under-10-del-c-1017-1019-1017a:section-1017a-automatic-failure-correction--custom-pleading/fixtures/canonical.pdf` — `4357f7181b06cd732c158bd529ffa200976a88f9222c8d73736b5992122d209a`
- boundary `data/rcap-all50/overlays/census-v1/de/composed-treatment:obligation:runtime-contract-cohort:de:juvenile-expungement-under-10-del-c-1017-1019-1017a:section-1017a-automatic-failure-correction--custom-pleading/fixtures/boundary.pdf` — `6a33192824bf7fcecbb4d043d1c6daae4f84045cbb79a956d3cfb47781d69e34`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:IL:criminal-identity-theft-mistaken-identity-relief

- canonical `data/rcap-all50/overlays/census-v1/il/composed-treatment:obligation:runtime-only:il:criminal-identity-theft-mistaken-identity-relief--custom-pleading/fixtures/canonical.pdf` — `25f0c6a12204671455391f35dc7d1d801eef8266abdf08153190c960e7bd9426`
- boundary `data/rcap-all50/overlays/census-v1/il/composed-treatment:obligation:runtime-only:il:criminal-identity-theft-mistaken-identity-relief--custom-pleading/fixtures/boundary.pdf` — `c858109ebd5becf679a4029a3604b41cf3ca27e1b9cea913b3bf8fd1d227a2c6`
- expected pages 4 · requested scale 2.5
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

- canonical `data/rcap-all50/overlays/census-v1/ct/ct-decriminalized-set--custom-pleading/fixtures/canonical.pdf` — `089d79430041befc86af2d2480e51302ce1e150cdf8b6850739ae9fcfaf71955`
- boundary `data/rcap-all50/overlays/census-v1/ct/ct-decriminalized-set--custom-pleading/fixtures/boundary.pdf` — `7afffea3a27b5527be354e8a14efcf1bc3639a7ea39d3925c79ec97dffdf5a73`
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

### ga-felony-j1-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-felony-j1-set--custom-pleading/fixtures/canonical.pdf` — `87acee6328e42485183be789b94914bccd92fe6728807bd4c976f3dc74cdb856`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-felony-j1-set--custom-pleading/fixtures/boundary.pdf` — `c637ec1cd28c48db48adc796c67e5ba2401f001815e3cf09c2500e7d0914aec4`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### ga-misd-j4-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-misd-j4-set--custom-pleading/fixtures/canonical.pdf` — `b0bdee422f27e0071aa80c690e0cca34c2db05011401408d891e1be2dbc45890`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-misd-j4-set--custom-pleading/fixtures/boundary.pdf` — `682fb675da02adc43528a0d6d841bd7c3a428287b36e940788558589586a5470`
- expected pages 9 · requested scale 2.5
- built by (no builder lane recorded)

### ga-vacated-j2-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-vacated-j2-set--custom-pleading/fixtures/canonical.pdf` — `6c2ce97c8086b9f64684f20680feb603b903de1a7888ce1ab4b5a29686b4181c`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-vacated-j2-set--custom-pleading/fixtures/boundary.pdf` — `490dcbf4d162cc3c91fbf6a76147661285c3934e361ae70011e798e232cd0be5`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### id_felony_reduction-set

- canonical `data/rcap-all50/overlays/census-v1/id/id-felony-reduction-set--custom-pleading/fixtures/canonical.pdf` — `d246f76059f94a3f78286381d3ff6289cae01f5593b11c3625a50d223e33afd1`
- boundary `data/rcap-all50/overlays/census-v1/id/id-felony-reduction-set--custom-pleading/fixtures/boundary.pdf` — `8c5d84ecc8a8946d5ad51ad38326119f208ae4791775c7aff448af9ef7fabc48`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### il-exp-nonconv-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-exp-nonconv-set--official-pdf-fill/fixtures/canonical.pdf` — `be547c0bcdbc98cbcc2b2b9f5675220d478c01085474ca960ce2cda58d7cc5ba`
- boundary `data/rcap-all50/overlays/census-v1/il/il-exp-nonconv-set--official-pdf-fill/fixtures/boundary.pdf` — `eb99fb60f6d8825d6d9e363e852b78c49039b2f40cc3fa61adb427af14c44ba5`
- expected pages 14 · requested scale 2.5
- built by VF01

### il-exp-supervision-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-exp-supervision-set--official-pdf-fill/fixtures/canonical.pdf` — `330731d947e74856c6748be80041c3222d522f7ea421c2cacd5b02fd2beeb5fb`
- boundary `data/rcap-all50/overlays/census-v1/il/il-exp-supervision-set--official-pdf-fill/fixtures/boundary.pdf` — `df3754d4f3f15da219bba84363aa45fb2ad923416948dbe5fe02e1e709eb3cc2`
- expected pages 13 · requested scale 2.5
- built by VF02

### il-seal-edu-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-seal-edu-set--official-pdf-fill/fixtures/canonical.pdf` — `e995bd6d9ac45b010632f7329ccd9818bacf03b2b42f7a65e14748acabcd91a0`
- boundary `data/rcap-all50/overlays/census-v1/il/il-seal-edu-set--official-pdf-fill/fixtures/boundary.pdf` — `686de38584efa750545d03543757b872cc052e7c95eac14a91084e4353015b26`
- expected pages 13 · requested scale 2.5
- built by FIX04

### in_section1_petition-set

- canonical `data/rcap-all50/overlays/census-v1/in/in-section1-petition-set--official-pdf-fill/fixtures/packet-canonical-filled.pdf` — `f3cfeb3257e31a90b8f29f5bc264e9da1ad0e390f53e1d3c5950b20b4cbc0241`
- boundary `data/rcap-all50/overlays/census-v1/in/in-section1-petition-set--official-pdf-fill/fixtures/packet-boundary-filled.pdf` — `a7b34ccf21175518b5deb609818af3b04feda9c3280d0aaa3862b24714d9df3d`
- expected pages 15 · requested scale 2.5
- built by FIX05

### ky_void_seal_controlled_substance-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-void-seal-controlled-substance-set--custom-pleading/fixtures/canonical.pdf` — `e7419541f263c4fdc41bbcea0d45d4dd748a35830e722c02f88afd412c646037`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-void-seal-controlled-substance-set--custom-pleading/fixtures/boundary.pdf` — `0b864b30e140fd8b53adc948f6b294c093095e133b489dab27a745dd632db12f`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### md_second_chance_shielding-set

- canonical `data/rcap-all50/overlays/census-v1/md/md-second-chance-shielding-set--official-pdf-fill/fixtures/canonical.pdf` — `7265c7307fab7193a5dff3c5e2edb035ecad340122d2c587b476ef91752e777f`
- boundary `data/rcap-all50/overlays/census-v1/md/md-second-chance-shielding-set--official-pdf-fill/fixtures/boundary.pdf` — `00e402d6699ec3f872e0cdc205e182bf36a2dd919d6091b32b5f38cfbd36cf5d`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### mi_setaside_marihuana-set

- canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-marihuana-set--official-pdf-fill/fixtures/canonical.pdf` — `c1506f35f448464374ad7d080c9b71cde24a4902d90a15259248b3962995737b`
- boundary `data/rcap-all50/overlays/census-v1/mi/mi-setaside-marihuana-set--official-pdf-fill/fixtures/boundary.pdf` — `ac7806c7b4ed40e1dcac078b6dcd23e127aa3e9f31fb1d7d0097a4c411585e99`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### ms-misd-1st-set

- canonical `data/rcap-all50/overlays/census-v1/ms/ms-misd-1st-set--custom-pleading/fixtures/canonical.pdf` — `e9483733fabca9e031a024a30444a37b49f3d14c0fd84e6d579bd3f2209be897`
- boundary `data/rcap-all50/overlays/census-v1/ms/ms-misd-1st-set--custom-pleading/fixtures/boundary.pdf` — `90608c6244d1999dece4f87dc22632e7dda36f0302de22d3996437aebd7458b5`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### nc_146_dismissal_petition-set

- canonical `data/rcap-all50/overlays/census-v1/nc/nc-146-dismissal-petition-set--official-pdf-fill/fixtures/canonical.pdf` — `81d71db0020bdef1204898013cb9fd16a8cf3155c0f864c837a21945b1e40fb1`
- boundary `data/rcap-all50/overlays/census-v1/nc/nc-146-dismissal-petition-set--official-pdf-fill/fixtures/boundary.pdf` — `af582b143c3ef2da24ed5e769e7e1fbe240309186b8fc72dccbceeb3ecc6f251`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### ne-seal-enforcement-set

- canonical `data/rcap-all50/overlays/census-v1/ne/ne-seal-enforcement-set--custom-pleading/fixtures/canonical.pdf` — `611825ac4bd05fb2a1332f7a5c575bbab767c40c605c9320237d511dfc8ef9f2`
- boundary `data/rcap-all50/overlays/census-v1/ne/ne-seal-enforcement-set--custom-pleading/fixtures/boundary.pdf` — `ffe65671c6035dede3a79b1c7a99e87640af699de99520a58eb33743cd8462a7`
- expected pages 6 · requested scale 2.5
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
- built by (no builder lane recorded)

### oh_marijuana_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/oh/oh-marijuana-expungement-set--custom-pleading/tracks/oh_marijuana_expungement/rendered/canonical/canonical.pdf` — `ddf3d4840f5ef8fa46d0f80992c927c8ce9bbb24194604c317f97188908d027a`
- boundary `data/rcap-all50/overlays/census-v1/oh/oh-marijuana-expungement-set--custom-pleading/tracks/oh_marijuana_expungement/rendered/boundary/boundary.pdf` — `330138cf065ddac35a13d93d49ad1f2636479f71c02e63f4a60a5f9ac7b846a8`
- expected pages 3 · requested scale 2.5
- built by FIX08

### pa_9122_1_limited_access-set

- canonical `data/rcap-all50/overlays/census-v1/pa/pa-9122-1-limited-access-set--official-pdf-fill/fixtures/rule-791-petition-canonical.pdf` — `8996b09209eb45a12c7985155e579dc4ae2bbc6368ffdc7fba67506f137e163c`
- boundary `data/rcap-all50/overlays/census-v1/pa/pa-9122-1-limited-access-set--official-pdf-fill/fixtures/rule-791-petition-boundary.pdf` — `db4067c897f6d36e5e2a1085de6a3c4e9f2e94eb8df312dc531166bb082acff3`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-ga-guidance-implementation

- canonical `data/rcap-all50/overlays/census-v1/ga/rcap-ga-guidance-implementation--custom-pleading/fixtures/canonical.pdf` — `ecfb488b8adf6cdadbbe1489d4a7fb9a982a18d7e9bebe90b0c019b80a756914`
- boundary `data/rcap-all50/overlays/census-v1/ga/rcap-ga-guidance-implementation--custom-pleading/fixtures/boundary.pdf` — `6866fd683dad67e2a3b4be8db3773e424411850487748f2692ecaf9253d12e24`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-nv-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/nv/rcap-nv-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `0f054975494d0bb97d66418cc4ba84f6ca3da146e48b3182072bbda3d35e944e`
- boundary `data/rcap-all50/overlays/census-v1/nv/rcap-nv-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `6dc6ddc9242f0818237154075c5b0a2074ec60081d43f38eb259c5b4c7775048`
- expected pages 50 · requested scale 2.5
- built by FIX04

### rcap-tn-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/tn/rcap-tn-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `939fc692608c2fbc2c875d9657b036f43a429cd1b5c69d3b42e140df5c518c67`
- boundary `data/rcap-all50/overlays/census-v1/tn/rcap-tn-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `a8f1f6bbb6676f0d746a71aed087092da903b13b577610e217d22c885d5c303e`
- expected pages 78 · requested scale 2.5
- built by FIX08

### rcap-wv-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/wv/rcap-wv-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `c3e7ad175ab82426ab7d98f772717600edf936a583e0aa58caddecdd14c77b06`
- boundary `data/rcap-all50/overlays/census-v1/wv/rcap-wv-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `18576a72d6f9822958aead7f5551b2b9c52adf3c968d5ef422d7a612d029f194`
- expected pages 12 · requested scale 2.5
- built by (no builder lane recorded)

### sd_arrest_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/sd/sd-arrest-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `627e6502e0340f5d6d75ae855314cad53160d92acab710a1d43add2341dbe47d`
- boundary `data/rcap-all50/overlays/census-v1/sd/sd-arrest-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `79b2e9ac4ca0cfadba32a9896f39fe82ae7d0dc543d3a7a42d2a338bf318a8ed`
- expected pages 14 · requested scale 2.5
- built by FIX02

### tx_nd_dwi_probation-set

- canonical `data/rcap-all50/overlays/census-v1/tx/tx-nd-dwi-probation-set--official-pdf-fill/fixtures/canonical.pdf` — `f4e76632fdd4e41ec7d36a635f30030c0cef37ce08a19980c3b82b9199869667`
- boundary `data/rcap-all50/overlays/census-v1/tx/tx-nd-dwi-probation-set--official-pdf-fill/fixtures/boundary.pdf` — `deb1c6505ee4ec2817bf4ce266adfdf2845f76ab4d217e37d9908210d94bbdfe`
- expected pages 24 · requested scale 2.5
- built by (no builder lane recorded)

### ut_pet_dismissed_with_prejudice-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-dismissed-with-prejudice-set--official-pdf-fill/fixtures/canonical.pdf` — `ad594f0a40750195b67e36916f3628df5b96d337e4955c9063b415747d6e36d6`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-dismissed-with-prejudice-set--official-pdf-fill/fixtures/boundary.pdf` — `b3ba83a65754f96fe58083de62a3ce879654d6362170e11bae2f043e4c39a765`
- expected pages 19 · requested scale 2.5
- built by FIX06

### ut_pet_traffic-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-traffic-set--official-pdf-fill/fixtures/canonical.pdf` — `b5fcdd1601c823f3ebc6b18f74f5b639789220ec9e8363202c6e1492f9d90909`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-traffic-set--official-pdf-fill/fixtures/boundary.pdf` — `ef8b488fe1f78f87a47419ddf2123ad9909b88612931a8c031ade0299a8d6e03`
- expected pages 9 · requested scale 2.5
- built by VF04

### va_seal_ancillary_matter_only-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-seal-ancillary-matter-only-set--official-pdf-fill/fixtures/canonical.pdf` — `0ca22f4c4720d2d5325d67fa67657746292923fbfb45580ef94094d5e94ad893`
- boundary `data/rcap-all50/overlays/census-v1/va/va-seal-ancillary-matter-only-set--official-pdf-fill/fixtures/boundary.pdf` — `fcc5c9df64bd93e04cd5c6143cbb00f38a8895a965dd76ca00e62f3235d4c0a5`
- expected pages 10 · requested scale 2.5
- built by (no builder lane recorded)

### vt_exp_decriminalized-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-exp-decriminalized-set--official-pdf-fill/fixtures/canonical.pdf` — `4d9b64e07b2b3ed66e291ee11ddba00a37bfe413ed931ed459b271df46ca9da0`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-exp-decriminalized-set--official-pdf-fill/fixtures/boundary.pdf` — `d56f5a0fce5ba30c9c22a87aa5261c2545781e6cd8464b9b7816fb53f711fa4d`
- expected pages 8 · requested scale 2.5
- built by FIX02

### vt_seal_felony-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-felony-set--official-pdf-fill/fixtures/canonical.pdf` — `81525fd23e9489ce1225aaf953e28c0e68ad64c376dccf9143a5c14920bde942`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-felony-set--official-pdf-fill/fixtures/boundary.pdf` — `8f0058c992eaf6fec640b7519935f3e0d4c119348f90d7042dd1ee6b53501404`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### wa_crop_certificate_of_restoration-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-crop-certificate-of-restoration-set--custom-pleading/fixtures/canonical.pdf` — `44d858039dfd15ea013f3d3d431cc74d277d3b8a59d2a12f7edde490808678c9`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-crop-certificate-of-restoration-set--custom-pleading/fixtures/boundary.pdf` — `9eecfba4d9b8ba5d5ed0feba913e46ffd18a98f708038616a624701130ab8288`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_misdemeanor_ordinary-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-misdemeanor-ordinary-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` — `846360e75578ce6233dba77b03b25545a529b50cd553ad31f88d3008b429a6ad`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-misdemeanor-ordinary-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` — `75fac347051d6b710015ef5bbcc10b43df0a1de59078195ede75a744f4c42b77`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_treaty_fishing-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-treaty-fishing-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` — `846360e75578ce6233dba77b03b25545a529b50cd553ad31f88d3008b429a6ad`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-treaty-fishing-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` — `75fac347051d6b710015ef5bbcc10b43df0a1de59078195ede75a744f4c42b77`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### wv_conv_single_misdemeanor-set

- canonical `data/rcap-all50/overlays/census-v1/wv/wv-conv-single-misdemeanor-set--official-pdf-fill/fixtures/canonical.pdf` — `ea49da395c632c7f028e67c68c95659b376a18ce512c1c8c08205462c6f0dafa`
- boundary `data/rcap-all50/overlays/census-v1/wv/wv-conv-single-misdemeanor-set--official-pdf-fill/fixtures/boundary.pdf` — `375d0fb687b73da9b5f74f7506424e75c7421a4e8e9eb620ffcc6ecca7e56f40`
- expected pages 9 · requested scale 2.5
- built by FIX06

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
