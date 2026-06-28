# Drop-in asset guide

The homepage is wired so your real assets appear automatically when you add a
file with the right name to `assets/`. No code change needed for any of these —
just export, name, and drop the file in. If a file isn't present, the page shows
a clean built-in fallback (mock UI or branded text lockup), so the page always
looks finished.

## The slots

| Drop this file into `assets/`            | Where it appears            | Replaces                       |
|------------------------------------------|-----------------------------|--------------------------------|
| `shot-briefcase.png` (or .webp/.jpg)     | Expungement.ai flagship     | the Briefcase mock UI          |
| `shot-partner.png` (or .webp/.jpg)       | Partner section             | the dark dashboard mock        |
| `photo-founders.jpg` (or .png/.webp)     | Founder story               | the gradient + LE-mark block   |
| `logo-recordshield.svg` (or .png)        | Products + roadmap cards    | the "RecordShield" text lockup |
| `logo-claimcoach.svg` (or .png)          | Products + roadmap cards    | the "Claim Coach" text lockup  |
| `logo-startapart.svg` (or .png)          | Products + roadmap cards    | the "StartApart" text lockup   |

(Wilma's avatar is already in `assets/wilma.png` and already used in the
Briefcase. The hero "What do you need help with?" panel is a live animated
component on purpose — it is not a screenshot slot.)

## Ideal specs

**Product screenshots** (`shot-briefcase`, `shot-partner`)
- Format: PNG or WebP (WebP preferred for size). JPG works.
- Size: ~1200 x 900 (4:3) or wider; it scales to the column width.
- Content: the real product UI. For the partner shot, a dark UI matches the
  section. Crop out the OS menu bar / desktop; the page adds its own frame.

**Founder photo** (`photo-founders`)
- Format: JPG (or PNG/WebP).
- Aspect: portrait 4:5, ~1000 x 1250. It fills a 4:5 frame with `object-fit:
  cover`, so center the subject(s).
- Style: editorial, clean background (navy or Porcelain), no courtroom props.
  Real photography only — don't substitute stock or generated images here.
- One image holds both founders, or swap the frame to two stacked portraits if
  you prefer (ask and I'll split it).

**Product logos** (`logo-recordshield`, `logo-claimcoach`, `logo-startapart`)
- Format: SVG strongly preferred (crisp at any size). Transparent PNG ~400px
  wide is the fallback.
- They render at 30px tall, max 170px wide, `object-fit: contain`. If your three
  logos differ a lot in proportion, send them over and I'll normalize the
  optical sizing so the 2x2 grid stays even.
- Keep them a family: same construction, differ only by accent. The built-in
  fallback already follows this (LE-style square node + name, accent per
  product) if you want to match it.

## Screenshot framing: shell vs flat

There's one toggle at the top of `_build/gen.py`:

    SHOT_STYLE = "shell"   # "shell" | "flat"

- `"shell"` wraps each screenshot in a browser chrome (three dots, rounded
  window, soft shadow). Reads as "this is a live product." Default.
- `"flat"` shows the screenshot borderless in a soft rounded card. Cleaner and
  more modern; use it if your screenshots already include their own chrome.

Change the one line and rebuild (`python3 _build/gen.py`) to flip the whole
site. Recommendation: shell for the Briefcase and partner dashboard.

## After you add assets

If you're using the multi-file version, just drop files into
`legalease-homepage/assets/` and rebuild from `_build/gen.py`. The corner
placeholder labels (e.g. "expungement-ai-briefcase") only show while the mock
fallback is visible; once a real file is present, the label disappears with it.

To hide the placeholder labels everywhere even on remaining mocks, delete the
`.frame > .ph` rule in `styles.css`.
