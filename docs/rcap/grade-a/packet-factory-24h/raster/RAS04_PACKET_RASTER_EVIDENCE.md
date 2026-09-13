# RAS04

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `9cd7c3f0f394616a166dea4343b997df23e6ee75`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (81)

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

### al-misd-conviction-set

- canonical `data/rcap-all50/overlays/census-v1/al/al-misd-conviction-set--official-pdf-fill/fixtures/canonical.pdf` — `1087cc68caa11cbcac3d54440fe27446cebf844069299f1e507e302d5c521e30`
- boundary `data/rcap-all50/overlays/census-v1/al/al-misd-conviction-set--official-pdf-fill/fixtures/boundary.pdf` — `f4fa94de90f5906d4a8d581b2d5dc251d2156070fb457d31b23859ba8ddbe62e`
- expected pages 11 · requested scale 2.5
- built by (no builder lane recorded)

### al-pardoned-felony-set

- canonical `data/rcap-all50/overlays/census-v1/al/al-pardoned-felony-set--official-pdf-fill/fixtures/canonical.pdf` — `8601a417905d050ef455cb6344da98462f86d5978ac93a8f5938436f64a82982`
- boundary `data/rcap-all50/overlays/census-v1/al/al-pardoned-felony-set--official-pdf-fill/fixtures/boundary.pdf` — `e557b7577b05d76a72f397a01c0e9dce5d1de191bc67023fc2551af6aa31300e`
- expected pages 11 · requested scale 2.5
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

### ar-veterans-court-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-veterans-court-set--official-pdf-fill/fixtures/order-canonical-filled.pdf` — `5694c59831da43f009336f5af4608ccde26c0e2d5704ec1e332971ce154b8554` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-veterans-court-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `31a08f2b50a8221b71d4e22ec5c7e3cec9348dacefd86dd1196368ca597f1faf` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-veterans-court-set--official-pdf-fill/fixtures/order-boundary-filled.pdf` — `f4251723d33bddcd6e04401aca1e54fa4a0b2312d84d894ed2b7322c40ef118f` · 4 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-veterans-court-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `2a8d8964897939f503496d92d592dcb84fdc2be30f37bd2fffe77f98de8f44b4` · 5 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ar/ar-veterans-court-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/ar/ar-veterans-court-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 18 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### az_marijuana_expungement_superior_court-set

- canonical `data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-superior-court-set--official-pdf-fill/fixtures/aoc-crem3f-canonical-filled.pdf` — `06232e1f2a7888c27499f271395236d6eba1fbaddb1c1de4c47584d7905ffe5a`
- boundary `data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-superior-court-set--official-pdf-fill/fixtures/aoc-crem3f-boundary-filled.pdf` — `109e16a3e6c9a5e6f987632a7b491e99686112f096f3224df93552c4303f30b2`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### az_set_aside-set

- canonical `data/rcap-all50/overlays/census-v1/az/az-set-aside-set--official-pdf-fill/fixtures/canonical.pdf` — `61d79cf9576fa0245a2b854c63ad7fc69cdfba3d14863e3e60d2985ea1ad16f4`
- boundary `data/rcap-all50/overlays/census-v1/az/az-set-aside-set--official-pdf-fill/fixtures/boundary.pdf` — `79e3774130de798df8161eabbc9555a7d9a5c6bc4bbdeb3cb8b775783a71e114`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### ca-1203-42-set

- **8 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-42-set--official-pdf-fill/fixtures/pc-1203-42-canonical/cr-106-unchanged-official.pdf` — `f8a37a9a8c30a016b432bb39fd67407717c3dee7be74bc3e3d471127bf190c5a` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-42-set--official-pdf-fill/fixtures/pc-1203-42-canonical/cr-180-filled.pdf` — `8e6b20a4115966d8d6c6fb79ca2fe072a1c7ea6e790df149bb54fc2a234f82a2` · 3 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-42-set--official-pdf-fill/fixtures/pc-1203-42-canonical/cr-181-unchanged-official.pdf` — `f737503a89465d40206b11b1123e815e44a249d324bad16d313c337a695ce504` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/ca-1203-42-set--official-pdf-fill/fixtures/pc-1203-42-canonical/mc-031-unchanged-official.pdf` — `defc9108f6baa4c2ca444c1571d737d841af78289bef337f874f51e595191075` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-42-set--official-pdf-fill/fixtures/pc-1203-42-boundary/cr-106-unchanged-official.pdf` — `f8a37a9a8c30a016b432bb39fd67407717c3dee7be74bc3e3d471127bf190c5a` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-42-set--official-pdf-fill/fixtures/pc-1203-42-boundary/cr-180-filled.pdf` — `fce33fd4f783f3a946bf0484e2f7acf5df379383e606f824d9f58b6cb5e020e5` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-42-set--official-pdf-fill/fixtures/pc-1203-42-boundary/cr-181-unchanged-official.pdf` — `f737503a89465d40206b11b1123e815e44a249d324bad16d313c337a695ce504` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/ca-1203-42-set--official-pdf-fill/fixtures/pc-1203-42-boundary/mc-031-unchanged-official.pdf` — `defc9108f6baa4c2ca444c1571d737d841af78289bef337f874f51e595191075` · 1 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ca/ca-1203-42-set--official-pdf-fill/fixtures/pc-1203-42-canonical/cr-180-filled.pdf` and `data/rcap-all50/overlays/census-v1/ca/ca-1203-42-set--official-pdf-fill/fixtures/pc-1203-42-boundary/cr-180-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
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

