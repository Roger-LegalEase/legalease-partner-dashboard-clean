// Definition capability only. Synthetic control witnesses never evaluate eligibility or create a matter.
import path from 'node:path';
import { register, createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import crypto from 'node:crypto';
register('./question-capability-loader.mjs', import.meta.url);
const root = process.cwd();
const require = createRequire(path.join(root, 'package.json'));
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const actual = file => import(pathToFileURL(path.join(root, file)).href);
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
export async function verifyCurrentQuestionCapabilities() {
  const { getAllJurisdictionProfiles } = await actual('src/lib/rcap-engine/profile-registry.ts');
  const { projectPublicProfile } = await actual('src/lib/rcap-engine/public-profile-projection.ts');
  const { packetPlanForPathway } = await actual('src/lib/rcap-engine/packet-planner.ts');
  const { packetSpecificationRouteKeys, packetSpecificationFor } = await actual('src/lib/rcap/grade-a/packet-specification.ts');
  const { protectedPacketQuestionSurface, missingRequiredInputs } = await actual('src/lib/expungement-ai/packet-information.ts');
  const { questionAnswerState, normalizeQuestionChoices } = await actual('src/lib/expungement-ai/question-answer-state.ts');
  const { blocksContinue } = await actual('src/components/expungement-ai/screening/answers.ts');
  const { QuestionField } = await actual('src/components/expungement-ai/screening/QuestionField.tsx');
  const { caNyQuestionCapabilityScenarios, caNyQuestionCapabilityWitness, caNyQuestionPrerequisiteWitness } = await import('./ca-ny-question-capability-witnesses.mjs');
  const scenarios = caNyQuestionCapabilityScenarios();
  const scoped = new Set(scenarios.map(row => row.state + ':' + row.id));
  const descriptors = new Map(), routes = [], failures = [], mutations = [];
  function collect(state, route, surface, audience, question) {
    const key = digest({ state, question });
    if (!descriptors.has(key)) descriptors.set(key, { state, question, associations: [] });
    descriptors.get(key).associations.push({ route, surface, audience });
  }
  function candidates(q) {
    if (q.type === 'single_choice') return Array.isArray(q.options) ? q.options : [];
    if (q.type === 'multi_select') return Array.isArray(q.options) ? q.options.map(value => [value]) : [];
    if (q.type === 'yes_no_unsure' || q.type === 'yes_no_prefer_not_to_say') return ['Yes', 'No'];
    if (q.type === 'date' || q.type === 'date_or_unknown') return ['2000-02-29'];
    if (q.type === 'number_or_range') return [0];
    if (q.type === 'text' || q.type === 'textarea' || q.type === 'text_or_unknown') return [q.id === 'social_security_number' ? '999-88-0125' : 'Synthetic court record'];
    return [];
  }
  function capability(state, q) {
    if (!q.required || q.contextOnly) return 'OPTIONAL_OR_CONTEXT_NONBLOCKING';
    if (scoped.has(state + ':' + q.id)) {
      const dependency = caNyQuestionPrerequisiteWitness(state, q);
      if (dependency) {
        const scenario = scenarios.find(row => row.state === state && row.id === q.id);
        const profile = profiles.find(profile => profile.jurisdiction.code === state);
        const plan = profile && packetPlanForPathway(profile, scenario.routeId);
        if (!plan) return 'INVALID_REQUIRED_DEPENDENCY';
        const surface = facts => protectedPacketQuestionSurface(profile, scenario.routeId, { ownership_scope: 'yes' }, plan.requiredInputIds, { jurisdiction: state, pathway_id: scenario.routeId }, {}, facts);
        const blank = surface({}), active = surface(dependency.activatingFacts);
        const activated = active.builderQuestions.find(question => question.id === q.id);
        const keys = ['id', 'type', 'required', 'contextOnly', 'answerContract', 'options', 'optionDisplay', 'contactContext', 'caseRecordReferences', 'futureApplicationReferences', 'prior16058ApplicationKnown', 'awaitingNyCaseRecords'];
        if (!dependency.prerequisiteIds.length || !dependency.prerequisiteIds.every(id => blank.builderQuestions.some(question => question.id === id))
          || !activated || !keys.every(key => JSON.stringify(activated[key]) === JSON.stringify(dependency.activatedQuestion[key]))
          || questionAnswerState(q, dependency.activatedValue) === 'known_valid'
          || questionAnswerState(activated, dependency.activatedValue) !== 'known_valid'
          || !blocksContinue(q, undefined) || !missingRequiredInputs([q.id], {}, {}, new Map([[q.id, q]])).includes(q.id)) return 'INVALID_REQUIRED_DEPENDENCY';
        const html = renderToStaticMarkup(createElement(QuestionField, { question: activated, stateCode: state, value: dependency.activatedValue, onChange() {}, sensitiveInputAllowed: true }));
        return /<(?:input|textarea|select)\b/.test(html) ? 'CAPABLE_AFTER_PREREQUISITES' : 'UNRENDERABLE_REQUIRED_CONTROL';
      }
    }
    if (['single_choice', 'multi_select'].includes(q.type)) {
      // Production normalization refuses the entire malformed/duplicate list, without guessing choices.
      const normalized = normalizeQuestionChoices(q.options);
      if (!normalized.options || !Array.isArray(q.options) || normalized.options.length !== q.options.length || !q.options.every((value, index) => typeof value === 'string' && normalized.options[index] === value)) return 'INVALID_REQUIRED_CHOICES';
    }
    const structured = scoped.has(state + ':' + q.id) ? caNyQuestionCapabilityWitness(state, q) : null;
    const witness = [...(structured === null ? [] : [structured]), ...candidates(q)].find(value => questionAnswerState(q, value) === 'known_valid');
    if (witness === undefined) return 'UNSUPPORTED_REQUIRED_CONTROL';
    const html = renderToStaticMarkup(createElement(QuestionField, { question: q, stateCode: state, value: witness, onChange() {}, sensitiveInputAllowed: true }));
    // Authorized-input prop tests widget capability only, not court authorization or participant access.
    return /<(?:input|textarea|select)\b/.test(html) ? 'CAPABLE' : 'UNRENDERABLE_REQUIRED_CONTROL';
  }
  const profiles = getAllJurisdictionProfiles();
  for (const profile of profiles) {
    const state = profile.jurisdiction.code, projected = projectPublicProfile(profile);
    for (const q of projected.questions) collect(state, null, 'public', 'public', q);
    for (const [route, questions] of Object.entries(projected.postPaymentPacketCompletion ?? {})) for (const q of questions) collect(state, route, 'public_completion', 'public', q);
    for (const pathway of profile.pathways) {
      const plan = packetPlanForPathway(profile, pathway.id);
      const row = { state, route: pathway.id, plan: Boolean(plan), source: 'compiled_pathway' }; routes.push(row);
      if (!plan) continue;
      for (const [audience, ownership_scope] of [['participant', 'yes'], ['canonical_helper', 'I am helping someone complete their own check']]) {
        const surface = protectedPacketQuestionSurface(profile, pathway.id, { ownership_scope }, plan.requiredInputIds, { jurisdiction: state, pathway_id: pathway.id }, {}, {});
        for (const q of surface.questions) collect(state, pathway.id, 'packet_contract_including_inactive', audience, q);
        for (const q of surface.builderQuestions) collect(state, pathway.id, 'blank_builder', audience, q);
      }
    }
  }
  // Explicitly account for registered source-only routes; they are not invented compiled participant journeys.
  const compiled = new Set(routes.map(r => r.state + ':' + r.route));
  for (const routeKey of packetSpecificationRouteKeys()) if (!compiled.has(routeKey)) {
    const state = routeKey.slice(0, 2), route = routeKey.slice(3), profile = profiles.find(p => p.jurisdiction.code === state), spec = packetSpecificationFor(routeKey);
    routes.push({ state, route, source: 'registered_source_only', plan: false, requiredFacts: spec?.requiredFacts.length ?? 0 });
    if (!profile || !spec) { failures.push({ state, route, failure: 'UNACCOUNTED_REGISTERED_SOURCE' }); continue; }
    for (const [audience, ownership_scope] of [['participant', 'yes'], ['canonical_helper', 'I am helping someone complete their own check']]) {
      const surface = protectedPacketQuestionSurface(profile, route, { ownership_scope }, spec.requiredFacts.map(f => f.factId), { jurisdiction: state, pathway_id: route }, {}, {});
      for (const q of surface.questions) collect(state, route, 'registered_source_contract', audience, q);
    }
  }
  const results = [...descriptors.values()].map(row => ({ state: row.state, questionId: row.question.id, type: row.question.type, descriptorSha256: digest(row.question), associations: row.associations, status: capability(row.state, row.question) }));
  for (const row of results) if (!['CAPABLE', 'CAPABLE_AFTER_PREREQUISITES', 'OPTIONAL_OR_CONTEXT_NONBLOCKING'].includes(row.status)) failures.push(row);
  const mo = [...descriptors.values()].find(r => r.state === 'MO' && r.question.id === 'date_of_birth' && r.question.required && !r.question.contextOnly)?.question;
  const sd = [...descriptors.values()].find(r => r.state === 'SD' && r.question.id === 'sd_sis_record_correction_stage' && r.question.required && !r.question.contextOnly)?.question;
  if (!mo || !sd) failures.push({ failure: 'ACTUAL_MO_SD_MUTATION_SEED_MISSING' });
  else for (const [id, state, base, changed] of [
    ['MO-unsupported', 'MO', mo, { type: 'unsupported' }],
    ['SD-empty', 'SD', sd, { options: [] }],
    ['SD-absent', 'SD', sd, { options: null }],
    ['SD-malformed', 'SD', sd, { options: [sd.options[0], {}] }],
    ['SD-duplicate', 'SD', sd, { options: [sd.options[0], sd.options[0]] }]
  ]) for (const mode of ['required', 'optional', 'context']) {
    const q = { ...base, ...changed, required: mode !== 'optional', contextOnly: mode === 'context' }, status = capability(state, q);
    const required = mode === 'required', blocked = blocksContinue(q, undefined);
    const missing = missingRequiredInputs(required ? [q.id] : [], {}, {}, new Map([[q.id, q]]));
    const pass = required ? !['CAPABLE', 'CAPABLE_AFTER_PREREQUISITES', 'OPTIONAL_OR_CONTEXT_NONBLOCKING'].includes(status) && blocked && missing.includes(q.id) : status === 'OPTIONAL_OR_CONTEXT_NONBLOCKING' && !blocked && missing.length === 0;
    mutations.push({ id, mode, status, blocked, missingIds: missing, pass });
    if (!pass) failures.push({ failure: 'CAPABILITY_MUTATION_FAILED', id, mode });
  }
  return { counts: { jurisdictions: profiles.length, compiledRoutes: compiled.size, registeredSourceOnlyRoutes: routes.filter(r => r.source === 'registered_source_only').length, descriptorVariants: results.length, appearances: results.reduce((n, r) => n + r.associations.length, 0), mandatoryDescriptors: results.filter(r => r.status !== 'OPTIONAL_OR_CONTEXT_NONBLOCKING').length, mutations: mutations.length, mutationPasses: mutations.filter(r => r.pass).length, failures: failures.length }, routes, results, mutations, failures, scope: 'Source definitions and actual component capability. No eligibility, protected workflow, commercial offer, court authority, database or provider action.' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const report = await verifyCurrentQuestionCapabilities();
  console.log(JSON.stringify(report.counts));
  for (const failure of report.failures) console.error(JSON.stringify(failure));
  process.exitCode = report.failures.length ? 1 : 0;
}
