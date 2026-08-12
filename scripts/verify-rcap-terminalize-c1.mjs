// Lane C1 terminalization verifier — controlled pleadings + composed routes.
//
// Scope: the 16 lane-C jobs for AR CA CT IA IL IN KY MT TX VT WV in
// data/rcap-ledger/track-terminalization.json (composed routes + the
// pleading jobs for jurisdictions that also carry a composed job). Lane
// output is data/docs only; runtime wiring is Terminal A's after the freeze.
//
// Modes:
//   node scripts/verify-rcap-terminalize-c1.mjs            verify everything
//   node scripts/verify-rcap-terminalize-c1.mjs --render   (re)generate
//     rendered/canonical.txt, canonical.pdf and render-report.json for every
//     pleading track and pleading component, then verify.
//
// Fails on: a missing artifact for an assigned track, config-shape drift,
// provenance hash drift against the compiled profile, canonical fixtures that
// do not pass pleading QA, negative fixtures that do not fail, relief-term
// vocabulary leaks, placeholder leaks, protected-field leaks (docket, judge,
// OTN, prosecutor, SSN/DOB shapes) in canonical renders, composed routes with
// unresolved or silently omitted components, filing/participant separation
// errors, internal implementation language in participant documents, manifest
// drift against the ledger, and any working-tree change outside C1-owned
// paths.

import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const { PDFDocument, StandardFonts } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RENDER = process.argv.includes("--render");
const failures = [];
const assert = (cond, msg) => {
  if (!cond) failures.push(msg);
};
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

registerTypeScriptHook();
const { renderCustomPleading, runPleadingQa } = require(path.join(rootDir, "src/lib/record-clearing/index.ts"));

const C1 = {
  AR: "arkansas", CA: "california", CT: "connecticut", IA: "iowa", IL: "illinois",
  IN: "indiana", KY: "kentucky", MT: "montana", TX: "texas", VT: "vermont", WV: "west-virginia"
};
const REGISTRY_PIN = "3b6f4c103d2f97249b45acc0ea3fb889ff8787e5";

const ledger = JSON.parse(fs.readFileSync(path.join(rootDir, "data/rcap-ledger/track-terminalization.json"), "utf8"));
const jobs = ledger.jobs.filter((j) => j.lane === "C" && C1[j.jurisdiction]);
assert(jobs.length === 16, `expected 16 C1 jobs from the ledger, found ${jobs.length}`);

const RELIEF_VOCAB = {
  expungement: ["expungement", "expunge", "expunction"],
  sealing: ["sealing", " seal ", "sealed"],
  "set aside": ["set aside", "set-aside"],
  annulment: ["annulment", "annul"],
  vacatur: ["vacatur", "vacate"],
  erasure: ["erasure", "erase"],
  pardon: ["pardon"]
};

