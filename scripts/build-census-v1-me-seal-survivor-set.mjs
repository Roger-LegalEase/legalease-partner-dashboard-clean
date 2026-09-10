#!/usr/bin/env node
/**
 * Route-obligation census v1 — packet family `me-seal-survivor-set`.
 *
 *   node scripts/build-census-v1-me-seal-survivor-set.mjs [--check]
 *
 * Maine, sealing a conviction that arose from sex trafficking or sexual
 * exploitation. Route
 * `obligation:track-pathway:ME:me-seal-survivor:sex-trafficking-sexual-exploitation-survivor-sealing`,
 * 15 M.R.S. § 2262-B and § 2264(7) as amended by PL 2025, c. 513. Two declared
 * components, two held binaries:
 *
 *   primary-filing-1   CR-307 Rev. 06/26, Motion to Seal Conviction for Victims
 *                      of Sex Trafficking or Sexual Exploitation. One page,
 *                      fifteen AcroForm fields.
 *   proposed-order-2   CR-308 Rev. 06/26, Order on Motion to Seal Criminal
 *                      History. Two pages, fifteen AcroForm fields.
 *
 * TWO GATES ARE OPEN ON THIS ROUTE AND NEITHER IS THIS LANE'S TO CLOSE
 *
 * src/lib/legal-authority/routes/national-report-batch-b.json carries ruleId
 * `ME-2264-7-CR-308-FORM-CONFLICT` and two pending gates of kind
 * `source_acquisition`, owned by RCAP source acquisition:
 *
 *   me_2264_7_cr308_warning_conflict — "a corrected CR-308, or the court's
 *     confirmation that the printed warning box no longer states the law", and
 *     "what the court actually does when a survivor is later convicted of a new
 *     crime". Its note: "Form CR-308 page 2 warns that a later conviction
 *     anywhere extinguishes the order. That is inconsistent with § 2264(7) as
 *     amended by PL 2025, c. 513. The legal answer is settled — the statute
 *     governs — and the product still cannot hand a participant an official
 *     form whose own printed warning contradicts the relief being sought
 *     without knowing what the court does in practice."
 *
 *   me_2264_7_prosecutor_notice_method — whether the movant serves the
 *     prosecutorial office or the court performs all notice, and by what method.
 *
 * THE CR-308 RECOVERED ON 2026-09-04 IS NOT THE CORRECTED ONE. That gate's
 * first item asks for a corrected CR-308. The binary this family binds was
 * recovered into custody on 2026-09-04 and re-hashed here, and its page 2 still
 * prints, verbatim:
 *
 *   "WARNING: If at any time after the date of this order the Defendant is
 *    convicted of a new crime in Maine or in any other jurisdiction, the new
 *    conviction extinguishes this order."
 *
 * That is the warning the gate names. The assertion is re-read from the bound
 * bytes on every run and recorded in build-findings.json and in the approval
 * request, and the packet is marked as not deliverable to a participant until
 * the gate closes. Nothing here closes it.
 *
 * SO WHY BUILD AT ALL. A packet built here is a review artifact:
 * `generationAllowed` false, `runtimeSelectable` false,
 * `commercialRoutesOpened` 0. The factory's settled practice is to build review
 * artifacts from release-gated sources and record the gate — the Alaska,
 * Alabama and Arkansas families bind assets the Master Library marks
 * `generation_allowed: no` and do exactly this. A rendered CR-308 is also the
 * evidence the warning gate is asking to be decided on.
 *
 * THE SOURCES ARE ENCRYPTED AGAINST MODIFICATION, AND THE BRIDGE IS PRECEDENTED
 *
 * Both binaries are AES-256 (R6/V5) with an empty user password and
 * `modify_other` false. pdf-lib implements no decryption and cannot open
 * either; the committed corpus index records CR-308 as `unreadable` with the
 * load error it raised. The Master Library's own asset manifest says of CR-307:
 * "the PDF is AES-256 encrypted against modification. Runtime mapping requires
 * an approved alternate handling strategy and completed-output review."
 *
 * The alternate handling strategy used here is the one already committed in
 * scripts/build-census-v1-ca-1203-4-set.mjs for the encrypted California
 * Judicial Council forms: `pikepdf.open(exact_source).save(derived,
 * deterministic_id=True)`. The exact source is never modified — it is hashed
 * before and after — and the derivative is proved equivalent to it on page
 * count, page geometry, the terminal field tree and every widget rectangle
 * before a single value is written. Both digests are recorded. Whether that
 * strategy is APPROVED for Maine is a reviewer's call, and the approval request
 * names it.
 *
 * CR-307'S FIELD NAMES ARE SHIFTED BY ONE AND CR-308'S ARE NOT
 *
 * This is the finding that shaped the build, and it was measured by comparing
 * every widget rectangle against the printed word boxes on the same page:
 *
 *   CR-307 widget            printed label it actually sits against
 *   -----------------------  --------------------------------------
 *   Defendants DOB mmddyyyy  Defendant           (the name box)
 *   Location Town            County:
 *   undefined                Location (Town):
 *   MOTION TO SEAL ...FOR    Defendant's DOB (mm/dd/yyyy):
 *
 * Each field carries the text of the label ABOVE it rather than its own. Left
 * to the shared semantics' name channel the consequence is specific and
 * serious: `Defendants DOB mmddyyyy` binds participant.date_of_birth, writable,
 * and that widget is the caption's DEFENDANT NAME box — so the motion would go
 * to the clerk with the survivor's date of birth printed where the court reads
 * their name. Measured: decideBinding on that name returns
 * participant.date_of_birth even when the corrected printed label is supplied,
 * because the name channel is consulted first and wins.
 *
 * So CR-307 is not bound through the name channel. Every one of its writes is
 * bound to the printed label the widget was MEASURED to sit against, and the
 * protect rules are applied to that measured label — the label that is really
 * this field's — rather than to a name that provably belongs to its neighbour.
 * The correspondence is recorded field by field in field-census.census-v1.json
 * so a reviewer can check the geometry rather than take it on trust.
 *
 * CR-308's names are correct on the same measurement, and it is bound normally.
 *
 * THREE MORE DECISIONS
 *
 * First, CR-308 IS THE COURT'S ORDER AND IS FILLED TO ITS CAPTION ONLY. Its
 * body is three GRANTED/DENIED election boxes, the prosecutor's name, two
 * hearing dates, a findings-of-fact box and the judge's signature. All of it is
 * the court's.
 *
 * Second, ITEM 1'S CRIME LIST IS A LEGAL CHARACTERISATION AND IS NOT WRITTEN.
 * The box is printed under "This/these crime(s) are eligible for sealing under
 * 15 M.R.S.A. § 2261(6)(C) and § 2262-B". Listing crimes there asserts they are
 * eligible under two named sections. That is a legal conclusion, it is sworn,
 * and the platform does not draw it. The conviction date on the same item is a
 * held matter fact and IS written.
 *
 * Third, ITEM 2 HAS NO WIDGET AND IS THE HEART OF THE MOTION. CR-307 prints,
 * with no box behind it, "Defendant has been a victim of sex trafficking or
 * sexual exploitation and the commission of the crime(s) ... was a substantial
 * result of sex trafficking or sexual exploitation." Signing the motion asserts
 * it. There is nothing to fill and nothing this build could write, and the
 * participant instructions say plainly what signing asserts. The platform holds
 * no fact about whether anyone is a trafficking survivor, must not, and does
 * not ask.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { preserveSourceMetadata, carryDates }
  from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { sanitizeAndFlatten, scanBytesForActiveContent }
  from "./rcap-official-forms/rcap-active-content.mjs";
import { fitTextToWidget } from "./rcap-official-forms/rcap-text-fitting.mjs";
import { extractTextItems } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { protectCategoryOf } from "./rcap-official-forms/rcap-field-semantics.mjs";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const FAMILY_ID = "me-seal-survivor-set";
const ROUTE_KEY = "obligation:track-pathway:ME:me-seal-survivor:sex-trafficking-sexual-exploitation-survivor-sealing";
const ROUTE_SELECTION_ID = "me-cr-307-cr-308-survivor-sealing";
const OUT = "data/rcap-all50/overlays/census-v1/me/me-seal-survivor-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-me-seal-survivor-set.mjs";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const ROUTE_CONTRACT = "src/lib/legal-authority/routes/national-report-batch-b.json";
/*
 * FIX01, SELF_HELP_STOP and REQUIRED_BEFORE_FILING. THE TWO CONTROLLING
 * RECORDS THE PARTICIPANT COPY IS GENERATED FROM.
 *
 * VF01 measured, at 7d6453f51, that none of the track record's seven
 * selfHelpStopConditions reached participant copy verbatim and only one reached
 * it in substance; that neither scopeRestriction, the State Bureau of
 * Identification dissemination instruction and the durability rule were present
 * at all; and that most of the packet-set manifest's participant-action list
 * was absent -- the words certified, docket record, documentation, affidavit,
 * presumption, courtroom, advocate, legal aid, victim services, referral, assess
 * and immigration appeared nowhere in either guide.
 *
 * The repair is not to write that copy by hand. Both records are read here, hashed,
 * and the guide's boundary and participant-action sections are GENERATED from
 * them, so the copy cannot drift from the record and the digest in
 * build-findings.json says which bytes it was generated from. Every stop
 * condition, scope restriction and required-before-filing string is carried
 * VERBATIM; nothing is paraphrased, summarised or dropped.
 */
const TRACK_REGISTRY = "data/record-clearing/legal-design-track-registry.json";
const PACKET_SET_MANIFESTS = "data/record-clearing/legal-design-packet-set-manifests.json";
const TRACK_ID = "me-seal-survivor";

const SOURCES = Object.freeze([
  {
    key: "CR-307", formNumber: "CR-307", revision: "Rev. 06/26", role: "participant_filing",
    title: "Motion to Seal Conviction for Victims of Sex Trafficking or Sexual Exploitation",
    instrumentKind: "primary_filing", component: "component:me-seal-survivor-primary-filing-1",
    sourceId: "official-form:CR-307",
    path: "STATES/ME/05_SOURCE_GATED/ME__SOURCE-GATED__CR-307__motion-to-seal-conviction-for-victims-of-sex-trafficking-or-sexual-exploitation__REV-2026-06__EN.pdf",
    sha256: "c72e74f191a1bddb48453e3094e8a657baabf552299f353acd8bf0d8a418fed1",
    assetClassInTheMasterLibrary: "source_gated"
  },
  {
    key: "CR-308", formNumber: "CR-308", revision: "Rev. 06/26", role: "court_order",
    title: "Order on Motion to Seal Criminal History for Victims of Sex Trafficking or Sexual Exploitation",
    instrumentKind: "proposed_order", component: "component:me-seal-survivor-proposed-order-2",
    sourceId: "official-form:CR-308",
    path: "LegalEase Maine/source-acquisition-2026-09-04/MJB-Form-cr-308.pdf",
    sha256: "b2e78f24cb33d52c692d20b5bff3f0ab58115da9f26363df99cf2970f0a645f5",
    assetClassInTheMasterLibrary: null
  }
]);

/* The printed sentence the open gate is about. Re-read from CR-308 each run. */
const CR308_WARNING = "the new conviction extinguishes this order";

const CANONICAL = {
  "participant.full_legal_name": "Jordan Avery Reyes",
  "participant.date_of_birth": "1991-04-17",
  "participant.street_address": "118 Maple Street",
  "participant.city_state_zip": "Portland, ME 04101",
  "matter.county": "Cumberland",
  "matter.case_number": "CUMCD-CR-2019-01234",
};

