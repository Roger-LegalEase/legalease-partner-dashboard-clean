# RAS03

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `73f87b0bd6af22285d16e7060c13204b3de880b1`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (81)

### agency-application-treatment:obligation:research-decision-route:NY:ny_160_55_violation:dcjs_correction_submission

- canonical `data/rcap-all50/overlays/census-v1/ny/agency-application-treatment:obligation:research-decision-route:ny:ny-160-55-violation:dcjs-correction-submission--official-pdf-fill/fixtures/canonical.pdf` — `8abff71f85f09f7c248daa088286855253f3b95172837efa2fcd69a0c51e57ec`
- boundary `data/rcap-all50/overlays/census-v1/ny/agency-application-treatment:obligation:research-decision-route:ny:ny-160-55-violation:dcjs-correction-submission--official-pdf-fill/fixtures/boundary.pdf` — `c48c6e8cea3616ada41949087580f4db52ea94a0613fa55942f4f62de5fe4878`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### agency-application-treatment:obligation:track-pathway:CT:ct-absolute-pardon:absolute-pardon-resulting-in-erasure

- canonical `data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-pathway:ct:ct-absolute-pardon:absolute-pardon-resulting-in-erasure--official-pdf-fill/fixtures/canonical.pdf` — `7875f369eccda528c4cab60c0ef70947344a46c20eb6c6c82983832fe4c56144`
- boundary `data/rcap-all50/overlays/census-v1/ct/agency-application-treatment:obligation:track-pathway:ct:ct-absolute-pardon:absolute-pardon-resulting-in-erasure--official-pdf-fill/fixtures/boundary.pdf` — `fc609cc3c048a965f9ee339cb87e891be08720f2dc36b1ee41d117b4dd6af3b9`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### ak-tf800-set

- canonical `data/rcap-all50/overlays/census-v1/ak/ak-tf800-set--official-pdf-fill/fixtures/tf800-canonical-filled.pdf` — `5b7e549d02811574dcf73fdc2f2dc24ffcaf6da747e4db58fe2c63ceeaf1ba1b`
- boundary `data/rcap-all50/overlays/census-v1/ak/ak-tf800-set--official-pdf-fill/fixtures/tf800-boundary-filled.pdf` — `a7292a0db6c6a32be3f7d66d08c9959c95841fcd304e5d06f4e9fd51e96488b0`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### al-felony-nonconviction-90-set

- canonical `data/rcap-all50/overlays/census-v1/al/al-felony-nonconviction-90-set--official-pdf-fill/fixtures/canonical.pdf` — `40eccc47f8c05a9ce44f467e29e6239a27bfda884c66301b68b4e81b81342b8c`
- boundary `data/rcap-all50/overlays/census-v1/al/al-felony-nonconviction-90-set--official-pdf-fill/fixtures/boundary.pdf` — `0f867cd52916aec34559b7ec514e064167130c50dc7679d588462c22fc5b7e86`
- expected pages 11 · requested scale 2.5
- built by (no builder lane recorded)

### al-pardon-set

- canonical `data/rcap-all50/overlays/census-v1/al/al-pardon-set--official-pdf-fill/fixtures/canonical.pdf` — `27810fee926dd4148e378310d923a979a2976446cdb03bbaa11989d705fcdc4e`
- boundary `data/rcap-all50/overlays/census-v1/al/al-pardon-set--official-pdf-fill/fixtures/boundary.pdf` — `9a745cfbc52accfa6f22343ecfa60dd786c80cb4e990977c2480e4e174eadb53`
- expected pages 4 · requested scale 2.5
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

### az_marijuana_expungement_limited_jurisdiction-set

- canonical `data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-limited-jurisdiction-set--official-pdf-fill/fixtures/canonical.pdf` — `d82d2df0f6e16c61cb8dfd3d405945a4b92fc885b4dd99ed07058d880023614f`
- boundary `data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-limited-jurisdiction-set--official-pdf-fill/fixtures/boundary.pdf` — `aa1bade440c1417966bd1579d6b5084f0961942b18fb8643e1835e3d4c1181c8`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### az_record_sealing_dismissal_not_guilty-set

