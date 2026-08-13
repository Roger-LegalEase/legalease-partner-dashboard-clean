#!/usr/bin/env node
// Lane C2 terminalization verifier + render harness (controlled pleadings).
//
// Covers the eight lane-C2 jobs frozen in data/rcap-ledger/track-terminalization.json:
// GA, TN, DC, HI, AZ, MA, ME, NC production packets (24 tracks). For each assigned
// track this script can (a) render the canonical fixture through the real
// custom-pleading renderer and write the production artifacts, and (b) verify the
// committed artifacts against the QA gates.
//
// Usage:
//   node scripts/verify-rcap-terminalize-c2.mjs render [state-slug...]
//   node scripts/verify-rcap-terminalize-c2.mjs verify [state-slug...]   (default: all 8)
//
// Verification fails on: missing track dir for an assigned trackId; config missing
// a required field; invented values (statutory citations or verification statute
// not present in committed evidence; asserted service address where the sources
// record none); canonical fixture failing pleading QA; negative fixture NOT
// tripping its declared signals; unparseable or zero-page PDF; placeholder leaks;
// protected-field leaks (docket, OTN, judge, SSN/DOB values in canonical output);
// manifest drift from the ledger; and any dirty git path outside lane C2's owned
// paths.
//
// LANE C1 FINDING 1 — runPleadingQa cannot see invented content. It checks relief
// vocabulary, template grade/lifecycle, the required footer and seal/logo markers,
// and nothing else. A fixture that fabricates a court finding, a filing fee the
// source records as "None", a prosecutor's position, completed service, or a
// populated protected field renders cleanly and PASSES QA. Lane C1 shipped
// negative fixtures that did exactly that. The signal detectors below close the
// gap: canonical/boundary/multiline output must trip ZERO invention and
// protected-field signals, and every negative fixture in every lane C2
// jurisdiction must declare `expectedSignals` and actually trip at least one
// non-QA signal.
// A QA failure alone is not accepted as a negative.
//
// LANE C1 FINDING 2 — where a source is silent (no verification statute, no fee,
// no venue, no waiting period, no service rule) the field stays null and the
// silence is recorded in `sourceSilences` with the quoted source statement and a
// counselFlag that must also appear in config.counselFlags. A null without such a
// note fails. Every null in the config is scanned, not just the ones the schema
// happens to name: a null is admissible only when a recorded silence covers that
// exact path, or when the config records the corresponding packet component as
// absent-with-reason (checked, not assumed).
//
// Both findings apply to every lane C2 jurisdiction. The five jurisdictions whose
// packets landed before the findings (AZ, HI, MA, ME, NC) are lane C2's own
// tracks under data/rcap-all50/pleadings/, so they were re-authored to the same
// contract rather than exempted.

import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const { PDFDocument, StandardFonts } = await import("pdf-lib");
const rendererMod = await import(
  pathToFileURL(path.join(rootDir, "src/lib/record-clearing/renderers/custom-pleading-renderer.ts")).href
);
const qaMod = await import(
  pathToFileURL(path.join(rootDir, "src/lib/record-clearing/pleading-qa.ts")).href
);
const { renderCustomPleading } = rendererMod;
const { runPleadingQa } = qaMod;

// --- Lane assignment (frozen manifest; trackIds re-read from the ledger) ---

const LANE_JOB_IDS = [
  "T-C-GA-production-packet",
  "T-C-TN-production-packet",
  "T-C-DC-production-packet",
  "T-C-HI-production-packet",
  "T-C-AZ-production-packet",
  "T-C-MA-production-packet",
  "T-C-ME-production-packet",
  "T-C-NC-production-packet"
];

const JURISDICTION_SLUGS = {
  GA: "georgia",
  TN: "tennessee",
  DC: "dc",
  HI: "hawaii",
  AZ: "arizona",
  MA: "massachusetts",
  ME: "maine",
  NC: "north-carolina"
};

const PROFILE_FILES = {
  GA: "src/lib/rcap-engine/compiled/profiles/GA-georgia.json",
  TN: "src/lib/rcap-engine/compiled/profiles/TN-tennessee.json",
  DC: "src/lib/rcap-engine/compiled/profiles/DC-district-of-columbia.json",
  HI: "src/lib/rcap-engine/compiled/profiles/HI-hawaii.json",
  AZ: "src/lib/rcap-engine/compiled/profiles/AZ-arizona.json",
  MA: "src/lib/rcap-engine/compiled/profiles/MA-massachusetts.json",
  ME: "src/lib/rcap-engine/compiled/profiles/ME-maine.json",
  NC: "src/lib/rcap-engine/compiled/profiles/NC-north-carolina.json"
};

const STATE_PACK_DIRS = {
  GA: "src/lib/rcap/state-packs/georgia",
  TN: "src/lib/rcap/state-packs/tennessee",
  DC: "src/lib/rcap/state-packs/dc",
  HI: "src/lib/rcap/state-packs/hawaii",
  AZ: "src/lib/rcap/state-packs/arizona",
  MA: "src/lib/rcap/state-packs/massachusetts",
  ME: "src/lib/rcap/state-packs/maine",
  NC: "src/lib/rcap/state-packs/north-carolina"
};

const REGISTRY_PIN = "3b6f4c103d2f97249b45acc0ea3fb889ff8787e5";
const REGISTRY_FILE = "data/record-clearing/legal-design-track-registry.json";

const OWNED_PATH_PREFIXES = [
  ...Object.values(JURISDICTION_SLUGS).map((slug) => `data/rcap-all50/pleadings/${slug}/`),
  "scripts/verify-rcap-terminalize-c2.mjs",
  "docs/record-clearing/terminalize-c/"
];

// Renderer confirm-with-clerk brackets are deliberate; these tokens are leaks.
const PLACEHOLDER_LEAK_PATTERN =
  /PLACEHOLDER|\bTODO\b|\bFIXME\b|\bTBD\b|LOREM|INSERT HERE|\bXXX\b|\{\{|\}\}|<<|>>/i;

const REQUIRED_PRESENTATION_FIELDS = [
  "sovereignPartyName",
  "sovereignPartyProper",
  "sovereignRole",
  "movantRole",
  "filingNoun",
  "divisionLine",
  "usesCounty",
  "courtName",
  "venueDescriptor",
  "recordCustodianLead",
  "verificationVerb",
  "verificationPenaltyLabel",
  "serviceRecipientLabel",
  "serviceRecipientAddressLabel"
];

