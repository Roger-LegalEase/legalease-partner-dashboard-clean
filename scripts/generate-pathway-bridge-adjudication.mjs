// Adjudicates the rows the authority finalization flags as
// APPROVED_TRACK_CANDIDATE_FOUND_ADJUDICATION_REQUIRED.
//
// That classification was produced by a lexical candidate finder: a Jaccard
// overlap on the pathway and track names at a 0.34 threshold. A candidate
// finder proposes; it does not decide. Publishing its top hit as a bridge
// assignment claimed an approved track covers a pathway on the strength of
// shared words, and eight of the fourteen were juvenile pathways matched to
// adult tracks because both say "expungement".
//
// This adjudicates each candidate against evidence that can actually refute it:
//
//   1. The legal-authority route record's own statute, compared against the
//      track's controllingAuthority citations. A different title or chapter is
//      a different scheme.
//   2. Population. Juvenile record relief is a separate statutory scheme from
//      adult relief in every state here, heard in a different court.
//   3. Stage. A route the authority records as active_case_admission or
//      enforcement is not served by a track whose eligible dispositions are all
//      post-completion.
//   4. outcomeMode. A route the authority records as referral, automatic_relief,
//      guidance_status or agency_application is not a packet, so no bridge to a
//      packet track can be correct.
//
// Usage: node scripts/generate-pathway-bridge-adjudication.mjs [--check]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const OUT_JSON = "data/rcap-ledger/pathway-bridge-adjudication.json";
const OUT_MD = "docs/record-clearing/PATHWAY_BRIDGE_ADJUDICATION.md";
const MEMO_DIR = "data/record-clearing/legal-design-intake";
const ROUTE_DIR = "src/lib/legal-authority/routes";

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const finalization = readJson("data/rcap-ledger/all51-legal-authority-finalization.json");

// --- the legal-authority route layer -------------------------------------

const routeByKey = new Map();
for (const file of fs.readdirSync(path.join(root, ROUTE_DIR)).sort()) {
  if (!file.endsWith(".json")) continue;
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    if (typeof node.routeKey === "string" && node.outcomeMode !== undefined) {
      routeByKey.set(node.routeKey, { sourceFile: `${ROUTE_DIR}/${file}`, ...node });
      return;
    }
    Object.values(node).forEach(walk);
  };
  walk(readJson(`${ROUTE_DIR}/${file}`));
}

/** Outcome modes in which the participant files nothing the product sells. */
const NON_PACKET_MODES = new Set(["referral", "automatic_relief", "guidance_status", "agency_application"]);
/** Stages at which no post-disposition relief packet can exist yet. */
const PRE_RELIEF_STAGES = new Set(["active_case_admission", "enforcement"]);

// --- the memo layer -------------------------------------------------------

const memoTracks = new Map();
for (const file of fs.readdirSync(path.join(root, MEMO_DIR)).sort()) {
  if (!file.endsWith(".memo.json") || file === "TEMPLATE.memo.json") continue;
  const memo = readJson(`${MEMO_DIR}/${file}`);
  for (const track of memo.tracks) {
    memoTracks.set(`${memo.jurisdiction}:${track.trackId}`, { jurisdiction: memo.jurisdiction, ...track });
  }
}

// --- evidence tests -------------------------------------------------------

/**
 * Reduce citations to comparable keys.
 *
 * Official citations and pathway ids write the same section differently:
 * "Nev. Rev. Stat. § 453.3365" against the pathway id fragment
 * "nrs-453-3365"; "Miss. Code Ann. § 99-19-71(4)" against "99-19-71-4". So the
 * key is the section number with every separator removed, which makes those
 * pairs comparable without deciding in advance which punctuation a source uses.
 *
 * A trailing group in a pathway id is ambiguous: the "4" in "99-19-71-4" is a
 * subsection, while the "3365" in "453-3365" is part of the section. Both
 * readings are emitted, and the subsection reading is recorded separately so a
 * tie between two tracks citing the same section can be broken on it.
 */
