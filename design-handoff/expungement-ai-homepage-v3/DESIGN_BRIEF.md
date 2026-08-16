# Expungement.ai homepage redesign V3

## Purpose of this package

This package is the complete design and implementation brief for the next Expungement.ai consumer homepage. It translates the approved full-page PNG into a buildable system, incorporates the supplied hero video and current product imagery, locks public copy to the approved draft, and gives Codex exact motion, responsive, accessibility, performance, and verification requirements.

This is not a request to imitate the PNG pixel for pixel. The PNG is the canonical composition and art-direction reference. The production implementation must preserve the existing application's routes, state handoff, authentication, analytics, localization, privacy links, legal logic, and consumer funnel while replacing the homepage presentation layer.

## Source hierarchy

When sources conflict, follow this order:

1. This design brief and the Codex production prompt
2. The approved website copy draft
3. The copy audit and stop-ship terminology rules
4. The supplied design-direction file
5. The supplied motion specification
6. The current production repository for routes, interactions, localization, analytics, and current asset paths
7. The package's current-site screenshot exports as visual references
8. The attached PNG as the canonical visual composition

The PNG can show a visual idea that is not approved as public copy. Copy and legal scope always come from the approved sources and the production application.

## Executive design thesis

The homepage should feel like a well-designed public instrument rather than a familiar SaaS landing page.

The interface exposes structure instead of asking the visitor to trust a badge. Jurisdictions become an index. Documents become a filing set. Privacy becomes a ledger. Pricing becomes a cost sequence. Wilma becomes a bounded guide. The orange route becomes the one visible next step.

The experience should feel:

- Clear
- Human
- Specific
- Calm
- Quietly defiant
- Modern
- Innovative
- Trustworthy

The experience should not feel:

- Like a generic legal-tech template
- Like a courthouse website
- Like a startup discount page
- Like an AI chatbot product
- Like a celebration of a legal result that has not happened
- Like a wall of rounded cards and green checks

## The memorable idea

**One route. One next step.**

Each major composition may use one Action Orange route. The route enters from an edge, crosses a meaningful boundary, and ends in a filled square at the next step. It is not decoration. It is the visual promise that the page will not leave the reader stranded.

The route must never:

- Cross body copy
- Cross a person's face or body
- Cross a button or form control
- Cross the three proof cards in the hero
- Use a curve, diagonal, arrowhead, or loop
- Compete with another orange route in the same composition

## Core visual system

### Color

| Token | Hex | Role |
|---|---:|---|
| Deep Navy | `#071B33` | Privacy, boundaries, institutional proof, dark section ground |
| Deep Navy 2 | `#0C294A` | Active dark rows and secondary dark panels |
| Action Orange | `#FF3B00` | Primary action, route, route terminus |
| Progress Teal | `#0A8E9A` | Utility labels, operational states, supporting interaction |
| Teal 55 | `#6FBCC3` | Dark-ground supporting text and labels |
| Teal 12 | `#E4F0F1` | Supporting information, selected explanations, light technical field |
| Warm White | `#F7F4EE` | Consumer discovery and document surfaces |
| Paper | `#EFE9DE` | Synthetic document lines and quiet secondary surfaces |
| Slate | `#475A6E` | Body copy and secondary information |
| White | `#FFFFFF` | Product surfaces and high-contrast document panels |

Orange should occupy less than roughly ten percent of the visible page surface. It should mean action or next step every time it appears.

### Typography

- Display and body: Inter
- Utility, docket labels, state abbreviations, metadata, dates, and section numbering: IBM Plex Mono
- Headlines: left aligned, substantial, statement-led, and tightly tracked
- Body copy: sentence case, plain English, generous line-height
- Utility labels: uppercase, short, tracked, and functional
- Do not use decorative type purely for novelty
- Do not replace the approved type system because an external design skill prefers another font

Recommended desktop sizes:

| Use | Size | Line height | Notes |
|---|---:|---:|---|
| Hero headline | 72 to 86 px | .92 to .96 | Maximum about 11 characters per line group |
| Major section heading | 52 to 68 px | .96 to 1.0 | Left aligned |
| Supporting section heading | 28 to 36 px | 1.05 | Product modules and document labels |
| Body lead | 18 to 20 px | 1.55 to 1.65 | Maximum 55 to 60 characters per line |
| Body | 16 to 17 px | 1.55 to 1.65 | Never below 16 px in product-like sections |
| Utility | 10 to 11 px | 1.3 | Mono, tracked, uppercase |

