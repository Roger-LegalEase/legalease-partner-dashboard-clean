# Massachusetts official-PDF family preflight

This directory is the fail-closed pre-materialization contract for the six
normalized Massachusetts official-form routes:

- `ma-seal-admin`
- `ma-seal-decrim`
- `ma-seal-court`
- `ma-expunge-time`
- `ma-expunge-k`
- `ma-expunge-mj`

Those routes use five physical PDF sources because the two sealing-through-
Probation routes share the same Petition to Seal form.

No captain-owned assignment, portable projection, or Massachusetts worker
source is present in this workspace. Legacy `private/Nationwide Record
Clearing/` paths are retained only as registry identity evidence; packet code
does not read them. Nothing in this directory substitutes for, reconstructs,
or downloads an official source. The pinned fingerprints come from the
existing source-artifact registry and Master Library records.

The artifacts deliberately separate four facts:

1. A document identity and historical fingerprint are known.
2. The corresponding bytes are not materialized in this workspace.
3. A field map cannot be approved without inspecting those exact bytes.
4. Even exact candidate bytes remain runtime-disabled until source,
   technical, visual, and legal gates are independently cleared.

`OCP004`, the 10-day notice/opt-out form in the old Nationwide inventory, is
listed as an inventory exclusion because no normalized Massachusetts
`official_pdf_fill` component uses it. It is not silently treated as a seventh
packet route.

Run the focused verifier with:

```text
node scripts/verify-rcap-massachusetts-official-pdf-families.mjs
```

Use `--require-materialized` only after integration issues the immutable
captain assignment and portable projection. In the current state that mode is
expected to fail.
