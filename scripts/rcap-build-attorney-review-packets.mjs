// Builds one attorney-facing review packet per jurisdiction.
//
// Attorneys do not read code, migrations, field names, coordinates, tests or
// database behaviour. A packet contains what counsel needs to decide what a
// jurisdiction should offer, and nothing else.
//
// It also contains no legal conclusions. The modeled pathways and state-pack
// rules already in this repository are shown as PRIOR MODELING, explicitly
// unapproved, because presenting them as settled would invite counsel to ratify
// our guesses instead of stating the law.
//
//   node scripts/rcap-build-attorney-review-packets.mjs [--no-bundle-sources]
//
// Output: artifacts/packet-delivery/attorney-review-packets/<CODE>/

import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const { ALL_JURISDICTION_CODES, getPacketCapability } = await import(
  "@/lib/rcap/jurisdictions/packet-capability"
);

const root = process.cwd();
const OUT_ROOT = path.join(root, "artifacts/packet-delivery/attorney-review-packets");
const SOURCE_ROOT = path.join(root, "private/Nationwide Record Clearing");
const PLAN_OF_RECORD = path.join(root, "docs/record-clearing/PLAN_OF_RECORD_RELIEF_TRACK_STRATEGY.md");

const bundleSources = !process.argv.includes("--no-bundle-sources");

const sourceRegistry = readJson("data/record-clearing/source-artifact-registry.json");
const trackRegistry = readJson("data/record-clearing/relief-track-registry.json");
const planOfRecord = fs.existsSync(PLAN_OF_RECORD) ? fs.readFileSync(PLAN_OF_RECORD, "utf8") : null;

const HISTORICAL_LABELS = {
  primary_custom_pleading: "Custom pleading as primary",
  custom_pleading_with_local_guardrails: "Custom pleading with local-form guardrails",
  official_form_primary: "Official-form-led",
  hybrid_by_relief_track: "Hybrid, resolved per relief track",
  special_handling: "Special handling, routed by statutory mechanism"
};

// Plain language for counsel. No field names, no coordinates.
const STRUCTURAL_PLAIN = {
  clean_acroform: "Fillable form (has built-in fields)",
  dirty_acroform: "Partly fillable (fields present but incomplete or unreliable)",
  flat_pdf: "Flat document (text, no fillable fields)",
  scanned_pdf: "Scanned image (no fillable fields)",
  encrypted_pdf: "Encrypted (cannot be opened for processing)",
  xfa: "XFA form (a format we cannot process)",
  no_pdf_required: "Not a PDF (reference or web page)",
  source_missing: "Not available",
  unreadable: "Could not be opened"
};

const GEO_PLAIN = {
  statewide: "No local restriction detected",
  county: "Names specific counties",
  circuit: "Names a specific circuit",
  district: "Names a specific district",
  court_specific: "Names a specific court or office",
  agency_specific: "Names a specific agency",
  unknown: "Could not be determined automatically"
};

const results = [];

for (const code of ALL_JURISDICTION_CODES) {
  const capability = getPacketCapability(code);
  const name = capability?.name ?? code;
  const slug = capability?.slug ?? code.toLowerCase();

  const artifacts = sourceRegistry.artifacts.filter((entry) => entry.jurisdiction === code);
  const present = artifacts.filter((entry) => entry.presence === "present");
  const missing = artifacts.filter((entry) => entry.presence === "missing");
  const jurisdictionRecord = trackRegistry.jurisdictions.find((entry) => entry.jurisdiction === code);
  const profile = readProfile(code, slug);

  const dir = path.join(OUT_ROOT, code);
  fs.mkdirSync(dir, { recursive: true });

  write(dir, "README.md", readme(code, name, present.length, missing.length));
  write(dir, "01-plan-of-record.md", planOfRecordDoc());
  write(dir, "02-historical-classification.md", historicalDoc(code, name, jurisdictionRecord));
  write(dir, "03-prior-modeling.md", priorModelingDoc(code, name, slug, profile));
  write(dir, "04-source-inventory.md", sourceInventoryDoc(code, name, present));
  write(dir, "05-missing-sources.md", missingSourcesDoc(code, name, missing));
  write(dir, "06-legal-design-memo-template.md", memoTemplate(code, name));

  let bundled = 0;
  if (bundleSources && present.length > 0) {
    const filesDir = path.join(dir, "sources");
    fs.mkdirSync(filesDir, { recursive: true });
    for (const artifact of present) {
      const from = path.join(root, artifact.sourcePath);
      if (!fs.existsSync(from)) continue;
      fs.copyFileSync(from, path.join(filesDir, artifact.fileName));
      bundled += 1;
    }
  }

  results.push({
    code,
    name,
    packetPath: path.relative(root, dir),
    sourcesPresent: present.length,
    sourcesBundled: bundled,
    sourcesMissing: missing.length,
    hasSourceInventory: true,
    hasSourceGapList: true,
    packagable: present.length > 0 || missing.length > 0,
    note:
      present.length === 0 && missing.length === 0
        ? "No source material of any kind is inventoried for this jurisdiction."
        : present.length === 0
          ? "Every inventoried source is missing from the archive; the packet lists the gap only."
          : null
  });
}

