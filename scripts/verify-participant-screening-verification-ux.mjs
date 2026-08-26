import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const requireSource = (condition, message) => {
  if (!condition) failures.push(message);
};

const screeningFlow = read("src/components/expungement-ai/screening/ScreeningFlow.tsx");
const screensSource = read("src/components/expungement-ai/screening/screens.ts");
const screeningResult = read("src/components/expungement-ai/screening/ScreeningResult.tsx");
const localizationSource = read("src/lib/expungement-ai/localization.ts");
const packetBuilder = read("src/components/expungement-ai/PacketInformationBuilder.tsx");
const reviewPage = read("src/app/briefcase/[packetId]/review/page.tsx");
const matterPage = read("src/app/briefcase/[packetId]/page.tsx");
const briefcaseViews = read("src/components/expungement-ai/BriefcaseViews.tsx");
const checkoutButton = read("src/app/expungement-ai/pay/ConsumerCheckoutButton.tsx");
const generateButton = read("src/components/expungement-ai/PacketGenerateButton.tsx");
const clinicScreening = read("src/app/clinic/[eventSlug]/screening/[state]/page.tsx");
const clinicPrivacy = read("src/components/clinic-mode/ClinicPrivacyBoundary.tsx");
const commercialBrowser = read("scripts/verify-expungement-commercial-browser.mjs");
const partnerCommercialBrowser = read("scripts/verify-rcap-commercial-browser.mjs");

requireSource(
  screeningFlow.includes('fetch("/api/expungement-ai/screening/progress"'),
  "ScreeningFlow must request the server-selected screening progress contract."
);
requireSource(
  screeningFlow.includes("screensFromQuestionIds") && !screeningFlow.includes("deriveScreens(load.profile)"),
  "ScreeningFlow must render only server-selected question IDs, not derive the live screen list locally."
);
requireSource(
  screeningFlow.includes("selectionError && questionIds === null")
    && /function MalformedProfileState[\s\S]*?role="alert"[^>]*aria-live="assertive"/.test(screeningFlow),
  "An initial progress-request failure must be announced by the fail-closed retry state."
);
requireSource(
  screensSource.includes("export function screensFromQuestionIds"),
  "screens.ts must expose the small ordered question-ID projection adapter."
);
requireSource(
  screensSource.includes("export function sanitizeAnswersForQuestionIds"),
  "screens.ts must expose the branch-answer sanitizer used by every downstream answer sink."
);
requireSource(
  screeningFlow.includes("const sanitizedAnswers = sanitizeAnswersForQuestionIds")
    && screeningFlow.includes("setAnswers(sanitizedAnswers)")
    && screeningFlow.includes("runEvaluation(sanitizedAnswers)")
    && screeningFlow.includes("setEvaluatedAnswers(answerSnapshot)")
    && screeningFlow.includes("toScreeningAnswers(evaluatedAnswers ?? answers)")
    && /async function handleSaveProgress[\s\S]*?answers: sanitizedAnswers/.test(screeningFlow),
  "A server-pruned branch must replace client answers before evaluation, save/resume, or pending-result persistence."
);
requireSource(
  screeningFlow.includes("if (resumedFromStorage) window.sessionStorage.removeItem")
    && screeningFlow.indexOf("if (!selectedIds)") < screeningFlow.indexOf("if (resumedFromStorage) window.sessionStorage.removeItem"),
  "Resume storage must remain intact through a failed progress request and clear only after selection succeeds."
);

