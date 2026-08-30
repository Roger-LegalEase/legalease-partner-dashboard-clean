#!/usr/bin/env node
// The shared caption-infrastructure correction, held in place.
//
//   node scripts/rcap-official-forms/verify-shared-caption-infrastructure-semantics.mjs
//
// Six things are checked, and they fail for different reasons.
//
//   1. The rules themselves, stated as the exact field names and captions the
//      corpus commits, with controls on either side of each: the thing that must
//      now be refused is refused, and the thing beside it that must still bind
//      still binds.
//   2. The ORDER. The correction adds protections before it makes the caption
//      harvest precise, and that claim is checked rather than asserted: the
//      binder as it stood at the base commit is run against the captions as they
//      are harvested NOW, which is what "precision first" would have produced,
//      and the blanks that would have been left unguarded are named. Then the
//      same blanks are shown guarded under the binder as it stands.
//   3. The blast radius. Both projections in the committed record are recomputed
//      over every committed census, and the set of fields that move must be
//      exactly the set the record enumerates, with none of them unexplained.
//   4. Protection, in the direction that matters: no protect category removed,
//      no protect rule term lost, no field protected at the base commit writable
//      now, and no field that was refused made writable.
//   5. The invariants, recomputed rather than read out of the record.
//   6. The two mounted-corpus walks, which must not read the source bundle as
//      though it were repository content.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(rootDir);

const SEMANTICS = "scripts/rcap-official-forms/rcap-field-semantics.mjs";
const CAPTURE = "scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs";
const FINALIZE = "scripts/rcap-official-forms/rcap-official-form-finalize.mjs";
const BASE_SHA = "0c429cbee66bf1fe92c4fc4c9dcbb7871c103a4a";
const RECORD = "data/rcap-grade-a/field-semantics/shared-caption-infrastructure-classification-diff.json";
const OVERLAY_ROOT = "data/rcap-all50/overlays";
const CENSUS_FILENAMES = ["field-census.json", "field-census.census-v1.json"];
const NAME_FACTS = new Set([
  "participant.full_legal_name", "participant.first_name", "participant.middle_name", "participant.last_name"
]);
const MOUNTED_CORPUS_WALKS = [
  ["scripts/generate-rcap-flat-overlay-profiles.mjs", "binariesBySha"],
  ["scripts/generate-rcap-problematic-pdf-master-list.mjs", "pdfsInClone"]
];

const failures = [];
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const semantics = await import(pathToFileURL(path.resolve(rootDir, SEMANTICS)).href);
const {
  decideBinding, descriptorsMatching, protectCategoryOf, regionProtectCategoryOf,
  captionDescribesChargeValue, fieldNameDeclaresADate,
  PROTECT_RULES, REGION_HEADING_RULES, CHARGE_VALUE_WORDS, CRIME_WORD_THAT_NAMES_A_PERSON
} = semantics;

console.log("shared caption infrastructure\n");

// ---- 1. the rules, as the corpus prints them ---------------------------------

// P1. A court's own contact block. Every one of these is a caption or a field
//     name the corpus commits, and each bound a participant fact before this.
console.log("  P1 — a court's own contact block is not the participant's");
const COURT_CONTACT = [
  ["CT JD-CR-202's court address blank", "COURTADDRESS", null],
  ["MI MC 227a's court address", "ctaddress", "Court address"],
  ["MI MC 227a's court telephone", "cttelno", "Court telephone no"],
  ["twelve Colorado forms' court address", "Court Address", null],
  ["a court address written the other way round", "Address of court", null],
  ["a court e-mail line", "Court E-Mail Address", null],
  ["a courthouse street address", "Courthouse Address", null]
];
for (const [what, name, label] of COURT_CONTACT) {
  const decision = decideBinding({ name, pdfType: "text", effectiveLabel: label });
  check(`${what} is refused`, decision.writable === false,
    `${JSON.stringify(label ?? name)} -> ${decision.factId ?? decision.reason}`);
}
// Controls: the rule is an owner plus a contact detail, and nothing looser.
const COURT_CONTACT_CONTROLS = [
  ["Court Name", "matter.court"],
  ["Type Of Court", "matter.court"],
  ["County", "matter.county"],
  ["Courtroom No", null],
  ["Phone", "participant.phone"],
  ["E-Mail Address", "participant.email"],
  ["Street Address", "participant.street_address"]
];
for (const [caption, expected] of COURT_CONTACT_CONTROLS) {
  check(`"${caption}" is not a court-contact field`, protectCategoryOf(caption) !== "court_contact",
    `-> ${protectCategoryOf(caption)}`);
  if (expected) {
    check(`"${caption}" still resolves to ${expected}`, descriptorsMatching(caption)[0]?.factId === expected,
      `-> ${descriptorsMatching(caption)[0]?.factId}`);
  }
}

