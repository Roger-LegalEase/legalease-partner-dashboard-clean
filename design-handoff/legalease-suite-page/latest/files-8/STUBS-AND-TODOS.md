# Stubs, Placeholders & Dead Links — What to Wire

Every non-final piece in the build, with exact locations and what to do. Anything a developer would otherwise discover by surprise is listed here. Items 1–4 are engineering; 5–8 are content/legal (not dev tasks, listed so nothing ships missing them).

---

## 1. Waitlist form — no backend (STUB)

- **File:** `waitlist.html`, in the `<script>` block (search `TODO: REPLACE THIS BLOCK`).
- **Current behavior:** validates name/email, simulates a network delay, logs the payload to console, shows the success state. **Sends nothing.**
- **Payload already shaped:**
  ```js
  { name, email, product, product_name, source: 'waitlist', ts }
  ```
- **To do:** replace the placeholder block with a real `fetch()` POST to your endpoint (Supabase function / API route / form service). The success-state UI is already built — just trigger it on a real 200.
- **Note:** `?product=` URL param pre-selects the product; preserve that so deep-links from the landing page's roadmap cards work.

## 2. Contact form — no backend (STUB)

- **File:** `contact.html`, in the `<script>` block (search `TODO: REPLACE THIS BLOCK`).
- **Current behavior:** same as waitlist — validates, simulates, logs to console, shows success. **Sends nothing.**
- **Payload already shaped:**
  ```js
  { name, email, organization, topic, topic_label, message, source: 'contact', ts }
  ```
- **To do:** wire to your endpoint. `topic` lets you route server-side (support / partnership / press / other). `?topic=` param pre-selects.

## 3. OG share image — placeholder domain

- **Files:** all five pages, in `<head>` (search `REPLACE-WITH-YOUR-DOMAIN`). Two occurrences each (`og:image`, `twitter:image`).
- **Why it's a placeholder:** social platforms require an **absolute public URL** for the share image — they can't read a relative path or an inlined image. So this can't be finalized until there's a real domain.
- **To do:** host `assets/brand/og-card.png` at a public URL, then replace `https://REPLACE-WITH-YOUR-DOMAIN/og-card.png` with the real URL in all five pages. Until then, link shares won't show the card (the favicon already works regardless).

## 4. Footer dead links — Privacy + social

- **File:** `legalease-opendoor.html`, footer. All currently `href="#"`:
  - `Privacy Policy` → see item 5 (needs the actual document first)
  - `LinkedIn`, `Instagram`, `X`, `Facebook` → need real profile URLs.
- **To do (social):** drop in the real profile URLs, or remove the platforms that don't exist. (Only a LegalEase LinkedIn was findable during the build, and it was unverified — confirm before linking. Several unrelated companies share the "LegalEase" name, so don't guess.)

---

## 5. Privacy Policy — DOES NOT EXIST (highest-priority gap)

- **Status:** there is no Privacy Policy page. The footer link is a dead `#`.
- **Why it matters:** both `terms.html` and `disclaimer.html` reference the Privacy Policy repeatedly ("you acknowledge our Privacy Policy," "as described in our Privacy Policy"). The product handles **criminal-record data** — among the most sensitive categories — so this is a real compliance gap, not cosmetic.
- **To do:** the document must be written by the company/counsel. Once it exists it can be rendered with the same template as Terms/Disclaimer (the `build_legal.py` script produces those from markdown). This is **not** a developer task to author — only to publish once provided.

## 6. Legal sign-offs (content/counsel)

- Counsel review of `terms.html` and `disclaimer.html` substance — arbitration clause, class-action waiver, Delaware governing law, liability cap — and the UPL (unauthorized-practice-of-law) language across the site.
- These pages render verbatim from provided documents; no wording was changed in the build, but the substance needs legal review before launch.

## 7. Founder quote sign-off

- The Lawrence Blackmon founder quote in the landing page trust section was drafted in his voice during the build. Confirm he approves it as written — it functions effectively as a company positioning statement.

## 8. Testimonial verification

- The Ricky W. testimonial (landing page) must be a real, authentic customer statement with permission to use the name and city. FTC endorsement rules apply to testimonials on a commercial legal-services page. Confirm before launch.

---

## Quick grep reference

```
TODO: REPLACE THIS BLOCK     → form endpoints (waitlist.html, contact.html)
REPLACE-WITH-YOUR-DOMAIN     → OG image URL (all 5 pages)
href="#"                     → dead links (landing footer: Privacy + 4 social)
```

## Analytics (deliberately not installed)

No tracking is on any page — by design. Add at deploy, **after** the Privacy Policy exists (analytics collects visitor data the policy must disclose). A privacy-first, cookieless tool (e.g. Plausible/Fathom) is recommended over GA for this product: simpler disclosure, typically no consent banner, and a better fit for a sensitive-data, trust-forward product. Decide pageviews-only vs. conversion events (Start-free clicks, waitlist/contact submits) — the events are where you learn whether the cinematic opening helps or hurts conversion.