const screensModule = await import("../src/components/expungement-ai/screening/screens.ts");
if (typeof screensModule.screensFromQuestionIds === "function") {
  const profile = {
    jurisdiction: { code: "TS", name: "Test", slug: "test" },
    profileVersion: "test-v1",
    terminology: { primaryConsumerTerm: "record clearing", allowedStateTerms: [] },
    flowStages: [
      { id: "scope", order: 1, screenType: "question_sequence" },
      { id: "case_details", order: 2, screenType: "form_fields" }
    ],
    questions: [
      { id: "first", stage: "scope", prompt: "First?", type: "text", required: true, contextOnly: false },
      { id: "second", stage: "scope", prompt: "Second?", type: "text", required: true, contextOnly: false },
      { id: "packet_only", stage: "case_details", prompt: "Packet?", type: "text", required: true, contextOnly: false }
    ]
  };
  const selected = screensModule.screensFromQuestionIds(profile, ["second", "unknown", "first", "second", "packet_only"]);
  requireSource(
    JSON.stringify(selected.map((question) => question.id)) === JSON.stringify(["second", "first"]),
    "The server-selected adapter must preserve server order while dropping unknown, duplicate, and postpay IDs."
  );

  if (typeof screensModule.sanitizeAnswersForQuestionIds === "function") {
    const routeAAnswers = {
      route_splitter: "route-b",
      universal_current: "keep this",
      route_a_detail: "stale branch answer",
      hidden_server_fact: "preserve this"
    };
    const routeASelectedAnswers = screensModule.sanitizeAnswersForQuestionIds(
      routeAAnswers,
      ["route_splitter", "universal_current", "route_a_detail"],
      ["route_splitter", "universal_current", "route_a_detail"]
    );
    const routeBAnswers = screensModule.sanitizeAnswersForQuestionIds(
      routeASelectedAnswers,
      ["route_splitter", "universal_current", "route_a_detail"],
      ["route_splitter", "universal_current", "route_b_detail"]
    );
    requireSource(
      JSON.stringify(routeBAnswers) === JSON.stringify({
        route_splitter: "route-b",
        universal_current: "keep this",
        hidden_server_fact: "preserve this"
      }),
      "Route A -> back -> Route B must drop only the pruned Route A answer while preserving current universal answers and hidden server facts."
    );

    requireSource(
      typeof screensModule.sanitizeResumedAnswersForQuestionIds === "function",
      "Resume must sanitize stored answers against every renderable screening question before restoring client state."
    );
    if (typeof screensModule.sanitizeResumedAnswersForQuestionIds === "function") {
      const resumedRouteB = screensModule.sanitizeResumedAnswersForQuestionIds(
        {
          ...profile,
          questions: [
            ...profile.questions,
            { id: "route_splitter", stage: "scope", prompt: "Route?", type: "text", required: true, contextOnly: false },
            { id: "universal_current", stage: "scope", prompt: "Universal?", type: "text", required: true, contextOnly: false },
            { id: "route_a_detail", stage: "scope", prompt: "Route A?", type: "text", required: true, contextOnly: false },
            { id: "route_b_detail", stage: "scope", prompt: "Route B?", type: "text", required: true, contextOnly: false }
          ]
        },
        routeAAnswers,
        ["route_splitter", "universal_current", "route_b_detail"]
      );
      requireSource(
        JSON.stringify(resumedRouteB) === JSON.stringify({
          route_splitter: "route-b",
          universal_current: "keep this",
          hidden_server_fact: "preserve this"
        }),
        "A Route B resume must immediately prune the stored Route A UI answer while retaining selected universal and never-rendered stable facts."
      );
    }
  }
}
requireSource(
  screeningFlow.includes("sanitizeResumedAnswersForQuestionIds")
    && /setAnswers\(sanitizedResumedAnswers\)/.test(screeningFlow),
  "ScreeningFlow must restore the sanitized resume snapshot, never the raw stored answer payload."
);

requireSource(
  !packetBuilder.includes("save(index >= questions.length - 1)") && packetBuilder.includes("await save(false)"),
  "The final packet-fact save must remain unverified."
);
requireSource(
  packetBuilder.includes("Review packet facts") && !packetBuilder.includes("Review for accuracy"),
  "Packet information must route to a distinct packet-fact review rather than claim accuracy verification."
);

