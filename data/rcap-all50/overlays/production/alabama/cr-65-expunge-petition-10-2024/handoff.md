# AL cr-65-expunge-petition-10-2024.pdf — production readiness handoff (lane D1)

Component role: principal_petition_or_request. Classification: dirty_acroform.
Source pinned: `LegalEase Alabama/cr-65-expunge-petition-10-2024.pdf` sha256 `c2e0c7bd7abca2c83c469d7da1aa0b80b132e653f8712d0b4ce77c8b160b2a39` (468056 bytes).

Status: FAIL-CLOSED. The source binary is not in this clone and the
committed field-map draft carries no extracted fields, so no census,
no filled PDF, no flatten, and no contact sheet were produced.

Exact unblock, in order:
1. Supply 'private/Nationwide Record Clearing/LegalEase Alabama/cr-65-expunge-petition-10-2024.pdf' with sha256 c2e0c7bd7abca2c83c469d7da1aa0b80b132e653f8712d0b4ce77c8b160b2a39, then run field extraction against the verified binary before any fill or flatten.
2. Re-run field extraction; file field-census.json + production-field-map.json under this directory.
3. Render fill + blank-vs-filled contact sheet; F owns visual approval (never self-approved).

Prior committed shadow render: `tmp/official-pdf-shadow-batch/all50/alabama-legalease-alabama-cr-65-expunge-petition-10-2024-sample.pdf` (sha256 `6eb52b0665a19c85…`).

Populate policy on census arrival: participant + deterministic fields only;
judge/clerk/prosecutor/agency/hearing/service/signature/notarization/court
disposition/outside-party fields are never populated. No co-branding on the official form.
