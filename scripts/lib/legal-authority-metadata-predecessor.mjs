import assert from 'node:assert/strict';

// Item 11: retain the historical whole-file assertions by reversing only the
// two authorized no-filing effective-date sentences. Every other byte is checked.
const replacements = {
  'src/lib/rcap-engine/compiled/profiles/OK-oklahoma.json': ['clean-slate-automatic-expungement','2026-07-01'],
  'src/lib/rcap-engine/compiled/profiles/SC-south-carolina.json': ['diversion-or-program-completion-expungement','2026-08-28']
};
export function legalAuthorityMetadataPredecessor(file, bytes) {
  if (!Object.hasOwn(replacements,file)) return bytes;
  const [route,date]=replacements[file], profile=JSON.parse(bytes.toString());
  assert.equal(JSON.stringify(profile,null,2)+'\n',bytes.toString(),'canonical generated profile bytes');
  const pathway=profile.pathways.find(p=>p.id===route);
  const current=`This rule took effect on ${date}.`, previous=`This rule governs filings on or after ${date}.`;
  assert.equal(pathway?.filingRequired,false,'only the adopted no-filing route');
  assert.equal(pathway.waitingRules.filter(line=>line===current).length,1,'exact authorized successor sentence');
  assert(!pathway.waitingRules.includes(previous),'no duplicated predecessor');
  pathway.waitingRules[pathway.waitingRules.indexOf(current)]=previous;
  return Buffer.from(JSON.stringify(profile,null,2)+'\n');
}
