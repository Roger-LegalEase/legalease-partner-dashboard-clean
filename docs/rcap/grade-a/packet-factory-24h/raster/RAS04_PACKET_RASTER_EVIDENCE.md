# RAS04

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `5f78f6f329313b96076a116371bdb61789b4f1b6`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (58)

### agency-application-treatment:obligation:runtime-only:NM:dna-sample-profile-expungement

- canonical `data/rcap-all50/overlays/census-v1/nm/agency-application-treatment:obligation:runtime-only:nm:dna-sample-profile-expungement--official-pdf-fill/fixtures/canonical.pdf` — `1bdc17120f9716b3304c52f5ce56e392291f8bb3e42597b4568524ea8eba429f`
- boundary `data/rcap-all50/overlays/census-v1/nm/agency-application-treatment:obligation:runtime-only:nm:dna-sample-profile-expungement--official-pdf-fill/fixtures/boundary.pdf` — `0c1e91e1b74a31f60a56b96547a402811369b2a01ee3c4fc0cf8f6c753caf651`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### agency-application-treatment:obligation:unattached-decision-route:AK:ak-correct-record

- canonical `data/rcap-all50/overlays/census-v1/ak/agency-application-treatment:obligation:unattached-decision-route:ak:ak-correct-record--official-pdf-fill/fixtures/canonical.pdf` — `298452333a1bc813ccb8924fbbb0bf977aba13c36eb26152350b8c977cd1e3e4`
- boundary `data/rcap-all50/overlays/census-v1/ak/agency-application-treatment:obligation:unattached-decision-route:ak:ak-correct-record--official-pdf-fill/fixtures/boundary.pdf` — `c709cc48b6019c276ca9cce7b66c5f20e737286d8947250b2b4fd0af5babb9ce`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### ak-tf805-set

- canonical `data/rcap-all50/overlays/census-v1/ak/ak-tf805-set--official-pdf-fill/fixtures/tf805-canonical-filled.pdf` — `4f0eccc0580904955bb0542c81ae835128804c87304df33875ad6c98b19a9213`
- boundary `data/rcap-all50/overlays/census-v1/ak/ak-tf805-set--official-pdf-fill/fixtures/tf805-boundary-filled.pdf` — `4e2f307af01f2f1331374240c7e528b9278e98c5811f0f9c93f8fcb8d4564e36`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### al-pardoned-felony-set

- canonical `data/rcap-all50/overlays/census-v1/al/al-pardoned-felony-set--official-pdf-fill/fixtures/canonical.pdf` — `985f5109580e569525a848adee80004a020d460e6d5a07db90bfc2b3dca6b2f0`
- boundary `data/rcap-all50/overlays/census-v1/al/al-pardoned-felony-set--official-pdf-fill/fixtures/boundary.pdf` — `bf42599d8545ee2e470f5bc2b298d64562966c9c71e1a7578c85ca958b29ff6f`
- expected pages 11 · requested scale 2.5
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

### az_marijuana_expungement_superior_court-set

- canonical `data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-superior-court-set--official-pdf-fill/fixtures/aoc-crem3f-canonical-filled.pdf` — `06232e1f2a7888c27499f271395236d6eba1fbaddb1c1de4c47584d7905ffe5a`
- boundary `data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-superior-court-set--official-pdf-fill/fixtures/aoc-crem3f-boundary-filled.pdf` — `109e16a3e6c9a5e6f987632a7b491e99686112f096f3224df93552c4303f30b2`
- expected pages 3 · requested scale 2.5
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

### ca-851-91-set

