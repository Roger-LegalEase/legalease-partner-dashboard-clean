# Mississippi Clinic Filing Revision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the bounded Mississippi non-conviction clinic packet in conventional pleading form with arrest-and-release gates, a mandatory jurat, an MCIC-ready confidential addendum, and filing-safe service and exhibit instructions.

**Architecture:** The versioned JSON specification remains the only source of legal prose. The composer will add typed pleading blocks and fail-closed Mississippi fact validation. The PDF renderer will route guidance documents through the existing Helvetica layout and court documents through a U.S. Letter Times Roman pleading layout with continuation headers.

**Tech Stack:** TypeScript, JSON packet specifications, Node.js verification scripts, `pdf-lib`, Poppler raster/text inspection, existing RCAP authority generators.

---

### Task 1: Add a failing filing-revision verifier

**Files:**
- Create: `scripts/verify-ms-clinic-filing-revision.mjs`
- Test: `scripts/verify-ms-clinic-filing-revision.mjs`

- [ ] **Step 1: Write the failing structural assertions**

Create a verifier that imports the registered specification and composer. Assert the new required fact names, pleading presentation, confidential-addendum section, mandatory verification section, exact five-document roles, and prohibited-copy exclusions.

```js
const required = new Set(specification.requiredFacts.map(({ factId }) => factId));
for (const id of [
  "case_caption_plaintiff_name", "case_caption_defendant_name", "name_used_at_arrest",
  "aliases", "actual_arrest", "arrest_date", "arrest_location", "release_confirmed",
  "release_date_or_record_source", "charge_legal_citation", "charge_classification",
  "social_security_number", "social_security_number_last_four", "race", "sex",
  "mcic_identifier_delivery_method", "mcic_identifier_method_confirmation_source",
  "certified_disposition_exhibit_status", "docket_sheet_exhibit_status"
]) assert.ok(required.has(id), `missing ${id}`);

assert.equal(petition.presentation, "pleading");
assert.ok(petition.sections.some(({ kind }) => kind === "verification_on_oath"));
assert.ok(order.sections.some(({ kind }) => kind === "confidential_identifier_addendum"));
assert.doesNotMatch(JSON.stringify(specification), /fingerprint records are not expunged/i);
assert.doesNotMatch(JSON.stringify(specification), /no notarization is required/i);
```

- [ ] **Step 2: Add fail-closed behavior assertions**

```js
for (const [factId, unsafeValue] of [
  ["actual_arrest", "No"],
  ["release_confirmed", "No"],
  ["certified_disposition_exhibit_status", "Missing"],
  ["docket_sheet_exhibit_status", "Missing"]
]) {
  const unsafe = structuredClone(fixture);
  unsafe.facts[factId] = unsafeValue;
  assert.throws(() => composeGradeAPacket(specification, unsafe), GradeAPacketCompositionError);
}
```

- [ ] **Step 3: Run the verifier and observe the expected failure**

Run: `node scripts/verify-ms-clinic-filing-revision.mjs`
Expected: FAIL at the first missing filing-revision fact or pleading section.

- [ ] **Step 4: Commit the red test**

```bash
git add scripts/verify-ms-clinic-filing-revision.mjs
git commit -m "test(rcap): define Mississippi filing revision contract"
```

### Task 2: Revise the specification and synthetic matters

**Files:**
- Modify: `data/record-clearing/packet-specifications/MS-nonconviction-expungement-99-19-71-4.v1.json`
- Modify: `data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.fixture.json`
- Modify: `data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.boundary.fixture.json`
- Modify: `src/lib/rcap/grade-a/packet-specification.ts`

- [ ] **Step 1: Extend specification types**

Add route-neutral presentation and section metadata.

```ts
export type PacketSpecificationSection = {
  heading: string;
  kind: string;
  body?: string;
  fields?: string[];
  fieldLabels?: Record<string, string>;
  assertions?: Array<{ id: string; text: string; facts: string[] }>;
  notarisationRequired?: boolean;
};

export type PacketSpecificationDocument = {
  // existing fields
  presentation?: "guidance" | "pleading";
};
```

- [ ] **Step 2: Replace combined and unsupported facts**

Remove `arrest_or_citation_date`, `arresting_or_citing_agency`, `agency_case_or_citation_number`, and `indictment_record`. Add the fact IDs asserted in Task 1 plus `arresting_agency`, `agency_case_number`, `personal_impact_confirmed`, `personal_impact_statement`, and `service_address_confirmation_status`.

- [ ] **Step 3: Replace filing-document sections**

Use these section kinds for the three court-document components:

```json
[
  "pleading_caption",
  "pleading_paragraph",
  "pleading_numbered_assertions",
  "pleading_identity_list",
  "pro_se_signature_block",
  "verification_on_oath",
  "service_certificate",
  "court_signature_block",
  "prosecutor_signature_block",
  "clerk_certification_block",
  "confidential_identifier_addendum"
]
```

Put all legal text in the JSON specification. Include the docket-exact caption, `COMES NOW`, arrest and release allegations, Exhibit A/B references, `WHEREFORE, PREMISES CONSIDERED`, purge/expunge/destroy language, MCIC transmission, jurat instructions, and the confidential-copy warning.

- [ ] **Step 4: Update synthetic fixtures**

The canonical fixture must use `City of Jackson` as the synthetic docket plaintiff, `Morgan Sample` as the docket defendant, an actual arrest and release, an exact synthetic misdemeanor charge and code citation, synthetic full and last-four SSN values, and an unconfirmed prosecutor address. Both fixtures must set:

```json
{
  "generationPurpose": "internal_review",
  "actual_arrest": "Yes",
  "release_confirmed": "Yes",
  "mcic_identifier_delivery_method": "Confidential MCIC identifier addendum",
  "certified_disposition_exhibit_status": "Synthetic review divider only; certified Exhibit A must be inserted before filing",
  "docket_sheet_exhibit_status": "Synthetic review divider only; docket Exhibit B must be inserted before filing"
}
```

- [ ] **Step 5: Run the filing-revision verifier**

Run: `node scripts/verify-ms-clinic-filing-revision.mjs`
Expected: progress beyond missing-fact assertions and fail at unimplemented composer behavior.

### Task 3: Implement composer gates and pleading blocks

**Files:**
- Modify: `src/lib/rcap/grade-a/composer.ts`
- Test: `scripts/verify-ms-clinic-filing-revision.mjs`

- [ ] **Step 1: Add typed pleading blocks**

```ts
export type GradeABlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "labelled"; label: string; value: string }
  | { kind: "bulleted"; items: string[] }
  | { kind: "numbered"; items: string[] }
  | { kind: "signature"; label: string; lines: string[]; note: string }
  | { kind: "rule" }
  | { kind: "pleading_caption"; court: string; plaintiff: string; defendant: string; caseNumber: string; title: string }
  | { kind: "pleading_paragraph"; text: string; number?: string; boldLead?: string }
  | { kind: "pleading_identity_list"; items: Array<{ label: string; value: string }> }
  | { kind: "pleading_signature"; heading: string; name: string; role: string; contactLines: string[] }
  | { kind: "notary_verification"; title: string; statement: string; participantName: string; venueState: string }
  | { kind: "service_certificate"; title: string; statement: string; participantName: string }
  | { kind: "official_signature"; title: string; role: string; note?: string }
  | { kind: "confidential_identifier_addendum"; title: string; warning: string; items: Array<{ label: string; value: string }> };
```

- [ ] **Step 2: Validate Mississippi facts before any document composes**

Add a route-scoped validator that rejects non-`Yes` arrest or release answers, citation-only records, inconsistent SSN last four, missing exhibit availability, and unconfirmed MCIC methods for participant delivery. Permit the explicit `internal_review` fixture purpose while retaining the held warning.

- [ ] **Step 3: Compose each new section kind**

Map the specification's text and fact references into the typed blocks. Skip the optional impact assertion unless `personal_impact_confirmed` equals `Yes`. Never place `social_security_number` in an ordinary pleading block.

- [ ] **Step 4: Run the verifier**

Run: `node scripts/verify-ms-clinic-filing-revision.mjs`
Expected: composer gates and structure PASS; renderer assertions still FAIL.

### Task 4: Render court documents as Mississippi pleadings

**Files:**
- Modify: `src/lib/rcap/grade-a/renderer.ts`
- Test: `scripts/verify-ms-clinic-filing-revision.mjs`

- [ ] **Step 1: Add a pleading render path**

Embed `TimesRoman`, `TimesRomanBold`, and `TimesRomanItalic`. Route `entry.presentation === "pleading"` to a U.S. Letter layout with 72-point margins, 12-point body text, measured wrapping, and no product kicker.

- [ ] **Step 2: Render captions and continuation headers**

Draw a centered court heading, party/case-number table, centered underlined title, and a continuation header containing court, case number, title, and page number. Reserve enough vertical space to prevent caption-only or heading-only pages.

- [ ] **Step 3: Render signatures, jurat, order, and addendum**

Keep the participant signature and contact block together. Render the verification certificate with blank county/date/notary/stamp fields. Render judge, prosecutor, clerk, and seal blocks without prefilling official acts. Start the confidential addendum on a new page and repeat its nonpublic warning in the footer.

- [ ] **Step 4: Verify deterministic bytes and renderer output**