- canonical `data/rcap-all50/overlays/census-v1/dc/dc-correct-misattributed-arrest-set--custom-pleading/fixtures/canonical.pdf` — `d4e4125cb51ec2248468dc093da2d40f66ae1dafc380ed7c2d6f84ec8fc4ce7f`
- boundary `data/rcap-all50/overlays/census-v1/dc/dc-correct-misattributed-arrest-set--custom-pleading/fixtures/boundary.pdf` — `4a5cea51f550c553758c09e1ad96f21d0c0f751bdf77ee2da6adb7a2f9dc4225`
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

### fl-early-juvenile-set

- canonical `data/rcap-all50/overlays/census-v1/fl/fl-early-juvenile-set--official-pdf-fill/fixtures/canonical.pdf` — `f98816f1cd07d2e95918d416cc3776b6b54733523da0832b6943e12aa25b6f00`
- boundary `data/rcap-all50/overlays/census-v1/fl/fl-early-juvenile-set--official-pdf-fill/fixtures/boundary.pdf` — `3ce5201d21b2e97d6142cd73ccbf21dfc27584672d66a9a10b30a97c01e56fc0`
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

### ga-vacated-j2-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-vacated-j2-set--custom-pleading/fixtures/canonical.pdf` — `6c2ce97c8086b9f64684f20680feb603b903de1a7888ce1ab4b5a29686b4181c`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-vacated-j2-set--custom-pleading/fixtures/boundary.pdf` — `490dcbf4d162cc3c91fbf6a76147661285c3934e361ae70011e798e232cd0be5`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### ia-12346-set

- canonical `data/rcap-all50/overlays/census-v1/ia/ia-12346-set--official-pdf-fill/fixtures/canonical.pdf` — `9a058658022ea3ae36eac169faa4315d9d90514bbe46960ab50d46ab4a508197`
- boundary `data/rcap-all50/overlays/census-v1/ia/ia-12346-set--official-pdf-fill/fixtures/boundary.pdf` — `92795d893671fde33bd6d05c89c0474f6ee1f7f9d95a97c4f81d91c2ef328afe`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### ia-dci77-set

- canonical `data/rcap-all50/overlays/census-v1/ia/ia-dci77-set--official-pdf-fill/fixtures/canonical.pdf` — `7e09751a8e233f1fd27bf111726d30d14669376dbdf8922f0138f6ac9c5a3bc7`
- boundary `data/rcap-all50/overlays/census-v1/ia/ia-dci77-set--official-pdf-fill/fixtures/boundary.pdf` — `91befce7c030b0151450f7a3b27df5fb84232f58a72889c4bb7793fe28aee7b1`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### id_set_aside_dismissal-set