const BOUNDARY = {
  ...CANONICAL,
  "participant.full_legal_name": "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran",
  "participant.street_address": "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B",
  "participant.city_state_zip": "Unincorporated Township of Long Hollow Crossing, ME 04101-9999",
  "matter.county": "Sagadahoc",
  "matter.case_number": "0123-45-2026-CR-900123.00-AB-CDE/2201"
};

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const sha256File = (file) => sha256(fs.readFileSync(file));
const round = (n) => Number(Number(n).toFixed(2));
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const absFor = (rel) => path.join(ROOT, rel);
const writeJson = (rel, value) => {
  fs.mkdirSync(path.dirname(absFor(rel)), { recursive: true });
  fs.writeFileSync(absFor(rel), `${JSON.stringify(value, null, 2)}\n`);
};
function fail(message, detail = null) {
  throw new Error(detail === null ? message : `${message}: ${detail}`);
}

// ---------------------------------------------------------------------------
// the pikepdf bridge
// ---------------------------------------------------------------------------
/*
 * The exact source is opened read-only, hashed before and after, and saved to a
 * derivative with a deterministic trailer /ID so two runs of the same pinned
 * bytes produce the same derivative. The bridge also returns, per form, every
 * widget rectangle and every printed word box, so the JS side can decide which
 * printed label each widget actually sits against rather than trusting the
 * field's name.
 */
const PIKEPDF_BRIDGE = String.raw`
import hashlib, json, os, subprocess, sys, re, html
import pikepdf

req = json.loads(sys.argv[1])

def sha256_file(fn):
    h = hashlib.sha256()
    with open(fn, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()

def describe(fn):
    with pikepdf.open(fn) as pdf:
        pages = []
        pageref = {}
        for i, pg in enumerate(pdf.pages):
            mb = [float(x) for x in pg.obj.get("/MediaBox", [0, 0, 612, 792])]
            pages.append({"page": i + 1, "width": round(mb[2] - mb[0], 2), "height": round(mb[3] - mb[1], 2)})
            pageref[pg.obj.objgen] = i + 1
        fields = []
        af = pdf.Root.get("/AcroForm")
        for fl in (af.get("/Fields", []) if af is not None else []):
            widgets = []
            def add(node):
                r = node.get("/Rect")
                p = node.get("/P")
                if r is None:
                    return
                rect = [round(float(x), 2) for x in r]
                widgets.append({
                    "page": pageref.get(p.objgen) if p is not None else None,
                    "rect": {"x": min(rect[0], rect[2]), "y": min(rect[1], rect[3]),
                             "width": round(abs(rect[2] - rect[0]), 2), "height": round(abs(rect[3] - rect[1]), 2)},
                })
            kids = fl.get("/Kids")
            if kids is not None:
                for kd in kids:
                    add(kd)
            else:
                add(fl)
            ft = str(fl.get("/FT"))
            ap = fl.get("/AP")
            states = None
            if ft == "/Btn" and ap is not None and "/N" in ap:
                try:
                    states = sorted(str(s) for s in ap.N.keys())
                except Exception:
                    states = None
            v = fl.get("/V")
            malformed_appearance = None
            ap_node = fl.get("/AP")
            if ap_node is not None and "/N" in ap_node:
                n = ap_node.N
                streams = []
                try:
                    if "/BBox" in n:
                        streams = [("N", n)]
                    else:
                        streams = [("N" + str(k), n[k]) for k in n.keys()]
                except Exception:
                    streams = []
                bad = [tag for tag, st in streams if st.get("/Subtype") is None]
                if bad:
                    malformed_appearance = {
                        "appearanceStreamsWithoutSubtype": bad,
                        "keysPresent": sorted(str(k) for k in (streams[0][1].keys() if streams else [])),
                    }
            fields.append({
                "malformedAppearance": malformed_appearance,
                "name": str(fl.get("/T")),
                "type": {"/Tx": "text", "/Btn": "button", "/Ch": "choice"}.get(ft, ft),
                "widgets": widgets,
                "onStates": states,
                "shippedValue": None if v is None else str(v),
            })
        return {"pageCount": len(pdf.pages), "pageGeometry": pages, "fields": fields,
                "encrypted": pdf.is_encrypted}

def printed_words(fn):
    out = subprocess.run(["pdftotext", "-bbox", fn, "-"], capture_output=True, text=True)
    if out.returncode != 0:
        return []
    pages = re.findall(r'<page width="([\d.]+)" height="([\d.]+)">(.*?)</page>', out.stdout, re.S)
    words = []
    for pi, (pw, ph, body) in enumerate(pages):
        ph = float(ph)
        for x0, y0, x1, y1, w in re.findall(
                r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>', body):
            words.append({"page": pi + 1, "x0": round(float(x0), 2), "x1": round(float(x1), 2),
                          "yTop": round(ph - float(y0), 2), "yBottom": round(ph - float(y1), 2),
                          "text": html.unescape(w)})
    return words

result = {"forms": {}, "derivatives": []}
for target in req["targets"]:
    form = target["formNumber"]
    src = target["sourcePath"]
    before = sha256_file(src)
    if before != target["sha256"]:
        raise RuntimeError(form + ": pinned source mismatch before pikepdf read")
    official = describe(src)
    result["forms"][form] = {"official": official, "printedWords": printed_words(src)}

    derived = target["derivedPath"]
    os.makedirs(os.path.dirname(derived), exist_ok=True)
    with pikepdf.open(src) as pdf:
        # deterministic_id derives the trailer /ID from the file contents, so
        # two builds of the same pinned source agree on derivedSha256.
        pdf.save(derived, deterministic_id=True)
    derivative = describe(derived)
    after = sha256_file(src)

    same_geometry = official["pageGeometry"] == derivative["pageGeometry"]
    same_count = official["pageCount"] == derivative["pageCount"]
    off = {f["name"]: f for f in official["fields"]}
    der = {f["name"]: f for f in derivative["fields"]}
    only_official = sorted(set(off) - set(der))
    only_derivative = sorted(set(der) - set(off))
    differences = []
    for name in sorted(set(off) & set(der)):
        a, b = off[name], der[name]
        if a["type"] != b["type"] or a["widgets"] != b["widgets"] or a["onStates"] != b["onStates"]:
            differences.append(name)
    result["derivatives"].append({
        "formNumber": form,
        "sourceSha256Before": before, "sourceSha256After": after,
        "sourceUnchanged": before == after == target["sha256"],
        "derivedPath": derived, "derivedSha256": sha256_file(derived),
        "derivedByteLength": os.path.getsize(derived),
        "createdBy": "pikepdf.open(exact_source).save(derived_path, deterministic_id=True)",
        "openedWithEmptyUserPassword": True,
        "officialEncrypted": official["encrypted"], "derivedEncrypted": derivative["encrypted"],
        "equivalence": {
            "pageCountIdentical": same_count,
            "pageGeometryIdentical": same_geometry,
            "fieldsOnlyInOfficial": only_official,
            "fieldsOnlyInDerivative": only_derivative,
            "fieldsThatDiffer": differences,
            "terminalFieldTreeAndWidgetsIdentical": not only_official and not only_derivative and not differences,
            "equivalent": same_count and same_geometry and not only_official and not only_derivative and not differences,
        },
    })

print(json.dumps(result))
`;

function runBridge(targets) {
  const run = spawnSync("python3", ["-c", PIKEPDF_BRIDGE, JSON.stringify({ targets })],
    { encoding: "utf8", maxBuffer: 128 * 1024 * 1024 });
  if (run.status !== 0) {
    fail("the pikepdf bridge failed", `${run.stderr || run.error?.message || `exit ${run.status}`}`);
  }
  return JSON.parse(run.stdout);
}

// ---------------------------------------------------------------------------
// the printed runs around a widget — evidence, not inference
// ---------------------------------------------------------------------------
/*
 * WHY THIS PUBLISHES RUNS AND NOT A DERIVED LABEL.
 *
 * A first attempt derived each widget's label geometrically — nearest printed
 * run to the left on the same band, else the run beneath it. On these two forms
 * it reproduced the very off-by-one it was written to detect: for CR-307's
 * caption name box, whose own caption "Defendant" sits to its right, the rule
 * reached down and returned "Defendant's DOB (mm/dd/yyyy):", the caption of the
 * NEXT field. A heuristic that agrees with the defect is worse than none,
 * because it is published as evidence and a reviewer would rely on it.
 *
 * So nothing here derives a label. Each writable field's decision NAMES the
 * printed label this build asserts it sits against; this function publishes the
 * exact printed runs within a band around the widget, with their own
 * coordinates, and the build asserts that the named label is actually among
 * them. The correspondence is a stated claim backed by coordinates a reviewer
 * can check against the page, rather than a guess dressed as a measurement.
 */
function printedRunsNear(widget, words) {
  const near = words.filter((word) => word.page === widget.page
    && word.yTop <= widget.rect.y + widget.rect.height + 22
    && word.yTop >= widget.rect.y - 22
    && word.x1 >= widget.rect.x - 220
    && word.x0 <= widget.rect.x + widget.rect.width + 220);
  const bands = new Map();
  for (const word of near) {
    const key = Math.round(word.yTop);
    if (!bands.has(key)) bands.set(key, []);
    bands.get(key).push(word);
  }
  return [...bands.entries()]
    .map(([yTop, items]) => {
      const sorted = items.sort((a, b) => a.x0 - b.x0);
      return {
        yTop, x0: sorted[0].x0, x1: sorted.at(-1).x1,
        text: sorted.map((word) => word.text).join(" ")
      };
    })
    .sort((a, b) => b.yTop - a.yTop);
}