- **16 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-851-91-set--official-pdf-fill/fixtures/pc-851-91-interests-of-justice-canonical/cr-106-unchanged-official.pdf` — `f8a37a9a8c30a016b432bb39fd67407717c3dee7be74bc3e3d471127bf190c5a` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-851-91-set--official-pdf-fill/fixtures/pc-851-91-interests-of-justice-canonical/cr-409-filled.pdf` — `371d8890ba43c6b6036d725ab2ef6cfa418bb7b3b78847b943804211662c7502` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-851-91-set--official-pdf-fill/fixtures/pc-851-91-interests-of-justice-canonical/cr-410-unchanged-official.pdf` — `d94bd94bad3da9d05d71b1b154a440db1864b9441e2972c84b7854e1538604f9` · 1 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-851-91-set--official-pdf-fill/fixtures/pc-851-91-interests-of-justice-canonical/mc-031-unchanged-official.pdf` — `defc9108f6baa4c2ca444c1571d737d841af78289bef337f874f51e595191075` · 1 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-851-91-set--official-pdf-fill/fixtures/pc-851-91-matter-of-right-canonical/cr-106-unchanged-official.pdf` — `f8a37a9a8c30a016b432bb39fd67407717c3dee7be74bc3e3d471127bf190c5a` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-851-91-set--official-pdf-fill/fixtures/pc-851-91-matter-of-right-canonical/cr-409-filled.pdf` — `371d8890ba43c6b6036d725ab2ef6cfa418bb7b3b78847b943804211662c7502` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-851-91-set--official-pdf-fill/fixtures/pc-851-91-matter-of-right-canonical/cr-410-unchanged-official.pdf` — `d94bd94bad3da9d05d71b1b154a440db1864b9441e2972c84b7854e1538604f9` · 1 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-851-91-set--official-pdf-fill/fixtures/pc-851-91-matter-of-right-canonical/mc-031-unchanged-official.pdf` — `defc9108f6baa4c2ca444c1571d737d841af78289bef337f874f51e595191075` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-851-91-set--official-pdf-fill/fixtures/pc-851-91-interests-of-justice-boundary/cr-106-unchanged-official.pdf` — `f8a37a9a8c30a016b432bb39fd67407717c3dee7be74bc3e3d471127bf190c5a` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-851-91-set--official-pdf-fill/fixtures/pc-851-91-interests-of-justice-boundary/cr-409-filled.pdf` — `03f3553ef8ead28973904ba6941778f2995a11290b2d1982a486308eea4e58be` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-851-91-set--official-pdf-fill/fixtures/pc-851-91-interests-of-justice-boundary/cr-410-unchanged-official.pdf` — `d94bd94bad3da9d05d71b1b154a440db1864b9441e2972c84b7854e1538604f9` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-851-91-set--official-pdf-fill/fixtures/pc-851-91-interests-of-justice-boundary/mc-031-unchanged-official.pdf` — `defc9108f6baa4c2ca444c1571d737d841af78289bef337f874f51e595191075` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-851-91-set--official-pdf-fill/fixtures/pc-851-91-matter-of-right-boundary/cr-106-unchanged-official.pdf` — `f8a37a9a8c30a016b432bb39fd67407717c3dee7be74bc3e3d471127bf190c5a` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-851-91-set--official-pdf-fill/fixtures/pc-851-91-matter-of-right-boundary/cr-409-filled.pdf` — `03f3553ef8ead28973904ba6941778f2995a11290b2d1982a486308eea4e58be` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-851-91-set--official-pdf-fill/fixtures/pc-851-91-matter-of-right-boundary/cr-410-unchanged-official.pdf` — `d94bd94bad3da9d05d71b1b154a440db1864b9441e2972c84b7854e1538604f9` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-851-91-set--official-pdf-fill/fixtures/pc-851-91-matter-of-right-boundary/mc-031-unchanged-official.pdf` — `defc9108f6baa4c2ca444c1571d737d841af78289bef337f874f51e595191075` · 1 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ca/ca-851-91-set--official-pdf-fill/fixtures/pc-851-91-matter-of-right-canonical/cr-409-filled.pdf` and `data/rcap-all50/overlays/census-v1/ca/ca-851-91-set--official-pdf-fill/fixtures/pc-851-91-matter-of-right-boundary/cr-409-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 24 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### co_multiple_conviction_seal-set

