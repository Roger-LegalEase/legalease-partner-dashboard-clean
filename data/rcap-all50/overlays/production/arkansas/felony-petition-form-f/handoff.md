# AR Felony-Petition-Form-f.pdf — production readiness handoff (lane D1)

Component role: principal_petition_or_request. Classification: dirty_acroform.
Source pinned: `LegalEase Arkanasa/Felony-Petition-Form-f.pdf` sha256 `6065fe0248e9022c866ac2506c02df35b533439f6d15fc40843b709eea375d9b` (178947 bytes).

Status: FAIL-CLOSED. The source binary is not in this clone and the
committed field-map draft carries no extracted fields, so no census,
no filled PDF, no flatten, and no contact sheet were produced.

Exact unblock, in order:
1. Supply 'private/Nationwide Record Clearing/LegalEase Arkanasa/Felony-Petition-Form-f.pdf' with sha256 6065fe0248e9022c866ac2506c02df35b533439f6d15fc40843b709eea375d9b, then run field extraction against the verified binary before any fill or flatten.
2. Re-run field extraction; file field-census.json + production-field-map.json under this directory.
3. Render fill + blank-vs-filled contact sheet; F owns visual approval (never self-approved).

Prior committed shadow render: `tmp/official-pdf-shadow-batch/all50/arkansas-legalease-arkanasa-felony-petition-form-f-sample.pdf` (sha256 `32da3c12c1bfbbc8…`).

Populate policy on census arrival: participant + deterministic fields only;
judge/clerk/prosecutor/agency/hearing/service/signature/notarization/court
disposition/outside-party fields are never populated. No co-branding on the official form.
