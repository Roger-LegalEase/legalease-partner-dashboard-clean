# RAS03

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `35ccd557052bc47ac4397d3ab6d7c89af8d99072`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (19)

### ak-tf805-set

- canonical `data/rcap-all50/overlays/census-v1/ak/ak-tf805-set--official-pdf-fill/fixtures/tf805-canonical-filled.pdf` — `bffda336fac95d0980e0a9130913c9189077e1fdc3f05b5a1d55065e5f5c9703`
- boundary `data/rcap-all50/overlays/census-v1/ak/ak-tf805-set--official-pdf-fill/fixtures/tf805-boundary-filled.pdf` — `5dd98fef218f8310a8e46e41a9ca83e53d5295507bac0c82fce77e44f96d0ff5`
- expected pages 2 · requested scale 2.5
- built by (no builder lane recorded)

### co_motion_seal_nonconviction-set

- canonical `data/rcap-all50/overlays/census-v1/co/co-motion-seal-nonconviction-set--official-pdf-fill/fixtures/canonical.pdf` — `6c3d8f4482dc4de44cb817f486cc2ad982aaf79b3d6f79cc75696d22facb07d7`
- boundary `data/rcap-all50/overlays/census-v1/co/co-motion-seal-nonconviction-set--official-pdf-fill/fixtures/boundary.pdf` — `1fb4e7b9faeb8ee7f06837b94993c071629b47abb59138ceaa7efa1c2d43a6f4`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### ga-deaddocket-j3-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-deaddocket-j3-set--custom-pleading/fixtures/canonical.pdf` — `0860a52c8b3607370fee4757b2224ade00b514f13df43ee92589099c69a278fd`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-deaddocket-j3-set--custom-pleading/fixtures/boundary.pdf` — `65217c5b184350454e5dac9e0d0986162ac9edc600e1291c9638ea2572f95f96`
- expected pages 6 · requested scale 2.5
- built by VF08

### ga-fugitive-j5-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-fugitive-j5-set--custom-pleading/fixtures/canonical.pdf` — `98b8c3f6db936186d9429707af2ef62c34a53d5c8d0ae1acb7d2c00ddfcc8d02`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-fugitive-j5-set--custom-pleading/fixtures/boundary.pdf` — `9480dd333b55a8adcd3cc6f6bfd2294de83ff187151182cce2a2910eaab738c7`
- expected pages 6 · requested scale 2.5
- built by VF12

### ga-vacated-j2-set

- canonical `data/rcap-all50/overlays/census-v1/ga/ga-vacated-j2-set--custom-pleading/fixtures/canonical.pdf` — `6c2ce97c8086b9f64684f20680feb603b903de1a7888ce1ab4b5a29686b4181c`
- boundary `data/rcap-all50/overlays/census-v1/ga/ga-vacated-j2-set--custom-pleading/fixtures/boundary.pdf` — `490dcbf4d162cc3c91fbf6a76147661285c3934e361ae70011e798e232cd0be5`
- expected pages 6 · requested scale 2.5
- built by VF04

### ma-expunge-mj-set

- canonical `data/rcap-all50/overlays/census-v1/ma/ma-expunge-mj-set--official-pdf-fill/fixtures/canonical.pdf` — `ceab4012296b4e132466a11ebc5239fd72ae553fd5a5554f7ddfc110fcb8f565`
- boundary `data/rcap-all50/overlays/census-v1/ma/ma-expunge-mj-set--official-pdf-fill/fixtures/boundary.pdf` — `ceab4012296b4e132466a11ebc5239fd72ae553fd5a5554f7ddfc110fcb8f565`
- expected pages 2 · requested scale 2.5
- built by VF08

### ne-setaside-custodial-set

- canonical `data/rcap-all50/overlays/census-v1/ne/ne-setaside-custodial-set--official-pdf-fill/fixtures/canonical.pdf` — `a099c0a10c739d9876c8cf0653cedffecdde2e8df20c759b24fcd354fc7e65f7`
- boundary `data/rcap-all50/overlays/census-v1/ne/ne-setaside-custodial-set--official-pdf-fill/fixtures/boundary.pdf` — `ec477f8f52382e7820289bb727ee123f961396dc8fbb151980f91a92690722f3`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### nj_ordinance-set

- canonical `data/rcap-all50/overlays/census-v1/nj/nj-ordinance-set--official-pdf-fill/fixtures/cn-10557-canonical.pdf` — `343407a30f38beffccde4c51b8060065bd6eed27356a999d8e321e01a1baca33`
- boundary `data/rcap-all50/overlays/census-v1/nj/nj-ordinance-set--official-pdf-fill/fixtures/cn-10557-boundary.pdf` — `6256ba7f621c25a8f8a501c0a9af0191c151074fc8d3b2bb6ff2ef36354788ea`
- expected pages 43 · requested scale 2.5
- built by VF03

### pa_490_nonconviction-set

