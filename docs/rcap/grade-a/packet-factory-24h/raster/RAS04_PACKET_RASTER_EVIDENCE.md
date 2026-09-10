# RAS04

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `60a89fafacaf1e703ccafb5e83ee2170f3264403`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (54)

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

### ar-arrest-seal-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-arrest-seal-set--official-pdf-fill/fixtures/order-canonical-filled.pdf` — `161971dca56b9292dac5a8bd9eda03e2deb910d0c1cfbecc98d017bbf17841bb` · 3 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ar/ar-arrest-seal-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `78ef189e981b35fec69688cc6d3181df245b309e7405c954fcabd503e426bea5` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-arrest-seal-set--official-pdf-fill/fixtures/order-boundary-filled.pdf` — `d633848fda999d95f9fa7e82284b82613af94d36512b1aa8b0914d36a13be194` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ar/ar-arrest-seal-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `fb32678b598155af6d1436eeb51098cb665fe2f1711bd826ec2b980b1c30a811` · 3 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ar/ar-arrest-seal-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/ar/ar-arrest-seal-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 12 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### az_certificate_second_chance-set

- canonical `data/rcap-all50/overlays/census-v1/az/az-certificate-second-chance-set--official-pdf-fill/fixtures/canonical.pdf` — `5fa7e6d4f0761fa26d932ca667878a4acb50bdf18b6854cd25a9a2cb3ab7a27a`
- boundary `data/rcap-all50/overlays/census-v1/az/az-certificate-second-chance-set--official-pdf-fill/fixtures/boundary.pdf` — `e8414477b71352df8e01ebfdce17bd1c66e07c9ca09af30fef062313deef2bfa`
- expected pages 5 · requested scale 2.5
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

### census-pending-family:ME:juvenile-sealing

- canonical `data/rcap-all50/overlays/census-v1/me/census-pending-family:me:juvenile-sealing--official-pdf-fill/fixtures/canonical.pdf` — `fa7bd28a1f28cfb38f3f1da3a98d97f2ba3e7827e1c813a43ee51560f225144d`
- boundary `data/rcap-all50/overlays/census-v1/me/census-pending-family:me:juvenile-sealing--official-pdf-fill/fixtures/boundary.pdf` — `69618b989b84945c1f0bf121430b589ecbec6368087cf620901c5a286c45aabb`
- expected pages 1 · requested scale 2.5
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

### composed-treatment:obligation:runtime-only:MS:uncharged-misdemeanor-immediate-dismissal-branch-99-15-59

- canonical `data/rcap-all50/overlays/census-v1/ms/composed-treatment:obligation:runtime-only:ms:uncharged-misdemeanor-immediate-dismissal-branch-99-15-59--custom-pleading/fixtures/canonical.pdf` — `606e3c9d5e6b83da8422a9bb01138b5937db3e5726b64975674ffda137c448ac`
- boundary `data/rcap-all50/overlays/census-v1/ms/composed-treatment:obligation:runtime-only:ms:uncharged-misdemeanor-immediate-dismissal-branch-99-15-59--custom-pleading/fixtures/boundary.pdf` — `ed06c2dcd41ee0c4a8692ae32aee8e0afabd2ae0a5c8fd3f6e178434b42e8c8e`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:PA:path-k-human-trafficking-vacatur-expungement

- canonical `data/rcap-all50/overlays/census-v1/pa/composed-treatment:obligation:runtime-only:pa:path-k-human-trafficking-vacatur-expungement--custom-pleading/fixtures/canonical.pdf` — `ed70579671b2b948b32fdd2854bbf4082b9f5013e591164dd0a77c0387710f4e`
- boundary `data/rcap-all50/overlays/census-v1/pa/composed-treatment:obligation:runtime-only:pa:path-k-human-trafficking-vacatur-expungement--custom-pleading/fixtures/boundary.pdf` — `7609ccbb635efa704dd57886a3e773b7eca7534691561fc11d288e19780232a8`
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

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/dc/dc-seal-conviction-set--custom-pleading/fixtures/canonical-felony_8yr.pdf` — `57ad41269dcfe9d6933fbc12d629210ed0b15f89769fa82e693e5eb094a729dc` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/dc/dc-seal-conviction-set--custom-pleading/fixtures/canonical-misdemeanor_5yr.pdf` — `069a85420cd083de902918e7ee98bd475336a23273e6dea0dde23eb3fbb8f088` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/dc/dc-seal-conviction-set--custom-pleading/fixtures/boundary-felony_8yr.pdf` — `aab749d4247bf5bb25898d7500355f7b9e05cdeb3ade3abfa2df032d18b5aabe` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/dc/dc-seal-conviction-set--custom-pleading/fixtures/boundary-misdemeanor_5yr.pdf` — `3471ea08eb2b329dbc91501b180738f77b2e8b3265925ef92574385ea5931629` · 5 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/dc/dc-seal-conviction-set--custom-pleading/fixtures/canonical-misdemeanor_5yr.pdf` and `data/rcap-all50/overlays/census-v1/dc/dc-seal-conviction-set--custom-pleading/fixtures/boundary-misdemeanor_5yr.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 20 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### fl-administrative-set

