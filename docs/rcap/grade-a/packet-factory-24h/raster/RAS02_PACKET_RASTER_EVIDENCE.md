# RAS02

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `d0f5840a438025b9e95971b6b17e4c3a54ebfca8`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (37)

### ak-tf800-set

- canonical `data/rcap-all50/overlays/census-v1/ak/ak-tf800-set--official-pdf-fill/fixtures/tf800-canonical-filled.pdf` — `66d0c390198984a8c42a550d0077ef63dae98af3900f51630490ec8fcb0c54d6`
- boundary `data/rcap-all50/overlays/census-v1/ak/ak-tf800-set--official-pdf-fill/fixtures/tf800-boundary-filled.pdf` — `b077fbfff439494d3af3ecf8e72c58af882b3c3b224205e632238e89459c95a5`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### az_marijuana_expungement_arrest_no_charges-set

- canonical `data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-arrest-no-charges-set--official-pdf-fill/fixtures/aoc-crem3f-canonical-filled.pdf` — `6dad189b1cdb575dfc7ef7e0647c077440cd4e331a7e2bf389a522773099c5d3`
- boundary `data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-arrest-no-charges-set--official-pdf-fill/fixtures/aoc-crem3f-boundary-filled.pdf` — `8f041f1d4fd898a176746d1dd5aed7b5967c20b51b14609b7529b6056f9646a5`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### co_pardoned_conviction_seal-set

- canonical `data/rcap-all50/overlays/census-v1/co/co-pardoned-conviction-seal-set--official-pdf-fill/fixtures/canonical.pdf` — `d285a03f788cb5e5b3a8d1f17babd379b199cd24c34d2e98b52363cd2c436bf7`
- boundary `data/rcap-all50/overlays/census-v1/co/co-pardoned-conviction-seal-set--official-pdf-fill/fixtures/boundary.pdf` — `407db19ec374b58b0e429b40ac6de54877510b47fe16db77739400e4edbada4c`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1017a_automatic_failure_correction

- canonical `data/rcap-all50/overlays/census-v1/de/composed-treatment:obligation:runtime-contract-cohort:de:juvenile-expungement-under-10-del-c-1017-1019-1017a:section-1017a-automatic-failure-correction--custom-pleading/fixtures/canonical.pdf` — `4357f7181b06cd732c158bd529ffa200976a88f9222c8d73736b5992122d209a`
- boundary `data/rcap-all50/overlays/census-v1/de/composed-treatment:obligation:runtime-contract-cohort:de:juvenile-expungement-under-10-del-c-1017-1019-1017a:section-1017a-automatic-failure-correction--custom-pleading/fixtures/boundary.pdf` — `6a33192824bf7fcecbb4d043d1c6daae4f84045cbb79a956d3cfb47781d69e34`
- expected pages 4 · requested scale 2.5
- built by VF07

### composed-treatment:obligation:runtime-only:IL:criminal-identity-theft-mistaken-identity-relief

- canonical `data/rcap-all50/overlays/census-v1/il/composed-treatment:obligation:runtime-only:il:criminal-identity-theft-mistaken-identity-relief--custom-pleading/fixtures/canonical.pdf` — `25f0c6a12204671455391f35dc7d1d801eef8266abdf08153190c960e7bd9426`
- boundary `data/rcap-all50/overlays/census-v1/il/composed-treatment:obligation:runtime-only:il:criminal-identity-theft-mistaken-identity-relief--custom-pleading/fixtures/boundary.pdf` — `c858109ebd5becf679a4029a3604b41cf3ca27e1b9cea913b3bf8fd1d227a2c6`
- expected pages 4 · requested scale 2.5
- built by VF11

### composed-treatment:obligation:runtime-only:MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59

- canonical `data/rcap-all50/overlays/census-v1/ms/composed-treatment:obligation:runtime-only:ms:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59--custom-pleading/fixtures/canonical.pdf` — `b624892f7883b610ed9ea40d18b0c03b8f2c5ebdbb81cdfe2940620a8218fd05`
- boundary `data/rcap-all50/overlays/census-v1/ms/composed-treatment:obligation:runtime-only:ms:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59--custom-pleading/fixtures/boundary.pdf` — `4869b6e9e45d6ef48ed9199def2ac8bec8ec9ebe02cac5b8e1ec2f962a90d6a9`
- expected pages 4 · requested scale 2.5
- built by VF03

### composed-treatment:obligation:runtime-only:PA:path-k-human-trafficking-vacatur-expungement