/** Whether the label this build names for a widget is actually printed near it. */
function labelIsPrintedNear(assertedLabel, runs) {
  const normalize = (value) => String(value ?? "").toLowerCase()
    .replace(/[‘’“”]/g, "'").replace(/[^a-z0-9']+/g, " ").trim();
  const wanted = normalize(assertedLabel);
  if (!wanted) return false;
  return runs.some((run) => normalize(run.text).includes(wanted));
}

// ---------------------------------------------------------------------------
// what each field is
// ---------------------------------------------------------------------------
const WRITE = (factId, effectiveLabel, assertedPrintedLabel) =>
  ({ writable: true, factId, effectiveLabel, assertedPrintedLabel: assertedPrintedLabel ?? effectiveLabel });
const SUPPLY = (effectiveLabel, what) => ({
  writable: false, approvedDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true,
  effectiveLabel, what
});
const PROTECT = (effectiveLabel, category, reason) => ({
  writable: false, approvedDisposition: "PROTECTED_FIELD", effectiveLabel, category, reason
});
const ELECTION = (effectiveLabel, why) => ({
  writable: false, approvedDisposition: "PARTICIPANT_ELECTION_GENUINE", effectiveLabel,
  category: "participant_sworn_narrative_or_legal_election", reason: why
});
const OFF_ROUTE = (effectiveLabel, condition) => ({
  writable: false, approvedDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE", effectiveLabel,
  routeConditionThatMakesItInapplicable: condition
});

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";

const COURT_BOX_ELECTION = (which) => ELECTION(
  `Court for filing — ${which}`,
  "CR-307 prints \"'X' the court for filing\" over three boxes: Superior Court, District Court and Unified "
    + "Criminal Docket. The motion is filed in the court that entered the conviction, which your own case "
    + "papers name, and this route reaches all three. Mark the one your conviction was entered in.");

const DECISIONS = Object.freeze({
  "CR-307": {
    "Superior Court": COURT_BOX_ELECTION("Superior Court"),
    "District Court": COURT_BOX_ELECTION("District Court"),
    "Unified Criminal Docket": COURT_BOX_ELECTION("Unified Criminal Docket"),
    // Measured: this widget sits against the printed "Defendant" caption.
    "Defendants DOB mmddyyyy": WRITE("participant.full_legal_name", "Defendant", "Defendant"),
    // Measured: this widget sits against the printed "County:" caption.
    "Location Town": WRITE("matter.county", "County", "County:"),
    // Measured: this widget sits against the printed "Location (Town):" caption.
    "undefined": SUPPLY("Location (Town)",
      "the town the court sits in, as your case papers give it. LegalEase holds the county of your case but "
      + "not the court's town"),
    // Measured: this widget sits against "Defendant's DOB (mm/dd/yyyy):".
    "MOTION TO SEAL CONVICTION FOR": WRITE("participant.date_of_birth", "Defendant's DOB", "Defendant's DOB"),
    "Docket No": WRITE("matter.case_number", "Docket No.", "Docket No."),
    /*
     * REFUSED BY THE SHARED PROTECT RULES, ON ITS OWN CORRECT LABEL.
     *
     * This widget is the date blank at the end of item 1's printed line
     * "Defendant was convicted of the following crime(s) on (mm/dd/yyyy) ___",
     * and the label it sits against is therefore conviction language.
     * protectCategoryOf on that label returns `disposition_or_hearing`: the
     * shared semantics does not let a build assert a conviction fact onto a
     * sworn filing. This build does not route around that. The date is carried
     * to the participant instead, and nothing in this packet writes a
     * conviction date anywhere.
     */
    "Thisthese crimes are eligible for sealing under 15 MRSA  22616C and 2262B":
      SUPPLY("Date of conviction on item 1",
        "item 1 — the date you were convicted, in mm/dd/yyyy. LegalEase does not write a conviction date onto "
        + "a sworn motion: the shared field rules treat a blank captioned with conviction language as one the "
        + "platform must not assert for you, and this packet honours that rather than working around it"),
    "1": SUPPLY("Item 1 list of the crimes to be sealed",
      "item 1 — the crime or crimes you are asking the court to seal. The box is printed under the sentence "
      + "\"This/these crime(s) are eligible for sealing under 15 M.R.S.A. § 2261(6)(C) and §2262-B\", so "
      + "writing there asserts those crimes are eligible under those two sections. That is a legal conclusion "
      + "about your own record and the platform does not draw it for you"),
    "Date mmddyyyy": PROTECT("Signature date on the motion", SIGNATURE,
      "the date you sign the motion"),
    "Text1": PROTECT("Defendant's signature on the motion", SIGNATURE,
      "your signature"),
    "Defendants Attorney and Maine Bar No": OFF_ROUTE("Defendant's Attorney and Maine Bar No.",
      "the form prints this blank \"(if applicable)\" for a represented defendant. This family prepares a "
      + "self-represented motion and the platform holds no representation fact, so it is never populated with "
      + "participant data. A defendant who has a lawyer completes it themselves."),
    "1_2": WRITE("participant.street_address", "Defendant's Mailing Address", "Defendant's Mailing Address"),
    "2_2": WRITE("participant.city_state_zip", "City, State, Zip", "Defendant's Mailing Address")
  },
  "CR-308": {
    "Superior Court": COURT_BOX_ELECTION("Superior Court"),
    "District Court": COURT_BOX_ELECTION("District Court"),
    "Unified Criminal Docket": COURT_BOX_ELECTION("Unified Criminal Docket"),
    "County": WRITE("matter.county", "County", "County:"),
    "Defendant": WRITE("participant.full_legal_name", "Defendant", "Defendant"),
    "Location Town": SUPPLY("Location (Town)",
      "the town the court sits in, as your case papers give it"),
    "Docket No": WRITE("matter.case_number", "Docket No.", "Docket No."),
    "Defendants DOB mmddyyyy": WRITE("participant.date_of_birth", "Defendant's DOB", "Defendant's DOB"),
    "The representative for the State by and through": PROTECT(
      "Order election — the State consents and the motion is GRANTED without a hearing", COURT_OWNED,
      "an ordering box on the order the judge signs"),
    "A hearing was held on mmddyyyy": PROTECT(
      "Order election — a hearing was held and the motion is GRANTED", COURT_OWNED,
      "an ordering box on the order the judge signs"),
    "A hearing was held on mmddyyyy_2": PROTECT(
      "Order election — a hearing was held and the motion is DENIED", COURT_OWNED,
      "an ordering box on the order the judge signs"),
    "prosecutors name": PROTECT("Prosecutor's name", COURT_OWNED,
      "the prosecutor who consents on the State's behalf, named by the court"),
    "and Defendant established by a": PROTECT("Hearing date on the granting finding", COURT_OWNED,
      "the date of the hearing the court held"),
    "and Defendant has not established by a": PROTECT("Hearing date on the denying finding", COURT_OWNED,
      "the date of the hearing the court held"),
    "Findings of fact supporting this ORDER are as follows 1": PROTECT(
      "Findings of fact supporting the order", COURT_OWNED,
      "the court's own findings of fact")
  }
});

/*
 * The printed averment CR-307 makes with no box behind it. It is the substance
 * of the motion and the participant must be told what signing asserts.
 */
const CR307_ITEM_2 = "Defendant has been a victim of sex trafficking or sexual exploitation and the "
  + "commission of the crime(s) for which the Defendant was convicted was a substantial result of sex "
  + "trafficking or sexual exploitation.";

// ---------------------------------------------------------------------------
// sources
// ---------------------------------------------------------------------------
function corpusRoot() {
  return process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
}

function resolveSources() {
  const index = readJson(CORPUS_INDEX);
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: corpusRoot() });
  return SOURCES.map((source) => {
    const entry = (index.entries ?? []).find((row) => row.path === source.path);
    if (!entry) fail("no committed corpus-index entry at the declared path", `${source.sourceId} ${source.path}`);
    if (entry.sha256 !== source.sha256) fail("the committed index pins a different binary", entry.sha256);
    const absolute = resolver.resolve(entry);
    if (!absolute || !fs.existsSync(absolute)) {
      fail("the custody holding this source is not mounted here", `${source.sourceId} ${source.path}`);
    }
    const digest = sha256File(absolute);
    if (digest !== source.sha256) fail("SHA-256 drift against the declared digest", `${source.sourceId}: ${digest}`);
    const byteLength = fs.statSync(absolute).size;
    if (entry.byteLength !== byteLength) fail("byte length disagrees with the committed index", byteLength);
    return { ...source, absolute, byteLength, indexEntry: entry };
  });
}

// ---------------------------------------------------------------------------
// render
// ---------------------------------------------------------------------------
async function renderForm({ document, census, facts }) {
  const derivedBytes = fs.readFileSync(document.derivedPath);
  const pdf = await PDFDocument.load(derivedBytes, { ignoreEncryption: true, updateMetadata: false });
  const decisions = DECISIONS[document.formNumber];
  const report = { written: [], refused: [], unfittable: [], protectedFields: [] };
  const overlayWrites = [];

  for (const field of census.fields) {
    const decision = decisions[field.name];
    if (!decision) fail(`${document.formNumber}: no decision for AcroForm field`, field.name);
    if (!decision.writable) {
      report.refused.push({ field: field.name, reason: decision.reason ?? decision.what ?? null,
        category: decision.category ?? null, disposition: decision.approvedDisposition });
      if (decision.approvedDisposition === "PROTECTED_FIELD") {
        report.protectedFields.push({ field: field.name, category: decision.category });
      }
      continue;
    }
    /*
     * The protect rules are applied to the printed label this build asserts the
     * widget sits against, and NOT to the field's own name. On CR-307 the name
     * is demonstrably the caption of the neighbouring field, so protecting on it
     * protects the wrong box and refuses the right one — measured: the name
     * `MOTION TO SEAL CONVICTION FOR` trips the disposition_or_hearing rule
     * while the widget it names is the Defendant's date-of-birth blank, and the
     * name `Defendants DOB mmddyyyy` passes the rules while its widget is the
     * caption's Defendant NAME box. Every asserted label is checked against the
     * page's own printed words before this point.
     */
    const category = protectCategoryOf(decision.effectiveLabel)
      ?? protectCategoryOf(decision.assertedPrintedLabel);
    if (category) {
      report.refused.push({ field: field.name, reason: "protected_category", category,
        assertedPrintedLabel: decision.assertedPrintedLabel });
      report.protectedFields.push({ field: field.name, category });
      continue;
    }
    const value = facts[decision.factId];
    if (typeof value !== "string" || value.trim() === "") {
      report.refused.push({ field: field.name, reason: "no_value_or_type_mismatch", factId: decision.factId });
      continue;
    }
    overlayWrites.push({ field, decision, value });
  }

  /*
   * FIX01, CLIPPING_AND_OVERLAP and PROTECTED_FIELDS. A BORDER NEITHER MAINE
   * FORM PRINTS.
   *
   * Every check box on CR-307 and CR-308 carries /AS /Off with an /AP /N
   * dictionary that holds an /On entry and NO /Off entry, and /MK << /CA (8) >>
   * with no /BC. pdf-lib's PDFCheckBox.needsAppearancesUpdate() is true on
   * exactly that condition, so updateFieldAppearances() invents an appearance
   * from its default provider -- a stroked square the size of the widget /Rect
   * -- and flatten() stamps it onto the page. Under ISO 32000-1 12.5.5 a
   * conforming viewer paints NOTHING at a widget whose /AS state is absent from
   * /AP /N, so the square is ink this build adds rather than ink the Maine
   * Judicial Branch authored, and it lands around the box the form already
   * prints.
   *
   * VF01 measured it on the delivered bytes at 7d6453f51: nine stroke-only
   * flattened appearances per fixture, none of them matching any /AP /N stream
   * in either pinned source, and 445 added pixels per fixture outside every
   * declared write rect with every one of them inside a check-box rect. Three
   * of the nine sit on CR-308's GRANTED / GRANTED / DENIED ordering boxes,
   * which this build expressly refuses as the judge's -- so the same synthesis
   * is also the PROTECTED_FIELDS failure, and one repair answers both.
   *
   * It draws no glyph, so nonWhitespaceGlyphsOutsideMeasuredWriteBoxes reads 0
   * honestly while the page is wrong, and the ink extent grows about 0.6pt so a
   * bounding-box test cannot see it either.
   *
   * suppressSynthesizedAppearances installs an EMPTY appearance for the missing
   * state, which is what the source's own silence means; needsAppearancesUpdate()
   * is then false, pdf-lib regenerates nothing and the flatten stamps a stream
   * that paints nothing. This build marks no box, so writtenFields is empty and
   * no mark can be suppressed by it. It is the same helper, called in the same
   * position, that md_pardon_expungement-set uses -- imported through the shared
   * finalizer rather than reimplemented, so the two cannot drift apart.
   */
  const { clean, report: finalizerReport } = await sanitizeAndFlatten(pdf,
    { writtenFields: new Set(), suppressSynthesizedAppearances: true });
  const font = await clean.embedFont(StandardFonts.Helvetica);
  for (const { field, decision, value } of overlayWrites) {
    const widget = field.widgets[0];
    const rect = widget.rect;
    const fit = fitTextToWidget({
      font, text: value, multiline: false, maxFontSize: 10, minFontSize: 6,
      rect: { x: rect.x + 1, y: rect.y + 2, width: rect.width - 2, height: rect.height - 2 }
    });
    if (fit.outcome === "refused") {
      report.unfittable.push({ field: field.name, factId: decision.factId, ...fit });
      report.refused.push({ field: field.name, reason: fit.reason, category: "unfittable" });
      continue;
    }
    clean.getPage(widget.page - 1).drawText(fit.lines.join(" "), {
      x: rect.x + 2, y: rect.y + Math.max(2, (rect.height - fit.fontSize) / 2),
      size: fit.fontSize, font, color: rgb(0, 0, 0)
    });
    report.written.push({
      field: field.name, factId: decision.factId, kind: "overlay_text", value,
      page: widget.page, rect, rectBasis: "acroform_widget_rectangle",
      assertedPrintedLabel: decision.assertedPrintedLabel,
      fontSize: fit.fontSize, outcome: fit.outcome
    });
  }
  preserveSourceMetadata(pdf, clean);
  carryDates(pdf, clean);
  const bytes = Buffer.from(await clean.save({ useObjectStreams: false, updateMetadata: false }));
  const active = scanBytesForActiveContent(bytes);
  if (!active.inspectable) fail(`${document.formNumber}: the produced artifact is not byte-inspectable`);
  if (active.hits.length > 0) fail(`${document.formNumber}: active-content residue remains`, active.hits.join(", "));
  report.activeContentScan = active;
  /* What the suppression actually did on THIS document, carried out of the
   * render so build-findings.json can state it per form rather than assert it
   * in prose. `installed` is one entry per widget that had no stream for its
   * own /AS state and was given an empty one; `skippedStateAlreadyDrawn` is a
   * widget whose source ships its own appearance for that state, which is
   * reproduced untouched. */
  report.synthesizedSelectionAppearancesSuppressed =
    finalizerReport?.synthesizedSelectionAppearancesSuppressed ?? null;
  return { bytes, report };
}

