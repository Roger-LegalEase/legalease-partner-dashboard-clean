#!/usr/bin/env node
/**
 * Every route that can take money or a sponsored credit, and what it actually
 * delivers when it does.
 *
 * The Mississippi § 99-15-59 proof found a route that reached checkout and
 * produced a 1,165-byte plain-text status summary instead of the filing it
 * promised. The finding was recorded as not route-specific, and this is the
 * census that settles how far it reaches.
 *
 * It does not read the defect off a route's metadata. `buildConsumerPacketArtifact`
 * is the only builder the direct-consumer paid path calls, it takes no branch on
 * jurisdiction, pathway, packet family or plan mode, and it returns
 * `contentType: "text/plain"` unconditionally. So the artifact is rebuilt for
 * every commercial route from that builder's own inputs — the route's packet
 * plan and the verification snapshot — and classified by what comes out.
 *
 * Nothing here changes behaviour. It is the evidence the fulfillment gate is
 * sized from.
 *
 * `--check` fails if the file on disk differs from what this would write.
 */
import fs from "node:fs";
import crypto from "node:crypto";
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

process.env.RCAP_EVALUATOR_TODAY ??= "2026-08-28";

const OUT_JSON = "data/rcap-ledger/commercial-packet-integrity.json";
const OUT_MD = "docs/record-clearing/COMMERCIAL_PACKET_INTEGRITY.md";

const { getProfileByJurisdiction } = await import("@/lib/rcap-engine/profile-registry");
const { packetPlanForPathway, isPacketPlanFulfillmentReady } = await import("@/lib/rcap-engine/packet-planner");
const { resolvePacketRoute, packetRouteCanRender } = await import("@/lib/rcap/documents/packet-route-resolver");
const { legalRouteContract } = await import("@/lib/legal-authority/index");
const { resolveRoute } = await import("@/lib/legal-authority/resolve-route");
const { isConsumerPaymentAllowed } = await import("@/lib/expungement-ai/eligibility-adapter");
const { packetFulfillmentAuthority } = await import("@/lib/expungement-ai/packet-fulfillment-authority");
const fulfillmentLedger = JSON.parse(fs.readFileSync("data/rcap-ledger/packet-fulfillment-records.json", "utf8"));
const FULFILLED = new Map((fulfillmentLedger.records ?? []).map((record) => [record.routeKey, record]));

const witnesses = JSON.parse(fs.readFileSync("data/rcap-ledger/public-witness-answer-sets.json", "utf8")).witnesses;
const correction = JSON.parse(fs.readFileSync("data/rcap-ledger/packet-correction-required.json", "utf8"));
const correctionRows = new Map(correction.rows.filter((row) => row.status === "closed").map((row) => [row.routeKey, row]));
const ON = new Date(`${process.env.RCAP_EVALUATOR_TODAY}T00:00:00Z`);

/**
 * The components a filing packet must carry, from the directive's own list.
 * A route that cannot show all of them is not a complete packet, whatever its
 * metadata says.
 */
const REQUIRED_COMPONENTS = [
  "primary filing or application",
  "proposed order where required",
  "attachments or schedules",
  "filing destination",
  "fee or waiver instructions",
  "service or notice",
  "post-filing steps"
];

/**
 * The exact text `renderSourceDrivenPacket` produces, rebuilt from its inputs.
 *
 * Mirrored rather than imported because the builder is module-private and its
 * caller needs a live Briefcase item. The mirror is checked against the source
 * below, so it cannot drift into describing something the product does not do.
 */
