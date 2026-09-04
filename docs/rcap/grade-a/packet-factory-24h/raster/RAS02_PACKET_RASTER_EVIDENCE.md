# RAS02

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `c7e566b65def5de22a3e61d237014c5105006922`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (50)

### agency-application-treatment:obligation:research-decision-route:NY:ny_160_55_violation:dcjs_correction_submission

- canonical `data/rcap-all50/overlays/census-v1/ny/agency-application-treatment:obligation:research-decision-route:ny:ny-160-55-violation:dcjs-correction-submission--official-pdf-fill/fixtures/canonical.pdf` — `8abff71f85f09f7c248daa088286855253f3b95172837efa2fcd69a0c51e57ec`
- boundary `data/rcap-all50/overlays/census-v1/ny/agency-application-treatment:obligation:research-decision-route:ny:ny-160-55-violation:dcjs-correction-submission--official-pdf-fill/fixtures/boundary.pdf` — `c48c6e8cea3616ada41949087580f4db52ea94a0613fa55942f4f62de5fe4878`
- expected pages 4 · requested scale 2.5
- built by FIX01

### ak-tf800-set

- canonical `data/rcap-all50/overlays/census-v1/ak/ak-tf800-set--official-pdf-fill/fixtures/tf800-canonical-filled.pdf` — `66d0c390198984a8c42a550d0077ef63dae98af3900f51630490ec8fcb0c54d6`
- boundary `data/rcap-all50/overlays/census-v1/ak/ak-tf800-set--official-pdf-fill/fixtures/tf800-boundary-filled.pdf` — `b077fbfff439494d3af3ecf8e72c58af882b3c3b224205e632238e89459c95a5`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### al-felony-nonconviction-90-set

- canonical `data/rcap-all50/overlays/census-v1/al/al-felony-nonconviction-90-set--official-pdf-fill/fixtures/canonical.pdf` — `e472186921ffc2c56765b30ed426e4d8ffd163e97100f781c127ada4a7966924`
- boundary `data/rcap-all50/overlays/census-v1/al/al-felony-nonconviction-90-set--official-pdf-fill/fixtures/boundary.pdf` — `ef61fac20c9966ef28d8192315bc0be9aacc5ebd6912ee5c0fda7a192eb89a05`
- expected pages 11 · requested scale 2.5
- built by FIX04

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

### az_wrongful_arrest_clearance-set

- canonical `data/rcap-all50/overlays/census-v1/az/az-wrongful-arrest-clearance-set--custom-pleading/fixtures/canonical.pdf` — `ae9d2adfcc34c4aa45012493466e0b86e49ace944aa552998ffec4c2a36166ee`
- boundary `data/rcap-all50/overlays/census-v1/az/az-wrongful-arrest-clearance-set--custom-pleading/fixtures/boundary.pdf` — `9ff414dfc5ee70776d55cf44400479680d1b3043789d189232c879e0e8eb36f9`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### ca-1203-43-set

- canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-43-set--official-pdf-fill/fixtures/pc-1203-43-canonical/cr-180-filled.pdf` — `d2ee7689a134dd808796a840adc358badda96c90f2586601cb4867332768703e`
- boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-43-set--official-pdf-fill/fixtures/pc-1203-43-boundary/cr-180-filled.pdf` — `c0b2eeec2627a2566828f988f527fb325615ce567fbd7092a9122f749f0dee67`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### ca-prop64-set

- canonical `data/rcap-all50/overlays/census-v1/ca/ca-prop64-set--official-pdf-fill/fixtures/hs-11361-8-completed-sentence-application-canonical/cr-400-filled.pdf` — `87f93a9b4273a1af89de31a7576ae0e4aae86e42361bfacfae042574695885d4`
- boundary `data/rcap-all50/overlays/census-v1/ca/ca-prop64-set--official-pdf-fill/fixtures/hs-11361-8-completed-sentence-application-boundary/cr-400-filled.pdf` — `53b07cf75b2fee362fcfa07a9f080d86dc04ae4adb705fe4039078508884ac4a`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_court_petition_after_90_days