const REQUIRED_CONFIG_FIELDS = [
  "jurisdictionCode",
  "trackId",
  "templateGrade",
  "templateLifecycle",
  "primaryReliefTerm",
  "documentTitleFull",
  "courtCaption",
  "primaryStatutoryAuthority",
  "verificationStatute",
  "includeProposedOrder",
  "includeCertificateOfService",
  "serviceNote",
  "counselFlags",
  "presentation"
];

// componentInventory entries must map to a real render/packet location.
const COMPONENT_STATUSES = new Set(["present", "absent", "blocked_dependency"]);

// Fields whose null value must be backed by a recorded source silence. The first
// two are config paths; the rest name source facts the config has no slot for and
// which must therefore never be asserted anywhere in the packet.
const NULLABLE_SOURCE_FIELDS = [
  "verificationStatute.citation",
  "serviceNote",
  "filingFee",
  "feeWaiver",
  "waitingPeriod",
  "venue"
];

// A config null that no sourceSilences entry covers is admissible only where the
// null is the config's way of saying "this packet component is not included" AND
// the componentInventory records that component as absent or blocked with a
// reason. The linkage is verified below; it is not an exemption list.
const NULL_MEANS_COMPONENT_ABSENT = {
  serviceNote: { component: "certificate_of_service", requiresFalse: "includeCertificateOfService" }
};

// --- Helpers ---

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function ledgerJobs() {
  const ledger = readJson(path.join(rootDir, "data/rcap-ledger/track-terminalization.json"));
  const jobs = ledger.jobs.filter((j) => LANE_JOB_IDS.includes(j.jobId));
  if (jobs.length !== LANE_JOB_IDS.length) {
    // A job whose every track was PROMOTED by an F2 closure is complete and
    // leaves the ledger's open job list. That is completion, not a missing
    // assignment, so the job is reconstructed from the promoted tracks and the
    // lane's artifacts are still verified in full.
    const promoted = new Map();
    for (const track of ledger.tracks ?? []) {
      if (track.candidateStatus !== "promoted_by_f2") continue;
      // Only this lane's own artifacts count: a state can also have promoted
      // guidance tracks, and those belong to lane B, not here.
      if (!String(track.candidateEvidence ?? "").startsWith("data/rcap-all50/pleadings/")) continue;
      const jobId = LANE_JOB_IDS.find((id) => id.includes(`-${track.jurisdiction}-`));
      if (!jobId) continue;
      const entry = promoted.get(jobId) ?? {
        jobId,
        lane: "C",
        jurisdiction: track.jurisdiction,
        requiredTreatment: track.candidateTreatment,
        trackIds: [],
        completedByReview: true
      };
      entry.trackIds.push(track.trackId);
      promoted.set(jobId, entry);
    }
    const found = new Set(jobs.map((j) => j.jobId));
    for (const [jobId, entry] of promoted) if (!found.has(jobId)) jobs.push(entry);
    const stillMissing = LANE_JOB_IDS.filter((id) => !jobs.some((j) => j.jobId === id));
    if (stillMissing.length > 0) {
      throw new Error(`Ledger is missing lane jobs with no promoted tracks to account for them: ${stillMissing.join(", ")}.`);
    }
  }
  return jobs;
}

const evidenceCache = new Map();

function stateEvidenceText(code) {
  // Committed evidence: coded state pack + compiled profile. Registry evidence is
  // carried per-track in provenance.registryAuthority / registryExcerpt.
  if (evidenceCache.has(code)) return evidenceCache.get(code);
  let text = "";
  const packDir = path.join(rootDir, STATE_PACK_DIRS[code]);
  if (fs.existsSync(packDir)) {
    for (const f of fs.readdirSync(packDir)) {
      if (f.endsWith(".ts")) text += fs.readFileSync(path.join(packDir, f), "utf8");
    }
  }
  const profile = path.join(rootDir, PROFILE_FILES[code]);
  if (fs.existsSync(profile)) text += fs.readFileSync(profile, "utf8");
  evidenceCache.set(code, text);
  return text;
}

function pinnedRegistryTrack(trackId) {
  // Best effort: the pinned commit may not be present in a shallow clone. When it
  // is available, cross-check provenance excerpts against the pin itself.
  const probe = spawnSync("git", ["cat-file", "-e", `${REGISTRY_PIN}^{commit}`], { cwd: rootDir });
  if (probe.status !== 0) return { available: false, track: null };
  const show = spawnSync("git", ["show", `${REGISTRY_PIN}:${REGISTRY_FILE}`], {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024
  });
  if (show.status !== 0) return { available: false, track: null };
  const registry = JSON.parse(show.stdout);
  const track = registry.tracks.find((t) => t.trackId === trackId) ?? null;
  return { available: true, track };
}

function wrapLine(line, width) {
  if (line.length <= width) return [line];
  const out = [];
  let current = "";
  for (const word of line.split(" ")) {
    if (word.length > width) {
      if (current) {
        out.push(current);
        current = "";
      }
      for (let i = 0; i < word.length; i += width) out.push(word.slice(i, i + width));
      continue;
    }
    if (!current) current = word;
    else if (current.length + 1 + word.length <= width) current += ` ${word}`;
    else {
      out.push(current);
      current = word;
    }
  }
  if (current) out.push(current);
  return out;
}

function pdfSafe(line) {
  // StandardFonts are WinAnsi; normalize curly quotes, keep Latin-1 + en/em
  // dashes, replace anything else.
  return line
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x20-\x7E\u00A0-\u00FF\u2013\u2014]/g, "?");
}

async function textToPdf(fullText) {
  // Letter geometry (612x792) to match the repo's packet renderer convention.
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Courier);
  const fontSize = 9.5;
  const margin = 54;
  const lineHeight = 12.5;
  const width = 612;
  const height = 792;
  const maxChars = Math.floor((width - margin * 2) / (fontSize * 0.6));
  let page = doc.addPage([width, height]);
  let y = height - margin;
  for (const raw of fullText.split("\n")) {
    for (const line of wrapLine(raw, maxChars)) {
      if (y < margin) {
        page = doc.addPage([width, height]);
        y = height - margin;
      }
      page.drawText(pdfSafe(line), { x: margin, y, size: fontSize, font });
      y -= lineHeight;
    }
  }
  return doc.save();
}