- **6 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/az/az-record-sealing-dismissal-not-guilty-set--official-pdf-fill/fixtures/canonical/order.pdf` — `e81d36c2553f4cc41cf61d43c425e73b0d0afe96bfaa3128ad6f2431e2258812` · 3 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/az/az-record-sealing-dismissal-not-guilty-set--official-pdf-fill/fixtures/canonical/packet-assembly.pdf` — `bdfbd09935c302041aeb746dc1fc6bae6bda34760fe162eda0c941ebd904a66c` · 8 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/az/az-record-sealing-dismissal-not-guilty-set--official-pdf-fill/fixtures/canonical/petition.pdf` — `4d0bd271ed4f65b47cad3fdba11c784b7782ee166dc194b98fad081833987ab7` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/az/az-record-sealing-dismissal-not-guilty-set--official-pdf-fill/fixtures/boundary/order.pdf` — `7b5bf85609f6bd9d86d40194eb92eb47c267f38c723021e5a5b269be27b38a71` · 3 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/az/az-record-sealing-dismissal-not-guilty-set--official-pdf-fill/fixtures/boundary/packet-assembly.pdf` — `bbb9aed7a73833af3552862e7e410767ecd468a5b6bf2235237c3610bcd2675d` · 8 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/az/az-record-sealing-dismissal-not-guilty-set--official-pdf-fill/fixtures/boundary/petition.pdf` — `fb768246be8a28e298b8d8eaf24c0e823439963165a00e0672e55f0c0d8f63b7` · 5 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/az/az-record-sealing-dismissal-not-guilty-set--official-pdf-fill/fixtures/canonical/packet-assembly.pdf` and `data/rcap-all50/overlays/census-v1/az/az-record-sealing-dismissal-not-guilty-set--official-pdf-fill/fixtures/boundary/packet-assembly.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 32 across all documents · requested scale 2.5
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

### ca-17b-reduction-set

- **6 documents**, and the receipt must cover every one of them:
  - canonical-cr-106 `data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/fixtures/pc-17b-17d2-offense-by-offense-canonical/cr-106-filled.pdf` — `3a81dcc6fbec1509c87ede5152dd4e4b25d1426e95c0acf50a0daa9ff3e6c45f` · 2 page(s)
  - canonical-cr-180 `data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/fixtures/pc-17b-17d2-offense-by-offense-canonical/cr-180-filled.pdf` — `c17f59c284a927261b80bc821266ac9494e17781d5d6655b7333d13f4cb7ecc5` · 3 page(s)
  - canonical-cr-181 `data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/fixtures/pc-17b-17d2-offense-by-offense-canonical/cr-181-filled.pdf` — `53101d47a609da56113eaadccb8386b6159e6259ad09b2762467d2a137c106f6` · 2 page(s)
  - boundary-cr-106 `data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/fixtures/pc-17b-17d2-offense-by-offense-boundary/cr-106-filled.pdf` — `3955933b42f2d2256eacef6ae23dac4e1b8ebc06f921249b471b7cf744057ef0` · 2 page(s)
  - boundary-cr-180 `data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/fixtures/pc-17b-17d2-offense-by-offense-boundary/cr-180-filled.pdf` — `46fd6ec3d02cf616df1a47765f9cca063b5e7e349b15961c4a6c4c76441b33dc` · 3 page(s)
  - boundary-cr-181 `data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/fixtures/pc-17b-17d2-offense-by-offense-boundary/cr-181-filled.pdf` — `0ffbcbc547957274189b82b2d31d7a9e2f050e6acfc43a8cef97fa79d44e2a95` · 2 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/fixtures/pc-17b-17d2-offense-by-offense-canonical/cr-180-filled.pdf` and `data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill/fixtures/pc-17b-17d2-offense-by-offense-boundary/cr-180-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 14 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### census-pending-family:UT:path-l-vacatur-human-trafficking-related-expungement

- canonical `data/rcap-all50/overlays/census-v1/ut/census-pending-family:ut:path-l-vacatur-human-trafficking-related-expungement--official-pdf-fill/fixtures/canonical.pdf` — `c73a6d87cb5b68f054d50a141b47583e60a14fc144eff09b2eb6d67fb0da21ba`
- boundary `data/rcap-all50/overlays/census-v1/ut/census-pending-family:ut:path-l-vacatur-human-trafficking-related-expungement--official-pdf-fill/fixtures/boundary.pdf` — `47c7eb02473f98699455fd889f736ce3d50e5106ecef86103f5e4232aa72bd22`
- expected pages 12 · requested scale 2.5
- built by (no builder lane recorded)

### co_motion_seal_nonconviction-set

- canonical `data/rcap-all50/overlays/census-v1/co/co-motion-seal-nonconviction-set--official-pdf-fill/fixtures/canonical.pdf` — `cbd731d4c78fac6cf5c01d2fb06774faf317bcff04cef4bb1e9c29bdbeedae02`
- boundary `data/rcap-all50/overlays/census-v1/co/co-motion-seal-nonconviction-set--official-pdf-fill/fixtures/boundary.pdf` — `7f6c83e22ae24418a09334e03db673aa474bde9442ff0992055a7886dc147496`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### co_petition_seal_arrest-set