- canonical `data/rcap-all50/overlays/census-v1/co/composed-treatment:obligation:research-decision-route:co:co-mistaken-identity-expungement:participant-court-petition-after-90-days--custom-pleading/fixtures/canonical.pdf` — `e6d926f76168b6ca6d5dbc2b7a13e6037be2b53203bb8eea6c93cc843e8e0e8d`
- boundary `data/rcap-all50/overlays/census-v1/co/composed-treatment:obligation:research-decision-route:co:co-mistaken-identity-expungement:participant-court-petition-after-90-days--custom-pleading/fixtures/boundary.pdf` — `d00acb23ed43217b68d466265ca30050baca432adb85e1d35f25452adbd0d7ea`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:AK:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085

- canonical `data/rcap-all50/overlays/census-v1/ak/composed-treatment:obligation:runtime-only:ak:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085--custom-pleading/fixtures/canonical.pdf` — `2a7e3fa6eb3b583fdbddc5a365b6c2678e7a37ad0f8ebdd6b78a230eb39d98ad`
- boundary `data/rcap-all50/overlays/census-v1/ak/composed-treatment:obligation:runtime-only:ak:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085--custom-pleading/fixtures/boundary.pdf` — `d1ddb77c651df332ffa5c1fcb1593d1d1b7dfa913c39b42484b31830347389b7`
- expected pages 8 · requested scale 2.5
- built by FIX05

### composed-treatment:obligation:runtime-only:MS:nonadjudication-under-99-15-26

- canonical `data/rcap-all50/overlays/census-v1/ms/composed-treatment:obligation:runtime-only:ms:nonadjudication-under-99-15-26--custom-pleading/fixtures/canonical.pdf` — `b6c18f619f45fbd2cf9a80e805b7a8c6d428427cf88c77c2f05083c758e396b2`
- boundary `data/rcap-all50/overlays/census-v1/ms/composed-treatment:obligation:runtime-only:ms:nonadjudication-under-99-15-26--custom-pleading/fixtures/boundary.pdf` — `c31fa42374b4b6c83b8388d76e6ff556d6e62f7b2f2f2c617ec2bceba3e20e90`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:OK:human-trafficking-survivor-relief

- canonical `data/rcap-all50/overlays/census-v1/ok/composed-treatment:obligation:runtime-only:ok:human-trafficking-survivor-relief--custom-pleading/fixtures/canonical.pdf` — `e9b1fc1415fd36617490519b7e3b10200d2d0486fc6f13bce37518ebf1ebe101`
- boundary `data/rcap-all50/overlays/census-v1/ok/composed-treatment:obligation:runtime-only:ok:human-trafficking-survivor-relief--custom-pleading/fixtures/boundary.pdf` — `8b91a6ab9335e30b73fda34c0ab767692137ad58711860e3a96f7b47803c5f17`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:WV:sex-trafficking-victim-vacatur-and-expungement

- canonical `data/rcap-all50/overlays/census-v1/wv/composed-treatment:obligation:runtime-only:wv:sex-trafficking-victim-vacatur-and-expungement--custom-pleading/fixtures/canonical.pdf` — `58487688e22fdb3d5d1566899add22a2489253462a91f7c056cfc67ea748f282`
- boundary `data/rcap-all50/overlays/census-v1/wv/composed-treatment:obligation:runtime-only:wv:sex-trafficking-victim-vacatur-and-expungement--custom-pleading/fixtures/boundary.pdf` — `d041ae07adbeccc2c54a8f46a73df01e10f5769295a792ea4420190c52a9d9e6`
- expected pages 4 · requested scale 2.5
- built by FIX07

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
- built by FIX05

### ga-fo-discharged-pre2026-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-fo-discharged-pre2026-set--custom-pleading/fixtures/canonical.pdf` — `3ba5a61a33555e0a0663c3aad11cd62d6a24e3c2e8a72e955f4898bc39f2d62d`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-fo-discharged-pre2026-set--custom-pleading/fixtures/boundary.pdf` — `f5e381285ebc4e0c6250efcaa32c40f069bd805f29176a2c5714f48be3046029`
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

