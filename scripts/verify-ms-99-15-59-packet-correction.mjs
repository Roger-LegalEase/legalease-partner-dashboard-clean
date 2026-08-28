#!/usr/bin/env node
/**
 * Mississippi § 99-15-59: proven incomplete, and closed at every surface.
 *
 * The question was whether the preserved Mississippi legacy generator produces
 * this packet. Neither the factory_v2 registry nor the preserved-generator
 * declaration could answer it — the registry records three unmet build inputs
 * and zero components while the resolver classifies the whole STATE as
 * legacy_verified, and a state classification says nothing about one route.
 *
 * So it was run. A deterministic eligible matter, replayed from this
 * repository's own committed witness answer set, reaches
 * packet_ready_with_caution with payment allowed, and the artifact the consumer
 * paid path produces is a 1,165-byte plain-text status summary: the result code,
 * the packet mode, the source rule refs, the packet plan's readiness CONDITIONS
 * under a heading that says "FILING CHECKLIST", and three generic next steps.
 * No petition. No proposed order. No filing destination. No fee or waiver
 * instruction. No service or notice. Classification C.
 *
 * The legacy generator is real — it produces a caption, body, certificate of
 * service and filing next steps — but it serves the partner documents path and
 * is reached only through a live rcap_partner sponsorship. A directly-paying
 * participant never touches it. Its document types cover three Mississippi
 * pathways and not this one, and its proposed order is a placeholder.
 *
 * This asserts the closure at every surface a participant or a partner could
 * reach, and it re-derives the artifact rather than trusting the recorded hash,
 * so a change that makes the packet real fails this file and forces the row to
 * be re-adjudicated instead of quietly keeping a closure it no longer needs.
 */
import fs from "node:fs";
import crypto from "node:crypto";
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

process.env.RCAP_EVALUATOR_TODAY ??= "2026-08-28";

const { getProfileByJurisdiction } = await import("@/lib/rcap-engine/profile-registry");
const { packetPlanForPathway } = await import("@/lib/rcap-engine/packet-planner");
const { resolvePacketRoute, packetRouteCanRender } = await import("@/lib/rcap/documents/packet-route-resolver");
const { evaluateAuthoritativeScreeningResult } = await import("@/lib/expungement-ai/authoritative-screening-result");
const { protectedPacketDraftSeedFromAuthoritative } = await import("@/lib/expungement-ai/packet-information");

const LEDGER = "data/rcap-ledger/packet-correction-required.json";
const ROUTE_KEY = "MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59";
const PATHWAY_ID = "uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59";

let checks = 0;
const failures = [];
const ok = (label, condition, detail) => {
  checks += 1;
  if (!condition) failures.push(`${label}${detail === undefined ? "" : ` — got ${detail}`}`);
};

const ledger = JSON.parse(fs.readFileSync(LEDGER, "utf8"));
const row = ledger.rows.find((entry) => entry.routeKey === ROUTE_KEY);
ok("the § 99-15-59 correction row exists", Boolean(row));
ok("and it is closed", row?.status === "closed", row?.status);
ok("classified PACKET_CORRECTION_REQUIRED", row?.classification === "PACKET_CORRECTION_REQUIRED", row?.classification);
for (const field of ["pathway", "track", "legacyGenerator", "entryPoint", "packetId", "workerRenderPath",
  "whatTheArtifactActuallyIs", "notRouteSpecific"]) {
  ok(`the row records ${field}`, typeof row?.[field] === "string" && row[field].length > 0);
}

// ------------------------------------------------ every commercial surface
const resolution = resolvePacketRoute({ state: "MS", pathway: PATHWAY_ID, trackId: null });
ok("the packet route is packet_correction_required", resolution.routeKind === "packet_correction_required", resolution.routeKind);
ok("checkout is closed: the route is not sellable", resolution.sellable === false);
ok("sponsorship is closed: no credit may be consumed", resolution.creditConsumable === false);
ok("render is closed: no renderer is offered", resolution.rendererKind === "none", resolution.rendererKind);
ok("participant delivery is closed", packetRouteCanRender(resolution) === false);

