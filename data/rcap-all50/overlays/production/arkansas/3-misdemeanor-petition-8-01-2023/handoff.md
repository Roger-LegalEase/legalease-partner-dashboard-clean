# AR 3-Misdemeanor-Petition-8_01_2023.pdf — production readiness handoff (lane D1)

Component role: principal_petition_or_request. Classification: dirty_acroform.
Source pinned: `LegalEase Arkanasa/3-Misdemeanor-Petition-8_01_2023.pdf` sha256 `63a308c4fd36a35918249574675c3e83ed47e677cffeae30e09c7e344cfcda23` (775618 bytes).

Status: FAIL-CLOSED. The source binary is not in this clone and the
committed field-map draft carries no extracted fields, so no census,
no filled PDF, no flatten, and no contact sheet were produced.

Exact unblock, in order:
1. Supply 'private/Nationwide Record Clearing/LegalEase Arkanasa/3-Misdemeanor-Petition-8_01_2023.pdf' with sha256 63a308c4fd36a35918249574675c3e83ed47e677cffeae30e09c7e344cfcda23, then run field extraction against the verified binary before any fill or flatten.
2. Re-run field extraction; file field-census.json + production-field-map.json under this directory.
3. Render fill + blank-vs-filled contact sheet; F owns visual approval (never self-approved).

Prior committed shadow render: `tmp/official-pdf-shadow-batch/all50/arkansas-legalease-arkanasa-3-misdemeanor-petition-8-01-2023-sample.pdf` (sha256 `fd6322f49e52db8d…`).

Populate policy on census arrival: participant + deterministic fields only;
judge/clerk/prosecutor/agency/hearing/service/signature/notarization/court
disposition/outside-party fields are never populated. No co-branding on the official form.