### il-exp-precompletion-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-exp-precompletion-set--official-pdf-fill/fixtures/canonical.pdf` — `094606faeb8e3e22d320c14ec2c4afcb27063adee79f52861befcb4734cadc30`
- boundary `data/rcap-all50/overlays/census-v1/il/il-exp-precompletion-set--official-pdf-fill/fixtures/boundary.pdf` — `14c928815215021a21bcc6a5ebab5faec6cc1853264560e9a25170e53dabb53e`
- expected pages 13 · requested scale 2.5
- built by FIX07

### il-seal-2yr-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-seal-2yr-set--official-pdf-fill/fixtures/canonical.pdf` — `de86008285eef38acaa78433628ec100d787dee69ee3a8faf5dcc19eff3acfa6`
- boundary `data/rcap-all50/overlays/census-v1/il/il-seal-2yr-set--official-pdf-fill/fixtures/boundary.pdf` — `b1a8aae419d5f40ae35a3e55fb51d968f38bab35cade43c553055d6ec199b58c`
- expected pages 13 · requested scale 2.5
- built by FIX08

### in_arrest_no_charges-set

- canonical `data/rcap-all50/overlays/census-v1/in/in-arrest-no-charges-set--official-pdf-fill/fixtures/packet-canonical-filled.pdf` — `a39f4c3ba8d635c3828af504dc2762127b6f4afd48abe398a805417d1cc70271`
- boundary `data/rcap-all50/overlays/census-v1/in/in-arrest-no-charges-set--official-pdf-fill/fixtures/packet-boundary-filled.pdf` — `4e9aeda66690545d2fd412be257f31e190e8a39b8c22ce08e6f630a6c4462f23`
- expected pages 15 · requested scale 2.5
- built by FIX02

### ky_expungement_certification-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-expungement-certification-set--official-pdf-fill/fixtures/canonical.pdf` — `d57289137b84e372f3de9edefaf070b41e0b61c11b268c229a2119a2a74d15e2`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-expungement-certification-set--official-pdf-fill/fixtures/boundary.pdf` — `964a9b4b17a293235f9b75ec4e2a8581227850f590fa2338d84bcbec07e3f338`
- expected pages 1 · requested scale 2.5
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

### nj_arrest_no_conviction-set

- canonical `data/rcap-all50/overlays/census-v1/nj/nj-arrest-no-conviction-set--official-pdf-fill/fixtures/cn-10557-canonical.pdf` — `912a2ada6ef04dd680aec20ef6c8c232d9af030a8d54695ba3b65d279d601e71`
- boundary `data/rcap-all50/overlays/census-v1/nj/nj-arrest-no-conviction-set--official-pdf-fill/fixtures/cn-10557-boundary.pdf` — `de3224b08aec7d46796f74ecad09f3bb4d8e7928f6349324ccf070af6698399b`
- expected pages 43 · requested scale 2.5
- built by FIX04

### nj_ordinance-set

- canonical `data/rcap-all50/overlays/census-v1/nj/nj-ordinance-set--official-pdf-fill/fixtures/cn-10557-canonical.pdf` — `343407a30f38beffccde4c51b8060065bd6eed27356a999d8e321e01a1baca33`
- boundary `data/rcap-all50/overlays/census-v1/nj/nj-ordinance-set--official-pdf-fill/fixtures/cn-10557-boundary.pdf` — `6256ba7f621c25a8f8a501c0a9af0191c151074fc8d3b2bb6ff2ef36354788ea`
- expected pages 43 · requested scale 2.5
- built by (no builder lane recorded)

### ny_mrta_marijuana-set

- canonical `data/rcap-all50/overlays/census-v1/ny/ny-mrta-marijuana-set--official-pdf-fill/fixtures/mrta-destruction-request-canonical.pdf` — `37d456b6c2b79c3801bb9c07030072d5b0487a95f711a92a3fd8ef14e99b05ff`
- boundary `data/rcap-all50/overlays/census-v1/ny/ny-mrta-marijuana-set--official-pdf-fill/fixtures/mrta-destruction-request-boundary.pdf` — `5f61e8f23675070c7691b16c6522745f5fa033083725f1eefb9caccc32cb3457`
- expected pages 1 · requested scale 2.5
- built by FIX05

