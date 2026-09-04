# RAS04

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `d1e6ad9ac8040b0503f1e66402dcd880a3866b01`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (36)

### agency-application-treatment:obligation:track-only:CT:ct-provisional-pardon

- canonical `data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-only:ct:ct-provisional-pardon--official-pdf-fill/fixtures/canonical.pdf` — `31f3c2fd8e59ffb83292faea73213dc70483d427c8f5f944d72f535bd1f03ef1`
- boundary `data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-only:ct:ct-provisional-pardon--official-pdf-fill/fixtures/boundary.pdf` — `0e7f7008cd40fba4f6c3a04ba800147d4d4af3f5298f0b9c9b777ae31087c772`
- expected pages 2 · requested scale 2.5
- built by VF04

### ak-mistaken-identity-set

- canonical `data/rcap-all50/overlays/census-v1/ak/ak-mistaken-identity-set--official-pdf-fill/fixtures/canonical.pdf` — `29f4ca66e3be60cb84dd9a720100722ae3ec4823f15f3712913b500470ef62c6`
- boundary `data/rcap-all50/overlays/census-v1/ak/ak-mistaken-identity-set--official-pdf-fill/fixtures/boundary.pdf` — `758301c28be02067aa54a0903e04051cffe57fbee363ece5e33618e7e428c623`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### ar-arrest-seal-set

- canonical `data/rcap-all50/overlays/census-v1/ar/ar-arrest-seal-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `78ef189e981b35fec69688cc6d3181df245b309e7405c954fcabd503e426bea5`
- boundary `data/rcap-all50/overlays/census-v1/ar/ar-arrest-seal-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `fb32678b598155af6d1436eeb51098cb665fe2f1711bd826ec2b980b1c30a811`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### ar-misdemeanor-dwi-seal-set

- canonical `data/rcap-all50/overlays/census-v1/ar/ar-misdemeanor-dwi-seal-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `6bf0184ddc31364f316cb656745f364f8def8aa547428beb881c4c632e2f750d`
- boundary `data/rcap-all50/overlays/census-v1/ar/ar-misdemeanor-dwi-seal-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `a6cef12f7344600b5f9e89aefee9785440de185d88340d051b090ec6011bdfb8`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### az_wrongful_arrest_clearance-set

- canonical `data/rcap-all50/overlays/census-v1/az/az-wrongful-arrest-clearance-set--custom-pleading/fixtures/canonical.pdf` — `6a0c2d807560a619c234a003ce8bf40031a73625aec815e2360ef8ec347506d6`
- boundary `data/rcap-all50/overlays/census-v1/az/az-wrongful-arrest-clearance-set--custom-pleading/fixtures/boundary.pdf` — `5d62c2e04775223b983cf502af0571f1a77c2bf9e6f1042ea916de4b62adf1bc`
- expected pages 4 · requested scale 2.5
- built by VF02

### ca-1203-43-set

- canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-43-set--official-pdf-fill/fixtures/pc-1203-43-canonical/cr-180-filled.pdf` — `d2ee7689a134dd808796a840adc358badda96c90f2586601cb4867332768703e`
- boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-43-set--official-pdf-fill/fixtures/pc-1203-43-boundary/cr-180-filled.pdf` — `c0b2eeec2627a2566828f988f527fb325615ce567fbd7092a9122f749f0dee67`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### co_motion_seal_nonconviction-set

- canonical `data/rcap-all50/overlays/census-v1/co/co-motion-seal-nonconviction-set--official-pdf-fill/fixtures/canonical.pdf` — `6c3d8f4482dc4de44cb817f486cc2ad982aaf79b3d6f79cc75696d22facb07d7`
- boundary `data/rcap-all50/overlays/census-v1/co/co-motion-seal-nonconviction-set--official-pdf-fill/fixtures/boundary.pdf` — `1fb4e7b9faeb8ee7f06837b94993c071629b47abb59138ceaa7efa1c2d43a6f4`
- expected pages 5 · requested scale 2.5
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

### ct-cannabis-petition-set

- canonical `data/rcap-all50/overlays/census-v1/ct/ct-cannabis-petition-set--custom-pleading/fixtures/canonical.pdf` — `73f32cf14f330bb162ad0792eecd8b6351e51905d31c6d9c40b0e9bd933a97a3`
- boundary `data/rcap-all50/overlays/census-v1/ct/ct-cannabis-petition-set--custom-pleading/fixtures/boundary.pdf` — `017fe825b8c4d19d7c2ae85d21415454e2d6527754e501b51f33a31a235cce81`
- expected pages 4 · requested scale 2.5
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