- canonical `data/rcap-all50/overlays/census-v1/pa/composed-treatment:obligation:runtime-only:pa:path-k-human-trafficking-vacatur-expungement--custom-pleading/fixtures/canonical.pdf` — `ed70579671b2b948b32fdd2854bbf4082b9f5013e591164dd0a77c0387710f4e`
- boundary `data/rcap-all50/overlays/census-v1/pa/composed-treatment:obligation:runtime-only:pa:path-k-human-trafficking-vacatur-expungement--custom-pleading/fixtures/boundary.pdf` — `7609ccbb635efa704dd57886a3e773b7eca7534691561fc11d288e19780232a8`
- expected pages 4 · requested scale 2.5
- built by VF07

### composed-treatment:sc_17_22_950_summary

- canonical `data/rcap-all50/overlays/census-v1/sc/composed-treatment:sc-17-22-950-summary--custom-pleading/fixtures/canonical.pdf` — `9742b771437d6bf34a3701e1a9838f35f49548f92e450011edf8622a31ce4c63`
- boundary `data/rcap-all50/overlays/census-v1/sc/composed-treatment:sc-17-22-950-summary--custom-pleading/fixtures/boundary.pdf` — `e5c37a603eff1af87cacc0f405aea4738aeb7f6ff65a7fb7d78527a7680f2cdb`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### ct-decriminalized-set

- canonical `data/rcap-all50/overlays/census-v1/ct/ct-decriminalized-set--custom-pleading/fixtures/canonical.pdf` — `089d79430041befc86af2d2480e51302ce1e150cdf8b6850739ae9fcfaf71955`
- boundary `data/rcap-all50/overlays/census-v1/ct/ct-decriminalized-set--custom-pleading/fixtures/boundary.pdf` — `7afffea3a27b5527be354e8a14efcf1bc3639a7ea39d3925c79ec97dffdf5a73`
- expected pages 4 · requested scale 2.5
- built by VF11

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

### ga-jail-k2-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-jail-k2-set--custom-pleading/fixtures/canonical.pdf` — `154780fcc5f3280fea71781bb16f80c1176db5c56c0b522b9a889f288b5dc91d`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-jail-k2-set--custom-pleading/fixtures/boundary.pdf` — `ff4dbf5329d071c7bfd07dde7be1e786b156a3b5da4753d7f43df199e1d425b2`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### ga-seal-m-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-seal-m-set--custom-pleading/fixtures/canonical.pdf` — `9b57311c3b69ac540a711dd174de9bec6d5b1b1fd7870dde4cbb592e2edf4796`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-seal-m-set--custom-pleading/fixtures/boundary.pdf` — `09abd2c2eacdc14fe2840688202ccf62d8506dd19f801e926cb2614c5b420182`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### il-prostitution-j-vacate-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-prostitution-j-vacate-set--custom-pleading/fixtures/canonical.pdf` — `7daaa389709afebccd46cdcee56b16c9888eb4ddcda2475c6c1e0b7315b9517d`
- boundary `data/rcap-all50/overlays/census-v1/il/il-prostitution-j-vacate-set--custom-pleading/fixtures/boundary.pdf` — `714832a826220e0d1f82363af3aa251d6dd5e3e9d7fb7235450b002cb614705b`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

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

### ms-nonconv-set

- canonical `data/rcap-all50/overlays/census-v1/ms/ms-nonconv-set--custom-pleading/fixtures/canonical.pdf` — `4ae768075a7f5aa534813a2303b24260e2b08308c0f3c7f18a4cc21531812ecf`
- boundary `data/rcap-all50/overlays/census-v1/ms/ms-nonconv-set--custom-pleading/fixtures/boundary.pdf` — `c52fc25286a857e49767228c88647f6b8f9364cff08dd4354fd8750294dffa13`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### ne-setaside-custodial-set

- canonical `data/rcap-all50/overlays/census-v1/ne/ne-setaside-custodial-set--official-pdf-fill/fixtures/canonical.pdf` — `bb911faba3cc5ba120432976c9545688e29d335b83adf2dfa9d115ec0856aeb7`
- boundary `data/rcap-all50/overlays/census-v1/ne/ne-setaside-custodial-set--official-pdf-fill/fixtures/boundary.pdf` — `2d8254d4a14791b86f837e878797b2fa89339fbb87b0c1e5595b2b5970aa9aa4`
- expected pages 5 · requested scale 2.5
- built by VF04

### nj_ordinance-set

- canonical `data/rcap-all50/overlays/census-v1/nj/nj-ordinance-set--official-pdf-fill/fixtures/cn-10557-canonical.pdf` — `343407a30f38beffccde4c51b8060065bd6eed27356a999d8e321e01a1baca33`
- boundary `data/rcap-all50/overlays/census-v1/nj/nj-ordinance-set--official-pdf-fill/fixtures/cn-10557-boundary.pdf` — `6256ba7f621c25a8f8a501c0a9af0191c151074fc8d3b2bb6ff2ef36354788ea`
- expected pages 43 · requested scale 2.5
- built by (no builder lane recorded)

