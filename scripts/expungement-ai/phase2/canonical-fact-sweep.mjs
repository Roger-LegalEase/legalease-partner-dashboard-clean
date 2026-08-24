/**
 * UX-GLOBAL-004 proof sweep.
 *
 * For every jurisdiction and every packet-producing pathway, builds a matter the
 * way the product does (screening answers + saved packet plan), then records
 * what the packet questionnaire would ask, what it would carry forward, and what
 * it would report missing. Run on the product base and on the correction; the
 * two snapshots are diffed to show that the only movement is questions leaving
 * the ask-list because the participant already answered them.
 */
import {
  getAllJurisdictionProfiles,
  projectPublicProfile,
  deriveScreens,
  packetPlanForPathway,
  answerFor,
  stableJson,
  writeArtifact
} from "../flow-audit/lib/engine.mjs";

const packetInformation = await import("../../../src/lib/expungement-ai/packet-information.ts");

function screeningAnswersFor(profile) {
  const pub = projectPublicProfile(profile);
  const answers = {};
  for (const question of deriveScreens(pub)) {
    answers[question.id] = answerFor(question, question.id);
  }
  return answers;
}

function itemFor(profile, pathway, plan, answers) {
  return {
    id: `sweep-${profile.jurisdiction.code}-${pathway.id}`,
    type: "result",
    title: `${profile.jurisdiction.name} matter`,
    state: profile.jurisdiction.code,
    status: "action_needed",
    resultCode: "packet_ready",
    createdAt: "2026-07-01T00:00:00.000Z",
    summary: "",
    nextSteps: [],
    paymentAllowed: true,
    packetReady: false,
    pathwayLabel: pathway.label ?? pathway.id,
    artifactRefs: {
      commercialFlow: {
        screening: {
          profileVersion: profile.profileVersion,
          screeningMatterId: `sweep-${profile.jurisdiction.code}`,
          pathwayId: pathway.id,
          pathwayLabel: pathway.label ?? pathway.id,
          packetPlan: plan,
          answers
        },
        packetInformation: {
          stage: "not_started",
          requiredInputIds: plan.requiredInputIds,
          serverFacts: {},
          prefilledAnswers: {},
          answers: {},
          missingInputIds: [],
          updatedAt: null,
          reviewedAt: null
        }
      }
    }
  };
}

const rows = [];
for (const profile of getAllJurisdictionProfiles()) {
  const answers = screeningAnswersFor(profile);
  for (const pathway of profile.pathways ?? []) {
    const plan = packetPlanForPathway(profile, pathway.id);
    if (!plan) continue;
    const item = itemFor(profile, pathway, plan, answers);
    let model = null;
    let error = null;
    try {
      model = packetInformation.packetInformationModelFor(item);
    } catch (cause) {
      error = String(cause?.message ?? cause);
    }
    rows.push({
      jurisdiction: profile.jurisdiction.code,
      pathwayId: pathway.id,
      error,
      screeningAnswerCount: Object.keys(answers).length,
      questionIds: model ? model.questions.map((question) => question.id).sort() : null,
      askedIds: model ? (model.builderQuestions ?? model.questions).map((question) => question.id).sort() : null,
      editableIds: model ? (model.editableQuestions ?? model.questions).map((question) => question.id).sort() : null,
      carriedIds: model
        ? Object.keys(model.initialAnswers).sort()
        : null,
      missingInputIds: model ? [...model.missingInputIds].sort() : null
    });
  }
}

const totals = rows.reduce((accumulator, row) => {
  accumulator.pathways += 1;
  accumulator.asked += row.askedIds?.length ?? 0;
  accumulator.carried += row.carriedIds?.length ?? 0;
  accumulator.missing += row.missingInputIds?.length ?? 0;
  return accumulator;
}, { pathways: 0, asked: 0, carried: 0, missing: 0 });

const artifact = { schemaVersion: 1, totals, rows };
const target = process.argv[2] ?? "data/expungement-ai/phase2/canonical-fact-sweep.json";
writeArtifact(target, artifact);
console.log(stableJson(totals));
