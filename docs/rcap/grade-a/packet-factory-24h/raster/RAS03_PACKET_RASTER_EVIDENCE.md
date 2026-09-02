# RAS03

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `40e5b111af3f58336d10ea284742daceb56a04ae`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (39)

### ak-tf805-set

- canonical `data/rcap-all50/overlays/census-v1/ak/ak-tf805-set--official-pdf-fill/fixtures/tf805-canonical-filled.pdf` — `bffda336fac95d0980e0a9130913c9189077e1fdc3f05b5a1d55065e5f5c9703`
- boundary `data/rcap-all50/overlays/census-v1/ak/ak-tf805-set--official-pdf-fill/fixtures/tf805-boundary-filled.pdf` — `5dd98fef218f8310a8e46e41a9ca83e53d5295507bac0c82fce77e44f96d0ff5`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### ar-misdemeanor-dwi-seal-set

- canonical `data/rcap-all50/overlays/census-v1/ar/ar-misdemeanor-dwi-seal-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `6bf0184ddc31364f316cb656745f364f8def8aa547428beb881c4c632e2f750d`
- boundary `data/rcap-all50/overlays/census-v1/ar/ar-misdemeanor-dwi-seal-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `a6cef12f7344600b5f9e89aefee9785440de185d88340d051b090ec6011bdfb8`
- expected pages 4 · requested scale 2.5
- built by VF04

### co_multiple_conviction_seal-set

- canonical `data/rcap-all50/overlays/census-v1/co/co-multiple-conviction-seal-set--official-pdf-fill/fixtures/canonical.pdf` — `3cb52dc501311af75b69ef7c8e339849b0fbb2d632bd16e0f6b3a4483e89a0cd`
- boundary `data/rcap-all50/overlays/census-v1/co/co-multiple-conviction-seal-set--official-pdf-fill/fixtures/boundary.pdf` — `204a36fd7f6f27ba2dd630afd90c7065e5521419c8c379ef095ead0883101d44`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:research-decision-route:NY:ny_160_55_violation:sentencing_court_transmission_correction_request

- canonical `data/rcap-all50/overlays/census-v1/ny/composed-treatment:obligation:research-decision-route:ny:ny-160-55-violation:sentencing-court-transmission-correction-request--custom-pleading/fixtures/canonical.pdf` — `9a3e8f36ad9c4f83bdd11f4771d4bcb84dcecd6c5eeb407c3319ab0d0ef6fd5a`
- boundary `data/rcap-all50/overlays/census-v1/ny/composed-treatment:obligation:research-decision-route:ny:ny-160-55-violation:sentencing-court-transmission-correction-request--custom-pleading/fixtures/boundary.pdf` — `f623426b5f191878a1d01c0531e43df28edceb9c42b3f3bef2617ecbd3b1acf2`
- expected pages 4 · requested scale 2.5
- built by VF08

### composed-treatment:obligation:runtime-only:GA:youthful-first-offender-restriction-route

- canonical `data/rcap-all50/overlays/census-v1/ga/composed-treatment:obligation:runtime-only:ga:youthful-first-offender-restriction-route--custom-pleading/fixtures/canonical.pdf` — `b35a0f04979f25912049b4d2d39f27c0b23223b497f30b78b4f0afa7c9eca5de`
- boundary `data/rcap-all50/overlays/census-v1/ga/composed-treatment:obligation:runtime-only:ga:youthful-first-offender-restriction-route--custom-pleading/fixtures/boundary.pdf` — `e3352f6da6302d0074372e3a9d3bab0adbe64b4e42096470cb3ade5ad2f45539`
- expected pages 4 · requested scale 2.5
- built by VF12

### composed-treatment:obligation:runtime-only:MS:uncharged-misdemeanor-immediate-dismissal-branch-99-15-59

- canonical `data/rcap-all50/overlays/census-v1/ms/composed-treatment:obligation:runtime-only:ms:uncharged-misdemeanor-immediate-dismissal-branch-99-15-59--custom-pleading/fixtures/canonical.pdf` — `363c87d1654b8e3619e4491d8a12ed9b480bf1fa2fb85655b8fdd195bbb831eb`
- boundary `data/rcap-all50/overlays/census-v1/ms/composed-treatment:obligation:runtime-only:ms:uncharged-misdemeanor-immediate-dismissal-branch-99-15-59--custom-pleading/fixtures/boundary.pdf` — `2d68800280ab7c360b93a371f13cb9a6651175e8555fab5601cda2d25cbee758`
- expected pages 5 · requested scale 2.5
- built by VF04