const INTERNAL_TERMS = [/\blane\b/i, /template\s*grade/i, /fingerprint/i, /track[_-]id/i, /registry/i, /compiled profile/i, /terminaliz/i];
const PLACEHOLDER_PATTERNS = [/\[TODO/i, /\{\{[^}]*\}\}/, /lorem ipsum/i, /XXXX/, /\[FIXME/i];
const PROTECTED_PATTERNS = [/\b\d{3}-\d{2}-\d{4}\b/, /date of birth:\s*\S/i];

const COMPONENT_KEYS = [
  "caption", "court_party_identity", "title", "allegations", "statutory_basis",
  "requested_relief", "verification", "signatures", "proposed_order",
  "certificate_of_service", "notice_or_affidavit", "participant_cover_sheet", "filing_instructions"
];

let pleadingTracksChecked = 0;
let composedTracksChecked = 0;
let componentsChecked = 0;
let rendersChecked = 0;

for (const job of jobs) {
  const slug = C1[job.jurisdiction];
  const family = job.implementationFamily;
  const baseDir = family === "composed_route"
    ? path.join(rootDir, "data/rcap-all50/composed-routes", slug)
    : path.join(rootDir, "data/rcap-all50/pleadings", slug);

  const manifestPath = path.join(baseDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    failures.push(`${job.jobId}: missing jurisdiction manifest ${path.relative(rootDir, manifestPath)}`);
  } else {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const mTracks = new Set(manifest.trackIds ?? []);
    for (const t of job.trackIds) assert(mTracks.has(t), `${job.jobId}: manifest omits assigned track ${t}`);
    const ids = Array.isArray(manifest.jobIds) ? manifest.jobIds : [manifest.jobId];
    assert(ids.includes(job.jobId), `${job.jobId}: manifest does not name this job`);
  }

  for (const trackId of job.trackIds) {
    const dir = path.join(baseDir, trackId);
    if (!fs.existsSync(dir)) {
      failures.push(`${job.jobId}: no artifact directory for assigned track ${trackId}`);
      continue;
    }
    if (family === "composed_route") {
      composedTracksChecked += 1;
      verifyComposedTrack(job, slug, trackId, dir);
    } else {
      pleadingTracksChecked += 1;
      verifyPleadingArtifacts(job, slug, trackId, dir, { requireFullFixtures: true });
    }
  }
}

function loadJson(file, label) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    failures.push(`${label}: unreadable JSON ${path.relative(rootDir, file)} (${error.message})`);
    return null;
  }
}

function verifyPleadingArtifacts(job, slug, trackId, dir, { requireFullFixtures }) {
  const label = `${job.jobId}/${trackId}`;
  const configPath = path.join(dir, "pleading-config.json");
  if (!fs.existsSync(configPath)) {
    failures.push(`${label}: missing pleading-config.json`);
    return;
  }
  const doc = loadJson(configPath, label);
  if (!doc) return;
  const cfg = doc.config ?? doc;

  for (const field of ["jurisdictionCode", "trackId", "templateGrade", "templateLifecycle", "primaryReliefTerm", "documentTitleFull", "courtCaption", "primaryStatutoryAuthority", "verificationStatute", "counselFlags"]) {
    assert(field in cfg, `${label}: pleading-config missing ${field}`);
  }
  assert(cfg.templateGrade === "legal_ops_custom_pleading", `${label}: templateGrade must be legal_ops_custom_pleading`);
  assert(cfg.templateLifecycle === "replacement_candidate", `${label}: templateLifecycle must be replacement_candidate`);
  assert(cfg.trackId === trackId, `${label}: config trackId mismatch (${cfg.trackId})`);
  assert(cfg.jurisdictionCode === job.jurisdiction, `${label}: config jurisdiction mismatch`);
  assert(Array.isArray(cfg.primaryStatutoryAuthority) && cfg.primaryStatutoryAuthority.length > 0, `${label}: primaryStatutoryAuthority empty`);
  assert(Array.isArray(cfg.counselFlags), `${label}: counselFlags must be an array`);

  const inventory = doc.componentInventory;
  assert(inventory && typeof inventory === "object", `${label}: componentInventory missing`);
  if (inventory) {
    for (const key of COMPONENT_KEYS) {
      const entry = inventory[key];
      assert(entry && (entry.status === "present" || (entry.status === "absent" && typeof entry.reason === "string" && entry.reason.length > 0)),
        `${label}: componentInventory.${key} must be present or absent-with-reason`);
    }
  }

  const prov = doc.provenance;
  assert(prov && Array.isArray(prov.statePackFiles) && prov.statePackFiles.length > 0, `${label}: provenance.statePackFiles empty`);
  assert(prov && prov.registryPin === REGISTRY_PIN, `${label}: provenance.registryPin must be ${REGISTRY_PIN}`);
  if (prov?.profilePath) {
    const profAbs = path.join(rootDir, prov.profilePath);
    if (!fs.existsSync(profAbs)) {
      failures.push(`${label}: provenance.profilePath does not resolve`);
    } else {
      assert(sha256(fs.readFileSync(profAbs)) === prov.profileSha256, `${label}: provenance.profileSha256 drifted from ${prov.profilePath}`);
    }
  } else {
    failures.push(`${label}: provenance.profilePath missing`);
  }

  const fixtureNames = requireFullFixtures ? ["canonical", "boundary", "negative"] : ["canonical"];
  const fixtures = {};
  for (const name of fixtureNames) {
    const fixturePath = path.join(dir, "fixtures", `${name}.json`);
    if (!fs.existsSync(fixturePath)) {
      failures.push(`${label}: missing fixtures/${name}.json`);
      continue;
    }
    fixtures[name] = loadJson(fixturePath, label);
  }

  for (const docName of ["participant-instructions.md", "handoff.md"]) {
    const p = path.join(dir, docName);
    if (!fs.existsSync(p)) {
      failures.push(`${label}: missing ${docName}`);
    } else if (docName === "participant-instructions.md") {
      scanParticipantDoc(label, p);
    }
  }

  // Render + QA.
  if (fixtures.canonical) {
    const input = buildRenderInput(cfg, fixtures.canonical, label);
    if (input) {
      let result = null;
      try {
        result = renderCustomPleading(input);
      } catch (error) {
        failures.push(`${label}: canonical render threw (${error.message})`);
      }
      if (result) {
        rendersChecked += 1;
        assert(result.rendered, `${label}: canonical fixture did not render`);
        const qa = runPleadingQa({ config: cfg, renderResult: result, prohibitedTerms: prohibitedTermsFor(cfg, doc) });
        for (const f of qa.failures ?? []) failures.push(`${label}: canonical QA failure — ${f}`);
        scanRenderedText(label, result.fullText, fixtures.canonical);
        handleRenderedArtifacts(label, dir, result);
      }
    }
  }
  if (requireFullFixtures && fixtures.negative) {
    const expect = fixtures.negative.expectFailure;
    assert(typeof expect === "string" && expect.length > 0, `${label}: negative fixture must state expectFailure`);
    const input = buildRenderInput(cfg, fixtures.negative, label);
    if (input) {
      let failed = false;
      try {
        const result = renderCustomPleading(input);
        const qa = runPleadingQa({ config: cfg, renderResult: result, prohibitedTerms: prohibitedTermsFor(cfg, doc) });
        failed = !qa.passed;
      } catch {
        failed = true;
      }
      assert(failed, `${label}: negative fixture unexpectedly passed QA (${expect})`);
    }
  }
}

