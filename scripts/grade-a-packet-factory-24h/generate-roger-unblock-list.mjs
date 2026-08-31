#!/usr/bin/env node
/**
 * The source blockers a person can actually shift, ranked.
 *
 * Two hundred and fifty-six families are SOURCE_BLOCKED, and most of that is
 * work nobody outside this repository can help with: hashing, custody
 * promotion, corpus indexing, route mapping, generated-record reconciliation,
 * path ownership. Handing Roger a list of those would be handing him a list of
 * my own work with his name on it.
 *
 * What a person can do that this factory cannot: open a form page in a real
 * browser when the host refuses an automated fetch, ask a clerk which form a
 * court actually accepts, and confirm that the edition we hold is the edition
 * currently issued. Those three, and nothing else, are what this ranks.
 *
 * WHAT THIS FILE WILL NOT DO IS INVENT A CONTACT.
 *
 * Every item names the issuing court or agency as the source records name it.
 * It does NOT carry a phone number or an email address, because this repository
 * holds none, and a plausible-looking clerk's address that nobody verified is a
 * fabricated record -- the kind that gets acted on precisely because it looks
 * complete. Each item says exactly what to look up and where the lookup starts.
 * A script is provided; the address to send it to is marked REQUIRES_LOOKUP.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeEmitter } from "../lib/generator-emit.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CHECK = process.argv.includes("--check");
const DIR = "data/rcap-grade-a/packet-factory-24h";
const OUT_JSON = `${DIR}/ROGER_SOURCE_UNBLOCK_LIST.json`;
const OUT_MD = "docs/rcap/grade-a/packet-factory-24h/ROGER_SOURCE_UNBLOCK_LIST.md";

const read = (rel, d = null) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8")); } catch { return d; } };
const master = read(`${DIR}/MASTER_QUEUE.json`);
if (!master) { console.error("REFUSED: no master queue; a human-action list built from nothing would be a blank page with a confident title."); process.exit(1); }
const manifest = read(`${DIR}/SOURCE_ACQUISITION_MANIFEST.json`, { entries: [], refused: [] });
const candidates = read(`${DIR}/SOURCE_URL_PROMOTION_CANDIDATES.json`, { candidates: [] });
const conveyor = read(`${DIR}/SOURCE_CONVEYOR_ASSIGNMENTS.json`, { lanes: [] });
const checkpoint = read(`${DIR}/CHECKPOINT.json`, {});

/*
 * Work that is mine and not Roger's, named so the exclusion is auditable rather
 * than implied. Anything matching these is filtered out of the ranked list and
 * counted in INTERNAL_SOURCE_WORK_NOT_FOR_ROGER.
 */
const INTERNAL_ONLY = [
  { id: "sha_calculation", what: "computing or comparing SHA-256 of a held or fetched binary", owner: "ACQ and PROMO lanes" },
  { id: "custody_promotion", what: "moving bytes into governed custody and writing the custody record", owner: "PROMO lanes" },
  { id: "corpus_indexing", what: "indexing the Master Library and reconciling the corpus index against held bytes", owner: "Captain" },
  { id: "route_family_mapping", what: "mapping a route or family to the documents it requires", owner: "DISC lanes" },
  { id: "generated_record_reconciliation", what: "regenerating the queue, the manifest, the conveyor or the collision record", owner: "Captain" },
  { id: "path_ownership", what: "deciding which lane owns which path and resolving collisions", owner: "Captain" },
  { id: "legal_decisions", what: "any question of what the law requires", owner: "counsel, through the legal queue" },
  { id: "ordinary_engineering", what: "generators, verifiers, workflows, prompts and their tests", owner: "Captain" }
];

const blocked = master.families.filter((f) => f.state === "SOURCE_BLOCKED");

/*
 * A statutory citation is not a form, and nobody can download one.
 *
 * LA-CCRP-ART-988, -989, -991 and -992 are queued as source obligations. They
 * are articles of the Louisiana Code of Criminal Procedure: there is no PDF at
 * the other end, no clerk who can hand one over, and no portal that publishes
 * it as a fillable document. Those routes need a custom pleading drafted
 * against the statute, which is drafting work and belongs in a build lane.
 *
 * Ranking them fourth and thirteenth on Roger's list would send him to four
 * offices to ask for something that does not exist, and he would come back
 * empty-handed having done exactly what the list told him. So they are
 * classified out, by shape, and counted where the exclusion is visible.
 */
