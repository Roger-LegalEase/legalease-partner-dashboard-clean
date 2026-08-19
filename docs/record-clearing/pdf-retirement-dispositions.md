# PDF operational-retirement dispositions

**83** of 128 problematic-PDF assets looked orphaned, duplicate, optional,
superseded or historical. Each was proven against six dependency surfaces by scanning
**4204** files for **329** identifiers, not by assertion.

| Surface | What it looks for |
|---|---|
| `route` | a compiled pathway or the packet route resolver |
| `runtime_loader` | any reference in application source |
| `field_map` | an overlay production package or field-map draft |
| `packet_family` | a packet-set component, adopted family or packet proof |
| `fixture` | a fixture, test double or harness |
| `legal_design` | a legal-design, adoption or terminalization record |

| Disposition | Assets |
|---|---|
| `retire_from_operational_scans` | 0 |
| `keep_operational` | 83 |

Assets kept, by the surface that still references them:

| Surface | Assets kept |
|---|---|
| `field_map` | 83 |
| `legal_design` | 81 |
| `runtime_loader` | 46 |
| `route` | 42 |
| `packet_family` | 19 |
| `fixture` | 11 |

## What retirement does and does not do

It removes the asset from operational scans and from the acquisition queue. It deletes no
bytes, changes no runtime, and changes no route's sellability. An asset can come back the
moment something references it again — the proof re-runs on every generation.

The register and this lane's own artifacts are excluded from the scan. Counting them would
make every asset permanently un-retirable by virtue of being listed as a retirement
candidate.

Regenerate with `node scripts/generate-rcap-pdf-retirement-dispositions.mjs`.
