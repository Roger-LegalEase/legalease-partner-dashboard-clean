# VT 200-00131.pdf — production readiness handoff (lane D1)

Component role: principal_petition_or_request. Classification: dirty_acroform.
Source pinned: `LegalEase Vermont/200-00131.pdf` sha256 `5afb8d524b52a6e9faaa2a797c9d2230dc11a492d1f5544bd9cf9f05a9d3379a` (1326589 bytes).

Status: FAIL-CLOSED. The source binary is not in this clone and the
committed field-map draft carries no extracted fields, so no census,
no filled PDF, no flatten, and no contact sheet were produced.

Exact unblock, in order:
1. Supply 'private/Nationwide Record Clearing/LegalEase Vermont/200-00131.pdf' with sha256 5afb8d524b52a6e9faaa2a797c9d2230dc11a492d1f5544bd9cf9f05a9d3379a, then run field extraction against the verified binary before any fill or flatten.
2. Re-run field extraction; file field-census.json + production-field-map.json under this directory.
3. Render fill + blank-vs-filled contact sheet; F owns visual approval (never self-approved).

Prior committed shadow render: `tmp/official-pdf-shadow-batch/all50/vermont-legalease-vermont-200-00131-sample.pdf` (sha256 `12d006e3ae8b7369…`).

Populate policy on census arrival: participant + deterministic fields only;
judge/clerk/prosecutor/agency/hearing/service/signature/notarization/court
disposition/outside-party fields are never populated. No co-branding on the official form.
