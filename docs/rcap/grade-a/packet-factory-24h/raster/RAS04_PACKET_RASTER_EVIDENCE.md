# RAS04

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `40c409275eae51018dc6427c622916dfb1632e8b`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (66)

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

- canonical `data/rcap-all50/overlays/census-v1/al/al-misd-conviction-set--official-pdf-fill/fixtures/canonical.pdf` — `a161be5bf3924fdd86192a548e3ba78e9f7c929985f165370529fc91cc11e093`
- boundary `data/rcap-all50/overlays/census-v1/al/al-misd-conviction-set--official-pdf-fill/fixtures/boundary.pdf` — `2457561dea9456de1bcabe9feb579ed1202db0048caccceb57c5ce8627ff00e9`
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

### co_pardoned_conviction_seal-set

- canonical `data/rcap-all50/overlays/census-v1/co/co-pardoned-conviction-seal-set--official-pdf-fill/fixtures/canonical.pdf` — `d285a03f788cb5e5b3a8d1f17babd379b199cd24c34d2e98b52363cd2c436bf7`
- boundary `data/rcap-all50/overlays/census-v1/co/co-pardoned-conviction-seal-set--official-pdf-fill/fixtures/boundary.pdf` — `407db19ec374b58b0e429b40ac6de54877510b47fe16db77739400e4edbada4c`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:research-decision-route:NY:ny_160_55_violation:sentencing_court_transmission_correction_request

- canonical `data/rcap-all50/overlays/census-v1/ny/composed-treatment:obligation:research-decision-route:ny:ny-160-55-violation:sentencing-court-transmission-correction-request--custom-pleading/fixtures/canonical.pdf` — `de86d7e42feb083f9b96ab9a76d4d819a754b30dbac739909ad1dea39c9850e9`
- boundary `data/rcap-all50/overlays/census-v1/ny/composed-treatment:obligation:research-decision-route:ny:ny-160-55-violation:sentencing-court-transmission-correction-request--custom-pleading/fixtures/boundary.pdf` — `6bc300bff357cda42ba34c9717f58c9bc364874aeca8f663ea3c68fd064a8e93`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:GA:youthful-first-offender-restriction-route

- canonical `data/rcap-all50/overlays/census-v1/ga/composed-treatment:obligation:runtime-only:ga:youthful-first-offender-restriction-route--custom-pleading/fixtures/canonical.pdf` — `61ebc64377ad224630a7a20ced780cc0f6437054614cbe1001d8aab2a0799b61`
- boundary `data/rcap-all50/overlays/census-v1/ga/composed-treatment:obligation:runtime-only:ga:youthful-first-offender-restriction-route--custom-pleading/fixtures/boundary.pdf` — `3c7ea1d4d7a4f492d64623e0b23bbf89b30a1de3651de68f84ba7c679e27a705`
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

