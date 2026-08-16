# Component inventory and contracts

This inventory defines the homepage presentation components Codex should locate, reuse, adapt, or create after inspecting the production repository. Component names are descriptive. Codex should follow the repository's existing naming and file conventions.

## 1. AnnouncementBar

### Job

Communicate the low-friction entry conditions before the visitor reaches the hero.

### Content

- Free guided check. No account or payment to start.

### Props or data

```ts
type AnnouncementBarProps = {
  text: string;
};
```

### States

- Static only

### Acceptance criteria

- Deep Navy background
- Action Orange square marker
- Utility type
- Does not become sticky separately from the header
- Does not wrap awkwardly at 390px

## 2. SiteHeader

### Job

Provide navigation, language, login, and primary Start free action.

### Data

```ts
type NavItem = { label: string; href: string };

type SiteHeaderProps = {
  items: NavItem[];
  startHref: string;
  loginHref: string;
  currentLocale: "en" | "es";
  localeLinks: { en: string; es: string };
};
```

### States

- Hero overlay
- Sticky Warm White
- Mobile menu closed
- Mobile menu open

### Acceptance criteria

- Existing routes and analytics preserved
- No layout shift during sticky transition
- Keyboard menu operation
- Accurate `aria-expanded`
- Minimum 44px targets

## 3. HeroVideo

### Job

Deliver the approved headline and product boundary over the supplied video.

### Starter

- `components/HeroVideo.tsx`
- `components/HeroVideo.module.css`

### Data

```ts
type HeroVideoProps = {
  videoSrc: string;
  posterWebp: string;
  posterJpg: string;
  startHref: string;
  sampleHref: string;
};
```

### States

- Loading poster
- Playing
- Manually paused
- Autoplay blocked
- Reduced motion
- Save-Data
- Mobile poster

### Acceptance criteria

- Full requirements in `HERO_VIDEO_IMPLEMENTATION.md`
- No proof-card overlap
- No audio
- Visible Pause or Play control
- Approved copy only

## 4. HeroProofFacts

### Job

Show the three immediate facts inside the hero.

### Content

- No account to begin
- No payment to start
- 50 states + D.C.

### Rules

- Shared 1px borders
- No rounded cards
- No icons required
- If icons are used, they support rather than replace the copy
- Route stays at least 24px below

## 5. SectionPath

### Job

Render the one orange route for a composition.

### Starter

- `components/SectionPath.tsx`
- `assets/hero-path-safe.svg`

### Data

```ts
type SectionPathProps = {
  viewBox?: string;
  path: string;
  active?: boolean;
  terminus?: { x: number; y: number; size?: number };
};
```

### Rules

- Decorative and `aria-hidden`
- 90-degree turns
- Square caps and joins
- One filled square
- No arrowhead
- No copy or control overlap
- Hide on mobile when needed

## 6. SectionIndex

### Job

Give each major section an editorial docket marker.

### Data

```ts
type SectionIndexProps = {
  number: string;
  label: string;
  tone?: "light" | "dark";
};
```

### Responsive

- Desktop: outer right edge
- Mobile: inline strip above section content

## 7. BarrierPhotoField

### Job

Connect the record problem to ordinary life settings without identifying people as participants.

### Assets

- `photo-worker`
- `photo-paperwork`
- `photo-student`

### Data

```ts
type PhotoPanel = {
  src: string;
  alt: string;
  label: "Work and licensing" | "Housing" | "School and training";
};
```

### Acceptance criteria

- Eye-level photographs
- No implied criminal history
- Labels do not cover faces
- Vertical mobile sequence

## 8. GuidedCheckPreview

### Job

Show the actual guided-check product.

### Asset

- `shot-guided-check`

### States

- Static screenshot
- Optional example choice selection outside the screenshot

### Rules

- Do not redraw product UI
- Do not label “Actual Product Screen”
- Do not expose retired wording
- Keep screenshot readable on mobile

## 9. HowItWorksSequence

### Job

Explain three stages with three different visual jobs.

### Data

```ts
type ProductStep = {
  number: "01" | "02" | "03";
  title: string;
  body: string;
  visual: React.ReactNode;
};
```

### Visual slots

- Step 1: GuidedCheckCrop
- Step 2: PacketReviewPanel
- Step 3: FilingProgressVisual

### Rules

- Do not repeat the same screenshot treatment three times
- No auto-rotating carousel
- No forced phone-device mockups
- Visuals align to a shared top and bottom rule

## 10. PacketReviewPanel

### Job

Represent the information-review stage without using the retired result screenshot.