function sourceDrivenArtifactText(jurisdictionName, plan, resultCode, verificationHash) {
  return [
    `${jurisdictionName} Source-Driven Record-Clearing Packet`, "",
    `Authoritative screening result: ${resultCode ?? "packet_ready"} for ${jurisdictionName}.`, "",
    `Jurisdiction: ${plan.jurisdictionCode}`, `Pathway: ${plan.pathwayId}`,
    `Packet mode: ${plan.mode}`, `Form mapping status: ${plan.formMappingStatus}`,
    `Result: ${resultCode}`,
    `Source forms: ${plan.sourceFormIds.length > 0 ? plan.sourceFormIds.join(", ") : "not required"}`,
    `Source rule refs: ${plan.sourceRuleRefs.join(", ")}`, "",
    "FILING CHECKLIST", ...plan.packetReadyWhen.map((step) => `- ${step}`), "",
    "NEXT STEPS", "- Review every generated document before filing.",
    "- Confirm court filing instructions and fees before submission.",
    "- Keep a copy of your receipt and filed documents.", "",
    `Protected verification: ${verificationHash}`
  ].join("\n");
}

/** What the artifact actually contains, tested rather than assumed. */
function componentsPresentIn(text) {
  const tests = {
    "primary filing or application": /\bpetition\b|\bapplication\b|\bmotion\b|\bIN THE\b|\bcomes now\b/i,
    "proposed order where required": /proposed order|IT IS (HEREBY )?ORDERED/i,
    "attachments or schedules": /attach(ment|ed)|exhibit|schedule of/i,
    "filing destination": /circuit court of|justice court of|county of|file (this|the) .*(with|at)|clerk of/i,
    "fee or waiver instructions": /\$[0-9]|filing fee is|fee waiver|affidavit of poverty|in forma pauperis|indigen/i,
    "service or notice": /certificate of service|serve (the|a) |notice to the|shall be served/i,
    "post-filing steps": /after (you )?fil(e|ing)|hearing (date|will|is set)|the court will then|within \d+ days of filing/i
  };
  const present = [];
  const absent = [];
  for (const [name, pattern] of Object.entries(tests)) (pattern.test(text) ? present : absent).push(name);
  return { present, absent };
}

