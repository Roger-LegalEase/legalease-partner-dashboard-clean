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
const packetBuilder = read("src/components/expungement-ai/PacketInformationBuilder.tsx");
const reviewPage = read("src/app/briefcase/[packetId]/review/page.tsx");
const matterPage = read("src/app/briefcase/[packetId]/page.tsx");
const briefcaseViews = read("src/components/expungement-ai/BriefcaseViews.tsx");
const checkoutButton = read("src/app/expungement-ai/pay/ConsumerCheckoutButton.tsx");
const generateButton = read("src/components/expungement-ai/PacketGenerateButton.tsx");
const clinicScreening = read("src/app/clinic/[eventSlug]/screening/[state]/page.tsx");
const clinicPrivacy = read("src/components/clinic-mode/ClinicPrivacyBoundary.tsx");
const commercialBrowser = read("scripts/verify-expungement-commercial-browser.mjs");

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
  !reviewPage.includes("<ConsumerCheckoutButton")
    && !reviewPage.includes("<PacketGenerateButton")
    && reviewPage.includes("<PacketVerificationAction"),
  "The review page must render the summary before delegating gated commerce/generation to PacketVerificationAction."
);
requireSource(
  reviewPage.indexOf("<AnswerSection") < reviewPage.indexOf("<PacketVerificationAction"),
  "The complete packet-fact summary must appear before the explicit verification action."
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
  briefcaseViews.includes('role="list"')
    && briefcaseViews.includes('aria-current={isCurrent ? "step" : undefined}')
    && briefcaseViews.includes('role="progressbar"'),
  "The matter stepper must expose list, current-step, and progress semantics."
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

if (failures.length > 0) {
  console.error("Participant screening/verification UX verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Participant screening/verification UX verifier passed.");
console.log("Server-selected screens, facts-before-verification, gated DTC/sponsored actions, accessible progress, and Clinic privacy are preserved.");