// P2/P3. The oath block, by name and by printed heading.
console.log("  P2/P3 — a jurat, an oath, an affidavit and a certificate of mailing");
const JURAT_BY_NAME = [
  ["AL SBI Form 46's jurat line", "Sworn to and subscribed before me this"],
  ["the same clause the other way round", "Subscribed and sworn to before me"],
  ["an affiant's own name line", "Affiant Name"],
  ["a verification block", "Verification of Petitioner"],
  ["a perjury declaration", "Under Penalty of Perjury"],
  ["an oath administered by an officer", "Person Authorized to Administer Oaths"],
  ["MC 227a's certificate of mailing", "Certificate of Mailing"],
  ["a proof of mailing", "Proof of Mailing"]
];
for (const [what, name] of JURAT_BY_NAME) {
  check(`${what} is protected by name`, protectCategoryOf(name) !== null, `${JSON.stringify(name)} -> null`);
}
const JURAT_BY_HEADING = [
  ["AL SBI Form 46's mid-page affidavit heading", "AFFIDAVIT FOR RELEASE INFORMATION", "notarization"],
  ["an oath section heading", "OATH", "notarization"],
  ["an oath of petitioner heading", "OATH OF PETITIONER", "notarization"],
  ["MC 227a's certificate heading", "CERTIFICATE OF MAILING", "service_block"],
  ["MC 227a's verification clause, which is how the block is actually headed",
    "mailing has been examined by me and that its contents are true to the best of my information, knowledge, and belief.",
    "notarization"],
  ["NC AOC-CV-226's jurat heading", "SWORN/AFFIRMED AND SUBSCRIBED TO BEFORE ME", "notarization"]
];
for (const [what, heading, expected] of JURAT_BY_HEADING) {
  check(`${what} opens a ${expected} region`, regionProtectCategoryOf(heading) === expected,
    `-> ${regionProtectCategoryOf(heading)}`);
}
// The control that earns the heading/name split. Kentucky's petition opens
// "Comes the Petitioner, ______, under oath and states", and the blank is the
// petitioner's own name. Refusing it leaves a required allegation blank.
check("a petition's opening clause still takes the petitioner's name, though it says 'under oath'",
  decideBinding({
    name: "Comes the Petitioner", pdfType: "text",
    effectiveLabel: "Comes the Petitioner, , under oath and states that the"
  }).factId === "participant.full_legal_name");
check("the word 'oath' inside a sentence does not open an oath region",
  regionProtectCategoryOf("Comes the Defendant/Petitioner, , under oath and states") === null);

// P4. The signature date, however the form spells it.
console.log("  P4 — a signature date belongs to the act of signing");
for (const name of ["datesigned", "DATESIGN", "Date Signed", "Signed Date", "PresidingJudgeOrderSignDate"]) {
  check(`"${name}" is protected as a signature`, protectCategoryOf(name) === "signature",
    `-> ${protectCategoryOf(name)}`);
}
check("a filing date the form actually asks for still binds",
  descriptorsMatching("Today's Date")[0]?.factId === "deterministic.filing_date");