### ny_mrta_marijuana-set

- canonical `data/rcap-all50/overlays/census-v1/ny/ny-mrta-marijuana-set--official-pdf-fill/fixtures/mrta-destruction-request-canonical.pdf` — `37d456b6c2b79c3801bb9c07030072d5b0487a95f711a92a3fd8ef14e99b05ff`
- boundary `data/rcap-all50/overlays/census-v1/ny/ny-mrta-marijuana-set--official-pdf-fill/fixtures/mrta-destruction-request-boundary.pdf` — `5f61e8f23675070c7691b16c6522745f5fa033083725f1eefb9caccc32cb3457`
- expected pages 1 · requested scale 2.5
- built by VF05

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

- canonical `data/rcap-all50/overlays/census-v1/nd/rcap-nd-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `6baff02e7853275b0d98bc41d66a3e1a1144a8db621d76c547e317dc7f5cc703`
- boundary `data/rcap-all50/overlays/census-v1/nd/rcap-nd-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `4831082c06b563cba1760b6ec9543aac781624370adac848e0f754d460a81d11`
- expected pages 34 · requested scale 2.5
- built by VF11

### rcap-sc-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/sc/rcap-sc-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `be6c8dd75e58feaff3d5049c3c4986b99fd39286bfd150855f2cd54eb9551f9b`
- boundary `data/rcap-all50/overlays/census-v1/sc/rcap-sc-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `b808c99ade96a876097f1086585818b63824cd79b20f0407cc8169fe6ce1f6a5`
- expected pages 64 · requested scale 2.5
- built by VF03

### rcap-wv-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/wv/rcap-wv-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `3f111978bb89b9d1bb6e000b8c100e250f1617194a710ade3c7db0526fc7e15f`
- boundary `data/rcap-all50/overlays/census-v1/wv/rcap-wv-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `58ccfe05e717ed4f5713db39cac40d07c30ace1ff12b882ccd61e642eabd9e9e`
- expected pages 10 · requested scale 2.5
- built by VF07

### sd_arrest_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/sd/sd-arrest-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `627e6502e0340f5d6d75ae855314cad53160d92acab710a1d43add2341dbe47d`
- boundary `data/rcap-all50/overlays/census-v1/sd/sd-arrest-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `79b2e9ac4ca0cfadba32a9896f39fe82ae7d0dc543d3a7a42d2a338bf318a8ed`
- expected pages 14 · requested scale 2.5
- built by (no builder lane recorded)

### ut_pet_dismissed_without_prejudice-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-dismissed-without-prejudice-set--official-pdf-fill/fixtures/canonical.pdf` — `c29dec5d606bdb248e7f00f07a76eb0d846b5fa1896bac7b711e08283fe93952`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-dismissed-without-prejudice-set--official-pdf-fill/fixtures/boundary.pdf` — `682f7b6d42bcc670d936e14d637ed9dfff3854f56a3c6f9e1684f2d43f86cdf7`
- expected pages 19 · requested scale 2.5
- built by VF11

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

### wa_crop_certificate_of_restoration-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-crop-certificate-of-restoration-set--custom-pleading/fixtures/canonical.pdf` — `44d858039dfd15ea013f3d3d431cc74d277d3b8a59d2a12f7edde490808678c9`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-crop-certificate-of-restoration-set--custom-pleading/fixtures/boundary.pdf` — `9eecfba4d9b8ba5d5ed0feba913e46ffd18a98f708038616a624701130ab8288`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_homicide_victim_prostitution-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` — `846360e75578ce6233dba77b03b25545a529b50cd553ad31f88d3008b429a6ad`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` — `75fac347051d6b710015ef5bbcc10b43df0a1de59078195ede75a744f4c42b77`
- expected pages 5 · requested scale 2.5
- built by FIX01

### wa_vac_survivor_misdemeanor-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-misdemeanor-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` — `846360e75578ce6233dba77b03b25545a529b50cd553ad31f88d3008b429a6ad`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-misdemeanor-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` — `75fac347051d6b710015ef5bbcc10b43df0a1de59078195ede75a744f4c42b77`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### wv_conv_multiple_misdemeanors-set

- canonical `data/rcap-all50/overlays/census-v1/wv/wv-conv-multiple-misdemeanors-set--official-pdf-fill/fixtures/canonical.pdf` — `d477bc4a7f18aaac153c56760fc11dca69a317dc49b2eff7362b1d41ba27b4e4`
- boundary `data/rcap-all50/overlays/census-v1/wv/wv-conv-multiple-misdemeanors-set--official-pdf-fill/fixtures/boundary.pdf` — `27ed521c46fc25fd8edb60501a47322db459aa2196b0b4fd54a6fd5182d12860`
- expected pages 4 · requested scale 2.5
- built by VF03

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