### Geometry

- Hard 90-degree edges
- Zero-radius panels by default
- One-pixel shared rules
- No decorative drop shadows
- No glass effects
- No aesthetic gradients
- No soft blobs
- No oversized rounded containers
- No floating-card system
- Use intentional overlap only when it communicates layer, status, or sequence

### Grid

Desktop uses a 12-column grid inside a maximum content width of approximately 1240 pixels.

Recommended content width:

```css
--content: min(1240px, calc(100vw - 96px));
```

The page uses:

- 8-pixel fixed orange page rail on the far left
- 1-pixel rules between sections and panels
- 48 to 64 pixels between major columns
- 96 to 120 pixels vertical section padding on desktop
- 72 to 88 pixels on tablet
- 64 to 84 pixels on mobile

### Deliberate empty space

Empty space is a designed panel. It gives the eye a reset and prevents the page from feeling like a dashboard. Empty space is not permission for accidental dead zones.

A section has too much empty space when:

- The product screenshot feels stranded
- Copy and visual evidence do not share a baseline
- The next step is visually distant from the proof
- A large white area exists only because a grid column has no content

The Briefcase section should use controlled layered detail and progress emphasis to activate otherwise empty space without adding decorative clutter.

## Canonical page structure

The production homepage should follow this order:

1. Announcement strip and navigation
2. Video hero with three immediate facts
3. The barrier with current photography
4. Free guided check with the current product screen
5. Three-step product sequence
6. Full Briefcase demonstration
7. What you get, expressed through the document set
8. Transparent pricing sequence
9. Named privacy practices
10. Wilma live-chat demonstration
11. Coverage matrix plus state-at-a-glance reference
12. Approved FAQ content
13. Final Start free CTA and legal footer

The following previous sections are intentionally removed:

- Separate sample-packet section: redundant with the document set. The hero may retain a sample-packet CTA if the production route exists.
- Separate trust-credential section: blocked or redundant. Trust is demonstrated through product boundaries, pricing, privacy, source-aware state information, and visible next steps.
- Separate “why it matters” section: redundant with the barrier unless sourced evidence is added with visible publication and review metadata.
- Testimonials: not included without verified verbatim quotes, written and revocable consent, and approved stage labels.

---

# Section blueprints

## 00. Announcement strip and navigation

### Purpose

Orient the visitor immediately and provide the two high-value paths: start the guided check or log in.

### Public copy

Announcement:

> Free guided check. No account or payment to start.

Navigation:

- How it works
- What you get
- Price
- Trust & privacy
- Questions
- EN | ES
- Log in
- Start free

### Layout

- Announcement strip sits above the main navigation on Deep Navy.
- Main navigation overlays the hero at the top of the page.
- Header becomes a Warm White fixed header after the hero threshold.
- Use the repository's approved vector logo.
- Do not render a secondary tagline beneath the logo.

### Motion

- Header state change: 140ms color and border change.
- Navigation underline: 160 to 180ms right-edge reveal.
- No logo animation.

### Responsive

- Desktop shows full navigation.
- Mobile shows logo, Start free may remain visible if space permits, and a 44-pixel menu button.
- Mobile menu is a hard-edged full-width panel, not a rounded drawer.

### Acceptance criteria

- Correct route destinations
- Keyboard-operable menu
- Visible focus
- EN and ES parity
- No layout shift when header becomes fixed

## 01. Video hero

### Purpose

State the problem, explain the product boundary, and move the visitor toward the free guided check without selling certainty.

### Approved copy

Eyebrow:

> PRIVATE RECORD-CLEARING CHECK

Headline:

> The law is complicated. Your next step should not be.

Body:

> Start with a free guided check. Answer plain-English questions about your state, case, and outcome. If a supported self-help packet is available, review your information before paying $50 to generate it.

Actions:

- Start free
- See a sample packet

Facts:

- No account to begin
- No payment to start
- 50 states + D.C. screened

Boundary:

> Self-help document preparation. Not a law firm. The court or agency makes the final decision.

### Layout

