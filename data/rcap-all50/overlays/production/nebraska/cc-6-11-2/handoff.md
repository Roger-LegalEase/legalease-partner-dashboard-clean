# NE CC-6-11-2.pdf — production readiness handoff (lane D1)

Component role: principal_petition_or_request. Classification: dirty_acroform.
Source pinned: `LegalEase Nebraska/CC-6-11-2.pdf` sha256 `8bfa884d66c2d485fc28acfae865075bdb02ae7d6b7a3de839c0248464e767b6` (2766067 bytes).

Status: FAIL-CLOSED. The source binary is not in this clone and the
committed field-map draft carries no extracted fields, so no census,
no filled PDF, no flatten, and no contact sheet were produced.

Exact unblock, in order:
1. Supply 'private/Nationwide Record Clearing/LegalEase Nebraska/CC-6-11-2.pdf' with sha256 8bfa884d66c2d485fc28acfae865075bdb02ae7d6b7a3de839c0248464e767b6, then run field extraction against the verified binary before any fill or flatten.
2. Re-run field extraction; file field-census.json + production-field-map.json under this directory.
3. Render fill + blank-vs-filled contact sheet; F owns visual approval (never self-approved).

Prior committed shadow render: `tmp/official-pdf-shadow-batch/all50/nebraska-legalease-nebraska-cc-6-11-2-sample.pdf` (sha256 `0d323398a5f0ac24…`).

Populate policy on census arrival: participant + deterministic fields only;
judge/clerk/prosecutor/agency/hearing/service/signature/notarization/court
disposition/outside-party fields are never populated. No co-branding on the official form.