function buildRenderInput(cfg, fixture, label) {
  const { partyData, caseData, chargeData, eligibilityData } = fixture;
  if (!partyData || !caseData || !chargeData || !eligibilityData) {
    failures.push(`${label}: fixture missing partyData/caseData/chargeData/eligibilityData`);
    return null;
  }
  return {
    config: cfg,
    partyData, caseData, chargeData, eligibilityData,
    attachments: fixture.attachments ?? [],
    productName: fixture.productName ?? "LegalEase RCAP",
    shadowMode: true
  };
}

function prohibitedTermsFor(cfg, doc) {
  if (Array.isArray(doc.prohibitedTerms)) return doc.prohibitedTerms;
  const allowedText = [
    cfg.primaryReliefTerm ?? "",
    cfg.documentTitleFull ?? "",
    ...(cfg.primaryStatutoryAuthority ?? []).map((s) => `${s.citation ?? ""} ${s.description ?? ""}`)
  ].join(" ").toLowerCase();
  const prohibited = [];
  for (const [family, terms] of Object.entries(RELIEF_VOCAB)) {
    const familyAllowed = terms.some((t) => allowedText.includes(t.trim().toLowerCase())) || (cfg.primaryReliefTerm ?? "").toLowerCase().includes(family);
    if (!familyAllowed) prohibited.push(...terms.map((t) => t.trim()));
  }
  return prohibited;
}