### composed-treatment:obligation:runtime-only:OK:juvenile-record-expungement

- canonical `data/rcap-all50/overlays/census-v1/ok/composed-treatment:obligation:runtime-only:ok:juvenile-record-expungement--custom-pleading/fixtures/canonical.pdf` — `4dc8c667c8b0f963e4e7aa246b4a8fce930b4f99eece1534bfd9188828d1e2d3`
- boundary `data/rcap-all50/overlays/census-v1/ok/composed-treatment:obligation:runtime-only:ok:juvenile-record-expungement--custom-pleading/fixtures/boundary.pdf` — `6653d65c5072edb18464b0b31464562d9398d76d916c293169109a60cb912e00`
- expected pages 5 · requested scale 2.5
- built by VF08

### composed-treatment:obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708

- canonical `data/rcap-all50/overlays/census-v1/wy/composed-treatment:obligation:runtime-only:wy:human-trafficking-victim-vacatur-w-s-6-2-708--custom-pleading/fixtures/canonical.pdf` — `5bda53316d7754e6c4b538aee582218516a0d50290aa5391346068f8d6d43880`
- boundary `data/rcap-all50/overlays/census-v1/wy/composed-treatment:obligation:runtime-only:wy:human-trafficking-victim-vacatur-w-s-6-2-708--custom-pleading/fixtures/boundary.pdf` — `0640a1b57e2480fb7d3f8fe473d04ec3c97cad788df7cfd4e9daf2c0b119071c`
- expected pages 4 · requested scale 2.5
- built by VF12

### ct-cleanslate-petition-set

- canonical `data/rcap-all50/overlays/census-v1/ct/ct-cleanslate-petition-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `d44ace77326e51a697450d18a033eadccf308b32d5d426ce5c73ffc989546e06`
- boundary `data/rcap-all50/overlays/census-v1/ct/ct-cleanslate-petition-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `e190d7304260be94e84e46fb18710ee85e1f5a5314e7a7a5a5dd5eeb33b3d052`
- expected pages 2 · requested scale 2.5
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

### ga-deaddocket-j3-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-deaddocket-j3-set--custom-pleading/fixtures/canonical.pdf` — `0860a52c8b3607370fee4757b2224ade00b514f13df43ee92589099c69a278fd`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-deaddocket-j3-set--custom-pleading/fixtures/boundary.pdf` — `65217c5b184350454e5dac9e0d0986162ac9edc600e1291c9638ea2572f95f96`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### ga-fugitive-j5-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-fugitive-j5-set--custom-pleading/fixtures/canonical.pdf` — `98b8c3f6db936186d9429707af2ef62c34a53d5c8d0ae1acb7d2c00ddfcc8d02`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-fugitive-j5-set--custom-pleading/fixtures/boundary.pdf` — `9480dd333b55a8adcd3cc6f6bfd2294de83ff187151182cce2a2910eaab738c7`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### ga-pardon-j7-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-pardon-j7-set--custom-pleading/fixtures/canonical.pdf` — `6a1c18a1587a4d7c8e686545c1a8c2b35bdb1347c8e5dd720115045b26ebc9fa`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-pardon-j7-set--custom-pleading/fixtures/boundary.pdf` — `48a85fc1d7793b1d76c30cf100da6a273b5b325ad5c162822bf6c5c747a6240d`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### id_felony_reduction-set

- canonical `data/rcap-all50/overlays/census-v1/id/id-felony-reduction-set--custom-pleading/fixtures/canonical.pdf` — `d246f76059f94a3f78286381d3ff6289cae01f5593b11c3625a50d223e33afd1`
- boundary `data/rcap-all50/overlays/census-v1/id/id-felony-reduction-set--custom-pleading/fixtures/boundary.pdf` — `8c5d84ecc8a8946d5ad51ad38326119f208ae4791775c7aff448af9ef7fabc48`
- expected pages 4 · requested scale 2.5
- built by VF05

### in_arrest_no_charges-set

