# Roger — what is actually left for a person

**RESIDUAL HUMAN-ACTION ITEMS: 1**

**UNIQUE CANONICAL ARTIFACTS: 238**  ·  **UNIQUE FAMILIES: 152**

## What changed, and why the old list was withdrawn

The previous version of this file had 232 rows and was invalid as a human-action queue. An external audit said so and I re-measured every structural claim against the committed file before accepting it — all matched:

- 232 of 232 rows said `Form title: REQUIRES_LOOKUP`;
- 206 of 232 issuer fields held a plus-joined list of form IDs, which names no issuing body;
- two "official URLs" were entire CSV rows, with a domain, date, revision, SHA-256 and a `private/source-imports` path appended after a comma;
- the Top 20 summed to 125 family references over 67 unique families, so the ranking counted the same family several times.

The defect underneath: four action kinds absorbed every blocker class. A public form nobody had fetched, a page inside a public bundle, a form ID missing its current suffix, a statute, and a form whose publisher forbids commercial reuse all came out as "find this form" or "ask a clerk". Nineteen of the top twenty said contact a clerk or hunt a portal. **Zero of them justified a clerk call.** It would have sent you to several offices to ask for documents that are published, embedded in bundles we already had addresses for, or not documents at all.

Blocker class is preserved now, and a human task has to earn itself.

## TX — Statement of Inability to Afford Payment of Court Costs or an Appeal Bond

**Unlocks 10 famil(ies).**  State: `PUBLIC_DOWNLOAD_BOT_BLOCKED`.

- **Official page:** https://www.txcourts.gov/11thcoa/practice-before-the-court/forms/
- **Artifact:** https://www.txcourts.gov/media/1456942/statement-of-inability-to-afford-payment-of-court-costs-or-an-appeal-bond-bilingual.pdf
- **Why you and not a lane:** The identity is settled and the official host refuses automated acquisition. A browser session is the only part of this a machine here cannot do.
- **Do:** Save the untouched official PDF in a normal browser; return file, exact URL, date, and printed revision.

**Return:**
- the file exactly as downloaded — no print-to-PDF, no optimize, no re-save, no export, because a round trip through a viewer changes the bytes and the hash is the identity
- the exact URL from the address bar
- the download date
- the form's own printed revision line, if it has one

**Does not count:**
- a screenshot, a photograph or a printout
- a copy from a commercial forms site — uslegalforms, pdffiller, formsworkflow and the rest are refused by name
- a file re-saved by a PDF editor

**After you return it:** ACQ records the bytes and their SHA-256; PROMO verifies the receipt and creates custody; Captain regenerates the queue and releases the families. None of that is yours.

## Everything else, routed by name

| State | Records | Owner |
|---|---:|---|
| `STANDALONE_ARTIFACT` | 7 | ACQ obtains the public bytes; PROMO verifies receipt, hash and custody |
| `BUNDLE_COMPONENT` | 3 | DISC records the component locator and alias; ACQ acquires the bundle ONCE |
| `EMBEDDED_SECTION` | 3 | DISC maps the embedded section in each applicable form; ACQ acquires the containing document ONCE |
| `STALE_OR_VARIANT_ID` | 2 | DISC normalizes the identity to its current, mode-specific form; then ACQ and PROMO |
| `SOURCE_SCOPE_AND_VERSION_AMBIGUITY` | 1 | DISC and Captain settle statewide versus local scope and the alias relationship before any inquiry |
| `MISSING_SOURCE_BINARY` | 5 | ACQ, once DISC has settled an exact official address |
| `MISSING_CANONICAL_RELATIONSHIP_METADATA` | 145 | DISC settles source identity and the route or family relationship |
| `CURRENTNESS_UNVERIFIED` | 62 | DISC compares the held edition against the publisher's own forms index |
| `UNSUPPORTED_RELATIONSHIP` | 1 | DISC and legal decide which families the artifact genuinely serves |
| `STATUTORY_CUSTOM_PLEADING` | 6 | a packet-build lane, drafting against the statute |
| `LICENSE_PERMISSION_REVIEW` | 2 | counsel and business decide reuse; ACQ may evaluate the bytes |

104 SOURCE_BLOCKED famil(ies) name no official form at all — DISC discovery, not an errand.

## Scope limit, stated rather than implied

20 of 232 original rows were externally verified against live publisher sources on 2026-08-31. The rest are classified from committed records only, and carry no current-source determination. Where the corpus already holds matching bytes they are `CURRENTNESS_UNVERIFIED` rather than missing — held bytes are not an absent source, and the open question is whether the edition is current.