write(
  OUT_ROOT,
  "INDEX.md",
  [
    "# Attorney review packets",
    "",
    "One packet per jurisdiction. Each is self-contained: counsel needs nothing",
    "from the repository and should not be asked to look at code.",
    "",
    "| Jurisdiction | Packet | Sources bundled | Sources missing |",
    "|---|---|---|---|",
    ...results.map(
      (entry) =>
        `| ${entry.code} ${entry.name} | \`${entry.code}/\` | ${entry.sourcesBundled} | ${entry.sourcesMissing} |`
    ),
    ""
  ].join("\n")
);

fs.writeFileSync(
  path.join(OUT_ROOT, "packet-manifest.json"),
  `${JSON.stringify({ schemaVersion: 1, packetCount: results.length, packets: results }, null, 2)}\n`
);

const unpackagable = results.filter((entry) => !entry.packagable);

console.log("Attorney review packets built.");
console.log(`1. ${results.length} packets under ${path.relative(root, OUT_ROOT)}/<CODE>/`);
console.log(`2. Every packet contains a source inventory and a source-gap list.`);
console.log(
  `3. Source files bundled: ${results.reduce((n, entry) => n + entry.sourcesBundled, 0)}${bundleSources ? "" : " (bundling disabled)"}.`
);
console.log(`4. Jurisdictions with no packagable material: ${unpackagable.length}${unpackagable.length ? ` (${unpackagable.map((e) => e.code).join(", ")})` : ""}.`);
for (const entry of results.filter((e) => e.note)) {
  console.log(`     ${entry.code}: ${entry.note}`);
}
console.log("5. No legal conclusions are prefilled. Prior modeling is labelled unapproved.");

// ---------------------------------------------------------------------------

function readme(code, name, presentCount, missingCount) {
  return `# ${name} (${code}) — legal-design review

Thank you for reviewing ${name}. This packet is self-contained. You do not need
anything from our codebase, and you should not be asked to look at code,
database structure, form field names or test output.

## What we are asking

Decide what record-clearing relief ${name} should offer, and for each distinct
relief track tell us how the document should be produced. Return one completed
memo using the template in this packet.

## What to return

Fill in **\`06-legal-design-memo-template.md\`** and send it back in whatever
format suits you — a document, an email, a marked-up copy. Prose is fine.

Our operator converts your memo into our internal format. You never write JSON.

**Do not send us** your name, firm, email, bar number, signature or engagement
details. We do not store reviewer information and our importer rejects it.

## What is in this packet

| File | What it is |
|---|---|
| \`01-plan-of-record.md\` | How we build documents: three output strategies |
| \`02-historical-classification.md\` | What an earlier internal plan assumed for ${name} |
| \`03-prior-modeling.md\` | Pathways we previously modeled — **unapproved, for context only** |
| \`04-source-inventory.md\` | Every ${name} source document we hold (${presentCount}) |
| \`05-missing-sources.md\` | Source documents we expected but do not have (${missingCount}) |
| \`06-legal-design-memo-template.md\` | **The template to complete** |
${presentCount > 0 ? "| `sources/` | The actual source documents listed in the inventory |\n" : ""}
## The most important thing to know

**Our source archive is evidence of what we happen to hold. It is not a list of
forms you are being asked to approve.**

A form being in the archive does not mean it is current, mandatory, statewide,
or the right output for any relief track. A form being absent does not mean the
relief does not exist — many tracks are properly served by a pleading we draft
or by an administrative process with no court form at all.

Tell us what ${name} law requires. If that means a form we do not hold, say so.
If it means no form at all, say that.

## What we will not do

We will not infer a legal rule you did not state. If your memo leaves a
question open, we will come back and ask it rather than fill the gap.
`;
}

