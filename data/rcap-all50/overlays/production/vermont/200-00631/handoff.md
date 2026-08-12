# VT 200-00631.pdf — production readiness handoff (lane D1)

Component role: principal_petition_or_request. Classification: dirty_acroform.
Source pinned: `LegalEase Vermont/200-00631.pdf` sha256 `a4afde13b306a87f65fb40f43eb00a8e57a15d4e8b80255d11decfca0b96e6d3` (832881 bytes).

Status: FAIL-CLOSED. The source binary is not in this clone and the
committed field-map draft carries no extracted fields, so no census,
no filled PDF, no flatten, and no contact sheet were produced.

Exact unblock, in order:
1. Supply 'private/Nationwide Record Clearing/LegalEase Vermont/200-00631.pdf' with sha256 a4afde13b306a87f65fb40f43eb00a8e57a15d4e8b80255d11decfca0b96e6d3, then run field extraction against the verified binary before any fill or flatten.
2. Re-run field extraction; file field-census.json + production-field-map.json under this directory.
3. Render fill + blank-vs-filled contact sheet; F owns visual approval (never self-approved).

Prior committed shadow render: `tmp/official-pdf-shadow-batch/all50/vermont-legalease-vermont-200-00631-sample.pdf` (sha256 `9a4ab4e85409c0cc…`).

Populate policy on census arrival: participant + deterministic fields only;
judge/clerk/prosecutor/agency/hearing/service/signature/notarization/court
disposition/outside-party fields are never populated. No co-branding on the official form.