### Suggested rows

- State: From your answers
- Court: From your case
- Packet price: $50
- Next: Generate the supported packet

### Rules

- Product-native visual language
- No eligibility statement
- No “You qualify”
- No legal result claim

## 11. BriefcaseShowcase

### Job

Use the real Briefcase screenshot as primary product proof and add controlled external motion.

### Asset

- `shot-briefcase`

### Composition

- Screenshot
- ProgressDetail external panel
- ProgressCue supporting rule

### States

- Resting
- Activated once in viewport
- Reduced motion

### Acceptance criteria

- No screenshot obstruction
- No count-up
- No 100 percent completion
- No continuous float
- External labels match real product states

## 12. PacketDocumentSet

### Job

Show possible packet materials with less copy.

### Data

```ts
type PacketDocument = {
  id: "petition" | "proposed-order" | "filing-checklist" | "court-instructions" | "fee-waiver";
  title: string;
  description: string;
};
```

### States

- Selected document
- Focused document
- Reduced motion

### Interaction

- One selected layer shifts 18px desktop or 8px mobile
- Explanation panel updates
- Use `aria-pressed` or a proper tab/listbox pattern depending on implementation

### Rules

- No page-turn animation
- No paper fan
- No rotation
- No fake readable legal text

## 13. PricingLedger

### Job

Show $0, $50, and variable court fee as a transparent sequence.

### Data

```ts
type CostRow = {
  index: string;
  label: string;
  amount: "$0" | "$50" | "Varies";
  description: string;
  featured?: boolean;
};
```

### Rules

- $50 row may be Warm White on Deep Navy
- No lawyer comparison
- No crossed-out price
- No count-up
- Route ends at Start free

## 14. PrivacyLedger

### Job

Let the visitor inspect named privacy practices.

### Data

```ts
type PrivacyPractice = {
  id: string;
  label: string;
  statusLabel: string;
  explanation: string;
  verified: boolean;
};
```

### States

- Active row
- Inactive row
- Explanation replacement

### Acceptance criteria

- Orange active rule
- Not color-only
- Accurate production claims only
- Delete and export omitted unless tested

## 15. WilmaChatPreview

### Job

Demonstrate Wilma's bounded plain-English explanation role.

### Starter

- `components/WilmaChatPreview.tsx`
- `components/WilmaChatPreview.module.css`

### Data

```ts
type ChatMessage = {
  id: string;
  speaker: "user" | "wilma";
  body: string;
};
```

### States

- User message visible
- Wilma message visible
- Reduced motion

### Rules

- Proposed chat copy requires legal review
- No typewriter
- No AI legal assistant label
- No 24/7 claim unless verified
- Demo input is not interactive unless connected to real launcher

## 16. CoverageMatrix

### Job

Make 51-jurisdiction free-check coverage tangible and update a selected state reference.

### Starter

- `components/CoverageMatrix.tsx`
- `components/CoverageMatrix.module.css`

### Data

```ts
type StateReference = {
  code: string;
  name: string;
  whatCheckLooksAt: string;
  packetAvailability: string;
  filingFeeGuidance: string;
  source?: string;
  reviewedAt?: string;
};
```

### States

- Selected state
- Focused state
- Reference panel updating

### Rules

- No duplicate dropdown
- Active state has Deep Navy fill and orange corner square
- Full state name announced
- 44px mobile cells
- Do not publish average fees without source and review date

## 17. FAQAccordion

### Job

Answer approved pre-start questions.

### Data

```ts
type FaqItem = {
  id: string;
  question: string;
  answer: string;
  approved: boolean;
};
```

### Rules

- Only approved answer bodies render
- Remaining labels may render only if production copy is retrieved and reviewed
- Use buttons with `aria-expanded` and `aria-controls`
- One answer open at a time is acceptable

## 18. FinalCTA

### Job

End on one clear next step.

### Content

- Start with what happened. See what may be available.
- Start free
- Boundary line

### Rules

- Route terminates at the CTA
- No urgency
- No pulse
- No countdown

## 19. LegalFooter

### Job

Provide endorsement, navigation, full disclaimer, copyright, and privacy statement.

### Rules

- Preserve production links
- Preserve full disclaimer
- Use “Expungement.ai, from LegalEase”
- Use “We do not sell your personal information.”
- Do not shorten the disclaimer for visual convenience

## 20. PageRail

### Job

Show continuous document position along the far-left edge.

### Rules

- 8px desktop, 5px mobile acceptable
- Decorative and `aria-hidden`
- Passive or frame-throttled scroll update
- No section animation depends on it
