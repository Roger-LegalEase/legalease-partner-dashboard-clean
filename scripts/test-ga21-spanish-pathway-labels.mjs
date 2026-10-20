import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';
const root=process.cwd();
register(pathToFileURL(root+'/scripts/lib/ts-esm-loader.mjs'));
// Optional frozen parent data is substituted in memory; the real public projection still runs.
if(process.argv[2]) register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",shortCircuit:true,source:"export default "+d.source}:n(u,c)}'),{data:{url:pathToFileURL(root+'/src/lib/expungement-ai/frontend/profiles/all51.json').href,source:fs.readFileSync(process.argv[2],'utf8')}});
const {getProfileByJurisdiction}=await import(pathToFileURL(root+'/src/lib/rcap-engine/profile-registry.ts'));
const {projectPublicProfile}=await import(pathToFileURL(root+'/src/lib/rcap-engine/public-profile-projection.ts'));
// GA-21: reviewed pathway labels must be Spanish; preserve named programmes.
const englishWords = ["accusation", "act", "administrative", "all", "backstop", "case", "cases", "certificate", "chapter", "charge", "charges", "clean", "code", "completion", "conditional", "court", "destruction", "discretionary", "disposition", "drug", "executive", "expunction", "expunged", "expungement", "factual", "false", "filed", "first", "framework", "identity", "imposition", "innocence", "law", "limitations", "minor", "mistaken", "motion", "of", "offender", "offense", "only", "order", "other", "outcome", "period", "possession", "probation", "program", "quash", "record", "records", "removal", "request", "review", "rule", "sealed", "sentence", "set-aside", "slate", "statute", "suspended", "the", "time", "treatment", "unlawful", "vacate", "variants", "year", "youthful"];
const names = /\b(?:Clean Slate|REDEEMER|Raise the Age|Second Chance|ARD|BCI|CRISS|DOJ|MRTA|MMRTA|Blake|ePardon|General Sessions|nolle prosequi)\b/gi;
const english = new RegExp('\\b(?:' + englishWords.join('|') + ')\\b', 'gi');
const profiles = JSON.parse(fs.readFileSync('src/lib/expungement-ai/frontend/profiles/all51.json', 'utf8'));
const citations = /\b(?:Ala\.|D\.C\.|Idaho|Iowa|Mont\.|Ohio Rev\.|Tenn\.|W\. Va\.) Code\b/gi;
const failures = []; let labels = 0;
for (const state of Object.keys(profiles)) {
  const question = projectPublicProfile(getProfileByJurisdiction(state)).questions.find(q => q.id === 'possible_pathway_context');
  const template = profiles[state].questions.find(q => q.id === 'possible_pathway_context');
  if (!template) continue;
  assert(question, state + ': optional pathway question is present');
  for (const option of template.options) {
    const label = question.optionDisplay?.[option]?.translations?.es?.label;
    labels++;
    if (typeof label !== 'string' || !label.trim()) { failures.push({ state, option, missing: true }); continue; }
    const words = label.replace(names, '').replace(citations, '').match(english) ?? [];
    if (words.length) failures.push({ state, option, label, words });
  }
}
assert.equal(labels, 374, 'Released scope is the profile options; appended compiled pathways are reported separately');
const result = { status: failures.length ? 'FAIL' : 'PASS', labels, failures };
if (process.env.GA21_ES_GUARD_EVIDENCE) fs.writeFileSync(process.env.GA21_ES_GUARD_EVIDENCE, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: result.status, labels, flaggedLabels: failures.length }));
assert.equal(failures.length, 0, 'Every Spanish pathway label must pass the released English-word guard');
