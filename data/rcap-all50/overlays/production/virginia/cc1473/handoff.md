# VA cc1473.pdf — production readiness handoff (lane D1)

Component role: principal_petition_or_request. Classification: dirty_acroform.
Source pinned: `LegalEase Virginia /cc1473.pdf` sha256 `6f4390495a8781ee48845b575c7e245eb09a2e492319aa51206882a1b4cdf3f3` (31540 bytes).

Status: FAIL-CLOSED. The source binary is not in this clone and the
committed field-map draft carries no extracted fields, so no census,
no filled PDF, no flatten, and no contact sheet were produced.

Exact unblock, in order:
1. Supply 'private/Nationwide Record Clearing/LegalEase Virginia /cc1473.pdf' with sha256 6f4390495a8781ee48845b575c7e245eb09a2e492319aa51206882a1b4cdf3f3, then run field extraction against the verified binary before any fill or flatten.
2. Re-run field extraction; file field-census.json + production-field-map.json under this directory.
3. Render fill + blank-vs-filled contact sheet; F owns visual approval (never self-approved).

Prior committed shadow render: `tmp/official-pdf-shadow-batch/all50/virginia-legalease-virginia-cc1473-sample.pdf` (sha256 `5a039a6673184ab7…`).

Populate policy on census arrival: participant + deterministic fields only;
judge/clerk/prosecutor/agency/hearing/service/signature/notarization/court
disposition/outside-party fields are never populated. No co-branding on the official form.
