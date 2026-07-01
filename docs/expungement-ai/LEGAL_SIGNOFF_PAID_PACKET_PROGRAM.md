# Legal Signoff — Paid Packet Program (LegalEase / Expungement.ai / RCAP)

Status: **active**. Baseline commit `d42c015` (PR #70, `fix/all51-rule-driven-provability`), 68 paid routes across 26 jurisdictions.

This document records the legal-team signoff and the product/engineering rules that govern which
record-clearing routes may become **paid packet** routes. It is the controlling reference for the
`RATIFIED_DEPLOYABLE_ROUTES` allowlist, the petition-route inventory, the route product-metadata map,
and the no-generic-fallbacks verifier.

## What "paid packet" / "$50" means

The **$50** charge — everywhere it appears as "paid packet", "paid route", `paymentAllowed`, or
"$50" — is **only the LegalEase / Expungement.ai self-help packet generation fee**.

We do **not** charge for or collect any of the following; each is **separate and paid directly by the
user to the court / agency / government entity**:

- court filing fees
- agency fees
- clerk fees
- certified disposition fees
- background-check fees
- fingerprint fees
- postage
- money orders
- cashier's checks
- attorney fees
- partner-program fees

Any court, agency, filing, certified-record, mailing, or government cost must be described as separate
and user-paid unless a future, separately approved feature changes that.

## Legal signoff (approved)

1. **Pursue every currently operative user-filed route that can be safely screened and packetized.**
   Legal approved pursuing every currently operative user-filed **court petition / court motion /
   court application / legally approved administrative application** route that can be safely screened
   and turned into a self-help packet.

2. **Hawaii is approved as a paid _administrative application_ packet — not a court petition.**
   The Hawaii route is the **Hawaii Criminal Justice Data Center (HCJDC) expungement application**
   (Form **HCJDC 159(b)**, HRS **§ 831-3.2**), an application to an agency of the Hawaii Department of
   the Attorney General. It must be labeled an **administrative application**, never a court petition /
   court filing / court packet. The **conviction** track may open only when the user confirms they
   already hold a **Court Order Granting Expungement** to attach; otherwise it is guidance / no payment.

3. **Permanent exclusion from paid court-petition mode** (approved) for:
   - automatic / no-filing relief (relief that arrives by operation of law),
   - board / pardon portal routes (e.g. Board of Pardons, ePardon, executive clemency),
   - prosecutor / agency-only routes (relief obtained only through a prosecutor or agency, not a
     user-filed packet),
   - not-currently-operational routes (the mechanism exists in law but is not operating).

   These may still be offered as **guidance-only** (no payment). The single approved exception to the
   "no non-court paid packet" rule is a **legally signed-off administrative application packet**
   (currently only Hawaii HCJDC).

4. **No generic fallback logic anywhere** (approved as permanent engineering law). See below.

## Not signed off (forbidden)

Legal has **not** signed off on, and the product must never do, any of:

- generic fallback logic (of any kind, anywhere),
- selling **automatic relief** as a packet,
- selling **board / pardon portals** as court petitions,
- selling **prosecutor / agency-only** routes as user-filed packets,
- selling routes that **cannot be screened** from public collected facts,
- inferring payment eligibility from **legal possibility alone**.

## Permanent engineering law — NO GENERIC FALLBACK LOGIC ANYWHERE

Specific source-backed route, or **fail closed**. Applies to evaluator logic, payment logic, packet
generation, route selection, waiting periods, guidance routing, eligibility decisions, consumer result
copy, Wilma result explanations, partner mode, and Briefcase packet generation.

Banned patterns: defaulting to the first pathway; defaulting to a generic wait; defaulting to a generic
packet; defaulting to Mississippi logic; defaulting to "maybe eligible" when a required legal fact is
missing; opening payment from label/summary text alone; treating automatic/admin/board/prosecutor/
no-filing routes as paid packet routes (except a legally signed-off administrative application packet);
using free-text charge matching as the only eligibility gate; using hidden/internal `source_question_*`
fields as paid gates when the fact is not collected as a public intake question; inferring payment
eligibility from legal possibility alone.

Fail-closed outcomes: `needs_more_info`, `needs_review`, `not_yet`, `likely_not_eligible`,
`guidance_only`, `hard_stop`.

## Payment-open conditions (all must be true)

Payment may open only when **all** of these hold:

1. The route is currently operative.
2. The route is a user-filed court petition, court motion, court application, or legally approved
   administrative application packet route.
3. The route is explicitly product-classified as paid-packet eligible (route product metadata).
4. The route is in `RATIFIED_DEPLOYABLE_ROUTES`.
5. The route has a deterministic compiled source-rule match.
6. The route has state/route-specific timing, wait, anchor, or event logic.
7. The route has state/route-specific exclusions, preconditions, count caps, prior-relief bars, and
   required gate facts enforced **from public collected answers**.
8. The route has a fulfillment-ready packet plan.
9. The result carries a source-backed route-match reason.
10. Both-direction verifier coverage proves qualifying cases open payment and disqualifying, premature,
    missing, unknown, or out-of-scope cases block payment.

## Enforcement artifacts

- `RATIFIED_DEPLOYABLE_ROUTES` in `src/lib/rcap-engine/evaluator.ts` — the payment allowlist (68 routes).
- `data/expungement-ai/route-product-metadata.json` — explicit per-route product metadata.
- `scripts/audit-petition-route-inventory.mjs` → `data/expungement-ai/reports/petition-route-inventory.json`
  + `docs/expungement-ai/PETITION_ROUTE_INVENTORY.md` — classification of every compiled pathway.
- `docs/expungement-ai/LEGAL_ACTION_REQUIRED.md` — every missing statute / form / rule / source /
  ambiguity that blocks a route from becoming paid.
- `scripts/verify-rcap-no-generic-fallbacks.mjs` — fails closed on any banned pattern.

## Legal signoff record — Target 51 (2026-07-01)

- **Date of signoff:** 2026-07-01.
- **Signed off by / role:** LegalEase legal team (business/legal signoff relayed by Roger). Role of the
  individual reviewer not recorded in-repo — if a named attorney sign-off is required for production,
  capture it before `approved_for_live`.
- **Scope:** pursue every currently operative user-filed court petition / motion / application route,
  plus the Hawaii administrative application packet, that can be **safely screened and packetized**.
- **Important:** this is a program/strategy signoff. Per the Legal Completeness Protocol it is **not**
  treated as technical proof. A route moved to `paid_now` only after passing full per-route
  verification (deterministic source-rule match, route-specific wait/anchor enforced, disqualifiers
  block, public intake facts, fulfillment-ready packet, both-direction verifier GREEN). Routes that
  needed missing source material were **held**, not promoted.

Applicability of the signoff by category (what it did / did not unlock this build):

| Category | Signoff applies | Outcome this build |
| --- | --- | --- |
| 6 "legal-reconfirmation-only" first-paid picks | yes | Only the genuinely-wired CORRECTED routes reconfirmed → promoted (IN conviction-sealed, ND deferred, NY 160.58, TN pathway-1). The MA/PA/IN-non-conviction picks were `HELD_GUIDANCE`/legacy or returned `needs_more_info` and were **held**. |
| 18 route-metadata first-paid picks | yes | 15 promoted (AL, AZ, MI, NC, NH, OH, OK, RI, SC, TX, UT, VT, WA, WV, WY). **Held:** AK (jurisdiction hard-coded non-court), DE (did not open when qualified), NV (compiled summary/id mismatch + ambiguous wait). |
| 42 gate-build routes | yes (strategy) | **Not promoted** — each needs its coded substantive gate + confirmed exclusion list first. Held in `HARD_GATE_PENDING`. |
| 33 wait-anchor routes | yes (strategy) | **Not promoted** — need the specific wait/anchor confirmed/wired first. |
| 18 intake-fix routes | yes (strategy) | **Not promoted** — need the nexus/intake question built first. |
| Hawaii administrative application packet | yes | Promoted (3 HCJDC routes), unchanged this build. |

Plus 2 ready-pending-ratification untiered first-paid routes promoted (FL § 943.0585, SD § 23A-3-27).

**Resolution of Legal Action Required rows:** the machine LAR feed
(`data/expungement-ai/reports/legal-action-required.json`) is regenerated from the current
classification, so a route's LAR rows disappear when it reaches `paid_now` (resolved by promotion +
both-direction proof). The **basis** for each resolution is this signoff plus the verifier GREEN state
recorded in the Target 51 report. Rows for held routes remain open with their exact missing item.

## Do-not list for this environment

Do not deploy. Do not run Stripe. Do not mark anything live. Do not undo the safe 68. Do not
mass-promote hard-gate-pending routes. If required legal material is missing, open a Legal Action
Required item and ask Roger / the legal team — never guess.