Run: `node scripts/verify-ms-clinic-filing-revision.mjs`
Expected: PASS with five documents, deterministic bytes, and no prohibited text.

- [ ] **Step 5: Run the original demo verifier and typecheck**

Run: `node scripts/verify-ms-clinic-mode-demo.mjs && npm run typecheck`
Expected: PASS after updating its expected facts, version, review state, and page assertions.

### Task 5: Regenerate held artifacts and authority evidence

**Files:**
- Modify: `scripts/generate-ms-clinic-demo-packet.mjs`
- Modify: `data/rcap-ledger/grade-a/artifacts/ms-nonconviction-clinic-demo-canonical.pdf`
- Modify: `data/rcap-ledger/grade-a/artifacts/ms-nonconviction-clinic-demo-boundary.pdf`
- Modify: `data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.artifacts.json`
- Modify: `data/rcap-all50/overlays/census-v1/ms/ms-nonconv-set--custom-pleading/product-wiring.json`
- Modify: `data/rcap-ledger/packet-fulfillment-records.json`
- Modify: `data/rcap-grade-a/fulfillment-authority-registry.json`
- Modify: `data/rcap-grade-a/fulfillment-authority-projection.json`
- Modify: `data/rcap-grade-a/fulfillment-observation-snapshot.json`

- [ ] **Step 1: Keep authority closed**

Update the generator's evidence schema and renderer version while preserving:

```js
generationAllowed: false,
paymentEligible: false,
sponsorshipEligible: false,
independentReview: { status: "pending_independent_second_pass", obligations: 15 },
counselReview: { status: "revision_pending_named_mississippi_counsel", approvedArtifactHashes: [] }
```

- [ ] **Step 2: Regenerate PDFs and hashes**

Run: `node scripts/generate-ms-clinic-demo-packet.mjs`
Expected: two deterministic PDFs and evidence bound to the new specification hash.

- [ ] **Step 3: Regenerate authority projections**

Run: `node scripts/generate-rcap-grade-a-fulfillment-authority.mjs`
Expected: Mississippi remains `INCOMPLETE` and commercially held.

### Task 6: Raster review, full verification, and independent review

**Files:**
- Replace: `data/rcap-ledger/grade-a/reviews/ms-nonconviction-clinic-demo-rasters/canonical/page-*.png`
- Replace: `data/rcap-ledger/grade-a/reviews/ms-nonconviction-clinic-demo-rasters/boundary/page-*.png`
- Modify: `data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.raster-review.json`
- Modify: `docs/rcap/grade-a/MS_CLINIC_DEMO_PREVIEW_HANDOFF.md`

- [ ] **Step 1: Render every page to PNG**

Run Poppler at 150 DPI for both final PDFs. Remove only stale page PNGs from the two exact raster directories before replacing them.

- [ ] **Step 2: Inspect every raster**

Reject clipping, overlaps, caption-only pages, missing continuation headers, public full SSNs, completed official fields, or missing confidential warnings. Record page counts and findings in the raster-review JSON.

- [ ] **Step 3: Extract text and scan required/prohibited phrases**

Require `COMES NOW`, `appearing pro se`, arrest, release, Exhibit A, Exhibit B, `WHEREFORE, PREMISES CONSIDERED`, `VERIFICATION`, `signed and sworn to or affirmed`, `CERTIFIED TRUE COPY`, and MCIC. Reject `fingerprint records are not expunged`, `No notarization is required`, `Lawrence Blackmon`, `Tracy Woodley`, `SAMPLE PERSON`, `MSB #`, and attorney-representation language.

- [ ] **Step 4: Run the complete verification matrix**

Run:

```bash
npm run typecheck
node scripts/verify-ms-clinic-filing-revision.mjs
node scripts/verify-ms-clinic-mode-demo.mjs
node scripts/verify-rcap-grade-a-fulfillment-authority.mjs
node scripts/generate-rcap-grade-a-fulfillment-authority.mjs --check
node scripts/verify-expungement-commercial-flow-contract.mjs
node scripts/clinic-mode/verify-schema-rls.mjs
node scripts/security/test-clinic-participant-ownership-denials.mjs
node scripts/clinic-mode/verify-browser.mjs
node scripts/security/test-clinic-mobile-accessibility.mjs
```

Expected: every listed command exits zero. Record any unrelated baseline failure without modifying out-of-scope systems.

- [ ] **Step 5: Obtain the independent second-worker review**

Give the reviewer the exact commit, specification SHA-256, both PDF SHA-256 values, review rubric, and source boundaries. Accept no self-reported result until the primary worker verifies the receipt and hashes.

- [ ] **Step 6: Commit the verified revision**

Stage only the explicit files changed by this plan. Do not use `git add .`, `git add -A`, or `git add --all`.
