# RAS01

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `9a7df10b5e7275be39c8760e8fb1129caf25fa19`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (43)

### agency-application-treatment:obligation:research-decision-route:AL:al-uncharged-arrest:agency_record_challenge

- canonical `data/rcap-all50/overlays/census-v1/al/agency-application-treatment:obligation:research-decision-route:al:al-uncharged-arrest:agency-record-challenge--official-pdf-fill/fixtures/canonical.pdf` — `95fed142e8fab838496cc9bf531e2268a4d45c9e3c375f8dab1e70a7ec1303c5`
- boundary `data/rcap-all50/overlays/census-v1/al/agency-application-treatment:obligation:research-decision-route:al:al-uncharged-arrest:agency-record-challenge--official-pdf-fill/fixtures/boundary.pdf` — `c9a3b9b16e77d75105628785ea19e9168e3d0a2318a43efd8a253e4450e39ea7`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### agency-application-treatment:obligation:track-pathway:CT:ct-absolute-pardon:absolute-pardon-resulting-in-erasure

- canonical `data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-pathway:ct:ct-absolute-pardon:absolute-pardon-resulting-in-erasure--official-pdf-fill/fixtures/canonical.pdf` — `83cdb5a02b746d5c922fa73c37bc556106d4882822c241ac1a881099fbce8d42`
- boundary `data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-pathway:ct:ct-absolute-pardon:absolute-pardon-resulting-in-erasure--official-pdf-fill/fixtures/boundary.pdf` — `41a1b3284fcfb61aaa2e9949167b89cdbc1aa88af518f3bee1fde531e2223cf1`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### ak-tf800-set

- canonical `data/rcap-all50/overlays/census-v1/ak/ak-tf800-set--official-pdf-fill/fixtures/tf800-canonical-filled.pdf` — `66d0c390198984a8c42a550d0077ef63dae98af3900f51630490ec8fcb0c54d6`
- boundary `data/rcap-all50/overlays/census-v1/ak/ak-tf800-set--official-pdf-fill/fixtures/tf800-boundary-filled.pdf` — `b077fbfff439494d3af3ecf8e72c58af882b3c3b224205e632238e89459c95a5`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### ar-cs-possession-seal-set

- canonical `data/rcap-all50/overlays/census-v1/ar/ar-cs-possession-seal-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `b2b487cc7dd10b3ce9e7f5b41a115859bb3d1ac6be6932ea1f6503219d6c530e`
- boundary `data/rcap-all50/overlays/census-v1/ar/ar-cs-possession-seal-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `046fbedea2db1dc1afa4895b13f279e7fabf626a1e0172e705a676fc769bc6f8`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### ca-1203-4-set

- canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-fulfilled-probation-canonical/cr-180-filled.pdf` — `9cc3b456c0b97e0555b53de0740d03368b98148480ae14d78b882ad9095b9ae3`
- boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/fixtures/pc-1203-4-fulfilled-probation-boundary/cr-180-filled.pdf` — `34b962b636a4481c256162bbc2507572b4fcafe7edec34d866b57007d2acc458`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### ca-1203-4a-set

- canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-4a-set--official-pdf-fill/fixtures/pc-1203-4a-canonical/cr-180-filled.pdf` — `c7dc7526816439ce0a709709613936dcbe6a9f580d1a7dacc6a62a52f17ebd45`
- boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-4a-set--official-pdf-fill/fixtures/pc-1203-4a-boundary/cr-180-filled.pdf` — `86c5ef49a270c453ddbaca4d00d750b8db317a5fd45178a8f2989778ad0e7f4e`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### co_motion_seal_nonconviction-set

- canonical `data/rcap-all50/overlays/census-v1/co/co-motion-seal-nonconviction-set--official-pdf-fill/fixtures/canonical.pdf` — `6c3d8f4482dc4de44cb817f486cc2ad982aaf79b3d6f79cc75696d22facb07d7`
- boundary `data/rcap-all50/overlays/census-v1/co/co-motion-seal-nonconviction-set--official-pdf-fill/fixtures/boundary.pdf` — `1fb4e7b9faeb8ee7f06837b94993c071629b47abb59138ceaa7efa1c2d43a6f4`
- expected pages 5 · requested scale 2.5
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
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:MS:nonadjudication-under-99-15-26

- canonical `data/rcap-all50/overlays/census-v1/ms/composed-treatment:obligation:runtime-only:ms:nonadjudication-under-99-15-26--custom-pleading/fixtures/canonical.pdf` — `b6c18f619f45fbd2cf9a80e805b7a8c6d428427cf88c77c2f05083c758e396b2`
- boundary `data/rcap-all50/overlays/census-v1/ms/composed-treatment:obligation:runtime-only:ms:nonadjudication-under-99-15-26--custom-pleading/fixtures/boundary.pdf` — `c31fa42374b4b6c83b8388d76e6ff556d6e62f7b2f2f2c617ec2bceba3e20e90`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:OK:juvenile-record-expungement

