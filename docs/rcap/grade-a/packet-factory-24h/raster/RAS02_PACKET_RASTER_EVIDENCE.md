# RAS02

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `70adddf0d6d6b967eb43d1b894e3b67217edf000`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (76)

### agency-application-treatment:obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_investigation_and_finding_request

- canonical `data/rcap-all50/overlays/census-v1/co/agency-application-treatment:obligation:research-decision-route:co:co-mistaken-identity-expungement:participant-investigation-and-finding-request--official-pdf-fill/fixtures/canonical.pdf` — `53170a66c1217b01ecae9991c4977c61d2c49b329a913f3c13982639c6e49ef5`
- boundary `data/rcap-all50/overlays/census-v1/co/agency-application-treatment:obligation:research-decision-route:co:co-mistaken-identity-expungement:participant-investigation-and-finding-request--official-pdf-fill/fixtures/boundary.pdf` — `7877f06d224ed44b870d92ed9d2dbdaf4c9a471795f8799ce6bb4c414df7bb3d`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### agency-application-treatment:obligation:track-only:CT:ct-provisional-pardon

- canonical `data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-only:ct:ct-provisional-pardon--official-pdf-fill/fixtures/canonical.pdf` — `7be19142413dc94c9605f021f0efc291a17f9753eff726b575de485b228c1a49`
- boundary `data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-only:ct:ct-provisional-pardon--official-pdf-fill/fixtures/boundary.pdf` — `2f90e5f0d5a16b4cd38c921cb347d679b66179b0c3bbc3776dbe23bad590ecdb`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### ak-mistaken-identity-set

- canonical `data/rcap-all50/overlays/census-v1/ak/ak-mistaken-identity-set--official-pdf-fill/fixtures/canonical.pdf` — `29f4ca66e3be60cb84dd9a720100722ae3ec4823f15f3712913b500470ef62c6`
- boundary `data/rcap-all50/overlays/census-v1/ak/ak-mistaken-identity-set--official-pdf-fill/fixtures/boundary.pdf` — `758301c28be02067aa54a0903e04051cffe57fbee363ece5e33618e7e428c623`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### al-felony-dwop-set

- canonical `data/rcap-all50/overlays/census-v1/al/al-felony-dwop-set--official-pdf-fill/fixtures/canonical.pdf` — `77f6fb0c16f67919bf70dd313e9fe37440a13fb14a45ff468a20b9948d9fc2f2`
- boundary `data/rcap-all50/overlays/census-v1/al/al-felony-dwop-set--official-pdf-fill/fixtures/boundary.pdf` — `ee75749847d352ab3eaf51da70a08d6b22e86aa1a972cc32b22a88eabcefd95c`
- expected pages 11 · requested scale 2.5
- built by (no builder lane recorded)

### al-misd-nonconviction-90-set

- canonical `data/rcap-all50/overlays/census-v1/al/al-misd-nonconviction-90-set--official-pdf-fill/fixtures/canonical.pdf` — `a78e750dbfab51d1c78da841c09e02e2a095f12110879cf430a21de8d0a58d86`
- boundary `data/rcap-all50/overlays/census-v1/al/al-misd-nonconviction-90-set--official-pdf-fill/fixtures/boundary.pdf` — `92e03761acd5adb3c7b503c3373f14c36a4c09e038b6c107c940b6823059a06b`
- expected pages 11 · requested scale 2.5
- built by (no builder lane recorded)

### ar-act531-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-act531-set--official-pdf-fill/fixtures/order-canonical-filled.pdf` — `89a1d973eb3d5bbd2b16dde45392d4e95fd17b207a8e9872c65cd7952e939897` · 3 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-act531-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `9a46ded37138089a56217629bb2ecbc51075f209bbeef308a6f9bb9cc464d7f8` · 4 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-act531-set--official-pdf-fill/fixtures/order-boundary-filled.pdf` — `559c9a1309182e61cb89b6dc98ce1410465b3cf2fa8c82cfc97aafe019c39ac0` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-act531-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `909ae1530fe07a57fb1a75d65d5ec4dcc0d3edcf5b1a7528509770cb9a717d9c` · 4 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ar/ar-act531-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/ar/ar-act531-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 14 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### ar-felony-seal-set