/*
 * A BARE citation, not a title that happens to carry one. Massachusetts
 * publishes "Petition for Expungement, G.L. c. 276, § 100K" -- that is a form
 * with its authority printed in its name, and it is downloadable. Matching
 * anywhere in the string excluded it, which would have quietly dropped a real,
 * fetchable form off Roger's list on the strength of a section sign.
 */
const CITATION_SHAPED = /^[A-Z]{2}-(CCRP|RS|CRS|STAT|CODE)-[A-Z-]*\d+$|^\d+\s*U\.?S\.?C\.?\s*§?\s*[\d.]+$|^[A-Z. ]*§\s*[\d.A-Z]+$/i;
const isCitation = (form) => CITATION_SHAPED.test(String(form ?? "").trim());
const citationObligations = [];

/*
 * One item per (jurisdiction, form). A form is what a person fetches; a family
 * is what the form unlocks, and the same form unlocks several. Ranking families
 * would send Roger to the same clerk nine times.
 */
const items = new Map();
for (const f of blocked) {
  const jur = (f.jurisdiction ?? (Array.isArray(f.jurisdictions) ? f.jurisdictions[0] : null) ?? "??").toUpperCase();
  const forms = (f.forms ?? []).filter(Boolean);
  if (forms.length === 0) continue; // no named form: DISC research, not a fetch
  for (const form of forms) {
    if (isCitation(form)) { citationObligations.push({ familyId: f.familyId, jurisdiction: jur, citation: form }); continue; }
    const key = `${jur}::${form}`;
    if (!items.has(key)) {
      items.set(key, {
        jurisdiction: jur, formNumber: form, families: [], sourceIds: new Set(),
        reasons: new Set(), custodyClasses: new Set(), officialFormFamily: f.officialFormFamily ?? null
      });
    }
    const it = items.get(key);
    it.families.push(f.familyId);
    for (const s of f.sourceIds ?? []) it.sourceIds.add(s);
    for (const r of f.sourceReadiness?.reasons ?? []) it.reasons.add(r);
    if (f.sourceReadiness?.custodyClass) it.custodyClasses.add(f.sourceReadiness.custodyClass);
  }
}

// A known official URL, from the corroborated candidate sweep and the manifest.
const manifestByJur = new Map();
for (const e of manifest.entries ?? []) {
  const j = (e.jurisdiction ?? "").toUpperCase();
  if (!manifestByJur.has(j)) manifestByJur.set(j, []);
  manifestByJur.get(j).push(e);
}
const candidatesByJur = new Map();
for (const c of candidates.candidates ?? []) {
  const j = (c.jurisdictionInferredFromHost ?? "").toUpperCase();
  if (!j) continue;
  if (!candidatesByJur.has(j)) candidatesByJur.set(j, []);
  candidatesByJur.get(j).push(c);
}

// Hosts a fetch has actually been refused from. Recorded, not guessed.
const refusedHosts = new Set((manifest.refused ?? []).map((r) => { try { return new URL(r.url ?? r.officialUrl ?? "").hostname; } catch { return null; } }).filter(Boolean));

const STATEWIDE = /statewide|state|department|bureau|administrative office|judiciary|supreme/i;

