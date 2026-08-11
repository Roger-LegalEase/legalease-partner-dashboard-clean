# Final Official-Source Materialization — PA path-k and SC survivor expungement

Lane record: `data/rcap-crosswalk-enrichment/final-official-sources/final-official-sources.json`
Verifier: `node scripts/verify-rcap-final-official-sources.mjs` (not wired into `package.json`).
Base: canonical branch `claude/rcap-final-sprint-integration` (Roger's 2026-08-11
ruling, recorded at `8744a701`), clean tip `f79fb0d9`.

## INGESTED 2026-08-11 — both subjects materialized, package ready for final E

Roger supplied the two official-source files into this session (individual
uploads, then the package ZIP) after every coding terminal remained
egress-blocked to the legislative hosts. Both statutory members hash exactly
to his published values through **two independent transfer routes** (the
standalone uploads and the ZIP members):

| Member | Repository path | SHA-256 |
|---|---|---|
| PA — 18 Pa.C.S. § 3019(d)–(g) | `data/rcap-crosswalk-enrichment/final-official-sources/files/PA/PA_18_PaCS_3019_d-g_official_2026-08-11.txt` | `0dc688b98962d565ab96c1ad4bbbf33a730dc0fdf51117765e733a4fe53c7dc4` |
| SC — S.C. Code § 16-3-2020(F) + 2024 history/editor's note | `data/rcap-crosswalk-enrichment/final-official-sources/files/SC/SC_Code_16-3-2020_F_official_2026-08-11.txt` | `b7f64d13388ca43175931e2b1aee357703bd99031b0b64879de690b7893dd630` |
| Operator metadata (preserved verbatim) | `data/rcap-crosswalk-enrichment/final-official-sources/operator-package-metadata-2026-08-11.json` | `df02069c6342f7749583bd5aa386c0ab203ca13573dc25323cddc6a6058af745` |

Provenance is recorded honestly on both receipts: operator-supplied official
statutory **text extracts** (retrieved via OpenAI web tooling in Roger's
workspace from the named official URLs on 2026-08-11), not raw HTML
snapshots; transferred through the conversation because terminal egress was
blocked; `urlVerifiedFromThisEnvironment: false`. The received package ZIP is
a Finder re-zip whose container hash differs from the published one
(`ca8fb7db…` vs `6c1d09fe…`, `__MACOSX` entries present); all three member
files hash identically to the published member values, and member bytes are
what the receipts pin.

**Support findings** (from the bytes, nothing more):

- **PA** — § 3019(d)–(g) supports path-k's asserted vacatur-and-expungement
  mechanism: (d)(1) enumerates the eligible convictions (§§ 3503, 5503, 5506,
  5507, 5902, simple possession of a controlled substance), (d)(2)(ii)
  requires Commonwealth consent, (d)(2)(iii)–(iv) and (e) set the evidence
  requirements and documentation presumption, (f) the grant standard, (g)
  mandatory vacatur, striking of the adjudication of guilt, and expungement
  of all related records. E must compare the compiled pathway's
  eligible-offense scope against the **closed** (d)(1) enumeration before
  naming the relationship exact.
- **SC** — § 16-3-2020(F) is an **expungement** mechanism (motion,
  preponderance standard, notice to the original prosecuting agency and to
  victims), rewritten by 2024 Act No. 213 § 2 (eff July 2, 2024) with
  retroactive application per Act 213 § 6 — not an offense-only provision.
  The subsection also carries a separate affirmative defense for
  prosecutions; E should treat the two operative effects distinctly.

The lane verifier now additionally fails any materialized receipt lacking
operator provenance. Full mutation battery exercised red (sha drift, span
absence, section absence, provenance removal, non-official source, missing
input file, subject omission) with the clean record green. Ingestion branch:
`claude/rcap-final-official-sources-ingested` from the Phase 54 base
`d6310fd2`.

---

Historical record of the blocked phase follows.

## Update 2026-08-11: blockers re-scoped to byte transfer only

Roger independently located and read both official primary sources and relayed
the substantive findings to this lane: **18 Pa.C.S. § 3019** provides a
Commonwealth-consent motion to vacate trafficking-caused convictions with
expungement of related records on grant, and **S.C. Code § 16-3-2020(F)** is an
express survivor motion-to-expunge (preponderance standard, notice to the
original prosecuting agency and affected victims) — an expungement mechanism
under current law, not an offense-only statute. The substantive legal
questions are therefore **no longer unknown**, and `EGRESS_BLOCKED` is not a
project-level legal blocker — it is a limitation of the coding terminals only.