### de_pardon_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/de/de-pardon-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `7bce0bddd5eef1c0f23f264da8146805c52d4cc8dff16b8871ef78bfe1a97fe9`
- boundary `data/rcap-all50/overlays/census-v1/de/de-pardon-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `68f209017dc63ff37828c0bfb35e4f162a380a533ad821274b8beee0ad34dfb9`
- expected pages 3 · requested scale 2.5
- built by VF02

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

### in_conviction_d6-set

- canonical `data/rcap-all50/overlays/census-v1/in/in-conviction-d6-set--custom-pleading/fixtures/canonical.pdf` — `9fc3c5e61d934f5be61ecbdf47e7e4a2dde73aa25b02cf831970d2110127bf75`
- boundary `data/rcap-all50/overlays/census-v1/in/in-conviction-d6-set--custom-pleading/fixtures/boundary.pdf` — `cdaf07e256d6fd0c0665877ccffd90eb9d92591bb2c36711dee935a55a7d7939`
- expected pages 10 · requested scale 2.5
- built by (no builder lane recorded)

### ky_criminal_record_segregation-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-criminal-record-segregation-set--custom-pleading/fixtures/canonical.pdf` — `688787fb65152b5bb91ee9677012709e808db28da9dccb7599f85a631ac97970`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-criminal-record-segregation-set--custom-pleading/fixtures/boundary.pdf` — `7e8e5f3eda4cc8cd5a5cc5a29d6c10e83eae825a3508a24e4d9ed7732a5cb470`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### ky_void_seal_controlled_substance-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-void-seal-controlled-substance-set--custom-pleading/fixtures/canonical.pdf` — `e7419541f263c4fdc41bbcea0d45d4dd748a35830e722c02f88afd412c646037`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-void-seal-controlled-substance-set--custom-pleading/fixtures/boundary.pdf` — `0b864b30e140fd8b53adc948f6b294c093095e133b489dab27a745dd632db12f`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### la-977d-marijuana-first-offense-set

- canonical `data/rcap-all50/overlays/census-v1/la/la-977d-marijuana-first-offense-set--custom-pleading/fixtures/canonical.pdf` — `b8a25f5af5f330544bab69beced7973988e697a0e2bd69dceb6bc14747112ede`
- boundary `data/rcap-all50/overlays/census-v1/la/la-977d-marijuana-first-offense-set--custom-pleading/fixtures/boundary.pdf` — `2d475ea417604dc304a62ead55a411ab033744584ec06260f697a8cd88cb2aad`
- expected pages 20 · requested scale 2.5
- built by (no builder lane recorded)

### la-987-set-aside-and-dismiss-set

- canonical `data/rcap-all50/overlays/census-v1/la/la-987-set-aside-and-dismiss-set--official-pdf-fill/fixtures/canonical.pdf` — `8b931df1a91a68f0313e8ec51f9cdd8aa3478695efe80a825513b59a28a624ca`
- boundary `data/rcap-all50/overlays/census-v1/la/la-987-set-aside-and-dismiss-set--official-pdf-fill/fixtures/boundary.pdf` — `8e967c9dfc1c41c0c41f851759d773360e001efb01574de1698774f4de9cec36`
- expected pages 5 · requested scale 2.5
- built by VF03

### ma-expunge-time-set

- canonical `data/rcap-all50/overlays/census-v1/ma/ma-expunge-time-set--official-pdf-fill/fixtures/canonical.pdf` — `45e2589a73f35fd2cda9eff1de20a75807d6f66404d7d0ad3c26a052174f3985`
- boundary `data/rcap-all50/overlays/census-v1/ma/ma-expunge-time-set--official-pdf-fill/fixtures/boundary.pdf` — `a995e56b6f78cbda7932996029c708e57c39a2251db833dc91eb648534797964`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### md_10105_early-set

- canonical `data/rcap-all50/overlays/census-v1/md/md-10105-early-set--official-pdf-fill/fixtures/canonical.pdf` — `178791922c9fc310c73f85fd5487aabba0989516dc204d1f77eff5d367f6946f`
- boundary `data/rcap-all50/overlays/census-v1/md/md-10105-early-set--official-pdf-fill/fixtures/boundary.pdf` — `bde04b9077717fea1a9540e77201b80c2e913f18f960ca688b0b3f61a7c06b1d`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### md_pardon_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/md/md-pardon-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `96b99e1fcf5cc7e3ce940a18595d219d17134903e11aa460b8622880303f6559`
- boundary `data/rcap-all50/overlays/census-v1/md/md-pardon-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `f8e335bc8e2f3c3cb78f3708d8147c837ec7eeb33d353f10d493bae1b4b57b68`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### me-seal-gen-set

- canonical `data/rcap-all50/overlays/census-v1/me/me-seal-gen-set--official-pdf-fill/fixtures/canonical.pdf` — `10e5a82b626d98851b525f380000e9435aa49c303f7f334d771f002dd89ade78`
- boundary `data/rcap-all50/overlays/census-v1/me/me-seal-gen-set--official-pdf-fill/fixtures/boundary.pdf` — `43593b8922759124491186b0a8460ff1b21633ed85eccba1fa11a7c88c0730cc`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### mi_setaside_first_owi-set