check("the bare word Date binds nothing at all",
  descriptorsMatching("Date").length === 0 && descriptorsMatching("Dated").length === 0);

// P5. The judgment block, vowel dropped and welded.
console.log("  P5 — the court's judgment block");
for (const name of ["TOWNJUDGMNT", "DATEJUDGMNT", "Judgment"]) {
  check(`"${name}" is protected as the court's`, protectCategoryOf(name) === "court", `-> ${protectCategoryOf(name)}`);
}

// P6. A venue recital is not a question about the participant.
console.log("  P6 — a venue recital");
for (const caption of ["STATE OF MICHIGAN", "The State of Michigan", "STATE OF NORTH CAROLINA", "STATE OF ARKANSAS PLAINTIFF"]) {
  check(`"${caption}" does not offer participant.state`,
    !descriptorsMatching(caption).some((d) => d.factId === "participant.state"),
    `-> ${descriptorsMatching(caption).map((d) => d.factId).join(",")}`);
}
for (const caption of ["State", "State:", "City, State and Zip", "Issuing State", "State of Residence", "State of Birth", "State of Issue"]) {
  check(`"${caption}" still resolves to participant.state`,
    descriptorsMatching(caption).some((d) => d.factId === "participant.state"),
    `-> ${descriptorsMatching(caption).map((d) => d.factId).join(",")}`);
}

// C. "crime" in the charge vocabulary, narrowly.
console.log("  C — a crime is a charge value; a crime victim is a person");
for (const caption of ["CRIME", "Crime(s) defendant asks the court to erase", "Name of Crime", "crimes"]) {
  check(`"${caption}" describes a charge value`, captionDescribesChargeValue(caption) === true);
}
for (const caption of ["Crime Victim", "Crime Victims Services", "Victim of Crime", "Crime Victim Name"]) {
  check(`"${caption}" does not describe a charge value`, captionDescribesChargeValue(caption) === false);
}
check("a caption naming a victim AND an offence still describes a charge value",
  captionDescribesChargeValue("Crime Victim Name / Offense") === true);
check("a caption that asks for a name still asks for one, however much it says about the crime",
  captionDescribesChargeValue("Name of Defendant charged with the crime") === false);
check("the crime narrowing is exported and separately callable",
  CRIME_WORD_THAT_NAMES_A_PERSON instanceof RegExp
  && CHARGE_VALUE_WORDS.test("crime") && CHARGE_VALUE_WORDS.test("charges"));

// D. A blank whose own name says it holds a date.
console.log("  D — a date-named blank takes only a date from its label");
const AR_DRUG_COURT = "4.On __________the Defendant successfully completed the drug";
for (const [what, name, label] of [
  ["AR community-punishment DATE 01", "DATE 01", AR_DRUG_COURT],
  ["AR order Date Completed", "Date Completed", AR_DRUG_COURT],
  ["AL C-94A Date_3 over a county clause", "Date_3", "in __________________________ County, Alabama on____________"],
  ["AR felony Date_2 under a signature line", "Date_2", "Defendant or Defendants Attorney"]
]) {
  const decision = decideBinding({ name, pdfType: "text", effectiveLabel: label });
  check(`${what} takes no non-date fact from its label`,
    decision.writable !== true || decision.valueType === "date",
    `-> ${decision.factId ?? decision.reason}`);
  check(`${what} takes no participant name from its label`,
    !(decision.writable === true && NAME_FACTS.has(decision.factId)),
    `-> ${decision.factId ?? decision.reason}`);
}
// Controls. A date-named blank whose own NAME names a date still binds it, and a
// blank whose name is not a date is untouched.
check("a date of birth still binds through its own name",
  decideBinding({ name: "Date of Birth", pdfType: "text", effectiveLabel: "(Email) (Phone) (Date of Birth))" }).factId
  === "participant.date_of_birth");