- canonical `data/rcap-all50/overlays/census-v1/fl/fl-administrative-set--official-pdf-fill/fixtures/canonical.pdf` — `232aa2581086d5c9cf371fc439ee15883ca63829522bc2d6101b12f2a494f6e0`
- boundary `data/rcap-all50/overlays/census-v1/fl/fl-administrative-set--official-pdf-fill/fixtures/boundary.pdf` — `c09404577e4eff32ea6aab244b479c15307bb7ec6917144c68aa78948cafc09e`
- expected pages 2 · requested scale 2.5
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

### ga-pardon-j7-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-pardon-j7-set--custom-pleading/fixtures/canonical.pdf` — `6a1c18a1587a4d7c8e686545c1a8c2b35bdb1347c8e5dd720115045b26ebc9fa`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-pardon-j7-set--custom-pleading/fixtures/boundary.pdf` — `48a85fc1d7793b1d76c30cf100da6a273b5b325ad5c162822bf6c5c747a6240d`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### hi_dag_danc_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/hi/hi-dag-danc-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `4e65c4e11d7962a8c8132a6ad85f714638ea9750d497a63e4da916ce801aff96`
- boundary `data/rcap-all50/overlays/census-v1/hi/hi-dag-danc-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `bb4149d07409828754d0477a12cdef68c283ff271b85645137f09c73c6e8118b`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### id_clean_slate_shield-set

- canonical `data/rcap-all50/overlays/census-v1/id/id-clean-slate-shield-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `fd888d5f7773d9a2c645dc38fc594d2c95f43e263ba9f35ca81b17ad8f24aa80`
- boundary `data/rcap-all50/overlays/census-v1/id/id-clean-slate-shield-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `ccfdf3fb1bf9e0ba3cd5b0e31bc44b7dd2ddd71da9b7984fb17e8d0ffa8afedf`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### il-cannabis-vacate-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-cannabis-vacate-set--official-pdf-fill/fixtures/canonical.pdf` — `2dc3c706c55826196d6e0dec46209caa6bff5bacefcae4cf3d80a9fdc6d0d689`
- boundary `data/rcap-all50/overlays/census-v1/il/il-cannabis-vacate-set--official-pdf-fill/fixtures/boundary.pdf` — `3b6995830519a2d04e9233e3715e1c1c568dac1adf54c0eeaa9501bdd7a64b60`
- expected pages 11 · requested scale 2.5
- built by (no builder lane recorded)

### il-exp-qualprob-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-exp-qualprob-set--official-pdf-fill/fixtures/canonical.pdf` — `fb7c7dbd4bb01d187fadd69e6857a57be57d840d44049a23ecc9692a54927008`
- boundary `data/rcap-all50/overlays/census-v1/il/il-exp-qualprob-set--official-pdf-fill/fixtures/boundary.pdf` — `e8f82821fe6368795fe7f6cafcf774b1a10014661a5b1228284b05c3fa0139ec`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### il-seal-edu-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-seal-edu-set--official-pdf-fill/fixtures/canonical.pdf` — `1c7dd5134c8a1b04b20c297071695c04f730abcc4abb5d433e967f2f012f0423`
- boundary `data/rcap-all50/overlays/census-v1/il/il-seal-edu-set--official-pdf-fill/fixtures/boundary.pdf` — `c20f67df3c6f159e6ea7050d2de4a109001381aa544048e4d266ef8f7afb0518`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### in_conviction_misd-set

- canonical `data/rcap-all50/overlays/census-v1/in/in-conviction-misd-set--custom-pleading/fixtures/canonical.pdf` — `52b987aada3f19e11734cb5cfdc840b4592912a74840825b61a40342ed41a3a4`
- boundary `data/rcap-all50/overlays/census-v1/in/in-conviction-misd-set--custom-pleading/fixtures/boundary.pdf` — `aaf1945f370403568034bacdce2c6abb603af6449656d84d430892076812ce8f`
- expected pages 10 · requested scale 2.5
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

### la-978-felony-conviction-set

