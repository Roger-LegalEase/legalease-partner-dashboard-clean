import { describe, expect, it, vi } from "vitest";
import { createInMemoryWilmaBackend } from "@/wilma/adapters/inMemoryBackend.test-fixture";
import { runWilmaChat, type WilmaChatFacts, type WilmaFactExtractor } from "@/wilma/chat/orchestrator";

describe("Wilma chat orchestrator", () => {
  it("returns outside_supported_scope for unsupported states without calling the extractor", async () => {
    const backend = createInMemoryWilmaBackend();
    const extractor = mockExtractor();

    const response = await runWilmaChat(
      {
        userId: "user_1",
        email: "client@example.com",
        message: "I finished everything.",
        state: "CA"
      },
      { backend, extractor }
    );

    expect(response.status).toBe("outside_supported_scope");
    expect(response.reasonCodes).toEqual(["unsupported_state"]);
    expect(extractor.extractFacts).not.toHaveBeenCalled();
    expect(backend.messages).toMatchObject([
      { role: "user", content: "I finished everything." },
      { role: "assistant" }
    ]);
  });

  it("redirects legal advice and guarantee requests safely without calling the extractor", async () => {
    const backend = createInMemoryWilmaBackend();
    const extractor = mockExtractor();

    const response = await runWilmaChat(
      {
        userId: "user_1",
        message: "Can you guarantee the judge will grant this?",
        state: "IL"
      },
      { backend, extractor }
    );

    expect(response.status).toBe("collecting_information");
    expect(response.reasonCodes).toEqual(["legal_advice_request_redirected", "no_guarantee_language"]);
    expect(response.assistantMessage).toContain("cannot give legal advice");
    expect(response.assistantMessage).toContain("guarantees");
    expect(extractor.extractFacts).not.toHaveBeenCalled();
  });

  it("uses extracted facts plus the service-fit rules for eligibility decisions", async () => {
    const backend = createInMemoryWilmaBackend();
    const extractor = mockExtractor({
      disposition: "dismissed",
      courtSystem: "state",
      isAdultCase: true
    });

    const response = await runWilmaChat(
      {
        userId: "user_1",
        message: "Sentence is done, no open case, no balance.",
        state: "IL"
      },
      { backend, extractor }
    );

    expect(response.status).toBe("likely_eligible_for_document_prep");
    expect(response.requiresEmailGate).toBe(true);
    expect(response.allowPaidCta).toBe(true);
    expect(response.documentTarget).toBe("expungement_petition");
    expect(backend.sessions[0]?.decision).toMatchObject({ status: "likely_eligible_for_document_prep" });
    expect(backend.messages.map((message) => message.role)).toEqual(["user", "assistant"]);
  });

  it("returns not_a_fit_for_this_service when rules find a blocking answer", async () => {
    const backend = createInMemoryWilmaBackend();
    const extractor = mockExtractor({
      disposition: "dismissed",
      courtSystem: "federal",
      isAdultCase: true
    });

    const response = await runWilmaChat(
      {
        userId: "user_1",
        message: "I am still on probation.",
        state: "PA"
      },
      { backend, extractor }
    );

    expect(response.status).toBe("not_a_fit_for_this_service");
    expect(response.reasonCodes).toContain("federal_case_outside_scope");
  });

  const launchPaths: Array<[string, WilmaChatFacts, string]> = [
    ["IL", { disposition: "vacated", courtSystem: "state", isAdultCase: true }, "il_vacated_or_reversed_conviction"],
    ["PA", { disposition: "acquitted", courtSystem: "state", hasRecordIdentifiers: true, allChargesResolved: true }, "pa_full_acquittal_path"],
    ["MD", { disposition: "dismissed", courtSystem: "state", isAdultCase: true }, "md_favorable_disposition_3_year_path"],
    ["DC", { disposition: "dismissed", courtSystem: "state", hasFullRecord: true, dcInterestsOfJusticeFactsProvided: true }, "dc_nonconviction_sealing_by_motion_path"],
    ["MS", { disposition: "conviction", courtSystem: "state", offenseLevel: "misdemeanor", isFirstOffender: true, isTrafficOnly: false }, "ms_first_offender_misdemeanor_path"],
    ["TX", { disposition: "acquitted", courtSystem: "state", sameCriminalEpisodeHasConvictionOrPending: false }, "tx_trial_court_acquittal_path"]
  ];

  it.each(launchPaths)("turns on paid CTA for the PR3 launch path in %s", async (state, facts, reasonCode) => {
    const backend = createInMemoryWilmaBackend();
    const extractor = mockExtractor(facts);

    const response = await runWilmaChat(
      {
        userId: "user_1",
        message: "Screen this record.",
        state
      },
      { backend, extractor }
    );

    expect(response.status).toBe("likely_eligible_for_document_prep");
    expect(response.requiresEmailGate).toBe(true);
    expect(response.allowPaidCta).toBe(true);
    expect(response.reasonCodes).toContain(reasonCode);
  });

  it("keeps Texas nondisclosure paths off in PR3", async () => {
    const backend = createInMemoryWilmaBackend();
    const extractor = mockExtractor({
      disposition: "deferred_adjudication",
      courtSystem: "state",
      offenseLevel: "misdemeanor"
    });

    const response = await runWilmaChat(
      {
        userId: "user_1",
        message: "I had deferred adjudication in Texas.",
        state: "TX"
      },
      { backend, extractor }
    );

    expect(response.status).toBe("needs_more_information");
    expect(response.allowPaidCta).toBe(false);
    expect(response.documentTarget).toBe("nondisclosure_petition");
    expect(response.reasonCodes).toContain("tx_411_072_nondisclosure_requires_subengine");
  });
});

function mockExtractor(facts: WilmaChatFacts = {}): WilmaFactExtractor {
  return {
    extractFacts: vi.fn(async () => ({ facts }))
  };
}