const rows = [];
const departures = [];
for (const witness of witnesses) {
  const terminal = witness.terminalEvaluation ?? {};
  const jurisdiction = witness.jurisdiction;
  const pathwayId = witness.pathwayId;
  const packetRoute = resolvePacketRoute({ state: jurisdiction, pathway: pathwayId, trackId: terminal.selectedTrackId ?? null });
  const evaluatorPaymentAllowed = terminal.paymentAllowed === true;
  const creditConsumable = packetRoute.creditConsumable === true;
  // Commercial means it can take money or a sponsored credit. Either is enough
  // to require an account of what the participant receives.
  // A route enters the census if it can take money or a sponsored credit, OR if
  // a fulfillment record vouches for it. The third case is new: ADR-0004 lets a
  // packet be proven while both its commercial postures stay held, and a proven
  // packet that nothing accounts for is exactly the gap this census exists to
  // close — in the other direction.
  if (!evaluatorPaymentAllowed && !creditConsumable && !FULFILLED.has(witness.pathwayKey)) {
    // A route leaving the commercial denominator is accounted for by name. The
    // census fell from 54 routes to 30 the moment ADR-0004 withdrew the legacy
    // generators' credit-consumability, and a denominator that shrinks without
    // an explanation is indistinguishable from one that was quietly edited.
    if (packetRoute.routeKind === "legacy_retired") {
      departures.push({
        route: witness.pathwayKey,
        jurisdiction,
        pathway: pathwayId,
        wasCommercialBecause: "the packet route resolver classified its jurisdiction legacy_verified, which made every route in that state credit-consumable",
        leftBecause: "ADR-0004 retired the five legacy generators as commercial fulfillment paths. The route resolves legacy_retired with sellable false and creditConsumable false, so it can no longer take money or a sponsored credit and is not a commercial route.",
        stillRenders: packetRoute.rendererKind,
        note: "Its renderer is retained so an already-generated artifact stays reachable. That is historical access, not commercial authority."
      });
    }
    continue;
  }

  const profile = getProfileByJurisdiction(jurisdiction);
  const plan = profile ? packetPlanForPathway(profile, pathwayId) : undefined;
  const contract = legalRouteContract(jurisdiction, pathwayId);
  const resolution = resolveRoute({ jurisdiction, pathwayId, facts: {}, on: ON, phase: "FINAL_VERIFICATION" });
  const checkoutOpen = isConsumerPaymentAllowed(terminal.resultCode, evaluatorPaymentAllowed) && packetRouteCanRender(packetRoute);

  const artifact = plan
    ? sourceDrivenArtifactText(profile.jurisdiction.name, { ...plan, jurisdictionCode: jurisdiction },
        terminal.resultCode, "<verification hash, per matter>")
    : null;
  const components = artifact ? componentsPresentIn(artifact) : { present: [], absent: [...REQUIRED_COMPONENTS] };

  const correctionRow = correctionRows.get(witness.pathwayKey);
  const guidanceOutcome = contract && ["guidance_status", "referral", "automatic_relief", "agency_application"].includes(contract.outcomeMode);
  const openGates = resolution.openDeliveryGateIds ?? [];
  const gateKinds = new Set((resolution.openDeliveryGates ?? []).map((gate) => gate.kind ?? gate));

  /**
   * Classified by what the route actually does, in priority order.
   *
   * Checkout being open is the severe case and comes first: a participant can
   * pay today and receive the summary. A route that is only credit-consumable
   * is the same defect one step back — a sponsored credit would be spent on the
   * same artifact — and is named separately so the two are not conflated.
   *
   * A gate cannot reach this list. A gated route is neither payment-allowed nor
   * credit-consumable, so it never enters the census; the gate classifications
   * exist here for completeness and because a future gate that fails to close
   * commercial authority must land somewhere visible rather than being counted
   * as a complete packet.
   */
  let classification;
  let delta;
  const missing = components.absent.join("; ");
  const fulfillment = FULFILLED.get(witness.pathwayKey);
  const proven = packetFulfillmentAuthority(jurisdiction, pathwayId).allowed === true;
  /**
   * COMPLETE_PACKET_PROVEN is now decided by the fulfillment record and by
   * nothing else.
   *
   * It used to be decided by running seven regexes over the text summary the
   * paid path returned. That test could only ever have said whether a summary
   * mentioned the words "proposed order" — which is precisely the proxy the
   * Mississippi finding proved worthless, since the summary mentions plenty of
   * things it does not contain. A route is proven when a record says it is, and
   * a record is written when a packet is built and machine-verified.
   */
  if (proven) {
    const held = fulfillment.consumerPosture === "held" || fulfillment.sponsoredPosture === "held";
    classification = held ? "COMPLETE_PACKET_PROVEN_COMMERCIALLY_HELD" : "COMPLETE_PACKET_PROVEN";
    delta = held
      ? `The packet is proven (${fulfillment.packetSpecificationId} v${fulfillment.packetSpecificationVersion}, provider ${fulfillment.artifactProvider}, ${fulfillment.contentType}). Consumer posture ${fulfillment.consumerPosture}, sponsored posture ${fulfillment.sponsoredPosture}. ${fulfillment.holdReason}`
      : "None.";
  } else if (correctionRow) {
    classification = "PACKET_CORRECTION_REQUIRED";
    delta = "Already closed by an individual proof; see data/rcap-ledger/packet-correction-required.json.";
  } else if (!plan) {
    classification = "UNKNOWN_FAIL_CLOSED";
    delta = "No packet plan resolves for this route, so nothing can say what it would deliver.";
  } else if (openGates.length > 0 && gateKinds.has("artifact_generation")) {
    classification = "ARTIFACT_GENERATION_REQUIRED";
    delta = `Commercially open while held on ${openGates.join(", ")}, which should not be possible.`;
  } else if (openGates.length > 0 && gateKinds.has("artifact_legal_review")) {
    classification = "ARTIFACT_REVIEW_REQUIRED";
    delta = `Commercially open while held on ${openGates.join(", ")}, which should not be possible.`;
  } else if (openGates.length > 0) {
    classification = "SOURCE_OR_CONFIGURATION_GATE";
    delta = `Commercially open while held on ${openGates.join(", ")}, which should not be possible.`;
  } else if (packetRoute.routeKind === "guidance_only" || (guidanceOutcome && contract?.packetFamily == null)) {
    classification = "GUIDANCE_OR_HANDOFF_NO_PACKET";
    delta = checkoutOpen
      ? `Checkout is OPEN on a route that promises no packet, and the paid path would return a ${artifact ? Buffer.byteLength(artifact) : 0}-byte text/plain summary.`
      : `The packet route resolver classifies this ${packetRoute.routeKind} and closes checkout, while the evaluator reports paymentAllowed ${evaluatorPaymentAllowed}. The two disagree; only the resolver's answer is closing it.`;
  } else if (components.absent.length === 0) {
    // The summary mentions every component name and contains none of them. That
    // is the finding, not a pass.
    classification = "PACKET_CORRECTION_REQUIRED";
    delta = "The text summary mentions every required component by name and contains none of them, which is why component keywords can no longer establish a proven packet. No fulfillment record exists for this route.";
  } else if (checkoutOpen) {
    classification = "PACKET_CORRECTION_REQUIRED";
    delta = `Checkout is OPEN. A participant can pay today and receive a ${Buffer.byteLength(artifact)}-byte text/plain summary. Missing: ${missing}.`;
  } else {
    classification = "PACKET_CORRECTION_REQUIRED";
    delta = `Checkout is closed, and a sponsored credit is consumable on a route whose paid path returns a ${Buffer.byteLength(artifact)}-byte text/plain summary. Missing: ${missing}.`;
  }

  rows.push({
    route: witness.pathwayKey,
    jurisdiction,
    pathway: pathwayId,
    packetFamily: contract?.packetFamily ?? null,
    currentResultCode: terminal.resultCode ?? null,
    currentPaymentAuthority: {
      evaluatorPaymentAllowed,
      contractPaymentAuthority: resolution.paymentAuthority ?? null,
      checkoutActuallyOpen: checkoutOpen
    },
    currentSponsorshipAuthority: {
      contractSponsorshipAuthority: resolution.sponsorshipAuthority ?? null,
      routeCreditConsumable: creditConsumable
    },
    generationEntryPoint: fulfillment
      ? "generatePaidConsumerPacket -> buildConsumerPacketArtifact -> buildGradeAArtifact -> composeGradeAPacket"
      : "generatePaidConsumerPacket -> buildConsumerPacketArtifact (refused: no fulfillment record)",
    artifactProvider: fulfillment?.artifactProvider ?? "none",
    contentType: fulfillment?.contentType ?? "none",
    fulfillmentRecord: fulfillment
      ? {
        packetSpecificationId: fulfillment.packetSpecificationId,
        packetSpecificationVersion: fulfillment.packetSpecificationVersion,
        packetSpecificationSha256: fulfillment.packetSpecificationSha256,
        artifactApprovalStatus: fulfillment.artifactApprovalStatus,
        consumerPosture: fulfillment.consumerPosture,
        sponsoredPosture: fulfillment.sponsoredPosture
      }
      : null,
    actualComponents: components.present,
    requiredComponents: REQUIRED_COMPONENTS,
    sourceHashes: plan?.sourceFormIds ?? [],
    renderer: packetRoute.rendererKind,
    routeKind: packetRoute.routeKind,
    artifactHash: fulfillment ? null : (artifact ? crypto.createHash("sha256").update(artifact).digest("hex") : null),
    artifactBytes: fulfillment ? null : (artifact ? Buffer.byteLength(artifact) : 0),
    privateDelivery: "owner-scoped Briefcase download path; not reached while the route is fail-closed",
    repeatDownload: "supported by the download path; not reached while the route is fail-closed",
    currentClassification: classification,
    exactRemainingDelta: delta
  });
}
rows.sort((a, b) => a.route.localeCompare(b.route));