- canonical `data/rcap-all50/overlays/census-v1/pa/pa-490-nonconviction-set--official-pdf-fill/fixtures/rule-490-petition-canonical.pdf` — `1048b6276acfea471f1aee7839c4a638124c5ac10627c1e335ef7cecbf2074e0`
- boundary `data/rcap-all50/overlays/census-v1/pa/pa-490-nonconviction-set--official-pdf-fill/fixtures/rule-490-petition-boundary.pdf` — `c15e8eb4bd78c65b2fac2bc130659cba2a19921fe81c449b7f64654bebeea808`
- expected pages 1 · requested scale 2.5
- built by VF08

### pa_pardon_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/pa/pa-pardon-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `4a7113112f29b05fdf21e6d6f6822d8ca41d3768c3ff2640cff72af6bbf308e0`
- boundary `data/rcap-all50/overlays/census-v1/pa/pa-pardon-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `95b2026728702121ab3a551ca49e1c532a0a9a53f8035dd53855cfa06e86a61a`
- expected pages 5 · requested scale 2.5
- built by VF12

### sd_arrest_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/sd/sd-arrest-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `627e6502e0340f5d6d75ae855314cad53160d92acab710a1d43add2341dbe47d`
- boundary `data/rcap-all50/overlays/census-v1/sd/sd-arrest-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `79b2e9ac4ca0cfadba32a9896f39fe82ae7d0dc543d3a7a42d2a338bf318a8ed`
- expected pages 14 · requested scale 2.5
- built by (no builder lane recorded)

### ut_pet_dismissed_without_prejudice-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-dismissed-without-prejudice-set--official-pdf-fill/fixtures/canonical.pdf` — `8efb78f3f885af303bc74f461172d319f63b60bb747720329e401c1bd4d417f4`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-dismissed-without-prejudice-set--official-pdf-fill/fixtures/boundary.pdf` — `6d9406adbba1c50f34b9349ed41f14a68295547c3838a08a141c69e2e228d142`
- expected pages 19 · requested scale 2.5
- built by VF05

### va_exp_identity_used_by_another-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-exp-identity-used-by-another-set--custom-pleading/fixtures/canonical.pdf` — `e01f67987b25265e945bf774750a5af8a10f2360cad8790ca6bbbd116fc099b4`
- boundary `data/rcap-all50/overlays/census-v1/va/va-exp-identity-used-by-another-set--custom-pleading/fixtures/boundary.pdf` — `eb054b41c4548fd97bd5ab8fcf368b4cdc9d3ac3d43e98b6e6c271b362376f66`
- expected pages 8 · requested scale 2.5
- built by VF09

### va_seal_petition_felony-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-seal-petition-felony-set--official-pdf-fill/fixtures/canonical.pdf` — `c653f0a41319bbee6133a17c418666eaccb31f329abfd465d0de55b9dd4e2636`
- boundary `data/rcap-all50/overlays/census-v1/va/va-seal-petition-felony-set--official-pdf-fill/fixtures/boundary.pdf` — `b7095073a0cb0683ff5efc7575d903e9faa9b19d82ccd6c29e2dbe5e6e35b7ab`
- expected pages 8 · requested scale 2.5
- built by (no builder lane recorded)

### vt_seal_dui-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-dui-set--official-pdf-fill/fixtures/canonical.pdf` — `81525fd23e9489ce1225aaf953e28c0e68ad64c376dccf9143a5c14920bde942`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-dui-set--official-pdf-fill/fixtures/boundary.pdf` — `8f0058c992eaf6fec640b7519935f3e0d4c119348f90d7042dd1ee6b53501404`
- expected pages 6 · requested scale 2.5
- built by VF01

### vt_seal_pardon-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-pardon-set--official-pdf-fill/fixtures/canonical.pdf` — `39d9ac94bb59f196f4e236ca2a11f30507b7680a103ef95b6cbe060e5c1684f8`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-pardon-set--official-pdf-fill/fixtures/boundary.pdf` — `010b7fdedd026da5d014460185ecf1c17cf7801f51eea877feedddcae7d4ddf8`
- expected pages 6 · requested scale 2.5
- built by VF05

### wa_vac_homicide_victim_prostitution-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` — `846360e75578ce6233dba77b03b25545a529b50cd553ad31f88d3008b429a6ad`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` — `75fac347051d6b710015ef5bbcc10b43df0a1de59078195ede75a744f4c42b77`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_survivor_misdemeanor-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-misdemeanor-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` — `846360e75578ce6233dba77b03b25545a529b50cd553ad31f88d3008b429a6ad`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-survivor-misdemeanor-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` — `75fac347051d6b710015ef5bbcc10b43df0a1de59078195ede75a744f4c42b77`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### wv_conv_multiple_misdemeanors-set

- canonical `data/rcap-all50/overlays/census-v1/wv/wv-conv-multiple-misdemeanors-set--official-pdf-fill/fixtures/canonical.pdf` — `d477bc4a7f18aaac153c56760fc11dca69a317dc49b2eff7362b1d41ba27b4e4`
- boundary `data/rcap-all50/overlays/census-v1/wv/wv-conv-multiple-misdemeanors-set--official-pdf-fill/fixtures/boundary.pdf` — `27ed521c46fc25fd8edb60501a47322db459aa2196b0b4fd54a6fd5182d12860`
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
FAMILIES ASSIGNED: 19
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