- canonical `data/rcap-all50/overlays/census-v1/id/id-set-aside-dismissal-set--custom-pleading/fixtures/canonical.pdf` — `7773edfbbad30e588ee71061cd226d6c8385e5b35d3d8fa40d43497507dbddbc`
- boundary `data/rcap-all50/overlays/census-v1/id/id-set-aside-dismissal-set--custom-pleading/fixtures/boundary.pdf` — `69627731b56805a3b8a37b24c7cfc9b72a9b99d87a09cf85e44e05e0c9cbbf5f`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### il-exp-precompletion-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-exp-precompletion-set--official-pdf-fill/fixtures/canonical.pdf` — `3bb1f3557a51a8da3c479fabf3dfaf525ef93386b6bc3e2f625716a06cce278f`
- boundary `data/rcap-all50/overlays/census-v1/il/il-exp-precompletion-set--official-pdf-fill/fixtures/boundary.pdf` — `0fbf5f3c21ed176afa3151e15e8c0ad32dfc913b04bba1550d0f83443041f631`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### il-seal-2yr-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-seal-2yr-set--official-pdf-fill/fixtures/canonical.pdf` — `090c596e0116f172a925b5e34d8bf9c18019478509a918eac0aaa3abc0904166`
- boundary `data/rcap-all50/overlays/census-v1/il/il-seal-2yr-set--official-pdf-fill/fixtures/boundary.pdf` — `cb8874f3a42f1e7b0cb2042d05f76cd68aa0279b1aefdce4d10a034b52f74b0e`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### in_arrest_no_charges-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/in/in-arrest-no-charges-set--official-pdf-fill/fixtures/inserts-canonical-filled.pdf` — `c14d36b058777390d92f0dc6ffb7520afc32bbbb6cfc425ab566c04407585ed6` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/in/in-arrest-no-charges-set--official-pdf-fill/fixtures/packet-canonical-filled.pdf` — `6cf2c07ac890fe4f5a0296d14d93cfcbe628d79f045b300446e0a9ab24df095c` · 15 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/in/in-arrest-no-charges-set--official-pdf-fill/fixtures/inserts-boundary-filled.pdf` — `5fcf460a92c6cbf55b9d7f90e20777c2858ef8588a8cbc64215e1d1062b3ccbf` · 12 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/in/in-arrest-no-charges-set--official-pdf-fill/fixtures/packet-boundary-filled.pdf` — `50f93587e3ca531627e6118d33bdcad80b6215e829dc21f1d0a59fc0d86b3e67` · 15 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/in/in-arrest-no-charges-set--official-pdf-fill/fixtures/packet-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/in/in-arrest-no-charges-set--official-pdf-fill/fixtures/packet-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 46 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### in_infraction_nondisclosure-set

- canonical `data/rcap-all50/overlays/census-v1/in/in-infraction-nondisclosure-set--custom-pleading/fixtures/canonical.pdf` — `d12f6d818c4a2edc151f1e328a56d2eec773963577483ff9bdabededb9e8f463`
- boundary `data/rcap-all50/overlays/census-v1/in/in-infraction-nondisclosure-set--custom-pleading/fixtures/boundary.pdf` — `1dbdadb255eed11ffea3011738d3a9f53ef7f979ed4b4c5b534b9b100532b3b2`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### ks-21-6614-prostitution-coercion-set

- canonical `data/rcap-all50/overlays/census-v1/ks/ks-21-6614-prostitution-coercion-set--official-pdf-fill/fixtures/canonical.pdf` — `94ecee6cfbd2875b4f89d361a7b900e89b56e6ba96eff6b04b3292d81e7e8528`
- boundary `data/rcap-all50/overlays/census-v1/ks/ks-21-6614-prostitution-coercion-set--official-pdf-fill/fixtures/boundary.pdf` — `5c2cb0b4cb5dc953308d8d437250b30aa7891e5699b09a5077191f230f028db0`
- expected pages 20 · requested scale 2.5
- built by (no builder lane recorded)

### ky_criminal_record_segregation-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-criminal-record-segregation-set--custom-pleading/fixtures/canonical.pdf` — `688787fb65152b5bb91ee9677012709e808db28da9dccb7599f85a631ac97970`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-criminal-record-segregation-set--custom-pleading/fixtures/boundary.pdf` — `7e8e5f3eda4cc8cd5a5cc5a29d6c10e83eae825a3508a24e4d9ed7732a5cb470`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### ky_misdemeanor_expungement-set

