# CB02V-NY2 independent candidate verification

## Verdict

`CANDIDATE_BLOCKED_MISSING_EVIDENCE`

The checkout does not contain candidate `cb02-ny-160-55-legacy-2`, an assignment
that names it, a governed source binding for it, or its binary manifest. The
minimum ancestor supplied by the assignment is also not an object in this shallow
checkout. Therefore no candidate content, rendering entry point, canonical PDF,
boundary PDF, or binary-manifest expectation can be independently tested.

This is not a candidate acceptance or a legal-input block. The controlling legal
decision is present and supplies the legal baseline; the candidate evidence needed
to compare generated outputs with that baseline is absent.

## Legal baseline preserved for reverification

- **Route/cohort:** New York former-CPL-160.55 omitted-order motion for convictions
  from **September 1, 1980 through October 31, 1991**, inclusive.
- **Theory:** the disposition occurred while former CPL 160.55 required the
  sealing order, but the required order was omitted. The motion seeks entry and
  enforcement of that omitted legacy order.
- **Actor and destination:** the convicted person moves in the court that
  terminated the criminal action.
- **Timing and notice:** no current statewide statute establishes a separate
  filing deadline or legacy notice period. The packet must require service on the
  district attorney and confirmation of the terminating court's local
  criminal-motion return-date and service rules before filing.
- **Twenty days:** a 20-day period must not be represented as an express statutory
  rule for this cohort. It may be used only as a conservative operational minimum
  when consistent with local practice.
- **Boundary:** the current CPL 160.55(3) motion governs the separate pre-September
  1, 1980 cohort and must not be misstated as the authority for this candidate.

The baseline above was not counted as a candidate pass because no candidate bytes
were available to inspect.

## Verification execution

The required cloud preflight returned
`PACKET_BUILD_ENVIRONMENT_NOT_READY: 11/14 passed, 3 failed, 3 not applicable`.
Its three failures were: the minimum Captain SHA is unavailable, the assignment
is absent, and the family does not resolve from either governed source index.

Consequently:

- two clean temporary render directories were not created because there is no
  rendering entry point to execute;
- two-run byte determinism was not run;
- manifest path, SHA-256, byte-length, and page-count comparisons were not run;
- nonvisual counters were not run;
- no candidate file was modified;
- no PDF or other binary was created or committed;
- no commercial authority or canonical status was granted.

## Required next evidence

Reverification requires the actual noncanonical candidate source, its rendering
entry point, a dispatch/assignment visible in this checkout, a governed source
binding, and a binary manifest for both canonical and boundary outputs. The
repair payload requests only that missing evidence; it does not authorize changes
to candidate files.
