# AK RequestToSealCrimInfo.pdf — production readiness handoff (lane D1)

Component role: principal_petition_or_request. Classification: scanned_pdf.
Source pinned: `LegalEase Alaska/RequestToSealCrimInfo.pdf` sha256 `1fb64733f46c397beb69d1da8d72a1f1462669f8dfb7611e86a833c45aa5c80a` (37708 bytes).

Status: FAIL-CLOSED. The source binary is not in this clone and the
committed field-map draft carries no extracted fields, so no census,
no filled PDF, no flatten, and no contact sheet were produced.

Exact unblock, in order:
1. Supply 'private/Nationwide Record Clearing/LegalEase Alaska/RequestToSealCrimInfo.pdf' with sha256 1fb64733f46c397beb69d1da8d72a1f1462669f8dfb7611e86a833c45aa5c80a, then run field extraction against the verified binary before any fill or flatten.
2. Re-run field extraction; file field-census.json + production-field-map.json under this directory.
3. Render fill + blank-vs-filled contact sheet; F owns visual approval (never self-approved).

Prior committed shadow render: `tmp/official-pdf-shadow-batch/all50/alaska-legalease-alaska-requesttosealcriminfo-sample.pdf` (sha256 `adcbfd44dd6394bb…`).

Populate policy on census arrival: participant + deterministic fields only;
judge/clerk/prosecutor/agency/hearing/service/signature/notarization/court
disposition/outside-party fields are never populated. No co-branding on the official form.