- canonical `data/rcap-all50/overlays/census-v1/co/co-multiple-conviction-seal-set--official-pdf-fill/fixtures/canonical.pdf` — `48cf9bf5cf44e01f1012534a402f29fa5c5f1a809b2c1192003e9790ac8bf6de`
- boundary `data/rcap-all50/overlays/census-v1/co/co-multiple-conviction-seal-set--official-pdf-fill/fixtures/boundary.pdf` — `ff74f8da50629aedd6eff550902ab831d19a9be3268bb88fc7cac62d87523fd1`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1017a_automatic_failure_correction

- canonical `data/rcap-all50/overlays/census-v1/de/composed-treatment:obligation:runtime-contract-cohort:de:juvenile-expungement-under-10-del-c-1017-1019-1017a:section-1017a-automatic-failure-correction--custom-pleading/fixtures/canonical.pdf` — `0e9809a8fba28867f03cada0daae2c2c882ff57f7a55f0a75c9151021a99b60e`
- boundary `data/rcap-all50/overlays/census-v1/de/composed-treatment:obligation:runtime-contract-cohort:de:juvenile-expungement-under-10-del-c-1017-1019-1017a:section-1017a-automatic-failure-correction--custom-pleading/fixtures/boundary.pdf` — `fd9884acbebe2e257e9e6b708c051f208490d4ad86468f73c3bac2339d132ac8`
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

### il-seal-nonconv-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-seal-nonconv-set--official-pdf-fill/fixtures/canonical.pdf` — `333ffbeb03e846be21f52caa2088d9230b9b6d6094f90f764385218d46815d39`
- boundary `data/rcap-all50/overlays/census-v1/il/il-seal-nonconv-set--official-pdf-fill/fixtures/boundary.pdf` — `1df2b84a4cc3a6f2c4dc2e1724525e586997349940987ff396b932f3f78816c1`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### in_conviction_misd-set

- canonical `data/rcap-all50/overlays/census-v1/in/in-conviction-misd-set--custom-pleading/fixtures/canonical.pdf` — `b8dab03eb354af295a890cdf3f6319189013a70b78a2e861ed6a3073acae1de6`
- boundary `data/rcap-all50/overlays/census-v1/in/in-conviction-misd-set--custom-pleading/fixtures/boundary.pdf` — `55a851e6a344bf742a73444686a98bfbff957ed291305cb3cfdecaa6c6b3ea02`
- expected pages 10 · requested scale 2.5
- built by (no builder lane recorded)

### ky_felony_vacatur_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-felony-vacatur-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `581dee480d77d2f226b907b017c4209de89d4f4346f654256ed11ba24d32e54e`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-felony-vacatur-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `3847941126c39f4c5963e2fa06bbccbaf5936a39551118fc6df429ff21bca91b`
- expected pages 7 · requested scale 2.5
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

### ma-seal-court-set

- canonical `data/rcap-all50/overlays/census-v1/ma/ma-seal-court-set--official-pdf-fill/fixtures/canonical.pdf` — `afee77f5a337468a5f6997455b764ac6fd79d9d1d6251d8a596dd6f564b5cff1`
- boundary `data/rcap-all50/overlays/census-v1/ma/ma-seal-court-set--official-pdf-fill/fixtures/boundary.pdf` — `a02b59dd46e11a1b6d167b4cf04d35383eb74b6695038c491674d85d55907327`
- expected pages 3 · requested scale 2.5
- built by VF06

### md_second_chance_shielding-set

- canonical `data/rcap-all50/overlays/census-v1/md/md-second-chance-shielding-set--official-pdf-fill/fixtures/canonical.pdf` — `7265c7307fab7193a5dff3c5e2edb035ecad340122d2c587b476ef91752e777f`
- boundary `data/rcap-all50/overlays/census-v1/md/md-second-chance-shielding-set--official-pdf-fill/fixtures/boundary.pdf` — `00e402d6699ec3f872e0cdc205e182bf36a2dd919d6091b32b5f38cfbd36cf5d`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### me-seal-prost-set

