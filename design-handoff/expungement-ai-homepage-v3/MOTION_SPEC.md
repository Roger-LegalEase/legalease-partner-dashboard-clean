# Expungement.ai homepage V3 motion specification

## Motion principle

**The path draws. The interface stays calm.**

Motion must explain at least one of these:

1. Where the visitor is
2. What changed
3. What comes next
4. Where the product stops

If an animation explains none of them, remove it.

## Motion personality

The motion system is:

- Calm
- Precise
- Sequential
- Bounded
- Functional
- Quietly confident

It is not:

- Playful
- Elastic
- Cinematic for its own sake
- Gamified
- Celebratory
- Urgent
- Ambient

## Motion tokens

```css
:root {
  --motion-instant: 0ms;
  --motion-response: 120ms;
  --motion-snap: 160ms;
  --motion-panel: 240ms;
  --motion-section: 600ms;
  --motion-path: 760ms;
  --motion-hold: 120ms;
  --motion-ease: cubic-bezier(.7, 0, .3, 1);
  --motion-linear: linear;
}
```

These are defaults, not permission to animate every state.

## Choreography rule

Only one visual event leads at a time.

- If a route is drawing, panels do not move.
- If a panel is replacing another panel, the route is static.
- If a document layer shifts, surrounding copy does not fade or scale.
- If a Wilma message appears, the avatar, input, and surrounding section remain still.
- If the Briefcase progress cue is moving, no metrics count or pulse.

Simultaneous movement reads as decoration or urgency. This homepage should read as confidence.

---

# Core motion patterns

## 1. Orange route draw

### Purpose

Reveal the route and end on the documented next step.

### Implementation

```css
.route path {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  transition: stroke-dashoffset 760ms cubic-bezier(.7, 0, .3, 1);
}

.route[data-active="true"] path {
  stroke-dashoffset: 0;
}
```

### Rules

- Duration: 720 to 900ms, default 760ms
- Stroke: Action Orange
- Stroke width: 8px at 1440 to 1600 reference width
- Minimum stroke: 4px
- Line caps: square
- Line joins: miter
- Turns: 90 degrees only
- Trigger: first meaningful section intersection, once
- Never loop
- Never reverse on scroll
- Never use an arrowhead
- End in one filled orange square

### Hero-specific route rule

The hero route must remain below the three fact panels.

- Minimum clearance beneath the fact panels: 24px
- Minimum clearance from the Pause or Play control: 24px
- Route uses its own layer below interactive content
- Route may cross from the navy text field into the video field
- Route may not cross the headline, body, CTAs, legal boundary, cards, or control

Use `assets/hero-path-safe.svg` and `preview/hero-safe-zone-diagram.png` as the geometry references.

## 2. Directional panel replacement

### Purpose

Change a visible document, privacy explanation, state reference, or tab panel without dissolving the interface.

Preferred pattern:

```css
.panel {
  clip-path: inset(0 0 0 0);
  transition: clip-path 240ms var(--motion-ease);
}

.panel.is-exiting {
  clip-path: inset(0 100% 0 0);
}
```

Rules:

- Replace on a grid edge
- 240ms default
- No opacity-only dissolve
- No scale
- No page flip
- No spring bounce
- Content remains understandable without animation

## 3. Active row or document layer

### Purpose

Show selection without pretending a document is floating.

Rules:

- Background or border response: 120 to 180ms
- Maximum translation: 18px desktop, 8px mobile
- No scale above 1.0
- No new shadow on selection
- Active state remains obvious with motion disabled
- Selected state uses a rule, square, label, or position in addition to color

## 4. Focus and hover

### Purpose

Confirm interactivity.

Rules:

- Response: 120ms
- Use a background cut, rule change, orange edge, or 3px maximum CTA shift
- Keyboard focus is at least as visible as hover
- Do not rely on color alone
- Do not animate body copy

## 5. Section reveal

### Purpose

Reveal product evidence without hiding the section's meaning.

Rules:

- Text is already present
- Product or document panel may clip into place over 240 to 600ms
- No wall of staggered fades
- No default upward float
- No reveal that delays comprehension

---

# Section choreography

## Announcement and header

- Header overlays hero on first render.
- After the hero threshold, header background cuts to Warm White over 140ms.
- Text and border colors change in the same event.
- Do not slide the entire header unless production behavior already requires it.
- Navigation underline reveals from left to right over 160 to 180ms.

## Hero video

### First render

1. Poster image renders immediately.
2. Headline, copy, CTAs, fact panels, and legal boundary are already visible.
3. Video begins playback when allowed.
4. No crossfade is required if poster and first video frame are color-matched.
5. Orange route draws once after layout is stable.

### Playback

- Autoplay: allowed only when motion is allowed and Save-Data is false
- Muted: always
- Loop: yes
- Plays inline: yes
- No audio track in shipped optimized file
- No time-based text changes
- No video-synchronized copy

### Pause or Play control

- Control updates immediately.
- `aria-pressed="true"` means manually paused.
- Label switches between “Pause background video” and “Play background video.”
- No morphing icon is required.

### Reduced motion

- Video remains paused or hidden.
- Poster remains visible.
- Route appears complete.
- No information is removed.

## The barrier

1. Section becomes active.
2. Orange route draws once.
3. Photography remains static.
4. Optional hover crop change may scale no more than 1.025 over 600 to 700ms.
5. No auto-pan or Ken Burns effect.

## Free guided check