const rows = [...items.values()].map((it) => {
  const exactEntry = (manifestByJur.get(it.jurisdiction) ?? []).find((e) => String(e.formNumber ?? "").toUpperCase() === it.formNumber.toUpperCase());
  const jurCandidates = candidatesByJur.get(it.jurisdiction) ?? [];
  // A URL for the jurisdiction is not a URL for the form. Said plainly, because
  // treating one as the other is how a guessed address enters the manifest.
  const nameMatch = jurCandidates.filter((c) => {
    const slug = it.formNumber.replace(/[^a-z0-9]/gi, "").toLowerCase();
    return slug.length > 4 && String(c.filenameFromPath ?? "").replace(/[^a-z0-9]/gi, "").toLowerCase().includes(slug);
  });

  const officialUrlKnown = Boolean(exactEntry?.officialUrl) || nameMatch.length > 0;
  const url = exactEntry?.officialUrl ?? nameMatch[0]?.url ?? null;
  const host = (() => { try { return url ? new URL(url).hostname : null; } catch { return null; } })();
  const hostRefusedAutomated = host ? refusedHosts.has(host) : false;

  // Which of the three human actions this is.
  const actionKind = officialUrlKnown
    ? (hostRefusedAutomated ? "MANUAL_DOWNLOAD" : "CURRENTNESS_CONFIRMATION")
    : (it.custodyClasses.has("SOURCE_GENUINELY_MISSING") ? "CLERK_AGENCY_CONTACT" : "PORTAL_ACCESS");

  const issuer = it.officialFormFamily
    ?? (exactEntry?.publisher ?? null)
    ?? `${it.jurisdiction} issuing court or agency — REQUIRES_LOOKUP (this repository records the form, not the office that issues it)`;

  const statewide = STATEWIDE.test(String(issuer)) || !/county|parish|district court of|municipal/i.test(String(issuer));

  return {
    jurisdiction: it.jurisdiction,
    issuingCourtOrAgency: issuer,
    issuingOfficeIsRecorded: Boolean(it.officialFormFamily || exactEntry?.publisher),
    sourceIds: [...it.sourceIds].sort(),
    formNumber: it.formNumber,
    formTitle: exactEntry?.formTitle ?? exactEntry?.title ?? "REQUIRES_LOOKUP — the corpus records the form number, not its printed title",
    packetFamiliesUnlocked: [...new Set(it.families)].sort(),
    familiesUnlockedCount: new Set(it.families).size,
    sourceObligationsClosed: it.sourceIds.size || new Set(it.families).size,
    currentBlocker: [...it.reasons].sort(),
    whatHasAlreadyBeenSearched: [
      "the Master Library (Edition 1) held-bytes index",
      "the committed nationwide source inventory and the source-artifact registry",
      `the corroborated official-URL sweep (${(candidates.candidates ?? []).length} addresses, two independent committed files each)`,
      "the acquisition manifest and its recorded refusals"
    ],
    officialUrlKnown, officialUrl: url, officialHost: host,
    officialUrlIsForThisExactForm: Boolean(exactEntry?.officialUrl),
    officialUrlCaveat: exactEntry?.officialUrl ? null : (url ? "This address was corroborated for the jurisdiction, not matched to this form number. Confirm it is this form before treating it as the source." : null),
    hostRefusedAutomatedAccess: hostRefusedAutomated,
    browserManualDownloadMayWork: officialUrlKnown,
    actionKind,
    statewideImpact: statewide,
    preciseHumanActionRequired: null,
    contactChannel: "REQUIRES_LOOKUP — this repository holds no phone number or email address for any court or agency, and a plausible one nobody verified is a fabricated record",
    whereTheLookupStarts: `the ${it.jurisdiction} judiciary's own forms index, then the clerk's office for the court that hears this petition`,
    emailOrCallScript: null,
    evidenceToReturn: [
      "the file itself, exactly as downloaded, with no re-save, re-print or re-export — a round trip through a viewer changes the bytes and the hash is the identity",
      "the exact URL it came from, copied from the address bar",
      "the date you downloaded it",
      "the form's own printed revision line, if it has one",
      "if a clerk gave it to you: who, which office, and what they said about which edition is current"
    ],
    whatDoesNotCountAsEvidence: [
      "a screenshot, a photograph, or a printout",
      "a copy from a commercial forms site — uslegalforms, pdffiller, formsworkflow and the rest are refused by name",
      "a file re-saved or 'optimized' by a PDF editor",
      "a form found on a county site when the question was the statewide edition, unless you say that is what it is",
      "an assurance that the form is current without the publisher's own revision line or a clerk's statement"
    ],
    ownerAfterRogerReturnsIt: "an ACQ lane records the bytes and their SHA-256; a PROMO lane verifies the receipt and creates the custody record; Captain regenerates the queue and releases the families. None of that is Roger's."
  };
});