- canonical `data/rcap-all50/overlays/census-v1/in/in-arrest-no-charges-set--official-pdf-fill/fixtures/packet-canonical-filled.pdf` — `a39f4c3ba8d635c3828af504dc2762127b6f4afd48abe398a805417d1cc70271`
- boundary `data/rcap-all50/overlays/census-v1/in/in-arrest-no-charges-set--official-pdf-fill/fixtures/packet-boundary-filled.pdf` — `4e9aeda66690545d2fd412be257f31e190e8a39b8c22ce08e6f630a6c4462f23`
- expected pages 15 · requested scale 2.5
- built by VF08

### ky_felony_vacatur_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-felony-vacatur-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `581dee480d77d2f226b907b017c4209de89d4f4346f654256ed11ba24d32e54e`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-felony-vacatur-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `3847941126c39f4c5963e2fa06bbccbaf5936a39551118fc6df429ff21bca91b`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### ma-expunge-mj-set

- canonical `data/rcap-all50/overlays/census-v1/ma/ma-expunge-mj-set--official-pdf-fill/fixtures/canonical.pdf` — `ceab4012296b4e132466a11ebc5239fd72ae553fd5a5554f7ddfc110fcb8f565`
- boundary `data/rcap-all50/overlays/census-v1/ma/ma-expunge-mj-set--official-pdf-fill/fixtures/boundary.pdf` — `ceab4012296b4e132466a11ebc5239fd72ae553fd5a5554f7ddfc110fcb8f565`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### me-seal-prost-set

- canonical `data/rcap-all50/overlays/census-v1/me/me-seal-prost-set--official-pdf-fill/fixtures/cr289-canonical-filled.pdf` — `ce2e6bde63ac9524927ace30a128938174ff79db091ec8db26a4ad3d307daaf7`
- boundary `data/rcap-all50/overlays/census-v1/me/me-seal-prost-set--official-pdf-fill/fixtures/cr289-boundary-filled.pdf` — `c56d43ba1b2341526fa7b7c17115b77435a1e030f70e2dfc93c76815f9cc2695`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### ms-nonadj-set

- canonical `data/rcap-all50/overlays/census-v1/ms/ms-nonadj-set--custom-pleading/fixtures/canonical.pdf` — `b3488303e6e8ab6e344bb4ef96c9533c5adc1db5d04a2a66707d11f3e2d72527`
- boundary `data/rcap-all50/overlays/census-v1/ms/ms-nonadj-set--custom-pleading/fixtures/boundary.pdf` — `3c016942a2891e2b300a33247ec119ee2efce7e129c3ae0991d773152fba47de`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### ne-expunge-le-error-set

- canonical `data/rcap-all50/overlays/census-v1/ne/ne-expunge-le-error-set--custom-pleading/fixtures/canonical.pdf` — `b3ad99b4a1ae52c251751a357bb0dc4745dd1ceb6281ed03861cb9a0988a9be8`
- boundary `data/rcap-all50/overlays/census-v1/ne/ne-expunge-le-error-set--custom-pleading/fixtures/boundary.pdf` — `df7386e9e32ad77e32fcbfebc123a0a0d5a31e24a46ad9a02050216a227c8f69`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### nj_clean_slate-set

- canonical `data/rcap-all50/overlays/census-v1/nj/nj-clean-slate-set--official-pdf-fill/fixtures/cn-10557-canonical.pdf` — `343407a30f38beffccde4c51b8060065bd6eed27356a999d8e321e01a1baca33`
- boundary `data/rcap-all50/overlays/census-v1/nj/nj-clean-slate-set--official-pdf-fill/fixtures/cn-10557-boundary.pdf` — `6256ba7f621c25a8f8a501c0a9af0191c151074fc8d3b2bb6ff2ef36354788ea`
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
- built by VF02

### pa_9122_1_limited_access-set

- canonical `data/rcap-all50/overlays/census-v1/pa/pa-9122-1-limited-access-set--official-pdf-fill/fixtures/rule-791-petition-canonical.pdf` — `8996b09209eb45a12c7985155e579dc4ae2bbc6368ffdc7fba67506f137e163c`
- boundary `data/rcap-all50/overlays/census-v1/pa/pa-9122-1-limited-access-set--official-pdf-fill/fixtures/rule-791-petition-boundary.pdf` — `db4067c897f6d36e5e2a1085de6a3c4e9f2e94eb8df312dc531166bb082acff3`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-ga-guidance-implementation

