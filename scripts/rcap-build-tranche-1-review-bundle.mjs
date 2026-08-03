// Build the Tranche 1 attorney-review bundle and its tracked manifest.
//
// The bundle is untracked: the ZIP, the packet PDFs and the page images stay in
// an ignored directory. What is committed is the manifest — paths, hashes, page
// counts, technical and visual results, and the review status — so the review
// can be verified without the artifacts entering version control.
//
// Run `rcap-generate-tranche-1-packets.mjs` first.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const OUT_ROOT = path.join(root, "tmp/packet-output-review/tranche-1");
const DIR = path.join(root, "data/record-clearing/implementation-tranches");

const generation = readJson(path.join(OUT_ROOT, "generation-result.json"));
const tranche = readJson(path.join(DIR, "tranche-1.json"));
const pins = readJson(path.join(DIR, "tranche-1-authority-pins.json"));
const fixtures = readJson(path.join(DIR, "tranche-1-fixtures.json"));
const visual = readJson(path.join(DIR, "tranche-1-visual-review.json"));

if (!generation.technicalPassed) {
  console.error("Refusing to build a review bundle from a failed technical run.");
  process.exit(1);
}

const byFixtureId = new Map(fixtures.positiveFixtures.map((entry) => [entry.fixtureId, entry]));
const pinnedByTrack = new Map(pins.tracks.map((entry) => [entry.trackId, entry]));
const trancheByTrack = new Map(tranche.selectedTracks.map((entry) => [entry.trackId, entry]));

// ---------------------------------------------------------------------------
// Per-track review folders
// ---------------------------------------------------------------------------

for (const track of tranche.selectedTracks) {
  const dir = path.join(OUT_ROOT, track.trackId);
  fs.mkdirSync(dir, { recursive: true });
  const pinned = pinnedByTrack.get(track.trackId);
  const samples = generation.positives.filter((entry) => entry.trackId === track.trackId);

  write(path.join(dir, "00-CONTROLLING-AUTHORITY.md"), controllingAuthority(track, pinned));
  write(path.join(dir, "01-IMPLEMENTATION-SPECIFICATION.md"), specification(track, pinned, samples));
  write(path.join(dir, "02-INPUT-FIELD-OWNERSHIP.md"), fieldOwnership(track, pinned));
  write(path.join(dir, "03-PACKET-COMPONENT-CHECKLIST.md"), componentChecklist(track, pinned, samples));
  write(path.join(dir, "04-KNOWN-LIMITATIONS.md"), limitations(track));
  write(path.join(dir, "05-TECHNICAL-TEST-RESULT.md"), technicalResult(track, samples));
  write(path.join(dir, "06-VISUAL-REVIEW-CHECKLIST.md"), visualChecklist(track, samples));
  write(path.join(dir, "07-LEGAL-OUTPUT-REVIEW-WORKSHEET.md"), worksheet(track, pinned));
  write(path.join(dir, "08-SYNTHETIC-SAMPLE-INPUT.json"), `${JSON.stringify(
    samples.map((sample) => ({
      fixtureId: sample.fixtureId,
      branchVariantId: sample.branchVariantId,
      description: sample.description,
      facts: byFixtureId.get(sample.fixtureId).facts
    })),
    null,
    2
  )}\n`);
}

write(path.join(OUT_ROOT, "README.md"), masterReadme());
write(path.join(OUT_ROOT, "TRANCHE-SELECTION-RECORD.json"), `${JSON.stringify(tranche, null, 2)}\n`);
write(path.join(OUT_ROOT, "SOURCE-MANIFEST-AND-HASHES.md"), sourceManifest());
write(path.join(OUT_ROOT, "QUESTIONS-FOR-REVIEWING-COUNSEL.md"), counselQuestions());

// ---------------------------------------------------------------------------
// Deterministic ZIP
// ---------------------------------------------------------------------------

const zipName = "legalease-tranche-1-mississippi-attorney-review.zip";
const zipPath = path.join(path.dirname(OUT_ROOT), zipName);
fs.rmSync(zipPath, { force: true });

