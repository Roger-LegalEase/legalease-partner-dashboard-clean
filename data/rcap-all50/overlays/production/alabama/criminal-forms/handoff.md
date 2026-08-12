# AL criminal-forms.html — production readiness handoff (lane D1)

Component role: principal_petition_or_request. Classification: html_form.
Source pinned: `LegalEase Alabama/criminal-forms.html` sha256 `55acbbbee2554b6c57dbae84ad13c7aaa78545521cba341499d1c21c07a9e666` (29007 bytes).

Status: FAIL-CLOSED. The source binary is not in this clone and the
committed field-map draft carries no extracted fields, so no census,
no filled PDF, no flatten, and no contact sheet were produced.

Exact unblock, in order:
1. Supply 'private/Nationwide Record Clearing/LegalEase Alabama/criminal-forms.html' with sha256 55acbbbee2554b6c57dbae84ad13c7aaa78545521cba341499d1c21c07a9e666.
2. Re-run field extraction; file field-census.json + production-field-map.json under this directory.
3. Render fill + blank-vs-filled contact sheet; F owns visual approval (never self-approved).

No committed shadow render exists for this form.

Populate policy on census arrival: participant + deterministic fields only;
judge/clerk/prosecutor/agency/hearing/service/signature/notarization/court
disposition/outside-party fields are never populated. No co-branding on the official form.