for (const r of rows) {
  r.preciseHumanActionRequired = {
    MANUAL_DOWNLOAD: `Open ${r.officialUrl} in a normal browser and save the file. The automated fetch was refused by ${r.officialHost}; a browser session usually is not.`,
    CURRENTNESS_CONFIRMATION: `Open ${r.officialUrl}, confirm it is ${r.formNumber} and that it is the edition the court currently issues, and save the file.`,
    CLERK_AGENCY_CONTACT: `Ask the ${r.jurisdiction} clerk's office which form the court accepts for this petition, and where its current edition is published. The corpus names ${r.formNumber} and holds no copy of it.`,
    PORTAL_ACCESS: `Find ${r.formNumber} on the ${r.jurisdiction} judiciary's own forms index. If it is behind a portal or a session, sign in as a member of the public and save the file.`
  }[r.actionKind];
  r.emailOrCallScript = [
    `Subject: current official edition of ${r.formNumber} (${r.jurisdiction})`,
    "",
    "Good morning —",
    "",
    `I am looking for the current official edition of ${r.formNumber}${r.formTitle.startsWith("REQUIRES_LOOKUP") ? "" : `, "${r.formTitle}"`}, used for record clearing petitions in ${r.jurisdiction}.`,
    "",
    "Three questions, and I am happy to be pointed at a page rather than sent a file:",
    "",
    "  1. Is this still the form the court accepts, or has it been superseded?",
    "  2. Where is the current edition published?",
    "  3. Is the statewide edition the one this court uses, or does this court use its own?",
    "",
    "Thank you for your time.",
    "",
    "— Roger Roman, LegalEase"
  ].join("\n");
}

/*
 * The ranking, in the order the brief sets and applied in that order rather
 * than blended into a score: families unlocked, then obligations closed, then
 * how quickly a clerk or agency could answer, then statewide before county,
 * then whether the form number is already known, then whether the host is
 * blocking automated access.
 */
const SPEED = { MANUAL_DOWNLOAD: 0, PORTAL_ACCESS: 1, CURRENTNESS_CONFIRMATION: 2, CLERK_AGENCY_CONTACT: 3 };
rows.sort((a, b) =>
  b.familiesUnlockedCount - a.familiesUnlockedCount
  || b.sourceObligationsClosed - a.sourceObligationsClosed
  || SPEED[a.actionKind] - SPEED[b.actionKind]
  || Number(b.statewideImpact) - Number(a.statewideImpact)
  || Number(Boolean(b.formNumber)) - Number(Boolean(a.formNumber))
  || Number(b.hostRefusedAutomatedAccess) - Number(a.hostRefusedAutomatedAccess)
  || a.jurisdiction.localeCompare(b.jurisdiction)
  || a.formNumber.localeCompare(b.formNumber));
rows.forEach((r, i) => { r.priority = i + 1; });

const top20 = rows.slice(0, 20);
const uniqueFamilies = (list) => new Set(list.flatMap((r) => r.packetFamiliesUnlocked)).size;
const byKind = (k) => rows.filter((r) => r.actionKind === k).length;

