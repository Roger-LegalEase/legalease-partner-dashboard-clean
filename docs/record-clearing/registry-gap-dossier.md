# Registry-gap dossier

The **45** compiled pathways Session A's graph disposes as
`family_bridge_missing_no_track`. No registry track maps to them, so no track-keyed packet
set can be reached and no track-level adoption applies.

**Every one stays in the intended-paid denominator.** A pathway with no track is a gap in
the registry, not evidence that LegalEase does not intend to sell the route.

| | |
|---|---|
| Registry-gap pathways | 45 |
| With a pathway-level packet set | 45 |
| In a jurisdiction bound by EXT-ADOPT-01 | 40 |
| Carrying a counsel ratification | 13 |

## What each record carries

- **The compiled pathway, preserved verbatim** — id, label, summary, source ref, route type,
  counsel ratification — so nothing is lost if the registry is rebuilt around it.
- **Its pathway-level packet set**, read from the compiled `packetGenerator` rather than from
  a track: mode, form-mapping status, source form candidates with hashes, required inputs,
  source rule refs.
- **The legal-design evidence** already covering its jurisdiction: the adoption record and
  hash, the bound families with their memo and proof hashes, and the compiled decision rules
  that name the pathway.
- **The exact future registry-owner action**, and what unblocks when it lands.

## Packet plan modes

| Mode | Pathways |
|---|---|
| `state_specific_custom_packet_from_source_rules` | 27 |
| `official_form_overlay_or_source_form_set` | 10 |
| `automatic_relief_verification_and_guidance` | 8 |

## By jurisdiction

| Jurisdiction | Pathways |
|---|---|
| AK | 1 |
| CA | 1 |
| CO | 1 |
| DE | 1 |
| ID | 3 |
| IL | 3 |
| MD | 1 |
| ME | 2 |
| MS | 11 |
| ND | 1 |
| NV | 2 |
| NY | 1 |
| OH | 1 |
| OK | 2 |
| SC | 1 |
| SD | 3 |
| UT | 2 |
| VT | 1 |
| WA | 1 |
| WI | 2 |
| WV | 2 |
| WY | 2 |

Regenerate with `node scripts/generate-rcap-registry-gap-dossier.mjs`.
