# RAS04

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `772d6350c5536c938b0e113085e9f36e4b73037b`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (28)

### ar-arrest-seal-set

- canonical `data/rcap-all50/overlays/census-v1/ar/ar-arrest-seal-set--official-pdf-fill/fixtures/petition-canonical-filled.pdf` — `78ef189e981b35fec69688cc6d3181df245b309e7405c954fcabd503e426bea5`
- boundary `data/rcap-all50/overlays/census-v1/ar/ar-arrest-seal-set--official-pdf-fill/fixtures/petition-boundary-filled.pdf` — `fb32678b598155af6d1436eeb51098cb665fe2f1711bd826ec2b980b1c30a811`
- expected pages 3 · requested scale 2.5
- built by FIX01

### co_multiple_conviction_seal-set

- canonical `data/rcap-all50/overlays/census-v1/co/co-multiple-conviction-seal-set--official-pdf-fill/fixtures/canonical.pdf` — `3cb52dc501311af75b69ef7c8e339849b0fbb2d632bd16e0f6b3a4483e89a0cd`
- boundary `data/rcap-all50/overlays/census-v1/co/co-multiple-conviction-seal-set--official-pdf-fill/fixtures/boundary.pdf` — `204a36fd7f6f27ba2dd630afd90c7065e5521419c8c379ef095ead0883101d44`
- expected pages 7 · requested scale 2.5
- built by (no builder lane recorded)

### composed-treatment:obligation:runtime-only:AK:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085

- canonical `data/rcap-all50/overlays/census-v1/ak/composed-treatment:obligation:runtime-only:ak:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085--custom-pleading/fixtures/canonical.pdf` — `9f00da8f072069098dce0b465bbc242d5713730f5472a6f9d6a104699bd1428a`
- boundary `data/rcap-all50/overlays/census-v1/ak/composed-treatment:obligation:runtime-only:ak:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085--custom-pleading/fixtures/boundary.pdf` — `e898a0768afd9882932f581da66b04b99e2cc9494d9e218fff7e758f7b677e42`
- expected pages 8 · requested scale 2.5
- built by VF06

### ct-cannabis-petition-set

- canonical `data/rcap-all50/overlays/census-v1/ct/ct-cannabis-petition-set--custom-pleading/fixtures/canonical.pdf` — `73f32cf14f330bb162ad0792eecd8b6351e51905d31c6d9c40b0e9bd933a97a3`
- boundary `data/rcap-all50/overlays/census-v1/ct/ct-cannabis-petition-set--custom-pleading/fixtures/boundary.pdf` — `017fe825b8c4d19d7c2ae85d21415454e2d6527754e501b51f33a31a235cce81`
- expected pages 4 · requested scale 2.5
- built by VF10

### ct-pardon-erasure-set

- canonical `data/rcap-all50/overlays/census-v1/ct/ct-pardon-erasure-set--custom-pleading/fixtures/canonical.pdf` — `fb22c04456ff31e1526fcc6127330c67618fdd5378da60fd512b4be51b7c410b`
- boundary `data/rcap-all50/overlays/census-v1/ct/ct-pardon-erasure-set--custom-pleading/fixtures/boundary.pdf` — `dc26b69ffdb89472c0d674378196a1e04664caf06f6c724d43117d80f28838ef`
- expected pages 3 · requested scale 2.5
- built by (no builder lane recorded)

### dc_seal_conviction-set

- canonical `data/rcap-all50/overlays/census-v1/dc/dc-seal-conviction-set--custom-pleading/fixtures/canonical-misdemeanor_5yr.pdf` — `069a85420cd083de902918e7ee98bd475336a23273e6dea0dde23eb3fbb8f088`
- boundary `data/rcap-all50/overlays/census-v1/dc/dc-seal-conviction-set--custom-pleading/fixtures/boundary-misdemeanor_5yr.pdf` — `3471ea08eb2b329dbc91501b180738f77b2e8b3265925ef92574385ea5931629`
- expected pages 5 · requested scale 2.5
- built by VF04