- canonical `data/rcap-all50/overlays/census-v1/ga/rcap-ga-guidance-implementation--custom-pleading/fixtures/canonical.pdf` — `ecfb488b8adf6cdadbbe1489d4a7fb9a982a18d7e9bebe90b0c019b80a756914`
- boundary `data/rcap-all50/overlays/census-v1/ga/rcap-ga-guidance-implementation--custom-pleading/fixtures/boundary.pdf` — `6866fd683dad67e2a3b4be8db3773e424411850487748f2692ecaf9253d12e24`
- expected pages 4 · requested scale 2.5
- built by VF04

### rcap-nv-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/nv/rcap-nv-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `d73ee75c132da59a063994a5db8da429460d5c79ddf78af06634a80691516fad`
- boundary `data/rcap-all50/overlays/census-v1/nv/rcap-nv-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `eea01e78026c6ea9a53398feba3fec6bea43ecf838b5eea49a3cbab4d5172b01`
- expected pages 50 · requested scale 2.5
- built by VF08

### rcap-tn-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/tn/rcap-tn-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `4bfc82385dee12229041fd0627335373210e632a5be2d9b002153e1444fe732b`
- boundary `data/rcap-all50/overlays/census-v1/tn/rcap-tn-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `be3ec3eeb060fdb4c560f2fc080c6933b86bacc227191040b23b7afb6687506a`
- expected pages 62 · requested scale 2.5
- built by VF12

### ri_marijuana-set

- canonical `data/rcap-all50/overlays/census-v1/ri/ri-marijuana-set--custom-pleading/fixtures/canonical.pdf` — `79bcf52eb9014313303adc20c37ec9d20d127de1dd28e5b738f2c823f0eba8f0`
- boundary `data/rcap-all50/overlays/census-v1/ri/ri-marijuana-set--custom-pleading/fixtures/boundary.pdf` — `fc9c6c8ae3934798ba7dd5eff9bf58629da65a390ba9cf0318032f8b37945312`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### ut_pet_acquittal-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-acquittal-set--official-pdf-fill/fixtures/canonical.pdf` — `ad594f0a40750195b67e36916f3628df5b96d337e4955c9063b415747d6e36d6`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-acquittal-set--official-pdf-fill/fixtures/boundary.pdf` — `b3ba83a65754f96fe58083de62a3ce879654d6362170e11bae2f043e4c39a765`
- expected pages 19 · requested scale 2.5
- built by VF04

### ut_pet_limitations-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-limitations-set--official-pdf-fill/fixtures/canonical.pdf` — `dd21a4460eba9fa2ab92a267788fe1b4c2a98301f5607f2163975a9ffd257f57`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-limitations-set--official-pdf-fill/fixtures/boundary.pdf` — `7002b83486f9abcaa1a3e423a56e955addd083347e02297da0a7e78deaba40e7`
- expected pages 19 · requested scale 2.5
- built by VF08

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

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-nonconviction-set--official-pdf-fill/fixtures/canonical.pdf` — `9cf262bf31d99e3cf64379bc7efcbf87081694307842a86c4277c967d981c21b`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-nonconviction-set--official-pdf-fill/fixtures/boundary.pdf` — `baf3bbd94b100416c355be450d68160099aff231387705719adf98db3c5c033f`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_cannabis-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/fixtures/crrlj-09-0800-canonical-filled.pdf` — `9ccebef430b4a7de3614df3a9796d57524385147e01e82a4e7c186b1cc7088ad`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/fixtures/crrlj-09-0800-boundary-filled.pdf` — `22c9ec04f47a5ae0222cc4d84e859cf402c7585379fa7337d0243d57c41c8942`
- expected pages 1 · requested scale 2.5
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
- built by FIX03

### wv_conv_single_misdemeanor-set

- canonical `data/rcap-all50/overlays/census-v1/wv/wv-conv-single-misdemeanor-set--official-pdf-fill/fixtures/canonical.pdf` — `dc8ec89cc5760e1a02d789216885c91bf477a264a000bd58f1c3608fdc0c0d21`
- boundary `data/rcap-all50/overlays/census-v1/wv/wv-conv-single-misdemeanor-set--official-pdf-fill/fixtures/boundary.pdf` — `85462388778b3e78519e54169e981721ade269a7aeaf092ccdbc7fe1fb995d8d`
- expected pages 9 · requested scale 2.5
- built by VF12

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
FAMILIES ASSIGNED: 39
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