1. Copy is visible.
2. Orange route draws.
3. Guided-check panel clips into place over 240 to 600ms.
4. Optional example-choice state changes over 120 to 180ms.
5. No progress-to-completion animation.

## How it works

1. Section route draws once.
2. Step visuals remain static while the route moves.
3. Focus or hover may change a top rule, step number, or detail label in 120 to 180ms.
4. Do not auto-cycle steps.
5. Do not animate all three panels as a cascade.

## Briefcase

Purpose: use controlled movement to make the real screenshot feel active without modifying the product UI.

Sequence:

1. Screenshot is visible immediately.
2. External progress detail panel replaces or clips into place over 240ms.
3. Hold 120ms.
4. A thin progress cue travels once across a separate supporting rule in 760ms.
5. Motion stops.

Rules:

- No screenshot float
- No rotation
- No perspective tilt
- No pulsing metrics
- No count-up numbers
- No 100 percent completion
- No animated changes inside the screenshot unless they reflect real product behavior

## What you get

1. Route draws to the first document.
2. Active document shifts 18px desktop or 8px mobile.
3. Selecting another document moves the offset to the chosen layer.
4. Explanatory copy replaces over 240ms.
5. Sheets do not fan, rotate, float, or cast shadows.

## Pricing

1. Route draws through the cost sequence and ends at Start free.
2. The $50 row may cut to Warm White when it enters the viewport.
3. Numbers do not count upward.
4. No lawyer price appears.
5. No progress animation moves toward purchase.
6. CTA hover movement is limited to 3px.

## Privacy

1. Route draws to the ledger.
2. Active row holds an orange left rule.
3. Selecting another row changes the rule immediately.
4. Explanation panel replaces left to right in 240ms.
5. No green checkmark appears.
6. No shield or lock lands as an approval animation.

## Wilma live-chat preview

The chat demonstrates sequence, not typing intelligence.

Sequence:

1. User bubble clips in over 240ms.
2. Hold 180ms.
3. Wilma bubble clips in over 240ms.
4. Motion stops.

Rules:

- No typewriter effect
- No blinking “thinking” dots unless they are part of the real production chat and reviewed
- No bouncing avatar
- No voice playback
- No auto-scroll that moves the section unexpectedly
- Input remains static unless connected to the real launcher
- Reduced motion shows both messages immediately

## Coverage

1. Section enters.
2. Orange route draws once.
3. Selected state is already visible.
4. On selection, previous cell cuts to Warm White.
5. New cell cuts to Deep Navy.
6. Orange corner terminus relocates with the selected state.
7. State reference text replaces in 160 to 240ms.
8. Do not animate all 51 cells.

## FAQ

- Button state updates immediately.
- Answer panel opens or closes over about 220ms.
- Use height plus clip or a grid-row transition.
- No spring.
- No plus-icon spin beyond a simple 90-degree change if used.
- Screen-reader state changes immediately through `aria-expanded`.

## Final CTA

1. Route enters from the left.
2. One 90-degree turn is preferred.
3. Route ends at or immediately before the Start free CTA.
4. CTA may shift 3px on hover.
5. No pulse, glow, or urgency animation.

---

# Page rail

The 8-pixel left page rail may fill with scroll progress.

Implementation:

- Passive scroll handler or `requestAnimationFrame`-throttled update
- No continuous geometry polling for section motion
- Orange fill only
- Rail is decorative and `aria-hidden`
- Reduced motion does not require disabling the fill because it is a direct position indicator, but the implementation may choose to leave it static if needed

---

# Prohibited motion

- Parallax
- Scroll-jacking
- Sticky horizontal scroll galleries
- Continuous floating or breathing cards
- Animated gradients
- Particle dissolves
- Shredding, burning, erasing, or scattering documents
- Green checkmarks landing on a record
- 100 percent completion as a legal outcome
- Countdown timers
- Springy CTA buttons
- Cursor-following blobs
- Logo intros
- Typewriter effects on legal or privacy copy
- Confetti or celebration tied to a result
- Motion that delays access to essential information

---

# Performance constraints

- Prefer SVG stroke animation, transform, and clip-path.
- Use IntersectionObserver for one-time section activation.
- Use passive scroll only for the page rail.
- Do not add GSAP, Framer Motion, or Lottie solely for this homepage if native CSS and SVG cover the behavior.
- Do not permanently apply `will-change`.
- Avoid blur and filter animation.
- Reserve exact component dimensions to prevent layout shift.
- Lazy-load noncritical assets.
- Do not animate large raster images continuously.

---

# Reduced-motion behavior

With `prefers-reduced-motion: reduce`, a manual reduction setting, or an applicable data-saving mode:

- Hero video shows the poster and does not autoplay.
- Paths render in their completed state.
- Panel and detail swaps happen without transitional motion.
- Wilma messages are both visible.
- Selected states remain clear.
- FAQ content remains operable.
- No content is removed.
- Smooth scrolling becomes auto.

Reduced motion is the same information without temporal dependency.

---

# Motion validation checklist

- [ ] Only one leading event occurs at a time.
- [ ] Hero route clears all three fact panels by at least 24px.
- [ ] No route crosses copy, controls, or people.
- [ ] Video has no audio track.
- [ ] Video Pause or Play state is accessible.
- [ ] Poster-only mode works.
- [ ] Briefcase motion runs once and stops.
- [ ] Wilma uses message reveals, not typewriter animation.
- [ ] Coverage does not animate all cells.
- [ ] FAQ state remains clear with animation disabled.
- [ ] No prohibited motion appears.
- [ ] No motion delays comprehension.