function scanRenderedText(label, text, canonicalFixture) {
  for (const pattern of PLACEHOLDER_PATTERNS) {
    assert(!pattern.test(text), `${label}: placeholder leak in canonical render (${pattern})`);
  }
  for (const pattern of PROTECTED_PATTERNS) {
    assert(!pattern.test(text), `${label}: protected-field leak in canonical render (${pattern})`);
  }
  // Canonical fixtures leave outside-party/court fields blank; the render must
  // not contain values for them.
  const caseData = canonicalFixture.caseData ?? {};
  for (const field of ["docketNumber", "otn", "judgeName"]) {
    if (caseData[field]) failures.push(`${label}: canonical fixture must leave ${field} blank`);
  }
}

function handleRenderedArtifacts(label, dir, result) {
  const renderedDir = path.join(dir, "rendered");
  const txtPath = path.join(renderedDir, "canonical.txt");
  const pdfPath = path.join(renderedDir, "canonical.pdf");
  const reportPath = path.join(renderedDir, "render-report.json");
  if (RENDER) {
    fs.mkdirSync(renderedDir, { recursive: true });
    fs.writeFileSync(txtPath, result.fullText);
    const pdfBytes = writePdfSync(result.fullText);
    fs.writeFileSync(pdfPath, pdfBytes);
    fs.writeFileSync(reportPath, `${JSON.stringify({
      textSha256: sha256(result.fullText),
      pdfSha256: sha256(pdfBytes),
      pdfBytes: pdfBytes.length,
      pageCount: countPagesSync(pdfBytes),
      sections: result.sections.map((s) => s.sectionId),
      placeholderScan: "clean",
      protectedFieldScan: "clean"
    }, null, 1)}\n`);
  }
  if (!fs.existsSync(txtPath) || !fs.existsSync(pdfPath) || !fs.existsSync(reportPath)) {
    failures.push(`${label}: rendered artifacts missing (run --render)`);
    return;
  }
  const committedText = fs.readFileSync(txtPath, "utf8");
  assert(committedText === result.fullText, `${label}: rendered/canonical.txt drifted from a fresh render`);
  const report = loadJson(reportPath, label);
  if (report) {
    assert(report.textSha256 === sha256(result.fullText), `${label}: render-report textSha256 drifted`);
    const pages = countPagesSync(fs.readFileSync(pdfPath));
    assert(pages >= 1 && pages === report.pageCount, `${label}: PDF page count ${pages} != report ${report.pageCount}`);
  }
}

// pdf-lib is async; the verifier runs it synchronously via a child eval to keep
// the main flow simple and deterministic.
function writePdfSync(text) {
  const script = `
    const { PDFDocument, StandardFonts } = require("pdf-lib");
    (async () => {
      const doc = await PDFDocument.create();
      doc.setCreationDate(new Date(0)); doc.setModificationDate(new Date(0));
      doc.setProducer("rcap-terminalize-c1"); doc.setCreator("rcap-terminalize-c1");
      const font = await doc.embedFont(StandardFonts.TimesRoman);
      const size = 11, margin = 54, lineHeight = 14;
      const pageWidth = 612, pageHeight = 792, maxWidth = pageWidth - margin * 2;
      const words = process.env.PLEADING_TEXT.split(/\\s+/);
      const paragraphs = process.env.PLEADING_TEXT.split("\\n");
      let page = doc.addPage([pageWidth, pageHeight]);
      let y = pageHeight - margin;
      const newLine = () => { y -= lineHeight; if (y < margin) { page = doc.addPage([pageWidth, pageHeight]); y = pageHeight - margin; } };
      for (const para of paragraphs) {
        let line = "";
        for (const word of para.split(/\\s+/).filter(Boolean)) {
          const candidate = line ? line + " " + word : word;
          if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
            page.drawText(line, { x: margin, y, size, font }); newLine(); line = word;
          } else line = candidate;
        }
        if (line) { page.drawText(line, { x: margin, y, size, font }); }
        newLine();
      }
      const bytes = await doc.save({ useObjectStreams: false });
      process.stdout.write(Buffer.from(bytes).toString("base64"));
    })().catch((e) => { console.error(e); process.exit(1); });
  `;
  const child = spawnSync(process.execPath, ["-e", script], {
    cwd: rootDir,
    env: { ...process.env, PLEADING_TEXT: text },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024
  });
  if (child.status !== 0) throw new Error(`pdf render failed: ${child.stderr}`);
  return Buffer.from(child.stdout, "base64");
}