### pa_490_nonconviction-set

- canonical `data/rcap-all50/overlays/census-v1/pa/pa-490-nonconviction-set--official-pdf-fill/fixtures/rule-490-petition-canonical.pdf` — `1048b6276acfea471f1aee7839c4a638124c5ac10627c1e335ef7cecbf2074e0`
- boundary `data/rcap-all50/overlays/census-v1/pa/pa-490-nonconviction-set--official-pdf-fill/fixtures/rule-490-petition-boundary.pdf` — `c15e8eb4bd78c65b2fac2bc130659cba2a19921fe81c449b7f64654bebeea808`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### pa_pardon_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/pa/pa-pardon-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `fc67ec72e845dd92f3c1c9529de86e725fe811c52f810f0e46abb11b2647c2b5`
- boundary `data/rcap-all50/overlays/census-v1/pa/pa-pardon-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `ecfe22d00d9ac729853cd03edbaf7556a91e2d025a27cd231c33e4600039ee75`
- expected pages 5 · requested scale 2.5
- built by FIX07

### rcap-ms-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/ms/rcap-ms-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `2d343efa1c4c6387171aa6b73f041be3885bef4f9d0e39f2be8ffe771a5521d0`
- boundary `data/rcap-all50/overlays/census-v1/ms/rcap-ms-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `09b2f2be1a2419c6e7876ec28ef60a3b7b9ddc607aa761bf35195c314d95477f`
- expected pages 26 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-ok-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/ok/rcap-ok-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `78151b1304b9445d9bc269fd0a8a6d1cc7b97bd4b0284f6af52d2176ba21d1a1`
- boundary `data/rcap-all50/overlays/census-v1/ok/rcap-ok-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `18a2adfa5d1a8d67dfb413be61952c0501da42dc0bf03a53bff744bcba5e0d18`
- expected pages 83 · requested scale 2.5
- built by FIX03

### rcap-wa-custom-pleading-clean-tracks

- canonical `data/rcap-all50/overlays/census-v1/wa/rcap-wa-custom-pleading-clean-tracks--custom-pleading/fixtures/canonical.pdf` — `e94f1370126b771fdf1c64a75c38e299285cc032250009b72a2711b0efd3a9c0`
- boundary `data/rcap-all50/overlays/census-v1/wa/rcap-wa-custom-pleading-clean-tracks--custom-pleading/fixtures/boundary.pdf` — `bca669c04bea2852a0a5fce26b52bad2d2cf89d6ab652ebd59daa411089e5756`
- expected pages 17 · requested scale 2.5
- built by FIX05

### ri_nonconviction_sealing-set

- canonical `data/rcap-all50/overlays/census-v1/ri/ri-nonconviction-sealing-set--official-pdf-fill/fixtures/dc-33-canonical.pdf` — `e0af21e5c1f4b8014d4d2fb224e99940996328ef69aefd41153095e7166fdc6d`
- boundary `data/rcap-all50/overlays/census-v1/ri/ri-nonconviction-sealing-set--official-pdf-fill/fixtures/dc-33-boundary.pdf` — `fd9ebb9561919129b40d75d20dd76fbaf777f94141fba0b3caee7220af2df923`
- expected pages 4 · requested scale 2.5
- built by FIX07

### tx_nd_conviction_no_supervision-set

- canonical `data/rcap-all50/overlays/census-v1/tx/tx-nd-conviction-no-supervision-set--official-pdf-fill/fixtures/canonical.pdf` — `52821ee02b5528ed73235b359d7d40bd27389792d41ba9d9b799b45515b444a6`
- boundary `data/rcap-all50/overlays/census-v1/tx/tx-nd-conviction-no-supervision-set--official-pdf-fill/fixtures/boundary.pdf` — `614e65dca4a894127c9cfa87c6f6629458a96bff5ad2ec4bdc70eb4573fdf28c`
- expected pages 24 · requested scale 2.5
- built by FIX02

### ut_pet_acquittal-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-acquittal-set--official-pdf-fill/fixtures/canonical.pdf` — `ad594f0a40750195b67e36916f3628df5b96d337e4955c9063b415747d6e36d6`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-acquittal-set--official-pdf-fill/fixtures/boundary.pdf` — `b3ba83a65754f96fe58083de62a3ce879654d6362170e11bae2f043e4c39a765`
- expected pages 19 · requested scale 2.5
- built by FIX03

### ut_pet_limitations-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-limitations-set--official-pdf-fill/fixtures/canonical.pdf` — `b66141455c34b548b8ce48bd3c94d73298b588f8cef604a757d154362971c6a5`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-limitations-set--official-pdf-fill/fixtures/boundary.pdf` — `9a3c27215e66dedbfac637d63417a8459f5600e534aee825f940900aef6f02d4`
- expected pages 19 · requested scale 2.5
- built by FIX06

### va_exp_identity_used_by_another-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-exp-identity-used-by-another-set--custom-pleading/fixtures/canonical.pdf` — `e01f67987b25265e945bf774750a5af8a10f2360cad8790ca6bbbd116fc099b4`
- boundary `data/rcap-all50/overlays/census-v1/va/va-exp-identity-used-by-another-set--custom-pleading/fixtures/boundary.pdf` — `eb054b41c4548fd97bd5ab8fcf368b4cdc9d3ac3d43e98b6e6c271b362376f66`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### va_seal_petition_felony-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-seal-petition-felony-set--official-pdf-fill/fixtures/canonical.pdf` — `c653f0a41319bbee6133a17c418666eaccb31f329abfd465d0de55b9dd4e2636`
- boundary `data/rcap-all50/overlays/census-v1/va/va-seal-petition-felony-set--official-pdf-fill/fixtures/boundary.pdf` — `b7095073a0cb0683ff5efc7575d903e9faa9b19d82ccd6c29e2dbe5e6e35b7ab`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### vt_seal_18_to_21-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-18-to-21-set--official-pdf-fill/fixtures/canonical.pdf` — `81525fd23e9489ce1225aaf953e28c0e68ad64c376dccf9143a5c14920bde942`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-18-to-21-set--official-pdf-fill/fixtures/boundary.pdf` — `8f0058c992eaf6fec640b7519935f3e0d4c119348f90d7042dd1ee6b53501404`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### vt_seal_nonconviction-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-nonconviction-set--official-pdf-fill/fixtures/canonical.pdf` — `8e4c932195738e387b1995e3501af7768308367152cedba0f02dfb30a8e4fdcb`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-nonconviction-set--official-pdf-fill/fixtures/boundary.pdf` — `dbd775f8d93975f9dd0dee51536960a6797de116015fcbfcb9dd908f588b5ac5`
- expected pages 8 · requested scale 2.5
- built by FIX01