- Full-bleed 16:9 video fills the hero.
- A hard translucent Deep Navy panel occupies approximately the left 48 to 56 percent on desktop.
- Text, CTAs, facts, and legal boundary remain inside the left panel.
- Moving people remain in the right field.
- Subtle vertical grid lines cross the hero at low opacity.
- The three fact panels sit above the route.
- The route maintains at least 24 pixels of clear space beneath the fact panels.
- The route ends in a square near the right edge and does not overlap the video control.

### Included assets

- `assets/hero-background.mp4`
- `assets/hero-background-original.mp4`
- `assets/hero-poster.webp`
- `assets/hero-poster.jpg`
- `assets/hero-poster-mobile.webp`
- `assets/hero-poster-mobile.jpg`
- `assets/hero-path-safe.svg`
- `preview/hero-safe-zone-diagram.png`
- `preview/hero-video-contact-sheet.jpg`

### Video behavior

- Autoplay when motion is allowed
- Always muted
- Loop
- Plays inline
- Visible Pause or Play control
- Poster first render
- Poster-only on reduced motion or Save-Data
- No audio track in the optimized file
- Do not use CSS background video. Use a semantic `<video>` element.

### Motion

1. Hero loads with poster and text already readable.
2. Video begins without a crossfade if playback is allowed.
3. Orange route draws once in 760ms.
4. Nothing else enters while the route draws.
5. The video loops without a flash or audio change.

### Responsive

Desktop:

- Left hard panel, right moving subject.
- Full route and fact row.

Tablet:

- Left panel expands to 65 to 72 percent.
- Maintain readable video subject field.

Mobile:

- Use the mobile poster or video with a full-width 88 to 92 percent navy overlay.
- Stack CTAs.
- Stack facts.
- Hide the horizontal hero route unless it can preserve meaning without crossing cards.
- Hide the video control when poster-only behavior is active.

### Acceptance criteria

- No proof-card overlap at any tested width
- Poster visible before video decodes
- No audio track
- Pause or Play label reflects state
- Reduced motion shows the complete hero without autoplay
- No essential information depends on the video
- No horizontal overflow at 390 pixels

## 02. The barrier

### Purpose

Name the continuing practical effect of a record without blaming the visitor or implying that a photographed person has a record.

### Approved copy

Eyebrow:

> THE BARRIER

Headline:

> The case ended. The record may still show up.

Body:

> An arrest, dismissal, misdemeanor, or conviction can still appear on a background check and affect work, housing, school, or licensing. Expungement.ai helps you explore which record-clearing paths may be available, then shows the next step.

Action:

> Start free

### Layout

- Left: headline, body, CTA, and deliberate void.
- Right: hard-edged three-image editorial field.
- Large worker image occupies the left side of the field.
- Paperwork and study images stack on the right.
- Labels describe everyday settings only:
  - Work and licensing
  - Housing
  - School and training
- Do not call people participants, customers, users, or people with records.

### Motion

- Orange route draws once around the composition.
- Photographs remain static.
- Optional hover crop shift is limited to 1 to 2 percent scale and is not essential.
- No Ken Burns effect.

### Responsive

- Tablet: copy above image field.
- Mobile: three images become a vertical editorial sequence.
- Preserve image labels outside faces.

## 03. Free guided check

### Purpose

Show the current product and reduce anxiety about starting.

### Approved copy

Eyebrow:

> FREE GUIDED CHECK

Headline:

> Start with what you know. We'll guide the rest.

Body:

> You do not need legal vocabulary to begin. We ask plain-English questions, explain confusing terms, and let you choose “Not sure” when you do not have an answer. If the facts do not support a clear route, the check stops before checkout.

Supporting points:

- Choose “Not sure” when you do not know.
- See explanations as you go.
- Stop at any time.
- No account required to begin.

Action:

> Start free

### Layout

- Teal 12 section ground.
- Copy on the left.
- Real guided-check screen on the right.
- Do not label it “Actual Product Screen.”
- Use a thin structured frame only when needed to distinguish the screenshot from the section ground.
- No browser-chrome theater unless the current product already shows it.

### Asset

- `assets/shot-guided-check.webp`
- `assets/shot-guided-check.png`

### Motion

- Product panel reveals by a 240 to 600ms directional clip.
- Text is visible before the panel reveal.
- Optional guided-choice example can update a short explanation at 120 to 180ms.
- Do not animate a progress bar to imply completion.