check("a date of birth still binds through its printed label",
  decideBinding({ name: "Text Field 7", pdfType: "text", effectiveLabel: "DATE OF BIRTH" }).factId
  === "participant.date_of_birth");
check("the date-name predicate reaches the spellings this corpus uses",
  ["Date", "DATE", "FULL DATE", "Date_2", "DATED this", "DATE 01", "Date Completed"].every(fieldNameDeclaresADate));
check("the date-name predicate does not reach a name that merely contains the letters",
  ["Birthday", "DayPhone", "Update", "Mandate"].every((n) => !fieldNameDeclaresADate(n)));

// ---- 2. the ORDER: protections before precision ------------------------------
//
// The claim is that narrowing the caption harvest could not open anything,
// because the protections landed first. It is checked by constructing the state
// that "precision first" would have produced -- the binder as it stood at the
// base commit, run against the cell-accurate captions that are harvested now --
// and naming the blanks that state leaves unguarded.
console.log("\n  the order of work");
const stage = fs.mkdtempSync(path.join(os.tmpdir(), "shared-caption-verify-"));
const basePath = path.join(stage, "semantics-base.mjs");
fs.writeFileSync(basePath, execFileSync("git", ["show", `${BASE_SHA}:${SEMANTICS}`], { cwd: rootDir, maxBuffer: 1 << 24 }));
const baseModule = await import(pathToFileURL(basePath).href);
fs.rmSync(stage, { recursive: true, force: true });

// The four blanks the CT and MI families recorded as protected only by accident:
// their captions were run-ons reaching across a printed table row, and the run-on
// happened to contain "Signature", "Judge" or "JUDGE".
const CELL_ACCURATE_CAPTIONS = [
  ["CT JD-CR-202 defendant's signature date", "DATESIGN", "Date"],
  ["CT JD-CR-202 notary's signature date", "DATESIGN", "Date"],
  ["CT JD-CR-202 the court's judgment date", "DATEJUDGMNT", "On (Date)"],
  ["CT JD-CR-202 the court's judgment town", "TOWNJUDGMNT", "By the Court (Name of Judge)"],
  ["MI MC 227a's judicial district", "district", "STATE OF MICHIGAN"],
  ["MI MC 227a's court address", "ctaddress", "Court address"],
  ["MI MC 227a's court telephone", "cttelno", "Court telephone no"]
];
const unguardedIfPrecisionHadLanded = CELL_ACCURATE_CAPTIONS.filter(([, name, label]) => {
  const d = baseModule.decideBinding({ name, pdfType: "text", effectiveLabel: label });
  return d.writable === true || (baseModule.protectCategoryOf(label) ?? baseModule.protectCategoryOf(name)) === null;
});
check("making the harvest precise FIRST would have left blanks unguarded, so the order is not cosmetic",
  unguardedIfPrecisionHadLanded.length > 0,
  `${unguardedIfPrecisionHadLanded.length} of ${CELL_ACCURATE_CAPTIONS.length}`);
for (const [what, name, label] of CELL_ACCURATE_CAPTIONS) {
  const decision = decideBinding({ name, pdfType: "text", effectiveLabel: label });
  check(`${what} is refused under the cell-accurate caption`, decision.writable === false,
    `${JSON.stringify(label)} -> ${decision.factId ?? decision.reason}`);
}
for (const [what, name, label] of unguardedIfPrecisionHadLanded) {
  check(`${what} is refused on its own account, not by its old run-on caption`,
    (protectCategoryOf(label) ?? protectCategoryOf(name)) !== null || descriptorsMatching(label).length === 0,
    `${JSON.stringify(label)}`);
}