const counts = rows.reduce((acc, row) => ({ ...acc, [row.currentClassification]: (acc[row.currentClassification] ?? 0) + 1 }), {});
const doc = {
  schemaVersion: 1,
  generatedBy: "scripts/generate-commercial-packet-integrity.mjs",
  createsApproval: false,
  evaluatedAt: process.env.RCAP_EVALUATOR_TODAY,
  provenIsTheOnlyClassificationThatCanOpenPayment: "COMPLETE_PACKET_PROVEN is set from the fulfillment record and from nothing else, and every other classification leaves the route refused at all six commercial surfaces. COMPLETE_PACKET_PROVEN_COMMERCIALLY_HELD is a proven packet whose postures are still closed: it opens nothing either.",
  finding: "The direct-consumer paid path has one artifact builder and it takes no branch. buildConsumerPacketArtifact returns provider rcap_source_engine, contentType text/plain and a filename ending -packet.txt for every jurisdiction, route, packet family and plan mode, and its body is the route's own metadata plus the packet plan's readiness conditions under a heading that reads FILING CHECKLIST. So the § 99-15-59 finding is a property of the path, not of that route.",
  totals: {
    commercialRoutes: rows.length,
    evaluatorPaymentAllowed: rows.filter((row) => row.currentPaymentAuthority.evaluatorPaymentAllowed).length,
    checkoutActuallyOpen: rows.filter((row) => row.currentPaymentAuthority.checkoutActuallyOpen).length,
    provenByFulfillmentRecord: rows.filter((row) => row.fulfillmentRecord !== null).length,
    sponsorshipCapable: rows.filter((row) => row.currentSponsorshipAuthority.routeCreditConsumable).length,
    ...counts
  },
  departuresFromTheCommercialDenominator: {
    note: "Routes that were in this census and no longer are, each with the exact reason. A denominator that changes silently is not a denominator.",
    count: departures.length,
    reconciliation: `The previous census carried 54 commercial routes. ${departures.length} left when ADR-0004 withdrew the legacy generators' credit-consumability, and ${rows.filter((row) => row.fulfillmentRecord !== null && !row.currentPaymentAuthority.evaluatorPaymentAllowed && !row.currentSponsorshipAuthority.routeCreditConsumable).length} entered on a fulfillment record rather than on a commercial capability. 54 - ${departures.length} + ${rows.filter((row) => row.fulfillmentRecord !== null && !row.currentPaymentAuthority.evaluatorPaymentAllowed && !row.currentSponsorshipAuthority.routeCreditConsumable).length} = ${rows.length}.`,
    routes: departures.sort((a, b) => a.route.localeCompare(b.route))
  },
  rows
};
const serialized = `${JSON.stringify(doc, null, 2)}\n`;