### Responsive

- Mobile copy first, screen second.
- Screenshot remains wide enough to read. Do not compress it into a tiny horizontal tile.

## 04. How it works

### Purpose

Explain the three product stages with three distinct visual jobs instead of forcing three screenshots into identical cards.

### Approved copy

Heading:

> Three steps. No legal maze.

Step 1:

> See which paths may be available.

> Answer plain-English questions about your state, case, and outcome. The check shows whether a supported record-clearing path may be available before you pay.

Step 2:

> Generate a supported self-help packet.

> Review your packet information first. Then pay $50 to generate the available documents and filing instructions for your matter.

Step 3:

> File it yourself with clear steps.

> Download your packet, follow the checklist for your court, and use your Briefcase to track what is ready, filed, or waiting.

### Layout

Dark Navy section with three unequal but aligned panels.

Step 1 visual:

- Cropped guided-check screen
- Show a real question and answer choices
- Preserve current product styling

Step 2 visual:

- Product-native packet review panel or document stack
- State, court, price, and next-step rows
- Do not use the retired result screenshot until its language is updated

Step 3 visual:

- Briefcase or filing-progress visual
- Use a focused crop or supporting illustration, not a third generic screenshot
- Show a current-step or filing-progress concept without implying a legal result

### Motion

- The section route draws once.
- Step panels remain static while it draws.
- When the user focuses a step, the active rule or supporting label changes in 120 to 180ms.
- Do not auto-play a three-card cascade.
- Do not loop between steps.

### Responsive

- Desktop: three panels in one row.
- Tablet: one lead panel plus two supporting panels, or one column if needed for legibility.
- Mobile: vertical numbered sequence with full-width visuals.

## 05. Briefcase proof

### Purpose

Make the free Briefcase feel like the command center for documents and next steps without inventing UI or leaving the screenshot stranded in white space.

### Approved copy

Eyebrow:

> YOUR BRIEFCASE

Headline:

> Your documents and next steps, in one place.

Body:

> Legal terms explained. Documents organized. One next step at a time. Your Briefcase keeps each supported matter, available document, and filing step together.

Optional supporting points:

- See each matter and its current stage.
- Download available self-help documents.
- Follow the filing instructions in your packet.
- Track what is ready, filed, or waiting.
- Ask Wilma to explain confusing steps in plain English.

Use only three short points in the visible layout. The full set may be represented within the screenshot or accessible copy.

### Layout

- Real Briefcase screenshot is the main evidence.
- Screenshot occupies approximately eight columns on desktop.
- Copy occupies four columns.
- Add one external progress-detail panel and one thin progress cue to use the white space deliberately.
- The external detail must not obscure the screenshot's important content.
- Do not add “Actual Product Screen.”
- Do not redraw the dashboard.

### Asset

- `assets/shot-briefcase.webp`
- `assets/shot-briefcase.png`

### Motion

One-time sequence:

1. Screenshot is visible.
2. External progress detail cuts into place over 240ms.
3. A small progress cue travels once across a thin rule in 760ms.
4. Motion stops.

Do not:

- Float the dashboard continuously
- Tilt or rotate the screenshot
- Add a glowing halo
- Count metrics upward
- Fill a legal progress bar to 100 percent

### Responsive

- Mobile: copy first, screenshot second, progress detail becomes a full-width panel below the screenshot.
- Preserve screenshot legibility and declared aspect ratio.

## 06. What you get

### Purpose

Show the supported filing set visually and remove redundant bullet-heavy copy.

### Approved copy

Eyebrow:

> WHAT YOU GET

Headline:

> A self-help packet built from your answers.

Body:

> Record-clearing rules vary by state, court, case type, and outcome. When a supported packet is available, Expungement.ai uses your answers to generate the available documents and filing instructions for that matter.

Document types:

- Petition: Your request for record clearing.
- Proposed order: A document the judge may sign.
- Filing checklist: Where to file, what to bring, and what to expect.
- Court instructions: Where and how to file for the supported court.
- Fee-waiver guidance: How to ask the court to waive filing fees when that option is available.

### Layout