// --- Correspondence composer ---
//
// Six lane C2 tracks are written requests / dispute letters, not court
// pleadings. Their pinned registry entries forbid pleading framing ("This is
// correspondence, not a filing"; the ME letter "is correspondence to a private
// company, not a court pleading"; the TN § 40-32-108 artifact is "the request
// and the eligibility record, never the petition") while also rejecting
// guidance-only treatment ("a genuine participant-facing written submission
// exists"). The frozen custom-pleading renderer only emits court-pleading
// sections, so these tracks are composed here, deterministically, from config
// data — and still pass through runPleadingQa, the placeholder scan, and the
// protected-field scan. A config opts in with "documentForm": "correspondence".

function fillTokens(template, letterData, unresolved) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (m, key) => {
    if (letterData && Object.prototype.hasOwnProperty.call(letterData, key)) {
      return letterData[key];
    }
    unresolved.push(key);
    return m;
  });
}

function composeCorrespondence(doc, fixture) {
  const cfg = doc.config;
  const corr = doc.correspondence;
  const letterData = fixture.letterData ?? {};
  const unresolved = [];
  const sections = [];
  const senderName = fixture.partyData?.petitionerName ?? "[SENDER NAME]";
  const senderAddress = fixture.partyData?.petitionerAddress ?? "[SENDER MAILING ADDRESS]";

  sections.push({
    sectionId: "sender_block",
    heading: "",
    text: [senderName, senderAddress].join("\n")
  });
  sections.push({ sectionId: "date_line", heading: "", text: "Date: ________________________________" });
  sections.push({
    sectionId: "addressee_block",
    heading: "",
    text: [
      fillTokens(corr.addresseeLabel, letterData, unresolved),
      fillTokens(corr.addresseeAddressLabel, letterData, unresolved)
    ].join("\n")
  });
  sections.push({
    sectionId: "subject_line",
    heading: "",
    text: `RE: ${fillTokens(corr.subjectLine, letterData, unresolved)}`
  });
  sections.push({
    sectionId: "salutation",
    heading: "",
    text: fillTokens(corr.salutation, letterData, unresolved)
  });
  corr.bodyParagraphs.forEach((para, i) => {
    sections.push({
      sectionId: `body_${i + 1}`,
      heading: "",
      text: fillTokens(para, letterData, unresolved)
    });
  });
  if (Array.isArray(corr.enclosures) && corr.enclosures.length > 0) {
    sections.push({
      sectionId: "enclosures",
      heading: "ENCLOSURES",
      text: corr.enclosures.map((e) => `- ${fillTokens(e, letterData, unresolved)}`).join("\n")
    });
  }
  sections.push({
    sectionId: "signature_block",
    heading: "",
    text: [
      "Sincerely,",
      "",
      "________________________________",
      senderName,
      senderAddress,
      "",
      "Date signed: ________________________________",
      "",
      "[NOTE: The sender signs and dates this letter personally before sending.]"
    ].join("\n")
  });

  const footer = `---\nPrepared by the sender using ${fixture.productName ?? "LegalEase RCAP"}. This is not an official court form.`;
  const bodyText = sections
    .map((s) => (s.heading ? `${s.heading}\n\n${s.text}` : s.text))
    .join("\n\n");
  const overrides = fixture.configOverrides ?? {};

  return {
    renderResult: {
      rendered: true,
      templateGrade: overrides.templateGrade ?? cfg.templateGrade,
      templateLifecycle: overrides.templateLifecycle ?? cfg.templateLifecycle,
      shadowMode: fixture.shadowMode ?? true,
      fullText: `${bodyText}\n\n${footer}`,
      sections,
      attachmentList: corr.enclosures ?? [],
      counselFlags: cfg.counselFlags,
      warnings: [],
      errors: []
    },
    unresolved
  };
}

function buildRenderInput(config, fixture) {
  const cfg = fixture.configOverrides ? { ...config, ...fixture.configOverrides } : config;
  return {
    config: cfg,
    partyData: fixture.partyData,
    caseData: fixture.caseData,
    chargeData: fixture.chargeData,
    eligibilityData: fixture.eligibilityData,
    attachments: fixture.attachments,
    productName: fixture.productName ?? "LegalEase RCAP",
    shadowMode: fixture.shadowMode ?? true
  };
}

function scanPlaceholders(text) {
  const leaks = [];
  const match = text.match(PLACEHOLDER_LEAK_PATTERN);
  if (match) leaks.push(match[0]);
  const deliberateBrackets = [...new Set(text.match(/\[[^\]\n]+\]/g) ?? [])];
  return { leaks, deliberateBrackets };
}

function scanProtectedFields(text, fixture) {
  // Canonical output must keep outside-party/court fields blank: no docket
  // number, OTN, judge, prosecutor identity, SSN or DOB values.
  const violations = [];
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(text)) violations.push("SSN-shaped value present");
  if (/\bDOB\b\s*:?\s*\d/i.test(text)) violations.push("DOB value present");
  if (/date of birth\s*:?\s*\d/i.test(text)) violations.push("date-of-birth value present");
  const docketLines = text.match(/^DOCKET NO\.: .*$/gm) ?? [];
  for (const line of docketLines) {
    if (!/\[(?:TO BE CONFIRMED|DOCKET NUMBER TO BE CONFIRMED)\]/.test(line)) {
      violations.push(`docket number asserted: "${line.trim()}"`);
    }
  }
  if (/^OTN:/m.test(text)) violations.push("OTN asserted");
  if (/assigned judge is/i.test(text)) violations.push("judge name asserted");
  const c = fixture.caseData ?? {};
  for (const key of ["docketNumber", "otn", "judgeName", "judgeAddress"]) {
    if (c[key]) violations.push(`canonical fixture supplies protected field ${key}`);
  }
  return violations;
}

// --- Invention signal detectors (lane C1 finding 1) ---
//
// Each detector answers one question: does the rendered document assert
// something the participant, the court or the source has not actually supplied?
// These are content checks, which is exactly the class runPleadingQa is blind to.
// They run against every fixture: canonical/boundary must be clean, negatives
// must trip the signals they declare.

function citationsIn(text) {
  const raw = text.match(/§+\s*\d[0-9A-Za-z.\-]*(?:\([0-9A-Za-z.]+\))*/g) ?? [];
  return [...new Set(raw.map((c) => c.replace(/§+\s*/, "§ ")))];
}

