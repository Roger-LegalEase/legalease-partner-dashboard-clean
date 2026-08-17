# Hero video implementation guide

## Included source and production assets

| File | Role | Ship? |
|---|---|---|
| `assets/hero-background-original.mp4` | Original supplied 1920 × 1080 source with audio | No, archive only |
| `assets/hero-background.mp4` | Optimized 1600 × 900 H.264, 30 fps, silent | Yes |
| `assets/hero-poster.webp` | Desktop poster and reduced-motion fallback | Yes |
| `assets/hero-poster.jpg` | Desktop poster fallback | Yes |
| `assets/hero-poster-mobile.webp` | Mobile poster | Yes |
| `assets/hero-poster-mobile.jpg` | Mobile poster fallback | Yes |
| `preview/hero-video-contact-sheet.jpg` | Art-direction check across the video | No, handoff reference |
| `preview/hero-safe-zone-diagram.png` | Desktop composition and route clearance guide | No, handoff reference |
| `assets/hero-path-safe.svg` | Route geometry reference | Optional, can be inlined |

The original upload is approximately 28.5 seconds, 1920 × 1080, H.264, 60 fps, with AAC audio. The optimized production file is approximately 4.7 MB, 1600 × 900, 30 fps, H.264, and silent.

## What Roger should hand to Codex

Give Codex the lean package and tell it to use:

- `assets/hero-background.mp4` for production playback
- `assets/hero-poster.webp` and `.jpg` for desktop poster fallback
- `assets/hero-poster-mobile.webp` and `.jpg` for mobile poster fallback
- `preview/hero-safe-zone-diagram.png` for composition
- `assets/hero-path-safe.svg` for route geometry
- `components/HeroVideo.tsx` and `HeroVideo.module.css` as a starter, not a required final file location

Do not ask Codex to ship the original 14 MB video unless testing proves the optimized file is unacceptable.

## Composition requirements

### Desktop

- Video is full bleed and fills the hero.
- The left 48 to 56 percent is a hard translucent Deep Navy text panel.
- The moving subject remains in the right visual field.
- Headline, body, CTAs, proof cards, and legal boundary stay inside the left panel.
- Subtle vertical grid lines may cover the entire hero at low opacity.
- The orange route sits below the proof cards with at least 24 pixels of clearance.
- The route ends before the Pause or Play control.
- The video control sits in the lower-right video field.

### Mobile

- Use the mobile poster or the video behind a full-width 88 to 92 percent Deep Navy overlay.
- Text stays left aligned.
- CTAs stack.
- Proof facts stack.
- Hide the desktop route unless a clean mobile route can avoid controls and copy.
- Poster-only is acceptable and preferred on reduced motion or Save-Data.

## Semantic implementation

Use a real `<video>` element. Do not use a CSS `background-image` hack for video.

Recommended markup:

```tsx
<section className={styles.hero} aria-labelledby="hero-title">
  <video
    ref={videoRef}
    className={styles.video}
    autoPlay={!posterOnly}
    muted
    loop
    playsInline
    preload="metadata"
    poster="/path/to/hero-poster.jpg"
    tabIndex={-1}
    aria-hidden="true"
  >
    <source src="/path/to/hero-background.mp4" type="video/mp4" />
  </video>

  <picture className={posterOnly ? styles.posterVisible : styles.poster} aria-hidden="true">
    <source srcSet="/path/to/hero-poster.webp" type="image/webp" />
    <img src="/path/to/hero-poster.jpg" alt="" />
  </picture>

  <div className={styles.heroPanel}>
    {/* approved copy, CTAs, proof cards, boundary */}
  </div>

  <button
    type="button"
    aria-pressed={manuallyPaused}
    aria-label={manuallyPaused ? "Play background video" : "Pause background video"}
    onClick={toggleVideo}
  >
    {manuallyPaused ? "Play background video" : "Pause background video"}
  </button>
</section>
```

The video is decorative. The control is functional and must be exposed to assistive technology.

## Playback logic

The video may autoplay only when:

- `prefers-reduced-motion` is not `reduce`
- Save-Data is not enabled
- The visitor has not manually paused it
- The browser permits autoplay

Recommended client logic:

```ts
const media = window.matchMedia("(prefers-reduced-motion: reduce)");
const saveData = navigator.connection?.saveData === true;
const posterOnly = media.matches || saveData;

useEffect(() => {
  const node = videoRef.current;
  if (!node || posterOnly || manuallyPaused) {
    node?.pause();
    return;
  }

  node.muted = true;
  node.play().catch(() => {
    setManuallyPaused(true);
  });
}, [posterOnly, manuallyPaused]);
```

TypeScript projects may need a local type extension for `navigator.connection`.

## CSS structure

Use a hard panel, not a gradient.

```css
.hero {
  position: relative;
  min-height: 820px;
  height: min(910px, 100svh);
  overflow: hidden;
  color: #F7F4EE;
  background: #071B33;
}

.video,
.poster {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
}

.heroPanel {
  position: relative;
  z-index: 3;
  width: min(760px, 56vw);
  min-height: 100%;
  padding: 170px max(48px, calc((100vw - 1240px) / 2)) 70px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: rgb(7 27 51 / 88%);
  border-right: 1px solid rgb(247 244 238 / 18%);
}
```