- canonical `data/rcap-all50/overlays/census-v1/me/me-seal-prost-set--official-pdf-fill/fixtures/cr289-canonical-filled.pdf` — `4e44539864adc68ea7f7080693315ee08708f00659f7391c21aeda934010abf3`
- boundary `data/rcap-all50/overlays/census-v1/me/me-seal-prost-set--official-pdf-fill/fixtures/cr289-boundary-filled.pdf` — `9a9a65a2a145b07982f573fe820e0aa088fc28ac1cc58136e9652217289cf70c`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### mi_setaside_trafficking-set

- canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-trafficking-set--official-pdf-fill/fixtures/canonical.pdf` — `acb9bf49ab83059266162eb046e4e55be6f44d9f0647e7099325bedae31e28ee`
- boundary `data/rcap-all50/overlays/census-v1/mi/mi-setaside-trafficking-set--official-pdf-fill/fixtures/boundary.pdf` — `90bd30df3077f8dc819f4c227c7cc254d1773fc0db9fc51ecf42febe950b58a2`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### ms-diversion-set

- canonical `data/rcap-all50/overlays/census-v1/ms/ms-diversion-set--custom-pleading/fixtures/canonical.pdf` — `4d4923f05553c92b885056e5ba6e97cb631e04df3f55e0c45366351b6e8f7bcb`
- boundary `data/rcap-all50/overlays/census-v1/ms/ms-diversion-set--custom-pleading/fixtures/boundary.pdf` — `7d39bd412a5db6dd80c54c2d3f6dcc06b4927221eb8aa54e753ba05b01cc7938`
- expected pages 9 · requested scale 2.5
- built by (no builder lane recorded)

### ms-nonadj-set

- canonical `data/rcap-all50/overlays/census-v1/ms/ms-nonadj-set--custom-pleading/fixtures/canonical.pdf` — `481680f62dddb4be3c2bfe4f0c658311913cfde419270336aaf705c89955f0ee`
- boundary `data/rcap-all50/overlays/census-v1/ms/ms-nonadj-set--custom-pleading/fixtures/boundary.pdf` — `7006c8e94b040e0b98d6b9df8c169faea1c34afe7ae51093488982393e4d3d22`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### nc_146_acquittal_petition-set

- canonical `data/rcap-all50/overlays/census-v1/nc/nc-146-acquittal-petition-set--official-pdf-fill/fixtures/canonical.pdf` — `135dc7b9c0f104788512f1e313a6d88b4497c88a70fc6b18b92abe45bceecf17`
- boundary `data/rcap-all50/overlays/census-v1/nc/nc-146-acquittal-petition-set--official-pdf-fill/fixtures/boundary.pdf` — `5597a2818dc8914554b24418cba87d418676dc1ddfe2111967df1a6c4f30a3da`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### nd-regular-pardon-set

- canonical `data/rcap-all50/overlays/census-v1/nd/nd-regular-pardon-set--official-pdf-fill/fixtures/canonical.pdf` — `c0a8d543dc45047ff0ddf20558239ffe10ba3a3e8af3ef034922a7be5cbcd7c7`
- boundary `data/rcap-all50/overlays/census-v1/nd/nd-regular-pardon-set--official-pdf-fill/fixtures/boundary.pdf` — `8cce6850a548e96559cb59f31128463e7277b0e4d487d26682388532bb735507`
- expected pages 8 · requested scale 2.5
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

### nj_arrest_no_conviction-set

- canonical `data/rcap-all50/overlays/census-v1/nj/nj-arrest-no-conviction-set--official-pdf-fill/fixtures/cn-10557-canonical.pdf` — `922b89598d0b7b57d0fd40623d404a7d9cf24ba507a9eba82472815d9b74ee7d`
- boundary `data/rcap-all50/overlays/census-v1/nj/nj-arrest-no-conviction-set--official-pdf-fill/fixtures/cn-10557-boundary.pdf` — `23a571af72985717963001120ba60116ae43054aaa1c2fddbeece944dac24494`
- expected pages 43 · requested scale 2.5
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

### pa_490_nonconviction-set

- **6 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/pa/pa-490-nonconviction-set--official-pdf-fill/fixtures/certificate-of-service-canonical.pdf` — `2fa87df1916ae4d9feb88a3fecb9a60d82d99ec7eadccf7cec7af9b55ddd4b17` · 1 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/pa/pa-490-nonconviction-set--official-pdf-fill/fixtures/rule-490-order-canonical.pdf` — `3d4cc7861b3aed7517d4f2a50adba4b4dbac95d9f644d682f58d07897d1e1a25` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/pa/pa-490-nonconviction-set--official-pdf-fill/fixtures/rule-490-petition-canonical.pdf` — `c2d6a4b36adb93a94a5fd495b231f448a31bffec726cf93a41646cc20799643c` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/pa/pa-490-nonconviction-set--official-pdf-fill/fixtures/certificate-of-service-boundary.pdf` — `cb9ce703674ca360c2bb6f95ff3f3f5b31de1260b752268f3b0c17a7200e80e2` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/pa/pa-490-nonconviction-set--official-pdf-fill/fixtures/rule-490-order-boundary.pdf` — `aa5520a16b9dcf7258bfe9a97a58cf6b11300a05eb1be59fecd224eb7f86adee` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/pa/pa-490-nonconviction-set--official-pdf-fill/fixtures/rule-490-petition-boundary.pdf` — `c2fbfa66a1705b32baafa2b23da9356f2a4ef7851440e6672ae77ad343b774aa` · 1 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/pa/pa-490-nonconviction-set--official-pdf-fill/fixtures/rule-490-petition-canonical.pdf` and `data/rcap-all50/overlays/census-v1/pa/pa-490-nonconviction-set--official-pdf-fill/fixtures/rule-490-petition-boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 8 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### rcap-ga-guidance-implementation

- canonical `data/rcap-all50/overlays/census-v1/ga/rcap-ga-guidance-implementation--custom-pleading/fixtures/canonical.pdf` — `ecfb488b8adf6cdadbbe1489d4a7fb9a982a18d7e9bebe90b0c019b80a756914`
- boundary `data/rcap-all50/overlays/census-v1/ga/rcap-ga-guidance-implementation--custom-pleading/fixtures/boundary.pdf` — `6866fd683dad67e2a3b4be8db3773e424411850487748f2692ecaf9253d12e24`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-nd-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/nd/rcap-nd-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `2fd78d8919dedfbdc062f180ade3769ed019c10e76bc1bc615f3f090e4e49522`
- boundary `data/rcap-all50/overlays/census-v1/nd/rcap-nd-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `52464ec12db3294f7d66003f4398d87c6753c4b4ef46db4ca5be9d0e5f381e8d`
- expected pages 35 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-sc-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/sc/rcap-sc-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `be6c8dd75e58feaff3d5049c3c4986b99fd39286bfd150855f2cd54eb9551f9b`
- boundary `data/rcap-all50/overlays/census-v1/sc/rcap-sc-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `b808c99ade96a876097f1086585818b63824cd79b20f0407cc8169fe6ce1f6a5`
- expected pages 64 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-wi-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/wi/rcap-wi-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `fa75790c3ef35af41d142cade19bf6def68149e3767e9b14eb73b1bd45414dc9`
- boundary `data/rcap-all50/overlays/census-v1/wi/rcap-wi-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `84297a24847a4a9555b92a8ac138d101fffd03331e71be7229efb72e50f1b5d8`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### ri_first_offender_misdemeanor-set