const verificationPath = "src/components/expungement-ai/PacketVerificationAction.tsx";
const verificationExists = fs.existsSync(path.join(root, verificationPath));
requireSource(verificationExists, "PacketVerificationAction.tsx must provide the explicit final verification action.");
const verificationAction = verificationExists ? read(verificationPath) : "";
const verificationClientPath = "src/components/expungement-ai/packet-verification-client.ts";
const verificationClientExists = fs.existsSync(path.join(root, verificationClientPath));
requireSource(verificationClientExists, "Final verification must use a focused client for the Lane B request/response boundary.");
requireSource(
  verificationAction.includes("verificationAnswers")
    && verificationAction.includes("requestPacketVerification")
    && verificationAction.includes("readyToGenerate"),
  "Final verification must submit the reviewed answers and require Lane B's readyToGenerate response."
);
requireSource(
  verificationAction.includes("initiallyVerified")
    && verificationAction.includes("ConsumerCheckoutButton")
    && verificationAction.includes("PacketGenerateButton")
    && verificationAction.includes("packetReady")
    && verificationAction.includes("Open my packet"),
  "Checkout and sponsored generation must live behind the verified review action."
);
requireSource(
  verificationAction.includes('role="alert"') && verificationAction.includes('aria-live="assertive"'),
  "Verification failures must be announced by a live alert region."
);
requireSource(
  verificationAction.includes("sponsoredReviewCopy(verified)")
    && verificationAction.includes("Packet facts verified and current")
    && verificationAction.includes("Complete final verification"),
  "Sponsored review copy must change after verification without introducing consumer commerce language."
);

if (verificationClientExists) {
  const { requestPacketVerification } = await import("../src/components/expungement-ai/packet-verification-client.ts");
  const observed = { body: null, method: null, path: null };
  const boundary = http.createServer(async (request, response) => {
    observed.method = request.method;
    observed.path = request.url;
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    observed.body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const valid = request.method === "POST"
      && request.url === "/api/expungement-ai/briefcase/matter%2F1/packet-information"
      && JSON.stringify(observed.body) === JSON.stringify({ answers: { court: "Hinds County Circuit Court" }, verify: true });
    response.writeHead(valid ? 200 : 400, { "content-type": "application/json" });
    response.end(JSON.stringify(valid
      ? { ok: true, readyToGenerate: true, reviewReason: "authoritative_route_confirmed", missingInputIds: [] }
      : { ok: false, readyToGenerate: false, reviewReason: "invalid_request" }));
  });
  await listen(boundary);
  try {
    const address = boundary.address();
    const endpoint = `http://127.0.0.1:${address.port}/api/expungement-ai/briefcase/matter%2F1/packet-information`;
    const result = await requestPacketVerification({
      itemId: "matter/1",
      answers: { court: "Hinds County Circuit Court" },
      endpoint
    });
    requireSource(
      observed.method === "POST"
        && JSON.stringify(observed.body) === JSON.stringify({ answers: { court: "Hinds County Circuit Court" }, verify: true })
        && result.readyToGenerate === true,
      "The verification client must cross an HTTP handler boundary with answers + verify:true and consume readyToGenerate."
    );
  } finally {
    await close(boundary);
  }
}