- **6 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-first-owi-set--official-pdf-fill/fixtures/canonical.pdf` — `0eaf0fb4a17803aed4f2858871a19d561f2f8c1cf87309ba28f3cba510daeff7` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-first-owi-set--official-pdf-fill/fixtures/prior-application-pending-handoff.pdf` — `33f22dd2da62aa9156c9eb2131608407eef8c22414ff681ce31723077c3ffabb` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-first-owi-set--official-pdf-fill/fixtures/prior-denial-earlier-order-date-handoff.pdf` — `831ef62d76c3125a399966b1569ac0cb507734b2ddbdc784f7d0e7633a76b01b` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-first-owi-set--official-pdf-fill/fixtures/prior-denial-interval-elapsed-handoff.pdf` — `dc84a4629aac4965afb75d0bc5cc14561845ba011dd875fcb3192fedac2f032c` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-first-owi-set--official-pdf-fill/fixtures/prior-denial-within-three-years-handoff.pdf` — `831ef62d76c3125a399966b1569ac0cb507734b2ddbdc784f7d0e7633a76b01b` · 4 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/mi/mi-setaside-first-owi-set--official-pdf-fill/fixtures/boundary.pdf` — `017a440ba23c13a3d4c7af53e7998f54e03b92213a024d369764529ed73934fd` · 4 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/mi/mi-setaside-first-owi-set--official-pdf-fill/fixtures/canonical.pdf` and `data/rcap-all50/overlays/census-v1/mi/mi-setaside-first-owi-set--official-pdf-fill/fixtures/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 24 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### mn_petition_609a02_subd3-set

- canonical `data/rcap-all50/overlays/census-v1/mn/mn-petition-609a02-subd3-set--custom-pleading/fixtures/canonical.pdf` — `52680b1fcec81eee5538ea4cb23f1d37d8519384baff73bd754f38fa1bc0df71`
- boundary `data/rcap-all50/overlays/census-v1/mn/mn-petition-609a02-subd3-set--custom-pleading/fixtures/boundary.pdf` — `46bc49d539edbb8dd18470188c14299f81f0ab6c541d23a1c4a6de7146fd19a9`
- expected pages 25 · requested scale 2.5
- built by (no builder lane recorded)

### mo-art-xiv-marijuana-set

- canonical `data/rcap-all50/overlays/census-v1/mo/mo-art-xiv-marijuana-set--official-pdf-fill/fixtures/canonical.pdf` — `44ffa83102e981e65144007f272ae480c2d4251a23ca2c6b30144f7d28a12397`
- boundary `data/rcap-all50/overlays/census-v1/mo/mo-art-xiv-marijuana-set--official-pdf-fill/fixtures/boundary.pdf` — `9db6f9ab18a5a9a6468095e855d3aba65dfa651083ac60c45cc393e874e28dc3`
- expected pages 10 · requested scale 2.5
- built by (no builder lane recorded)

### ms-misd-addl-set

- canonical `data/rcap-all50/overlays/census-v1/ms/ms-misd-addl-set--custom-pleading/fixtures/canonical.pdf` — `3c7588be6f1734cab76c30035cb9eb404dc6e0d78eeb9e3971415ed2cedf1399`
- boundary `data/rcap-all50/overlays/census-v1/ms/ms-misd-addl-set--custom-pleading/fixtures/boundary.pdf` — `e2b8cebcb089a20777cfb31bcd5b70340729690bf5232894e7e8adf81fcada36`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### nc_145_5_misdemeanor-set

- canonical `data/rcap-all50/overlays/census-v1/nc/nc-145-5-misdemeanor-set--official-pdf-fill/fixtures/canonical.pdf` — `10d06d346fffa0b9c534922a1450880c6d26efdc15dc0b52035c081c72ebbdf9`
- boundary `data/rcap-all50/overlays/census-v1/nc/nc-145-5-misdemeanor-set--official-pdf-fill/fixtures/boundary.pdf` — `e31a578a70709a2c03426163ed724bc316a935551a338e4f2ceef7e1b3fd561a`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### nd-nonconviction-close-petition-set

- canonical `data/rcap-all50/overlays/census-v1/nd/nd-nonconviction-close-petition-set--official-pdf-fill/fixtures/packet-canonical-filled.pdf` — `63b92427c2e60f8c1132a0e80effcc1c17adac1958ca1bdb28c22658c102add6`
- boundary `data/rcap-all50/overlays/census-v1/nd/nd-nonconviction-close-petition-set--official-pdf-fill/fixtures/packet-boundary-filled.pdf` — `31cbf55ac9671f1440732987b2d41c3cad80bcb8c43474e4b09e328b922ee401`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### ne-seal-enforcement-set