### wa_vac_domestic_violence-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-domestic-violence-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` — `42e4e3447e6f49cc925cf52485e0861261e5de714c91c672d5d71014d624d48e`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-domestic-violence-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` — `fd2d21f7ca98376dd4c6ce63af548002b808b04ab388bc477f093370df5ea445`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_survivor_felony-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-felony-set--official-pdf-fill/fixtures/cr-08-0900-canonical-filled.pdf` — `3c40568209578ca04893ce46b64539a44af355dc11bd75b7daee75d215eda37f`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-felony-set--official-pdf-fill/fixtures/cr-08-0900-boundary-filled.pdf` — `2da76cc75f1ccd72cc12fdefef71edb90f477199877714e3263d9b46a4fccc8d`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### wi_nc_doj_fingerprint_removal-set

- canonical `data/rcap-all50/overlays/census-v1/wi/wi-nc-doj-fingerprint-removal-set--official-pdf-fill/fixtures/canonical.pdf` — `5b475b11c17c35f8edc37bada78716e8b14471b1951966604b7a678412fc6cc6`
- boundary `data/rcap-all50/overlays/census-v1/wi/wi-nc-doj-fingerprint-removal-set--official-pdf-fill/fixtures/boundary.pdf` — `3fd596ff112fd2f6ef55ca9a14c2fe0702eb107af9f715554b45503e3d7861f3`
- expected pages 2 · requested scale 2.5
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
FAMILIES ASSIGNED: 50
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