// ---- 3. the blast radius -----------------------------------------------------
console.log("\n  the blast radius");
function censusFiles() {
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(rootDir, dir), { withFileTypes: true })) {
      const rel = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (CENSUS_FILENAMES.includes(entry.name)) found.push({ familyDirectory: dir, file: rel });
    }
  };
  walk(OVERLAY_ROOT);
  return found.sort((a, b) => a.file.localeCompare(b.file));
}
const CENSUSES = censusFiles();
const readJson = (rel) => {
  try { return JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8")); } catch { return null; }
};
const censusAt = (sha, file) => {
  try { return JSON.parse(execFileSync("git", ["show", `${sha}:${file}`], { cwd: rootDir, maxBuffer: 1 << 26 }).toString("utf8")); }
  catch { return null; }
};
const blanksOf = (census) => (Array.isArray(census?.documents)
  ? census.documents.flatMap((doc) => (doc.fields ?? []).map((field) => ({
      field, documentId: doc.documentId ?? null, captionOnly: doc.captionOnly === true })))
  : (census?.fields ?? []).map((field) => ({ field, documentId: null, captionOnly: false })));

function project(mod, censusSource) {
  const rows = new Map();
  for (const { familyDirectory, file } of CENSUSES) {
    const census = censusSource === "worktree" ? readJson(file) : censusAt(censusSource, file);
    if (!census) continue;
    for (const { field, documentId, captionOnly } of blanksOf(census)) {
      const subject = field.effectiveLabel ?? field.name;
      const decision = mod.decideBinding({
        name: field.name, pdfType: field.type, effectiveLabel: field.effectiveLabel ?? null,
        regionHeading: field.regionHeading ?? null, regionIsDocumentTitle: field.regionIsDocumentTitle === true
      }, { captionOnly });
      rows.set(`${familyDirectory}|${documentId ?? "-"}|${field.name}`, {
        fieldName: field.name,
        effectiveLabel: field.effectiveLabel ?? null,
        labelBasis: field.labelBasis ?? null,
        subjectFirstDescriptor: mod.descriptorsMatching(subject)[0]?.factId ?? null,
        byNameDescriptors: mod.descriptorsMatching(field.name).map((d) => d.factId),
        byLabelDescriptors: field.effectiveLabel ? mod.descriptorsMatching(field.effectiveLabel).map((d) => d.factId) : [],
        protectCategory: mod.protectCategoryOf(subject) ?? mod.protectCategoryOf(field.name) ?? null,
        bindingWritable: decision.writable === true,
        bindingFactId: decision.factId ?? null,
        bindingReason: decision.reason ?? null,
        bindingCategory: decision.category ?? null
      });
    }
  }
  return rows;
}

const atBase = project(baseModule, BASE_SHA);
const semanticsOnly = project(semantics, BASE_SHA);
const endToEnd = project(semantics, "worktree");
const comparable = (r) => JSON.stringify(r);
const movedKeys = (before, after) => [...before.keys()]
  .filter((k) => comparable(before.get(k)) !== comparable(after.get(k))).sort();

const record = readJson(RECORD);
check("the committed record exists and names both projections",
  Array.isArray(record?.semanticsOnly?.changed) && Array.isArray(record?.endToEnd?.changed), RECORD);

for (const [label, after, side] of [
  ["semantics only", semanticsOnly, record?.semanticsOnly],
  ["end to end", endToEnd, record?.endToEnd]
]) {
  const moved = movedKeys(atBase, after);
  const expected = [...(side?.everyKey ?? [])].sort();
  check(`${label}: no field outside the recorded set moves`,
    moved.filter((k) => !expected.includes(k)).length === 0,
    moved.filter((k) => !expected.includes(k)).slice(0, 6).join("; "));
  check(`${label}: every field in the recorded set actually moves`,
    expected.filter((k) => !moved.includes(k)).length === 0,
    expected.filter((k) => !moved.includes(k)).slice(0, 6).join("; "));
  check(`${label}: every changed field is explained by a stated defect`,
    (side?.fieldsUnexplained ?? -1) === 0
    && (side?.changed ?? []).every((c) => c.changeClass !== "unexplained" && c.defect && c.why),
    `${side?.fieldsUnexplained} unexplained`);
}
check("the record scanned every committed census, including the census-v1 families",
  record?.censusesScanned === CENSUSES.length
  && record?.totalFieldsScanned === atBase.size
  && (record?.censusFiles ?? []).some((f) => f.endsWith("field-census.census-v1.json")),
  `${record?.censusesScanned} of ${CENSUSES.length} censuses, ${record?.totalFieldsScanned} of ${atBase.size} fields`);

// ---- 4. protection -----------------------------------------------------------
console.log("\n  protection");
const baseCategories = baseModule.PROTECT_RULES.map(([c]) => c);
const nowCategories = PROTECT_RULES.map(([c]) => c);
check("no protect category is removed",
  baseCategories.every((c) => nowCategories.includes(c)),
  baseCategories.filter((c) => !nowCategories.includes(c)).join(", "));
check("court_contact is a protect category that did not exist before",
  nowCategories.includes("court_contact") && !baseCategories.includes("court_contact"));

const weakened = [];
for (const [category, pattern] of baseModule.PROTECT_RULES) {
  const now = PROTECT_RULES.find(([c]) => c === category);
  if (!now) { weakened.push(`${category} (missing)`); continue; }
  const lost = pattern.source.split("|").filter((t) => !now[1].source.includes(t));
  if (lost.length) weakened.push(`${category} lost ${lost.join(", ")}`);
}
check("no protect rule is weakened", weakened.length === 0, weakened.join("; "));

const baseRegion = baseModule.REGION_HEADING_RULES.map(([c]) => c);
const nowRegion = REGION_HEADING_RULES.map(([c]) => c);
check("no region-heading category is removed",
  baseRegion.every((c) => nowRegion.includes(c)),
  baseRegion.filter((c) => !nowRegion.includes(c)).join(", "));

for (const [label, after] of [["semantics only", semanticsOnly], ["end to end", endToEnd]]) {
  const nowWritable = [...atBase.keys()].filter((k) =>
    atBase.get(k).bindingWritable === false && after.get(k)?.bindingWritable === true);
  check(`${label}: no refused field becomes writable`, nowWritable.length === 0, nowWritable.slice(0, 6).join("; "));
  const lostProtection = [...atBase.keys()].filter((k) =>
    atBase.get(k).protectCategory !== null && after.get(k)?.bindingWritable === true);
  check(`${label}: nothing protected at the base commit is writable now`,
    lostProtection.length === 0, lostProtection.slice(0, 6).join("; "));
}

// ---- 5. the invariants, recomputed ------------------------------------------
console.log("\n  the invariants");
const chargeBlankTakingAName = (rows) => [...rows.values()].filter((r) => r.bindingWritable
  && NAME_FACTS.has(r.bindingFactId ?? "")
  && [r.fieldName, r.effectiveLabel].filter(Boolean)
    .some((t) => CHARGE_VALUE_WORDS.test(String(t).replace(CRIME_WORD_THAT_NAMES_A_PERSON, " "))));
const dateNamedBlankTakingAName = (rows) => [...rows.values()].filter((r) => r.bindingWritable
  && fieldNameDeclaresADate(r.fieldName) && NAME_FACTS.has(r.bindingFactId ?? ""));
const courtContactWritable = (rows) => [...rows.values()].filter((r) => r.bindingWritable
  && (protectCategoryOf(r.effectiveLabel ?? r.fieldName) === "court_contact"
    || protectCategoryOf(r.fieldName) === "court_contact"));

check("the correction had something to correct",
  chargeBlankTakingAName(atBase).length > 0 && dateNamedBlankTakingAName(atBase).length > 0
  && courtContactWritable(atBase).length > 0,
  `${chargeBlankTakingAName(atBase).length} charge, ${dateNamedBlankTakingAName(atBase).length} date, `
  + `${courtContactWritable(atBase).length} court-contact`);
for (const [label, after] of [["semantics only", semanticsOnly], ["end to end", endToEnd]]) {
  check(`${label}: no charge, offence, crime, count, statute or violation blank carries a participant name`,
    chargeBlankTakingAName(after).length === 0,
    chargeBlankTakingAName(after).map((r) => r.fieldName).slice(0, 6).join("; "));
  check(`${label}: no blank whose own name says it holds a date carries a participant name`,
    dateNamedBlankTakingAName(after).length === 0,
    dateNamedBlankTakingAName(after).map((r) => r.fieldName).slice(0, 6).join("; "));
  check(`${label}: no court-contact blank is writable`,
    courtContactWritable(after).length === 0,
    courtContactWritable(after).map((r) => r.fieldName).slice(0, 6).join("; "));
}

// ---- 6. the mounted-corpus walks --------------------------------------------
//
// Both of these hash every PDF under the repository root to answer "is this
// binary in the clone". `private/` is where bootstrap-private-corpus.sh mounts
// the Master Library, so a walk that descends into it answers a different
// question in a container that has run the bootstrap from the one it answers in
// a fresh clone -- and the committed derivation record proves it did: 22 of its
// 24 rows cite a sourceBinaryPath under private/source-imports/.
//
// This is asserted against the walk's own skip set, read out of the source,
// because the walks are not exported and both scripts do their work on import.
console.log("\n  the mounted-corpus walks");
for (const [file, fn] of MOUNTED_CORPUS_WALKS) {
  const source = fs.readFileSync(path.join(rootDir, file), "utf8");
  const body = source.slice(source.indexOf(`function ${fn}(`));
  const skipLine = /const skip = new Set\(\[([^\]]*)\]\)/.exec(body);
  const entries = (skipLine?.[1] ?? "").split(",").map((t) => t.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
  check(`${file}: ${fn} names a skip set`, entries.length > 0, skipLine?.[0] ?? "(not found)");
  check(`${file}: ${fn} does not descend into private/`, entries.includes("private"), entries.join(", "));
  check(`${file}: ${fn} still skips the trees it always skipped`,
    ["node_modules", ".git"].every((d) => entries.includes(d)), entries.join(", "));
}
// private/ is git-ignored, which is the fact that makes it the wrong tree to
// walk: nothing under it is repository content in any clone.
const privateIsIgnored = (() => {
  try { execFileSync("git", ["check-ignore", "-q", "private"], { cwd: rootDir }); return true; }
  catch { return false; }
})();
check("private/ is git-ignored, so a walk that reads it is reading something the repository does not carry",
  privateIsIgnored);

// The flat-overlay path must pass the printed region it used to drop.
const finalizeSource = fs.readFileSync(path.join(rootDir, FINALIZE), "utf8");
const flatOverlay = finalizeSource.slice(finalizeSource.indexOf("export async function finalizeFlatOverlay"));
check("finalizeFlatOverlay passes the printed region to decideBinding",
  /regionHeading:\s*region\.heading/.test(flatOverlay) && /regionIsDocumentTitle:\s*region\.isDocumentTitle/.test(flatOverlay));
check("finalizeFlatOverlay measures the region itself when a caller supplies none",
  /captureWidgetContext\(/.test(flatOverlay));

// ---- the two page-measuring paths, measured from a real page ----------------
//
// The assertions above read source text, which is the right shape for a skip
// set and the wrong shape for a measurement. These two build a page, put the
// defect's own geometry on it, and read the answer back -- so a rule that is
// present in the file but no longer reached is caught.
console.log("\n  measured from a page");
const { extractTextItems, groupIntoLines, captureWidgetContext } =
  await import(pathToFileURL(path.resolve(rootDir, CAPTURE)).href);
const { finalizeFlatOverlay } = await import(pathToFileURL(path.resolve(rootDir, FINALIZE)).href);

/** A page carrying one multi-cell caption row, which is the shape of the defect. */
async function captionRowPage() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText("PETITION FOR ERASURE", { x: 200, y: 750, size: 12, font });
  // The row CT JD-CR-202 prints, at the spacing it prints it.
  page.drawText("Name of defendant", { x: 40, y: 700, size: 9, font });
  page.drawText("E-mail address", { x: 220, y: 700, size: 9, font });
  page.drawText("Phone number", { x: 380, y: 700, size: 9, font });
  const loaded = await PDFDocument.load(await doc.save());
  return loaded.getPages()[0];
}

const rowPage = await captionRowPage();
const rowLines = groupIntoLines(extractTextItems(rowPage));
const captionRow = rowLines.find((l) => l.text.includes("Name of defendant"));
check("the page really does print the caption row as ONE line, so the harvest has something to get wrong",
  captionRow?.text === "Name of defendantE-mail addressPhone number" && captionRow?.runs.length === 3,
  `${JSON.stringify(captionRow?.text)} in ${captionRow?.runs.length} run(s)`);
for (const [name, x, width, expected] of [
  ["the name box", 40, 150, "Name of defendant"],
  ["the e-mail box", 220, 140, "E-mail address"],
  ["the phone box", 380, 120, "Phone number"]
]) {
  const [context] = captureWidgetContext(rowPage, [{ name, rect: { x, y: 688, width, height: 10 } }],
    { precomputedLines: rowLines, isFirstPage: true });
  check(`${name} under that row harvests its own cell`, context.effectiveLabel === expected,
    `-> ${JSON.stringify(context.effectiveLabel)}`);
  check(`${name} reports the cell basis`, context.labelBasis === "printed_directly_above_in_the_same_cell",
    `-> ${context.labelBasis}`);
}

/** A page with a printed certificate-of-service block below its own title. */
async function serviceBlockPage() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText("PETITION TO SEAL", { x: 200, y: 750, size: 12, font });
  page.drawText("Printed Name", { x: 60, y: 700, size: 9, font });
  page.drawText("CERTIFICATE OF SERVICE", { x: 60, y: 400, size: 11, font });
  page.drawText("Printed Name", { x: 60, y: 300, size: 9, font });
  return doc.save();
}
const serviceBytes = await serviceBlockPage();
const flat = await finalizeFlatOverlay({
  sourceBytes: serviceBytes,
  anchors: [
    { page: 1, label: "Printed Name", factId: "participant.full_legal_name",
      writeBox: { x: 140, y: 698, width: 200, height: 12 }, fontSize: 9 },
    { page: 1, label: "Printed Name", factId: "participant.full_legal_name",
      writeBox: { x: 140, y: 298, width: 200, height: 12 }, fontSize: 9 }
  ],
  facts: { "participant.full_legal_name": "Jordan Avery Reyes" }
});
check("the flat path writes a caption name that sits in no protected region",
  flat.report.written.length === 1, JSON.stringify(flat.report.written));
check("the flat path refuses the same caption under a printed CERTIFICATE OF SERVICE",
  flat.report.refused.some((r) => r.reason === "protected_page_region" && r.category === "service_block"),
  JSON.stringify(flat.report.refused));

// The caption harvest must take a cell, not a row.
const captureSource = fs.readFileSync(path.join(rootDir, CAPTURE), "utf8");
check("the directly-above branch harvests a cell rather than the whole line",
  /const text = cellTextAbove\(line, rect\);/.test(captureSource)
  && !/basis: "printed_directly_above_in_the_same_column"/.test(captureSource));

console.log("");
if (failures.length) {
  console.error(`shared caption infrastructure: ${failures.length} problem(s).`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`shared caption infrastructure: ${CENSUSES.length} censuses, ${atBase.size} fields, `
  + `${record.semanticsOnly.fieldsChanged} moved by the binder and ${record.endToEnd.fieldsChanged} end to end, `
  + `all recorded; ${chargeBlankTakingAName(atBase).length} -> 0 charge blanks taking a name, `
  + `${dateNamedBlankTakingAName(atBase).length} -> 0 date blanks taking a name, `
  + `${courtContactWritable(atBase).length} -> 0 court-contact blanks writable.`);