- canonical `data/rcap-all50/overlays/census-v1/ne/ne-seal-enforcement-set--custom-pleading/fixtures/canonical.pdf` — `611825ac4bd05fb2a1332f7a5c575bbab767c40c605c9320237d511dfc8ef9f2`
- boundary `data/rcap-all50/overlays/census-v1/ne/ne-seal-enforcement-set--custom-pleading/fixtures/boundary.pdf` — `ffe65671c6035dede3a79b1c7a99e87640af699de99520a58eb33743cd8462a7`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### ne-setaside-noncustodial-set

- canonical `data/rcap-all50/overlays/census-v1/ne/ne-setaside-noncustodial-set--official-pdf-fill/fixtures/canonical.pdf` — `8b8b5cc8fbac51a5c6c010382f1a845c4f113f4607fbba7fc2d7780d3f4f894e`
- boundary `data/rcap-all50/overlays/census-v1/ne/ne-setaside-noncustodial-set--official-pdf-fill/fixtures/boundary.pdf` — `4fa284b1d8a65aa926c3426c87f5137bca1b9cae339344e6bb8c2e1dfc960ce7`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### nh_petition_vacated-set

- canonical `data/rcap-all50/overlays/census-v1/nh/nh-petition-vacated-set--official-pdf-fill/fixtures/canonical.pdf` — `436ed4d5ddff113fbed55aa7b58370745a31a38ce9083e49a84f00372ed9e376`
- boundary `data/rcap-all50/overlays/census-v1/nh/nh-petition-vacated-set--official-pdf-fill/fixtures/boundary.pdf` — `f53a1a29120ce9bea9c0c5d049846898909bdb29e36358a659021f9ccb1b56c2`
- expected pages 15 · requested scale 2.5
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

### pa_9122_1_limited_access-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/pa/pa-9122-1-limited-access-set--official-pdf-fill/fixtures/rule-791-order-canonical.pdf` — `573f9f81adb7887973d1a365b1e0b032f38f0e7312118d74e41413ea4b09918c` · 2 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/pa/pa-9122-1-limited-access-set--official-pdf-fill/fixtures/rule-791-petition-canonical.pdf` — `8996b09209eb45a12c7985155e579dc4ae2bbc6368ffdc7fba67506f137e163c` · 1 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/pa/pa-9122-1-limited-access-set--official-pdf-fill/fixtures/rule-791-order-boundary.pdf` — `bd2954aed8fe55d1041f2ce274894d5be3f5d055e2add76a2f7a6492355a4cc9` · 2 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/pa/pa-9122-1-limited-access-set--official-pdf-fill/fixtures/rule-791-petition-boundary.pdf` — `db4067c897f6d36e5e2a1085de6a3c4e9f2e94eb8df312dc531166bb082acff3` · 1 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/pa/pa-9122-1-limited-access-set--official-pdf-fill/fixtures/rule-791-petition-canonical.pdf` and `data/rcap-all50/overlays/census-v1/pa/pa-9122-1-limited-access-set--official-pdf-fill/fixtures/rule-791-petition-boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 6 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### rcap-ga-guidance-implementation