- Short copy block on the left.
- Five hard-edged document modules on the right or in a single horizontal filing set.
- Use synthetic document lines, not fake readable legal text.
- One selected document may move 18 pixels on desktop and 8 pixels on mobile.
- Selecting a document updates the short explanation panel.
- No separate sample-packet section below this one.

### Motion

- Selected document shifts without scaling.
- Explanation replaces with a 240ms directional clip.
- No paper fan, rotation, page turn, or drop shadow.

## 07. Pricing

### Purpose

Explain the economics in sequence without lawyer-price comparisons, discount framing, or excessive exclusions.

### Approved copy

Heading:

> $50 for one supported self-help packet.

Body:

> The guided check, Briefcase, and packet-information review cost nothing. Pay only when a supported packet is ready to generate.

Cost sequence:

1. Free guided check: $0
2. Supported self-help packet: $50
3. Court filing fee: Varies

Essential boundary:

> No subscription. Court filing fees are separate. Some courts offer fee waivers. When available, your filing instructions explain how to ask.

What the $50 covers:

> Expungement.ai prepares supported self-help documents and filing instructions. You file them yourself. Attorney strategy, representation, court filing fees, and court approval are not included.

Action:

> Start free

### Layout

- Dark Navy section.
- Left column: heading, short explanation, CTA.
- Right column: three-row cost ledger.
- Make the $50 row a Warm White active row.
- Keep included and not-included information to the essential boundary. Do not create another long checklist wall.

### Motion

- Route draws through the cost sequence and ends at Start free.
- $50 row may cut to Warm White when it enters.
- Do not count numbers upward.
- Do not strike through lawyer pricing.
- Do not animate toward purchase completion.

## 08. Trust and privacy

### Purpose

Name actual practices rather than using vague “private” shorthand.

### Approved copy

Eyebrow:

> TRUST & PRIVACY

Headline:

> Your record is sensitive. Your privacy should be obvious.

Body:

> Start the guided check without creating an account. We ask for the information needed to check supported paths and prepare a packet. We do not sell your personal information.

Practices:

- No account required to begin.
- No payment required to start.
- Privacy policy available before sensitive details.
- You decide whether to save and continue.
- Delete and export options only if currently available and tested.
- Human support without judgment.

Action:

> Read our privacy promise

### Layout

- Deep Navy ground.
- Left: headline, body, CTA.
- Right: interactive ledger rows with one explanation panel.
- Selected row uses an orange left rule.
- No shield-as-proof centerpiece.
- A small lock icon may support, but the named practices carry trust.

### Motion

- Route draws to the ledger.
- Active row changes immediately.
- Explanation panel replaces left to right in 240ms.
- No green checkmark landing animation.

## 09. Wilma live-chat demonstration

### Purpose

Show Wilma doing her actual job: explaining one confusing process question in plain English and pointing back to the checklist.

### Approved role copy

Eyebrow:

> YOUR FILING GUIDE

Headline:

> Meet Wilma, your plain-English filing guide.

Body:

> Wilma explains confusing steps, defines legal terms, and points you back to your checklist. She does not decide what is available, replace a lawyer, or promise a court outcome.

Boundary:

> Wilma provides general self-help information, not legal advice.

### Proposed illustrative conversation

This conversation is a design proposal and requires legal review before publication because court assignment and filing methods vary by jurisdiction.

User:

> I have two old cases from different courts. Do I file them together or separately?

Wilma:

> It depends on your state and where each case was handled. Your checklist will show whether the filings must be separate, which court to use, what documents to include, and whether a filing fee or fee-waiver step may apply.

### Layout

- Teal 12 or Warm White section ground.
- Left: concise Wilma role statement and W2/W1 avatar use.
- Right: rectangular chat window that mirrors the production Wilma UI.
- Header shows Wilma, status, and clear title.
- User bubble appears on the right.
- Wilma bubble appears on the left.
- Input field appears as a visual demonstration only unless wired to the real launcher.
- Do not imply 24/7 human support unless verified.

### Motion

1. User bubble clips in over 240ms.
2. Hold 180ms.
3. Wilma bubble clips in over 240ms.
4. No typewriter effect.
5. No bouncing avatar.
6. Reduced motion shows both messages immediately.

### Responsive

- Mobile: copy, avatar, and chat stack.
- Keep bubbles at a readable width.
- Do not let the chat window overlay pricing, results, or a legal claim.

