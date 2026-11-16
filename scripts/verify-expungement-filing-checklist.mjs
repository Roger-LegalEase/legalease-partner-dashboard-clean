// Briefcase filing checklist and reminders.
//
// Behavioral: the pure checklist model (assembly, stored progress, validation,
// patches, reminders, due-date math) is exercised directly, and patches are
// applied through the real owner-scoped Briefcase merge writer on its
// unconfigured (in-memory) path to prove they never discard lifecycle refs.
// Source: the checklist route stays inside the consumer authority boundary
// (request user, owner-scoped read, artifact_refs merge only), the matter and
// Reminders pages keep their existing contracts, and every copy key used by
// the checklist exists in English and Spanish.
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

import { readFileSync } from "node:fs";
import path from "node:path";

for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) delete process.env[key];

const model = await import("../src/lib/expungement-ai/filing-checklist.ts");
const briefcase = await import("../src/lib/expungement-ai/briefcase.ts");
const { EXPUNGEMENT_COPY } = await import("../src/lib/expungement-ai/localization.ts");

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}
function read(rel) {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

const NOW = new Date("2026-11-16T15:00:00.000Z");
let idCounter = 0;
const newStepId = () => `cus-test${String(++idCounter).padStart(4, "0")}`;

function matter(overrides = {}) {
  return {
    id: "matter-1",
    type: "result",
    title: "Texas nondisclosure",
    state: "Texas",
    status: "guidance_saved",
    resultCode: "guidance_only",
    createdAt: NOW.toISOString(),
    summary: "Saved.",
    nextSteps: ["Request your criminal history from DPS.", "Gather your court records.", "Gather your court records."],
    paymentAllowed: false,
    packetReady: false,
    artifactRefs: {},
    ...overrides
  };
}
const packetRefs = { generatedAt: NOW.toISOString(), downloadPath: "/api/download/x", fileName: "packet.pdf", selectedTrackId: "TX:track-1" };

// 1) Which matters get a checklist.
assert(model.matterHasFilingChecklist(matter()), "guidance_only result matters must have a checklist.");
assert(model.matterHasFilingChecklist(matter({ resultCode: "packet_ready" })), "packet_ready matters must have a checklist.");
assert(!model.matterHasFilingChecklist(matter({ resultCode: "likely_not_eligible" })), "likely_not_eligible must not get a filing checklist.");
assert(!model.matterHasFilingChecklist(matter({ resultCode: "hard_stop" })), "hard_stop must not get a filing checklist.");
assert(!model.matterHasFilingChecklist(matter({ type: "check" })), "Non-result Briefcase items must not get a checklist.");

// 2) Assembly: engine steps (deduplicated, stable ids), standard steps only after generation.
const guidance = model.buildFilingChecklist(matter());
const resultGroup = guidance.groups.find((group) => group.key === "result");
assert(resultGroup?.steps.length === 2, "Duplicate engine steps must collapse to one.");
assert(guidance.groups.every((group) => group.key === "result" || group.key === "custom"), "Standard filing steps must not appear before a packet is generated.");
assert(guidance.total === 2 && guidance.done === 0 && !guidance.packetGenerated, "Guidance checklist totals are wrong.");
assert(model.engineStepId("Gather  your court records. ") === model.engineStepId("gather your court records."), "Engine step ids must ignore case and whitespace.");
const reordered = model.buildFilingChecklist(matter({ nextSteps: ["Gather your court records.", "Request your criminal history from DPS."] }));
assert(
  reordered.groups[0].steps.map((s) => s.id).sort().join() === resultGroup.steps.map((s) => s.id).sort().join(),
  "Engine step ids must survive reordering."
);

const packet = model.buildFilingChecklist(matter({ resultCode: "packet_ready", status: "packet_ready", artifactRefs: packetRefs }));
assert(packet.packetGenerated, "A generated packet must be detected from artifact refs.");
for (const key of ["prepare", "file", "follow_up"]) {
  assert(packet.groups.some((group) => group.key === key && group.steps.length > 0), `Packet checklist is missing the ${key} group.`);
}
assert(packet.total === 2 + model.STANDARD_FILING_STEPS.length, "Packet checklist must include engine plus standard steps.");

// 3) Stored progress is applied; malformed state is ignored.
const stored = model.buildFilingChecklist(matter({
  artifactRefs: {
    filingChecklist: {
      steps: {
        [resultGroup.steps[0].id]: { done: true, doneAt: "2026-11-10T00:00:00.000Z", dueDate: "2026-11-20" },
        [resultGroup.steps[1].id]: { done: "yes", dueDate: "2026-02-30" }
      },
      custom: {
        "cus-aaaaaa1": { text: "Call the clerk", createdAt: "2026-11-01T00:00:00.000Z" },
        "cus-aaaaaa2": { text: "Removed step", createdAt: "2026-11-02T00:00:00.000Z", removed: true },
        "not-a-custom-id": { text: "Injected", createdAt: "2026-11-03T00:00:00.000Z" }
      }
    }
  }
}));
const [first, second] = stored.groups.find((group) => group.key === "result").steps;
assert(first.done && first.doneAt && first.dueDate === "2026-11-20", "Stored done/dueDate must be applied.");
assert(!second.done && second.dueDate === null, "Non-boolean done and impossible dates must be ignored.");
const customSteps = stored.groups.find((group) => group.key === "custom").steps;
assert(customSteps.length === 1 && customSteps[0].text === "Call the clerk", "Only live, well-formed custom steps may render.");
assert(stored.done === 1 && stored.total === 3, "Stored checklist totals are wrong.");

// 4) Request parsing.
const parse = model.parseFilingChecklistAction;
assert(parse({ type: "set_step", stepId: "x", done: true }).type === "set_step", "Valid set_step must parse.");
assert(parse({ type: "set_step", stepId: "x" }).error === "invalid_action", "set_step with no change must be rejected.");
assert(parse({ type: "set_step", stepId: "x", done: "true" }).error === "invalid_action", "Non-boolean done must be rejected.");
assert(parse({ type: "set_step", stepId: "x", dueDate: "2026-13-01" }).error === "invalid_due_date", "Invalid due dates must be rejected.");
assert(parse({ type: "set_step", stepId: "x", dueDate: "" }).dueDate === null, "An empty due date clears the date.");
assert(parse({ type: "add_step", text: "   " }).error === "invalid_text", "Blank custom steps must be rejected.");
assert(parse({ type: "add_step", text: "x".repeat(model.MAX_CUSTOM_STEP_LENGTH + 1) }).error === "invalid_text", "Over-long custom steps must be rejected.");
assert(parse({ type: "add_step", text: "Call\u0000 the\n clerk" }).text === "Call the clerk", "Custom step text must be normalized to plain text.");
assert(parse({ type: "delete_everything" }).error === "invalid_action", "Unknown action types must be rejected.");
assert(parse([]).error === "invalid_action" && parse(null).error === "invalid_action", "Non-object bodies must be rejected.");

// 5) Patches only touch filingChecklist, are nested objects, and enforce ownership of steps.
const stepId = resultGroup.steps[0].id;
const donePatch = model.filingChecklistPatch(guidance, { type: "set_step", stepId, done: true }, { now: NOW, newStepId });
assert(Object.keys(donePatch.patch).join() === "filingChecklist", "Patches must only write the filingChecklist ref.");
assert(donePatch.patch.filingChecklist.steps[stepId].done === true && donePatch.patch.filingChecklist.steps[stepId].doneAt === NOW.toISOString(), "Completing a step must stamp doneAt.");
const keepDoneAt = model.filingChecklistPatch(stored, { type: "set_step", stepId: first.id, done: true }, { now: NOW, newStepId });
assert(keepDoneAt.patch.filingChecklist.steps[first.id].doneAt === first.doneAt, "Re-completing must keep the original doneAt.");
const undo = model.filingChecklistPatch(stored, { type: "set_step", stepId: first.id, done: false }, { now: NOW, newStepId });
assert(undo.patch.filingChecklist.steps[first.id].doneAt === null, "Un-completing must clear doneAt.");
assert(model.filingChecklistPatch(guidance, { type: "set_step", stepId: "std-file", done: true }, { now: NOW, newStepId }).error === "step_not_found", "Standard steps must not be writable before a packet exists.");
assert(model.filingChecklistPatch(packet, { type: "remove_step", stepId: "std-file" }, { now: NOW, newStepId }).error === "not_removable", "Only custom steps can be removed.");
const addPatch = model.filingChecklistPatch(guidance, { type: "add_step", text: "Call the clerk", dueDate: "2026-11-20" }, { now: NOW, newStepId });
const addedId = Object.keys(addPatch.patch.filingChecklist.custom)[0];
assert(model.isCustomStepId(addedId) && addPatch.patch.filingChecklist.steps[addedId].dueDate === "2026-11-20", "add_step must create a custom step with its date.");
assert(model.filingChecklistPatch(guidance, { type: "add_step", text: "x" }, { now: NOW, newStepId: () => "evil-id" }).error === "invalid_action", "Generated custom ids must be validated.");
const full = model.buildFilingChecklist(matter({
  artifactRefs: { filingChecklist: { custom: Object.fromEntries(Array.from({ length: model.MAX_CUSTOM_STEPS }, (_, i) => [`cus-full${String(i).padStart(4, "0")}`, { text: `Step ${i}`, createdAt: NOW.toISOString() }])) } }
}));
assert(!full.canAddSteps && model.filingChecklistPatch(full, { type: "add_step", text: "One more" }, { now: NOW, newStepId }).error === "too_many_steps", "Custom steps must be capped.");
function hasArray(value) {
  if (Array.isArray(value)) return true;
  return value && typeof value === "object" ? Object.values(value).some(hasArray) : false;
}
assert(![donePatch, addPatch, undo].some((result) => hasArray(result.patch)), "Patches must not contain arrays (arrays replace instead of merging).");

// 6) Real merge writer (unconfigured path): checklist writes never discard lifecycle refs.
const userId = "verify-filing-checklist-user";
const created = await briefcase.createBriefcaseItem({
  userId,
  itemType: "result",
  jurisdiction: "Texas",
  status: "packet_ready",
  resultCode: "packet_ready",
  pathwayLabel: "Texas nondisclosure",
  paymentAllowed: true,
  summary: "Saved.",
  nextSteps: ["Gather your court records."],
  artifactRefs: { ...packetRefs, packetInformation: { answers: { name: "A" } } }
});
let current = created;
for (const action of [
  { type: "set_step", stepId: "std-sign", done: true },
  { type: "set_step", stepId: "std-file", dueDate: "2026-11-18" },
  { type: "add_step", text: "Call the clerk about a hearing", dueDate: "2026-11-25" }
]) {
  const update = model.filingChecklistPatch(model.buildFilingChecklist(current), action, { now: NOW, newStepId });
  current = await briefcase.mergeBriefcaseArtifactRefs(userId, created.id, update.patch);
  assert(current, `Merge writer rejected a checklist patch: ${action.type}.`);
}
assert(current.artifactRefs.downloadPath === packetRefs.downloadPath && current.artifactRefs.selectedTrackId === packetRefs.selectedTrackId, "Checklist writes must preserve packet and track refs.");
assert(current.artifactRefs.packetInformation?.answers?.name === "A", "Checklist writes must preserve packet information.");
const merged = model.buildFilingChecklist(current);
assert(model.findChecklistStep(merged, "std-sign")?.done === true, "Merged checklist lost the completed step.");
assert(model.findChecklistStep(merged, "std-file")?.dueDate === "2026-11-18", "Merged checklist lost the due date.");
assert(merged.groups.find((group) => group.key === "custom").steps.length === 1, "Merged checklist lost the custom step.");
assert(await briefcase.mergeBriefcaseArtifactRefs("someone-else", created.id, { filingChecklist: {} }) === null, "Another user must not be able to write this matter.");

// 7) Reminders across matters.
const reminders = model.collectBriefcaseReminders([
  current,
  matter({ id: "matter-2", title: "Ohio sealing", state: "Ohio", reminderAt: "2026-12-01T00:00:00.000Z" }),
  matter({ id: "matter-3", resultCode: "likely_not_eligible", artifactRefs: { filingChecklist: { steps: { [stepId]: { dueDate: "2026-11-01" } } } } })
]);
assert(reminders.map((r) => r.date).join() === "2026-11-18,2026-11-25,2026-12-01", "Reminders must be dated, open steps sorted soonest first.");
assert(reminders.every((r) => r.itemId !== "matter-3"), "Matters without a checklist must not produce step reminders.");
assert(reminders.at(-1).kind === "check_back" && !reminders.at(-1).stepId, "reminder_at must surface as a check-back reminder.");
assert(!reminders.some((r) => r.stepId === "std-sign"), "Completed steps must not appear in reminders.");

// 8) Due-date math.
assert(model.daysUntil("2026-11-18", "2026-11-16") === 2 && model.daysUntil("2026-03-09", "2026-03-08") === 1, "daysUntil is wrong (incl. across DST).");
assert(model.dueStatus("2026-11-15", "2026-11-16") === "overdue" && model.dueStatus("2026-11-16", "2026-11-16") === "today", "dueStatus overdue/today is wrong.");
assert(model.dueStatus("2026-11-23", "2026-11-16") === "soon" && model.dueStatus("2026-11-24", "2026-11-16") === "later", "dueStatus soon/later boundary is wrong.");
assert(!model.isValidDueDate("2026-02-29") && model.isValidDueDate("2028-02-29") && !model.isValidDueDate("1999-12-31"), "isValidDueDate is wrong.");

// 9) Source: authority boundary of the route and page contracts.
const route = read("src/app/api/expungement-ai/briefcase/[itemId]/checklist/route.ts");
assert(route.includes("getRcapBriefcaseAuthState()") && route.includes("auth_required"), "Checklist route must require the request user.");
assert(route.includes("getBriefcaseItem(auth.userId, itemId)"), "Checklist route must read the matter owner-scoped.");
assert(route.includes("mergeBriefcaseArtifactRefs(auth.userId, item.id, update.patch)"), "Checklist route must write through the owner-scoped merge writer.");
assert(route.includes('startsWith("application/json")'), "Checklist route must require a JSON content type (no cross-site form posts).");
assert(!/getSupabaseAdminClient|SERVICE_ROLE|service_role|payment_status|packet_status|updateBriefcase/.test(route), "Checklist route must not use admin credentials or touch payment/packet state.");
const matterPage = read("src/app/briefcase/[packetId]/page.tsx");
assert(matterPage.includes("{artifact ? <ReadyPacket") && matterPage.includes("data-briefcase-guidance-state"), "Matter page contracts used by other verifiers changed.");
assert(matterPage.includes("<FilingChecklist initial={checklist} />"), "Matter page must render the filing checklist.");
const remindersPage = read("src/app/briefcase/reminders/page.tsx");
assert(remindersPage.includes("requireConsumerBriefcaseSession(") && remindersPage.includes("listBriefcaseItems(auth.userId)"), "Reminders must be scoped to the signed-in consumer.");
assert(read("src/components/expungement-ai/BriefcaseShell.tsx").includes('href: "/briefcase/reminders"'), "Reminders must be reachable from Briefcase navigation.");

// 10) Copy exists in both locales.
const keys = [
  "briefcase.nav.reminders",
  ...model.FILING_CHECKLIST_GROUPS.map((group) => `briefcase.checklist.group.${group.key}`),
  ...model.STANDARD_FILING_STEPS.map((step) => `briefcase.checklist.step.${step.id}`),
  "briefcase.reminders.check_back"
];
for (const source of ["src/components/expungement-ai/FilingChecklist.tsx", "src/components/expungement-ai/ReminderList.tsx"]) {
  for (const match of read(source).matchAll(/"(briefcase\.(?:checklist|reminders)\.[a-z_.-]+)"/g)) keys.push(match[1]);
}
for (const key of new Set(keys)) {
  assert(EXPUNGEMENT_COPY[key]?.en && EXPUNGEMENT_COPY[key]?.es, `Missing en/es copy for ${key}.`);
}
for (const step of model.STANDARD_FILING_STEPS) {
  assert(EXPUNGEMENT_COPY[`briefcase.checklist.step.${step.id}`]?.en === step.text, `English copy for ${step.id} must match the model text.`);
}

if (failures.length) {
  console.error(`Filing checklist verification failed (${failures.length}):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("Filing checklist verification passed.");