function planOfRecordDoc() {
  // Written for counsel rather than excerpted from the internal document. The
  // internal version carries readiness vocabulary and file paths that would
  // only invite questions we are not asking counsel to answer.
  return `# How we build documents

So your memo can say how each relief track's document should be produced, here
are the only three ways we produce one. This is our engineering commitment to
you, not a legal position.

## The three ways

### 1. Official form

The jurisdiction publishes a form. We complete it and preserve the official
document exactly as published. Nothing on the form's fixed printed text is
altered.

Choose this when a jurisdiction mandates a particular form.

### 2. Custom pleading

No mandated form exists, so we draft the document from a template you have
approved, filled with the person's own facts. Caption, authority, allegations,
prayer, verification, signature block and certificate of service all come from
your template.

We populate approved language with facts. We do not compose legal argument and
we make no discretionary legal judgment beyond the template and the eligibility
rules that selected it.

Choose this when the relief is real but no official form governs it.

### 3. Process guidance

Some relief is not a court filing at all. It runs through an agency, a portal,
a prosecutor's office, a certificate process, or happens automatically by
operation of law.

For those we produce clear instructions: what to gather, where it goes, how to
submit, what it costs, what happens next, and when to get a lawyer. The
document says on its face that it is not a court filing.

**This is a legitimate answer and we would rather give it than invent a
petition.** If the honest answer for a track is "there is nothing to file,"
please say so plainly.

## One rule about place

A form or pleading tied to a particular county, circuit, district or court is
only ever offered in that place. We will not serve a locally-scoped document
statewide, and we will not rewrite a form's fixed local text to make it look
statewide.

If a track's document only works in some parts of the jurisdiction, tell us
which, and we will limit it to those.

## What we will not do

- Infer a legal rule you did not state.
- Treat a document in our archive as authoritative because we happen to hold it.
- Offer a track you told us needs more research.
`;
}

function historicalDoc(code, name, record) {
  const category = record?.historicalCategory ?? null;
  const label = category ? HISTORICAL_LABELS[category] ?? category : "Not classified";
  return `# ${name} (${code}) — earlier internal assumption

Before this review, an internal build plan assumed a general posture for each
jurisdiction. For ${name} that assumption was:

> **${label}**

## What this is

A starting assumption made internally, without the benefit of your review.

## What this is not

It is **not** a legal conclusion, not a constraint on your memo, and not
something you are being asked to ratify. If ${name} law points somewhere else,
your memo governs and we will change the plan.

We are telling you what we assumed so you can correct it, not so you can agree
with it.

## Why it may be wrong

The assumption was made per jurisdiction. Real relief tracks vary within a
jurisdiction: one track may be served by an official form and another in the
same state by a pleading we draft. Please answer per relief track.
`;
}

function priorModelingDoc(code, name, slug, profile) {
  const lines = [
    `# ${name} (${code}) — pathways we previously modeled`,
    "",
    "## Read this first",
    "",
    "**Nothing below has been reviewed by a lawyer.** It is prior internal",
    "modeling, compiled from the reference materials we hold. We are showing it",
    "for context and so you can correct it. It carries no legal weight and is not",
    "a proposal you need to accept.",
    "",
    "If it is wrong, say so. If it is missing a track, add it. If a track listed",
    "here should not be offered at all, say that.",
    ""
  ];

  if (!profile) {
    lines.push("_No modeled profile is available for this jurisdiction._", "");
    return lines.join("\n");
  }

  const pathways = Array.isArray(profile.pathways) ? profile.pathways : [];
  lines.push(
    `## Terminology we currently use`,
    "",
    `Primary term: **${profile.terminology?.primaryConsumerTerm ?? "unknown"}**`,
    "",
    "If this is the wrong word for ${name}, tell us the right one.".replace("${name}", name),
    "",
    `## Pathways currently modeled (${pathways.length})`,
    ""
  );

  if (pathways.length === 0) {
    lines.push("_None modeled._", "");
  } else {
    for (const [index, pathway] of pathways.entries()) {
      lines.push(
        `### ${index + 1}. ${pathway.label ?? pathway.id ?? "unnamed"}`,
        "",
        pathway.summary ? `${pathway.summary}` : "_No summary recorded._",
        ""
      );
    }
  }

  const counts = [
    ["Ordered decision rules", profile.orderedDecisionRules?.length ?? 0],
    ["Waiting-period rules", profile.waitingPeriodRules?.length ?? 0],
    ["Exclusion rules", profile.exclusionRules?.length ?? 0]
  ];
  lines.push(
    "## Rule counts in the current model",
    "",
    "These are counts only. We are not asking you to audit them, and we will",
    "rebuild them from your memo.",
    "",
    ...counts.map(([label, count]) => `- ${label}: ${count}`),
    ""
  );

  const packPath = path.join(root, "src/lib/rcap/state-packs", slug);
  if (fs.existsSync(packPath)) {
    const files = fs.readdirSync(packPath).filter((f) => f.endsWith(".ts") && f !== "index.ts");
    if (files.length > 1) {
      lines.push(
        "## Additional internal notes exist",
        "",
        `We hold internal notes for ${name} covering: ` +
          files
            .map((f) => f.replace(/\.ts$/, "").replace(/-/g, " "))
            .filter((f) => f !== "all50 build metadata")
            .join(", ") +
          ".",
        "",
        "These are also unreviewed. Ask the operator if you want to see any of them.",
        ""
      );
    }
  }

  return lines.join("\n");
}