const summaryPath = "src/components/expungement-ai/verification-summary.ts";
const summaryExists = fs.existsSync(path.join(root, summaryPath));
requireSource(summaryExists, "The review must use a localized verificationSummary adapter instead of a hard-coded field subset.");
if (summaryExists) {
  const summaryModule = await import("../src/components/expungement-ai/verification-summary.ts");
  const canonicalFacts = [
    { key: "screeningAnswers:hidden_screening_fact", id: "hidden_screening_fact", label: "Hidden screening fact", value: "Visible fact", source: "screeningAnswers", systemContext: false },
    { key: "screeningAnswers:route_answer", id: "route_answer", label: "Route answer", value: "Route B", source: "screeningAnswers", systemContext: false },
    { key: "screeningAnswers:shared_answer", id: "shared_answer", label: "Shared answer", value: "Screening value", source: "screeningAnswers", systemContext: false },
    { key: "prefilledAnswers:read_only_packet_fact", id: "read_only_packet_fact", label: "Read-only packet fact", value: "Read only", source: "prefilledAnswers", systemContext: false },
    { key: "packetAnswers:editable_packet_fact", id: "editable_packet_fact", label: "Editable packet fact", value: "Editable", source: "packetAnswers", systemContext: false },
    { key: "packetAnswers:shared_answer", id: "shared_answer", label: "Shared packet answer", value: "Packet value", source: "packetAnswers", systemContext: false },
    { key: "serverFacts:jurisdiction", id: "jurisdiction", label: "Jurisdiction", value: "MS", source: "serverFacts", systemContext: true },
    { key: "serverFacts:pathway_id", id: "pathway_id", label: "Pathway", value: "server-path", source: "serverFacts", systemContext: true },
    { key: "serverFacts:server_confirmed_balance", id: "server_confirmed_balance", label: "Server-confirmed balance", value: "Satisfied", source: "serverFacts", systemContext: false }
  ];
  const model = {
    stateName: "Mississippi",
    pathwayLabel: "Non-conviction expungement",
    screeningAnswers: {
      route_answer: "Route B",
      shared_answer: "Screening value",
      hidden_screening_fact: "Visible fact"
    },
    initialAnswers: {
      shared_answer: "Packet value",
      editable_packet_fact: "Editable",
      read_only_packet_fact: "Read only"
    },
    questions: [
      { id: "shared_answer", prompt: "Shared answer?" },
      { id: "editable_packet_fact", prompt: "Editable packet fact?" },
      { id: "read_only_packet_fact", prompt: "Read-only packet fact?" }
    ],
    builderQuestions: [{ id: "editable_packet_fact" }],
    verificationSummary: canonicalFacts
  };
  const summary = summaryModule.verificationSummary(model);
  requireSource(summary !== null, "A complete Lane B canonical verification summary must be accepted.");
  if (summary) {
  const answerRows = [...summary.screeningAnswers, ...summary.packetAnswers];
  requireSource(
    JSON.stringify(summary.context.map((row) => row.key)) === JSON.stringify([
      "serverFacts:jurisdiction",
      "serverFacts:pathway_id"
    ]),
    "Verification summary must render Lane B's canonical state and pathway context."
  );
  requireSource(
    JSON.stringify(answerRows.map((row) => row.key)) === JSON.stringify([
      "screeningAnswers:hidden_screening_fact",
      "screeningAnswers:route_answer",
      "screeningAnswers:shared_answer",
      "prefilledAnswers:read_only_packet_fact",
      "packetAnswers:editable_packet_fact",
      "packetAnswers:shared_answer",
      "serverFacts:server_confirmed_balance"
    ]) && new Set([...summary.context, ...answerRows].map((row) => row.key)).size === canonicalFacts.length,
    "Verification review must render every canonical snapshot fact exactly once in server order."
  );
  requireSource(
    answerRows.find((row) => row.key === "packetAnswers:editable_packet_fact")?.editId === "editable_packet_fact"
      && answerRows.find((row) => row.key === "prefilledAnswers:read_only_packet_fact")?.editId === null
      && summary.screeningAnswers.every((row) => row.editId === null),
    "Only builder-owned packet answer facts may expose edit links."
  );
  }
  const missingCanonicalFact = summaryModule.verificationSummary({
    ...model,
    verificationSummary: canonicalFacts.filter((fact) => fact.key !== "screeningAnswers:hidden_screening_fact")
  });
  requireSource(
    missingCanonicalFact === null && summaryModule.verificationSummary({ ...model, verificationSummary: undefined }) === null,
    "Review must fail closed when Lane B's canonical verification summary is absent or incomplete for model-visible hashed facts."
  );
}
requireSource(
  !reviewPage.includes("<ConsumerCheckoutButton")
    && !reviewPage.includes("<PacketGenerateButton")
    && reviewPage.includes("<PacketVerificationAction"),
  "The review page must render the summary before delegating gated commerce/generation to PacketVerificationAction."
);
requireSource(
  reviewPage.includes("verificationSummary(model)")
    && reviewPage.includes("summary.screeningAnswers")
    && reviewPage.includes("summary.packetAnswers")
    && reviewPage.includes("verificationAnswers={model.initialAnswers}")
    && reviewPage.includes("canVerify={summary.complete")
    && reviewPage.indexOf("summary.screeningAnswers") < reviewPage.indexOf("<PacketVerificationAction"),
  "The complete server-canonical summary must appear before, and gate, the explicit verification action."
);
requireSource(
  reviewPage.includes("entry.editId ?")
    && !reviewPage.includes('row("Full legal name"')
    && !reviewPage.includes('row("Asking about"'),
  "Review edit links must be limited to editable packet facts, and summary rows must not be a hard-coded subset."
);
requireSource(
  reviewPage.includes('sponsored ? "Covered by your partner program"')
    && reviewPage.includes("{!sponsored ? <SummaryLine label=\"Cost\"")
    && !reviewPage.includes('sponsored ? "No consumer payment"'),
  "Sponsored review summary must use coverage copy without rendering a consumer cost row."
);
requireSource(
  matterPage.includes('"facts_complete"')
    && matterPage.includes("factsComplete")
    && matterPage.includes("Final verification"),
  "The exact matter must route facts_complete matters to final verification."
);