- canonical `data/rcap-all50/overlays/census-v1/co/co-petition-seal-arrest-set--official-pdf-fill/fixtures/canonical.pdf` — `f15bde74dc5856e0f32dd5fc9dcbf0425c1c88c7a5140e58d50a8260bbb667b5`
- boundary `data/rcap-all50/overlays/census-v1/co/co-petition-seal-arrest-set--official-pdf-fill/fixtures/boundary.pdf` — `0183e844214ba22db3d13a72475d81c809d2a50e03f3653a2b0ea1d52541db50`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1017a_automatic_failure_correction

- canonical `data/rcap-all50/overlays/census-v1/de/composed-treatment:obligation:runtime-contract-cohort:de:juvenile-expungement-under-10-del-c-1017-1019-1017a:section-1017a-automatic-failure-correction--custom-pleading/fixtures/canonical.pdf` — `0e9809a8fba28867f03cada0daae2c2c882ff57f7a55f0a75c9151021a99b60e`
- boundary `data/rcap-all50/overlays/census-v1/de/composed-treatment:obligation:runtime-contract-cohort:de:juvenile-expungement-under-10-del-c-1017-1019-1017a:section-1017a-automatic-failure-correction--custom-pleading/fixtures/boundary.pdf` — `fd9884acbebe2e257e9e6b708c051f208490d4ad86468f73c3bac2339d132ac8`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:IL:criminal-identity-theft-mistaken-identity-relief

- canonical `data/rcap-all50/overlays/census-v1/il/composed-treatment:obligation:runtime-only:il:criminal-identity-theft-mistaken-identity-relief--custom-pleading/fixtures/canonical.pdf` — `433dc445780603b752a544532ca2965688aaeeba114482927f4d103ace1d49f3`
- boundary `data/rcap-all50/overlays/census-v1/il/composed-treatment:obligation:runtime-only:il:criminal-identity-theft-mistaken-identity-relief--custom-pleading/fixtures/boundary.pdf` — `09e11b80f75be41889ab70d9057b8d34de844e71c3c13f9715cd75e9084c313e`
- expected pages 3 · requested scale 2.5
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

### de_discretionary_superior_court-set

- canonical `data/rcap-all50/overlays/census-v1/de/de-discretionary-superior-court-set--official-pdf-fill/fixtures/canonical.pdf` — `05033793dcf746e364ff4fdd67506e60778752ce52f647cdd68fe8387882af06`
- boundary `data/rcap-all50/overlays/census-v1/de/de-discretionary-superior-court-set--official-pdf-fill/fixtures/boundary.pdf` — `254189a3489271b2b72cb9f9448ef0e0b01feb6bdadd072c5c1b12bcd94ab17d`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### fl-administrative-set

- canonical `data/rcap-all50/overlays/census-v1/fl/fl-administrative-set--official-pdf-fill/fixtures/canonical.pdf` — `232aa2581086d5c9cf371fc439ee15883ca63829522bc2d6101b12f2a494f6e0`
- boundary `data/rcap-all50/overlays/census-v1/fl/fl-administrative-set--official-pdf-fill/fixtures/boundary.pdf` — `c09404577e4eff32ea6aab244b479c15307bb7ec6917144c68aa78948cafc09e`
- expected pages 2 · requested scale 2.5
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

### ia-901c2-set