function sourceInventoryDoc(code, name, present) {
  const lines = [
    `# ${name} (${code}) — source documents we hold`,
    "",
    "## What this list is",
    "",
    "**Evidence of what we happen to hold. Not a list of forms you are being",
    "asked to approve.**",
    "",
    "A document appearing here does not mean it is current, mandatory, statewide,",
    "or the right output for any relief track. Some of these will be superseded",
    "versions, local alternatives, proposed orders, or reference material rather",
    "than filing forms.",
    "",
    "The \"format\" column is a technical observation about the file, not a legal",
    "one. A fillable form is not more authoritative than a scanned one.",
    ""
  ];

  if (present.length === 0) {
    lines.push("## We hold no source documents for this jurisdiction", "", "See `05-missing-sources.md`.", "");
    return lines.join("\n");
  }

  lines.push(
    `## ${present.length} document(s)`,
    "",
    "| Document | Format | Local restriction detected | Fingerprint (SHA-256) |",
    "|---|---|---|---|"
  );

  for (const artifact of present) {
    const structural = STRUCTURAL_PLAIN[artifact.technicalClass] ?? artifact.technicalClass ?? "unknown";
    const fieldNote =
      artifact.fieldCount && artifact.fieldCount > 0 ? ` — ${artifact.fieldCount} fields` : "";
    const geo = GEO_PLAIN[artifact.geographicScope] ?? artifact.geographicScope ?? "unknown";
    // Only add the marker detail when it says more than the scope label already
    // does, so the column does not read "names counties (names counties)".
    const markerText = (artifact.geographicMarkers ?? []).map(plainMarker).join("; ");
    const markers =
      markerText && markerText.toLowerCase() !== geo.toLowerCase() ? ` — ${markerText}` : "";
    const reference = artifact.currency === "reference_only" ? " **[reference material, not a form]**" : "";
    const hash = artifact.measuredSha256 ? artifact.measuredSha256.slice(0, 16) + "…" : "not computed";
    lines.push(
      `| ${artifact.fileName}${reference} | ${structural}${fieldNote} | ${geo}${markers} | \`${hash}\` |`
    );
  }

  lines.push(
    "",
    "## About the local-restriction column",
    "",
    "We scanned each document for text that ties it to a place — a named county,",
    "a named prosecutor's office, a specific mailing address. Where we found",
    "such text we have said so, because a form naming three counties cannot be",
    "served to someone in a fourth.",
    "",
    "This detection is automated and imperfect. Please correct it. A document we",
    "flagged may be fine statewide, and one we did not flag may still be local.",
    "",
    "## Fingerprints",
    "",
    "The SHA-256 fingerprint lets us detect when a form changes. If you tell us a",
    "form is current as of a date, we can alert ourselves when the published file",
    "stops matching.",
    ""
  );

  return lines.join("\n");
}

function missingSourcesDoc(code, name, missing) {
  const lines = [
    `# ${name} (${code}) — source documents we expected but do not have`,
    "",
    "## Why this list exists",
    "",
    "Our records say these files were once inventoried for ${name}, but they are".replace("${name}", name),
    "not in the archive we currently hold.",
    "",
    "**This is our gap, not a question about the law.** You do not need to find",
    "these for us.",
    "",
    "It matters to you only in one way: if your memo says a relief track should",
    "use an official form, and that form is on this list, we will tell you we",
    "cannot build it yet. Knowing that in advance may affect how you describe the",
    "track.",
    ""
  ];

  if (missing.length === 0) {
    lines.push("## Nothing is missing", "", "Every inventoried source for this jurisdiction is present.", "");
    return lines.join("\n");
  }

  lines.push(`## ${missing.length} missing`, "", "| Document | Expected fingerprint |", "|---|---|");
  for (const artifact of missing) {
    lines.push(`| ${artifact.fileName} | \`${(artifact.inventorySha256 ?? "").slice(0, 16)}…\` |`);
  }
  lines.push("");
  return lines.join("\n");
}