requireSource(
  screeningResult.includes('fallback: "Save to my Briefcase and continue"'),
  "Packet-ready result CTAs must describe the actual Briefcase handoff."
);
requireSource(
  /role="progressbar"[\s\S]*?<\/div>\s*<ol[^>]*role="list"/.test(briefcaseViews)
    && briefcaseViews.includes('aria-current={isCurrent ? "step" : undefined}')
    && briefcaseViews.includes('role="list"'),
  "The matter stepper must expose sibling progressbar and ordered-list semantics plus a current step."
);
requireSource(
  /status === "error"[\s\S]*?role="alert"[^>]*aria-live="assertive"/.test(screeningFlow),
  "Save-progress failures must be announced by an assertive live alert."
);
requireSource(
  checkoutButton.includes('role="alert"') && checkoutButton.includes('aria-live="assertive"'),
  "Checkout errors must use a live alert region."
);
requireSource(
  generateButton.includes('role="alert"') && generateButton.includes('aria-live="assertive"'),
  "Packet-generation errors must use a live alert region."
);

requireSource(
  clinicScreening.includes("ClinicPrivacyBoundary") && clinicScreening.includes("initialSessionId={screeningSessionId}"),
  "Clinic screening must retain its participant-owned privacy wrapper and sponsored session authority."
);
requireSource(
  clinicPrivacy.includes("End clinic session / Reset device") && clinicPrivacy.includes("INACTIVITY_LIMIT_MS"),
  "Clinic shared-device reset and inactivity protections must remain reachable."
);
requireSource(
  !/\$50|stripe|before you pay/i.test(verificationAction.match(/function sponsoredReviewCopy[\s\S]*?\n}/)?.[0] ?? ""),
  "Sponsored verification copy must not mention price, payment, or Stripe."
);
requireSource(
  commercialBrowser.includes('getByRole("button", { name: "I verified these packet facts" })')
    && commercialBrowser.includes("Checkout was requested before explicit final verification.")
    && commercialBrowser.includes("verificationResponsePromise"),
  "The commercial browser verifier must prove checkout is absent until the explicit verification request succeeds."
);
requireSource(
  partnerCommercialBrowser.includes('getByRole("button", { name: "Save to my Briefcase and continue"')
    && partnerCommercialBrowser.includes("Your packet is covered by your partner program.")
    && partnerCommercialBrowser.includes("generationRequests.length === 0")
    && partnerCommercialBrowser.includes('getByRole("button", { name: "I verified these packet facts"')
    && partnerCommercialBrowser.includes('getByRole("button", { name: "Generate my packet"'),
  "The sponsored browser proof must cross review/verification/generation and prove generation is absent before verification."
);
requireSource(
  !screeningResult.includes("result.partner_no_pay")
    && screeningResult.includes("Your packet is covered by your partner program.")
    && localizationSource.includes('"result.partner_covered"')
    && localizationSource.includes("Su paquete está cubierto por su programa asociado."),
  "Sponsored result copy must describe coverage without mentioning consumer payment."
);

if (failures.length > 0) {
  console.error("Participant screening/verification UX verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Participant screening/verification UX verifier passed.");
console.log("Server-selected screens, facts-before-verification, gated DTC/sponsored actions, accessible progress, and Clinic privacy are preserved.");

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}
