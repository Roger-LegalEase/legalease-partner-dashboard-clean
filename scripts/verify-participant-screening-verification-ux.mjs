import fs from "node:fs";
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
    && screeningFlow.includes('role="alert"')
    && screeningFlow.includes('aria-live="assertive"'),
  "A failed dynamic-screen transition must retain the current answers and announce an in-place retry error."
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
  }
}

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
requireSource(
  verificationAction.includes('action: "verify"')
    && verificationAction.includes("verified === true")
    && verificationAction.includes("current === true"),
  "Final verification must send an explicit verify action and require a current verified response."
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

const summaryPath = "src/components/expungement-ai/verification-summary.ts";
const summaryExists = fs.existsSync(path.join(root, summaryPath));
requireSource(summaryExists, "The review must use a localized verificationSummary adapter instead of a hard-coded field subset.");
if (summaryExists) {
  const summaryModule = await import("../src/components/expungement-ai/verification-summary.ts");
  const summary = summaryModule.verificationSummary({
    stateName: "Mississippi",
    pathwayLabel: "Non-conviction expungement",
    screeningAnswers: {
      jurisdiction: "MS",
      pathway_id: "server-path",
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
    builderQuestions: [{ id: "editable_packet_fact" }]
  });
  const answerRows = [...summary.screeningAnswers, ...summary.packetAnswers];
  requireSource(
    JSON.stringify(summary.context) === JSON.stringify([
      { id: "jurisdiction", label: "State", value: "Mississippi" },
      { id: "pathway_id", label: "Record-clearing option", value: "Non-conviction expungement" }
    ]),
    "Verification summary must expose canonical state and pathway context."
  );
  requireSource(
    JSON.stringify(answerRows.map((row) => row.id)) === JSON.stringify([
      "route_answer",
      "hidden_screening_fact",
      "shared_answer",
      "editable_packet_fact",
      "read_only_packet_fact"
    ]) && new Set(answerRows.map((row) => row.id)).size === answerRows.length,
    "Verification summary must render every available screening/packet answer exactly once, with packet values winning duplicates."
  );
  requireSource(
    answerRows.find((row) => row.id === "shared_answer")?.value === "Packet value"
      && answerRows.find((row) => row.id === "editable_packet_fact")?.editId === "editable_packet_fact"
      && answerRows.find((row) => row.id === "read_only_packet_fact")?.editId === null
      && summary.screeningAnswers.every((row) => row.editId === null),
    "Only builder-owned packet facts may expose edit links."
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
    && reviewPage.indexOf("summary.screeningAnswers") < reviewPage.indexOf("<PacketVerificationAction"),
  "The complete packet-fact summary must appear before the explicit verification action."
);
requireSource(
  reviewPage.includes("entry.editId ?")
    && !reviewPage.includes('row("Full legal name"')
    && !reviewPage.includes('row("Asking about"'),
  "Review edit links must be limited to editable packet facts, and summary rows must not be a hard-coded subset."
);
requireSource(
  reviewPage.includes('sponsored ? "Covered by your partner program"')
    && reviewPage.includes('sponsored ? "No consumer payment"'),
  "Sponsored review summary must use coverage copy and never show the consumer price."
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
    && partnerCommercialBrowser.includes("Your packet is covered by your partner program."),
  "The sponsored browser proof must follow the current Briefcase CTA and coverage copy."
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