const INVENTION_SIGNALS = [
  {
    id: "invention:court_finding",
    describe: "asserts a finding or determination the court has not made",
    detect: ({ text }) => {
      const m = text.match(
        /\b(?:this|the)\s+Court\s+(?:finds|found|has\s+found|determines|has\s+determined|concludes|is\s+satisfied)\b[^.\n]{0,120}/i
      );
      return m ? m[0].trim() : null;
    }
  },
  {
    id: "invention:hearing_outcome",
    describe: "asserts a hearing outcome or an order the court has not entered",
    detect: ({ text }) => {
      const m = text.match(
        /\b(?:a\s+)?hearing\s+(?:was|has\s+been)\s+(?:held|conducted|set)\b[^.\n]{0,80}|\bthe\s+Court\s+(?:granted|denied|entered\s+an\s+order)\b[^.\n]{0,80}/i
      );
      return m ? m[0].trim() : null;
    }
  },
  {
    id: "invention:fee_amount",
    describe: "quotes a monetary figure where the source records no fee",
    detect: ({ text, doc }) => {
      if (Array.isArray(doc.sourcedFeeAmounts) && doc.sourcedFeeAmounts.length > 0) return null;
      const m = text.match(/\$\s?\d[\d,.]*|\bfee\s+of\s+\d[\d,.]*/i);
      return m ? m[0].trim() : null;
    }
  },
  {
    id: "invention:prosecutor_position",
    describe: "asserts the prosecutor's or the sovereign's litigation position",
    detect: ({ text }) => {
      const m = text.match(
        // "your office" / "this office" catch the correspondence routes, where the
        // prosecutor is the addressee and their position reads as second person.
        /\b(?:prosecut\w+|District\s+Attorney|Solicitor[-\s]General|Attorney\s+General|the\s+State|the\s+Government|the\s+Commonwealth|the\s+District|your\s+office|this\s+office)\b[^.\n]{0,140}?\b(?:does\s+not\s+oppose|do\s+not\s+oppose|has\s+no\s+objection|have\s+no\s+objection|consents?|consented|agrees?|agreed|stipulates?|stipulated|joins\s+in|supports\s+this|opposes\s+this)\b/i
      );
      return m ? m[0].trim() : null;
    }
  },
  {
    id: "invention:service_completed",
    describe: "asserts service already completed instead of leaving the certificate blank",
    detect: ({ text }) => {
      const m = text.match(
        /\bI\s+certify\s+that\s+on\s+(?!_)[0-9A-Za-z][^,\n]{0,40}|\bservice\s+(?:was|has\s+been)\s+(?:completed|effected|perfected|accomplished)\b|\bwas\s+served\s+on\s+\d[^\n]{0,40}/i
      );
      return m ? m[0].trim() : null;
    }
  },
  {
    id: "invention:signature_applied",
    describe: "applies a signature or a signing date instead of leaving the block blank",
    detect: ({ text }) => {
      const m = text.match(/\/s\/\s*[A-Za-z][^\n]{0,60}|\bDate(?:\s+signed)?:\s*(?!_)[0-9A-Za-z][^\n]{0,40}/);
      return m ? m[0].trim() : null;
    }
  },
  {
    id: "invention:unsourced_citation",
    describe: "cites a statute or rule that is not in the committed evidence",
    detect: ({ text, evidence }) => {
      const unsourced = citationsIn(text).filter((c) => !evidence.includes(c));
      return unsourced.length > 0 ? unsourced.join(", ") : null;
    }
  },
  {
    id: "protected_field:populated",
    describe: "populates a court- or outside-party-owned field (docket, OTN, judge, SSN, DOB)",
    detect: ({ text, fixture }) => {
      const violations = scanProtectedFields(text, fixture);
      return violations.length > 0 ? violations.join("; ") : null;
    }
  }
];

const SIGNAL_IDS = new Set(INVENTION_SIGNALS.map((s) => s.id));

function detectSignals(ctx) {
  const hits = [];
  for (const signal of INVENTION_SIGNALS) {
    const evidenceOfHit = signal.detect(ctx);
    if (evidenceOfHit) hits.push({ id: signal.id, describe: signal.describe, evidence: evidenceOfHit });
  }
  return hits;
}

function trackDir(slug, trackId) {
  return path.join(rootDir, "data/rcap-all50/pleadings", slug, trackId);
}

function loadTrackFiles(slug, trackId, failures) {
  const dir = trackDir(slug, trackId);
  if (!fs.existsSync(dir)) {
    failures.push(`[${trackId}] missing track directory ${path.relative(rootDir, dir)}`);
    return null;
  }
  const configPath = path.join(dir, "pleading-config.json");
  if (!fs.existsSync(configPath)) {
    failures.push(`[${trackId}] missing pleading-config.json`);
    return null;
  }
  const doc = readJson(configPath);
  const fixtures = {};
  for (const name of ["canonical", "boundary", "negative", "multiline"]) {
    const f = path.join(dir, "fixtures", `${name}.json`);
    if (fs.existsSync(f)) fixtures[name] = readJson(f);
  }
  return { dir, doc, fixtures };
}

function validateConfigShape(trackId, doc, failures) {
  const cfg = doc.config;
  if (!cfg) {
    failures.push(`[${trackId}] pleading-config.json has no "config" object`);
    return;
  }
  for (const field of REQUIRED_CONFIG_FIELDS) {
    if (!(field in cfg)) failures.push(`[${trackId}] config missing required field "${field}"`);
  }
  if (cfg.trackId !== trackId) failures.push(`[${trackId}] config.trackId is "${cfg.trackId}"`);
  if (cfg.templateGrade !== "legal_ops_custom_pleading")
    failures.push(`[${trackId}] templateGrade must be legal_ops_custom_pleading`);
  if (cfg.templateLifecycle !== "replacement_candidate")
    failures.push(`[${trackId}] templateLifecycle must be replacement_candidate`);
  if (!Array.isArray(cfg.primaryStatutoryAuthority) || cfg.primaryStatutoryAuthority.length === 0)
    failures.push(`[${trackId}] primaryStatutoryAuthority must be a non-empty array`);
  if (!Array.isArray(cfg.counselFlags) || cfg.counselFlags.length === 0)
    failures.push(`[${trackId}] counselFlags must be non-empty`);
  if (cfg.presentation) {
    for (const field of REQUIRED_PRESENTATION_FIELDS) {
      if (!(field in cfg.presentation))
        failures.push(`[${trackId}] presentation missing "${field}"`);
    }
  }
  if (!Array.isArray(doc.componentInventory) || doc.componentInventory.length === 0) {
    failures.push(`[${trackId}] componentInventory missing or empty`);
  } else {
    for (const entry of doc.componentInventory) {
      if (!entry.component || !COMPONENT_STATUSES.has(entry.status)) {
        failures.push(`[${trackId}] componentInventory entry invalid: ${JSON.stringify(entry)}`);
      } else if (entry.status !== "present" && !entry.reason) {
        failures.push(`[${trackId}] componentInventory "${entry.component}" is ${entry.status} without a reason`);
      }
    }
  }
  const prov = doc.provenance;
  if (!prov) {
    failures.push(`[${trackId}] provenance missing`);
  } else {
    if (!Array.isArray(prov.statePackFiles)) failures.push(`[${trackId}] provenance.statePackFiles missing`);
    if (!prov.profilePath) failures.push(`[${trackId}] provenance.profilePath missing`);
    if (prov.registryPin !== REGISTRY_PIN)
      failures.push(`[${trackId}] provenance.registryPin must be ${REGISTRY_PIN}`);
    if (!prov.fingerprint) failures.push(`[${trackId}] provenance.fingerprint missing`);
    if (!Array.isArray(prov.registryAuthority) || prov.registryAuthority.length === 0)
      failures.push(`[${trackId}] provenance.registryAuthority missing`);
  }
  if (!Array.isArray(doc.qaProhibitedTerms))
    failures.push(`[${trackId}] qaProhibitedTerms missing (may be empty array)`);
}