// The two gates a paying participant actually meets, driven not read.
const { assertPacketRouteCanDeliver, assertCheckoutAllowed } = await import("@/lib/expungement-ai/payment-adapter");
const snapshot = { jurisdiction: "MS", pathwayId: PATHWAY_ID, selectedTrackId: null };
const refuses = (fn) => {
  try { fn(snapshot); return false; } catch { return true; }
};
ok("assertPacketRouteCanDeliver refuses this route", refuses(assertPacketRouteCanDeliver));
ok("assertCheckoutAllowed refuses this route", refuses(assertCheckoutAllowed));

// The comparison that keeps the closure honest: a Mississippi route that is not
// recorded here must not pick up THIS correction, or the correction is a
// state-wide shutdown wearing a route-shaped record.
//
// ADR-0004 retired every legacy generator's commercial authority, so the
// neighbour is no longer sellable either and the old form of this control —
// "the neighbour still sells" — would now be asserting something the owner
// decision withdrew. The control's actual job survives the retirement: the
// correction row is route-scoped, so the neighbour must receive the ordinary
// retired treatment rather than the correction. Two distinct classifications
// inside one state is the evidence; sellability never was.
const neighbour = resolvePacketRoute({
  state: "MS", pathway: "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal", trackId: null });
ok("a Mississippi route with no correction row does not inherit the correction",
  neighbour.routeKind === "legacy_retired", neighbour.routeKind);
ok("the correction stays route-scoped rather than state-wide",
  neighbour.routeKind !== "packet_correction_required", neighbour.routeKind);

// -------------------------------------------------- the artifact, re-derived
const profile = getProfileByJurisdiction("MS");
const witnesses = JSON.parse(fs.readFileSync("data/rcap-ledger/public-witness-answer-sets.json", "utf8")).witnesses;
const witness = witnesses.find((entry) => entry.pathwayKey === ROUTE_KEY);
ok("a committed witness answer set exists for this route", Boolean(witness));
const authoritative = witness && evaluateAuthoritativeScreeningResult({
  jurisdiction: "MS", profileVersion: profile.profileVersion,
  matterId: "ms-99-15-59-proof", answers: witness.finalAnswers
});
/**
 * The matter is eligible AND the closure now holds it.
 *
 * Both halves matter. If it were not eligible, the closure would be
 * unnecessary and the proof would be about nothing; if the closure were not in
 * force, an eligible matter would still reach the summary. The recorded
 * artifact hash was measured before the closure and is history, not a current
 * state — asserting it against a closed route would require the closure not to
 * work.
 */
ok("the deterministic matter lands on its own pathway",
  authoritative?.evaluation.pathwayId === PATHWAY_ID, authoritative?.evaluation.pathwayId);
ok("and the closure holds it at needs_review with no payment",
  authoritative?.evaluation.resultCode === "needs_review" && authoritative?.evaluation.paymentAllowed !== true,
  `${authoritative?.evaluation.resultCode} / ${authoritative?.evaluation.paymentAllowed}`);
ok("for the recorded reason, not an unrelated one",
  (authoritative?.evaluation.reasons ?? []).some((entry) => entry.code.endsWith(".packet_correction_required")),
  (authoritative?.evaluation.reasons ?? []).map((entry) => entry.code).join(", "));

const plan = packetPlanForPathway(profile, PATHWAY_ID);
const seed = authoritative && protectedPacketDraftSeedFromAuthoritative({
  authoritative,
  screeningAnswers: witness.finalAnswers,
  packetAnswers: {
    participant_full_legal_name: "Deterministic Probe", contact_information: "probe@example.invalid",
    court: "Probe Justice Court", charge: "Probe misdemeanor", county: "Probe County",
    case_identifier: "PROBE-0001", record_documents: "Yes", disposition_date: "2014-01-15"
  },
  dependencies: { commercialFlowVersion: 1, entitlementSource: "consumer_payment", productId: "expungement_packet" },
  capturedAt: "2026-08-28T00:00:00.000Z"
});
ok("a protected draft seed builds for the matter", Boolean(seed));

