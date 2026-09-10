# Indiana case-type sources: what to upload, and why a lane cannot fetch them

**Status:** waiting on an upload. Nothing in Indiana is blocked on it except one
fixture token; all other Indiana work continues.

## Why this is an upload and not a retrieval

Both hosts are refused at this container's network egress proxy. One bounded
attempt was made per URL, from the Captain worktree, on 2026-09-10:

- `curl` to all four URLs: `CONNECT tunnel failed, response 403` (a policy
  denial at the gateway, not a TLS or certificate problem).
- `WebFetch` to `rules.incourts.gov`: `EGRESS_BLOCKED`.

The hosts are not retried in any lane. The network policy is not changed.

## What to upload

| # | Document | URL | What must be confirmed |
|---|---|---|---|
| 1 | Administrative Rule 8 (current page, effective January 1, 2025) | https://rules.incourts.gov/Content/admin/rule8/current.htm | Rule 8(B)(3) identifies **FB** as Class B and **FD** as Class D |
| 2 | Administrative Rule 1 (effective July 1, 2026) | https://rules.incourts.gov/Content/admin/rule1/current.htm | Rule 1(B)(4)(a)(i)–(iii) assigns the case category by the **most serious charge** |
| 3 | QCSR Application Guide, August 2026, 67 PDF pages | https://www.in.gov/courts/iocs/files/court-frm-icor-qcsr-application.guide.pdf | **Printed page 9 / PDF index 9**: the category follows the most serious original charge and **remains** after later amendments or a lesser conviction |
| 4 | Case Type Quick Reference, January 1, 2025 | https://www.in.gov/dA/8240b60638/casetype-quick-reference.pdf?language_id=1 | **Printed page 8 / PDF index 7**: the case-type code table |

Save each as the file the browser downloads — the published bytes, not a print
to PDF, not a screenshot, not a copy-paste into a document. A re-encoded copy
hashes to something the published document does not, and the digest is the
whole point of routing this through custody.

## What happens on arrival

Each entry already sits in `data/rcap-grade-a/packet-factory-24h/SOURCE_ACQUISITION_MANIFEST.json`
with `expectedSha256: null` and `verification: "pending retrieval"`. On arrival
the bytes are hashed, the digest written to that entry, the named page read
against the claim it is said to support, and the result recorded. Until then:

- **`expectedSha256` stays null.** It is never filled from an excerpt, a
  screenshot, a generated file, or a hash of anything but the published bytes.
- **No fixture token moves on the strength of research alone.** The one token
  waiting on this is `in_conviction_misd-set`'s boundary `CM`, which the
  supplied rules say should be `FD` because the most serious original charge
  was a Class D felony. It is not changed, and that family is deliberately not
  rastered.
- **The delivered Indiana petition already asserts Rule 8(B)(3) to a court** as
  settled authority. That is a blocker for `approved_for_live`, not for build
  status, and it is recorded rather than waived.

## What this is not

Research is not acquisition and neither is a packet approval. The rules were
read on the open web; they have not been read here against a document this
repository holds, and no lane may treat them as held until they are.