- canonical `data/rcap-all50/overlays/census-v1/ri/ri-first-offender-misdemeanor-set--official-pdf-fill/fixtures/canonical.pdf` — `bebf3cd93c0834ab742c2a63805d0956f6c64f6db253d2a51d26ac6483382206`
- boundary `data/rcap-all50/overlays/census-v1/ri/ri-first-offender-misdemeanor-set--official-pdf-fill/fixtures/boundary.pdf` — `90987141136b5406403ff179368715c6071b43a1f170b81ddf773f5dbbda6c00`
- expected pages 15 · requested scale 2.5
- built by (no builder lane recorded)

### tx_nd_conviction_no_supervision-set

- canonical `data/rcap-all50/overlays/census-v1/tx/tx-nd-conviction-no-supervision-set--official-pdf-fill/fixtures/canonical.pdf` — `dd3c259471713851aa1bf607e3e75fcb6bc1ede719dd934212a0039dcd6f0dd6`
- boundary `data/rcap-all50/overlays/census-v1/tx/tx-nd-conviction-no-supervision-set--official-pdf-fill/fixtures/boundary.pdf` — `cc799883f128b0d113bbb448decf7b4fdd8f07640c777d0db9e340d32f4bb988`
- expected pages 24 · requested scale 2.5
- built by (no builder lane recorded)

