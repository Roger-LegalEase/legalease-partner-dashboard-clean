# RAS03

**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence
**Repository branch to select:** `claude/legalease-sprint-captain-utucnw`
**Minimum required ancestor:** `267d578fc3f9f40347329a1c4b6fa97714ec7e6c`
**Execution contract:** `docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md` — read it before you start.

> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.
>
> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**
> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**

## You do not render anything

There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.

The rendering happens in `.github/workflows/rcap-packet-raster-acceptance-batch.yml` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.

## Your families (14)

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

### ky_felony_vacatur_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/ky/ky-felony-vacatur-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `581dee480d77d2f226b907b017c4209de89d4f4346f654256ed11ba24d32e54e`
- boundary `data/rcap-all50/overlays/census-v1/ky/ky-felony-vacatur-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `3847941126c39f4c5963e2fa06bbccbaf5936a39551118fc6df429ff21bca91b`
- expected pages 7 · requested scale 2.5
- built by VF06

### me-seal-prost-set

- canonical `data/rcap-all50/overlays/census-v1/me/me-seal-prost-set--official-pdf-fill/fixtures/cr289-canonical-filled.pdf` — `ce2e6bde63ac9524927ace30a128938174ff79db091ec8db26a4ad3d307daaf7`
- boundary `data/rcap-all50/overlays/census-v1/me/me-seal-prost-set--official-pdf-fill/fixtures/cr289-boundary-filled.pdf` — `c56d43ba1b2341526fa7b7c17115b77435a1e030f70e2dfc93c76815f9cc2695`
- expected pages 1 · requested scale 2.5
- built by VF10

### or_conviction_setaside-set

- canonical `data/rcap-all50/overlays/census-v1/or/or-conviction-setaside-set--official-pdf-fill/fixtures/canonical.pdf` — `a2d72e3f54c58a7590a681a93b015a82660056790077dd508b97d6d3e50c5b0b`
- boundary `data/rcap-all50/overlays/census-v1/or/or-conviction-setaside-set--official-pdf-fill/fixtures/boundary.pdf` — `2375b62449222756817f4338188fef6475f0f6323c237ba3f63a47c99396b360`
- expected pages 9 · requested scale 2.5
- built by VF12

### pa_pardon_expungement-set

- canonical `data/rcap-all50/overlays/census-v1/pa/pa-pardon-expungement-set--official-pdf-fill/fixtures/canonical.pdf` — `4a7113112f29b05fdf21e6d6f6822d8ca41d3768c3ff2640cff72af6bbf308e0`
- boundary `data/rcap-all50/overlays/census-v1/pa/pa-pardon-expungement-set--official-pdf-fill/fixtures/boundary.pdf` — `95b2026728702121ab3a551ca49e1c532a0a9a53f8035dd53855cfa06e86a61a`
- expected pages 5 · requested scale 2.5
- built by VF04

### ut_pet_acquittal-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-acquittal-set--official-pdf-fill/fixtures/canonical.pdf` — `ad594f0a40750195b67e36916f3628df5b96d337e4955c9063b415747d6e36d6`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-acquittal-set--official-pdf-fill/fixtures/boundary.pdf` — `b3ba83a65754f96fe58083de62a3ce879654d6362170e11bae2f043e4c39a765`
- expected pages 19 · requested scale 2.5
- built by (no builder lane recorded)

### ut_pet_limitations-set

- canonical `data/rcap-all50/overlays/census-v1/ut/ut-pet-limitations-set--official-pdf-fill/fixtures/canonical.pdf` — `ad594f0a40750195b67e36916f3628df5b96d337e4955c9063b415747d6e36d6`
- boundary `data/rcap-all50/overlays/census-v1/ut/ut-pet-limitations-set--official-pdf-fill/fixtures/boundary.pdf` — `b3ba83a65754f96fe58083de62a3ce879654d6362170e11bae2f043e4c39a765`
- expected pages 19 · requested scale 2.5
- built by FIX04

### va_seal_ancillary_matter_only-set

- canonical `data/rcap-all50/overlays/census-v1/va/va-seal-ancillary-matter-only-set--official-pdf-fill/fixtures/canonical.pdf` — `0ca22f4c4720d2d5325d67fa67657746292923fbfb45580ef94094d5e94ad893`
- boundary `data/rcap-all50/overlays/census-v1/va/va-seal-ancillary-matter-only-set--official-pdf-fill/fixtures/boundary.pdf` — `fcc5c9df64bd93e04cd5c6143cbb00f38a8895a965dd76ca00e62f3235d4c0a5`
- expected pages 10 · requested scale 2.5
- built by (no builder lane recorded)

### vt_exp_decriminalized-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-exp-decriminalized-set--official-pdf-fill/fixtures/canonical.pdf` — `f952b05860583f6c188bc44d4831ac6e8f19daf1d19906fb3630b7a377e113a0`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-exp-decriminalized-set--official-pdf-fill/fixtures/boundary.pdf` — `eebfffaa45c3d2d99c91d602afa72a1ede1239365d5e2a28ec32825c9b20dde3`
- expected pages 8 · requested scale 2.5
- built by VF09

### vt_seal_misdemeanor-set

- canonical `data/rcap-all50/overlays/census-v1/vt/vt-seal-misdemeanor-set--official-pdf-fill/fixtures/canonical.pdf` — `c37d27bad040121f3e677e81911745c6ea41f12fa1b8d7e986b74b9585d98a87`
- boundary `data/rcap-all50/overlays/census-v1/vt/vt-seal-misdemeanor-set--official-pdf-fill/fixtures/boundary.pdf` — `f98d432c416ce087ee267333638df32c56cc4c68a7e6395f50d91465067bb269`
- expected pages 6 · requested scale 2.5
- built by VF11

### wa_vac_domestic_violence-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-domestic-violence-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` — `42e4e3447e6f49cc925cf52485e0861261e5de714c91c672d5d71014d624d48e`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-domestic-violence-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` — `fd2d21f7ca98376dd4c6ce63af548002b808b04ab388bc477f093370df5ea445`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### wa_vac_substance_use_disorder-set

- canonical `data/rcap-all50/overlays/census-v1/wa/wa-vac-substance-use-disorder-set--official-pdf-fill/fixtures/crrlj-09-0100-canonical-filled.pdf` — `846360e75578ce6233dba77b03b25545a529b50cd553ad31f88d3008b429a6ad`
- boundary `data/rcap-all50/overlays/census-v1/wa/wa-vac-substance-use-disorder-set--official-pdf-fill/fixtures/crrlj-09-0100-boundary-filled.pdf` — `75fac347051d6b710015ef5bbcc10b43df0a1de59078195ede75a744f4c42b77`
- expected pages 5 · requested scale 2.5
- built by (no builder lane recorded)

### wi_nc_doj_challenge-set

- canonical `data/rcap-all50/overlays/census-v1/wi/wi-nc-doj-challenge-set--official-pdf-fill/fixtures/canonical.pdf` — `edb7338200e12436a22390b6857b54bb0b44d074abc745b5c02c158f85457b4f`
- boundary `data/rcap-all50/overlays/census-v1/wi/wi-nc-doj-challenge-set--official-pdf-fill/fixtures/boundary.pdf` — `365d25ebf98bc23dba12805e97f985d6f39fc2403cec591b9646a6be8f35596e`
- expected pages 2 · requested scale 2.5
- built by VF02

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
FAMILIES ASSIGNED: 14
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