- **5 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/ia/ia-901c2-set--official-pdf-fill/fixtures/canonical.pdf` — `18a2255cd780d62955b030ad9996d5b8fe46d71c5bb00f4517d3ff7a116d251b` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ia/ia-901c2-set--official-pdf-fill/fixtures/exact-day-180.pdf` — `6dabf84f3285ca8747551c4b264882fdfd6c689a40b1cf51ae77dbf94fc88e27` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ia/ia-901c2-set--official-pdf-fill/fixtures/good-cause-waiver.pdf` — `fbcf0b2dd84a53d17a59cffc4698eea50efeb13cfbf7543a1cf5c55c53879ef7` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/ia/ia-901c2-set--official-pdf-fill/fixtures/missing-contact.pdf` — `9b5a75a2c3d8ce37d204ac43fe507fcc2decb6de949494fd67053b625938f372` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/ia/ia-901c2-set--official-pdf-fill/fixtures/boundary.pdf` — `5d01a98e4134ad7b58f9f13b8ec55049202f93a8baaf0cd941e5e45715601128` · 5 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/ia/ia-901c2-set--official-pdf-fill/fixtures/canonical.pdf` and `data/rcap-all50/overlays/census-v1/ia/ia-901c2-set--official-pdf-fill/fixtures/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 26 across all documents · requested scale 2.5
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

### il-seal-edu-set

- canonical `data/rcap-all50/overlays/census-v1/il/il-seal-edu-set--official-pdf-fill/fixtures/canonical.pdf` — `27b895defb18c09f85c66c17a3cf8636a2b1b4e91d25203659f160bd0cf21072`
- boundary `data/rcap-all50/overlays/census-v1/il/il-seal-edu-set--official-pdf-fill/fixtures/boundary.pdf` — `6470dd271861c33ccf42e8eac7c0ad2e63e2d0824751d1c4ce532cc3c7c9679d`
- expected pages 17 · requested scale 2.5
- built by (no builder lane recorded)

### in_conviction_felony-set

- canonical `data/rcap-all50/overlays/census-v1/in/in-conviction-felony-set--custom-pleading/fixtures/canonical.pdf` — `a45a328ccb5a609ac69fd97216686b6d919c123bcff0e4822a82991d066cb072`
- boundary `data/rcap-all50/overlays/census-v1/in/in-conviction-felony-set--custom-pleading/fixtures/boundary.pdf` — `5ad46014f9ee63d779ae512de3ef9f05be0758a1d86c076e5b625e3a4a8972fc`
- expected pages 10 · requested scale 2.5
- built by (no builder lane recorded)

### ks-21-6614-conviction-set

- canonical `data/rcap-all50/overlays/census-v1/ks/ks-21-6614-conviction-set--official-pdf-fill/fixtures/canonical.pdf` — `e546bdfa7a3783ce450f1b1ef6b961946387b14fc3a2f90dcacc5731b0b84adb`
- boundary `data/rcap-all50/overlays/census-v1/ks/ks-21-6614-conviction-set--official-pdf-fill/fixtures/boundary.pdf` — `3bc6c62ba0d183cda4ef05e9dfb17f87e1d70a68a157b81dc03c8811a4851324`
- expected pages 20 · requested scale 2.5
- built by (no builder lane recorded)

### ks-22-2410-arrest-set

- canonical `data/rcap-all50/overlays/census-v1/ks/ks-22-2410-arrest-set--official-pdf-fill/fixtures/canonical.pdf` — `07bcda32a0700091871c819f4f03d17c9babf8b6627bc691ffc48871968e12a8`
- boundary `data/rcap-all50/overlays/census-v1/ks/ks-22-2410-arrest-set--official-pdf-fill/fixtures/boundary.pdf` — `7ca350c37451fd8aa12ea101ced3ee5ea8c0538c0192d42264aa301b09e9f559`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### ky_felony_expungement_after_pardon-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-felony-expungement-after-pardon-set--official-pdf-fill/fixtures/canonical.pdf` — `5c757ed8c07c7ed75a2e55b0d1d6fd8c524c31b5c15c5325201a58305ceb501a`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-felony-expungement-after-pardon-set--official-pdf-fill/fixtures/boundary.pdf` — `585a3a90aba6f8617d0589e8ba990e02004c45fb71f226c9aeb72da6d53eff5f`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### ky_protective_order_record_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-protective-order-record-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `dd797c6d4783f58979d964d0d483a9270261a1832177fe9b0a0150e2ef04d63e`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-protective-order-record-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `b219565f8e930db532f7613a3302e8433b4a933c32c679aab3eb1edb7df6a97d`
- expected pages 1 · requested scale 2.5
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

### ma-expunge-mj-set

- canonical `data/rcap-all50/overlays/census-v1/ma/ma-expunge-mj-set--official-pdf-fill/fixtures/canonical.pdf` — `ceab4012296b4e132466a11ebc5239fd72ae553fd5a5554f7ddfc110fcb8f565`
- boundary `data/rcap-all50/overlays/census-v1/ma/ma-expunge-mj-set--official-pdf-fill/fixtures/boundary.pdf` — `ceab4012296b4e132466a11ebc5239fd72ae553fd5a5554f7ddfc110fcb8f565`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### ma-seal-decrim-set

- canonical `data/rcap-all50/overlays/census-v1/ma/ma-seal-decrim-set--official-pdf-fill/fixtures/canonical.pdf` — `3ac87f6e248672399d482881f012b779101229664ef9bed10e1f6914edfda5f4`
- boundary `data/rcap-all50/overlays/census-v1/ma/ma-seal-decrim-set--official-pdf-fill/fixtures/boundary.pdf` — `b2476975802790d46694f369ecf48b484451f328607938ebf4f366b5d4c4f08f`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### md_cannabis_petition-set

- **18 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/canonical.pdf` — `f23b8e7f426430906318accf3fb77872d698633595f689e6c68e4ff37be6b014` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/diagnostic/court-record-status-unknown.pdf` — `2e4b157880333a7ccc068f697c6b7072e815001323dc3d9d6dbb39794337252a` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/diagnostic/missing-completion.pdf` — `95973dbc63de656308b3316a4fddd50533cba9b3c2c3445fd7a9475c4c941ccf` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/diagnostic/missing-contact.pdf` — `e9b60540ec98c2aa84302ae55060b35c3b5e77edbda1449d1b1e260823d5511a` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/diagnostic/unknown-other-offenses.pdf` — `d3ec60fad8d31046634c75bc4029acccc1bd2521af8357520b0fac81f76deafb` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/diagnostic/waiver-missing-financial.pdf` — `dcc93cc8f92d78befb573b286e4143981116c457ab00a7633257f0c6bf08b60a` · 11 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/selectable/adult-transfer-waiver.pdf` — `1451df58551922ba05ad860d71d463c1ecf82420a8390454d8257d1e01bd13de` · 10 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/selectable/citation.pdf` — `9e612162b736fb51c706f056c1010b0827b1aca35a2e9746187d4c663395ef4e` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/selectable/no_longer_crime-paid.pdf` — `f23b8e7f426430906318accf3fb77872d698633595f689e6c68e4ff37be6b014` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/selectable/no_longer_crime-waiver.pdf` — `46cc42b5a7cc1440eb3b6d116585dd692a9e6cde9f23a77c3bd4be226549a5f9` · 10 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/selectable/possession-paid.pdf` — `43a47550a6b36d7b40e9dc052d237015f83ab58765cb07cd99ff3348d755601b` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/selectable/possession-separate-from-ineligible-unit.pdf` — `91d466fa7a8d3f36eb84642e5cdabac2d37d20dc2d929d32c71d92a049e80940` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/selectable/possession-waiver.pdf` — `eed350b0330b821a4f56b202addb440dd4e0dfe2c560eaad316defc9b7d22098` · 10 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/selectable/pwid-new-conviction-now-eligible.pdf` — `bace88ac613f6bb2f880f9aceae42a8cf2f03fe4842935bd0544d36131656896` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/selectable/pwid-paid.pdf` — `bace88ac613f6bb2f880f9aceae42a8cf2f03fe4842935bd0544d36131656896` · 6 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/selectable/pwid-waiver.pdf` — `dc68c9b81a6e5902b20efba2f40ca617224111ee748d2414abc3f2aaae1620a0` · 10 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/selectable/pwid-with-minor-traffic.pdf` — `72f07db610106ed219f4c195557e3851d08911865d75f54e33bb7ea255ad9443` · 6 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/boundary.pdf` — `1451df58551922ba05ad860d71d463c1ecf82420a8390454d8257d1e01bd13de` · 10 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/canonical.pdf` and `data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/fixtures/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 133 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### me-screening-set

- canonical `data/rcap-all50/overlays/census-v1/me/me-screening-set--custom-pleading/fixtures/canonical.pdf` — `18921d618fb4a51d970ea9c5d40d427d364f42f87727c9824c21442f747fcef5`
- boundary `data/rcap-all50/overlays/census-v1/me/me-screening-set--custom-pleading/fixtures/boundary.pdf` — `421d3ab97ca8ba4c2cb7dfa678a3d88fb0f1bc0f9e92486ee7e4dfafb3c8da56`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### mi_setaside_application-set

- **8 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/canonical.pdf` — `50743b57033e7ca6cf498bcc63902fbd29c15a0c2fd03dd39a7cfc756251bf5c` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/extended-history.pdf` — `f64e2a043bfd055b1e54de1d5c6947aa75b6b24144370aba5da286c1516cf6e3` · 7 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/local-ordinance.pdf` — `059e1198182dbbd8cb5d19a65f3912b12d6cee7551d961259024def698e16a71` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/mixed-ordinary-categories.pdf` — `d321419699f611eb774717b28f28f3090c1f92413c3e5d9cbdfaeef5c5e097ee` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/multiple-felonies.pdf` — `8caf55b0d211c6333fe6facaa1418b4a64a1537b6d10586dcbf70163fab8bfdf` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/serious-misdemeanor.pdf` — `4d46d8c3cef8a24a194ca3e03d292d7761aea2e6278dcc107eca313a1ca17cd0` · 4 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/single-felony.pdf` — `87a93436fec5cd2b604252337b1ae70a54d65516f3faac6196edacff4f8807bc` · 4 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/boundary.pdf` — `f3829e41b5a9458279fe6f07cfba744be113701f6b1393f5f40b94f11c536e49` · 5 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/canonical.pdf` and `data/rcap-all50/overlays/census-v1/mi/mi-setaside-application-set--official-pdf-fill/fixtures/boundary.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 36 across all documents · requested scale 2.5
- built by (no builder lane recorded)

### mn_petition_15218-set

- canonical `data/rcap-all50/overlays/census-v1/mn/mn-petition-15218-set--official-pdf-fill/fixtures/canonical.pdf` — `cbdea2b8edd3e7151fc376273ac59832c2dbbb0486ad04b7cb08073fce5b3346`
- boundary `data/rcap-all50/overlays/census-v1/mn/mn-petition-15218-set--official-pdf-fill/fixtures/boundary.pdf` — `9ef91d9772ab7307e8877fc52e4db7878b1c4c2a2bf0106d8d63ce10fa7deeda`
- expected pages 17 · requested scale 2.5
- built by (no builder lane recorded)

### mo-610-140-arrest-set

- canonical `data/rcap-all50/overlays/census-v1/mo/mo-610-140-arrest-set--official-pdf-fill/canonical.packet.pdf` — `f07fd49e8770119addd24e852e443b354e90ca5a8b029cad6145226377585b3b`
- boundary `data/rcap-all50/overlays/census-v1/mo/mo-610-140-arrest-set--official-pdf-fill/boundary.packet.pdf` — `233c9a0ba97f120c9c2dfdec828506c7d185ae1f795dbc11e68d0bdf1917a5eb`
- expected pages 13 · requested scale 2.5
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

### nh_petition_vacated-set

- canonical `data/rcap-all50/overlays/census-v1/nh/nh-petition-vacated-set--official-pdf-fill/fixtures/canonical.pdf` — `277c0be84797512220ff62a0af7eaf6290a5f388f3a35223938284a53448c8d4`
- boundary `data/rcap-all50/overlays/census-v1/nh/nh-petition-vacated-set--official-pdf-fill/fixtures/boundary.pdf` — `219ea0df35f85495f4d14a69d4da30cbc9305a669d9a5be1b329ea5a97339c7c`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### nj_indictable_conviction-set

- canonical `data/rcap-all50/overlays/census-v1/nj/nj-indictable-conviction-set--official-pdf-fill/fixtures/cn-10557-canonical.pdf` — `e067d90c9ce9c7f95439d4bec7b533b8c3964c790f2b9008be86838b4ecf8283`
- boundary `data/rcap-all50/overlays/census-v1/nj/nj-indictable-conviction-set--official-pdf-fill/fixtures/cn-10557-boundary.pdf` — `e159d8846305d52946314ba5e980fb5f844aa84adf9bffb825424af22586ad44`
- expected pages 43 · requested scale 2.5
- built by (no builder lane recorded)

### nm_release_without_conviction-set

- canonical `data/rcap-all50/overlays/census-v1/nm/nm-release-without-conviction-set--official-pdf-fill/fixtures/canonical.pdf` — `1a6b59ac0a327692222cac1a67072061441b2cccb843c5ba8ae85478462fba65`
- boundary `data/rcap-all50/overlays/census-v1/nm/nm-release-without-conviction-set--official-pdf-fill/fixtures/boundary.pdf` — `6ccdce6e3bfb85e996c9d4d640f7b8ca5b178ebb074d54e5b3eac50d46ba770c`
- expected pages 19 · requested scale 2.5
- built by (no builder lane recorded)

### ny_mrta_marijuana-set

- canonical `data/rcap-all50/overlays/census-v1/ny/ny-mrta-marijuana-set--official-pdf-fill/fixtures/mrta-destruction-request-canonical.pdf` — `37d456b6c2b79c3801bb9c07030072d5b0487a95f711a92a3fd8ef14e99b05ff`
- boundary `data/rcap-all50/overlays/census-v1/ny/ny-mrta-marijuana-set--official-pdf-fill/fixtures/mrta-destruction-request-boundary.pdf` — `5f61e8f23675070c7691b16c6522745f5fa033083725f1eefb9caccc32cb3457`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### or_conviction_setaside-set

- canonical `data/rcap-all50/overlays/census-v1/or/or-conviction-setaside-set--official-pdf-fill/fixtures/canonical.pdf` — `a2d72e3f54c58a7590a681a93b015a82660056790077dd508b97d6d3e50c5b0b`
- boundary `data/rcap-all50/overlays/census-v1/or/or-conviction-setaside-set--official-pdf-fill/fixtures/boundary.pdf` — `2375b62449222756817f4338188fef6475f0f6323c237ba3f63a47c99396b360`
- expected pages 9 · requested scale 2.5
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

### rcap-ms-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/ms/rcap-ms-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `fc9ad883f98d6203f58ab96aa66376e77241ae12197535ce8415a46bb7647d2c`
- boundary `data/rcap-all50/overlays/census-v1/ms/rcap-ms-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `28ee12ccd0e86322e355df6bd6b066dc0ffa58e8f155afcdfbf69f65c89470d4`
- expected pages 25 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-ok-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/ok/rcap-ok-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `cf302fc33576f54acc1429516974642daefff7b0f854347498f81bb02344cb25`
- boundary `data/rcap-all50/overlays/census-v1/ok/rcap-ok-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `c7340a2555e44e011df445066cb91bee6be961959b74e97459a52c2613f068cf`
- expected pages 80 · requested scale 2.5
- built by (no builder lane recorded)

### rcap-tx-custom-pleading

- canonical `data/rcap-all50/overlays/census-v1/tx/rcap-tx-custom-pleading--custom-pleading/fixtures/canonical.pdf` — `0528011ffe6651bbafcab07dbae1f86396ad5d21f4afcf233fdeec8482fe093e`
- boundary `data/rcap-all50/overlays/census-v1/tx/rcap-tx-custom-pleading--custom-pleading/fixtures/boundary.pdf` — `1f2345d0e9bb8dada10abe52b563bf88868d8954153d3cca4e7df97224c9894d`
- expected pages 16 · requested scale 2.5
- built by (no builder lane recorded)

### ri_decriminalized-set

- canonical `data/rcap-all50/overlays/census-v1/ri/ri-decriminalized-set--official-pdf-fill/fixtures/canonical.pdf` — `8f816dce34a9d64e1c195e3ceed97871b048ec28ada230b424c8afc4105930c7`
- boundary `data/rcap-all50/overlays/census-v1/ri/ri-decriminalized-set--official-pdf-fill/fixtures/boundary.pdf` — `25954bf32f14108df69ec87ee92a62d88adcd2d416e9c6ecaf9fcde1b6f39961`
- expected pages 10 · requested scale 2.5
- built by (no builder lane recorded)

### ri_marijuana-set

- canonical `data/rcap-all50/overlays/census-v1/ri/ri-marijuana-set--custom-pleading/fixtures/canonical.pdf` — `79bcf52eb9014313303adc20c37ec9d20d127de1dd28e5b738f2c823f0eba8f0`
- boundary `data/rcap-all50/overlays/census-v1/ri/ri-marijuana-set--custom-pleading/fixtures/boundary.pdf` — `fc9c6c8ae3934798ba7dd5eff9bf58629da65a390ba9cf0318032f8b37945312`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### sd_arrest_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/sd/sd-arrest-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `953e537114738ce8ef5ca7f4144e2bb831e117823e4e8833af22f3b8c82b4d65`
- boundary `data/rcap-all50/overlays/census-v1/sd/sd-arrest-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `6467f08bb716a8d9976394b3ce7112add1fb4fdbc761b1cdcaec78a40084e3c8`
- expected pages 14 · requested scale 2.5
- built by (no builder lane recorded)