function citationKeys(text) {
  // Exact keys come from a citation that states its own section: a § citation,
  // a code-prefixed citation, or a complete hyphen run in a pathway id. Derived
  // keys come from dropping a pathway id's trailing group on the guess that it
  // is a subsection. That guess is right for "9-11-15-3" (§ 9-11-15(3)) and
  // wrong for "99-15-26" (§ 99-15-26, not § 99-15). A derived key therefore
  // collapses § 99-15-26, § 99-15-59 and § 99-15-123 onto one value, so it can
  // suggest a candidate but must never confirm one.
  const exact = new Set();
  const derived = new Set();
  const subsections = new Set();
  const normalized = String(text ?? "").toLowerCase();

  const flatten = (raw) => raw.replace(/[^a-z0-9]/g, "");

  // Explicit section citations: "§ 99-19-71(4)", "§ 453.3365".
  for (const m of normalized.matchAll(/§+\s*([0-9]+[a-z0-9.\-]*)((?:\([a-z0-9]+\))*)/g)) {
    const flat = flatten(m[1].replace(/[.\-]+$/, ""));
    if (flat.length >= 3) exact.add(flat);
    for (const sub of m[2].matchAll(/\(([a-z0-9]+)\)/g)) subsections.add(sub[1]);
  }

  // Citations written without a section symbol: "NRS 453.3365", "AS 12.55.085".
  for (const m of normalized.matchAll(/\b(?:nrs|as|sdcl|orc|rsmo|ors|rcw)\s+([0-9]+[a-z]?[0-9a-z.\-]*)/g)) {
    const flat = flatten(m[1].replace(/[.\-]+$/, ""));
    if (flat.length >= 3) exact.add(flat);
  }

  // Hyphen-flattened citations inside a pathway id: "nrs-453-3365",
  // "cpl-160-58", "wis-stat-938-355-4m", "99-19-71-4". The run must not be
  // bounded by end-of-string: these ids are concatenated with a label before
  // parsing, so the boundary is "not continued by another digit or hyphen".
  for (const m of normalized.matchAll(/(?<![0-9.])((?:\d+[a-z]?-){1,4}\d+[a-z]?)(?![0-9-])/g)) {
    const run = m[1];
    const flat = flatten(run);
    if (flat.length >= 3) exact.add(flat);
    const groups = run.split("-");
    if (groups.length >= 3) {
      const shortened = flatten(groups.slice(0, -1).join("-"));
      if (shortened.length >= 3) derived.add(shortened);
      subsections.add(groups[groups.length - 1]);
    }
  }

  // Titles and chapters, which separate two schemes inside one code.
  for (const m of normalized.matchAll(/\b(\d+)\s+(?:del\. c\.|m\.r\.s\.|u\.s\.c\.|ilcs|pa\.c\.s\.)/g)) exact.add(`title:${m[1]}`);
  for (const m of normalized.matchAll(/\b(?:chapter|ch\.|title)\s+([0-9]+[a-z0-9.\-]*)/g)) exact.add(`title:${flatten(m[1])}`);

  return { exact, derived, subsections, all: new Set([...exact, ...derived]) };
}

/** The leading group of a section number: 938355 and 973015 differ at "9". */
const chapterOf = (key) => key.replace(/^title:/, "").slice(0, 3);

const JUVENILE_SCHEME = /\bjuvenile\b|\bdelinquen|juvenile justice code|youthful offender adjudication/i;
const EXPLICIT_ADULT = /\badult record\b|\bof adult\b|\badult conviction\b|prosecuted as an adult/i;

function isJuvenileText(text) {
  const s = String(text ?? "");
  if (EXPLICIT_ADULT.test(s)) return false;
  return JUVENILE_SCHEME.test(s);
}

/** A track whose eligible dispositions are all post-completion. */
function isPostCompletionOnly(track) {
  const dispositions = track.eligibleDispositions ?? [];
  if (dispositions.length === 0) return false;
  return dispositions.every((d) => /completed|dismissed|discharge|expunged|conviction|disposition/i.test(String(d)))
    && !dispositions.some((d) => /admission|pending|active/i.test(String(d)));
}

// --- adjudication ---------------------------------------------------------

// All forty rows that reach no registry track, not just the fourteen the
// lexical finder happened to score above its threshold. The finder's threshold
// decided which rows got a candidate at all, and a statute-driven test does not
// need the finder's permission to look: MS:nonadjudication-under-99-15-26 and
// the track ms-nonadj cite the same section and the finder never paired them.
const subject = finalization.noTrackRows.rows;