- canonical `data/rcap-all50/overlays/census-v1/ga/rcap-ga-guidance-implementation--custom-pleading/fixtures/canonical.pdf` — `ac6aed1b5ad37701f2efc9d88aad407498abeb4ab01af8b1b2c558aedd26597b`
- boundary `data/rcap-all50/overlays/census-v1/ga/rcap-ga-guidance-implementation--custom-pleading/fixtures/boundary.pdf` — `28026bda8faf19c93be4f7599bd0d5334270db3e3b394b75f16170b254bf9a87`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-nd-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/nd/rcap-nd-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `2fd78d8919dedfbdc062f180ade3769ed019c10e76bc1bc615f3f090e4e49522`
- boundary `data/rcap-all50/overlays/census-v1/nd/rcap-nd-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `52464ec12db3294f7d66003f4398d87c6753c4b4ef46db4ca5be9d0e5f381e8d`
- expected pages 35 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-or-official-pdf-fill

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/or/rcap-or-official-pdf-fill--official-pdf-fill/fixtures/canonical--arrest-no-charges.pdf` — `2ff987c1bfc6b2354cf2f4c4d805b28b2fecd14ef65e993856154f79e1521289` · 9 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/or/rcap-or-official-pdf-fill--official-pdf-fill/fixtures/canonical--dismissed-charge.pdf` — `a505fec4d59364297b45fd457c95252bc98ba8a3dced5bf063fb47050755c8ec` · 9 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/or/rcap-or-official-pdf-fill--official-pdf-fill/fixtures/boundary--arrest-no-charges.pdf` — `6f2196e7b2bed7581eaa436cb066b9195eec5d424a6fcdedb32bb04e3279cc3d` · 9 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/or/rcap-or-official-pdf-fill--official-pdf-fill/fixtures/boundary--dismissed-charge.pdf` — `888294a313ac785e50bdea6c2ec76b09a5a0bd2674de7a7885689cd2496aff19` · 9 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/or/rcap-or-official-pdf-fill--official-pdf-fill/fixtures/canonical--arrest-no-charges.pdf` and `data/rcap-all50/overlays/census-v1/or/rcap-or-official-pdf-fill--official-pdf-fill/fixtures/boundary--arrest-no-charges.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 36 across all documents · requested scale 2.5
- built by VF04

### rcap-wa-custom-pleading-clean-tracks

- canonical `data/rcap-all50/overlays/census-v1/wa/rcap-wa-custom-pleading-clean-tracks--custom-pleading/fixtures/canonical.pdf` — `78910c462040fbed6980384c0eb342b44eb8ec80d09eceb3ef97783ae119b050`
- boundary `data/rcap-all50/overlays/census-v1/wa/rcap-wa-custom-pleading-clean-tracks--custom-pleading/fixtures/boundary.pdf` — `587838be98adfff4f4f0e4e91d56aab08897551380ee1411b9e528e1b3bad471`
- expected pages 17 · requested scale 2.5
- built by (no builder lane recorded)

### ri_deferred_sentence-set

- canonical `data/rcap-all50/overlays/census-v1/ri/ri-deferred-sentence-set--official-pdf-fill/fixtures/canonical.pdf` — `0960782f51292843e37f6b7bec43844c3e128b3ef1cc1f1c1cb08cbb1eccc063`
- boundary `data/rcap-all50/overlays/census-v1/ri/ri-deferred-sentence-set--official-pdf-fill/fixtures/boundary.pdf` — `b56a0747459a835eb6f8e396c12d9d11ae69b19cf5aa341cd5a9a21edfd58e3a`
- expected pages 14 · requested scale 2.5
- built by (no builder lane recorded)

### ri_multiple_misdemeanors-set

- canonical `data/rcap-all50/overlays/census-v1/ri/ri-multiple-misdemeanors-set--official-pdf-fill/fixtures/canonical.pdf` — `4b77e151246ef516a546a3d4d562f1edba76cd9f6a5b4fac4f5ab67231a24c4a`
- boundary `data/rcap-all50/overlays/census-v1/ri/ri-multiple-misdemeanors-set--official-pdf-fill/fixtures/boundary.pdf` — `637ca130cf69d3a547e7e3f20155e1558e9748c5ff23213bedbe45be7bb452db`
- expected pages 15 · requested scale 2.5
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

### va_exp_nonconviction-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-exp-nonconviction-set--official-pdf-fill/fixtures/canonical.pdf` — `da41e860789d91e45ba7bbc8c33476fbebb7b39eee8769a65750e289b62d43ed`
- boundary `data/rcap-all50/overlays/census-v1/va/va-exp-nonconviction-set--official-pdf-fill/fixtures/boundary.pdf` — `33a0a21aeb9a09451332bc37a9e68d9e3b9f4d834e0536d084cf77dc224b7da6`
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

### wv_conv_nonviolent_felony-set

- canonical `data/rcap-all50/overlays/census-v1/wv/wv-conv-nonviolent-felony-set--official-pdf-fill/fixtures/canonical.pdf` — `c3c5edd72b617541bbceaa7ac1c791b0d2f251dde9365a1c8a1c16995dd5edd9`
- boundary `data/rcap-all50/overlays/census-v1/wv/wv-conv-nonviolent-felony-set--official-pdf-fill/fixtures/boundary.pdf` — `0eb1fbdd0c559bde89cd3d4e595044bb7d17b949d53e9ee8f2a64e1fc5647573`
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
FAMILIES ASSIGNED: 66
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