## 10. Coverage matrix and state reference

### Purpose

Make the nationwide free-check scope tangible and give the selected state useful plain-English context without an out-of-place dropdown.

### Approved copy

Eyebrow:

> COVERAGE

Headline:

> Free guided checks in 50 states and D.C.

Body:

> Start with your state, record type, outcome, and timing. The check looks for supported record-clearing paths before you pay. Packet availability depends on your result and jurisdiction.

### Interaction

- Show all 51 jurisdictions as an exact matrix.
- No duplicate dropdown.
- One selected cell is Deep Navy with an orange corner square.
- Selecting a state updates a state-at-a-glance reference panel.

### State-at-a-glance content model

Use only verified state-specific data from the repository or an approved source. Until verified state values are connected, the reference panel may use the following generic supported categories:

- What the check looks at: record type, outcome, timing, and applicable jurisdiction rules.
- Packet availability: depends on the guided-check result and the court involved.
- Filing fees: court fees and fee-waiver steps vary and should be shown separately when verified.

Do not publish an average filing fee without a visible source, scope, and review date.

### Motion

- Route draws once on section entry.
- Do not animate all 51 cells.
- Old selected cell cuts to Warm White.
- New selected cell cuts to Deep Navy.
- Orange corner terminus relocates with the active state.
- Reference text replaces in 160 to 240ms.

### Responsive

- Desktop: reference panel and 13-column matrix.
- Tablet: 10 columns.
- Mobile: 6 columns, each cell at least 44 pixels.
- State name appears in the reference panel, not only as an abbreviation.

## 11. Questions

### Purpose

Resolve common concerns before the visitor begins.

### Approved content status

The approved copy contains one complete answer:

Question:

> Is this actually legit?

Answer:

> Expungement.ai is a self-help document-preparation product. The guided check looks for supported record-clearing paths, and supported packets include available documents and filing instructions. Expungement.ai is not a law firm, does not represent you, and does not file on your behalf.

Recommended labels for repository copy pull and review:

- Do I need a lawyer?
- What is available in my state?
- What does the $50 cover?
- What happens if the court denies my request?
- How is my information used?
- Is Expungement.ai a law firm?

Do not invent the missing answer bodies. Codex must pull them from the live repository, then reconcile them with the audit.

### Layout

- Left: short headline.
- Right: accordion rows.
- Hard rules, no rounded FAQ cards.
- One answer open at a time is acceptable.

### Motion

- 220ms height and clip transition.
- No spring.
- Button label and `aria-expanded` update immediately.

## 12. Final CTA and footer

### Approved copy

Headline:

> Start with what happened. See what may be available.

Body:

> The guided check is free to start. No account is required to begin. If a supported packet is available, review your information before deciding whether to pay $50 to generate it.

Action:

> Start free

Boundary line:

> No account · No payment to start · Self-help information · Not legal advice

Footer endorsement:

> Expungement.ai, from LegalEase

Footer description:

> Expungement.ai helps people explore supported record-clearing paths and prepare available self-help documents and filing guidance.

### Layout

- Deep Navy final CTA block.
- Large headline on the left.
- Start free CTA placed on a clear grid edge.
- Orange route enters from the left, turns once, and ends at or immediately before the CTA.
- The route must not run under body text or break awkwardly at the footer boundary.
- Full legal disclaimer remains below navigation links.

### Motion

- Route draws once and stops at the CTA.
- CTA moves no more than 3 pixels on hover.
- No pulse, bounce, urgency, countdown, or glow.

---

# Copy and claims guardrails

## Locked public terminology

Use:

- Free guided check
- Start free
- A supported path may be available
- Supported self-help packet
- Explore record-clearing paths that may be available
- We do not sell your personal information
- Expungement.ai, from LegalEase

Do not use:

- Eligibility check
- Qualify, qualified, or eligible
- Clear your record as a product promise
- Court-ready packet as a universal claim
- Lawyer-price comparisons
- Crossed-out lawyer pricing
- Attorney-reviewed in every state
- Unsourced statistics
- Unverified completion time
- Outcome-led testimonials
- Vague “private” shorthand without naming the practice
- Em dashes

## Internal language that must never render publicly

- Rules engine
- Deterministic logic
- Claims register
- Review chain
- Fails closed
- Jurisdiction index
- Selected route
- Implementation status
- Source-gated
- Launch ledger
- Prototype
- Living Docket