### tx_nd_deferred_other-set

- canonical `data/rcap-all50/overlays/census-v1/tx/tx-nd-deferred-other-set--official-pdf-fill/fixtures/canonical.pdf` — `68075bdcbe9fd71b3219523b99781018d2a3bfd604ab21c96da77997c25b580c`
- boundary `data/rcap-all50/overlays/census-v1/tx/tx-nd-deferred-other-set--official-pdf-fill/fixtures/boundary.pdf` — `d15f204776604cbc82302dd792cd9a2986f557c4ef3624acc48e27a67d33d15f`
- expected pages 26 · requested scale 2.5
- built by (no builder lane recorded)

### tx_nd_probation_misdemeanor-set

- canonical `data/rcap-all50/overlays/census-v1/tx/tx-nd-probation-misdemeanor-set--official-pdf-fill/fixtures/canonical.pdf` — `006453102ab2082f27d5b52c2309c4c24267051deabf117fa29876494b591c4b`
- boundary `data/rcap-all50/overlays/census-v1/tx/tx-nd-probation-misdemeanor-set--official-pdf-fill/fixtures/boundary.pdf` — `8c20f877c3ba04ddf88b98d04572cfa6a56732e095155b86c08c1c606d819fc5`
- expected pages 24 · requested scale 2.5
- built by (no builder lane recorded)

