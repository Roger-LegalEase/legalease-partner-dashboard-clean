# Kansas municipal routes — independent offline review

Generated: 2026-09-02T00:00:00.000Z

This package is review-only. It creates no fulfillment authority, route binding, payment eligibility, canary result, central raster record, ledger change, open route, or Production change.

## Verdict

**FAIL_REPAIR_REQUIRED** for `rcap-ks-custom-pleading`.

Both municipal routes fail `CLIPPING_AND_OVERLAP`: 24 of 25 exact-byte raster pages visibly clip text at the right edge. The vector measurement found text up to 65 points beyond the 612-point MediaBox. All 25 pages were independently measured for overlap; zero overlapping text-run pairs were found. Both boundary fixtures additionally fail `KNOWN_PREFILLS` because the long mailing address on petition page 3 is visibly truncated at the right edge.

The non-raster focused route-artifact verifier returned `ROUTE_PASS_COMPLETE` on all four route fixtures (exact component set, exact bytes, 7/7 values extractable, and zero nonvisual completeness counters). That does not cure the participant-visible clipping.

## Exact PDF bindings

| Route | Fixture | SHA-256 | Bytes | Pages | Clipped pages | Overlap pages |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| ks-12-4516-municipal | canonical | `f79d5b4e82d3ccf22c9b03aa42ad202e0796a13b4de95f3d25b38b2adf22f810` | 18262 | 6 | 6 | 0 |
| ks-12-4516-municipal | boundary | `7b234e970d38bdc0515122916c6f3961f1140e74f12978b6096e6aa34928600f` | 18886 | 7 | 6 | 0 |
| ks-12-4516a-municipal-arrest | canonical | `8a85bc0f2365938bd8b5e0483585b95abf2550a6cc24a4717b0d72001abd708d` | 17378 | 6 | 6 | 0 |
| ks-12-4516a-municipal-arrest | boundary | `dd364be7194a5e23643057ba75e5d5ea84950e7cd18b2945db5483761b9f3617` | 17578 | 6 | 6 | 0 |

## Obligation result summary

| Route | Fixture | Failed obligations |
| --- | --- | --- |
| ks-12-4516-municipal | canonical | `CLIPPING_AND_OVERLAP` |
| ks-12-4516-municipal | boundary | `KNOWN_PREFILLS`, `CLIPPING_AND_OVERLAP` |
| ks-12-4516a-municipal-arrest | canonical | `CLIPPING_AND_OVERLAP` |
| ks-12-4516a-municipal-arrest | boundary | `KNOWN_PREFILLS`, `CLIPPING_AND_OVERLAP` |

`rows.json` contains measured evidence for all fifteen obligations on the family row and each route/fixture row. `raster-receipt.json` contains the per-page clipping, overlap, readability, edge-ink, geometry, and raster-hash evidence.

## Roger named visual-approval checklist

All boxes are intentionally unchecked. Checking a finding acknowledges review of this package; it does not create fulfillment authority or approve a route for live use. Readability approval must remain unchecked while the clipping defect persists.

### ks-12-4516-municipal — canonical

- [ ] Roger — Clipping: I reviewed all 6 rasters and approve the recorded clipping finding (6/6 pages fail).

- [ ] Roger — Overlap: I reviewed all rasters and approve the recorded overlap finding (0 overlapping text-run pairs).

- [ ] Roger — Readability: I visually approve this fixture as readable for participant use. **Keep unchecked while clipping remains.**

- [ ] Roger — Route identity: I visually approve the printed route identity as `Municipal conviction or diversion expungement - K.S.A. 12-4516`.

- [ ] Roger — Component completeness: I visually approve the petition, proposed order, and filing-instructions component set in the recorded page order.

### ks-12-4516-municipal — boundary

- [ ] Roger — Clipping: I reviewed all 7 rasters and approve the recorded clipping finding (6/7 pages fail).

- [ ] Roger — Overlap: I reviewed all rasters and approve the recorded overlap finding (0 overlapping text-run pairs).

- [ ] Roger — Readability: I visually approve this fixture as readable for participant use. **Keep unchecked while clipping remains.**

- [ ] Roger — Route identity: I visually approve the printed route identity as `Municipal conviction or diversion expungement - K.S.A. 12-4516`.

- [ ] Roger — Component completeness: I visually approve the petition, proposed order, and filing-instructions component set in the recorded page order.

### ks-12-4516a-municipal-arrest — canonical

- [ ] Roger — Clipping: I reviewed all 6 rasters and approve the recorded clipping finding (6/6 pages fail).

- [ ] Roger — Overlap: I reviewed all rasters and approve the recorded overlap finding (0 overlapping text-run pairs).

- [ ] Roger — Readability: I visually approve this fixture as readable for participant use. **Keep unchecked while clipping remains.**

- [ ] Roger — Route identity: I visually approve the printed route identity as `Municipal arrest record expungement - K.S.A. 12-4516a`.

- [ ] Roger — Component completeness: I visually approve the petition, proposed order, and filing-instructions component set in the recorded page order.

### ks-12-4516a-municipal-arrest — boundary

- [ ] Roger — Clipping: I reviewed all 6 rasters and approve the recorded clipping finding (6/6 pages fail).

- [ ] Roger — Overlap: I reviewed all rasters and approve the recorded overlap finding (0 overlapping text-run pairs).

- [ ] Roger — Readability: I visually approve this fixture as readable for participant use. **Keep unchecked while clipping remains.**

- [ ] Roger — Route identity: I visually approve the printed route identity as `Municipal arrest record expungement - K.S.A. 12-4516a`.

- [ ] Roger — Component completeness: I visually approve the petition, proposed order, and filing-instructions component set in the recorded page order.

## Scope controls

- Kansas Judicial Council issuer-permission routes read or touched: **0**
- VF05 claim released: **NO**
- Packet content edited or repaired: **NO**
- Central raster records modified: **NO**
- Ledger modified: **NO**
- Canary run: **NO**
- Route opened or bound: **NO**
- Payment enabled: **NO**
- Production touched: **NO**