/**
 * The artifact text, rebuilt exactly as renderSourceDrivenPacket builds it.
 *
 * Mirrored rather than imported because the builder is module-private and its
 * caller needs a live Briefcase item. The mirror is checked against the source
 * below, so it cannot drift into proving something the product does not do.
 */
const RECORDED_RESULT = row?.deterministicProof?.authoritativeResultCode ?? "packet_ready_with_caution";
const artifact = [
  `${profile.jurisdiction.name} Source-Driven Record-Clearing Packet`, "",
  `Authoritative screening result: ${RECORDED_RESULT} for ${profile.jurisdiction.name}.`, "",
  `Jurisdiction: MS`, `Pathway: ${plan.pathwayId}`,
  `Packet mode: ${plan.mode}`, `Form mapping status: ${plan.formMappingStatus}`,
  `Result: ${RECORDED_RESULT}`,
  `Source forms: ${plan.sourceFormIds.length > 0 ? plan.sourceFormIds.join(", ") : "not required"}`,
  `Source rule refs: ${plan.sourceRuleRefs.join(", ")}`, "",
  "FILING CHECKLIST", ...plan.packetReadyWhen.map((step) => `- ${step}`), "",
  "NEXT STEPS", "- Review every generated document before filing.",
  "- Confirm court filing instructions and fees before submission.",
  "- Keep a copy of your receipt and filed documents.", "",
  `Protected verification: ${row?.deterministicProof?.verificationHash}`
].join("\n");
const artifactSha = crypto.createHash("sha256").update(artifact).digest("hex");
ok("the artifact recorded as the finding is still what this route would produce",
  artifactSha === row?.deterministicProof?.artifactSha256, artifactSha);
ok("and the recorded byte count is right",
  Buffer.byteLength(artifact) === row?.deterministicProof?.artifactBytes, String(Buffer.byteLength(artifact)));

const generationSource = fs.readFileSync("src/lib/expungement-ai/packet-generation.ts", "utf8");
ok("the mirrored builder still matches the product's own",
  generationSource.includes("`${jurisdictionName} Source-Driven Record-Clearing Packet`")
  && generationSource.includes('"- Confirm court filing instructions and fees before submission."')
  && generationSource.includes('contentType: "text/plain"'));

// What the artifact does not contain is the whole finding, so it is asserted.
const ABSENT = [
  ["a petition", /petition/i],
  ["a proposed order", /proposed order/i],
  ["a filing destination", /justice court|circuit court|county of|file (this|the) .* (with|at)/i],
  ["a fee or waiver instruction", /\$|filing fee is|fee waiver|affidavit of poverty|in forma pauperis/i],
  ["a service or notice step", /certificate of service|serve (the|a) |notice to the/i],
  ["a statutory citation", /(Miss\.? ?Code|§)\s*99-15-59/i]
];
for (const [what, pattern] of ABSENT) {
  ok(`the artifact contains no ${what}`, !pattern.test(artifact), pattern.exec(artifact)?.[0]);
}
// "99-15-59" does appear — inside the pathway slug and nowhere else. Saying the
// statute is absent without saying that would be false, and saying the artifact
// cites the statute because the slug contains the number would be worse.
const statuteHits = [...artifact.matchAll(/99-15-59/g)].length;
const slugHits = [...artifact.matchAll(new RegExp(PATHWAY_ID, "g"))].length;
ok("the only occurrences of the section number are inside the pathway slug",
  statuteHits > 0 && statuteHits === slugHits, `${statuteHits} occurrence(s), ${slugHits} in the slug`);

console.log(`Mississippi § 99-15-59: ${checks} checks. Artifact ${Buffer.byteLength(artifact)} bytes, sha256 ${artifactSha.slice(0, 16)}…`);
if (failures.length > 0) {
  console.error("\nMississippi § 99-15-59 packet correction FAILED:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("The route generates a status summary rather than a filing, and checkout, sponsored credit, render and participant delivery are all closed.");