### ut_pet_cannabis-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-cannabis-set--official-pdf-fill/fixtures/canonical.pdf` — `f4910777945ca9d74da2b5a1f84d9a37581696dc47bc95546ee21ca9c628f207`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-cannabis-set--official-pdf-fill/fixtures/boundary.pdf` — `e37c533a78f72029c9f078fb1115146c77c809326ebab8ff7ffc1e4aabda8d6c`
- expected pages 12 · requested scale 2.5
- built by (no builder lane recorded)

### ut_pet_limitations-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-limitations-set--official-pdf-fill/fixtures/canonical.pdf` — `c949b633fc0f4a1e3f93eea1f61ba23274a45e3a95200741ef8be40b2920dac9`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-limitations-set--official-pdf-fill/fixtures/boundary.pdf` — `d609fb3de01fb5e5b736e1d63753088bee559767f1dabf9f5aa8127a6c4f8909`
- expected pages 19 · requested scale 2.5
- built by (no builder lane recorded)

### va_exp_absolute_pardon-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-exp-absolute-pardon-set--custom-pleading/fixtures/canonical.pdf` — `b56af08c1b796b78a26ebac56a3580299e5e06022976941ba0b7fd68cf810188`
- boundary `data/rcap-all50/overlays/census-v1/va/va-exp-absolute-pardon-set--custom-pleading/fixtures/boundary.pdf` — `f7691bc33addbaef446ccccb09c551e673bd5369410c363044794a429fea29eb`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### va_seal_enumerated_seven_year-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-seal-enumerated-seven-year-set--official-pdf-fill/fixtures/canonical.pdf` — `3527d8b4f621e798537b4c276da302e6cd78e2c8903fbdd87c30f81c44571615`
- boundary `data/rcap-all50/overlays/census-v1/va/va-seal-enumerated-seven-year-set--official-pdf-fill/fixtures/boundary.pdf` — `44ee4594b5fed61454390047a269af54c10d046da39305c979511709ae9b6e37`
- expected pages 13 · requested scale 2.5
- built by (no builder lane recorded)