What remains is mechanical and is pre-staged in the lane record: fetch the
served bytes (PA: current consolidated § 3019(d)–(g), not a pending bill;
SC: current § 16-3-2020 with subsection (F), the 2024 amendment and its
retroactive-rights editor's note), drop them under
`files/<JUR>/`, fill the receipt fields, run the lane verifier. The receipt's
verified authority, operative span, currentness and support verdict fill only
from those served bytes — the operator summary is recorded as
`operatorConfirmation`, never as final authority. This terminal re-probed all
three official endpoints after the confirmation (WebFetch and curl) and each
still answers `EGRESS_BLOCKED`/CONNECT-403, so the byte transfer belongs to a
web-capable owner.

## Original reduction: both subjects reduced to one exact externally owned retrieval blocker each

Neither official primary text is obtainable from this environment, and that is
verified this session, not assumed: fresh fetches of the Pennsylvania General
Assembly (both `www.legis.state.pa.us` and `www.palegis.us`) and the South
Carolina Legislature (`www.scstatehouse.gov`) each answered `EGRESS_BLOCKED`
from the network egress proxy — the identical condition every E2/E4 terminal
recorded ("probes return 000 while api.github.com returns 200"). No secondary
source was substituted; the source standard forbids it and the verifier
enforces it.

### Subject 1 — `compiled_pathway:PA:path-k-human-trafficking-vacatur-expungement`

- **Asserted mechanism:** human-trafficking victim vacatur / expungement (Path K).
- **Expected authority:** 18 Pa.C.S. § 3019 — *expected*, never established.
  Independently re-verified at this base: the PA compiled profile contains
  `trafficking` 86 times and `vacatur` 69 times but `3019` **zero** times, and
  no PA registry track contains `traffick`, `vacatur` or `3019`. The citation
  therefore cannot be confirmed **or refuted** from committed evidence, and
  asserting it as verified would exceed the sources.
- **Blocker (externally owned):** one fetch of 18 Pa.C.S. ch. 30 (expected
  § 3019) from the Pennsylvania General Assembly, committed as served.
- **Recommended E3 disposition:** hold — neither map nor terminalize as a
  registry gap until the operative text lands.

### Subject 2 — `compiled_pathway:SC:human-trafficking-survivor-expungement`

- **Asserted mechanism:** survivor motion to expunge trafficking-related
  convictions/adjudications.
- **Expected authority:** S.C. Code § 16-3-2020 — asserted by
  `eligibility-rules.ts:21`, contradicted by the same state pack's
  `pathways.ts:185` ("exact subsection unconfirmed in Nationwide source"),
  and absent (0 occurrences) from the compiled SC profile. Whether the section
  grants expungement, vacatur, sealing, eligibility, procedure — or is only a
  substantive offense provision — is undeterminable from the repository.
- **Blocker (externally owned):** one fetch of S.C. Code Title 16 Chapter 3
  (§ 16-3-2020) from scstatehouse.gov. Either finding closes the obligation:
  a relief-granting text, or a proven offense-only text.
- **Recommended E3 disposition:** hold — the candidate registry-gap
  disposition stays unpublishable until the text proves relief is granted or
  withheld.

## What is in place for the moment bytes arrive

The lane record carries a materialization contract: bytes land as served under
`data/rcap-crosswalk-enrichment/final-official-sources/files/<JUR>/`, the
subject's receipt fields are filled (verified authority, sha256, retrieval
timestamp, exact section pointer, verbatim operative span, currentness,
support verdict), and the verifier then **hash-verifies the bytes, requires
the cited section and the quoted span to be present in them, refuses any
non-official host as final authority, and refuses unclaimed bytes**. Until
then it enforces the inverse: a `still_blocked` subject may not carry a
verified authority, hash, span, currentness finding or support verdict — a
conclusion can never exceed what a source states, including when the source
is absent.

Both retrieval packets are preserved untouched and pinned by sha256 in the
lane record (`ef2e8bd1…` PA, `6ad5c8d7…` SC). Note: the packets file returned
bytes under `private/Nationwide Record Clearing/…`, which is gitignored —
that copy is Roger's local convention; the committed receipt lives here.
