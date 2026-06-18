# LegalEase — Design Tokens & System

The full design system used across all five pages. Values are pulled directly from the CSS — these are exact, not approximations. Use them to build a token file, Tailwind config, or component library.

---

## Color

| Token | Hex / value | Use |
|-------|-------------|-----|
| `--bg` | `#FAFBFC` | Default page background (near-white) |
| `--bg-soft` | `#EFF1F6` | Soft section backgrounds, cards, address blocks |
| `--navy` | `#18186C` | Primary brand navy — headings, nav, primary surfaces |
| `--navy-deep` | `#0E0E40` | Darkest navy — cinematic stage, header bands, theme-color |
| `--navy-soft` | `#26266F` | Mid navy — secondary navy surfaces |
| `--orange` | `#F04800` | Primary accent / CTA — buttons, emphasis, the brand "node" |
| `--orange-deep` | `#C93C00` | Hover/pressed state for orange |
| `--teal` | `#1F8F88` | Secondary accent — "live" dots, eyebrows, success |
| `--ink` | `#1A1A2E` | Primary body text |
| `--ink-soft` | `#54546F` | Secondary text, descriptions |
| `--silver-soft` | `#9AA0B8` | Muted labels, captions, placeholders |
| `--line` | `rgba(24,24,108,.12)` | Default borders |
| `--line-soft` | `rgba(24,24,108,.07)` | Subtle dividers |

Status colors in use: orange = "in build"/live-record, teal = "in beta"/"live for partners". The `theme-color` meta is `#0E0E40`.

---

## Typography

Three families, loaded from Google Fonts:

| Token | Stack | Use |
|-------|-------|-----|
| `--display` | `'Fraunces', Georgia, serif` | Headlines, section titles, product names, blockquotes |
| `--body` | `'Inter', system-ui, sans-serif` | All body copy, UI, buttons, forms |
| `--mono` | `'JetBrains Mono', monospace` | Eyebrows, labels, status tags, dates, addresses (uppercase + letter-spaced) |

Google Fonts link (in every page `<head>`):
```
Fraunces: opsz 9..144, weights 400,500,600,700
Inter: weights 400,500,600,700,800
JetBrains Mono: weights 400,500,600
```

**Type patterns:**
- Display headlines: Fraunces 600, large `clamp()` sizes, `letter-spacing: -.02em` to `-.03em`, line-height ~1.05–1.2. Emphasis words set in Fraunces *italic* + `--orange`.
- Eyebrows / labels: JetBrains Mono 600, ~11–12px, `letter-spacing: .16em–.22em`, `text-transform: uppercase`, usually `--teal` or `--silver-soft`.
- Body: Inter 400, ~15.5–16px, line-height ~1.55–1.6, `--ink-soft`.

---

## Shape, depth, motion

- **Radii:** cards ~18–22px; large panels/hero 22–28px; pills/chips 100px (fully round); inputs 11–12px; small tags 6–8px.
- **Shadows:** soft, navy-tinted, large-offset. Card resting: `0 10px 30px -18px rgba(24,24,108,.35)`. Elevated/hover: deeper. Floating elements (chat panel, FAB): `0 30px 80px -20px rgba(14,14,64,.55)`.
- **Borders:** 1px `--line` default; 1.5px on interactive inputs; selected/active state switches border to `--orange`.
- **Transitions:** 0.2–0.25s on transform/color/border for hovers; lifts use `translateY(-2px to -3px)`.
- **Glows:** radial-gradient accent glows (teal top, orange bottom) used on dark surfaces (header bands, hero, chat). Subtle, low-alpha.
- Respect `prefers-reduced-motion` — animations are disabled under it; preserve that.

---

## Layout

- **Content max-width:** ~1080–1140px centered for doc/catalog sections.
- **Section padding:** `clamp()`-based, roughly `clamp(32px,5vw,64px)` vertical on standard sections, larger on hero/header bands.
- **Fixed nav height:** ~64–80px; anchor targets carry `scroll-margin-top: 80px`.
- **Grid:** product catalog and form rows use `repeat(auto-fit, minmax(...))` responsive grids.
- **Breakpoints in use:** ~520px (mobile chat fullscreen), ~760–860px (stack two-column layouts to one), ~820px.

---

## Component patterns (reference)

- **Buttons (primary):** `--orange` bg, white text, Inter 600, radius ~11–12px, orange glow shadow; hover → `--orange-deep` + slight lift.
- **Cards:** white bg, `--line` border, soft navy shadow, radius ~18px; hover lifts and warms border toward orange.
- **Status tag:** mono, uppercase, small; teal tint for beta/partner-live, orange tint for in-build.
- **Pills/chips (selectable):** round, `--line` border default → `--orange` border + faint orange bg when selected.
- **Eyebrow + headline + subline** is the repeating section-intro rhythm (mono eyebrow → Fraunces headline with one italic-orange emphasis → Inter subline in `--ink-soft`).
- **Dark header band** (legal pages, chat header): `--navy-deep`, white text, teal eyebrow, subtle radial glow.

---

## Voice / copy (so design changes don't break tone)

The brand voice is direct, grounded, plain-spoken — no corporate fluff, no em dashes in copy, sentence-case warmth. Headlines make a point; emphasis is carried by a single italic-orange phrase, not bold everywhere. Keep this if you extend the design into new screens.