const entries = listFiles(OUT_ROOT).sort();
spawnSync("touch", ["-t", "202608030000.00", ...entries.map((rel) => path.join(OUT_ROOT, rel))], { encoding: "utf8" });
const listing = entries.map((rel) => `tranche-1/${rel}`).join("\n");
const zipped = spawnSync("zip", ["-X", "-q", "-9", zipPath, "-@"], {
  cwd: path.dirname(OUT_ROOT),
  input: `${listing}\n`,
  encoding: "utf8"
});
if (zipped.status !== 0) {
  console.error(`zip failed: ${zipped.stderr?.toString()}`);
  process.exit(1);
}

const zipBytes = fs.readFileSync(zipPath);
const zipSha = crypto.createHash("sha256").update(zipBytes).digest("hex");

// ---------------------------------------------------------------------------
// Tracked manifest
// ---------------------------------------------------------------------------

const manifest = {
  schemaVersion: 1,
  trancheId: tranche.trancheId,
  jurisdiction: tranche.jurisdiction,
  generatedAt: generation.generatedAt,
  authorityEdition: pins.authorityEdition,
  authorityArchiveSha256: pins.authorityArchiveSha256,
  reviewBundle: {
    directory: "tmp/packet-output-review/tranche-1/",
    tracked: false,
    zipFileName: zipName,
    zipPath: `tmp/packet-output-review/${zipName}`,
    zipSha256: zipSha,
    zipBytes: zipBytes.byteLength,
    fileCount: entries.length,
    note: "The ZIP, the generated packet PDFs and the rendered page images are deliberately untracked. This manifest records their hashes so the bundle delivered to counsel can be verified against the commit."
  },
  selectedTracks: tranche.selectedTracks.map((entry) => ({
    trackId: entry.trackId,
    businessLabel: entry.businessLabel,
    outputStrategy: entry.outputStrategy,
    branchVariants: entry.branchVariants.map((variant) => variant.variantId)
  })),
  samplePackets: generation.positives.map((sample) => ({
    fixtureId: sample.fixtureId,
    trackId: sample.trackId,
    branchVariantId: sample.branchVariantId,
    fileName: sample.completePacketFileName,
    sha256: sample.completePacketSha256,
    bytes: sample.completePacketBytes,
    pageCount: sample.completePacketPageCount,
    pageImages: sample.pageImages,
    componentCount: sample.components.length,
    components: sample.components.map((component) => ({
      componentId: component.componentId,
      role: component.role,
      order: component.order,
      pageCount: component.pageCount,
      sha256: component.sha256,
      rendererStrategy: component.rendererStrategy,
      officialSourceSha256: component.sourceSha256,
      deterministic: component.deterministic
    }))
  })),
  boundaryFixtures: generation.boundaries.map((entry) => ({
    fixtureId: entry.fixtureId,
    trackId: entry.trackId,
    expected: entry.expect,
    outcome: entry.outcome,
    passed: entry.passed
  })),
  technicalResult: generation.technicalPassed ? "passed" : "failed",
  technicalDetail: {
    fixturesGenerated: generation.positives.length,
    boundaryFixturesStopped: generation.boundaries.filter((entry) => entry.passed).length,
    deterministic: generation.positives.every((sample) => sample.components.every((c) => c.deterministic)),
    unresolvedIssues: generation.failures.length
  },
  visualResult: visual.result,
  visualDetail: {
    pagesInspected: visual.pagesInspected,
    defectsFound: visual.defectsFound.length,
    defectsRepaired: visual.defectsFound.filter((entry) => entry.status === "repaired").length,
    unresolvedDefects: visual.defectsFound.filter((entry) => entry.status !== "repaired").length
  },
  humanLegalReviewStatus: "awaiting_counsel_review",
  runtimeStatus: "runtime_disabled",
  packetReady: 0,
  enabledJurisdictions: 0,
  launchGate: "red",
  note: "Opus's specification and visual review is an engineering proof, not a legal approval. Nothing here may be read as counsel's sign-off, and no status in this file grants generation, promotion or release."
};