Internal CSS class names may use neutral implementation terms if they never render to the user.

## Claims still requiring verification

- Exact scope and review date of 50 states plus D.C. coverage
- Every court-specific filing claim
- Every fee or fee-waiver claim
- Every privacy and data-control claim
- Delete and export functionality
- Attorney-review scope by material, jurisdiction, and date
- Completion time
- All proposed FAQ answer bodies not in the approved draft
- The proposed two-court Wilma response

---

# Motion system summary

The path draws. The interface stays calm.

Motion must explain:

1. Where the visitor is
2. What changed
3. What comes next
4. Where the product stops

If an animation does none of those, remove it.

Primary tokens:

```css
--motion-response: 120ms;
--motion-snap: 160ms;
--motion-panel: 240ms;
--motion-section: 600ms;
--motion-path: 760ms;
--motion-hold: 120ms;
--motion-ease: cubic-bezier(.7, 0, .3, 1);
```

Prohibited:

- Parallax
- Scroll-jacking
- Sticky horizontal galleries
- Continuous floating or breathing cards
- Animated gradients
- Particles
- Document destruction or erasure
- Green approval checks landing on records
- 100 percent outcome animations
- Countdown timers
- Springy CTA buttons
- Cursor-following effects
- Logo intros
- Typewriter effects on legal or privacy copy

See `MOTION_SPEC.md` for the complete choreography.

---

# Responsive strategy

Required verification widths:

- 390 px
- 768 px
- 1024 px
- 1440 px
- 1728 px

Global responsive principles:

- Text remains left aligned.
- Product screens never become tiny decorative cards.
- Routes may be hidden when mobile geometry destroys meaning.
- Interactive controls remain at least 44 pixels.
- Section indices move from the outside edge to an inline docket strip.
- Photography becomes a vertical sequence.
- State cells remain touchable.
- No horizontal overflow.
- English and Spanish layouts must remain at parity.

See `RESPONSIVE_SPEC.md` for exact component behavior.

---

# Accessibility strategy

- Use semantic landmarks and heading order.
- Use real buttons and links.
- Expose video Pause or Play state.
- Hide decorative video and routes from assistive technology.
- Provide descriptive alt text for product screens and photography.
- Do not use color alone for selected state or progress.
- Provide visible focus at least as strong as hover.
- Respect reduced motion and Save-Data.
- Make chat preview clearly illustrative.
- Make the state matrix announce the full state name and selected state.
- Ensure the FAQ is keyboard operable.

See `ACCESSIBILITY_AND_QA.md`.

---

# Performance strategy

- Ship `hero-background.mp4`, not the original video.
- Use poster as the first render.
- Keep video silent and H.264.
- Use `preload="metadata"` unless production measurement proves another setting is better.
- Avoid making video the Largest Contentful Paint element when the poster can satisfy first render.
- Declare image dimensions or aspect ratios.
- Lazy-load below-the-fold imagery.
- Use WebP with PNG or JPEG fallback.
- Avoid adding an animation library for motions that CSS and SVG can implement.
- Use IntersectionObserver rather than continuous geometry polling.
- Use passive scroll only for the page rail.

---

# Repository integration note

The GitHub connector exposed no accessible repositories during this packaging pass. The kit therefore includes the current guided-check and Briefcase screenshot exports already available from the current site work. Codex must inspect the production repository before implementation, locate the latest canonical screenshots and routes, and replace package exports when the repository contains newer approved versions.

Do not guess repository paths from this package.

---

# Completion definition

The homepage redesign is ready for human review only when:

- The approved section order is implemented.
- The hero video, poster, Pause or Play control, reduced-motion fallback, and safe route geometry work.
- The real guided-check and Briefcase screens are used.
- The separate sample and trust sections are absent.
- No forbidden public copy appears.
- Missing FAQ answers are not invented.
- The proposed Wilma chat is reviewed or clearly held behind a content flag.
- State selection uses the matrix and state reference panel without a redundant dropdown.
- All controls are keyboard accessible.
- No horizontal overflow exists at required widths.
- Tests and screenshot evidence are included.
- Routing, analytics, localization, authentication, and funnel behavior are preserved.
- A human reviews the final page before merge.