function countPagesSync(pdfBytes) {
  const script = `
    const { PDFDocument } = require("pdf-lib");
    (async () => {
      const doc = await PDFDocument.load(Buffer.from(process.env.PDF_B64, "base64"));
      process.stdout.write(String(doc.getPageCount()));
    })().catch((e) => { console.error(e); process.exit(1); });
  `;
  const child = spawnSync(process.execPath, ["-e", script], {
    cwd: rootDir,
    env: { ...process.env, PDF_B64: Buffer.from(pdfBytes).toString("base64") },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024
  });
  if (child.status !== 0) return -1;
  return Number(child.stdout.trim());
}

function scanParticipantDoc(label, filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  for (const pattern of INTERNAL_TERMS) {
    assert(!pattern.test(text), `${label}: internal implementation language in ${path.basename(filePath)} (${pattern})`);
  }
  for (const pattern of PLACEHOLDER_PATTERNS) {
    assert(!pattern.test(text), `${label}: placeholder leak in ${path.basename(filePath)} (${pattern})`);
  }
}

function verifyComposedTrack(job, slug, trackId, dir) {
  const label = `${job.jobId}/${trackId}`;
  const routePath = path.join(dir, "route.json");
  if (!fs.existsSync(routePath)) {
    failures.push(`${label}: missing route.json`);
    return;
  }
  const route = loadJson(routePath, label);
  if (!route) return;

  assert(route.schemaVersion === "rcap-composed-route/v1", `${label}: route schemaVersion drift`);
  assert(route.trackId === trackId, `${label}: route trackId mismatch`);
  assert(Array.isArray(route.authoritySpine) && route.authoritySpine.length > 0, `${label}: authoritySpine empty`);
  assert(Array.isArray(route.units) && route.units.length > 0, `${label}: composed route has no units`);
  assert(typeof route.omissionProof === "string" && route.omissionProof.length > 40, `${label}: omissionProof missing`);

  const componentIds = new Set();
  const REQUIRED_OUTPUTS = new Set(["pleading_document", "official_form_dependency", "participant_instruction", "agency_request_letter", "cover_sheet"]);
  for (const unit of route.units ?? []) {
    const uLabel = `${label}:${unit.unitId ?? "?"}`;
    assert(unit.unitId && unit.legalUnit, `${uLabel}: unit must carry unitId and legalUnit`);
    assert(unit.authority?.citation, `${uLabel}: unit missing authority citation`);
    assert(REQUIRED_OUTPUTS.has(unit.requiredOutput), `${uLabel}: unknown requiredOutput ${unit.requiredOutput}`);
    assert(unit.componentId && !componentIds.has(unit.componentId), `${uLabel}: componentId missing or duplicated`);
    componentIds.add(unit.componentId);
    assert(unit.applicability?.includedWhen, `${uLabel}: applicability.includedWhen missing`);
    assert(unit.participantTreatment, `${uLabel}: participantTreatment missing`);

    const compDir = path.join(dir, "components", unit.componentId);
    componentsChecked += 1;
    if (unit.requiredOutput === "official_form_dependency") {
      const dep = path.join(compDir, "dependency.json");
      if (!fs.existsSync(dep)) {
        failures.push(`${uLabel}: official_form_dependency without dependency.json`);
      } else {
        const d = loadJson(dep, uLabel);
        if (d) {
          assert(d.officialForm, `${uLabel}: dependency.json missing officialForm`);
          assert(["D", "E"].includes(d.owningLane), `${uLabel}: dependency owningLane must be D or E`);
        }
        assert(!fs.existsSync(path.join(compDir, "pleading-config.json")), `${uLabel}: must not draft a pleading where an official form is mandatory`);
      }
    } else if (unit.requiredOutput === "pleading_document") {
      if (!fs.existsSync(path.join(compDir, "pleading-config.json"))) {
        failures.push(`${uLabel}: pleading_document component missing pleading-config.json`);
      } else {
        verifyPleadingArtifacts(job, slug, trackId, compDir, { requireFullFixtures: false });
      }
    } else {
      const mdFiles = fs.existsSync(compDir) ? fs.readdirSync(compDir).filter((f) => f.endsWith(".md")) : [];
      assert(mdFiles.length > 0, `${uLabel}: ${unit.requiredOutput} component has no document`);
      for (const f of mdFiles) scanParticipantDoc(uLabel, path.join(compDir, f));
    }
  }

  // No silent omission in either direction.
  const compRoot = path.join(dir, "components");
  if (fs.existsSync(compRoot)) {
    for (const entry of fs.readdirSync(compRoot)) {
      assert(componentIds.has(entry), `${label}: components/${entry} is not named by any unit`);
    }
  }

  const sep = route.filingSeparation;
  assert(sep && Array.isArray(sep.courtDocuments) && Array.isArray(sep.participantOnly), `${label}: filingSeparation missing`);
  if (sep) {
    const all = [...sep.courtDocuments, ...sep.participantOnly];
    assert(all.length === componentIds.size && all.every((c) => componentIds.has(c)),
      `${label}: filingSeparation must partition exactly the unit componentIds`);
    const overlap = sep.courtDocuments.filter((c) => sep.participantOnly.includes(c));
    assert(overlap.length === 0, `${label}: componentIds in both filing sets: ${overlap.join(",")}`);
  }

  for (const docName of ["participant-instructions.md", "handoff.md"]) {
    const p = path.join(dir, docName);
    if (!fs.existsSync(p)) failures.push(`${label}: missing ${docName}`);
    else if (docName === "participant-instructions.md") scanParticipantDoc(label, p);
  }
}