fs.writeFileSync(path.join(DIR, "tranche-1-review-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Review bundle: ${entries.length} files.`);
console.log(`  zip     tmp/packet-output-review/${zipName}`);
console.log(`  sha256  ${zipSha}`);
console.log(`  bytes   ${zipBytes.byteLength}`);
console.log(`  samples ${manifest.samplePackets.length}; technical ${manifest.technicalResult}; visual ${manifest.visualResult}`);
console.log(`  status  ${manifest.humanLegalReviewStatus}`);

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

function masterReadme() {
  return `# LegalEase — Mississippi packet Tranche 1, attorney review

**Jurisdiction:** Mississippi
**Tracks:** ${tranche.selectedTracks.length}
**Authority:** Master Library Edition ${pins.authorityEdition}, \`${pins.authorityArchiveSha256}\`
**Generated:** ${generation.generatedAt}
**Human legal-review status:** awaiting_counsel_review

## What this bundle is

Five Mississippi expungement petition routes, implemented end to end and
generated through the real packet path from synthetic records. Every packet in
here is a **draft pending your review**. None of these tracks is enabled, none is
\`packet_ready\`, and nothing can be generated for a real participant until you
approve it.

Mississippi publishes no statewide expungement form. The accepted normalization
and the Edition ${pins.authorityEdition} controlling addendum both establish
that, so each route is a statewide neutral pleading drafted to the statute rather
than a filled-in form.

## The tracks

${tranche.selectedTracks
  .map(
    (track) =>
      `- **${track.trackId}** — ${track.legalName}\n  ${track.businessLabel}${
        track.branchVariants.length > 0
          ? `\n  Branch variants: ${track.branchVariants.map((v) => `${v.variantId} (${v.basis})`).join("; ")}`
          : ""
      }`
  )
  .join("\n")}

## What is in each track folder

| File | Contents |
|---|---|
| \`00-CONTROLLING-AUTHORITY.md\` | the Edition ${pins.authorityEdition} review, addendum and statutes this route is pinned to |
| \`01-IMPLEMENTATION-SPECIFICATION.md\` | what each document says and where each sentence comes from |
| \`02-INPUT-FIELD-OWNERSHIP.md\` | who owns every field: participant, court, clerk, prosecutor, or left blank |
| \`03-PACKET-COMPONENT-CHECKLIST.md\` | the components in the packet and their order |
| \`04-KNOWN-LIMITATIONS.md\` | what is unresolved, and what we deliberately do not assert |
| \`05-TECHNICAL-TEST-RESULT.md\` | the automated result |
| \`06-VISUAL-REVIEW-CHECKLIST.md\` | what was inspected on the rendered pages |
| \`07-LEGAL-OUTPUT-REVIEW-WORKSHEET.md\` | the worksheet for your review |
| \`08-SYNTHETIC-SAMPLE-INPUT.json\` | the synthetic facts each sample was built from |
| \`*__complete-packet.pdf\` | the assembled packet |
| \`*__pages/\` | every page rendered to an image |

Root files: \`TRANCHE-SELECTION-RECORD.json\`, \`SOURCE-MANIFEST-AND-HASHES.md\`
and \`QUESTIONS-FOR-REVIEWING-COUNSEL.md\`.

## Synthetic data only

Every name is invented, every town is invented, and every cause number carries a
\`SYN-\` prefix. No real participant record appears anywhere in this bundle.

## What we did not do

- We did not create a Mississippi form. There is no statewide form to fill.
- We did not reproduce the Fourth Circuit Court District local models. Edition
  ${pins.authorityEdition} keeps them reference-only, and the packets carry none
  of their defects — no hard-coded counties, no Greenville district-attorney
  address, no 2020 dates, no mis-captioned certificate, no grand-jury allegation,
  no race field, no social security number field and no dual citation.
- We did not assert a rehabilitation narrative, a public-safety conclusion or an
  interests-of-justice finding. The statutes reached here do not require the
  petitioner to plead one.
- We did not print a filing fee amount. See the questions for counsel.
- We did not change any legal-design conclusion.
`;
}

function controllingAuthority(track, pinned) {
  const ca = pins.controllingAuthority;
  return `# ${track.trackId} — controlling authority

**Master Library Edition ${pins.authorityEdition}** — \`${pins.authorityArchiveSha256}\`

## Precedence

1. Edition ${pins.authorityEdition} Mississippi legal-review addendum, for the statements it lists.
2. The retained Mississippi legal review.
3. The adopted Batch 2 legal-research resolution memorandum.
4. The Batch 2 authority matrix.

| Authority | Revision | SHA-256 |
|---|---|---|
| ${ca.legalReview.workflowKey} | ${ca.legalReview.revision} | \`${ca.legalReview.sha256}\` |
| ${ca.legalReviewAddendum.workflowKey} | ${ca.legalReviewAddendum.revision} | \`${ca.legalReviewAddendum.sha256}\` |

## Statutory authority for this route

${pinned.statutoryAuthority.map((entry) => `- ${entry}`).join("\n")}

**Venue.** ${pinned.venueAuthority}

**Destination.** ${pinned.destination.name}

## Primary enacted law

${pins.primaryEnactedLaw
  .map(
    (source) =>
      `- **${source.citation}**\n  ${source.effect}\n  Approved ${source.approvedByGovernor}, effective ${source.effectiveDate}.\n  SHA-256 \`${source.sha256}\`, retrieved ${source.retrievedOn} from ${source.officialUrl}`
  )
  .join("\n")}

## Output strategy

\`${pinned.outputStrategy}\`, \`localFormOverride: ${pinned.localFormOverride}\`.

${pinned.acceptedStrategyBasis}

**No official form binary is required, and none is claimed.** Every component
below reports \`officialFormBinaryRequired: false\` and carries no source hash.

## Reference-only sources, not reproduced

${pins.referenceOnlySources.map((source) => `- \`${source.documentId}\` — ${source.treatment}`).join("\n")}
`;
}

function specification(track, pinned, samples) {
  return `# ${track.trackId} — implementation specification