### ga-felony-j1-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-felony-j1-set--custom-pleading/fixtures/canonical.pdf` — `87acee6328e42485183be789b94914bccd92fe6728807bd4c976f3dc74cdb856`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-felony-j1-set--custom-pleading/fixtures/boundary.pdf` — `c637ec1cd28c48db48adc796c67e5ba2401f001815e3cf09c2500e7d0914aec4`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### ga-jail-k2-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-jail-k2-set--custom-pleading/fixtures/canonical.pdf` — `154780fcc5f3280fea71781bb16f80c1176db5c56c0b522b9a889f288b5dc91d`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-jail-k2-set--custom-pleading/fixtures/boundary.pdf` — `ff4dbf5329d071c7bfd07dde7be1e786b156a3b5da4753d7f43df199e1d425b2`
- expected pages 5 · requested scale 2.5
- built by VF07

### ga-seal-m-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-seal-m-set--custom-pleading/fixtures/canonical.pdf` — `9b57311c3b69ac540a711dd174de9bec6d5b1b1fd7870dde4cbb592e2edf4796`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-seal-m-set--custom-pleading/fixtures/boundary.pdf` — `09abd2c2eacdc14fe2840688202ccf62d8506dd19f801e926cb2614c5b420182`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### ky_criminal_record_segregation-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-criminal-record-segregation-set--custom-pleading/fixtures/canonical.pdf` — `688787fb65152b5bb91ee9677012709e808db28da9dccb7599f85a631ac97970`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-criminal-record-segregation-set--custom-pleading/fixtures/boundary.pdf` — `7e8e5f3eda4cc8cd5a5cc5a29d6c10e83eae825a3508a24e4d9ed7732a5cb470`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### ma-bmc-multi-set

- canonical `data/rcap-all50/overlays/census-v1/ma/ma-bmc-multi-set--custom-pleading/fixtures/canonical.pdf` — `4ef2b720a0788da7831fa22aa404429f6ebc137196cc66a863ffd226d1c93fca`
- boundary `data/rcap-all50/overlays/census-v1/ma/ma-bmc-multi-set--custom-pleading/fixtures/boundary.pdf` — `834acb2ad6e615e00a42e0af6dddf6bca650bff3b0d448a9d749aa8c30e5ee02`
- expected pages 4 · requested scale 2.5
- built by VF11

### me-screening-set

- canonical `data/rcap-all50/overlays/census-v1/me/me-screening-set--custom-pleading/fixtures/canonical.pdf` — `18921d618fb4a51d970ea9c5d40d427d364f42f87727c9824c21442f747fcef5`
- boundary `data/rcap-all50/overlays/census-v1/me/me-screening-set--custom-pleading/fixtures/boundary.pdf` — `421d3ab97ca8ba4c2cb7dfa678a3d88fb0f1bc0f9e92486ee7e4dfafb3c8da56`
- expected pages 5 · requested scale 2.5
- built by VF12

### ms-misd-1st-set

- canonical `data/rcap-all50/overlays/census-v1/ms/ms-misd-1st-set--custom-pleading/fixtures/canonical.pdf` — `e9483733fabca9e031a024a30444a37b49f3d14c0fd84e6d579bd3f2209be897`
- boundary `data/rcap-all50/overlays/census-v1/ms/ms-misd-1st-set--custom-pleading/fixtures/boundary.pdf` — `90608c6244d1999dece4f87dc22632e7dda36f0302de22d3996437aebd7458b5`
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
- built by VF06

### pa_490_nonconviction-set