const adjudicated = subject.map((row) => {
  const route = routeByKey.get(row.pathwayKey) ?? null;
  const lexicalTrack = memoTracks.get(`${row.jurisdiction}:${row.candidateTrackId}`) ?? null;

  // Where the lexical finder offered nothing, or offered something the statute
  // refutes, look for a track in the same jurisdiction whose controlling
  // authority cites the same section as the route. That is a stronger signal
  // than a name overlap and it is available for every row, not only the ones
  // that cleared a similarity threshold.
  const routeCitationKeys = citationKeys(`${route?.statute ?? ""} ${row.pathway} ${row.pathwayLabel ?? ""}`);
  const statutoryMatches = routeCitationKeys.all.size === 0 ? [] : [...memoTracks.values()]
    .filter((t) => t.jurisdiction === row.jurisdiction)
    .map((t) => {
      const keys = citationKeys(JSON.stringify(t.controllingAuthority?.citations ?? []));
      return {
        track: t,
        shared: [...keys.all].filter((k) => routeCitationKeys.all.has(k)),
        sharedExact: [...keys.exact].filter((k) => routeCitationKeys.exact.has(k))
      };
    })
    .filter((c) => c.shared.length > 0)
    // Two tracks can cite the same section and differ only in subsection, as
    // ms-nonconv and ms-diversion both do on Miss. Code Ann. § 99-19-71(4).
    // Rank on the subsection the pathway names, but ranking is presentation:
    // where the top rank is tied, the row is reported ambiguous rather than
    // resolved by whichever track the sort happened to put first.
    .map((c) => ({
      ...c,
      subsectionHits: [...routeCitationKeys.subsections].filter((sub) =>
        JSON.stringify(c.track.controllingAuthority?.citations ?? []).toLowerCase().includes(`(${sub})`)).length
    }))
    .sort((a, b) => (b.sharedExact.length - a.sharedExact.length) || (b.subsectionHits - a.subsectionHits) || (b.shared.length - a.shared.length));

  const topRank = statutoryMatches[0];
  const tiedAtTop = statutoryMatches.filter((c) =>
    c.sharedExact.length === topRank?.sharedExact.length
    && c.subsectionHits === topRank?.subsectionHits
    && c.shared.length === topRank?.shared.length);
  const statutoryAmbiguous = tiedAtTop.length > 1;
  const statutoryTrack = topRank?.track ?? null;

  // Statutory corroboration outranks name overlap wherever both exist. The
  // whole error being corrected here came from treating the weaker signal as
  // sufficient, so it does not get to outvote the stronger one.
  const track = statutoryTrack ?? lexicalTrack;
  const candidateSource = statutoryTrack ? "statutory" : (lexicalTrack ? "lexical" : "none");

  const pathwayText = `${row.pathway} ${row.pathwayLabel ?? ""}`;
  const trackText = `${track?.legalName ?? ""} ${track?.publicName ?? ""} ${JSON.stringify(track?.controllingAuthority?.citations ?? [])}`;

  const pathwayCitations = citationKeys(`${route?.statute ?? ""} ${row.pathway} ${row.pathwayLabel ?? ""}`);
  const trackCitations = citationKeys(JSON.stringify(track?.controllingAuthority?.citations ?? []));
  const sharedExact = [...pathwayCitations.exact].filter((k) => trackCitations.exact.has(k));
  const sharedCitations = [...pathwayCitations.all].filter((k) => trackCitations.all.has(k));
  const sharedChapters = [...new Set([...pathwayCitations.all].map(chapterOf))]
    .filter((c) => [...trackCitations.all].some((k) => chapterOf(k) === c));

  const pathwayJuvenile = isJuvenileText(pathwayText);
  const trackJuvenile = isJuvenileText(trackText);

  const disqualifiers = [];
  if (route && NON_PACKET_MODES.has(route.outcomeMode)) {
    disqualifiers.push({
      test: "outcome_mode",
      finding: `The legal-authority route records outcomeMode=${route.outcomeMode} and packetFamily=${JSON.stringify(route.packetFamily)}. The route does not produce a packet, so no bridge to a packet track can be correct.`,
      source: route.sourceFile
    });
  }
  if (route && PRE_RELIEF_STAGES.has(route.stage) && track && isPostCompletionOnly(track)) {
    disqualifiers.push({
      test: "stage",
      finding: `The route is stage=${route.stage} while ${track.trackId} accepts only post-completion dispositions (${(track.eligibleDispositions ?? []).join(", ")}). Binding them would offer relief on a case that has not reached the disposition the track requires.`,
      source: route.sourceFile
    });
  }
  if (pathwayJuvenile && track && !trackJuvenile) {
    disqualifiers.push({
      test: "population",
      finding: `The pathway is juvenile relief and ${track.trackId} (${track.legalName}) is not. Juvenile record relief is a separate statutory scheme heard in a different court; the shared word "expungement" is not coverage.`,
      source: `${MEMO_DIR}/${row.jurisdiction}`
    });
  }
  if (pathwayCitations.all.size > 0 && trackCitations.all.size > 0 && sharedChapters.length === 0) {
    disqualifiers.push({
      test: "statute",
      finding: `The route's statute (${route?.statute ?? row.pathwayLabel}) and ${track?.trackId}'s controlling authority (${(track?.controllingAuthority?.citations ?? []).join("; ")}) share no chapter. They are different schemes.`,
      source: route?.sourceFile ?? `${MEMO_DIR}/${row.jurisdiction}`
    });
  }

  // Tracks in the same jurisdiction that address the same population as the
  // pathway. Used only to say what the jurisdiction already has; never to
  // assert coverage.
  const samePopulationTracks = [...memoTracks.values()]
    .filter((t) => t.jurisdiction === row.jurisdiction && t.trackId !== track?.trackId)
    .filter((t) => isJuvenileText(`${t.legalName ?? ""} ${t.publicName ?? ""} ${JSON.stringify(t.controllingAuthority?.citations ?? [])}`) === pathwayJuvenile)
    .filter(() => pathwayJuvenile);

  let verdict;
  let reason;
  let action;
  if (route && NON_PACKET_MODES.has(route.outcomeMode)) {
    verdict = "NOT_A_BRIDGE_ROUTE_IS_NOT_A_PACKET";
    reason = `The adopted legal-authority record (${route.decisionId ?? "unattributed"} / ${route.ruleId ?? "unattributed"}) already decided this route is ${route.outcomeMode}. ${route.notes ?? ""}`.trim();
    action = "Recategorise the pathway out of paid_packet_intended through the signed reclassification register. No engineering bridge is owed.";
  } else if (!track) {
    verdict = "NO_CANDIDATE_TRACK_EXISTS";
    reason = `No track in ${row.jurisdiction}'s memo shares a statutory citation with this route, and the lexical finder proposed none. The jurisdiction has no legal design for this pathway.`;
    action = `Write the legal design for ${row.pathwayKey}, or record it as intentionally outside product scope through the signed reclassification register.`;
  } else if (disqualifiers.length > 0) {
    verdict = "CANDIDATE_REJECTED";
    reason = `The ${candidateSource} candidate ${track.trackId} is refuted by ${disqualifiers.length} test${disqualifiers.length === 1 ? "" : "s"}: ${disqualifiers.map((d) => d.test).join(", ")}.`;
    // Rejecting the candidate does not mean the jurisdiction is silent. Where a
    // track of the right population exists but is deliberately deferred, the ask
    // is to finish that deferral, not to write a new design from nothing.
    if (samePopulationTracks.length > 0) {
      const deferred = samePopulationTracks.filter((t) => (t.legalDesignDecision?.status ?? t.status) === "legal_research_required");
      action = deferred.length > 0
        ? `Do not bind this pathway to ${track.trackId}. ${row.jurisdiction} already carries ${deferred.map((t) => t.trackId).join(", ")} for this population, deliberately recorded as legal_research_required. Complete that deferred research; do not commission a new design.`
        : `Do not bind this pathway to ${track.trackId}. Re-adjudicate against ${samePopulationTracks.map((t) => t.trackId).join(", ")}, which covers the same population.`;
    } else {
      action = `Do not bind this pathway to ${track.trackId}. ${row.jurisdiction} carries no track for this population at all, so this is new legal design work, not a bridge.`;
    }
  } else if (statutoryAmbiguous && candidateSource === "statutory" && sharedExact.length > 0) {
    verdict = "BRIDGE_AMBIGUOUS_MULTIPLE_TRACKS_SHARE_THE_SECTION";
    reason = `${tiedAtTop.length} tracks in ${row.jurisdiction} cite the same provision as this route and none is distinguished by subsection: ${tiedAtTop.map((c) => c.track.trackId).join(", ")}. Picking one would be an arbitrary choice presented as a finding.`;
    action = `Decide which of ${tiedAtTop.map((c) => c.track.trackId).join(" or ")} covers ${row.pathwayKey}, then bind it. The distinguishing evidence is the eligible disposition, not the citation.`;
  } else if (sharedExact.length > 0 && (track.legalDesignDecision?.status ?? track.status) === "legal_research_required") {
    // The statute matches exactly and the track is still the right one. It is
    // just not finished: its design status is a deliberate deferral. Binding it
    // would ship an unfinished legal design behind a correct citation.
    verdict = "TRACK_MATCHED_BUT_DESIGN_DEFERRED";
    reason = `${track.trackId} cites the same provision as this route (${sharedExact.join(", ")}) and is the correct track, but its design status is legal_research_required.`;
    action = `Complete the deferred legal research on ${track.trackId}, then bind ${row.pathwayKey} to it. Do not commission a new design; the track already exists.`;
  } else if (sharedExact.length > 0 && route) {
    verdict = "BRIDGE_CONFIRMED";
    reason = `The route's statute and ${track.trackId}'s controlling authority cite the same provision (${sharedExact.join(", ")}), the route is outcomeMode=${route.outcomeMode}, and the track's design status is ${track.legalDesignDecision?.status ?? "unrecorded"}.`;
    action = `Bind ${row.pathwayKey} to ${track.trackId} in the track registry.`;
  } else if (sharedExact.length > 0) {
    // The statute corroborates the track, but no adopted legal-authority record
    // says whether this route sells a packet at all. Binding it would assume the
    // answer to the question the route layer exists to answer.
    verdict = "BRIDGE_SUPPORTED_ROUTE_AUTHORITY_SILENT";
    reason = `${track.trackId} and this pathway cite the same provision (${sharedExact.join(", ")}), but no record in ${ROUTE_DIR} covers ${row.pathwayKey}, so its outcomeMode is unestablished.`;
    action = `Add a legal-authority route record for ${row.pathwayKey} stating its outcomeMode and packetFamily, then bind to ${track.trackId}.`;
  } else {
    verdict = "UNDECIDED_INSUFFICIENT_EVIDENCE";
    reason = sharedCitations.length > 0
      ? `${track.trackId} shares only a derived key (${sharedCitations.join(", ")}) with this pathway. A derived key drops a trailing group on the guess that it is a subsection, which collapses distinct sections onto one value, so it suggests a candidate and cannot confirm one.`
      : `No disqualifier fired against ${track.trackId}, but no statutory citation is shared either${route ? "" : " and no legal-authority route record exists for this pathway"}. A name overlap alone is not enough to assert coverage.`;
    action = `Obtain the controlling statute for ${row.pathwayKey} and re-adjudicate. Do not bind on the lexical match.`;
  }

  return {
    pathwayKey: row.pathwayKey,
    jurisdiction: row.jurisdiction,
    pathwayLabel: row.pathwayLabel,
    candidateTrackId: track?.trackId ?? null,
    candidateTrackName: track?.legalName ?? null,
    candidateSource,
    lexicalCandidateTrackId: row.candidateTrackId,
    lexicalMatchScore: row.candidateMatchScore,
    finalizationClassification: row.classification,
    routeAuthority: route
      ? { statute: route.statute, stage: route.stage, outcomeMode: route.outcomeMode, packetFamily: route.packetFamily, decisionId: route.decisionId ?? null, sourceFile: route.sourceFile }
      : null,
    trackCitations: track?.controllingAuthority?.citations ?? [],
    sharedCitationKeys: sharedCitations,
    sharedExactCitationKeys: sharedExact,
    statutoryMatchesAtTopRank: tiedAtTop.map((c) => ({
      trackId: c.track.trackId,
      legalName: c.track.legalName,
      sharedKeys: c.shared,
      eligibleDispositions: c.track.eligibleDispositions ?? []
    })),
    disqualifiers,
    samePopulationTracks: samePopulationTracks.map((t) => ({
      trackId: t.trackId,
      legalName: t.legalName,
      designStatus: t.legalDesignDecision?.status ?? t.status ?? null
    })),
    verdict,
    reason,
    action
  };
});