- canonical `data/rcap-all50/overlays/census-v1/ar/ar-felony-seal-set--official-pdf-fill/fixtures/canonical.pdf` — `5ba805c03c70078ae4cd5089e7dbebb66890709d7e1e77e769b49d01a73c7bf6`
- boundary `data/rcap-all50/overlays/census-v1/ar/ar-felony-seal-set--official-pdf-fill/fixtures/boundary.pdf` — `9d64a53d2c613b56eb526064abff364d72941de616bafe0fd8573c9735921a3c`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### ar-pardon-seal-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-pardon-seal-set--official-pdf-fill/fixtures/order-canonical-filled.pdf` — `1834e31bdf5b3dee8f5d1f3a36c383b12f217abc20c4d3ad7f518c5b92914a93` · 3 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-pardon-seal-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `3b1576d92c2008ba2548522fd16e8025b3e4cbff1f0f40343577ab29477af9ea` · 4 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-pardon-seal-set--official-pdf-fill/fixtures/order-boundary-filled.pdf` — `ca9e599d493603ee04244d90790f609c6a41e97a6f892be2603c0a1197573d17` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-pardon-seal-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `35c2c5cbf9922bed57f1e8da627bdb2b0f554dbcacf5f6de29b5390d565a36c4` · 4 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ar/ar-pardon-seal-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/ar/ar-pardon-seal-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 14 across all documents · requested scale 2.5
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

### fl-administrative-set

- canonical `data/rcap-all50/overlays/census-v1/fl/fl-administrative-set--official-pdf-fill/fixtures/canonical.pdf` — `232aa2581086d5c9cf371fc439ee15883ca63829522bc2d6101b12f2a494f6e0`
- boundary `data/rcap-all50/overlays/census-v1/fl/fl-administrative-set--official-pdf-fill/fixtures/boundary.pdf` — `c09404577e4eff32ea6aab244b479c15307bb7ec6917144c68aa78948cafc09e`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### ga-deaddocket-j3-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-deaddocket-j3-set--custom-pleading/fixtures/canonical.pdf` — `0860a52c8b3607370fee4757b2224ade00b514f13df43ee92589099c69a278fd`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-deaddocket-j3-set--custom-pleading/fixtures/boundary.pdf` — `65217c5b184350454e5dac9e0d0986162ac9edc600e1291c9638ea2572f95f96`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### ga-fugitive-j5-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-fugitive-j5-set--custom-pleading/fixtures/canonical.pdf` — `f5d5ed92060a864fd2f6c162e7941b2190862ac1329f36a25360e20192577759`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-fugitive-j5-set--custom-pleading/fixtures/boundary.pdf` — `b187407464de55069fc7185e9d721acef7c90f9f9830315d7ddad860d4533c8c`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### ga-nonconv-pre2013-set

- **15 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/canonical.pdf` — `c1ba21c6400010377cace19b85ecf100866e07a57c2facc6b5c554b48fcf18e1` · 7 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/basis-01.pdf` — `67b8e50bc14acfc82059b5a6bdab1f7dd7b423aa266a5988b5b95a62d8aab367` · 7 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/basis-02.pdf` — `7c61def202587c133fb3cf98e13205e4f1e722da22bd754f19cb908077f8607c` · 7 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/basis-03.pdf` — `dbcf5dac28c454e99df2108157c6aeb52f25f8d9978eef9b3b11028db531d800` · 7 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/basis-04.pdf` — `c1ba21c6400010377cace19b85ecf100866e07a57c2facc6b5c554b48fcf18e1` · 7 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/basis-05.pdf` — `43024310d0eb3f8f697aa9b9f71c29a4cec4b11cac37ad6f945ab81f79ff1856` · 7 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/basis-06.pdf` — `e08d7e6e17022d409703b20369c3358784cb2867f12ea14b0271b47bc8e19990` · 7 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/basis-07.pdf` — `ed070e1a32055d5c115fe06a91fdf589aac8fff6fa36736c0e341b84da0a6c7d` · 7 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/basis-08.pdf` — `646d51a152aafb18f279899fddee1aecececbcc41b83aedbe7ed2c71b2d19e29` · 7 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/basis-09.pdf` — `ad157e636e23a08e62e7ac41d75da766ad96ea35fc3dd9e5b355311acaf6a3a0` · 7 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/basis-10.pdf` — `8dc14acf89cd956ea7ea51da0bc9b1044ec944174ac292fc962b9945fb1f65c8` · 7 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/disposition-document-available.pdf` — `bae68f944039b4dd95ce5b9a872f2fce99914b6d8f6292c50c71c74f6fd1e0c3` · 8 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/fbi-record-only.pdf` — `bae68f944039b4dd95ce5b9a872f2fce99914b6d8f6292c50c71c74f6fd1e0c3` · 8 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/boundary.pdf` — `62aa209bccaad83f188ac941760ce89fdc9fceeb9f3c0a96d7ea0ee50335a2a2` · 8 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/missing-participant-facts.pdf` — `8969ba951de1adb9fde9ed7b703032c59e8a205f7687fe52a1362f24b6206a47` · 7 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/canonical.pdf` and `data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/fixtures/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 108 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### hi_712_1200_deferred_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/hi/hi-712-1200-deferred-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `78e674c8aaabc6adb66a4c4a40bc8232a1cb86c650bb0c5d21c6646226c01313`
- boundary `data/rcap-all50/overlays/census-v1/hi/hi-712-1200-deferred-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `d975f877ae1cf99d2e2a2b686557a0c832c13dab597bf975c3ebf8ad69cfa793`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### ia-7251-set