function validateProvenance(trackId, doc, failures, warnings) {
  const prov = doc.provenance ?? {};
  if (prov.profilePath) {
    const profileFile = path.join(rootDir, prov.profilePath);
    if (!fs.existsSync(profileFile)) {
      failures.push(`[${trackId}] provenance.profilePath does not exist: ${prov.profilePath}`);
    } else if (prov.fingerprint !== sha256(fs.readFileSync(profileFile))) {
      failures.push(`[${trackId}] provenance.fingerprint does not match sha256 of ${prov.profilePath}`);
    }
  }
  const pinned = pinnedRegistryTrack(trackId);
  if (pinned.available) {
    if (!pinned.track) {
      failures.push(`[${trackId}] not found in pinned registry ${REGISTRY_PIN}`);
    } else {
      const pinnedAuthority = JSON.stringify(pinned.track.authority);
      if (JSON.stringify(prov.registryAuthority) !== pinnedAuthority) {
        failures.push(
          `[${trackId}] provenance.registryAuthority drifts from pinned registry: ${pinnedAuthority}`
        );
      }
    }
  } else {
    warnings.push(`[${trackId}] pinned registry commit not available locally; authority cross-check skipped`);
  }
}

function validateNoInvention(trackId, doc, code, failures) {
  const cfg = doc.config;
  const evidence =
    stateEvidenceText(code) +
    JSON.stringify(doc.provenance?.registryAuthority ?? []) +
    JSON.stringify(doc.provenance?.registryExcerpt ?? "");
  for (const auth of cfg.primaryStatutoryAuthority ?? []) {
    if (auth.citation && !evidence.includes(auth.citation)) {
      failures.push(`[${trackId}] statutory citation not found in committed evidence: "${auth.citation}"`);
    }
  }
  const v = cfg.verificationStatute;
  if (v && v.citation && !evidence.includes(v.citation)) {
    failures.push(`[${trackId}] verification statute citation not found in committed evidence: "${v.citation}"`);
  }
  const addr = cfg.presentation?.serviceRecipientAddressLabel ?? "";
  if (addr && !/\[[^\]]*CONFIRM[^\]]*\]/.test(addr)) {
    failures.push(
      `[${trackId}] serviceRecipientAddressLabel asserts an address instead of a confirm bracket: "${addr}"`
    );
  }
  if (doc.documentForm === "correspondence") {
    const corr = doc.correspondence ?? {};
    for (const field of ["addresseeLabel", "addresseeAddressLabel", "subjectLine", "salutation"]) {
      if (typeof corr[field] !== "string" || corr[field].length === 0) {
        failures.push(`[${trackId}] correspondence.${field} missing`);
      }
    }
    if (!Array.isArray(corr.bodyParagraphs) || corr.bodyParagraphs.length === 0) {
      failures.push(`[${trackId}] correspondence.bodyParagraphs missing`);
    }
    const a = corr.addresseeAddressLabel ?? "";
    if (a && !/\{[a-zA-Z0-9_]+\}/.test(a) && !/\[[^\]]*(CONFIRM|SENDER|OBTAIN)[^\]]*\]/i.test(a)) {
      failures.push(
        `[${trackId}] correspondence.addresseeAddressLabel asserts an address instead of a participant token or confirm bracket: "${a}"`
      );
    }
  }
}