const counts = {};
for (const row of adjudicated) counts[row.verdict] = (counts[row.verdict] ?? 0) + 1;

const register = {
  schemaVersion: 1,
  generatedBy: "scripts/generate-pathway-bridge-adjudication.mjs",
  question: "The authority finalization published fourteen pathways as approved-track bridges. How many of those candidates survive evidence?",
  correction: "These rows were first published as APPROVED_TRACK_EXISTS_ENGINEERING_BRIDGE_MISSING, assigned by a lexical Jaccard candidate finder at a 0.34 threshold. A candidate finder proposes; it does not decide. This register adjudicates each candidate against the legal-authority route record's statute, stage and outcomeMode, and against the memo track's controlling authority and population.",
  subjectCount: subject.length,
  counts,
  rows: adjudicated
};

const markdown = renderMarkdown(register);
const serialized = `${JSON.stringify(register, null, 2)}\n`;

if (CHECK) {
  const problems = [];
  if (Object.values(counts).reduce((a, b) => a + b, 0) !== adjudicated.length) problems.push("verdicts do not sum to the subject count");
  if (adjudicated.length !== subject.length) problems.push("rows lost between subject and adjudication");
  for (const [rel, expected] of [[OUT_JSON, serialized], [OUT_MD, markdown]]) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) problems.push(`${rel} has not been generated`);
    else if (fs.readFileSync(abs, "utf8") !== expected) problems.push(`${rel} is stale; regenerate it`);
  }
  if (problems.length > 0) {
    console.error("Pathway bridge adjudication failed:");
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`Pathway bridge adjudication verified: ${adjudicated.length} candidates.`);
  process.exit(0);
}