### tx_nd_probation_misdemeanor-set

- canonical `data/rcap-all50/overlays/census-v1/tx/tx-nd-probation-misdemeanor-set--official-pdf-fill/fixtures/canonical.pdf` — `4cbe29eccdb297c6b578da29f7b32d8a5ed64c9d5647c51457fb7398a4543051`
- boundary `data/rcap-all50/overlays/census-v1/tx/tx-nd-probation-misdemeanor-set--official-pdf-fill/fixtures/boundary.pdf` — `9b905898752d33843a13b1750632040edadaa65f7da8125ddf8c7330eda9bd07`
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

### va_seal_ancillary_matter_only-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-seal-ancillary-matter-only-set--official-pdf-fill/fixtures/canonical.pdf` — `60962eef718b1048f55d7392818354057fa41636640ae20bc5ec34da49d9367e`
- boundary `data/rcap-all50/overlays/census-v1/va/va-seal-ancillary-matter-only-set--official-pdf-fill/fixtures/boundary.pdf` — `bbf887ccdc75f2cab73d6afb98e9bcc6607ceee248b551b4872c742a0c3f4992`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### vt_exp_decriminalized-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-exp-decriminalized-set--official-pdf-fill/fixtures/canonical.pdf` — `4d9b64e07b2b3ed66e291ee11ddba00a37bfe413ed931ed459b271df46ca9da0`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-exp-decriminalized-set--official-pdf-fill/fixtures/boundary.pdf` — `d56f5a0fce5ba30c9c22a87aa5261c2545781e6cd8464b9b7816fb53f711fa4d`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### vt_seal_felony-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-felony-set--official-pdf-fill/fixtures/canonical.pdf` — `c360eac4b8698a0f9b11180a98e7515030dc9406746ebe0de48a61c09bb68843`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-felony-set--official-pdf-fill/fixtures/boundary.pdf` — `21fa17be618b32306ef2b22de7c2807b439815d0db0ae58becc648b2083c132a`
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

### wa_vac_survivor_misdemeanor-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-misdemeanor-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` — `846360e75578ce6233dba77b03b25545a529b50cd553ad31f88d3008b429a6ad` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-misdemeanor-set--official-pdf-fill/fixtures/crrlj-09-0200-canonical-filled.pdf` — `3abc2475b78da8cff2445a99a78fa7aa18641d4c27f17d0c5eea3d6f07e40ce7` · 6 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-misdemeanor-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` — `75fac347051d6b710015ef5bbcc10b43df0a1de59078195ede75a744f4c42b77` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-misdemeanor-set--official-pdf-fill/fixtures/crrlj-09-0200-boundary-filled.pdf` — `4d844aece78a8ae1c1e97407edd305f45dbdaa2c509f8e55ef51fef03bcb3a55` · 6 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-misdemeanor-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-misdemeanor-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 22 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### wv_acc_treatment_job_readiness-set

- canonical `data/rcap-all50/overlays/census-v1/wv/wv-acc-treatment-job-readiness-set--custom-pleading/fixtures/canonical.pdf` — `a0fc30d9338c4bc1bd47cd645beb9f74cf8d7a40810ceeaa9f376f1f491da9c3`
- boundary `data/rcap-all50/overlays/census-v1/wv/wv-acc-treatment-job-readiness-set--custom-pleading/fixtures/boundary.pdf` — `458f5f5b818d57f2380b22517469c575280244eda95af1f7504ef067ef8bc096`
- expected pages 14 · requested scale 2.5
- built by VF06

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
FAMILIES ASSIGNED: 58
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
