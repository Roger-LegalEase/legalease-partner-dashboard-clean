# Expungement.ai Homepage V3 Asset Manifest

## Source archive

- Repository path: `Website redesign.zip`
- Supplied expected SHA-256: `6f53b4851b092b0bf9214ce286ee3b8be2c9083f5ff9a91b05d5f88106291bf7`
- Observed SHA-256: `859edfbc40386f6ed3cf75b2c64a9858161b0440bcac4bd8734107ca29995e84`
- Disposition: the original archive remains untouched and untracked. Its contents were inventoried from an isolated temporary extraction before any package file was used.

The observed archive hash differs from the supplied hash. The archive is readable and contains the documented V3 design handoff plus the approved hero source. The source video is named `Hero Background Video.mp4` in this archive rather than `expungement-ai-hero-approved.mp4`. Its duration, codec, resolution, frame rate, audio layout, and byte size match the original-media description in `HERO_VIDEO_IMPLEMENTATION.md`, so it is the unambiguous approved source identified by the user.

## Normalized handoff files retained

- `DESIGN_BRIEF.md`
- `COPY_DECK.md`
- `COMPONENT_INVENTORY.md`
- `HERO_VIDEO_IMPLEMENTATION.md`
- `MOTION_SPEC.md`, normalized from `MOTION_SPEC(3).md`
- `SKILL.md`, normalized from `SKILL(2).md`
- `tokens/homepage-tokens.css`
- `tokens/homepage-tokens.json`
- `references/homepage-design-reference.png`
- `references/hero-safe-zone-diagram.png`
- `references/hero-path-safe.svg`
- Adaptation references in `starter-components/`

These starter files are preserved as handoff evidence only. Production components were adapted to the repository's routing, localization, assets, analytics, accessibility, and server-rendering conventions.

## Production assets added

| Asset | Source and treatment | SHA-256 |
| --- | --- | --- |
| `public/expungement-ai/hero/expungement-ai-hero-approved.mp4` | Encoded only from package `Hero Background Video.mp4`; silent H.264, 1600x900, 30 fps, yuv420p, fast-start | `89c84e00e917ec56c9668542d3f52355731c104aa18aaa17d99f8197fcca7bbe` |
| `public/expungement-ai/hero/expungement-ai-hero-poster.jpg` | Desktop first-frame poster derived from the approved package video | `10ef2188580b2ced2af845830d2a46c63573ad307d2c13eace1d298265616dfc` |
| `public/expungement-ai/hero/expungement-ai-hero-poster.webp` | Optimized WebP desktop poster | `a147f7703fab9082b451ccd4a01716bb5f13f5183d5959ab0c342a44bf4563f5` |
| `public/expungement-ai/hero/expungement-ai-hero-poster-mobile.jpg` | Mobile crop derived from the approved package video | `cea046c64bc37cdcfa2e615479a36259082d9a1810a9c3db7474e7e6078ab9cb` |
| `public/expungement-ai/hero/expungement-ai-hero-poster-mobile.webp` | Optimized WebP mobile poster | `aff9cfd6d0d634a38b62bda6813fc8c0a65c6024aadd8fb794a995e634002f6b` |

Approved package source video SHA-256: `2d571818f08000b532d46e956f01bac63c185c711f26dc67fe93591aedb14faa`.

## Existing repository assets reused

- Approved Expungement.ai vector wordmark component
- `public/expungement-ai/evidence-economic.webp`
- `public/expungement-ai/evidence-access.webp`
- `public/expungement-ai/evidence-opportunity.webp`
- `public/expungement-ai/shot-eligibility.webp`
- `public/expungement-ai/shot-briefcase.webp`
- `public/expungement-ai/wilma-avatar.webp`

The repository guided-check and Briefcase screenshots are the current canonical assets and match the package fallbacks byte-for-byte at their PNG sources. The latest repository Wilma asset was used instead of the package fallback.

## Package files deliberately omitted

- Raw ZIP and raw source MP4
- `__MACOSX/` and AppleDouble files
- `FREE_SKILLS_TO_INSTALL.md`
- `component-lab.html` and component-lab screenshot exports
- Desktop and mobile composite screenshots
- Guided-check and Briefcase screenshot duplicates
- `shot-result-reference-only.png`, which contains retired public wording
- Package Wilma fallback
- `icons.svg`, because the production composition uses the approved repository logo and native geometric marks
- Both `ChatGPT Image Aug 16, 2026, 06_09_24 AM.png` and `ChatGPT Image Aug 16, 2026, 06_09_27 AM.png`; they are byte-identical (`46a17999679357d38852d7411bb79b197158e1a98702f25b31894cc4063901d6`) and are not production sources

## Known package gaps

- `CODEX_BUILD_PROMPT.md` is absent; the user prompt is the controlling build prompt.
- `RESPONSIVE_SPEC.md` is absent; responsive requirements are supplied in the user prompt and retained package documents.
- `ACCESSIBILITY_AND_QA.md` is absent; accessibility and QA requirements are supplied in the user prompt and retained package documents.
- No optimized production video or poster files were included, so they were generated exclusively from the approved package video and verified with `ffprobe`.