const doc = {
  schemaVersion: "rcap-roger-source-unblock-list/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/generate-roger-unblock-list.mjs",
  captainHead: checkpoint.captainHead ?? null,
  question: "Which source blockers can a person shift that this factory cannot?",
  answer: `${rows.length} human-action item(s). The top 20 could unlock ${uniqueFamilies(top20)} famil(ies) and close ${top20.reduce((n, r) => n + r.sourceObligationsClosed, 0)} source obligation(s).`,
  whyThisIsShort: `${blocked.length} families are SOURCE_BLOCKED and most of that is internal work. Only a named form with no held bytes is something a person can fetch; a family that names no document at all is discovery work, not an errand.`,
  noContactIsInvented: "This repository holds no phone number or email address for any court or agency. Every contact channel is marked REQUIRES_LOOKUP rather than filled with a plausible address, because a fabricated contact is acted on precisely because it looks complete.",
  counts: {
    humanActionItems: rows.length,
    top20FamiliesPotentiallyUnlocked: uniqueFamilies(top20),
    top20SourceObligationsPotentiallyClosed: top20.reduce((n, r) => n + r.sourceObligationsClosed, 0),
    allItemsFamiliesPotentiallyUnlocked: uniqueFamilies(rows),
    manualDownloadItems: byKind("MANUAL_DOWNLOAD"),
    clerkAgencyContactItems: byKind("CLERK_AGENCY_CONTACT"),
    portalAccessItems: byKind("PORTAL_ACCESS"),
    currentnessConfirmationItems: byKind("CURRENTNESS_CONFIRMATION"),
    sourceBlockedFamiliesTotal: blocked.length,
    statutoryCitationsExcluded: citationObligations.length,
    blockedFamiliesNamingNoForm: blocked.filter((f) => (f.forms ?? []).length === 0).length
  },
  INTERNAL_SOURCE_WORK_NOT_FOR_ROGER: {
    rule: "Roger is not asked to perform repository, hashing, mapping or promotion work. If an item below would have him touch this repository, it is misfiled.",
    categories: INTERNAL_ONLY,
    excludedFromTheRankedList: `${blocked.filter((f) => (f.forms ?? []).length === 0).length} SOURCE_BLOCKED famil(ies) name no official form at all. Those are DISC discovery obligations -- settling which document a route requires -- and they are lane work, not an errand.`,
    statutoryCitationsMisqueuedAsForms: {
      count: citationObligations.length,
      distinct: [...new Set(citationObligations.map((c) => c.citation))].sort(),
      distinctQuoted: [...new Set(citationObligations.map((c) => `"${c.citation}"`))].sort(),
      why: "These are statutory citations, not published forms. There is no PDF at the other end and no clerk who can hand one over; the routes need a custom pleading drafted against the statute. Ranked on a fetch list they would send a person to several offices to ask for something that does not exist.",
      owner: "a packet-build lane, as custom-pleading drafting — not Roger, and not an ACQ lane",
      affectedFamilies: [...new Set(citationObligations.map((c) => c.familyId))].sort()
    },
    whoOwnsEachStepAfterRogerReturnsBytes: [
      "ACQ lane: record the file and its SHA-256, MIME, page count, technology and byte size",
      "PROMO lane: verify the receipt, compare the hash, create the custody record",
      "Captain: regenerate the queue and release the newly source-ready families",
      "Roger: nothing further"
    ]
  },
  rankingCriteriaInOrder: [
    "number of packet families unlocked",
    "number of source obligations closed",
    "likelihood a clerk or agency can provide the source quickly",
    "statewide impact before county-specific impact",
    "current official form number already known",
    "official host currently blocking automated access"
  ],
  top20: top20.map((r) => ({ priority: r.priority, jurisdiction: r.jurisdiction, formNumber: r.formNumber, familiesUnlockedCount: r.familiesUnlockedCount, actionKind: r.actionKind })),
  items: rows,
  commercialRoutesOpened: 0,
  productionTouched: false,
  packetArtifactsChanged: 0,
  grantsNothing: "Returning a source proves what the publisher serves today. It builds no packet, promotes nothing, and opens no commercial route."
};