- **6 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-misdemeanor-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `dcfda55784b8bdcedba2946ff360810a5c0ec4fd738d9c4dd9da28fc1ffbbeb3` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-misdemeanor-expungement-set--official-pdf-fill/fixtures/selectable/ordinary-traffic.pdf` — `017958fab9cf8e57fdff640fbd51530338fe82d5cdb8bdbb91fe2e4034df9425` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-misdemeanor-expungement-set--official-pdf-fill/fixtures/selectable/ordinary-violation.pdf` — `dbd41f2b8b6652faf67d65be5b36c8ce6a396a73b423df5fd89d9d1bc72950f2` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-misdemeanor-expungement-set--official-pdf-fill/fixtures/selectable/void-218a275-8.pdf` — `172562e6b3bbc982e9562b8bfb39f77df3077898fdd697e12266a09785661bf3` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ky/ky-misdemeanor-expungement-set--official-pdf-fill/fixtures/selectable/void-218a276-8.pdf` — `a1d7ef34b529a7c9f2c579f8b1019ac85b4be2d41cf171577c2e7fd6ae478f4e` · 4 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ky/ky-misdemeanor-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `72502d59382b0a058b94b78474065b99377f87a2e25c8af9735754bd64d6f461` · 7 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ky/ky-misdemeanor-expungement-set--official-pdf-fill/fixtures/canonical.pdf` and `data/rcap-all50/overlays/census-v1/ky/ky-misdemeanor-expungement-set--official-pdf-fill/fixtures/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 27 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### ky_void_seal_marijuana_synthetic_salvia-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-void-seal-marijuana-synthetic-salvia-set--custom-pleading/fixtures/canonical.pdf` — `695ecde15ad70d6155cd548f9a22b73b499e8fcded9734c7163af2e6845276ae`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-void-seal-marijuana-synthetic-salvia-set--custom-pleading/fixtures/boundary.pdf` — `1c5f49b9b7b83407afc3f0419ed32387743aff25a2dd68d921bd2cadc303d427`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### la-978-felony-conviction-set

- canonical `data/rcap-all50/overlays/census-v1/la/la-978-felony-conviction-set--custom-pleading/fixtures/canonical.pdf` — `f5d6c4ec066846ac9488d45b5603bba6fb6b912bf7413dc5f75bee882d19b8f9`
- boundary `data/rcap-all50/overlays/census-v1/la/la-978-felony-conviction-set--custom-pleading/fixtures/boundary.pdf` — `bff90eb1821357e76d240278f264beac71557c6652e5ef8f8d317291053ac997`
- expected pages 14 · requested scale 2.5
- built by (no builder lane recorded)

### ma-bmc-multi-set

- canonical `data/rcap-all50/overlays/census-v1/ma/ma-bmc-multi-set--custom-pleading/fixtures/canonical.pdf` — `e8a629a4b7b581c341b717c3fd656abcb5b03bc1b02cbde00d65da2e97b24c4b`
- boundary `data/rcap-all50/overlays/census-v1/ma/ma-bmc-multi-set--custom-pleading/fixtures/boundary.pdf` — `47a65b128319816c120a3b8f8f29dadfc23dbf9fe7775585141296ecfb3cc7e0`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### ma-seal-admin-set

- canonical `data/rcap-all50/overlays/census-v1/ma/ma-seal-admin-set--official-pdf-fill/fixtures/canonical.pdf` — `f01868bbe1716bbe6576d39431a0b77ef7310a4a2d10c025f040edbe72c58987`
- boundary `data/rcap-all50/overlays/census-v1/ma/ma-seal-admin-set--official-pdf-fill/fixtures/boundary.pdf` — `fbaf27c950c8dc336c28a4d59bf1a35ac82309d338e86623b1ae2756f80767d5`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### md_10105_favorable-set

- **15 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/canonical.pdf` — `1b0c72fd95847a8097339061546246649b4a2465b7915c8dd54df0ebfd2d9101` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/selectable/acquittal.pdf` — `265cb0e30e0ccdb380adc6544a5a4020b26a6fd435c121e57c1a82ca16bd706f` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/selectable/adult-transfer-circuit.pdf` — `234def7bb17e49b9fd95ca68c0b845551c36c6746685c9338d2e3227f81a9bdb` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/selectable/citation.pdf` — `6b7ac19e82eee90dec3c8771c7a98dfa537c6563127e4aa528d1a2da67239f11` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/selectable/compromise.pdf` — `99063fc20998f7d354187866de5240269663dd8b23b0cd52dfced9e1b626b359` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/selectable/juvenile-transfer.pdf` — `258517f1417835928fb78e569e23ac9711619a5982687dd8806e57ccbd4b2b44` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/selectable/ncr.pdf` — `7f13298c966280c47787b3241bd3b70b725d414c90f3876e58bb9ddf60d0175b` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/selectable/nolle-treatment.pdf` — `c0054c715d34e0a67e4a8ab13668d18131c356f5d13fcb49ebe4595827fa11ef` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/selectable/nolle.pdf` — `69a9b65c732de03a7785c865c46b435d5749e17343c44d74ca6ef0462ee66d76` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/selectable/pbj-dui.pdf` — `f54a572f874d813937954266b7f02dbfb63ec6d56a070fd2c61599ed9fb93c0b` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/selectable/pbj-no-longer-crime.pdf` — `b8ec3343cc678b294ad4945c4fc802f2c3dfe7a06c211a63f9913ed3bf21c513` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/selectable/pbj.pdf` — `41fc4ac0a3431f02ee6677b4abfe9ba2cd061ad69bf6383b3a2f208c1a6587db` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/selectable/stet-treatment.pdf` — `8c3a34ea502404dc54028a59f85be8e90176118fa75e6e121117ebf84a04d841` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/selectable/stet.pdf` — `5fcda92a3e7828753fb47c8d90861f71821eaff13e59bf7a6c74f262b390c125` · 4 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/boundary.pdf` — `44c3c53433c133e0beb0cf05f771969ae53714526177aeb60806e2dac41f45be` · 4 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/canonical.pdf` and `data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill/fixtures/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 60 across all documents · requested scale 2.5
- built by (no builder lane recorded)

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

### mi_setaside_marihuana-set

- canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-marihuana-set--official-pdf-fill/fixtures/canonical.pdf` — `d026a1bffa91702245c6938ab4438a29a83ae93f109dd9677d8253aca81e463f`
- boundary `data/rcap-all50/overlays/census-v1/mi/mi-setaside-marihuana-set--official-pdf-fill/fixtures/boundary.pdf` — `5180ce722fb75f08b366c3c7b7d9a0e43d4a36076593aeb704b14adc8b3f4f82`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### mn_petition_juvenile_as_adult-set