Do not use a left-to-right CSS gradient. The hard panel is part of the design system and provides predictable contrast across every video frame.

## Proof-card and route geometry

The overlap problem occurs when the route is positioned within the same vertical band as the proof cards.

Correct layering:

```css
.proofCards {
  position: relative;
  z-index: 3;
  margin-bottom: 74px;
}

.heroRoute {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 18px;
  z-index: 2;
  height: 145px;
  pointer-events: none;
}
```

Use route geometry similar to:

```svg
<path d="M0 46 H520 V122 H1432" />
<rect x="1424" y="114" width="16" height="16" />
```

Acceptance rules:

- 24px minimum gap beneath proof cards
- 24px minimum gap from video control
- Route is behind interactive content
- Route never crosses body copy or buttons
- On mobile, hide it rather than forcing a broken route

## Poster behavior

The poster has four jobs:

1. First render before video decode
2. Reduced-motion fallback
3. Save-Data fallback
4. Autoplay failure fallback

The desktop poster matches the hero composition with a left text-safe field and a right subject field. The mobile poster crops the subject for a vertical frame, then relies on a full-width navy overlay for readable copy.

Use `<picture>` so WebP is preferred and JPEG remains available.

## Pause or Play control

Requirements:

- Minimum 44 × 44 pixels
- Visible on desktop and tablet when video is active
- Accurate text label
- Accurate `aria-pressed` state
- High-contrast border
- Does not overlap the route terminus
- Does not autoplay sound
- Hidden when poster-only mode is active

Do not use the browser's full video controls for a decorative background.

## Reduced motion

CSS baseline:

```css
@media (prefers-reduced-motion: reduce) {
  .video { display: none; }
  .poster { display: block; }
  .heroRoute path {
    stroke-dashoffset: 0;
    transition: none;
  }
}
```

JavaScript should also pause the video. CSS alone should not leave a hidden video decoding and looping in the background.

## Save-Data

Where supported:

```ts
const saveData = navigator.connection?.saveData === true;
```

When Save-Data is true:

- Do not autoplay
- Show the poster
- Do not preload the entire MP4
- Hide the video control because no background motion is active

## Preload and Largest Contentful Paint

Recommended default:

```html
<video preload="metadata" poster="hero-poster.jpg">
```

The poster should satisfy first paint. Do not block Largest Contentful Paint on the video file.

Measure production behavior before changing to `preload="auto"`.

## Video processing commands

The package already includes the optimized file. These commands document how to regenerate it.

### Optimized H.264, silent, 1600 × 900, 30 fps

```bash
ffmpeg -i "hero-background-original.mp4" \
  -an \
  -vf "scale=1600:900:force_original_aspect_ratio=decrease,pad=1600:900:(ow-iw)/2:(oh-ih)/2,fps=30" \
  -c:v libx264 \
  -preset slow \
  -crf 24 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  "hero-background.mp4"
```

### Desktop poster

Choose a frame that preserves the left text-safe field and right subject field.

```bash
ffmpeg -ss 00:00:00.200 -i "hero-background-original.mp4" -frames:v 1 -q:v 2 "hero-poster.jpg"
```

Convert to WebP:

```bash
cwebp -q 82 "hero-poster.jpg" -o "hero-poster.webp"
```

### Verify no audio stream

```bash
ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "hero-background.mp4"
```

Expected output: no rows.

### Verify video metadata

```bash
ffprobe -v error \
  -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate,pix_fmt,channels \
  -of json \
  "hero-background.mp4"
```

## Browser considerations

### Safari and iOS

- Use `playsInline`
- Ensure `muted` is present in markup and set as a DOM property before calling `play()`
- Keep H.264 and `yuv420p`
- Use `+faststart`
- Test after navigating back from another page

### Chrome and Edge

- Muted autoplay should work
- Catch `play()` rejection
- Save-Data may be available through `navigator.connection`

### Firefox

- Test autoplay preference behavior
- Poster fallback must remain complete if autoplay is blocked

## Production path guidance

Codex must inspect the repository and place assets in the existing public-asset structure. Do not blindly create these paths if the repository uses another convention.

A typical Next.js public structure could be:

```text
public/
  expungement-ai/
    hero/
      hero-background.mp4
      hero-poster.webp
      hero-poster.jpg
      hero-poster-mobile.webp
      hero-poster-mobile.jpg
```

The component should then reference root-relative public URLs.

## Validation checklist

- [ ] Video uses the optimized silent file.
- [ ] Original source is not shipped to production.
- [ ] Poster appears before playback.
- [ ] No white or black flash occurs at loop boundaries.
- [ ] Copy remains readable in every frame.
- [ ] Moving subject stays in the right field on desktop.
- [ ] Hero route clears proof cards.
- [ ] Pause or Play control works by keyboard and pointer.
- [ ] Control name and state are accurate.
- [ ] Reduced motion is poster-only.
- [ ] Save-Data is poster-only where supported.
- [ ] Mobile hero has no horizontal overflow.
- [ ] Video does not become an unexpected bandwidth burden.
- [ ] No audio can play.