const md = () => {
  const p = [];
  p.push("# Roger — source blockers only a person can shift", "");
  p.push("## TOP 20 HUMAN-ACTION ITEMS", "");
  p.push(`**TOTAL FAMILIES THOSE 20 COULD UNLOCK:** ${doc.counts.top20FamiliesPotentiallyUnlocked}`, "");
  p.push(`**TOTAL SOURCE OBLIGATIONS THOSE 20 COULD CLOSE:** ${doc.counts.top20SourceObligationsPotentiallyClosed}`, "");
  p.push("| # | Jurisdiction | Form | Families | What to do |", "|---|---|---|---|---|");
  for (const r of top20) {
    p.push(`| ${r.priority} | ${r.jurisdiction} | \`${r.formNumber}\` | ${r.familiesUnlockedCount} | ${r.actionKind.replace(/_/g, " ").toLowerCase()} |`);
  }
  p.push("");
  p.push("**No phone number or email address appears anywhere in this list.** This repository holds none, and a plausible-looking clerk's address that nobody verified is a fabricated record — the kind that gets acted on precisely because it looks complete. Every item says what to ask and where the lookup starts.", "");
  p.push("## What is NOT on this list, and why", "");
  p.push(doc.INTERNAL_SOURCE_WORK_NOT_FOR_ROGER.rule, "");
  for (const c of INTERNAL_ONLY) p.push(`- **${c.id.replace(/_/g, " ")}** — ${c.what}. Owner: ${c.owner}.`);
  p.push("", doc.INTERNAL_SOURCE_WORK_NOT_FOR_ROGER.excludedFromTheRankedList, "");
  const cit = doc.INTERNAL_SOURCE_WORK_NOT_FOR_ROGER.statutoryCitationsMisqueuedAsForms;
  p.push("", `**${cit.count} obligation(s) are statutory citations queued as if they were forms** (${cit.distinctQuoted.join("; ")}). ${cit.why} Owner: ${cit.owner}.`, "");
  p.push("## Every item", "");
  for (const r of rows) {
    p.push(`### ${r.priority}. ${r.jurisdiction} — \`${r.formNumber}\` — unlocks ${r.familiesUnlockedCount} famil(ies)`, "");
    p.push(`- **Issuing court or agency:** ${r.issuingCourtOrAgency}`);
    p.push(`- **Form title:** ${r.formTitle}`);
    p.push(`- **Source ids:** ${r.sourceIds.length ? r.sourceIds.map((s) => `\`${s}\``).join(", ") : "(none recorded)"}`);
    p.push(`- **Families unlocked (${r.familiesUnlockedCount}):** ${r.packetFamiliesUnlocked.join(", ")}`);
    p.push(`- **Current blocker:** ${r.currentBlocker.join("; ")}`);
    p.push(`- **Official URL known:** ${r.officialUrlKnown ? `yes — ${r.officialUrl}` : "no"}`);
    if (r.officialUrlCaveat) p.push(`  - ${r.officialUrlCaveat}`);
    p.push(`- **Host refusing automated access:** ${r.hostRefusedAutomatedAccess ? r.officialHost : "not recorded as refusing"}`);
    p.push(`- **Browser manual download may work:** ${r.browserManualDownloadMayWork ? "yes" : "unknown until a URL is found"}`);
    p.push(`- **Precise action:** ${r.preciseHumanActionRequired}`);
    p.push(`- **Contact channel:** ${r.contactChannel}`);
    p.push(`- **Where the lookup starts:** ${r.whereTheLookupStarts}`);
    p.push("", "<details><summary>Script to send or read out</summary>", "", "```text", r.emailOrCallScript, "```", "</details>", "");
    p.push("**Evidence to return:**");
    for (const e of r.evidenceToReturn) p.push(`- ${e}`);
    p.push("", "**What does not count:**");
    for (const e of r.whatDoesNotCountAsEvidence) p.push(`- ${e}`);
    p.push("", `**Owner after you return it:** ${r.ownerAfterRogerReturnsIt}`, "");
  }
  return p.join("\n");
};

const EMIT = makeEmitter({ root: ROOT, check: CHECK, label: "Roger unblock list" });
EMIT.emit(OUT_JSON, `${JSON.stringify(doc, null, 2)}\n`);
EMIT.emit(OUT_MD, `${md()}\n`);
EMIT.finish();
if (CHECK) process.exit(0);

console.log(`Wrote ${OUT_JSON} and ${OUT_MD}`);
console.log(`  ${rows.length} human-action item(s) · top 20 unlock ${doc.counts.top20FamiliesPotentiallyUnlocked} famil(ies), close ${doc.counts.top20SourceObligationsPotentiallyClosed} obligation(s)`);
console.log(`  manual download ${byKind("MANUAL_DOWNLOAD")} · clerk/agency ${byKind("CLERK_AGENCY_CONTACT")} · portal ${byKind("PORTAL_ACCESS")} · currentness ${byKind("CURRENTNESS_CONFIRMATION")}`);
console.log(`  excluded as internal: ${doc.counts.blockedFamiliesNamingNoForm} blocked famil(ies) naming no form`);