- canonical `data/rcap-all50/overlays/census-v1/mn/mn-petition-juvenile-as-adult-set--official-pdf-fill/fixtures/canonical.pdf` — `ccd5f00fd86da007606780b15cb45462e80187731404f07694ec015775bfefa3`
- boundary `data/rcap-all50/overlays/census-v1/mn/mn-petition-juvenile-as-adult-set--official-pdf-fill/fixtures/boundary.pdf` — `c5f2e418ad4471ffb42d73f96d01daa4ce7821e9c9f10ce511883f2a4a080cc5`
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

### nh_marijuana_annulment-set

- canonical `data/rcap-all50/overlays/census-v1/nh/nh-marijuana-annulment-set--official-pdf-fill/fixtures/canonical.pdf` — `23390b7f9cc6013681dfe40910233737a0410c2bb11454f6c551b4fd1abbbed8`
- boundary `data/rcap-all50/overlays/census-v1/nh/nh-marijuana-annulment-set--official-pdf-fill/fixtures/boundary.pdf` — `661ff0044bc4442c7c760fb39b4f5b6c83415b7dd42fc9f61dddcc8d00fd3f1e`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### nj_clean_slate-set

- canonical `data/rcap-all50/overlays/census-v1/nj/nj-clean-slate-set--official-pdf-fill/fixtures/cn-10557-canonical.pdf` — `03f6169d042fc1d5ed30df008dfc966ef3d03b382731f5956d0e8786ca8a234f`
- boundary `data/rcap-all50/overlays/census-v1/nj/nj-clean-slate-set--official-pdf-fill/fixtures/cn-10557-boundary.pdf` — `23a571af72985717963001120ba60116ae43054aaa1c2fddbeece944dac24494`
- expected pages 43 · requested scale 2.5
- built by (no builder lane recorded)

### nm_conviction-set

- canonical `data/rcap-all50/overlays/census-v1/nm/nm-conviction-set--official-pdf-fill/fixtures/canonical.pdf` — `b943cf5b16d95882e1a096504438d792fdbdddcc82acab09e58076421978658a`
- boundary `data/rcap-all50/overlays/census-v1/nm/nm-conviction-set--official-pdf-fill/fixtures/boundary.pdf` — `4d1b288fd4cd9f5857f7603554a82f3b030345c013ad559c9afc328eae8e577f`
- expected pages 24 · requested scale 2.5
- built by (no builder lane recorded)

### nv_seal_probation_family-set

- canonical `data/rcap-all50/overlays/census-v1/nv/nv-seal-probation-family-set--custom-pleading/fixtures/canonical.pdf` — `3b02d62f748c5f3ec5150742f3e225d0418ca4ddb7203ef5bc7fce9552b2de9a`
- boundary `data/rcap-all50/overlays/census-v1/nv/nv-seal-probation-family-set--custom-pleading/fixtures/boundary.pdf` — `6530f51d5855d955aacc8c1bfbff5094756d7f271e920b846a1ed2676c805dd2`
- expected pages 9 · requested scale 2.5
- built by (no builder lane recorded)

