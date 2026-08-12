# NE CC-6-12.pdf — production readiness handoff (lane D1)

Component role: principal_petition_or_request. Classification: dirty_acroform.
Source pinned: `LegalEase Nebraska/CC-6-12.pdf` sha256 `68478452073cdb89dac20843e3d7f5df2ad31b41608ab04deafe940bd6401d28` (1682731 bytes).

Status: FAIL-CLOSED. The source binary is not in this clone and the
committed field-map draft carries no extracted fields, so no census,
no filled PDF, no flatten, and no contact sheet were produced.

Exact unblock, in order:
1. Supply 'private/Nationwide Record Clearing/LegalEase Nebraska/CC-6-12.pdf' with sha256 68478452073cdb89dac20843e3d7f5df2ad31b41608ab04deafe940bd6401d28, then run field extraction against the verified binary before any fill or flatten.
2. Re-run field extraction; file field-census.json + production-field-map.json under this directory.
3. Render fill + blank-vs-filled contact sheet; F owns visual approval (never self-approved).

Prior committed shadow render: `tmp/official-pdf-shadow-batch/all50/nebraska-legalease-nebraska-cc-6-12-sample.pdf` (sha256 `e966142fb86141be…`).

Populate policy on census arrival: participant + deterministic fields only;
judge/clerk/prosecutor/agency/hearing/service/signature/notarization/court
disposition/outside-party fields are never populated. No co-branding on the official form.