- canonical `data/rcap-all50/overlays/census-v1/ia/ia-7251-set--official-pdf-fill/fixtures/canonical.pdf` — `00092fc77a11cfb8be6f6d4a49d85d8cb17c3263bb765a4c3a43df4d599e1097`
- boundary `data/rcap-all50/overlays/census-v1/ia/ia-7251-set--official-pdf-fill/fixtures/boundary.pdf` — `197519714a8e299244e2641b8c5fe2dab4a4ce67ec54da5ba13db842d1063bfe`
- expected pages 2 · requested scale 2.5
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

### ky_felony_vacatur_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-felony-vacatur-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `581dee480d77d2f226b907b017c4209de89d4f4346f654256ed11ba24d32e54e`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-felony-vacatur-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `3847941126c39f4c5963e2fa06bbccbaf5936a39551118fc6df429ff21bca91b`
- expected pages 7 · requested scale 2.5
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
- built by VF08

### nd-regular-pardon-set

- canonical `data/rcap-all50/overlays/census-v1/nd/nd-regular-pardon-set--official-pdf-fill/fixtures/canonical.pdf` — `c0a8d543dc45047ff0ddf20558239ffe10ba3a3e8af3ef034922a7be5cbcd7c7`
- boundary `data/rcap-all50/overlays/census-v1/nd/nd-regular-pardon-set--official-pdf-fill/fixtures/boundary.pdf` — `8cce6850a548e96559cb59f31128463e7277b0e4d487d26682388532bb735507`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### ne-seal-pardoned-set

- canonical `data/rcap-all50/overlays/census-v1/ne/ne-seal-pardoned-set--official-pdf-fill/fixtures/canonical.pdf` — `06f5fae3ff55d3d23302157f847153ade429a221a879beb865639b55f7666979`
- boundary `data/rcap-all50/overlays/census-v1/ne/ne-seal-pardoned-set--official-pdf-fill/fixtures/boundary.pdf` — `a6b1d085e19c376e5a9c3bb9decfa7f4ee116e8e53aad6e7318e51d71f8f9b4f`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### nh_conviction_standard-set

- canonical `data/rcap-all50/overlays/census-v1/nh/nh-conviction-standard-set--official-pdf-fill/fixtures/canonical.pdf` — `bd2a4c278778d4b61cdee81110ecccfe2ba93a3f794e04f8a929ffdafcadebe3`
- boundary `data/rcap-all50/overlays/census-v1/nh/nh-conviction-standard-set--official-pdf-fill/fixtures/boundary.pdf` — `78908658fd0dc118ea0112c03bcec2bd0b6f7ab3a4c6b878bdaa8a1d6d91383f`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### nj_arrest_no_conviction-set

- canonical `data/rcap-all50/overlays/census-v1/nj/nj-arrest-no-conviction-set--official-pdf-fill/fixtures/cn-10557-canonical.pdf` — `922b89598d0b7b57d0fd40623d404a7d9cf24ba507a9eba82472815d9b74ee7d`
- boundary `data/rcap-all50/overlays/census-v1/nj/nj-arrest-no-conviction-set--official-pdf-fill/fixtures/cn-10557-boundary.pdf` — `23a571af72985717963001120ba60116ae43054aaa1c2fddbeece944dac24494`
- expected pages 43 · requested scale 2.5
- built by (no builder lane recorded)