### official-form-treatment:obligation:research-decision-route:CA:ca-1203-4b

- **10 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ca/official-form-treatment:obligation:research-decision-route:ca:ca-1203-4b--official-pdf-fill/fixtures/pc-1203-4b-hand-crew-or-firehouse-canonical/cr-106-filled.pdf` — `d9f6d3072273760b8350dc16e57db447ff47b041b3ce89dc6dc398708bfc371e` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/official-form-treatment:obligation:research-decision-route:ca:ca-1203-4b--official-pdf-fill/fixtures/pc-1203-4b-hand-crew-or-firehouse-canonical/cr-430-filled.pdf` — `85c2ff9a1483afd69d70ad1fff68eab8e10dc189444a0a7d53462cda21c42ecc` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/official-form-treatment:obligation:research-decision-route:ca:ca-1203-4b--official-pdf-fill/fixtures/pc-1203-4b-hand-crew-or-firehouse-canonical/cr-430-info-unchanged-official.pdf` — `6bee01e04b1f8ceb05776e07b90b92a4e9048777c41c78760e381348d4d287c0` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/official-form-treatment:obligation:research-decision-route:ca:ca-1203-4b--official-pdf-fill/fixtures/pc-1203-4b-hand-crew-or-firehouse-canonical/cr-431-filled.pdf` — `4f971a62c36187df6ee4333774d4d988fd25bdef436b4f32afebe4452c236b17` · 1 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ca/official-form-treatment:obligation:research-decision-route:ca:ca-1203-4b--official-pdf-fill/fixtures/pc-1203-4b-hand-crew-or-firehouse-canonical/cr-432-filled.pdf` — `cc447d279e80b44fb742c68bc1d984a5030ffcbf37ff3fb58778ac49e1c53c6d` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/official-form-treatment:obligation:research-decision-route:ca:ca-1203-4b--official-pdf-fill/fixtures/pc-1203-4b-hand-crew-or-firehouse-boundary/cr-106-filled.pdf` — `26b899db93e199310f97cf3f937dec52e8c2fff15647a46e6e682600d1071997` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/official-form-treatment:obligation:research-decision-route:ca:ca-1203-4b--official-pdf-fill/fixtures/pc-1203-4b-hand-crew-or-firehouse-boundary/cr-430-filled.pdf` — `271d3950b1d452b5ff4b9ee1e1cfc2388c0054cc9dcc706abc9bcb3c9d21a0c3` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/official-form-treatment:obligation:research-decision-route:ca:ca-1203-4b--official-pdf-fill/fixtures/pc-1203-4b-hand-crew-or-firehouse-boundary/cr-430-info-unchanged-official.pdf` — `6bee01e04b1f8ceb05776e07b90b92a4e9048777c41c78760e381348d4d287c0` · 4 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/official-form-treatment:obligation:research-decision-route:ca:ca-1203-4b--official-pdf-fill/fixtures/pc-1203-4b-hand-crew-or-firehouse-boundary/cr-431-filled.pdf` — `f2ec42a0ca5f234823ef9c0d316427c30cc3e611952db605d692acb16eb5f2d6` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ca/official-form-treatment:obligation:research-decision-route:ca:ca-1203-4b--official-pdf-fill/fixtures/pc-1203-4b-hand-crew-or-firehouse-boundary/cr-432-filled.pdf` — `588d7528c31919915f1f323383f0f5ca9e03c710da5a03657167fbe8c9b831c4` · 2 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ca/official-form-treatment:obligation:research-decision-route:ca:ca-1203-4b--official-pdf-fill/fixtures/pc-1203-4b-hand-crew-or-firehouse-canonical/cr-430-filled.pdf` and `data/rcap-all50/overlays/census-v1/ca/official-form-treatment:obligation:research-decision-route:ca:ca-1203-4b--official-pdf-fill/fixtures/pc-1203-4b-hand-crew-or-firehouse-boundary/cr-430-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 22 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### pa_6308_underage-set