/*
 * WHY ADDED INK IS ATTRIBUTED BY RUN AND NOT BY CHARACTER POSITION.
 *
 * The shared extractor has no width metrics for the standard-14 Helvetica this
 * factory draws with, so it reports metricsExact false and synthesizes each
 * character's x from a uniform half-em advance. The origin of each RUN is
 * exact, because it comes from the text matrix; the positions inside it drift,
 * and they drift RIGHTWARD — which manufactures a value-past-the-box defect on
 * exactly the longest values. Measured on this family: the boundary mailing
 * address, fitted well inside a 256.56pt widget, was reported with its last
 * glyph 8pt beyond the widget's right edge.
 *
 * So containment is decided from each run's exact origin plus the true width of
 * its own text at its own size, taken from the same font this build draws with.
 * The glyph COUNT still comes from the character diff, which is exact.
 */
async function addedInkOf(beforeBytes, afterBytes) {
  const before = await PDFDocument.load(beforeBytes, { ignoreEncryption: true, updateMetadata: false });
  const after = await PDFDocument.load(afterBytes, { ignoreEncryption: true, updateMetadata: false });
  const key = (page, ch, y) => `${page}|${ch.x.toFixed(1)}|${y.toFixed(1)}|${ch.c}`;
  const original = new Map();
  before.getPages().forEach((page, index) => {
    for (const item of extractTextItems(page)) {
      for (const ch of item.chars ?? []) {
        const id = key(index + 1, ch, item.y);
        original.set(id, (original.get(id) ?? 0) + 1);
      }
    }
  });
  const originalRuns = new Map();
  before.getPages().forEach((page, index) => {
    for (const item of extractTextItems(page)) {
      const id = `${index + 1}|${item.x.toFixed(1)}|${item.y.toFixed(1)}|${item.text}`;
      originalRuns.set(id, (originalRuns.get(id) ?? 0) + 1);
    }
  });
  const added = [];
  const addedRuns = [];
  after.getPages().forEach((page, index) => {
    for (const item of extractTextItems(page)) {
      const runId = `${index + 1}|${item.x.toFixed(1)}|${item.y.toFixed(1)}|${item.text}`;
      const left = originalRuns.get(runId) ?? 0;
      if (left > 0) originalRuns.set(runId, left - 1);
      else addedRuns.push({ page: index + 1, x: round(item.x), y: round(item.y),
        size: Number(item.size || 0), text: String(item.text ?? "") });
      for (const ch of item.chars ?? []) {
        const id = key(index + 1, ch, item.y);
        const remaining = original.get(id) ?? 0;
        if (remaining > 0) { original.set(id, remaining - 1); continue; }
        added.push({ page: index + 1, x: round(ch.x), y: round(item.y), w: round(ch.w), c: ch.c });
      }
    }
  });
  return { added, addedRuns };
}

function proofFor({ document, census, report, added, addedRuns, font }) {
  const boxes = census.fields.flatMap((field) => field.widgets.map((widget) => ({ ...widget, name: field.name })));
  const inside = (glyph, box) => glyph.page === box.page
    && glyph.x + glyph.w >= box.rect.x - 2 && glyph.x <= box.rect.x + box.rect.width + 2
    && glyph.y >= box.rect.y - 4 && glyph.y <= box.rect.y + box.rect.height + 4;
  // Containment per RUN, against the run's exact origin and the true width of
  // its own text. See addedInkOf above for the measured reason.
  const runExtent = (run) => {
    let width = null;
    try { width = font.widthOfTextAtSize(run.text, run.size); } catch { width = null; }
    return width === null ? { x0: run.x, x1: run.x, exact: false } : { x0: run.x, x1: round(run.x + width), exact: true };
  };
  /*
   * Each added run is attributed to exactly ONE widget: the candidate whose
   * vertical centre is nearest. CR-307's two mailing-address widgets are
   * adjacent — 240.24-256.68 and 223.20-239.64 — and a tolerance band wide
   * enough to catch a baseline drawn just inside a box also reaches into its
   * neighbour, so both lines were reported as the second field's ink.
   */
  const ownerOf = (run, extent) => boxes
    .filter((box) => run.page === box.page
      && extent.x1 <= box.rect.x + box.rect.width + 2 && extent.x0 >= box.rect.x - 2
      && run.y >= box.rect.y - 4 && run.y <= box.rect.y + box.rect.height + 4)
    .sort((a, b) => Math.abs(run.y - (a.rect.y + a.rect.height / 2))
      - Math.abs(run.y - (b.rect.y + b.rect.height / 2)))[0] ?? null;
  const runOwners = new Map();
  const outsideRuns = [];
  let glyphsOutside = 0;
  for (const run of addedRuns) {
    const extent = runExtent(run);
    const owner = ownerOf(run, extent);
    if (owner) {
      if (!runOwners.has(owner.name)) runOwners.set(owner.name, []);
      runOwners.get(owner.name).push(run);
      continue;
    }
    const held = false;
    if (held) continue;
    const count = [...run.text].filter((ch) => ch.trim()).length;
    if (count === 0) continue;
    glyphsOutside += count;
    outsideRuns.push({ ...run, measuredRightEdge: extent.x1, exactWidth: extent.exact });
  }
  const outside = outsideRuns;
  const perWrite = report.written.map((write) => {
    const runs = runOwners.get(write.field) ?? [];
    const drawn = runs.map((run) => run.text).join("").trim();
    const glyphCount = runs.reduce((total, run) => total + [...run.text].filter((ch) => ch.trim()).length, 0);
    return {
      field: write.field, factId: write.factId, page: write.page, rect: write.rect,
      rectBasis: write.rectBasis, assertedPrintedLabel: write.assertedPrintedLabel,
      expected: write.value,
      textReadFromFinalPdfBytes: drawn,
      glyphCountReadFromFinalPdfBytes: glyphCount
    };
  });
  const findings = [];
  if (outside.length > 0) {
    findings.push({ severity: "blocking", form: document.formNumber,
      check: "added_glyphs_outside_every_measured_widget_rectangle",
      runCount: outside.length, glyphCount: glyphsOutside, sample: outside.slice(0, 20) });
  }
  for (const row of perWrite) {
    if (row.glyphCountReadFromFinalPdfBytes === 0) {
      findings.push({ severity: "blocking", form: document.formNumber,
        check: "reported_write_has_no_glyph_in_its_widget_rectangle", field: row.field });
    }
  }
  /*
   * A field this build OFFERED and did not write. production-field-map.json
   * publishes every offered field as a writable anchor carrying a fact id, and
   * a completeness reader counts those as written, so a field the shared
   * semantics refused would leave the map claiming a write the artifact does
   * not carry. A value that could not be fitted is recorded separately, because
   * that is what the boundary fixture exists to find.
   */
  for (const field of census.fields) {
    const decision = DECISIONS[document.formNumber][field.name];
    if (!decision?.writable) continue;
    if (report.written.some((write) => write.field === field.name)) continue;
    if ((report.unfittable ?? []).some((row) => row.field === field.name)) continue;
    findings.push({ severity: "blocking", form: document.formNumber,
      check: "offered_field_was_not_written", field: field.name, factId: decision.factId,
      refusal: report.refused.find((row) => row.field === field.name) ?? null });
  }
  return {
    addedGlyphsReadFromOutputBytes: added.filter((glyph) => String(glyph.c).trim()).length,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: glyphsOutside,
    glyphsOutsideSample: outside.slice(0, 20),
    perWrite, findings
  };
}

// ---------------------------------------------------------------------------
// instructions
// ---------------------------------------------------------------------------
/*
 * The controlling participant-boundary record, read and hashed rather than
 * restated. A missing field is a full stop: this build will not publish a guide
 * that silently drops a stop condition because the record moved under it.
 */
function readParticipantBoundaryRecord() {
  const registryBytes = fs.readFileSync(absFor(TRACK_REGISTRY));
  const manifestBytes = fs.readFileSync(absFor(PACKET_SET_MANIFESTS));
  const registry = JSON.parse(registryBytes.toString("utf8"));
  const manifests = JSON.parse(manifestBytes.toString("utf8"));
  const track = (registry.tracks ?? []).find((row) => row.trackId === TRACK_ID);
  if (!track) fail("the committed track registry no longer carries this family's track", TRACK_ID);
  const packetSet = (manifests.packetSets ?? []).find((row) => row.packetSetId === FAMILY_ID);
  if (!packetSet) fail("the committed packet-set manifests no longer carry this family", FAMILY_ID);

  const stopConditions = track.selfHelpStopConditions ?? [];
  const scopeRestrictions = track.scopeRestrictions ?? [];
  if (stopConditions.length === 0) fail("the track record carries no selfHelpStopConditions to publish");
  if (scopeRestrictions.length === 0) fail("the track record carries no scopeRestrictions to publish");

  /* Two packet_instruction limitations this guide is required to carry in
   * terms. Each is located by its own recorded statement rather than by index,
   * so a reordered record cannot silently substitute a different instruction. */
  const limitationSaying = (needle) => {
    const found = (track.legalDesignLimitations ?? [])
      .filter((row) => typeof row.statement === "string" && row.statement.includes(needle));
    if (found.length !== 1) {
      fail("the track record no longer carries exactly one limitation stating this, so the guide cannot quote it",
        `${JSON.stringify(needle)} matched ${found.length}`);
    }
    return found[0];
  };
  const disseminationLimitation = limitationSaying("State Bureau of Identification");
  const durabilityLimitation = limitationSaying("a later conviction does not unseal");
  const documentationLimitation = limitationSaying("§ 2264(4-A)(B)");

  const requiredBeforeFiling = packetSet.requiredBeforeFiling ?? [];
  if (requiredBeforeFiling.length === 0) fail("the packet-set manifest carries no requiredBeforeFiling list");
  const obtainDocuments = (packetSet.participantActionRequired ?? [])
    .filter((row) => row.kind === "obtain_document");
  const confirmAnswers = (packetSet.participantActionRequired ?? [])
    .filter((row) => row.kind === "confirm_answer");
  if (obtainDocuments.length === 0) fail("the packet-set manifest carries no obtain_document actions");

  return {
    track, packetSet, stopConditions, scopeRestrictions,
    disseminationLimitation, durabilityLimitation, documentationLimitation,
    requiredBeforeFiling, obtainDocuments, confirmAnswers,
    digests: {
      trackRegistry: { path: TRACK_REGISTRY, sha256: sha256(registryBytes) },
      packetSetManifests: { path: PACKET_SET_MANIFESTS, sha256: sha256(manifestBytes) }
    }
  };
}