### vt_exp_deferred_sentence-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-exp-deferred-sentence-set--custom-pleading/fixtures/canonical.pdf` — `b4e5975feb1e5727502cf876d0265157e65b94b56769a3cf5a1ae9abd284f96d`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-exp-deferred-sentence-set--custom-pleading/fixtures/boundary.pdf` — `f8c1e0b0e58e3fd7f39f821ddf5dc7427c9f4b56202f881b97fae5a0f1b01f04`
- expected pages 4 · requested scale 2.5
- built by (no builder lane recorded)

### vt_seal_misdemeanor-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-misdemeanor-set--official-pdf-fill/fixtures/canonical.pdf` — `81dd74a0ee1d178cefcb0f028dfba3e9bc7dbd7687bcf58193b0b9d62d767dee`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-misdemeanor-set--official-pdf-fill/fixtures/boundary.pdf` — `7ff3cc2272008865eba1d723e1d8dc4074b8163c7c6dbca82cf665003e32750e`
- expected pages 6 · requested scale 2.5
- built by (no builder lane recorded)

### wa_crop_certificate_of_restoration-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-crop-certificate-of-restoration-set--custom-pleading/fixtures/canonical.pdf` — `44d858039dfd15ea013f3d3d431cc74d277d3b8a59d2a12f7edde490808678c9`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-crop-certificate-of-restoration-set--custom-pleading/fixtures/boundary.pdf` — `9eecfba4d9b8ba5d5ed0feba913e46ffd18a98f708038616a624701130ab8288`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_homicide_victim_prostitution-set

