---
name: expungement-ai-homepage-v3
summary: Implements the approved Expungement.ai homepage redesign using the supplied video, real product screens, hard-panel visual system, public copy guardrails, and evidence-first motion language.
---

# Expungement.ai homepage V3 skill

Use this skill whenever editing, reviewing, or testing the public Expungement.ai consumer homepage.

## Authority order

Read and follow these sources in order:

1. `handoff/CODEX_BUILD_PROMPT.md`
2. `handoff/DESIGN_BRIEF.md`
3. `handoff/COPY_DECK.md`
4. `handoff/MOTION_SPEC.md`
5. `source/APPROVED_COPY.html`
6. `source/DESIGN_DIRECTION.md`
7. Production route, localization, analytics, authentication, and funnel behavior in the repository

The attached PNG is the canonical composition reference, not a source of legal claims. Repository behavior is canonical for routes and application logic. Do not guess missing behavior.

## Design objective

Build a distinctive, document-native consumer experience that feels clear, human, specific, calm, modern, innovative, and trustworthy. It must not resemble a generic legal-tech or venture-backed SaaS template.

The operating idea is internal only: the page behaves like a structured docket. Do not render that code name publicly.

## Visual rules

- Deep Navy `#071B33`
- Action Orange `#FF3B00`
- Progress Teal `#0A8E9A`
- Teal 55 `#6FBCC3`
- Teal 12 `#E4F0F1`
- Warm White `#F7F4EE`
- Slate `#475A6E`
- Inter for display and body
- IBM Plex Mono for utility labels, section indices, state abbreviations, metadata, and technical captions
- Hard 90-degree panel edges
- One-pixel rules and shared borders
- No rounded-card system
- No decorative drop shadows
- No aesthetic gradients
- No glass effects
- No soft blobs
- No generic icon-and-checkmark wall
- Orange is reserved for the route, its square terminus, and primary actions
- Preserve deliberate empty space, but do not leave accidental dead zones

## Orange-route rules

Each major composition may use one orange route.

- Enter from an edge
- Cross at least one meaningful boundary
- Use 90-degree turns only
- Use square caps and miter joins
- End in a filled square at the next step
- Never use an arrowhead
- Never cross body copy, controls, faces, or the hero proof cards
- In the hero, keep at least 24 pixels of clearance below the proof cards
- Hide or simplify the route on mobile when the geometry no longer communicates meaning

## Hero rules

- Use the supplied optimized video full bleed
- Keep the approved hero copy and CTAs on the left
- Keep moving subjects in the right field
- Use a hard translucent navy panel, not a gradient veil
- Use `autoplay muted loop playsInline`
- Ship no audio track in the optimized file
- Provide WebP and JPEG posters
- Provide a visible Pause or Play control
- On reduced motion or Save-Data, show the poster and do not autoplay
- Do not place essential information in the video
- Do not place the route over the proof cards
- Preserve the legal boundary in the hero

## Page order

1. Announcement strip and navigation
2. Video hero with three immediate facts
3. The barrier with current photography
4. Free guided check with the current product screen
5. Three-step product sequence
6. Full Briefcase proof section
7. What you get, expressed through the document set
8. Transparent pricing sequence
9. Named privacy practices
10. Wilma live-chat demonstration
11. Coverage matrix plus state-at-a-glance reference panel
12. Approved FAQ content
13. Final Start free CTA and legal footer

Do not restore a separate sample-packet section or a separate trust-credential section. The sample remains a hero CTA if the production route exists. Trust is carried by visible boundaries, pricing, privacy, and product proof.

## Screenshot rules

- Use the current repository's real guided-check and Briefcase assets
- Package exports are references; prefer newer canonical repo files when available
- Do not redraw current product screens as generic mockups
- Do not render the current result screenshot until retired public wording is removed
- Remove labels such as “Actual Product Screen”
- Product motion may add an external highlight or detail card, but must not alter the screenshot's factual content

## Photography rules

- Use the supplied work, paperwork, and study images as everyday-life fields
- Do not call photographed people customers, users, participants, or people with records
- Do not imply a criminal history through captions or adjacency
- Do not place redaction over a person
- Use eye-level, competent, ordinary-life framing

## Public copy rules

The primary CTA is **Start free**.

Use:

- free guided check
- a supported path may be available
- supported self-help packet
- self-help document preparation
- the court or agency makes the final decision
- Expungement.ai, from LegalEase

Do not use:

- eligibility check
- qualify or qualified
- clear your record as a product promise
- court-ready as a universal packet claim
- lawyer-price comparisons
- crossed-out pricing
- blanket attorney-review claims
- unsupported completion-time claims
- unsourced statistics
- outcome-led testimonials
- em dashes

Never expose internal terms such as rules engine, deterministic logic, claims register, review chain, fails closed, jurisdiction index, selected route, implementation status, source-gated, launch ledger, prototype, or Living Docket.

Editorial notes, VERIFY markers, legal-review reminders, placeholders, and missing-answer notes must never render publicly.

## Wilma rules

- Wilma explains terms and steps
- Wilma points back to the checklist
- Wilma does not decide what is available
- Wilma does not replace a lawyer
- Wilma does not promise a court outcome
- Do not place Wilma beside price, payment, a result claim, or a celebration
- The proposed two-court chat script requires legal review before publication
- Never use typewriter animation for Wilma's legal or privacy copy

## Motion rules

The path draws. The interface stays calm.

- Only one visual event leads at a time
- Route draw: 760ms, `cubic-bezier(.7,0,.3,1)`
- State response: 120 to 180ms
- Panel replacement: 240ms directional clip
- Section reveal: 600ms maximum
- FAQ open or close: about 220ms
- No parallax
- No scroll-jacking
- No floating cards
- No spring bounce
- No particles
- No animated gradients
- No record erasure, destruction, shredding, burning, or dissolving
- No green check landing on a record
- No 100% legal-outcome animation
- Reduced motion must show all information immediately

## Accessibility gate

Verify:

- Semantic headings and landmarks
- Keyboard access for every control
- Visible focus at least as strong as hover
- Accurate alt text
- Decorative video and routes hidden from assistive technology
- Pause or Play control has an accurate name and state
- No color-only status meaning
- 44-pixel minimum controls
- Reduced-motion and Save-Data fallback
- English and Spanish parity
- No horizontal overflow at 390, 768, 1024, 1440, and 1728 pixels
- Chat demo is clearly presented as illustrative, not a promise of live human service

## Performance gate

- Use the optimized silent H.264 video, not the original source
- Poster must render before video playback
- Avoid blocking Largest Contentful Paint on video decode
- Reserve image and component dimensions
- Lazy-load below-the-fold imagery
- Use responsive image formats
- Prefer CSS, SVG, transform, and clip-path
- Do not add an animation dependency unless the existing stack cannot implement the spec

## Completion report

Report:

- Branch, base, and final commit
- Exact route implemented
- Files changed
- Assets added, reused, or replaced
- Copy source used
- Existing behavior preserved
- Tests and exact results
- Viewports verified
- Accessibility checks
- Performance impact
- Screenshot evidence
- Unresolved links
- Unresolved claims or legal-review items

Do not merge without human review.