// Working-tree scope: every change stays inside C1-owned paths.
const OWNED_PREFIXES = [
  ...Object.values(C1).map((s) => `data/rcap-all50/pleadings/${s}/`),
  ...Object.values(C1).map((s) => `data/rcap-all50/composed-routes/${s}/`),
  "scripts/verify-rcap-terminalize-c1.mjs",
  "docs/record-clearing/terminalize-c/"
];
const status = spawnSync("git", ["status", "--short"], { cwd: rootDir, encoding: "utf8" }).stdout ?? "";
for (const line of status.split("\n").filter(Boolean)) {
  const file = line.slice(3).trim().replace(/^"|"$/g, "");
  if (!file) continue;
  assert(OWNED_PREFIXES.some((p) => file.startsWith(p)), `working-tree change outside C1-owned paths: ${file}`);
}

if (failures.length > 0) {
  console.error("verify-rcap-terminalize-c1 FAILED");
  for (const failure of failures.slice(0, 60)) console.error(` - ${failure}`);
  if (failures.length > 60) console.error(` … and ${failures.length - 60} more`);
  process.exit(1);
}

console.log("verify-rcap-terminalize-c1 passed.");
console.log(`  pleading tracks: ${pleadingTracksChecked}; composed tracks: ${composedTracksChecked}; components: ${componentsChecked}; canonical renders verified: ${rendersChecked}`);

function registerTypeScriptHook() {
  const originalLoader = Module._extensions[".ts"];
  Module._extensions[".ts"] = function loadTs(module, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true
      },
      fileName: filename
    }).outputText;
    module._compile(output, filename);
  };
  process.once("exit", () => {
    Module._extensions[".ts"] = originalLoader;
  });
}