### nj_ordinance-set

- canonical `data/rcap-all50/overlays/census-v1/nj/nj-ordinance-set--official-pdf-fill/fixtures/cn-10557-canonical.pdf` — `03f6169d042fc1d5ed30df008dfc966ef3d03b382731f5956d0e8786ca8a234f`
- boundary `data/rcap-all50/overlays/census-v1/nj/nj-ordinance-set--official-pdf-fill/fixtures/cn-10557-boundary.pdf` — `23a571af72985717963001120ba60116ae43054aaa1c2fddbeece944dac24494`
- expected pages 43 · requested scale 2.5
- built by (no builder lane recorded)

### nv_repository_removal-set

- canonical `data/rcap-all50/overlays/census-v1/nv/nv-repository-removal-set--custom-pleading/fixtures/canonical.pdf` — `4fa967de12c8220baa4808970311abc1ba399b9760304925558ec0def9beefeb`
- boundary `data/rcap-all50/overlays/census-v1/nv/nv-repository-removal-set--custom-pleading/fixtures/boundary.pdf` — `fc65671f4c17927097e1037cee4e7e4a93d1676ca3c21c0e0206db6487138ab0`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### official-form-treatment:obligation:research-decision-route:AL:al-olr

- canonical `data/rcap-all50/overlays/census-v1/al/official-form-treatment:obligation:research-decision-route:al:al-olr--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `9414ff9d97234b9d98f6362c198acec77d7921c789a273f990a927bb487e8449`
- boundary `data/rcap-all50/overlays/census-v1/al/official-form-treatment:obligation:research-decision-route:al:al-olr--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `6b04f5d39f52f7cdea4c5771b7df24c43a2f266b67c986514d9e490d5afdc6bc`
- expected pages 3 · requested scale 2.5
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

### tx_nd_conviction_no_supervision-set

- canonical `data/rcap-all50/overlays/census-v1/tx/tx-nd-conviction-no-supervision-set--official-pdf-fill/fixtures/canonical.pdf` — `2667c62703594861e2bf7c46b92076c2fe4a6b4b20abcadd940f05fc1e3d6eaf`
- boundary `data/rcap-all50/overlays/census-v1/tx/tx-nd-conviction-no-supervision-set--official-pdf-fill/fixtures/boundary.pdf` — `e55f77eaffa7fb922471d011da70f419941639c23b237e77d5261c569955c3f1`
- expected pages 24 · requested scale 2.5
- built by (no builder lane recorded)

### tx_nd_probation_misdemeanor-set

- canonical `data/rcap-all50/overlays/census-v1/tx/tx-nd-probation-misdemeanor-set--official-pdf-fill/fixtures/canonical.pdf` — `006453102ab2082f27d5b52c2309c4c24267051deabf117fa29876494b591c4b`
- boundary `data/rcap-all50/overlays/census-v1/tx/tx-nd-probation-misdemeanor-set--official-pdf-fill/fixtures/boundary.pdf` — `8c20f877c3ba04ddf88b98d04572cfa6a56732e095155b86c08c1c606d819fc5`
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

### va_exp_identity_used_by_another-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-exp-identity-used-by-another-set--custom-pleading/fixtures/canonical.pdf` — `e01f67987b25265e945bf774750a5af8a10f2360cad8790ca6bbbd116fc099b4`
- boundary `data/rcap-all50/overlays/census-v1/va/va-exp-identity-used-by-another-set--custom-pleading/fixtures/boundary.pdf` — `eb054b41c4548fd97bd5ab8fcf368b4cdc9d3ac3d43e98b6e6c271b362376f66`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### va_seal_petition_felony-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-seal-petition-felony-set--official-pdf-fill/fixtures/canonical.pdf` — `e99ca2b8ab006ac0c2dbaee9c049489be542e7bab1632f3a7f7a89f17a8f48ff`
- boundary `data/rcap-all50/overlays/census-v1/va/va-seal-petition-felony-set--official-pdf-fill/fixtures/boundary.pdf` — `d66a8f19d3a332d1a47cd8b831f3b0719f5eec87f2b1320ac1763648adacf580`
- expected pages 11 · requested scale 2.5
- built by (no builder lane recorded)