- canonical `data/rcap-all50/overlays/census-v1/la/la-978-felony-conviction-set--custom-pleading/fixtures/canonical.pdf` — `f5d6c4ec066846ac9488d45b5603bba6fb6b912bf7413dc5f75bee882d19b8f9`
- boundary `data/rcap-all50/overlays/census-v1/la/la-978-felony-conviction-set--custom-pleading/fixtures/boundary.pdf` — `bff90eb1821357e76d240278f264beac71557c6652e5ef8f8d317291053ac997`
- expected pages 14 · requested scale 2.5
- built by (no builder lane recorded)

### ma-expunge-time-set

- canonical `data/rcap-all50/overlays/census-v1/ma/ma-expunge-time-set--official-pdf-fill/fixtures/canonical.pdf` — `45e2589a73f35fd2cda9eff1de20a75807d6f66404d7d0ad3c26a052174f3985`
- boundary `data/rcap-all50/overlays/census-v1/ma/ma-expunge-time-set--official-pdf-fill/fixtures/boundary.pdf` — `a995e56b6f78cbda7932996029c708e57c39a2251db833dc91eb648534797964`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### md_pardon_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/md/md-pardon-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `96b99e1fcf5cc7e3ce940a18595d219d17134903e11aa460b8622880303f6559`
- boundary `data/rcap-all50/overlays/census-v1/md/md-pardon-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `f8e335bc8e2f3c3cb78f3708d8147c837ec7eeb33d353f10d493bae1b4b57b68`
- expected pages 4 · requested scale 2.5
- built by VF02

### me-seal-gen-set

- canonical `data/rcap-all50/overlays/census-v1/me/me-seal-gen-set--official-pdf-fill/fixtures/canonical.pdf` — `10e5a82b626d98851b525f380000e9435aa49c303f7f334d771f002dd89ade78`
- boundary `data/rcap-all50/overlays/census-v1/me/me-seal-gen-set--official-pdf-fill/fixtures/boundary.pdf` — `43593b8922759124491186b0a8460ff1b21633ed85eccba1fa11a7c88c0730cc`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### mi_setaside_marihuana-set

- canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-marihuana-set--official-pdf-fill/fixtures/canonical.pdf` — `d026a1bffa91702245c6938ab4438a29a83ae93f109dd9677d8253aca81e463f`
- boundary `data/rcap-all50/overlays/census-v1/mi/mi-setaside-marihuana-set--official-pdf-fill/fixtures/boundary.pdf` — `5180ce722fb75f08b366c3c7b7d9a0e43d4a36076593aeb704b14adc8b3f4f82`
- expected pages 2 · requested scale 2.5
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

### nh_conviction_standard-set

- canonical `data/rcap-all50/overlays/census-v1/nh/nh-conviction-standard-set--official-pdf-fill/fixtures/canonical.pdf` — `bd2a4c278778d4b61cdee81110ecccfe2ba93a3f794e04f8a929ffdafcadebe3`
- boundary `data/rcap-all50/overlays/census-v1/nh/nh-conviction-standard-set--official-pdf-fill/fixtures/boundary.pdf` — `78908658fd0dc118ea0112c03bcec2bd0b6f7ab3a4c6b878bdaa8a1d6d91383f`
- expected pages 13 · requested scale 2.5
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

### pa_age70_deceased-set