- **6 documents**, and the receipt must cover every one of them:
  - canonical-PA-RCRIM-P-490-PETITION `data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/rule-490-petition-canonical.pdf` — `0bc45b2c0ac23fac1d5f64fbb340cf29cb93af01e29da5d6e1f0923121469a5d` · 1 page(s)
  - canonical-PA-RCRIM-P-490-ORDER `data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/rule-490-order-canonical.pdf` — `39625c0e8b743019c6c080e33f5cff5485bd3559ab64b7d8ab896660b381aae6` · 2 page(s)
  - boundary-PA-RCRIM-P-790-PETITION `data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/rule-790-petition-boundary.pdf` — `a88f0a3cbab962faf0cd06e1a916d8ebf40b34fdfe43041574979b64b0134cb9` · 1 page(s)
  - boundary-PA-RCRIM-P-790-ORDER `data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/rule-790-order-boundary.pdf` — `5dcb402f6af5df9930d7283e62d15407f9734862b46063674f0c4c65302ef957` · 2 page(s)
  - canonical-pa_6308_underage-certificate-of-service-3 `data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/certificate-of-service-canonical.pdf` — `25ef4ba175037ab521617567dd1a1bd7293e96f1a4ee47fd25604f6d999bbfad` · 1 page(s)
  - boundary-pa_6308_underage-certificate-of-service-3 `data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/certificate-of-service-boundary.pdf` — `256d896fba6bf63c61838c7a736d4eeb8c3a62c074df559dd98ddf671c2692f8` · 1 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/rule-490-petition-canonical.pdf` and `data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/fixtures/rule-790-petition-boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 8 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### pa_pardon_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/pa/pa-pardon-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `772b55cb8d62821f1349e42b0242ad7edbca88a666a04cbe6473ab410cf5f69a`