- canonical `data/rcap-all50/overlays/census-v1/ok/composed-treatment:obligation:runtime-only:ok:juvenile-record-expungement--custom-pleading/fixtures/canonical.pdf` — `b126807ef7de8f9c35945d926612bf6b116e99045b307bc9d7535307b9ef3179`
- boundary `data/rcap-all50/overlays/census-v1/ok/composed-treatment:obligation:runtime-only:ok:juvenile-record-expungement--custom-pleading/fixtures/boundary.pdf` — `7ec9bdeb42a3fb3657aed1d6d1e8eeb01a2ee98935d08f7541174b1a31008359`
- expected pages 5 · requested scale 2.5
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

### hi_dag_danc_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/hi/hi-dag-danc-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `4e65c4e11d7962a8c8132a6ad85f714638ea9750d497a63e4da916ce801aff96`
- boundary `data/rcap-all50/overlays/census-v1/hi/hi-dag-danc-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `bb4149d07409828754d0477a12cdef68c283ff271b85645137f09c73c6e8118b`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### id_isp_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/id/id-isp-expungement-set--official-pdf-fill/fixtures/application-canonical-filled.pdf` — `c68600571515ebf2132b7879ceea6f61ea18c30e0edecb9ee8405c36ec723da6`
- boundary `data/rcap-all50/overlays/census-v1/id/id-isp-expungement-set--official-pdf-fill/fixtures/application-boundary-filled.pdf` — `48d435eaf962cf4020b4858038c7e5d45175a63534b31664d2afc002c8db57d9`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### in_arrest_no_charges-set

- canonical `data/rcap-all50/overlays/census-v1/in/in-arrest-no-charges-set--official-pdf-fill/fixtures/packet-canonical-filled.pdf` — `2f14e1a7c0e0bf6f162b0385e310a2ce12b9872e13b4bb6b85e21ff139bb9112`
- boundary `data/rcap-all50/overlays/census-v1/in/in-arrest-no-charges-set--official-pdf-fill/fixtures/packet-boundary-filled.pdf` — `a7b34ccf21175518b5deb609818af3b04feda9c3280d0aaa3862b24714d9df3d`
- expected pages 15 · requested scale 2.5
- built by VF02

### in_section1_petition-set

- canonical `data/rcap-all50/overlays/census-v1/in/in-section1-petition-set--official-pdf-fill/fixtures/packet-canonical-filled.pdf` — `f3cfeb3257e31a90b8f29f5bc264e9da1ad0e390f53e1d3c5950b20b4cbc0241`
- boundary `data/rcap-all50/overlays/census-v1/in/in-section1-petition-set--official-pdf-fill/fixtures/packet-boundary-filled.pdf` — `a7b34ccf21175518b5deb609818af3b04feda9c3280d0aaa3862b24714d9df3d`
- expected pages 15 · requested scale 2.5
- built by VF05

### ky_void_seal_controlled_substance-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-void-seal-controlled-substance-set--custom-pleading/fixtures/canonical.pdf` — `e7419541f263c4fdc41bbcea0d45d4dd748a35830e722c02f88afd412c646037`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-void-seal-controlled-substance-set--custom-pleading/fixtures/boundary.pdf` — `0b864b30e140fd8b53adc948f6b294c093095e133b489dab27a745dd632db12f`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### la-987-set-aside-and-dismiss-set

- canonical `data/rcap-all50/overlays/census-v1/la/la-987-set-aside-and-dismiss-set--official-pdf-fill/fixtures/canonical.pdf` — `9e06893a923609beb34e285c6a1bf68044feb518f37cd8a1422a833ef8ca5450`
- boundary `data/rcap-all50/overlays/census-v1/la/la-987-set-aside-and-dismiss-set--official-pdf-fill/fixtures/boundary.pdf` — `a8412820377682280b6646600860ec4a1cb3316143137331791d64997b79bc02`
- expected pages 5 · requested scale 2.5
- built by VF01

### me-nonconv-set

- canonical `data/rcap-all50/overlays/census-v1/me/me-nonconv-set--custom-pleading/fixtures/canonical.pdf` — `d9ea11c3b618cf92863f653ef964f32bf893ef91a602269d1950cbda68c5b007`
- boundary `data/rcap-all50/overlays/census-v1/me/me-nonconv-set--custom-pleading/fixtures/boundary.pdf` — `4f7c2fad8a0c2a2dbd0681b5c48bea156401b82cd87746659cd8077b9df4d665`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### mi_setaside_trafficking-set

- canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-trafficking-set--official-pdf-fill/fixtures/canonical.pdf` — `5adcf1335b6fbedb01880c9559f2a0d06b5fbfab8ae36e54e0a3eae3df358e65`
- boundary `data/rcap-all50/overlays/census-v1/mi/mi-setaside-trafficking-set--official-pdf-fill/fixtures/boundary.pdf` — `8f24ca2af0e6b6d04f5e19f5a68455285e44100b9431690ba8d19806c17f44dd`
- expected pages 4 · requested scale 2.5
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

### nj_disorderly_persons-set

- canonical `data/rcap-all50/overlays/census-v1/nj/nj-disorderly-persons-set--official-pdf-fill/fixtures/cn-10557-canonical.pdf` — `c22cfd2d61ecd5f1b9f6b1eab65a5ad94b61aa6d3c7090950e54708a22b9630e`
- boundary `data/rcap-all50/overlays/census-v1/nj/nj-disorderly-persons-set--official-pdf-fill/fixtures/cn-10557-boundary.pdf` — `5415f4f4992e3229962bcf4b69e1d1b0a4388117c454723a95e4107a6a8f4693`
- expected pages 43 · requested scale 2.5
- built by (no builder lane recorded)

### ny_160_59_petition-set

- canonical `data/rcap-all50/overlays/census-v1/ny/ny-160-59-petition-set--official-pdf-fill/fixtures/application-canonical.pdf` — `d5c8fbc835385d9eb2bbc6d45cc8886a89330f170fa4d4b5fcabcb49d8af7021`
- boundary `data/rcap-all50/overlays/census-v1/ny/ny-160-59-petition-set--official-pdf-fill/fixtures/application-boundary.pdf` — `cda7142cd49f0dd4ed89f32e29227d7d440981371678411f82b3bb3f3ff84b6d`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### pa_490_nonconviction-set

- canonical `data/rcap-all50/overlays/census-v1/pa/pa-490-nonconviction-set--official-pdf-fill/fixtures/rule-490-petition-canonical.pdf` — `1048b6276acfea471f1aee7839c4a638124c5ac10627c1e335ef7cecbf2074e0`
- boundary `data/rcap-all50/overlays/census-v1/pa/pa-490-nonconviction-set--official-pdf-fill/fixtures/rule-490-petition-boundary.pdf` — `c15e8eb4bd78c65b2fac2bc130659cba2a19921fe81c449b7f64654bebeea808`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-ga-guidance-implementation

- canonical `data/rcap-all50/overlays/census-v1/ga/rcap-ga-guidance-implementation--custom-pleading/fixtures/canonical.pdf` — `ecfb488b8adf6cdadbbe1489d4a7fb9a982a18d7e9bebe90b0c019b80a756914`
- boundary `data/rcap-all50/overlays/census-v1/ga/rcap-ga-guidance-implementation--custom-pleading/fixtures/boundary.pdf` — `6866fd683dad67e2a3b4be8db3773e424411850487748f2692ecaf9253d12e24`
- expected pages 4 · requested scale 2.5
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

### ut_pet_traffic-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-traffic-set--official-pdf-fill/fixtures/canonical.pdf` — `b5fcdd1601c823f3ebc6b18f74f5b639789220ec9e8363202c6e1492f9d90909`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-traffic-set--official-pdf-fill/fixtures/boundary.pdf` — `ef8b488fe1f78f87a47419ddf2123ad9909b88612931a8c031ade0299a8d6e03`
- expected pages 9 · requested scale 2.5
- built by (no builder lane recorded)

### va_seal_ancillary_matter_only-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-seal-ancillary-matter-only-set--official-pdf-fill/fixtures/canonical.pdf` — `0ca22f4c4720d2d5325d67fa67657746292923fbfb45580ef94094d5e94ad893`
- boundary `data/rcap-all50/overlays/census-v1/va/va-seal-ancillary-matter-only-set--official-pdf-fill/fixtures/boundary.pdf` — `fcc5c9df64bd93e04cd5c6143cbb00f38a8895a965dd76ca00e62f3235d4c0a5`
- expected pages 10 · requested scale 2.5
- built by (no builder lane recorded)

### vt_seal_18_to_21-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-18-to-21-set--official-pdf-fill/fixtures/canonical.pdf` — `81525fd23e9489ce1225aaf953e28c0e68ad64c376dccf9143a5c14920bde942`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-18-to-21-set--official-pdf-fill/fixtures/boundary.pdf` — `8f0058c992eaf6fec640b7519935f3e0d4c119348f90d7042dd1ee6b53501404`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### vt_seal_pardon-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-pardon-set--official-pdf-fill/fixtures/canonical.pdf` — `81525fd23e9489ce1225aaf953e28c0e68ad64c376dccf9143a5c14920bde942`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-pardon-set--official-pdf-fill/fixtures/boundary.pdf` — `8f0058c992eaf6fec640b7519935f3e0d4c119348f90d7042dd1ee6b53501404`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

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
FAMILIES ASSIGNED: 43
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