**${track.legalName}**

${track.rationale}

## Components

${pinned.components
  .map(
    (component) =>
      `### ${component.role} — \`${component.componentId}\`\n\nStrategy: \`${component.outputStrategy}\`. Template: \`${component.templateId}\`.${
        component.basis ? `\n\nBasis: ${component.basis}` : ""
      }`
  )
  .join("\n\n")}

## Branch variants

${
  track.branchVariants.length === 0
    ? "None. This route has one form of petition."
    : track.branchVariants
        .map((variant) => `- **${variant.variantId}** — ${variant.label}. ${variant.basis}`)
        .join("\n") +
      "\n\nA branch is chosen by the participant from a closed list. An unrecognised value fails closed rather than defaulting."
}

## Samples in this folder

${samples
  .map(
    (sample) =>
      `- \`${sample.completePacketFileName}\` — ${sample.description} (${sample.completePacketPageCount} pages, ${sample.components.length} components)`
  )
  .join("\n")}

## What the generator does and does not decide

It fills approved language with participant facts and selects an approved branch
sentence from a closed list. It composes no legal argument, draws no conclusion
about eligibility, and asserts no fact the participant did not supply.
`;
}

function fieldOwnership(track, pinned) {
  const registry = readJson(path.join(root, "data/record-clearing/implementation-tranches/tranche-1-field-ownership.json"));
  const rows = registry.tracks[track.trackId] ?? registry.common;
  return `# ${track.trackId} — input field ownership

Every field in the packet, and who owns it.

| Field | Owner | Required | Where it appears | If absent |
|---|---|---|---|---|
${[...registry.common, ...(registry.tracks[track.trackId] ?? [])]
  .map(
    (row) =>
      `| \`${row.key}\` | ${row.owner} | ${row.required ? "yes" : "no"} | ${row.appearsIn} | ${row.ifAbsent} |`
  )
  .join("\n")}

## Fields deliberately left blank

${registry.leftBlank.map((row) => `- **${row.field}** — ${row.owner}. ${row.why}`).join("\n")}

## Manual-completion items

The participant completes these by hand after generation. They are printed as
rules on the document, not asked for up front.

${registry.manualCompletion.map((item) => `- ${item}`).join("\n")}

_Rows: ${rows.length + registry.common.length} for this route._
`;
}

function componentChecklist(track, pinned, samples) {
  const sample = samples[0];
  return `# ${track.trackId} — packet component checklist

| # | Component | Role | Strategy | Pages | Deterministic |
|---|---|---|---|---|---|
${sample.components
  .map(
    (component) =>
      `| ${component.order} | \`${component.componentId}\` | ${component.role} | ${component.rendererStrategy} | ${component.pageCount} | ${component.deterministic ? "yes" : "NO"} |`
  )
  .join("\n")}

**Assembled packet:** ${sample.completePacketPageCount} pages.

## Is this packet filing-complete?

**No, and it does not claim to be.** The participant still has to obtain and
attach the records the checklist lists, sign and date the petition, ask the clerk
what the filing fee is and pay it, deliver a copy to the prosecuting authority,
fill in the delivery date and method on the certificate of service, and attend a
hearing if the court sets one.
`;
}

function limitations(track) {
  return `# ${track.trackId} — known limitations

## Open by design