### vt_seal_18_to_21-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-18-to-21-set--official-pdf-fill/fixtures/canonical.pdf` — `81dd74a0ee1d178cefcb0f028dfba3e9bc7dbd7687bcf58193b0b9d62d767dee`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-18-to-21-set--official-pdf-fill/fixtures/boundary.pdf` — `7ff3cc2272008865eba1d723e1d8dc4074b8163c7c6dbca82cf665003e32750e`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### vt_seal_nonconviction-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-nonconviction-set--official-pdf-fill/fixtures/canonical.pdf` — `951d18666bcfd19d917c88a1604214696f1340cb49d8a55a75a3646688005967`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-nonconviction-set--official-pdf-fill/fixtures/boundary.pdf` — `c97b47dfbde20fdfe935a56d37280dd9e8a4c9ba03611cd609b3b6deaadb6fb5`
- expected pages 9 · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_cannabis-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/fixtures/crrlj-09-0800-canonical-filled.pdf` — `1b595c985753ae1d9583eb628ddac64117ea786ef72cca84df6329e99b781166` · 1 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/fixtures/crrlj-09-0870-canonical-filled.pdf` — `54d2fe73309c3927ff4675c3779540aef223d57130a00edc9b943e1e20ef18d1` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/fixtures/crrlj-09-0800-boundary-filled.pdf` — `54e9c1592824d9c3f429c9acc0346b7c7899a5ecfd6e17bb4cfd816163412783` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/fixtures/crrlj-09-0870-boundary-filled.pdf` — `4cc25535df49f52dcf0ff5e4ad520dc95fcf24b68682f76e299c39f9a595ca2e` · 2 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/fixtures/crrlj-09-0800-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/wa/wa-vac-cannabis-set--official-pdf-fill/fixtures/crrlj-09-0800-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 6 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_misdemeanor_ordinary-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-misdemeanor-ordinary-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` — `846360e75578ce6233dba77b03b25545a529b50cd553ad31f88d3008b429a6ad` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-misdemeanor-ordinary-set--official-pdf-fill/fixtures/crrlj-09-0200-canonical-filled.pdf` — `3abc2475b78da8cff2445a99a78fa7aa18641d4c27f17d0c5eea3d6f07e40ce7` · 6 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-misdemeanor-ordinary-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` — `75fac347051d6b710015ef5bbcc10b43df0a1de59078195ede75a744f4c42b77` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-misdemeanor-ordinary-set--official-pdf-fill/fixtures/crrlj-09-0200-boundary-filled.pdf` — `4d844aece78a8ae1c1e97407edd305f45dbdaa2c509f8e55ef51fef03bcb3a55` · 6 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/wa/wa-vac-misdemeanor-ordinary-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/wa/wa-vac-misdemeanor-ordinary-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 22 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_treaty_fishing-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-treaty-fishing-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` — `846360e75578ce6233dba77b03b25545a529b50cd553ad31f88d3008b429a6ad` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-treaty-fishing-set--official-pdf-fill/fixtures/crrlj-09-0200-canonical-filled.pdf` — `3abc2475b78da8cff2445a99a78fa7aa18641d4c27f17d0c5eea3d6f07e40ce7` · 6 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-treaty-fishing-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` — `75fac347051d6b710015ef5bbcc10b43df0a1de59078195ede75a744f4c42b77` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-treaty-fishing-set--official-pdf-fill/fixtures/crrlj-09-0200-boundary-filled.pdf` — `4d844aece78a8ae1c1e97407edd305f45dbdaa2c509f8e55ef51fef03bcb3a55` · 6 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/wa/wa-vac-treaty-fishing-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/wa/wa-vac-treaty-fishing-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 22 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### wv_acc_treatment_job_readiness-set

- canonical `data/rcap-all50/overlays/census-v1/wv/wv-acc-treatment-job-readiness-set--custom-pleading/fixtures/canonical.pdf` — `b9451b7caa24cb6cfa92684eac520e015975d812fb3725eb1c28b42525f8b3be`
- boundary `data/rcap-all50/overlays/census-v1/wv/wv-acc-treatment-job-readiness-set--custom-pleading/fixtures/boundary.pdf` — `723891ee5773664c4f50b0c70f41ef9e0233661b425398c499839a7145f2c328`
- expected pages 14 · requested scale 2.5
- built by (no builder lane recorded)

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
FAMILIES ASSIGNED: 76
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