- boundary `data/rcap-all50/overlays/census-v1/pa/pa-pardon-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `614c6faeb0988b74333bfaae744b4c0c82388187800c7f16f6fb4a462a82a23b`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-in-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/in/rcap-in-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `d8423b0d608e3fd0f26457073b2622eb2fc62bec95cc6264e07f09593138748e`
- boundary `data/rcap-all50/overlays/census-v1/in/rcap-in-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `e953492c5bab14c786b503a9a5fd8e594640f6f7b01b567a559fcb45b2b9761b`
- expected pages 15 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-nv-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/nv/rcap-nv-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `1d72131dcf8adefe7142cb2241aa97811b4c90892342d1422d3441b649e293bf`
- boundary `data/rcap-all50/overlays/census-v1/nv/rcap-nv-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `5274a3d33329f447612a9736ac31442a760dc24b4aa2acdc01d7061175578596`
- expected pages 44 · requested scale 2.5
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

### ri_first_offender_felony-set

- canonical `data/rcap-all50/overlays/census-v1/ri/ri-first-offender-felony-set--official-pdf-fill/fixtures/canonical.pdf` — `367459ad94553cb6a924ac739362d6605ea56ca3667755d53b4a3daa8c098048`
- boundary `data/rcap-all50/overlays/census-v1/ri/ri-first-offender-felony-set--official-pdf-fill/fixtures/boundary.pdf` — `31e5ed43099b7885ef89ab629de296330f69448d049abd7dc10badb265bfac3e`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### ri_nonconviction_sealing-set

- canonical `data/rcap-all50/overlays/census-v1/ri/ri-nonconviction-sealing-set--official-pdf-fill/fixtures/dc-33-canonical.pdf` — `1aa3581fc9297cc60ad555e6abad34d5c8f5c8028be255abf1ec4cfc96734c3b`
- boundary `data/rcap-all50/overlays/census-v1/ri/ri-nonconviction-sealing-set--official-pdf-fill/fixtures/dc-33-boundary.pdf` — `9853b49eeb385ac8719132831e5dc245c985249fb82e86ff72bf1671a15d7594`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### tx_nd_automatic_misdemeanor_deferred-set

- canonical `data/rcap-all50/overlays/census-v1/tx/tx-nd-automatic-misdemeanor-deferred-set--official-pdf-fill/fixtures/canonical.pdf` — `d4336f778833e40df39570f5b2bb5b4b9979d9db87470b193e6e8de3dba30e5b`
- boundary `data/rcap-all50/overlays/census-v1/tx/tx-nd-automatic-misdemeanor-deferred-set--official-pdf-fill/fixtures/boundary.pdf` — `3d645fdf1509d80ff7bf6d988a8ae95165c5ffbc1a005a3b91871202d98fe41d`
- expected pages 22 · requested scale 2.5
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

### ut_pet_dismissed_with_prejudice-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-dismissed-with-prejudice-set--official-pdf-fill/fixtures/canonical.pdf` — `53f275aeee3fe0caf9e83b0bdf2d30e4152f523215a3631ae7b0f9ebbdb2401a`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-dismissed-with-prejudice-set--official-pdf-fill/fixtures/boundary.pdf` — `f37d2e7eda71cfe2a444e09b2e169f50d54b514b116a8b0bdf32049954179a3f`
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

### wa_vac_domestic_violence-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-domestic-violence-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` — `42e4e3447e6f49cc925cf52485e0861261e5de714c91c672d5d71014d624d48e` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-domestic-violence-set--official-pdf-fill/fixtures/crrlj-09-0200-canonical-filled.pdf` — `3abc2475b78da8cff2445a99a78fa7aa18641d4c27f17d0c5eea3d6f07e40ce7` · 6 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-domestic-violence-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` — `fd2d21f7ca98376dd4c6ce63af548002b808b04ab388bc477f093370df5ea445` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-domestic-violence-set--official-pdf-fill/fixtures/crrlj-09-0200-boundary-filled.pdf` — `4d844aece78a8ae1c1e97407edd305f45dbdaa2c509f8e55ef51fef03bcb3a55` · 6 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/wa/wa-vac-domestic-violence-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/wa/wa-vac-domestic-violence-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 22 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_substance_use_disorder-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-substance-use-disorder-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` — `846360e75578ce6233dba77b03b25545a529b50cd553ad31f88d3008b429a6ad` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-substance-use-disorder-set--official-pdf-fill/fixtures/crrlj-09-0200-canonical-filled.pdf` — `3abc2475b78da8cff2445a99a78fa7aa18641d4c27f17d0c5eea3d6f07e40ce7` · 6 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-substance-use-disorder-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` — `75fac347051d6b710015ef5bbcc10b43df0a1de59078195ede75a744f4c42b77` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-substance-use-disorder-set--official-pdf-fill/fixtures/crrlj-09-0200-boundary-filled.pdf` — `4d844aece78a8ae1c1e97407edd305f45dbdaa2c509f8e55ef51fef03bcb3a55` · 6 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/wa/wa-vac-substance-use-disorder-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/wa/wa-vac-substance-use-disorder-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 22 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### wi_exp_cr266-set

- canonical `data/rcap-all50/overlays/census-v1/wi/wi-exp-cr266-set--official-pdf-fill/fixtures/canonical.pdf` — `06148923f8a22f900e67e706de1c67205fd5bf62faa9f4c29332f4d69758845f`
- boundary `data/rcap-all50/overlays/census-v1/wi/wi-exp-cr266-set--official-pdf-fill/fixtures/boundary.pdf` — `fe4d30fa6fe3dca9e181babe74b8b376b64ecb9586085c218878cb67af50dc66`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### wv_conv_multiple_misdemeanors-set

- canonical `data/rcap-all50/overlays/census-v1/wv/wv-conv-multiple-misdemeanors-set--official-pdf-fill/fixtures/canonical.pdf` — `31a49f2d2216fd2c7a1327aa7f95f3214b8a760e9d46c05517d764d7bd60f90d`
- boundary `data/rcap-all50/overlays/census-v1/wv/wv-conv-multiple-misdemeanors-set--official-pdf-fill/fixtures/boundary.pdf` — `2a0b701a523d3f7c71f6327c6bd4384cbf438689d0be42d30b869f218f6e1dbe`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### wv_nc_acquittal_dismissal-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/wv/wv-nc-acquittal-dismissal-set--official-pdf-fill/fixtures/acquittal-canonical.pdf` — `247de4231f6d6aa0c654ef60a6e6e5725d71fff254a1c39f3ee356d44287ba70` · 3 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/wv/wv-nc-acquittal-dismissal-set--official-pdf-fill/fixtures/dismissal-canonical.pdf` — `bbfcd767b02230300e2164a40cc2d81967c87fb9b7ddf4f0677622e1319fe878` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wv/wv-nc-acquittal-dismissal-set--official-pdf-fill/fixtures/acquittal-boundary.pdf` — `e6bf76a7a50c6e38af1b00f70d8ff0178b4c01390d1bba4323cd472833bc1086` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wv/wv-nc-acquittal-dismissal-set--official-pdf-fill/fixtures/dismissal-boundary.pdf` — `bbfcd767b02230300e2164a40cc2d81967c87fb9b7ddf4f0677622e1319fe878` · 3 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/wv/wv-nc-acquittal-dismissal-set--official-pdf-fill/fixtures/dismissal-canonical.pdf` and `data/rcap-all50/overlays/census-v1/wv/wv-nc-acquittal-dismissal-set--official-pdf-fill/fixtures/dismissal-boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 12 across all documents · requested scale 2.5
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
FAMILIES ASSIGNED: 81
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