${tranche.mappingGatesRemaining.map((entry) => `- ${entry}`).join("\n")}

## What this packet does not assert

- No rehabilitation narrative, public-safety conclusion or interests-of-justice finding.
- No prosecutor consent and no representation that the prosecuting authority agrees.
- No judicial finding. Every grant/deny checkbox on the proposed order is blank.
- No statement that the participant is eligible. Eligibility is the court's decision.
- No filing fee amount.

## Handoff conditions

The packet tells the participant to stop and seek a lawyer or legal aid when the
prosecuting authority objects, the court sets a contested hearing, the court
record disagrees with what they told us, they are told they are ineligible and
disagree, they have other cases not covered by this petition, or they are asked
for legal argument.
`;
}

function technicalResult(track, samples) {
  return `# ${track.trackId} — technical test result

**Result: ${generation.technicalPassed ? "passed" : "FAILED"}**

Every packet below was generated through the real fulfilment path — resolution,
rendering, storage and artifact records — not assembled by hand.

${samples
  .map(
    (sample) =>
      `## ${sample.fixtureId}\n\n- Runtime status at generation: \`${sample.runtimeStatus}\`\n- Components: ${sample.components.length}\n- Pages: ${sample.completePacketPageCount}\n- Packet SHA-256: \`${sample.completePacketSha256}\`\n- Deterministic: ${sample.components.every((c) => c.deterministic) ? "yes — identical facts produce identical bytes" : "NO"}\n- Warnings: ${sample.components.flatMap((c) => c.warnings).length === 0 ? "none" : sample.components.flatMap((c) => c.warnings).join("; ")}`
  )
  .join("\n\n")}

## Checks applied to every component

- correct track and branch selected;
- correct components, in the pinned order;
- participant values present, and no value the participant did not supply;
- no third-party field completed;
- no prohibited legal conclusion;
- valid, reopenable PDF;
- deterministic output from identical input.
`;
}

function visualChecklist(track, samples) {
  return `# ${track.trackId} — visual review checklist

**Result: ${visual.result}**

Every page of every packet in this tranche was rendered to an image and
inspected. ${visual.pagesInspected} pages in total across the tranche.

| Check | Result |
|---|---|
${visual.checks.map((check) => `| ${check.check} | ${check.result} |`).join("\n")}

## Defects found and repaired

${visual.defectsFound
  .map(
    (defect) =>
      `- **${defect.id}** — ${defect.description}\n  Repair: ${defect.repair}\n  Status: ${defect.status}`
  )
  .join("\n")}

## Page images

\`${samples[0].fixtureId}__pages/\` and the equivalent folder for each sample.
`;
}

function worksheet(track, pinned) {
  return `# ${track.trackId} — legal-output review worksheet

For reviewing counsel. Please record a decision on each line.

| # | Question | Approve / Change / Reject | Note |
|---|---|---|---|
| 1 | Is the statutory basis stated correctly for this route? | | |
| 2 | Is the venue correct — ${pinned.destination.name}? | | |
| 3 | Are the numbered allegations accurate and sufficient? | | |
| 4 | Is anything alleged that the petitioner has not supplied? | | |
| 5 | Is anything required by the statute missing? | | |
| 6 | Is the prayer for relief correct in scope? | | |
| 7 | Is the proposed order correct, and correctly blank? | | |
| 8 | Is the certificate of service correct for this court? | | |
| 9 | Is the truth statement adequate, or is a notarized verification required? | | |
| 10 | Are the filing instructions correct for this court level? | | |
| 11 | Is the records checklist complete? | | |
| 12 | Are the handoff conditions right? | | |
| 13 | Is anything here likely to be rejected by a Mississippi clerk? | | |
| 14 | Does the packet make any statement you would not sign your name to? | | |

**Overall:** ☐ approve  ☐ approve with the changes noted  ☐ reject

Reviewer: ______________________  Date: ______________________

_Approval here is what moves this route past \`awaiting_counsel_review\`. Nothing
generated by the engineering pass substitutes for it._
`;
}