// --- Source silence validation (lane C1 finding 2) ---
//
// Where the source says nothing — no verification statute, no fee, no venue, no
// waiting period — the field stays null and the silence is recorded. A null is
// accepted only when `sourceSilences` carries an entry for that field naming what
// the source actually says (or that it says nothing) and a counselFlag that also
// appears in config.counselFlags, so the gap reaches review rather than being
// quietly filled.
function configNullPaths(value, prefix, out) {
  if (value === null) {
    out.push(prefix);
    return out;
  }
  if (!value || typeof value !== "object") return out;
  if (Array.isArray(value)) {
    value.forEach((item, i) => configNullPaths(item, `${prefix}[${i}]`, out));
    return out;
  }
  for (const [key, child] of Object.entries(value)) {
    configNullPaths(child, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

// A null that no recorded silence covers is admissible only where the config uses
// it to mean "this component is not part of the packet" and the componentInventory
// actually says so. Anything else is a silently unfilled field.
function nullExplainedByAbsentComponent(trackId, doc, nullPath, failures) {
  const link = NULL_MEANS_COMPONENT_ABSENT[nullPath];
  if (!link) return false;
  const cfg = doc.config ?? {};
  if (cfg[link.requiresFalse] !== false) {
    failures.push(
      `[${trackId}] config.${nullPath} is null with no recorded source silence, and config.${link.requiresFalse} is not false`
    );
    return true;
  }
  const entry = (doc.componentInventory ?? []).find((c) => c.component === link.component);
  if (!entry || entry.status === "present" || !entry.reason) {
    failures.push(
      `[${trackId}] config.${nullPath} is null with no recorded source silence, and componentInventory "${link.component}" does not record the component as absent or blocked with a reason`
    );
  }
  return true;
}

function validateSourceSilences(trackId, doc, failures) {
  const cfg = doc.config ?? {};
  const silences = doc.sourceSilences;

  if (!Array.isArray(silences)) {
    failures.push(`[${trackId}] sourceSilences missing (may be an empty array)`);
    return;
  }

  const byField = new Map();
  for (const entry of silences) {
    if (!entry || typeof entry.field !== "string" || !NULLABLE_SOURCE_FIELDS.includes(entry.field)) {
      failures.push(`[${trackId}] sourceSilences entry has an unknown field: ${JSON.stringify(entry)}`);
      continue;
    }
    for (const key of ["sourceStatement", "note", "counselFlag"]) {
      if (typeof entry[key] !== "string" || entry[key].length === 0) {
        failures.push(`[${trackId}] sourceSilences["${entry.field}"] missing ${key}`);
      }
    }
    if (entry.counselFlag && !(cfg.counselFlags ?? []).includes(entry.counselFlag)) {
      failures.push(
        `[${trackId}] sourceSilences["${entry.field}"].counselFlag is not present verbatim in config.counselFlags`
      );
    }
    byField.set(entry.field, entry);
  }

  // A null verification statute is the one silence the config schema can express
  // directly, so it is cross-checked against the recorded note.
  const vCitation = cfg.verificationStatute?.citation ?? null;
  if (vCitation === null && !byField.has("verificationStatute.citation")) {
    failures.push(
      `[${trackId}] verificationStatute.citation is null with no sourceSilences entry recording the silence`
    );
  }
  if (vCitation !== null && byField.has("verificationStatute.citation")) {
    failures.push(
      `[${trackId}] sourceSilences records a silent verification statute but config.verificationStatute.citation is "${vCitation}"`
    );
  }

  // Every remaining null anywhere in the config must be accounted for.
  for (const nullPath of configNullPaths(cfg, "", [])) {
    if (byField.has(nullPath)) continue;
    if (nullExplainedByAbsentComponent(trackId, doc, nullPath, failures)) continue;
    failures.push(
      `[${trackId}] config.${nullPath} is null but no sourceSilences entry records the silence behind it`
    );
  }
}

// Where a fee silence is recorded, no monetary figure may appear anywhere in the
// participant-facing packet either — the rendered-text detector alone would miss
// a figure invented in the instructions.
function validateInstructionsAgainstSilences(trackId, dir, doc, failures) {
  const silences = Array.isArray(doc.sourceSilences) ? doc.sourceSilences : [];
  if (!silences.some((s) => s.field === "filingFee")) return;
  const file = path.join(dir, "participant-instructions.md");
  if (!fs.existsSync(file)) return;
  const body = fs.readFileSync(file, "utf8");
  const m = body.match(/\$\s?\d[\d,.]*/);
  if (m) {
    failures.push(
      `[${trackId}] participant-instructions.md quotes a monetary figure "${m[0]}" while sourceSilences records the filing fee as unrecorded`
    );
  }
}

// --- Blocked pleadings ---
//
// A track whose filing vehicle the source leaves unsettled is not drafted. The
// pin's own build blockers govern: where they reach the form or standing
// practice, the service and response mechanics, or the packet's composition,
// there is no settled instrument to render and inventing one would be the exact
// failure this lane guards against. Such a track carries documentForm
// "blocked_pleading": the intended vehicle is recorded in config, every blocking
// question is quoted from the pin, and no fixtures, no rendered artifacts and no
// participant instructions are produced — shipping participant-facing filing
// instructions would imply a packet that does not exist.
function validateBlockedPleading(trackId, dir, doc, failures) {
  const bp = doc.blockedPleading;
  if (!bp) {
    failures.push(`[${trackId}] documentForm is blocked_pleading but no blockedPleading block present`);
    return;
  }
  for (const key of ["reason", "whatIsSettled", "whatIsBarred", "dependencyLane"]) {
    if (typeof bp[key] !== "string" || bp[key].length === 0) {
      failures.push(`[${trackId}] blockedPleading.${key} missing`);
    }
  }
  if (!Array.isArray(bp.blockingQuestions) || bp.blockingQuestions.length === 0) {
    failures.push(`[${trackId}] blockedPleading.blockingQuestions must quote at least one blocker from the pin`);
  } else {
    for (const q of bp.blockingQuestions) {
      if (!q || typeof q.question !== "string" || typeof q.affectedElement !== "string" || typeof q.impact !== "string") {
        failures.push(`[${trackId}] blockedPleading.blockingQuestions entry malformed: ${JSON.stringify(q)}`);
      }
    }
  }
  const primary = (doc.componentInventory ?? []).find((c) => c.component === "primary_filing");
  if (!primary || primary.status !== "blocked_dependency") {
    failures.push(`[${trackId}] a blocked pleading must record primary_filing as blocked_dependency`);
  }
  for (const forbidden of ["fixtures", "rendered", "participant-instructions.md"]) {
    if (fs.existsSync(path.join(dir, forbidden))) {
      failures.push(
        `[${trackId}] blocked pleading must not ship ${forbidden}; there is no settled instrument to render`
      );
    }
  }
  for (const required of ["handoff.md", "blocked-pleading.md"]) {
    if (!fs.existsSync(path.join(dir, required))) failures.push(`[${trackId}] missing ${required}`);
  }
}

async function renderTrack(slug, trackId, writeArtifacts, failures, warnings) {
  const loaded = loadTrackFiles(slug, trackId, failures);
  if (!loaded) return null;
  const { dir, doc, fixtures } = loaded;

  if (doc.documentForm === "blocked_pleading") {
    if (mode === "verify") validateBlockedPleading(trackId, dir, doc, failures);
    return { doc, results: {}, blocked: true };
  }
  if (!fixtures.canonical) {
    failures.push(`[${trackId}] fixtures/canonical.json missing`);
    return null;
  }
  if (!fixtures.boundary) failures.push(`[${trackId}] fixtures/boundary.json missing`);
  if (!fixtures.negative) failures.push(`[${trackId}] fixtures/negative.json missing`);

  const isCorrespondence = doc.documentForm === "correspondence";
  if (isCorrespondence && !doc.correspondence) {
    failures.push(`[${trackId}] documentForm is correspondence but no correspondence block present`);
    return null;
  }

  const results = {};
  for (const [name, fixture] of Object.entries(fixtures)) {
    const input = buildRenderInput(doc.config, fixture);
    let renderResult;
    if (isCorrespondence) {
      const composed = composeCorrespondence(doc, fixture);
      renderResult = composed.renderResult;
      if (name !== "negative" && composed.unresolved.length > 0) {
        failures.push(
          `[${trackId}] ${name} fixture leaves letter tokens unresolved: ${[...new Set(composed.unresolved)].join(", ")}`
        );
      }
    } else {
      renderResult = renderCustomPleading(input);
    }
    const qa = runPleadingQa({
      config: input.config,
      renderResult,
      prohibitedTerms: doc.qaProhibitedTerms ?? []
    });
    results[name] = { fixture, renderResult, qa };
  }

  // Canonical, boundary and multiline must pass QA AND trip zero invention or
  // protected-field signals. The negative must trip the signals it declares.
  const code = doc.config?.jurisdictionCode;
  const evidence =
    stateEvidenceText(code) +
    JSON.stringify(doc.provenance?.registryAuthority ?? []) +
    JSON.stringify(doc.provenance?.registryExcerpt ?? "");

  for (const name of ["canonical", "boundary", "multiline"]) {
    const r = results[name];
    if (!r) continue;
    if (!r.qa.passed) {
      failures.push(`[${trackId}] ${name} fixture failed QA: ${r.qa.failures.join("; ")}`);
    }
    const hits = detectSignals({ text: r.renderResult.fullText, fixture: r.fixture, doc, evidence });
    for (const hit of hits) {
      failures.push(`[${trackId}] ${name} fixture trips ${hit.id} (${hit.describe}): ${hit.evidence}`);
    }
  }

  const neg = results.negative;
  if (neg) {
    const negHits = detectSignals({
      text: neg.renderResult.fullText,
      fixture: neg.fixture,
      doc,
      evidence
    });
    const detected = new Set(negHits.map((h) => h.id));
    const declared = Array.isArray(neg.fixture.expectedSignals) ? neg.fixture.expectedSignals : null;

    if (!declared) {
      failures.push(
        `[${trackId}] negative fixture has no expectedSignals; every negative must name the invention or protected-field signals its content trips, because runPleadingQa cannot see invented content`
      );
    } else {
      if (declared.length === 0) {
        failures.push(`[${trackId}] negative fixture declares an empty expectedSignals array`);
      }
      for (const want of declared) {
        if (!SIGNAL_IDS.has(want) && want !== "qa") {
          failures.push(`[${trackId}] negative fixture declares unknown signal "${want}"`);
        } else if (want === "qa") {
          if (neg.qa.passed) failures.push(`[${trackId}] negative fixture declares "qa" but QA passed`);
        } else if (!detected.has(want)) {
          failures.push(
            `[${trackId}] negative fixture declares "${want}" but that signal did not fire; fired: ${
              [...detected].join(", ") || "none"
            }`
          );
        }
      }
      // The point of lane C1 finding 1: a QA failure alone is not a negative.
      if (declared.every((s) => s === "qa")) {
        failures.push(
          `[${trackId}] negative fixture relies on a QA failure alone; it must also trip an invention or protected-field signal (runPleadingQa cannot see invented content)`
        );
      }
      if (detected.size === 0) {
        failures.push(
          `[${trackId}] negative fixture trips no invention or protected-field signal at all`
        );
      }
    }
    if (declared && neg.fixture.expectedQaFailureSubstring) {
      if (neg.qa.passed || !neg.qa.failures.some((f) => f.includes(neg.fixture.expectedQaFailureSubstring))) {
        failures.push(
          `[${trackId}] negative fixture states expectedQaFailureSubstring "${neg.fixture.expectedQaFailureSubstring}" but QA did not fail for it`
        );
      }
    }
  }

  const canonical = results.canonical;
  const text = canonical.renderResult.fullText;
  const placeholderScan = scanPlaceholders(text);
  if (placeholderScan.leaks.length > 0) {
    failures.push(`[${trackId}] placeholder leak in canonical output: ${placeholderScan.leaks.join(", ")}`);
  }
  const protectedViolations = scanProtectedFields(text, canonical.fixture);
  if (protectedViolations.length > 0) {
    failures.push(`[${trackId}] protected-field leak: ${protectedViolations.join("; ")}`);
  }

  // Component inventory ↔ rendered sections cross-check.
  const sectionIds = new Set(canonical.renderResult.sections.map((s) => s.sectionId));
  for (const entry of doc.componentInventory ?? []) {
    if (entry.status === "present" && entry.sectionId && !sectionIds.has(entry.sectionId)) {
      failures.push(
        `[${trackId}] componentInventory "${entry.component}" marked present with sectionId "${entry.sectionId}" but that section did not render`
      );
    }
  }

  const renderedDir = path.join(dir, "rendered");
  const pdfPath = path.join(renderedDir, "canonical.pdf");
  const txtPath = path.join(renderedDir, "canonical.txt");
  const reportPath = path.join(renderedDir, "render-report.json");

  if (writeArtifacts) {
    fs.mkdirSync(renderedDir, { recursive: true });
    const pdfBytes = await textToPdf(text);
    fs.writeFileSync(pdfPath, pdfBytes);
    fs.writeFileSync(txtPath, `${text}\n`);
    const parsed = await PDFDocument.load(fs.readFileSync(pdfPath));
    const report = {
      trackId,
      jurisdiction: doc.config.jurisdictionCode,
      fixture: "canonical",
      pageCount: parsed.getPageCount(),
      pdfByteSize: fs.statSync(pdfPath).size,
      pdfSha256: sha256(fs.readFileSync(pdfPath)),
      textSha256: sha256(fs.readFileSync(txtPath)),
      qa: { passed: canonical.qa.passed, failures: canonical.qa.failures, warnings: canonical.qa.warnings },
      placeholderScan: {
        leaks: placeholderScan.leaks,
        deliberateConfirmBrackets: placeholderScan.deliberateBrackets
      },
      protectedFieldReport: {
        violations: protectedViolations,
        blankInCanonical: ["docketNumber", "otn", "judgeName", "judgeAddress", "prosecutor", "ssn", "dob"]
      },
      rendererWarnings: canonical.renderResult.warnings,
      counselFlagCount: doc.config.counselFlags.length
    };
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  } else {
    // Verify previously written artifacts.
    for (const f of [pdfPath, txtPath, reportPath]) {
      if (!fs.existsSync(f)) {
        failures.push(`[${trackId}] missing rendered artifact ${path.relative(dir, f)}`);
      }
    }
    if (fs.existsSync(txtPath)) {
      const committedText = fs.readFileSync(txtPath, "utf8");
      if (committedText !== `${text}\n`) {
        failures.push(`[${trackId}] rendered/canonical.txt does not match a fresh render of the canonical fixture`);
      }
    }
    if (fs.existsSync(pdfPath)) {
      try {
        const parsed = await PDFDocument.load(fs.readFileSync(pdfPath));
        if (parsed.getPageCount() === 0) failures.push(`[${trackId}] canonical.pdf has zero pages`);
        if (fs.existsSync(reportPath)) {
          const report = readJson(reportPath);
          if (report.pageCount !== parsed.getPageCount())
            failures.push(`[${trackId}] render-report pageCount drift`);
          if (report.pdfSha256 !== sha256(fs.readFileSync(pdfPath)))
            failures.push(`[${trackId}] render-report pdfSha256 drift`);
          if (report.textSha256 !== sha256(fs.readFileSync(txtPath)))
            failures.push(`[${trackId}] render-report textSha256 drift`);
        }
      } catch (err) {
        failures.push(`[${trackId}] canonical.pdf unparseable: ${err.message}`);
      }
    }
    for (const extra of ["participant-instructions.md", "handoff.md"]) {
      if (!fs.existsSync(path.join(dir, extra))) failures.push(`[${trackId}] missing ${extra}`);
    }
    const instructions = path.join(dir, "participant-instructions.md");
    if (fs.existsSync(instructions)) {
      const body = fs.readFileSync(instructions, "utf8");
      for (const internalTerm of ["templateLifecycle", "replacement_candidate", "shadowMode", "state pack", "state-pack", "registry pin", "lane C", "verifier"]) {
        if (body.toLowerCase().includes(internalTerm.toLowerCase())) {
          failures.push(`[${trackId}] participant-instructions.md contains internal implementation language: "${internalTerm}"`);
        }
      }
    }
  }
  return { doc, results };
}

function verifyManifest(slug, job, failures) {
  const manifestPath = path.join(rootDir, "data/rcap-all50/pleadings", slug, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    failures.push(`[${slug}] missing jurisdiction manifest.json`);
    return;
  }
  const manifest = readJson(manifestPath);
  if (manifest.jobId !== job.jobId) failures.push(`[${slug}] manifest.jobId "${manifest.jobId}" != "${job.jobId}"`);
  // Tracks promoted by review leave the OPEN job but remain this lane's
  // delivered work, so the manifest legitimately still lists them. The
  // comparison is against open + promoted, which is the lane's full
  // responsibility set.
  //
  // Ownership is resolved from the ARTIFACT on disk as well as from
  // candidateEvidence: a track promoted by the terminalization review carries
  // the terminal treatment that closed it as its evidence pointer, not the
  // pleading this lane authored, but the pleading is still here and still ours.
  const ledgerDoc = readJson(path.join(rootDir, "data/rcap-ledger/track-terminalization.json"));
  const promotedHere = (ledgerDoc.tracks ?? [])
    .filter((t) => String(t.candidateStatus ?? "").startsWith("promoted_by_")
      && (String(t.candidateEvidence ?? "").startsWith(`data/rcap-all50/pleadings/${slug}/`)
        || fs.existsSync(path.join(rootDir, "data/rcap-all50/pleadings", slug, t.trackId))))
    .map((t) => t.trackId);
  const ledgerIds = [...new Set([...job.trackIds, ...promotedHere])].sort();
  const manifestIds = [...(manifest.trackIds ?? [])].sort();
  if (JSON.stringify(ledgerIds) !== JSON.stringify(manifestIds)) {
    failures.push(`[${slug}] manifest.trackIds drift from ledger: ${JSON.stringify(manifestIds)}`);
  }
  for (const tid of job.trackIds) {
    const entry = manifest.tracks?.[tid];
    if (!entry || !entry.status || typeof entry.componentCount !== "number") {
      failures.push(`[${slug}] manifest.tracks["${tid}"] missing status/componentCount`);
    }
  }
}

function verifyOwnedPaths(failures) {
  const status = spawnSync("git", ["status", "--porcelain", "-uall"], { cwd: rootDir, encoding: "utf8" });
  for (const line of status.stdout.split("\n")) {
    if (!line.trim()) continue;
    const file = line.slice(3).trim().replace(/^"|"$/g, "");
    const target = file.includes(" -> ") ? file.split(" -> ")[1] : file;
    if (!OWNED_PATH_PREFIXES.some((p) => target === p || target.startsWith(p))) {
      failures.push(`file changed outside lane C2 owned paths: ${target}`);
    }
  }
}

// --- Main ---

const argv = process.argv.slice(2);
const mode = argv[0] === "render" || argv[0] === "verify" ? argv[0] : "verify";
const slugArgs = (argv[0] === "render" || argv[0] === "verify" ? argv.slice(1) : argv).filter(Boolean);

const jobs = ledgerJobs();
const selected = jobs.filter(
  (j) => slugArgs.length === 0 || slugArgs.includes(JURISDICTION_SLUGS[j.jurisdiction])
);
if (selected.length === 0) {
  console.error(`No lane C2 jobs match ${JSON.stringify(slugArgs)}.`);
  process.exit(1);
}

const failures = [];
const warnings = [];
let trackCount = 0;

for (const job of selected) {
  const slug = JURISDICTION_SLUGS[job.jurisdiction];
  for (const trackId of job.trackIds) {
    trackCount += 1;
    const loadedFailures = [];
    const rendered = await renderTrack(slug, trackId, mode === "render", loadedFailures, warnings);
    if (rendered && mode === "verify") {
      validateConfigShape(trackId, rendered.doc, loadedFailures);
      validateProvenance(trackId, rendered.doc, loadedFailures, warnings);
      validateNoInvention(trackId, rendered.doc, job.jurisdiction, loadedFailures);
      validateSourceSilences(trackId, rendered.doc, loadedFailures);
      validateInstructionsAgainstSilences(trackId, trackDir(slug, trackId), rendered.doc, loadedFailures);
    }
    failures.push(...loadedFailures);
    const state = loadedFailures.length === 0 ? "ok" : "FAIL";
    console.log(`  [${mode}] ${slug}/${trackId}: ${state}`);
  }
  if (mode === "verify") verifyManifest(slug, job, failures);
}

if (mode === "verify") verifyOwnedPaths(failures);

console.log("");
if (warnings.length > 0) {
  console.log("Warnings:");
  for (const w of warnings) console.log(`  ~ ${w}`);
}
if (failures.length > 0) {
  console.error(`Lane C2 ${mode} FAILED (${failures.length} failure(s) across ${trackCount} track(s)):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`Lane C2 ${mode} PASSED: ${selected.length} job(s), ${trackCount} track(s).`);