- canonical `data/rcap-all50/overlays/census-v1/pa/pa-age70-deceased-set--official-pdf-fill/fixtures/canonical.pdf` — `f4f4b3ba5263fff23c409e8b8ffda95c2ee3e1cf6fea623af5ddb09ed181639e`
- boundary `data/rcap-all50/overlays/census-v1/pa/pa-age70-deceased-set--official-pdf-fill/fixtures/boundary.pdf` — `03aefe90a39c91ac577858abeadf09c215e261f3fcb12fbe97ae8f1c7c1c2ac1`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-ks-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/ks/rcap-ks-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `0da4dbab6b7be1f15ebb4ca2e5fa7810f6c8e34f366dc87b4131c311a4d0ec74`
- boundary `data/rcap-all50/overlays/census-v1/ks/rcap-ks-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `e12e30be68deb94e934bb3ab3080b1cc0d0c048810781f8491710c5740cd55c7`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-oh-custom-pleading-clean-tracks

- **8 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/tracks/oh_2953_32_expungement/rendered/canonical/canonical.pdf` — `c07ffa2bc32bee08f8bb81280042c5477560e770dcf8efdea1ad52b0c19d45b9` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/tracks/oh_2953_32_sealing/rendered/canonical/canonical.pdf` — `fbf1c284b7bf9e76d782279de376e0a5eef8cbe619887033f27fe628ff1065cb` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/tracks/oh_2953_33_nonconviction/rendered/canonical/canonical.pdf` — `706adfcd0ba6a26778374545a4d9c2b1e5d1138cb1a15a4acf2b293716e11406` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/tracks/oh_2953_35_firearm/rendered/canonical/canonical.pdf` — `375eb1262bfce63677f756b1ab22d90b2f9c459e2fcc98aaaeacf899d8970214` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/tracks/oh_2953_32_expungement/rendered/boundary/boundary.pdf` — `52fcfb3e632223b8ffc238175f232fef31e0bd3d740b4024aba39f659688adf1` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/tracks/oh_2953_32_sealing/rendered/boundary/boundary.pdf` — `43acb3e1195fb1887e7fce984bb60c86dfdd1ba2e5ea563b7ad618435fee1e2e` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/tracks/oh_2953_33_nonconviction/rendered/boundary/boundary.pdf` — `4e8955cd1461d3e091230d5d9831ae4c952b95a214626bd425bc509effd79028` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/tracks/oh_2953_35_firearm/rendered/boundary/boundary.pdf` — `51aaec6a1f3900aa40ea9b2d6bf3c955d0a819c9ffc9ddb12691d790f4c8351c` · 2 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/tracks/oh_2953_32_sealing/rendered/canonical/canonical.pdf` and `data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/tracks/oh_2953_32_sealing/rendered/boundary/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 16 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### rcap-tx-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/tx/rcap-tx-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `0528011ffe6651bbafcab07dbae1f86396ad5d21f4afcf233fdeec8482fe093e`
- boundary `data/rcap-all50/overlays/census-v1/tx/rcap-tx-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `1f2345d0e9bb8dada10abe52b563bf88868d8954153d3cca4e7df97224c9894d`
- expected pages 16 · requested scale 2.5
- built by (no builder lane recorded)

### ri_deferred_sentence-set

- canonical `data/rcap-all50/overlays/census-v1/ri/ri-deferred-sentence-set--official-pdf-fill/fixtures/canonical.pdf` — `0960782f51292843e37f6b7bec43844c3e128b3ef1cc1f1c1cb08cbb1eccc063`
- boundary `data/rcap-all50/overlays/census-v1/ri/ri-deferred-sentence-set--official-pdf-fill/fixtures/boundary.pdf` — `b56a0747459a835eb6f8e396c12d9d11ae69b19cf5aa341cd5a9a21edfd58e3a`
- expected pages 14 · requested scale 2.5
- built by (no builder lane recorded)

### sc_17_22_950_summary-set

- canonical `data/rcap-all50/overlays/census-v1/sc/sc-17-22-950-summary-set--official-pdf-fill/fixtures/canonical.pdf` — `f373d91a18f015ebc7f3c7a9e7d71c1e47a469e830977555c937f4241cc8c5a1`
- boundary `data/rcap-all50/overlays/census-v1/sc/sc-17-22-950-summary-set--official-pdf-fill/fixtures/boundary.pdf` — `42e3e5e2b24e0f2b8064fef187ab2331c5914710c43899d2abd99c0a7bbfeaf9`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### ut_pet_dismissed_without_prejudice-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-dismissed-without-prejudice-set--official-pdf-fill/fixtures/canonical.pdf` — `53f275aeee3fe0caf9e83b0bdf2d30e4152f523215a3631ae7b0f9ebbdb2401a`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-dismissed-without-prejudice-set--official-pdf-fill/fixtures/boundary.pdf` — `f37d2e7eda71cfe2a444e09b2e169f50d54b514b116a8b0bdf32049954179a3f`
- expected pages 19 · requested scale 2.5
- built by (no builder lane recorded)

### va_exp_absolute_pardon-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-exp-absolute-pardon-set--custom-pleading/fixtures/canonical.pdf` — `b56af08c1b796b78a26ebac56a3580299e5e06022976941ba0b7fd68cf810188`
- boundary `data/rcap-all50/overlays/census-v1/va/va-exp-absolute-pardon-set--custom-pleading/fixtures/boundary.pdf` — `f7691bc33addbaef446ccccb09c551e673bd5369410c363044794a429fea29eb`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### va_seal_petition_felony-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-seal-petition-felony-set--official-pdf-fill/fixtures/canonical.pdf` — `e99ca2b8ab006ac0c2dbaee9c049489be542e7bab1632f3a7f7a89f17a8f48ff`
- boundary `data/rcap-all50/overlays/census-v1/va/va-seal-petition-felony-set--official-pdf-fill/fixtures/boundary.pdf` — `d66a8f19d3a332d1a47cd8b831f3b0719f5eec87f2b1320ac1763648adacf580`
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
FAMILIES ASSIGNED: 54
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