function sourceManifest() {
  return `# Source manifest and hashes

**Master Library Edition ${pins.authorityEdition}** — \`${pins.authorityArchiveSha256}\`

## Controlling authority

| Asset | Workflow key | Revision | SHA-256 |
|---|---|---|---|
| Legal review | ${pins.controllingAuthority.legalReview.workflowKey} | ${pins.controllingAuthority.legalReview.revision} | \`${pins.controllingAuthority.legalReview.sha256}\` |
| Edition ${pins.authorityEdition} addendum | ${pins.controllingAuthority.legalReviewAddendum.workflowKey} | ${pins.controllingAuthority.legalReviewAddendum.revision} | \`${pins.controllingAuthority.legalReviewAddendum.sha256}\` |

## Primary enacted law

| Citation | Effective | SHA-256 |
|---|---|---|
${pins.primaryEnactedLaw.map((s) => `| ${s.citation} | ${s.effectiveDate} | \`${s.sha256}\` |`).join("\n")}

## Reference-only, never generated

| Document | SHA-256 | Treatment |
|---|---|---|
${pins.referenceOnlySources.map((s) => `| ${s.documentId} | \`${s.sha256}\` | ${s.treatment} |`).join("\n")}

## Official form binaries

**None.** Every route in this tranche is a custom pleading. No official form
binary is required, and no official-form mapping was created — inventing one
would assert a source identity that does not exist.

## Generated packets

| Sample | Track | Pages | SHA-256 |
|---|---|---|---|
${generation.positives
  .map((s) => `| ${s.fixtureId} | ${s.trackId} | ${s.completePacketPageCount} | \`${s.completePacketSha256}\` |`)
  .join("\n")}
`;
}

function counselQuestions() {
  return `# Questions for reviewing counsel

These are the specific decisions the engineering pass could not make. Each one is
recorded as open rather than resolved by assumption.

## 1. The filing fee

Miss. Code Ann. § 99-19-72 levies $150 on "each petition to expunge an offense
under Section 99-19-71", collected by the circuit clerk. That neither plainly
reaches a subsection (4) non-conviction petition nor maps onto a justice or
municipal court filing, and county practice differs.

**No fee amount is printed on any packet.** The participant is told to ask the
clerk. Is that the right treatment, or should a specific amount appear on the
§ 99-19-71(1) and (2) routes?

## 2. Verification or notarization

The petitions carry a simple truth statement rather than a notarized
verification. The archived local models carry neither consistently. Does any
Mississippi court level require a sworn or notarized verification?

## 3. Prosecutor notice on the non-conviction route

The ten days' written notice at § 99-19-71(2)(b) sits inside the felony
conviction subsection. We do **not** import it into subsection (4). The packet
tells the participant some districts expect notice as local practice. Is that
correct, and should the notice component be generated for subsection (4) too?

## 4. The § 99-19-71(2)(b) notice as a separate document

On the felony route we generate the ten-day notice as its own packet component
addressed to the district attorney, in addition to the certificate of service.
Is a separate notice document right, or is service of the petition sufficient?

## 5. The first-offender allegation

The § 99-19-71(1) petition alleges the petitioner had no prior misdemeanour
conviction other than a traffic violation. § 99-19-71(3) lets the Criminal
Information Center keep a nonpublic record solely to determine first-offender
status in a later proceeding, and a prior **expunged** conviction does defeat it.
Should the petition say more about prior expungements?

## 6. The justice / municipal single track

§§ 9-11-15(3) and 21-23-7(6) are word-for-word identical on every operative
element, so we keep one mechanism with two venue branches rather than two tracks.
Do you agree?

## 7. The four non-conviction branches

Dismissal, nolle prosequi, acquittal and never-charged are branches of one
§ 99-19-71(4) mechanism, each with its own approved allegation sentence. Are all
four correctly stated, particularly "retired to the file"?

## 8. Nonadjudication citation

The § 99-15-26 petition is brought under that section alone and says so
expressly, because the archived local models carry a § 99-15-26 / § 99-19-71 dual
citation that conflates two mechanisms. Confirm that separation is right.

## 9. The petitioner's own statement

Each petition reproduces a participant-written paragraph verbatim, labelled as
the petitioner's own statement. Is that safe as drafted, and should it be
optional rather than required?

## 10. Anything a Mississippi clerk would reject

Format, caption, paper size, margins, required cover sheets, or the number of
copies. Anything we have wrong will show up first at the counter.
`;
}

// ---------------------------------------------------------------------------

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function write(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}
function listFiles(dir) {
  const out = [];
  const walk = (current, prefix) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(current, entry.name), rel);
      else out.push(rel);
    }
  };
  walk(dir, "");
  return out;
}