### de_mandatory_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/de/de-mandatory-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `d29830aa31756e0635e0a80c3213247471f9988d59a26491b7aa65aa5a5a9fb4`
- boundary `data/rcap-all50/overlays/census-v1/de/de-mandatory-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `a2be8406f9605d8dc730e11073a0fc7ccdab987b03f6ceff8d93e02c25489e39`
- expected pages 2 · requested scale 2.5
- built by VF01

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

### in_infraction_nondisclosure-set

- canonical `data/rcap-all50/overlays/census-v1/in/in-infraction-nondisclosure-set--custom-pleading/fixtures/canonical.pdf` — `f4a0abb08d6f636e8ab5271376fc6034ce0857421b2ed156d77ae6c820c6c2e7`
- boundary `data/rcap-all50/overlays/census-v1/in/in-infraction-nondisclosure-set--custom-pleading/fixtures/boundary.pdf` — `bcd0160894c9eb7a445e2a9961fe82abc2dfca54ba804531febc78a04c04e9cf`
- expected pages 4 · requested scale 2.5
- built by VF03

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

### nd-deferred-imposition-records-set

- canonical `data/rcap-all50/overlays/census-v1/nd/nd-deferred-imposition-records-set--custom-pleading/fixtures/canonical.pdf` — `8d6c31287e83b99aa8a78568bab7aff0b8eb50efdf59f65c0de5ded7a20c9bf1`
- boundary `data/rcap-all50/overlays/census-v1/nd/nd-deferred-imposition-records-set--custom-pleading/fixtures/boundary.pdf` — `c972e9582608a156bd8ab7b1792d66c829edb8c93a50c1be28f5fcf526134a29`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### ne-setaside-custodial-set

- canonical `data/rcap-all50/overlays/census-v1/ne/ne-setaside-custodial-set--official-pdf-fill/fixtures/canonical.pdf` — `bb911faba3cc5ba120432976c9545688e29d335b83adf2dfa9d115ec0856aeb7`
- boundary `data/rcap-all50/overlays/census-v1/ne/ne-setaside-custodial-set--official-pdf-fill/fixtures/boundary.pdf` — `2d8254d4a14791b86f837e878797b2fa89339fbb87b0c1e5595b2b5970aa9aa4`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### nj_ordinance-set

- canonical `data/rcap-all50/overlays/census-v1/nj/nj-ordinance-set--official-pdf-fill/fixtures/cn-10557-canonical.pdf` — `343407a30f38beffccde4c51b8060065bd6eed27356a999d8e321e01a1baca33`
- boundary `data/rcap-all50/overlays/census-v1/nj/nj-ordinance-set--official-pdf-fill/fixtures/cn-10557-boundary.pdf` — `6256ba7f621c25a8f8a501c0a9af0191c151074fc8d3b2bb6ff2ef36354788ea`
- expected pages 43 · requested scale 2.5
- built by (no builder lane recorded)

### official-form-treatment:obligation:research-decision-route:AL:al-olr

- canonical `data/rcap-all50/overlays/census-v1/al/official-form-treatment:obligation:research-decision-route:al:al-olr--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `9414ff9d97234b9d98f6362c198acec77d7921c789a273f990a927bb487e8449`
- boundary `data/rcap-all50/overlays/census-v1/al/official-form-treatment:obligation:research-decision-route:al:al-olr--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `6b04f5d39f52f7cdea4c5771b7df24c43a2f266b67c986514d9e490d5afdc6bc`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### pa_age70_deceased-set

- canonical `data/rcap-all50/overlays/census-v1/pa/pa-age70-deceased-set--official-pdf-fill/fixtures/canonical.pdf` — `f4f4b3ba5263fff23c409e8b8ffda95c2ee3e1cf6fea623af5ddb09ed181639e`
- boundary `data/rcap-all50/overlays/census-v1/pa/pa-age70-deceased-set--official-pdf-fill/fixtures/boundary.pdf` — `03aefe90a39c91ac577858abeadf09c215e261f3fcb12fbe97ae8f1c7c1c2ac1`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-sc-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/sc/rcap-sc-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `be6c8dd75e58feaff3d5049c3c4986b99fd39286bfd150855f2cd54eb9551f9b`
- boundary `data/rcap-all50/overlays/census-v1/sc/rcap-sc-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `b808c99ade96a876097f1086585818b63824cd79b20f0407cc8169fe6ce1f6a5`
- expected pages 64 · requested scale 2.5
- built by (no builder lane recorded)

### tx_nd_dwi_probation-set

- canonical `data/rcap-all50/overlays/census-v1/tx/tx-nd-dwi-probation-set--official-pdf-fill/fixtures/canonical.pdf` — `f4e76632fdd4e41ec7d36a635f30030c0cef37ce08a19980c3b82b9199869667`
- boundary `data/rcap-all50/overlays/census-v1/tx/tx-nd-dwi-probation-set--official-pdf-fill/fixtures/boundary.pdf` — `deb1c6505ee4ec2817bf4ce266adfdf2845f76ab4d217e37d9908210d94bbdfe`
- expected pages 24 · requested scale 2.5
- built by (no builder lane recorded)

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

### wa_vac_substance_use_disorder-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-substance-use-disorder-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` — `846360e75578ce6233dba77b03b25545a529b50cd553ad31f88d3008b429a6ad`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-substance-use-disorder-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` — `75fac347051d6b710015ef5bbcc10b43df0a1de59078195ede75a744f4c42b77`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### wi_nc_doj_challenge-set

- canonical `data/rcap-all50/overlays/census-v1/wi/wi-nc-doj-challenge-set--official-pdf-fill/fixtures/canonical.pdf` — `edb7338200e12436a22390b6857b54bb0b44d074abc745b5c02c158f85457b4f`
- boundary `data/rcap-all50/overlays/census-v1/wi/wi-nc-doj-challenge-set--official-pdf-fill/fixtures/boundary.pdf` — `365d25ebf98bc23dba12805e97f985d6f39fc2403cec591b9646a6be8f35596e`
- expected pages 2 · requested scale 2.5
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
FAMILIES ASSIGNED: 36
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