fs.mkdirSync(path.join(root, path.dirname(OUT_JSON)), { recursive: true });
fs.writeFileSync(path.join(root, OUT_JSON), serialized);
fs.writeFileSync(path.join(root, OUT_MD), markdown);
console.log(`Wrote ${OUT_JSON} and ${OUT_MD}`);
console.log(`candidates adjudicated: ${adjudicated.length}`);
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`);

function renderMarkdown(data) {
  const L = [];
  L.push("# Which of the fourteen bridge candidates survive evidence");
  L.push("");
  L.push("**Generated by** `scripts/generate-pathway-bridge-adjudication.mjs`. Do not edit by hand.");
  L.push("");
  L.push(data.correction);
  L.push("");
  L.push("| Verdict | Candidates |");
  L.push("|---|---:|");
  for (const [k, v] of Object.entries(data.counts).sort((a, b) => b[1] - a[1])) L.push(`| ${k} | ${v} |`);
  L.push(`| **TOTAL** | **${data.subjectCount}** |`);
  L.push("");
  for (const verdict of Object.keys(data.counts).sort()) {
    L.push(`## ${verdict}`);
    L.push("");
    for (const row of data.rows.filter((r) => r.verdict === verdict)) {
      L.push(`### \`${row.pathwayKey}\``);
      L.push("");
      L.push(`- **Lexical candidate**: \`${row.candidateTrackId}\` — ${row.candidateTrackName} (score ${row.candidateMatchScore})`);
      if (row.routeAuthority) {
        L.push(`- **Route authority**: ${row.routeAuthority.statute} · stage ${row.routeAuthority.stage} · outcomeMode ${row.routeAuthority.outcomeMode} · packetFamily ${JSON.stringify(row.routeAuthority.packetFamily)}`);
      } else {
        L.push("- **Route authority**: no record");
      }
      if (row.trackCitations.length > 0) L.push(`- **Track authority**: ${row.trackCitations.join("; ")}`);
      for (const d of row.disqualifiers) L.push(`- **Refuted on ${d.test}**: ${d.finding}`);
      L.push(`- **Reason**: ${row.reason}`);
      L.push(`- **Action**: ${row.action}`);
      L.push("");
    }
  }
  return `${L.join("\n")}\n`;
}
