# VA cc1473inst.pdf — production readiness handoff (lane D1)

Component role: instructions. Classification: scanned_pdf.
Source pinned: `LegalEase Virginia /cc1473inst.pdf` sha256 `ffbfc0da7254f3c6bebc9d76878f34e7b2e701324fa2f56bf58460b28479fde6` (20802 bytes).

Status: FAIL-CLOSED. The source binary is not in this clone and the
committed field-map draft carries no extracted fields, so no census,
no filled PDF, no flatten, and no contact sheet were produced.

Exact unblock, in order:
1. Supply 'private/Nationwide Record Clearing/LegalEase Virginia /cc1473inst.pdf' with sha256 ffbfc0da7254f3c6bebc9d76878f34e7b2e701324fa2f56bf58460b28479fde6, then run field extraction against the verified binary before any fill or flatten.
2. Re-run field extraction; file field-census.json + production-field-map.json under this directory.
3. Render fill + blank-vs-filled contact sheet; F owns visual approval (never self-approved).

Prior committed shadow render: `tmp/official-pdf-shadow-batch/all50/virginia-legalease-virginia-cc1473inst-sample.pdf` (sha256 `ad1a687ca199fbac…`).

Populate policy on census arrival: participant + deterministic fields only;
judge/clerk/prosecutor/agency/hearing/service/signature/notarization/court
disposition/outside-party fields are never populated. No co-branding on the official form.