- canonical `data/rcap-all50/overlays/census-v1/pa/pa-490-nonconviction-set--official-pdf-fill/fixtures/rule-490-petition-canonical.pdf` — `1048b6276acfea471f1aee7839c4a638124c5ac10627c1e335ef7cecbf2074e0`
- boundary `data/rcap-all50/overlays/census-v1/pa/pa-490-nonconviction-set--official-pdf-fill/fixtures/rule-490-petition-boundary.pdf` — `c15e8eb4bd78c65b2fac2bc130659cba2a19921fe81c449b7f64654bebeea808`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### pa_pardon_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/pa/pa-pardon-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `4a7113112f29b05fdf21e6d6f6822d8ca41d3768c3ff2640cff72af6bbf308e0`
- boundary `data/rcap-all50/overlays/census-v1/pa/pa-pardon-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `95b2026728702121ab3a551ca49e1c532a0a9a53f8035dd53855cfa06e86a61a`
- expected pages 5 · requested scale 2.5
- built by VF10

### sc_17_22_950_summary-set

- canonical `data/rcap-all50/overlays/census-v1/sc/sc-17-22-950-summary-set--official-pdf-fill/fixtures/canonical.pdf` — `f373d91a18f015ebc7f3c7a9e7d71c1e47a469e830977555c937f4241cc8c5a1`
- boundary `data/rcap-all50/overlays/census-v1/sc/sc-17-22-950-summary-set--official-pdf-fill/fixtures/boundary.pdf` — `42e3e5e2b24e0f2b8064fef187ab2331c5914710c43899d2abd99c0a7bbfeaf9`
- expected pages 1 · requested scale 2.5
- built by (no builder lane recorded)

### ut_pet_dismissed_with_prejudice-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-dismissed-with-prejudice-set--official-pdf-fill/fixtures/canonical.pdf` — `ad594f0a40750195b67e36916f3628df5b96d337e4955c9063b415747d6e36d6`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-dismissed-with-prejudice-set--official-pdf-fill/fixtures/boundary.pdf` — `b3ba83a65754f96fe58083de62a3ce879654d6362170e11bae2f043e4c39a765`
- expected pages 19 · requested scale 2.5
- built by VF02

### ut_pet_traffic-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-traffic-set--official-pdf-fill/fixtures/canonical.pdf` — `b5fcdd1601c823f3ebc6b18f74f5b639789220ec9e8363202c6e1492f9d90909`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-traffic-set--official-pdf-fill/fixtures/boundary.pdf` — `ef8b488fe1f78f87a47419ddf2123ad9909b88612931a8c031ade0299a8d6e03`
- expected pages 9 · requested scale 2.5
- built by VF04

### va_seal_ancillary_matter_only-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-seal-ancillary-matter-only-set--official-pdf-fill/fixtures/canonical.pdf` — `0ca22f4c4720d2d5325d67fa67657746292923fbfb45580ef94094d5e94ad893`
- boundary `data/rcap-all50/overlays/census-v1/va/va-seal-ancillary-matter-only-set--official-pdf-fill/fixtures/boundary.pdf` — `fcc5c9df64bd93e04cd5c6143cbb00f38a8895a965dd76ca00e62f3235d4c0a5`
- expected pages 10 · requested scale 2.5
- built by (no builder lane recorded)

### vt_exp_decriminalized-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-exp-decriminalized-set--official-pdf-fill/fixtures/canonical.pdf` — `f952b05860583f6c188bc44d4831ac6e8f19daf1d19906fb3630b7a377e113a0`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-exp-decriminalized-set--official-pdf-fill/fixtures/boundary.pdf` — `eebfffaa45c3d2d99c91d602afa72a1ede1239365d5e2a28ec32825c9b20dde3`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### vt_seal_felony-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-felony-set--official-pdf-fill/fixtures/canonical.pdf` — `81525fd23e9489ce1225aaf953e28c0e68ad64c376dccf9143a5c14920bde942`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-felony-set--official-pdf-fill/fixtures/boundary.pdf` — `8f0058c992eaf6fec640b7519935f3e0d4c119348f90d7042dd1ee6b53501404`
- expected pages 6 · requested scale 2.5
- built by VF06

### vt_seal_under_25-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-under-25-set--custom-pleading/fixtures/canonical.pdf` — `cd71dce93a3404558c3d2fc33e55a3838867868781c801c7487ebad8ea049a07`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-under-25-set--custom-pleading/fixtures/boundary.pdf` — `ddf00f9ef8f86bb54495dd12a379d7edfc906a03c6e94a37a3b1e8a8df832492`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_felony-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-felony-set--official-pdf-fill/fixtures/cr-08-0900-canonical-filled.pdf` — `5cf52336e302beedc601c9bb7ad947955b5a123a187fcad32d4635ebaf593010`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-felony-set--official-pdf-fill/fixtures/cr-08-0900-boundary-filled.pdf` — `1569728067f189c0b6da9bbf4d06ff1305fb8ce3adbb59a586f0cdac0a19ae3b`
- expected pages 3 · requested scale 2.5
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
- built by VF09

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
FAMILIES ASSIGNED: 28
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
