# Alabama official-PDF family preflight

This directory is an isolated, fail-closed preflight for the nine normalized
Alabama official-PDF tracks and their 26 components. It does not alter a
shared registry or live route.

Tracked evidence establishes three document identities:

- `CR-65` is reconciled to one retained 10/2024 AcroForm fingerprint shared by
  17 components. The reconciliation is evidence, not an Edition 1.2 portable
  projection.
- `C-10-CRIMINAL` has an Edition 1.2 authority identity and retained
  fingerprint shared by eight conditional fee-waiver components.
- `ABPP-3` has a confirmed June 2025 official identity and observed
  fingerprint, but no retained artifact or authorized projection. Its
  instructions also identify a mandatory Waiver of Liability that is absent
  from the normalized packet; this preflight records the dependency without
  changing legal design.

Session A supplies no captain assignment, assignment anchor, or portable
projection. Recorded private paths are identity evidence only. No AL code or
verifier resolves, stats, or reads them, and no worker is authorized to
download or materialize a source.

Run:

```text
node scripts/verify-rcap-alabama-official-pdf-preflight.mjs
node scripts/verify-rcap-alabama-acroform-fill.mjs
```

Both `--require-ready` modes intentionally fail with
`captain_assignment_required` and the remaining identity, mapping, legal, and
review blockers.