function renderParticipantInstructions({ documents, supplyRows, electionRows, protectRows, boundary,
  warningGate, warningStillPrinted, cr308WarningPrintedText }) {
  const lines = [];
  lines.push("# Your Maine survivor sealing packet");
  lines.push("");
  lines.push("This packet asks a Maine court to seal a criminal conviction that arose from sex trafficking or");
  lines.push("sexual exploitation, under 15 M.R.S. § 2262-B and § 2264(7). It is prepared for you to check,");
  lines.push("complete, sign and file. Nothing in it has been filed and no court has decided anything.");
  lines.push("");
  lines.push("## What is in the packet");
  lines.push("");
  for (const doc of documents) {
    lines.push(`- **${doc.formNumber} (${doc.revision})** — ${doc.title}. `
      + `${doc.role === "court_order" ? "This is the order the judge signs. Only its caption is filled in." : "This is the motion you sign and file."}`);
  }
  lines.push("");
  lines.push("## Before this packet is used at all");
  lines.push("");
  lines.push("The committed legal-design record for this track sets a boundary on what an automated service");
  lines.push("may do here, and the first line of it is that this track is not self-help. The record's own");
  lines.push("words, carried here in full and unchanged:");
  lines.push("");
  for (const condition of boundary.stopConditions) lines.push(`> ${condition}`, ">");
  lines.pop();
  lines.push("");
  lines.push("Some of those sentences are written to the people who build and operate this service rather");
  lines.push("than to you. They are printed here unchanged so that you can see the limits the service is");
  lines.push("under, and so that nothing in this packet reads as advice it is not.");
  lines.push("");
  lines.push("The same record restricts when this track may be opened at all:");
  lines.push("");
  for (const restriction of boundary.scopeRestrictions) lines.push(`> ${restriction}`, ">");
  lines.pop();
  lines.push("");
  lines.push("An attorney, legal-aid provider or qualified victim-services advocate must assess your case");
  lines.push("before a packet is prepared, and a named referral partner must be in place before this track is");
  lines.push("opened. If you are reading this without that assessment and that referral, this packet is not");
  lines.push("ready to be used. LegalEase does not assess your case, does not decide what documentation to");
  lines.push("present, and does not decide whether to ask the State to consent.");
  lines.push("");
  lines.push("## What sealing does, and what it does not do");
  lines.push("");
  lines.push("Sealing restricts what criminal justice agencies may disseminate and what appears on a State");
  lines.push("Bureau of Identification background check. It does not make the court case disappear, and");
  lines.push("nothing in this packet says or implies that it does. Maine seals records; it does not");
  lines.push("erase them.");
  lines.push("");
  lines.push("That is a requirement of the committed record, not a summary of it. The record states:");
  lines.push("");
  lines.push(`> ${boundary.disseminationLimitation.statement}`);
  lines.push("");
  lines.push("## Whether a later conviction can undo this");
  lines.push("");
  lines.push(`> ${boundary.durabilityLimitation.statement}`);
  lines.push("");
  if (warningStillPrinted) {
    lines.push("Read that against the form in your hand. CR-308 page 2 prints, in a box of its own:");
    lines.push("");
    lines.push(`> ${cr308WarningPrintedText}`);
    lines.push("");
    lines.push("Those two things do not agree, and the disagreement is recorded and unresolved. The committed");
    lines.push("record's position is that 15 M.R.S. § 2264(7) as amended by PL 2025, c. 513 governs and does");
    lines.push("not apply to § 2262-B records, so the statutory rule is the one quoted above. What a Maine");
    lines.push("court actually does about the printed warning is not settled in the committed record. This");
    lines.push("packet does not repeat the form's warning as advice and does not tell you it is wrong. Ask your");
    lines.push("lawyer or advocate before you rely on either sentence.");
    lines.push("");
    if (warningGate) {
      lines.push(`This is an open question on the record, not an oversight: gate \`${warningGate.id}\` is`);
      lines.push("pending and asks for");
      lines.push("");
      for (const item of warningGate.items ?? []) lines.push(`- ${item}`);
      lines.push("");
      lines.push("Until it closes, this packet is a review artifact and is not delivered to a participant.");
      lines.push("");
    }
  }
  lines.push("## What signing the motion says");
  lines.push("");
  lines.push("CR-307 item 2 is printed on the form with no box to fill. It reads:");
  lines.push("");
  lines.push(`> ${CR307_ITEM_2}`);
  lines.push("");
  lines.push("Signing the motion tells the court that is true. LegalEase holds no information about whether");
  lines.push("anyone is a survivor of trafficking or exploitation, does not ask for it, and has not filled");
  lines.push("anything in that says it. Read item 2 before you sign.");
  lines.push("");
  lines.push("## You must supply these before you file");
  lines.push("");
  lines.push("These are the blanks on the forms themselves that this packet leaves for you:");
  lines.push("");
  for (const row of supplyRows) lines.push(`- **${row.form} — ${row.effectiveLabel}.** ${row.what}.`);
  lines.push("");
  lines.push("And this is the packet-set record's own required-before-filing list, carried in full and");
  lines.push("unchanged. Some of its entries record that nothing is required rather than asking you for");
  lines.push("something; they are printed as the record has them so that nothing is quietly dropped:");
  lines.push("");
  for (const item of boundary.requiredBeforeFiling) lines.push(`- ${item}`);
  lines.push("");
  lines.push("## Documents to gather");
  lines.push("");
  lines.push("The packet-set record names these, and each entry below is the record's own description:");
  lines.push("");
  for (const action of boundary.obtainDocuments) {
    lines.push(`- ${action.description}`);
    if (action.obtainedFrom) lines.push(`  Obtained from: ${action.obtainedFrom}.`);
    if (action.conditionDescription) lines.push(`  ${action.conditionDescription}`);
  }
  for (const action of boundary.confirmAnswers) {
    lines.push(`- ${action.description}`);
    if (action.conditionDescription) lines.push(`  ${action.conditionDescription}`);
  }
  lines.push("");
  lines.push("On documentation of victim status in particular, the record says:");
  lines.push("");
  lines.push(`> ${boundary.documentationLimitation.statement}`);
  lines.push("");
  lines.push("Whether to present any of it, and whether to rely on the § 2264(4-A)(B) presumption, is a");
  lines.push("decision for your lawyer or advocate and not one this packet makes or asks you to make.");
  lines.push("");
  lines.push("## Choices only you can make");
  lines.push("");
  for (const row of electionRows) lines.push(`- **${row.form} — ${row.effectiveLabel}.** ${row.reason}`);
  lines.push("");
  lines.push("## The court fills these in");
  lines.push("");
  lines.push("CR-308 is the proposed order. Everything on it except the caption belongs to the judge: whether");
  lines.push("the State consents, whether a hearing was held, the findings of fact, and the signature.");
  lines.push("");
  for (const row of protectRows.filter((row) => row.form === "CR-308")) {
    lines.push(`- **${row.effectiveLabel}** — ${row.reason}.`);
  }
  lines.push("");
  lines.push("## Signing");
  lines.push("");
  lines.push("You sign and date CR-307. This packet leaves your signature and the signing date blank, because");
  lines.push("only you can complete them. No notarization is required on the face of the form.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function renderFilingInstructions({ boundary }) {
  /* Each of the three is located by its own recorded words rather than by
   * position, so a reordered record cannot silently substitute a different
   * boundary for the one this section is about. */
  const stopSaying = (needle) => {
    const found = boundary.stopConditions.filter((row) => row.includes(needle));
    if (found.length !== 1) {
      fail("the track record no longer carries exactly one stop condition stating this",
        `${JSON.stringify(needle)} matched ${found.length}`);
    }
    return found[0];
  };
  const consentStop = stopSaying("whether to seek the State's consent");
  const opposeStop = stopSaying("The State opposes");
  const immigrationStop = stopSaying("immigration-adjacent");
  const lines = [];
  lines.push("# Filing your Maine survivor sealing motion");
  lines.push("");
  lines.push("## Where it goes");
  lines.push("");
  lines.push("File the completed CR-307 with the proposed CR-308 order at the clerk's office for the court");
  lines.push("that entered the conviction, in the underlying criminal proceeding (15 M.R.S. § 2264(1)). Where");
  lines.push("several motions are filed, the court consolidates them to one location.");
  lines.push("");
  lines.push("## The filing fee");
  lines.push("");
  lines.push("The committed record says no fee is expected: Administrative Order JB-05-26 lists no fee for a");
  lines.push("criminal post-judgment motion. This packet states no fee amount. Ask the clerk.");
  lines.push("");
  lines.push("## Service");
  lines.push("");
  lines.push("The committed record says § 2264(3) directs notice to the prosecutorial office that represented");
  lines.push("the State, and that no service obligation is imposed on the movant by the statute or by CR-307 —");
  lines.push("the form carries no certificate-of-service block. Whether you serve the prosecutor or the court");
  lines.push("performs all notice, and by what method, is not settled in the committed record for this route.");
  lines.push("Ask the clerk what that court requires.");
  lines.push("");
  lines.push("## The hearing");
  lines.push("");
  lines.push("Section 2264(5) requires a hearing on a motion under the chapter, except that for a motion under");
  lines.push("§ 2262-B the court may grant the motion without a hearing where the State consents. CR-308's");
  lines.push("first ordering box is the no-hearing route.");
  lines.push("");
  lines.push("**Whether to take that route is not a choice this packet makes for you or recommends to you.**");
  lines.push("The committed record puts it on the list of things automated assistance stops at:");
  lines.push("");
  lines.push(`> ${consentStop}`);
  lines.push("");
  lines.push("Describing what the box is is not advice to ask for consent. Ask your lawyer or advocate.");
  lines.push("");
  lines.push("Where a hearing is set, you will need the hearing date, time and courtroom. The court gives you");
  lines.push("those; this packet does not know them and states none.");
  lines.push("");
  lines.push("If the State opposes, or the court sets a contested hearing, automated assistance ends and you");
  lines.push("need a lawyer. That sentence is the record's, in full:");
  lines.push("");
  lines.push(`> ${opposeStop}`);
  lines.push("");
  lines.push("## If you have an immigration matter");
  lines.push("");
  lines.push(`> ${immigrationStop}`);
  lines.push("");
  lines.push("Raise it with your lawyer or advocate before you file. This packet does not advise on it.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

// ---------------------------------------------------------------------------
async function build({ check = false } = {}) {
  const sources = resolveSources();

  // The two open gates, read from the committed route contract rather than
  // restated from memory.
  const contract = readJson(ROUTE_CONTRACT);
  const route = (contract.routes ?? []).find((row) =>
    row.pathwayId === "sex-trafficking-sexual-exploitation-survivor-sealing");
  if (!route) fail("the committed route contract no longer carries this family's route");
  const gates = route.deliveryGates ?? [];
  const warningGate = gates.find((gate) => gate.id === "me_2264_7_cr308_warning_conflict") ?? null;
  if (!warningGate) fail("the route contract no longer carries the CR-308 warning gate this build reports on");

  /* The participant-boundary record, read and hashed before anything is
   * rendered. The guide's boundary and participant-action sections are
   * generated from these bytes and from nothing else. */
  const boundary = readParticipantBoundaryRecord();

  const derivedDir = absFor(`${OUT}/derived-sources`);
  const bridge = runBridge(sources.map((source) => ({
    formNumber: source.formNumber, sourcePath: source.absolute, sha256: source.sha256,
    derivedPath: path.join(derivedDir, `${source.formNumber.toLowerCase()}-pikepdf-unlocked.pdf`)
  })));

  for (const derivative of bridge.derivatives) {
    if (!derivative.sourceUnchanged) fail("the exact source changed across the pikepdf read", derivative.formNumber);
    if (!derivative.equivalence.equivalent) {
      fail("the pikepdf derivative is not equivalent to the exact source",
        `${derivative.formNumber}: ${JSON.stringify(derivative.equivalence)}`);
    }
  }

  // Whether the gate's own subject is still printed on the bytes this family binds.
  const cr308Words = bridge.forms["CR-308"].printedWords;
  const cr308Text = cr308Words.map((word) => word.text).join(" ").replace(/\s+/g, " ");
  const warningStillPrinted = cr308Text.toLowerCase().includes(CR308_WARNING.toLowerCase());
  /*
   * The warning sentence AS PRINTED, lifted out of CR-308's own word boxes so
   * the guide quotes the form rather than a transcription of it. A quotation the
   * build could not lift is not printed at all: renderParticipantInstructions
   * only reaches the quote when warningStillPrinted is true, and this stops the
   * build if the sentence is there but cannot be delimited.
   */
  let cr308WarningPrintedText = null;
  if (warningStillPrinted) {
    const start = cr308Text.search(/WARNING:/i);
    const end = cr308Text.toLowerCase().indexOf(CR308_WARNING.toLowerCase());
    if (start < 0 || end < start) {
      fail("CR-308 prints the warning this packet discloses but the sentence could not be delimited");
    }
    cr308WarningPrintedText = cr308Text.slice(start, end + CR308_WARNING.length).trim()
      .replace(/[.\s]*$/, "") + ".";
  }
  const cr307Text = bridge.forms["CR-307"].printedWords.map((word) => word.text).join(" ").replace(/\s+/g, " ");
  if (!cr307Text.includes("substantial result of sex trafficking or sexual exploitation")) {
    fail("CR-307 no longer prints the item 2 averment this packet discloses");
  }

  const documents = sources.map((source) => {
    const form = bridge.forms[source.formNumber];
    const derivative = bridge.derivatives.find((row) => row.formNumber === source.formNumber);
    const fields = form.official.fields.map((field) => {
      const widget = field.widgets[0];
      return { ...field, printedRunsNearThisWidget: widget ? printedRunsNear(widget, form.printedWords) : [] };
    });
    return { ...source, derivedPath: derivative.derivedPath, derivative,
      census: { ...form.official, fields }, printedWords: form.printedWords };
  });

  /*
   * Every printed label this build NAMES for a writable field is asserted to be
   * printed near that field's own widget, out of the page's own word boxes. A
   * named label that is not there means the form moved under this build's
   * reading of it, and the build stops rather than writing to a box it can no
   * longer identify.
   */
  const labelAssertions = [];
  for (const document of documents) {
    for (const field of document.census.fields) {
      const decision = DECISIONS[document.formNumber][field.name];
      if (!decision?.writable) continue;
      const printed = labelIsPrintedNear(decision.assertedPrintedLabel, field.printedRunsNearThisWidget);
      labelAssertions.push({
        form: document.formNumber, fieldNameOnTheForm: field.name,
        assertedPrintedLabel: decision.assertedPrintedLabel,
        widget: field.widgets[0] ?? null,
        printedNearThisWidget: printed,
        printedRunsNearThisWidget: field.printedRunsNearThisWidget
      });
    }
  }
  /*
   * A DEFECT IN THE PUBLISHED FORM, NOT IN THIS BUILD OR IN THE BRIDGE.
   *
   * CR-308's `Findings of fact supporting this ORDER are as follows 1` field
   * carries a normal-appearance stream with no /Subtype and no /Type. The
   * pikepdf derivative preserves it faithfully — which is what equivalence
   * means — and flattening surfaces it as a page-level form XObject, where
   * poppler reports "XObject subtype is missing or wrong type" on every
   * artifact derived from this source. It is measured from the exact source on
   * every run, named, and carried to the raster gate rather than repaired:
   * this lane does not silently rewrite an official form's appearance streams.
   */
  const malformedAppearances = documents.flatMap((document) => document.census.fields
    .filter((field) => field.malformedAppearance)
    .map((field) => ({
      form: document.formNumber, sourceSha256: document.sha256, field: field.name,
      ...field.malformedAppearance,
      whereItSurfaces: "as a page-level form XObject after the AcroForm is flattened",
      readerWarning: "poppler: Syntax Error: XObject subtype is missing or wrong type",
      presentInTheExactSource: true, introducedByThisBuild: false, repairedByThisBuild: false,
      fieldIsWrittenByThisBuild: false
    })));

  const notPrinted = labelAssertions.filter((row) => !row.printedNearThisWidget);
  if (notPrinted.length > 0) {
    fail("a printed label this build names for a field is not printed near that field's widget",
      notPrinted.map((row) => `${row.form}/${row.fieldNameOnTheForm} expected ${JSON.stringify(row.assertedPrintedLabel)}`).join("; "));
  }

  const fixtures = {};
  for (const fixture of ["canonical", "boundary"]) {
    const facts = fixture === "canonical" ? CANONICAL : BOUNDARY;
    const merged = await PDFDocument.create();
    const perDocument = [];
    const pages = [];
    for (const document of documents) {
      const { bytes, report } = await renderForm({ document, census: document.census, facts });
      const { added, addedRuns } = await addedInkOf(fs.readFileSync(document.derivedPath), bytes);
      const helvetica = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
      const proof = proofFor({ document, census: document.census, report, added, addedRuns, font: helvetica });
      perDocument.push({ fixture, formNumber: document.formNumber, sourceSha256: document.sha256,
        derivedSha256: document.derivative.derivedSha256,
        proofMethod: "glyphs present in the final packet bytes and absent from the pinned source's "
          + "pikepdf-unlocked derivative, located against the source's own widget rectangles",
        ...proof, written: report.written, refused: report.refused, unfittable: report.unfittable,
        activeContentScan: report.activeContentScan });
      const outPdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
      const copied = await merged.copyPages(outPdf, outPdf.getPageIndices());
      for (const [i, page] of copied.entries()) {
        merged.addPage(page);
        pages.push({ packetPage: pages.length + 1, formNumber: document.formNumber,
          sourcePage: i + 1, sourceSha256: document.sha256 });
      }
    }
    const { stampDeterministic } = await import("./rcap-official-forms/rcap-deterministic-pdf-date.mjs");
    stampDeterministic(merged);
    const bytes = Buffer.from(await merged.save({ useObjectStreams: false, updateMetadata: false }));
    fixtures[fixture] = { bytes, pages, perDocument };
  }

  const blocking = Object.values(fixtures).flatMap((fixture) =>
    fixture.perDocument.flatMap((row) => row.findings.map((finding) => ({ fixture: row.fixture, ...finding }))));
  const tooLongToFit = Object.entries(fixtures).flatMap(([fixture, result]) =>
    result.perDocument.flatMap((row) => (row.unfittable ?? []).map((item) => ({
      fixture, form: row.formNumber, field: item.field, factId: item.factId,
      requiredWidthAtMin: item.requiredWidthAtMin ?? null, minFontSize: item.minFontSize ?? null
    }))));

  if (check) {
    return { familyId: FAMILY_ID, wrote: false, blocking, tooLongToFit,
      derivatives: bridge.derivatives.map((row) => ({ formNumber: row.formNumber,
        derivedSha256: row.derivedSha256, equivalent: row.equivalence.equivalent, sourceUnchanged: row.sourceUnchanged })),
      cr308WarningStillPrinted: warningStillPrinted,
      malformedAppearancesInThePublishedSource: malformedAppearances,
      labelAssertions: labelAssertions.map((row) => ({ form: row.form,
        fieldNameOnTheForm: row.fieldNameOnTheForm, assertedPrintedLabel: row.assertedPrintedLabel,
        printedNearThisWidget: row.printedNearThisWidget })) };
  }
  if (blocking.length > 0) {
    fail("the produced bytes disagree with what this build says it wrote", JSON.stringify(blocking.slice(0, 4)));
  }

  fs.mkdirSync(absFor(`${OUT}/fixtures`), { recursive: true });
  fs.mkdirSync(absFor(`${OUT}/reports`), { recursive: true });
  fs.writeFileSync(absFor(`${OUT}/fixtures/canonical.pdf`), fixtures.canonical.bytes);
  fs.writeFileSync(absFor(`${OUT}/fixtures/boundary.pdf`), fixtures.boundary.bytes);

  const rowsOf = (predicate) => documents.flatMap((document) => document.census.fields
    .map((field) => ({ form: document.formNumber, field: field.name, widgets: field.widgets,
      printedRunsNearThisWidget: field.printedRunsNearThisWidget,
      ...DECISIONS[document.formNumber][field.name] }))
    .filter(predicate));
  const supplyRows = rowsOf((row) => row.approvedDisposition === "REQUIRED_BEFORE_FILING");
  const electionRows = rowsOf((row) => row.approvedDisposition === "PARTICIPANT_ELECTION_GENUINE");
  const protectRows = rowsOf((row) => row.approvedDisposition === "PROTECTED_FIELD");
  const offRouteRows = rowsOf((row) => row.approvedDisposition === "NOT_APPLICABLE_ON_THIS_ROUTE");

  fs.writeFileSync(absFor(`${OUT}/participant-instructions.md`),
    renderParticipantInstructions({ documents, supplyRows, electionRows, protectRows, boundary,
      warningGate, warningStillPrinted, cr308WarningPrintedText }));
  fs.writeFileSync(absFor(`${OUT}/filing-instructions.md`), renderFilingInstructions({ boundary }));

  const withheldFor = (document) => document.census.fields
    .map((field) => ({ field, decision: DECISIONS[document.formNumber][field.name] }))
    .filter((row) => !row.decision.writable)
    .map(({ field, decision }) => ({
      blankId: `${document.formNumber}/${field.name}`, fieldName: field.name,
      effectiveLabel: decision.effectiveLabel,
      page: field.widgets[0]?.page ?? 1,
      printedRunsNearThisWidget: field.printedRunsNearThisWidget,
      reason: decision.reason ?? decision.what ?? decision.routeConditionThatMakesItInapplicable ?? null,
      completenessDisposition: decision.approvedDisposition,
      ...(decision.category === SIGNATURE || decision.category === COURT_OWNED
        || decision.category === "participant_sworn_narrative_or_legal_election"
        ? { refusalClass: decision.category, category: decision.category } : {}),
      ...(decision.requiredBeforeFiling === true
        ? { requiredBeforeFiling: true, whatToSupply: decision.what } : {}),
      ...(decision.routeConditionThatMakesItInapplicable
        ? { routeConditionThatMakesItInapplicable: decision.routeConditionThatMakesItInapplicable } : {}),
      isSelectionControl: field.type === "button",
      approvedDisposition: decision.approvedDisposition,
      widgets: field.widgets
    }));

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1",
    familyId: FAMILY_ID, routeSelectionId: ROUTE_SELECTION_ID,
    censusBasis: "first_hand_inspection_of_each_exact_hash_bound_source, read through a deterministic "
      + "pikepdf-unlocked derivative proved equivalent to it",
    whyAFieldsNameIsNotItsLabelHere:
      "CR-307's AcroForm field names are shifted by one relative to the labels its page prints: each field "
      + "carries the caption of its neighbour. Nothing here derives a label from geometry — a first attempt "
      + "to do that reproduced the same off-by-one. Instead each writable field's decision NAMES the printed "
      + "label this build asserts it sits against, the build asserts that label is actually printed near that "
      + "widget, and every field publishes printedRunsNearThisWidget: the page's own word boxes with their "
      + "own coordinates, so a reviewer checks the claim against the page rather than trusting either the "
      + "field name or a heuristic.",
    documents: documents.map((document) => ({
      formNumber: document.formNumber, sourceSha256: document.sha256,
      derivedSha256: document.derivative.derivedSha256,
      documentPolicy: {
        mode: document.role === "court_order" ? "court_order_caption_only" : "participant",
        captionOnly: document.role === "court_order", documentAcceptsFill: true,
        routeKey: ROUTE_KEY, instrumentKind: document.instrumentKind
      },
      structuralClass: "acroform",
      encryptedInCustody: document.derivative.officialEncrypted,
      pageGeometry: document.census.pageGeometry,
      fieldCount: document.census.fields.length,
      selectionControlCount: document.census.fields.filter((field) => field.type === "button").length,
      fields: document.census.fields.map((field) => {
        const decision = DECISIONS[document.formNumber][field.name];
        return {
          name: field.name, type: field.type, widgets: field.widgets, onStates: field.onStates,
          shippedValue: field.shippedValue,
          printedRunsNearThisWidget: field.printedRunsNearThisWidget,
          assertedPrintedLabel: decision.assertedPrintedLabel ?? null,
          effectiveLabel: decision.effectiveLabel,
          disposition: decision.approvedDisposition ?? null,
          writable: decision.writable === true,
          factId: decision.factId ?? null
        };
      }),
      printedAvermentWithNoWidget: document.formNumber === "CR-307" ? CR307_ITEM_2 : null
    }))
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-production-field-map/v1",
    familyId: FAMILY_ID, routeKeys: [ROUTE_KEY], routeSelectionId: ROUTE_SELECTION_ID,
    implementationStrategy: "official_pdf_fill",
    renderStrategy: "pikepdf_unlocked_derivative_then_measured_widget_overlay",
    factMap: CANONICAL,
    documents: documents.map((document) => ({
      documentId: document.formNumber, formNumber: document.formNumber, sourceSha256: document.sha256,
      derivedSha256: document.derivative.derivedSha256, instrumentKind: document.instrumentKind,
      writableAnchors: document.census.fields
        .filter((field) => DECISIONS[document.formNumber][field.name].writable)
        .map((field) => {
          const decision = DECISIONS[document.formNumber][field.name];
          return {
            blankId: `${document.formNumber}/${field.name}`, label: decision.effectiveLabel,
            fieldName: field.name, assertedPrintedLabel: decision.assertedPrintedLabel,
            factId: decision.factId, page: field.widgets[0]?.page ?? 1,
            writeBox: field.widgets[0]?.rect ?? null, rectBasis: "acroform_widget_rectangle"
          };
        }),
      withheld: withheldFor(document)
    })),
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID, worklistGroupId: FAMILY_ID, jurisdiction: "ME",
    implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_RECOVERED_INTO_CUSTODY",
    custodyNote: "CR-308 was previously classed SOURCE_GENUINELY_MISSING and was recovered on 2026-09-04 from "
      + "the existing authenticated custody, at the path the committed corpus index already pinned. The digest "
      + "did not change and no acquisition was commissioned. This build re-hashes both binaries on every run.",
    acquisitionCommissioned: false,
    corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "committed corpus-index path + index SHA-256 + on-disk SHA-256 + byte length + page count",
    routeKey: ROUTE_KEY, routeSelectionId: ROUTE_SELECTION_ID,
    statutoryAuthority: "15 M.R.S. § 2262-B; 15 M.R.S. § 2263; 15 M.R.S. § 2264(1); 15 M.R.S. § 2264(5); "
      + "15 M.R.S. § 2264(7) as amended by PL 2025, c. 513; 15 M.R.S. § 2265",
    encryptedSourceHandling: {
      why: "Both binaries are AES-256 (R6/V5) with an empty user password and modify_other false. pdf-lib "
        + "implements no decryption and cannot open either; the committed corpus index records CR-308 as "
        + "`unreadable` with the load error it raised.",
      strategy: "pikepdf.open(exact_source).save(derived_path, deterministic_id=True)",
      precedent: "the same bridge already committed in scripts/build-census-v1-ca-1203-4-set.mjs for the "
        + "encrypted California Judicial Council forms",
      theExactSourceIsNeverModified: true,
      approvalStatus: "The Master Library's own asset manifest says of CR-307 that runtime mapping requires "
        + "an approved alternate handling strategy and completed-output review. This build names the strategy "
        + "and proves the derivative equivalent to the source; whether the strategy is approved is a "
        + "reviewer's call and the approval request asks for it.",
      derivatives: bridge.derivatives
    },
    documents: documents.map((document) => ({
      sourceIds: [document.sourceId], documentId: document.formNumber, formNumber: document.formNumber,
      revision: document.revision, title: document.title, instrumentKind: document.instrumentKind,
      packetComponent: document.component,
      pathInArchive: document.path, custody: document.indexEntry.custody,
      sha256: document.sha256, byteLength: document.byteLength,
      pageCount: document.census.pageCount, acroFieldCount: document.census.fields.length,
      structuralClassObserved: "acroform",
      structuralClassInTheCommittedIndex: document.indexEntry.structuralClassObserved,
      assetClassInTheMasterLibrary: document.assetClassInTheMasterLibrary,
      exactHashVerified: true, corpusIndexAgrees: true
    })),
    allSourcesExact: true, sourceBinaryCommitted: false,
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  const artifact = (fixture) => {
    const result = fixtures[fixture];
    return {
      fixture, file: `${OUT}/fixtures/${fixture}.pdf`,
      sha256: sha256(result.bytes), byteLength: result.bytes.length,
      pageCount: result.pages.length, pageManifest: result.pages,
      activeContentScan: result.perDocument[0]?.activeContentScan ?? null,
      addedGlyphsReadFromOutputBytes: result.perDocument.reduce((t, r) => t + r.addedGlyphsReadFromOutputBytes, 0),
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: result.perDocument
        .reduce((t, r) => t + r.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, 0),
      rasterPages: [], rasterState: "BUILT_RASTER_PENDING",
      whyNoRasterHere: "rasterization is central (.github/workflows/rcap-packet-raster-acceptance-batch.yml). "
        + "A local render is not a receipt, so this build produces none and records the digests the central "
        + "workflow is to raster."
    };
  };

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    artifacts: [artifact("canonical"), artifact("boundary")]
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID,
    derivedFromArtifactBytes: true, proofSource: "final canonical and boundary PDF bytes",
    documents: [...fixtures.canonical.perDocument, ...fixtures.boundary.perDocument]
      .map((row) => ({ ...row, actualWrites: row.perWrite }))
  });

  writeJson(`${OUT}/reports/blanks.json`, {
    schemaVersion: "rcap-packet-blanks/v1", familyId: FAMILY_ID,
    whatThisIs: "every AcroForm field this build did not write, with the reason it is blank",
    requiredBeforeFiling: supplyRows, participantElections: electionRows,
    protectedFields: protectRows, notApplicableOnThisRoute: offRouteRows,
    printedAvermentWithNoWidget: {
      form: "CR-307", item: "2", printed: CR307_ITEM_2,
      why: "There is no AcroForm field behind this sentence and nothing to fill. Signing the motion asserts "
        + "it. The platform holds no fact about whether anyone is a survivor of trafficking or exploitation, "
        + "must not, and does not ask; the participant instructions quote the sentence and say what signing "
        + "it means."
    },
    valuesTooLongForTheWidgetTheFormDraws: tooLongToFit,
    routeElectionsMade: []
  });

  writeJson(`${OUT}/reports/caption-evidence.json`, {
    schemaVersion: "rcap-caption-evidence/v1", familyId: FAMILY_ID,
    whatThisIs: "the caption of each Maine form, the printed label each caption widget was MEASURED to sit "
      + "against, the field name the form gives it, and the fact written there. CR-307's names are shifted by "
      + "one and this table is the evidence for that.",
    documents: documents.map((document) => ({
      formNumber: document.formNumber, sourceSha256: document.sha256, captionBandPage: 1,
      captionFields: document.census.fields
        .filter((field) => (field.widgets[0]?.page ?? 1) === 1 && (field.widgets[0]?.rect.y ?? 0) >= 620)
        .map((field) => {
          const decision = DECISIONS[document.formNumber][field.name];
          return {
            fieldNameOnTheForm: field.name,
            assertedPrintedLabel: decision.assertedPrintedLabel ?? null,
            printedRunsNearThisWidget: field.printedRunsNearThisWidget,
            widget: field.widgets[0] ?? null,
            effectiveLabel: decision.effectiveLabel,
            disposition: decision.approvedDisposition ?? "WRITTEN",
            factId: decision.factId ?? null,
            canonicalValue: decision.factId ? CANONICAL[decision.factId] ?? null : null
          };
        })
    }))
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-build-findings/v1", familyId: FAMILY_ID,
    blocking: [], findingCount: 0,
    deliveryIsGated: true,
    openGatesOnThisRoute: {
      ruleId: route.ruleId, statute: route.statute,
      gates: gates.map((gate) => ({ id: gate.id, kind: gate.kind, owner: gate.owner,
        items: gate.items, evidenceReference: gate.evidenceReference, note: gate.note })),
      whatThisBuildDidAboutThem: "nothing. Both are source-acquisition gates owned by RCAP source acquisition. "
        + "This packet is a review artifact — generationAllowed false, runtimeSelectable false, "
        + "commercialRoutesOpened 0 — and it must not be delivered to a participant until they close."
    },
    malformedAppearanceStreamsInThePublishedSource: {
      whatThisIs: "an appearance stream the official form ships without a /Subtype. It is preserved by the "
        + "pikepdf derivative (that is what equivalence means) and surfaces as a page-level form XObject once "
        + "the AcroForm is flattened, where poppler warns on every artifact derived from this source. This "
        + "lane does not rewrite an official form's appearance streams, so it is measured, named and carried "
        + "to the raster gate.",
      found: malformedAppearances,
      forTheRasterGate: malformedAppearances.length > 0
        ? "Expect `Syntax Error: XObject subtype is missing or wrong type` when rasterizing these fixtures. "
          + "It originates in the published CR-308 and not in this packet."
        : null
    },
    theRecoveredCr308DoesNotSatisfyTheWarningGate: {
      gate: "me_2264_7_cr308_warning_conflict",
      itemItWouldHaveSatisfied: "a corrected CR-308, or the court's confirmation that the printed warning box "
        + "no longer states the law",
      boundBinary: { sourceId: "official-form:CR-308", revision: "Rev. 06/26",
        sha256: SOURCES[1].sha256, recoveredOn: "2026-09-04" },
      warningStillPrintedOnPage2: warningStillPrinted,
      printedSentence: "WARNING: If at any time after the date of this order the Defendant is convicted of a "
        + "new crime in Maine or in any other jurisdiction, the new conviction extinguishes this order.",
      measuredHow: "re-read from the bound bytes on every run, through the pikepdf-unlocked derivative's own "
        + "printed word boxes",
      soWhat: "The CR-308 recovered into custody on 2026-09-04 is not the corrected form the gate asks for. "
        + "The gate's first item is unmet on both limbs, and its second item — what the court actually does "
        + "when a survivor is later convicted of a new crime — has no record at all."
    },
    participantBoundaryCopy: {
      whatThisIs: "the FIX01 repair of SELF_HELP_STOP and REQUIRED_BEFORE_FILING. The guide's boundary and "
        + "participant-action sections are GENERATED from the two records named below and bound to their "
        + "digests, so the copy cannot drift from the record and a reader can check which bytes it came from.",
      generatedFrom: boundary.digests,
      trackId: TRACK_ID, packetSetId: boundary.packetSet.packetSetId,
      carriedVerbatimIntoParticipantInstructions: {
        selfHelpStopConditions: boundary.stopConditions.length,
        scopeRestrictions: boundary.scopeRestrictions.length,
        requiredBeforeFilingStrings: boundary.requiredBeforeFiling.length,
        obtainDocumentActions: boundary.obtainDocuments.length,
        confirmAnswerActions: boundary.confirmAnswers.length,
        legalDesignLimitationsQuoted: [
          boundary.disseminationLimitation.statement,
          boundary.durabilityLimitation.statement,
          boundary.documentationLimitation.statement
        ]
      },
      whatWasMissingBefore: "VF01 measured at 7d6453f51 that none of the seven stop conditions reached "
        + "participant copy verbatim and only one reached it in substance; that neither scope restriction, "
        + "the State Bureau of Identification dissemination instruction and the durability rule appeared at "
        + "all; and that most of the packet-set record's participant-action list was absent. The words "
        + "advocate, legal aid, victim services, referral, assess, immigration, certified, docket record, "
        + "documentation, affidavit, presumption and courtroom appeared nowhere in either guide.",
      howTheDurabilityConflictIsHandled: "the guide states the record's statutory rule, quotes CR-308's "
        + "page-2 warning as the form's own printed words rather than as advice, says in terms that the two "
        + "do not agree and that the disagreement is unresolved, and names the open gate. It does not tell "
        + "the participant the form is wrong and does not repeat the warning as advice.",
      terminology: "the words expungement and expunge appear nowhere in either guide, which is the Maine "
        + "terminology rule the track record states."
    },
    observations: [
      "Both binaries are AES-256 encrypted against modification with an empty user password. They are read "
        + "and rendered through a deterministic pikepdf-unlocked derivative, proved equivalent to the exact "
        + "source on page count, page geometry, the terminal field tree and every widget rectangle before any "
        + "value is written. The exact sources are hashed before and after and are unchanged.",
      "CR-307's AcroForm field names are shifted by one against the labels its page prints: each field "
        + "carries the caption above it. Left to the shared semantics' name channel, `Defendants DOB "
        + "mmddyyyy` binds participant.date_of_birth and that widget is the caption's DEFENDANT NAME box, so "
        + "the motion would go to the clerk with the survivor's date of birth printed where the court reads "
        + "their name. Every CR-307 write is therefore bound to the printed label the widget was measured to "
        + "sit against, and reports/caption-evidence.json carries the correspondence field by field.",
      "CR-308's field names are correct on the same measurement and it is bound normally. Two forms from the "
        + "same court at the same revision, and only one is mislabelled.",
      "CR-308 is the court's order and is filled to its caption only. The three GRANTED/DENIED ordering "
        + "boxes, the prosecutor's name, both hearing dates, the findings of fact and the judge's signature "
        + "are the court's.",
      "CR-307 item 1's crime-list box is not written. It is printed under the sentence that the listed crimes "
        + "are eligible for sealing under 15 M.R.S.A. § 2261(6)(C) and § 2262-B, so writing there asserts a "
        + "legal conclusion about the participant's own record. The conviction date on the same item is a "
        + "held matter fact and is written.",
      "CR-307 item 2 — the averment that the participant is a survivor of trafficking or exploitation and "
        + "that the crime was a substantial result of it — has no AcroForm field behind it. Nothing is "
        + "written and the participant instructions quote it and say what signing asserts.",
      "No box is marked on either form. The three court-for-filing boxes are decided by which court entered "
        + "the conviction, which this route reaches in all three."
    ]
  });

  writeJson(`${OUT}/product-wiring.json`, {
    schemaVersion: "rcap-family-product-wiring/v1", familyId: FAMILY_ID, routeKeys: [ROUTE_KEY],
    routeSelectionId: ROUTE_SELECTION_ID, implementationStrategy: "official_pdf_fill",
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0,
    createsFulfillmentRecord: false, opensCommercialRoute: false,
    assignmentOwnedPath: OUT, evidenceOutputPath: OUT, builtBy: BUILD_SCRIPT,
    note: "Review artifacts and maps create no authority. This route additionally carries two pending "
      + "source-acquisition gates and must not be delivered to a participant until they close.",
    binding: {
      family: FAMILY_ID, jurisdiction: "ME", routeKeys: [ROUTE_KEY], deliveryType: "official_pdf_fill",
      instrumentKinds: ["primary_filing", "proposed_order"],
      packetComponents: SOURCES.map((source) => source.component).sort(),
      fieldMap: `${OUT}/production-field-map.json`,
      instructions: `${OUT}/participant-instructions.md`,
      filingInstructions: `${OUT}/filing-instructions.md`,
      renderedArtifacts: `${OUT}/reports/rendered-artifacts.json`,
      sourceReceipt: `${OUT}/source-receipt.json`,
      sourceVersion: SOURCES.map((source) => ({ sourceId: source.sourceId, sha256: source.sha256,
        tier: "exact_content_hash" })),
      acceptanceReceipt: null,
      rasterState: "BUILT_RASTER_PENDING",
      /*
       * A raster receipt that this build's own bytes make stale, recorded
       * rather than quietly dropped. The receipt was admitted against a packet
       * carrying nine synthesized check-box outlines, three of them on the
       * judge's ordering boxes, because the raster gate does not difference a
       * delivered page against its pinned source. Those bytes do not exist here
       * any more; the family needs a fresh central raster against the digests
       * in reports/rendered-artifacts.json, and nothing this build does is a
       * receipt.
       */
      supersededAcceptanceReceipt: {
        verdict: "RASTER_PASS", workflowRunId: "34413372916", jobId: "102673422679",
        artifactId: "10128266840",
        boundToCanonicalSha256: "0ee66d971f1937ca7f57595ee5e8993357be605c3497b1cb21b06d5b73400c07",
        coversTheWholeFamily: true,
        supersededBy: "FIX01 repair of CLIPPING_AND_OVERLAP, PROTECTED_FIELDS, SELF_HELP_STOP and "
          + "REQUIRED_BEFORE_FILING on 2026-09-09",
        why: "the receipt binds exact hashes and this build's canonical fixture is no longer that hash"
      },
      lastIndependentVerification: {
        verdict: "FAIL_REPAIR_REQUIRED", lane: "vf01",
        verifiedAtBase: "7d6453f51dacd9064f9a2b2d4d16618d0669add8",
        verifiedAgainstCanonicalSha256: "0ee66d971f1937ca7f57595ee5e8993357be605c3497b1cb21b06d5b73400c07",
        appliesToTheCurrentBytes: false,
        note: "Its four failing obligations were repaired by FIX01 on 2026-09-09. A repair lane cannot verify "
          + "its own work, so the current bytes carry NO independent verification and no verdict."
      },
      paymentEligible: false,
      sponsorshipEligible: false,
      whyPaymentIsClosed: "Commercial authority comes from a Grade-A fulfillment record keyed to an exact "
        + "route and packet family, and from nothing else. This binding is not that record, and nothing in "
        + "this repository has produced one.",
      maintenanceRelationship: {
        rebuiltFrom: BUILD_SCRIPT,
        sharedBuildHost: null,
        reRasterRequiredWhen: "any fixture byte moves; an acceptance receipt binds exact hashes and refuses "
          + "a packet nobody rendered",
        reVerificationRequiredWhen: "the packet bytes, its bound source, or its legal treatment changes"
      },
      declaredInstrumentKindMismatch: {
        queueDeclares: ["Maine § 2264(7) Survivor Sealing Motion"],
        measured: "MASTER_QUEUE's instrumentKinds for this family holds the packet-family LABEL rather than "
          + "instrument kinds. The two declared packetComponents are a primary filing and a proposed order, "
          + "which is what this build produces. Recorded rather than silently normalised."
      }
    }
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-output-approval-request/v1", familyId: FAMILY_ID, routeKeys: [ROUTE_KEY],
    status: "REQUESTED", grantedBy: null, exactSourceReviewComplete: true,
    independentVisualReviewRequired: true, outputLegalApprovalRequired: true,
    deliveryBlockedUntil: gates.map((gate) => ({ gate: gate.id, kind: gate.kind, owner: gate.owner,
      items: gate.items })),
    ownerDeterminationRequested: [
      {
        question: "Is the pikepdf-unlocked-derivative bridge an approved alternate handling strategy for "
          + "Maine's AES-256-encrypted CR-307 and CR-308?",
        whyItMatters: "The Master Library's asset manifest says CR-307's runtime mapping requires an approved "
          + "alternate handling strategy. This build uses the bridge already committed for the encrypted "
          + "California forms and proves the derivative equivalent to the source, but does not approve it.",
        blocksThisPacket: false
      },
      {
        question: "The CR-308 recovered on 2026-09-04 still prints the page-2 warning that a later conviction "
          + "extinguishes the order. Does that close, or leave open, gate me_2264_7_cr308_warning_conflict?",
        whyItMatters: "The gate's first item asks for a corrected CR-308. The recovered binary is not one.",
        blocksThisPacket: true
      }
    ],
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    status: "BUILT_REVIEW_PENDING", rasterState: "BUILT_RASTER_PENDING",
    builtDocuments: documents.length, renderedArtifacts: 2, rasterPages: 0,
    deliveryGatedByOpenSourceAcquisitionGates: true,
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0,
    packetsSelfVerified: 0, productionTouched: false
  });

  return {
    familyId: FAMILY_ID, wrote: true, directory: OUT,
    canonical: { sha256: sha256(fixtures.canonical.bytes), byteLength: fixtures.canonical.bytes.length,
      pageCount: fixtures.canonical.pages.length },
    boundary: { sha256: sha256(fixtures.boundary.bytes), byteLength: fixtures.boundary.bytes.length,
      pageCount: fixtures.boundary.pages.length },
    documents: documents.map((document) => ({ formNumber: document.formNumber, sha256: document.sha256,
      byteLength: document.byteLength, pageCount: document.census.pageCount,
      acroFieldCount: document.census.fields.length, derivedSha256: document.derivative.derivedSha256 })),
    cr308WarningStillPrinted: warningStillPrinted,
    malformedAppearancesInThePublishedSource: malformedAppearances,
    openGates: gates.map((gate) => gate.id),
    inkReadBackFromOutputBytes: ["canonical", "boundary"].map((fixture) => ({
      fixture,
      valuesReportedByFinalizer: fixtures[fixture].perDocument.reduce((t, r) => t + r.written.length, 0),
      addedGlyphsReadFromOutputBytes: fixtures[fixture].perDocument
        .reduce((t, r) => t + r.addedGlyphsReadFromOutputBytes, 0),
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: fixtures[fixture].perDocument
        .reduce((t, r) => t + r.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, 0),
      selectionsMarked: []
    })),
    requiredBeforeFiling: supplyRows.length, participantElections: electionRows.length,
    routeSelectionsMade: 0, tooLongToFit
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  build({ check: process.argv.includes("--check") })
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error); process.exit(1); });
}

export { build, FAMILY_ID, OUT, BUILD_SCRIPT };