function memoTemplate(code, name) {
  return `# ${name} (${code}) — legal-design memo

**Complete one section set per relief track.** Copy the block as many times as
${name} has distinct relief tracks. Prose answers are fine throughout.

Do not include your name, firm, email, bar number, signature or engagement
details. We do not store them.

---

## Before the tracks

**Q0. What does ${name} call this relief?**
The word a person in ${name} would recognise (expungement, sealing, set aside,
record restriction, vacatur, something else).

> _Your answer:_

**Q0b. Are there relief tracks we should NOT offer in ${name}, and why?**

> _Your answer:_

---

## RELIEF TRACK — copy this whole block per track

### 1. Track name
A short internal name, and the name a member of the public would understand.

> _Internal name:_
> _Public name:_

### 2. Controlling authority
Statute, rule or other authority, with citations. A sentence or two on what it
does.

> _Your answer:_

### 3. Dates
When did this take effect? Is there an end date? **As of what date are you
confident this is current?**

> _Effective from:_
> _Effective until (or "still in force"):_
> _Current as of:_

### 4. What records and outcomes qualify
Which record types (arrest, charge, conviction, juvenile, other) and which case
outcomes (dismissed, acquitted, convicted, deferred, other).

> _Your answer:_

### 5. What disqualifies, and how long someone must wait
Excluded offences or circumstances, and any waiting periods with what starts
the clock. **If there are none, say "none" — do not leave this blank.**

> _Exclusions:_
> _Waiting periods:_

### 6. How the document should be produced
Pick one, per the plan of record in \`01-plan-of-record.md\`:

- **Official form** — ${name} publishes a form that must be used
- **Custom pleading** — no mandated form; we draft the document
- **Process guidance** — not a court filing at all

> _Your answer, and why:_

### 7. Where it applies
Statewide, or limited to particular counties, circuits, districts or courts?
**If limited, name the places.** And what is the correct venue?

> _Applies to:_
> _Venue:_

### 8. Where it goes
Which court, clerk, agency, prosecutor or portal receives it, and how.

> _Your answer:_

### 9. What documents make up a complete submission
List every component — petition, proposed order, cover sheet, certificate of
service, affidavit, fee waiver, attachments. Say which are always required and
which depend on circumstances.

> _Your answer:_

### 10. Official sources
Where the authoritative version of each form or instruction lives, and when you
checked it.

> _Your answer:_

### 11. Filing, fees, notice and service
How it is filed, what it costs, whether fees can be waived and how, who must be
notified, and how service is made. **Say "none" explicitly where nothing
applies.**

> _Filing:_
> _Fees:_
> _Fee waiver:_
> _Notice:_
> _Service:_

### 12. When a person should stop and get a lawyer
The points where self-help is no longer appropriate — an objection, a contested
hearing, a discretionary standard.

> _Your answer:_

### 13. Anything you could not resolve
Open questions, unsettled law, conflicting authority. **An empty answer here
means you resolved everything.**

> _Your answer:_

### 14. Your decision on this track
Choose one:

- **Approved** — the design above is sound; build it
- **Approved with limitations** — build it, but only within these limits _(name them)_
- **More research needed** — do not build this yet
- **Do not offer** — this track should not be offered

> _Decision:_
> _Why:_
> _Limitations, if any:_

---

## END OF TRACK BLOCK

---

## A note on our source archive

Please read \`04-source-inventory.md\` with the warning at the top of it in
mind. The documents we hold are evidence of what we happen to have, not a menu
you are picking from. If the right answer is a form we do not hold, or no form
at all, say so.
`;
}

function plainMarker(marker) {
  const map = {
    named_county_list: "names specific counties",
    named_grand_jury: "names a county grand jury",
    named_prosecutor_district: "names a prosecutor district",
    service_po_box: "contains a specific mailing address",
    service_city_state_zip: "contains a specific city and postcode"
  };
  return map[marker] ?? marker;
}

function readProfile(code, slug) {
  const file = path.join(root, "src/lib/rcap-engine/compiled/profiles", `${code}-${slug}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
}

function write(dir, name, contents) {
  fs.writeFileSync(path.join(dir, name), contents.endsWith("\n") ? contents : `${contents}\n`);
}