- **4 documents**, and the receipt must cover every one of them:
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` — `846360e75578ce6233dba77b03b25545a529b50cd553ad31f88d3008b429a6ad` · 5 page(s)
  - canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill/fixtures/crrlj-09-0200-canonical-filled.pdf` — `3abc2475b78da8cff2445a99a78fa7aa18641d4c27f17d0c5eea3d6f07e40ce7` · 6 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` — `75fac347051d6b710015ef5bbcc10b43df0a1de59078195ede75a744f4c42b77` · 5 page(s)
  - boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill/fixtures/crrlj-09-0200-boundary-filled.pdf` — `4d844aece78a8ae1c1e97407edd305f45dbdaa2c509f8e55ef51fef03bcb3a55` · 6 page(s)
- the row pins `data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` and `data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` as its primary pair; that is which document the row is keyed by, not the extent of what is rendered
- expected pages 22 across all documents · requested scale 2.5
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

### wi_nc_doj_fingerprint_removal-set

- canonical `data/rcap-all50/overlays/census-v1/wi/wi-nc-doj-fingerprint-removal-set--official-pdf-fill/fixtures/canonical.pdf` — `5b475b11c17c35f8edc37bada78716e8b14471b1951966604b7a678412fc6cc6`
- boundary `data/rcap-all50/overlays/census-v1/wi/wi-nc-doj-fingerprint-removal-set--official-pdf-fill/fixtures/boundary.pdf` — `3fd596ff112fd2f6ef55ca9a14c2fe0702eb107af9f715554b45503e3d7861f3`
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