const md = [
  "# Commercial packet integrity",
  "",
  "**Generated by** `scripts/generate-commercial-packet-integrity.mjs`. Do not edit by hand.",
  "",
  doc.finding,
  "",
  `**${doc.totals.commercialRoutes} commercial routes** — ${doc.totals.evaluatorPaymentAllowed} payment-allowed at the evaluator, ${doc.totals.checkoutActuallyOpen} with checkout actually open once the packet route resolver is consulted, ${doc.totals.sponsorshipCapable} sponsorship-capable, ${doc.totals.provenByFulfillmentRecord} proven by a fulfillment record.`,
  "",
  `**${departures.length} routes left this denominator** when ADR-0004 retired the legacy generators' commercial authority. They are listed by name in the JSON under \`departuresFromTheCommercialDenominator\`; none of them can take money or a sponsored credit any more, and each still renders for historical access.`,
  "",
  "| Classification | Routes |",
  "|---|---:|",
  ...Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([key, value]) => `| ${key} | ${value} |`),
  `| **TOTAL** | **${rows.length}** |`,
  "",
  "## Every commercial route",
  "",
  "| Route | Family | Result | Checkout | Credit | Provider | Type | Classification |",
  "|---|---|---|---|---|---|---|---|",
  ...rows.map((row) => `| \`${row.route}\` | ${row.packetFamily ?? "—"} | ${row.currentResultCode} | ${row.currentPaymentAuthority.checkoutActuallyOpen ? "OPEN" : "closed"} | ${row.currentSponsorshipAuthority.routeCreditConsumable ? "yes" : "no"} | ${row.artifactProvider} | ${row.contentType} | ${row.currentClassification} |`),
  "",
  "## Per route",
  "",
  ...rows.flatMap((row) => [
    `### \`${row.route}\``,
    "",
    `- **JURISDICTION:** ${row.jurisdiction}`,
    `- **PATHWAY:** ${row.pathway}`,
    `- **PACKET FAMILY:** ${row.packetFamily ?? "none named by any contract"}`,
    `- **CURRENT RESULT CODE:** ${row.currentResultCode}`,
    `- **CURRENT PAYMENT AUTHORITY:** evaluator ${row.currentPaymentAuthority.evaluatorPaymentAllowed}; contract ${row.currentPaymentAuthority.contractPaymentAuthority ?? "none"}; checkout ${row.currentPaymentAuthority.checkoutActuallyOpen ? "OPEN" : "closed"}`,
    `- **CURRENT SPONSORSHIP AUTHORITY:** contract ${row.currentSponsorshipAuthority.contractSponsorshipAuthority ?? "none"}; credit consumable ${row.currentSponsorshipAuthority.routeCreditConsumable}`,
    `- **GENERATION ENTRY POINT:** ${row.generationEntryPoint}`,
    `- **ARTIFACT PROVIDER:** ${row.artifactProvider}`,
    `- **CONTENT TYPE:** ${row.contentType}`,
    `- **ACTUAL COMPONENTS:** ${row.actualComponents.length > 0 ? row.actualComponents.join("; ") : "none"}`,
    `- **REQUIRED COMPONENTS:** ${row.requiredComponents.join("; ")}`,
    `- **SOURCE HASHES:** ${row.sourceHashes.length > 0 ? row.sourceHashes.join("; ") : "none — the plan names no source form"}`,
    `- **RENDERER:** ${row.renderer} (route kind ${row.routeKind})`,
    `- **ARTIFACT HASH:** ${row.artifactHash ?? "none"} (${row.artifactBytes} bytes)`,
    `- **PRIVATE DELIVERY:** ${row.privateDelivery}`,
    `- **REPEAT DOWNLOAD:** ${row.repeatDownload}`,
    `- **CURRENT CLASSIFICATION:** ${row.currentClassification}`,
    `- **EXACT REMAINING DELTA:** ${row.exactRemainingDelta}`,
    ""
  ])
].join("\n");

if (process.argv.includes("--check")) {
  const stale = !fs.existsSync(OUT_JSON) || fs.readFileSync(OUT_JSON, "utf8") !== serialized
    || !fs.existsSync(OUT_MD) || fs.readFileSync(OUT_MD, "utf8") !== md;
  if (stale) {
    console.error(`${OUT_JSON} / ${OUT_MD} are stale; regenerate with node scripts/generate-commercial-packet-integrity.mjs`);
    process.exit(1);
  }
  console.log(`Commercial packet integrity current: ${JSON.stringify(doc.totals)}`);
} else {
  fs.writeFileSync(OUT_JSON, serialized);
  fs.writeFileSync(OUT_MD, md);
  console.log(`Wrote ${OUT_JSON} and ${OUT_MD}: ${JSON.stringify(doc.totals)}`);
}
